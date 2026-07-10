/**
 * WHOOP Bluetooth manager (Phase 1 — the proof gate).
 *
 * Responsibilities, deliberately minimal for the M1 gate:
 *   1. Scan for a strap advertising as "WHOOP*".
 *   2. Connect and discover all services/characteristics, reporting their UUIDs
 *      (this captures the full 128-bit `fd4b...` UUIDs from the real device).
 *   3. Decode LIVE heart rate + R-R from the standard Heart Rate Service (0x2A37)
 *      and battery from 0x2A19 — reliable, non-proprietary.
 *   4. Subscribe to the proprietary `fd4b` notify characteristics and capture
 *      their raw frames as hex, so the full "Maverick" decoder (history, sleep,
 *      recovery) can be built from real captured data in Phase 2.
 *
 * No data leaves the device. Single BLE bond: the official WHOOP app must be
 * closed/disconnected and the strap put into pairing mode first.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import {
  BleManager,
  Device,
  State,
  Subscription,
} from 'react-native-ble-plx';

import {
  BATTERY_LEVEL,
  BATTERY_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  WHOOP4_CMD_WRITE,
  WHOOP4_SERVICE,
  WHOOP5_CMD_WRITE,
  WHOOP5_SERVICE,
  WHOOP_CHAR_PREFIX,
  WHOOP_CMD_WRITE_PREFIX,
  WHOOP_CMD_WRITE_PREFIX_4,
  WHOOP_NAME_PREFIX,
} from './constants';
import { base64ToBytes, bytesToBase64, bytesToHex } from './bytes';
import { decodeHeartRate, HeartRateSample } from './heartRate';
import {
  cmdGetHello,
  cmdGetHelloHarvard,
  cmdEnableHrBroadcast,
  cmdLinkValid,
  cmdSetClock,
} from '../whoop/commands';

const DIRECT_CONNECT_TIMEOUT_MS = 9000;
const DEVICE_CONNECT_TIMEOUT_MS = 12000;
const DISCOVER_TIMEOUT_MS = 15000;
const SCAN_TIMEOUT_MS = 30000;
const COMMAND_WRITE_TIMEOUT_MS = 6000;

export type WhoopStatus =
  | 'idle'
  | 'unauthorized'
  | 'bluetooth-off'
  | 'scanning'
  | 'connecting'
  | 'discovering'
  | 'connected'
  | 'disconnected'
  | 'error';

export type DiscoveredChar = {
  service: string;
  characteristic: string;
  notifiable: boolean;
  writable: boolean;
};

export type RawFrame = {
  ts: number;
  source: string; // short label, e.g. "fd4b0005"
  hex: string;
};

export type WhoopEvents = {
  onStatus?: (status: WhoopStatus, detail?: string) => void;
  onDevice?: (info: { id: string; name: string }) => void;
  onHeartRate?: (sample: HeartRateSample) => void;
  onBattery?: (percent: number) => void;
  onDiscovered?: (chars: DiscoveredChar[]) => void;
  onRawFrame?: (frame: RawFrame) => void;
  onError?: (message: string) => void;
};

export class WhoopBle {
  private manager: BleManager;
  private events: WhoopEvents;
  private device: Device | null = null;
  private lastDeviceId: string | null = null;
  private subscriptions: Subscription[] = [];
  private disconnectSub: Subscription | null = null;
  private scanning = false;
  private writeService: string | null = null;
  private writeChar: string | null = null;
  private keepalive: ReturnType<typeof setInterval> | null = null;
  private reArm: ReturnType<typeof setInterval> | null = null;
  private wantConnected = false; // user wants a connection → auto-reconnect on drop
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private commandQueue: Promise<void> = Promise.resolve();
  private commandEpoch = 0;

  constructor(events: WhoopEvents) {
    this.events = events;
    // restoreStateIdentifier enables iOS CoreBluetooth State Preservation &
    // Restoration: with the `bluetooth-central` background mode, iOS relaunches
    // the app in the background when the strap has data, so overnight HR keeps
    // logging without the app open. Ignored on Android.
    this.manager = new BleManager({
      restoreStateIdentifier: 'volyume-pulse-ble',
      restoreStateFunction: (restored) => {
        const peripherals = restored?.connectedPeripherals ?? [];
        if (peripherals.length > 0) {
          const restoredDevice = peripherals[0] ?? null;
          if (restoredDevice) {
            this.wantConnected = true;
            void this.afterConnect(restoredDevice);
          }
        }
      },
    });
  }

  private setStatus(status: WhoopStatus, detail?: string) {
    this.events.onStatus?.(status, detail);
  }

  private fail(message: string) {
    this.events.onError?.(message);
    this.setStatus('error', message);
  }

  /** Android requires runtime location/Bluetooth permissions to scan. */
  private async ensurePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      this.setStatus('connecting', 'Requesting Bluetooth permissions...');
      const sdk = Platform.Version as number;
      const wanted =
        sdk >= 31
          ? [
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]
          : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const granted = await PermissionsAndroid.requestMultiple(wanted);
      const denied = wanted.filter((p) => granted[p] !== PermissionsAndroid.RESULTS.GRANTED);
      if (denied.length) {
        this.setStatus('unauthorized', `Denied: ${denied.map(shortPermissionName).join(', ')}`);
        return false;
      }
      return true;
    } catch (e) {
      this.fail(`Permission request failed: ${String(e)}`);
      return false;
    }
  }

  /** Full flow: permissions -> wait for BT on -> scan -> connect -> subscribe. */
  async start(preferredDeviceId?: string | null): Promise<void> {
    this.wantConnected = true;
    if (preferredDeviceId) this.lastDeviceId = preferredDeviceId;
    const ok = await this.ensurePermissions();
    if (!ok) {
      this.setStatus('unauthorized', 'Bluetooth permission denied');
      return;
    }

    const state = await this.manager.state();
    if (state !== State.PoweredOn) {
      this.setStatus('bluetooth-off', `Bluetooth state: ${state}`);
      // Wait for it to come on, then scan.
      const sub = this.manager.onStateChange((s) => {
        if (s === State.PoweredOn) {
          sub.remove();
          void this.scan();
        }
      }, true);
      return;
    }

    if (this.lastDeviceId) {
      try {
        this.setStatus('connecting', 'reconnecting…');
        const reconnected = await withTimeout(
          this.manager.connectToDevice(this.lastDeviceId, { requestMTU: 247 }),
          DIRECT_CONNECT_TIMEOUT_MS,
          'Saved WHOOP reconnect timed out',
        );
        await this.afterConnect(reconnected);
        return;
      } catch {
        // Known-device reconnect failed; scan below so a changed OS BLE id still works.
        await this.abandonCurrentConnection();
      }
    }

    await this.scan();
  }

  private async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.setStatus('scanning', 'Scanning for WHOOP advertisements...');

    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        this.scanning = false;
        this.fail(`Scan error: ${error.message}`);
        return;
      }
      const name = device?.name ?? device?.localName ?? '';
      if (device && name.toUpperCase().startsWith(WHOOP_NAME_PREFIX)) {
        this.manager.stopDeviceScan();
        this.scanning = false;
        void this.connect(device);
      }
    });

    // Stop scanning after 30s if nothing found.
    setTimeout(() => {
      if (this.scanning) {
        this.manager.stopDeviceScan();
        this.scanning = false;
        if (this.wantConnected) {
          // Keep trying rather than giving up — the strap may be out of range or
          // not yet in pairing mode. Backoff between sweeps.
          this.setStatus('disconnected', 'No strap found — retrying…');
          this.scheduleReconnect();
        }
      }
    }, SCAN_TIMEOUT_MS);
  }

  private async connect(device: Device): Promise<void> {
    try {
      this.setStatus('connecting', device.name ?? device.id);
      this.lastDeviceId = device.id;
      this.events.onDevice?.({ id: device.id, name: device.name ?? device.localName ?? 'WHOOP' });
      const connected = await withTimeout(
        device.connect({ requestMTU: 247 }),
        DEVICE_CONNECT_TIMEOUT_MS,
        'WHOOP connect timed out',
      );
      await this.afterConnect(connected);
    } catch (e) {
      await this.abandonCurrentConnection();
      this.setStatus('disconnected', `Connect failed: ${String(e)}`);
      if (this.wantConnected) this.scheduleReconnect();
    }
  }

  /** Post-connect bring-up — shared by first connect and auto-reconnect. */
  private async afterConnect(connected: Device): Promise<void> {
    this.invalidateCommandQueue();
    this.clearKeepalive();
    this.clearSubscriptions();
    if (this.disconnectSub) {
      this.disconnectSub.remove();
      this.disconnectSub = null;
    }
    this.device = connected;
    this.lastDeviceId = connected.id;
    this.events.onDevice?.({ id: connected.id, name: connected.name ?? connected.localName ?? 'WHOOP' });
    this.disconnectSub = connected.onDisconnected((error) => {
      this.invalidateCommandQueue();
      this.clearKeepalive();
      this.clearSubscriptions();
      this.device = null;
      this.writeService = null;
      this.writeChar = null;
      this.setStatus('disconnected', error?.message ?? connected.name ?? connected.id);
      // Auto-reconnect: the whole point of "catch up after a drop". When we
      // reconnect, the store re-runs the history drain (see onStatus 'connected').
      if (this.wantConnected) this.scheduleReconnect();
    });

    this.setStatus('discovering');
    await withTimeout(
      connected.discoverAllServicesAndCharacteristics(),
      DISCOVER_TIMEOUT_MS,
      'WHOOP service discovery timed out',
    );
    await this.locateWriteChar(connected);
    await this.subscribeAll(connected);
    this.subscribeStandardHr(connected);
    this.reconnectAttempts = 0; // healthy connection — reset backoff
    this.setStatus('connected', connected.name ?? connected.id);
    this.startLinkMaintenance();
  }

  /** Schedule a reconnect attempt with exponential backoff (2s → 60s cap). */
  private scheduleReconnect(): void {
    if (!this.wantConnected || this.reconnectTimer) return;
    const delayMs = Math.min(60000, 2000 * 2 ** Math.min(this.reconnectAttempts, 5));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.attemptReconnect();
    }, delayMs);
  }

  private async attemptReconnect(): Promise<void> {
    if (!this.wantConnected) return;
    // Fast path: reconnect to the known device by id; fall back to a fresh scan.
    if (this.lastDeviceId) {
      try {
        this.setStatus('connecting', 'reconnecting…');
        const reconnected = await withTimeout(
          this.manager.connectToDevice(this.lastDeviceId, { requestMTU: 247 }),
          DIRECT_CONNECT_TIMEOUT_MS,
          'Saved WHOOP reconnect timed out',
        );
        await this.afterConnect(reconnected);
        return;
      } catch {
        // fall through to scan
        await this.abandonCurrentConnection();
      }
    }
    if (this.wantConnected) await this.scan();
  }

  /** Scan the GATT table for the proprietary command-write characteristic. */
  private async locateWriteChar(device: Device): Promise<void> {
    const services = await device.services();
    let knownService: string | null = null;
    for (const service of services) {
      const serviceUuid = service.uuid.toLowerCase();
      if (serviceUuid === WHOOP5_SERVICE || serviceUuid === WHOOP4_SERVICE) {
        knownService = service.uuid;
      }
      const chars = await service.characteristics();
      for (const ch of chars) {
        const lc = ch.uuid.toLowerCase();
        if (isCommandWriteChar(lc)) {
          this.writeService = service.uuid;
          this.writeChar = ch.uuid;
          return;
        }
      }
    }
    // Some Android BLE stacks fail to surface characteristic properties or omit
    // the command char from the cached characteristic list after bonding. The
    // WHOOP command UUIDs are stable, so fall back to the known service/char
    // pair before declaring history sync impossible.
    if (knownService?.toLowerCase() === WHOOP5_SERVICE) {
      this.writeService = knownService;
      this.writeChar = WHOOP5_CMD_WRITE;
    } else if (knownService?.toLowerCase() === WHOOP4_SERVICE) {
      this.writeService = knownService;
      this.writeChar = WHOOP4_CMD_WRITE;
    }
  }

  /** Keep the command link alive without starting live-only streams. */
  private startLinkMaintenance(): void {
    if (!this.canSendCommands) return;
    this.clearKeepalive();
    void this.runGentleHandshake();
    // LINK_VALID keepalive every 2s — the strap drops the link without it
    // (whoop-vault LINK_VALID_INTERVAL_S = 2.0).
    let failures = 0;
    this.keepalive = setInterval(() => {
      this.writeCommand(cmdLinkValid())
        .then(() => {
          failures = 0;
        })
        .catch(() => {
          failures += 1;
          if (failures >= 3) this.recoverStaleLink('Link validation failed - reconnecting...');
        });
    }, 2000);
  }

  private async runGentleHandshake(): Promise<void> {
    await delay(750);
    await this.safeWriteCommand(cmdGetHelloHarvard());
    await delay(150);
    await this.safeWriteCommand(cmdGetHello());
    await delay(150);
    await this.safeWriteCommand(cmdSetClock());
    await delay(150);
    await this.safeWriteCommand(cmdEnableHrBroadcast(true));
  }

  private async safeWriteCommand(bytes: Uint8Array): Promise<boolean> {
    if (!this.canSendCommands) return false;
    try {
      await this.writeCommand(bytes);
      return true;
    } catch {
      return false;
    }
  }

  private subscribeStandardHr(device: Device): void {
    this.trySubscribe(device, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, (bytes) => {
      const sample = decodeHeartRate(bytes);
      if (sample) this.events.onHeartRate?.(sample);
    });
  }

  private clearKeepalive(): void {
    if (this.keepalive) {
      clearInterval(this.keepalive);
      this.keepalive = null;
    }
    if (this.reArm) {
      clearInterval(this.reArm);
      this.reArm = null;
    }
  }

  private clearSubscriptions(): void {
    for (const sub of this.subscriptions) {
      try {
        sub.remove();
      } catch {
        // ignore stale native subscriptions during reconnect/teardown
      }
    }
    this.subscriptions = [];
  }

  private async subscribeAll(device: Device): Promise<void> {
    const services = await device.services();
    const discovered: DiscoveredChar[] = [];

    for (const service of services) {
      const chars = await service.characteristics();
      for (const ch of chars) {
        discovered.push({
          service: service.uuid,
          characteristic: ch.uuid,
          notifiable: ch.isNotifiable || ch.isIndicatable,
          writable: ch.isWritableWithResponse || ch.isWritableWithoutResponse,
        });
      }
    }
    this.events.onDiscovered?.(discovered);

    // Standard HR (0x2A37) is subscribed AFTER the HR-broadcast is enabled
    // (see subscribeStandardHr), since it isn't notifying yet at this point.

    // Standard battery level.
    this.tryReadBattery(device);
    this.trySubscribe(device, BATTERY_SERVICE, BATTERY_LEVEL, (bytes) => {
      if (bytes.length >= 1) this.events.onBattery?.(bytes[0] as number);
    });

    // 3) Proprietary fd4b notify characteristics -> capture raw frames.
    for (const dc of discovered) {
      const lc = dc.characteristic.toLowerCase();
      if (dc.notifiable && lc.startsWith(WHOOP_CHAR_PREFIX)) {
        const label = lc.slice(0, 8);
        this.trySubscribe(
          device,
          dc.service,
          dc.characteristic,
          (bytes) => {
            this.events.onRawFrame?.({ ts: Date.now(), source: label, hex: bytesToHex(bytes) });
          },
          lc.startsWith('fd4b0005'),
        );
      }
      // Remember the command-write characteristic for the drain. Trust the UUID
      // even if Android's cached properties do not mark it writable.
      if (isCommandWriteChar(lc)) {
        this.writeService = dc.service;
        this.writeChar = dc.characteristic;
      }
    }
  }

  async refreshCommandChannel(): Promise<boolean> {
    if (!this.device) return false;
    if (this.canSendCommands) return true;
    try {
      await withTimeout(
        this.device.discoverAllServicesAndCharacteristics(),
        DISCOVER_TIMEOUT_MS,
        'WHOOP command rediscovery timed out',
      );
      await this.locateWriteChar(this.device);
      return this.canSendCommands;
    } catch {
      return false;
    }
  }

  forgetKnownDevice(): void {
    this.lastDeviceId = null;
  }

  /** True once connected and discovery has finished. */
  get isConnected(): boolean {
    return this.device !== null;
  }

  /** True if the proprietary command-write characteristic was found. */
  get canSendCommands(): boolean {
    return this.device !== null && this.writeChar !== null && this.writeService !== null;
  }

  /** Write a framed Maverick command to fd4b0002. */
  writeCommand(bytes: Uint8Array): Promise<void> {
    const epoch = this.commandEpoch;
    const queued = this.commandQueue.then(() => {
      if (epoch !== this.commandEpoch) throw new Error('Discarded command queued before reconnect');
      return this.writeCommandNow(bytes, epoch);
    });
    this.commandQueue = queued.catch(() => {});
    return queued;
  }

  private async writeCommandNow(bytes: Uint8Array, epoch: number): Promise<void> {
    const device = this.device;
    const service = this.writeService;
    const characteristic = this.writeChar;
    if (epoch !== this.commandEpoch || !device || !service || !characteristic) {
      throw new Error('Command-write characteristic not available');
    }
    const payload = bytesToBase64(bytes);
    try {
      await withTimeout(
        device.writeCharacteristicWithResponseForService(service, characteristic, payload),
        COMMAND_WRITE_TIMEOUT_MS,
        'WHOOP command write timed out',
      );
    } catch (withResponseError) {
      if (epoch !== this.commandEpoch || isTimeoutError(withResponseError, 'WHOOP command write timed out')) {
        this.clearCommandChannelIfCurrent(device, epoch);
        throw withResponseError;
      }
      try {
        await withTimeout(
          device.writeCharacteristicWithoutResponseForService(service, characteristic, payload),
          COMMAND_WRITE_TIMEOUT_MS,
          'WHOOP command write without response timed out',
        );
      } catch (withoutResponseError) {
        this.clearCommandChannelIfCurrent(device, epoch);
        throw withoutResponseError;
      }
    }
  }

  private invalidateCommandQueue(): void {
    this.commandEpoch += 1;
    this.commandQueue = Promise.resolve();
  }

  private clearCommandChannelIfCurrent(device: Device, epoch: number): void {
    if (epoch !== this.commandEpoch || this.device?.id !== device.id) return;
    this.writeService = null;
    this.writeChar = null;
  }

  private async abandonCurrentConnection(): Promise<void> {
    const stale = this.device;
    this.invalidateCommandQueue();
    this.clearKeepalive();
    this.clearSubscriptions();
    if (this.disconnectSub) {
      this.disconnectSub.remove();
      this.disconnectSub = null;
    }
    this.device = null;
    this.writeService = null;
    this.writeChar = null;
    await stale?.cancelConnection().catch(() => {});
  }

  private recoverStaleLink(detail: string): void {
    const stale = this.device;
    this.invalidateCommandQueue();
    this.clearKeepalive();
    this.clearSubscriptions();
    this.device = null;
    this.writeService = null;
    this.writeChar = null;
    this.setStatus('disconnected', detail);
    void stale?.cancelConnection().catch(() => {});
    if (this.wantConnected) this.scheduleReconnect();
  }

  private trySubscribe(
    device: Device,
    serviceUuid: string,
    charUuid: string,
    onBytes: (bytes: Uint8Array) => void,
    critical = false,
  ): void {
    try {
      const sub = device.monitorCharacteristicForService(
        serviceUuid,
        charUuid,
        (error, characteristic) => {
          if (error) {
            if (critical && this.wantConnected && this.device?.id === device.id && !this.reArm) {
              this.reArm = setTimeout(() => {
                this.reArm = null;
                if (this.wantConnected && this.device?.id === device.id) {
                  this.recoverStaleLink('WHOOP history subscription stopped - reconnecting...');
                }
              }, 1500);
            }
            return;
          }
          const value = characteristic?.value;
          if (value) onBytes(base64ToBytes(value));
        },
      );
      this.subscriptions.push(sub);
    } catch {
      // Characteristic not available on this firmware — non-fatal.
    }
  }

  private async tryReadBattery(device: Device): Promise<void> {
    try {
      const ch = await device.readCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL);
      if (ch.value) {
        const bytes = base64ToBytes(ch.value);
        if (bytes.length >= 1) this.events.onBattery?.(bytes[0] as number);
      }
    } catch {
      // Battery service may be absent — non-fatal.
    }
  }

  /** Tear down subscriptions, disconnect, and release the manager. */
  async stop(): Promise<void> {
    this.wantConnected = false; // user asked to disconnect → stop auto-reconnect
    this.invalidateCommandQueue();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.clearKeepalive();
    this.clearSubscriptions();
    if (this.disconnectSub) {
      this.disconnectSub.remove();
      this.disconnectSub = null;
    }
    if (this.scanning) {
      this.manager.stopDeviceScan();
      this.scanning = false;
    }
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        // ignore
      }
      this.device = null;
    }
    this.writeService = null;
    this.writeChar = null;
    this.setStatus('idle');
  }

  destroy(): void {
    void this.stop();
    this.manager.destroy();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCommandWriteChar(uuid: string): boolean {
  return uuid.startsWith(WHOOP_CMD_WRITE_PREFIX) || uuid.startsWith(WHOOP_CMD_WRITE_PREFIX_4);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isTimeoutError(error: unknown, label: string): boolean {
  return error instanceof Error && error.message === label;
}

function shortPermissionName(permission: string): string {
  return permission.replace('android.permission.', '');
}

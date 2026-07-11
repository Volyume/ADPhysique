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
  ScanMode,
  State,
  Subscription,
} from 'react-native-ble-plx';

import {
  BATTERY_LEVEL,
  BATTERY_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  WHOOP4_DATA_NOTIFY,
  WHOOP4_CMD_WRITE,
  WHOOP4_SERVICE,
  WHOOP5_DATA_NOTIFY,
  WHOOP5_CMD_WRITE,
  WHOOP5_SERVICE,
  WHOOP_CHAR_PREFIX,
  WHOOP_CHAR_PREFIX_4,
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
const COMMAND_REDISCOVERY_FAILURE_LIMIT = 3;

export type CommandRediscoveryAction = 'retry' | 'reconnect';

export function commandRediscoveryAction(failures: number, limit = 3): CommandRediscoveryAction {
  return Math.max(0, Math.floor(failures)) >= Math.max(1, Math.floor(limit)) ? 'reconnect' : 'retry';
}

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
  private keepaliveWriteInFlight = false;
  private reArm: ReturnType<typeof setInterval> | null = null;
  private wantConnected = false; // user wants a connection → auto-reconnect on drop
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private commandQueue: Promise<void> = Promise.resolve();
  private commandEpoch = 0;
  private connectionFlight: Promise<void> | null = null;
  private healthProbeFlight: Promise<boolean> | null = null;
  private lifecycleGeneration = 0;
  private connectionGeneration = 0;
  private commandRediscoveryFailures = 0;
  private stateChangeSub: Subscription | null = null;
  private resolveStateWait: (() => void) | null = null;
  private stateWaitLifecycle: number | null = null;
  private resolveScan: (() => void) | null = null;
  private scanLifecycle: number | null = null;

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
            this.clearReconnectTimer();
            void this.runConnectionFlight((lifecycle) =>
              this.adoptConnectedDevice(restoredDevice, lifecycle),
            );
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
    this.clearReconnectTimer();
    if (preferredDeviceId) this.lastDeviceId = preferredDeviceId;
    await this.runConnectionFlight((lifecycle) => this.startFlow(lifecycle));
  }

  private runConnectionFlight(task: (lifecycle: number) => Promise<void>): Promise<void> {
    if (this.connectionFlight) return this.connectionFlight;
    const lifecycle = ++this.lifecycleGeneration;
    let flight!: Promise<void>;
    flight = task(lifecycle).finally(() => {
      if (this.connectionFlight === flight) this.connectionFlight = null;
    });
    this.connectionFlight = flight;
    return flight;
  }

  private async startFlow(lifecycle: number): Promise<void> {
    const ok = await this.ensurePermissions();
    if (!ok || !this.isLifecycleCurrent(lifecycle)) {
      if (this.wantConnected && this.isLifecycleCurrent(lifecycle)) {
        this.setStatus('unauthorized', 'Bluetooth permission denied');
      }
      return;
    }

    const state = await this.manager.state();
    if (!this.isLifecycleCurrent(lifecycle)) return;
    if (state !== State.PoweredOn) {
      this.setStatus('bluetooth-off', `Bluetooth state: ${state}`);
      if (!(await this.waitForPoweredOn(lifecycle))) return;
    }

    if (this.lastDeviceId) {
      const reconnected = await this.connectById(this.lastDeviceId, lifecycle);
      if (reconnected) return;
    }
    this.clearReconnectTimer();
    if (this.wantConnected && this.isLifecycleCurrent(lifecycle)) await this.scan(lifecycle);
  }

  private async waitForPoweredOn(lifecycle: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (poweredOn: boolean) => {
        if (settled) return;
        settled = true;
        if (this.stateWaitLifecycle === lifecycle) {
          this.stateChangeSub?.remove();
          this.stateChangeSub = null;
          this.stateWaitLifecycle = null;
          this.resolveStateWait = null;
        }
        resolve(poweredOn && this.isLifecycleCurrent(lifecycle));
      };
      const cancel = () => finish(false);
      this.stateWaitLifecycle = lifecycle;
      this.resolveStateWait = cancel;
      const sub = this.manager.onStateChange((nextState) => {
        if (nextState === State.PoweredOn) finish(true);
      }, false);
      if (!settled && this.stateWaitLifecycle === lifecycle) {
        this.stateChangeSub = sub;
      } else {
        sub.remove();
      }
    });
  }

  private async scan(lifecycle: number): Promise<void> {
    if (!this.isLifecycleCurrent(lifecycle) || this.scanning) return;
    this.scanning = true;
    this.scanLifecycle = lifecycle;
    this.setStatus('scanning', 'Scanning for WHOOP advertisements...');

    await new Promise<void>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (this.resolveScan === finish) this.resolveScan = null;
        if (this.scanLifecycle === lifecycle) this.scanLifecycle = null;
        resolve();
      };
      this.resolveScan = finish;
      this.manager.startDeviceScan(
        null,
        {
          allowDuplicates: false,
          ...(Platform.OS === 'android' ? { scanMode: ScanMode.Balanced } : {}),
        },
        (error, device) => {
          if (this.scanLifecycle !== lifecycle) {
            finish();
            return;
          }
          if (!this.isLifecycleCurrent(lifecycle)) {
            this.manager.stopDeviceScan();
            this.scanning = false;
            finish();
            return;
          }
          if (error) {
            this.scanning = false;
            this.fail(`Scan error: ${error.message}`);
            finish();
            return;
          }
          const name = device?.name ?? device?.localName ?? '';
          if (device && name.toUpperCase().startsWith(WHOOP_NAME_PREFIX)) {
            this.manager.stopDeviceScan();
            this.scanning = false;
            void this.connect(device, lifecycle).finally(finish);
          }
        },
      );

      // Stop scanning after 30s if nothing found.
      timer = setTimeout(() => {
        if (this.scanLifecycle !== lifecycle) {
          finish();
          return;
        }
        if (!this.scanning || !this.isLifecycleCurrent(lifecycle)) {
          finish();
          return;
        }
        this.manager.stopDeviceScan();
        this.scanning = false;
        if (this.wantConnected) {
          // Keep trying rather than giving up — the strap may be out of range or
          // not yet in pairing mode. Backoff between sweeps.
          this.setStatus('disconnected', 'No strap found — retrying…');
          this.scheduleReconnect();
        }
        finish();
      }, SCAN_TIMEOUT_MS);
    });
  }

  private async connect(device: Device, lifecycle: number): Promise<boolean> {
    return this.connectDevice(
      lifecycle,
      () => device.connect({ requestMTU: 247 }),
      DEVICE_CONNECT_TIMEOUT_MS,
      'WHOOP connect timed out',
      device,
    );
  }

  private async connectById(deviceId: string, lifecycle: number): Promise<boolean> {
    return this.connectDevice(
      lifecycle,
      () => this.manager.connectToDevice(deviceId, { requestMTU: 247 }),
      DIRECT_CONNECT_TIMEOUT_MS,
      'Saved WHOOP reconnect timed out',
    );
  }

  private async connectDevice(
    lifecycle: number,
    connect: () => Promise<Device>,
    timeoutMs: number,
    timeoutLabel: string,
    candidate?: Device,
  ): Promise<boolean> {
    const generation = this.beginConnectionAttempt();
    if (!this.isLifecycleCurrent(lifecycle)) return false;
    if (candidate) {
      this.lastDeviceId = candidate.id;
      this.events.onDevice?.({
        id: candidate.id,
        name: candidate.name ?? candidate.localName ?? 'WHOOP',
      });
      this.setStatus('connecting', candidate.name ?? candidate.id);
    } else {
      this.setStatus('connecting', 'reconnecting…');
    }

    let connected: Device | null = null;
    try {
      const nativeConnect = connect();
      void nativeConnect
        .then((lateDevice) => {
          if (!this.isAttemptCurrent(lifecycle, generation)) {
            return lateDevice.cancelConnection().catch(() => {});
          }
        })
        .catch(() => {});
      connected = await withTimeout(nativeConnect, timeoutMs, timeoutLabel);
      if (!this.isAttemptCurrent(lifecycle, generation)) {
        await connected.cancelConnection().catch(() => {});
        return false;
      }
      await this.afterConnect(connected, lifecycle, generation);
      return this.isConnectionCurrent(connected, lifecycle, generation);
    } catch (e) {
      if (connected && !this.isAttemptCurrent(lifecycle, generation)) {
        await connected.cancelConnection().catch(() => {});
        return false;
      }
      if (this.isAttemptCurrent(lifecycle, generation)) {
        await this.abandonCurrentConnection(generation);
        this.setStatus('disconnected', `Connect failed: ${String(e)}`);
        if (this.wantConnected) this.scheduleReconnect();
      }
      return false;
    }
  }

  /** Post-connect bring-up — shared by first connect and auto-reconnect. */
  private async adoptConnectedDevice(restored: Device, lifecycle: number): Promise<void> {
    const generation = this.beginConnectionAttempt();
    if (!this.isLifecycleCurrent(lifecycle)) {
      await restored.cancelConnection().catch(() => {});
      return;
    }
    try {
      if (!this.isAttemptCurrent(lifecycle, generation)) {
        await restored.cancelConnection().catch(() => {});
        return;
      }
      await this.afterConnect(restored, lifecycle, generation);
    } catch (e) {
      if (this.isConnectionCurrent(restored, lifecycle, generation)) {
        await this.abandonCurrentConnection(generation);
        this.setStatus('disconnected', `Restored connection failed: ${String(e)}`);
        if (this.wantConnected) this.scheduleReconnect();
      } else {
        await restored.cancelConnection().catch(() => {});
      }
    }
  }

  /** Post-connect bring-up — shared by first connect and auto-reconnect. */
  private async afterConnect(
    connected: Device,
    lifecycle: number,
    generation: number,
  ): Promise<void> {
    if (!this.isAttemptCurrent(lifecycle, generation)) {
      await connected.cancelConnection().catch(() => {});
      return;
    }
    this.invalidateCommandQueue();
    this.clearKeepalive();
    this.clearSubscriptions();
    if (this.disconnectSub) {
      this.disconnectSub.remove();
      this.disconnectSub = null;
    }
    this.device = connected;
    this.commandRediscoveryFailures = 0;
    this.lastDeviceId = connected.id;
    this.events.onDevice?.({ id: connected.id, name: connected.name ?? connected.localName ?? 'WHOOP' });
    this.disconnectSub = connected.onDisconnected((error) => {
      if (!this.isConnectionCurrent(connected, lifecycle, generation)) return;
      this.invalidateConnection(generation);
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
    if (!this.isConnectionCurrent(connected, lifecycle, generation)) return;
    await this.locateWriteChar(connected, generation);
    if (!this.isConnectionCurrent(connected, lifecycle, generation)) return;
    await this.subscribeAll(connected, generation);
    if (!this.isConnectionCurrent(connected, lifecycle, generation)) return;
    this.subscribeStandardHr(connected, generation);
    this.reconnectAttempts = 0; // healthy connection — reset backoff
    this.clearReconnectTimer();
    this.setStatus('connected', connected.name ?? connected.id);
    this.startLinkMaintenance(connected, generation);
  }

  /** Schedule a reconnect attempt with exponential backoff (2s → 60s cap). */
  private scheduleReconnect(): void {
    if (!this.wantConnected || this.reconnectTimer || this.isConnected) return;
    const delayMs = Math.min(60000, 2000 * 2 ** Math.min(this.reconnectAttempts, 5));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.attemptReconnect();
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private async attemptReconnect(): Promise<void> {
    await this.runConnectionFlight(async (lifecycle) => {
      if (!this.wantConnected || this.isConnected) return;
      // Fast path: reconnect to the known device by id; fall back to a fresh scan.
      if (this.lastDeviceId && (await this.connectById(this.lastDeviceId, lifecycle))) return;
      this.clearReconnectTimer();
      if (this.wantConnected && this.isLifecycleCurrent(lifecycle)) await this.scan(lifecycle);
    });
  }

  private isLifecycleCurrent(lifecycle: number): boolean {
    return this.wantConnected && this.lifecycleGeneration === lifecycle;
  }

  private isAttemptCurrent(lifecycle: number, generation: number): boolean {
    return this.isLifecycleCurrent(lifecycle) && this.connectionGeneration === generation;
  }

  private isConnectionCurrent(device: Device, lifecycle: number, generation: number): boolean {
    return (
      this.isAttemptCurrent(lifecycle, generation) &&
      this.device?.id === device.id
    );
  }

  private beginConnectionAttempt(): number {
    const stale = this.device;
    const generation = ++this.connectionGeneration;
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
    this.commandRediscoveryFailures = 0;
    void stale?.cancelConnection().catch(() => {});
    return generation;
  }

  private invalidateConnection(generation?: number): void {
    if (generation !== undefined && this.connectionGeneration !== generation) return;
    this.connectionGeneration += 1;
  }

  /** Scan the GATT table for the proprietary command-write characteristic. */
  private async locateWriteChar(device: Device, generation?: number): Promise<void> {
    const services = await device.services();
    if (generation !== undefined && !this.isDeviceGenerationCurrent(device, generation)) return;
    let knownService: string | null = null;
    for (const service of services) {
      const serviceUuid = service.uuid.toLowerCase();
      if (serviceUuid === WHOOP5_SERVICE || serviceUuid === WHOOP4_SERVICE) {
        knownService = service.uuid;
      }
      const chars = await service.characteristics();
      if (generation !== undefined && !this.isDeviceGenerationCurrent(device, generation)) return;
      for (const ch of chars) {
        const lc = ch.uuid.toLowerCase();
        if (isCommandWriteChar(lc)) {
          if (generation !== undefined && !this.isDeviceGenerationCurrent(device, generation)) return;
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
    if (generation !== undefined && !this.isDeviceGenerationCurrent(device, generation)) return;
    if (knownService?.toLowerCase() === WHOOP5_SERVICE) {
      this.writeService = knownService;
      this.writeChar = WHOOP5_CMD_WRITE;
    } else if (knownService?.toLowerCase() === WHOOP4_SERVICE) {
      this.writeService = knownService;
      this.writeChar = WHOOP4_CMD_WRITE;
    }
  }

  private isDeviceGenerationCurrent(device: Device, generation: number): boolean {
    return this.device?.id === device.id && this.connectionGeneration === generation;
  }

  /** Keep the command link alive without starting live-only streams. */
  private startLinkMaintenance(device: Device, generation: number): void {
    if (!this.isDeviceGenerationCurrent(device, generation) || !this.canSendCommands) return;
    this.clearKeepalive();
    void this.runGentleHandshake(device, generation);
    // The hardware-validated r52 cadence is 2 seconds. The in-flight guard
    // prevents a slow Android write from building a keepalive backlog.
    let failures = 0;
    this.keepalive = setInterval(() => {
      if (!this.isDeviceGenerationCurrent(device, generation) || this.keepaliveWriteInFlight) return;
      this.keepaliveWriteInFlight = true;
      this.writeCommand(cmdLinkValid())
        .then(() => {
          failures = 0;
        })
        .catch(() => {
          if (!this.isDeviceGenerationCurrent(device, generation)) return;
          failures += 1;
          if (failures >= 3) this.recoverStaleLink('Link validation failed - reconnecting...');
        })
        .finally(() => {
          this.keepaliveWriteInFlight = false;
        });
    }, 2_000);
  }

  private async runGentleHandshake(device: Device, generation: number): Promise<void> {
    await delay(750);
    await this.safeWriteCommand(cmdGetHelloHarvard(), device, generation);
    await delay(150);
    await this.safeWriteCommand(cmdGetHello(), device, generation);
    await delay(150);
    await this.safeWriteCommand(cmdSetClock(), device, generation);
    await delay(150);
    await this.safeWriteCommand(cmdEnableHrBroadcast(true), device, generation);
  }

  private async safeWriteCommand(bytes: Uint8Array, device: Device, generation: number): Promise<boolean> {
    if (!this.isDeviceGenerationCurrent(device, generation) || !this.canSendCommands) return false;
    try {
      await this.writeCommand(bytes);
      return true;
    } catch {
      return false;
    }
  }

  private subscribeStandardHr(device: Device, generation: number): void {
    this.trySubscribe(
      device,
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT,
      (bytes) => {
        const sample = decodeHeartRate(bytes);
        if (sample) this.events.onHeartRate?.(sample);
      },
      generation,
    );
  }

  private clearKeepalive(): void {
    if (this.keepalive) {
      clearInterval(this.keepalive);
      this.keepalive = null;
    }
    this.keepaliveWriteInFlight = false;
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

  private async subscribeAll(device: Device, generation: number): Promise<void> {
    const services = await device.services();
    if (!this.isDeviceGenerationCurrent(device, generation)) return;
    const discovered: DiscoveredChar[] = [];
    const rawSubscriptions = new Set<string>();

    for (const service of services) {
      const chars = await service.characteristics();
      if (!this.isDeviceGenerationCurrent(device, generation)) return;
      for (const ch of chars) {
        discovered.push({
          service: service.uuid,
          characteristic: ch.uuid,
          notifiable: ch.isNotifiable || ch.isIndicatable,
          writable: ch.isWritableWithResponse || ch.isWritableWithoutResponse,
        });
      }
    }
    if (!this.isDeviceGenerationCurrent(device, generation)) return;
    this.events.onDiscovered?.(discovered);

    // Standard HR (0x2A37) is subscribed AFTER the HR-broadcast is enabled
    // (see subscribeStandardHr), since it isn't notifying yet at this point.

    // Standard battery level.
    this.tryReadBattery(device, generation);
    this.trySubscribe(device, BATTERY_SERVICE, BATTERY_LEVEL, (bytes) => {
      if (bytes.length >= 1) this.events.onBattery?.(bytes[0] as number);
    }, generation);

    // 3) Proprietary fd4b notify characteristics -> capture raw frames.
    let historySubscriptionInstalled = false;
    for (const dc of discovered) {
      const lc = dc.characteristic.toLowerCase();
      if (dc.notifiable && (lc.startsWith(WHOOP_CHAR_PREFIX) || lc.startsWith(WHOOP_CHAR_PREFIX_4))) {
        const label = lc.slice(0, 8);
        rawSubscriptions.add(`${dc.service.toLowerCase()}|${lc}`);
        this.trySubscribe(
          device,
          dc.service,
          dc.characteristic,
          (bytes) => {
            this.events.onRawFrame?.({ ts: Date.now(), source: label, hex: bytesToHex(bytes) });
          },
          generation,
          lc.startsWith('fd4b0005'),
        );
        if (lc.startsWith('fd4b0005')) historySubscriptionInstalled = true;
      }
      // Remember the command-write characteristic for the drain. Trust the UUID
      // even if Android's cached properties do not mark it writable.
      if (isCommandWriteChar(lc)) {
        if (!this.isDeviceGenerationCurrent(device, generation)) return;
        this.writeService = dc.service;
        this.writeChar = dc.characteristic;
      }
    }

    // Android may omit cached notification properties even though the known
    // WHOOP data characteristic remains monitorable.
    for (const service of services) {
      const serviceUuid = service.uuid.toLowerCase();
      const dataChar =
        serviceUuid === WHOOP5_SERVICE
          ? WHOOP5_DATA_NOTIFY
          : serviceUuid === WHOOP4_SERVICE
            ? WHOOP4_DATA_NOTIFY
            : null;
      if (!dataChar) continue;
      const key = `${serviceUuid}|${dataChar}`;
      if (rawSubscriptions.has(key)) continue;
      const label = dataChar.slice(0, 8);
      this.trySubscribe(
        device,
        service.uuid,
        dataChar,
        (bytes) => this.events.onRawFrame?.({ ts: Date.now(), source: label, hex: bytesToHex(bytes) }),
        generation,
        serviceUuid === WHOOP5_SERVICE,
      );
      rawSubscriptions.add(key);
      if (serviceUuid === WHOOP5_SERVICE) historySubscriptionInstalled = true;
    }
    if (services.some((service) => service.uuid.toLowerCase() === WHOOP5_SERVICE) && !historySubscriptionInstalled) {
      throw new Error('WHOOP fd4b0005 history notification subscription was not installed');
    }
  }

  async refreshCommandChannel(): Promise<boolean> {
    if (!this.device) return false;
    if (this.canSendCommands) {
      this.commandRediscoveryFailures = 0;
      return true;
    }
    const device = this.device;
    const generation = this.connectionGeneration;
    try {
      await withTimeout(
        device.discoverAllServicesAndCharacteristics(),
        DISCOVER_TIMEOUT_MS,
        'WHOOP command rediscovery timed out',
      );
      await this.locateWriteChar(device, generation);
      if (this.isDeviceGenerationCurrent(device, generation) && this.canSendCommands) {
        this.commandRediscoveryFailures = 0;
        return true;
      }
      return this.recordCommandRediscoveryFailure(device, generation);
    } catch {
      return this.recordCommandRediscoveryFailure(device, generation);
    }
  }

  /** Verify a nominally connected link before foreground work resumes. */
  healthProbe(): Promise<boolean> {
    if (this.healthProbeFlight) return this.healthProbeFlight;
    const flight = this.performHealthProbe().finally(() => {
      if (this.healthProbeFlight === flight) this.healthProbeFlight = null;
    });
    this.healthProbeFlight = flight;
    return flight;
  }

  private async performHealthProbe(): Promise<boolean> {
    const device = this.device;
    const generation = this.connectionGeneration;
    if (!device) return false;
    if (!this.canSendCommands && !(await this.refreshCommandChannel())) {
      if (this.isDeviceGenerationCurrent(device, generation)) {
        this.recoverStaleLink('WHOOP foreground command channel check failed - reconnecting...');
      }
      return false;
    }
    if (!this.isDeviceGenerationCurrent(device, generation)) return false;
    try {
      await withTimeout(
        this.writeCommand(cmdLinkValid()),
        COMMAND_WRITE_TIMEOUT_MS,
        'WHOOP foreground health probe timed out',
      );
      return this.isDeviceGenerationCurrent(device, generation);
    } catch {
      if (this.isDeviceGenerationCurrent(device, generation)) {
        this.recoverStaleLink('WHOOP foreground health probe failed - reconnecting...');
      }
      return false;
    }
  }

  private recordCommandRediscoveryFailure(device: Device, generation: number): false {
    if (!this.isDeviceGenerationCurrent(device, generation)) return false;
    this.commandRediscoveryFailures += 1;
    if (commandRediscoveryAction(this.commandRediscoveryFailures) === 'reconnect') {
      this.recoverStaleLink('WHOOP command channel rediscovery failed - reconnecting...');
    }
    return false;
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

  get connectionSessionId(): number {
    return this.connectionGeneration;
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

  private async abandonCurrentConnection(generation?: number): Promise<void> {
    if (generation !== undefined && this.connectionGeneration !== generation) return;
    const stale = this.device;
    this.invalidateConnection(generation);
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
    this.invalidateConnection(this.connectionGeneration);
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
    this.setStatus('disconnected', detail);
    void stale?.cancelConnection().catch(() => {});
    if (this.wantConnected) this.scheduleReconnect();
  }

  private trySubscribe(
    device: Device,
    serviceUuid: string,
    charUuid: string,
    onBytes: (bytes: Uint8Array) => void,
    generation: number,
    critical = false,
  ): void {
    try {
      const sub = device.monitorCharacteristicForService(
        serviceUuid,
        charUuid,
        (error, characteristic) => {
          if (!this.isDeviceGenerationCurrent(device, generation)) return;
          if (error) {
            if (critical && !this.reArm) {
              this.reArm = setTimeout(() => {
                this.reArm = null;
                if (this.isDeviceGenerationCurrent(device, generation)) {
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
    } catch (error) {
      if (critical) {
        throw new Error(`Critical WHOOP history notification subscription failed for ${charUuid}: ${String(error)}`);
      }
      // Characteristic not available on this firmware — non-fatal.
    }
  }

  private async tryReadBattery(device: Device, generation: number): Promise<void> {
    try {
      const ch = await device.readCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL);
      if (ch.value && this.isDeviceGenerationCurrent(device, generation)) {
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
    this.lifecycleGeneration += 1;
    this.invalidateConnection();
    this.connectionFlight = null;
    this.resolveStateWait?.();
    this.resolveStateWait = null;
    this.stateWaitLifecycle = null;
    this.resolveScan?.();
    this.resolveScan = null;
    this.invalidateCommandQueue();
    this.clearReconnectTimer();
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
    this.scanLifecycle = null;
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

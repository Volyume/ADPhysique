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
  WHOOP_CHAR_PREFIX,
  WHOOP_CMD_WRITE_PREFIX,
  WHOOP_NAME_PREFIX,
} from './constants';
import { base64ToBytes, bytesToBase64, bytesToHex } from './bytes';
import { decodeHeartRate, HeartRateSample } from './heartRate';
import {
  cmdEnableHrBroadcast,
  cmdGetHello,
  cmdLinkValid,
  cmdSetClock,
  cmdToggleRealtimeHr,
  cmdToggleImuMode,
  cmdStartRawData,
} from '../whoop/commands';

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
  private subscriptions: Subscription[] = [];
  private scanning = false;
  private writeService: string | null = null;
  private writeChar: string | null = null;
  private keepalive: ReturnType<typeof setInterval> | null = null;
  private reArm: ReturnType<typeof setInterval> | null = null;

  constructor(events: WhoopEvents) {
    // restoreStateIdentifier enables iOS CoreBluetooth State Preservation &
    // Restoration: with the `bluetooth-central` background mode, iOS relaunches
    // the app in the background when the strap has data, so overnight HR keeps
    // logging without the app open. Ignored on Android.
    this.manager = new BleManager({
      restoreStateIdentifier: 'volyume-pulse-ble',
      restoreStateFunction: (restored) => {
        const peripherals = restored?.connectedPeripherals ?? [];
        if (peripherals.length > 0) {
          this.device = peripherals[0] ?? null;
          this.setStatus('connected', this.device?.name ?? this.device?.id);
        }
      },
    });
    this.events = events;
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
      return wanted.every(
        (p) => granted[p] === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch (e) {
      this.fail(`Permission request failed: ${String(e)}`);
      return false;
    }
  }

  /** Full flow: permissions -> wait for BT on -> scan -> connect -> subscribe. */
  async start(): Promise<void> {
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

    await this.scan();
  }

  private async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.setStatus('scanning');

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
        this.fail('No WHOOP strap found. Is it in pairing mode and disconnected from the official app?');
      }
    }, 30000);
  }

  private async connect(device: Device): Promise<void> {
    try {
      this.setStatus('connecting', device.name ?? device.id);
      this.events.onDevice?.({ id: device.id, name: device.name ?? device.localName ?? 'WHOOP' });

      const connected = await device.connect({ requestMTU: 247 });
      this.device = connected;

      connected.onDisconnected(() => {
        this.clearKeepalive();
        this.setStatus('disconnected');
      });

      this.setStatus('discovering');
      await connected.discoverAllServicesAndCharacteristics();
      await this.locateWriteChar(connected);

      // Subscribe to the proprietary notify characteristics BEFORE writing any
      // command (the strap needs CCCD enabled first, and we must catch the
      // command responses + data). Order verified against whoop-vault.
      await this.subscribeAll(connected);

      // Bring-up: hello -> set clock -> enable live HR (standard 0x2A37 +
      // proprietary) -> LINK_VALID keepalive every ~2s. No WHOOP app needed.
      await this.startStreaming();

      // The standard HR service only begins after TOGGLE_GENERIC_HR_PROFILE, so
      // re-discover and subscribe 0x2A37 now that it's broadcasting.
      await delay(900);
      await connected.discoverAllServicesAndCharacteristics();
      this.subscribeStandardHr(connected);
      this.setStatus('connected', connected.name ?? connected.id);
    } catch (e) {
      this.fail(`Connect failed: ${String(e)}`);
    }
  }

  /** Scan the GATT table for the proprietary command-write characteristic. */
  private async locateWriteChar(device: Device): Promise<void> {
    const services = await device.services();
    for (const service of services) {
      const chars = await service.characteristics();
      for (const ch of chars) {
        const lc = ch.uuid.toLowerCase();
        if (
          (ch.isWritableWithResponse || ch.isWritableWithoutResponse) &&
          lc.startsWith(WHOOP_CMD_WRITE_PREFIX)
        ) {
          this.writeService = service.uuid;
          this.writeChar = ch.uuid;
          return;
        }
      }
    }
  }

  /**
   * Self-start the live HR stream (no official WHOOP app): say hello, enable the
   * standard 0x2A37 HR broadcast + proprietary realtime HR, then keep the link
   * alive with LINK_VALID every 10 s.
   */
  private async startStreaming(): Promise<void> {
    if (!this.canSendCommands) return;
    try {
      await this.writeCommand(cmdGetHello()); // GET_HELLO_HARVARD (35)
      await this.writeCommand(cmdSetClock()); // SET_CLOCK (10)
      await this.writeCommand(cmdEnableHrBroadcast(true)); // 14 -> standard 0x2A37
      await this.writeCommand(cmdToggleRealtimeHr(true)); // 3 -> proprietary HR
      await this.writeCommand(cmdToggleImuMode(true)); // 106 -> IMU/accel stream (band steps)
      await this.writeCommand(cmdStartRawData()); // 81 -> raw accel (fallback motion source)
    } catch {
      // best-effort; live HR may still arrive once the keepalive holds the link
    }
    this.clearKeepalive();
    // LINK_VALID keepalive every 2s — the strap drops the link without it
    // (whoop-vault LINK_VALID_INTERVAL_S = 2.0).
    this.keepalive = setInterval(() => {
      this.writeCommand(cmdLinkValid()).catch(() => {});
    }, 2000);
    // Re-arm the realtime HR stream periodically to sustain proprietary samples.
    this.reArm = setInterval(() => {
      this.writeCommand(cmdToggleRealtimeHr(true)).catch(() => {});
    }, 6000);
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
        this.trySubscribe(device, dc.service, dc.characteristic, (bytes) => {
          this.events.onRawFrame?.({ ts: Date.now(), source: label, hex: bytesToHex(bytes) });
        });
      }
      // Remember the command-write characteristic (fd4b0002) for the drain.
      if (dc.writable && lc.startsWith(WHOOP_CMD_WRITE_PREFIX)) {
        this.writeService = dc.service;
        this.writeChar = dc.characteristic;
      }
    }
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
  async writeCommand(bytes: Uint8Array): Promise<void> {
    if (!this.device || !this.writeService || !this.writeChar) {
      throw new Error('Command-write characteristic not available');
    }
    await this.device.writeCharacteristicWithResponseForService(
      this.writeService,
      this.writeChar,
      bytesToBase64(bytes),
    );
  }

  private trySubscribe(
    device: Device,
    serviceUuid: string,
    charUuid: string,
    onBytes: (bytes: Uint8Array) => void,
  ): void {
    try {
      const sub = device.monitorCharacteristicForService(
        serviceUuid,
        charUuid,
        (error, characteristic) => {
          if (error) {
            // A characteristic that isn't present simply won't notify; ignore
            // cancellation errors on teardown.
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
    this.clearKeepalive();
    for (const sub of this.subscriptions) {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    }
    this.subscriptions = [];
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

/**
 * BLE UUIDs for the WHOOP strap.
 *
 * Two groups:
 *  1. STANDARD Bluetooth SIG services the strap exposes. The WHOOP 5.0 streams
 *     live heart rate on the standard Heart Rate Service (0x2A37) — "the same
 *     source the official app uses on its live HR screen" — and battery on
 *     0x2A19. These are fully documented by the Bluetooth SIG, so decoding them
 *     is reliable and not WHOOP-specific. This is the backbone of the live data.
 *  2. PROPRIETARY WHOOP characteristics (fd4b000x). These carry commands,
 *     events and the historical/realtime data stream using WHOOP's "Maverick"
 *     framing (see ../whoop/maverick.ts). A fresh client only gets live HR over
 *     the standard service until the deep streams are unlocked (see
 *     ../whoop/commands.ts cmdEnableDeepStreams).
 *
 * Protocol facts sourced from the whoop-vault reverse-engineering project and
 * NOOP (WHOOP 5.0, firmware r52 "Maverick"), not guessed. The full 128-bit base
 * for the fd4b characteristics is captured live from the device during service
 * discovery rather than hard-coded, because only the 32-bit prefix is published.
 */

// Standard GATT Heart Rate Service.
export const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

// Standard GATT Battery Service.
export const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

/**
 * Prefix shared by every proprietary WHOOP characteristic (fd4b0002..fd4b0007).
 * We match characteristics by this prefix at runtime instead of hard-coding the
 * full UUIDs, so service discovery works regardless of the exact 128-bit base.
 */
export const WHOOP_CHAR_PREFIX = 'fd4b';

/**
 * Known proprietary characteristics, by their 32-bit prefix (from whoop-vault):
 *   fd4b0002 — write   (commands to strap)
 *   fd4b0003 — notify  (command responses)
 *   fd4b0004 — notify  (events)
 *   fd4b0005 — notify  (historical + realtime data)
 *   fd4b0007 — notify  (logs / Memfault)
 */
export const WHOOP_CMD_WRITE_PREFIX = 'fd4b0002';
export const WHOOP_CMD_NOTIFY_PREFIX = 'fd4b0003';
export const WHOOP_EVENT_NOTIFY_PREFIX = 'fd4b0004';
export const WHOOP_DATA_NOTIFY_PREFIX = 'fd4b0005';
export const WHOOP_LOG_NOTIFY_PREFIX = 'fd4b0007';

// Strap advertises with a name beginning "WHOOP".
export const WHOOP_NAME_PREFIX = 'WHOOP';

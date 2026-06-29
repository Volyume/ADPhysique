/**
 * BLE UUIDs for the WHOOP strap.
 *
 * These are VERIFIED against the official WHOOP Android app v5.444.1
 * (com.whoop.android, decompiled) — exact 128-bit UUIDs, not guesses.
 *
 * Three groups:
 *  1. STANDARD Bluetooth SIG services. The WHOOP 5.0 streams live heart rate on
 *     the standard Heart Rate Service (0x2A37) and battery on 0x2A19. Reliable,
 *     non-proprietary.
 *  2. PROPRIETARY WHOOP 5.0 ("Maverick"/"Puffin") service fd4b0001-cce1-…, with
 *     command/response/event/data/log characteristics. Carries the Maverick
 *     framing (see ../whoop/maverick.ts).
 *  3. LEGACY WHOOP 4.0 service 61080001-8d6d-… (this app still supports it). Kept
 *     so the app also works with a 4.0 strap.
 */

// Standard GATT.
export const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';
export const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

// Proprietary WHOOP 5.0 service + characteristics (exact, from WHOOP 5.444.1).
export const WHOOP5_SERVICE = 'fd4b0001-cce1-4033-93ce-002d5875f58a';
export const WHOOP5_CMD_WRITE = 'fd4b0002-cce1-4033-93ce-002d5875f58a';
export const WHOOP5_CMD_NOTIFY = 'fd4b0003-cce1-4033-93ce-002d5875f58a';
export const WHOOP5_EVENT_NOTIFY = 'fd4b0004-cce1-4033-93ce-002d5875f58a';
export const WHOOP5_DATA_NOTIFY = 'fd4b0005-cce1-4033-93ce-002d5875f58a';
export const WHOOP5_LOG_NOTIFY = 'fd4b0007-cce1-4033-93ce-002d5875f58a';

// Legacy WHOOP 4.0 service + characteristics.
export const WHOOP4_SERVICE = '61080001-8d6d-82b8-614a-1c8cb0f8dcc6';
export const WHOOP4_CMD_WRITE = '61080002-8d6d-82b8-614a-1c8cb0f8dcc6';
export const WHOOP4_CMD_NOTIFY = '61080003-8d6d-82b8-614a-1c8cb0f8dcc6';
export const WHOOP4_EVENT_NOTIFY = '61080004-8d6d-82b8-614a-1c8cb0f8dcc6';
export const WHOOP4_DATA_NOTIFY = '61080005-8d6d-82b8-614a-1c8cb0f8dcc6';

/**
 * Prefixes used to match proprietary characteristics at runtime regardless of
 * firmware/generation: any characteristic starting fd4b00 (5.0) or 61080000
 * (4.0). The command-write char is fd4b0002 / 61080002.
 */
export const WHOOP_CHAR_PREFIX = 'fd4b';
export const WHOOP_CHAR_PREFIX_4 = '6108';
export const WHOOP_CMD_WRITE_PREFIX = 'fd4b0002';
export const WHOOP_CMD_WRITE_PREFIX_4 = '61080002';

// Strap advertises with a name beginning "WHOOP".
export const WHOOP_NAME_PREFIX = 'WHOOP';

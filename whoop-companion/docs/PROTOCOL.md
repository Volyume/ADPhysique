# WHOOP 5.0 BLE protocol — verified against WHOOP app v5.444.1

Decompiled from the official `com.whoop.android` v5.444.1 (Mar 2026) with jadx.
These values are confirmed from the live app, not inferred. VOLYUME Pulse's BLE
layer matches them.

## GATT services / characteristics (exact 128-bit UUIDs)
- Standard Heart Rate: service `0000180d-…`, measurement `00002a37-…` (live HR + R-R)
- Standard Battery: service `0000180f-…`, level `00002a19-…`
- WHOOP 5.0 ("Maverick"/"Puffin") service `fd4b0001-cce1-4033-93ce-002d5875f58a`
  - `fd4b0002` write (commands to strap)
  - `fd4b0003` notify (command responses)
  - `fd4b0004` notify (events)
  - `fd4b0005` notify (realtime + historical data)
  - `fd4b0007` notify (console logs)
- Legacy WHOOP 4.0 service `61080001-8d6d-82b8-614a-1c8cb0f8dcc6` (chars 61080002–05)

## Frame ("PacketFrame", im0.g + qm0.c CrcUtils)
- Start byte `0xAA`.
- Header carries a length (u16) and role/version bytes; CRC16 over the header.
- Payload (inner buffer, 4-byte aligned); CRC32 over the payload.
- **CRC16 = CRC-16/MODBUS** (init `0xFFFF`, poly `0xA001`/reflected) — table-driven
  in `qm0.c.b()`; first table entries `0xC0C1, 0xC181, 0x0140 …` confirm it.
- **CRC32 = standard IEEE** (`java.util.zip.CRC32`) in `qm0.c.c()`.
- (A CRC-8/SMBUS table also exists for some frame variants.)

## Packet types (im0.c.a)
35 COMMAND · 36 COMMAND_RESPONSE · 37 PUFFIN_COMMAND · 38 PUFFIN_COMMAND_RESPONSE ·
40 REALTIME_DATA · 43 REALTIME_RAW_DATA · 47 HISTORICAL_DATA · 48 EVENT ·
49 METADATA · 50 CONSOLE_LOGS · 51 REALTIME_IMU_DATA_STREAM · 52 HISTORICAL_IMU_DATA_STREAM

## Command opcodes (im0.e — value = 3rd ctor arg)
1 LINK_VALID (keepalive) · 2 GET_MAX_PROTOCOL_VERSION · 3 TOGGLE_REALTIME_HR ·
7 REPORT_VERSION_INFO · 10 SET_CLOCK · 11 GET_CLOCK · 14 TOGGLE_GENERIC_HR_PROFILE
(enables standard 0x2A37 HR broadcast) · 19 RUN_HAPTIC_PATTERN_MAVERICK ·
20 ABORT_HISTORICAL_TRANSMITS · 22 SEND_HISTORICAL_DATA · 23 HISTORICAL_DATA_RESULT ·
26 GET_BATTERY_LEVEL · 33 SET_READ_POINTER · 34 GET_DATA_RANGE · 35 GET_HELLO_HARVARD ·
66 SET_ALARM_TIME · 67 GET_ALARM_TIME · 68 RUN_ALARM · 69 DISABLE_ALARM ·
79 RUN_HAPTICS_PATTERN · 81 START_RAW_DATA · 82 STOP_RAW_DATA ·
84 GET_BODY_LOCATION_AND_STATUS (on-wrist) · 96 ENTER_HIGH_FREQ_SYNC ·
97 EXIT_HIGH_FREQ_SYNC · 98 GET_EXTENDED_BATTERY_INFO · 105 TOGGLE_IMU_MODE_HISTORICAL ·
106 TOGGLE_IMU_MODE · 107 ENABLE_OPTICAL_DATA · 108 TOGGLE_OPTICAL_MODE ·
115/116 device-config key exchange · 117/118 feature-flag (FF) key exchange ·
119 SET_DEVICE_CONFIG_VALUE · 120 SET_FF_VALUE · 121 GET_DEVICE_CONFIG_VALUE ·
122 STOP_HAPTICS · 123 SELECT_WRIST · 124 TOGGLE_LABRADOR_DATA_GENERATION ·
139 TOGGLE_LABRADOR_FILTERED · 145 GET_HELLO · 151 GET_BATTERY_PACK_INFO ·
153/154 TOGGLE_PERSISTENT_R20/R21

## Connect → live HR (no WHOOP app)
1. Bond + connect; discover services.
2. `GET_HELLO_HARVARD` (35) hello.
3. `TOGGLE_GENERIC_HR_PROFILE` (14, payload 1) → strap broadcasts HR on 0x2A37 to us.
   (and/or `TOGGLE_REALTIME_HR` (3, payload 1) → HR via proprietary REALTIME_DATA=40)
4. `LINK_VALID` (1) every ~10 s keepalive, or the strap drops the link.

## Haptic wake alarm
Community WHOOP protocol references (NOOP / OpenStrap) confirm:
- `SET_ALARM_TIME` (66): payload `[0x01] + epoch_u32_LE + [0x00, 0x00]`.
- `DISABLE_ALARM` (69): payload `[0x01]`.
- `RUN_ALARM` (68): payload `[0x01]`.
- `STOP_HAPTICS` (122): stops any active vibration pattern.

## Historical drain
`ENTER_HIGH_FREQ_SYNC` (96) → wait → `SEND_HISTORICAL_DATA` (22) → for each
HISTORICAL_DATA(47) chunk reply `HISTORICAL_DATA_RESULT` (23) [SUCCESS, start_id u32,
end_id u32]. Deep optical/IMU streams may require the FF/device-config key exchange
(117/118 + 120) first.

## Still to extract (payload layouts)
- REALTIME_DATA (40) HR byte offset for proprietary live HR.
- HISTORICAL_DATA (47) per-second record field offsets (HR, skin temp, motion, gravity)
  — needed to derive sleep/recovery from history. Best validated against frames
  captured from the strap (Device screen).

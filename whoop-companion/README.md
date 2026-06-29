# Whoop Companion (private)

A private, standalone iOS app that talks to your **WHOOP 5.0** strap directly over
Bluetooth and tracks recovery, sleep, strain, steps and cardio **without a WHOOP
membership**. All data stays on your iPhone — no WHOOP account, no cloud.

This is a **separate app** from VOLYUME. It only reuses VOLYUME's toolchain
(Expo SDK 54 / React Native 0.81 / React 19) and the same no-Mac
GitHub Actions → EAS → TestFlight build pipeline.

> **Status: Phase 1 (the proof gate).** Right now the app proves it can read your
> strap over Bluetooth: live heart rate + R-R intervals (via the standard GATT
> Heart Rate Service, the same source the official app uses), battery, and a raw
> capture of WHOOP's proprietary `fd4b…` frames for building the full decoder
> (history → sleep/recovery) in Phase 2. See the build plan for the roadmap.

## How it reaches your iPhone (no Mac, no commands from you)

Identical to how VOLYUME ships (`.github/workflows/build-ios.yml`): a GitHub
Actions job drives **EAS** (Expo's cloud) to do the Xcode compile and Apple
signing, then submits to **TestFlight**. The matching workflow for this app is
`.github/workflows/build-whoop-ios.yml`, **manual-trigger only** (each EAS iOS
build costs credits).

### One-time setup (uses your existing Apple/Expo accounts)
1. **Create the EAS project** for this app so it gets its own project id. From the
   `whoop-companion/` folder, this is `eas init` (run once, against the `volyume`
   Expo account). It writes `extra.eas.projectId` into `app.json`.
2. **Create the App Store Connect app record** for bundle id
   `app.volyume.whoopcompanion` (App Store Connect → Apps → +). TestFlight needs a
   record to receive builds.
3. The build reuses the **same repo secrets** VOLYUME already has: `EXPO_TOKEN`,
   `ASC_API_KEY_P8`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID`. No new secrets
   are required (this app has no Supabase/Sentry config).

### Each build
- GitHub → **Actions** tab → **Build Whoop iOS (EAS)** → **Run workflow**. It
  builds on EAS and submits to your TestFlight automatically.

### On your iPhone (the only physical steps)
1. Install the build from **TestFlight**.
2. **Close the official WHOOP app** (the strap allows only one Bluetooth
   connection at a time).
3. Put the strap in **pairing mode** (tap it repeatedly until the LED flashes).
4. Open Whoop Companion → **Scan & connect**.

## What's in here (Phase 1)
- `App.tsx` — proof UI: live HR/R-R, battery, discovered services, raw-frame log + Share.
- `src/ble/whoopBle.ts` — scan/connect/discover; subscribes to standard HR + battery
  and captures proprietary `fd4b…` frames.
- `src/ble/heartRate.ts` — standard GATT Heart Rate Measurement (0x2A37) decoder.
- `src/ble/constants.ts` — service/characteristic UUIDs (standard + WHOOP proprietary).
- `src/ble/bytes.ts` — base64/hex helpers (BLE values arrive base64-encoded).

## Protocol notes (sourced, not guessed)
WHOOP 5.0 (firmware r52 "Maverick"), from the whoop-vault reverse-engineering
project:
- **Live HR** on standard GATT Heart Rate Service `0x2A37`; **battery** on `0x2A19`.
- Proprietary characteristics `fd4b0002` (write/commands), `fd4b0003` (command
  responses), `fd4b0004` (events), `fd4b0005` (historical + realtime data),
  `fd4b0007` (logs).
- Historical drain (Phase 2): `ENTER_HIGH_FREQ_SYNC` (96) → wait 0.5 s →
  `SEND_HISTORICAL_DATA` (22) → ACK each chunk with `HISTORICAL_DATA_RESULT` (23);
  payloads are 4-byte aligned (the strap silently drops unaligned commands).

## Legal / safety
Interoperability with hardware you own, for private use. Runs against WHOOP's Terms
of Service. **Not a medical device** — all derived metrics (recovery, sleep, HRV,
strain) are approximations computed from published methods, not WHOOP's proprietary
scores.

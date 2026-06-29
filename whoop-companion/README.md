# Whoop Companion (private)

A private, standalone iOS app that talks to your **WHOOP 5.0** strap directly over
Bluetooth and tracks recovery, sleep, strain, steps and cardio **without a WHOOP
membership**. All data stays on your iPhone — no WHOOP account, no cloud.

This is a **separate app** from VOLYUME. It only reuses VOLYUME's toolchain
(Expo SDK 54 / React Native 0.81 / React 19) and the same no-Mac
GitHub Actions → EAS → TestFlight build pipeline.

> **Status: full app built, pending first on-device run.** The app reads the
> strap over Bluetooth (live heart rate + R-R via the standard GATT Heart Rate
> Service — the same source the official app uses — plus battery), logs the
> stream to a local database, and derives WHOOP-style metrics on device:
> recovery, sleep (duration/stages/performance), strain (0–21) with heart-rate
> zones, HRV (RMSSD/SDNN/pNN50) and resting HR. It also supports cardio/activity
> logging and a behaviour journal. The proprietary history-drain + per-second
> record decode (for backfill, steps and richer sleep) is wired but EXPERIMENTAL
> — it needs a few real captured frames to finalise, which the Device screen can
> capture and export. **None of this has been compiled or run on a device yet**
> (no Mac/iOS toolchain in the build environment); first real validation is the
> TestFlight build on your iPhone.

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

## What's in here
- `App.tsx` — tab navigation (Today · Recovery · Sleep · Strain · Journal · Device).
- `src/ble/` — Bluetooth: scan/connect/discover, standard HR (0x2A37) + battery
  decode, command writes, proprietary `fd4b…` frame capture, base64/hex helpers.
- `src/whoop/` — the "Maverick" protocol: CRC, frame codec + reassembler,
  command encoders, history-drain handshake, (experimental) record parsing.
- `src/metrics/` — pure scoring: HRV (Task Force 1996), strain (Banister TRIMP /
  Karvonen / Tanaka), recovery, sleep staging, steps, EMA baseline.
- `src/db/` — offline-first SQLite (HR stream, daily metrics, cardio, journal,
  raw frames, profile).
- `src/state/` — observable store + the sync orchestrator wiring it together.
- `src/screens/` + `src/ui/` — the WHOOP/VOLYUME crossover UI (recovery ring,
  zone bars, dark theme).

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

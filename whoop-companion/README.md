# VOLYUME Pulse (private)

A private, standalone **iOS + Android** app that talks to your **WHOOP 5.0** strap
directly over Bluetooth and tracks recovery, sleep, strain, steps and cardio
**without a WHOOP membership**. All data stays on your phone — no WHOOP account,
no cloud. Android can be sideloaded as an APK with zero account setup (see below);
iOS goes via TestFlight.

This is a **separate app** from VOLYUME. It only reuses VOLYUME's toolchain
(Expo SDK 54 / React Native 0.81 / React 19) and the same no-Mac
GitHub Actions → EAS → TestFlight build pipeline.

> **Status: on-device WHOOP 5 testing in progress.** The app reads live heart
> rate, R-R and battery, drains stored proprietary history, and derives local
> recovery, sleep, strain, steps and activity metrics. Captures from firmware
> 50.40.1.0 validate the history layouts used here, but the resulting wellness
> metrics remain independent estimates rather than WHOOP's proprietary models.
> Every uncertain decode is kept unavailable or visibly low-confidence.

## Android: an APK you can sideload (easiest first test, zero setup)

This is the quickest way to try it — no Expo account, no Apple, no Play Store,
no secrets:

1. The **Build VOLYUME Pulse Android APK** workflow runs automatically on every
   push to this branch (no manual button — that needs the file on `main`, which we
   never touch). GitHub → **Actions** → open the latest run of that workflow.
2. When it finishes, open the run → **Artifacts** → download **volyume-pulse-apk**.
   (Ignore the separate "Build Android (APK + AAB, signed)" runs — that's VOLYUME's
   own app and won't install over your Play-Store VOLYUME.)
3. Copy the APK to your Android phone and tap it to install (allow "install
   unknown apps" for your browser/files app when prompted).
4. Open the app → **Device** tab → close the official WHOOP app, put the strap in
   pairing mode, then **Scan & connect**.

The workflow runs `expo prebuild` + Gradle `assembleRelease` on a free GitHub
runner; Expo's template signs the release APK with the debug keystore so it
installs for personal use. (For a Play Store build later, EAS uses the
`preview`/`production` Android profiles in `eas.json`.)

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
   `app.volyume.pulse` (App Store Connect → Apps → +). TestFlight needs a
   record to receive builds.
3. The build reuses the **same repo secrets** VOLYUME already has: `EXPO_TOKEN`,
   `ASC_API_KEY_P8`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID`. No new secrets
   are required (this app has no Supabase/Sentry config).

### Each build
- GitHub → **Actions** tab → **Build VOLYUME Pulse iOS (EAS)** → **Run workflow**. It
  builds on EAS and submits to your TestFlight automatically.

### On your iPhone (the only physical steps)
1. Install the build from **TestFlight**.
2. **Close the official WHOOP app** (the strap allows only one Bluetooth
   connection at a time).
3. Put the strap in **pairing mode** (tap it repeatedly until the LED flashes).
4. Open VOLYUME Pulse → **Scan & connect**.

## What's in here
- `App.tsx` — tab navigation (Today · Recovery · Sleep · Strain · Journal · Device).
- `src/ble/` — Bluetooth: scan/connect/discover, standard HR (0x2A37) + battery
  decode, command writes, proprietary `fd4b…` frame capture, base64/hex helpers.
- `src/whoop/` — the "Maverick" protocol: CRC, frame codec + reassembler,
  command encoders, history-drain handshake, (experimental) record parsing.
- `src/metrics/` — pure scoring: HRV (Task Force 1996), strain (Banister TRIMP /
  Karvonen / Tanaka), recovery, sleep staging, WHOOP counter steps, EMA baseline.
- `src/db/` — offline-first SQLite (HR stream, daily metrics, cardio, journal,
  raw frames, profile).
- `src/state/` — observable store + the sync orchestrator wiring it together.
- `src/screens/` + `src/ui/` — the WHOOP/VOLYUME crossover UI (recovery ring,
  zone bars, dark theme).

## Protocol notes (sourced, not guessed)
WHOOP 5.0, **target firmware 50.40.1.0** (this device) — same r52 "Maverick"
generation as the 50.38.1.0 validated by the whoop-vault reverse-engineering
project (one minor revision lower), so framing/commands should match; the
per-second record layout is confirmed against frames captured from this firmware:
- **Live HR** on standard GATT Heart Rate Service `0x2A37`; **battery** on `0x2A19`.
- Proprietary characteristics `fd4b0002` (write/commands), `fd4b0003` (command
  responses), `fd4b0004` (events), `fd4b0005` (historical + realtime data),
  `fd4b0007` (logs).
- Historical drain: `GET_DATA_RANGE` (34) → wait through `PENDING` for the final
  `SUCCESS` → `SEND_HISTORICAL_DATA` (22) → ACK each chunk with
  `HISTORICAL_DATA_RESULT` (23). Payloads are 4-byte aligned.
- K21 history blocks are decoded into per-second WHOOP IMU movement intensity
  and aggregated by minute for sleep/wake corroboration. Existing archived K21
  records are backfilled locally once after upgrade.
- Automatic sleep requires at least 240 distinct HR minutes, 70% window
  coverage and independent WHOOP motion corroboration. Stage estimates remain
  hidden until coverage, R-R/HRV and IMU evidence clear stricter gates.
- Daily steps are decoded only from the strap's cumulative history counter and
  require its movement-state field to corroborate counter changes. The app does
  not request phone motion permission and does not use phone-pedometer fallback.

## Legal / safety
Interoperability with hardware you own, for private use. Runs against WHOOP's Terms
of Service. **Not a medical device** — all derived metrics (recovery, sleep, HRV,
strain) are approximations computed from published methods, not WHOOP's proprietary
scores.

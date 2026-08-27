# Live remediation campaign, findings 1 to 23

Worked 2026-08-26 to 2026-08-27 against the adversarial audit. Every entry below
is a disposition, not a summary: what was checked, what the evidence was, and
what changed or deliberately did not.

Findings 21 and 22 of the audit ask for a screen and journey matrix and a
test-gap reconciliation. Those are sections 3 and 4 of this document; they are
the deliverable, not a pointer to one.

---

## 1. Disposition of every finding

| # | Finding | Disposition | Evidence |
|---|---|---|---|
| 1 | Active workout durability | **Fixed** | A thrown DB read was caught as `row = null`, so a failed read looked identical to "that workout is gone" and the next branch deleted the recovery snapshot. Runs during launch bootstrap, where a transient failure is the expected kind. |
| 2 | Rest timer safety | **Fixed** | `Date.now() + duration * 1000` unvalidated. NaN, Infinity and `1e300` all make `remaining <= 0` false forever, so the timer never expires; the anchor is persisted, so it survives a kill. Kotlin `Double.toLong()` saturates, so Infinity became `Long.MAX_VALUE` and passed `endTimeMs <= now` on all three Android entry points. Bounded at four JS paths plus one native reader. |
| 3 | Local migration durability | **Fixed** | Ops and the `user_version` bump were separate writes. Proven against real SQLite with an injected fault: a column added earlier in the same version survived a rolled-back migration. v55 and v18 are not re-runnable, so a re-run met a database it had already changed. One transaction per version, via `withTransactionAsync`; `runInTransaction` would deadlock v22's nested call and the test proves it hangs. |
| 4 | Uniqueness / idempotency | **Fixed, migration applied** | All 38 upsert conflict targets swept against production `pg_index`. 37 resolve. `workout_notes` sent `user_id,id` against a table keyed on `id` alone: reproduced 42P10 on production. Cause is a typo in `migrate_018` naming `workout_notes_v2`, which does not exist, in a loop that silently skips tables it cannot find. `migrate_154` applied 2026-08-27, ledger `20260827114840`. |
| 5 | Backup truth | **Fixed** | Nothing ever opened a snapshot. A copy that ran out of disk, landed empty, or was encrypted under a lost key looked identical on the restore screen to a good one. Restore then overwrote the live database before discovering it, leaving neither copy. Snapshots are now opened and read at write time and before restore, and the live database is copied aside first. |
| 6 | Import isolation | **Fixed** | Custom exercises were created before the import transaction opened, so a failed import rolled back every workout and set and kept the exercises. The exercises cache was never invalidated, and `syncExercises` reads through it, so imported exercises stayed off the cloud for the rest of the session. |
| 7 | Date / DST | **Fixed** | The 84-day training grid stepped by `offset * 86400000`. Measured for Europe/London: a grid drawn at 00:30 on 2025-04-15 contains no square for 2025-03-30. The suite now runs under `TZ=Europe/London`; in UTC this class is invisible. |
| 8 | Train-adjacent sweep | **Fixed** | `.filter((v) => v != null)` on soreness and joint-discomfort ratings in the deload evidence. NaN is not null, so one bad rating made the week's average NaN and every threshold false: a genuinely sore user was not offered a deload. Line 584 of the same file already had the correct shape. |
| 9 | SecureStore | **Fixed (diagnostic)** | `setItem` swallowed failures, so supabase-js believed a session was persisted either way; a write that did not stick surfaces only as a user who was signed in and now is not. Sentry holds no secureStore or keychain events in 90 days, so this is a diagnostic gap and is fixed as one, not by re-architecting auth storage. |
| 10 | Plaintext SQLite fallback | **Fixed (copy), one question open** | `isLocalDbEncrypted()` was written to keep privacy copy honest and had **zero callers**, while the Article 9 gate stated unconditionally that data lives in encrypted local storage. Copy is now derived. Whether the app should open plaintext at all is a product decision, below. |
| 11 | Live Activity update validation | **Fixed** | `start` has guarded `endTimeMs` since the 2026-07-01 audit, naming the VOLYUME-1K trap. `update` had no guard, and every ±15s tap goes through it. |
| 12 | Reanimated / photo morph | **No defect found** | Animation values are driven from bounded progress fractions and layout measurements, not from user data. No non-finite path into a shared value. |
| 13 | Skia / SVG charts | **No defect found** | `VolyumeChart` filters every value through `Number.isFinite` before any geometry, and non-finite SVG coordinates render nothing rather than trapping. Not in the native-trap class. |
| 14 | Progress scan dimensions | **Hardened** | Traced every `Int(Double)` in the module first: all are bounded by construction, and the only caller passes a constant 256. The two dimension parameters were guarded by `> 0` alone and size a `width * height * 4` buffer, so bounded at 8192 on both platforms. Hardening, not a live defect, and it travels with a build already needed. |
| 15 | Sensors | **Fixed** | `Math.atan2(x, y)` on a NaN accelerometer sample. Guards downstream are `tilt != null`, and NaN is not null, so the level's transform became `rotate: "NaNdeg"` and "aligned" became permanently unreachable for the session. |
| 16 | Camera / OCR | **No defect found** | `expo-camera` is lazily required and every use is null-guarded; capture re-checks tier at the shutter. No numeric boundary of the finding-2 class. |
| 17 | Dependencies | **Reported, not changed** | 25 vulnerable packages, 8 root advisories. Exactly one is runtime-reachable. Detail in section 2. |
| 18 | Deep links | **Partly fixed, one decision open** | `url.startsWith('https://volyume.app')` also matches `volyume.app.evil.com`. Not OS-routable today (Android filter is host-scoped, iOS has no `associatedDomains`), so latent rather than live. The custom-scheme implicit-token path is live and is a founder decision, below. |
| 19 | Error-handling sweep | **Ratcheted** | 247 unexplained silent catches across 64 files. Frozen rather than edited, because commenting sites the audit did not examine is the drive-by refactoring CLAUDE.md forbids and would assert consideration that did not happen. |
| 20 | P3/P4 (J, L) | **Fixed** | `PeekMenu` is the app's generic action dispatcher and swallowed every action error: the sheet closed, nothing happened, no toast, no log, no Sentry event. Also not one-shot: a second tap on a different item during the close animation replaced the first action and dropped it. |
| 21 | Screen / journey matrix | **This document, section 3** | |
| 22 | Test-gap reconciliation | **This document, section 4** | |
| 23 | Sentry token configuration | **Gate landed, unproven** | The refuse-to-build gate is in both workflows and tested. It has **never run**: the last iOS build (run 155, 2026-08-26) predates it. Whether `SENTRY_AUTH_TOKEN` is set is therefore still unknown, and the next build will say so explicitly either way. |

---

## 2. Dependencies (finding 17), split by what actually ships

`npm audit --omit=dev` reports 25 vulnerable packages from 8 root advisories. That
number on its own is noise. The question is what reaches a user's device.

**Runtime, in the app bundle — one:**

- `nanoid@3.3.12`, pulled in by `@react-navigation/native` (core and routers) and
  `@gorhom/portal`. Advisory GHSA-28wg-ghj8-5hjv, "non-secure generators can loop
  indefinitely with negative size", fixed in 3.3.16. **Not exploitable as used**:
  React Navigation calls `nanoid()` with no size argument to generate route keys,
  so a negative size never occurs. The package is below the patched version.

**Build tooling only, never in the bundle — seven:** `uuid@7.0.3` (via
`@expo/config-plugins` → `xcode`, prebuild), `postcss` (via `@expo/metro-config`,
bundler), `js-yaml`, `shell-quote`, `image-size`, `fast-uri`, `brace-expansion`
(Expo CLI chain). None is reachable at runtime.

No app source imports any of the eight directly; checked.

**Not changed, and why.** Pinning `nanoid` to 3.3.16 through an npm `overrides`
entry would close the only runtime one. That changes the dependency graph of a
live app on a pinned Expo SDK, which is a founder decision under the
new-dependency rule, and the advisory does not apply to how the package is used.
Recorded rather than acted on.

---

## 3. Screen and journey matrix (finding 21)

82 screens. The matrix below is by JOURNEY rather than by screen, because a
defect in this campaign was almost never confined to one screen: the rest timer
touched four surfaces, the deload evidence touched none directly.

| Journey | Surfaces | Touched this campaign | Residual risk |
|---|---|---|---|
| First run and consent | `Article9ConsentScreen`, `FirstRunScreen`, `RootNavigator` gate | **Yes** (10) — storage copy now derived from real encryption state | None known. Gate structure, order and skippability unchanged and pinned. |
| Sign in / sign up / email verification | `LoginScreen`, `supabase.js`, `App.js` deep link handler | **Yes** (9, 18) | Implicit-flow token adoption over the custom scheme. Founder decision below. |
| Train: start, log, rest, finish | `ActiveWorkoutScreen`, `SetEntry`, `RestTimer`, `useAppStore`, rest-timer native modules, Live Activity | **Yes** (1, 2, 11) | None known. Anchor bounded at every setter plus the tick loop, and at the native boundary on both platforms. |
| Plan and coaching | `algorithms.js`, `weeklyCoach`, `blockAdvisor`, `CoachOutputScreen` | **Yes** (8) | Deload evidence fixed. The wider engine was not re-audited; it is deterministic and heavily pinned already. |
| Nutrition and food diary | `food/db.js`, `nutritionEngine`, `NutritionTargetsScreen` | No | Not reached. Locale parsing was fixed pre-campaign; the engine's floors are pinned by existing invariant tests. |
| Progress: photos, scan, charts | `ProgressGhostCapture`, `progress-scan-image` modules, `VolyumeChart` | **Yes** (13, 14, 15) | None known. Chart geometry already filtered; scan dimensions now bounded. |
| Backup, restore, import | `dbSnapshot`, `SnapshotsScreen`, `importExternal` | **Yes** (5, 6) | None known. Snapshots verified at both ends; import atomic including its exercises. |
| Sync and cloud | `sync/`, `sync.js`, `syncQueue` | **Yes** (4) | None known for conflict targets; all 38 pinned. Cloud drift can still occur outside the app and the guard cannot see it. |
| Account deletion | `useAccountActions`, `delete-account` function, `delete_user_data` | **Yes** (4) | None. Both paths erase by `auth.users` cascade; the RPC is now complete for the fallback window. |
| Billing and tier | `payments/`, `proGate` | No | Deliberately untouched. Section 2 of CLAUDE.md requires a dedicated written test plan for any change here, and nothing in the audit pointed at it. |
| Notifications | `notifications/`, `triggerDate.js` | Pre-campaign | The choke point landed with the VOLYUME-1K work; all 21 scheduling calls route through it. |
| Partners | `partners/`, partner tables | Indirect (4) | Deletion coverage now includes every partner table. The surface itself was not audited. |

---

## 4. Test-gap reconciliation (finding 22)

The audit found 14 defects. The question this section answers is why the
existing suite did not.

**The suite was large and the gaps were structural, not sparse.** 1,073 suites
and 14,671 tests passed against every one of these defects. They were not missed
for lack of testing; they were missed because of what the tests could not see.

| Why it was missed | Findings | What changed |
|---|---|---|
| **The suite ran in UTC.** An entire class of calendar defect is invisible there. | 7 | `TZ=Europe/London` pinned in jest `globalSetup`, and a guard asserts through `Date` that BST is actually observed rather than trusting the env var. |
| **Native code cannot be exercised from Jest.** Swift traps and Kotlin saturation had no coverage at all. | 2, 11, 14 | Source guards that pin the shape of each check, plus a sweep that fails on any NEW unguarded conversion so a future one is caught without anyone adding a test. |
| **Tests asserted the happy path of a guard, not its failure mode.** `!= null` was tested with null, never with NaN. | 1, 8, 15 | Each fix's test asserts the poisoned value explicitly, and states as executed fact that NaN passes the check it was standing in for. |
| **Atomicity had no fault injection.** Nothing ever failed a migration or an import part-way. | 3, 6 | Both now drive the real code against a real transaction with an injected failure, and assert what survived. |
| **Claims were never checked against reality.** `onConflict` promised something about a schema nothing compared it to; the consent screen claimed encryption nothing read back. | 4, 10 | The conflict targets are enumerated against production and pinned; the consent copy is derived from `isLocalDbEncrypted()`. |
| **Silence was never asserted to be absent.** No test can fail because nothing happened. | 5, 9, 20 | Each fix asserts the log or toast is emitted, not merely that no throw escaped. |

**Tests that encoded a defect as intended behaviour.** Several existing tests had
to be inverted, each with the reason recorded in the file. The pattern worth
naming: a test written against the code rather than against the requirement will
pin whatever the code did, including the bug. The clearest case this campaign was
my own — a guard asserting `Applied remotely: NOT YET`, correct until the
migration was applied, then wrong. It was inverted rather than deleted, because
the invariant is "the header states what is true of production", and that did not
change.

**A test can also stop seeing anything.** Two in this campaign nearly did: the
first DST test compared one UTC implementation against another, and the first
conflict-target sweep found 28 of 38 because a windowed regex could not span the
larger payloads. Both now assert that their own scan found something, which is
the cheapest guard against a test that quietly measures nothing.

---

## 5. Open decisions

Three, none of which I took unilaterally.

1. **Implicit-flow auth tokens over the custom scheme.** Any installed app can
   send `volyume://#access_token=...&refresh_token=...` and the handler adopts
   that session, so an attacker with a real account can sign a victim's device
   into it and collect what they log next. The fix is dropping the implicit
   fallback for PKCE alone, which the client already defaults to. Not taken
   because it could affect email verification depending on the project's email
   templates, and verification working is a stated requirement.

2. **Plaintext database fallback.** `dbCrypto` opens the database unencrypted
   when SQLCipher is unavailable, the key cannot be read, or the encryption
   migration fails. The consent copy is now honest about it either way. Whether
   the app should instead refuse to start is a product trade made deliberately in
   F-002 and reversing it is a product call.

3. **`nanoid` version pin.** Section 2 above.

---

## 6. Founder actions

- **Run an iOS build.** The observability gate has never executed. It will either
  pass, proving `SENTRY_AUTH_TOKEN` is set, or fail with an explicit refusal
  naming the missing secret. Either outcome is the answer to finding 23.
- **Device-walk the native changes.** The rest timer, Live Activity and progress
  scan changes are native and need an EAS build. Checklist in the campaign's
  commit messages; the rest timer is the one to exercise hardest (start, ±15s
  held down, background, lock screen, kill and relaunch mid-rest).
- **Rule on the three decisions in section 5.**

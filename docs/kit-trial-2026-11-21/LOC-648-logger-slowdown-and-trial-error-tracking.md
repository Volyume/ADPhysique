# LOC-648: the logger's 100-tap slowdown, and trial builds must not report to the live error tracker

Spec source: Paperclip issue LOC-648 (parent LOC-413, line of work LOC-409), written by the
founder's lead on 2026-11-20 after the independent check of the kit trial (LOC-414, sections
1b and 5). The requirements below are quoted from that issue; the evidence sections follow.

## Requirements (verbatim from the issue)

### 1. The workout logger's 100-tap tests take 15 seconds on the trial

- Then find the mechanism (for example the kit set row re-rendering every row on each tap, or style resolution per render) and fix it in the product code. A real slowdown in the logger would be felt on the founder's phone, so this is a product defect until shown otherwise.
- Not acceptable: raising the 15 s limit, skipping or weakening the tests, or a timing-only patch. If you conclude the cause is the test environment and not the product, prove it with measurements and STOP for my ruling before changing any test.
- Regression test: something that fails before your fix and passes after and does not depend on wall-clock time (for example a render-count assertion on untouched rows during a tap chain). Sweep the sibling paths: every kit part used in a list (set rows, exercise cards, Today rows) for the same mechanism.

### 2. The trial iPhone build may report to the live app's error tracking

- Make it certain, whatever the EAS project holds, that a trial build (Android and iOS) sends no error reports to the live Sentry project and uploads no source maps. Decide the mechanism from the EAS and Sentry documentation on precedence between profile `env`, project secrets and build-time variables, and quote the passages you rely on. Prefer a guard in the app's own configuration for the trial variant (so it holds even if a variable leaks) plus the build profile.
- A build from `main` must behave exactly as before; show it (for example `npx expo config --json` identical with no variant and with `APP_VARIANT=production`).
- Extend `src/__tests__/trialBuildPath.guard.test.js` so it fails before your change and passes after. Sweep: any other live-service identifier the trial would inherit by the same route (analytics, push, over-the-air channel); list each as observed safe, fixed, or not checked.


## Part 1 evidence: the four "handles 100-tap chains" tests

### What was measured, and how (observed)

Command, per tree, run alone: `npx jest src/__tests__/screen-mount.test.js -t "handles 100-tap chains" --runInBand`
(NODE_ENV unset, own Jest cache directory per tree, file-level `jest.setTimeout(15_000)` untouched). Wall time is
Jest's per-test duration; processor time is `process.cpuUsage()` around each test (a throwaway
`--setupFilesAfterEnv` file in /tmp, not in the repo). The server was loaded throughout (load average about 10 on 6
cores) and the disk was 100% full, so a fresh `npm ci` per commit was not possible: each tree is a clean checkout of
the exact commit (git status clean), and `node_modules` is the one install already on the server (the kit trial's
install for c7fecbcde, d70f1e479, 9e39140b and the candidate; the main-era install of the same package-lock for
942a44e0d). Not verified: a fresh install per commit.

Per run: F = failed on the 15 s limit, P = passed; ms for tests 1-4 (seeds 1-5, 6-10, 11-15, 16-20).

| Commit | Run | Whole run, real / cpu | Wall ms (tests 1-4) | Result | Test cpu ms |
|---|---|---|---|---|---|
| 942a44e0d untouched app | 1 (cold cache) | 65 s / 68 s | 45936 / 7368 / 34 / 2 | F P P P | |
| | 2 | 54 s / 56 s | 15033 / 13286 / 9967 / 12700 | F P P P | |
| | 3 | 65 s / 56 s | 15019 / 15014 / 15003 / 15082 | F F F F | |
| | 4 | 59 s / 56 s | 15022 / 13982 / 11336 / 15014 | F P P F | |
| | 5 | 65 s / 57 s | 15028 / 15013 / 13938 / 15017 | F F P F | 12441 / 16392 / 12050 / 11859 |
| | 6 | 66 s / 50 s | 15049 / 15147 / 15055 / 15004 | F F F F | 10947 / 12673 / 10682 / 12060 |
| | 7 | 65 s / 53 s | 15030 / 15130 / 15005 / 14022 | F F F P | 12989 / 10223 / 13534 / 12545 |
| c7fecbcde kit foundation | 1 (cold) | 81 s / 71 s | 49780 / 8544 / 12 / 2 | F P P P | |
| | 2 | 53 s / 50 s | 15022 / 11824 / 9503 / 11695 | F P P P | |
| | 3 | 64 s / 60 s | 15069 / 15023 / 14325 / 15021 | F F P F | |
| | 4 | 70 s / 45 s | 15035 / 15112 / 15065 / 15041 | F F F F | 10137 / 8053 / 7817 / 13830 |
| | 5 | 58 s / 55 s | 15036 / 15038 / 13010 / 10741 | F F P P | 15615 / 12987 / 11019 / 10936 |
| | 6 | 63 s / 55 s | 15048 / 15032 / 15019 / 15005 | F F F F | 14678 / 12111 / 11647 / 13224 |
| d70f1e479 three screens | 1 (cold) | 135 s / 82 s | 87373 / 7936 / 36 / 3 | F P P P | 60982 / 8936 / 63 / 3 |
| | 2 | 66 s / 59 s | 15160 / 15009 / 15012 / 15008 | F F F F | 12909 / 14027 / 13270 / 14491 |
| | 3 | 52 s / 56 s | 15020 / 12468 / 10837 / 10507 | F P P P | 16513 / 13480 / 10993 / 11179 |
| | 4 | 53 s / 58 s | 15021 / 14863 / 10496 / 9952 | F P P P | 16092 / 15848 / 11162 / 11266 |
| 9e39140b trial, before the fix | 1 (cold) | 90 s / 72 s | 45348 / 6404 / 46 / 2 | F P P P | 52614 / 7376 / 70 / 2 |
| | 2 | 60 s / 57 s | 15188 / 12358 / 13665 / 15027 | F P P F | 14480 / 11899 / 11749 / 15087 |
| | 3 | 61 s / 56 s | 15008 / 11630 / 15063 / 15030 | F P F F | 15840 / 11466 / 12134 / 12829 |
| | 4 | 61 s / 59 s | 15116 / 13853 / 13633 / 14435 | F P P P | 15154 / 14223 / 12684 / 12962 |
| candidate (this change) | 1 (cold) | 74 s / 78 s | 55775 / 7038 / 18 / 4 | F P P P | 58582 / 7420 / 9 / 3 |
| | 2 | 56 s / 52 s | 15033 / 9845 / 9807 / 13174 | F P P P | 14598 / 10178 / 9828 / 13521 |
| | 3 | 54 s / 56 s | 14613 / 11916 / 11632 / 12628 | P P P P | 16805 / 12704 / 11069 / 11615 |
| | 4 | 54 s / 52 s | 15159 / 13346 / 11197 / 10916 | F P P P | 14338 / 13692 / 10506 / 9450 |

### Findings (observed, then what they suggest)

1. **No commit introduces the 15 s.** The untouched app (942a44e0d) takes 10 to 15 s per test and fails the 15 s
   limit on the same shared server, at the same rate as every kit commit. Processor time is about equal to wall
   time (the tests are CPU-bound, not waiting), 8 to 16 s of processor time per test, on all five trees.
2. **The "2 ms pass" is real but is not a fast logger.** It appears only in a COLD-cache first run, on tests 3 and 4,
   on every tree including the untouched app. Cause (observed with a temporary log in a throwaway copy of the test):
   test 1 spends its 15 s limit loading and compiling the app's modules (the screen is `require`d inside the test),
   times out, and keeps running in the background; tests 3 and 4 then mount a screen with **0 tappables**, and
   `fuzzTapChain` (`src/__tests__/screen-mount.test.js:735`, `if (!tappables.length) return failures;`) returns at
   once, so the test passes having tapped nothing. The test body runs; the taps do not. Not changed (a test; see the
   ruling below). So QA's "2 ms on base" was a cold-cache run and says nothing about the speed of the logger.
3. **What the work is** (profile, `node --cpu-prof`, steady state): about 70% of the processor time is React
   rendering in `react-test-renderer`, with development-mode element creation (`jsx`/`ReactElement`, which captures
   a stack per element) the largest single self-time; the app's own code is about 10%; the test file's tap-finding
   walk is about 5%. A 5-exercise session draws about 1.5 commits per tap.
4. **The mechanism the kit made worse (observed with React's own commit hook, counting fibers that actually ran,
   per commit, seeds 6-10 / 11-15):** no part of the session page was memoised, and the screen builds every row's
   and section's props afresh on each render (new `wells`, `last`, `testIDs` objects and a new closure per
   callback), so every tap redrew every exercise section and every set row, and the kit's rows are deeper (a set
   row is about 15 components: row shell, marker badge, two wells, check box, separators).

   | Tree | Components drawn per commit | Set row draws per commit | Exercise section draws per commit |
   |---|---|---|---|
   | 942a44e0d untouched | 248 / 229 | 1.72 / 2.11 | 3.27 / 3.13 |
   | 9e39140b trial | 323 / 302 | 2.39 / 1.73 (each row now deeper) | 2.06 / 1.75 |
   | candidate | 254 / 250 | 0.80 / 0.58 | 0.77 / 0.73 |

   So the kit made each tap about 30% heavier than the untouched app, almost all of it in the set rows
   (`SetTable` drew 100 / 77 components per commit on the trial against 47 / 56 on the untouched app); the candidate
   returns the work per tap to the untouched app's level and a little below.
5. **What this does NOT fix, and why it is not a product speed-up of the whole screen:** the untouched app already
   drew the whole screen on each tap, and still does. What remains per commit in the candidate: the session's
   always-mounted sheets (`SessionSheets`, about 70 components per commit, 12 `BottomSheetModal`s drawn although
   closed), the active section's own header and footer (it is handed new children each render), `HistorySheet`,
   `ExerciseList` and `SessionToolbar`. The sheets share `src/components/BottomSheet.js` with 17 other screens, are
   not kit parts and were not introduced by the trial, so they were left alone; a change there is a separate,
   riskier piece of work.

### Result on the four tests, and the ruling needed

The fix brings the work per tap back to the untouched app's level. The four tests still sit at 10 to 15 s each on
this loaded server, exactly as they do on the untouched app, so against the file's 15 s limit they remain
borderline here: one candidate run passed all four, three runs failed test 1 only (which also pays module loading).
Per the task, no test, limit or timeout was changed. **Ruling needed from the lead:** whether the 15 s budget of
these four tests (500 simulated taps each through a whole 7,500-line screen in development-mode React) is the right
one on a shared server, or whether the always-mounted sheets should also be made to skip redraws (product work,
larger risk surface).

### The fix

`src/components/workout/session/memoByValue.js` wraps `SetRow` and `ExerciseSection` (their default exports) so they
draw again only when something they show changes: props are compared by value one level deep, and every top-level
callback is replaced by one steady function that calls the newest callback handed in, so a row that skipped a draw
still calls the current closure (a stale closure would log the wrong set). The presence of a callback stays part of
the data. A function inside an object prop (the row being typed into: `inputField`) is compared as it is, so that
one row draws every render, as before. Nothing else changed in either component; their own and their callers'
existing suites pass unchanged (43 suites, 833 tests in `src/components/workout/session`, the `ActiveWorkoutScreen`
guards and the kit surfaces test).

### Regression test (no wall-clock)

`src/components/workout/session/__tests__/sessionRenderCost.test.js` counts draws of the kit parts the rows are built
from. Against the unfixed `SetRow.js` and `ExerciseSection.js` it fails 8 of 11 (a re-render with new but equal
props redraws every row; one changed row redraws all; a collapsed section redraws), and passes 11 of 11 with the fix.
It also pins that a skipped row still calls the newest callback, and that a gained or lost callback redraws.

### Sweep of the kit parts used in lists

- Set rows (`SetRow` via `SetTable`): fixed.
- Exercise cards (`ExerciseSection`, collapsed headers and active section): fixed.
- `ExerciseList` (kit collapsible holding the "still to do" sections): a container; about 12 components per commit,
  its children now skip. Observed, not changed.
- Today (`HomeScreen.js`) uses `today-hero-kit`, `today-offer-kit` and `coach-notice` parts at fixed positions
  (no `.map(` renders a kit part there), so there is no per-row list to redraw. Observed, not changed; its render
  cost per interaction was not measured.
- The logger's other lists (`HistorySheet`, `SessionSheets`) are not kit parts: not changed (see item 5).

## Part 2 evidence: the trial must not report to the live error tracker

### What is observed

- `src/lib/sentry.js:52` (before) read `process.env.EXPO_PUBLIC_SENTRY_DSN` and started the client when it was set.
  Metro bakes `EXPO_PUBLIC_*` values into the bundle at build time.
- `app.json` carries the `@sentry/react-native/expo` plugin, and the trial config at 9e39140b keeps it (16 plugins,
  the same as the live app). On a real prebuild with no variant (the control below) the plugin adds `apply from ... sentry.gradle` and
  `android/sentry.properties` on Android, and `ios/sentry.properties` plus the "Upload Debug Symbols to Sentry",
  `sentry-xcode.sh` and `sentry-xcode-debug-files.sh` build phases on iOS. Those are the steps that upload source
  maps and symbols with `SENTRY_AUTH_TOKEN`.
- The production iOS job stores the DSN and the token as EAS PROJECT secrets (`build-ios.yml`, `eas secret:create
  --scope project --name EXPO_PUBLIC_SENTRY_DSN` and `--name SENTRY_AUTH_TOKEN`, and deletes or sets
  `SENTRY_DISABLE_AUTO_UPLOAD`). The trial iOS job builds on the same EAS project with profile `trial`. Whether any of
  them is currently stored cannot be read from here (inferred, not verified).
- The trial Android job builds on a GitHub runner, not on EAS; it passes no DSN or token and sets
  `SENTRY_DISABLE_AUTO_UPLOAD: 'true'` itself (observed in `build-android.yml`).

### What the documentation says (fetched 2026-11-21; quoted)

The Expo pages do not settle the order, which is why the fix does not depend on it.

- https://docs.expo.dev/eas/json.md, `env`: "It should only be used for values that you would commit to your git
  repository and not for passwords or secrets." (no word on which wins against a stored value)
- https://docs.expo.dev/eas/environment-variables/usage.md: "If you don't set the `environment` option, we will set
  the environment automatically based on your build's configuration:" followed by "`production` when `distribution`
  is set to `store`", "`development` when `developmentClient` is `true`" and "`preview` for everything else". The
  `trial` profile sets no `environment`, so by this rule it is the `production` environment (distribution defaults to
  store), the one that holds the live build's variables.
- https://docs.expo.dev/eas/environment-variables/usage.md: "All of the environment variables from the selected
  environment will be used during the build process."
- https://docs.expo.dev/build-reference/variables: "These environment variables are available in any jobs that run
  on Expo servers and updates for this project."
- https://docs.expo.dev/eas/environment-variables/faq.md: "Explicitly set the `environment` value in **eas.json** for
  your build profiles to ensure that the correct environment variables are always used for your build jobs and you
  have full control over this process."
- Precedence between a profile `env` value and a stored variable of the same name: **no page states it** (three
  fetches of the environment-variables, usage, faq, manage, build-variables and eas.json pages). Expo's
  `eas secret:create --scope project` (what the workflow uses) is not described in any of them either.

So a trial build can receive the production DSN and token, and no document says an `env` override in `eas.json` would
beat them. A change that only sets variables in the profile would be unverifiable. The fix therefore sits where the
order does not matter.

### The fix

1. `scripts/ci/trial-identity.cjs` (applied by `app.config.js` only when `APP_VARIANT=trial`): drop the
   `@sentry/react-native/expo` plugin, so no native build step can upload source maps or symbols whatever
   `SENTRY_AUTH_TOKEN` holds; set `extra.appVariant = 'trial'` in the manifest.
2. `src/lib/sentry.js`: `isTrialBuild()` reads that flag from the baked manifest; `initSentry` returns before reading
   the DSN, so no client starts even if `EXPO_PUBLIC_SENTRY_DSN` reached the bundle. Breadcrumbs and captures are no-ops
   with no client.
3. `eas.json` `trial` profile: `SENTRY_DISABLE_AUTO_UPLOAD: "true"`, a second switch that is NOT relied on. An empty
   `EXPO_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` in the profile and a `"environment"` value were considered and not
   added: the first two may be refused or overridden (precedence unknown), and changing `environment` could drop the
   Supabase and USDA variables the trial needs (unverifiable from here).
4. Both trial jobs now stop before the paid build: Android greps the prebuilt project for Sentry; iOS checks the
   evaluated config has no Sentry plugin and `extra.appVariant === 'trial'`.

### Proof

- `npx expo config --json`: no variable and `APP_VARIANT=production` are byte-identical (sha256 prefix 5a84a1713e8c5479
  both), and the no-variable config is identical before (9e39140b) and after this change once the checkout path is
  normalised. Only `APP_VARIANT=trial` differs: 15 plugins instead of 16, none Sentry, `extra.appVariant: trial`.
- Real `npx expo prebuild --no-install --clean` of the trial config with `SENTRY_AUTH_TOKEN` and a valid-looking
  `EXPO_PUBLIC_SENTRY_DSN` set in the environment: Android project has 0 files mentioning Sentry; iOS project has 0.
  The same prebuild with no variant keeps `sentry.gradle`, `android/sentry.properties`, `ios/sentry.properties` and the
  three Xcode build phases (control).
- `src/__tests__/trialBuildPath.guard.test.js`: 8 of its 32 tests fail on the code before this change and all 32 pass
  after. One existing assertion (`expect(trial.plugins).toEqual(APP.plugins)`) now excludes the Sentry plugin, because
  removing it is the requirement; nothing else in that file changed meaning.

### Sweep: other live-service identifiers the trial could inherit by the same route

| Item | Status |
|---|---|
| Sentry DSN (`EXPO_PUBLIC_SENTRY_DSN`) | fixed (no client starts in the trial) |
| Sentry token and source-map upload (`SENTRY_AUTH_TOKEN`) | fixed (plugin dropped; prebuild shows none) |
| Android trial job and Sentry | observed safe (GitHub runner, no DSN or token passed) and now also guarded |
| Over-the-air updates | observed safe: `expo-channel-name: trial`, `eas update` appears in no trial job (pinned by the guard); the update URL and runtime version are the live project's, so an update published to the `trial` channel would reach only trial installs. Not checked on expo.dev (cannot read it) |
| EAS project id | by design the live one (ties the build to the project); not changed |
| Push (`src/lib/notifications/pushToken.js`) | observed: asks for an Expo push token with the live project id and stores it with the live backend; the trial's own bundle id has no push credentials until the founder sets them up. Not changed; not verified server-side |
| Growth telemetry and sync | observed: the trial uses the live Supabase (LOC-413 design, "Read this first: your data" in trial-build-steps); not changed |
| Supabase URL, anon key, USDA key | by design (the trial job passes them); not changed |
| Google and Apple sign-in client ids | not checked (the trial-build-steps document already tells the founder they will not work) |
| Other `EXPO_PUBLIC_*` variables | the repo reads only the Supabase, USDA and Sentry ones (grep of `src`, `app.json`, `eas.json`, `scripts`) |

### trial-build-steps (LOC-413)

What the founder does is unchanged (same buttons, same boxes). One line added under "What this can never do": the
trial never sends crash or error reports to the real app's error tracking.

## Not verified

- A fresh `npm ci` per commit (disk full); the four tests on a quiet server; EAS and Sentry project contents
  (unreadable here); a real EAS or GitHub run (builds are the founder's); the device feel of the logger.

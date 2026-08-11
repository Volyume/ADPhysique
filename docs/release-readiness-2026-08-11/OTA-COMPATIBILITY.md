# Campaign 7 — WS-4: OTA vs binary update. One answer.

## VERDICT: BINARY UPDATE ONLY. OTA is not an option, and would not be
## safe even if it were configured.

Two independent reasons, either one sufficient.

### 1. There is no OTA channel. Volyume has never had one.

- `expo-updates@~29.0.19` is installed and `App.js:652-675` calls
  `Updates.checkForUpdateAsync()` in production — but the call is dead:
- **`app.json` has no `updates` key** (no `url`), so no update server
  is configured;
- **the built Android manifest carries
  `expo.modules.updates.ENABLED = false`** — verified in the artefact
  produced by this campaign's own release build, not inferred;
- **`eas.json` declares no `channel`** on any profile.

So `checkForUpdateAsync()` throws into its own `catch (_)` on every
launch. **Every change Volyume has ever shipped went out as a store
release, and this one must too.** (Recorded as SHIPPING-ARCHITECTURE
F-1; the false "OTA-patchable" claim in `src/widgets/widgets.js` was
corrected in this campaign.)

### 2. Even with a channel, this specific delta could not ride an OTA.

`runtimeVersion` policy is `appVersion` (= `1.2.0`). Under that policy
an update published for 1.2.0 is offered to **every installed 1.2.0
binary**. The Campaigns 1-6 delta changes the native contract in ways
the live binary cannot satisfy:

| Change | Why it breaks a JS-only update |
|---|---|
| Campaign 7 removes `FOREGROUND_SERVICE` + `SCHEDULE_EXACT_ALARM`, adds iOS `associatedDomains` | Manifest/entitlement changes exist only in a new binary |
| iOS Universal Links (`applinks:volyume.app`) | Entitlement — binary only |
| `expo-constants` newly declared, `expo`/`expo-updates` patch bumps | Dependency graph change |
| Android query-intent fix (package visibility) | Manifest merge — binary only |
| Camera permission string (final `NSCameraUsageDescription`) | Info.plist — binary only |

Local schema **v71/v72 are NOT a blocker** for this question: they run
from JS at DB open (`database.js` `PRAGMA user_version` pipeline) and
need no native capability the live binary lacks (SQLCipher is already
present; the migrations are plain SQL over the existing connection).
They ship *with* the JS either way. The blockers are the native/config
changes above.

### Consequence for the release plan

- **This update is a store release on both platforms.** Android via the
  CI prebuild+Gradle path from main; iOS via EAS.
- **`expo.version` must be bumped before this release** — not only for
  the stores, but because `runtimeVersion: appVersion` derives from it.
  Shipping native changes under the same 1.2.0 runtime is precisely the
  mismatch Expo documents (and `EAS_SKIP_AUTO_FINGERPRINT: "1"` in the
  production profile removes the automatic guard against it).
- **When may OTA resume?** Only after (a) an `updates.url` + channel are
  configured, (b) a binary carrying that config is live, and (c) the
  standing law is adopted: *an OTA update must not require a native or
  local-schema capability the installed binary does not have* — which in
  practice means bumping `expo.version` on any release that touches
  app.json native config, plugins, expo-build-properties, or a native
  dependency. Until then, OTA is a future capability, not a delivery
  route for this update.

**No OTA was published. No EAS Update was configured or triggered.**

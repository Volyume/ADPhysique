# Store declarations: ground truth from code (2026-10-14)

Read-only research. Nothing in the repo was edited. Evidence format: `file:line`. "UNVERIFIED" = not provable from the checked-in tree (no `android/`, `ios/` or `node_modules/` exists, so the merged manifest and merged Info.plist were not inspected).

App version at time of reading: `app.json:12` 2.14.0, `app.json:65` versionCode 3357, `app.json:25` bundle id / `app.json:64` package `app.volyume`.

---

## 1. Data inventory

Legend: Coll = collected (leaves the device to our backend or a processor). Shared = transferred to a third party for THEIR own use (Play definition; processors acting for us are "collected", not "shared"). Linked = tied to account id. Track = used for tracking (Apple definition). Req/Opt = required to use the app / optional.

All backend data goes to Supabase EU-Dublin via RLS-protected tables (`CLAUDE.md` section 1; `src/lib/supabase.js`). No advertising SDK, no ATT, no `NSUserTrackingUsageDescription` anywhere in `app.json` or `package.json` (grep for tracking/advertising id: no hits). Tracking = NO for every row.

| # | Data | Play category | Apple category | Coll | Shared | Ephemeral | Linked | Track | Req/Opt | Purpose | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Email address | Personal info > Email | Contact Info > Email Address | Yes | No | No | Yes | No | Required (account; no anonymous mode) | Account mgmt, functionality | `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`; Supabase Auth (`src/lib/supabase.js:250`); privacy.html s1 |
| 2 | Name (first name; Community display name) | Personal info > Name | Contact Info > Name | Yes | No | No | Yes | No | First name required in onboarding (UNVERIFIED which field is mandatory); display name optional | Functionality | `public/privacy.html` s1 "name"; `src/lib/sync/tables/profiles.js` |
| 3 | Auth identifiers from Apple/Google sign-in (provider subject) | Personal info > User IDs | Identifiers > User ID | Yes | No | No | Yes | No | Required (sign-in) | Auth | `app.json:27` usesAppleSignIn; google-signin plugin; email/password also offered (CLAUDE.md s1) |
| 4 | Community handle | Personal info > User IDs | Identifiers > User ID | Yes | No (visible to other users by user action) | No | Yes | No | Optional | Functionality | `supabase/migrate_160_community.sql:1-12` |
| 5 | Date of birth / age, sex | Personal info > Other info (Play has "Sexual orientation/Gender"; sex here is biological, map to Other info) | Other Data Types (or Health & Fitness > Health; see risk R7) | Yes | No | No | Yes | No | Required (blocks onboarding) | Calorie maths, under-18 rules | `src/lib/sync/tables/profiles.js:39,253`; `proOnboarding.sexGate` per CLAUDE.md s2; age 13-100 `src/screens/ProOnboardingScreen.js:561` |
| 6 | Height, body weight, weight log, body fat/lean mass, measurements | Health and fitness > Health info | Health & Fitness > Health | Yes | No | No | Yes | No | Required for engine (consent-gated) / measurements optional | Functionality | `src/lib/sync/tables/weightLog.js`, `bodyComposition.js`; privacy.html s1 |
| 7 | Workouts, sets, reps, weights, plans, PRs, routines | Health and fitness > Fitness info | Health & Fitness > Fitness | Yes | No | No | Yes | No | Required (core) | Functionality | `src/lib/sync/tables/*`, `migrate_189` workout_sets |
| 8 | Food diary, custom foods, recipes, meal plans, nutrition targets | Health and fitness > Health info (nutrition has no own Play category; Apple lists it under Health) | Health & Fitness > Health | Yes | No | No | Yes | No | Optional (feature) | Functionality | `src/lib/sync/tables/foodDomain.js`, `mealPlans.js`, `nutritionTargets.js` |
| 9 | Weekly check-ins (energy, recovery, mood), screening answers | Health info | Health | Yes | No | No | Yes | No | Optional | Functionality | `src/lib/sync/tables/weeklyCheckins.js`; privacy.html s1 |
| 10 | Eating-disorder pattern flags | Health info | Health | Yes (cloud push, migrate_182 live) | No | No | Yes | No | Derived, automatic | Safety gate (server-side withhold) | `src/lib/sync/tables/edPatternFlags.js:2-15`; CLAUDE.md status line |
| 11 | Progress photo metadata + Volyume Score outputs (quality, confidence, band, score) | Health info | Health | Yes | No | No | Yes | No | Optional | Functionality | privacy.html s1; privacyTruth guard `src/screens/__tests__/privacyTruth.guard.test.js:17-30` |
| 12 | Progress photo image files | Photos and videos | Photos or Videos | **No** (device-local; leave device only if user shares/exports) | n/a | n/a | n/a | n/a | n/a | n/a | `app.json:150-ish` expo-camera text "stay on this device and are never uploaded"; privacy.html s3. Share/export via OS sheet is user-initiated. UNVERIFIED: no upload code path exists (grep `storage.from`/`.storage` in `src`: no hits). |
| 13 | Barcode / nutrition label scans | none | none | No (on-device ML Kit OCR + vision-camera; barcode value goes to OpenFoodFacts/USDA as a lookup key) | Barcode string/food query sent to OFF/USDA (no account id) | Yes | No | No | Optional | Functionality | `package.json:78` `@react-native-ml-kit/text-recognition`; listing doc "OpenFoodFacts / USDA"; privacy.html s7. UNVERIFIED: exact request shape in `src/lib/food/`. |
| 14 | Community posts, comments, notes, plan shares, Respect, follows, blocks, mutes, reports, groups | App activity > Other user-generated content / Other actions | User Content > Other User Content | Yes | No (user-initiated; visible to other users) | No | Yes | No | Optional (join Community), but **session sharing defaults ON once joined** | Functionality | `supabase/migrate_160_community.sql:1-12`; `migrate_184/185/186`; privacy.html s5 |
| 15 | Community direct messages, group chat | Messages > Other in-app messages | User Content > Emails or Text Messages (Apple has no "in-app messages" bucket; listing doc uses this) | Yes | No | No | Yes | No | Optional | Functionality | `migrate_191...sql:1-30`; privacy.html s5 "Messages ... moderators can see reported" |
| 16 | Community profile: area/town + gym label | Location > Approximate location | Location > Coarse Location | Yes (typed/picked label) | No | No | Yes | No | Optional | Functionality | `migrate_160...:1-12` "area and gym labels"; `migrate_162`, `163` |
| 17 | Device location reading ("Use my location") | Location > Approximate location | Location (not collected per Apple: used on-device for one query, not retained) | Reading is not stored (see note) | No | **Yes** | n/a | No | Optional, user-tapped | Gym finder | `src/lib/deviceLocation.js:67,81` foreground permission, `Accuracy.Low`, one position, no watch; header says never stored. NOTE: the position is sent to a gym-search RPC for matching? **UNVERIFIED**: if it is, Play wants "Approximate location, collected, ephemeral = Yes". Check `src/components/community/GymPicker.js` before declaring. |
| 18 | Training "now" presence marker, training consistency, age band (opt-in) | App activity | Usage Data > Other Usage Data | Yes | No | No | Yes | No | Optional (off by default for presence; minors never) | Functionality | `migrate_191...sql:12-22`; privacy.html s5 |
| 19 | First-party product telemetry (screen opens, sync runs, feature use, funnel) | App activity > App interactions | Usage Data > Product Interaction | Yes | No | No | Yes (pseudonymous account id, privacy.html s2) | No | **Optional: default ON, opt-out in Settings** | Analytics | `src/lib/telemetry/transport.js:37-44,66,90`; RPC `record_engine_telemetry` `:113`; privacy.html s2 |
| 20 | In-app feedback (sentiment, message up to 2000 chars, session id, app version, recent breadcrumbs, last error) | App activity > Other user-generated content (message); App info and performance > Diagnostics | User Content > Customer Support; Diagnostics | Yes | No | No | Yes (`user_id`) | No | Optional (user-submitted) | Functionality/support | `src/lib/feedback.js:104-118`; `supabase/migrate_013_user_feedback.sql:1-40` |
| 21 | Crash logs, performance traces (5%), session/release health | App info and performance > Crash logs, Diagnostics | Diagnostics > Crash Data, Performance Data | Yes (Sentry, a processor) | No (processor) | No | Yes: `setUser({id})` | No | Required (cannot disable; UNVERIFIED whether a toggle exists) | Crash reporting, diagnostics | `src/lib/sentry.js:90` tracesSampleRate 0.05, `:93` sendDefaultPii false, `:97` session tracking on, `:158-159` account id only; scrub `src/lib/observability/sentryScrub.js:1-80`; fail-closed `sentry.js` beforeSend. Sentry auto-attaches device model, OS, locale: UNVERIFIED but standard SDK behaviour. |
| 22 | Expo push token | App info/IDs > Device or other IDs | Identifiers > Device ID | Yes | Sent to Expo push service (processor) | No | Yes (`device_push_tokens` keyed user_id + token) | No | Optional (needs notification permission) | Push notifications | `src/lib/notifications/pushToken.js:92,118,160`; `supabase/migrate_053_device_push_tokens.sql:1-16` |
| 23 | Notification preferences, quiet hours | App activity | Usage Data / Other | Yes | No | No | Yes | No | Optional | Functionality | `src/lib/sync/tables/notificationPreferences.js` |
| 24 | Consent log (Article 9 consent version, timestamps) | App activity / Other | Other Data | Yes | No | No | Yes | No | Required | Legal compliance | `src/screens/Article9ConsentScreen.js` (version `2026-08-10`, privacyTruth test `:17`); `migrate_019`, `migrate_024` |
| 25 | Email hash retained after deletion | Personal info > Email (hashed) | Contact Info (hashed) | Yes (retained) | No | No | Pseudonymous | No | Automatic | Anti-trial-abuse | `public/privacy.html:169`. **Stale purpose (no trial exists, D137)**; see section 5. |
| 26 | Payment / purchase data | Financial info | Purchases | **No** (billing dormant, `FULL_ACCESS_FOR_ALL = true`, `src/lib/proGate.js:43`) | n/a | n/a | n/a | n/a | n/a | n/a | `react-native-iap` still bundled (`package.json:131`), see R5. |
| 27 | Contacts, calendar, audio, video, browsing history, advertising ID, precise location, files/docs | none | none | No | | | | | | | No `expo-contacts`/`expo-calendar`; `RECORD_AUDIO` blocked `app.json:78`; `ACCESS_FINE_LOCATION` blocked `app.json:76`; no WebView use in `src`. Document picker (`dataBackup.js`, `ImportScreen.js`) reads user-chosen files locally, no upload (UNVERIFIED beyond header reads). |
| 28 | Health Connect / HealthKit data | Health info | Health | **No** (integration removed) | | | | | | | `src/lib/health.js:90-100` getters return null; not in `package.json`. |

Third parties that receive data (all processors/functional): Supabase (everything in rows 1-11,14-16,18-20,22-25), Sentry (row 21), Expo push (row 22), Open Food Facts / USDA FDC (row 13). Google/Apple (sign-in, store). No analytics vendor, no ad network, no data broker.

Verdict for "Data shared with third parties": NO on both stores, provided OFF/USDA lookups carry no account id (UNVERIFIED, see row 13). Verdict for "Data used to track you": NO.

Verdict for "Data encrypted in transit": YES (`app.json:277` `usesCleartextTraffic: false`; Supabase/Sentry over TLS). At rest: server-side Supabase; device SQLCipher (`src/lib/dbCrypto.js`).

---

## 2. Android permissions

Declared in `app.json:67-74`; blocked at `app.json:75-83`. Merged manifest not available: plugin-injected permissions are UNVERIFIED and listed as "expected".

| Permission | Source | Justification in code | Play concern |
|---|---|---|---|
| CAMERA | app.json:68 | Barcode/label scan, progress photos (`ProgressPhotosScreen.js:335`, vision-camera, expo-camera) | Runtime prompt, in-use only. Fine. |
| VIBRATE | :69 | Haptics/rest timer | Normal |
| RECEIVE_BOOT_COMPLETED | :70 | Reschedule local reminders/alarms after reboot (expo-notifications) | Normal |
| FOREGROUND_SERVICE | :71 | `WorkoutForegroundService` rest-timer chronometer, type `shortService` (`modules/rest-timer-live/android/src/main/AndroidManifest.xml`) | `shortService` needs no type permission or FGS declaration (comment in that manifest). Be ready to answer the FGS question in App content. |
| WAKE_LOCK | :72 | Keep awake / timer (UNVERIFIED which consumer; `expo-keep-awake` in `package.json:103`) | Normal |
| SCHEDULE_EXACT_ALARM | :73 | Rest-cue beeps with app minimised via AlarmManager (`RestCueReceiver`, manifest comment; `SettingsWorkoutScreen.js`) | **Play restricted**: on Android 14+ it is not granted by default for non-alarm/calendar apps. Rest-timer cues are not alarm-clock/calendar functionality. Needs the Play Console permission declaration; rejection risk. Pinned by test `src/__tests__/campaign7.releaseConfig.test.js:29`; `USE_EXACT_ALARM` correctly absent (`:32`). |
| Blocked | :76-82 | FINE/BACKGROUND location, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, SYSTEM_ALERT_WINDOW, READ_MEDIA_IMAGES/VIDEO | Good: nothing sensitive declared. Note READ_MEDIA_IMAGES blocked yet `ShareCardScreen.js:803` and `:906` call media permission APIs; photo picker path avoids it, `MediaLibrary.requestPermissionsAsync` on API 33+ behaviour is UNVERIFIED on device. |

Expected but UNVERIFIED (injected by libraries, confirm with `bundletool dump manifest` on the AAB):
- INTERNET, ACCESS_NETWORK_STATE (netinfo, supabase).
- POST_NOTIFICATIONS (expo-notifications, API 33+), runtime prompt `src/lib/notifications/permissions.js:71`.
- ACCESS_COARSE_LOCATION (expo-location, `deviceLocation.js:67`; background flags off `app.json` plugin block).
- USE_BIOMETRIC / USE_FINGERPRINT (expo-local-authentication, opt-in App lock `src/lib/biometricLock.js`).
- com.android.vending.BILLING (react-native-iap, dormant billing). Declares a billing capability while the app is free; harmless for Data safety but Play may ask about it.
- READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE (expo-media-library, API <=32), ACCESS_MEDIA_LOCATION disabled by plugin (`isAccessMediaLocationEnabled: false`).
- Widget receivers (react-native-android-widget), no permission.
- `queries` for com.whatsapp, SENDTO smsto/mailto, VIEW sms (`app.json` expo-build-properties manifestQueries): share-to-WhatsApp/SMS. No QUERY_ALL_PACKAGES. Fine.
- `allowBackup: false` (`app.json:66`).

Unneeded/flag: SCHEDULE_EXACT_ALARM (restricted, see above). WAKE_LOCK probably redundant with library-injected declarations (low importance). minSdk 26 (`app.json:275`) contradicts the listing's "Android 7.0+ (API 24)".

---

## 3. iOS

Info.plist (`app.json:29-46`):

| Key | Value / usage | Matches code? |
|---|---|---|
| NSCameraUsageDescription (`:31`) | barcodes, nutrition labels, progress photos | Yes. Note expo-camera plugin text (`cameraPermission`) and vision-camera text (`cameraPermissionText`: "barcodes and nutrition labels", omits progress photos) differ; the later-applied plugin may overwrite `:31`. UNVERIFIED which wins in the built plist. Make all three identical before review. |
| NSMotionUsageDescription (`:32`) | shake-to-feedback | Yes (`FeedbackSheet.js`, `ProgressGhostCapture.js` use expo-sensors). Second use (ghost capture) not stated. |
| NSLocationWhenInUseUsageDescription (`:33`) + NSLocationDefaultAccuracyReduced true (`:34`) | one-shot approximate gym search | Yes (`deviceLocation.js:81`). Claim "never shared": see row 17 verification. |
| NSMicrophoneUsageDescription (`:35`) | "does not record audio... required by bundled media library" | Honest, but Apple may query a mic string with no recording. expo-av is used for sounds (`RestTimer.js`, `restSound.js`). Vision-camera `enableMicrophonePermission: false`. Low risk. |
| NSFaceIDUsageDescription (`:36`) | opt-in App lock | Yes (`biometricLock.js`). |
| NSPhotoLibraryUsageDescription / NSPhotoLibraryAddUsageDescription | from expo-media-library plugin strings `photosPermission`/`savePhotosPermission` | Plugin-injected, UNVERIFIED in final plist. Also needed by expo-image-picker (`ProgressPhotosScreen.js:337,365`, `AthleteProfileScreen.js:357`); picker uses PHPicker (no prompt) so fine. |
| ITSAppUsesNonExemptEncryption false (`:29`) | | Debatable (SQLCipher, TLS); standard exemption for TLS only; SQLCipher on-device encryption of own data is generally exempt but confirm the export-compliance answer. UNVERIFIED. |
| NSSupportsLiveActivities true (`:30`) | Live Activity (`modules/live-activity`) | Yes. |
| UIBackgroundModes: fetch, remote-notification (`:37-40`) | push + background fetch | `expo-background-fetch` is in `package.json:91` but no `src` file imports it (grep: no hits), so `fetch` may be unneeded. UNVERIFIED whether `expo-task-manager` or widgets use it. Review risk if Apple asks for justification. |
| LSApplicationQueriesSchemes whatsapp, sms, mailto | share | Yes |
| NSUserTrackingUsageDescription | absent | Correct (no tracking). |

Entitlements: only Apple Sign In (`app.json:27`) is explicit. **No `ios.entitlements` in `app.json`** (grep: none), yet `plugins/withVolyumeWidget.js:24-29,50` says the app target declares App Group `group.app.volyume.widget` via `app.json ios.entitlements`. So the app target may lack the App Group and the widget snapshot becomes a silent no-op (the plugin header says that is "safe"). UNVERIFIED whether another plugin adds it. Associated Domains entitlement deliberately OFF (`campaign7.releaseConfig.test.js:42-59`), so HTTPS universal links do not work on iOS yet; only the `volyume://` scheme does. Widget extension entitlement declares the App Group (`withVolyumeWidget.js:72`). Push notifications entitlement is expo-notifications default (`aps-environment`) UNVERIFIED.

Privacy manifest (`app.json:47-56`): only `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1). No `NSPrivacyCollectedDataTypes` or `NSPrivacyTracking` keys in `app.json`. Libraries ship their own manifests (Sentry, Expo), but the app-level manifest lists no collected data types: UNVERIFIED whether this matters for review; the App Store Connect nutrition label is the binding declaration. Other required-reason API categories (file timestamp, disk space, system boot time) are likely used by dependencies/SQLite: UNVERIFIED.

---

## 4. Content rating / age rating supported by code

Minimum signup age is 13 (`ProOnboardingScreen.js:561`; privacy.html s10). The product is not child-directed; Play target audience should be 13+ (or 18+), not "includes children". Families policy does not apply.

| Topic | What code does | Evidence |
|---|---|---|
| User-generated content | **YES**: public profiles, posts, comments, plan shares, groups, challenges, DMs, group chat, shared workout posts | `migrate_160...:1-12`, `migrate_165`, `migrate_191` |
| Users interact / share info | **YES**: follow, message, group chat, presence ("training now") | `migrate_191...:12-22` |
| Moderation safeguards (needed for Apple 1.2 and Play UGC policy) | Report (incl. messages, groups), block, mute, auto-hide at 3 reports, moderator queue, audit log, keyword filter (slurs, self-harm instruction, pro-ED vocabulary), rate limits, minors followers-only and never on public web pages, quiet hours | `src/lib/community/moderation.js:1-30`, `keywordFilter.js:1-25`, `migrate_160/164/165/174/191`, privacy.html s5 |
| Unrestricted web access | No in-app browser/WebView (`react-native-webview` in deps `package.json:142` but no `src` import). External links open via `Linking.openURL` (16 call sites) and `expo-web-browser` (UNVERIFIED use) | grep |
| Location sharing with others | Optional town + gym label on profile; no live location | row 16 |
| Health/medical/diet content | Calorie/macro targets, weight-loss rate gating, eating-disorder screening and signposting (Beat UK), calm mode. Not medical advice | privacy.html s4; CLAUDE.md s2 |
| Violence, sex, nudity, profanity, drugs, gambling | None authored by app. UGC can contain profanity (filter is deliberately narrow: "Ordinary swearing is NOT on this list", `keywordFilter.js:7-10`) | `keywordFilter.js` |
| Progress photos | Device-local; Community avatars are built-in presets, no user image upload | `migrate_160...:8` "avatar preset" |
| In-app purchases / ads | None. IAP dormant | `proGate.js:43` |
| Digital purchases/real-money | None | |

Implications: answer "Yes" to UGC and to user-to-user communication on both stores. Expect Play (IARC) to land above PEGI 3 / Everyone once "Users can interact" and "shares user-generated content" are ticked (typically a PEGI 3 with an "Interactive elements: Users interact, Shares info/location" descriptor, or higher if Medical/diet questions escalate: UNVERIFIED exact outcome). Apple's refreshed age-rating questionnaire (post-2025) includes messaging/chat, UGC, health/wellness, medical topics and age-assurance items: exact wording UNVERIFIED here; the stored doc uses the old question set and "4+" cannot be kept with UGC=Yes plus chat (UNVERIFIED mapping; Apple will compute the band).

Play also requires (UNVERIFIED not yet done, not in checklist): Health apps declaration in App content (the app is Health & Fitness with health data), Data safety form, target audience, ads declaration (No ads), government/financial declarations (No).

---

## 5. Existing docs versus code

| Doc | Claim | Code reality |
|---|---|---|
| `docs/PLAY_STORE_LISTING.md:99,307` | Content rating Everyone / PEGI 3 | Community UGC, DMs, group chat exist; see section 4. |
| `PLAY_STORE_LISTING.md:301` | User-generated content: No | **Wrong**: Community is UGC (posts, comments, chat). The same file's Data safety table (`:343-345`) lists Community posts/messages, so the file contradicts itself. |
| `PLAY_STORE_LISTING.md:304-306` | "Data shared with third parties: No" | Consistent with analysis; keep, with the definition note in `:319-327`. |
| `PLAY_STORE_LISTING.md:~364` | Android 7.0+ (API 24) | `app.json:275` minSdk 26 (Android 8.0). |
| `PLAY_STORE_LISTING.md:~369` | "deletion in-app and via the public web URL" | Only a policy section and the support page exist (`public/privacy.html:167`, `public/support/index.html:128`); no dedicated web request-deletion page or form, and no URL given. Play requires a web link in the Data safety deletion field. |
| `PLAY_STORE_LISTING.md:~364-369` "Distribution" build steps | Workflow "runs on every push to main or claude/**" | Not verified; CLAUDE.md says the Android workflow is manual dispatch since 2026-08-28. Out of scope but stale. |
| `PLAY_STORE_LISTING.md` data table | Crash logs "Required" | OK (no opt-out found, UNVERIFIED). Telemetry "Optional (off in Settings)" matches code (`transport.js:37`) but it is default ON. |
| `PLAY_STORE_LISTING.md` data table | Device/other IDs: push token "Optional" | Matches. Missing rows: feedback submissions (row 20), ED pattern flags (row 10, covered under Health), presence/training-now, consent log, hashed email retained. |
| `docs/APP_STORE_CONNECT_LISTING.md:283` | User-Generated Content: No | **Wrong**, as above. |
| `APP_STORE_CONNECT_LISTING.md:289` | Target 4+ | At risk; see section 4. |
| `APP_STORE_CONNECT_LISTING.md:~318` | Health row includes "steps, cardio" | Steps/cardio no longer recorded (`src/lib/health.js:90-100`); `PLAY_STORE_LISTING.md` already corrected this, the Apple doc was not. (Old steps rows may still sync, `src/lib/sync/tables/dailySteps.js`, `cardioLog.js` exist.) |
| `APP_STORE_CONNECT_LISTING.md` "Data Linked to You" | Product interaction is "first-party telemetry, off in Settings" | Matches code; default is ON. Fine. |
| `APP_STORE_CONNECT_LISTING.md` practices | "Cloud sync is optional and requires account creation" | Account is mandatory (no anonymous mode, `IDENTITY_AND_OWNERSHIP_LOCKED.md`). Cloud sync cannot be turned off independently (UNVERIFIED). Replace wording. |
| `APP_STORE_CONNECT_LISTING.md:~370` | "`pro_monthly`/`pro_annual` IAPs deactivated" checkbox | Consistent with free product; confirm in ASC. |
| `public/privacy.html` s6 | Health Connect/HealthKit read weight & steps, write workouts | **Removed** from code (`health.js:90-100`). Policy is wrong and also now advertises a capability the Play listing says is not present. |
| `public/privacy.html` s7, s8, s10 | "Apple App Store and Google Play for subscription purchases"; "14-day free trial"; "refund any active subscription"; | Product is fully free since D137; no trial, no subscription. Stale. Also `public/support/index.html:7,83,93` still has a "Pro subscription" section. |
| `public/privacy.html` s3 | "EncryptedSharedPreferences on Android and Keychain on iOS for tokens" | Code uses `expo-secure-store` (Android Keystore-backed; CLAUDE.md s1). Substantively equivalent, wording slightly off. |
| `public/privacy.html` s2 | "whether a purchase flow completes" | Billing dormant. |
| `public/privacy.html` s7 | Sub-processors omit Google/Apple sign-in providers and Sentry in s1 context | Minor. |
| `docs/RELEASE_READINESS_PLAY.md` | £2.99/£19.99 pricing, Pro gating, trial, versionCode 11, version 1.2.0 | Entirely superseded (free product, 2.14.0/3357). Do not use for declarations. |
| `docs/SUBMISSION_CHECKLIST.md:99-100` | Target PEGI 3; "answers in PLAY_STORE_LISTING" | Inherits the errors above. |
| `app.json` expo-camera text | "Progress photos stay on this device and are never uploaded" | Consistent with code (no upload path found). |
| In-app `PrivacyPolicyScreen.js:8` | LAST_UPDATED '26 September 2026', pinned by test `privacyTruth.guard.test.js:34` | Same date as web (`public/privacy.html`), so both share the Health Connect/trial/subscription staleness (in-app text for Health Connect/trial/subscription grep: no hits in `PrivacyPolicyScreen.js`, so the in-app and web policies may DIFFER; UNVERIFIED line-by-line). |

---

## 6. Deletion path and required URLs

In-app: Settings, Account, Delete account (`src/hooks/useAccountActions.js:162-200`, confirm dialog `:166-189`). Flow: edge function `delete-account` (`:239`; `supabase/functions/delete-account/index.ts:1-25`) runs `delete_user_data` then deletes `auth.users`; falls back to RPC `delete_user_data` (`:270`) and a retry marker (`src/lib/deletionRetry.js`) when offline; then local wipe (SQLite, AsyncStorage, SecureStore `:335-390`). Community profile, posts and group content are removed (`useAccountActions.js:169`; privacy.html s5, s8). Backups purged within 30 days (privacy.html s8). Separate "Leave Community" deletes only Community data (privacy.html s5). Withdrawing Article 9 consent also deletes the account (privacy.html s9).

Retained after deletion: one-way email hash (`public/privacy.html:169`; stated purpose obsolete), reports a user made (account detached) (`privacy.html` s5). These must be disclosed on the Play deletion/retention answers and described truthfully (the trial-restart purpose is false in a free product).

Apple: no Sign in with Apple token revocation call found in `supabase/functions/delete-account/index.ts` or the client (grep for `revoke` / `appleid.apple.com/auth`: no relevant hits). Apple's account-deletion rules (5.1.1(v)) expect revocation for Sign in with Apple users. UNVERIFIED that none exists elsewhere (e.g. server-side outside repo).

URLs in repo:
- Privacy policy: `https://volyume.app/privacy` (`public/privacy.html`; `src/screens/ProUpgradeScreen.js:654` dormant screen; listing docs).
- Support: `https://volyume.app/support` (`public/support/index.html`, section 7 "Delete your account" at `:128`).
- Marketing: `https://volyume.app`.
- Contact: `support@volyume.app` (policy, tests pin it); the Play listing doc still uses `allansdouglas1983@gmail.com` as contact email (`PLAY_STORE_LISTING.md:101`); privacy test `privacyTruth.guard.test.js` forbids that address in the in-app policy only.
- **Web account-deletion URL (Play Data safety requirement): none dedicated.** Closest: `https://volyume.app/support` (section 7) or `https://volyume.app/privacy` s8. Neither offers a way to request deletion without the app (no form, no mailto instruction found in the s7 text read; only the in-app path). UNVERIFIED if support page contains a mailto beyond the intro.
- Terms URL: none found (`src` grep for `/terms`: no hits).
- Deep-link hosts claimed on Android (`app.json:~85-150`, `autoVerify: true`): volyume.app paths /partner, /u, /p, /s, /g/. Digital Asset Links file `/.well-known/assetlinks.json` presence UNVERIFIED (not in `public/` listing).

---

## Top risks

1. R1: Community UGC and chat declared "No" in both listing docs; PEGI 3 / 4+ targets unsupported (section 4/5).
2. R2: Public privacy policy is stale and wrong on Health Connect/HealthKit, subscriptions, trial and refunds; Data safety must match code, and the policy URL must match the form.
3. R3: No dedicated web account-deletion URL for Play; Apple Sign In token revocation not found on deletion; hashed-email retention with an obsolete purpose.
4. R4: `SCHEDULE_EXACT_ALARM` is a Play-restricted permission with a weak justification (rest-timer cue beeps).
5. R5: Unverified merged manifest/Info.plist (BILLING from dormant react-native-iap, mic/camera string conflicts, missing `ios.entitlements` App Group, unneeded `fetch` background mode, `NSPrivacyCollectedDataTypes` absent). R7 also: location "ephemeral" claim (row 17) and OFF/USDA payload need confirming before ticking "not collected" and "not shared".

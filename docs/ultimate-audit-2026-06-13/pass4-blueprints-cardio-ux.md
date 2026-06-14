# PASS-4 IMPLEMENTATION BLUEPRINTS — CARDIO + UX CLUSTER

Source-of-truth set read in full for this file (per CLAUDE.md "work from the source"):
- `docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md` (Call 2, 2026-06-14; lines 63-72, 81-94).
- `docs/ultimate-audit-2026-06-13/pass3-comparison-matrix.md` (CD rows :363-376, UX rows :480-499, FAST-FOLLOW :352-359).
- `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (voice — MANDATORY; honesty test §1, patterns §3, failure catalogue §6, register/science layer Addendum 2026-06-12).
- `docs/ultimate-audit-2026-06-13/_AUDIT-SPEC.md:252-271` (blueprint format), `:241-250` (NEEDS ANSWER mechanism).

Tag legend (per `_AUDIT-SPEC.md:252-271`): `[P1:file:line]` code-of-record · `[P2:id]` research evidence with provenance · `[P3:gap]` Pass-3 gap statement · `[INFERENCE]` reasoned from tagged facts, not asserted as code.

Scope: the four founder-APPROVED items only (`pass3-v2-founder-decisions.md:64-72`). No others.

---

## ITEM 1 — PASSIVE CARDIO IMPORT (read-only Health cardio sessions + heart rate)

**ID:** ULTIMATE-CUX-PCI
**CLUSTER:** CD (Cardio)
**TITLE:** Passive cardio-session import from Apple Health / Health Connect (read-only, feedback-only)
**PRIORITY TIER:** NEEDS ANSWER [NA-cux-1] (priority tier/impact/effort/score not assigned in the founder-decisions log; the matrix lists this under CD "HOW TO ELEVATE (1)" without a tier number) | files-to-check: `docs/ultimate-audit-2026-06-13/pass3-comparison-matrix.md` CD section, `docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md` Call 2.
**IMPACT / EFFORT / PRIORITY SCORE:** see NA-cux-1.

### CURRENT STATE
- The health wrapper reads only two scopes today: bodyweight and step count `[P1:src/lib/health.js:14-18]` (doc header: "Read scopes supported so far: 'weight'") and `[P1:src/lib/health.js:51-52]` (only `Weight` and `StepCount` read permissions are built). There is NO cardio-session or heart-rate read path `[P1:src/lib/health.js:45-59]`.
- Workout WRITE exists (`writeWorkoutToHealth`) but is one-directional, app→Health, and strength-only `[P1:src/lib/health.js:524-580]`.
- All cardio is manual today: `LogCardioScreen` is "User-led cardio logging" `[P1:src/screens/LogCardioScreen.js:4-5]`, writing via `insertCardioLog(... source: 'manual')` `[P1:src/screens/LogCardioScreen.js:123-135]`.
- The `cardio_log` table ALREADY carries the columns a passive import needs: `distance`, `avg_hr`, and a `source` column defaulting to `'manual'` `[P1:src/lib/database.js:1221-1223]`, and `insertCardioLog` already maps `session.distance`, `session.avgHr`, and `session.source` `[P1:src/lib/database.js:4011-4013]`.
- The per-user import cursor pattern already exists for weight: `getLastImportMs` / `setLastImportMs` keyed per uid `[P1:src/lib/health.js:588-601]`, and `importNewWeights` is the existing "pull since cursor, write local, advance cursor, never throw" template `[P1:src/lib/health.js:615-656]`.
- The estimate is and must stay feedback-only: "This isn't added to your calorie target, your weight trend includes everything you burn" `[P1:src/screens/LogCardioScreen.js:225-227]`, and the same no-add-back rule is restated on the Progress card `[P1:src/components/CardioPlanCard.js:13-15,:56-58]`.
- Offline-first sync for cardio_log already exists: bidirectional, last-write-wins on `updated_at`, soft-delete, missing-table benign skip `[P1:src/lib/sync/tables/cardioLog.js:9-19,:48-106]`. Imported rows ride this same path with no new sync code.

### THE GAP [P3]
Cardio **sessions** are manual-only: there is no passive cardio-session or heart-rate ingestion from the wearable platforms (the wrapper reads steps + weight only) `[P3: pass3-comparison-matrix.md:371-372]`. The elevate action is "(1) read-only Apple Health / Health Connect cardio-session + HR import, feedback-only, deterministic model preserved" `[P3: pass3-comparison-matrix.md:373-374]`.

### THE EVIDENCE [P2, provenance noted]
- "read-only Apple Health/Health Connect cardio-session + HR import, feedback-only, deterministic model preserved (all-3; engine-safe)" `[P2: pass3-comparison-matrix.md:373-374, provenance: triangulated all-3 deep-research passes, graded engine-safe]`.
- Founder decision, Call 2 2026-06-14: "Passive wearable import (upgraded from MAYBE → YES): read-only Apple Health/Health Connect cardio-session + HR, feedback-only, deterministic model preserved" `[P2: pass3-v2-founder-decisions.md:69-70, provenance: founder decision log]`. NOTE this is the cardio-SESSION + HR import; HRV and sleep ingestion were separately DISMISSED `[P2: pass3-v2-founder-decisions.md:174, provenance: founder decision log, Section A]`.
- Open question the founder logged against this exact item: "Whether wearable cardio-session import is allowed under EU-residency/offline-first — CD" `[P2: pass3-comparison-matrix.md:512, provenance: founder open-question list]`. Addressed in EDGE CASES below: import is local-only + EU-residency-clean because the data never leaves the existing offline-first + EU-Dublin sync path.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner who runs on a treadmill with their watch opens Volyume and, without typing anything, sees that run already in their cardio list, labelled with where it came from. They never have to learn what to enter. The card still says the burn is already counted, so they are never told to eat it back.

### ATHLETE EXPERIENCE AFTER CHANGE
A competitor who logs zone-2 sessions on a Garmin/Apple Watch gets duration, distance, and average heart rate carried into Volyume automatically, so the "done vs planned" trend (Item 2) reflects what they actually did without double-entry. They keep manual logging for anything the watch missed; imported and manual sessions sit in one list.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1:file:line]**
- `src/lib/health.js` — add a `'cardio'` read scope and a `readCardioSessionsSince` + `importNewCardio` pair, mirroring the weight import template `[P1:src/lib/health.js:45-59,:371-412,:615-656]`.
- `src/lib/database.js` — reuse `insertCardioLog` (already accepts `distance`/`avgHr`/`source`) `[P1:src/lib/database.js:4011-4013]`; add a de-dup guard keyed on a platform sample id (see DATA). Reuse `getCardioLogRange` for any "already imported this window?" check `[P1:src/lib/database.js:4098-4108]`.
- `src/screens/SettingsScreen.js` — add the connect/sync-cardio row next to the existing Health rows. NEEDS ANSWER [NA-cux-2]: exact Settings file + line of the current Apple Health / Health Connect row that weight import is surfaced under | files-to-check: `src/screens/SettingsScreen.js`, `src/screens/SettingsCoachingScreen.js`, any screen calling `importNewWeights`/`requestHealthPermissions`.
- Import trigger wiring (foreground listener + Settings "Sync now"): same callers that already invoke `importNewWeights`. NEEDS ANSWER [NA-cux-3]: where `importNewWeights` is currently invoked (foreground/AppState listener and/or Settings button) so cardio import attaches to the identical trigger | files-to-check: grep `importNewWeights` across `src/`.

**DATA [mark NEW]**
- `cardio_log.source` — EXISTING column `[P1:src/lib/database.js:1223]`. Imported rows set `source` to a platform tag. NEW value convention (string only, no schema change): `'apple_health'` / `'health_connect'`. [INFERENCE — the column is free-text TEXT and `insertCardioLog` passes `session.source` straight through `[P1:src/lib/database.js:4013]`, so no migration is needed; only a new string value.]
- `cardio_log.distance`, `cardio_log.avg_hr` — EXISTING columns `[P1:src/lib/database.js:1221-1222]`, populated from the imported session's distance + average HR. No migration.
- De-dup key — NEW. The platform sample's stable identifier (HealthKit UUID / Health Connect record id) must be stored so re-running the import does not create duplicate rows. The weight importer de-dups by calendar day via `logMorningWeight` `[P1:src/lib/health.js:638-639]`, but cardio can have several same-day sessions `[P1:src/lib/sync/tables/cardioLog.js:6]`, so day-keying is unsafe. NEEDS ANSWER [NA-cux-4]: whether to (a) add a NEW nullable `cardio_log.ext_id TEXT` column + unique guard, or (b) derive the local `id` deterministically from the platform sample id so the existing `INSERT ... PRIMARY KEY (user_id, id)` upsert de-dups for free | files-to-check: `src/lib/database.js:4019-4028` (insert + PK), `src/lib/database.js` migration array around `:1208-1232`, `docs/rules/supabase.md` (any column-add must follow the migration rules; cloud table is migration 064 `[P1:src/lib/sync/tables/cardioLog.js:10]`). DECISION REQUIRED before build; do NOT guess a default.

**COMPONENT STRUCTURE [parent import P1:file:line]**
- No new screen. The imported sessions render through the EXISTING `CardioHistoryScreen` list (it reads `getRecentCardioLog` and shows `activityName / durationMin / intensity / estKcal` per row) `[P1:src/screens/CardioHistoryScreen.js:43-52,:92-100]` and the EXISTING `CardioPlanCard` week summary `[P1:src/components/CardioPlanCard.js:17-35]`, mounted by `AnalyticsScreen` `[P1:src/screens/AnalyticsScreen.js:304-312]`.
- The connect affordance is a Settings row (parent: Settings screen, see NA-cux-2), invoking `requestHealthPermissions(['cardio'])` `[P1:src/lib/health.js:164]` and then the new `importNewCardio(userId)`.

**USER FLOW [sequence]**
1. User opens Settings, taps "Connect cardio from {Apple Health|Health Connect}" (label via `getHealthProviderLabel()` `[P1:src/lib/health.js:122-126]`).
2. App calls `requestHealthPermissions(['cardio'])`; on iOS this presents the Health sheet for the cardio read scope and records it as "asked" `[P1:src/lib/health.js:167-173]`; on Android it requests the cardio record types via Health Connect `[P1:src/lib/health.js:176-218]`.
3. On grant, `importNewCardio(userId)` runs: read sessions since the per-user cursor (`getLastImportMs` `[P1:src/lib/health.js:588-595]`), map each to `insertCardioLog` with `source` = platform tag, distance + avgHr, de-dup per NA-cux-4, advance the cursor (`setLastImportMs` `[P1:src/lib/health.js:597-601]`).
4. Each new session writes locally and `insertCardioLog` calls `_scheduleSync()` `[P1:src/lib/database.js:4029]`, so it queues for EU-Dublin sync via the existing offline-first cardio_log handler `[P1:src/lib/sync/tables/cardioLog.js:48-106]`.
5. Thereafter the same trigger that fires `importNewWeights` (NA-cux-3) silently pulls new sessions in the background.
6. Imported sessions appear in `CardioHistoryScreen` and feed `summariseWeekCardio` `[P1:src/lib/cardio/cardioEngine.js:102-113]` for the trend (Item 2). The kcal estimate is NEVER added to the food target `[P1:src/screens/LogCardioScreen.js:225-227]` `[P1:src/components/CardioPlanCard.js:56-58]`.

**ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]**
PRO. Cardio is a Pro domain: `LogCardioScreen` and `CardioHistoryScreen` are wrapped by `withProGuard(..., 'Cardio')` `[P1:src/navigation/RootNavigator.js:161-162]` (gate fn `withProGuard` `[P1:src/components/ProGate.js:134-140]`, which renders `ProLocked` unless `tier === 'pro'`). The `CardioPlanCard` only mounts when `tier === 'pro'` `[P1:src/screens/AnalyticsScreen.js:304]`. The Settings connect row must therefore be Pro-gated identically; NEEDS ANSWER [NA-cux-5]: whether the Settings cardio-connect row should be hidden for free users or shown behind `ProGate`/`ProBadge` `[P1:src/components/ProGate.js:22-85,:145-153]` | files-to-check: how the existing Health weight row is gated in Settings (NA-cux-2), founder gating preference. Do NOT guess.

**EMPTY STATE [British copy]**
Before any connect, the Settings row reads: "Bring in cardio from {Apple Health|Health Connect}. Read only. Volyume never sends your health data out." Cardio history with nothing logged or imported keeps the existing copy: "No cardio yet" / "Sessions you log show up here." `[P1:src/screens/CardioHistoryScreen.js:80-83]` — extend the subtitle to "Sessions you log, or bring in from {provider}, show up here." (British English; passes honesty test: true if the user does nothing.)

**LOADED STATE**
History rows show imported sessions alongside manual ones with the same `activityName · durationMin · intensity · ~kcal` line `[P1:src/screens/CardioHistoryScreen.js:95-100]`. NEEDS ANSWER [NA-cux-6]: whether an imported row should carry a visible source tag (e.g. "from Apple Watch") and, if so, the exact copy, OR stay visually identical to manual rows | files-to-check: founder preference; `CardioHistoryScreen.js:92-105` (row render). No guessed default.

**ERROR STATE**
Permission denied / SDK unavailable: surface the existing distinct returns — `'unavailable'`, `'denied'`, `'sdk_unavailable'`, plus the Android install/update path `getHealthConnectSdkStatus` + `openHealthConnectInstall` `[P1:src/lib/health.js:164-233,:323-353]`. Copy: "Couldn't connect to {provider}. Open {provider} settings to allow Volyume to read cardio." Import failures must be silent + non-throwing exactly like the weight importer (one bad row logs a warning and the loop continues) `[P1:src/lib/health.js:646-651]`.

**EDGE CASES**
- EU-residency / offline-first (the founder's logged open question) `[P2: pass3-comparison-matrix.md:512]`: imported data is written to the local SQLite `cardio_log` first `[P1:src/lib/database.js:4019-4028]` and only syncs through the existing EU-Dublin cardio_log handler `[P1:src/lib/sync/tables/cardioLog.js:84-87]`; no third-party service touches it, satisfying CLAUDE.md "No PII sent to any external service" and "EU data residency". [INFERENCE from the two tagged facts.]
- Apple-Watch-saved-on-device duplicate: the WRITE path already has `shouldSkipPhoneHealthWrite` so the phone does not double-write a watch session `[P1:src/lib/health.js:517-522]`; the READ path needs its own de-dup (NA-cux-4) so a session the user ALSO logged manually is not duplicated. NEEDS ANSWER [NA-cux-7]: collision rule when a user manually logged a session that also imports from the watch (prefer imported / prefer manual / keep both) | files-to-check: founder preference; `cardioEngine.js:102-113` (the summary counts every row, so duplicates would inflate the trend). No guessed default.
- Heart-rate-only samples with no session: out of scope — the founder item is cardio-SESSION + HR (HR attached to a session), and HRV/sleep were dismissed `[P2: pass3-v2-founder-decisions.md:69-70,:174]`. Import only sessions; attach avg HR to them.
- iOS cannot read its own auth state; reuse the persisted "asked scopes" re-init pattern so a granted user keeps importing across restarts `[P1:src/lib/health.js:38-87,:240-249]`.

**DUAL-AUDIENCE DESIGN**
Newbie: zero new vocabulary; sessions appear without instruction, the no-add-back footnote prevents the classic "eat back your exercise" mistake `[P1:src/components/CardioPlanCard.js:56-58]`. Athlete: distance + avg HR carried through for sessions they care about, feeding the deterministic dose engine unchanged `[P1:src/lib/cardio/cardioEngine.js:1-19]`.

### VERIFICATION
Facts tagged: current-state claims `[P1:src/lib/health.js:*]`, `[P1:src/lib/database.js:*]`, `[P1:src/screens/LogCardioScreen.js:*]`, `[P1:src/components/CardioPlanCard.js:*]`, `[P1:src/lib/sync/tables/cardioLog.js:*]` — all from files opened with Read. Evidence `[P2:* provenance noted]`. Gap `[P3:*]`.
Open NA-ids: NA-cux-1, NA-cux-2, NA-cux-3, NA-cux-4, NA-cux-5, NA-cux-6, NA-cux-7. NOT FINAL until resolved.

---

## ITEM 2 — CARDIO TREND VIEW ("done vs planned" over time)

**ID:** ULTIMATE-CUX-CTV
**CLUSTER:** CD (Cardio)
**TITLE:** Cardio trend view — turn the history list into "how often you did your cardio" (done vs planned over time)
**PRIORITY TIER:** NEEDS ANSWER [NA-cux-8] (no tier/impact/effort/score in the founder log; matrix lists it under CD "HOW TO ELEVATE (2)") | files-to-check: `pass3-comparison-matrix.md` CD section :374-376.
**IMPACT / EFFORT / PRIORITY SCORE:** see NA-cux-8.

### CURRENT STATE
- `CardioHistoryScreen` is a plain reverse-chronological list grouped by day, no trend or over-time analytics `[P1:src/screens/CardioHistoryScreen.js:1-9,:43-52]`.
- The "done vs planned" inputs ALREADY EXIST: a planned target (`target.sessionsPerWeek`) is read on the Progress card `[P1:src/components/CardioPlanCard.js:30]` from `userProfile.cardioTarget` `[P1:src/screens/AnalyticsScreen.js:308]`; "done" is computed by `summariseWeekCardio(rows).sessions` `[P1:src/lib/cardio/cardioEngine.js:102-113]`; and the per-week verdict already exists as `cardioComplianceFromLog(sessionsLogged, target)` returning `'hit'|'mostly'|'missed'` `[P1:src/lib/cardio/cardioEngine.js:88-95]`.
- A range query for any window already exists: `getCardioLogRange(userId, fromDate, toDate)` `[P1:src/lib/database.js:4098-4108]`, and the card already builds a 7-day window with `activityDayKey` `[P1:src/components/CardioPlanCard.js:21-24]` / `[P1:src/lib/database.js:3928-3930]`.
- The current single-week card already phrases it plainly as "{done} of {goal} sessions this week" `[P1:src/components/CardioPlanCard.js:31-35]` — the plain "done vs planned" wording the founder asked for, already in place for one week.

### THE GAP [P3]
The history is "reverse-chrono ... no trend/adherence analytics" `[P3: pass3-comparison-matrix.md:372]`. Elevate action "(2) cardio trend/adherence view (history list → done vs planned over time)" `[P3: pass3-comparison-matrix.md:374-376]`. The founder REFRAMED the wording: it must read as "how often you did your cardio / done vs planned", NOT "adherence" `[P3: pass3-v2-founder-decisions.md:72]`, restated in the per-item voice guards: "'cardio trend' → 'how often you did your cardio / done vs planned' (not 'adherence')" `[P3: pass3-v2-founder-decisions.md:92]`.

### THE EVIDENCE [P2, provenance noted]
- "(2) cardio trend/adherence view (history list → done vs planned over time)" `[P2: pass3-comparison-matrix.md:374-376, provenance: Pass-3 matrix CD elevate list, single-source flagged as elevate not multi-research-ranked]`.
- Founder Call 2 acceptance: "CD — Cardio trend view (history list → 'done vs planned' over time; plain wording, NOT 'adherence')" `[P2: pass3-v2-founder-decisions.md:71-72, provenance: founder decision log]`.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner sees a simple week-by-week strip: weeks they did the cardio they set out to, and weeks they did less, in plain words, no score, no "adherence". It shows what happened, never judges them.

### ATHLETE EXPERIENCE AFTER CHANGE
A competitor on a cut sees several weeks of "did vs planned" at a glance, so they can tell whether they have been holding the cardio dose the coach set, without reading every daily row. The numbers lead; the trend is the data, not a grade.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1:file:line]**
- `src/screens/CardioHistoryScreen.js` — add an over-time "done vs planned" summary section above the existing day-grouped list `[P1:src/screens/CardioHistoryScreen.js:78-107]`. Pull multiple weeks via `getCardioLogRange` `[P1:src/lib/database.js:4098-4108]` instead of (or alongside) the current single `getRecentCardioLog(userId, 200)` `[P1:src/screens/CardioHistoryScreen.js:43]`.
- `src/lib/cardio/cardioEngine.js` — add a pure `summariseCardioByWeek(rows, weeks)` (or per-week reducer) built on the existing `summariseWeekCardio` `[P1:src/lib/cardio/cardioEngine.js:102-113]` and `cardioComplianceFromLog` `[P1:src/lib/cardio/cardioEngine.js:88-95]`. Pure + unit-testable per the file's stated principle "No DB, no store, no screens" `[P1:src/lib/cardio/cardioEngine.js:4-7]`.
- The screen needs the planned target per week. NEEDS ANSWER [NA-cux-9]: `userProfile.cardioTarget` is a single CURRENT target `[P1:src/screens/AnalyticsScreen.js:308]` — is any HISTORY of past weekly targets stored anywhere (so "planned" can vary per past week), or must the trend compare every past week against today's target? | files-to-check: `src/screens/CoachOutputScreen.js:902,:1248` (where cardioTarget is written), `src/lib/weeklyCoach.js` (cardio history), `src/lib/database.js` (any cardio_target history table). No guessed default — this determines whether "planned" is per-week-accurate or a single line.

**DATA [mark NEW]**
- Reads only from EXISTING `cardio_log` via `getCardioLogRange` `[P1:src/lib/database.js:4098-4108]` and EXISTING `userProfile.cardioTarget` `[P1:src/screens/AnalyticsScreen.js:308]`. No new table for the basic view. A per-week planned-target history table would be NEW and is gated on NA-cux-9.

**COMPONENT STRUCTURE [parent import P1:file:line]**
- New presentational section rendered inside `CardioHistoryScreen` (parent already imports `SectionList`, `EmptyState`, theme) `[P1:src/screens/CardioHistoryScreen.js:11-22]`. NEEDS ANSWER [NA-cux-10]: whether the trend renders inline in `CardioHistoryScreen` (founder said "turn the cardio history list into a trend") or as a separate component/screen | files-to-check: `pass3-v2-founder-decisions.md:71` ("history list → done vs planned"), founder UX preference. The founder wording suggests inline; confirm before adding a route.

**USER FLOW [sequence]**
1. User taps "History" from `CardioPlanCard` `[P1:src/components/CardioPlanCard.js:43-45]` → `CardioHistory` route `[P1:src/screens/AnalyticsScreen.js:310]`.
2. Screen loads a multi-week window via `getCardioLogRange` `[P1:src/lib/database.js:4098-4108]`, reduces it per week with the new engine fn over `summariseWeekCardio`/`cardioComplianceFromLog` `[P1:src/lib/cardio/cardioEngine.js:88-113]`.
3. The top section shows each recent week as "{done} of {planned} sessions" with a plain done/partly/missed marker (NOT the word "adherence") `[P3: pass3-v2-founder-decisions.md:72,:92]`.
4. The existing day-grouped list stays below `[P1:src/screens/CardioHistoryScreen.js:85-106]`.

**ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]**
PRO. `CardioHistoryScreen` is `withProGuard(CardioHistoryScreen, 'Cardio')` `[P1:src/navigation/RootNavigator.js:162,:257-259]` (gate fn `withProGuard` `[P1:src/components/ProGate.js:134-140]`). No change to gating.

**EMPTY STATE [British copy]**
No cardio yet: keep the existing `EmptyState` "No cardio yet" / "Sessions you log show up here." `[P1:src/screens/CardioHistoryScreen.js:79-83]`. Logged cardio but no target set (`goal === 0`): the trend section reads "{N} sessions this week. The coach sets a target only if a cut stalls." mirroring the existing no-target copy `[P1:src/components/CardioPlanCard.js:33-35]` (passes honesty test; no judgement; plain).

**LOADED STATE**
Per week, numbers-first: "3 of 3" / "1 of 3", with a plain marker. No "adherence", no percentage badge, no streak. Aligns with voice pattern 2 "numbers before narrative" `[P2: COACHING_VOICE_SYNTHESIS_LOCKED.md:135-138]` and the per-item voice guard `[P3: pass3-v2-founder-decisions.md:92]`.

**ERROR STATE**
Load failure: keep last-rendered data, matching the existing catch that "leaves last" `[P1:src/screens/CardioHistoryScreen.js:52]`. No error toast for a read-only view.

**EDGE CASES**
- No target ever set: show "done" counts only, never "0 of 0" framed as a miss (`cardioComplianceFromLog` already returns `'hit'` for a zero goal) `[P1:src/lib/cardio/cardioEngine.js:90]`.
- Weeks with imported sessions (Item 1): counted identically since `summariseWeekCardio` counts every non-deleted row `[P1:src/lib/cardio/cardioEngine.js:103-111]` — depends on Item-1 de-dup (NA-cux-4/NA-cux-7) so duplicates do not inflate the trend.
- Past-week planned target unknown: gated on NA-cux-9.
- "Mostly" verdict wording: the engine label is `'mostly'` `[P1:src/lib/cardio/cardioEngine.js:93]`; surface copy must be plain (e.g. "did some"), NEEDS ANSWER [NA-cux-11]: the exact British surface words for the three verdicts hit/mostly/missed (must avoid "adherence" and any shame trigger like "missed a day" `[P2: COACHING_VOICE_SYNTHESIS_LOCKED.md:569]`) | files-to-check: founder copy preference; `COACHING_VOICE_SYNTHESIS_LOCKED.md:561-577` failure catalogue.

**DUAL-AUDIENCE DESIGN**
Newbie: plain "did vs planned", no grade, no jargon. Athlete: a glanceable multi-week pattern of dose held vs the coach's prescription, numbers-led. Both render from the same deterministic engine output `[P1:src/lib/cardio/cardioEngine.js:88-113]`.

### VERIFICATION
Facts tagged: `[P1:src/screens/CardioHistoryScreen.js:*]`, `[P1:src/components/CardioPlanCard.js:*]`, `[P1:src/lib/cardio/cardioEngine.js:*]`, `[P1:src/lib/database.js:*]`, `[P1:src/screens/AnalyticsScreen.js:*]`, `[P1:src/navigation/RootNavigator.js:*]`, `[P1:src/components/ProGate.js:*]` — all from files opened with Read. Voice `[P2: COACHING_VOICE_SYNTHESIS_LOCKED.md:*]`. Gap/founder `[P3:*]`/`[P2:* founder log]`.
Open NA-ids: NA-cux-8, NA-cux-9, NA-cux-10, NA-cux-11. NOT FINAL until resolved.

---

## ITEM 3 — TIMELINE FOOD LOGGING (continuous timestamped logging)

**ID:** ULTIMATE-CUX-TFL
**CLUSTER:** UX
**TITLE:** Timeline-style food logging — continuous timestamped entries instead of Breakfast/Lunch/Dinner buckets (MacroFactor pattern)
**PRIORITY TIER:** NEEDS ANSWER [NA-cux-12] (no tier/impact/effort/score in founder log; matrix UX elevate "(4) consider timeline logging" + "(3) meal logging uses buckets not a continuous timeline") | files-to-check: `pass3-comparison-matrix.md` UX section :492-496.
**IMPACT / EFFORT / PRIORITY SCORE:** see NA-cux-12.

### CURRENT STATE
- The diary ships "six meal sections as contained cards" — the doc header lists "Breakfast, Lunch, Dinner, Pre/Post-workout, Snacks" `[P1:src/screens/DiaryScreen.js:8-10]`, rendered by mapping `mealSlots` to `MealSection` `[P1:src/screens/DiaryScreen.js:586-601]`.
- BUT the underlying model is ALREADY a flexible numbered ladder, not fixed wellness buckets: keys are `meal_1..N` plus `preworkout`/`postworkout`, with legacy `breakfast/lunch/dinner/snack` only kept for back-compat `[P1:src/lib/food/mealSlots.js:1-17,:59-68]`. Bucketing is by `meal_slot`, free-text TEXT `[P1:src/lib/database.js:835]`.
- Entries are NOT currently shown on a continuous timestamp. NEEDS ANSWER [NA-cux-13]: does `food_entries` store a per-entry timestamp (logged-at time of day), or only `entry_date` + `meal_slot`? A continuous timeline needs a time-of-day field. | files-to-check: `src/lib/food/db.js` (logFoodEntry shape), `src/lib/database.js` around `:835` (food_entries CREATE TABLE columns: is there a `logged_at`/`created_at` time?). This is load-bearing — do NOT guess.
- The diary already has rich entry operations that any new layout must preserve: per-meal add `[P1:src/screens/DiaryScreen.js:226-230]`, quick-add `[P1:src/screens/DiaryScreen.js:239-256]`, edit sheet `[P1:src/screens/DiaryScreen.js:381-411]`, swipe-delete `[P1:src/screens/DiaryScreen.js:433-454]`, multi-select move/copy/save-meal `[P1:src/screens/DiaryScreen.js:259-379]`, copy-yesterday `[P1:src/screens/DiaryScreen.js:459-496]`, macro rings + water `[P1:src/screens/DiaryScreen.js:540-547,:616]`.

### THE GAP [P3]
"meal logging uses buckets not a continuous timeline (`DiaryScreen` six meal sections — confirmed; Gemini — MF Timeline Logger)" `[P3: pass3-comparison-matrix.md:492-493]`.

### THE EVIDENCE [P2, provenance noted]
- "MacroFactor (data-to-decision; Timeline Logger ...)" cited as best-in-class for UX `[P2: pass3-comparison-matrix.md:482, provenance: Claude pass, named-competitor reference]`.
- Elevate "(4) consider timeline logging (Gemini)" `[P2: pass3-comparison-matrix.md:496, provenance: SINGLE-SOURCE Gemini]`; verification line states "timeline-logger = SINGLE-SOURCE (Gemini)" `[P2: pass3-comparison-matrix.md:498-499, provenance: explicitly graded single-source]`.
- Founder Call 2 acceptance: "UX — Timeline-style food logging (continuous timestamp; replaces rigid meal buckets)" `[P2: pass3-v2-founder-decisions.md:67, provenance: founder decision log]`.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner who eats at odd hours just logs food when they eat it and sees it land on a simple time-ordered list, instead of deciding "is this lunch or a snack?". Less to think about.

### ATHLETE EXPERIENCE AFTER CHANGE
A physique athlete running six structured feeds a day sees them in the actual order they ate, with times, rather than forcing them into named buckets. The numbered-meal model they already use maps onto a timeline without losing per-meal grouping for their macro splits.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1:file:line]**
- `src/screens/DiaryScreen.js` — the section-map render `[P1:src/screens/DiaryScreen.js:586-601]` and `entriesBySlot` grouping `[P1:src/screens/DiaryScreen.js:177-183]` change to a time-ordered presentation. All entry operations (edit/delete/multi-select/quick-add) must be preserved `[P1:src/screens/DiaryScreen.js:226-496]`.
- `src/lib/food/mealSlots.js` — `slotOrder` currently orders by named slot `[P1:src/lib/food/mealSlots.js:47-53]`; a timeline orders by time-of-day instead (pending NA-cux-13).
- `src/components/food/MealSection.js` — the per-meal card component. NEEDS ANSWER [NA-cux-14]: exact path/structure of `MealSection` and `EntryRow` so the timeline can reuse the existing row + swipe + select affordances rather than re-implement them | files-to-check: `src/components/food/MealSection.js`, `src/components/food/EntryRow.js` (imported at `DiaryScreen.js:37-38`).
- NEEDS ANSWER [NA-cux-15]: is timeline a REPLACEMENT of the bucket layout (founder said "replaces rigid meal buckets" `[P2: pass3-v2-founder-decisions.md:67]`) or a USER TOGGLE between timeline and meal view? The matrix wording is "consider"/"single-source" `[P2: pass3-comparison-matrix.md:496-499]` and the founder separately DISMISSED an "advanced/dense personalisation toggle" `[P2: pass3-v2-founder-decisions.md:79]`, so a view toggle may conflict with the no-personalisation stance. DECISION REQUIRED | files-to-check: founder UX preference; `pass3-v2-founder-decisions.md:67,:79`.

**DATA [mark NEW]**
- Reuses EXISTING `food_entries` rows (`meal_slot`, macros, `entry_date`) `[P1:src/lib/database.js:835]`.
- A per-entry time-of-day is REQUIRED for a true continuous timeline. If `food_entries` lacks a logged-time column, that is a NEW nullable column + migration (Supabase rules apply) — gated entirely on NA-cux-13. Do NOT assume a column exists.
- Back-compat is the load-bearing rule: existing `breakfast/lunch/dinner/snack` and `meal_N` entries must still appear and stay editable `[P1:src/lib/food/mealSlots.js:11-17,:36-41]`. The timeline must not orphan any existing entry.

**COMPONENT STRUCTURE [parent import P1:file:line]**
- Parent: `DiaryScreen` (imports `MealSection`, `EntryRow`, `MacroRings`, sheets) `[P1:src/screens/DiaryScreen.js:32-45]`. The timeline is a reordering/regrouping of entries within this screen, reusing the existing row/sheet components (see NA-cux-14), not a new screen.

**USER FLOW [sequence]**
1. User adds food (search / quick-add / barcode) as today `[P1:src/screens/DiaryScreen.js:226-256,:649-657]`; the entry records its time-of-day (NA-cux-13).
2. The diary renders entries in time order across the day, not bucketed by named meal `[P1:src/screens/DiaryScreen.js:586-601]` (changed).
3. Edit/delete/multi-select/copy-yesterday operate per entry exactly as today `[P1:src/screens/DiaryScreen.js:381-496]`.
4. Macro rings + water + weight-trend card remain above/below unchanged `[P1:src/screens/DiaryScreen.js:540-555,:616]`.

**ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]**
PRO. The whole Diary domain is Pro: `GatedDiary = withProGuard(DiaryScreen, 'Food diary')` `[P1:src/navigation/RootNavigator.js:160,:225]` (gate fn `withProGuard` `[P1:src/components/ProGate.js:134-140]`; free users get `ProLocked` with the show-then-sell teaser `[P1:src/components/ProGate.js:91-127]`). No gating change.

**EMPTY STATE [British copy]**
Keep the existing `EmptyDiary` component with its add / copy-yesterday / plan-day actions `[P1:src/screens/DiaryScreen.js:578-583]`. NEEDS ANSWER [NA-cux-16]: any timeline-specific empty-state copy (e.g. "Log food as you eat it. It lines up by time of day.") or keep `EmptyDiary` verbatim | files-to-check: `src/components/food/EmptyDiary.js`, founder copy preference.

**LOADED STATE**
Entries in time order with their time shown; per-meal macro grouping preserved for the numbered-meal athletes (depends on NA-cux-15 replacement-vs-toggle). Macro rings reflect the day total via `getRollupForDay` unchanged `[P1:src/screens/DiaryScreen.js:103-110]`.

**ERROR STATE**
Load/enrich failure already degrades gracefully to a generic name per entry `[P1:src/screens/DiaryScreen.js:116-127]`; preserve. Write failures keep the existing alert/toast paths `[P1:src/screens/DiaryScreen.js:137-140,:375-376]`.

**EDGE CASES**
- Existing legacy-slot entries must still render in the timeline — they have a slot but may have no time-of-day; ordering fallback gated on NA-cux-13 (e.g. order legacy/no-time entries by `created_at` or slot order).
- Carb-cycle / refeed day-type label + effective targets must still drive the rings `[P1:src/screens/DiaryScreen.js:136-164,:543-545]`.
- Multi-select "Move to {slot}" `[P1:src/screens/DiaryScreen.js:686-708]`: if buckets are removed, "move to slot" semantics change. NEEDS ANSWER [NA-cux-17]: in a timeline view, do "Move to meal" and the slot picker survive (entries still carry `meal_slot`) or are they replaced by a time edit? | files-to-check: founder preference; `DiaryScreen.js:336-343,:686-708` (move flow). No guessed default.

**DUAL-AUDIENCE DESIGN**
Newbie: no "which meal is this" decision, just log-as-you-eat. Athlete: real eating order with times; the existing numbered-meal grouping `[P1:src/lib/food/mealSlots.js:21-68]` can still group their structured feeds if NA-cux-15 lands as "preserve grouping within timeline". Both render from the same `food_entries` data with no engine change.

### VERIFICATION
Facts tagged: `[P1:src/screens/DiaryScreen.js:*]`, `[P1:src/lib/food/mealSlots.js:*]`, `[P1:src/lib/database.js:835]`, `[P1:src/navigation/RootNavigator.js:*]`, `[P1:src/components/ProGate.js:*]` — all from files opened with Read. Evidence `[P2:* provenance noted]`. Gap `[P3:*]`.
Open NA-ids: NA-cux-12, NA-cux-13, NA-cux-14, NA-cux-15, NA-cux-16, NA-cux-17. NOT FINAL until resolved.

---

## ITEM 4 — CORE-HAPTICS WAVEFORMS (custom iOS haptic patterns)

**ID:** ULTIMATE-CUX-CHW
**CLUSTER:** UX
**TITLE:** iOS Core-Haptics custom waveforms on PR and rest-timer-zero, with graceful fallback to existing haptics
**PRIORITY TIER:** NEEDS ANSWER [NA-cux-18] (no tier/impact/effort/score in founder log; matrix calls it "polish, not absence") | files-to-check: `pass3-comparison-matrix.md` UX section :489-499.
**IMPACT / EFFORT / PRIORITY SCORE:** see NA-cux-18.

### CURRENT STATE
- Basic haptics already fire across surfaces via `expo-haptics` (the only haptics dependency in the project: `"expo-haptics": "~15.0.8"` `[P1:package.json:63]`). No Core-Haptics / `CHHapticEngine` native library is installed `[P1:package.json:63]` (grep for haptic in package.json returns only expo-haptics).
- Rest timer: a 3-2-1-0 escalation already plays `impactAsync(Medium/Heavy)`, `notificationAsync(Warning)` at 1s, and at 0s `notificationAsync(Success)` plus two timed `Heavy` impact pulses at 200ms/400ms `[P1:src/components/RestTimer.js:92-112]`.
- PR celebration: full burst plays `notificationAsync(Success)` then two `Heavy` impacts at 150ms/300ms; subdued mode plays `selectionAsync()` `[P1:src/components/PRCelebration.js:47-56]`.
- Set entry: `selectionAsync()` on each stepper adjust `[P1:src/components/SetEntry.js:14-16]` (the file's `adjust` calls `Haptics.selectionAsync().catch(...)`); RestTimer adjust also uses `selectionAsync` `[P1:src/components/RestTimer.js:132]`.
- Every haptic call already `.catch(() => {})`s, so a device without haptics no-ops silently — the existing graceful-fallback pattern `[P1:src/components/RestTimer.js:96-108]` `[P1:src/components/PRCelebration.js:48-56]` `[P1:src/components/SetEntry.js:14]`.

### THE GAP [P3]
"we already fire selection + success/impact haptics across 7 surfaces (`SetEntry`/`PRCelebration`/`RestTimer`/`DiaryScreen`…); the only gap is iOS Core Haptics custom waveforms (Gemini) — polish, not absence" `[P3: pass3-comparison-matrix.md:489-492]`. Specific surfaces named: "Core Haptics (rest-zero pulse, PR ascending — Gemini)" `[P3: pass3-comparison-matrix.md:495]`.

### THE EVIDENCE [P2, provenance noted]
- "iOS Core Haptics custom waveforms (Gemini)" — SINGLE-SOURCE Gemini, graded polish: "Core-Haptics-waveforms + timeline-logger = SINGLE-SOURCE (Gemini)" `[P2: pass3-comparison-matrix.md:498-499, provenance: explicitly single-source]`; "basic haptics ALREADY PRESENT [our-side, ruled out]" `[P2: pass3-comparison-matrix.md:497-498, provenance: our-side verification]`.
- Founder Call 2 acceptance: "UX — iOS Core-Haptics custom waveforms (we already fire basic haptics; this is the polish layer)" `[P2: pass3-v2-founder-decisions.md:68, provenance: founder decision log]`.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner feels a distinct, richer buzz when they hit a personal record and a clean ascending pulse when rest hits zero, so they can tell those two moments apart by feel without looking. On any device that does not support it, nothing breaks — they get the current haptic.

### ATHLETE EXPERIENCE AFTER CHANGE
A lifter mid-set, eyes down, feels the rest-zero waveform and knows to start the next set without checking the screen; a PR fires a recognisable celebratory pattern. It is sensory polish over the deterministic events that already fire.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1:file:line]**
- A NEW haptics helper module (e.g. `src/lib/haptics.js`) that wraps Core-Haptics WHEN AVAILABLE and falls back to the existing `expo-haptics` calls otherwise — mirroring the lazy-require + graceful-fallback pattern `health.js` uses for optional native modules `[P1:src/lib/health.js:89-115]` and `restSound` uses ("no-op if expo-av isn't installed yet (graceful fallback to haptics only)") `[P1:src/components/RestTimer.js:78-84]`.
- `src/components/RestTimer.js` — replace the 0s pulse block `[P1:src/components/RestTimer.js:104-112]` with a call to the helper (custom "rest-zero" waveform, fallback = current Success + two Heavy pulses).
- `src/components/PRCelebration.js` — replace the burst block `[P1:src/components/PRCelebration.js:54-56]` with a "PR ascending" waveform, fallback = current Success + two Heavy pulses; subdued keeps `selectionAsync` `[P1:src/components/PRCelebration.js:48]`.

**DATA [mark NEW]**
- None. No DB, no schema. Pure sensory layer.

**DEPENDENCY — DECISION REQUIRED (CLAUDE.md "Never add dependencies without asking")**
- `expo-haptics` does not expose custom Core-Haptics waveform composition (it provides impact/notification/selection presets only) `[INFERENCE from the API surface used at src/components/RestTimer.js:96-108 — only impactAsync/notificationAsync/selectionAsync are called]`. A true custom waveform needs either a native Core-Haptics module or a config plugin. NEEDS ANSWER [NA-cux-19]: which library/approach delivers Core-Haptics waveforms under the Expo managed workflow (e.g. a community `expo`/RN Core-Haptics package via a config plugin — the project already uses config plugins `[P1:app.json plugins: ./plugins/withHealthConnectPermissionDelegate, ./plugins/withEdgeToEdgeOptOut]`) — name the package, purpose, and licence for founder approval per CLAUDE.md | files-to-check: `package.json`, `app.json` plugins array, `plugins/` directory. NO dependency may be added until the founder says yes. Do NOT install or assume one.
- CONSTRAINT: Expo managed workflow — "Never eject. Native modules via Expo config plugins only" (CLAUDE.md ARCHITECTURE). Any Core-Haptics approach MUST be a config-plugin/managed-compatible package.

**COMPONENT STRUCTURE [parent import P1:file:line]**
- `RestTimer` and `PRCelebration` import the new helper instead of calling `expo-haptics` directly. Both currently `import * as Haptics from 'expo-haptics'` `[P1:src/components/RestTimer.js:3]` `[P1:src/components/PRCelebration.js:10]`.

**USER FLOW [sequence]**
1. Rest timer reaches 0 `[P1:src/components/RestTimer.js:104]` → helper plays the rest-zero waveform on a capable iOS device, else the existing Success + Heavy pulses `[P1:src/components/RestTimer.js:105-108]`.
2. A PR fires `[P1:src/components/PRCelebration.js:45-56]` → helper plays the PR-ascending waveform, else the existing Success + Heavy pulses.
3. On Android and on iOS devices/OS versions without Core Haptics: helper transparently uses `expo-haptics`; no behaviour change, no error (existing `.catch(()=>{})` discipline) `[P1:src/components/RestTimer.js:96]`.

**ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]**
Mixed by host surface, no separate gate. The rest timer fires during workout logging, a FREE feature ("workout logging" is Free per CLAUDE.md FREE list); PR celebration is in the Free training flow too. [INFERENCE — these are sensory layers on existing always-firing events; they inherit the host surface's gating and add none.] NEEDS ANSWER [NA-cux-20]: confirm there is no requirement to gate richer haptics behind Pro (none implied by the founder log) | files-to-check: `pass3-v2-founder-decisions.md:68`, CLAUDE.md FREE/PRO list. Stated as inference, not asserted.

**EMPTY STATE [British copy]**
N/A — haptics are event-driven, no surface of their own, no copy. (No string is added.)

**LOADED STATE**
N/A (sensory). The visual PR card `[P1:src/components/PRCelebration.js:124-185]` and timer card `[P1:src/components/RestTimer.js:177-227]` are unchanged.

**ERROR STATE**
Any Core-Haptics failure (engine unavailable, OS too old, capability absent) falls back to `expo-haptics`, and that in turn `.catch`es to a silent no-op — the exact existing discipline `[P1:src/components/RestTimer.js:96-108]` `[P1:src/components/PRCelebration.js:48-56]`. No user-visible error.

**EDGE CASES**
- Device with no haptic engine (older/cheaper Android, iPad): no-op, no crash — guaranteed by the catch pattern `[P1:src/components/SetEntry.js:14]`.
- Silent/Low-Power mode where iOS suppresses haptics: handled by the OS; helper still no-ops gracefully [INFERENCE].
- Rapid PR streak (component remounts per PR) `[P1:src/components/PRCelebration.js:91-94]`: the waveform must be fire-and-forget so it cannot leak an engine handle, matching the existing timeout-cleanup discipline `[P1:src/components/PRCelebration.js:86-90]`.
- Backgrounding mid-rest: JS timers suspend `[P1:src/components/RestTimer.js:66-76]`; a waveform must not be queued for a backgrounded app.

**DUAL-AUDIENCE DESIGN**
Identical for both audiences — a richer feel for the two moments (PR, rest-zero) with zero new vocabulary and full graceful fallback. It changes nothing in the deterministic engine; it is strictly a rendering of events the app already fires.

### VERIFICATION
Facts tagged: `[P1:src/components/RestTimer.js:*]`, `[P1:src/components/PRCelebration.js:*]`, `[P1:src/components/SetEntry.js:*]`, `[P1:src/lib/health.js:*]`, `[P1:package.json:63]`, `[P1:app.json plugins]` — all from files opened with Read (app.json plugins confirmed via the config-plugin list). Evidence `[P2:* provenance noted]`. Gap `[P3:*]`. Inferences explicitly tagged `[INFERENCE]`.
Open NA-ids: NA-cux-18, NA-cux-19 (dependency — founder approval required), NA-cux-20. NOT FINAL until resolved.

---

## VOICE COMPLIANCE NOTE (applies to all four items)

All new user-facing strings drafted above lead with numbers/facts, contain no em/en dashes, use British English, avoid "adherence" on cardio surfaces `[P3: pass3-v2-founder-decisions.md:92]`, and pass the honesty test "true if the user did nothing but kept logging?" `[P2: COACHING_VOICE_SYNTHESIS_LOCKED.md:39-46]`. No motivational filler, no moral food labels, no streak/shame language `[P2: COACHING_VOICE_SYNTHESIS_LOCKED.md:561-577]`. Final copy for every surface is still subject to `checkJargon` + the Section-6 copy-lint per the standing constraint `[P3: pass3-v2-founder-decisions.md:81-94]`. Cardio est-kcal stays feedback-only and is NEVER added to the calorie target `[P1:src/screens/LogCardioScreen.js:225-227]`.

## OPEN NEEDS-ANSWER REGISTER (consolidated — none may remain for a FINAL blueprint per `_AUDIT-SPEC.md:270-271`)

- NA-cux-1: priority tier/impact/effort/score for passive cardio import.
- NA-cux-2: exact Settings file:line of the current Health weight-import row.
- NA-cux-3: where `importNewWeights` is invoked (trigger to attach cardio import to).
- NA-cux-4: cardio import de-dup strategy (new `ext_id` column vs deterministic id from platform sample id).
- NA-cux-5: gating of the Settings cardio-connect row for free users.
- NA-cux-6: whether imported history rows show a source tag, and exact copy.
- NA-cux-7: collision rule when a session is both manually logged and imported.
- NA-cux-8: priority tier/impact/effort/score for cardio trend view.
- NA-cux-9: whether past weekly cardio targets are stored (per-week "planned") or trend compares to today's target.
- NA-cux-10: trend renders inline in CardioHistoryScreen vs separate component/screen.
- NA-cux-11: exact British surface words for hit/mostly/missed (no "adherence", no shame).
- NA-cux-12: priority tier/impact/effort/score for timeline logging.
- NA-cux-13: does `food_entries` store a per-entry time-of-day (load-bearing for a timeline).
- NA-cux-14: exact structure of `MealSection`/`EntryRow` to reuse row + swipe + select affordances.
- NA-cux-15: timeline as replacement vs user toggle (toggle may conflict with the dismissed dense/personalisation toggle).
- NA-cux-16: timeline-specific empty-state copy vs keep `EmptyDiary` verbatim.
- NA-cux-17: fate of "Move to meal" + slot picker in a timeline view.
- NA-cux-18: priority tier/impact/effort/score for Core-Haptics waveforms.
- NA-cux-19: which managed-Expo-compatible Core-Haptics package/approach (DEPENDENCY — founder approval required: name, purpose, licence).
- NA-cux-20: confirm richer haptics need no Pro gate.

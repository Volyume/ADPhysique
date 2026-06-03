# Cardio QA — 00: Implementation map

Status: COMPLETE. Timestamp: 2026-06-03. Method: read the committed cardio
code + ran tests + traced paths. No code changed in this phase. Every path
cites a file:line verified this session.

The cardio feature was built this session (commits `8cfe4cb` → `3933431`,
recorded in `docs/CURRENT_STATUS.md` § 0). This map is the as-built state.

---

## 1. Files and what each does

**Pure logic (`src/lib/cardio/`)**
- `cardioActivities.js` — the library as a frozen code constant (36 activities),
  `canonicalCardioId(name)` deterministic ids, `CARDIO_ACTIVITIES`,
  `getCardioActivity(id)`, `getCardioActivityByName`, `cardioActivitiesByCategory`,
  `OTHER_CARDIO_ID`. Categories: walking, running, cycling, rowing, swimming,
  machine, hiit, conditioning, sport, other.
- `cardioMath.js` — `metFor`, `estimateCardioKcal` (`MET×kg×h`, feedback only),
  `estimateActivityKcal`, `deriveCardioMetadata` (lowImpact/legOverlap/homeOk),
  `cardioFatigueContribution`, `cardioRecoveryLoad` (decayed sum, 3-day
  half-life), `cardioLoadLevel`.
- `cardioEngine.js` — `cutCardioTarget`, `healthCardioTarget`,
  `pausedCardioTarget`, `cardioComplianceFromLog`, `summariseWeekCardio`,
  `nextCardioTarget`, `cardioRecoveryFlag`, `MAX_CARDIO_SESSIONS`.
- Tests: `__tests__/cardioLibrary.test.js` (34), `__tests__/cardioEngine.test.js`
  (29). 63 pure tests, all passing.

**Persistence (`src/lib/database.js`)**
- `cardio_log` table (migration array near line 1120): `PK(user_id,id)`,
  `entry_date`, activity snapshot fields, `duration_min`, `intensity`, `met`,
  `est_kcal`, `recovery_impact`, `impact_type`, `distance`, `avg_hr`, `source`,
  `notes`, `created_at`, `updated_at`, `deleted_at` + two indexes.
- CRUD: `insertCardioLog`, `updateCardioLog`, `deleteCardioLog` (soft),
  `getCardioLogById`, `getCardioLogForDate`, `getCardioLogRange`,
  `getRecentCardioLog`, `getCardioLogForPush`, `getCardioLogUpdatedAt`,
  `insertCardioLogFromCloud`.

**Cloud sync**
- `src/lib/sync/tables/cardioLog.js` — `pushCardioLog` + `pullCardioLog`
  (soft-delete aware, LWW). Registry entry in `registry.js`, dispatch +
  `MIGRATED_TABLES` in `transport.js`. `supabase/migrate_064_cardio_log.sql`
  (pending founder apply). Test: `sync.cardioLog.test.js`.

**Screens / components**
- `src/screens/LogCardioScreen.js` — pick activity → duration → intensity →
  save, MET feedback + footnote. Route `LogCardio` (modal).
- `src/screens/CardioHistoryScreen.js` — sessions by day, soft delete. Route
  `CardioHistory`.
- `src/components/CardioCard.js` — Train tab line + log entry point.
- `src/screens/ProOnboardingScreen.js` — cardio toggle (default on), writes
  `cardioEnabled` (state `cardioOn`, line ~233; save ~503).
- `src/screens/SettingsScreen.js` — cardio toggle (line ~996).
- `src/screens/DiaryScreen.js` — `CardioRow` (line ~538 + component def).
- `src/screens/PlansScreen.js` — `CardioPlanCard` (def above `PlansScreen`,
  render ~794).
- `src/components/ReadinessCards.js` — cardio recovery-load note (line ~196).

**Coach / check-in**
- `src/lib/weeklyCoach.js:750` — cut cardio lever now emits `cutCardioTarget(...)`.
- `src/screens/CoachOutputScreen.js:~821` — `handleApplyCardio` persists
  `cardioPrescription` + `cardioTarget`.
- `src/screens/WeeklyCheckInScreen.js` — cardio adherence question (~684) +
  log-based prefill (~228).

---

## 2. The intended loop and where each step lives

1. **Onboarding** → `cardioEnabled` (ProOnboarding, default on).
2. **Log** → `LogCardioScreen` → `insertCardioLog` → `cardio_log`.
3. **Surfaces** → Train `CardioCard`, Diary `CardioRow`, Plans `CardioPlanCard`,
   `CardioHistoryScreen`.
4. **Coach target** → `weeklyCoach` `cutCardioTarget` → `cardioAdjustment` →
   `CoachOutput` apply → `userProfile.cardioTarget` + `cardioPrescription`.
5. **Check-in** → adherence question, prefilled from `cardio_log` vs target.
6. **Recovery** → `cardioRecoveryLoad` → ReadinessCards note.
7. **Sync** → `cardio_log` bidirectional (pending migration 064).

---

## 3. Verified-clean items (checked, not assumed)

- **Date keys consistent.** Diary `isoDate` → `localDayKey`; `activityDayKey`
  → `localDayKey`. Train card (today), Diary row (selected day) and the log all
  use the same `YYYY-MM-DD` local key, so a session shows on every surface for
  the right day. No mismatch.
- **Recovery unchanged with no cardio.** `cardioRecoveryLoad([])` = 0 →
  `cardioLoadLevel` 'low' → no note; `computeRecoveryEMAs` untouched. Identical
  to pre-cardio behaviour.
- **Save is double-tap guarded** (`onSave`: `if (!activity||!userId||saving) return`).
- **Opt-out hides cardio** on Train, Plans, Settings (all `tier==='pro' &&
  cardioEnabled !== false`).

## 4. Suspect areas carried into Phase 1/2 (verified findings, detailed there)

- **Diary `CardioRow` is not tier-gated** (line 538: `cardioEnabled && userId`,
  no `tier === 'pro'`), unlike Train/Plans/Settings → free users see it.
- **`nextCardioTarget` (K2) and `cardioRecoveryFlag` (R2) are tested but never
  called** in production (`grep` shows definitions only).
- **Bare `useAppStore()`** (no selector) in `LogCardioScreen:41` and
  `CardioHistoryScreen:34`, against the `useShallow` convention used elsewhere.
- **`CardioHistoryScreen` is not in the screen-mount sweep** (no render coverage).

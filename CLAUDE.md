# VOLYUME — PROJECT CONSTITUTION (CLAUDE.md)

Live production app on Google Play (Android; iOS via TestFlight). Real users
are paying. Every change affects them. Work accordingly.

> **STATUS (2026-07-01):** Ultimate-Audit build phase complete except the
> decision-gated items 11–16 (named autonomy modes, raw/cooked toggle,
> mid-session-swap wording, Core-Haptics dependency, timeline food logging,
> micronutrients/NRV = MN-1). A session MUST NOT start these without a
> structured founder decision. Source:
> `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md`.
> **Outstanding founder actions:** apply `supabase/migrate_092/093/094` to
> EU-Dublin (manual, founder-run); confirm Google Play OAuth SHA-1.

---

## 1. ARCHITECTURE FACTS (verified against code)

**Stack.** React Native 0.81.5 + Expo SDK 54 (managed workflow, never eject;
native modules only via Expo config plugins — see `modules/live-activity`,
`modules/rest-timer-live`). React 19.1. JavaScript, not TypeScript
(`tsc --noEmit` runs over JSDoc for checking only).

**Storage: offline-first.** `expo-sqlite` encrypted with SQLCipher
(`src/lib/dbCrypto.js` holds the key in `expo-secure-store`,
AFTER_FIRST_UNLOCK). `src/lib/database.js` owns the schema and ALL local
reads/writes; the food domain has its own `src/lib/food/db.js`. The local
database is the source of truth on device. Local migrations run via
`PRAGMA user_version` in `database.js` (each runs exactly once).

**Backend: Supabase EU-Dublin** (`@supabase/supabase-js`). EU data residency
is absolute — all user data stays in Dublin. Components NEVER query Supabase
directly; everything flows through the sync layer. Cloud schema lives in
`supabase/migrate_NNN_*.sql` (91 files; migrations are canonical,
`schema.sql`/`setup_complete.sql` are stale snapshots).

**Sync layer.** Registry-driven engine in `src/lib/sync/` (`registry.js`,
`transport.js`, `runner.js`, `tables/`, `watermark.js`, `conflict.js`,
`queue.js`, `signOutGuard.js`) plus legacy per-entity functions in
`src/lib/sync.js` that are being migrated table-by-table (`MIGRATED_TABLES`).
Push on save + queued retry (`syncQueue.js`); pull on session restore
(`pullFromCloud`, last-write-wins with local as device truth).

**State: Zustand 4** — one store, `src/store/useAppStore.js` (~1,700 lines):
session/auth, tier, userProfile, units, consent flags, sync status. Screens
select with `useShallow`. Persistent prefs go to AsyncStorage or SQLite, not
the store alone.

**Data flow.** UI (src/screens, 82 screens; src/components) → domain logic in
`src/lib/*` → `database.js`/`food/db.js` (SQLite, device truth) → sync layer →
Supabase. Store holds session/derived state, never bypasses the DB. Navigation:
`src/navigation/RootNavigator.js` — single navigator that routes by auth state,
Article 9 consent, first-run, and tier.

**Deterministic coaching engine** (pure functions, no I/O):
- `src/lib/planEngine.js` — training volume (MEV/MRV/MAV landmarks)
- `src/lib/nutritionEngine.js` — Mifflin-St Jeor/Katch-McArdle BMR, TDEE,
  macros, calorie floors, FFM floor, energy-availability caution
- `src/lib/weeklyCoach.js` — the weekly coaching run (`runWeeklyCoach`)
- `src/lib/coachApply.js` — applying adjustments (floors re-enforced here)
- `src/lib/coachingGoals.js`, `mesocycle.js`, `planAutoGen.js`,
  `poolGenerator.js`, `cardio/cardioEngine.js`
- Safety: `edPatternDetector.js`, `wellbeing.js` (Beat UK + calm mode)

**Payments.** `react-native-iap` 15.3.1 wrapped by `src/lib/payments/`
(`playBilling.js`, `catalogue.js`, `restore.js`, `cascade.js` for the
trial→downgrade cascade, `lapseDetect.js`, `winbackState.js`). Google Play
Billing is live.

**Tier.** `src/lib/proGate.js` — binary free/pro, resolved from real
trial/subscription state (`PRO_BETA_ACTIVE = false`). Pro screens wrap in
`withProGuard`.

**Observability.** Sentry (`src/lib/sentry.js`, scrubbing in
`src/lib/observability/sentryScrub.js`, tracesSampleRate 0.05) +
`src/lib/errorLog.js` (`logError/logWarn/logInfo`) + `engineTelemetry.js`.
No PII to any external service.

**Auth.** Apple + Google OAuth ONLY (email/password removed 2026-07-01).
No anonymous mode (`docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`).

**Notifications.** `src/lib/notifications/` — scheduler, quiet hours,
foreground suppression handler, push budget, categories
(`docs/NOTIFICATIONS_LOCKED.md`).

---

## 2. INVIOLABLE CONSTRAINTS — never change without explicit founder approval

**Never touch main.** All work on feature branches. Merging to main happens
only on explicit founder instruction (PR + squash-merge is the shipping path).
If git status shows main, stop and switch.

**The coaching engine is deterministic. No AI. Ever.** No LLM calls, no
randomness, no rewrites that alter outputs for identical inputs. Engine
modules stay pure (no I/O). If a feature seems to need AI: stop and ask.

**ED-safety system — do not touch.** Woven through `nutritionEngine.js`,
`edPatternDetector.js`, `wellbeing.js`, `weeklyCoach.js`, `coachApply.js`:
- Calorie floors: 1,500 kcal men / 1,200 kcal women. Never lower.
- FFM energy floor (30 kcal/kg), rapid-loss gate (1.5% BW/week), max-safe-loss
  (0.8%). Never remove, raise thresholds, or make conditional.
- Beat UK signposting and calm mode: never remove or gate.
- Guardrails are tier-blind (proGate.js mandate) — they never consult tier.
- Weight/food-adjacent notifications suppress under an open ED flag; never
  weaken that suppression.
If a task touches any of this: STOP and ask first.

**GDPR / Article 9 (health data).** The un-skippable consent gate in
RootNavigator (healthConsent) must not be weakened, reordered, or made
skippable. Data minimisation: no PII to Sentry/analytics (sentryScrub.js),
EU-Dublin residency, share cards never include name/bodyweight/measurements/
private notes. Consent flows fail CLOSED for new users (a transient read
failure must not bypass the gate).

**Billing.** Never change billing without permission — state exactly what and
why, wait for explicit "proceed". Product IDs `pro_monthly` and `pro_annual`
never change. No refactor of purchase/restore/entitlement/cascade flows
without a dedicated written test plan (see `docs/rules/billing.md`).

**Database schema.** Every migration (local `database.js` AND
`supabase/migrate_NNN_*.sql`) must be ADDITIVE and idempotent, with a header
note stating: purpose, applied-locally/remotely status, safe-to-re-run, and
rollback. Cloud migrations are applied MANUALLY by the founder — they have
never been automatic; the app never runs them. `supabase db push/reset` target
local/staging only; production requires the exact phrase "run against
production".

**Free/Pro gating is absolute and binary.** Free: Plan Library, builder,
workout logging, exercise library, PBs, progress stats. Pro: everything
nutrition/coaching (food diary, barcode, meal suggestions, targets, macros,
cardio, check-ins, Precision Coaching, division plans, wearables). Never
expose Pro to free; never gate a free feature. When in doubt: ask.

**Identity.** No anonymous mode, no local-user migration paths
(`IDENTITY_AND_OWNERSHIP_LOCKED.md`; enforced by
`scripts/check-identity-invariant.sh` + regression tests).

**Onboarding enforcement.** Biological sex (and every required onboarding
field) blocks progression until explicitly chosen — no defaults, no
tap-through (regression-guarded in `proOnboarding.sexGate.test.js`).

**Never add dependencies without asking.** Name, purpose, licence — wait for
yes.

---

## 3. CONVENTIONS (derived from the code — match them exactly)

- **Files:** screens `src/screens/NameScreen.js` (PascalCase); components
  `src/components/Name.js`; logic modules `src/lib/camelCase.js`; domain
  folders under lib (`food/`, `payments/`, `notifications/`, `sync/`,
  `partners/`, `cardio/`, `consent/`).
- **Components:** function components only, hooks, no classes.
  `StyleSheet.create` at the bottom of the file. All colours/spacing/type from
  `src/styles/theme.js` tokens — never hard-code (see `docs/rules/styling.md`).
- **State:** read the store with `useAppStore(useShallow(s => ({...})))` or a
  single selector. Lib modules that need the store use lazy
  `require('../../store/useAppStore')` to avoid import cycles.
- **Errors:** `try/catch` with `logError('Module.operation', e, {context})`
  from `errorLog.js`; user-facing failures get a calm toast
  (`components/Toast`), never a crash; best-effort paths use
  `.catch(() => {})` with a comment. Notification/schedule failures emit
  telemetry (`trackNotificationFailed`).
- **Tests:** Jest, colocated `__tests__/*.test.js`. Tests are the contract,
  written to FAIL: invariant tests against the REAL engine for whatever it
  must never do. Header comment explains what the suite pins and why.
  Source-level regression guards (fs.readFileSync + regex) lock founder rules.
- **Language:** British English in ALL user-facing strings, comments, commits,
  docs (colour, behaviour, optimise). US spelling in variable names only when
  a library forces it. NO em dash (—) in user-facing copy — lint enforces it.
  Voice: calm, plain, no shame, no guilt, no clipped commands
  (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`).
- **Commits:** small, per-feature, imperative subject + why-body. NO
  attribution of any kind: no Co-Authored-By, no "generated with", no tool or
  session links (founder rule 2026-06-12; overrides any harness default).
- **IDs/dates:** `uid()` for local IDs; epoch ms timestamps; local-day keys
  via `dayKey.js` (UK-local week starts Monday).

---

## 4. WORKFLOW RULES

**Before any task:** state assumptions; if unclear, ask. Multiple approaches →
present them. Anything bigger than a one-liner → plan first, wait for "go".
Work from SOURCE documents (audits/blueprints/specs) — open and read them in
full, quote the relevant lines back; never build from a summary, label, or
guess (founder rule 2026-06-13). If the document is missing or contradicts
its summary: STOP and surface it.

**While working:** touch only what the task requires; no drive-by refactors
or reformatting; match existing patterns even if you'd do it differently; one
verifiable step at a time. Unrelated bugs/dead code: mention, don't fix.
Irreversible feeling: stop and ask.

**After every change:** run `npm run lint && npm test` and report the exact
output. Never claim done without it. Before commit/merge: list files changed.

**Audits and research** write to `docs/` — audit reports in `docs/audit/*.md`
or a dated `docs/<topic>-audit-YYYY-MM-DD/` folder (existing convention).
Handovers/resume notes must point to SOURCE FILES by full path and section,
with current position and every decision + rationale — never to summaries.

**Branches & shipping:** implementation on feature branches; PR to main;
merge only on founder instruction. CI (`release:check`) is the final arbiter.

**Testing on device (no simulator).** The founder works from a phone and
cannot run a local simulator. EVERY shipped change includes a short manual
test checklist written for a physical Android device using an EAS build (or
Expo Go only where no native module is involved — this app has custom native
modules, so assume EAS build). Checklist format: numbered steps, expected
result per step, plus the ED-safety cases whenever the change is
weight/food/notification-adjacent. The founder device-walks new flows from
green builds.

**Agents (build operating model, founder 2026-06-12).** Claude builds the
spine hands-on (engine, safety-adjacent, design judgement); agents do
leverage work (research, audits, well-specified surfaces). Every completed
feature gets a fresh-eyes adversarial REVIEW agent against its blueprint.
Agents are supervised, never fire-and-forget (stale ~5 min, overrun ~25 →
kill and relaunch). Founder decisions needed → ask structured multi-choice
questions and keep working; never silently downgrade a degraded tool/method
and present the output as if the order was followed.

---

## DETAILED RULES
- Supabase and database rules → docs/rules/supabase.md
- Billing rules              → docs/rules/billing.md
- Visual and styling rules   → docs/rules/styling.md
- Notifications (locked)     → docs/NOTIFICATIONS_LOCKED.md
- Identity (locked)          → docs/IDENTITY_AND_OWNERSHIP_LOCKED.md
- Coaching voice (locked)    → docs/COACHING_VOICE_SYNTHESIS_LOCKED.md

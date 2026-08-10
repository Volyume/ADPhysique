# AUDIT-DOCS-COHERENCE — Campaign 4 lane: doc truth, subscription truth, cross-feature coherence

**Lane:** docs-subscription-coherence. **Order sections:** PHASE 15 (comment/doc
truth), PHASE 19 (subscription/marketing product truth), PHASE 22 (whole-product
cross-feature coherence).
**Authority:** the founder's Campaign 4 order (session scratchpad
`c4-CAMPAIGN4-ORDER.txt`), read in full. Classification law: the order's CORE
CLEANUP LAW A–I. Zero callers alone never proves dead.
**Tree audited:** branch `claude/campaign4-coherence`, HEAD `0f4d868e`
(= main `92b9644e` + the coordination-docs commit). Read-only: this lane wrote
no file except this one, executed no deletion, ran no migration.
**Evidence standard:** file:line for every claim. Verdicts are A–I classes with
the proof that earns them. Anything not provable is class I with the reason.

**Authority chain used throughout** (order PHASE 15):
1. current CLAUDE rules (`CLAUDE.md`)
2. current decision register (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`)
3. current taskboard never/held list (`docs/TASKBOARD.md`)
4. current locked contracts (`docs/*_LOCKED.md`, `supabase/README.md`)
5. historical/superseded audits

---

## 0. COUNTS

| Class | Count | Meaning |
|---|---|---|
| A — LIVE, KEEP | 9 | verified-correct doc/copy claims; no action |
| D — INTENTIONAL SEAM, KEEP | 1 | dark-by-design content flag |
| E — LEGACY LOAD-BEARING, KEEP + DOCUMENT | 2 | retirement prerequisites, stale text only |
| F — CONFIRMED DEAD/FALSE, CORRECT | 26 | provably false doc or source-header claim |
| G — PRODUCT-BOUNDARY REMNANT, REMOVE | 6 | live copy promising an out-of-scope feature |
| H — DATA-DESTRUCTIVE, STOP | 1 | migration 049 |
| I — UNCERTAIN, DO NOT ACT | 4 | evidence insufficient or another lane owns it |

Nothing in this lane is a code deletion. F items are text corrections; G items
are user-facing copy whose removal is executed by the cardio lane or the lead.

---

## 1. PHASE 15 — DOC TRUTH

### 1.1 D37's banner claim — VERIFIED, PARTIALLY FALSE

`docs/TASKBOARD.md:21-23` states, verbatim: *"All dated audit folders and loose
audit/status docs now carry a SUPERSEDED/CLOSED banner pointing here."*

The convention is one banner on the folder's first-opened file, made explicit at
`docs/exercise-planning-2026-07-09/plan-A-library-expansion.md:3`: *"per the
one-banner-per-folder sweep rule the marker sits here on the first-opened file."*

**Verified TRUE for 12 dated folders** (banner present on the entry file):
`appstore-readiness-2026-06-06`, `audit-says-vs-does-2026-06-21`,
`competitive-mastery-2026-06-29`, `design-usability-audit-2026-07-09`,
`exercise-planning-2026-07-09`, `hevy-teardown-2026-06-29`,
`partners-build-2026-07-03`, `playstore-readiness-2026-06-06`,
`ultimate-audit-2026-06-13`, `volyume-elite-audit`,
`volyume-launch-audit-2026-07-08`, `world-class-audit-2026-07-03`.

**Verified FALSE — folders with zero status marker on any file:**

| Folder | Files | Class | Evidence / risk |
|---|---|---|---|
| `docs/web-platform/` | 8 | **G** | Eight build-ready proposals incl. `web-platform-06a-user-web-proposal.md` (screen-by-screen user web app) and `06b-admin-proposal.md` (admin console). `docs/GAP_ANALYSIS.md` records "Web app for end users (never at v1)". Highest resurrection risk of any unbannered folder: a future engineer finds a complete spec with no gate on it. |
| `docs/marketing-2026-07-11/` | 3 | **I** | `C3-duplicate-paywall-decision-brief.md`, `C5-day14-recap-decision-memo.md` are founder decision briefs with no recorded resolution in the file. Whether each was ruled is not determinable from the folder; do not banner until the register is checked per brief. |
| `docs/remediation-2026-07-11/` | 4 | **F** | `DEFECT-MAP.md` is "R2-R8 current-state recon" dated 2026-07-11, pre-Campaigns 1–3. No banner. |
| `docs/logger-rebuild-2026-07-12/` | 1 | **A** | `BEHAVIOURAL-CONTRACT.md` is CURRENT — cited by live source at `src/screens/ActiveWorkoutScreen.js:32`, `:2716`, `src/components/workout/WorkoutHeader.js:11`, `WorkoutBottomBar.js:12,16`. Correctly unbannered; proposal is a CURRENT-AUTHORITY marker, not a SUPERSEDED one. |
| `docs/comprehension-audit-2026-08-10/` | 4 | **F** | Campaign 2 record. Closed under D93 (`DECISIONS-2026-07-09.md:2467-2546`). No status marker on any file. |
| `docs/discoverability-audit-2026-08-10/` | 7 | **F** | Campaign 3 record. Closed under D94-5 (`DECISIONS-2026-07-09.md:2598-2600`, *"Campaign closed; five founder rulings (FR-1..FR-5) remain open by design"*). No status marker. |
| `docs/rules/` | 3 | **A** | Current authority, cited by `CLAUDE.md:352-354`. Correctly unbannered. |

**Root-level `.md` files, zero banners** — the 2026-07-10 sweep covered `docs/`
only. Class **F**, add banners:
`ARCHITECTURE.md:1-3`, `VOLYUME_DEEPMAP.md:1-3`, `APPMAP.md:1-3` (all three say
*"Reconciled against `main` on 2026-06-26"*), `CURRENT-STATE-DOSSIER.md:3`
(*"Compiled 2026-07-02"*), `AUDIT_REPORT.md:3` (*"Date: 2026-07-05"*),
`INFRASTRUCTURE.md:1-3` (*"Source of truth for the runtime configuration…"* — the
most dangerous of the six, it claims to BE the source of truth), plus
`volyume-adversarial-qa-2026-06-03.md`, `volyume-claude-audit-2026-06-02.md`,
`volyume-claude-audit-2026-06-03.md`, `volyume-fitness-logic-audit-2026-06-03.md`,
`volyume-release-readiness-2026-06-03.md`.
All predate the logger rebuild (D43/D57-D66), the flat-diary revert (D75), the
adaptive mesocycle build (D91), the Coach merge (D68) and Campaigns 1–4.

**Loose `docs/*.md` without a banner: 63 of 126.** 17 are `_LOCKED` current
contracts (correctly unbannered — audited separately in §1.4). The remainder
that carry buildable specifications and no gate are class **F**:
`docs/B2B_COACH_PHASE_2_SCOPED.md:1` (no banner AND a false groundwork claim,
§1.3 D-14), `docs/decision-pack-2026-07-03-d1-d7.md:1`,
`docs/e12-sync-consolidation-memo-2026-07-03.md:1`,
`docs/s6-activation-nudge-design-2026-07-03.md:1`,
`docs/blueprint-adaptive-mesocycle-2026-08-09.md:1`.
Note `blueprint-adaptive-mesocycle-2026-08-09.md` is dated one day before the map
commit and may be CURRENT — class **I** until the register is checked; do not
banner it as superseded without confirming D91 stage status.

### 1.2 Misfiled root files that shadow the cited rule docs — class F

`CLAUDE.md:352-353` routes billing and styling rules to `docs/rules/billing.md`
and `docs/rules/styling.md`. Three root-level `.md` files collide with that:

- `billing.md:1-5` — is **not documentation**. It is a bash script:
  `#!/bin/bash` / `# VOLYUME BILLING GUARD` / *"This hook runs before every
  Write, Edit, or MultiEdit tool call."* Near-duplicate of
  `docs/hooks/billing-guard.sh` (differs; both exist).
- `styling.md:1-5` — same shape: `#!/bin/bash` / `# VOLYUME BRANCH GUARD`.
  Near-duplicate of `docs/hooks/branch-guard.sh`. The filename claims styling
  rules; the content is a git-branch guard. Two layers of wrong.
- `watermelon.md:1-12` — a THIRD copy of billing rules under a filename that
  suggests WatermelonDB (this app is `expo-sqlite`/SQLCipher, `CLAUDE.md:27-31`).
  Its YAML `paths:` front-matter scopes it to `src/billing/**`,
  `src/services/billing*`, `src/hooks/usePurchases*`, `src/hooks/useEntitlements*`,
  `src/screens/Paywall*` and `*revenuecat*` — **none of those paths exist**
  (`src/billing`, `src/services` absent; no `PaywallScreen` since C3/D71 per
  `src/screens/paywallExcerpts.js:5-6`; RevenueCat is on the NEVER list).

Neither `billing.md` nor `styling.md` is wired as a hook — the live hooks are
`.claude/hooks/agent-tier-guard.py` and `.claude/hooks/edit-gate.sh`
(`.claude/settings.json`). **Proposal:** relocate/rename, do not silently delete
the guard scripts; the `watermelon.md` billing text may contain rules not present
in `docs/rules/billing.md` and must be diffed before any move.

### 1.3 `CLAUDE.md` architecture-facts drift — all re-verified on current main

| # | Claim | file:line | Reality (verified) | Class |
|---|---|---|---|---|
| D-1 | *"(96 files; migrations are canonical"* | `CLAUDE.md:39` | `ls supabase/migrate_*.sql \| wc -l` = **132**, highest `migrate_135_coach_outputs_week_unique.sql` | **F** |
| D-2 | *"applied through `migrate_116`; 049/059 HELD"* | `CLAUDE.md:15` | Stale on three counts. `docs/TASKBOARD.md:48-52` corrects the ceiling (117,118,120-124,126,127 already applied under drifted names; 128 applied 2026-07-27); `TASKBOARD.md:1372` records 059's `meal_[0-9]+` CHECK live; 129/130 applied 2026-08-08 and 131 verified 2026-08-09 (`supabase/README.md:28-38`). Only **049** is genuinely held. Order baseline adds 132-135 unapplied. | **F** |
| D-3 | *"src/screens, 82 screens"* | `CLAUDE.md:54` | `ls src/screens/*.js \| wc -l` = **84** | **F** |
| D-4 | *"useAppStore.js (~1,700 lines)"* | `CLAUDE.md:49` | `wc -l` = **2,035** (was 2,019 at map time — still drifting) | **F** |
| D-5 | Pro list names **cardio** | `CLAUDE.md:163` | Order line 103-105: *"CARDIO LOGGING: PERMANENTLY OUT OF SCOPE"*; line 147: *"a direct current founder ruling that it is not part of Volyume"*. The project constitution's own gating list contradicts the standing boundary. | **G** |
| D-6 | *"see `modules/live-activity`, `modules/rest-timer-live`"* | `CLAUDE.md:26` | Three local modules exist; `modules/progress-scan-image` omitted, as is the widget native surface (`plugins/withVolyumeWidget.js` + `src/widgets/`) | **F** |

`CLAUDE.md:184` correctly lists `cardio/` as a lib domain folder — that is a
factual file-tree statement, not a product promise. Leave until the cardio lane
removes the directory. Class **I** for this lane.

### 1.4 Migration status banners — `supabase/README.md`

| # | Finding | file:line | Class |
|---|---|---|---|
| D-7 | **Authority chain break.** *"Authoritative applied-vs-pending status lives in `docs/CURRENT_STATUS.md` § 3."* That document carries `⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document` at `docs/CURRENT_STATUS.md:1`. A current locked contract (chain position 4) delegates its authority to a superseded audit (position 5). | `supabase/README.md:42-43` | **F** |
| D-8 | **Dangling citation.** *"per `CLAUDE.md` § 'Permanent engineering rules' Rule 6"*. `CLAUDE.md` has sections 1–4 plus DETAILED RULES (`CLAUDE.md:22,96,179,213,351`). No such section, no Rule 6. | `supabase/README.md:3-4` | **F** |
| D-9 | **The tracker fails its own rule.** Its opening line: *"an undocumented migration is not considered complete."* The tracker table's last numbered row is **071** (`supabase/README.md:96`). Migrations **072–135 (64 files) are undocumented**, including all four the order requires to stay unapplied: 132, 133, 134, 135 have **zero** mentions in the file. A reader of the authoritative tracker cannot learn that unapplied migrations exist. | `supabase/README.md:1-8`, table ends `:96` | **F** |
| D-10 | **059 stale HELD (the map-campaign note, re-verified).** Four sites say held/pending: `:25-26` (*"049 and 059 remain HELD"*), `:47-48` (*"059 … is DRAFTED and pending founder apply"*), `:56`, `:85`. Contradicted by `docs/TASKBOARD.md:1372` (live CHECK carries `meal_[0-9]+`) and by the client itself, which already writes numbered slots: `src/lib/food/mealSlots.js:145` `` add(`meal_${i}`) ``, `src/lib/food/mealPlanAssembler.js:199`, `src/screens/MealNamesScreen.js:45`. Were 059 truly unapplied every diary push would fail the old CHECK. **059 is applied.** | as listed | **F** |

Migration 132–135 headers are **honest and correct** — class **A**, no action:
`migrate_132…:15-16` *"Applied remotely: NO - awaiting the founder's"*,
`migrate_133…:12-13`, `migrate_134…:99-100`, `migrate_135…:15-16`.

### 1.5 Migration 049 — retirement prerequisite list is stale (PHASE 9 crossover)

`supabase/migrate_049_drop_peak_week_plans.sql:7` carries a correct hard gate:
*"⚠️ This is a DRAFT. Do not apply yet."* **Preserve the HOLD** — class **H** for
the migration; this lane proposes no change to its gate.

Its prerequisite list (`:9-23`) is stale in every citation and incomplete:

| Doc claim | Actual |
|---|---|
| *"`src/lib/sync.js` line 965: remove `_pushPeakWeekPlans`"* | definition `src/lib/sync.js:1186`; caller `:742` |
| *"`src/lib/database.js` line 201: … `CREATE TABLE`"* | `src/lib/database.js:316` |
| *"`src/lib/database.js` line 633: … `ADD COLUMN deleted_at`"* | `src/lib/database.js:751` |
| *"`supabase/audit_cloud_schema_drift.sql` line 244"* | `:247` |
| — not mentioned at all — | **pull path**: `_pullPeakWeekPlans` `src/lib/sync.js:1836`, caller `:1611` |
| *"any DAO helpers (`getAllPeakWeekPlansForUser`)"* | also `database.js:6870, :6883, :6898, :6906, :7895` and two table lists `:4836, :5216` |
| — not mentioned at all — | **live product readers**: `src/screens/ProGoalSetupScreen.js:182` and `src/screens/CoachOutputScreen.js:1120` both call `getActivePeakWeekPlan` |

The order (PHASE 9): *"If the previous prerequisite list for eventual retirement
is now stale: update the documentation, but do not execute destructive cleanup."*
Class **E** — keep, correct the header text only. The live-reader omission is the
material one: the list understates retirement cost by two shipped screens.
Depth of the code-side residue is the `AUDIT-PEAKWEEK-SYNC` lane's ruling; this
entry records only the documentation defect.

### 1.6 LOCKED docs whose claims drifted

**`docs/NOTIFICATIONS_LOCKED.md`**

| # | Finding | file:line | Class |
|---|---|---|---|
| D-20 | **The Campaign 3 quiet-hours item — exact fix.** *"All push respects a quiet-hours window. Default 22:00 to 07:00 local; user-configurable in You → Diary preferences."* No such location exists. Live editor: Settings → Notifications and reminders (`src/screens/SettingsScreen.js:89` row label *"Notifications and reminders"* → `src/screens/NotificationSettingsScreen.js:775-821`, section label *"Quiet hours"*). Campaign 3 surfaced it and correctly declined to edit a locked doc (`docs/discoverability-audit-2026-08-10/CONTROL-GAPS-EVIDENCE.md:750-753`). **Proposed replacement text for `:19-20`:** *"All push respects a quiet-hours window. Default 22:00 to 07:00 local; user-configurable in Settings → Notifications and reminders."* | `docs/NOTIFICATIONS_LOCKED.md:19-20` | **F** |
| D-21 | **Two "PROPOSED ADDENDUM" headings describe shipped features.** `:210` *"PROPOSED ADDENDUM — push budget reconciliation (2026-06-12)"* — shipped: `src/lib/notifications/budget.js`, consumed at `src/lib/notifications/scheduler.js:26`. `:330` *"PROPOSED ADDENDUM — early-activation nudge (S6, 2026-07-03)"* — shipped: `src/lib/notifications/categories.js:43`, `budget.js:49`, `scheduler.js:895-898`. The word PROPOSED tells a future engineer these are unbuilt. Retitle to ADDENDUM (SHIPPED). | `:210`, `:330` | **F** |
| D-22 | **Implementation file list is 5 of 23.** Lists `index.js, categories.js, scheduler.js, quietHours.js, permissions.js`. Live module has 23 files including `budget.js`, `channels.js`, `handler.js`, `notificationRoute.js`, `preferences.js`, `pushToken.js`, `telemetry.js`, `winbackContent.js`. `quietHours.js` itself is correct (`src/lib/notifications/quietHours.js` exists). | `:145-152` | **F** |
| D-23 | **Category table is 10 rows; the live enum is ~23.** `src/lib/notifications/categories.js:18-43` adds MORNING_WEIGHT, EVENING_WEIGHT, TRAINING_REMINDER, YEAR_OF_LIFTS_UNLOCK, MONTHLY_RECAP, WINBACK, PARTNER_CHEER, CHECKIN_MISSED, PLANNED_MEAL_CONFIRM, REST_TIMER, MEAL_LOG_REMINDER, ACTIVATION_NUDGE. The "user can disable" column — the locked unsubscribe law's own ledger — is therefore silent on thirteen live categories. | `:27-40` | **F** |

Not raised as findings (founder-gated, FR-5): the `:22-23` unsubscribe law versus
`weekly_coach_ready` (`:39` says "Yes") and `partnerCheerEnabled` — carried by
Campaign 3 as FR-5 and by order PHASE 13/29. Class **I** for this lane; do not
resolve by editing the doc.

**`docs/PRIVACY_CONSENT_LOCKED.md`** — class **F**

D-17. `:81` and `:259` describe the privacy policy as *"a webview to
volyume.app/privacy"* / *"'Read the privacy policy' → webview to
volyume.app/privacy"*. The shipped product renders an **in-app native screen**:
`src/screens/Article9ConsentScreen.js:175-179` — *"Show the policy in-app (native
screen with its own BackHeader) instead of bouncing to the system browser
mid-consent"* → `navigation?.navigate('PrivacyPolicy')`; same from
`src/screens/SettingsPrivacyScreen.js:115-116`. The doc describes the consent
gate's own mechanics incorrectly, on an Article 9 contract.

D-16. Related, `src/lib/links.js:3` header: *"Locked in PRIVACY_CONSENT_LOCKED.md
line 280"*. Line 280 of that file is about the `record_health_consent` RPC. The
real clause is `docs/PRIVACY_CONSENT_LOCKED.md:293-294` (*"The privacy policy URL
is hardcoded as `https://volyume.app/privacy` in `src/lib/links.js`"*). The
citation is wrong, and `LINKS` has **zero importers** in `src/` — so the lock is
unenforced. Correcting the citation is class **F**; whether the module is deleted
is class **I** and belongs to `AUDIT-MODULES-FLAGS` (the order, PHASE 6, requires
tracing every privacy/support URL first — done here: the only live privacy
surface is the in-app screen, and `volyume.app` appears independently at
`src/navigation/RootNavigator.js:760`, `src/lib/partners/link.js:19`,
`src/lib/food/writeback.js:36`, `src/lib/food/sources/liveOff.js:40`).

**`docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`** — class **A**, no drift.
Anti-patterns at `:176-187` verified absent from live code: `migrateLocalUserId`,
`initLocalUser`, `handleContinueLocally` appear only in comments and tests.
CI enforcement is real: `scripts/check-identity-invariant.sh` exists and runs at
`.github/workflows/identity-invariant.yml:41`. One nit: `:164` names
`LoginScreen.handleEmailAuth` as a removed call site while email auth was
re-added 2026-07-21 and `src/screens/LoginScreen.js:112` `handleEmailAuth` exists
again — the *invariant* still holds (see D-19), only the historical phrasing reads
oddly. Not proposed for change.

**`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`** — class **A**. Checked against the
D93 terminology canon (`DECISIONS-2026-07-09.md:2489-2512`), which added "deload"
and "tonnage" to `JARGON_PATTERNS`. The three "deload" hits (`:88`, `:291`, `:419`)
are all analytic prose about coaching behaviour, not rendered user copy; the canon
binds emitted strings. No drift.

**`docs/DATABASE_SCHEMA_LOCKED.md`** — class **F** (D-15). `:48` status banner:
*"Tier and subscription domain (Move #5): NOT STARTED."* False — Play Billing is
live (`CLAUDE.md:71`), migrations 065-068, 070, 071, 108 applied
(`supabase/README.md:49-59`).

### 1.7 Loose doc/status claims re-verified as STILL FALSE on current main

The map campaign recorded 15 doc-vs-code contradictions
(`docs/_FULL-APP-PRODUCT-MAP.md:1032-1046`, detail `:14951-15063`). Every one
re-checked against `92b9644e`. **All still open** — none was fixed by Campaign 2
or 3. Beyond those already tabulated above (C1–C5 = D-1..D-6, C15 = §1.1):

| # | Finding | file:line | Class |
|---|---|---|---|
| D-12 | `⚠ STATUS (2026-07-10): STALE OPS REFERENCE - email/password auth was removed 2026-07-01 (Apple + Google OAuth only).` Email/password is **LIVE and ungated** — `CLAUDE.md:85-88`, `src/screens/LoginScreen.js:112` `handleEmailAuth`, `src/lib/supabase.js` `signInWithPassword`/`signUp`. The banner itself is the falsehood. | `docs/EMAIL_AUTH_DELIVERABILITY.md:1` | **F** |
| D-13 | RevenueCat cost row survives in a LOCKED budget doc. Play Billing direct since 2026-05-25; RevenueCat is on the NEVER list (`docs/BACKLOG.md`). | `docs/BUDGET_POSTURE_LOCKED.md:30` | **F** |
| D-14 | *"the phase 1 schema groundwork (`engine_overrides` table, `coach_id` columns, server-side `clientLink` plumbing) is correctly shaped"*. `coach_id` appears in **zero** files under `supabase/` and **zero** under `src/` (only inside this doc, `:25`, `:47`). No banner on the file either. | `docs/B2B_COACH_PHASE_2_SCOPED.md:3-5` | **F** |
| D-7b | `docs/BACKLOG.md:51` cites `PRWallScreen.js` and `algorithms.getStrengthStandard`, both deleted — and `:143` in the same file records the deletion. The doc contradicts itself. (Banner present, so the risk is bounded.) | `docs/BACKLOG.md:51` vs `:143` | **F** |
| D-18 | `src/lib/food/diaryTimeline.js:1-7` header asserts the timeline *"replac[es] the meal-bucket card layout for every user (June founder ruling …)"*. That ruling was **REVERTED** — D37 item 15 (`DECISIONS-2026-07-09.md:641-645`): *"BUILT `ae9c311` then REVERTED `363d2d7` the same day on the founder's device verdict — meal cards are canonical; NEVER RE-PROPOSE a flat diary."* A reader of the file alone concludes the flat diary is the shipped design. | `src/lib/food/diaryTimeline.js:1-7` | **G** |

### 1.8 New source-header falsehoods found by this lane (not in any prior audit)

| # | Finding | file:line | Class |
|---|---|---|---|
| D-19 | **A comment asserts a capability the identity lock forbids.** *"The legitimate anonymous-to-account migration is now handled ONCE per account in `LoginScreen.handleEmailAuth` under the signup branch only."* `src/screens/LoginScreen.js:112-156` contains **no migration of any kind** — it calls `signUpWithEmail`/`signInWithEmail`, maps error strings, and returns. There is no anonymous mode to migrate from: `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md:25-27` (*"No anonymous mode … There is no `anon:` identity"*) and `:178` (*"Anonymous local mode of any kind"* on the never-reintroduce list); `CLAUDE.md:90`. This comment sits in the navigator's auth path and would lead a future engineer to build for a mode that must not exist. | `src/navigation/RootNavigator.js:1338-1341` | **F** |
| D-24 | *"the previous rows promised 'Peak Week and block planning' and 'Photos and coach handover', neither of which exists"*. **Both now exist.** Coach handover report is live: `src/lib/coachReport.js`, rendered at `src/screens/SettingsDataScreen.js:323` (*"Coach handover report (PDF)"*). Progress photos are live and Pro-gated: `src/navigation/RootNavigator.js:219, :513, :562`. The strip's own three rows are correct (class A); only its rationale comment is now false, and it argues against naming two real shipped Pro differentiators. | `src/components/TierComparisonStrip.js:22-24` | **F** |
| D-25 | *"rebuilt after the original component was removed as consumer-less … this rebuild has a real entry point in the Active Workout exercise overflow sheet"*. **There is no such entry point.** `calculatePlates` has zero live callers — the only importers are its own test (`src/lib/__tests__/plateMath.test.js:13`) and `src/screens/ActiveWorkoutScreen.js:73`, which imports **only** `DEFAULT_BAR_KG`, used at `:3395` for the warm-up ramp (`barKg: barWeight \|\| DEFAULT_BAR_KG`), not a plate calculator. | `src/lib/plateMath.js:2-5` | **F** |
| D-26 | Three stale claims in one module header/JSDoc: `:57` *"Same six contexts"* while `TRIGGER_CONTEXTS` at `:73-78` holds **four**; `:86-88` *"Used to evaluate … the multi-week signal contexts (energy_crash, extreme_soreness)"* — both were removed as triggers, stated eight lines above at `:70-72`, so the file contradicts itself; `:87` JSDoc types tier as `'free'\|'pro'\|'complete'` though Complete was removed at the 2-tier consolidation. | `src/lib/differentialPaywall.js:57, :86-88, :87` | **F** |

### 1.9 `_FULL-APP-PRODUCT-MAP.md` — what a Campaign 3–4 addendum must say

The Campaign 2 addendum exists at `docs/_FULL-APP-PRODUCT-MAP.md:3-14` and is the
right shape: a top-of-file block that names what changed and points at the
authoritative newer documents, without regenerating the body. The order (PHASE 15)
requires the same treatment where Campaigns 1–4 materially changed truth, and
*"Prefer an authoritative 'post-campaign update' section."* **Proposed content —
this lane proposes text, it does not rewrite history:**

1. **Authority.** D94 + D94 addendum (`DECISIONS-2026-07-09.md:2548-2600`) for
   Campaign 3; the Campaign 4 register entry once written. FR-1..FR-5 remain open
   by design (`:2598-2600`).
2. **Three corrections Campaign 3 explicitly flagged for the map's next touch**
   (`docs/discoverability-audit-2026-08-10/CONTROL-GAPS-EVIDENCE.md:765-768`), all
   re-verified here:
   - **U6 travel mode is WRONG.** Map `:10505-10509` says *"I found no screen,
     navigation route, or Settings row that invokes it"*. It is **LIVE and
     reachable**: `src/screens/BuildWorkoutScreen.js:246-250` renders a
     *"Travel / hotel gym"* chip opening the travel modal. Correct U6 to LIVE.
   - **Quiet-hours entry is stale** — same defect as D-20 above.
   - **Cycle opt-in has a live writer** — `src/screens/SettingsCoachingScreen.js:80-84`
     `toggleCycleTracking` → `setCycleTracking`.
3. **Counts to re-derive, not to trust** (PART 32, `:939-965`): screen modules
   83/84 (now 84 `.js` files), settings 98, and the "Known legacy/unreachable" row
   `:962` (*"4 dead-tap sites, 11 sourceless registrations, 10 dead engine
   functions, 7 dead copy generators, 5 dead modules, 2 dark routes, 2 stale SQL
   snapshots"*) — Campaign 4's route/dead-function/module lanes supersede that row
   wholesale; the addendum must point at `docs/coherence-cleanup-2026-08-10/`
   rather than restate numbers.
4. **PART 33 items resolved or moved by Campaign 3**: F-12's three control gaps
   became FR-3/FR-4 plus a landed partner-cheer toggle (`D94-1`); F-3/F-4 pref-sync
   items were ruled in `SETTINGS-OWNERSHIP.md`.
5. **PART 33 doc-vs-code list (`:1032-1046`) is still 15/15 open** — the addendum
   should say so plainly and hand the list to Campaign 4 rather than imply it was
   cleared.
6. **The product-boundary register (`:13469`, `:963`)** gains the Campaign 4
   cardio ruling as a CURRENT founder boundary, distinct from Peak Week's
   legacy-load-bearing status.

---

## 2. PHASE 19 — SUBSCRIPTION / MARKETING PRODUCT TRUTH

Surfaces swept in full: `ProUpgradeScreen.js`, `SubscriptionPolicyScreen.js`,
`SubscriptionScreen.js`, `CascadeGateScreen.js`, `WelcomeScreen.js`,
`src/lib/differentialPaywall.js`, `src/components/ProGate.js`,
`src/components/TierComparisonStrip.js`, `src/screens/paywallExcerpts.js`,
`src/screens/SettingsFaqScreen.js`, `src/lib/proGate.js`.
**No price, product ID, trial-architecture or billing-engine change is proposed
anywhere in this lane.**

### 2.1 Stale claims — exact, with file:line

| # | Stale claim (verbatim) | file:line | Why it is false | Class |
|---|---|---|---|---|
| **S-1** | `Cardio: 'Log cardio so your sessions and the energy they burn feed into your weekly plan.'` | `src/components/ProGate.js:38` | This is the **Pro lock benefit line** shown to a free user who reaches a cardio route. It is live copy selling cardio logging as a Pro value proposition, against the order's *"No Pro value proposition may promise cardio logging"* (PHASE 2A) and *"CARDIO LOGGING: PERMANENTLY OUT OF SCOPE"* (line 103-105). Reachable: `src/navigation/RootNavigator.js:237-238` wrap both cardio screens in `withProGuard(…, 'Cardio')`, and the routes are registered in three stacks — `:400-401`, `:405-406`, `:460`, `:523`, `:524`. | **G** |
| **S-2** | *"Pro adds everything nutrition and coaching related: the food diary, barcode and label scanning, meal suggestions, calorie and macro targets, **cardio logging**, weekly check-ins, Precision Coaching, and division-style plans."* | `src/screens/SettingsFaqScreen.js:47` | The in-app FAQ's canonical Free-vs-Pro answer names cardio logging as a shipped Pro feature. Same boundary breach as S-1, on a help surface (order's THIRD CLEANUP LAW lists FAQs explicitly). | **G** |
| **S-3** | `<Bullet>Plate calculator.</Bullet>` — listed under **"What stays free"** | `src/screens/SubscriptionPolicyScreen.js:60` | **There is no plate calculator in the product.** `calculatePlates` (`src/lib/plateMath.js`) has zero live callers (§1.8 D-25); no screen, route or sheet exposes it. And it is a *rejected* surface, not merely an unbuilt one: `DECISIONS-2026-07-09.md:15` — *"Plate calculator surfacing. **REJECTED.** Moot for UK-based users; absolutely not needed. Do not re-propose."*; `:1116` — *"Plate calculator: ABSOLUTELY DROPPED, never revisit."*; `docs/TASKBOARD.md:1502`. The subscription-policy screen — the app's plain-English promise of what Free includes — advertises a feature the founder killed. | **G** |
| **S-4** | `label="Cardio logging"` / *"On. Log any cardio you do, your choice of activity. The coach only suggests cardio if a cut stalls."* / *"Off. No cardio logging or library."* | `src/screens/SettingsCoachingScreen.js:166-169` | A live settings toggle whose copy promises cardio logging AND a coaching dependency on it. Order PHASE 2A: *"No hidden cardio setting may remain."* Execution belongs to the cardio lane; recorded here as a subscription/settings-copy promise. | **G** |
| **S-5** | `@param {'free'\|'pro'\|'complete'} args.userTier` | `src/lib/differentialPaywall.js:87` | Complete tier was removed at the 2-tier consolidation; `src/lib/proGate.js:44` treats `paid_complete` as *"legacy → mapped to pro"*. Doc-only; no behavioural change proposed. | **F** |

### 2.2 Verified CLEAN — class A, no action

- **`ProUpgradeScreen.js`** — the single live upgrade surface. Its four benefit
  rows (`:30-33`) and four FAQ entries (`:42-55`) name only shipping product:
  adaptive plan, weekly adjustment, calorie/protein targets, per-decision
  explanation. Zero cardio, wearables, AI, B2B, Peak Week or dark-quiz claims.
- **`SubscriptionPolicyScreen.js`** apart from S-3. Claims re-verified true:
  *"31 ready-made plans"* (`:54`) — `src/lib/seedRoutines.js` defines exactly 31;
  *"400+ exercise library"* (`:53`) — `src/lib/seedExercises.js` RAW holds 551
  rows (conservative, not false); *"Export your training history to CSV"* (`:62`)
  — `src/lib/database.js:4579` `buildWorkoutCSV`, surfaced at
  `src/screens/SettingsDataScreen.js` and described identically at
  `src/screens/PrivacyPolicyScreen.js:90`; *"Personal records and strength
  standing"* (`:57`) — `src/lib/strengthStandards.js` consumed by
  `LiftProgressScreen.js:24` and `athleteProfileSummary.js:2`.
- **`TierComparisonStrip.js:25-29`** — the three comparison rows are accurate and
  already had the Peak Week promise removed (audit 2026-06-21). Only its comment
  is stale (D-24).
- **`differentialPaywall.js:49-68`** — the four locked copy variants name the food
  log and Precision Coaching only. The trial-duration contradiction was already
  fixed under C1 (`:1-9`). "Precision Coaching" is a live product term (55
  non-test uses, e.g. `src/components/AttentionCard.js:112`,
  `src/lib/nutritionEngine.js:402`).
- **`CascadeGateScreen.js`, `WelcomeScreen.js`, `SubscriptionScreen.js`,
  `proGate.js`** — swept for cardio/wearable/AI/B2B/Peak Week/quiz promises:
  none. `WelcomeScreen.js:67-70`'s only hit is the `ONBOARDING_QUIZ_FIRST` branch,
  which the order (PHASE 7) directs to KEEP as retained rollback behaviour.
- **No AI or wearable promise exists in any user-facing string.** A repo-wide
  sweep of `src/screens` + `src/components` for AI/LLM/"smart assistant" returns
  only unrelated identifiers. Wearable mentions are confined to
  `src/lib/activitySteps.js:4-14` and `src/screens/SettingsHealthScreen.js:192`,
  which describe **steps/health-integration** (*"Volyume picks up new readings
  from your scale or wearable"*) — the order (PHASE 2, concepts 2 and 3) forbids
  collapsing that with cardio logging. **Not a finding; do not remove.**
- **`paywallExcerpts.js`** — class **D**, intentional seam. `PAYWALL_EXCERPTS` is
  deliberately empty and `:11-13` states *"`EXCERPTS.length === 0` IS the feature
  flag, no flag infrastructure"*, gated behind a seven-clause honesty contract
  including an absolute ED-safety screen (`:31-35`). Dark by design, not dead.

---

## 3. PHASE 22 — CROSS-FEATURE COHERENCE

The order's nine questions, across TRAINING / NUTRITION / PROGRESS / COACH /
PARTNER / SETTINGS. Contradictions only; no redesign is proposed.

| Q | Question | Verdict | Evidence |
|---|---|---|---|
| 1 | One surface promises what another says is unavailable | **CONTRADICTION** | `SettingsFaqScreen.js:47` sells "cardio logging" as Pro while the standing founder ruling puts cardio logging out of scope; `CLAUDE.md:163` repeats it in the gating law. (S-1/S-2/D-5) |
| 2 | Automatic vs proposed | **CLEAN** | Swept every "automatic" string in `src/screens` + `src/components`. `ConsistencyScreen.js:115-117` explicitly disclaims automation (*"starting volume is not an automatic increase"*, *"no block is ever"*). No surface calls a proposal automatic. |
| 3 | A setting implies a removed feature | **CONTRADICTION** | `SettingsCoachingScreen.js:166-169` — live "Cardio logging" toggle. (S-4) |
| 4 | Pro copy promises something with no entry point | **CONTRADICTION ×2** | `ProGate.js:38` cardio benefit (S-1). And the Free-tier analogue: `SubscriptionPolicyScreen.js:60` "Plate calculator." with no entry point anywhere (S-3). |
| 5 | An empty state advertises dead functionality | **DEFERRED — class I** | The only candidates are the cardio screens' own empty states (`CardioHistoryScreen.js`), owned by `AUDIT-CARDIO`. No non-cardio empty state advertises a dead feature. |
| 6 | A progress metric depends on a removed subsystem | **CONTRADICTION — cross-lane** | `src/screens/WeeklyCheckInScreen.js:271-287` prefills the weekly check-in's cardio-adherence verdict from `getCardioLogRange` + `summariseWeekCardio`/`cardioComplianceFromLog` (`:22`, `:47`), gated on `userProfile.cardioPrescription` (`:347`), and the answer is required before submit (`:700`) and written to the check-in (`:781`). So a **live COACH-domain surface consumes cardio-logging data**. Order PHASE 2B requires pinning that removing cardio logging does not alter an otherwise identical user's prescription — that proof is `AUDIT-CARDIO`'s to produce. Recorded here as the coherence contradiction; **class I for this lane**, do not act. |
| 7 | A notification destination points at a retired surface | **CLEAN** | `src/lib/notifications/notificationRoute.js:27-79` — every mapped destination (WeeklyCheckIn, YearOfLifts, Analytics, CascadeGate, CoachOutput, Subscription, Consistency, Diary) resolves to a live registered route. No cardio, Peak Week or timeline destination. |
| 8 | Partner activity exposes retired concepts | **CLEAN** | `src/lib/partners/` and `PartnerScreen.js` swept: the only cardio hit is a styling comment at `PartnerScreen.js:2236` (*"same overall pattern as CardioHistoryScreen.js's buildLiveStyles"*) — a code-style reference, not a user-facing concept. |
| 9 | Share cards mention removed features | **CLEAN** | `src/lib/shareCard/` swept for cardio / Peak Week / plate calculator: zero hits. `greatWeek.js:5` maps a Precision Coaching weekly output — a live system. |

**Additional doc-vs-code contradiction found while answering Q-set** (recorded in
§1.9 item 2): `_FULL-APP-PRODUCT-MAP.md:10505-10509` records travel mode as
unreachable; `src/screens/BuildWorkoutScreen.js:246-250` renders a live
"Travel / hotel gym" chip. The map is wrong; the feature is LIVE. Relevant to
order PHASE 8, which asks whether travel mode is live, internal, rollback, dead
or future-held — **this lane's evidence says LIVE and user-reachable**, so PHASE
8's *"Do NOT expose it"* is already satisfied by it being deliberately exposed;
`AUDIT-MODULES-FLAGS` owns the generator-level ruling.

---

## 4. FOUNDER RULINGS REQUIRED FROM THIS LANE

None. Every finding is a documentation/copy correction or hands off to a named
lane. Two adjacent items are founder-gated and were deliberately **not** resolved:

- **FR-5** (win-back / weekly-coach-ready unsubscribe controls) touches
  `NOTIFICATIONS_LOCKED.md:22-23` vs `:39`. Order PHASE 13/29: *"DO NOT choose
  autonomously … Do not let this cleanup accidentally resolve them by deleting
  code."* No edit proposed to those lines.
- **Migration 049** stays HELD and unapplied. This lane proposes only a
  correction to its stale prerequisite text (§1.5), never to its gate.

---

## 5. UNCERTAIN — class I, do not act

1. **`docs/marketing-2026-07-11/`** — three founder decision briefs/memos with no
   resolution recorded in-file. Cannot classify as superseded without checking
   each against the register per brief.
2. **`docs/blueprint-adaptive-mesocycle-2026-08-09.md`** — dated one day before
   the map commit; may be current D91 authority. Do not banner as superseded.
3. **`src/lib/links.js` deletion** — the header citation is provably wrong (D-16,
   class F, correct it), but whether the module goes is `AUDIT-MODULES-FLAGS`'s
   call. Every privacy/support URL was traced for that lane's benefit (§1.6).
4. **Cardio's live coaching dependency** (Q6 above) — the contradiction is
   documented with file:line; the equivalence proof the order demands is
   `AUDIT-CARDIO`'s deliverable, not this lane's.

---

## 6. PROPOSALS (no execution)

**Headers/banners to add** — never rewrite the bodies:
`SUPERSEDED` on the eleven root-level `.md` map/audit files (§1.1);
`SUPERSEDED / DO NOT IMPLEMENT FROM THIS DOCUMENT` on `docs/web-platform/`'s
first-opened file and `docs/remediation-2026-07-11/DEFECT-MAP.md`;
`CAMPAIGN CLOSED — CURRENT AUTHORITY IS THE DECISION REGISTER` on the Campaign 2
and Campaign 3 folder entry files.

**Text corrections** — 26 class-F items above, each with the false string quoted
and the verified replacement fact at file:line. The highest-value five, in order:
`supabase/README.md:42-43` (authority chain break),
`supabase/README.md` table ending at 071 with 132-135 undocumented,
`CLAUDE.md:15` (migration ceiling + 059),
`docs/NOTIFICATIONS_LOCKED.md:19-20` (quiet hours, exact fix supplied),
`src/navigation/RootNavigator.js:1338-1341` (comment asserting a forbidden mode).

**Copy removals** — 6 class-G items. S-1/S-2/S-4 land with the cardio lane;
S-3 (`SubscriptionPolicyScreen.js:60`) is independent of cardio and can be
removed on the plate-calculator rejection alone (`DECISIONS-2026-07-09.md:15`,
`:1116`); D-5 (`CLAUDE.md:163`) and D-18 (`diaryTimeline.js` header) follow their
respective lanes' outcomes.

**Map addendum** — one "CAMPAIGN 3–4 ADDENDUM" block at
`docs/_FULL-APP-PRODUCT-MAP.md:15`, mirroring the Campaign 2 block's shape, with
the six points in §1.9. Do not regenerate the body.

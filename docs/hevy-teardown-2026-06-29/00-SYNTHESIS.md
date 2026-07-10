> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Hevy parity teardown; the P1 wave built and merged, and remaining items are decision-gated or already overtaken by the July campaign (editable/deletable logged sets shipped via zeego; drag-to-reorder shipped D32). Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Hevy vs Volyume — competitive teardown SYNTHESIS (2026-06-29)

Source: 16 area teardowns in this folder, built from a decompiled **Hevy v3.1.0**
(`com.hevy`, React Native + Hermes) corpus measured against Volyume's `src/`.
All recommendations are *our-own-implementation* ideas — **no Hevy code/assets
are to be copied verbatim**.

**Framing.** Hevy and Volyume are both RN/Hermes 5-tab apps, but they spend
their surface oppositely: Hevy is a **social logger + human-coach marketplace**
(2 of 5 tabs are social; Ably/Branch/Amplitude/RevenueCat/Agora/img.ly stack);
Volyume is a **private, ED-safe, deterministic-coaching** app. Most of Hevy's
"lead" is in areas Volyume *deliberately* avoids. The real, brand-safe wins are
in **logging niceties, customisation, progress depth, and polish** — much of
which is already half-built in our code and just unwired.

---

## P1 — do these first (high ROI, no policy conflict; mostly wiring/UI we already own)

| # | Item | Area | Effort | Why it's cheap |
|---|------|------|--------|----------------|
| 1 | **Wire the PlateCalculator** into the active workout (Plates button on the weight row) | 01 | S | Fully built (`PlateCalculator.js`, `calculatePlates`) but **0 consumers** — dead code |
| 2 | **Surface body-weight units + barbell weight** as editable Settings rows | 15 | S | Store setters exist; only onboarding sets them today → users stuck after a wrong pick |
| 3 | **Workout settings sub-page**: global default rest + auto-start-on-complete + timer sound | 15 | M | All timer plumbing already in the store; 90s is hardcoded today |
| 4 | **Live in-set PR** badge/toast on set-tick | 05 | M | Reuse existing `detectPR` + `PRCelebration`; today PRs only fire at session finish |
| 5 | **Per-exercise chart metric switcher** (best-set / heaviest / total-reps / session-volume) | 04 | M | Reuse existing chart + window-chip infra; pure training data |
| 6 | **Multi-axis exercise filter** (muscle + secondary + equipment + text) + a recents row | 03 | M | Metadata already exists; search is name-substring only today |
| 7 | **Routine/plan folders** (collapsible, organise the flat list) | 02 | M | Offline-first; no engine/billing/safety touch |
| 8 | **Manual superset builder UI** on the existing `superset_group_id` model | 02 | S–M | Model + engine + tests already exist; only the builder UI is missing |
| 9 | **Fire the already-computed streak milestone / perfect-month / repair** as a calm, no-shame notification | 13 | S | `streakState.js` computes 4/12/26/52 + repair; currently silent |
| 10 | **Re-centre the Train tab** so "start session" is the top decisive block; demote stats/nudges | 09 | M | Today the start action is buried under coach brief/stats/weight |
| 11 | **Contextual upgrade prompt** when a free user opens a Pro family (food/cardio/coaching), deep-linking the existing `PaywallScreen` | 12 | M | No billing change; just a trigger + nav |
| 12 | **Add a `trigger` dimension to paywall telemetry** | 12 | S | Prerequisite to measuring any paywall change |
| 13 | **Lifetime-stats panel** (promote existing `getLifetimeTonnage` to standing totals) | 04 | S | Data already computed |
| 14 | **Low-disk guard** + pre-session free-space check | 14 | S | Hardens the local encrypted-SQLite store the whole app rests on |
| 15 | **Per-object "not backed up · retry"** affordance reusing `sync_queue` | 14 | M | Closes a trust gap with no new transport |
| 16 | **PRCelebration reduce-motion aware** + route haptics through `lib/haptics` (port to Reanimated) | 16 | S | Consistency fix; everything else already respects reduce-motion |
| 17 | **Save-to-gallery + Instagram-Stories share targets** for the already-rendered card PNG | 11 | S | Note: `expo-media-library` is a new dep → needs founder OK |
| 18 | **2–3 new Skia share archetypes** (muscle-split, calendar/streak) from data we already compute | 11 | M | Reuse the ED-safe Skia renderer |

## P2 — strong, more effort or a small gate

- Recovery/freshness heatmap layer (deterministic days-since × landmark) — 04, M
- Extend **PR taxonomy** to all logging types (reps-only, duration, distance) — 05, L *(depends on `exerciseType` below)*
- Add an **`exerciseType`** set-schema axis (reps-only / duration / distance / weighted-bodyweight) so one logger handles planks, carries, cardio — 03, L *(touches the logger → invariant tests)*
- **Per-exercise media + muscle diagram** on our **own EU CDN**, offline fallback bundled (never reuse Hevy assets) — 03, L
- **Drag-to-reorder** routines/exercises — 02, M *(needs a draggable-list dependency → propose + await approval)*
- **Live in-workout heart rate** from HealthKit/Health Connect (Pro) — 10, M
- **QuickAccess "start a routine" interactive Android widget** — 10, S *(reuses our snapshot pipeline)*
- Extend **importer** to measurements/body-comp + better format detection — 14, M
- **Warm-up calculator** (deterministic ramp %, reuse PlateCalculator) — 15, L *(engine-adjacent)*
- Animate the **muscle map with our existing Skia** stack (NOT Rive — avoids a new native dep) — 16, L
- **Paywall conversion-craft** pass (FAQ + plan comparison, keep the honest bar) — 12, S
- **Block/report on partner invites** — 06, S *(the safety half of "social" that genuinely fits a trust app)*
- Richer **textless cheers** + a privacy-safe shareable **streak/consistency badge** (no numbers/weights/photos) — 06, M

## P3 / DECISION-GATED — bring to founder, do NOT build silently

These touch a sacred rule, a new dependency, billing, the coaching/ED engine, or
a strategy call. Each needs a structured founder decision first.

- **Re-enable the rest-timer lock-screen notification** with Complete-Set/±15/Skip actions — 01 *(Live-Activity / Core-Haptics dependency = the existing CLAUDE.md item 14)*
- **`expo-keep-awake` during a workout** — 01 *(new dependency)*
- **The social question** — stay solo / private-share-only / real feed — 06, 09 *(the single biggest strategic fork)*
- **Defer the Pro paywall to after first value** — 08 *(directly reverses the 2026-06-26 friction-removal decision AND touches gating)*
- **Volyume watch companion app** — 10 *(conflicts with the Expo-managed / no-eject rule)*
- **Referral / Branch growth loop** — 13 *(new dependency + growth strategy)*
- **Sex-aware strength standards** — 05 *(ED-adjacent framing)*
- **Progress photos** — 04 *(PII / EU-residency / ED-safety)*
- Full **img.ly-style share editor** — 11 *(conflicts with deterministic-render / offline / no-PII; in-house Skia caption layer is the safer path if demand appears)*

## AVOID — do NOT copy (conflicts with Volyume's brand / ED-safety / sacred rules)

- Public workout **feed**, follower graph, public profiles, per-item public visibility, **default-public** workouts (06, 09)
- **Leaderboards / percentile-vs-other-users / compare-user / rank** (04, 05, 06)
- **Loss-framing** streak pushes ("your streak is in danger", flame going out) (13)
- **Human coaches / coach marketplace / live two-way chat / video (Agora) / coach billing outside Play Billing** (07)
- Any **LLM/AI-coach** framing or generated chat copy (07)
- **Quota-based** free gating (4-routine cap, capped history) — contradicts the locked free split (12)
- **Contact-based** friend discovery (06)

## Where Volyume already LEADS Hevy (protect these; worth marketing)

- **Deterministic multi-week mesocycle progression** — RIR ladder, deload prediction, auto-regulation — deeper than Hevy Trainer (02)
- **`swapEngine` auto-scorer + `exerciseMetadata`** — ahead of Hevy's manual replace list (03)
- **Sync engine** — locked per-table registry, named conflict strategies incl. per-column merge, push+pull watermarks, queue with backoff + compaction, JSON backup/restore + auto snapshots (14)
- **Accessibility** — tested WCAG contrast, full CVD (Okabe-Ito) palette, reduce-motion-aware haptics, 126-file a11y labelling; Hevy only honours OS flags, no CVD palette (16)
- **Myo-rep / rest-pause cluster flow + auto-advance** in logging (01)
- **Privacy-first, ED-safe, no-rank** stance and the deterministic coaching cadence (five-part weekly response) — the core differentiator, not a deficiency (06, 07)

## Corrections noted during the run (not Hevy gaps)

- Volyume **does** ship 2 Android widgets (NextSession, WeeklyConsistency) + an iOS rest-timer Live Activity — the nav agent's "zero widgets" was wrong; the widget gap is *breadth/interactivity*, not absence (10 corrects 09).
- `ARCHITECTURE.md §10` exercise figures are stale (real: ~448 exercises / seed v7 vs documented "200+/v3") — minor doc fix for later, flagged by 03.

---

### Suggested first sprint (all P1, all brand-safe, mostly unwiring existing code)
1, 2, 8, 9, 12, 13, 16 are **S** and touch nothing sensitive — a clean half-week
that visibly closes the most embarrassing gaps (dead PlateCalculator, stuck unit
settings, silent milestones, unmade supersets). Then 3, 4, 5, 6, 7 for depth.

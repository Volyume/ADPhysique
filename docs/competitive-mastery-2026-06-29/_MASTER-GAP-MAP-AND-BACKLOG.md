> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Cronometer/MFP gap map; its GATED founder-decision items (D1-D7: micronutrients/NRV, home Remaining widget, per-day targets, fasting timer, medical biometrics, etc.) are pre-campaign - micronutrients/NRV already shipped (D22/D37), and every remaining item needs D37 triage against today's tree before any consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# VOLYUME — Master Gap Map & Build-Ready Backlog

**Date:** 2026-06-29
**Synthesis lead deliverable.** Consolidates the ten competitive-mastery docs
(MFP × 5: features, flow, settings, premium, UI; Cronometer × 5: features, flow,
settings, Gold, nutrition-depth) into ONE deduplicated gap map and ranked backlog.

**Source docs (the authority — every claim traces to one or more):**
- `mfp-features-inventory.md` · `mfp-flow-of-services.md` · `mfp-settings-config.md` · `mfp-premium.md` · `mfp-ui-system.md`
- `cronometer-features-inventory.md` · `cronometer-flow-of-services.md` · `cronometer-settings-config.md` · `cronometer-gold-premium.md` · `cronometer-nutrition-depth.md`

**Tag legend.** `SAFE` = compatible with every VOLYUME constraint (ED-safety,
adherence-neutral/no-streaks, offline-first, EU/no-PII, Free-vs-Pro,
deterministic/no-AI) → buildable after the normal plan-first step. `GATED` =
collides with a standing founder decision or rule → needs the structured founder
decision before any code. `BLOCKED` = collides with EU/no-PII or the no-social
posture → do not build. Corroboration (a gap raised by multiple docs/both apps)
raises confidence and is noted in each row.

---

## 1. Executive summary

**Where VOLYUME stands.** Across the full breadth of both apps, VOLYUME is at or
ahead of parity on the things that matter to its audience and it is **categorically
ahead on the things neither competitor has**: a deterministic Precision Coaching
engine that re-plans training and nutrition from how the week actually went; a
real strength-programming engine (mesocycles, set/rep/RIR, rest timer, volume
heatmaps) that is *free* where MFP gates "workout routines" behind Premium; an
ED-safety system (sex floors 1500/1200 kcal, FFM energy floor, 1.5%/wk rapid-loss
cap, ED-pattern detection, Beat UK signposting) that **neither MFP nor Cronometer
has any equivalent of** — both will happily let a user chase a 900 kcal target;
and a moat cluster (meal-plan generator + grocery list, calorie banking,
9-circumference body metrics, JSON backup/restore, CSV export, label OCR,
adherence-neutral no-shame UX, deeper in-app accessibility than either app) that is
genuinely unique. The recently-merged food-ease work already pulled the *per-tap*
logging loop to a 2–3 tap best case, matching Cronometer's ~3 and MFP's 3–4. On
raw feature surface VOLYUME is missing breadth in two areas only: micronutrient
depth (Cronometer's true moat) and a handful of logging-convenience power-ups.

**Why MFP and Cronometer still *feel* easier day-to-day.** It is not per-tap cost
any more — it is **where the log action lives and what it offers there**. Both
competitors open *directly onto the food diary* with the "Remaining" number and an
always-present `+`; VOLYUME opens onto the Train tab and hides food logging one tab
away behind a `restaurant` icon (corroborated by *both* flow docs as the single
biggest structural ease gap). Both weight live search by the user's own logged
foods so the food you eat every day is the first row before you type; VOLYUME's
*empty-query* recents tab does this but a *typed* search does not (both flow docs).
Both let you batch-log a whole meal (Multi-Add) and auto-repeat staples; VOLYUME
has the multi-add "plate" but no scheduled-repeat. And both expose a kcal/kJ unit
toggle that a UK/EU audience expects — the **top pick in BOTH settings docs** —
which VOLYUME lacks despite already parsing kJ.

**The smallest set of SAFE changes that closes the perception.** Four items, all
reusing merged plumbing or one store pref: (1) a **Pro-gated quick-log surface on
the Home/Train tab** (today's recents + remaining), so the daily loop drops from 3
taps to 2 without forcing a diary-home restructure; (2) **recents/favourites-weighted
live search**, so typing surfaces your own foods first; (3) the **kcal/kJ display
toggle**, a pure formatter over one new pref; and (4) **per-meal logging reminders
kept streak-free**. These four close the felt gap without touching ED-safety, the
Free-vs-Pro line, the no-AI boundary, or the deliberate Train-first home identity.
Everything deeper (micronutrients, diary-as-home, the home calorie widget, per-macro
colour) is correctly GATED and waits for a founder decision.

---

## 2. Cross-cutting themes (the root causes)

Five root causes explain almost every distinct gap. Fixing the root closes a cluster.

- **T1 — The food diary is not the landing surface.** VOLYUME opens on Train; the
  diary is a separate Pro tab. Both competitors open on the diary with `+` and
  "Remaining" always visible. *Root cause behind:* the Home-has-no-log-entry gap,
  the "see-today + log co-located" gap, the off-app/widget gap.
  (Both flow docs; deliberate Train-first identity makes the full restructure GATED,
  but a Home quick-log surface is SAFE.)

- **T2 — Live search isn't personal-history-weighted.** Empty-query recents work,
  but a *typed* query ignores the user's own logged foods. Competitors sort
  recents/favourites-first always, so "search" rarely needs typing.
  (Both flow docs; SAFE — pure ranking work.)

- **T3 — Logging power-ups are missing the "set-and-forget" tier.** VOLYUME has
  multi-add plate + copy-yesterday, but no **scheduled/repeat items** (drop staples
  to 0 daily taps) and no **recipe URL import** (removes the slowest manual path).
  Raised by both apps' flow + features docs. (SAFE.)

- **T4 — Display/units/personalisation breadth is thinner.** No kcal/kJ toggle (top
  pick in BOTH settings docs), no custom/renameable meal names, fixed meals-per-day
  default, no per-meal reminders, no choose-which-nutrients-shown, no per-day macro
  targets. Individually small, collectively "less configurable than theirs." (SAFE,
  except micronutrient selection which is GATED via #16.)

- **T5 — The competitors' "depth" and "stickiness" levers are the ones VOLYUME
  deliberately refuses.** Micronutrient panel (Cronometer's moat), streaks/completed-day
  highlighting, fasting timers, AI photo/voice logging, the home calorie widget,
  third-party device bridges, social/friends/diary-sharing. These are GATED or
  BLOCKED by design, and several (streaks, fasting, AI, per-macro colour) are
  *anti-features* for the at-risk subgroup — protect the refusal, advertise it.

---

## 3. The deduplicated ranked backlog

One row per distinct gap. SAFE items sorted impact-then-effort at the top, then
GATED, then BLOCKED. "App(s)" = where the gap was observed; corroboration by both
apps or multiple docs = higher confidence. "Reuses plumbing?" flags items that ride
the just-merged food-ease rails (`quickLogRelog`/`RELOG_TABS`, `ServingPicker`,
`QuickAddSheet`, `frequents.js`, `searchTabs.js`, `waterfall.js`).

| # | Gap | App(s) | Area | Impact | Effort | Tag | Source doc(s) | Reuses plumbing? |
|---|-----|--------|------|--------|--------|-----|---------------|------------------|
| 1 | **Pro-gated quick-log surface on Home/Train tab** (today's recents + remaining, so log is on the landing screen) | MFP + Cron | Flow | **High** | S–M | **SAFE** | mfp-flow §5.1/§6; cron-flow §5.1/§6 | **Yes** — `quickLogRelog`, `FoodSearch` `initialTab:'recents'` |
| 2 | **Recents/favourites-weighted live search** (typed query surfaces user's own foods first) | MFP + Cron | Flow | **High** | S | **SAFE** | mfp-flow §2/§5.2; cron-flow §2/§5.2/§6 | **Yes** — `FoodSearchScreen`, `waterfall.js`, `frequents.js` |
| 3 | **kcal ⇄ kJ energy-unit display toggle** (app-wide formatter, free, EU-correct) | MFP + Cron | Settings | **High** | S | **SAFE** | mfp-settings §1A/§5; cron-settings §1A/§5 | Partial — kJ already parsed in `ocrParser.js` |
| 4 | **Multi-Add / batch-log several recents at once** | MFP + Cron | Flow | Med | S | **SAFE** | mfp-flow §2; cron-flow §2 | **Yes** — already shipped as "plate" (multi-select); verify parity on recents tab |
| 5 | **Scheduled / repeat items** (staples auto-appear, one-tap confirm, 0 daily taps) | MFP + Cron | Flow/Features | Med | M | **SAFE** *(keep adherence-neutral, never a streak)* | mfp-flow §5.4; cron-feat §3.2; cron-gold §3.2; cron-settings §1H | Partial — planned-meal confirm-banner pattern exists |
| 6 | **Recipe URL import** (parse schema.org/Recipe JSON-LD → ingredients, deterministic, on-device) | MFP + Cron | Features | Med | M | **SAFE** *(on-device parse only; remote parser → BLOCKED)* | mfp-feat §3.4; cron-feat §3.1/§5; cron-gold §1 | Yes — feeds `RecipeBuilderScreen` → waterfall resolution |
| 7 | **Per-meal / per-group logging reminders** (Breakfast/Meal N at time X) | MFP + Cron | Settings | Med | S–M | **SAFE** *(no "logging streak" copy)* | mfp-settings §1D/§3.4; cron-settings §1H/§3.2 | No — extends `NotificationSettingsScreen` infra |
| 8 | **CSV + PDF report ("share with coach/GP")** | MFP + Cron | Premium/Features | Med | M | **SAFE** | mfp-premium §3.2; cron-gold §3.1/§5; cron-feat §1.9/§3.6 | Partial — CSV exists (`csvExport.js`); add PDF |
| 9 | **Progress photos / snapshots** (local/EU only, never gamified) | MFP + Cron | Features | Med | M | **SAFE** *(mild body-image ED-sensitivity → calm-mode guard)* | mfp-feat §3.1/§5; cron-feat §1.13/§3.7 | No — sits beside `BodyMetricsScreen` |
| 10 | **Diary entry timestamps + sort-by-time** | MFP + Cron | Features/Settings | Med | S | **SAFE** *(but timeline food logging is the GATED framing — ship as display-only)* | cron-feat §1.1/§3.4; mfp-settings §1C; mfp-premium §1d | Partial |
| 11 | **Renameable / custom meal names** | MFP + Cron | Settings | Med | S | **SAFE** | mfp-settings §1C/§3.2; mfp-feat §3.7; cron-settings §1E | No — label-override map over `mealSlots.js` |
| 12 | **Configurable meals-per-day** (default 4 hard-coded; physique users run 4–8) | — (VOLYUME-internal) | Settings | Med | S | **SAFE** | mfp-settings §3.3 | No — `NutritionTargetsScreen` has 3–6; lift cap, expose |
| 13 | **Per-day-of-week macro/calorie targets + per-meal target editor** | MFP + Cron | Premium/Settings | Med | M | **SAFE** *(every per-day target MUST clamp to engine floors)* | mfp-premium §3.1/§5; mfp-feat §3.6; cron-feat §3.3; cron-settings §3.5 | No — extends `nutritionEngine` target path |
| 14 | **Grocery list framing surfaced from meal plan** | MFP | Premium | Low–Med | S | **SAFE** *(skip Instacart/Walmart commerce)* | mfp-premium §3.4 | Yes — `groceryList.js` exists; surface it (largely already have) |
| 15 | **Consolidate scattered add-food entry points into one `+` menu** | Cron | Flow/UI | Med | S | **SAFE** | cron-flow §5.5 | Yes — pure IA over existing add affordances |
| 16 | **Choose-which-nutrients-shown (highlighted)** for surfaced macros (fibre/sodium/sugar already in schema) | Cron | Settings | Low–Med | S | **SAFE** *(macro-level only; micronutrient selection → GATED #16)* | cron-settings §1D/§3.3; cron-feat §1.11 | No |
| 17 | **Configurable Home/dashboard cards** (excluding any streak card) | MFP + Cron | Features | Low–Med | M | **SAFE** | cron-feat §1.18/§3.5; mfp-feat §3 | No |
| 18 | **Nutrition reports: per-nutrient → contributing-foods → trend, arbitrary date range** | MFP + Cron | Features/Premium | Low–Med | M | **SAFE** *(macro-level; full micronutrient version → GATED #16)* | mfp-feat §3.3; cron-gold §3.4; cron-feat §1.8 | Partial — extends `FoodInsightsScreen` |
| 19 | **Food-card radius bump (14→16) + active-chip `primaryBg` tonal fill** | MFP | UI | Low | S | **SAFE** | mfp-ui §3 D1/D6/§5 | Yes — `theme.js`, `FoodDetailSheet.js` |
| 20 | **Macro/calorie targets editable from Settings** (link existing goal flow, no raw bypass) | MFP | Settings | Low | S | **SAFE** *(must route through ED gates)* | mfp-settings §3.5 | No |
| 21 | **kcal centre numeral scales with Larger-Text accessibility** | MFP | UI | Low | S | **SAFE** | mfp-ui §3 D5 | Yes — `MacroRings.js` |
| 22 | **Height/distance unit choice (cm/in, km/mi)** | MFP + Cron | Settings | Low | S | **SAFE** *(UK-metric by design; low value)* | mfp-settings §3.6; cron-settings §1A | No |
| 23 | **SSO on first onboarding screen (Google/Apple)** | MFP + Cron | Flow | Low | M | **SAFE** *(verify VOLYUME auth before assuming a gap)* | mfp-flow §5.6; cron-flow §1 | No |
| 24 | **Micronutrient / NRV panel** (~60–82 nutrients vs USDA DRIs, balance gauge) — **Cronometer's true moat** | Cron + MFP | Nutrition-depth | High *(to Cron users)* | **L** | **GATED (#16)** | cron-nutrition-depth (whole); cron-feat §3.8; mfp-feat §3.11 | No — needs data source + schema + NRV table |
| 25 | **Nutrition Scores (8) + Nutrient Balance** | Cron | Nutrition-depth | Med | L | **GATED (#16-dependent; also borderline gamification)** | cron-feat §3.9; cron-gold §3.9; cron-nutrition-depth §1.5/§4 | No |
| 26 | **The Oracle (best food sources per nutrient, deterministic)** | Cron | Nutrition-depth | Med | L | **GATED (#16-dependent)** | cron-feat §3.10; cron-gold §3.8; cron-nutrition-depth §1.5 | No |
| 27 | **Home-screen "Remaining" calorie widget** | Cron + MFP | Flow/Features | Med | M | **GATED** *(deficit-salience on home screen = ED-safety; snapshot writer exists)* | cron-flow §3/§5.3; cron-gold §3.5; mfp-feat §3.12 | Partial — `widgets/writer` (COMP-019) |
| 28 | **Fasting timer / time-restricted-eating** | MFP + Cron | Features | Med | M | **GATED** *(ED conflict; calorie banking is the sanctioned adjacency)* | mfp-feat §3.10; cron-feat §3.11; cron-gold §3.10 | No |
| 29 | **Custom + medical biometrics** (glucose, ketones, BP, HRV, sleep, lipid panel, cycle, custom name/unit) | Cron + MFP | Features/Settings | Med | L | **GATED** *(special-category data; ED-adjacent obsessive-tracking risk)* | cron-feat §1.7/§3.12; cron-settings §1F/§3.7; cron-nutrition-depth §1.4/§4; mfp-feat §3.16 | No |
| 30 | **Daily food-logging streak / completed-day highlighting / gamification** | MFP + Cron | Features | — | — | **GATED (anti-feature)** *(violates no-streak ED rule; weekly consistency is the compliant substitute)* | mfp-feat §3.9; mfp-flow §5.8; cron-feat §1.19; cron-gold §3.12 | No — **do not build** |
| 31 | **Meal-time "you haven't logged" reactivation nudges / affirmation interstitials** | MFP | Flow | — | — | **GATED (anti-feature)** *(adherence-pressure; collides with no-guilt)* | mfp-flow §5.7/§5.9; mfp-premium §1f | No — **do not build** |
| 32 | **Per-macro colour (carb/protein/fat distinct hues) + remaining-as-hero** | MFP | UI | Med | S | **GATED** *(overrides standing founder no-shame mono-amber design decision)* | mfp-ui §3 D2/D3/§5 | Yes (but gated) |
| 33 | **Net-carbs mode / nutrient-dashboard customisation (engine-touching)** | MFP | Settings | Low | M | **GATED** *(touches coaching dashboard; deterministic-coaching review)* | mfp-settings §3.7/§3.8; mfp-feat §C | No |
| 34 | **Custom fixed-energy override** (set your own kcal target) | Cron | Settings | Low | M | **GATED** *(must clamp to floors; bypass = ED-safety hole)* | cron-settings §3.6; cron-nutrition-depth §1.3 | No |
| 35 | **Diary password / app lock (PIN/biometric)** | MFP | Settings | Low | M | **GATED** *(security surface; scope deliberately)* | mfp-settings §3.9 | No |
| 36 | **AI meal-photo scan + AI/voice logging** | MFP + Cron | Features | — | — | **BLOCKED** *(AI boundary + photo/audio off-device to non-EU = triple violation)* | mfp-feat §3.13; mfp-premium §3.8/§3.9; cron-feat §1.13; cron-flow §5.4; cron-gold §3.13/§3.14 | No — **do not build; advertise against** |
| 37 | **Connected 3rd-party services** (Garmin, Fitbit, Dexcom/CGM, Oura, Withings, grocery commerce) | Cron + MFP | Settings | — | — | **BLOCKED** *(OAuth bridges export PII off-device; Apple Health/Health Connect are the sanctioned equivalents)* | cron-settings §1M/§3.10; mfp-feat §3.15; mfp-settings §3.11 | No |
| 38 | **Friends / community / forum / DMs / diary sharing / share custom foods** | MFP + Cron | Features/Settings | — | — | **BLOCKED** *(social graph + content = PII + moderation; no-shame stance; partner is the compliant answer)* | mfp-feat §3.8; mfp-settings §3.10; cron-feat §1.6/§3.14; cron-gold §3 | No |
| 39 | **Medication / GLP-1 + side-effects tracking** | MFP | Features | — | — | **BLOCKED/GATED** *(Article-9 special-category, clinical framing, large scope)* | mfp-feat §3.14 | No |
| 40 | **Multi-profile / household; professional-client (B2B dietitian) tier** | MFP + Cron | Premium | Low | L | **GATED** *(conflicts with offline single-user model; off-strategy)* | mfp-premium §1d/§3.10; cron-feat §1.20; cron-gold §1 | No |

---

## 4. Recommended SAFE build sequence

Ordered for daily-ease leverage first, leading with items that reuse the merged
food-ease plumbing (`quickLogRelog`/`RELOG_TABS`, `ServingPicker`, `QuickAddSheet`,
`frequents.js`, `searchTabs.js`, `waterfall.js`). Each line: rationale + VOLYUME
files it would touch. Per CLAUDE.md, each item still gets a plan-first + go before
code, and a fresh-eyes review agent after.

1. **#2 Recents/favourites-weighted live search.** *Highest leverage-per-effort:
   it is the actual reason both competitors feel easy (your food is the first row,
   no typing) and the rails already exist.* Touches `src/screens/FoodSearchScreen.js`,
   `src/lib/food/waterfall.js`, `src/lib/food/frequents.js`, `src/lib/food/searchTabs.js`.

2. **#1 Pro-gated Home quick-log surface.** *The single biggest structural ease gap
   (both flow docs): puts the log action on the landing screen and drops the loop to
   2 taps without a diary-home restructure.* Touches `src/screens/HomeScreen.js`
   (new Pro-gated card), reuses `FoodSearchScreen.quickLogRelog` / `initialTab:'recents'`,
   `src/lib/proGate.js` for gating. Guardrail: hidden for free users; one-tap preserves
   the Undo toast + 1–5000 g bound.

3. **#3 kcal/kJ display toggle.** *Top pick in BOTH settings docs; UK/EU users read
   labels in kJ; data path already exists.* Touches `src/store/useAppStore.js` (new
   `energyUnit` pref, default `kcal`), `src/screens/SettingsDisplayScreen.js` (segmented
   control by Appearance), a new `formatEnergy()` helper routed through every kcal
   render site (e.g. `MacroRings.js`, `DiaryScreen.js`). Invariant test: engine
   floor/gate inputs stay in kcal regardless of the toggle.

4. **#15 Consolidate add-food entry points into one `+` menu.** *Pure IA; reduces
   surface area to learn; complements #1/#2.* Touches `src/screens/DiaryScreen.js`
   (unify meal-card `+`, scan FAB, quick-add, copy icons).

5. **#4 Multi-Add parity check.** *Largely shipped as the "plate"; confirm a whole
   meal of recents logs in ~1 tap/food + 1 from the recents tab, close any gap.*
   Touches `src/screens/FoodSearchScreen.js`.

6. **#7 Per-meal logging reminders (streak-free).** *Closes the reminder gap both
   settings docs raised, within the local-notification infra, without any "you
   haven't logged" pressure.* Touches `src/screens/NotificationSettingsScreen.js`,
   `src/lib/notifications/*`. Copy review: convenience only, no streak/guilt.

7. **#11 Renameable meal names + #12 configurable meals-per-day.** *Small
   personalisation wins physique users expect.* Touches `src/lib/food/mealSlots.js`
   (label-override map), `src/screens/NutritionTargetsScreen.js` (lift the 3–6 cap),
   `src/store/useAppStore.js`.

8. **#5 Scheduled/repeat items.** *Drops staples to 0 daily taps — a genuine ease
   win — framed strictly as convenience, never a streak.* Touches `src/screens/DiaryScreen.js`,
   `src/lib/food/*` (new repeat-template store), reuses the planned-meal confirm-banner pattern.

9. **#6 Recipe URL import (on-device JSON-LD parse).** *Removes the slowest manual
   path; deterministic, no AI.* Touches `src/screens/RecipeBuilderScreen.js`, a new
   `src/lib/food/recipeImport.js`, feeds existing ingredient resolution → `waterfall.js`.
   Hard constraint: parse on-device; degrade gracefully offline; no remote parser.

10. **#8 PDF report + #18 macro-level nutrition reports.** *Pairs with Precision
    Coaching's written weekly rationale — a "share with your coach/GP" hook Cronometer
    can't match.* Touches `src/lib/food/csvExport.js` (already CSV), new PDF generator,
    `src/screens/FoodInsightsScreen.js`.

11. **#9 Progress photos / snapshots.** *Closes a credibility gap for a physique app;
    local/EU only.* Touches a new screen beside `src/screens/BodyMetricsScreen.js`;
    apply the calm-mode guard pattern. (Slightly larger; sequence after the daily-ease wins.)

12. **#19/#21 UI polish (radius 14→16, active-chip tonal fill, kcal numeral scales
    with Larger-Text).** *Low-risk premium-feel wins; reversible; assert against
    `theme.test.js`.* Touches `src/styles/theme.js`, `src/components/food/FoodDetailSheet.js`,
    `src/components/food/MacroRings.js`.

13. **#13 Per-day-of-week macro/calorie targets.** *Real Pro-parity + bodybuilding
    value (training/rest splits, refeeds), deepens the coaching moat.* Touches
    `src/lib/nutritionEngine.js` target path + a new editor screen. **Hard constraint:
    every per-day target clamps to the existing sex/FFM floors and rapid-loss gate;
    invariant tests against the real engine.** (Larger; do after the quick wins.)

*Deferred-SAFE-but-low-value:* #10 timestamps (ship display-only, mindful that
timeline food logging is the GATED framing), #14 grocery-list surfacing (largely
already have via `groceryList.js`), #16 highlighted-macros, #17 dashboard cards,
#20 goal-from-settings link, #22 height/distance units, #23 SSO (verify auth first).

---

## 5. Founder decisions required (GATED)

Each is a crisp decision with options and the safety/privacy consideration. Per
CLAUDE.md these must NOT be started without the structured founder decision; ask
multi-choice and keep working on SAFE items meanwhile.

### D1 — Micronutrients / NRV panel (#24) — *the fullest treatment; Cronometer's moat*
**What it is.** Track ~60–82 nutrients per food (vitamins, minerals, amino acids,
fatty-acid breakdown, cholesterol) against personalised reference intakes, with a
"nutrient balance" gauge — the single thing Cronometer does that VOLYUME cannot.
Today VOLYUME surfaces 5 food values (kcal/P/C/F/fibre; sodium/sugar stored-but-dormant)
and 0 micronutrients (`nutrition-depth §2`).
**Why it's gated.** It is Ultimate-Audit item #16, explicitly decision-gated in
CLAUDE.md, and ED-safety-adjacent. It is also a **data-dependency decision** (never
add dependencies/contracts without asking): the moat is the *licensed NCCDB*
(Univ. of Minnesota, paid licence + recurring cost); the free alternative, USDA
FoodData Central, carries most of the panel but has weak UK/branded coverage.
**Options.**
- (a) **Do not build** — keep the deterministic-coaching identity; advertise the
  safety/coaching moat instead of competing on measurement depth.
- (b) **USDA-FDC base, Pro-gated, macro-style display** — free data, no licence;
  accept weak UK branded coverage; ship a per-food nutrient panel + balance view.
- (c) **Licence NCCDB** — research-grade, full panel, UK-weak too but richer;
  paid contract + recurring cost; founder dependency sign-off required.
**ED-safety/privacy considerations (must be designed in, not bolted on).** Scoring
must be **adherence-neutral** — no red/green "you scored 62/100", no
streaks-of-perfection (`nutrition-depth §4`). **Max/UL targets are the risky half**:
min/RDA nudges *toward* eating, max/"do not exceed" nudges *away* — a restriction-prone
user can weaponise them; any max-target UI must not become a restriction surface.
Calorie/FFM floors stay senior — no nutrient or score goal may justify sub-floor
intake. EU angle: choose **US DRI vs EU NRV** reference basis (VOLYUME is British-English/EU).
Schema must be a normalised `food_nutrients` long table in local SQLite (offline-first),
not 60 wide columns or live Supabase queries. No AI — the Oracle/scoring are
deterministic ranking/percent maths. **Note:** #25 (Nutrition Scores) and #26 (Oracle)
are entirely **downstream of this decision** — they cannot exist without the panel.

### D2 — Home-screen "Remaining" calorie widget (#27)
**What it is.** A native home-screen widget showing remaining kcal/targets, like
Cronometer's Glance widget. The snapshot *writer* already exists (`widgets/writer`,
COMP-019); the native surface is the gated piece.
**Why it's gated.** A remaining-calorie/deficit number persistently on the OS home
screen is exactly the deficit-salience pattern the adherence-neutral brief guards
against; it is also a Pro nutrition surface; and Expo-managed native-widget feasibility
must be confirmed.
**Options.** (a) don't build; (b) a *neutral* widget (e.g. "logged today"
completeness without a remaining/deficit headline); (c) full remaining widget,
Pro-gated, with calm-mode suppression. **Consideration:** if built, no red/over
colouring, respect calm mode, Pro-only.

### D3 — Per-day macro/calorie targets & custom energy override (#13 SAFE vs #34 GATED)
**What it is.** Per-weekday macro/calorie templates (#13, tagged SAFE because every
target still flows through the floors) vs a *fixed-energy override* (#34, GATED).
**Why the override is gated.** A raw "set your own kcal" field is the dangerous one:
it can set sub-floor (below 1500/1200) and bypass rapid-loss/max-safe-loss gates.
**Decision needed:** confirm #13 proceeds *only* with a floor-clamp wired to
`nutritionEngine` + invariant tests; decide whether #34 is ever offered, and if so
only as a clamped value that cannot go below floors.

### D4 — Fasting timer (#28)
**What it is.** A fasting/TRE timer + schedule, as both apps ship.
**Why it's gated.** Fasting windows can drive restriction → ED conflict; CLAUDE.md
names it blocked/decision-gated. Calorie banking (item 17, already built) is the
sanctioned adjacency. **Options:** (a) don't build (recommended posture); (b) a
strictly-neutral eating-window note with no countdown/streak — needs wellbeing review.

### D5 — Custom / medical biometrics (#29)
**What it is.** Logging glucose, ketones, BP, HRV, sleep, lipid panel, cycle, and
user-defined custom biometrics.
**Why it's gated.** Special-category (Article-9) health data; high-frequency
biometric logging is ED-adjacent (obsessive measuring/orthorexia). `edPatternDetector`
would need to extend to any new high-frequency metric. **Options:** (a) don't build;
(b) read-only sleep/HR *card* via Apple Health/Health Connect (on-device, EU-safe)
without a logging UI; (c) full subsystem (founder + wellbeing sign-off).

### D6 — Per-macro colour + remaining-as-hero (#32)
**What it is.** Give carbs/protein/fat distinct hues and centre the *remaining*
number, as MFP does.
**Why it's gated.** It overrides a **standing founder design decision** (2026-05-29):
adherence-neutral mono-amber, no macro coloured good/bad. **Options:** (a) keep the
no-shame palette (recommended; it is a genuine differentiator); (b) differentiate by
*non-colour* only (weight/position/label, already used for protein); (c) override the
decision (founder only). Per-macro hue is **not** a safe change.

### D7 — Diary password / app lock (#35) & net-carbs/dashboard-customisation (#33)
Lower-stakes gated items: a PIN/biometric diary lock is privacy-positive but a
security surface to scope deliberately; net-carbs mode / nutrient-dashboard
customisation touch the coaching dashboard and need a deterministic-coaching review.
Decide whether either enters a sprint at all.

**Do-not-build (BLOCKED / anti-feature) — listed so they're never mistaken for backlog:**
AI photo/voice logging (#36), 3rd-party device bridges + grocery commerce (#37),
friends/community/diary-sharing (#38), medication/GLP-1 (#39), streaks/completed-day
highlighting (#30), reactivation/"you haven't logged" nudges (#31). VOLYUME's
compliant answers already exist: privacy-first training partner, weekly consistency
(ED-safe), Apple Health/Health Connect on-device, deterministic coaching.

---

## 6. VOLYUME's confirmed moat (protect + advertise)

Corroborated across the docs as things VOLYUME **already beats both apps on** — do
not rebuild, do protect, and lead the marketing with them:

- **Deterministic Precision Coaching.** Weekly check-in re-plans training, calories
  and macros with a *written reason* per change. **Neither MFP nor Cronometer has any
  coaching loop** — they are passive trackers; MFP's "intelligence" is AI scan + nudges,
  Cronometer's Oracle just lists foods. (all four "where-we-beat" sections)
- **Real strength-programming engine — and it's FREE.** Mesocycles/periodisation,
  set/rep/RIR, rest timer with lock-screen keep-alive + Live Activity, volume heatmap,
  lift progression, strength standards. MFP only has "log a routine" and gates even
  that behind Premium. (mfp-features §4; mfp-premium §4)
- **ED-safety system, tier-blind.** Sex floors 1500/1200 kcal, FFM energy floor
  (30 kcal/kg FFM, RED-S), 1.5%/wk rapid-loss hard cap, ED-pattern detector, Beat UK
  signposting, calm mode. **Both competitors will let a user chase a 900 kcal target**;
  Cronometer ships an unguarded fasting timer and completed-day streaks, MFP ships a
  pressure-nudge loop (`premium_if_you_fail`). This is a duty-of-care differentiator.
  (every nutrition/premium "where-we-beat" section)
- **Meal-plan generator + automatic grocery list.** VOLYUME-exclusive — Cronometer
  has recipes/meals but **no plan-a-week assembler and no grocery list**; MFP gates a
  grocery-commerce engine behind Premium-Plus. (cron-feat §2/§4; mfp-premium §3.4)
- **Calorie banking** (plan a bigger day, weekly-total-preserving, floor-safe) —
  **no competitor equivalent.** (cron-feat §2/§4)
- **Multi-add "plate", copy-yesterday/previous-day, bulk select** — already shipped,
  parity with both apps' batch tools. (cron-feat §2)
- **9 body circumferences + body-fat % (source-aware) + EWMA weight trend** — richer
  than MFP's measurements and Cronometer's waist-only chart for the physique audience.
  (cron-feat §2; mfp-feat §4)
- **Data ownership: JSON full backup + restore + pre-update snapshots + CSV, no
  account required, fully offline.** MFP/Cronometer export is server-side/cloud-account-bound.
  (mfp-settings §4; cron-settings §4)
- **Label OCR food capture** (2-step front + panel, on-device). (cron-feat §2)
- **Deeper in-app accessibility than either app:** Larger text, Higher contrast,
  Colour-blind-safe (Okabe-Ito) palette, Reduce motion — all FREE, with WCAG ratios
  *computed and asserted in tests*. MFP/Cronometer expose only a bare light/dark toggle.
  (mfp-settings §4; mfp-ui §4; cron-settings §4)
- **Adherence-neutral, no-shame, no-streak UX + charcoal-not-black warm elevation
  palette.** A deliberate, safety-led design that the competitors' streak/colour/nudge
  engines actively violate. (mfp-ui §4; mfp-features §4)
- **No ads, ever, for everyone.** MFP free is ad-supported and Cronometer charges
  Gold to remove ads — VOLYUME shows none to anyone. (mfp-premium §4; cron-gold §4)
- **Offline-first, EU-resident, no-PII, privacy-first training partner** instead of a
  social graph. The GDPR-clean answer to friends/feed/messages. (all "where-we-beat")

---

*Synthesised 2026-06-29 from the ten competitive-mastery docs in this directory.
Every backlog row and decision traces to a cited source section. SAFE items are
buildable after the standard plan-first step; GATED items await the structured
founder decision; BLOCKED items are not to be built.*

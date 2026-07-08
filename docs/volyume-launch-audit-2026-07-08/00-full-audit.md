<!-- Provenance: verbatim synthesis output produced in the Claude session on 2026-07-08
     (session 541d0237), reconstructed from the session transcript on 2026-07-08 because
     it had not been written to a file at the time. Content is unedited from source. -->

# Volyume world-class audit and upgrade plan

## 1. Executive summary

**Direct verdict: this is a polish-and-connect job, not a rebuild.** The audit prompt assumed a possibly-stale, possibly-fragile product. The code says otherwise.

**Already elite (evidence-backed):**
- The deterministic coach safety stack — layered, tier-blind, fail-closed, every guard traceable to a specific past audit fix, pinned by a 12-week simulation test (Scout 4).
- The food-data architecture — UK-first five-source waterfall, source chips, sanity gates before engine intake, self-healing sync, allow-listed telemetry with drift tests (Scouts 2, 7).
- The meal-plan solver — deterministic, floor-respecting, per-meal-balanced, with honest diagnosis receipts and stale-name fixes already regression-guarded (Scout 3).
- Design-system and copy governance — near-total token discipline, consolidated components, anti-shame language enforced at source level with banned-word guards; lint clean (Scout 6).

**Close but not yet elite:**
- The **adherence loop**: meal plan and diary appear decoupled — no evidence logging marks a planned meal eaten (Scout 3). The visual language for it already exists (planned-vs-eaten faded arcs in MacroRings, Scout 2), so this is wiring, not invention.
- The **connected narrative**: train → eat → weigh → coach adjusts is real in the data layer (shared EWMA/TDEE functions) but fragmented across Home banners, Analytics cards, Profile tiles and Check-in — no single legible thread (Scout 5).
- **Trust edge-cases**: free-text search can't distinguish "not found" from "offline"; no user path to correct bad shared food data; cached network foods never re-validate (Scout 7).

**What prevents world-class today** is not missing features or weak engineering — it is connective tissue and a handful of trust/evidence seams. No rebuild anywhere. Strengthen trust surfaces, close the adherence loop, and make the coaching story readable in one place.

## 2. Current product picture from code

**IA/navigation** (Scout 1): Five tabs — **Today** (HomeTab), **Train** (PlansTab), **Nutrition** (DiaryTab), **Progress** (ProgressTab), **Coach** (ProfileTab). Note: *the Diary tab is already labelled "Nutrition" in code* (`RootNavigator.js:547-554`). The "Coach" tab actually roots on the You/Profile stack (You, AthleteProfile, 8× Settings, subscription, coach output, check-in) — a semantic spread under one label. Cross-tab navigation goes through one sanctioned guard-tested helper; duplicate route registrations are deliberate and documented; only 4 deep-link paths exist.

**Nutrition/diary** (Scout 2): Meal-ladder slots plus peri-workout slots; five-tab food search (Recent/Suggested/Favourites/Frequents/Custom) with personal-history re-ranking; barcode via VisionCamera; on-device MLKit label OCR with confirm-before-save; custom foods, saved meals, recipes with URL import; remaining-hero MacroRings with adherence-neutral colours and planned-vs-eaten distinction; water tracking; rich date navigation (chevrons, picker, swipe, Today pill, copy-yesterday); per-day-of-week targets + calorie banking + macro-cycling + refeeds composed into one effective-target resolver; kcal/kJ consistent. Sodium/sugar stored in schema but deliberately withheld (MN-1 founder-gated).

**Meal planning** (Scout 3): Deterministic day/week assembly (seeded, best-of-12 local search), training/rest calorie cycling that disables itself near safety floors, per-meal macro balance solver, plain-English plan diagnosis, whole-meal swaps with style-diverse alternatives, gram-solved ingredient swaps that refresh meal names, exclusions, pinning, vegan cascade, shopping list.

**Coach/rules/check-in** (Scout 4): `runWeeklyCoach` pure with injectable clock; data-confidence gating; recovery×performance autoregulation; calorie changes gated by consecutive off-target weeks + cooldown, sized by adaptive TDEE damped 50%; rapid-loss override upward-only; FFM floor and sex calorie floors enforced at two independent layers; ED detector requiring positive-evidence clearance; refeeds/diet breaks/macro cycles exist and are **never auto-applied**; all safety tier-blind. The new progress-scan feeds coaching as a **note only** — `affectsTargets: false` hard-coded and guard-tested.

**Progress/profile/training connections** (Scout 5): Analytics has EWMA weight trend, consistency, tonnage, recaps; Home has readiness chips and deload banners; AthleteProfile has stat tiles, a freshness model, and a quality-gated progress-scan "Volyume Score" with confidence tiers and explicit withhold reasons. Check-in verdicts derive from real logged data, user-overridable.

**Data/trust infra** (Scout 7): Waterfall per a locked strategy doc, weekly snapshot refresh via CI, cache promotion with dedup, verified-first barcode ordering, sanity checks before coaching intake, registry-driven sync conflicts, allow-listed telemetry, 530 test files (46 food, 27 sync).

**Premium UX state** (Scout 6): Token discipline near-total on sampled high-traffic screens; consolidated canonical components; EmptyState in 24/82 screens; two loading idioms coexisting; lint clean; anti-shame copy enforced at source.

## 3. Competitor benchmark by product

| Competitor | Best at | Volyume should learn | Should NOT copy | Relevance |
|---|---|---|---|---|
| **MacroFactor** | Continuous data-driven TDEE recalculation; zero-gamification logging-first UI | The "your target moved because your data said so" transparency loop — Volyume's engine already does this; the *presentation* should match it | Jargon-assuming onboarding | Highest — validates the deterministic-adaptive approach as premium-viable |
| **Cronometer** | Verified-source data depth (~30/30 accuracy vs USDA reference) | Verified-vs-crowd-sourced distinction (source chips exist; extend with verification signals) | Clinical 84-nutrient density by default | High — directly informs the MN-1 decision: tiered, collapsed, opt-in |
| **Carbon Diet Coach** | Expert-authored weekly coaching cadence for physique/contest prep | Frame weekly adjustment as a credible coach cadence, not a dashboard number | Thin food database forcing constant custom foods | Very high — the direct competitor archetype |
| **RP Diet** | Training-day-aware meal timing tied to periodisation | Link meal composition to training schedule (peri-workout slots + dayVariantTargets are the foundations) | Rigid food-group prescriptions with no flexible path — its top complaint | High — cautionary tale on rigidity; Volyume's swaps already avoid it |
| **MyFitnessPal** | Database breadth (14M+) | Breadth as a baseline expectation only | Its 2026 redesign: more taps, hidden per-meal calories, cluttered nav; crowd-sourced-only barcode data | Negative-space lesson: never regress logging speed |
| **Lose It** | Frictionless logging, fast onboarding | Keep core logging cheap and fast to build trust | Its barcode paywalling bait-and-switch | Moderate — logging-speed benchmark |
| **NutraCheck** | UK-localised database (Tesco/Greggs/Nando's), 4.9 Trustpilot | UK-first curation is a real trust differentiator — validates the CoFID/OFF-UK waterfall | Dated UI, no free tier, fiddly target setup | High for UK food strategy |
| **Trainerize (nutrition)** | Compliance visibility on a training platform | Little — mainly a caution | Nutrition as a bolted-on, separately paywalled add-on | Anti-pattern: Volyume's unified product is the advantage |
| **TrueCoach (nutrition)** | Simplicity for programming-first coaches | Nothing structural | Marketing a "meal plan generator" that is a static template — credibility destruction | Anti-pattern: Volyume's engine is real; never oversell it |
| **Eat This Much class** | Auto plan → grocery-list pipeline | Per-meal customisability in generated plans; shoppable bias (shopping list already exists) | Recipe variety so wide the grocery list is unmanageable | Medium — validates deterministic plan generation |

**Five durable patterns that matter most:** adaptive transparent target-setting; verified-source data trust; frictionless logging as a non-negotiable floor; training+nutrition as one product; flexibility within structure.
**Three traps:** redesign-driven logging friction; feature vaporware/overselling; nutrition as a second-class paywalled bolt-on.

## 4. What Volyume already does well

Polish, don't rebuild: the safety-gate stack (every layer traces to a fixed bug); the food waterfall + source chips + sanity gates; the meal-plan solver with receipts and anti-clone swap pools; remaining-hero adherence-neutral MacroRings with planned-vs-eaten distinction; personal-history search ranking; the effective-target composition (per-day offsets, banking, cycling, refeeds — Scout 2 judged this "arguably ahead of MacroFactor"); the progress-scan quality-gate/withhold-reason system; profileFreshness; NAV-5/cross-tab discipline; token/copy governance with source-level shame-language bans; OCR confirm-before-save; watermark sync; the 530-file test estate.

## 5. Gaps versus best-in-class (ranked by impact)

1. **Plan↔diary adherence loop not evidenced** (Scout 3: no `logToDiary` linkage found). The single biggest product gap — Carbon/RP users expect "did I eat my plan today" to be answerable in one glance. Severity: high. The faded-arc visual language already exists; wiring is the gap.
2. **Fragmented coaching narrative** (Scout 5): the connected story lives in shared data functions but not in one readable surface. Severity: high for the premium "coach-grade" feel.
3. **Trust edge-cases** (Scout 7): free-text search conflates offline with not-found (the barcode *scan* screen already distinguishes these; search does not); no bad-data correction path; no re-validation of promoted network rows; OCR low-confidence warning not confirmed visible at save.
4. **"Coach" tab label vs contents** (Scout 1): the tab labelled Coach roots on You/Settings. Severity: medium — a content-ordering fix, not an IA rebuild.
5. **Evidence holes to close before further coach work**: `weeklyCoach.js` lines 1042–1538 and the two coach screens unread in full (Scout 4); custom meal names after ingredient swap unverified (Scout 3); physique-score timestamp race untested (Scout 5).
6. **UX residue** (Scout 6): undocumented Skeleton-vs-spinner rule; HomeScreen touchable/label ratio (33/63) unverified for TalkBack.
7. **Deep-link coverage** (Scout 1): 4 paths for an 82-screen surface — limits notification re-engagement targeting.

## 6. Recommended IA

**Keep five tabs. Keep the names: Today · Train · Nutrition · Progress · Coach.**

- **Diary→Nutrition: already decided and shipped in code** (`RootNavigator.js:554`). No action; ratify it.
- The real decision is the fifth tab. **Keep the "Coach" label — fix the contents to earn it.** The root screen should lead with coaching: latest coach decision + next check-in + athlete profile freshness, with account/settings demoted to a header gear icon. Carbon proves the weekly-coach cadence is the premium anchor; a tab named Coach that opens on "You + Settings" undersells Volyume's strongest system. This is a root-screen content reorder, not navigation surgery.
- Do **not** deduplicate the intentional multi-stack route registrations, and do not touch NAV-5/`navigateCrossTab` (guard-tested, deliberate).
- Extend deep links opportunistically as notification needs arise; not a launch blocker.

## 7. Recommended Nutrition IA

Within the Nutrition tab:
1. **Daily log** — the root, exactly as now (meal ladder + peri-workout slots, remaining-hero rings).
2. **Plan** — one tap from the log; today's planned meals rendered *in* the diary as the faded planned layer, with "mark eaten" confirming a planned meal into the log (the adherence loop). Plan diagnosis receipts stay attached.
3. **Library** — one entry consolidating Foods (custom), Meals (saved), Recipes; five-tab search stays as the logging path, Library is the management path.
4. **Insights** — the existing rollups (%-of-calories split, protein g/kg, banking state); micronutrients only if/when MN-1 is decided, collapsed by default.
5. **Preferences** — exclusions/dislikes, per-day targets, energy unit, meal names, water target: one place.
6. **Coach-applied changes** — when a weekly change is applied, the diary header carries a quiet receipt chip ("Targets updated Mon · why") linking to the coach decision. The user should never wonder why targets moved.
7. **Check-in + athlete profile** stay in the Coach tab; Nutrition links to them contextually (e.g. check-in day banner), never duplicates them.

## 8. Ideal daily logging flow

1. **Open** → Today shows the morning-weight prompt (calm, once) and the day's nutrition cell; one tap to Nutrition.
2. **Log** → search opens on Recent with personal ranking; a repeat breakfast is two taps (existing). Barcode/OCR one tap away. Planned meals appear pre-staged as faded entries — "mark eaten" is one tap, edit-then-confirm for deviations.
3. **Review** → rings show remaining (hero) with planned-remainder arcs; protein g/kg subline; banking/refeed context inline where active.
4. **Adjust** → swap a planned meal (style-diverse alternatives), copy a previous day, or quick-add; per-food long-press for exclusions.
5. **Close** → no "day complete" ceremony, no scoring, no shame — the day simply rolls; check-in day surfaces its banner. Deviation from plan is information for the weekly coach, never a red mark. Target: every common action ≤2 taps from the diary; benchmark tap-counts against pre-redesign MFP/Lose It as an internal metric (Scout 8's suggestion — adopt).

## 9. Ideal food search / barcode / OCR / custom food flow

Keep the architecture; tighten trust:
- **Search**: five tabs + personal re-ranking stay. Add the offline-vs-not-found distinction to search empty states (barcode scan already has it): "Couldn't reach the food database — showing your saved foods" vs "No match — add it once, keep it forever."
- **Barcode**: strict first-hit-wins with verified-first ordering stays; on miss, one-tap handoff to label OCR (path exists).
- **OCR**: confirm-before-save stays mandatory; make low confidence *visible* at the confirm step ("Check these numbers — the label was hard to read"), not telemetry-only.
- **Custom foods**: keep the validated grams path; a custom food is a first-class citizen (already ranked into search).
- **Trust furniture**: source chip on every row (exists) + "last verified" date on the detail sheet; per-100g vs per-serving provenance always explicit.
- **Never**: MFP-style ads, sponsored rows, crowd-sourced-first results, or added taps in the core loop.

## 10. Ideal meal planning and swap flow

The solver is the asset; the loop is the gap:
- **Day/week plans**: as now — seeded regenerate, training/rest cycling, per-meal balance, diagnosis receipts.
- **Adherence**: planned meals stage into the diary; "eaten as planned" is one tap; a swap-then-eat records both the swap and the intake. Weekly coach already reads real intake, so adherence becomes legible without new engine work.
- **Whole-meal swaps**: keep macro-distance ranking + style-diverse pool; show the receipt ("Swapped like-for-like: protein −2g, kcal +14").
- **Ingredient swaps**: keep role-macro gram-solving; **verify user-renamed meals survive swaps** (open question — if a custom name exists, keep it and show components beneath rather than regenerating the name).
- **Dislikes/exclusions**: long-press exclusion stays; add a visible "excluded foods" list in Preferences so it's reviewable, not memory.
- **Control**: pinning exists; add "repeat this day" (arbitrary day copy within the plan) — small, honest control that Eat This Much users miss.
- **Names**: auto-names refresh on swap (fixed); never let a name promise what the plate no longer contains.
- Bias to repeatable, shoppable meals (ETM's variety-explosion trap); the shopping list stays attached to the plan.

## 11. Deterministic nutrition-coach explanation model

Every coach output — change or no-change — renders the same five-part receipt, extending the existing `WHY_LIBRARY`/`decisionLine` machinery:

1. **Decision** — "Calories hold at 2,450" / "Calories down 100 to 2,350."
2. **Evidence** — the actual numbers: "Weight trend −0.2%/week over 2 weeks against a −0.5% target; 6 of 7 days logged."
3. **Rule** — the threshold in plain words: "A change needs two consecutive off-target weeks and at least three weigh-ins a week."
4. **Action & guardrail** — what was applied, what was refused and why: "Held: your last change was 8 days ago (2-week spacing)." Safety gates state themselves calmly: "This week's intake sits at your minimum safe level, so no cut is available — the floor protects recovery and muscle."
5. **What changes it next week** — the forward condition: "Two more on-track weigh-in weeks and the target eases."

Same model for macro cycles ("training days carry +60g carbs; weekly average unchanged"), refeeds and diet breaks (offered with the MATADOR-grounded reason, **applied only on your tap** — preserve no-auto-apply as a stated principle), and check-in outcomes (derived verdict shown with its inputs, overridable). Progress-scan context stays a note beside the decision, never inside it ("Your scan agrees with the trend. Targets still come from your logs and weight."). No persona, no chat, no "I think" — a transparent system stating its rules. This is Volyume's answer to MacroFactor's transparency with more explicit rules, and to TrueCoach-style vaporware with the opposite: receipts.

## 12. Food-data trust requirements

- **Source chips** on every row (exists: CoFID/OFF/USDA/You/Snapped) — keep; add plain-language "what is this source" sheets (CoFID one exists).
- **Verified ordering** for barcode duplicates (exists) — extend a subtle "verified" mark to search rows where the source is authoritative (CoFID, verified OFF).
- **UK priority** — waterfall order is already UK-first; lock it as a stated product principle (NutraCheck proves it's a differentiator).
- **Offline vs miss** — required in every lookup surface (search still conflates; barcode scan solved).
- **OCR confidence** — visible at confirm-time; low-confidence fields highlighted for user attention.
- **Serving confidence** — always show the basis (per-100g vs per-serving vs pack) next to the number; never let a serving default silently.
- **Stale data** — add "last verified" on food detail; re-fetch promoted network rows opportunistically on view (background, non-blocking) rather than TTL machinery.
- **Corrections** — user fix creates a personal override immediately (custom-food path exists); a "report this food" flag queues for moderated shared-row fixes — *later*, with moderation, never instant shared writes.
- **Label mismatch** — when OCR disagrees with a database hit by more than tolerance, ask the user which to trust and remember per-food.
- **Food row design** — current row (name/brand/serving/energy/source/favourite) is right; resist adding grades, scores, or traffic lights (moral scoring risk).

## 13. Safety and low-shame copy principles

The governance already in code is the standard — codify it as five principles:
1. **Describe, never judge.** Colours and copy are adherence-neutral (MacroRings docstring). ✅ "Protein 142g of 180g." ❌ "You missed your protein goal."
2. **Intention, not obligation.** No "must", "don't let", "you have to" (enforced in `partners/intention.js`). ✅ "You aimed for 4 sessions this week." ❌ "Don't break your streak" — the word *streak* stays banned from user copy.
3. **A miss holds; it never reds.** Missed days/weeks acknowledge calmly and move forward. ✅ "A quieter week. Your plan picks up where you are." ❌ "You fell off track."
4. **Safety states are protective, not punitive.** ✅ "Your calorie target is held this week — sustained low energy is a signal to protect recovery, not push through." ❌ Anything reading as lockout-as-punishment.
5. **Numbers before narrative; no false certainty.** Estimates say so ("your trend suggests…"), floors say why they exist, and nothing promises what the data can't support.

## 14. Launch-critical improvements — strict top 10

| # | Improvement | Why | Evidence | Impact | Size | Do-not-overbuild |
|---|---|---|---|---|---|---|
| 1 | Wire plan→diary adherence ("mark planned meal eaten") | Biggest coherence gap vs Carbon/RP; visual layer already exists | Scout 3 "not evidenced"; Scout 2 faded-arc | Daily-loop retention | **M** | No adherence *scores* — just staging + one-tap confirm |
| 2 | Search empty states: offline vs not-found | Users conclude foods "don't exist" on a timeout | Scout 7 | Trust in the database | **S** | Copy + one state flag; no retry machinery |
| 3 | Coach-tab root reorder: coach content first, settings behind gear | Tab label must match Volyume's strongest system | Scout 1 | Premium perception | **M** | Reorder the root screen only; no navigation changes |
| 4 | Verify/fix custom meal names after ingredient swap | A named meal that lies is a trust break | Scout 3 open question | Plan trust | **S** | If broken: keep custom name, list components beneath |
| 5 | OCR low-confidence warning visible at save | Silent low-confidence numbers poison coaching inputs | Scout 7 | Data trust | **S** | Highlight fields; don't block saving |
| 6 | Coach receipt chip in diary header when targets changed | Closes the "why did my numbers move" gap in-context | Scouts 2/4 (machinery exists) | Transparency | **S** | A chip + link; no new explanation engine |
| 7 | Read `weeklyCoach.js` 1042–1538 + both coach screens in full; fix only what's found | Evidence hole in the most safety-critical file | Scout 4 | Risk closure | **S** | Diligence pass, not refactor |
| 8 | Device-test + guard the physique-score timestamp race | Subtle regression seam on a body-data surface | Scout 5 | Correctness | **S** | Guard test + checklist item only |
| 9 | Codify Skeleton-vs-spinner rule; sweep the 6 high-traffic screens | Two loading idioms read as two apps | Scout 6 | Polish coherence | **S** | Document + targeted sweep; not all 82 screens |
| 10 | a11y: touchable-without-label lint rule + HomeScreen pass | 33 labels / 63 touchables unverified | Scout 6 | Inclusivity, store quality | **S** | Lint rule + one screen; full sweep later |

## 15. Premium later improvements — top 10

1. **Connected weekly story surface** — one screen narrating train→eat→weigh→decision from existing hooks (the fragmentation fix, done properly once).
2. **MN-1 micronutrients, tiered** — headline macros always; sodium/sugar (data already stored) then micros collapsed/opt-in. Cronometer's trust without its density. *Founder-gated — decision, then build.*
3. **Report-bad-food flow** with moderation queue before shared-row changes.
4. **"Last verified" + opportunistic re-fetch** of promoted network foods.
5. **Training-day-aware meal composition** — extend dayVariantTargets/peri-workout slots toward RP-style timing without RP rigidity.
6. **Repeat-a-day plan control** + grocery-list export polish.
7. **Readiness aggregate** — compose existing Home chips + deload signals into one calm indicator (no new sensors).
8. **Deep-link expansion** for notification targeting (coach output, check-in, diary day).
9. **Raw/cooked toggle** (*founder-gated item 12*).
10. **Internal logging tap-count benchmark** as a regression gate on any diary redesign.

## 16. Features to avoid or delay

Blunt list: **no AI chat coach** (constitution; also the market's vaporware trap). **No default micronutrient walls** (Cronometer's clinical density). **No streaks, badges, scores, grades, or day-completion ceremonies** (banned words already enforced — keep it that way). **No auto-applied coach changes** (no-auto-apply is a safety and trust feature — state it, never "streamline" it). **No social feeds/leaderboards.** **No red/green food or day judgement colours.** **No barcode/logging paywall erosion** (Lose It's bait-and-switch). **No separately-paywalled nutrition add-ons** (Trainerize fragmentation). **No diary redesign that adds taps** (MFP 2026). **No overselling the scan** — the BF estimate stays confidence-tiered, withhold-reasoned, and outside targets; marketing must never claim more. **Delay**: meal photos/AI food recognition, wearable integrations, and any second body-metric hardware path — all clutter risk against the calm core.

## 17. Final recommendation for Volyume specifically

- **Rename:** nothing. Diary→Nutrition is already shipped; keep the Coach tab name and make its root earn it (§6).
- **Polish:** the top-10 in §14 — mostly S-sized trust/coherence seams on an already-strong base.
- **Ship:** the adherence loop (#1) and coach-receipt chip (#6) together — they turn three excellent systems (diary, planner, coach) into one product.
- **Defer:** MN-1, report-bad-food, story surface, readiness aggregate — real value, not launch-critical, two founder-gated.
- **Must not change:** the safety-gate stack, no-auto-apply, tier-blind guardrails, adherence-neutral colours, the food waterfall, the solver stack, NAV-5/cross-tab discipline, anti-shame copy governance, progress-scan target isolation (`affectsTargets: false`).
- **Where Volyume beats the market:** it is the only product in this set combining MacroFactor's adaptive transparency, NutraCheck's UK-first data trust, Carbon's coaching cadence, and real deterministic meal-plan generation — in one app, safety-gated and ED-safe by construction. The competitors each own one of these; none owns the combination. The launch-critical work above is what makes that combination *legible* to the user, which is the last distance between very good and world-class.

---
**Process note:** all repo evidence came from 8 Sonnet scouts (zero Fable repo inspection; one Bash call to sync the tree to `main`). Evidence holes are named in §5.5 rather than papered over. Ready to turn §14 into a build wave on your go.
# Volyume — Master Plan (06)

Date: 2026-07-01 · Programme lead synthesis of audits 01–05 + CLAUDE.md.
This is the greenlight document: one honest state assessment, one merged
ranked programme, sequencing, and a Wave 1 recommendation with device test
checklists. **No implementation has begun.** Items marked ⚑ require a
founder decision as part of (or before) their greenlight.

---

## 1. STATE OF THE APP — brutally honest

**Where Volyume is elite.**
The set-logging loop's tap economy (1-tap prefilled sets, keyboard-Done
logs, auto-flow) beats Hevy's grid. The food re-log stack (usuals chip,
recents, copy-day) matches the fastest loggers at ~3 taps with zero typing.
The ED-safety architecture — tier-blind floors, FFM energy floor,
upward-only rapid-loss correction, SCOFF holds, calm mode — has no
equivalent anywhere in the category. The deterministic engine with written
rationale is a genuine moat none of Hevy/Cronometer/MacroFactor can copy.
Offline-first storage, workout crash recovery and the SQLCipher migration
path are carefully hardened. Theme/a11y discipline (~91% token adoption,
WCAG-annotated, reduce-motion everywhere) and the test culture (315 suites,
~4,700 tests, invariant tests against the real engine) are professional-
grade. Progress *analysis* (MEV/MRV landmarks, ACWR, adaptive TDEE, plateau
detection) exceeds every competitor.

**Where it's average.**
Visual hierarchy: one card recipe, one header size and one amber tint rank
everything equally — the flagship CoachOutput screen scores 6/10 and reads
as a memo, not a verdict. Motion: excellent primitives, patchy adoption —
five tuned haptic events are never called, no list animates, the rest timer
is ticking text. Startup: a 6.3 MB JSON.parse on every launch, eager
80-screen module eval, all five tabs mounted at boot. Paywall furniture is
thin against Hevy's at ~60% higher price. Check-in *tone* is
adherence-neutral; the *mechanics* are not (bucketed intake, recalibration
gated on ceremony).

**Where it's behind.**
The exercise library has zero visual media against Hevy's animated demo on
every exercise. Three of the four structural moats are invisible in week
one — the deterministic coach can't demonstrate itself before the week-2
gate, the integrated loop is unlabelled, the UK food advantage is never
named. The legacy half of sync re-stamps timestamps, full-pushes on a 2s
debounce and can, in one critical path, silently destroy unsynced rows at
sign-out. A paying user's weekly coaching banner on Home is a dead tap.
Article 9 enforcement lives only in navigation — the sync engine itself
never checks consent. Two ED-floor seams leak (a coach carb-cycle rest day
can resolve below the sacred floor; the robust trend helper can fabricate a
weekly rate from 3 days of data). Rest ends silently on a locked phone.

**The one-sentence verdict:** the hard part — a safe, deterministic,
integrated coaching engine with elite logging — is built and true; what's
missing is that the app neither *protects* it fully at the seams nor *shows*
it in the first week nor *feels* like what it is.

---

## 2. RANKED PROGRAMME — merged list, impact-per-effort descending

Effort key: S=1 · M=2 · L=3.5 · XL=5 (ranges use midpoints). Ratio = guide,
not gospel; sequencing (§3) applies safety-first overrides. F-items are
defect packages (audits 01/02), D-items the design programme (03),
A/B/C-items the portfolio (05). Finding IDs preserved for traceability.

| Rank | ID | Name | Impact | Effort | Source | Ratio |
|---|---|---|---|---|---|---|
| 1 | F4 | Dead-control navigation fixes | 8 | S | 02 | 8.0 |
| 2 | A8 | Gating & conversion integrity | 7 | S | 02/04 | 7.0 |
| 3 | F6a | Startup quick wins | 7 | S | 01 | 7.0 |
| 4 | F1 | Sync data-loss guard | 9 | S–M | 01 | 6.0 |
| 5 | A6 | UK provenance, made visible | 6 | S | 04 | 6.0 |
| 6 | F2 | Article 9 sync gate | 8 | S–M | 01 | 5.3 |
| 7 | A7 | Check-in integrity pack | 8 | S–M | 02/04 | 5.3 |
| 8 | D0 | Design token truth pass | 5 | S | 03 | 5.0 |
| 9 | B9 | Deterministic rest suggestions | 5 | S | 05 | 5.0 |
| 10 | D2 | Felt-life pack (absorbs B7) | 7 | S–M | 03 | 4.7 |
| 11 | A4 | Division fingerprint on daily surfaces | 7 | S–M | 04 | 4.7 |
| 12 | A2 | Rest through the lock screen | 9 | M | 02 | 4.5 |
| 13 | A3 | Week-one proof: the coach ledger | 9 | M | 04/02 | 4.5 |
| 14 | F3 ⚑ | ED-floor seam repairs | 9 | M | 01 | 4.5 |
| 15 | B1 ⚑ | Adherence-neutral mechanics | 9 | M | 04 | 4.5 |
| 16 | F8 | Error-boundary layer | 6 | S–M | 01 | 4.0 |
| 17 | B3 | Proactive plateau-break surfacing | 6 | S–M | 05 | 4.0 |
| 18 | B8 ⚑ | Gym basics (keep-awake dep) | 6 | S–M | 04 | 4.0 |
| 19 | F9 ⚑ | Compliance tail (deletion, logging) | 6 | S–M | 01 | 4.0 |
| 20 | A5 | Progress tab becomes a dashboard | 7 | M | 03 | 3.5 |
| 21 | B2 ⚑ | Readiness-informed session adjustments | 7 | M | 05 | 3.5 |
| 22 | A1 | The Verdict Screen (CoachOutput) | 9 | M–L | 02/03 | 3.3 |
| 23 | F7 | Store-subscription hygiene sweep | 6 | M | 01 | 3.0 |
| 24 | F11 | UX paper-cuts bundle | 6 | M | 02 | 3.0 |
| 25 | B5 | Exportable coach handover report | 6 | M | 05 | 3.0 |
| 26 | D3 | Hierarchy passes (Summary/Targets/Home) | 6 | M | 03 | 3.0 |
| 27 | D1 | Mechanical design sweeps | 5.5 | M | 03 | 2.75 |
| 28 | B4 ⚑ | Contest-prep countdown mode | 7 | M–L | 05 | 2.5 |
| 29 | F10 ⚑ | Engine hygiene (non-safety) | 5 | M | 01 | 2.5 |
| 30 | B6 | Progress photo comparison | 5 | M | 05 | 2.5 |
| 31 | F6b | Lazy tabs + screen code-splitting | 6 | M–L | 01 | 2.2 |
| 32 | F5 | Legacy sync completion | 7 | L | 01 | 2.0 |
| 33 | C3 | Widget family + Wear OS tile | 6 | L | 05 | 1.7 |
| 34 | C1 ⚑ | Exercise media library | 8 | XL | 04 | 1.6 |
| 35 | C4 ⚑ | Health Connect re-entry (reversal) | 6 | L–XL | 05 | 1.5 |
| 36 | C2 ⚑ | Micronutrients / UK NRV (MN-1) | 7 | XL | 05 | 1.4 |
| 37 | C5 | Training Partner v2 | 5 | L | 05 | 1.4 |

### Item detail

**F4 · Dead-control navigation fixes · 8 · S · 02 (NAV-1/2/3) · Risk: none
· Deps: none.** Fix the three cross-stack `navigate()` no-ops: the Home
coaching banner (a paying user's flagship entry point does nothing), the
MealPlan targets redirect, and the self-destroying Diary privacy prompt —
plus a regression test sweeping every `navigate()` target against the
registration table so the bug class stays extinct.

**A8 · Gating & conversion integrity · 7 · S · 02/04 · Risk: none · Deps:
none (⚑ only the differential-paywall placement question inside it).**
ProBadge on gated Progress tiles, the four missing benefit lines, an FAQ +
deeper comparison on the upgrade screen (no billing change), and a founder
decision on resurfacing the unreachable differential paywall.

**F6a · Startup quick wins · 7 · S · 01 (PR-1, PR-4, PR-8) · Risk: none ·
Deps: none.** Check the seed version flag before parsing the 6.3 MB food
snapshot (currently parsed every launch); run the AsyncStorage-only splash
checks in parallel with DB init; add the missing rejection handler on the
one promise that gates the whole UI.

**F1 · Sync data-loss guard · 9 · S–M · 01 (SD-1 critical, SD-2) · Risk:
sync behaviour change — multi-device test required · Deps: none.** Exclude
watermark/cursor/entitlement keys from the prefs sync (one-line class of
silent data loss: imported cursors skip pushes whose rows the sign-out wipe
then destroys), and thread the sign-out guard into the legacy pull so a
timed-out wipe can't race an in-flight pull.

**A6 · UK provenance, made visible · 6 · S · 04 · Risk: none · Deps:
none.** One provenance sentence at first food search, a glossed CoFID chip,
and "verified UK" badges via the existing source-chip taxonomy — the moat
is currently felt but never named.

**F2 · Article 9 sync gate · 8 · S–M · 01 (SC-1) · Risk: must fail closed
without stranding offline users · Deps: pairs with F1 (same runner seam).**
A consent check inside `syncAll` so health-domain tables never push/pull
before Article 9 consent resolves — enforcement currently lives only in
navigation.

**A7 · Check-in integrity pack · 8 · S–M · 02 (NU-1/NU-8/OB-2/OB-7) + 04 ·
Risk: none (wiring + copy) · Deps: none.** Fix the narration/decision
vocabulary mismatch (the coach visibly ignores the calorie answer),
provenance-label the pre-filled answers, render the computed confidence
line, allow a one-day-late check-in, persist reminder prefs on permission
denial.

**D0 · Design token truth pass · 5 · S · 03 · Risk: none · Deps: none;
enables D1/D2/D3/A1/A5.** Rewrite the stale styling rules doc from
theme.js, fix the widget amber bug, add the missing tokens (bodySm,
captionTight, radius.hair, 7 alpha stops, camera, celebration, motion.sheet).

**B9 · Deterministic rest suggestions · 5 · S · 05 · Risk: none · Deps:
A2 sensible first.** Suggested rest by set type/compound-ness from a fixed
table, overridable — the accepted, deterministic form of "rest intelligence".

**D2 · Felt-life pack · 7 · S–M · 03 (top-5 wins; absorbs portfolio B7) ·
Risk: none — primitives exist; every addition gates on reduce-motion/ED-calm
· Deps: D0 soft.** Wire the five never-called haptic events, Reanimated
layout/exit on Diary + set rows, draining rest-timer fill, milestone
celebrations scaled to the rung, heroZoom on detail routes, skeletons for
Progress/You.

**A4 · Division fingerprint on daily surfaces · 7 · S–M · 04 · Risk: none
(re-presents applied overlay data) · Deps: none.** Elevated/capped muscle
markers on heatmap + routine detail and a deterministic "general plan vs
yours" set-count diff — the moat currently vanishes after minute five.

**A2 · Rest through the lock screen · 9 · M · 02 (CL-1..6) · Risk: OEM
notification-timing variance (backstop, not the timer) · Deps: none.**
Scheduled end-of-rest notification, GO haptic on catch-up, sticky header
countdown, kill the auto-advance yank, pin the CTA, persist rest state
across process death. iOS Live Activity stays a separate gated decision.

**A3 · Week-one proof: the coach ledger · 9 · M · 04/02 (OB-4) · Risk: copy
discipline only · Deps: none (A7 pairs well).** Day-1 "what your coach is
reading" ledger against the published thresholds, the week-one hold rendered
as a full held-decision receipt with the named unlock date, provisional
targets at wizard step 4, first-review date on the plan reveal.

**F3 ⚑ · ED-floor seam repairs · 9 · M · 01 (EN-1/2/6/7/9/10) · Risk:
touches the sacred system — founder sign-off + invariant tests written to
fail, strengthening only · Deps: none.** Floor-clamp the macro-cycle rest
day (currently can resolve below 1,200), make the robust 7-days-ago helper
return null like its fixed twin (stops fabricated weekly rates driving
cuts), align the −1.5% boundary, unknown-sex EA caution to the safer line,
filter zero-weight rows, stop the lockout-row stacking.

**B1 ⚑ · Adherence-neutral mechanics · 9 · M · 04 · Risk: output shifts for
identical histories — deterministic replay before/after + founder sign-off
on the delta · Deps: F3 first (same files), F10's decisions adjacent.**
Feed actual logged intake into the adaptive TDEE model (the value is
already computed at the same call site) and let recalibration refresh
weekly from weights + rollups even when the check-in is skipped — closing
the only mechanics gap to MacroFactor while keeping the safety layer they
lack.

**F8 · Error-boundary layer · 6 · S–M · 01 (PR-7) · Risk: none · Deps:
none.** Per-tab/per-screen boundaries so one screen's render throw degrades
to that screen instead of felling the whole app into an unrecoverable
retry loop.

**B3 · Proactive plateau-break surfacing · 6 · S–M · 05 · Risk: nagging —
cap via the existing banner-priority system · Deps: none.** Surface the
existing plateau detection on Home/summary with the deterministic protocol
suggestion.

**B8 ⚑ · Gym basics · 6 · S–M · 04 · Risk: none; ⚑ one dependency
(expo-keep-awake) needs approval · Deps: none.** Keep-awake during
sessions, deterministic warm-up ramp, rebuilt plate calculator — the
table-stakes items lifters notice in week one.

**F9 ⚑ · Compliance tail · 6 · S–M · 01 (SC-2/3/5/6/7/8) · Risk: two items
are new Supabase migrations — founder-run · Deps: none.** Complete the
deletion fallback (meal plans/folders/partner rows/auth user),
hash-or-drop the retained deletion-log email, telemetry on plaintext-DB
fallback, flip VERBOSE_LOGGING, widen local PII scrub, https-only recipe
import.

**A5 · Progress tab becomes a dashboard · 7 · M · 03 · Risk: JS-thread
chart cost — reuse existing components, cap the window · Deps: D0; F7
first makes the perf win measurable.** Weekly training-load hero chart,
sparkline cards, inline volume bar — the 03 elite description executed.

**B2 ⚑ · Readiness-informed session adjustments · 7 · M · 05 · Risk: scope
creep into safety — reduce-only rule table · Deps: founder decision;
pairs with A3.** The intent-sheet answer becomes visible, deterministic,
downward-only session tweaks with a written why.

**A1 · The Verdict Screen · 9 · M–L · 02 (NU-3/4/5/6/8) + 03 (gap #1) ·
Risk: regressing confirm-then-apply flows — existing tests + adversarial
review · Deps: F4, D0, A7 (vocabulary) first.** CoachOutput rebuilt around
one verdict, one amber object, a working/off ledger, and honest Apply rows
(pre-tap targets, floor explanations, duration wording, kJ, confidence).

**F7 · Store-subscription hygiene sweep · 6 · M · 01 (UI-1/4/5/8) · Risk:
mechanical but wide — screen-mount suite guards · Deps: none; do before
F6b.** ~25 bare `useAppStore()` screens to `useShallow` selectors, fix the
defeated LoggedSetRow memo and `key={i}`, memoise the Toast context.

**F11 · UX paper-cuts bundle · 6 · M · 02 (OB-3/5/6/8, NAV-5/7, NU-9,
UI-3) · Risk: none individually · Deps: none.** Wizard state persistence
across process death, prefill-as-placeholder for weight/age, consent-screen
exit affordance, "log my weight" CTA that logs weight, tab-press pop only
when focused, silent-failure toasts, water long-press/target, Suggested-tab
search field, onboarding a11y roles.

**B5 · Exportable coach handover report · 6 · M · 05 · Risk: Print HTML
layout drift · Deps: none.** PDF of history, trend, targets and every
decision + why — for a human coach or GP; ED-flagged users get the neutral
variant.

**D3 · Hierarchy passes · 6 · M · 03 (phase 3 minus A1/A5) · Risk: visual
regressions — before/after screenshots per screen · Deps: D0, D1.**
WorkoutSummary, NutritionTargets and Home rebuilt to the one-hero /
one-amber / real-headers rules per 03's elite descriptions.

**D1 · Mechanical design sweeps · 5.5 · M · 03 (phase 1) · Risk: ±1-2px
judgement calls — founder eyeball list per sweep · Deps: D0.** Alpha stops,
lineHeight → type roles, circle(), spacing.hair, chips → shared Chip,
EmptyState → Button.

**B4 ⚑ · Contest-prep countdown mode · 7 · M–L · 05 · Risk: the mandatory
ED-safety design review may cut scope — budget for it · Deps: founder
review; A4 first (division surfaces).** Weeks-out timeline, division
checkpoints, peak-week integration; floors and holds stay senior to any
countdown.

**F10 ⚑ · Engine hygiene · 5 · M · 01 (EN-4/5/8/11) · Risk: output-identical
refactor discipline · Deps: founder decisions (recomp rate, dead
vocabulary); after F3/B1 to avoid re-touching files.** Injectable clock,
phase-vocabulary cleanup, distinct-day weigh-in counting, DST-safe block
status.

**B6 · Progress photo comparison · 5 · M · 05 · Risk: image memory —
downscale · Deps: none.** Side-by-side/slider compare, local-only, inside
the existing calm-gated screen.

**F6b · Lazy tabs + code-splitting · 6 · M–L · 01 (PR-2/3, UI-7) · Risk:
regressions in tab-mount assumptions — do after F7 so gains are measurable
· Deps: F7.** Default-lazy tabs and per-screen lazy requires while keeping
the a11y-theme-first ordering.

**F5 · Legacy sync completion · 7 · L · 01 (SD-3/4/7/8/9) · Risk: the
highest-touch data change — per-table staging, multi-device test matrix ·
Deps: F1 first; subsumes four findings.** Migrate the remaining tables to
the registry path: real updated_at semantics, per-table watermarks,
timestamp-gated upserts, tombstones, prefs out of the bulk cycle.

**C3 · Widget family + Wear OS tile · 6 · L · 05 · Risk: new surface
maintenance · Deps: none technical.** Today's session / kcal remaining /
streak widgets and a watch rest-timer tile; iOS Live Activity remains its
own gated decision.

**C1 ⚑ · Exercise media library · 8 · XL · 04 · Risk: content production
cost/consistency, CDN + licensing decisions · Deps: founder decision on
spend.** Commissioned animated demos + muscle diagrams, EU CDN, bundled
offline fallback — the most visible remaining gap to Hevy.

**C4 ⚑ · Health Connect re-entry · 6 · L–XL · 05 · Risk: reverses this
month's deliberate rip-out; full Article 9 expansion · Deps: founder
reversal decision + demand signal.** Steps-only passive input to the
existing step-TDEE modifier. Sketch only.

**C2 ⚑ · Micronutrients / UK NRV · 7 · XL · 05 (existing MN-1 blueprint) ·
Risk: heaviest schema migration in the backlog; sequenced alone · Deps:
already founder-gated (Ultimate-Audit item 16).** Unlocks full U6 iron
tracking; closes the Cronometer depth gap.

**C5 · Training Partner v2 · 5 · L · 05 · Risk: ED/privacy surface — no
weight/food sharing ever; purge path extension · Deps: core loops elite
first.** Shared programmes + cheer windows in the private 1:1 lane.

---

## 3. SEQUENCING LOGIC

**Safety and truth precede visibility; foundations precede polish; engine
changes ride alone.** Concretely:

1. **Data/compliance defects first (F1, F2, F3, F4, F6a):** nothing visible
   should ship on top of a sync path that can destroy data, a consent gate
   the sync layer ignores, or floors that leak at the seams. F1+F2 share the
   runner seam — one pass. F3 is the only Wave-1 item inside the sacred
   system: founder sign-off is part of its greenlight, and its changes only
   strengthen.
2. **Design tokens before any screen work (D0 → D1 → D3/A1/A5):** the 03
   rule — token truth, then mechanical sweeps, then judgement passes.
   D2 (felt-life) only *adopts* existing primitives, so it can ship early.
3. **State/store hygiene before perf claims (F7 → F6b)** and before the
   dashboard (A5), so improvements are real and measurable.
4. **Trust before persuasion:** A7 (the coach stops ignoring answers) and
   A3 (week-one proof) land before A1 (the redesigned verdict), so the
   redesigned screen presents already-honest content. F4 must precede A1
   (its entry banner must work).
5. **Engine waves ride alone (F3 → B1 → B2/F10):** one engine change in
   flight at a time, each with deterministic before/after replay, invariant
   suite, adversarial review, founder sign-off. Never batched with UI waves.
6. **Founder-gated items queue behind their decisions** (⚑: F3, B1, B2, B4,
   B8-dep, F9-migrations, F10, C1, C2, C4) — asked as structured
   multi-choice questions while unblocked work proceeds (CLAUDE.md
   operating model).

**Release waves:**
- **Wave 1 — "Safe, true, felt"** (recommendation below): F4, F1, F2, F6a,
  F3⚑, D0, A6, A7, A8, A2, A3, D2. Visible elevation of the daily loop +
  trial window on a de-risked base.
- **Wave 2 — "The coaching surfaces":** A1, A5, A4, D1, D3, F7, F8, F11,
  B3, B9. The flagship redesign on the foundations Wave 1 laid.
- **Wave 3 — "Engine evolution"** (all ⚑): B1, then B2, B4, F10, F9's
  migrations. One at a time.
- **Wave 4 — "Scale & bets":** F5, F6b, B5, B6, B8, C3; C1/C2/C4/C5 as
  priced founder decisions.

---

## 4. WAVE 1 RECOMMENDATION — maximum visible elevation, minimum regression risk

Twelve items. Everything is S–M effort except A2/A3 (M); nothing touches
billing; the only sacred-system item (F3) strengthens floors and carries
its own sign-off gate. Suggested order of landing within the wave: F4 →
F1+F2 → F6a → F3⚑ → D0 → A6 → A7 → A8 → A2 → A3 → D2.

Every item ships with lint + full suite green and a fresh-eyes adversarial
review; below are the **physical-Android manual checklists** (EAS build —
custom native modules preclude Expo Go).

**F4 — dead controls.**
1. As a Pro user with a completed check-in: Home → tap "this week's review"
   banner → CoachOutput opens (was: nothing).
2. Diary → Build a meal plan with no targets set → tap the redirect → lands
   on Nutrition Targets.
3. Trigger the Diary OFF-sharing prompt → tap → Privacy settings open AND
   the card survives until then.

**F1 — sync data-loss guard.**
1. Two devices, same account: log sets on A offline → airplane-mode off →
   confirm rows reach B. Sign out of A immediately after a burst of edits →
   sign back in → nothing lost.
2. Confirm `user_prefs` in Supabase contains NO `@volyume_pull_wm_*`,
   `push_wm`, or `food_last_*` keys after a sync cycle.

**F2 — Article 9 sync gate.**
1. Fresh account: sign in, kill the app AT the consent screen → check
   Supabase: no health-table rows (weights/check-ins/food) exist.
2. Grant consent → sync proceeds normally; deny path stays on the gate.

**F6a — startup.**
1. Cold-start the app 3× (already-seeded device): launch to Home is
   noticeably faster; no behaviour change.
2. Fresh install: food search still returns UK foods after first-run seed.

**F3 ⚑ — ED seams (after your sign-off).**
1. Female profile at the 1,200 floor with a carb-cycle applied: rest-day
   target NEVER shows below 1,200 (was: could show ~1,100).
2. Log 4 weigh-ins within 5 days only → run a check-in → no off-target
   verdict/cut is produced from the short window (decision matches the
   "building baseline" behaviour).
3. Confirm an open ED lockout shows ONE explanation card, not two.

**D0 — tokens.**
1. Android home-screen widget amber now matches the in-app brand amber
   side-by-side.
2. Visual spot-check of 5 main screens: no visible change anywhere else.

**A6 — UK provenance.**
1. Fresh profile → first food search: the one-line UK provenance note
   shows; tap the CoFID chip → plain-English gloss appears.
2. Search "chicken breast" offline (airplane mode): results + badges render.

**A7 — check-in integrity.**
1. Check in answering calories "Off target" → CoachOutput's "what was off"
   now names calories.
2. Pre-filled answers show "from your food diary / cardio log" labels.
3. Miss your check-in day by one → the late option appears with the
   softer-accuracy framing; complete it → coach output produced.
4. Deny notification permission during onboarding on a fresh install →
   chosen check-in day (e.g. Wednesday) is still honoured in-app.

**A8 — gating.**
1. Free account: Progress tiles show the Pro badge; tapping Partner shows
   partner-specific benefit copy (not the generic pitch).
2. Upgrade screen: FAQ + comparison render; purchase flow untouched
   (do NOT complete a purchase; verify the screen only).

**A2 — rest through the lock screen.**
1. Start a set → lock the phone → at rest end, a notification fires with
   sound/vibration; tapping returns to the session.
2. Skip rest in-app → no stray notification later.
3. Scroll down mid-rest → remaining time visible in the sticky header.
4. Log the final target set, then tap "Log another set" within 2s → NO
   auto-jump to the next exercise.
5. Force-kill mid-rest → reopen → resumed session shows the correct
   remaining rest (or expired state), not a vanished timer.

**A3 — week-one proof.**
1. Fresh trial: Home/coach surface shows the ledger (0/3 weigh-ins, 0
   sessions…) from day 1, counting up as you log.
2. Complete onboarding → the plan-reveal names your actual first review
   date (not "end of your training week").
3. First check-in (day 5–7): the hold renders as a full receipt — inputs
   read, rule, unlock date — not the bare "building baseline" panel.

**D2 — felt-life.**
1. Finish a workout → distinct completion haptic fires.
2. Delete a diary row → rows below animate up (no teleport); Undo works.
3. Rest timer shows the draining fill; enable Reduce Motion in Android
   settings → fills/animations go static, haptics stop.
4. Hit a 50/100-session milestone (test account) → scaled celebration; with
   an open ED flag → subdued variant only.

**Wave-1 exit criteria:** all checklists pass on your device from one green
build; full suite + lint green; adversarial review per item; no schema
migrations required by any Wave-1 item; F3's founder sign-off recorded.

---

*Reply with the IDs you greenlight. Nothing begins until then.*

# VOLYUME scorecard — every user-facing area rated /10 (2026-07-10)

Fresh full-surface rating at branch tip `5d6300d` (== main). Built from two
read-only current-state audits (training/progress/coach + nutrition/account/
system), rated hands-on in one place so the scale is consistent.
**10 = best in the world, nobody does it better.** Honest, not flattering.
Each row: score, what keeps it off 10, what would get it there.

Prefix note: the seven Codex findings (AUD-01..07) are being fixed by Codex
separately; they are pre-launch correctness items, not reflected as score
deductions here except where the defect is itself the user-facing weakness.
Factual correction from the audit: the exercise library is **~551** exercises
(counted in seedExercises.js), not the 654 an earlier doc claimed.

## Daily loops (the surfaces users touch most)

| # | Area | /10 | What keeps it off 10 | What makes it 10 |
|---|------|-----|----------------------|------------------|
| 1 | **Workout logging (active session)** | **9** | No drag reorder, no giant sets, RIR fixed-default, no exercise media — all deliberate founder holds, not neglect | Unhold at least one (media or drag); it is otherwise the best logging surface in the category (unilateral per-side flow, crash-lossless drafts, fuzzy+recents picker, conditional finish, PR re-detect, rich haptics + SR) |
| 2 | **Food diary** | **8** | Raw/cooked basis invisible on the logged row (must open the entry); dead unused MealSection callbacks; thin haptics | Inline raw/cooked chip on the row; a light haptic vocabulary; clear the dead callbacks |
| 3 | **Food search & entry** | **8** | The one carried-over "Custom tab" IA nit; no haptics on results | FTS5+bm25+recents fusion is already ahead of MFP; add scan-result haptics and settle the tab IA |
| 4 | **Home / Today** | **8** | 2,605-line screen unmemoised; no tab-bar haptic; banner-priority order has no test | Memoise the hero/banner tree; haptic the tab bar; pin the banner priority order with a test |
| 5 | **Coach (weekly review / output / check-in / brief)** | **7** | Engine substance is 9-10 (deterministic, safe, explainable, autonomy modes, plan-G, RED-S, AY-7 SR) but NONE of the 5 Coach screens are live-themed, CoachOutput has zero haptics, and it is 3,281 lines unmemoised — the brains outrun the sensory layer | Live-theme + haptics + memoise the Coach screens so the surface matches the intelligence behind it |
| 6 | **Rest timer** | **8** | Android notification actions (skip/+15s) not yet built; iOS Live Activity held (needs App Groups + EAS) | Ship the Android notification actions; unhold + wire the Live Activity |

## Training & progress

| # | Area | /10 | What keeps it off 10 | What makes it 10 |
|---|------|-----|----------------------|------------------|
| 7 | **Plans & builder** | **7** | Chevron-only reorder (no drag), pairs-only supersets, text-only exercise detail — the live Plan Balance card is a genuine differentiator | Drag reorder + giant sets + exercise media (all founder-held today) |
| 8 | **Exercise library** | **7** | ~551 exercises, text-only, no media/video | Exercise media is the single biggest visible gap vs Hevy/Strong/Fitbod (founder HOLD) |
| 9 | **Progress / analytics** | **7** | PR marker missing on the LiftProgress sparkline; no split/muscle tag on recent-session rows; LiftProgress metric switcher shows a volume-shaped line under an "est. max" numeral (real confusion bug) | Fix the metric-switcher numeral; extend PR markers to LiftProgress; tag session rows |
| 10 | **Body metrics / weigh-in** | **8** | Large single-file screen; no deeper trend annotations | NAV-2 edit/delete/history now fully built with optimistic+rollback and re-derive — this is close; richer trend context lifts it |
| 11 | **Progress photos** | **8** | Pinch-zoom gallery + before/after compare enhancement queued (D25) but not yet built | The gallery upgrade; otherwise strong (on-device only, conflict transparency, expo-image polish, benefit line) |
| 12 | **Share cards** | **7** | Functional and privacy-safe; visually conservative | A more crafted card system / templates would lift it |
| 13 | **Workout history** | **7** | Not live-themed (stale colours on a mid-session theme flip); fixed-size day circle | Theme-migrate it; finish the font-scale work |
| 14 | **Cardio logging** | **6** | Simpler pair, not live-themed, less polish than the strength loop | Bring it up to the strength-logging bar; theme-migrate |

## Nutrition depth

| # | Area | /10 | What keeps it off 10 | What makes it 10 |
|---|------|-----|----------------------|------------------|
| 15 | **Curated / saved meals & recipes** | **8** | Recipe web-import takes only the top food-search hit per line (flagged to the user, not hidden) | Better ingredient matching on import; otherwise strong (94 UK-verified meals, computed macros, fail-safe allergen tags, saved-meal inspection, per-serving recipe macros) |
| 16 | **Meal plan builder** | **7** | Dietary-needs entry point buried in a closed accordion (founder-flagged; queued) | Surface the diet/allergen summary as a visible chip on the primary builder surface |
| 17 | **Nutrition targets & insights** | **7** | NT1/PDT1 cloud persistence written but migrations not yet applied; OFF micros empty | Apply the migrations; land OFF micronutrient data |
| 18 | **Dietary needs & allergens (settings surface)** | **8** | The surface itself is complete (4 axes incl. pescatarian, 14 FSA allergens, soft nudge, synced); only the *entry point from the builder* is weak (scored at #16) | Nothing structural here; discoverability is the builder's problem |
| 19 | **Micronutrients** | **6** | CoFID whole-foods coverage is strong (24/27, median 20/food) but OFF branded/packaged foods carry ZERO micros today, so barcode-heavy users see "unknown" everywhere | Land OFF micronutrient parsing (built, awaiting the snapshot refresh run) — jumps this several points |

## Account, social, system

| # | Area | /10 | What keeps it off 10 | What makes it 10 |
|---|------|-----|----------------------|------------------|
| 20 | **Onboarding — Pro** | **8** | Welcome hero animates as one flat block; Login OAuth wait has no spinner; no support escalation after repeated plan-gen failure; no-haptic quiz chips | The polish beats above; the spine (sex gate, endowed progress, preview chips, staged reveal, Article 9) is already strong |
| 21 | **Onboarding — Free** | **7** | Raw-TouchableOpacity chips get no haptic; lighter than the Pro path by design | Haptic the chips; a touch more warmth in the 3-question flow |
| 22 | **Partners** | **8** | AUD-04 non-atomic privacy delete (Codex fixing); otherwise every prior gap closed | The atomic-delete fix; it is otherwise a genuinely novel, privacy-first social layer |
| 23 | **Paywall & billing states** | **7** | TierComparisonStrip missing on Subscription; no haptics; AUD-01 webhook (Codex fixing) | Consistent comparison content; the security fix; the lapse-view engineering is already careful |
| 24 | **Settings & system** | **7** | CP-10 restart-free theming mid-rollout; NotificationSettings not themed | Finish the theming rollout so no toggle needs a restart |
| 25 | **Notifications** | **8** | Rest-day category held (founder A2); cascade IDs cosmetically stale | Unblock rest-day; the safety spine (ED fail-closed, quiet hours, budget, habit-derived reminder) is excellent |
| 26 | **Widgets & Live Activity** | **6** | Android widget shipped; iOS Live Activity held (App Groups + EAS) | Unhold + wire the Live Activity — a real iOS differentiator |

## Cross-cutting quality (applies over everything above)

| # | Dimension | /10 | What keeps it off 10 | What makes it 10 |
|---|-----------|-----|----------------------|------------------|
| 27 | **Live theming** | **6** | Stages 1-3 done (primitives, chrome, settings, Home, workout shells) but Coach, history, cardio, notifications NOT migrated; most toggles still need an app restart | Finish stages 4-5: migrate the remaining screens, retire the restart prompts |
| 28 | **Haptics** | **6** | Rich in the workout loop; absent in food, coach, paywall, settings, tab bar, exercise picker | Roll the existing vocabulary across the untouched surfaces |
| 29 | **Accessibility / Dynamic Type** | **6** | Good label/role coverage and SR announcements, but `maxFontSizeMultiplier` in only 5 files — large-text users overflow outside the workout screens | The approved dynamic-type completion pass |
| 30 | **Motion & bottom sheets** | **7** | Gorhom sheets adopted, keyboard bug fixed, expo-image polish landed; a few screens still roll their own Modal; shared-element transitions not yet built | The queued transitions work; consolidate the stray Modals |

## Where to target (highest leverage first)

The single clearest signal across the whole audit: **the training half of the
app (Home, workout logging, plans, progress) is migrated to live theming +
haptics; the Coach half is not.** That asymmetry is the top target — it is
mechanical, high-visibility, and closes a gap between world-class coaching
substance and a surface that hasn't caught up.

1. **Coach-half polish**: live-theme + haptics + memoise the 5 Coach screens.
   Biggest visible quality jump for the least risk.
2. **Finish restart-free theming (stages 4-5)** so no appearance/text toggle
   needs an app restart — the last thing that makes the app feel less than
   premium at the moment of personalisation.
3. **OFF micronutrients** (built; run the snapshot refresh) — turns
   "unknown everywhere" into real data for packaged-food loggers.
4. **Dietary-needs discoverability** — the founder-flagged buried entry point.
5. **Haptics + dynamic-type completion passes** across the untouched surfaces.
6. **LiftProgress metric-switcher numeral bug** — small, real confusion fix.
7. **History + cardio theme migration** — removes the mid-session stale-colour
   flip on those screens.
8. **Raw/cooked chip on the diary row**; **PR markers on LiftProgress**;
   **TierComparisonStrip on Subscription** — small consistency wins.

Founder-decision items that gate bigger jumps (not neglect — explicit holds):
exercise media (the biggest competitor gap), drag reorder, giant sets, iOS
Live Activity, rest-day notification. Unholding any of these lifts its area
1-2 points.

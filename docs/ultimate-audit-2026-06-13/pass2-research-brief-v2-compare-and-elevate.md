# EXTERNAL RESEARCH BRIEF v2 — COMPARE-AND-ELEVATE (run on 3 AIs, paste each back)

## Why this exists (read first)
The v1 prompt (`EXTERNAL-RESEARCH-PROMPT.md`) was a market checklist: it asked "what does the market do?" and
never fed in **what we already built**, so it produced yes/no findings instead of "here is where OUR thing lags
the best and here is how to make it better." It also defined 15 areas that don't map to the app's real feature
set, so six shipped domains were never researched at all (see `pass3-section7-sweep.md`).

This brief fixes both: every block **states what Volyume ships first**, then asks the researcher to find the
**best-in-class bar**, judge **where we lag**, and say **what would elevate us past the best**. Output maps 1:1
onto the Pass-3 matrix columns so it drops straight in.

Covers: the **6 ungraded feature domains** (cardio, smart meal-planning, recipes, food-insights, annual recap,
manual workout builder) + the cross-cutting **UX/UI-quality** dimension.

---

## HARD RULES (unchanged from v1 — a violation invalidates the report)
1. EVERY factual claim about a competitor carries a source URL. No uncited claims.
2. If you cannot find something, write **NOT FOUND**. NEVER invent a fact, quote, rating, or source.
3. Section 0: state honestly whether you have LIVE web access. Mark each claim [BROWSED] or [TRAINING].
4. App standings: star rating + #ratings + store + ~downloads + URL + date seen, else NOT FOUND.
5. Verbatim quotes only if actually retrieved, each with URL; otherwise paraphrase and label "(paraphrase)".
6. UK/EU emphasis: seek UK sources; mark each finding UK-REP or US-SKEWED.
7. Flag AI-generated/vendor/marketing copy as lower trust; cite the underlying source, not an aggregator.
8. **Do NOT praise Volyume.** The "what we ship" text is context so you benchmark accurately — your job is to
   find where it LAGS and how to ELEVATE it, not to validate it.

## OUTPUT FORMAT PER DOMAIN (use these exact headers — they are the matrix columns)
For each domain below, return:
- **A) BEST IN CLASS** — the named app(s) that set the bar for this domain + the specific capability/execution
  that makes them the bar (rating/#ratings/URL/[BROWSED]/UK-or-US).
- **B) WHERE VOLYUME LIKELY LEADS** — given the "what we ship" text, where do we already meet or beat the bar?
- **C) WHERE VOLYUME LAGS** — concrete capability/execution gaps vs the bar (the priority output).
- **D) HOW TO ELEVATE PAST THE BEST** — specific, buildable moves that would make ours best-in-class, ranked.
- **E) VERIFICATION** — per claim: VERIFIED (≥2 sources/documented) / PARTIAL (single/aggregator) / NOT FOUND.
- **F) UK-SPECIFIC** — anything that changes for a UK/EU, GBP, offline-first, deterministic-engine app.

---

## DOMAIN 1 — CARDIO LOGGING & ITS ROLE IN A COACHING APP
**What Volyume ships:** User-led cardio logging. Pick an activity (favourites + recents first, then browse a
library or search), set duration + intensity, see an estimated calorie burn **as feedback only — it is never
added to the food target**, because the weekly weight-trend energy model already accounts for cardio. History is
a reverse-chronological list grouped by day with soft-delete. Pro feature. The deterministic coach brings cardio
in **only as a lever when needed** (e.g. a stalling cut), never as a scheduled session; the user chooses what
they do. No GPS/route tracking, no live HR.
**Research questions:** Best-in-class cardio logging for a *strength/physique* user (not an endurance app)?
How do the leaders handle the "cardio calories double-count against the food target" problem — do they add them
back or not, and which do users trust? Is manual cardio logging (no GPS) acceptable to users, or is auto-detect/
wearable import now table-stakes? Where does cardio-as-a-coaching-lever (vs scheduled cardio) sit in the market?

## DOMAIN 2 — SMART MEAL PLANNING / SUGGESTIONS
**What Volyume ships:** A generated meal plan (Pro). Progressive disclosure: top level shows "your day" as
plates with one calm line each — calories lead, **Log this day**, **Swap** any plate, **New meals**; one tap
deeper reveals per-meal grams + kcal, day totals vs target, a day-type chip (training/rest), and an honest
residual line when a constrained day can't be hit exactly. Deterministic (no LLM).
**Research questions:** Best-in-class meal planning/suggestions (Eat This Much, MacroFactor meal ideas, others)?
Do users trust algorithmic meal plans, and what makes them abandon them (repetition, unrealistic foods, UK food
availability)? Swap/regenerate expectations? How important is hitting macros *exactly* vs "close enough"? Where
do meal planners fail UK users specifically (US foods, brands, units)?

## DOMAIN 3 — RECIPES (BUILD / IMPORT / LOG)
**What Volyume ships:** Create/edit a recipe — name, total servings, notes, ordered ingredient list; live macro
preview (total + per-serving) scaled by each ingredient's grams; ingredient picking reuses the food search;
log a saved recipe as one diary line (one serving); edit/delete; lives under the Diary tab.
**Research questions:** Best-in-class recipe features (MFP, Cronometer)? Is **recipe import from a URL/photo** now
expected? How do leaders handle per-serving scaling, leftovers, and nested recipes? Top recipe-feature complaints?

## DOMAIN 4 — FOOD INSIGHTS / NUTRITION ANALYTICS
**What Volyume ships:** A 7-day adherence view (Pro): kcal vs target as horizontal bars, macro hit-rate over the
seven days, and CSV export of the diary.
**Research questions:** Best-in-class nutrition analytics (MacroFactor's are widely praised)? What insights drive
behaviour change vs vanity (adherence %, trends, weak-spot detection, protein consistency)? Time-window norms
(7/14/30/90d)? What do users wish their food analytics showed that no app does well?

## DOMAIN 5 — ANNUAL RECAP / ENGAGEMENT MOMENTS
**What Volyume ships:** "Year of Lifts" — a Wrapped-style swipeable full-screen story; each card is one stat with
a big hero number, an icon, one line of context; tap/swipe navigation, progress pips.
**Research questions:** Do recap/"wrapped" features (Strava Year in Sport, Spotify Wrapped pattern) measurably
drive retention/sharing in fitness, with stats? What makes one land vs feel hollow? Shareability norms? Cadence
beyond annual (monthly/block recaps)?

## DOMAIN 6 — MANUAL WORKOUT / ROUTINE BUILDER
**What Volyume ships:** Free manual builder. Add exercises from a picker, configure sets, group supersets; build
a routine/programme and activate it as a training block; edit existing routines. Sits alongside the generated
plans and the plan library.
**Research questions:** Best-in-class routine builders (Strong, Hevy)? The friction points users complain about
(reordering, supersets, set schemes, templates, copying)? What separates a "loved" builder from a tolerated one?
Where does a builder need to sit relative to *generated* plans so the two don't confuse users?

---

## CROSS-CUTTING — UX/UI QUALITY (the dimension v1 reduced to checkboxes)
**What Volyume ships (key surfaces):** Home is hero-first — a single prominent "Start" with a one-banner-at-a-
time priority stack so attention banners never bury the primary action; a glanceable next-session card; a Today
weight strip; structure-first skeletons on cold load. Logging uses ±-steppers (tap, don't type) with 52px targets
and bold tabular-number values; rest timer is a large countdown. Deep dark (#0D0D0D), tested WCAG-AA/AAA contrast,
colour-blind-safe palette, larger-text, Reduce-Motion (incl. dropping PR confetti to a quiet toast). Deterministic
plain one-line coaching — no "AI slop" paragraphs. No user-rearrangeable tiles; no dense/compact mode.
**Research questions (compare-and-elevate, screen-by-screen):** Rank the best-in-class for *visual polish,
information hierarchy, glanceability, and flow friction* (Whoop, Apple Fitness, MacroFactor, Hevy) — with
specifics, not "clean UI." Where would each beat the surfaces above? Is data-density/dashboard personalisation a
real user demand or niche? What concrete interaction details (mid-set editing, swipe-to-log, one-thumb reach,
haptics) define a premium 2026 feel? **Give a prioritised list of UX/UI moves that would make ours best-in-class.**
Output in the A–F format above, treating "UX/UI quality" as the domain.

---

## HOW THE THREE REPORTS WILL BE USED (my side)
Cross-tabulate every claim across the three → AGREEMENT (≥2) vs CONFLICT vs SINGLE-SOURCE; down-weight
[TRAINING]/AGGREGATOR/single-source; keep URLs; feed the triangulated result into a new matrix row per domain
(BEST IN CLASS / WHERE WE LEAD / WHERE WE LAG / HOW TO ELEVATE / VERIFICATION). Reality = 2-of-3 corroboration +
a real URL, never one model's say-so (including mine).

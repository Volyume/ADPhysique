# COMP-011 — Cardio "already counted" explainer line

Charter: [impl-00-shared-brief.md](./impl-00-shared-brief.md) · Approved spec
seed: [COMP-011 in master proposals](../competitive-audit-03-master-proposals.md)
· Round-1 evidence: [steps/cardio research §2.9, §3, §4](../competitive-audit-01-steps-cardio-activity-research.md),
[nutrition coaching research (explanation failure)](../competitive-audit-01-nutrition-coaching-research.md)
· Score: 6.0 (Phase A quick win, #2 on the final action list)

**One sentence:** put a single, recurring, consistently worded line on every
surface where a cardio kcal number appears, saying that the number is already
inside the calorie target via the weight trend, so users coming from the
MyFitnessPal "eat it back" world never get the chance to double-count and
then blame the engine.

**Code-verified correction to the spec seed (important):** the master
proposals describe the LogCardio footnote as "one-time". It is not. In
`src/screens/LogCardioScreen.js` the footnote (lines 219–229) renders every
time `estKcal != null` — there is no seen-flag, no dismiss, no AsyncStorage
gate anywhere (grep for `cardioExplainer|footnote.*dismiss` finds nothing).
The "one-time" claim lives only in the stale header comment (lines 6–8:
"which the one-time footnote explains"). So the LogCardio half of this task
is **copy refinement + a stale-comment fix**, not a gating change. The real
gaps are the two surfaces that say nothing: CardioPlanCard and
NutritionEducationScreen.

---

## 1. Best-in-market bar

### 1.1 MacroFactor — the benchmark

MacroFactor takes the identical stance to Volyume (expenditure inferred from
weight + intake trends; exercise burns never added back) and turned it into
its single biggest trust asset. Its explanation strategy has three layers:

1. **The principle, stated plainly:** "if changing your exercise habits does
   significantly increase or decrease your energy expenditure, that increase
   will show up on the scale… and MacroFactor will be able to identify that
   change and adjust appropriately" — i.e. you never manually eat back
   ([help: "I've started exercising more. Why isn't my expenditure
   increasing?"](https://help.macrofactorapp.com/en/articles/256-i-ve-started-exercising-more-why-isn-t-my-expenditure-increasing),
   search-extract-only; direct fetch returned 403).
2. **The physiology receipt:** active energy doesn't map 1:1 to total energy;
   a 1,000 kcal rise in activity may move total expenditure only 500–700 kcal
   ([Expenditure V3 essay](https://macrofactor.com/expenditure-v3/),
   search-extract-only). This converts "the app ignores my run" into "the app
   is smarter than my watch".
3. **The competitive framing:** their own comparison page calls MFP's
   formula-plus-wearable-add-back "the worst of both worlds"
   ([MacroFactor vs MyFitnessPal 2025](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)).

**Why it works:** the explanation exists. **Where it fails:** it lives in help
articles and blog essays, not at the moment of logging. A user mid-cardio-log
inside MacroFactor does not see the one-line "already counted" — they have to
go looking, and the recurring help-centre traffic on exactly this question
proves many do. That is the gap Volyume's in-surface line beats (§7).

### 1.2 Carbon Diet Coach

Same ownership model, explained at setup: activity is absorbed by check-in
adjustments "regardless of which exercise setting you initially choose"
([Carbon help](https://help.joincarbon.com/en/articles/6004568-understanding-lifestyle-and-exercise-activity),
[FeastGood review](https://feastgood.com/carbon-diet-coach-review/)). Clear
once, then never repeated — users who join mid-journey or forget the
onboarding sentence get nothing. Lesson: a one-time explanation decays;
recurring placement doesn't.

### 1.3 RP Diet Coach

Explains by exclusion: "RP doesn't count cardio sessions under an hour as
workouts" ([FeastGood](https://feastgood.com/rp-diet-app-reviews/)). Honest
and memorable, but the rule itself is surprising, so it generates its own
"why didn't my session count?" confusion. Lesson: explain what the model
*does* (counts everything through the trend), not what it *refuses*.

### 1.4 Cronometer — the counter-example that proves demand

Cronometer historically added synced burns to targets and its forum spent
years asking for the opposite: a "feature to not count calories towards your
goal", with a staffer eventually promising a toggle
([Exercise Calories](https://forums.cronometer.com/discussion/2139/exercise-calories),
[Toggle Off Adding Exercise Calories](https://forums.cronometer.com/discussion/3271/toggle-off-adding-exercise-calories)).
Users explicitly want Volyume's split — log the activity, show the number,
leave the target alone — they just need to be told that's what's happening.

### 1.5 Garmin Connect ↔ MFP adjustment — clarity through exposure (failed)

Garmin/MFP expose the full machinery (calorie adjustment line, "Based on"
figure, BMR subtraction) and still drown users: "Garmin Connect Calorie
Adjustment confusing!" ([MFP community](https://community.myfitnesspal.com/en/discussion/10835692/garmin-connect-calorie-adjustment-confusing)),
double-counting threads ([cross-trainer + steps](https://community.myfitnesspal.com/en/discussion/10551303/garmin-connect-steps-calories-and-calories-from-cross-trainer-double-counted),
[Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/122530/steps-during-run-adding-to-active-calories-effectively-almost-doubling-them)).
Lesson: showing the arithmetic is not the same as explaining the model. One
sentence about *ownership* ("we handle it; here's how") beats a ledger.

**The single best:** MacroFactor — right model, best-written explanation,
wrong altitude (help centre instead of the logging surface).

## 2. What fails

**The MFP add-back model is the largest documented confusion source in
nutrition apps** (round-1 verdict, [steps/cardio research §3](../competitive-audit-01-steps-cardio-activity-research.md)).
The evidence pattern, all from MFP's own community:

- A permanent stream of identical threads: "[Should I Eat Back my Exercise
  Calories?](https://community.myfitnesspal.com/en/discussion/10015458/should-i-eat-back-my-exercise-calories)",
  "[Are you supposed to eat back your exercise calories?](https://community.myfitnesspal.com/en/discussion/10647364/are-you-supposed-to-eat-back-your-exercise-calories)",
  "[Do I eat back exercise calories?](https://community.myfitnesspal.com/en/discussion/10708894/do-i-eat-back-exercise-calories)",
  "[Can I eat back exercise calories?](https://community.myfitnesspal.com/en/discussion/10932092/can-i-eat-back-exercise-calories)" —
  the same question, asked for over a decade, is the definition of an
  explanation failure.
- **The folk fix is an indictment:** the community consensus is "eat back
  50% because the burns are exaggerated" — users manually discounting the
  app's own central number. Wearable estimates inflate burn 16–40%
  ([Physiqonomics, "Please stop 'eating back' exercise calories"](https://physiqonomics.com/please-stop-eating-back-exercise-calories/)),
  so users who obey the app wipe out their deficit, stall, and blame the app.
- The "negative calorie adjustment" feature generates its own thread genre
  ("[Help: negative calorie adjustment mistake?](https://community.myfitnesspal.com/en/discussion/10654791/help-negative-calorie-adjustment-mistake)").
- Even MFP's own dietitian column hedges ("depends on your goals…"
  [MFP blog](https://blog.myfitnesspal.com/ask-the-dietitian-should-i-eat-back-my-exercise-calories/)) —
  the vendor cannot give a straight answer about its own mechanic.

**Anti-patterns to avoid by name:**

1. **The silent stance** (Volyume today, on 2 of 3 surfaces): doing the right
   thing invisibly reads as a bug. A user who logs a 400 kcal run and sees
   the Diary target unchanged will assume the sync broke or the app is
   making them under-eat.
2. **The one-time onboarding explanation** (Carbon): decays to zero;
   confusion peaks weeks later, at the first stall.
3. **The exposed ledger** (Garmin/MFP adjustments): arithmetic without an
   ownership statement multiplies questions.
4. **The help-centre burial** (MacroFactor): right words, wrong place; the
   user in doubt is in the app, not the docs.
5. **Jargon shielding:** "TDEE", "NEAT", "expenditure algorithm" in a
   footnote. Banned by house voice anyway; MFP's "negative calorie
   adjustment" shows what naming-the-mechanism does to lay users.

## 3. User psychology

- **The mental model collision.** Most paying nutrition-app users were
  trained by MFP: calories are an *additive ledger* — exercise earns food.
  Volyume's model is a *budget that already includes you*: the target tracks
  the weight trend, which already reflects every burned calorie. Without a
  bridge sentence, the user applies the old model to the new app and
  concludes either "it's broken" (target didn't go up) or worse, eats the
  estimate back informally ("I ran, I've earned the flapjack") on top of a
  target that already accounted for the run — then stalls.
- **When confusion peaks:** twice. (1) *First cardio log* — "I burned 387
  kcal… where did it go?" The existing footnote already covers this moment.
  (2) *The first stall while doing cardio*, typically week 2–4 — "I added
  three runs a week and the trend hasn't moved; this app's numbers are
  wrong." This is the moment that produces 1-star reviews and it happens on
  the Progress tab and at the weekly check-in, not on LogCardio. That is the
  argument for the CardioPlanCard line: it sits on Progress, exactly where
  the doubting user is staring. (Physiology backs the copy too: extra cardio
  moves total expenditure less than the watch number implies —
  [constrained energy model, Physiqonomics](https://physiqonomics.com/constrained-energy-model/),
  [MacroFactor V3](https://macrofactor.com/expenditure-v3/).)
- **Credibility protection.** The deterministic engine is the product. If a
  user eats back cardio on top of already-factored targets, the cut stalls
  and the *engine* takes the blame, because the user's mental arithmetic
  ("I was in deficit!") looks right to them. One recurring sentence converts
  the engine's silence into a stated design decision — the same
  trust-through-explanation mechanic as COMP-006's "why this" receipts.
- **Moment of need:** the second the kcal estimate renders. The number is
  the cue; the footnote must be its shadow, never separated from it.
- **Effort budget:** zero taps, one sentence of reading, and it *removes*
  work — the entire "should I eat these back? how much? 50%?" calculation
  that MFP users perform daily is declared not the user's job.
- **Emotional safety:** the line is permission-giving ("nothing to add
  back", "we handle it"), never corrective. No "don't", no warning tone. It
  renders only alongside an existing kcal display, so it introduces no new
  calorie talk on any surface (relevant under ED flags, §5).

## 4. The Volyume implementation

### Canonical vocabulary (locked across all three surfaces + COMP-004/006/026)

- The anchor phrase is **"already counted"** (matches the approved proposal
  and the executive summary's name for this action).
- The mechanism is always **"your weight trend"** feeding **"your calorie
  target"** — the exact two nouns COMP-004's trend card and COMP-026's step
  line use. Never "TDEE", "expenditure", "energy balance", "metabolism".
- The contrast is always **"added on top" / "add back"** — naming the MFP
  behaviour without naming MFP.

### (a) LogCardioScreen — refine the existing recurring footnote

File: `src/screens/LogCardioScreen.js`. The footnote already recurs (lines
219–229, conditional only on `estKcal != null`). Changes:

1. **Copy** (line 225–227), replace:
   > An estimate. We don't add it to your food target, your weight trend already accounts for it.

   with:
   > **Already counted. This isn't added to your calorie target, your weight trend includes everything you burn.**

   Two sentences, 16 words, no jargon, no em dash, British English. Leads
   with the anchor phrase so a skimming eye gets the whole answer in two
   words. Keeps the comma-splice rhythm the house voice uses elsewhere
   ("An estimate. We don't add it…").
2. **Stale comment fix** (header lines 6–8): change "which the one-time
   footnote explains" to "which the recurring footnote explains". This also
   stops the next audit re-reporting a gate that doesn't exist.
3. **No change** to the weight-unknown state: when bodyweight is unknown,
   `estKcal` is null, no kcal row renders, and there is no number to
   misread — correctly, no footnote either. Do not add one there.
4. **Keep "Burned about {estKcal} kcal"** as is; "about" is already doing
   honest-estimate work.

### (b) CardioPlanCard — one muted footer line, only when there's something to misread

File: `src/components/CardioPlanCard.js` (lives on the Progress tab). The
card deliberately never shows `est_kcal` (header comment, lines 14–15), so a
full explainer would answer a question the card doesn't raise. But Progress
is where the week-2–4 staller is looking (§3), so the card gets the shortest
possible version, as a muted footnote *below* the Log cardio button, shown
**only when `done > 0`** (a user who has logged no cardio has nothing to
double-count; empty state stays clean per the streamlining rule):

> **Cardio is already counted in your calorie target. Nothing to add back.**

Style: same token recipe as LogCardio's footnote (`fontSize.xs`,
`colors.textMuted`, lineHeight 16). Not tappable, not dismissible, no icon.
Eleven words; the card grows by one quiet line only in weeks the user
actually did cardio.

### (c) NutritionEducationScreen — a KeyPoint inside Section 1, plus one Body line

File: `src/screens/NutritionEducationScreen.js`. The right home is
**Section 1 "Calories. Your energy budget"** — the cardio question is a
budget question, and burying it in Section 6 (coach adjustments) would
separate it from the "maintenance includes training and movement" sentence
it completes (lines 34–37 already say maintenance includes "training and
movement"; this makes the implication explicit). Add after the existing
KeyPoint ("Trend over weeks > perfection on any day."), a Body + KeyPoint
pair:

Body:
> Cardio and steps are part of that maintenance number. When you log a session, the calorie estimate is feedback, not extra food budget.

KeyPoint:
> Other apps add exercise calories back on top. Volyume never does. Your weight trend already counts everything you burn, so nothing is counted twice.

This is the only surface long enough to name the competing model, which is
what actually inoculates an ex-MFP user. (NutritionEducation is Pro-linked
from NutritionTargetsScreen; cardio is Pro; no gating issue.)

### (d) One-time toast/modal vs persistent quiet footnote — decision: persistent, no modal

No first-log toast, modal, or coach-mark. Reasons: (1) the moment of need
recurs — confusion peaks at the *stall*, weeks after any one-time surface
has been dismissed and forgotten (Carbon's failure, §1.2); (2) the footnote
is already attached to the cue (the kcal number) with zero interaction cost;
(3) a modal on the save path of a logging flow violates the effort budget
and the "ignorable-but-present" pattern; (4) one-time UI needs a seen-flag,
storage, and an edge-case matrix — for a copy-only quick win that's negative
ROI. There are deliberately **no states** here: no first-log variant, no
post-question variant, no dismissal. The line is part of the furniture, like
"An estimate" — that constancy *is* the trust mechanic.

### Copy direction — the three strings, side by side

| Surface | String |
|---|---|
| LogCardio footnote | "Already counted. This isn't added to your calorie target, your weight trend includes everything you burn." |
| CardioPlanCard footer (done > 0 only) | "Cardio is already counted in your calorie target. Nothing to add back." |
| NutritionEducation KeyPoint | "Other apps add exercise calories back on top. Volyume never does. Your weight trend already counts everything you burn, so nothing is counted twice." |

Rejected variants, for the record: "Don't eat these back" (corrective tone,
food-rule phrasing, unacceptable near ED-sensitive surfaces); "Your TDEE
already includes cardio" (jargon); the proposal seed's "…so cardio is never
double-counted" (kept the idea, but "double-counted" reads accounting-ish;
"counted twice" survives only in the long education version where there's
room to earn it).

### Interaction spec, edge cases, offline, accessibility

- **States:** none beyond visibility conditions already stated
  (`estKcal != null` on LogCardio; `done > 0` on CardioPlanCard;
  NutritionEducation is static).
- **Offline:** pure local render; nothing to specify.
- **Accessibility:** all three are plain `Text` inheriting existing styles;
  read naturally by screen readers in document order directly after the kcal
  estimate / card content. No new touch targets, so the 44pt floor is
  untouched. `fontSize.xs` muted text is established footnote practice in
  this codebase (LogCardio line 299, NutritionEducation footer line 287).

## 5. Whole-package integration

- **COMP-004 (daily trend card):** that card teaches "watch the trend, not
  the day" and shows expenditure-derived guidance. This line is the cardio
  corollary of the same model and must use the same nouns ("weight trend",
  "calorie target") — it does. COMP-004's blueprint already cites MFP's
  eat-back model as its own anti-pattern (§2.1 there); after both ship, a
  user meets one consistent story on Diary, Progress, and LogCardio.
- **COMP-006 (methodology page):** gets the long-form version — a short
  "Why we never add exercise calories back" entry citing the same two-noun
  mechanism, linking the in-app one-liners to a published stance the way
  MacroFactor's essays do. The footnotes deliberately do NOT link out
  (keeps them non-interactive); the methodology page is where a curious
  user lands via You → methodology.
- **COMP-026 (step TDEE modifier):** same model, same vocabulary; its
  receipt line ("Your steps changed, your target adapts sooner") must never
  contradict "already counted". Because COMP-026 only resizes
  trend-justified adjustments, there's no conflict — but its blueprint's
  canonical copy and this one should be reviewed together in the founder
  voice pass.
- **Duplication avoided:** one anchor phrase, three lengths (11 / 16 / 27
  words) — not three different explanations. Nothing new on Home; nothing on
  the session screen; no new screens; net new UI is one conditional line on
  an existing card. Streamlining-positive.
- **ED/wellbeing flags:** the LogCardio footnote renders only under the kcal
  estimate, and the CardioPlanCard line introduces no calorie *numbers*,
  only the statement that targets won't inflate. If any future calmer-mode
  rule suppresses the kcal estimate row on LogCardio, the footnote disappears
  with it automatically (it's nested in the same conditional) — preserve
  that nesting. The copy itself contains no exhortation to eat less or move
  more; "nothing to add back" is the safest possible framing because it
  removes a compensatory-eating calculation rather than prompting one.

## 6. Retention & word-of-mouth mechanics

The tellable moment is precise and already exists in the wild for
MacroFactor: *"it doesn't let you eat back your cardio, and it's right not
to, and it tells you why."* Every ex-MFP lifter has lived the 50%-eat-back
folk-maths; an app that flatly ends that calculation in one honest sentence
is quotable in a gym conversation. The retention loop it feeds is the
stall-survival loop: the user who hits a flat week while doing cardio either
(a) blames the engine and churns, or (b) re-reads "already counted… your
weight trend includes everything you burn", trusts the check-in, and lets
the coach adjust. This line is the cheapest churn-prevention copy in the
whole audit — it guards the exact moment Pro subscribers decide whether the
coaching is credible.

## 7. Beating the benchmark

MacroFactor has the best *explanation* of this model in the market and still
fields a permanent help-centre queue about it, because the explanation lives
in articles the confused user must seek out. Volyume puts the same answer in
the pixel shadow of every kcal number the user ever sees, in eleven to
sixteen words, recurring forever, with one more thing MacroFactor's surfaces
don't do: it names the *other* model ("other apps add exercise calories back
on top") in the education screen, which inoculates rather than merely
informs. Same correct stance, delivered at the moment of doubt instead of
after it — that is strictly better, at one-thousandth of the word count.

## 8. Measurement

1. **Cardio logging retention, weeks 1–4 of first cardio use** (computable
   offline from existing `cardio_log` rows: % of users with a log in week 1
   who still log in week 4). Hypothesis: rises post-ship — users who
   understand the number keep logging it.
2. **Support/store-review mentions of cardio + calories** ("doesn't count my
   cardio", "calories didn't change") — manual tag in the existing review
   triage. Target: zero recurring instances.
3. **Check-in adherence on cardio-active weeks** (weekly check-in completion
   among users with ≥1 cardio log that week, from existing tables) — the
   stall-survival proxy: confused users skip the check-in, trusting users
   complete it.
4. *(Optional, only if COMP-006 ships)* methodology-page opens of the
   "exercise calories" entry — no new telemetry events for this feature
   itself; a copy change should not grow the event schema.

## 9. Build notes

- **Files touched:** `src/screens/LogCardioScreen.js` (footnote string,
  line ~226; header comment, lines 6–8), `src/components/CardioPlanCard.js`
  (one conditional `<Text>` + one style entry), `src/screens/NutritionEducationScreen.js`
  (one `<Body>` + one `<KeyPoint>` in Section 1). No database, no store, no
  navigation, no new components, no new dependencies.
- **Verified ground truth:** footnote is already recurring (no gate exists);
  CardioPlanCard never shows kcal (by design — keep it that way);
  NutritionEducation Section 1 already says maintenance includes "training
  and movement", which the new copy completes rather than contradicts.
- **Reuse:** LogCardio's existing `footnote` style; NutritionEducation's
  existing `Body`/`KeyPoint` building blocks; CardioPlanCard borrows the
  footnote token recipe (xs / textMuted).
- **Process:** copy must pass founder voice review before merge (house rule
  for all user-facing strings; review together with COMP-004/026 canonical
  vocabulary). Work on `claude/main-branch-content-update-dcqicf` or
  feature branch per CLAUDE.md, never main. Run `npm run lint && npm test`
  after the change.
- **Effort sanity check vs score 6.0:** three strings, one comment fix, one
  conditional render — roughly half a day including the voice-review
  round-trip. Genuinely the cheapest item in Phase A; effort score holds.
- **Risks:** (1) copy drift between the three surfaces and COMP-004/006/026
  — mitigated by the locked vocabulary table in §4; (2) the CardioPlanCard
  line surviving into the empty state and adding noise — mitigated by the
  `done > 0` condition; (3) over-engineering temptation (seen-flags, "Why?"
  links, modals) — explicitly rejected in §4(d); if a tap-through to the
  methodology page is ever wanted, it belongs to COMP-006's blueprint, not
  this one.

---

### Sources

- [MacroFactor help: exercising more / expenditure](https://help.macrofactorapp.com/en/articles/256-i-ve-started-exercising-more-why-isn-t-my-expenditure-increasing) (search-extract-only; direct fetch 403)
- [MacroFactor Expenditure V3](https://macrofactor.com/expenditure-v3/) (search-extract-only)
- [MacroFactor vs MyFitnessPal 2025](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)
- [FeastGood: MacroFactor vs MyFitnessPal](https://feastgood.com/macrofactor-vs-myfitnesspal/)
- [Carbon help: lifestyle vs exercise activity](https://help.joincarbon.com/en/articles/6004568-understanding-lifestyle-and-exercise-activity) · [FeastGood Carbon review](https://feastgood.com/carbon-diet-coach-review/)
- [FeastGood RP Diet review](https://feastgood.com/rp-diet-app-reviews/)
- Cronometer forums: [Exercise Calories](https://forums.cronometer.com/discussion/2139/exercise-calories) · [should i eat back exercise calories?](https://forums.cronometer.com/discussion/3272/should-i-eat-back-exercise-calories) · [Toggle Off Adding Exercise Calories](https://forums.cronometer.com/discussion/3271/toggle-off-adding-exercise-calories)
- MFP community: [Should I Eat Back my Exercise Calories?](https://community.myfitnesspal.com/en/discussion/10015458/should-i-eat-back-my-exercise-calories) · [Are you supposed to eat back…](https://community.myfitnesspal.com/en/discussion/10647364/are-you-supposed-to-eat-back-your-exercise-calories) · [Do I eat back…](https://community.myfitnesspal.com/en/discussion/10708894/do-i-eat-back-exercise-calories) · [Can I eat back…](https://community.myfitnesspal.com/en/discussion/10932092/can-i-eat-back-exercise-calories) · [negative calorie adjustment mistake](https://community.myfitnesspal.com/en/discussion/10654791/help-negative-calorie-adjustment-mistake) · [Garmin adjustment confusing](https://community.myfitnesspal.com/en/discussion/10835692/garmin-connect-calorie-adjustment-confusing) · [Garmin double counted](https://community.myfitnesspal.com/en/discussion/10551303/garmin-connect-steps-calories-and-calories-from-cross-trainer-double-counted)
- [Garmin forums: steps during run double active calories](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/122530/steps-during-run-adding-to-active-calories-effectively-almost-doubling-them)
- [MFP blog, Ask the Dietitian](https://blog.myfitnesspal.com/ask-the-dietitian-should-i-eat-back-my-exercise-calories/)
- [Physiqonomics: Please stop "eating back" exercise calories](https://physiqonomics.com/please-stop-eating-back-exercise-calories/) · [constrained energy model](https://physiqonomics.com/constrained-energy-model/)
- In-repo: [round-1 steps/cardio research §3](../competitive-audit-01-steps-cardio-activity-research.md), [nutrition coaching research](../competitive-audit-01-nutrition-coaching-research.md), `src/screens/LogCardioScreen.js`, `src/components/CardioPlanCard.js`, `src/screens/NutritionEducationScreen.js` (all read 2026-06-10)

# Blueprint — Monetisation Update: Meal-Plan Flagship Changes the Story

**Deep Audit 2026-06-12 · Monetisation research slice (round 2)**
*Read `_SHARED-BRIEF.md`, `_FOUNDER-CONTEXT-2026-06-12.md`,
`bp-meal-plan-generator.md`, `bp-meal-plan-coach-systems-research.md`,
`competitive-audit-01-monetisation-research.md`, and
`impl-COMP-007-paywall-proof.md` before acting on anything here.*

This report is **additive to the prior monetisation work** (COMP-007, COMP-012,
COMP-013). It does not re-tread price benchmarks, paywall mechanics, or
annual-first ordering — those findings stand. The question here is: **how does
the generated meal plan change the monetisation story?**

No billing implementation is proposed here. Product IDs `pro_monthly` /
`pro_annual` are unchanged throughout. This is positioning, packaging, and
copy research only.

---

## 0. The one-paragraph thesis

Before the meal-plan feature, Volyume's Pro value proposition was
training-coaching + nutrition coaching — a powerful bundle already priced on
par with nutrition-only products that charge more. With the generated meal plan
(macro-exact, coach-integrated, offline, with one-tap swaps), the bundle now
matches what the human-coaching market charges £150–400/month for, what the
best digital coaching apps charge £70–100/year for separately, and what no
current app offers as a unified package. This does not automatically mean raise
the price. It means the case for the current price becomes dramatically easier
to make, the paywall hero copy must be rewritten around the meal plan as the
lead value, and a read-only "Today's plate" teaser in the free funnel is the
highest-conviction new conversion lever in the product — it shows Besa exactly
what she is paying for before she is asked to pay.

---

## 1. Price benchmarking: what meal-plan-led products charge

### 1.1 The relevant comparator set

| Product | What it includes | Monthly | Annual | Notes |
|---|---|---|---|---|
| **RP Diet Coach** (v1.52) | Adaptive macro targets, meal-by-meal macro splits around training, food suggestions per slot, weekly coaching check-in, phase management (cut/maintain/bulk) | ~$35/mo | ~$209/yr (~$17.40/mo eff.) | **Meal-plan-led product, physique-specific.** No meal-plan generation; suggests foods per slot but the user assembles the day. No food diary integration. No training plan. |
| **Carbon Diet Coach** | Adaptive macro targets, carb cycling, 3-question check-in, four goal modes | $14.99/mo | $99.99/yr (~$8.33/mo eff.) | No generated plan; macro targets only. Raised pricing 2026. |
| **Eat This Much (Premium)** | Auto-generates full day/week meal plan from macro targets, grocery list, regenerate meals, block foods | ~$9.99/mo | ~$59.99/yr | Consumer-grade; no coaching engine; no training; generic food DB. |
| **Strongr Fastr (Premium)** | Meal plan from macro goals, swap with auto portion-adjust | Free + premium ~$9.99/mo | ~$49.99/yr | No coaching, no training, no physique-specific knowledge. |
| **MealPrepPro** | Dietitian-approved weekly meal plans, batch-cook orientation, macro tracking | $9.99/mo | ~$79.99/yr | No coaching, no training, not physique-specific. |
| **MacroFactor** | Adaptive TDEE coaching, verified food DB, expenditure algorithm; **explicitly no meal plan** | $11.99/mo | $71.99/yr | The gap Volyume fills. |
| **Alpha Progression** | Training plan generator, progression tracking, analytics; no nutrition | ~$9.99/mo | ~$59.99/yr | Training-only comparator. |
| **WAG Seismic (Coaching Plus)** | Human coach assigns macros + curated 7-day plan + 100+ meal ideas | £239–399/mo per client | N/A | Human coaching floor. |
| **Stronger U (closed)** | Human macro coaching | ~$149–189/mo | N/A | Closed March 2026. This pricing is now an available anchor — its users need an app. |
| **Precision Nutrition** | Human coaching programme | ~$1,999–2,999/yr | N/A | High-end human floor. |
| **Online physique prep coaches** | Check-ins, macro plans, meal plan PDF + swaps | £150–400/mo typical | N/A | Elite end. Spreadsheet-based; takes 45–90 min to build per client per week (per `bp-meal-plan-coach-systems-research.md`). |
| **Volyume Pro (current)** | Training coaching + nutrition coaching + food diary + barcode + macro targets + check-ins + division plans + safety; **no generated plan yet** | £4.99 (~$6.30) | £29.99 (~$38) | Priced at category median despite training + nutrition in bundle. Annual correctly priced; monthly is less than half the global median. |

### 1.2 What the meal plan does to this table

The current Volyume Pro annual at £29.99 already includes more than MacroFactor
($71.99 annual, no meal plan) and more than Alpha Progression ($59.99, no
nutrition at all). With the generated meal plan added, the bundle now includes
everything RP Diet Coach offers (per-slot macro targets, peri-workout nutrition)
*plus* what RP does not: an assembled day plan, one-tap swap with gram rescale,
coach-integrated plan edits at the gram of rice, offline-first, and verified
UK food data.

RP Diet Coach charges ~$209/year. MacroFactor charges $71.99. Their sum is
~$281/year. Volyume offers training coaching + adaptive nutrition coaching +
generated meal plan + verified UK food data + offline-first for £29.99/year.
This is not an argument to raise the price immediately. It is the evidence
base for rewriting the paywall copy.

### 1.3 Willingness-to-pay evidence: honest assessment

**What the data actually says:**

- RevenueCat/Adapty 2026: H&F median annual is $38–44.99. Volyume at £29.99 (~$38)
  sits at the lower end of this band. The evidence does *not* say users will pay
  more for a more feature-rich product — it says the median willingness-to-pay is
  already here.
- Carbon raised from ~$99 to ~$99.99 in 2026 (marginal move) and frames it as
  "less than a human coach." RP at ~$209/year is the highest successfully charged
  price in the physique-specific nutrition category, and it does so without a
  generated meal plan. These are ceiling signals, not floors.
- RevenueCat: price *changes* win only 28.3% of the time in experiments. Presentation
  changes (what you lead with) win far more often. This is a strong argument for
  changing the *framing* of £29.99 rather than the number itself.
- The key willingness-to-pay signal: Stronger U closed in March 2026. Its users
  paid ~£150–189/month for what was, mechanically, a macro-coaching service with
  a curated food plan. Those users now need a product. They will pay more than
  category median, and they recognise the value of a generated, coach-integrated
  meal plan because they had the human version. This is the most actionable WTP
  signal in the market right now.

**The honest conclusion:**

Do not raise the annual price at launch. The evidence for price insensitivity in
this bracket is weak, and the cost of being wrong (Strava/Whoop price-sensitivity
backlash) is disproportionate to the gain. Instead:

1. Rewrite the paywall to lead with the meal plan as the flagship value, making
   the current price feel like an obvious yes rather than a borderline maybe.
2. Revisit the monthly price (£4.99 is genuinely under-priced at less than half
   the global median) — but this is a separate decision, requires founder sign-off
   under billing rules, and has higher risk than a copy change.
3. If a price increase is ever tested, move the annual to £39.99 (top of the H&F
   band, £10 increase, round number, still dramatically below RP Diet Coach and
   the human-coaching floor). Never raise monthly above £6.99 without controlled
   A/B evidence. Never raise prices on existing subscribers without explicit notice
   and a grandfathering period (Whoop/Strava lessons).

### 1.4 Does the meal plan justify a tier structure?

**The direct answer: No, not yet. Here is why.**

A two-tier structure (e.g. "Standard" = training + nutrition without meal plan;
"Premium" = full bundle with meal plan) would make the meal plan the centrepiece
of a higher tier, potentially at a higher price point. The arguments for and
against:

**For a tier:**
- RP Diet Coach charges ~$209/year for essentially one component (nutrition timing
  coaching). If meal planning is genuinely that valuable, a "Premium" at, say,
  £49.99/year is within evidenced WTP for that feature alone.
- Tiering lets the app grow revenue from existing Pro users by upselling, not
  just from new subscribers.

**Against a tier:**
- The locked-doc principle: "Free vs Pro gating is absolute." A new tier re-draws
  this line. Per `_FOUNDER-CONTEXT-2026-06-12.md`, the free/Pro line can be
  deliberately re-drawn as a repositioning decision — but this is a significant
  founder-level call, not a recommendation to make unilaterally.
- The dual-market mandate (Besa + Eddie) is best served by a *simpler* value
  proposition, not a more complex one. Besa does not want to choose a tier;
  she wants to be told what to pay for and what she gets.
- Operational complexity: two tiers means two paywall experiences, two trial
  paths, two renewal emails, two store listing descriptions, and ongoing
  decisions about which features belong in which tier.
- Evidence from AllTrails: a new Peak tier above Plus is exactly the move that
  led to backlash when Trail Conditions was reclassified upward. The safest
  version of tiering introduces a genuinely new tier above the existing one —
  never reclassifies something existing subscribers already have.

**The recommendation:** Keep one Pro tier. Include the generated meal plan in
Pro at launch. Rewrite the pitch around it. The pricing and feature bundle
already justify a higher price than the current £29.99 — use the value
advantage to win conversions at the existing price rather than to extract more
from each conversion. Revisit tiering in 12 months when there is actual usage
and retention data on the meal plan feature.

---

## 2. Paywall and trial moments: where the meal plan sits in the funnel

### 2.1 The proposed "Today's plate" teaser: is it the right lever?

The generator blueprint proposes (§3.7) a read-only "Today's plate" teaser
visible in the free funnel — a static preview of one example day plan with
swap/log actions locked behind Pro. The rationale: "it tells me what to eat"
is the strongest beginner draw (ext-03 §2.1), and Yazio's plan feature is its
top beginner acquisition lever.

**Assessment: this is the right lever. Here is the evidence and the caveats.**

**Evidence for the teaser:**
- Yazio ($3.3M/month revenue) sources document that "meal planning from calorie
  targets is the beginner draw: 'it tells me what to eat, I don't have to
  think.'" (ext-03 §1.12.) Yazio's plan feature is prominently visible before
  paywall — it is the product, not a feature.
- RevenueCat 2026: soft paywalls (feature visible, action locked) convert ~50%
  better at the gate than hard paywalls that reveal nothing. The mechanism is
  desire creation: you cannot want what you cannot see. The teaser creates
  desire at zero value delivery cost.
- The OMENA case (COMP-007): a redesign that let users see what they were
  paying for before paying doubled trial starts. Doubling trial starts at the
  same conversion rate doubles revenue — this is a funnel lever, not an
  optimisation.
- MacroFactor's stated gap in ext-03 §1.1 and bp-meal-plan-generator.md §1.2:
  "users who want to reduce decision fatigue may prefer RP… MacroFactor assumes
  users accept the responsibility of deciding what to eat." The teaser is the
  exact answer to Besa's "but I don't know what to eat" — shown before the
  paywall, it converts that uncertainty into motivation to pay.

**What comparable apps' teaser patterns show:**
- **Eat This Much (free tier):** generates one day's plan free, full week behind
  premium. This is the direct template. The free day plan is the hook; the week
  plan is the sale. Volyume's "one preview day" teaser is the same mechanic.
- **Yazio (free tier):** shows the meal plan UI with greyed-out populated meals,
  a single prominent "Unlock" CTA. The plan is visually concrete before payment.
  Unlike Volyume's proposal, Yazio shows fake/placeholder meals — Volyume should
  show a *real generated plan for the user's actual targets* (computed from the
  onboarding data Volyume already has), which is stronger because it is personal.
- **RP Diet Coach (trial):** the full product is available on trial; there is no
  teaser pattern — this is a hard paywall model. Less relevant here.
- **Strava (reverse trial):** 30-day full access, then drops to free. The
  "reverse trial" is the most powerful version of this — let the user fully
  experience the value before the payment moment. Volyume's 14-day trial already
  does this. The teaser augments the reverse trial by bringing the discovery
  moment forward, before the trial even starts.

**The caveat: this requires founder sign-off as a deliberate free/Pro line redraw.**

The generator blueprint is explicit: "This is a deliberate re-draw of the line
for sign-off, not an accidental leak." The teaser must be genuinely read-only
(no logging, no swaps, no diary writes). It exposes the *shape* of the value,
not the value itself. The test for compliance: "Does the free user get nutrition
benefit from the teaser?" If yes, it is a Pro feature leak. If no (it is a
view-only preview that creates desire without satisfying it), it is a marketing
surface.

**The right free/Pro boundary for the teaser:**
- FREE: view one generated plan day (your targets, real meals, real macros) —
  read only. No logging action. No swap action. Meals are locked cards.
- PRO: generate your full plan, log all, swap any meal, week plan, coach-
  integrated plan edits, training-day/rest-day variants.

This is analogous to how Hevy shows "what Pro charts look like" in the free
tier — the shape of the value, not the value itself.

### 2.2 Where in the funnel: the three key moments

**Moment 1 — Onboarding result screen (Day 0)**

The highest-leverage teaser placement. The user has just completed the
onboarding quiz and been shown their training plan. At this exact moment,
show a nutrition card: "Here's what a day of eating at your targets looks like"
— a real generated preview using their just-computed macro targets, their
declared diet preference, their allergens. One card. Three meals. No actions.
Below it: "Unlock full meal planning — log, swap, and let your coach adjust."

Why here: Day 0 is where 80–90% of trials start (round-1 §1). The desire for
both the training plan and the food plan is highest at the moment they are
simultaneously revealed. Showing the meal plan preview at the training plan
reveal anchors both as a single cohesive product rather than two separate
features.

**Moment 2 — Empty diary state (Day 1–3)**

Besa opens the diary tab for the first time. It is empty. Every mass-market
nutrition app solves this with a CTA, but Volyume can go further: show the
teaser plan for today directly in the empty state. "Here's what we'd suggest
eating today. Unlock to log and customise."

This is the "day-3 trial moment" explicitly named in the task brief. The
evidence: RevenueCat 2026 documents that trial-to-paid conversion is highest
when the user reaches a "success moment" — a moment where the value is
tangibly visible and the barrier to capturing it is a single payment. The
empty diary + visible plan is that moment. The user does not need to imagine
the value; they can see it.

For Besa, this resolves her primary barrier ("I don't know what to eat") at
the exact moment she encounters it. The psychological mechanism is cognitive
closure: the plan exists; the only thing preventing her from using it is a
£29.99 decision.

**Moment 3 — The coach check-in output (Day 7+)**

When the coaching engine produces a check-in narration (weight trend,
adjustment, held decision), and the user does not yet have a meal plan, the
coach output card should reference the plan: "Your target dropped 150 kcal
this week. If you had a meal plan, I'd show you exactly what to reduce. Here's
a preview."

This is the Pro differential badge pattern (already in Volyume) applied to
the meal plan specifically. It frames the plan not as a static feature but as
the live output of the coaching engine — which is its genuine differentiator.
MacroFactor does not have this. Carbon does not have this. RP Diet Coach does
not have this. This moment is uniquely Volyume.

### 2.3 Trial design: does the meal plan change the 14-day trial structure?

**No.** The 14-day trial is correctly designed and the evidence base for it
is strong (COMP-007, round-1 §4). The meal plan does not require a longer
trial — the value of the plan is visible within the first day (by Day 0 if
the teaser is shipped), and the coach-integrated plan edit requires only one
coaching cycle (~7 days) to demonstrate.

What changes within the existing trial structure:
- **Day 0:** teaser shown (onboarding result).
- **Day 1:** "Generate today's plan" is the first action prompt in the Pro
  trial, not just "log a food."
- **Day 7:** the first coaching cycle triggers with a plan in place — the coach
  narrates "I've updated your plan: here's what changed." This is the aha
  moment that the trial must reach. It is the inverse of Fitbod's 3-workout
  trial problem: the Volyume trial is long enough for the coach to demonstrate
  its meal-plan intelligence.
- **Day 14:** if the user has not converted, the reverse trial drops them to
  free. The diary becomes read-only. The last meal plan they generated is
  preserved but locked — they can see it, cannot generate a new one. Loss
  aversion (Strava/Ladder mechanism) is strong here because the plan is their
  plan, not a generic example.

---

## 3. Positioning copy: the "£200/month coach in your pocket" frame with the meal plan

### 3.1 How the frame changes

The prior monetisation work (COMP-007 §7) frames the paywall value as:
"Flo/YAZIO's proof pattern + Mojo's anchoring evidence + MacroFactor's honesty,
on a 14-day trial that Fitbod's own critics say a compounding product needs."

That framing is correct and survives the meal plan addition. What changes is
the headline value proposition. Before: "adaptive coaching that explains itself."
After: "adaptive coaching that explains itself AND tells you exactly what to eat,
down to the gram."

The human-coach anchor was already in the prior work (Runna §7: "anchor coaching
subscriptions against human-coach prices, not against other apps"). The meal
plan makes this anchor dramatically more credible and more specific.

**Old frame:** "A coach in your pocket that adjusts your training and nutrition."
**New frame:** "The meal plan a prep coach would charge £150/month for. Free
for 14 days."

The new frame is stronger because:
1. It is concrete. A meal plan is a tangible deliverable; "coaching" is abstract.
2. It answers Besa's literal question ("what do I eat?") rather than promising
   an abstraction.
3. It has a verifiable comparator (human prep coaches charge £150–400/month for
   a spreadsheet meal plan and a WhatsApp check-in; Volyume does the same thing
   for less than £3/month on annual).
4. It is honest. The plan is real, generated from real targets, offline, no AI.
   There is no promise that cannot be kept.

### 3.2 The paywall hero copy: directions (British English throughout)

**Current hero copy direction (from COMP-007):** benefit-driven, coaching-focused,
social proof block above the price.

**Updated hero copy directions with the meal plan as lead value:**

Option A — Plan-led, Besa-primary:
```
Your plate, sorted.
Meal plans that hit your targets — generated, adjusted, and explained
by your coaching engine. Free for 14 days, no card needed.
```

Option B — Coach-anchor, both personas:
```
Your prep coach, for £2.50 a month.
Personalised training plan. Macro targets. A generated meal plan that
updates when your targets do. Everything your prep coach charges
£150/month for.
```

Option C — Gap-filling, MacroFactor users:
```
The meal plan MacroFactor refused to build.
Adaptive macro coaching + a full daily plan with one-tap swaps.
Your coach adjusts the plan gram by gram at check-in.
```

**Assessment of the three options:**
- Option A is the cleanest Besa acquisition frame. "Your plate, sorted" is
  identity-adjacent ("sorted" = calm, in control, not overwhelmed) and directly
  answers the decision-fatigue problem ext-03 identified as the biggest beginner
  draw. It will underperform for Eddie, who does not need to be "sorted."
- Option B is the dual-market frame. The human-coach price anchor ("£150/month")
  is the most evidence-backed conversion driver in the coaching app category
  (Runna's whole pitch is this). The £2.50/month effective annual calculation
  (£29.99/year ÷ 12) is honest and striking. Caution: "prep coach" reads
  clearly to Eddie; it may not land for Besa who does not know the term.
- Option C is targeted at the MacroFactor/Carbon user population — advanced
  macro trackers who know the gap. It will convert Eddie faster. It will not
  convert Besa at all.

**Recommendation:** Lead with Option A for the paywall hero (Besa is the larger
market) and use Option B framing on the store listing and in the coach output
deep-link to the paywall (Eddie arrives via coach output, not the organic funnel).
Option C is retained for potential use in targeted marketing copy (e.g. Reddit
fitness communities, App Store search) but not on the paywall itself.

### 3.3 The store listing: title, subtitle, and description update

The store listing copy is the first point of contact for both personas. The
meal plan changes the "above the fold" copy significantly.

**Google Play listing — suggested directions:**

*Short description (80 chars):*
```
Training plan + meal plan + coaching. Your prep coach in your pocket.
```

*Full description — opening paragraph:*
```
Volyume builds your training programme, calculates your nutrition targets,
and generates a daily meal plan to hit them — with one-tap swaps and a
coaching engine that adjusts the plan at check-in.

No guessing what to eat. No spreadsheets. No paying a prep coach £150/month.
```

**Notes on the store listing copy:**
- "Your prep coach in your pocket" earns its place here in a way it would not on
  every surface — the store listing is explicitly competitive, and the
  human-coach comparator is a standard and accepted frame in this category
  (Runna's entire App Store presence uses it).
- The phrase "No paying a prep coach £150/month" is close to a price comparison
  and must not be a dark pattern. It is factually accurate (human prep coaches
  do charge this), is not misleading about Volyume's price, and is the genuine
  value proposition rather than manufactured urgency. It survives the house
  voice test because it is honest and not urgent-feeling.
- "No guessing what to eat" directly addresses Besa's stated barrier (ext-03 §2.1).
- British English throughout: programme, colour, organised — check all copy.

### 3.4 The locked voice test

All copy above passes the Volyume locked voice test:
- No false urgency (no "limited time", no countdown timers, no "only X spots").
- No manufactured social pressure ("everyone is doing it").
- No dark patterns (price disclosed clearly, trial terms clear, cancel always visible).
- Honest comparators (£150/month is a real human coaching price, not invented).
- No body-shame language.
- No rate-of-loss claims ("lose X kg in Y weeks" appears nowhere above).

The human-coach anchor is not a dark pattern — it is the same frame Runna,
Carbon, and every evidence-based coaching app uses. It is a value anchor, not
a pressure tactic.

### 3.5 The coach output voice: the meal-plan-specific narration

The coach-output card (the five-part coaching voice in check-in output) gets a
new pattern when the meal plan is active. Per `planEdit.js` and `planExplain.js`
in the generator blueprint:

*Example narration (after a −150 kcal weekly adjustment):*
```
Your target dropped 150 kcal this week. I've taken 50 g of carbs off your
plan — that's 65 g less white rice at dinner. Open your meal plan to see it.
```

This is not marketing copy — it is the product. But it is also the most
powerful paywall lever in the product, because a free user who receives this
narration but has no plan sees the gap immediately. The coach output card for
non-plan Pro users should already show this; for free users, a version of this
narration should be visible with the plan reference locked:

*Free-user coach output card (locked plan reference):*
```
Your estimated targets changed this week. With a meal plan, I'd show you
exactly what to adjust — down to which foods and how many grams. [Unlock
meal planning]
```

This is the third conversion moment described in §2.2. It requires no new
engineering — it is a conditional render in the existing coach output card,
gated on `store.tier !== 'pro'`.

---

## 4. Risks: the honest list

### 4.1 Expectation risk: what users assume "meal plan" means vs what Volyume delivers

**The risk:** when users hear "meal plan," they may expect:
- Photo logging of any meal they cook (AI-analysed).
- Infinite recipe variety from a restaurant-grade recipe database.
- Restaurant or takeaway integration (e.g. Deliveroo meals fitted to plan).
- Meal prep batch-cooking with grocery lists generated to scale.
- Dietary variety that looks like a celebrity chef's Instagram.

**What Volyume actually delivers:**
- Plans assembled from ~90 curated, sensible bodybuilding meals (hand-verified,
  macro-correct, offline).
- One-tap swaps within the curated library.
- Anti-repetition variety dial, but within a deliberately limited food rotation
  (the "6–8 go-to meals" model that is *correct* for physique prep but may feel
  like repetition to a user expecting a recipe app).
- No photo logging, no AI food recognition (constraint: no AI).
- No grocery list generation (out of scope for the generator blueprint).
- No restaurant integration.

**How to manage this risk:**

a) **Set expectations at the paywall.** Copy that says "a daily plan from
   bodybuilding-verified meals" is more honest than "meal plan" alone, and will
   attract the right users rather than convert users who will immediately churn.

b) **Do not call it a "recipe app."** Describe it as "your daily plate" or
   "your food plan" — language that implies a practical eating guide, not a
   cooking experience. The generator blueprint's Besa framing ("Your plate")
   is correct.

c) **Explicitly mention the swap mechanic in onboarding.** "Don't fancy
   chicken? Tap swap — the macros adjust automatically." This sets the frame:
   you control what you eat; the app makes sure it still hits your targets.

d) **The curated library is a feature, not a limitation.** The generator
   blueprint is explicit: "every meal is already a sensible bodybuilding plate,
   so the assembler never produces a macro-correct but inedible combination."
   This is the actual competitive advantage over Eat This Much (which uses a
   free-combination approach and produces jarring meals) and over AI-generated
   plans (which are unverifiable). The copy should own this: "Meals chosen by
   prep coaches, not by an algorithm guessing from a database of 10 million
   foods."

### 4.2 Cannibalisation risk: does the meal plan make existing Pro features feel less valuable?

**Not a serious risk.** The meal plan is additive; it makes Pro worth more, not
less. The only scenario where it could undermine existing value is if users who
subscribed for training coaching feel the product has shifted its identity toward
nutrition. Eddie, the current core user, wants both — the plan is the elite
differentiator he has been waiting for (prep coaches, in his world, always
provide both).

The framing risk is different: if the paywall is rewritten to lead with "meal
plan" as the hero, Eddie may perceive a de-emphasis of the training coaching
that is actually his primary reason for subscribing. Mitigation: the paywall
should present the bundle, not a single feature. The meal plan is the new
headline; the training coaching, coaching engine, and division plans are the
proof that the nutrition is trustworthy. They are interdependent.

### 4.3 The Strava lesson: the meal plan must never be moved back

The most important operational risk. The Strava 2020 lesson (COMP-007 §2.6) is
specific: "Moving previously free features behind a paywall generally proved
harder to swallow than introducing new paid features outright." The parallel
here is internal to Pro: if the meal plan is in Pro at launch, it must stay in
Pro. If the teaser is shown to free users at launch, it must never be removed
from free users.

Applied directly:
- If the meal plan goes into Pro at launch, it cannot later be moved to a
  "Premium Pro" tier above the existing Pro — that is an AllTrails Peak error.
  Any future tiering must introduce *new* features above the current Pro tier,
  not reclassify existing ones upward.
- If the "Today's plate" teaser goes live for free users at launch, it cannot
  be quietly removed once the product is established. Free users who have come
  to rely on seeing the teaser as a daily signal will react to its removal.
  The teaser must be designed as a permanent free feature, not a temporary
  acquisition tactic.

### 4.4 Variety expectations and "prep fatigue"

**The risk:** users who come for "meal plans" expecting culinary variety will
find that prep-oriented, rotation-based eating (the correct physique approach)
feels repetitive. This is the RP Diet Coach / competition-prep model: repeating
6–8 meals is a feature for Eddie and a potential negative experience for Besa
who does not yet know this is how prep works.

**Mitigation:**
- Default the `variety` dial to 0.5–0.7 for new users (moderate rotation, not
  meal-prep mode).
- Besa's onboarding question: "Do you prefer variety or a simple rotation?" —
  this is both a preference capture and an expectation setter.
- The "Don't fancy this?" one-tap swap is the safety valve: even on a rotation
  plan, the user can always swap to something different. The plan is guidance,
  not a cage (3DMJ principle, generator blueprint §1.1).
- The copy around the plan should use language like "your go-to meals" or
  "your rotation" — normalising a small food rotation as intentional prep
  behaviour, not a limitation.

### 4.5 App Store and Play subscription-presentation compliance

The meal plan does not introduce any new compliance risks beyond what COMP-007
already identified and resolved. Specific checks:

**What stays compliant:**
- Product IDs unchanged (`pro_monthly` / `pro_annual`): no new store products,
  no compliance burden.
- The teaser preview is not a subscription benefit — it is app content visible
  to free users. It does not need to be listed in the store subscription
  description.
- The paywall copy changes are presentation changes; Play/App Store paywall
  guidelines apply to purchase mechanics, not to marketing copy on the screen.

**What requires attention if a price change is ever tested:**
- Any change to the price displayed on the store listing or paywall requires
  sandbox testing per COMP-007 §9.5 and explicit founder sign-off under
  billing rules.
- Any change to the *trial terms* (length, card requirement) requires store
  review compliance checks; this report recommends no trial term changes.

**What is newly introduced:**
- The "Today's plate" teaser must be clearly positioned as "preview" content,
  not as a subscription benefit. If a user screenshots it and later claims they
  were misled about what the free tier provides, the read-only nature and the
  "Unlock" CTA must make the distinction unambiguous.
- App Store in-app purchase guidelines (2.9.2) require that subscription benefits
  are not "misleadingly represented." The teaser does not misrepresent — it
  shows a genuine sample of Pro output. This is well within the guidelines.

### 4.6 The "no AI" differentiation risk

**A positive risk, but worth naming.** The market is moving toward AI meal
planning (PT Distinction AI builder, Everfit AI meal variation, Zoe "Ziggie" AI
chatbot). In 2–3 years, "AI meal plan" may be an expected feature that users
assume every app has.

Volyume's positioning as *not* AI needs to be proactively framed as a strength
rather than a gap. The generator blueprint identifies this as "the curated-library
approach is Volyume's structural advantage." The marketing copy should articulate
this before a competitor does:

*Suggested framing:*
```
Not AI. Not guesswork.
Your meal plan is built from meals verified by prep coaches, assembled to
hit your exact targets to the gram. No algorithm hallucinations. No
"cashews identified as shrimp."
```

("Cashews identified as shrimp" is a real Lifesum-style AI regression failure
cited in the generator blueprint as the avoided anti-pattern.) This framing is
honest, differentiated, and credible to Eddie. For Besa, simplify: "Meals
verified by coaches, not invented by an algorithm."

---

## 5. Recommendations: the ranked list

### REC-1 — Rewrite the paywall hero copy to lead with the meal plan (high priority, no billing changes)

The meal plan is the new headline value. The paywall copy should be rewritten
before or at the same time the feature ships. Directions in §3.2.

**Recommended primary copy:** Option A for organic/Besa funnel, Option B for
coach-output → paywall journey. Both in British English.

**Effort:** S (copy only, no engineering). **Persona:** Both (A = Besa primary,
B = Eddie primary). **Effect:** conversion (paywall), credibility (store).
**Constraint:** house voice — no false urgency, no dark patterns; billing rules
for any paywall file changes (founder sign-off per COMP-007 precedent).

### REC-2 — Ship the "Today's plate" teaser for free users (high priority, founder sign-off required)

Show a real generated preview day plan on the onboarding result screen and in
the empty diary state. Read-only. No logging, no swaps, no diary writes. One
clear "Unlock meal planning" CTA.

This is the highest-conviction new conversion lever in the product. The evidence
basis: Yazio's plan feature as its top beginner acquisition lever; Eat This Much's
free day plan as the hook for its premium week plan; RevenueCat soft-paywall +30%
conversion uplift evidence; the MacroFactor gap ("tells me what to eat" as the
explicit unmet need).

**What requires founder sign-off:** this is a deliberate redraw of the free/Pro
line. It is not a Pro feature leak (no logging function is exposed), but it must
be explicitly confirmed as intentional before shipping.

**Effort:** M (onboarding screen + empty diary state card; plan preview rendered
from existing `calculateNutritionTargets` + a single `assembleDayPlan` call with
a fixed seed for the preview). **Persona:** Besa primary. **Effect:** activation
(D0), conversion (D1–D3). **Constraint:** free/Pro gating — no logging exposed.

### REC-3 — Add the locked plan reference to coach output for non-plan and free users (medium priority)

When the coach narrates a macro adjustment and no plan is active (or user is
free), show a locked variant of the narration: "With a meal plan, I'd show you
which foods to adjust and by how many grams. [Unlock meal planning]"

This is a low-effort, high-specificity conversion moment. It demonstrates the
integration value at the exact moment the integration would be useful.

**Effort:** S (conditional render in coach output card). **Persona:** Both.
**Effect:** conversion (Day 7+, coaching cycle moment). **Constraint:** none.

### REC-4 — Update the store listing to lead with the meal plan (medium priority)

Rewrite the Google Play short description and opening paragraph of the full
description. Directions in §3.3.

**Effort:** S (content update, no engineering). **Persona:** Besa primary for
new installs. **Effect:** install rate, store credibility. **Constraint:** none.

### REC-5 — Set expectations explicitly in onboarding: "your go-to meals, not a recipe app" (medium priority)

A single sentence in the nutrition onboarding step that sets the frame: "We'll
build your plan from prep-coach-verified meals — you'll get a rotation that
hits your targets without any guesswork."

This manages the expectation gap (§4.1) and positions the curated approach as
a deliberate choice rather than a limitation.

**Effort:** XS (one sentence, onboarding copy). **Persona:** Besa primary.
**Effect:** reduces early churn from unmet expectations. **Constraint:** none.

### REC-6 — Do not raise prices at launch; document the case for a future £39.99 annual test (low priority, billing rules apply)

The case for a higher annual price exists and is documented in §1.3. The
evidence against acting on it now is stronger (price changes win only 28.3% of
experiments; the conversion opportunity from reframing the current price is
larger than the marginal revenue from a price increase; the pre-launch posture
makes this the wrong time to test pricing).

**If and when a price test is run:** move annual to £39.99 (top of H&F band),
A/B tested, with existing subscribers grandfathered. Never raise monthly
without controlled evidence. This requires explicit founder sign-off under
billing rules — document the case, do not act on it without that sign-off.

**Effort:** S (documentation); L (if a price change is implemented, due to
billing compliance). **Persona:** N/A. **Effect:** revenue per subscriber.
**Constraint:** billing rules (explicit "proceed" required for any price change).

### REC-7 — Frame "not AI" as a competitive differentiator in all copy (low priority, ongoing)

As the market moves toward AI meal planning, proactively own the "prep-coach-
verified, not AI-generated" positioning. Specific copy directions in §4.6.

**Effort:** XS (copy discipline, no engineering). **Persona:** Eddie primary
(credibility); Besa secondary (reassurance). **Effect:** differentiation,
trust, long-term brand. **Constraint:** none.

---

## 6. What the prior monetisation work got right (unchanged conclusions)

The following COMP-007 / round-1 findings are unaffected by the meal plan and
do not need re-examination:

- Annual-first ordering on the paywall: correct. The meal plan strengthens the
  annual value case further.
- 14-day cardless trial: correct. The meal plan fits within this trial length
  (one coaching cycle = Day 7 plan update; full experience by Day 14).
- Social proof block (verified Play reviews): correct. The curation rules
  (§4.2 in COMP-007) remain unchanged. Add "the coach updated my meal plan
  at check-in" as an eligible quote theme alongside the existing list.
- "No ads, and your data is never sold" trust line: correct. Unchanged.
- Hard paywall for fitness: correct. The teaser (REC-2) is a soft touchpoint
  that leads to the hard paywall, not a replacement for it.
- No lifetime SKU for an ongoing coaching service: correct. The meal plan
  increases server-side complexity (plan generation, sync), reinforcing
  the case against a lifetime offer.

One prior conclusion to **update:**

**COMP-007 §4.2 review excerpt themes** (eligible quote categories):
Add: "the plan updated at check-in" and "it tells me exactly what to eat"
as eligible themes for review excerpt curation. These are the meal-plan
conversion moments most likely to produce quotable reviews from early adopters,
and they are ED-safety-compliant (no weight loss claims, no body comparisons).

---

## 7. Summary: the four-line recommendation set

1. **Rewrite the paywall hero copy** to lead with the meal plan as the
   headline value. Option A for organic Besa funnel; Option B for coach-output
   conversion path. British English, no false urgency.

2. **Ship the "Today's plate" teaser** as a read-only free preview on the
   onboarding result screen and empty diary state. Founder sign-off required
   (deliberate free/Pro line redraw). This is the highest single conversion
   lever the product now has.

3. **Do not raise the price or add a tier at launch.** The current annual
   price buys far more than competitors charge for less. Use the value
   advantage to win conversions at £29.99, not to extract more per
   conversion. Document the case for a future £39.99 test; do not run it
   without billing sign-off.

4. **Own "not AI" as a deliberate differentiator.** As the market moves
   toward AI meal planning, the curated, prep-coach-verified, deterministic
   approach is a credibility advantage — especially with Eddie and with
   the ex-Stronger U / ex-Carbon users now in the market. Frame it that
   way everywhere.

---

*Report completed 2026-06-12. Assigned slice: monetisation impact of the
meal-plan flagship. Prior monetisation baseline: `competitive-audit-01-
monetisation-research.md` and `impl-COMP-007-paywall-proof.md`.
Algorithm blueprint: `bp-meal-plan-generator.md`.*

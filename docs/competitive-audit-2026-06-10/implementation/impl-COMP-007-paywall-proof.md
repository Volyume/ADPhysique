# COMP-007 — Paywall social proof + annual-first ordering

> Implementation blueprint, 2026-06-10. Approved spec: `../competitive-audit-03-master-proposals.md`
> (COMP-007, priority 4.0 — impact 8 / effort 2). Evidence base:
> `../competitive-audit-01-monetisation-research.md` (round 1, agent 9).
> Source files verified on branch `claude/main-branch-content-update-dcqicf`:
> `src/screens/PaywallScreen.js`, `src/screens/ProUpgradeScreen.js`,
> `src/components/TierComparisonStrip.js`, `src/lib/storeReview.js`,
> `src/lib/payments/catalogue.js`, `src/lib/payments/usePlayPrices.js`,
> `src/lib/telemetry/events.js`.
>
> **BILLING WARNING (read first):** every code change in this blueprint lands in
> a purchase surface (`PaywallScreen.js`, `ProUpgradeScreen.js`,
> `TierComparisonStrip.js`). Per `CLAUDE.md` and `docs/rules/billing.md`, none of
> it may be implemented without the founder's explicit **"proceed"**, and all of
> it must be sandbox-tested before release. §9.5 lists every billing-adjacent
> touch individually. Product IDs `volyume_pro_monthly` / `volyume_pro_annual`,
> prices (£4.99 / £29.99), the trial structure and the SKU catalogue are **not
> touched** by this blueprint.

---

## 1. Best-in-market bar

### 1.1 The benchmark set

**Flo and YAZIO — testimonials with star ratings directly on the paywall.**
The two highest-revenue examples in the category's near neighbourhood (Flo
~$9M/month, YAZIO ~$3.3M/month) both place user quotes with star ratings on
the purchase screen itself, not on a marketing page
([Apphud, paywall design guide](https://apphud.com/blog/design-high-converting-subscription-app-paywalls)).
What makes it work: the quote sits *above* the price, so the user reads a
peer's verdict before they read a number. The social proof answers the exact
question the price raises ("is it worth it?") at the instant it is raised.

**OMENA — the testimonial-led scrollable paywall that doubled trial starts.**
OMENA (fitness for women 40+) rebuilt its paywall as a scrollable page led by
testimonials, user photos and an FAQ, and **doubled trial starts**; a related
redesign that simply *led with a 5-star review* lifted conversion **>20 %**
to 3.24 % ([RevenueCat paywall redesign case studies](https://www.revenuecat.com/blog/growth/paywall-redesigns-case-studies/)).
This is the single strongest controlled evidence that review-first ordering,
not just review presence, is the lever.

**Mojo — annual-default plan selection.** One of Mojo's most successful
RevenueCat-documented tests hid the monthly plan behind a "View all plans"
link and showed yearly by default: a notable increase in yearly subscriptions
with only minor effect on overall conversion. A related case removed monthly
from the main paywall entirely and saw **+31 % install-to-trial and +64 %
revenue** ([RevenueCat, paywall conversion boosters](https://www.revenuecat.com/blog/growth/paywall-conversion-boosters/)
— *search-extract evidence: RevenueCat blog returns 403 to direct fetch;
figures from search summaries, consistent with round-1 triangulation*).

**MacroFactor — the proof-of-method paywall.** No testimonials; instead the
hard paywall is justified by openly argued reasons (no ads, privacy, the
algorithm essays) ([Stronger by Science](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)).
Relevant here because Volyume's COMP-006 methodology page plays this role —
social proof and proof-of-method are complementary, not substitutes.

**Fitbod — the cautionary half of the bar.** Strong product, $15.99/mo,
benefit-led copy, but a 3-logged-workout trial that reviewers consistently
flag as too short to surface compounding value
([Fitness Drum](https://fitnessdrum.com/fitbod-review/), round-1 §2.8). Its
paywall converts on brand and AI promise, not on demonstrated value or peer
proof — beatable (§7).

### 1.2 The benchmark data on annual vs monthly

- **68 % of H&F revenue is annual** (RevenueCat State of Subscription Apps
  2026); Adapty has annual *dominant* at **60.6 %** — H&F is the **only**
  category where annual leads ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps/),
  [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)).
- RevenueCat's category guidance: H&F and Education show strong annual
  demand; defaults and "best value" labels should be A/B tested, and
  well-implemented price anchoring "drives more users toward higher-tier
  options and longer commitment periods"
  ([RevenueCat mobile paywall guide](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/)).
- Adapty's experiment-win-rate data: price *changes* rarely win on conversion
  (28.3 % win rate) but presentation tests are the cheap, high-win-rate class
  ([Adapty paywall experiments playbook](https://adapty.io/blog/paywall-experiments-playbook/),
  [State of in-app subscriptions](https://uploads.adapty.io/state_of_in_app_subscriptions_2025.pdf)).
  Annual-first is exactly a presentation test: zero price risk.
- Trial-inclusive paywalls convert 64.5 % vs 44.4 % for visual-only, and
  "leading with 4.7 stars from 52,000 reviews before price frequently
  produces measurable lift" ([Airbridge social proof](https://www.airbridge.io/en/blog/social-proof-for-apps)).

**The single best reference: OMENA / the RevenueCat review-led redesign** —
it is the only controlled test in the set that isolates exactly COMP-007's
two moves (lead with a real review; restructure the plan decision) and
reports the lift (>20 % and 2× trial starts).

---

## 2. What fails

- **Generic "Pro Features" bullet walls.** Superwall's fitness teardown:
  cluttered tier-comparison tables cause "analysis paralysis"; benefit-driven
  CTAs beat generic "Subscribe"
  ([Superwall best practices](https://superwall.com/blog/superwall-best-practices-winning-paywall-strategies-and-experiments-to/)).
  Volyume already avoided this — TierComparisonStrip is locked at three rows
  ("list length kills conversion", design lock in the component header). The
  social proof block must not reopen that door: **one** excerpt visible at a
  time, never a wall of quotes.
- **Fake or unverifiable testimonials.** Quiz-theatre apps that fabricate
  personalisation and proof convert short-term and then pay for it in store
  reviews and churn (round-1 design research: 61-paywall-experiment
  onboarding theatre "converted, then destroyed the rating";
  `../competitive-audit-01-design-ux-research.md`). The approved spec is
  explicit: *never fabricate quotes*. A made-up "Sarah, 34" is detectable
  (no matching store review exists) and detection is fatal for an app whose
  brand is "honest coach".
- **Dark-pattern pressure.** Apple and (increasingly) Play reject paywalls
  that hide price, obscure trial length or bury cancel terms; price
  misdirection via small print is now an actively policed pattern
  ([RevenueFlo on iOS paywall rejections](https://revenueflo.com/blog/common-ios-paywall-rejections-and-the-fixes-that-work),
  [Adapty on dark patterns](https://adapty.io/blog/dark-patterns-and-tricks-in-mobile-apps/)).
  Volyume's terms line, restore link and per-period disclosure already comply
  — annual-first must not degrade them: when annual is preselected the
  disclosure must state the **annual** price and yearly renewal (it already
  does — `renewCadence` is derived from `period`, PaywallScreen.js:145).
- **Hiding monthly entirely.** Mojo's "View all plans" trick lifted yearly
  share, but in the most subscription-hostile niche in fitness (round-1 §2.10:
  Strong's App Store rage; lifting-tracker users are the segment most likely
  to read it as a trap), burying the cheap option reads as misdirection.
  Volyume preselects annual and **keeps monthly fully visible** — anchoring
  without concealment.
- **Monthly-first anchoring (the current state).** PaywallScreen.js:44–46
  defaults to monthly as "the lower-commitment yes for a new app". The
  category data says this rationale is backwards for H&F: it anchors the
  product at £4.99 (less than half the global median monthly), suppresses
  the plan the category actually buys (60–68 % annual), and recruits the
  subscriber class with the worst reactivation economics to be the default
  (annual cancellers reactivate at 5 %, but monthly *churns* far more often
  in the first place — round-1 §1).
- **Begging for reviews on the paywall or gating on a rating.** Play's
  In-App Review API forbids incentivised or pre-filtered prompts ("would you
  rate us 5 stars?" screens) and gives the app **no signal of outcome**
  ([Android developers, In-App Review API](https://developer.android.com/guide/playcore/in-app-review)).
  The collection loop (§4.4) must stay inside those rules.

---

## 3. User psychology

- **Moment of need.** PaywallScreen opens from a DifferentialBadge tap or
  CoachOutput — the user has just been *shown* something Pro did (a held
  decision, an adjustment they can't apply). They arrive curious, not
  ambushed. The conversion question in their head is "do people like me find
  this worth paying for?" — which is precisely the question a verified peer
  review answers and a feature list does not. Social proof belongs **between
  the promise (title/subtitle) and the price (strip + chips)**: proof before
  price, per the Airbridge/OMENA evidence.
- **Anchoring.** Whichever plan renders first and preselected is the
  reference point. Annual-first makes £29.99/year the anchor and monthly the
  visible, honest escape hatch; the existing "Save 50 %" badge converts the
  anchor into a win ("I chose the smart option") rather than a concession.
  The reverse — today's layout — makes annual feel like an upsell.
- **Commitment device, not sunk cost.** An annual subscriber to a coaching
  app is buying a commitment device: the H&F category is the only one where
  users *prefer* the year because the goal is a year-shaped project. The
  honest frame is "a year of coaching for half the price", never countdown
  timers or fake scarcity (banned by the house voice anyway).
- **Social proof vs feature comparison.** The strip answers "what do I get?";
  the review answers "did it work for someone real?". "Considering" users at
  this surface have usually already seen the feature list (DifferentialBadge
  context). What converts them is third-party validation with verifiable
  provenance; what repels them is anything that smells curated-to-deceive —
  hence verbatim excerpts, named source, recency, and a rating that matches
  what they can check on the store listing in two taps.
- **Effort budget.** Zero new taps. The block adds ~2 lines of reading.
  Nothing else on the screen moves except the chip order.
- **Emotional safety.** Review excerpts are curated under the ED-safety copy
  rule (§4.2): no rate-of-loss numbers, no body-shame, no "lost X kg in Y
  weeks" quotes, ever — a transformation quote that is safe for most users
  is not safe for the users the safety system exists for. Coaching-quality
  and trust quotes only.
- **Word-of-mouth surface.** The collection loop itself (§4.4) is the
  word-of-mouth machine: the review prompt fires at the 10th completed
  workout after 14+ days — the moment the habit is real — and the paywall
  then replays the best of those voices to the next cohort.

---

## 4. The Volyume implementation

Two screens change: `PaywallScreen.js` (primary) and `ProUpgradeScreen.js`
(mirror, period chips only — it has no room for the review block in its
auth-heavy layout and already carries the perk list). `TierComparisonStrip.js`
gets a cadence suffix. **No other surface.** Nothing joins Home, nothing new
navigates anywhere. This is enrichment of an existing decision surface — the
streamlining rule's best case.

### 4.0 Ship shape: two independent stages

- **Stage A — annual-first (no dependency, ship at next release after
  founder "proceed").** Pure presentation change.
- **Stage B — social proof (gated on real reviews existing).** The block
  renders **only when the curated excerpt list is non-empty**; it ships dark
  (empty list) in the same PR and lights up via a content-only PR once §4.4's
  bar is met. No feature flag infrastructure needed — `excerpts.length === 0`
  *is* the flag.

### 4.1 Annual-first plan selector (Stage A)

Current state (verified): `PaywallScreen.js:46` defaults `period` to
`'monthly'`; the `periodRow` renders Monthly first (left), Annual second with
the `saveBadge` ("Save {annualSavingsPct()}%" = **50 %**: £4.99 × 12 = £59.88
vs £29.99, `catalogue.js:100–105`). `ProUpgradeScreen.js:50` likewise
defaults `'monthly'` with an identical chip row at lines 378–402.

Spec:

1. **Default:** `period` initialises to `'annual'` unless
   `route?.params?.period === 'monthly'` (PaywallScreen) / `useState('annual')`
   (ProUpgradeScreen). Update the line-44 comment to state the new rationale
   (H&F is annual-dominant, 60.6–68 %; cite round-1 §1 in the comment).
2. **Order:** Annual chip renders first (left), Monthly second. The savings
   badge stays on Annual. No "hide monthly" variant — visible escape hatch
   is deliberate (§2).
3. **Badge unchanged:** `annualSavingsPct()` already computes from the
   catalogue reference prices; **no `catalogue.js` edit**. Do not attempt a
   localised per-month-equivalent ("£2.50/month"): `usePlayPrices` exposes
   formatted strings only, no numeric micros (verified,
   `usePlayPrices.js:33–36`), and deriving numbers from formatted strings
   breaks PLAY-002. The currency-free "Save 50 %" badge carries the maths.
4. **Strip cadence suffix:** with annual as default, `TierComparisonStrip`'s
   Pro column would show the Play-formatted "£29.99" with no period — easily
   misread as monthly (it looks 6× more expensive). Add a small muted
   cadence line under `colPrice` ("per year" / "per month", derived from the
   existing `pricingWindow` prop) and "for ever" under Free's £0 is *not*
   needed — just the Pro column. ~6 lines in `TierComparisonStrip.js`.
5. **Disclosure/CTA:** already period-driven (`renewCadence`, `termsText`,
   `ctaLabel` — PaywallScreen.js:145–166); with annual default the disclosure
   correctly states "Free for 7 days, then £29.99. Renews yearly until you
   cancel." Verify in sandbox both periods and the price-not-yet-loaded
   state (`PRICE_LOADING`).
6. **Accessibility:** existing `accessibilityState={{ selected }}` and
   price-bearing labels are kept; chip order change preserves them. Focus
   order follows the new visual order naturally (left-to-right).

### 4.2 Verified review excerpts (Stage B)

**Placement:** one compact block between the subtitle and `stripWrap`
(PaywallScreen.js, after line 182) — proof before price (§3). Single excerpt
visible; if more than one is curated, pick deterministically by
`excerptIndex = dayOfYear % excerpts.length` (rotates daily, no randomness,
stable within a session — consistent with the no-randomness house rule and
testable).

**Layout (one bordered card, surface-coloured, matching `periodBtn`
furniture):**

```
★★★★★                                  [5 filled star icons, primary colour]
"Quote text verbatim, max ~140 chars, numberOfLines={3}"
Daniel · Google Play · May 2026         [muted, fontSize.xs]
```

**Verification and provenance rules (the honesty contract):**

1. **Source:** only published Google Play reviews, read from Play Console
   (User feedback → Reviews). Never solicited copy, never beta-tester DMs,
   never paraphrased. The Play Developer API `reviews` resource can list
   recent reviews ([Google Play Developer API](https://developers.google.com/android-publisher/api-ref/rest/v3/reviews))
   but curation is manual and founder-approved — no automation, no fetch at
   runtime (offline-first: excerpts are a static frozen array bundled in the
   app, e.g. `src/screens/paywallExcerpts.js` or a constant in the screen,
   founder's call; **not** in `src/lib/payments/` — keep content out of the
   billing layer).
2. **Verbatim excerpting:** an excerpt may shorten a review (ellipsis) but
   never alter words, fix grammar, or splice sentences. Spelling stays as
   the reviewer wrote it (their words, their spelling — the British English
   rule governs *our* copy, not quotes).
3. **Attribution:** reviewer's public first name or first initial exactly as
   shown on Play, the literal source label "Google Play", and month + year
   of the review. No surnames, no invented demographics, no photos. This is
   public data the reviewer published on the same store the user installed
   from — checkable in two taps, which is the point.
4. **Rating:** show the review's own star rating (curate 5-star only; a
   4-star quote is fine later if the text is strong — show 4 stars then,
   never round up).
5. **Recency:** retire any excerpt older than 12 months at each content
   refresh; refresh quarterly.
6. **ED-safety copy screen (curation rule, absolute):** no excerpts that
   state weight lost, rate of loss, body measurements, appearance
   judgements, or "finally thin"-type sentiment. Eligible themes: the coach
   explaining itself, holds/safety behaviour, offline reliability, plan
   quality, "it refused to cut my calories" trust moments. This rule is
   listed in the excerpt module's header comment so it survives staff
   changes. No behavioural change is needed when wellbeing flags are open —
   the screened excerpts are safe for all users by construction.
7. **Removal request:** if a reviewer edits or deletes their review, drop
   the excerpt at the next refresh; if one ever objects, drop it in the next
   release. (No PII leaves the device: excerpts are bundled content, not
   user data — no privacy-policy impact.)

**Launch bar:** ≥3 usable excerpts passing rules 1–6 (target 5 for daily
rotation depth). Below 3, the list stays empty and the block does not render
(no empty state, no placeholder — absence is the empty state).

**Copy direction (house voice — plain, terse, no hype):**

- Block needs no header. If the founder wants one: `From Google Play` (muted,
  xs) — never "What our users say".
- Example display string (format, not invented content — the real quote
  comes from a real review):
  `"★★★★★ — 'It tells you why it changed your plan. No other app does that.' — Chris · Google Play · April 2026"`
- Annual chip accessibility label (existing pattern kept):
  `Annual, £29.99, save 50 per cent`.
- Updated code comment for the default flip (developer-facing): `Annual is
  the default: health and fitness is the only category where annual
  dominates (60–68% of revenue), and the saving is honest (50%). Monthly
  stays fully visible — anchor, don't hide.`

**Offline behaviour:** entirely static content; identical offline. The only
network-dependent elements on the screen remain the Play prices, with their
existing loading states.

### 4.3 What ProUpgradeScreen gets

Annual-first chips only (default + order + comment), mirroring §4.1 — the
screen's job is account creation and its perk list + credential note already
occupy the proof slot. Adding the review card there too would duplicate
content across two surfaces a user may see minutes apart. If the founder
wants proof on it later, it takes the same component, but the blueprint's
recommendation is no.

### 4.4 The collection process (the dependency, runs first)

Current machinery (verified, `src/lib/storeReview.js` +
`WorkoutSummaryScreen.js:426–427`): the in-app review prompt fires once per
install, after **≥10 completed workouts AND ≥14 days** since the first
counted one, from the post-workout summary — a peak-satisfaction, habit-real
moment. `SettingsAboutScreen.js:33` also offers a manual "rate" path. This
is already best-practice shaped (Play guidance: ask after enough engagement,
never ask questions first, never incentivise —
[Android developers](https://developer.android.com/guide/playcore/in-app-review)).

**No code change to storeReview.js.** The thresholds are right; loosening
them to harvest quotes faster would spend the one OS-permitted prompt early
(the file's own comment records why) and flirt with Play's quota/abuse
rules. The dependency is a *process*, not code:

1. **Now → launch bar:** monthly, founder (or delegate) reads new Play
   Console reviews, copies candidates passing §4.2 rules into a tracking doc
   with screenshot + date.
2. **Cadence maths (set expectations):** the API gives no outcome signal and
   Google throttles display quota, so assume a minority of eligible prompts
   produce a *written* review (industry experience: most produce ratings,
   not text). With the both-gates threshold, expect roughly weeks-to-months
   of active-user accumulation before 3–5 quotable texts exist. That is
   fine: Stage A ships immediately and carries the conversion lift in the
   meantime.
3. **Reply to every review** in Play Console (founder voice) — replies lift
   re-review rates and signal the "honest coach" brand on the surface
   prospects actually read.
4. **The loop closes:** paywall converts → subscriber trains → 10th workout
   → prompt → review → next quarter's excerpt. §6.

### 4.5 Edge cases

- **Prices not yet loaded:** unchanged behaviour (chips show `…`, CTA drops
  the figure). The review block is price-independent.
- **`route.params.period`:** deep links / CascadeGate hand-offs that pass
  `period: 'monthly'` still get monthly preselected (param wins over the
  new default).
- **CascadeGate (day-14/28 gates):** out of scope — separate screen, more
  branched decision. If the founder wants the excerpt card there later it is
  the same component; do not add it in this PR.
- **Tablet/large fonts:** excerpt uses `numberOfLines={3}` and the card
  grows; nothing absolute-positioned except the existing badge.

---

## 5. Whole-package integration

- **COMP-012 (trust row): one shared footer line, jointly owned.** COMP-012's
  blueprint §4.4 claims a single muted line above `legalRow` on PaywallScreen
  (mirrored on ProUpgradeScreen): *"No ads, and your data is never sold. Pro
  is the only way Volyume makes money."* The orchestrator brief for this task
  quotes the Welcome-row wording ("Works fully offline · Exports anytime ·
  No ads, ever") — these must not stack. **Resolution: one line, COMP-012's
  §4.4 money-model wording on the paywall (it is the conversion-relevant
  clause), final wording a founder pick at copy review.** COMP-007's layout
  budget reserves exactly one footer line for it.
- **COMP-006 (methodology):** its blueprint §5.1 proposes a paywall row
  ("Built on published science…"). Two added proof blocks on one screen is
  one too many. Resolution: the **review excerpt card is the paywall's proof
  slot**; COMP-006's methodology link rides the existing
  `SubscriptionPolicy`-style legal row or the You tab as its own blueprint
  prefers, not a second paywall card. Where the two meet: review quotes
  about the coach explaining itself (§4.2 theme list) *are* the methodology
  made human — the excerpts should prefer that theme.
- **COMP-013 (plan reveal → paywall momentum):** COMP-013 measures
  trial→paid for cohorts with a completed first session by D3 using the same
  paywall telemetry (migration 032). Annual-first changes the denominator
  economics of that funnel; both blueprints read the same
  `paywall_tapped_cta` stream, so land COMP-007's telemetry payload addition
  (§8) before COMP-013's cohort cut is interpreted.
- **Paywall layout budget (streamlining):** net additions to PaywallScreen =
  one review card + one shared footer line. Chip order swaps in place. The
  screen keeps its "single decision: pay or dismiss" character (file header
  comment) — nothing else may be added by other blueprints without removing
  something.
- **ED/wellbeing flags:** no behavioural branching needed; §4.2 rule 6 makes
  the content safe by construction. The paywall itself is not an emotional
  surface under the safety system's definitions.

## 6. Retention & word-of-mouth mechanics

Conversion is the headline metric, but the durable asset is the **review
flywheel**: prompt at the 10-workout/14-day habit point → public review →
founder reply → curated excerpt → paywall converts a peer → that subscriber
reaches their own 10th workout. Each quarter's refresh keeps the paywall's
voice current and gives long-term users the small vanity hit of possibly
being quoted (they will tell people). Secondary retention effect:
annual-first shifts mix toward subscribers who keep access through the
motivation dips that drive 38 % of fitness churn (round-1 §1 churn reasons)
— the coach gets a full year to demonstrate compounding value, which is
where Volyume's engine is strongest. The pre-renewal value-recap problem
that annual mix creates is COMP-025/the recap line's job, already tracked
separately (round-1 §5 gap 2).

## 7. Beating the benchmark

Fitbod's paywall sells a promise ("AI builds your workout") backed by brand
weight at $15.99/month with a 3-workout trial that ends before the algorithm
can prove itself. Volyume's redesigned paywall is met *after* the product has
already demonstrated the differential (the user arrived by tapping evidence
of a real coaching decision), shows a verifiable peer verdict — verbatim,
named, dated, checkable on the same store in two taps, something neither
Fitbod nor any audited lifting app ships — anchors on the plan the category
actually buys with an honest 50 % saving and the cheap option still in plain
sight, and closes with a money-model trust line no VC-backed competitor can
copy ("Pro is the only way Volyume makes money"). It is Flo/YAZIO's proof
pattern + Mojo's anchoring evidence + MacroFactor's honesty, on a 14-day
trial that Fitbod's own critics say a compounding product needs.

## 8. Measurement

All on existing locked telemetry (Panel 5, `src/lib/telemetry/events.js`)
except one payload addition:

1. **Paywall-to-start rate:** `paywall_tapped_cta {cta:'pay_pro'}` ÷
   `paywall_shown`, per `surface`, before/after each stage (Stage A and B
   land separately precisely so their effects are separable).
2. **Annual vs monthly split:** add `period: 'monthly'|'annual'` to the
   `paywall_tapped_cta` pay_pro payload (event *names* are locked; this is a
   payload field — **flag to founder with the telemetry catalogue owner**,
   counts/flags only so it stays within the no-PII payload rule). Target:
   move toward the category's 60 %+ annual share. Server-side cross-check:
   SKU mix via Play Console / RTDN.
3. **Dismiss rate:** `paywall_tapped_cta {cta:'dismiss'}` ÷ `paywall_shown`
   — the guard metric; if annual-first spikes dismissals, the anchor is
   reading as a price hike and Stage A reverts (one-line revert).
4. **Review-loop health (manual, monthly):** count of new Play reviews and
   of quotable candidates passing §4.2 — the Stage B gate metric.

## 9. Build notes

1. **Files touched (all changes, nothing else):**
   - `src/screens/PaywallScreen.js` — default period flip + comment rewrite
     (lines 44–46), chip order swap (lines 191–213), review excerpt card
     (~40 lines incl. styles, after line 182), shared footer line (with
     COMP-012, above `legalRow`).
   - `src/screens/ProUpgradeScreen.js` — default flip (line 50) + chip order
     (lines 378–402).
   - `src/components/TierComparisonStrip.js` — cadence suffix under
     `colPrice` (~6 lines).
   - New: `src/screens/paywallExcerpts.js` (frozen array + curation-rules
     header comment; ships empty).
   - `src/lib/telemetry` payload addition per §8.2 (one call-site change in
     PaywallScreen's `handlePay`, no events.js change).
   - **Not touched:** `catalogue.js`, `playBilling.js`, `cascade.js`,
     `usePlayPrices.js`, `storeReview.js`, SKUs, prices, trial logic,
     CascadeGate.
2. **Current plan order (verified):** monthly default + monthly-first render
   on both screens; savings badge and `annualSavingsPct()` (= 50 %) already
   exist — annual-first is genuinely a presentation-only change.
3. **Reuse:** `periodBtn`/`saveBadge` styles, `surface`/`primaryBg` tokens,
   Ionicons stars, existing accessibility patterns, existing telemetry
   events; deterministic day-of-year rotation needs no library.
4. **Effort sanity-check vs approved score (effort 2):** Stage A ≈ 2 hours +
   sandbox passes; Stage B code ≈ half a day; strip suffix trivial. Holds
   comfortably at 2. The real cost is calendar time for review collection
   (§4.4) and founder curation — process, not engineering. `npm run lint &&
   npm test` after each stage; screen-mount test already mocks
   `requestReview`, expect strip/paywall snapshot tests to need updates.
5. **BILLING SIGN-OFF LIST — each item needs explicit founder "proceed"
   before code is written (CLAUDE.md + docs/rules/billing.md):**
   - (a) `PaywallScreen.js` default-period flip — **changes which SKU the
     default CTA purchases** (from `pro_monthly` to `pro_annual` when the
     user taps straight through). Purchase-flow-adjacent; sandbox test both
     periods, the 7-day-offer disclosure, and restore.
   - (b) `ProUpgradeScreen.js` same flip — same class.
   - (c) Chip order swap + review card + footer line on the same files —
     copy/layout only, but they live in billing files, so they ride the same
     approval.
   - (d) `TierComparisonStrip.js` cadence suffix — display-only, billing-
     adjacent file.
   - (e) Telemetry payload field (§8.2) — not billing, but the catalogue is
     locked documentation; flag in the same ask.
6. **Risks:** (1) annual default misread as a price increase → guard metric
   §8.3, instant one-line revert; (2) excerpt provenance challenged → §4.2
   rules make every quote checkable, and the launch bar prevents thin/forced
   proof; (3) review volume too low for Stage B for months → accepted by
   design, Stage A carries the lift; (4) third parties (COMP-006/012) each
   adding "one line" to the paywall → §5's layout budget is the contract.
7. **Noticed, not fixed (per CLAUDE.md "mention, don't fix"):**
   `catalogue.js` SKU ids are `pro_monthly` / `pro_annual` while
   `docs/rules/billing.md` and CLAUDE.md name the live Play products
   `volyume_pro_monthly` / `volyume_pro_annual`. If the catalogue ids are
   what `purchasePackage` sends to Play, one of the two is wrong — worth a
   founder check entirely outside this task. Also: `billing.md`'s locked
   Android paywall copy ("Try Pro free for 14 days. No card needed. Then
   £29.99/year or £4.99/month…") already lists annual first — the doc and
   this blueprint agree; the current screens are the outlier.

---

*Sources accessed 2026-06-10. RevenueCat blog/report pages return 403 to
direct fetch; Mojo and View-All-Plans figures are search-extract evidence
triangulated with round-1's independently gathered citations
(`../competitive-audit-01-monetisation-research.md`, same-day). All in-app
claims about current behaviour verified directly against source files listed
in the header.*

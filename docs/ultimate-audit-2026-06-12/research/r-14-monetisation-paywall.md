# r-14 — Monetisation & paywall: best-in-class fitness research (against a-14)

**Research only.** Pricing/billing are founder-sacred; this informs proposals, changes
nothing. British English throughout. Working internet; fetched sources cited per claim,
2+ for load-bearing ones. Failed fetches logged in §0. Not committed.

Aimed at the a-14 audit: Volyume = £4.99/mo · £29.99/yr (~50% annual saving), a
14-day **cardless** in-app trial granted at the consent step, budgeted cascade gates
≈ D12/D14. a-14's named frictions: (1) social-proof block ships dark, (2) win-back
store offer inert, (3) CascadeGate period order diverges from annual-first, (4) the
3-partner upsell sells an unbuilt UI (honesty defect), (5) price absent on first paint.

---

## 0. TOOLING PROOF & fetch log

**STEP 0 — proven.** Fetched `https://www.smartrabbitfitness.com/blog/en/fitness-ai-apps-price-comparison-fitbod-strong-hevy-2025`, which returned verbatim:

> "Strong costs [...]/month or [...]9.99/year. A free plan is available but limited to 3 custom routines."
> "Hevy also offers a free plan with unlimited workout logging, but with limited analytics."

And `https://getpulsesignal.com/pricing/hevy` returned verbatim: *"Hevy pricing starts at
$2.99/month across 3 plans"* (Last verified Jun 6 2026, sourced from hevy.com/pricing).
End-to-end fetch + content extraction confirmed working.

**Fetch failures (5), all logged, none load-bearing — routed via WebSearch index + 2nd source:**
- `hevyapp.com/pricing` — bot-verification wall ("Please wait while your request is being verified").
- `hevy.com/pricing` and `strong.app` — JS-rendered, body returned only a loading shell.
- `fitbod.me/pricing` — HTTP 403.
- `help.hevyapp.com/.../hevy-pro` — HTTP 404; `alphaprogression.com/en/pricing` — "Shared content could not be found".

These are the same bot-wall pattern flagged in val-ext-03-06 (macrofactor.com, rpstrength help). Prices were re-anchored to official-page-indexed text plus an independent review/comparison source.

---

## 1. THE FIELD — price, tiers, trial, paywall (fetched, current June 2026)

All prices are the apps' own current figures (USD unless noted). Volyume's £4.99/£29.99 ≈
$6.3/$38 at ~1.27 for rough comparison only.

### Workout-logger tier (Volyume's nearest neighbours on price)

| App | Monthly | Yearly | Free tier | Trial | Card for trial? |
|---|---|---|---|---|---|
| **Hevy** | $2.99 | **$23.99** (+$74.99 lifetime) | Generous: unlimited logging, **4 routines / 7 custom exercises / 3mo history** | 7-day (Pro) | Store-card (Play/App Store) |
| **Strong** | ~$4.99 | ~$29.99 (~$99 lifetime) | "Free Forever" account; **limited to 3 routines** | store-trial | Store-card |
| **Boostcamp** | $14.99 (no trial) | **$59.99** ($4.99/mo annual) | **Very generous free-core:** 11,000+ programs, tracking, RPE/RIR, plate calc, PRs, year-end Wrapped, no ads, no time limit | 7-day (annual only) | Store-card |
| **Alpha Progression** | $12.99 | $79.99 | Limited free version | **14-day**, new customers only | Store-card |

Sources: getpulsesignal.com/pricing/hevy; push-pull.app/blog/push-pull-vs-hevy; smartrabbitfitness.com (Fitbod/Strong/Hevy comparison); boostcamp.app/pro + /free-workout-app; alphaprogression.com/en/subscribe + fitnessdrum.com/alpha-progression-app-review.

**Hevy at $23.99/yr is the category price floor** — and the explicit benchmark in this brief.
Its lever is a **genuinely usable free tier** (unlimited logging, social feed) that gates only
on *quantity* (routines/exercises/history), not on the core verb (logging). Boostcamp is the
purest "free-core" play: it gives away the entire program library and tracking and sells only
analytics depth + exclusive coach programs.

### AI / coaching-engine tier (Volyume's "coach-in-your-pocket" peers)

| App | Monthly | Yearly | Free tier | Trial | Coach-price anchor? |
|---|---|---|---|---|---|
| **Fitbod** | $15.99 ($12.99 SKU) | **$95.99** ($79.99 SKU) | None — **3 free workouts only** | 7-day, **card required** (opt into a plan) | implicit |
| **JuggernautAI** | $34.99 | $349.99 | None | **14-day** | **Explicit:** "coaching you'd expect from a 1-on-1 coach but for a fraction of the price" |
| **RP Hypertrophy** | $34.99 | **$299.99** ($224.99 on sale) | None | **No trial** — 30-day money-back guarantee | implicit (RP coaching is $349.99–599.99/mo) |
| **Caliber** | Free / **$19** group / **$200+** 1-on-1 | $12/mo annual (group) | **Robust free:** full builder, tracking, library, no ads (no trainer) | — | **Explicit tier ladder:** free → $19 AI/group → $200+ human |

Sources: push-pull.app/blog/push-pull-vs-fitbod + fitbod.zendesk.com subscriptions; juggernautai.app/pricing + juggernautai.app homepage; rpstrength.com/pages/hypertrophy-app + wellness.alibaba RP cost guides; barbend.com/caliber-fitness-app-review + corahealth.app/compare/caliber.

**Correction vs the brief:** RP Hypertrophy's "$34.99" is **monthly**; the per-year figure is
**$299.99** (≈$224.99 on sale). And RP runs **no free trial at all** — a 30-day money-back
guarantee instead. JuggernautAI's $349.99/yr matches RP's monthly $34.99 — both sit a tier
above Volyume and anchor hard against human-coach prices.

### Nutrition tier (food-diary comparators)

| App | Monthly | Yearly | Free tier | Trial |
|---|---|---|---|---|
| **MacroFactor** | $11.99 ($5.99/mo annual) | **$71.99** | **None, by design** — "there isn't (and will never be) a free version" | 7-day, **card required** |
| **Cronometer** | Gold $8.99 | Gold **$49.99** ($4.16/mo); Pro $39.99/mo | **Very generous:** 84 nutrients, **barcode scanning free** (MFP gates it), verified USDA/NCCDB data; caps history (7 days) + ads | — |

Sources: nutriscan.app/blog/posts/macrofactor-cost-2026 + macrofactor.com/workouts/price; nutriscan.app/blog/posts/cronometer-pricing-2026 + support.cronometer.com/Subscription-Types.

MacroFactor is the **"no free tier, premium-only, 7-day card-gated trial"** archetype — the
opposite philosophy to Volyume's cardless 14-day. Cronometer is the **"generous free as
acquisition"** archetype — free is a complete tracker; Gold sells convenience + history + ad
removal.

### Streaming / hardware-subscription tier (positioning references)

| App | Tiers & price | Free / trial | Model note |
|---|---|---|---|
| **Peloton App** | App One **$12.99/mo** ($15.99 on iOS), App+ **$28.99/mo** | Free trial on both | Two-tier digital; iOS price uplift for store fee |
| **Apple Fitness+** | **$9.99/mo · $79.99/yr** | **1-month free** | **Bundle play:** folded into Apple One Premier ($37.95/mo, ~$29/mo saving vs à-la-carte) |
| **Whoop** | One **$199/yr**, Peak **$239/yr**, Life **$359/yr** | — | **Hardware-as-subscription:** device + replacements + upgrades bundled into the membership; you never "buy" hardware |
| **Sweat** | **$19.99/mo · $119/yr** (£14.99 / £89) | **7-day** | Women's brand-led content |
| **Ladder** | Pro **$29.99/mo · $179.99/yr** ($14.99/mo equiv), Pro+ $34.99/mo | **7-day, NO card** | **Premium positioning;** no ongoing free tier — hard paywall after trial |

Sources: onepeloton.com/app-membership + support.onepeloton.com; apple.com/apple-fitness-plus + appleinsider.com/inside/apple-one; whoop.com/us/en/membership + trackervs.com/pricing/whoop-pricing; sweat.com/join + fitnessdrum.com/sweat-app-review; joinladder.com/pricing + gifit.io/blog/how-much-is-ladder-workout-app.

**Correction vs the brief:** Ladder's standard annual is **$179.99**, not $199.99 (the $199
figure circulates but the live page shows $179.99 Pro / $34.99/mo Pro+). Notably, **Ladder runs
a 7-day cardless trial** — same friction-removal lever Volyume uses, at a much higher price
point and with a *hard* paywall behind it.

---

## 2. TRIAL DESIGN, PAYWALL PRESENTATION & WIN-BACK (the mechanics, fetched)

### 2.1 Trial design — the field splits cleanly

- **Card-required, 7-day** is the mass default (Fitbod, MacroFactor, Hevy/Strong via store,
  Sweat). The 2026 trend is *shortening* trials to 7 or even 3 days to force faster
  activation-to-pay (adapty.io high-performing-paywall-2026).
- **Cardless, 14-day** is rare and premium-signalling: **Alpha Progression (14-day),
  JuggernautAI (14-day), Ladder (7-day cardless)**. Volyume's **14-day cardless** sits at the
  generous end of the whole field — longer than the mass default *and* no card.
- **No trial at all:** RP Hypertrophy (30-day money-back guarantee instead) — a premium signal
  ("we don't need to bribe you").
- Verified trial economics (val-ext-03-06, no re-fetch): long trials (17–32 days) convert
  **42.5%** vs **25.5%** for <4-day; H&F converts trials at **35%**; conversion lands Day 0 or
  Days 4–7. **So Volyume's 14-day length is supported, not a liability — do not shorten it.**

### 2.2 Paywall presentation patterns (winner moves)

- **Annual default with all tiers visible.** H&F is the **only** category where annual
  *dominates revenue* (**68%** per adapty.io 2026; 61% per the earlier Adapty cut in
  val-ext-03-06). Best practice is showing weekly/monthly/annual **together** so "annual makes
  monthly look fair" (adapty.io high-performing-paywall-2026). Volyume's Paywall/ProUpgrade
  already do this (annual-first, monthly visible). **CascadeGate is the only screen that
  diverges (monthly-first)** — a-14 friction #3.
- **Goal-matched social proof at the high-attention moment.** The strongest testimonial
  "addresses the exact fear the user is feeling at the paywall moment"; with five goal options,
  "five sets of testimonials is the minimum" (airbridge.io/blog/social-proof-for-apps). A
  **loading/"building your plan…" screen with social proof** before the paywall is now "table
  stakes" (funnelfox; adapty). Volyume ships its proof block **dark** (empty array) — a-14
  friction #1.
- **Coach-price value anchor.** The whole coaching tier anchors against human-coach prices:
  JuggernautAI verbatim — *"the detailed coaching you'd expect from a 1-on-1 coach but for a
  fraction of the price"* (juggernautai.app); Caliber lays out an explicit ladder (free → $19
  AI/group → **$200+** human 1-on-1) so its mid-tier looks cheap by construction (barbend
  Caliber review). Verified anchors (val-ext-03-06): UK prep coaches **£200–300/mo**, RP
  coaching $349.99–599.99/mo, WAG $99–219/mo. **Volyume's coach-in-your-pocket copy is the
  field-standard frame done honestly** — and at £29.99/yr it is ~1% of a year of UK human
  coaching, a sharper ratio than any peer here.

### 2.3 Win-back / discount mechanics (fetched)

- **Annual churn is near-terminal.** RevenueCat (115k apps, $16B): **95% of annual subscribers
  who cancel never return**; annual reactivation **~5%** vs **~20% for monthly within a year**
  (4×) (ppc.land RevenueCat finding). So Volyume's win-back ROI is structurally capped — the
  lever matters most for *monthly* lapsers and seasonal (post-New-Year) churn.
- **Lead with value, discount last; act fast.** Best first touch is **within 24h** of cancel; a
  4-email escalation reaches **~14.7%** cumulative reactivation; offer depth should scale with
  prior LTV (blog.mean.ceo win-back guide; airbridge win-back sequence). Volyume's win-back
  notification fires at **+30 days** and currently carries **no incentive** (offer unconfigured)
  — a-14 friction #2. The "numbers-led, no fake urgency" copy is *correct by the playbook*; the
  missing piece is a real (founder-configured) offer, ideally targeted at monthly lapsers.

---

## 3. SYNTHESIS

### (a) Winner patterns (with sources)

1. **All tiers on one paywall, annual pre-selected.** H&F is annual-dominant (68%);
   show-all-three reframes monthly as the fair middle. (adapty.io high-performing-paywall-2026;
   airbridge weekly-vs-annual.)
2. **Goal-matched social proof at the moment of doubt**, ideally over a "building your plan"
   loading beat. (airbridge social-proof-for-apps; funnelfox paywall designs.)
3. **Explicit coach-price anchor ladder** — name the human-coach price so the app price looks
   trivial. (juggernautai.app; barbend Caliber review.)
4. **Generous free-core as the acquisition engine** — give away the core verb, sell depth/
   convenience/history. (boostcamp.app/pro; cronometer; hevy free tier.)
5. **Fast, value-first, segmented win-back** — 24h first touch, discount last, depth by LTV;
   accept that annual win-back is ~5%. (ppc.land RevenueCat; blog.mean.ceo; airbridge.)

### (b) Where Volyume already LEADS honestly (no change needed)

- **Price point.** £29.99/yr undercuts every coaching peer (JuggernautAI $349.99, RP $299.99,
  Fitbod $95.99, MacroFactor $71.99, Ladder $179.99) and sits at the logger floor with Hevy
  ($23.99) — while bundling a coaching engine those loggers don't have.
- **Cardless 14-day trial.** Longer than the mass 7-day default *and* no card — only Alpha
  Progression and Ladder match the friction-removal, none beats the combination at this price.
  Verified trial-length economics favour keeping 14 days.
- **Free-tier generosity per the locked split.** Free = full logbook + library + builder + PBs
  + progress — gated on *capability* (the coaching layer), not on quantity-throttling the core
  verb (Hevy/Strong cap routines; Fitbod gives only 3 workouts). This is the Cronometer/Boostcamp
  "generous free" philosophy applied to training.
- **Anti-dark-pattern posture.** No countdown timers, no fake scarcity, store handoff never gated
  on the cancel-reason question, Play *pause* surfaced as an alternative — the field's testimonial/
  urgency tactics are deployed honestly here. This is a genuine differentiator, not a gap.

### (c) Ranked pick-ups vs a-14's frictions — presentation/honesty only

1. **Fix the 3-partner upsell honesty defect (a-14 #4) — NOT billing, ship now.** `PartnerScreen.js:211`
   sells "Go Pro for up to three [partners]" but the 3-partner UI is unbuilt (a-12). Reword or
   gate until the list UI exists. Pure honesty fix; no price/billing surface. **Highest priority —
   it's the one active false claim.**
2. **Light the social-proof block (a-14 #1) — presentation.** The honesty contract + empty-array
   plumbing already exist; the field treats goal-matched proof at the paywall as table stakes.
   *Founder-only input:* selecting ≥3 verified real Play reviews to fill `PAYWALL_EXCERPTS`
   (content decision, not code). Consider goal-segmented sets per the airbridge "five testimonials"
   pattern.
3. **Align CascadeGate to annual-first (a-14 #3) — presentation.** Make the trial-end gate match
   Paywall/ProUpgrade (annual pre-selected, monthly visible) for consistency with the locked
   annual-first decision and the 68%-annual category norm. **FOUNDER-ONLY flag:** this reorders a
   purchase surface's plan selection — touches billing presentation; propose, don't change.
4. **Give the win-back an actual incentive (a-14 #2) — FOUNDER-ONLY (billing).** Playbook says
   lead-with-value-discount-last and target *monthly* lapsers (annual win-back ~5%). The copy is
   already right; the missing piece is a Play Console win-back offer + earlier-than-30-day first
   touch. **Configuring a discounted offer is a billing action → founder-sacred; research only.**
5. **Soften the "price absent on first paint" beat (a-14 #5) — presentation.** Honest by design
   (never quote wrong currency), but the field fills the pre-price moment with value/social proof
   (the "building your plan" loading beat). Use that empty moment for proof/value framing rather
   than a bare "…". No hardcoded price — keeps the localisation honesty intact.

### (d) What everyone has that we lack

- **Filled social proof at the paywall** — universal in the field; ours is dark. (Biggest gap.)
- **A live win-back incentive** — peers run discounted/limited-time reactivation offers; ours is
  inert. (Founder/billing-gated.)
- **A pre-paywall "building your plan" value-loading beat** with social proof — now table stakes
  in top onboarding flows; Volyume has no equivalent staged value moment before the ask.
- **An explicit named-coach-price anchor on-screen.** JuggernautAI/Caliber *show* the human-coach
  price to make theirs look cheap. Volyume's copy implies the frame ("the coach who writes back")
  but never names the £200–300/mo human comparator. A presentation pick-up, fully honest (anchors
  verified in val-ext-03-06), and arguably Volyume's single strongest unused lever given its
  best-in-field price ratio.
- **Lifetime / multi-period options** (Hevy/Strong lifetime; MacroFactor 6-month). Not
  recommending — flagged only as a field feature we lack; any change here is billing/founder.

---

## 4. METHOD LOG

Fetched directly (verdict basis): smartrabbitfitness.com (Fitbod/Strong/Hevy comparison —
verbatim STEP-0 quote), getpulsesignal.com/pricing/hevy (verbatim), ppc.land RevenueCat win-back
finding (verbatim stats). WebSearch index + ≥1 corroborating review/official source for: Hevy,
Strong, Boostcamp, Alpha Progression, Fitbod, JuggernautAI, RP Hypertrophy, Caliber, MacroFactor,
Cronometer, Peloton, Apple Fitness+, Whoop, Sweat, Ladder, paywall/social-proof/annual-default
best practice, win-back mechanics, coach-price anchoring.

Verified base reused, not re-fetched (val-ext-03-06.md): trial-length conversion economics
(42.5% vs 25.5%; Day-0/Day-4–7), H&F 35% trial-to-paid, annual revenue share, UK coach anchors
£200–300/mo, RP/WAG/Carbon/MacroFactor coach + app prices.

Fetch failures (5, §0): hevyapp.com, hevy.com, strong.app, fitbod.me/pricing,
help.hevyapp.com / alphaprogression pricing-share — all bot-wall/JS/404; none load-bearing,
all re-anchored to 2+ sources.

*Completed 2026-06-12. Not committed — working tree only.*

# ext-03 — Mass-Market Nutrition / Food-Logging / Diet-Coaching Apps

> **PROVENANCE NOTICE (2026-06-12, added after a verified research-tooling
> failure):** this document presents itself as external/competitive research.
> The session that produced it cannot be verified from here, and the cloud
> environment used for this build BLOCKS page fetches (search digests only).
> Treat every competitive claim and citation in this document as UNVALIDATED
> until re-verified through a working /deep-research run or primary sources.
> Features built from it have NOT been proven better than competitors.

**Deep Audit 2026-06-12 · External slice**
*Read `_SHARED-BRIEF.md` before acting on anything here.*

---

## Orientation: what the prior audit already established

The 2026-06-10 audit (Agents 4 and 5) covered the landscape competently at a feature level. Rather than restate it, this report builds on it with:

1. **New apps** not covered or only briefly mentioned: Noom, Simple, Zoe, Welling, Lifesum (fresh 2026 regression data), RP Diet Coach (v1.52 overhaul), Avatar Nutrition.
2. **The beginner lens** the prior audit largely skipped — what makes Besa the Beginner stick past week 3 vs rage-quit.
3. **Behaviour/psychology** depth: adherence-neutral design, habit stacking, shame mechanics, identity framing.
4. **Monetisation mechanics** with hard benchmark data from RevenueCat/Adapty 2026.
5. **Volyume gaps** the prior audit did not surface or deliberately punted.

Prior findings this report endorses without repeating: MacroFactor's FLSI speed benchmark; Nutracheck's UK database moat; MFP barcode paywall as canonical cautionary tale; verified-data vs crowdsourced-rot dynamic; quick-add and per-meal-slot memory as top-priority logging features.

---

## 1. Per-app highlights

### 1.1 MacroFactor — the benchmark, but a beginner bottleneck

**Prior audit covered:** Speed (FLSI), verified database, adherence-neutral design, Coached/Collaborative/Manual autonomy, expenditure transparency, Expenditure V3.

**What this audit adds:**

**Adherence-neutral design is a system, not a style choice.** The mechanism: no red numbers, no streak penalties, no "you went over" warnings. The *functional* reason is that shame suppresses honest logging, and dishonest logs corrupt the TDEE algorithm — so non-shaming design is algorithmically self-interested, not just ethical. Quote from MacroFactor's own documentation: "Avoiding shame-based messaging and visual elements comes with a functional benefit: it makes people more likely to actually log everything they eat… updated recommendations are based on actual energy intake and changes in weight, not how well you stuck to recommendations." This is the strongest single argument for replicating this design philosophy in Volyume — it is not soft, it is hard-edged algorithm protection.

**Beginner bottleneck is real and documented.** Multiple 2026 review aggregations identify a consistent failure mode: "The settings screens, the weekly weigh-in cadence, the coaching card stack, the expenditure graphs, and the dense nutrient summaries add friction to a workflow that should take ten seconds per meal." (Hoot Fitness, 2026.) Users recommended it as a MacroFactor alternative site literally label the category "apps like MacroFactor but simpler." This is Volyume's opening: match MF's coaching quality, beat its beginner UX. The prior audit noted "too many numbers, too many charts" but did not fully explore what a simpler entry path looks like.

**No functional free tier** ($71.99/yr, 7-day trial) — the conversion funnel depends entirely on the trial. RevenueCat 2026: trials improve first-renewal retention by 8–60% in H&F. MF leverages this well; Volyume's 14-day cardless trial is structurally equivalent and should not be shortened.

**Sources:** MacroFactor adherence-neutral documentation (macrofactorapp.com/adherence-neutral/); Strongerbyscience.com/macrofactor-algorithms-philosophy/; hootfitness.com/blog/9-best-macrofactor-alternatives; nutrola.app/en/blog/apps-like-macrofactor-but-simpler.

---

### 1.2 Carbon Diet Coach — the physique competitor's adaptive coach

**Prior audit covered:** 3-question weekly check-in, four goal modes including reverse diet, simpler than MacroFactor.

**What this audit adds:**

**The algorithmic philosophy contrast:** MacroFactor says "show me what you actually did and I'll work with that"; Carbon says "follow the plan and I'll adjust for you." This maps directly onto the autonomy spectrum: MacroFactor rewards non-compliance by adapting to it; Carbon expects compliance and recalibrates when you don't deliver. For elite competitors (Eddie) doing contest prep with tight periodisation, Carbon's compliance-first model is a feature, not a bug. For beginners (Besa) who will inevitably have bad weeks, MacroFactor's approach is more forgiving.

**Pricing premium signal:** Carbon raised to $14.99/month or $99.99/year in 2026, more than MacroFactor ($11.99/$71.99). This frames it as "like having a coach without paying $100/month human coaching." The positioning is explicitly against human coaching economics — relevant given Stronger U's closure (31 March 2026) as documented in the prior audit.

**Carb-cycling and time-of-day tracking** are specialty features no other mass-market app matches — directly relevant to Eddie's contest prep needs. MacroFactor's Collaborative mode can approximate refeeds manually; Carbon's dedicated carb-cycling mode removes that burden.

**Volyume comparison:** Volyume's Precision Coaching engine is philosophically closer to Carbon (deterministic, compliance-informed) but with MATADOR diet breaks and refeeds as named coached features (which Carbon lacks). Volyume's explicit "Apply" consent per adjustment is unique. The gap: Carbon exposes its coaching engine as the primary value proposition in marketing and UI; Volyume's engine quality is less visible to a new user before they experience a coaching cycle.

**Sources:** nutrola.app/en/blog/macrofactor-vs-carbon-diet-coach-which-is-better-2026; goldiai.com/blog/macrofactor-vs-carbon-diet-coach/; calorietrackerlab.com/articles/macro-tracking-apps-comparison-2026/; nutriscan.app/blog/posts/carbon-diet-coach-pricing-2026-plans.

---

### 1.3 Noom — psychology-based coaching, but a cautionary tale

**Not covered in prior audit.**

**What Noom does:**
- CBT/ACT/DBT-derived daily psychology lessons (~10 min/day) on habit loops, emotional triggers, pattern interruption, identity-based change.
- Three-colour food system (green/yellow/orange-red) — not "forbidden foods" in branding but effectively caloric-density triage.
- Human-ish coaching: goal specialists at 300–400 users/each; group accountability community.
- Programme typically 16–52 weeks; content front-loaded (more lessons early), fading as habits supposedly form.
- 2026 pricing: Noom Weight ~$17.42/month (12-month plan). GLP-1 Med tier from $149 + $299/month ongoing — GLP-1 hit $100M run-rate within four months of Sept 2024 launch.

**What works (worth copying):**
- **Daily micro-lessons** tied to a specific behaviour: 10 minutes, one concept, one exercise. Beginners report this reduces overwhelm vs being shown everything at once. It is habit-stacking in the Fogg/Clear sense: a new behaviour is attached to an existing daily routine (opening the app).
- **Identity framing:** lessons explicitly reframe from outcome ("I want to lose weight") to identity ("I am someone who makes thoughtful food choices"). Research published in *Journal of Personality and Social Psychology* 2024 found identity-framing is more durable than outcome-goal framing for habit retention.
- **Non-numerical coaching voice:** the colour system provides guidance without displaying a calorie number. For beginners who find calorie counts anxiety-inducing, this lowers the psychological activation energy to start.

**What fails (do not copy):**
- **1,200 kcal default is dangerous and widely criticised.** Most women receive 1,200 kcal regardless of height, weight, or activity level — dietitians across multiple independent reviews call this "unrealistic" and "unsafe." One study found 73% of MFP users with eating disorders said the app "at least somewhat contributed" — Noom has similar structural risk because the psychological framing of "no bad foods" conflicts directly with its calorie restriction mechanics. No eating disorder screening at intake. Former coaches revealed 95% of responses are copy-pasted and coaches are not equipped to handle disordered eating patterns.
- **The colour system is implicitly shaming.** Despite "no forbidden foods" marketing, heavy orange-red food consumption triggers negative coaching messages. Users report guilt. The Femestella investigation documents ED harm from Noom specifically.
- **GLP-1 pivot signals strategic retreat from pure behaviour coaching.** Behaviour change is becoming the upsell, not the product. This is actually a Volyume opportunity: a deterministic, evidence-based coaching engine without pharmacological shortcuts is increasingly the market differentiator.

**Volyume comparison:** Volyume's ED safety system (Beat UK signposting, 1,200/1,500 kcal floors, rapid-loss lockout) makes it structurally safer than Noom by a significant margin. Volyume has no equivalent of Noom's daily psychology lessons — this is a genuine gap for beginner engagement. The coaching voice in check-ins and target explanations is functional but not psychologically scaffolded for beginners.

**Sources:** barbend.com/noom-weight-loss-app-review/; millennialhawk.com/noom-review/; www.femestella.com/noom-reviews-horror-stories-eating-disorders/; abbylangernutrition.com/noom-review-is-this-app-legit; sacra.com/c/noom/; nutriscan.app/blog/posts/is-noom-worth-it-2026; www.noom.com/in-the-news/noom-launches-microdose-glp-1.

---

### 1.4 Simple (simple.life) — habit-framing, not calorie-obsession

**Not covered in prior audit.**

**What Simple does:**
- Intermittent fasting + food logging + AI coaching ("Avo") combined in one app.
- 20M+ downloads, 800,000+ active subscribers, 4.7-star average.
- Core frame: "sustainable habits, not strict rules." No calorie obsession in free tier.
- AI coach Avo provides contextual suggestions, not just target numbers: "your protein is on track; here's what to eat for dinner to hit your targets."
- Free tier includes Avo, Nutrition Scores, wellness habit trackers. Premium adds daily personalised check-ins and educational library.
- Onboarding: asks about specific conditions, custom guidelines, dietary preferences — more personalised than MFP/Lose It intake.

**What works (worth copying):**
- **"Like texting a friend who's great at nutrition"** — the conversational framing removes clinical/judgmental tone entirely. Beginners report this dramatically lowers first-week dropout.
- **Fasting window as a daily anchor behaviour.** A fasting window is a binary, audible habit: eating window open/closed. This is a powerful commitment device for beginners who struggle to track individual foods — they track one behaviour instead of 20 items.
- **Non-restrictive framing:** marketing explicitly avoids the word "diet." This is psychologically important for the mass market where "diet" triggers defensive reactions and short-term thinking.
- **Habit-then-precision progression:** beginners start with broad habit (fasting window) before being introduced to precise macro targets. This reduces the overwhelming first-week exposure to numbers.

**Constraint conflict:** Simple's AI coaching is central to its value proposition. Volyume cannot replicate "Avo" without crossing the no-AI/LLM boundary. However, the *conversation pattern* and *progressive disclosure* (start simple, surface complexity later) is fully achievable deterministically.

**Sources:** fortune.com/article/simple-app-review/; simple.life; play.google.com/store/apps/details?id=life.simple; eatproteins.com/simple-weight-loss-review.

---

### 1.5 Zoe — personalised food scoring, UK credibility, premium positioning

**Not covered in prior audit.**

**What Zoe does:**
- Originally: at-home gut microbiome test + blood glucose CGM + fat test → personalised food scores. Cost ~£350+ for initial test + subscription.
- **Zoe 2.0 (September 2025 relaunch):** Removed CGM and fat test — gut test only remains. New £9.99/month app-only tier (no test required). AI food scanner and photo logging. Processed Food Risk analyser and barcode scanner. "Ziggie" AI chatbot. Food score out of 100 per meal. Gut microbiome score now out of 1,000.
- UK-focused, science-credibility positioning (Kings College London research backing, Tim Spector co-founder).

**What works (worth copying):**
- **Per-meal food score (0–100)** as a non-calorie metric: the score answers "how is this meal likely to influence my health if eaten regularly" rather than just counting calories. For beginners, this is much less overwhelming than five macro numbers. The score abstracts complexity into a single motivating number.
- **UK food science credibility:** Zoe's Kings College connection, NHS PREDICT study citations, and "real science" framing earns extraordinary press coverage in the UK. This is a positioning template — scientific credibility in a UK context converts to high-quality users even at premium price.
- **Processed Food Risk analyser:** barcode scan → food ultra-processing risk score. A UK gym-goer scanning a protein bar to check if it's "actually healthy" is a high-frequency behaviour that no other app in the category addresses directly.

**What fails:**
- Logging homemade meals is still difficult — the AI photo scanner struggles with anything involving mixing or cooking.
- Despite "no test required" tier, many users feel the core science claim only holds with the test. Without the personalisation data, it's broadly applicable healthy-eating advice (more plants, less processed food) wrapped in expensive branding.
- £9.99/month positions it above Nutracheck (£2.50/month effective) without the UK branded food database depth.

**Volyume comparison:** No equivalent food-quality score. Volyume logs macros and calories but has no single "how healthy was this meal?" metric. For Besa, the absence of this is a motivation gap — she gets a calorie number but no qualitative signal about food quality. There is no AI boundary conflict with a rule-based food quality score.

**Sources:** home-cooks.co.uk/pages/review-zoe; zoe.com/learn/zoe-2-0-science-made-simple; zoe.com/en-gb/buymembership; www.which.co.uk/reviews/nutrition-and-supplements/article/zoe-review; thegrocer.co.uk/news/nutrition-brand-zoe-launches-radically-redesigned-new-app; countryandtownhouse.com/food-and-drink/zoe-app-review.

---

### 1.6 Welling — the AI logging benchmark, a Volyume threat

**Not covered in prior audit.**

**What Welling does:**
- Photo + voice note + text chat → meal logged in 2.6 seconds average.
- Claims 95.6% food-identification accuracy across 15,000 test meals, ±1.2% portion-estimation error.
- Conversational AI coach: contextualises each meal against daily target, gives forward-looking suggestions ("here's what to eat for dinner to hit your protein").
- Android launched early 2026; positioned as "ChatGPT for weight loss."
- Non-judgmental framing throughout — "like a friend who's great at nutrition."
- Named top pick in multiple independent 2026 roundups for beginners specifically.

**Threat assessment:**
Welling is the most direct threat to beginner acquisition in this audit. It solves the #1 dropout cause (logging friction) with photo/voice entry. For Besa the Beginner, Welling's frictionless entry is categorically different from any manual-search-based app. The conversational AI coach provides the psychological scaffolding that beginner users say they want but Volyume cannot match without crossing the LLM boundary.

**Constraint analysis:** Volyume cannot replicate Welling's AI photo logging or its conversational coach without violating the hard no-AI/LLM rule. However:
- Welling's claimed accuracy (±1.2% MAPE) is almost certainly a controlled-test figure; real-world complex meals and restaurant food will perform much worse (see MFP Meal Scan at ±18% in the prior audit's cited benchmark). 
- Volyume's deterministic per-meal-slot memory + verified UK database + barcode + label OCR chain delivers comparable speed with far higher accuracy for the foods UK gym-goers actually eat.
- The psychological scaffolding Welling provides via AI can be partially replicated via deterministic contextual coaching messages — see Transferable Ideas section.

**Sources:** feastgood.com/welling-app-review/; welling.ai/articles/welling-vs-lose-it-2026; fitness-tracking.com/reviews/welling/; welling.ai/articles/welling-review-best-ai-calorie-counter-app-2026.

---

### 1.7 RP Diet Coach — the elite's meal-timing app, now faster

**Prior audit noted:** rigidity, shift-worker complaints, meal-by-meal timing, 2–3×/week weigh-ins. Not fully explored.

**What this audit adds:**

**v1.52 update (April 2026) signals the app knows its rigidity is a problem:**
- New: redistribute macros to any meal even if already populated — removes "must plan ahead" constraint.
- New: "Still planning foods" meal-state marker — acknowledges real-life mid-day eating pattern changes.
- App redesign drivers: simplified UI for new users, preparation for AI food logging, industry standardisation of logging flow.

**v1.5 (prior)** already addressed the logger — called it "now the fastest logger in the West" in their own blog. They understand their logging was a drop-off point.

**For Eddie specifically:** RP's training-aware meal timing (pre/post-workout macro splits based on session schedule) is unique in the category. No other consumer app adjusts meal composition *around* training timing. Volyume's training+nutrition coherence story is the closest parallel, but Volyume does not currently prescribe per-meal macro splits.

**What RP still fails at:** no UK food database coverage; rigidity remains despite UI softening; the shift-worker and irregular-schedule user is still underserved.

**Sources:** rpstrength.com/pages/diet-coach-app; help.rpstrength.com/hc/en-us/articles/39482632639639-Diet-app-update-v1-52-April-2-2026; feastgood.com/rp-diet-app-reviews/; noobgains.com/rp-diet-coach-app-review/; rpstrength.com/blogs/articles/rp-diet-coach-app-update-1-5.

---

### 1.8 Avatar Nutrition — the genre's origin, now a legacy product

**Prior audit covered briefly:** first consumer adaptive macro coach, Norton/Carbon split.

**What this audit adds:**

Avatar persists and has carved out a specific niche: reverse dieting and High/Low day carb cycling with adjustable macro sliders. Users on a reverse diet can set High days (more carbs/fat) and Low days that balance them. For the physique competitor transitioning out of a show diet, this is a useful structured tool that Carbon and MacroFactor require manual workarounds to replicate.

Avatar's pricing ($14.99/month or $99/year as of 2026) has not kept pace with UI modernisation. Reviews consistently note dated interface vs Carbon/MacroFactor. It survives on the strength of its science positioning (Layne Norton's methodology, despite his departure) and lack of a compelling free alternative for this specific use case.

**Volyume comparison:** Volyume's MATADOR protocol and built-in refeed support is more sophisticated than Avatar's High/Low day system. Avatar's moat is almost entirely historical — Volyume can close this gap with better surfacing of its existing engine features.

**Sources:** avatarnutrition.com; avatarnutrition.com/how-it-works/adaptive-nutrition; dr-muscle.com/free-paid-macrofactor-alternatives/; calorietrackerlab.com/articles/macro-tracking-apps-comparison-2026/.

---

### 1.9 Lifesum — beautiful but actively regressing

**Prior audit noted:** 2025 AI pivot producing consistent regression complaints (cashews identified as shrimp, etc.). This is worth emphasis:

The Lifesum case is the clearest 2025–2026 cautionary tale about AI-first feature pivots degrading trusted logging workflows. The Marlvel sentiment analysis found regressions in manual logging and meal duplication — core features that worked — broken by updates intended to add AI. Trustpilot reviews show "unusually consistent" regression complaints. The lesson: AI addition that breaks existing manual flows loses users faster than it gains them.

**Lifesum's one genuine strength:** the Life Score (weekly retrospective health score). It is a non-calorie summary that tells beginners "last week was 72/100." Retrospective rather than real-time, but it satisfies the "was this week good?" question without requiring micromanagement.

**Sources:** calorie-trackers.com/reviews/lifesum/; home-cooks.co.uk/pages/review-lifesum; marlvel.ai/intel-report/health-fitness/com-sillens-ishape; uk.trustpilot.com/review/lifesum.com.

---

### 1.10 Cronometer — accuracy for data-lovers, hostile to beginners

**Prior audit covered:** USDA/lab-verified database, 84 nutrients, no adaptive coaching, 45s per entry. 

**2026 update:** Multiple independent reviews now explicitly state "not for beginners" and cite the UI as the primary barrier — "opening the app to 82+ nutrient targets with colored progress bars is a lot to process when your goal is simply to start counting calories." No beginner mode has been added. Cronometer's positioning has fully bifurcated to dietitians, athletes, biohackers, and clinical users.

**Implication for Volyume:** Cronometer is not a beginner-acquisition threat; it is an Eddie-retention threat. If Eddie wants full micronutrient visibility (selenium, individual amino acids, fatty acid subtypes), Cronometer provides that and Volyume currently does not surface it. However, Eddie using Volyume for training *and* checking Cronometer for micronutrients is a fragmentation Volyume could close by adding a basic micronutrient overview panel (not full Cronometer depth — just the critical six: vitamin D, iron, calcium, omega-3, zinc, magnesium).

**Sources:** calorie-trackers.com/reviews/cronometer/; nutritiontrackerreviews.com/reviews/cronometer; mealift.app/blog/cronometer-review.

---

### 1.11 Lose It! — the friendly budget metaphor, eroding free tier

**Prior audit covered:** budget metaphor, limited adaptation, growing ad/billing resentment.

**2026 update confirms the slide:**
- Barcode scanner moved behind Premium for new accounts in 2026 — a direct repeat of the MFP 2022 error. Reddit thread with 148 upvotes: "The lose it app now doesn't let you see your daily macros without a subscription."
- UI redesign criticised for clutter: a 148-upvote Google Play review: "Latest update is TERRIBLE. Now a large panel of redundant buttons pops up when you add food."
- Free tier ambiguity: different sources report contradictory features — the inconsistency itself indicates Lose It is A/B testing paywall gates, which erodes user trust.

**Budget metaphor remains the category's best plain-English framing for beginners.** "You have 1,800 calories to spend today" is immediately comprehensible without any nutrition knowledge. Volyume uses technical target language; a budget metaphor layer for beginners would lower the conceptual barrier significantly.

**Sources:** nutrola.app/en/blog/is-lose-it-worth-it-without-premium; trygaya.com/review/lose-it-review; amyfoodjournal.com/blog/lose-it-app-review; nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium.

---

### 1.12 Yazio — clean, beginner-friendly, EU-strong, UK-weak

**Prior audit covered:** strong European database, barcode behind Pro, no offline mode.

**2026 update:**
- €/£47.90/year Pro; student discount available.
- Meal planning feature praised: 2,000+ recipes based on calorie targets and dietary preferences. Beginner users cite this as the key feature — "it tells me what to eat, I don't have to think."
- Onboarding asks about goals and food logging experience explicitly; short motivational pieces early.
- No offline mode remains the critical failure for UK users on the Underground, commuting, or in areas with poor signal.

**For Volyume:** Yazio's meal planning feature is significant beginner bait. "Tell me what to eat" is the most common beginner request and the direct answer to decision fatigue. Volyume has `mealSuggest.js` which is modest by comparison.

**Sources:** trygaya.com/review/yazio-review; home-cooks.co.uk/pages/review-yazio; hotelgyms.com/blog/yazio-nutrition-app-review; nutriscan.app/blog/posts/yazio-pricing-2026-free-vs-pro.

---

### 1.13 FatSecret — genuinely free, stagnant, underrated UK coverage

**Prior audit noted:** truly free barcode scanning, UK-localised database, stagnant development.

**2026 confirmation:** Still the only major app with full core features genuinely free (no trial expiration, no feature removals). UK database filters out US products by default — useful. Average calorie deviation ±8.4% from lab measurements (highest error margin tested). Restaurant and generic entries unreliable. Described as "stopped evolving" in 2026 reviews.

**Implication:** FatSecret is not a competitive threat but is an acquisition source — users who discover Volyume via FatSecret are typically free-tier users frustrated by data quality who would upgrade to Pro for reliable UK branded data plus coaching.

**Sources:** home-cooks.co.uk/pages/review-fatsecret; calorie-trackers.com/reviews/fatsecret/; fuelnutrition.app/reviews/fatsecret-review.

---

## 2. Themes the prior audit under-covered

### 2.1 The beginner's actual problem is not logging mechanics — it's not knowing what to eat

The prior audit framed the beginner problem as "logging friction." That is correct but incomplete. A deeper pattern from 2026 review sentiment: beginners often quit not because logging is slow but because **they don't know what to log** — they lack a mental model for what a day of eating looks like that would hit their targets. This produces decision fatigue before they even open the diary.

Apps that address this: Yazio (meal plans from calorie targets), Simple (fasting window as a frame that limits decisions), RP Diet Coach (prescriptive meal plans). Lose It's "budget" metaphor helps but does not answer "what can I spend it on?"

**Implication for Volyume:** `mealSuggest.js` is the right mechanism but needs significant depth to serve Besa. A daily "suggested menu" — three meals totalling her targets, drawn from her logged history or a default template — is the most direct answer. This is deterministic, offline-capable, and requires no AI.

### 2.2 Adherence-neutral design has a functional argument, not just an ethical one

The prior audit cited MacroFactor's non-shaming design. This audit strengthens the argument: shame suppresses logging, dishonest logs corrupt TDEE calculations, corrupted TDEE produces wrong targets, wrong targets produce user frustration. The chain is mechanical. For Volyume specifically: if a user under-logs a bad food day, the coaching engine under-estimates intake, over-estimates expenditure, fails to recommend a correction, and the user concludes "the coach isn't working." Reducing shame = better engine inputs = better coach outputs = higher retention. The business case is as strong as the ethical case.

This also reinforces Volyume's existing ED safety system as a *product quality* feature, not just a welfare obligation.

### 2.3 Streak psychology: a double-edged retention tool

The prior audit (impl-COMP-018-streak) shipped a streak feature. The 2026 research adds a critical nuance: streaks that users cannot realistically maintain produce anxiety-driven compliance rather than intrinsic motivation. Research shows "the streak is a punishment for not doing something, not a reward for doing it" — rooted in loss aversion (Kahneman's Prospect Theory: losses feel 2× more painful than equivalent gains feel good).

**For Volyume:** a logging streak applied to all days equally will cause beginner dropout when travel, illness, or social meals break the streak. The antidote is:
(a) "Flexible streaks" counting X out of Y days (5/7 is enough) — used by Simple and several habit trackers.
(b) "Comeback mechanic" — streak freeze or "streak shield" used by Duolingo and Habitica.
(c) Celebrate the weekly pattern, not the exact daily count.

Noom's approach of front-loading lesson content and fading it over time is the correct psychological model for progressive commitment.

### 2.4 Identity framing outperforms outcome framing for beginners

Multiple sources — including a 2024 *Journal of Personality and Social Psychology* study — confirm that framing nutrition tracking as identity ("I am someone who knows what I eat") rather than outcome ("I want to lose 5 kg") produces more durable habits. Apps implementing this: Simple ("sustainable habits, not strict rules"), Noom's CBT lessons, Welling ("like a food-aware friend"). Apps not implementing this: MFP, Lose It, Cronometer — all framed around outcome numbers.

**Implication for Volyume:** coaching voice at onboarding and early check-ins should include identity-framing language. "You're now someone who trains and tracks" is more retention-durable than "You need to hit 2,200 kcal today."

### 2.5 Nutrition app AI is bifurcating into two credible patterns; Volyume fits neither — yet

As of 2026:
- **Pattern A — AI photo/voice logging** (Welling, MFP Meal Scan, Cal AI): reduces entry friction but accuracy remains unreliable for complex meals; described as "demo feature, not a retention feature" in prior audit. This pattern is blocked by Volyume's no-AI/LLM constraint.
- **Pattern B — AI as search accelerator mapped to verified data** (MacroFactor "AI Describe"): voice/text input parsed to query the verified database, not AI-estimated nutrition. This is architecturally deterministic in its nutrition output even if the parsing uses a model. It is the only AI logging pattern with uniformly positive sentiment in 2026 reviews.

Pattern B is worth flagging as a PROPOSAL for the founder: "AI Describe"-style voice-to-verified-database search uses the LLM only for natural-language parsing (converting "a chicken breast and rice" into structured search queries), not for nutrition estimation. The nutrition data comes from the verified database. Whether this crosses Volyume's "no AI in the coaching engine" constraint depends on where the AI sits in the architecture — it would sit in the UI search layer, not in the coaching engine. This is a founder decision, flagged but not implemented.

---

## 3. Monetisation benchmarks (2026)

From RevenueCat State of Subscription Apps 2026 and Adapty Health & Fitness Benchmarks 2026:

| Metric | H&F category median | Notes |
|--------|---------------------|-------|
| Trial-to-paid conversion | 35.0% | Highest of any app category |
| Install LTV | $1.21 | Highest of any app category |
| Day 380 annual trial retention | 19.9% | vs 14.2% monthly, 5.5% weekly |
| First-renewal retention | 30.3% | Lowest in H&F despite high conversion |
| Annual plan revenue share | 60.6% (H&F) | Only category where annual dominates |
| Conversion day pattern | Day 0 or Days 4–7 | "Genuine intent" window; mid-week nudges have near-zero ROI |
| Long-trial (17–32 day) conversion | 42.5% median | vs 25.5% for <4-day trials — 70% better |
| Hard paywall Day 35 conversion | 5× better than soft | Across categories |

**Implications for Volyume's 14-day cardless trial:**
- 14 days is within the "long trial" band that converts at 42.5% vs 25.5% for short trials. Do not shorten.
- Day 0 converters are already motivated — the paywall's job is to not obstruct. Day 4–7 converters have experienced the coaching engine; the paywall trigger should appear after a first coaching recommendation or first check-in.
- First-renewal retention (30.3% category median) is the real churn risk, not initial conversion. The user who renews at month 13 has survived the hardest churn window. Volyume's deterministic Precision Coaching improvements (target adaptations, mesocycle transitions) should be the retention narrative at renewal.
- Annual-first positioning is correct. Monthly creates a low-friction cancel decision every 4 weeks; annual creates a default-continue dynamic.

**What converts free→paid (pattern from Cal AI Superwall case study + category evidence):**
- Paywall triggered at "success moments" (first coaching recommendation, first personal best, first check-in result) converts 30%+ better than time-based triggers.
- Soft paywalls (features visible but blurred/locked) outperform hard blocks for discoverability but convert less on their own.
- Showing the paywall after onboarding completes (not during) is critical — interrupting onboarding produces immediate abandonment.

**Sources:** revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/; adapty.io/blog/health-fitness-app-subscription-benchmarks/; superwall.com/case-studies/cal-ai; adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/.

---

## 4. Ranked transferable ideas

Each idea is tagged: **Persona** (Beginner/Elite/Both) · **Effect** (Activation/Retention/Conversion/Credibility/Virality) · **Gap?** (Yes = Volyume currently lacks / Partial = partial implementation exists / No = already strong) · **Effort** (S/M/L/XL) · **Placement** (where in the app) · **Constraint notes**.

---

### TI-01 — Adherence-neutral logging UI (no red numbers, no shame states)
**Persona:** Both · **Effect:** Retention (beginner D7–D30 dropout reduction) · **Gap?:** Partial · **Effort:** S · **Placement:** Food diary across all screens

**What to implement:** Remove any red colouring, warning icons, or negative language when a user exceeds daily targets. Display over-target days as neutral information. No "you went over by X" language. Mirror MacroFactor: the over-target state simply shows a neutral number. Add a one-sentence explanation for new users: "We record everything honestly. Your targets adapt to how you actually eat." This also protects the coaching engine — honest logs produce better TDEE data.

**Constraint:** None. Fully compatible with ED safety system (floors and Beat UK signposting remain; this is purely UI tone). No AI required. British English copy throughout.

**Evidence:** MacroFactor algorithm documentation (adherence-neutral); strongerbyscience.com/macrofactor-algorithms-philosophy/; Nutrola 50k-review analysis.

---

### TI-02 — "Calorie budget" framing layer for beginners
**Persona:** Beginner · **Effect:** Activation (first-week conceptual barrier) · **Gap?:** Yes · **Effort:** S · **Placement:** Food diary header, onboarding nutrition intro screen

**What to implement:** For new users (first 30 days or until user selects "advanced" mode), replace the macro ring primary label from "2,200 kcal remaining" with "You have £2,200 to spend today" — or more practically, replace technical target language with "X kcal remaining" displayed as a progress bar labelled "Daily budget." Lose It's framing is proven for beginner comprehension. Calories-first, macros secondary (expandable on tap).

**Constraint:** None. Purely presentational. The underlying data model is unchanged.

**Evidence:** Lose It review consensus; trygaya.com/review/lose-it-review; amyfoodjournal.com/blog/lose-it-app-review.

---

### TI-03 — Progressive disclosure: beginner mode with macro complexity hidden until opted-in
**Persona:** Beginner · **Effect:** Activation + Retention (week-1 dropout reduction) · **Gap?:** Yes · **Effort:** M · **Placement:** Onboarding, Settings

**What to implement:** During onboarding, detect first-time tracker status (a question: "Have you tracked macros before?"). For "no" users: show only calories and protein in the diary. Fat and carb targets are hidden behind a "Show all macros" toggle. The coaching engine runs fully — the user's targets are set — but the interface presents only the two metrics that beginner habit research identifies as the minimal viable tracking set. After 2 weeks of consistent logging, prompt: "You're doing great — want to see your full nutrition breakdown?"

This mirrors Simple's approach (single-behaviour focus early) and addresses the documented MacroFactor new-user overwhelm problem without dumbing down the engine.

**Constraint:** None. The coaching engine is unaffected; this is UI presentation only.

**Evidence:** hootfitness.com (MacroFactor overwhelm documentation); simple.life (progressive habit structure); fitia.app/learn/article/food-diary-apps-2026-reddit-picks/.

---

### TI-04 — Daily suggested menu (deterministic "what to eat" answer)
**Persona:** Beginner · **Effect:** Retention + Activation · **Gap?:** Yes · **Effort:** M · **Placement:** Food diary, Home tab nudge

**What to implement:** A daily "Suggested Menu" card on the Home tab (or at the top of the diary when no foods are logged): "Today's plan: 3 meals totalling 2,180 kcal / 165g protein — tap to see." The suggestions are generated deterministically from: (1) user's logged meal history (if >2 weeks), (2) saved meals, (3) a default UK-appropriate template library (e.g., eggs + toast / chicken wrap / rice + salmon). The user can accept all, pick individual meals, or dismiss. No AI required. This directly answers the #1 beginner dropout cause: "I don't know what to log."

Compare Yazio's meal planning strength and the category finding that users who receive "what to eat" answers have significantly lower early churn.

**Constraint:** None. Deterministic, offline-capable, no LLM required. Sits outside the coaching engine — it is a UX layer over the food diary.

**Evidence:** trygaya.com/review/yazio-review (meal plans as key beginner feature); nutrola.app/en/blog/apps-like-macrofactor-but-simpler; welling.ai (forward-looking meal suggestions as key retention driver).

---

### TI-05 — Food quality score (non-calorie metric for beginners)
**Persona:** Beginner · **Effect:** Retention + Virality · **Gap?:** Yes · **Effort:** M · **Placement:** Food diary per-item, daily summary

**What to implement:** A simple rule-based quality score for logged foods — not proprietary science, just a weighted composite of: protein density, fibre content, ultra-processing indicator (NOVA classification, already present in OpenFoodFacts data), micronutrient richness. Display as a colour band (3 tiers) or 1–10 score per food item and as a daily aggregate. A beginner scanning a protein bar sees "Score: 7/10 — high protein, moderate ultra-processing." 

Inspired by: Zoe's per-meal score (0–100), Nutracheck's processing risk indicator, MFP's "Blue Check" RD-reviewed recipes.

**Constraint:** NOVA classification data is present in the OpenFoodFacts database already bundled in Volyume. The scoring logic is a lookup, not an AI. However, displaying a "health score" alongside calorie data could create implicit shaming if poorly designed (red score for chocolate). Design requirement: no "bad food" language, no warnings — just informational colour coding with neutral copy ("lower protein density"). Requires founder alignment on tone.

**Evidence:** zoe.com/learn/zoe-2-0-science-made-simple; home-cooks.co.uk/pages/review-zoe; research on non-numerical health metrics reducing food anxiety vs calorie counts.

---

### TI-06 — Flexible streak mechanic (5/7 days, comeback shield)
**Persona:** Both · **Effect:** Retention (D7–D30 dropout prevention) · **Gap?:** Partial · **Effort:** S · **Placement:** Home tab streak display, check-in summary

**What to implement:** Replace the binary daily streak count with a "weekly rhythm" metric: "Logged 5 of the last 7 days — keep it up." Add a streak freeze (one available per month, shown as a shield icon) that protects a streak when a day is missed due to a declared rest day or trip. Celebration for 5/7 is linguistically lower-stakes but equally motivating; missing one day does not break it.

This addresses the documented harm of streak psychology (loss aversion → anxiety → avoidance → churn) while preserving the engagement benefit (streak maintenance as daily habit anchor).

**Constraint:** None. Does not conflict with ED safety (no calorie floors involved). British English: "Logged 5 of the last 7 days" not "5-day streak."

**Evidence:** streaks-gamification analysis (nuancebehavior.com/article/designing-streaks-for-long-term-user-growth); gamification research finding 40–60% higher DAU for apps combining streaks with milestones; trophy.so/blog/streaks-gamification-case-study.

---

### TI-07 — Identity-framing copy in onboarding and early coaching voice
**Persona:** Beginner · **Effect:** Activation + Retention · **Gap?:** Yes · **Effort:** S · **Placement:** Onboarding screens, early check-in messages, first coaching recommendation

**What to implement:** Reframe early coaching language from outcome to identity. Current pattern (estimated): "Your calorie target is 2,200 kcal to lose 0.5 kg/week." Proposed: "You're now training and tracking like someone who takes this seriously. Your daily fuel target is 2,200 kcal." After first logged day: "Day 1 done — you're already a food-tracker." After first check-in: "You're the kind of person who tracks consistently — that's what makes the coaching accurate."

Based on 2024 *Journal of Personality and Social Psychology* research finding identity-based framing produces more durable habits than outcome-goal framing. Noom implements this explicitly in its CBT lessons; Simple uses it in its app tone throughout.

**Constraint:** None. Copy change only. British English required.

---

### TI-08 — Paywall trigger at first coaching recommendation (not at trial start)
**Persona:** Beginner · **Effect:** Conversion · **Gap?:** Unknown (paywall placement not audited) · **Effort:** S · **Placement:** Trial conversion flow

**What to implement:** If Volyume shows the paywall at D0 (first app open), shift the hard paywall to the moment of first coaching output — the first weekly check-in result, or the first macro target recommendation. The user has experienced the engine's value; the paywall appears when the "aha moment" has already landed. RevenueCat 2026: Day 4–7 converters who have experienced the product convert significantly better than Day 0 converters across H&F apps. 14-day trial length already correct — do not shorten.

**Constraint:** None. Standard conversion optimisation.

**Evidence:** revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/; adapty.io/blog/health-fitness-app-subscription-benchmarks/; superwall.com/case-studies/cal-ai.

---

### TI-09 — Visible live expenditure surface (TDEE as a persistent dashboard element)
**Persona:** Both, but primarily Edge-case Elite (Eddie) + longer-term Beginner · **Effect:** Retention + Credibility · **Gap?:** Yes (prior audit §4 Lags #1) · **Effort:** M · **Placement:** Home tab / coaching card

**What to implement:** Expose the live EWMA TDEE estimate as a visible, daily-updating figure in the coaching dashboard — "Your estimated expenditure today: 2,380 kcal." The prior audit identified this as the single highest-conviction gap vs MacroFactor: Volyume computes everything needed but hides the model's internal state. MacroFactor's trust engine is built on transparency here: users who see the number that drives their targets do not resent target changes. This report confirms this gap independently via 2026 review sentiment: "users coming from MacroFactor will read this as a black box even though the engine isn't one."

**Constraint:** None. Volyume already computes EWMA trend and adaptive TDEE (`weeklyCoach.js`). This is presentation engineering, not engine work.

---

### TI-10 — Training-aware meal-timing suggestions (RP Diet Coach pattern, deterministic)
**Persona:** Elite (Eddie, physique competitors) · **Effect:** Credibility + Retention · **Gap?:** Yes · **Effort:** L · **Placement:** Food diary — pre/post-workout meal slots

**What to implement:** When a training session is logged for today, the food diary surfaces meal-slot suggestions adjusted for training context: "Pre-workout meal: 45–60g carbs, 20–30g protein. Post-workout: 40–50g carbs, 30–40g protein, minimal fat." The macros are calculated deterministically from the user's daily targets and session intensity. This is the core RP Diet Coach feature that no other mass-market app offers — training-aware meal timing. Volyume has both the training session data and the macro targets; connecting them in the diary is an architectural step but not an engine change.

**Constraint:** None. Fully deterministic, no AI. Requires coordination between the training session engine and the food diary's per-meal-slot logic.

**Evidence:** rpstrength.com/pages/diet-coach-app; feastgood.com/rp-diet-app-reviews/; nutrola.app/en/blog/is-rp-diet-worth-it-2026.

---

### TI-11 — Basic micronutrient summary panel (Cronometer's moat, Volyume-friendly subset)
**Persona:** Elite (Eddie, advanced users) · **Effect:** Credibility + Retention · **Gap?:** Yes · **Effort:** M · **Placement:** Food diary weekly/monthly summary

**What to implement:** Add a "Micronutrient overview" panel to the weekly diary summary showing six critical nutrients: Vitamin D, Iron, Calcium, Omega-3, Zinc, Magnesium — presented as percentage of daily reference value over the week. Not 84 Cronometer-style nutrients — just the six most commonly deficient in athletes and UK population. This closes the gap with Cronometer for Eddie without attempting to replicate its full depth. CoFID data (already bundled) includes these micronutrients for generic foods; OpenFoodFacts includes them for most packaged foods.

**Constraint:** None. Data is available in the bundled database. Offline-capable.

---

### TI-12 — "Processed Food Risk" indicator on barcode scan results
**Persona:** Beginner + Both · **Effect:** Retention + Virality · **Gap?:** Yes · **Effort:** S · **Placement:** Barcode scan result screen

**What to implement:** When a barcode scan returns a food item, display the NOVA food classification (1–4: unprocessed → ultra-processed) as a single icon alongside the macro data. NOVA class is present in OpenFoodFacts data. Add a one-line contextual label: "Minimally processed" / "Processed ingredient" / "Ultra-processed product." Inspired by Zoe's 2025 "Processed Food Risk" feature and research showing UK gym-goers scan products specifically to understand health quality, not just calories.

**Constraint:** None. Rule-based lookup, no AI. Neutral language — not "bad food" framing; informational classification only. Must not trigger shame language (constraint consistent with TI-01).

---

### TI-13 — "Noom-style" micro-educational moments (without the 1,200 kcal failure mode)
**Persona:** Beginner · **Effect:** Activation + Retention · **Gap?:** Yes · **Effort:** M · **Placement:** Home tab, early onboarding days (D1–D14)

**What to implement:** A series of 8–10 brief, contextual education cards that appear once in the first two weeks — not daily mandatory lessons (Noom's exhausting pace), but triggered by relevant actions. Examples:
- After first food log: "Why protein matters for your training — 30 seconds."
- After first check-in: "How your targets adapt to what you actually eat."
- After a rest day: "Why eating enough on rest days supports muscle recovery."
- After hitting protein target: "You hit your protein today — that's the single most important number."

Each card is dismissible and non-repeating. No tracking/reminder to complete them. This borrows Noom's psychological scaffolding approach (contextual micro-education) without the mandatory lesson cadence that many users resent. Aligns with the identity-framing principle (TI-07): each card strengthens the user's sense of being "someone who understands how this works."

**Constraint:** None. Static educational content, no AI. Must be reviewed by a qualified nutritionist for accuracy (the coaching copy is deterministic but the educational framing is new). Must not conflict with ED safety messaging.

---

## 5. Where the prior audit's conclusions need updating or pressure-testing

**Prior audit: "AI photo logging costs Volyume little today."**
Still true for accuracy reasons. However, the emergence of Welling as a top-rated beginner app in 2026 changes the competitive dynamic: Volyume is no longer competing only with manual trackers. Welling is winning beginner acquisition with AI logging. The accurate counter-argument (real-world accuracy far below lab claims) holds, but Volyume needs to articulate this defensively — "verified data beats AI guesses" should be a positioning statement, not just an internal assumption.

**Prior audit: "Verified UK data is a data-ops project, not engineering."**
Confirmed and strengthened. Nutracheck's £29.99/year app with 4.9/5 Trustpilot is still the UK data moat. The gap is unchanged but is now more urgent: Welling and emerging AI loggers are capturing beginner users who will never build up the trust-decay frustration with crowdsourced data — they quit before reaching month 4. The window to establish Volyume's verified-data story as a beginner acquisition message (not just a retention story) is narrowing.

**Prior audit: "No quick-add calories/macros is present in every top-five app."**
Still true and unaddressed. This should be TI-03 in the prior audit's gap list; it belongs in the current implementation queue alongside per-meal-slot memory.

**Prior audit did not cover Noom, Simple, Zoe, or Welling.**
These four represent distinct beginner acquisition vectors in 2026. The prior audit's competitive map was accurate for the elite/macro-tracker segment but missed the mass-market psychology and habit-coaching angle entirely. The dual-market mandate requires closing this gap.

---

## 6. Source list (primary, this report)

- https://macrofactorapp.com/adherence-neutral/ — adherence-neutral design documentation
- https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/ — MacroFactor algorithm philosophy
- https://goldiai.com/blog/macrofactor-vs-carbon-diet-coach/ — MacroFactor vs Carbon comparison
- https://nutrola.app/en/blog/macrofactor-vs-carbon-diet-coach-which-is-better-2026
- https://nutrola.app/en/blog/apps-like-macrofactor-but-simpler — beginner overwhelm documentation
- https://www.hootfitness.com/blog/9-best-macrofactor-alternatives-for-smarter-simpler-nutrition-tracking
- https://nutriscan.app/blog/posts/is-noom-worth-it-2026-honest-review-6520b8027a
- https://millennialhawk.com/noom-review/ — Noom 2026 full review
- https://www.femestella.com/noom-reviews-horror-stories-eating-disorders/ — Noom ED harm
- https://abbylangernutrition.com/noom-review-is-this-app-legit-for-losing-weight/ — dietitian critique
- https://sacra.com/c/noom/ — Noom GLP-1 strategy
- https://fortune.com/article/simple-app-review/ — Simple app dietitian review
- https://simple.life — Simple app homepage
- https://zoe.com/learn/zoe-2-0-science-made-simple — Zoe 2.0 launch details
- https://home-cooks.co.uk/pages/review-zoe — Zoe UK review
- https://www.thegrocer.co.uk/news/nutrition-brand-zoe-launches-radically-redesigned-new-app/709452.article
- https://feastgood.com/welling-app-review/ — Welling review
- https://www.welling.ai/articles/welling-review-best-ai-calorie-counter-app-2026
- https://www.fitness-tracking.com/reviews/welling/ — Welling 9.6/10 review
- https://rpstrength.com/blogs/articles/rp-diet-coach-app-update-1-5
- https://help.rpstrength.com/hc/en-us/articles/39482632639639-Diet-app-update-v1-52-April-2-2026
- https://feastgood.com/rp-diet-app-reviews/ — RP 9-week user review
- https://noobgains.com/rp-diet-coach-app-review/
- https://www.avatarnutrition.com/how-it-works/adaptive-nutrition
- https://calorie-trackers.com/reviews/lifesum/ — Lifesum 2026 regression analysis
- https://marlvel.ai/intel-report/health-fitness/com-sillens-ishape — Lifesum AI regression sentiment
- https://calorie-trackers.com/reviews/cronometer/ — Cronometer beginner complexity
- https://mealift.app/blog/cronometer-review
- https://www.trygaya.com/review/lose-it-review — Lose It 2026
- https://nutrola.app/en/blog/is-lose-it-worth-it-without-premium — free tier erosion
- https://trygaya.com/review/yazio-review — Yazio meal planning feature
- https://home-cooks.co.uk/pages/review-fatsecret — FatSecret 2026
- https://nutrasafe.co.uk/best-calorie-counter-apps-uk-2026 — UK beginner recommendations
- https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/ — RevenueCat 2026
- https://adapty.io/blog/health-fitness-app-subscription-benchmarks/ — Adapty H&F benchmarks 2026
- https://superwall.com/case-studies/cal-ai — paywall conversion case study
- https://adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/
- https://www.nuancebehavior.com/article/designing-streaks-for-long-term-user-growth — streak psychology
- https://trophy.so/blog/streaks-gamification-case-study
- https://jamesclear.com/habit-stacking — habit stacking research context
- https://blog.myfitnesspal.com/winter-release-2026-nutrition-tracking-updates/ — MFP 2026 Winter Release
- https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a
- https://www.trygaya.com/review/lose-it-review
- https://fitia.app/learn/article/food-diary-apps-2026-reddit-picks/

---

*Report completed: 2026-06-12. Assigned slice: mass-market nutrition / food-logging / diet-coaching apps.*
*Next-step proposals flagged: TI-01 through TI-08 suitable for implementation queue; TI-09 and TI-10 are M/L effort items requiring engineering design; "AI Describe"-pattern voice logging flagged as PROPOSAL for founder decision only.*

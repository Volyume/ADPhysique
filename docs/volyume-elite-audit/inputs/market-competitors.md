# Market & Competitor Intelligence — Volyume Elite Audit (input O7)

**Author:** O7 (competitor + market research agent)
**Date:** 2026-07-04
**Web access:** WORKING. WebSearch + WebFetch succeeded for every load-bearing
claim below; sources are cited inline as URLs. Nothing here is
training-memory-only unless a line explicitly says "(training-knowledge, not
web-verified)". A small number of secondary-blog sources (nutriscan.app,
prpath.app, dr-muscle.com, aggregator/SEO blogs) are used where first-party
pages did not surface pricing; these are flagged and should be treated as
indicative, not gospel — pricing on stores shifts and varies by region.

**Scope cuts (declared):** Reddit thread bodies were reached via search-result
summaries and review-aggregator commentary rather than by fetching each
thread individually (search returns are US-only and Reddit fetches are
rate-limited). Direct App Store / Play review-page scraping was not performed
per-app; review sentiment below is drawn from review-aggregator and expert
review commentary that itself summarises store/Reddit sentiment. WHOOP/Strava
treated as adjacent "layer" competitors, not head-to-head. Runtime kept under
budget by batching searches; per-competitor depth prioritised over exhaustive
citation count.

---

## Exec summary (10 lines)

1. The tracker market has bifurcated: cheap-or-free **loggers** (Hevy £/mo
   low, Strong lifetime) vs premium **coaching-algorithm** apps (MacroFactor,
   RP, Caliber) charging for a "coach in your pocket".
2. **MacroFactor is the app to beat on nutrition-coaching credibility** — its
   data-driven expenditure/TDEE algorithm does, for ~$6/mo, what human coaches
   charge hundreds for; and it is deliberately "adherence-neutral" (no guilt
   on missed days). This is Volyume's closest philosophical rival.
3. **AI is now the loud default** — Hevy Trainer, Fitbod, Arvo, Cronometer
   Oracle, WHOOP AI insights all shipped AI in the last 12 months. Volyume's
   "deterministic, no AI, ever" is now a *contrarian trust position*, not a gap
   — but it must be marketed as a deliberate stance, not an absence.
4. **Manual logging friction is the universal nutrition complaint** (MFP,
   Cronometer, MacroFactor all criticised for it). Barcode + fast entry is
   table stakes; Volyume already has barcode.
5. **Paywall creep is the loudest source of user resentment** — MFP moved the
   barcode scanner behind Premium; Strava moved segment leaderboards/goals
   behind Premium ahead of a 2026 IPO. Both drew sustained backlash. Volyume's
   clean binary free/pro with a *generous* free logger is a reputational asset.
6. **Progress-photo UX stickiness = ghost-overlay alignment + private-by-
   default + time-lapse export.** Specialist apps (Fitness Camera, Metamorph,
   BodyShapr) win on "each photo is truly comparable" and on privacy. Volyume's
   on-device-only photos + guided capture already match the best-in-class.
7. **Accountability that retains without shame = relational, not evaluative.**
   Finch (10M+ downloads, 4.9) proves non-judgemental "your bird waits for you"
   beats punitive streaks for anxious users; research shows performance-based
   social features *raise* anxiety for ~68% of recreational users.
8. **Store-quality bar 2026 tightened:** Apple (Jun 2026) and Google (Apr 2026)
   both cracked down on low-quality apps and clarified health-data rules;
   featuring rewards design, HealthKit/Health-Connect correctness, clear
   paywalls with visible price/term/trial + a Restore button, and reviewer
   paywall-access instructions.
9. **Pricing norms:** annual nutrition/training apps cluster at **$70–$96/yr**;
   loggers at **£30–£40/yr or ~$75 lifetime**; premium coaching (RP $225/yr,
   Caliber $200+/mo human). Volyume sits mid-market and should stay there.
10. **The under-served gap Volyume can own:** a *calm, private, non-judgemental,
    genuinely-deterministic* coaching app — no AI black box, no shame streaks,
    no photo cloud-upload, no paywall bait-and-switch, ED-safe by construction.
    Nobody in the set combines trust + privacy + calm voice as a whole product.

---

## 1. Core competitor deep-dives

### Hevy — the modern logger benchmark
- **Pricing:** Hevy Pro reported at **$2.99–$4.99/mo, ~$23.99–$39.99/yr, $74.99
  lifetime** (varies by region/platform). Generous free tier: unlimited
  workouts, 4 routines, 7 custom exercises, 3 months history, social feed, PRs.
  [hevy.com/pricing](https://hevy.com/pricing),
  [push-pull.app](https://push-pull.app/blog/push-pull-vs-hevy)
- **Shipped last ~12 months:** **Hevy Trainer (18 Feb 2026)** — auto-generates
  programmes and auto-progresses weight session-to-session from your last sets.
  [prpath.app](https://prpath.app/blog/hevy-app-review-2026.html)
- **Genuinely excellent:** clean, fast logging UX; a social feed that feels
  alive without being toxic; the free tier is unusually generous, which drives
  word-of-mouth. Interface widely held as the modern standard.
- **Weaknesses (reviews):** history/routine caps on free push people to pay;
  programming depth still lighter than the science-based apps; some feel the
  social feed is a vanity layer.
- **Fit for Volyume:** the free-logger generosity and clean logging bar are
  **adaptable** — Volyume's free tier is already the differentiator; match
  Hevy's *polish*, not its social feed.

### Strong — the stagnation cautionary tale
- **Pricing:** ~£4.99/mo, £29.99/yr, **£99.99 lifetime** (or $9.99/mo,
  $29.99/yr in some listings). Free tier covers most lifters' needs.
  [setgraph.app](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph),
  [prpath.app](https://www.prpath.app/blog/strong-app-review-2026.html)
- **Shipped last 12 months:** little. Repeatedly described as "stagnant",
  "rarely updates its features", "the market has moved forward without it".
  [hotelgyms.com](https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more)
- **Genuinely excellent:** still the cleanest *pure* strength log; sets the
  standard for what logging should feel like; lifetime purchase beloved.
- **Weaknesses:** no programming, weaker Android build, no social, "hefty price
  tag for a basic log", dated design, bug complaints.
- **Fit / lesson:** **cautionary** — a beautiful logger that stops evolving
  gets eaten. Volyume must keep shipping. Not a pattern to copy, a fate to avoid.

### MacroFactor — Volyume's closest philosophical rival (nutrition)
- **Pricing:** **$11.99/mo, $71.99/yr (~$5.99/mo), $89.99/yr bundle** with
  MacroFactor Workouts; 7-day trial, **no free tier**.
  [macrofactor.com/press-kit](https://macrofactor.com/press-kit/),
  [feastgood.com](https://feastgood.com/macrofactor-paid-vs-free/)
- **Shipped last 12 months:** V3 expenditure algorithm + late-2025 tools to
  account for activity/illness/travel; **MacroFactor Workouts** launched as a
  paid companion (bundle pricing previewed Dec 2025).
  [macrofactor.com/mm-dec-2025](https://macrofactor.com/mm-dec-2025/)
- **Genuinely excellent (specifics):**
  - **Dynamic expenditure/TDEE from your own data** — after 2–3 weeks of
    logging + weighing it lands within ~50–100 kcal of true TDEE; automates
    what coaches charge hundreds/mo to do manually.
    [marrastrength.com](https://marrastrength.com/macrofactor-review/)
  - **"Adherence-neutral" design** — assumes typical intake on unlogged days;
    one missed day does not break progress or throw a guilt-inducing red
    warning. This is a *calm, no-shame* mechanic done well.
    [nutriscan.app](https://nutriscan.app/blog/posts/is-macrofactor-worth-it-2026-529e4f7d46)
  - **Verified 1.2M-entry food database**; **collaborative vs coached modes**
    (algorithm sets macros, or you set ratios and it adjusts calories only).
- **Weaknesses (reviews):** manual logging only (no photo/voice smart-detect,
  though a describe-your-meal AI estimator exists); coaching scope is *narrow*
  (target adjustment only — no meal planning, no accountability, no human
  judgement); accuracy collapses with inconsistent logging; no free tier;
  shallow micronutrients. [outlift.com](https://outlift.com/macrofactor-review/)
- **Fit for Volyume:** the **adherence-neutral, no-guilt** philosophy is
  **genuinely excellent and directly aligned** with Volyume's calm/ED-safe
  brand — but Volyume does it deterministically and adds ED guardrails MF does
  not. MF's "no accountability, no human judgement" is precisely the gap
  Volyume's Partners + calm weekly coach can fill.

### MyFitnessPal — the incumbent people love to leave
- **Pricing:** Free ($0), **Premium $79.99/yr, Premium+ $99.99/yr**.
  [nutriscan.app](https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a)
- **Shipped:** Premium+ tier with Meal Planner; faster-logging tools (voice
  logging, meal scan) bundled into paid.
  [blog.myfitnesspal.com](https://blog.myfitnesspal.com/myfitnesspal-membership-pricing-tiers/)
- **Genuinely excellent:** the largest food database and barcode ecosystem;
  ubiquity/integrations; "good enough" for casual calorie counting.
- **Weaknesses (loud, sustained):** **moved the barcode scanner behind the
  paywall** — a canonical example of paywall bait-and-switch resentment;
  free version "intentionally limited"; ad-heavy; accuracy of crowd-sourced
  DB entries. [nutriscan.app](https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a)
- **Fit / lesson:** the barcode-paywall episode is the **single clearest
  "do-not-do"** in the market. Volyume keeping barcode inside Pro (nutrition
  is *entirely* Pro) is fine *because the free/pro line is honest and never
  moved a previously-free feature behind the wall*.

### Cronometer — micronutrient depth champion
- **Pricing:** Gold **~$8.99–$9.99/mo or $49.99–$59.99/yr**; free tier exists.
  [nutriscan.app](https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201)
- **Shipped:** Oracle AI nutrient search/suggestions; blood-glucose pattern
  analysis; sleeker nutrient charts.
- **Genuinely excellent:** **84+ micronutrients per item**, anchored to NCCDB +
  USDA — no consumer tracker matches the depth; the **Nutrient Summary view**
  ("you're hitting B12/iron but short on magnesium/potassium at a glance") is
  called the best single feature in any nutrition app.
  [repreturn.com](https://repreturn.com/cronometer-review/)
- **Weaknesses:** manual text-search logging only ("no way to say 'two eggs and
  toast'"); smaller DB than MFP; utilitarian UI; no meal planning; Gold is
  self-serve, no coach.
- **Fit for Volyume:** the **Nutrient Summary "at-a-glance gap" view** is an
  **adaptable-with-a-twist** pattern — a calm, non-alarming "here's where you're
  consistently short" panel fits Volyume's no-shame voice (note: micronutrients
  = the founder-gated MN-1 item; do not build, only log as a market signal).

### Fitbod — AI-programming veteran
- **Pricing:** ~**$95.99/yr (~$8/mo)**; 3-workout free trial.
  [indiehackers.com](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)
- **Genuinely excellent:** 15M+ downloads; long-term users rate it 4–5★ and
  call it "life-changing for consistency"; recovery-aware muscle-group rotation.
- **Weaknesses:** AI "generic before it learns"; flawed progressive overload /
  inaccurate weight suggestions; **subscription-management/billing complaints**
  (esp. App Store) are the most common gripe.
  [trustpilot.com](https://www.trustpilot.com/review/www.fitbod.me)
- **Fit / lesson:** billing-friction complaints validate Volyume's careful
  Play Billing + restore/cascade discipline. AI-overload inaccuracy is
  **evidence for** the deterministic stance (predictable > "smart but wrong").

### Boostcamp — the generous-free disruptor
- **Pricing:** core is **free** — 11,000+ programmes incl. 130+ coach-designed
  (nSuns, GZCLP, 5/3/1, PPL, PHUL/PHAT); Pro adds exclusive programmes +
  advanced analytics. 1.2M+ lifters. [boostcamp.app](https://www.boostcamp.app/)
- **Genuinely excellent:** best free *programme library* in the market;
  auto-weight-progression; now has offline mode; simple UI vs bloated all-in-ones.
- **Weaknesses:** a few basic actions (exercise substitution) gated to Pro and
  seen as "excessive"; freeze-on-complete + battery-drain complaints.
- **Fit for Volyume:** Boostcamp's **free curated-programme library** is the
  same instinct as Volyume's free Plan Library — validates that a generous free
  training tier is a growth engine, not a giveaway. **Adaptable**, already aligned.

### Caliber — human-coaching + Strength Score
- **Pricing:** Free (full app, no coach); **Pro $19/mo group coaching**;
  Premium 1:1 human coaching **$200+/mo**.
  [barbend.com](https://barbend.com/caliber-fitness-app-review/)
- **Genuinely excellent:** vetted human coaches + in-app chat/video; the
  **Strength Score** (how strong you are relative to your age/sex potential) and
  **Strength Balance** are motivating, non-body-shaming progress framings;
  claims ~20% body-comp improvement in 12 weeks with a refund guarantee.
- **Weaknesses:** the meaningful product is expensive human coaching; free tier
  is a lead-gen funnel.
- **Fit for Volyume:** **Strength Score / Strength Balance = adaptable-with-a-
  twist.** A *relative-to-your-own-potential*, body-neutral progress score fits
  Volyume's calm brand far better than weight/aesthetic framing — and it is
  deterministic. The human-coaching model does not fit (no AI/no humans stance).

### RP Hypertrophy — the science-premium play
- **Pricing:** promo **$24.99/mo, $149.99/6mo, $224.99/yr** (standard $34.99/mo);
  no free trial, 30-day money-back. **Web-app only — not on App/Play Store.**
  [rpstrength.com](https://rpstrength.com/pages/hypertrophy-app),
  [dr-muscle.com](https://dr-muscle.com/rp-hypertrophy-app-review/)
- **Genuinely excellent:** feedback-driven weekly progression from pump/
  soreness/effort; 45+ templates, custom mesocycles, 250+ technique videos,
  Dr Mike Israetel brand authority — "a coach in your pocket".
- **Weaknesses:** pricey; not beginner-friendly; **requires internet** (web-
  hosted — bad in gyms with poor signal); no store ratings so quality opaque;
  no personalised exercise selection / rest prescription.
- **Fit for Volyume:** RP proves people **pay a premium for a credible
  deterministic progression engine** — validating Volyume's planEngine/mesocycle
  approach. RP's internet dependence is a **direct contrast Volyume wins on**
  (offline-first). Pattern: **adaptable** — trustworthy science framing.

### Strava — the social/accountability layer
- **Pricing:** **$79.99/yr (~$6.67/mo) or $11.99/mo**; Family $139.99/yr;
  **Runna bundle $149.99/yr** (Strava acquired Runna, an AI coach, Apr 2025).
  [strava.com/pricing](https://www.strava.com/pricing),
  [checkthat.ai](https://checkthat.ai/brands/strava/pricing)
- **Genuinely excellent (retention mechanics, evidence-backed):**
  - **Kudos = low-friction social reinforcement**: 14B+ kudos given in 2025
    (+20% YoY); **68% of active users open the app daily to see *others'* posts,
    not their own data** — ambient relatedness is the retention hook.
    [strivecloud.io](https://www.strivecloud.io/blog/app-engagement-strava)
  - **Segments** (30M+ worldwide) create a *local* game — "beating your own past
    time on the same hill is its own mastery" even when you can't top a global
    board. [latterly.org](https://www.latterly.org/strava-marketing-strategy/)
- **Weaknesses / cautions:** **paywall creep** (segment leaderboards + training
  goals moved behind Premium; sustained r/Strava backlash ahead of 2026 IPO);
  and critically — **performance-based social features raise anxiety for ~68%
  of recreational runners** even without competing.
  [triplethreatlife.substack.com](https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged)
- **Fit for Volyume:** the **relational-accountability** insight ("Do they know
  I'm trying?" beats "Will they judge my pace?") is **genuinely excellent and
  directly applicable** to Partners. The **competitive leaderboard / evaluative**
  layer would **NOT fit** Volyume's calm private brand — avoid.

### WHOOP — the habit/insight layer
- **Pricing:** three tiers since May 2025 — **One $199/yr, Peak $239/yr, Life
  $359/yr** (hardware included; US pricing held stable).
  [whoop.com/membership](https://www.whoop.com/us/en/membership/),
  [trackervs.com](https://trackervs.com/pricing/whoop-pricing/)
- **Genuinely excellent:** strain/recovery *daily behavioural nudges*; the
  insight framing ("your behaviours that influence your pace of ageing");
  14-day battery; frictionless passive capture.
- **Weaknesses / cautions:** **unbundling backlash** (Healthspan moved from the
  old flat $239 into Peak+); FDA flagged the Life-tier blood-pressure feature as
  not cleared, yet it stayed in-app — a **trust/compliance cautionary tale** for
  health claims. [the5krunner.com](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/)
- **Fit for Volyume:** WHOOP's **calm daily insight nudge** (one clear,
  non-alarming takeaway per day) is **adaptable-with-a-twist** for Volyume's
  weekly coach. The **health-claim overreach** (FDA) reinforces Volyume's
  conservative, ED-safe, no-medical-claims posture. Hardware/unbundling: N/A.

---

## 2. Progress-photo specialists — what makes photo UX sticky

Sources: [Fitness Camera (Play)](https://play.google.com/store/apps/details?id=com.fitnesscamera),
[Metamorph (App Store)](https://apps.apple.com/us/app/progress-pic-photos-metamorph/id6544789120),
[BodyShapr](https://apps.apple.com/us/app/bodyshapr-body-progress-photo/id1331744829),
[Snapsie](https://apps.apple.com/us/app/snapsie-take-progress-pictures/id1180244595),
[fitbudd.com](https://www.fitbudd.com/academy/why-progress-photos-matter-in-fitness-and-the-best-apps-to-track-them)

**Sticky mechanics observed:**
1. **Ghost-overlay / auto pose-match capture** — Fitness Camera shows your last
   shot as a translucent "ghost" so each new photo aligns; "every before and
   after photo matches". This is *the* differentiator — comparability is the
   product. **Genuinely excellent; Volyume already has guided capture — match
   the ghost-overlay standard.**
2. **Multiple comparison modes** — BodyShapr offers GIF / Slider / Lapse /
   Collage and compares up to 20 photos. **Adaptable** — Volyume's before/after
   compare should offer at least slider + time-lapse.
3. **Time-lapse / transformation video export** — near-universal (Metamorph,
   Fitness Camera, Progress Pics). The shareable artefact is the retention +
   virality hook. **Adaptable-with-a-twist:** Volyume's share card must stay
   ED-safe/GDPR-safe (no name/measurements; bodyweight only on the founder-
   approved Pro card, withheld under calm mode / ED flag).
4. **Privacy-by-default = the trust selling point** — most specialists
   advertise "photos stay on your device". **Volyume's on-device-only,
   never-leaves-device photos is best-in-class and should be marketed loudly.**
5. **Gentle reminders + Health/weight sync** — Snapsie/Metamorph pair photos
   with weight and reminders. **Adaptable**, but reminders must obey Volyume's
   quiet-hours + ED-flag suppression rules.

**Mainstream handling:** MacroFactor and MFP fold progress photos into a body-
metrics *timeline* (photo + weight + trend on one date axis) rather than a
dedicated gallery — the photo becomes context for the number.
[macrofactor.com/macrofactor](https://macrofactor.com/macrofactor/) The lesson:
**tie the photo to the trend line, not just an album** — a photo next to "you're
down and holding" is more motivating than a bare grid.

---

## 3. Accountability / social — retain without shame

Sources: [Finch review](https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review),
[xda Finch](https://www.xda-developers.com/finch-productivity-coach/),
[Streaks gamification](https://trophy.so/blog/streaks-gamification-case-study),
[Strava kudos research](https://www.strivecloud.io/blog/app-engagement-strava),
[relational vs evaluative accountability](https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged)

**What actually retains (evidence):**
- **Non-judgemental "we're waiting for you" > punitive streaks.** Finch (10M+
  downloads, 4.9★ from 500k+ reviews): skipping a day means "your bird just
  waits — no penalties, no lost progress, no angry teammates". Explicitly cited
  as mattering for people with anxiety/depression/executive dysfunction.
  **Genuinely excellent; directly aligned with Volyume's calm/ED-safe brand.**
- **Self-Determination Theory:** autonomous motivation sustains behaviour change
  better than controlled (punitive) motivation — the research basis for why
  Finch out-retains Habitica-style guilt loops.
- **Relational accountability** ("do they know I'm trying?") retains; **evaluative
  accountability** ("will they judge my pace/body?") *drives ~68% of users to
  higher anxiety*. Volyume's **Partners** should surface *effort/showing-up*,
  never performance ranking or body comparison.

**What is gimmick / would NOT fit:**
- **Loss-aversion streak counters** (Streaks' whole model) — effective for some,
  but the "don't break the chain" pressure is exactly the shame vector Volyume's
  brand rejects. **Would NOT fit** as a hard mechanic; a *soft, guilt-free*
  "you've shown up 5 weeks" framing is the **Volyume-native twist**.
- **Public leaderboards / kudos-chasing / competitive segments** — retention
  gold for Strava's audience but an anxiety generator; **would NOT fit** a
  private calm brand.
- **Gamified pets/points** (Finch's bird, Habitica RPG) — charming but off-brand
  for a serious training/nutrition tool; the *transferable principle* (patient,
  non-punitive return) fits; the *mascot mechanic* does not.

**Volyume-native accountability twist:** Partners as a **1:1 private
"witnessed effort" pairing** — your partner sees that you showed up and can send
calm encouragement, never your weights/weight/body or a ranking. This captures
relational accountability (the retaining half of Strava) while stripping the
evaluative half (the anxiety half) — a combination nobody in the set offers.

---

## 4. Store-quality bar 2026 — table stakes for an "elite" listing

Sources: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[Apple stricter low-quality rules Jun 2026](https://www.macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/),
[Adapty 2026 review guide](https://adapty.io/blog/how-to-pass-app-store-review/),
[Google Play policy Apr 2026](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en),
[Play paywall-access instructions](https://www.lokall.app/blog/google-play-app-access-instructions),
[fitness onboarding best practice](https://amalgama.co/the-psychology-behind-fitness-apps-onboarding/)

**Both stores tightened in 2026:** Apple added stricter rules against low-quality
apps (Jun 2026); Google updated Health & Fitness data guidelines for Android 16
granular permissions + Health Connect, and **explicitly forbade using sensitive
health data for employment/insurance eligibility or unauthorised social sharing**
(Apr 2026 policy). Volyume's EU-residency + no-PII-to-analytics + on-device
photos posture is *ahead* of this bar.

**Editorial featuring rewards (Apple):** design, usability, localisation, high
ratings + engagement; correct framework use (HealthKit for fitness, declared in
the description); iOS 18+ **Featuring Nominations** direct-to-editorial channel.

**Table-stakes checklist for an elite fitness listing:**
- **Paywall:** must show **price, term, trial details, cancellation** clearly
  *before* purchase; **Restore Purchases button mandatory** (settings + paywall).
  Volyume already runs Play Billing with restore/cascade — verify visibility.
- **Reviewer access:** provide **working, reusable, location-independent
  credentials/instructions** so reviewers can reach content behind the Pro
  paywall (Google is strict; a "paywall restriction" flag can deactivate an app).
  Because Volyume is Apple/Google-OAuth-only with no email/password, a documented
  reviewer path is essential — flag for the founder.
- **Onboarding length:** the norm is *personalise fast, show value fast* — small
  steps, low cognitive load, let users reach a first action quickly. But note
  Volyume's **inviolable onboarding enforcement** (biological sex + required
  fields block progression, no tap-through) — this is a *safety* choice that runs
  slightly counter to "shortest possible onboarding"; keep it, and invest in
  making each gated step feel light (progress indicator, calm copy).
- **Review prompts:** request at natural positive moments; **86% of users find
  pushy prompts annoying** — prompt sparingly, after a win, never mid-task, and
  respect the OS rate limits.
- **Health-data honesty:** no unproven medical claims (WHOOP's FDA episode is the
  warning) — Volyume's conservative framing is compliant by design.

---

## 5. Pricing / packaging norms — where Volyume sits

| Segment | Representative annual price | Free tier? |
|---|---|---|
| Loggers | Hevy ~$24–40/yr, Strong ~$30/yr or $75–100 lifetime | Yes, generous |
| Nutrition-coaching | MacroFactor $72/yr, MFP Premium $80 / Premium+ $100, Cronometer $50–60/yr | MF/Cronometer no/limited; MFP yes |
| AI training | Fitbod ~$96/yr | Trial only |
| Science-premium | RP $225/yr | No |
| Human coaching | Caliber $19/mo group, $200+/mo 1:1 | Yes (funnel) |
| Layer apps | Strava $80/yr, WHOOP $199–359/yr | Strava yes, WHOOP no |

**Free-tier generosity vs paywall placement:** the reputational winners
(Hevy, Boostcamp) are *generous on the core loop* and paywall *depth/history/
advanced*. The reputational losers (MFP barcode-gate, Strava segment-gate)
**moved previously-free features behind the wall.** Volyume's binary free/pro
is **well-placed**: free = the entire training loop (library, builder, logging,
exercise library, PBs, progress stats); Pro = the entire nutrition/coaching
domain. The critical discipline: **never migrate a currently-free feature into
Pro** — that single act is the market's most-resented move.

**Where Volyume's binary sits:** cleaner and more honest than the market's
creeping multi-tier (MFP Free/Premium/Premium+; WHOOP One/Peak/Life; Strava
+Runna). Binary is a *trust asset* — but it must be priced in the mid-market
annual band ($70–96/yr) to sit credibly beside MacroFactor/MFP, not below
(cheap reads as "logger") nor above (RP territory implies human/science-premium
positioning Volyume isn't claiming). *Pricing recommendation is a founder
decision — not made here.*

---

## 6. Classification table — every pattern, rated for Volyume fit

Ratings: **GE** = genuinely excellent · **OC** = overused commodity · **NF** =
would NOT fit calm/private brand · **AT** = adaptable with a Volyume-native twist

| # | Pattern (source app) | Rating | Note / the twist |
|---|---|---|---|
| 1 | Data-driven dynamic TDEE/expenditure (MacroFactor) | GE | Volyume's nutritionEngine already deterministic; the *concept* validates the approach |
| 2 | Adherence-neutral, no-guilt missed-day handling (MacroFactor) | GE | Directly on-brand; Volyume adds ED guardrails MF lacks |
| 3 | Ghost-overlay pose-match photo capture (Fitness Camera) | GE | Match this standard in guided capture |
| 4 | On-device-only / photos never leave device (specialists) | GE | Volyume already best-in-class; market it loudly |
| 5 | Relational accountability "do they know I'm trying" (Finch/Strava research) | GE | Core Partners principle |
| 6 | Non-punitive "we're waiting for you" return (Finch) | GE | Soft "you've shown up N weeks", never a breakable streak |
| 7 | Generous free core loop (Hevy, Boostcamp) | GE | Volyume free training tier already does this |
| 8 | Nutrient-gap "at-a-glance where you're short" view (Cronometer) | AT | Calm non-alarming panel; but MN-1 is founder-gated — signal only |
| 9 | Strength Score vs your own potential (Caliber) | AT | Body-neutral, deterministic progress framing (not aesthetic/weight) |
| 10 | Photo tied to trend line, not bare album (MacroFactor timeline) | AT | Show photo beside "down and holding" copy |
| 11 | Time-lapse / before-after share artefact (Metamorph) | AT | Keep ED/GDPR-safe; withhold under calm mode / ED flag |
| 12 | Calm single daily/weekly insight nudge (WHOOP) | AT | One clear non-alarming takeaway; obey quiet hours + ED suppression |
| 13 | Credible science/trust framing at a premium (RP) | AT | Volyume's "deterministic, no AI, auditable" is the trust story |
| 14 | Barcode + fast entry (all nutrition apps) | OC | Table stakes; Volyume already has it |
| 15 | Lifetime purchase option (Strong/Hevy) | OC | Common; a pricing/packaging founder decision, not built here |
| 16 | Social feed / activity stream (Hevy, Strava) | OC→NF | Vanity layer; a public feed does not fit private brand |
| 17 | AI auto-programming / AI coach (Fitbod, Hevy Trainer, Arvo) | NF | Violates "no AI, ever"; and reviews show it's often *wrong* |
| 18 | Public leaderboards / competitive segments (Strava) | NF | Evaluative → anxiety; off-brand |
| 19 | Gamified pet/points/RPG (Finch, Habitica) | NF | Charming but off-brand for a serious calm tool |
| 20 | Loss-aversion breakable streak counter (Streaks) | NF | Shame vector; use guilt-free "shown up" framing instead |
| 21 | Moving a previously-free feature behind paywall (MFP barcode, Strava segments) | NF | The market's most-resented move — never do it |
| 22 | Multi-tier ladder / unbundling (MFP, WHOOP, Strava+Runna) | NF | Binary free/pro is cleaner and a trust asset — keep it |
| 23 | Unproven health/medical claims (WHOOP BP/FDA) | NF | Volyume's conservative ED-safe posture wins on trust |
| 24 | Human 1:1 coaching marketplace (Caliber) | NF | No humans/no AI stance; not the model |

---

## 7. Lessons for Volyume — shortlist (max 15, each with evidence + fit)

1. **Lead marketing with "deterministic, no AI, ever" as a *trust stance*, not
   a missing feature.** Evidence: Fitbod/Hevy-Trainer AI reviewed as "generic",
   "flawed progressive overload", "inaccurate weight suggestions"
   ([indiehackers](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)).
   **Fit: GE** — the whole set is racing to AI; contrarian trust is ownable.
2. **Adopt MacroFactor's adherence-neutral, no-guilt handling as an explicit,
   named behaviour.** Evidence: MF's "one missed day does not break progress or
   give a guilt-inducing red warning" is its most-praised humane feature
   ([nutriscan](https://nutriscan.app/blog/posts/is-macrofactor-worth-it-2026-529e4f7d46)).
   **Fit: GE** — perfectly aligned with calm/ED-safe brand; Volyume can go further.
3. **Never migrate a currently-free feature into Pro.** Evidence: MFP barcode-gate
   and Strava segment/goal-gate drew the market's loudest, most sustained backlash
   ([nutriscan](https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a),
   [substack](https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged)).
   **Fit: GE (guardrail)** — protect the binary free/pro line as a trust asset.
4. **Build Partners on relational, not evaluative, accountability.** Evidence:
   ~68% of recreational users report *higher anxiety* from performance-based
   social features; relational "do they know I'm trying" retains
   ([substack](https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged)).
   **Fit: GE** — witnessed effort, never ranking/body/weights.
5. **Use guilt-free "you've shown up N weeks" framing, never a breakable streak.**
   Evidence: Finch (10M+, 4.9★) proves non-punitive return beats loss-aversion for
   anxious users ([cltcounseling](https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review)).
   **Fit: GE / AT** — the principle transfers; the pet mascot does not.
6. **Match the ghost-overlay pose-match standard in guided photo capture.**
   Evidence: specialist apps win entirely on "each photo truly comparable"
   ([Fitness Camera](https://play.google.com/store/apps/details?id=com.fitnesscamera)).
   **Fit: GE** — comparability is the product.
7. **Market "photos never leave your device" as a headline privacy claim.**
   Evidence: specialists advertise on-device storage; Google's Apr-2026 policy now
   forbids unauthorised health-data social sharing
   ([Play policy](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en)).
   **Fit: GE** — Volyume is already ahead of the regulatory bar.
8. **Tie progress photos to the trend line, not a bare gallery.** Evidence:
   MacroFactor/MFP fold photos into a body-metrics timeline
   ([macrofactor](https://macrofactor.com/macrofactor/)). **Fit: AT** — photo beside
   "down and holding" copy, ED/GDPR-safe.
9. **Offer a body-neutral progress score relative to the user's own potential.**
   Evidence: Caliber's Strength Score/Balance is motivating without aesthetic
   shaming ([barbend](https://barbend.com/caliber-fitness-app-review/)).
   **Fit: AT** — deterministic, self-referenced, no bodyweight framing.
10. **Keep shipping — a beautiful frozen logger dies.** Evidence: Strong widely
    called "stagnant… the market moved forward without it"
    ([hotelgyms](https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more)).
    **Fit: GE (strategy)** — cautionary tale.
11. **Weaponise offline-first as a concrete benefit.** Evidence: RP is web-only and
    criticised for failing in gyms with poor signal
    ([dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-review/)).
    **Fit: GE** — "works with no signal, your data lives on your phone".
12. **Deliver one calm insight at a time, obeying quiet hours + ED suppression.**
    Evidence: WHOOP's single daily behavioural nudge; 86% find pushy prompts
    annoying ([amalgama](https://amalgama.co/the-psychology-behind-fitness-apps-onboarding/)).
    **Fit: AT** — Volyume weekly-coach twist, never alarming.
13. **Ensure paywall shows price/term/trial/cancellation + a visible Restore
    button, and document a reviewer paywall-access path.** Evidence: 2026 store
    guidelines make these hard requirements; Google can deactivate for "paywall
    restriction" ([adapty](https://adapty.io/blog/how-to-pass-app-store-review/),
    [lokall](https://www.lokall.app/blog/google-play-app-access-instructions)).
    **Fit: GE (compliance)** — OAuth-only login makes the reviewer path essential.
14. **Prompt for reviews only after a genuine win, sparingly.** Evidence: 86%
    find pushy prompts annoying; Apple featuring rewards high ratings
    ([amalgama](https://amalgama.co/the-psychology-behind-fitness-apps-onboarding/)).
    **Fit: GE** — earn the rating, don't nag for it.
15. **Hold pricing in the mid-market annual band ($70–96/yr) with the honest
    binary tier.** Evidence: nutrition/training apps cluster there
    ([macrofactor press kit](https://macrofactor.com/press-kit/),
    [nutriscan MFP](https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a)).
    **Fit: AT** — *final pricing is a founder decision; this is market context only.*

---

## Sources (primary + key secondary)

- Hevy: https://hevy.com/pricing · https://prpath.app/blog/hevy-app-review-2026.html · https://push-pull.app/blog/push-pull-vs-hevy
- Strong: https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more · https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
- MacroFactor: https://macrofactor.com/press-kit/ · https://macrofactor.com/mm-dec-2025/ · https://marrastrength.com/macrofactor-review/ · https://outlift.com/macrofactor-review/ · https://nutriscan.app/blog/posts/is-macrofactor-worth-it-2026-529e4f7d46
- MyFitnessPal: https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a · https://blog.myfitnesspal.com/myfitnesspal-membership-pricing-tiers/
- Cronometer: https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201 · https://repreturn.com/cronometer-review/
- Fitbod: https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b · https://www.trustpilot.com/review/www.fitbod.me
- Boostcamp: https://www.boostcamp.app/
- Caliber: https://barbend.com/caliber-fitness-app-review/
- RP Hypertrophy: https://rpstrength.com/pages/hypertrophy-app · https://dr-muscle.com/rp-hypertrophy-app-review/
- Strava: https://www.strava.com/pricing · https://www.strivecloud.io/blog/app-engagement-strava · https://www.latterly.org/strava-marketing-strategy/ · https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged
- WHOOP: https://www.whoop.com/us/en/membership/ · https://trackervs.com/pricing/whoop-pricing/ · https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/
- Progress photos: https://play.google.com/store/apps/details?id=com.fitnesscamera · https://apps.apple.com/us/app/progress-pic-photos-metamorph/id6544789120 · https://apps.apple.com/us/app/bodyshapr-body-progress-photo/id1331744829 · https://www.fitbudd.com/academy/why-progress-photos-matter-in-fitness-and-the-best-apps-to-track-them
- Accountability/habit: https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review · https://www.xda-developers.com/finch-productivity-coach/ · https://trophy.so/blog/streaks-gamification-case-study
- Store quality 2026: https://developer.apple.com/app-store/review/guidelines/ · https://www.macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/ · https://adapty.io/blog/how-to-pass-app-store-review/ · https://support.google.com/googleplay/android-developer/answer/16926792?hl=en · https://www.lokall.app/blog/google-play-app-access-instructions · https://amalgama.co/the-psychology-behind-fitness-apps-onboarding/

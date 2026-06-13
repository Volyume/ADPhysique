# Phase 3 comparison — Area 15: Scaling niche→mainstream / positioning (dual audience)

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/ultimate-audit-00-navigation-psychology.md` (free/Pro split + feature spread; file:line-grounded against `src/navigation/RootNavigator.js` and `src/components/ProGate.js`).
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-15-scaling.md` (53 products; 28 VERIFIED, 25 PARTIAL; statuses + source URLs carried below unchanged).

Frame: Volyume's risk/opportunity in expanding from a physique-competition niche to a full-spectrum (gym-newbie → elite competitor) audience.

---

```
AREA: Scaling niche→mainstream / positioning (dual audience)

VOLYUME CURRENT:
Volyume already runs a deliberate two-audience structure, but the split is by
PAYMENT TIER (Free vs Pro), not by ABILITY (newbie vs athlete) — and the depth
sits behind competition-tier language.
- Free surface = Plan Library, training builder, workout logging, exercise
  library, personal bests, progress stats; Pro adds food diary, scanning, macros,
  cardio, check-ins, Precision Coaching, division-specific plans, safety systems
  (CLAUDE.md FREE vs PRO; reflected in gated wrappers).
- The ONLY `withProGuard` gates are: WeeklyCheckIn, NutritionTargets, BodyMetrics,
  CoachOutput, ProGoalSetup, PlanUpdate, CoachingReminders, Diary, LogCardio,
  CardioHistory (`RootNavigator.js:149-162`). Guard renders `ProLocked` when
  `tier !== 'pro'` with an "Upgrade to Pro" → `navigate('ProUpgrade')`
  (`ProGate.js:134-139, 115`); the food lock also shows `TodaysPlateTeaser`
  (`ProGate.js:96,100`).
- Tab-bar icons are NOT gated: DiaryTab stays visible to free users; the gate
  fires on the Diary root, not on tab visibility (`RootNavigator.js:447`, audit §1).
- A genuine newbie on-ramp DOES exist: `FreeStarter` "three plain questions"
  installs and activates a difficulty-0 starter plan so the user "lands on Home
  with today's session already answered" (`RootNavigator.js:472-475`), plus Home's
  pre-answered "today's session" hero (audit §7 counterweight).
- BUT first-timer-relevant functionality is buried behind athlete/competitor terms:
  "Precision Coaching™" / CoachOutput buried in the You tab (`RootNavigator.js:388`,
  `YouScreen.js:128`); "Training Blocks" / MesocycleBuilder require knowing
  "mesocycle" (`RootNavigator.js:326`); "Volume" / VolumeHeatmap exposes MAV/MRV
  hypertrophy bands as a top-level tile (`RootNavigator.js:298,345`,
  `theme.js:485-492`); "Goal lock" / GoalLockConsent framed around a
  "competition-tier goal" sits in the new-user onboarding path
  (`RootNavigator.js:395,510-513`); basic "track my weight" (BodyMetrics) is
  Pro-gated and duplicated across two tabs (`RootNavigator.js:347,386`) (audit §7).
- Densest landing screens are Home, Progress and You; lightest is Diary (audit §6) —
  i.e. depth is present but front-loaded, not progressively disclosed.

BEST IN CLASS:
- Dual-track fallback — Reddit kept the dense legacy experience fully alive at
  old.reddit.com "to appease power users… and as a fallback for features not
  present in the redesign"; engagement still rose 22% YoY. The cleanest
  "don't break the experts" mechanism found. VERIFIED.
  https://emilsmith.pro/articles/posts/2019-11-21-analysis-reddits-2018-redesign/
- Progressive complexity — Notion "begins simple. Then complexity appears gradually
  as users gain confidence"; templates as the on-ramp; backed by NN/g progressive-
  disclosure research ("show users only a few of the most important options. Offer a
  larger set of specialized options upon request"). VERIFIED.
  https://www.nngroup.com/articles/progressive-disclosure/ ;
  https://raw.studio/blog/how-notion-ux-converts-100-million-users/
- One workout, scaled to ability — CrossFit's scaling/Rx model serves first-timer
  and elite from the SAME named session by adjusting load, not forking the product;
  it explicitly addresses that walking in "can be terrifying". PARTIAL (operator
  blogs, consistent).
  https://www.tarheelcrossfit.com/blog/the-science-behind-scaling-in-crossfit-how-every-workout-is-for-every-body
- Accuracy as the serious moat — Cronometer hits 30/30 entries within 5% accuracy
  (vs MFP 11/30) and keeps the precision segment loyal. VERIFIED.
  https://medium.com/@margotcox/cronometer-vs-myfitnesspal-heres-my-pov-90e6876deb69
- Premium-led, accessibility-funded — Lululemon broadened to men's (0% → 24% of
  revenue 2024) without cheapening the brand (VERIFIED); Tesla led high-end to fund
  the mass-market Model 3 while keeping premium branding (PARTIAL).
  https://athletechnews.com/lululemon-men-performance-wear-market-survey/

TOP 50 RANGE:
Spectrum from fatal over-reach to clean dual-audience execution.
- FATAL (removed/degraded what existing users had): Digg v4 deprioritised user
  contributions → "Quit Digg Day", −90% uniques by 2012 while Reddit grew 230%
  (VERIFIED); Sonos 2024 redesign removed core features → −25% stock, ~$500M wiped,
  CEO out (VERIFIED).
- CONTESTED (forced mainstream redesign, refused to revert): Snapchat 2018 →
  1M-signature petition, CEO said it "was here to stay" (VERIFIED).
- SURVIVABLE (added a layer / kept a fallback): Reddit dual-track (VERIFIED);
  Garmin Connect+ drew a 10k-upvote boycott yet posted record Q4, Fitness +33%
  because the free core was untouched (VERIFIED).
- CLEAN DUAL-AUDIENCE: Figma (added FigJam/Dev Mode; two-thirds of users aren't
  designers) and GoPro (reframed the same product to "people capturing themselves")
  (VERIFIED); Slack's methodical bottom-up individuals→teams→enterprise with
  onboarding "as a product" (VERIFIED).
- DIRECT FITNESS COMPARATORS on the casual↔expert axis: Hevy "designed for people
  still getting comfortable with the logging habit" (community + unlimited free tier)
  vs Strong "for people who have already built it" (raw logging speed) — VERIFIED;
  Fitbod auto-generation suits beginners but "can feel like it's fighting your
  preferences" for advanced lifters running named programs (PARTIAL); JEFIT =
  data-heavy control for self-programmers (PARTIAL).

NEWBIE VERDICT:
Mixed. Volyume gets the Day-1 on-ramp right — `FreeStarter`'s three-question
difficulty-0 plan + pre-answered Home hero (`RootNavigator.js:472-475`) is exactly
the "guided default / templated onboarding" winners use (Slack/Notion, F8/F15
VERIFIED). But beyond Day 1 the newbie meets athlete vocabulary fast: Precision
Coaching, mesocycles, MAV/MRV volume bands and competition "goal lock" are surfaced
without a simpler framing (audit §7), the opposite of progressive disclosure
(NN/g VERIFIED). The newbie also cannot "track my weight" without Pro
(`GatedBodyMetrics`, `RootNavigator.js:347,386`).

ATHLETE VERDICT:
Well served on depth, and the depth is intact rather than diluted — Precision
Coaching, division-specific plans, macros, MAV/MRV volume, mesocycle/block
periodisation and the safety systems are all present (CLAUDE.md Pro list; audit §7).
This matches the "rigour as the premium moat" pattern that retains serious users
(Cronometer VERIFIED). The competitor's deterministic, no-AI coaching boundary
(CLAUDE.md) is itself an advantage given athletes treat "AI" as a trigger and demand
opt-out (Garmin VERIFIED; Strava PARTIAL). Risk: depth lives behind the You tab and
duplicated entry points, not a fast dense surface.

WHERE WE LEAD:
- A deterministic, no-AI coaching engine (CLAUDE.md) directly pre-empts the "AI as
  trigger" backlash that hit Strava ("AI has become a triggering word"; "pointless")
  and Garmin (10k-upvote boycott). Strava PARTIAL / Garmin VERIFIED.
- Rigour/accuracy + safety systems as the premium substance — the moat Cronometer
  proves retains serious users (VERIFIED) and the "premium feel via rigour, not
  exclusivity" pattern (Lululemon VERIFIED).
- A real templated newbie on-ramp already exists (`FreeStarter` difficulty-0 plan,
  `RootNavigator.js:472-475`), echoing the onboarding-as-product winners (Slack
  VERIFIED; Notion guided onboarding cut dropout 15%, VERIFIED).
- Free tier is genuinely useful (Plan Library, builder, logging, PBs, progress
  stats — CLAUDE.md), aligning with Hevy's "generous free tier shows value before
  paying" model. VERIFIED.

WHERE WE LAG:
- No progressive disclosure by ABILITY. Volyume splits by tier, not by newbie↔athlete
  competence; athlete terminology (Precision Coaching™, mesocycle, MAV/MRV, goal lock)
  is surfaced without a simpler default layer (audit §7), where Notion/NN/g default
  simple and reveal depth on request. VERIFIED (NN/g, Notion).
- No dual-track fallback concept. Reddit's old.reddit.com kept the dense workflow for
  experts as the simple default went mainstream (VERIFIED); Volyume has no analogous
  "dense mode" preserved if the default is ever simplified.
- Front-loaded cognitive density. Home, Progress and You are all high-density landings
  (audit §6) — the opposite of "simple by default, depth one tap away"
  (NN/g VERIFIED).
- Basic expectations sit behind Pro. "Track my weight" (BodyMetrics) is Pro-gated
  (`RootNavigator.js:347,386`); MFP's barcode paywall shows how gating an
  expected-free behaviour becomes "the most common complaint" — Volyume must
  communicate any tier line directly and never demote a currently-free feature.
  MFP VERIFIED.

MISSING ENTIRELY:
- An explicit "scale the same plan to ability" model (CrossFit Rx/scaled): one named
  workout/plan serving newbie and competitor by adjusting load/targets rather than
  separate products. Volyume scales by tier and by difficulty-0 starter, but no
  documented single-plan-scaled-across-ability surface appears in the audit. PARTIAL
  (CrossFit).
- A preserved dense/expert mode as a fallback (Reddit old.reddit.com pattern).
  VERIFIED.
- Needs-based segmentation that tailors the SAME product to beginner vs elite
  experiences explicitly (multi-segment marketing pattern). PARTIAL.

USER SENTIMENT (what users want that no app fully provides — from the fragment):
- Casual learners want real outcomes, not just gamified progress: Duolingo "feels
  like a fun vocab game, but it doesn't teach fluency… pass levels but still can't
  hold a conversation". (Implication for Volyume: a scaled-down newbie experience
  must still deliver real training progress, not a toy.)
- Serious users want raw numbers fast, not buried under friendly narration —
  Fitbit→Google Health "buried key metrics beneath Gemini-generated text",
  prompting switches to Garmin. PARTIAL.
- Existing users want NOTHING they rely on removed or relocated — "Even if you fix
  this app the damage is done" (Sonos). VERIFIED.
- The research's standing gap: no single app cleanly serves both the casual on-ramp
  AND expert depth in one product — Strong/Hevy split it between two apps (VERIFIED);
  that unmet "both at once" need is the opportunity. Closing it for Volyume is
  INTERPRETATION, not a sourced finding.

VERIFICATION STATUS:
Mixed — not all-VERIFIED. PARTIAL/NOT-FOUND items this block leans on:
- CrossFit "scale one workout to ability" model — PARTIAL (operator blogs).
- Strava "AI as trigger" quotes — PARTIAL (Garmin equivalent is VERIFIED).
- Fitbit→Google Health "buries metrics, athletes switching" — PARTIAL.
- Tesla premium-led funding mass market — PARTIAL (Lululemon equivalent VERIFIED).
- Fitbod "fights advanced lifters", JEFIT depth, needs-based segmentation,
  multi-segment marketing — PARTIAL.
- The "no app serves both audiences in one product; that is Volyume's opportunity"
  closing point is flagged INTERPRETATION (per research-15 F24/§5 separation),
  built on the VERIFIED Strong-vs-Hevy split, not a sourced standalone claim.
- The research's own biggest gap stands: hard quantified post-change outcomes
  (churn %, revenue deltas) exist only for Sonos, Digg, Notion, Garmin; most
  backlash is qualitative (research-15 §6).
All VOLYUME CURRENT claims trace to the navigation-psychology fragment with file:line
(RootNavigator.js / ProGate.js / theme.js / YouScreen.js) or to CLAUDE.md's stated
Free vs Pro split.
```

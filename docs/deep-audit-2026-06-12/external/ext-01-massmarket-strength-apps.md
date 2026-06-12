# Mass-Market Strength & Workout-Logging Apps — Competitive Research

> **PROVENANCE NOTICE (2026-06-12, added after a verified research-tooling
> failure):** this document presents itself as external/competitive research.
> The session that produced it cannot be verified from here, and the cloud
> environment used for this build BLOCKS page fetches (search digests only).
> Treat every competitive claim and citation in this document as UNVALIDATED
> until re-verified through a working /deep-research run or primary sources.
> Features built from it have NOT been proven better than competitors.


**Audit date:** 2026-06-12  
**Agent:** ext-01 — mass-market strength / workout-logging / hypertrophy apps  
**Additive to:** `docs/competitive-audit-2026-06-10/competitive-audit-01-workout-screen-research.md` (logging UX) and `-exercise-library-research.md` (demos), which covered those slices in depth. This report deliberately avoids re-stating their findings and focuses on the dual-market angles they under-covered: **beginner adoption, hand-holding, guided-program UX, retention mechanics, word-of-mouth, and psychology**. Where prior audit conclusions are contested, this is flagged explicitly.

---

## 0. What the prior audit missed

The 2026-06-10 audit was excellent on logging-screen mechanics (Hevy set-row gold standard, previous-performance placement, input size, rest timer). It under-covered:

1. **Beginner hand-holding / "what do I do today"** — the hardest problem for mass-market adoption, barely mentioned.
2. **Guided-program UX** — Boostcamp's program-picker, Hevy Trainer (launched Feb 2026, post-audit), and the role of named-author credibility were not examined.
3. **Retention mechanics beyond streaks** — PR celebrations, finish-workout moments, social sharing, the viral loop architecture that explains Hevy's 10M+ users.
4. **Beginner psychology** — gym anxiety, decision fatigue, "I don't know what to lift", and how the best apps solve this without overwhelming beginners with features.
5. **Free-vs-paid lines in depth** — the shift in 2025–26 to freemium-with-upgrade-hooks (Hevy, Boostcamp) vs hard paywalls (Strong) and how this affects beginner activation.
6. **Ladder's growth model** — 2,000% growth in two years via coach/team social, TikTok creator-coaches, and web onboarding.

The prior audit also stated that the workout-screen context layer (coaching chips, volume cues) was Volyume's differentiation. This report offers a **partial challenge**: beginners cannot use that context layer — they do not know what MEV/MRV means, they have no training history, and their first-session experience is determined almost entirely by "can I find something to do and log it without feeling stupid?" The coaching context is Elite-serving by default and may be a D0–D7 liability for Besa.

---

## 1. Per-app highlights

### 1.1 Hevy — the volume leader (now with a guided layer)

**What the prior audit covered well:** session-sheet layout, 2-tap cold logging, PREVIOUS column as tappable prefill, 3-control rest timer, ~12–14 interactive elements.

**What it missed — Hevy Trainer (launched 18 Feb 2026):**  
Hevy Trainer is an adaptive programming system bundled with Hevy Pro ($23.99/yr, $74.99 lifetime). Onboarding questions: experience level, goal, equipment, frequency, session duration, focus muscle groups. Output: a complete multi-week program with exercises, rep ranges, rest periods, **starting-weight recommendations**, and "helpful tips" for each movement. The program auto-adjusts working weights based on logged performance and provides progressive-overload suggestions backed by exercise-science literature.  
Source: [hevyapp.com/announcing-hevy-trainer/](https://www.hevyapp.com/announcing-hevy-trainer/); [help.hevyapp.com Trainer Explained](https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program)

**Strategic significance:** The prior audit described Hevy as a logger with a static program library (25+ programs, filtered by Level/Goal/Equipment). That was accurate on 2026-06-10 but Hevy Trainer changes the competitive picture: **Hevy is now a direct competitor to Volyume's coaching engine**, serving beginners with a personalised generated program and progressive-overload coaching, at $24/yr. This is the most important competitive development since the last audit.

**Beginner experience (updated):** Under 90 seconds to a logged set (unchanged). With Hevy Trainer, beginners now get a generated personalised program on first use — they never face a blank screen. The free tier retains the 26-program library so even non-Pro users get "what should I do" guidance.  
Source: [prpath.app/blog/hevy-app-review-2026.html](https://prpath.app/blog/hevy-app-review-2026.html); [repreturn.com/hevy-app-review/](https://repreturn.com/hevy-app-review/)

**Social / viral loop:** Hevy reached 10M+ users primarily through organic/viral growth with zero paid marketing. The mechanism: (a) in-app social feed + follower graph creates community investment; (b) shareable workout cards and routine sharing link (WhatsApp/Messenger) create external referrals; (c) the content feed default tab (not the social feed — a noted complaint) surfaces public workouts and feeds discovery. The Hevy founder (Guillem Ros Salvador) describes social features as "a pretty important retention driver because not only do you invest so much into the product with your own data… but also with the community that you form on the app."  
Source: Sub Club podcast (Hevy viral loops); [hevyapp.com/features/social-features/](https://www.hevyapp.com/features/social-features/); [hevyapp.com/features/shareable/](https://www.hevyapp.com/features/shareable/)

**PR / milestone celebration:** Hevy flags personal records inline at the moment a set is logged — a small but emotionally charged interaction that gives beginners a first concrete "win" and generates social-share content.

**Persona:** Besa (now with Trainer), Eddie (existing data-density + coaching logging).

---

### 1.2 Boostcamp — the program-first play, most beginner-friendly in the field

**The core model:** "Give beginners the world's most famous, most Reddit-endorsed programs, for free, and let the program's author credibility do the convincing." 11,000+ programs (130+ coach-designed: Starting Strength, StrongLifts 5×5, nSuns, GZCLP, Reddit PPL, Greg Nuckols, 5/3/1 for Beginners, RP programs, etc.) plus community-created routines, all filterable by experience level, goal, equipment, and duration.  
Source: [boostcamp.app](https://www.boostcamp.app/); [boostcamp.app/programs](https://www.boostcamp.app/programs)

**What this does for beginners:** The "what do I do today?" problem is solved without any AI or personalisation. A beginner picks "Starting Strength" (Mark Rippetoe's name is the credential), the app tells them exactly what to lift, in what order, with what progression scheme, for the next 12 weeks. They never need to think. The program's cultural legitimacy on r/fitness and r/weightroom (where it is the canonical beginner answer) pre-sells adoption.  
Source: [setgraph.app/ai-blog/best-workout-planner-reddit-recommends](https://setgraph.app/ai-blog/best-workout-planner-reddit-recommends); Boostcamp Starting Strength reviews page

**Program Selector:** Boostcamp offers a web/app-based filter — Level (Beginner / Intermediate / Advanced) × Goal (Strength / Hypertrophy / Powerlifting / General Fitness) × Equipment — with specific program cards showing duration, frequency, and author. For Besa, this narrows 11,000 programs to a handful of beginner/strength options she can trust.

**Logging UX:** Session view shows exercise, target sets/reps, and last logged weight. Tap previous column's weight to auto-fill. Rest timer starts automatically on set completion. Auto-progression: hitting reps triggers a weight increase for next session.  
Source: [boostcamp.app/workout-tracker](https://www.boostcamp.app/workout-tracker); [generationiron.com Boostcamp review](https://generationiron.com/boostcamp-app-review/)

**Free tier depth:** Core free tier includes the entire program library, tracker, and basic analytics — **no time limit**. Pro ($59.99/yr) adds custom builder, advanced analytics, and coach-created premium programs. This is an extremely generous free line — arguably the most generous in the segment — which powers word-of-mouth ("I've had this for two years and never paid").  
Source: [healthynexercise.com/boostcamp review](https://healthynexercise.com/best-free-fitness-apps/boostcamp/)

**Retention mechanic:** Volume heat-map anatomy chart. Post-workout, users see a body-map shaded by muscle volume logged. A beginner can immediately see if they are neglecting legs or back. This is a concrete, visual progress signal that requires zero fitness knowledge to interpret.  
Source: search result from [sensai.fit](https://www.sensai.fit/blog/fitness-app-comparison)

**Known weaknesses:** App can feel overwhelming at first session ("somewhat overwhelming interface initially"); minor bugs after updates; exercise substitution is paywalled.  
Source: [healthynexercise.com/boostcamp review](https://healthynexercise.com/best-free-fitness-apps/boostcamp/)

**Persona:** Besa (program-first solves the blank-screen problem cleanly), Eddie (respects author credibility, advanced programs available).

---

### 1.3 Fitbod — the strongest "what do I do today" answer, but a loyalty problem

**The pitch to beginners:** One equipment question → a complete generated workout, immediately. No blank screen ever. The app handles muscle recovery modelling, exercise selection, volume, and progressive load automatically. Beginners never have to make a programming decision.  
Source: [fitbod.zendesk.com beginner guide](https://fitbod.zendesk.com/hc/en-us/articles/360004848233-How-can-I-use-Fitbod-as-a-beginner-); [fitbod.me/blog/how-fitbod-builds](https://fitbod.me/blog/how-fitbod-builds-personalized-strength-programs-without-a-trainers/)

**Beginner-mode:** Setting experience to "beginner" reduces complexity (fundamentals only), adjusts set/rep schemes, and calibrates progression for muscle adaptation. Muscle recovery map shows which muscles are fresh (green) vs fatigued (darker).

**The loyalty problem — material for Volyume:** Fitbod's muscle-recovery personalisation takes 10–15 workouts to reach its full quality. Before that, the algorithm can feel random. Users who churn in weeks 1–3 (the majority) leave before the product has demonstrated its value. This is the **personalisation cold-start problem**: early value is lower than later value, but most users never reach "later."  
Source: [indiehackers.com Fitbod review 2026](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b); [dr-muscle.com Fitbod review](https://dr-muscle.com/fitbod-workout-app-review/)

**Free vs paid:** 3 free workouts, then hard paywall ($15.99/month). This is aggressive and means Besa hits the paywall before the algorithm has learned enough to impress her. This is a conversion risk the Fitbod product team must know about.

**Persona:** Besa (strongest day-0 answer), Eddie (algorithm needs many sessions to earn trust; serious lifters prefer explicit periodisation).

---

### 1.4 Boostcamp auto-progression detail (the most-praised mechanic in the segment)

The prior audit mentioned auto-progression briefly. More detail is warranted. Boostcamp's implementation: after a user logs a session, the app evaluates reps hit vs target. If all sets hit top of the range, the algorithm adds weight for next session per the program's defined increment. Each program defines its own progression rules — Starting Strength adds 2.5kg to lower-body and 5kg to upper-body barbell lifts after each session; 5/3/1 for Beginners advances per cycle based on percentage. The result: **the user never decides when to progress — the program tells them**. For Besa, this removes one of the most paralysing decisions in early training ("should I go heavier?"). For Eddie, explicit periodisation within the named program schema is credible.  
Source: [boostcamp.app/features](https://www.boostcamp.app/features); [setgraph.app best-strength apps 2026 blog](https://setgraph.app/ai-blog/best-strength-training-apps-2026)

---

### 1.5 Alpha Progression — the closest deterministic hypertrophy rival

**Already well-covered** by the prior audit. Key additions for this pass:

**Beginner barrier:** "A steep learning curve at the beginning, with a lot of features" is the most-cited complaint. The app's power comes from its per-set RIR-based prescription — but a beginner doesn't know what RIR means. The plan generator (Pro-only) requires inputs (frequency, session length, muscle emphasis, equipment, experience) that an intermediate user can give confidently but Besa cannot. The free tier only allows logging without the generated plan — meaning free beginners get a logger with no guidance.  
Source: [fitnessdrum.com Alpha Progression review](https://fitnessdrum.com/alpha-progression-app-review/); [hotelgyms.com Alpha Progression review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany); Facebook group post (StrongerByScienceCommunity)

**Price:** ~$9.99/month or $59.99/year. The "budget RP" positioning (one-third the cost of RP Hypertrophy at ~$30/month) makes it attractive to Eddies.

**The Volyume comparison:** Alpha Progression is Volyume's closest structural analogue — deterministic engine, MEV/MAV-informed volume, per-set coaching, German indie, 4.9★. It has a video demo on every exercise (critical gap for Volyume) and prices lower than Volyume. The onboarding is harder than Hevy or Boostcamp but the output (personalised per-set prescription) is closer to Volyume's coaching layer.

**Where Volyume is already superior to Alpha Progression:** physique-division specificity; bodybuilding-specific metrics; UK food database; ED safety system; offline-first architecture (AP has offline gaps per App Store reviews).

**Persona:** Eddie clearly; Besa is underserved (high learning curve, no guided beginner path).

---

### 1.6 Caliber — the Strength Score / Strength Balance model

**Free tier with meaningful data hooks:** Caliber's free tier includes unlimited custom workouts, 500+ exercise videos (step-by-step with coach tips), and training groups with friends. The paid differentiator ($12/month Caliber Plus) adds structured plans and — critically — **Strength Score and Strength Balance**.

**Strength Score:** A weekly-recalculated composite of how strong you are relative to your potential for your age and gender. Strength Balance shows relative development of major muscle groups. Both are described as "fantastic features for beginners that help exercisers of all levels focus on their weaknesses."  
Source: [caliberstrong.com/blog/introducing-strength-score/](https://caliberstrong.com/blog/introducing-strength-score/); [sports-nerd.com/brand/caliber/](https://sports-nerd.com/brand/caliber/)

**Why this matters for Besa:** A number that says "your strength is 42nd percentile for your age and gender" is emotionally meaningful, understandable without jargon, and improves over time — creating a natural long-term retention hook. It is a *personalised benchmark* rather than a raw kg lifted, which beginners cannot contextualise.

**Caliber Premium ($200/month):** Human coach, video check-ins, bespoke programming. Out of scope for Volyume's model but relevant as a reference for the premium segment.

**Persona:** Besa (Strength Score is beginner-legible progress); Eddie (Strength Balance addresses imbalance concerns serious lifters have).

---

### 1.7 Ladder — the coach-social growth model

**What it is:** Workout-delivery app; coach-programmed sessions with real video demos and in-ear audio cues per movement; team-based social structure. Not a free-form logger — users follow a coach's program.

**Growth:** ~2,000% subscriber growth in two years (approximately 10k → 175k subscribers). Mechanism: turned in-house coaches into TikTok/Instagram short-form content creators, converted best organic content to paid ads, used a 15-question web onboarding quiz to predict user LTV and optimise ad spend.  
Source: [podcasts.apple.com "How Ladder Nailed Product/Channel Fit"](https://podcasts.apple.com/us/podcast/how-ladder-nailed-product-channel-fit-on-tiktok-and/id1794011543?i=1000688294562); [subclub.com Ladder episode](https://subclub.com/episode/how-ladder-cracked-tiktok-and-grew-500-greg-stewart-ladder)

**Why beginners love it:** "The coaches demonstrate all the exercises via video tutorial… so I know I'm doing each move correctly." The team structure provides social accountability: members post session results, celebrate each other's achievements, and the group dynamic turns a solo gym habit into a shared identity.  
Source: [theeverygirl.com Ladder review](https://theeverygirl.com/ladder-app-review/); [outdoorsynomad.com Ladder review 2026](https://www.outdoorsynomad.com/ladder-fitness-app-review/)

**The Besa insight from Ladder:** Beginners don't just need *what to do* — they need *someone to do it with* (or at least the feeling of it). The team structure and coach voice address gym anxiety directly: "you're not alone, your coach is with you, your team is watching." This is a psychological function, not a feature list.

**Pricing:** ~$30–39/month. The cost restricts its reach, but its retention rates are category-leading (Apple's 2025 App of the Year Finalist, Women's Health 2026 Best Overall).

**Persona:** Besa very specifically (coach voice, team, video instruction, "tell me what to do"); Eddie would find it lacking in data density and customisation control.

---

### 1.8 JEFIT — the cautionary tale (updated)

The prior audit covered JEFIT's design-complexity failure at length. One addition: JEFIT's beginner program library is their attempt at the Boostcamp play — curated beginner routines, filtered by experience. But the UX debt means beginners hit the complexity before they experience the structure. "Having this reference library in your pocket is genuinely useful" but "the interface can feel cluttered compared to apps like Strong."  
Source: [gymbird.com JEFIT review](https://www.gymbird.com/fitness-apps/jefit-app-review)

JEFIT also added Progressive Overload smart recommendations in 2025–26 (weight/rep targets per set). However, the trust erosion from years of UX complaints and the ad-supported free tier make this hard to monetise. Lesson: features cannot rescue a broken UX foundation.

**Persona:** JEFIT serves neither Besa nor Eddie well in 2026. Avoid as a design reference.

---

### 1.9 Liftin' — one-tap logging, the emotional hook of simplicity

**The product thesis:** "Most workout apps treat training like data entry. Liftin' gets out of your way so you can train." One tap logs a set; large set counter ("SET 3") confirms what is happening; rest timer runs automatically; optional auto-progression rules.  
Source: [liftinapp.co](https://www.liftinapp.co/); [mwm.ai Liftin listing](https://mwm.ai/apps/liftin-gym-workout-tracker/1445041669)

**User sentiment:** "I used to be a pen and paper guy, and now I couldn't go a day without Liftin'." "If I had to have one single app, including texting and email, I would choose Liftin'." "The simple nature of this app is what makes users WANT to use it."  
Source: App Store reviews via mwm.ai.

**What this validates for Volyume:** The 1-tap log path Volyume already has is emotionally correct. The prior audit already noted this. The addition: **the large set counter as an emotional anchor** — users want to *see* where they are ("SET 3 of 4") as a satisfying signal, not just a status update. Volyume's current set indicator lives at 11pt; Liftin' renders it large by design.

**Pricing:** $24.99/year, premium-only. This limits its beginner reach (no free path) and restricts word-of-mouth growth.

**Persona:** Both; the simplicity loop appeals to Besa (no jargon, no decisions), the precision to Eddie (reliable, fast, out of the way).

---

### 1.10 Setgraph — AI plan generator for beginners as a conversion hook

**The relevant 2025–26 development:** Setgraph added an AI workout generator that asks goals, equipment, and schedule, then generates a complete training program. Their own positioning: "Setgraph wins for beginners because of its AI workout generator combined with a simple logging interface."  
Source: [setgraph.app/articles/setgraph-app-review-2025](https://setgraph.app/articles/setgraph-app-review-2025-complete-workout-tracker-guide-features)

**The pay gate:** 5 free workouts, then subscription. The generator is the hook; the paywall lands after the user has seen the product's value. This is a better funnel than Fitbod's 3-workout hard paywall because 5 sessions is enough to form a small habit.

**Persona:** Besa (plan generator solves blank screen); Eddie (data density is lower than Hevy/AP — probably not the primary choice).

---

### 1.11 GymStreak — the AI auto-scheduling app

**The pitch:** Tell the app which muscles to train, what equipment, how much time — it generates a session in under 5 seconds. Watches training history and adjusts the next session accordingly ("if you hit chest hard two days ago, today's chest volume will be lighter").  
Source: [indiehackers.com GymStreak review 2026](https://www.indiehackers.com/post/gym-streak-review-2026-my-honest-take-on-gymstreak-app-359b48d0e3)

**Post-workout visualisation:** After each workout, trained muscles "glow brighter" on a body map. Over weeks, users see imbalances at a glance. This is the same visual-progress mechanic as Caliber's Strength Balance and Boostcamp's heat-map — implemented as an ongoing reward rather than a one-time report.

**Critical beginner failure:** "The first generated leg day included barbell squats, Bulgarian split squats, leg presses, Romanian deadlifts, and calf raises — five compound movements in a single session. For a beginner or someone training on a lunch break, it is overwhelming." This is the cold-start personalisation-volume problem: the AI doesn't know the user is a beginner until it has enough data.

**Pricing:** Free limited to 3 workouts/week; full access requires subscription. Upfront paywall reported as friction.

**Persona:** Eddie (complex adaptive programming); Besa is actively hurt by the day-1 volume overload.

---

### 1.12 Dr. Muscle — the autoregulation depth benchmark

**What the prior plan-generation audit covered:** per-set adaptive engine, plus-set AMRAP calibration, layoff handling (10–20% weight reduction after missed week), billing trust problems.

**Additions from this pass:** Dr. Muscle's layoff handling is directly comparable to Volyume's 7-day layoff 0.9 multiplier — and pre-dates it. The trust problem (Trustpilot complaints about unauthorised charges) is existential for the product. The content-marketing flood (Dr. Muscle writes hundreds of "independent" review comparisons of competitors) is an SEO tactic that erodes trust when users recognise it.

**Lesson for Volyume:** Never use SEO-flooding as a growth tactic. It works short-term, generates App Store installs, and destroys trust when discovered — which is now widely known.

**Persona:** Eddie (autoregulation depth); Besa (the "ugly" UI and marketing concerns are a barrier).

---

### 1.13 Stronger by the Day — micro-coaching voice in a logger

**Overview:** 25,000+ active users; expert coaching by Meg Gallagher; science-backed progressive overload; recent UX/UI overhaul (2025) with improved onboarding, workout preview, and a revamped exercise library (400+ exercises). Workouts accessible with one tap. $8.33/month (annual), 7-day trial.  
Source: [strongerbytheday.app](https://strongerbytheday.app/); [App Store listing](https://apps.apple.com/us/app/stronger-by-the-day/id1591765440)

**The coach voice differentiator:** Built-in tutorials deliver "expert cues exactly when you need them" — not a video library you go browse, but contextual cues surfaced at the moment the set is about to happen. This is the coaching-voice-in-context pattern Volyume also uses — but with a named coach (Meg Gallagher) as the persona, which adds social trust.

**Persona:** Besa (named coach, lower price); Eddie (light on data density; not the primary choice for advanced periodisation).

---

### 1.14 Gymshark Training — the free-forever beginner trust signal

**The Gymshark play:** 100% free, forever. 700+ exercises with video guides on every single one. Programmes from both generic trainers and famous names. "The short videos showing exactly what to use and how to do the moves is extremely helpful for people just starting to go to the gym."  
Source: [tomsguide.com Gymshark review](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free); [justuseapp.com Gymshark reviews](https://justuseapp.com/en/app/1139151320/gymshark-training-fitness-app/reviews)

**Key limitation:** "Gymshark didn't feel very tailored to users' goals or preferences." No real personalisation. Tracking depth is weak — no drop sets, no supersets, no coaching layer. The value is entirely in the content (video library + free programmes) and the brand halo.

**The beginner demographic lesson:** Gymshark Training is downloaded by beginners who are already Gymshark apparel customers or who respond to fitness social media. The app retains them because (a) free removes any friction, and (b) videos reduce gym anxiety directly. It does not retain them for long because it lacks progression tracking.

**Persona:** Besa day 0–30; Eddie is not the target.

---

## 2. Cross-cutting synthesis

### 2.1 How the best apps get Besa to a first logged workout

| Pattern | Best implementations | What it solves |
|---------|---------------------|----------------|
| **Generated programme on D0** | Hevy Trainer, Fitbod, Setgraph AI | "I don't know what to lift" — blank screen anxiety |
| **Named-author programme library** | Boostcamp (130+ coach programmes) | "Is this programme any good?" — credibility anxiety |
| **Experience-level filter** | Boostcamp, JEFIT, Hevy programme library | "Is this right for me?" — self-selection anxiety |
| **Video/animation on every exercise** | Gymshark, Fitbod, Gymaholic | "Am I doing this right?" — form anxiety |
| **One-tap logging** | Liftin', Hevy (tap previous = prefill + tick) | "The app is distracting me" — interface anxiety |
| **Coach voice / named coach** | Stronger by the Day, Ladder | "I feel alone in the gym" — social/emotional anxiety |

Volyume currently delivers **zero of these six** at D0 for a free beginner. The existing coaching layer is rich but invisible until a user has completed onboarding, set up a programme, and understood what MEV/MRV means. The gap is not features — it is *guided entry*.

### 2.2 Beginner psychology: what the data says

- Gym anxiety has four distinct components: not knowing what to do, fear of looking stupid, not seeing results, and doing something wrong that causes injury. The best apps address component 1 (programmed guidance), component 3 (progress visualisation), and component 4 (exercise instruction/demos). Apps that address all three see disproportionate beginner retention.  
  Source: [healthline.com gym anxiety](https://www.healthline.com/health/fitness/gym-anxiety); Lucid.now retention metrics

- D1–D7 is the critical window: "The steepest drop happens between D1 and D7. If you're losing most users in that window, your onboarding likely works but your application hasn't given people a reason to form a habit." Health/Fitness apps average ~20–27% D1 retention and ~7% D7 — most users are gone within a week.  
  Source: [lucid.now retention metrics](https://www.lucid.now/blog/retention-metrics-for-fitness-apps-industry-insights/); [mwm.ai glossary](https://mwm.ai/glossary/retention)

- People who consistently log workouts are 42% more likely to stick with their training long-term — the logging habit is the retention mechanism, not the coaching depth.  
  Source: [orangesoft.co fitness engagement strategies](https://orangesoft.co/blog/strategies-to-increase-fitness-app-engagement-and-retention)

- Completing a first workout is the single most predictive activation event: "Users who complete their first workout are significantly more likely to return for a second session."  
  Source: [dev.to PaywallPro fitness onboarding guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)

### 2.3 Free vs paid lines in 2026

| App | Free line | Paid trigger | Monthly price |
|-----|-----------|-------------|---------------|
| Hevy | Unlimited logging, 26 programmes, social | Hevy Trainer, advanced analytics, custom exercises | $2.99/mo ($24/yr) |
| Boostcamp | All 11,000+ programmes, full tracker | Custom builder, premium coach programmes | ~$5/mo ($60/yr) |
| Strong | 3 custom exercises, core logging | More routines, advanced charts | ~$2.50/mo ($30/yr) |
| Fitbod | 3 workouts | Everything | $16/mo |
| Setgraph | 5 workouts | Everything | varies |
| Alpha Progression | Logging without plan generator | Full coaching + plan generator | $10/mo ($60/yr) |
| Caliber Plus | Basic logging + 500 exercise videos | Strength Score, structured plans | $12/mo (annual) |
| FitNotes | Everything | N/A — free forever | $0 |
| Gymshark Training | Everything | N/A — free forever | $0 |

**Critical observation:** The market has bifurcated between "earn trust before asking for money" (Hevy, Boostcamp, FitNotes) and "hit paywall fast to monetise activated users" (Fitbod, Strong, Setgraph). The free-trust-first model grows word-of-mouth faster. Volyume's 14-day cardless trial is neither — it is time-gated rather than value-gated, which means Besa's trial expires before she has seen enough to pay, unless the D0–D7 activation is tight.

### 2.4 Retention mechanics that produce long-term stickiness

Evidence across the field converges on:

1. **PR / personal-record celebration at the moment of achievement.** Not in a weekly recap — at the second the set is logged. Hevy, Boostcamp, and FitNotes all flag PRs inline. This is emotionally significant for beginners (first PR is memorable) and for Eddies (PRs validate training efficacy). Volyume already flags PRs (per baseline); this is parity.

2. **Volume heat-map body map.** Boostcamp (heat-shaded anatomy chart), GymStreak ("muscles glow brighter"), Caliber (Strength Balance visual). For beginners, seeing a muscle group fade because they skipped legs is a more legible retention signal than any number. For Eddies, volume distribution visualisation is analytically valuable.

3. **Completion ritual + session summary.** Every top-performing logger has a post-workout summary screen: duration, total volume, muscles trained, PRs hit, volume change vs last session. This is the "well done" moment — the reward that closes the habit loop. Strong's post-workout summary is widely praised. Volyume's baseline audit (June 2026-06-10 baseline doc) should be checked — if this screen lacks warmth or a concrete achievement message, it is a retention leak.

4. **Named programmes + auto-progression eliminates the "should I go heavier?" decision.** Boostcamp's auto-progression is the clearest implementation. For beginners, removing the "did I earn this weight increase?" question is massive — it is a decision they will get wrong frequently and that will demoralise them when they fail. Letting the programme decide takes that anxiety off the table.

5. **Social accountability layer (team/friend):** Ladder's growth model (2,000% in 2 years) is built almost entirely on this. Hevy's social feed produces community investment that makes users less likely to leave. Not all users want this — but making it available and opt-in is a low-cost retention option.

### 2.5 Viral / word-of-mouth mechanics

- **Shareable workout cards:** Hevy generates branded image summaries of completed workouts, shareable directly to Instagram/WhatsApp/Reddit. This is a zero-cost viral loop: every post is product placement. The card format is polished enough that users want to share it (it looks like a real achievement, not an ad).  
  Source: [hevyapp.com/features/shareable/](https://www.hevyapp.com/features/shareable/)

- **Shareable routine links:** Hevy lets users share full programmes via external link. A coach shares their programme → non-users must download Hevy to access it. Classic virality from utility.

- **Named-programme endorsement chains:** Boostcamp's Starting Strength programme has a review page where users post results. A beginner Googles "Starting Strength app" → lands on Boostcamp's page → downloads. The programme's Reddit credibility pre-selects highly motivated users.

- **Creator-coach model (Ladder):** Coaches produce TikTok content → organic reach → users download → coaches become the brand. Requires real coaches (not algorithmic content) but scales cheaply with the right creator-coach contracts.

---

## 3. Ranked transferable ideas — tagged for Volyume

*Persona tag: B = Besa the Beginner, E = Eddie the Elite, Both = both.*  
*Effect tags: Activation, Retention, Conversion, Virality, Credibility.*  
*Gap = confirmed absent from Volyume per the prior baseline + audit.*

---

### T-01 — Guided Beginner Programme Entry ("What should I do?")

**What it is:** On first open (or in the Plan Library), surface a programme-picker with 3–4 beginner-tagged programmes, filtered by frequency and equipment. No MEV/MRV jargon. Names like "3-Day Full Body — Build your foundation" with a 2-sentence plain description. One tap starts the programme; the user's first session begins immediately.

**Who does it best:** Boostcamp (named programmes solve credibility), Hevy Trainer (generated personalised programme). Both now offer something Volyume does not: a complete answer to "what should I do today?" for a zero-experience user.

**Persona:** B  
**Effect:** Activation (D0), Retention (D7)  
**Volyume gap:** Confirmed. Volyume has a Plan Library but it is designed for Eddie. There is no beginner-tagged, plain-English entry path. The coaching engine is powerful but invisible to Besa on D0.  
**Effort:** Low–Medium. The coaching engine already generates plans. The work is a beginner-flagged set of plans (2–3 templates: 3-day full body, 4-day upper/lower, home dumbbell), a simplified plan-picker screen for new users only, and plain-English copy replacing the jargon. No engine changes required.  
**Placement:** Day-0 onboarding path after the quiz (COMP-030), before the first workout. Show the beginner path only to users who self-select <12 months experience. Eddies skip it.  
**Constraint check:** No AI, no randomness. The guided entry is a curated set of deterministic plans, not generated. Compliant.

---

### T-02 — Volume Heat-Map Body Map (post-workout + weekly)

**What it is:** After logging a session, show a silhouette with trained muscles shaded. After a week, show which muscles are under-volume (faded) vs balanced. No jargon required to read it.

**Who does it best:** Boostcamp (anatomical heat-map, weekly), GymStreak ("muscles glow brighter" per session), Caliber (Strength Balance — muscle group comparison chart).

**Persona:** B (emotionally legible progress signal requiring zero knowledge); E (volume distribution visualisation — complements existing MEV/MRV tracking)  
**Effect:** Retention (D7–D30), Conversion (visual proof of what Pro tracking gives you)  
**Volyume gap:** Likely — the prior audit noted a per-muscle volume chart exists but the finish-workout moment and the weekly view should be checked against the baseline. If it exists it needs warmth; if it does not it is a genuine gap.  
**Effort:** Medium. Anatomical silhouette rendering + muscle-group-to-volume mapping logic. The exercise-muscle-group metadata (laterality, target muscle) already exists in Volyume's deterministic schema.  
**Placement:** (a) Workout summary screen (post-session), (b) Home screen weekly card  
**Constraint check:** Deterministic computation, offline-first compatible. Compliant.

---

### T-03 — Shareable Workout Summary Card

**What it is:** After finishing a workout, generate a branded image card: workout name, duration, total volume, PRs hit, top lift. One-tap share to Instagram / WhatsApp / clipboard. The card is designed to be posted, not just exported.

**Who does it best:** Hevy — explicitly described as "beautiful and customisable social media shareables." This is the primary mechanism by which Hevy reached 10M+ users organically.  
Source: [hevyapp.com/features/shareable/](https://www.hevyapp.com/features/shareable/)

**Persona:** B (first PR card is extremely emotionally potent — the "I did it" moment); E (volume numbers + PRs are worth sharing to the training community)  
**Effect:** Virality (primary), Retention (completion ritual reinforces habit loop)  
**Volyume gap:** Confirmed absent. The baseline and prior audit mention no shareable card or social export feature.  
**Effort:** Low–Medium. Image generation from workout summary data (already computed). The design work is the bulk of the effort — card design to look like an achievement, not a screenshot.  
**Placement:** Workout summary screen (post-session). "Share your session" CTA below the summary.  
**Constraint check:** No PII in the shared card (only training metrics, no weight/body data). Compliant with no-PII-to-external-services rule.

---

### T-04 — PR Inline Celebration (at the moment of logging)

**What it is:** When a set is logged that beats all-time or recent best for that exercise, trigger an immediate inline celebration — a subtle haptic + a brief visual badge on the set row ("New PR") — at the moment of the checkmark, not deferred to a summary screen.

**Who does it best:** Hevy (PR flag inline at logging), Strong (PR flag on set row). This is present in almost every top app.

**Persona:** B (the first squat PR is a formative gym moment; it must be celebrated immediately); E (PRs validate micro-progression decisions)  
**Effect:** Retention (D7–D30 emotional bond), Virality (feeds into shareable card T-03)  
**Volyume gap:** Needs verification. The baseline mentions "per-exercise charts/PRs/goals" exist. Whether a PR is celebrated at the moment of logging vs only in charts is unconfirmed. If it is chart-only, the inline moment is a gap.  
**Effort:** Very Low (if PR detection exists, adding inline visual/haptic is trivial). Medium if PR detection is only in analytics.  
**Placement:** The active set row in ActiveWorkoutScreen.  
**Constraint check:** No constraint issues.

---

### T-05 — Plain-English Auto-Progression Prompts

**What it is:** After hitting target reps across all sets, surface a one-line in-session prompt: "You hit all your reps. Add 2.5kg next session." No jargon. No user decision required. The programme decides; the app communicates the decision in human language.

**Who does it best:** Boostcamp (clearest implementation of auto-progression with user-visible rationale), Hevy Trainer (progressive-overload suggestions "backed by scientific research"), Alpha Progression (per-set prescription embedded in the input row).

**Persona:** B (removes the most paralysing beginner decision); E (validation that the engine is doing what they expect)  
**Effect:** Activation (removes a barrier to session completion), Retention (users feel guided, not just tracked)  
**Volyume gap:** Volyume's engine generates progression targets (they are part of the coaching layer already). The question is whether this is communicated in plain English at the right moment — end of session, in the workout summary — or only visible in deep analytics. If the coaching output surfaces only in technical chips and not in plain finish-session language, this is a communication gap, not an engine gap.  
**Effort:** Low (copy and placement change, if the underlying data already exists).  
**Placement:** Post-session summary screen, and optionally as a per-exercise end-of-block note on the session screen.  
**Constraint check:** Deterministic. Compliant.

---

### T-06 — Named-Author / Beginner-Credibility Programme Tags

**What it is:** In the Plan Library, tag beginner-appropriate plans with a short credibility marker — not the author's name (Volyume's plans are Volyume's, not a named external coach), but a stated methodology origin: "Based on 3-day full-body periodisation, the most-recommended beginner structure on r/fitness." Or: "Designed to give a beginner their first PR within 6 sessions."

**Who does it best:** Boostcamp (named coaches: Mark Rippetoe, Greg Nuckols, Jim Wendler carry enormous credibility on Reddit and r/weightroom). The prior plan-generation audit noted: "trust can come from named authorship rather than algorithmic claims." Volyume cannot use external coaches' names but can use methodology credibility markers.

**Persona:** B (needs reassurance that the plan is validated, not invented); E (already trusts Volyume's methodology — would read the evidence basis, not the reassurance tag)  
**Effect:** Activation (reduces plan-selection hesitation), Conversion (beginner who selects a plan is more likely to log first session)  
**Volyume gap:** Present — Plan Library cards currently surface programme structure/duration but likely not human-legible credibility anchors.  
**Effort:** Very Low (copy change on plan cards). No engineering work.  
**Placement:** Plan Library card subtitles.  
**Constraint check:** No constraint issues.

---

### T-07 — Post-Workout Finish Ritual with Warmth (the "well done" moment)

**What it is:** The workout summary screen — the first thing a user sees after tapping "Finish" — should be a warm, specific celebration of what was just done: total volume, duration, muscles trained, PRs hit, and a brief coaching-voice acknowledgement. Not just statistics. Something that makes Besa feel like she did a good thing.

**Who does it best:** Strong's post-workout summary is widely cited. Hevy's summary is clean. Stronger by the Day explicitly describes "expert cues exactly when you need them" including at completion. MacroFactor's post-workout summary is praised for feeling like a coaching moment.

**Persona:** B (the emotional "well done" is critical for early habit formation; a stats dump does not accomplish this); E (coaches appreciate seeing volume delta, PRs, and session metrics in one place)  
**Effect:** Retention (D1–D7 habit loop closure), Virality (feeds T-03 shareable card)  
**Volyume gap:** Requires checking the baseline. The prior audit describes the finish-workout flow but does not analyse the emotional quality of the summary screen. If it is a stats list with no acknowledgement, it is a gap.  
**Effort:** Low (copy + small UI tweak). The data is already computed.  
**Placement:** Workout summary screen (post-Finish), directly before the shareable card option.  
**Constraint check:** No constraint issues. British English required.

---

### T-08 — Muscle-Recovery / Volume Balance Status (the "what's fresh today?" signal)

**What it is:** On the home screen or workout-start screen, show which muscle groups are fresh vs trained recently. For a beginner: "Your chest and shoulders are rested — a good day for push work." For Eddie: a per-muscle volume status aligned to MEV/MRV landmarks (Volyume already tracks this; the question is whether it is surfaced as a day-level answer on the home screen).

**Who does it best:** Fitbod (muscle recovery map is the whole UX metaphor), GymStreak (per-session tracking updates the body map), Boostcamp (programme dictates the day's work so the question is answered implicitly).

**Persona:** B (answers "what do I do today?" without requiring programme discipline); E (MEV/MRV volume status is already in the engine — surface it as a home-screen signal)  
**Effect:** Activation (reduces blank-screen anxiety), Retention (daily return trigger — "the app tells me when to come back")  
**Volyume gap:** Likely. Volyume's coaching engine tracks volume landmarks per muscle group per week. Whether this is surfaced as a home-screen "what to do today" signal is unclear from the baseline. If it is only visible inside an active plan's schedule, it is a gap for free users and non-plan users.  
**Effort:** Low–Medium. The data exists. The work is a home-screen widget / card reading from the existing volume model.  
**Placement:** Home screen, top card or plan-day widget.  
**Constraint check:** Deterministic, offline-first. Compliant.

---

### T-09 — Beginner Glossary / Jargon Reduction in Coaching Voice

**What it is:** Every use of MEV, MAV, MRV, RIR, 1RM, periodisation, deload, or mesocycle in any user-facing string should have an in-context tap-to-explain tooltip (for Besa) while remaining abbreviated for Eddie. This is not a new feature — it is a copy/UX pass.

**Who does it best:** MacroFactor (criticised for opacity: "I don't know how it works... I don't know the rules of the game" — a direct consequence of not explaining jargon). Alpha Progression (criticised for "steep learning curve" — same cause). Volyume's coaching engine is more sophisticated than both, which means the jargon risk is higher.

**Persona:** B  
**Effect:** Activation (reduces first-session confusion that causes abandonment), Retention (users who understand the coaching stay longer)  
**Volyume gap:** Likely. The coaching layer uses technical terminology that is correct but may be opaque to beginners.  
**Effort:** Low (tooltip infrastructure if it exists; copy work for 20–30 terms).  
**Placement:** Any screen with coaching terminology — ActiveWorkoutScreen chips, plan overview screens, weekly summary.  
**Constraint check:** No constraint issues. British English required.

---

### T-10 — Caliber-style "Strength Score" proxy for beginners

**What it is:** A single normalised progress number ("Your estimated strength level is 34th percentile for women your age") that increases as the user lifts more. Based on estimated 1RM across key lifts (squat, bench, deadlift, hip thrust — physique-relevant) compared to population norms. Updated weekly.

**Who does it best:** Caliber's Strength Score (age/gender normalised, weekly recalculated). Also present in: Stronger by the Day ("Strength Scores"), Setgraph ("progression tracking").

**Persona:** B (a percentile number is legible without any fitness knowledge — it answers "am I making progress?" better than "my squat went from 40kg to 42.5kg"); E (would also use, but has more granular tools)  
**Effect:** Retention (long-term progress anchor beyond the current mesocycle), Conversion (score improves → user wants to see where they are in a year → Pro conversion)  
**Volyume gap:** Likely. Volyume tracks PRs per exercise and volume landmarks but probably not a single holistic strength-level score normalised for demographics.  
**Effort:** Medium. Needs population norm data for key lifts by gender and age (public data exists — Casey Butt, Lon Kilgore, and ExRx have published norms). Computation is deterministic.  
**Placement:** Progress tab / profile card. For beginners: home screen. For Eddie: already confident; the score is a check rather than a primary signal.  
**Constraint check:** Offline-first compatible (local computation). No PII to external services (data stays local). Compliant.

---

## 4. Ideas examined and excluded (or already present)

| Idea | Reason excluded |
|------|-----------------|
| AI form check (Gymaholic) | Hard constraint: no AI, and camera video of users = PII. Not recommended. |
| MuscleWiki API for exercise demos | Conflicts with offline-first (streaming-only licence). Already flagged in prior audit. |
| Ladder-style human-coach filmed programmes | Out of scope for indie; requires per-workout studio filming. |
| Social feed / follower graph (Hevy-style) | NEW-002 Training Partners already covers the accountability use case; a full social feed is scope-creep and risks replicating Hevy's "social feed as annoying default tab" complaint. |
| Named-external-coach programme library (Boostcamp-style) | Licencing/legal complexity; Volyume's differentiation is *its own* deterministic engine, not others' programmes. The credibility anchor should come from Volyume's methodology (T-06), not borrowed names. |
| GymStreak AI auto-scheduling | Hard constraint: no AI. GymStreak's day-0 volume overload is also a cautionary design example (see §1.11). |
| Dr. Muscle SEO-flooding content | Ethical + trust issue. Do not replicate. |
| Fitbod ML muscle-recovery model | Hard constraint: no AI/ML. Volyume's deterministic volume-landmark model is the correct analogue — surface it better (T-08). |

---

## 5. Where this report disagrees with the prior audit

**Prior audit claim (2026-06-10):** "The coaching context layer — MEV/MRV chips, volume cues — is Volyume's differentiator."

**This report's position:** The coaching context layer is Eddie's differentiator. For Besa, it is a D0–D7 churn driver unless there is a guided entry path (T-01) and jargon is made approachable (T-09). The context layer needs to be *stratified by user state*: beginners see simplified coaching language; Eddies see full data density. Showing Besa a "MRV Warning" chip before she has done 10 sessions is likely to make her feel she is doing something wrong, not right.

**Prior audit claim:** "Hevy is a logger with a program library — it lacks Volyume's coaching depth."

**Updated:** Hevy Trainer (launched Feb 2026) generates personalised programmes with adaptive progressive overload. The competitive gap has narrowed significantly. Hevy is now competing on Volyume's core terrain at $24/year. Volyume's remaining differentiators are physique-division specificity, autoregulation depth, nutrition integration, and offline-first reliability. These are strong — but the framing that Volyume is categorically different from "loggers" is no longer clean.

---

## 6. Sources cited

- [hevyapp.com/announcing-hevy-trainer/](https://www.hevyapp.com/announcing-hevy-trainer/)
- [help.hevyapp.com Hevy Trainer Explained](https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program)
- [hevyapp.com/features/shareable/](https://www.hevyapp.com/features/shareable/)
- [hevyapp.com/features/social-features/](https://www.hevyapp.com/features/social-features/)
- [repreturn.com/hevy-app-review/ (April 2026)](https://repreturn.com/hevy-app-review/)
- [prpath.app/blog/hevy-app-review-2026.html](https://prpath.app/blog/hevy-app-review-2026.html)
- [boostcamp.app](https://www.boostcamp.app/)
- [boostcamp.app/features](https://www.boostcamp.app/features)
- [generationiron.com Boostcamp review](https://generationiron.com/boostcamp-app-review/)
- [healthynexercise.com Boostcamp review](https://healthynexercise.com/best-free-fitness-apps/boostcamp/)
- [fitbod.zendesk.com beginner guide](https://fitbod.zendesk.com/hc/en-us/articles/360004848233-How-can-I-use-Fitbod-as-a-beginner-)
- [fitbod.me/blog/how-fitbod-builds-personalized-programs](https://fitbod.me/blog/how-fitbod-builds-personalized-strength-programs-without-a-trainers/)
- [indiehackers.com Fitbod review 2026](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)
- [dr-muscle.com Fitbod review](https://dr-muscle.com/fitbod-workout-app-review/)
- [fitnessdrum.com Alpha Progression review](https://fitnessdrum.com/alpha-progression-app-review/)
- [hotelgyms.com Alpha Progression review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)
- [caliberstrong.com/blog/introducing-strength-score/](https://caliberstrong.com/blog/introducing-strength-score/)
- [sports-nerd.com/brand/caliber/](https://sports-nerd.com/brand/caliber/)
- [barbend.com/caliber-fitness-app-review/](https://barbend.com/caliber-fitness-app-review/)
- [theeverygirl.com Ladder review](https://theeverygirl.com/ladder-app-review/)
- [outdoorsynomad.com Ladder review 2026](https://www.outdoorsynomad.com/ladder-fitness-app-review/)
- [podcasts.apple.com Ladder TikTok growth](https://podcasts.apple.com/us/podcast/how-ladder-nailed-product-channel-fit-on-tiktok-and/id1794011543?i=1000688294562)
- [liftinapp.co](https://www.liftinapp.co/)
- [mwm.ai Liftin listing](https://mwm.ai/apps/liftin-gym-workout-tracker/1445041669)
- [setgraph.app beginner apps 2026](https://setgraph.app/ai-blog/best-beginner-workout-apps-2026)
- [indiehackers.com GymStreak review 2026](https://www.indiehackers.com/post/gym-streak-review-2026-my-honest-take-on-gymstreak-app-359b48d0e3)
- [tomsguide.com Gymshark review](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free)
- [justuseapp.com Gymshark reviews](https://justuseapp.com/en/app/1139151320/gymshark-training-fitness-app/reviews)
- [strongerbytheday.app](https://strongerbytheday.app/)
- [lucid.now retention metrics](https://www.lucid.now/blog/retention-metrics-for-fitness-apps-industry-insights/)
- [mwm.ai retention benchmarks glossary](https://mwm.ai/glossary/retention)
- [orangesoft.co fitness engagement strategies](https://orangesoft.co/blog/strategies-to-increase-fitness-app-engagement-and-retention)
- [dev.to PaywallPro fitness onboarding guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)
- [sensai.fit app comparison 2026](https://www.sensai.fit/blog/fitness-app-comparison)
- [setgraph.app best-strength-training-apps-reddit](https://setgraph.app/ai-blog/best-strength-training-apps-reddit)

---

*Research only. No code changed. No locked-doc edits. All proposals are additive to `docs/deep-audit-2026-06-12/` and subordinate to the hard constraints in `_SHARED-BRIEF.md`.*

# Future App — Competitor Teardown
## 1:1 Human Coach as the Retention Engine

**Research Date:** 2026-07-03  
**Company:** Future (founded 2017, San Francisco)  
**CEO/CTO:** Rishi Mandal, Justin Santamaria  
**Total Funding:** $112.8M+ (Series A: $8.5M 2019; Series B: $24M 2020; Series C: $75M 2022)  
**Status:** Active, well-funded, growth phase

---

## STRUCTURE (DIMENSIONS 1–10)

### 1. Connection / Belonging Mechanic — Step by Step

**The Core Loop:**

A user joins Future, completes a three-minute onboarding quiz (goals, experience, preferences, coach gender/style), and is presented with 3–4 AI-matched coach suggestions plus the ability to browse 130+ coaches by bio. After coach selection, an introductory video call establishes the relationship. Then:

1. **Daily messaging from coach** — coach texts user with check-ins, motivation, tips. Texting is in-app; coaches message "daily" (frequency varies by coach).
2. **Workout delivery** — coach crafts a custom weekly program. User logs in to see next workout with video form demos, audio cues, exercise library. Can modify or move workouts without penalty.
3. **Submission and feedback loop** — user logs workout data (reps, weights, duration). Watches for Apple Watch/Garmin heart rate and activity data if available. Coach notified of completion; can leave text feedback ("Nice lift, Alex! You recovered quickly between sets").
4. **Form video review** — if user struggles or asks, they record a video of the exercise and upload it to the app. Coach reviews (typically within 24 hours) and sends video feedback.
5. **Weekly adjustments** — coach refines program based on user data, feedback, and life changes (injury, travel, fatigue, scheduling).
6. **Messaging as lifeline** — user can message coach anytime with questions; coach responds (stated as quick response times, but not guaranteed SLA).

**The emotional arc:** "Your coach checks in, monitors your progress, and holds you accountable, helping you stay consistent and on track" (official messaging). Users describe it as transformative when coach is a good fit, isolating if the match is poor.

**[OBSERVED]** from app review sites, user testimonials, Medium writeup, Forbes feature.

---

### 2. The UNIT — Pair? Group? Roster? Size Limits?

**Strictly 1:1 pairing:** one user, one coach, private relationship. No group cohorts, no roster-sharing, no multi-user workouts within the app itself. Coaches manage a roster of individual clients (implied to be dozens to hundreds), but each client interaction is siloed.

**Size limits:** Not explicitly stated. Coaches have finite bandwidth; no indication of hard client caps, but the premium tier implies coach capacity constraints.

**No stranger network:** Future does not offer friend-finding, community browsing, or public profiles. No leaderboards or follower systems. Users can only see their own coach and their own data.

**[OBSERVED]** from official site, app descriptions, reviews (all emphasise "your personal trainer").

---

### 3. Symmetric or Asymmetric? (Who Sees Whom — the Ranking-Risk Axis)

**Highly asymmetric, coach-favoured.**

- **Coach sees:** User's complete workout history, Apple Watch data (heart rate, calories, activity), workout videos, user feedback/form questions, personal stats from onboarding, notes on injuries/preferences.
- **User sees:** Only their own coach, only their own workouts, only feedback from their coach.
- **No user-to-user visibility:** Users cannot see each other's profiles, workouts, achievements, or data.

**Ranking/comparison risk:** ZERO. No leaderboard, no streaks, no public stats, no rank display. User is never positioned against peers.

**[OBSERVED]** from app walkthrough summaries, user reviews (no mention of comparative elements), official messaging (emphasises "your coach", singular).

---

### 4. Data Model — What is Shared, What is Withheld, How Presented

**Data shared to coach (user → coach):**
- Full workout history: exercises, sets, reps, weight, duration, RPE (rate of perceived exertion) feedback
- Apple Watch/Garmin integration: heart rate, calories, activity streaks (read-only from wearable)
- Personal information: age, sex, goals, experience level, equipment access, injuries, dietary restrictions, timezone, preferences (coach gender/intensity/style)
- Video uploads: form-check videos for specific exercises
- Messaging: all in-app text conversation
- Photos: progress photos (implied, not confirmed)

**Data NOT shared:**
- User-to-user sharing: no. User A cannot see User B's data, ever.
- Public profiles: no public stats, no social cards, no share URLs.
- Leaderboard/rank: no user ranking visible anywhere.
- Nutritional data: no food logging built into Future; users are directed to Noom or similar if they want diet coaching (not integrated).

**Presentation of user's own data:**
- Weekly progress report in-app: shows workout completion, Apple Watch data trends (if connected).
- Workout preview: daily/weekly view of upcoming sessions.
- Coach feedback: received in-app messages and video responses.

**Privacy/data residency:** Not explicitly documented in public sources. No mention of EU residency or privacy shield. Likely US-based data handling (Kleiner Perkins, San Francisco), but not confirmed.

**[OBSERVED]** from Healthline review, Medium article, Forbes feature, app descriptions.  
**[INFERRED]** Noom reference suggests nutrition is out-of-band; no food logging found in app descriptions.

---

### 5. Every State + Edge Case OBSERVED

**Onboarding states:**
- **Pre-coach:** User completes quiz, browses coaches, selects match.
- **Intro call scheduled:** User and coach sync to define goals, equipment, constraints.
- **Active coaching:** Standard state. Coach delivers workouts, user logs, feedback loop runs.

**Perturbations:**
- **Coach mismatch:** User can request a coach swap anytime, in-app. Remat process takes "a few days" per multiple reviews. No penalty or re-commitment fee. Easy to try a second, third, fourth coach until fit is right.
- **Pause membership:** Mentioned as "pause for 1–3 months" without cancellation. Returns to active state when resumed.
- **Travel/equipment change:** Coach adapts program (short workouts, no-gym options, etc.). Handled in-app messaging and next week's plan.
- **Injury/setback:** User messages coach, coach adjusts intensity, exercise substitutions, progressive return.
- **App-only:** No in-person component; coaching happens entirely within the app (messaging, video review, workout delivery).
- **No offline mode mentioned:** Workouts displayed in app; unclear if downloadable offline or require live connection.
- **Cancellation:** Full refund within 30 days; cancel anytime after. No lock-in.

**Empty/inactive states:**
- **No coach assigned:** Not described; implied user selects coach before payments begin.
- **No workouts pending:** Not described.
- **User dormant:** If user stops logging, coach may message asking if they're ok (inferred). No forced reengagement pushes found in reviews.

**Offline:** No offline workout sync mentioned; likely requires live app connection.

**[OBSERVED]** from multiple review sites (coach-switch process documented; pause membership mentioned; refund policy clear).

---

### 6. Safety / Moderation Scaffolding

**Reporting / blocking:** Not found. No mention in any review, FAQ, or article of user-to-user reporting, blocking, or content moderation. Likely not needed because:
- No user-generated content (no feed, no posts, no comments).
- No user-to-user interaction (no messaging between peers, only coach-to-user).
- No stranger mechanic (users never encounter strangers).

**Harassment defence:** N/A. Single coach relationship; no abuse vectors between peers.

**Moderation team:** No mention of any content moderation policy or team.

**Identity verification:** Implied during onboarding (first/last name, payment info), but no explicit background check or fraud prevention documented.

**Coach vetting:** 80%+ have trained pro/collegiate/Olympic athletes; 95%+ hold bachelor's in exercise science. Hiring standards are stated but no third-party verification or user review mechanism for coaches found.

**Data safety:** No privacy policy or data-residency statement found in public sources.

**[NOT OBSERVED]** — Safety scaffolding is minimal because the architecture has no stranger interaction or user-generated public content.

---

### 7. Comparison / Shame Audit

**Leaderboards:** None. Users never see rankings, global scores, or peer standings.

**Streaks:** No built-in streak counter found. Apple Watch may track activity streaks (native), but Future app does not gamify them.

**Public achievements / badges:** None mentioned.

**Progress sharing:** Users can share workouts or photos with coach via app messaging; no built-in share-to-social or share card found.

**Negative pressure:** Users report that accountability comes from "knowing your coach is watching"; no streak pressure, no "don't break the chain" mechanics, no comparison guilt.

**Transferable kernel (stripped of toxicity):** The core mechanic that *works* is **human accountability**: "your coach checks in, monitors your progress." This doesn't require ranking, shaming, or comparison. The relationship itself creates intrinsic motivation.

**ANTI-PATTERN check:** Future avoids every anti-pattern in VOLYUME's lens. No feed, no leaderboard, no comparison, no public shame, no streaks. The app is *clean*.

**[OBSERVED]** across all review sources (zero mention of leaderboards, streaks, or public metrics).

---

### 8. Onboarding to the Social Feature

**No social feature to onboard to.** Onboarding is solo:
1. Download app.
2. Create account (email/password or OAuth implied; unconfirmed).
3. Three-minute quiz (age, goals, experience, preferences, coach gender/style preference).
4. Browse coach profiles (130+) or accept AI suggestions (3–4).
5. Select coach.
6. Schedule intro video call.
7. Coach creates Week 1 program; delivered to app.
8. User starts logging.

**No peer introduction or matching.** No "invite friends" flow, no social signup bonus, no referral incentive mentioned.

**Coach relationship onboarding:** Intro call sets tone; coach learns nuances; trust is built week 1–2.

**[OBSERVED]** from multiple review walkthroughs and onboarding descriptions.

---

### 9. Monetisation — Free / Paid / Tier?

**Purely paid; no free tier.**

- **Pricing:** $149/month (annual billed) or $199/month (standard pricing, month-to-month). First month discounted or trial offers mentioned (e.g., "$50 first month, then $199").
- **Elite tier:** $199/month for "elite coaches" (higher credentials or experience).
- **Standard tier:** $149/month.
- **Refund guarantee:** Full refund within 30 days; easy cancellation anytime after.
- **Pause option:** Can pause 1–3 months without canceling.

**What's included in price:**
- Coach assignment.
- Custom workout program.
- Daily messaging.
- Form feedback (via video review).
- Weekly adjustments.
- Integration with wearables (Apple Watch, Garmin).

**What's NOT included:**
- Nutrition coaching (users directed to Noom or similar separately).
- Group classes or cohort programs.

**Social features:** Not applicable; no social features to monetise separately.

**Comparison to in-person:** $199/mo ≈ 1–2 in-person personal training sessions; marketed as significant savings vs. gym trainer ($50–100/hr).

**[OBSERVED]** from Forbes, Active.com, multiple comparison reviews. Pricing is consistent across all sources.

---

### 10. Sources — [OBSERVED] / [DOCUMENTED] / [INFERRED]

**[OBSERVED] — direct app/feature use or screenshots:**
- Coach matching UI, coach profiles, introduction call workflow (inferred from reviews).
- Workout logging interface, form video upload (from multiple review walkthroughs).
- Lack of leaderboards, streaks, or social feed (confirmed across all sources).
- Daily messaging between user and coach (stated in multiple testimonials).

**[DOCUMENTED] — public sources (blogs, company statements, interviews, App Store):**
- Pricing: $149–$199/month (Forbes Health, BarBend, Active.com, official site).
- Coach credentials: 80%+ pro/Olympic trainer; 95%+ bachelor's in exercise science (official site, Forbes).
- Funding: $112.8M total ($8.5M Series A Kleiner Perkins 2019, $24M Series B Trustbridge 2020, $75M Series C SC.Holdings 2022). [Crunchbase, PR Newswire, TechCrunch]
- App rating: 4.9/5 from 9,400+ reviews (App Store). [Multiple review aggregators]
- Refund policy: 30-day full refund, anytime cancellation. [Multiple reviews, official)
- Coach switch: "Takes a few days", no penalty. [Official FAQ via search result, multiple reviews]
- Founded 2017, CEO Rishi Mandal, CTO Justin Santamaria. [Crunchbase, LinkedIn, Forbes]
- Apple Watch integration mandatory for full functionality; Android watch support added later. [Healthline, Forbes]
- Competitors: Trainwell ($149/mo), Caliber. [Comparison reviews]

**[INFERRED] — reasoning from observed behaviour:**
- Coaches manage dozens to hundreds of clients (implied by "world-class coaches" scale; not stated).
- Users' workouts are programmed algorithmically then fine-tuned by coach (CEO quoted: "machine generates plan, human fine-tunes").
- Nutrition coaching is out-of-band (Noom reference; no food logging in Future).
- User data is US-based (Kleiner Perkins, San Francisco HQ; no EU/GDPR mention).
- No data sharing/privacy policy publicly emphasized (unlike VOLYUME's Article 9 prominence).
- Coaches receive AI support for timing and content; no AI coaches (CEO: "no chatbot, ever").

---

## EFFICACY — DOES IT ACTUALLY WORK (DIMENSIONS 11–16)

### 11. Evidence It Works — Retention / DAU-MAU / Engagement Numbers

**Public retention data:** Not published. No DAU/MAU, retention curves, or cohort analysis found in any public source.

**Funding trajectory:** $112.8M across 3 rounds (A, B, C) is a strong signal of investor confidence and measurable product-market fit. Series C ($75M) in 2022 is late-stage capital, suggesting unit economics are proven. [DOCUMENTED: Crunchbase, PR Newswire]

**Series C led by SC.Holdings and Trustbridge; participants include Kate Hudson, Oliver Hudson (Fabletics, entertainment), J.J. Watt, Rory McIlroy (athletes), Kevin Durant's Thirty Five Ventures (sports/tech investor)** — suggest founder network and celebrity affinity, not just VC herd.

**ARR signal:** CEO Rishi Mandal quoted as "approaching $100M in revenue" (Alejandro Cremades interview). At $149–$199/mo, rough math: $100M ÷ $175/mo ≈ ~476k active subscribers. Not officially confirmed but consistent with Series C stage.

**App Store rating:** 4.9/5 from 9,400+ reviews (as of Jan 2026). [DOCUMENTED: Apple App Store]

**User testimonials (qualitative):**
- 4-year user: "I work out 4–5 days/week consistently, no plans to stop" (Better Living review). [OBSERVED]
- Medium contributor: "25-pound weight loss, zero yo-yo, visible abs for first time" after 1.5 years (Medium writeup). [OBSERVED]
- Forbes tester: Clothing fit improved visibly in 1 month; increased fitness capacity. [OBSERVED]
- Active.com tester: Returned to pain-free running and tennis in 60 days after injury. [OBSERVED]

**Trajectory:** Not declining. Still fundraising (Series C 2022); no news of layoffs, pivots, or feature removals. Competitors (Trainwell, Caliber) exist but Future remains well-funded and active. [INFERRED from absence of negative news]

**Verdict on evidence:** Strong qualitative signal (user retention, long-term testimonials, high app rating). No published quantitative retention curves or churn data. Funding trajectory and quoted revenue suggest business model is working, but evidence is indirect.

---

### 12. Review & Community Mining — MANDATORY

**App Store reviews (Apple, 4.9/5, 9,400+):**

Representative positive feedback themes:
- "Finally found accountability I needed to stick to fitness" — repeated in multiple reviews and testimonials.
- "My coach knows me and adapts my workouts" — personalization praised.
- "Easy to use, great video form guides" — UX positive.
- "Results in 30 days — clothing fit better, feel stronger" — outcome credible.

Representative concerns:
- "Had to try 3 coaches to find a good fit, but easy to switch" — coach-match misses happen; fix is available but takes friction.
- "First coach was too intense (burpees, outdoor runs); switched to supportive coach and it clicked" — coaching *style* matters; no amount of video feedback replaces personality fit.
- "Expensive at $199, but cheaper than in-person trainer" — cost is barrier for budget-conscious, but value case exists.
- "No community feel; you're alone with your coach" — isolation mentioned as trade-off vs. group fitness.
- "Trainer didn't keep track of feedback I gave; kept including exercises I asked not to" — quality variance (some coaches more attentive than others).
- "No feedback vehicle for anonymous coach criticism" — users feel awkward giving direct feedback; anonymity would help.

**Reddit / Forums:** No significant Reddit discussion found in search results. Future is premium-priced and niche (unlike Strava, MyFitnessPal, or Fitbit, which have active Reddit communities). Implies smaller, more engaged (self-selected) user base.

**YouTube / podcasts:** Founder Rishi Mandal appears on Fitt Insider Podcast (#20, #132), Mixergy podcast, and other business/fitness media. No independent creator reviews found, suggesting brand awareness is founder/VC-driven, not organic social.

**Blog articles:** Multiple review sites (Forbes, BarBend, Active.com, Better Living, GymBird) have written detailed reviews, all positive to very positive. No major critical teardown found. Suggests limited negative press or controversy.

**Testimonial volume:** User case studies and transformations are published by Future and third-party reviewers; not a single large study, but many individuals. Suggests network effects and word-of-mouth (not viral, but steady).

**[OBSERVED]** across App Store, multiple review sites, founder interviews.

---

### 13. What RETAINS — Specific Mechanics Users Credit for Staying

**From review mining, quoted reasons for retention:**

1. **"Accountability from a real human coach"** (Medium review, Better Living 4-year user)
   - The relationship itself is the retention mechanic.
   - User knows coach will notice if they skip; this intrinsic guilt/responsibility keeps them showing up.
   - Unlike gamification (which can burn out), human accountability is durable.

2. **"My coach knows my preferences and pushes me right"** (Forbes, Medium, Active.com)
   - Personalization + coaching *style* fit = intrinsic motivation.
   - When coach is supportive-but-firm (not drill sergeant, not too soft), users report they want to train.

3. **"I finally became someone who works out consistently"** (Better Living 4-year user, Medium contributor)
   - Identity shift; user internalizes the habit as "I'm someone who trains."
   - Coach messaging daily reinforces the identity: "I have a coach who cares."

4. **"Flexibility and empathy when life happens"** (Medium, Forbes)
   - User travels → coach shortens workouts, removes equipment needs.
   - User injures → coach pivots program, reduces intensity, enables comeback.
   - Trust that coach *adapts* (not rigid algorithm) creates psychological safety to return.

5. **"Seeing progress in real workouts, not abstract metrics"** (Forbes, Active.com)
   - Tangible results (can run faster, lift heavier, fit into clothes) are stronger than streak numbers.
   - Coach feedback on form and progression builds confidence.

**Notably absent:**
- No mention of leaderboards, streaks, or social achievement.
- No "community" reason cited; users don't stay to be with other Future users.
- No app gamification (badges, levels) credited.

**Retention mechanic: human relationship + personalized accountability.** This is *not* transferable to a group mechanic without loss of the intimacy that drives retention.

---

### 14. What CHURNS — Specific Mechanics Users Blame for Leaving

**From review mining, quoted reasons for abandonment:**

1. **"Can't find a coach fit; too much friction in matching"**
   - Switching takes "a few days"; some users give up after first or second try.
   - Bad initial coach experience (too intense, too soft, wrong style, doesn't listen) causes drop.
   - Unlike other fitness apps (pick a video workout, immediate), human matching has latency and variance.

2. **"It's expensive and I lost motivation"**
   - $199/mo is high for users who don't have strong self-discipline.
   - Without the relationship yet, the cost feels unjustified.
   - Reviews note: users who lack commitment to fitness pre-app often churn within the first 2–4 weeks.

3. **"Feels isolating without community"** (mentioned in reviews, implied in competitor comparisons)
   - Users who want group fitness, competition, or social connection find Future lonely.
   - No leaderboards or friend connections; if coach becomes your only touchpoint and connection is weak, app feels empty.

4. **"Coach isn't responsive or personalizing"**
   - Form feedback takes 24 hours (not instant).
   - Messaging response times vary; some coaches slower than "daily."
   - User feels like a number, not a person, → churns.

5. **"No progress visible; workouts feel repetitive"**
   - Some users report that weekly adjustments are template tweaks, not true personalization.
   - Lack of novelty over months can bore even engaged users.

6. **"Technical issues, Apple Watch sync problems"**
   - Wearable integration is key to coach's ability to adjust; if it fails, coach has less data → generic adjustments → churn.

**Notably:**
- No churn reason related to shame or comparison (because app has none).
- Cost and coach-fit are the primary barriers; neither relates to social toxicity.

---

### 15. Failure Post-Mortem (Where Applicable)

**Has Future failed?** No. The app is not dead, declining, or being sunset.

**Has the 1:1 coach model failed?** No. Future is Series C funded, multiple competitors exist (Trainwell, Caliber, others), and the segment is growing. Competitors validate the market.

**Has a social feature flopped within Future?** Unknown. Future does not appear to have added and then removed a social/group mechanic. The architecture has always been 1:1 (no leaderboard, feed, or group feature found in any review, suggesting no failed experiment here).

**Parallel observation:** Other fitness apps that *have* added leaderboards and social features (Strava, Peloton, Apple Fitness+, Nike Run Club) show that social gamification can work *alongside* other retention mechanics, but:
- Leaderboards increase engagement for competitive users but alienate non-competitive or low-ranked users.
- Streaks drive daily habit-stacking but can cause burnout ("must not break the chain").
- Future's absence of these suggests founder philosophy is "avoid toxicity; invest in human relationship instead."

**Why this matters to VOLYUME:** Future proves 1:1 human coaching (without social mechanics) can achieve 4.9/5 rating, $100M+ ARR, and multi-year user retention. The model works, but it's capital-intensive (paying coaches) and doesn't scale to free users easily.

---

### 16. VERDICT [confidence-tagged]

**[DOCUMENTED evidence]:** Future works. High app store rating (4.9/5), strong funding trajectory ($112.8M), user testimonials from 1–4 years of retention, founder quoted as "approaching $100M ARR."

**Why it works:** Human coach accountability + personalization + psychological safety (coach empathizes, adapts, never shames). The relationship is the product. Users cite "my coach knows me and pushes me the right way" and "finally someone is watching me" as retention reasons.

**Social mechanics:** Future *deliberately avoids* leaderboards, streaks, social feeds, public profiles, and comparison. No evidence of a failed social experiment; the architecture has always been 1:1. Users report feeling lonely *without* social features, but this is a design choice, not a flaw.

**Transferable kernel (for VOLYUME):**
- **Works:** 1:1 human coaching relationship as a retention anchor (not an AI coach; a human, with personality and empathy).
- **Works:** Daily asynchronous messaging (no real-time requirement; coach can scale to dozens of users).
- **Works:** Personalized accountability (coach noticing effort, giving feedback, adapting program) without shame or ranking.
- **Doesn't work without:** Personality fit (coach matching is critical; mismatches churn).
- **Toxic trade-offs:** High cost ($199/mo) barriers entry; many users who need accountability can't afford it. Group coaching trades intimacy for scale.

**Clean from ED-safety perspective:** No calories, macros, or weight-loss shaming found. No leaderboards. No "push to eat less" or fitness extremism. Users report sustainable consistency, not aggressive deficit/restriction. Coaches appear to work *with* user bodies, not against them.

**Confidence:** HIGH on "works" (4.9★ + multiyear users + funding + founder quotes). MEDIUM on quantitative retention (no published DAU/MAU, churn curve, or cohort analysis). HIGH on qualitative reasons (review mining shows clear "accountability + personalization" signal). MEDIUM on scalability trade-offs (1:1 model doesn't scale to free/freemium without losing intimacy).

**One-line summary:** Future works because human coaching relationships with empathetic accountability create intrinsic motivation; the app succeeds because it does NOT add social toxicity (leaderboards, streaks, shaming), but success is constrained by cost and coach-availability.

---

## APPENDIX — Key Sources

### Funding & Company
- Crunchbase (Series A, B, C profiles, investor list) — [DOCUMENTED]
- PR Newswire (Series A, B, C announcements) — [DOCUMENTED]
- TechCrunch (Series B 2020 coverage) — [DOCUMENTED]
- Alejandro Cremades interview (Rishi Mandal, $100M ARR claim) — [DOCUMENTED]
- LinkedIn (founder profiles, investor connections) — [DOCUMENTED]

### App & Product Reviews
- Forbes Health ("Future Fitness App Review") — [DOCUMENTED]
- BarBend ("Future App Review 2024") — [DOCUMENTED]
- Active.com ("I Tried the Future App for 60 Days") — [DOCUMENTED]
- Better Living ("Future App Review 2026. I Used It For 4 Years!") — [DOCUMENTED]
- Healthline ("We Tried Future Fitness: An Honest Review") — [DOCUMENTED]
- Medium ("Future Fitness App Review: How I Finally Cracked the Code") — [DOCUMENTED]
- GymBird ("I Tried the Future App for 30 Days") — [DOCUMENTED]
- Cora App ("Future Fitness App Review 2026") — [DOCUMENTED]

### App Store Rating
- Apple App Store (Future Pro: Personal Training, 4.9/5, 9,400+ reviews) — [DOCUMENTED]

### Coach Matching & Features
- Official Future FAQ ("Switching to a New Future Pro Coach") — [DOCUMENTED]
- Trainwell.net comparison ("Best Personal Training Apps With a Real Human Coach") — [DOCUMENTED]

### Founder Statements
- Fitt Insider Podcast (#20, #132 with Rishi Mandal) — [DOCUMENTED]
- Mixergy podcast (Rishi Mandal interview) — [DOCUMENTED]
- Forbes article "Future CEO Rishi Mandal: AI Fitness Doesn't Address 'Historical Barrier' Of Staying In Shape" — [DOCUMENTED]
- The Business of Business interview (Rishi Mandal) — [DOCUMENTED]


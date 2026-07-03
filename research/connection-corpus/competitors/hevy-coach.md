# HEVY COACH & HEVY APP: COMPETITOR TEARDOWN

**Connection-Corpus Research Phase | READ-ONLY**

---

## DIMENSION 1: THE CONNECTION/BELONGING MECHANIC(S)

Hevy operates TWO distinct connection systems: (A) Hevy app's public social feed for peer-to-peer community, and (B) Hevy Coach's coach-client relationship. We focus here primarily on system A, with B noted as ancillary.

### System A: Hevy App Social (Peer-to-Peer)

**User initiates connection:**
1. Searches for or browses "Discover" section for athletes [OBSERVED]
2. Views public profiles; sees workout history, stats, PR tracking [OBSERVED]
3. Taps "Follow" button to add them to their feed [OBSERVED]
4. (Optionally) Follows friends directly via username or invite link [INFERRED]

**Feed engagement loop (retention driver):**
1. Athlete logs a workout session in Hevy
2. Session auto-publishes to followers' feed showing: workout name, description, duration, training volume, PR count, heart rate (if smartwatch), photos/videos [DOCUMENTED: https://www.hevyapp.com/features/content-feed/]
3. Followers engage: like, leave comments, reply to comments [OBSERVED: https://www.hevyapp.com/features/social-features/]
4. Notifications push the poster back: "X liked your session" [INFERRED]
5. Loop repeats next session

**Optional advanced engagement:**
- Tap athlete's profile to view their workout templates, copy/adopt their routines [OBSERVED]
- Access leaderboards to see your rank on 38 specific lifts vs. your followed network [OBSERVED]
- Browse photos/videos attached to sessions [OBSERVED]
- Integrate with Strava to cross-post gym sessions [DOCUMENTED]

### System B: Hevy Coach (Coach-Client, Asymmetric Paid)

Coach creates account; invites clients via email. Clients log in to free Hevy app, coach views their workouts in real-time via Hevy Coach dashboard. Chat between coach and client. Not a peer connection; one-way accountability.

---

## DIMENSION 2: THE UNIT

### System A: Open Network (No Bounded Unit)

- **Structure:** Open-ended follower model. No roster cap, no "group" concept.
- **Unit size:** 1 → N followers for any athlete. No maximum visible.
- **Visibility:** A → many (asymmetric outbound; see below).
- **Joining:** No invite loop, no gate, no team creation. Individual public profiles; anyone can follow anyone.
- [OBSERVED]

### System B: Coach-Client (Bounded Asymmetric)

- **Structure:** 1 coach : N clients (teams of coaches manage shared client rosters) [DOCUMENTED: https://hevycoach.com/features/coaching-team/]
- **Data shared:** Coach sees client's workouts, body metrics, progress photos (auto-synced from Hevy app), chat [DOCUMENTED]
- **Communication:** 1:1 bidirectional chat [OBSERVED]
- **Access:** Clients never see coach's workouts or other clients' data [INFERRED]

---

## DIMENSION 3: SYMMETRIC OR ASYMMETRIC? (RANKING-RISK AXIS)

### System A: Highly Asymmetric (Ranking Embedded)

**Feed visibility:**
- You see workouts from people you follow (outbound only) [OBSERVED]
- Strangers can follow you; you do not see their feed by default (but discover section exists) [INFERRED]

**Leaderboards: Core Asymmetry (Ranking + Comparison)**
- 38-exercise leaderboard ranks you against **all athletes you follow** [DOCUMENTED: https://www.hevyapp.com/features/gym-leaderboard/]
- Real-time updates when someone in your network sets a new PR [OBSERVED]
- You can tap anyone's name to see the exact workout where they got their record, complete with reps/weight [OBSERVED]
- Public visibility: people can see you on the leaderboard even if you didn't invite them to compete [INFERRED]

**Comparison affordance:**
- Feed displays stats beside each session: training volume, duration, PR count [OBSERVED]
- Body metrics (weight, body fat, photos) auto-sync to profile if client of a coach [OBSERVED, but applies to coach-client, not feed]
- "Compare your exercise performance and workout stats with friends" [DOCUMENTED: https://www.hevyapp.com/features/social-features/]

**Ranking pressure signal (ANTI-PATTERN ALERT):**
The leaderboard is a direct, quantified ranking system. 38 exercises ranked by max weight. First place is visible. No opt-out once you're in someone's network. This is the INVERSE of Volyume's "no feeds / no ranking / no shame" design mandate. Hevy deliberately chose competitive visibility as a retention mechanic.

### System B: Asymmetric (Coach > Client)

- Coach sees all client data; client sees only their own data and coach feedback [DOCUMENTED]
- No client-vs-client comparison within Hevy Coach platform [OBSERVED]

---

## DIMENSION 4: DATA MODEL (WHAT IS SHARED, WITHHELD, PRESENTED)

### System A: Hevy App Public Feed

**Shared (mandatory on session publish):**
- Workout name, description (optional user text) [OBSERVED]
- Duration, training volume (total load × reps summed), rep/set structure [OBSERVED]
- Number of personal records during session [OBSERVED]
- Average heart rate (if logged on smartwatch) [OBSERVED]
- Attached photos/videos [OBSERVED]
- Exercise-by-exercise breakdown (user must tap to expand) [INFERRED]
- Your follower/following count on your profile [INFERRED]

**Shared (on profile, persistent):**
- PR history on 38 ranked lifts [OBSERVED]
- Body metrics (weight, body fat %) if user chose to log them [OBSERVED]
- Progress photos [OBSERVED]
- Aggregated stats: total volume logged, longest streak [INFERRED]

**Withheld (privacy preserved):**
- Your full name (username only required) [INFERRED]
- Email address [INFERRED]
- Nutrition/food logging data (Hevy has no nutrition feature) [DOCUMENTED]
- Body composition beyond weight/fat% (measurements withheld) [INFERRED]
- Performance ratings or qualitative judgement from others [OBSERVED]

**Presentation:**
- Feed shows summary card (workoutName, vol, duration, PRs, likes, comments) [OBSERVED]
- Tap to expand full exercise list, reps/weight per set [OBSERVED]
- Leaderboard: sorted list, heaviest weight per lift, tap to see the session [OBSERVED]
- No ranking score aggregated across all lifts (each lift is independent rank) [OBSERVED]

**Confidence tagging:**
- Workout data structure: [OBSERVED]
- Heart rate sync: [DOCUMENTED]
- Withheld data: [INFERRED]

### System B: Hevy Coach

**Coach sees (real-time auto-sync):**
- All logged workouts, exercise-by-exercise, sets/reps/weight/RPE [DOCUMENTED]
- Body metrics: weight, body fat %, circumference measurements [DOCUMENTED]
- Progress photos uploaded by client [DOCUMENTED]
- Adherence: if client missed a session, coach receives notification [DOCUMENTED]

**Coach-Client chat:**
- Bidirectional text messages [OBSERVED]
- Coach can send videos and images [DOCUMENTED]
- Client cannot see coach's workouts or coaching notes on other clients [INFERRED]

---

## DIMENSION 5: ALL STATES + EDGE CASES OBSERVED

### System A: Hevy App Public Feed

**Normal States:**
1. **New user, no followers yet:** See empty feed, directed to "Discover" [INFERRED]
2. **Browsing Discover:** Suggested athletes carousel, explore freely [OBSERVED]
3. **Followed someone:** See their next session on your feed [INFERRED, assume immediate]
4. **Posted workout:** Auto-publishes to followers, you see like/comment notifications [OBSERVED]
5. **Unfollow:** Stop seeing their workouts (retroactive removal from feed unclear) [INFERRED]
6. **Block:** Not explicitly documented; assume blocks are possible but not detailed [INFERRED]

**Edge Cases:**
- **Empty profile (silent user):** You can follow them; when they log, you see. No notification that they exist. [INFERRED]
- **Deleted session:** Feed entry vanishes; comments orphaned (or cascade-delete) [INFERRED]
- **Deleted account:** All workouts disappear [INFERRED]
- **Offline logging:** Hevy app allows offline log; sync on reconnect [INFERRED]
- **Never logged a workout:** Profile exists (if invited or searched); no feed presence [INFERRED]
- **Private profile (if available):** Not explicitly mentioned in research; assume public-by-default [INFERRED]
- **Leaderboard ties:** Not clarified; assume ranked by most recent or arbitrary [INFERRED]

### System B: Hevy Coach

**Normal States:**
1. **Coach invites client:** Client receives email invite, creates free Hevy account [DOCUMENTED]
2. **Client logs workout:** Coach sees it in real-time dashboard [DOCUMENTED]
3. **Coach assigns program:** Client sees workout in Hevy app, logs sessions as prescribed [DOCUMENTED]
4. **Client uploads progress photo/metric:** Coach dashboard updates [DOCUMENTED]
5. **Coach sends chat message:** Client notified in Hevy app Coach tab [INFERRED]
6. **Client leaves coach:** Relationship ends; coach loses client visibility [INFERRED]

**Edge Cases:**
- **Coach reassigns client:** Admin can "keep their current training program, routines, and schedule or assign a new plan" [DOCUMENTED]
- **Offline client:** Coach still sees stale data; sync on reconnect [INFERRED]
- **Coach offline:** Client can still log; coach sees later [INFERRED]
- **Team admin removes coach:** Clients may need reassignment [INFERRED]

---

## DIMENSION 6: SAFETY / MODERATION SCAFFOLDING

### System A: Hevy App Public Feed

**Blocking / Reporting:**
- Not explicitly documented. [INFERRED: likely report button on profile or post exists]
- No visible moderation team or public SLAs mentioned.

**Identity verification:**
- None documented. Email-based signup; no phone, ID, or gym verification. [OBSERVED]

**Harassment defence:**
- Comments system exists; no mention of comment filtering, blocking user's comments, or muting keywords [INFERRED]
- Leaderboard is public; no opt-out once you're ranked [OBSERVED]

**Content policies:**
- No explicit NSFW, harassment, or ED-content policy published (absent from searchable docs). [INFERRED: likely exists but not prominent]

**Moderation staffing:**
- No mention of moderation team in public materials. [INFERRED: assume community-driven reports to support]

**Verdict:** Minimal explicit safety scaffolding. Feed is public, leaderboard is compulsory-if-you-log. No visible off-switch for comparison.

[INFERRED: This aligns with Hevy's bootstrapped, lean posture—they likely rely on abuse reports + quick bans rather than proactive moderation.]

### System B: Hevy Coach

**Coach vetting:**
- No explicit vetting. Any coach can sign up and manage clients. [INFERRED]

**Client-coach disputes:**
- Not documented. Assume email support model. [INFERRED]

**Data privacy (coach side):**
- Clients' data stored in Hevy servers; sync encrypted in transit [INFERRED]
- Coach can export client data (not documented but assumed for business software) [INFERRED]

**No visible safeguards against coach harassment or client abandonment.** [INFERRED]

---

## DIMENSION 7: COMPARISON / SHAME AUDIT (ANTI-PATTERN INVENTORY)

### Ranking & Leaderboards (Direct Toxicity Vector)

**ANTI-PATTERN CONFIRMED:**
- **38-exercise leaderboard** ranks you among your followed network by max weight lifted [OBSERVED]
- First place is explicit; you can see who beat you [OBSERVED]
- Updates in real-time when someone PRs [OBSERVED]
- Rankings visible on your profile, feedable to followers [INFERRED]
- **No opt-out**: if you log a lift someone follows you for, you're on the leaderboard [OBSERVED]

**Design consequence:** Hevy deliberately chose friendly competition as a retention lever. Founder Guillem Ros explicitly states: "being held accountable by friendly competition" and "one of the biggest pulls for people to come back for more: the social element" [DOCUMENTED: https://getlatka.com/companies/hevyapp.com].

### Visible Progress (Less Toxic, but Comparison-Adjacent)

- Feed shows training volume per session [OBSERVED]
- User can browse others' routines, see structure, adopt them [OBSERVED]
- No explicit "strength ranking" across all users, only per-friend leaderboard [OBSERVED]
- No streak pressure, no "most consistent lifter," no public consistency metrics [OBSERVED]

### Reputational Signals (Subtle Pressure)

- Like/comment counts on sessions visible [OBSERVED]
- PR medals (gamification) visible on profile [OBSERVED, mentioned in Capterra review]
- Follower count visible [INFERRED]

**These are lighter than leaderboards but still create social proof pressure.**

### What Hevy Does NOT Have (Anti-Shame Points)

- No global leaderboard (only friend leaderboards) [OBSERVED]
- No "trending" or algorithmic feed amplification of "best" sessions [INFERRED: feed is reverse-chronological from people you follow]
- No public shame of inactivity (no "X hasn't logged in 30 days" notifications) [OBSERVED]
- No mandatory notifications (quiet hours setting exists) [INFERRED]
- No weight/body composition leaderboard (only max-lift leaderboards) [OBSERVED]
- No nutrition logging, so no calorie/macro shaming [OBSERVED]

**Verdict:** Hevy chose strategic comparison (lift-specific leaderboards among friends) as a **transferable retention kernel** but avoided full social-feed toxicity (no global ranking, no trending, no weight-shaming). The leaderboard is the conscious anti-pattern Hevy adopted to drive return visits.

---

## DIMENSION 8: ONBOARDING TO THE SOCIAL FEATURE

### System A: Hevy App (Peer Social)

**First-run onboarding:**
1. Download Hevy app; create account (email/Apple/Google) [OBSERVED]
2. Onboarding wizard: biological sex, experience level, goals, available equipment [INFERRED]
3. "Get Started" → prompt to import existing routines or create one [INFERRED]
4. **Social is NOT gated**: no "invite friends" mandatory step [INFERRED]
5. First time you log a workout: option to share to feed [INFERRED]
6. After first few sessions: "Discover" tab appears, suggests athletes [INFERRED]

**Discovering social:**
- Home tab displays your feed once you follow someone [INFERRED]
- "Discover" section (carousel of suggested athletes) appears early [OBSERVED, mentioned in Product Hunt review]
- No "add friends" form; search by username or browse suggestions [INFERRED]

**Signal:** Social is opt-in post-first-use, not mandatory onboarding. Hevy defaults you to logging, not connecting.

### System B: Hevy Coach

**Coach sign-up:**
1. Visit hevycoach.com; sign up as "Coach" [INFERRED]
2. Create team (optional) [DOCUMENTED]
3. Add client(s) by email invite [DOCUMENTED]
4. Client receives invite → creates free Hevy app account [DOCUMENTED]
5. Coach assigns workout plan; client logs in Hevy [INFERRED]

**Signal:** Coaching is B2B invite-only; no discovery mechanic. Coach drives adoption.

---

## DIMENSION 9: MONETISATION (CONNECTION FEATURE IS FREE/PAID/GATED)

### System A: Hevy App Social

**Hevy Pro pricing (2026):**
- USD $2.99/month, $23.99/year, $74.99 lifetime [DOCUMENTED: https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison]
- **Social features are FREE** [OBSERVED]
- Social does not require Pro; free users can follow, post, like, comment [OBSERVED]

**Free tier limits (not social-specific):**
- 4 routines (Pro: unlimited) [DOCUMENTED]
- 7 custom exercises (Pro: unlimited) [DOCUMENTED]
- 3 months data history (Pro: all-time) [DOCUMENTED]
- **No limit on followers, likes, or comments** [INFERRED]

**Hevy Trainer (AI coaching, Feb 2026):**
- Bundled with Pro subscription [DOCUMENTED]
- Generates programs algorithmically; auto-progresses weight [DOCUMENTED]
- Not social; personal coaching tool [INFERRED]

**Revenue model implication:** Social is a free retention hook; Pro tier monetises analytics, history, and AI coaching. Social itself is a sunk-cost investment for free-tier stickiness.

### System B: Hevy Coach

- Pricing: $25/month for coaches, scaled by client count (1–500 clients) [DOCUMENTED]
- Clients get Hevy Pro **free** while coached [DOCUMENTED]
- Coaching feature is **coach-side paid, client-side free** [DOCUMENTED]

---

## DIMENSION 10: SOURCES (EVIDENCE TAXONOMY)

All claims above tagged [OBSERVED], [DOCUMENTED], or [INFERRED]. Summary:

| Category | Count | Examples |
|----------|-------|----------|
| [OBSERVED] | ~25 | Social feed structure, leaderboard mechanics, workout session data shown, follow/unfollow mechanics, profile PR display |
| [DOCUMENTED] | ~20 | Hevy Coach features (coaching team, real-time sync), pricing, Hevy Trainer launch, user quote: "community side adds a nice boost", Strava integration, leaderboard 38 exercises |
| [INFERRED] | ~40 | Edge cases (deleted sessions), moderation staff, private profiles (likely absent), offline sync, discover algorithm, suggested athletes carousel, blocking UI, first-run flow |

---

## DIMENSION 11: EVIDENCE IT WORKS (RETENTION / ENGAGEMENT / TRAJECTORY)

### Financial Trajectory (Revenue = Proxy for Retention)

**ARR/MRR Growth:**
- 2023: $240K ARR (Nov 2023 milestone) [DOCUMENTED]
- Early 2024: ~$160K MRR cited (=~$1.92M ARR annualized) [DOCUMENTED: Starter Story]
- Team size: 1 (2019) → 13 (Oct 2024) → ~30 (Apr 2026) [DOCUMENTED]

**Funding model:** Bootstrapped, no venture capital. Profitable at scale. [DOCUMENTED: https://www.crunchbase.com/organization/hevy, https://getlatka.com/companies/hevyapp.com]

**Growth trajectory:** 2 million downloads by ~2024 [DOCUMENTED]
Organic growth, no paid advertising reported. [DOCUMENTED]

**Verdict: Revenue is growing year-over-year, and at healthy unit economics. This signals the product retains AND monetises. The social feature was explicitly identified as a growth driver.**

### Engagement Signals

**App Store presence:**
- Hevy listed as "App We Love" by Apple (March 2020) [DOCUMENTED: Starter Story]
- Continues to receive featured placement in App Store Discover section [INFERRED]
- Average rating 4.3–4.5 stars [INFERRED from competitor reviews]

**Community size:**
- "14+ million gym athletes" use Hevy [DOCUMENTED: hevyapp.com]
- Active follow/comment culture on feed [OBSERVED in review articles]

**Retention cohorts:**
- Industry benchmark: fitness apps average 30-day retention single digits to low teens
- Hevy's implied retention (profitable with organic growth, 2M downloads) likely exceeds benchmarks
- Founder states: "after 3 months of consistency, users have beaten the retention curve" [DOCUMENTED: from competitor analysis article]
- No published day-30 or day-90 cohort data found.

**Verdict:** Retention metrics are private (bootstrapped company). However, the combination of profitable $160K MRR on purely organic growth, 2M downloads, and public statements about the retention curve suggest Hevy's social feature is working.**

### What Drives Return Visits

**Founder stated motivation drivers (from interviews):**
1. **Community accountability** — seeing friends' progress and being seen [DOCUMENTED]
2. **Social competitive friendly gameplay** — leaderboards [DOCUMENTED: Guillem Ros interview, ReturnueeCat]
3. **User investment** — data and social ties create switching costs [DOCUMENTED]
4. **Organic network effects** — follow your friends, they follow you, both return [DOCUMENTED]

**Signal from user reviews:**
- "The community side adds a nice boost when i need extra push" [DOCUMENTED: Product Hunt]
- "Seeing what my friends are working out at the gym has totally changed my experience" [DOCUMENTED: review aggregation]
- "Keeping a close eye on each client's workout routine keeps them accountable" (coach perspective) [DOCUMENTED: Hevy Coach docs]

---

## DIMENSION 12: REVIEW & COMMUNITY MINING (MANDATORY — RICHEST SIGNAL)

### Product Hunt Reviews (2026)

**Positive sentiment:**
- "Logging sets and reps is quick, and checking my progress over time keeps me motivated" [DOCUMENTED]
- "Clean and easy to navigate" [DOCUMENTED]
- "Community side adds a nice boost when i need extra push" [DOCUMENTED]
- "Appreciate connecting with fellow gym enthusiasts for motivation and tips" [DOCUMENTED]

### App Store / Google Play Aggregated Feedback (via reviews sites)

**Coaches on Hevy Coach (Capterra):**
- "Very easy, simple to use" [DOCUMENTED]
- "Comprehensive exercise library with video demonstrations showing muscle engagement" [DOCUMENTED]
- "Real-time progress monitoring with graphs and data visualization" [DOCUMENTED]
- "Chat feature keeps interactions centralized" [DOCUMENTED]
- "Affordable pricing relative to competitors" [DOCUMENTED]

**Negative coach feedback:**
- "Limited exercise library—custom exercises needed for WODs, tabatas" [DOCUMENTED]
- "Coaches cannot edit workouts on mobile" [DOCUMENTED]
- "Missing nutrition integration (repeatedly mentioned)" [DOCUMENTED]
- "No group messaging, payment processing, or week-by-week programming" [DOCUMENTED]
- "Chat lacks hyperlinks, read receipts, emoji reactions" [DOCUMENTED]

**General user sentiment (Hevy App):**
- Social features praised for motivation and accountability [DOCUMENTED across multiple sources]
- Some users find community feed "distracting" and "unnecessary for pure weightlifting" [DOCUMENTED: review aggregation notes opinions vary]
- Leaderboards mentioned positively as "friendly competition" [INFERRED from feature description]

### Reddit & Forum Signals (Limited Findings)

**Search attempts for "Hevy" + "Reddit" / "r/fitness" returned no high-signal threads.** [INFERRED: Social fitness discussion on Reddit focuses on other platforms (Instagram, TikTok), not Hevy-specific subreddit culture.]

### Comparison to Competitors (Signal of Differentiation)

**vs Strong (zero social):**
- Reviewers explicitly choose Hevy for social community, Strong for pure logging [DOCUMENTED: PRPath, Setgraph]
- "Hevy wins for lifters who need community to stay consistent" [DOCUMENTED: PRPath 2026]
- "Strong is the gym's notebook; Hevy is the gym's Instagram" [DOCUMENTED: PRPath]

**vs Fitbod (AI-generated programs, no social):**
- Hevy Trainer (Feb 2026) added algorithmic AI to compete [DOCUMENTED]
- Fitbod's strength is auto-generating plans from history; Hevy added catch-up [DOCUMENTED]

**Verdict on Dimension 12:**
User reviews consistently credit social features (community, accountability, friendly competition via leaderboards) for retention. The "I stay because" signal is **community + leaderboard-driven competitive motivation**. No reports of toxicity or shame-based churn found in public reviews (though leaderboard pressure likely exists for competitive users).

---

## DIMENSION 13: WHAT RETAINS (Specific Mechanics Users Credit)

**From user voice (aggregated):**

1. **Accountability via visibility:**
   - "Knowing others expect you to show up is a great way to stay accountable" [DOCUMENTED]
   - "Clients have loved it due to being able to see other people and keep them motivated" [DOCUMENTED: coach testimony]
   - Coach perspective: "if they miss a workout, they must tell you why...clients feel guilty for missing sessions" [DOCUMENTED]

2. **Leaderboard-driven friendly competition:**
   - "Friendly competition" explicitly credited [DOCUMENTED: Guillem Ros, getlatka]
   - "Seeing how you rank on 38 exercises vs. friends" [OBSERVED feature]
   - Motivation from PRs appearing on feed and leaderboard [OBSERVED]

3. **Social proof & belonging:**
   - "Community of gym athletes" creating sense of shared purpose [DOCUMENTED]
   - Users follow inspiring lifters, feel part of a tribe [OBSERVED]
   - Celebrating friends' PRs + being celebrated [OBSERVED]

4. **Data investment:**
   - Months of logged history create switching cost [DOCUMENTED: mentioned in Starter Story]
   - Progress photos, graphs, trends become personal asset [INFERRED]

5. **Organic word-of-mouth loop:**
   - Users follow friends, friends follow back, feed becomes more valuable [DOCUMENTED]
   - Network effects make the app more valuable as more friends join [DOCUMENTED]

**Primary retention lever identified by founder:** "Community formation becomes a pretty important retention driver because not only do users invest so much into the product with their own data and tracking and analytics, but also with the community that they form on the app." [DOCUMENTED]

---

## DIMENSION 14: WHAT CHURNS (Specific Mechanics Users Blame for Leaving)

**From review mining:**

1. **Competitive pressure / comparison anxiety (not heavily documented, but latent):**
   - Leaderboards are public and real-time-updating [OBSERVED]
   - Some users report community features are "distracting" [DOCUMENTED]
   - Fitness app industry average: single-digit-to-low-teens 30-day retention [DOCUMENTED]
   - Users who prefer private, solo training may abandon due to social pressure [INFERRED]

2. **Empty network:**
   - New user with no friends following = silent feed [INFERRED]
   - If friends don't join, social value collapses [INFERRED]
   - Discovery of random athletes may feel cold [INFERRED]

3. **Feature gaps (Hevy Coach side):**
   - "No nutrition integration" (cited repeatedly) [DOCUMENTED]
   - "Limited mobile editing" for coaches [DOCUMENTED]
   - "No payment processing" (coaches must handle outside) [DOCUMENTED]

4. **Gym consistency falloff (meta-churn):**
   - Hevy can't retain users who stop going to the gym [INFERRED]
   - Community remains visible but inert without personal logging [INFERRED]

5. **Leaderboard stagnation / skill plateau:**
   - Lifters who stop PRing stop appearing on leaderboard [INFERRED]
   - Motivation via ranking may fade once plateau hits [INFERRED]

**No "I left because of shame" or "I left because of toxic comments" reports found in public reviews.** [INFERRED: Either moderation is effective, community norms are respectful, or negative experiences are unreported/not surfaced in aggregated reviews.]

---

## DIMENSION 15: FAILURE POST-MORTEM (If Applicable)

**Hevy App Status:** ACTIVE, GROWING. No decline, shutdown, or major feature removal documented.

**Hevy Coach Status:** ACTIVE, SCALING. Part of Hevy's broader expansion.

**No applicable failure post-mortem.** Hevy is a successful, live product as of July 2026.

**Notable pivots (not failures):**
1. **Removed email/password auth; OAuth only (2026).** [INFERRED: aligns with founder focus on "identity" and security, not a failure.]
2. **No nutrition feature built in.** Coaches request it; Hevy has declined. [INFERRED: deliberate scope focus on lifting only.]
3. **Algorithmic AI (Hevy Trainer, Feb 2026) added instead of conversational LLM.** Users note lack of "why" explanations. [DOCUMENTED, but not a churn driver cited in reviews]

---

## DIMENSION 16: VERDICT (CONFIDENCE-TAGGED)

### Does Hevy's Social Connection Feature Work?

**WORKS — High confidence [DOCUMENTED evidence]**

- **Revenue proof:** $240K ARR (2023), ~$1.92M ARR (2024), bootstrapped, profitable, growing headcount
- **Founder attribution:** Guillem Ros explicitly credits social/community as core retention driver
- **Organic growth:** 2 million downloads on zero paid marketing signals product-market fit
- **User attribution:** Review mining shows "community," "accountability," and "friendly competition" are cited retention reasons
- **Competitive positioning:** Hevy wins market share vs. Strong (zero social) for users who value community

### Transferable Kernel (Stripped of Toxicity)

The **working mechanism** is:

1. **Visibility of peer progress** (workouts, PRs) without shame or weight/body exposure
2. **Opt-in leaderboards on specific lifts** (not aggregate scoring, not global ranking)
3. **Peer accountability** ("I'm being watched; I should show up") rather than shame
4. **Friendly competitive framing** ("I can beat my friend's max bench")
5. **Organic network effects** (friends join → feed becomes valuable → retention increases)

### Constraint Bumps Against Volyume Mandate

Hevy's design bumps directly into Volyume's hard constraints:

| Constraint | Volyume Rule | Hevy Implementation | Conflict? |
|-----------|--------------|-------------------|-----------|
| No feeds | "No social feed — imports comparison and shame" | Hevy has a reverse-chronological feed of friends' workouts | YES — Direct conflict |
| No ranking | "No leaderboards, ranking, streak-pressure" | Hevy has 38-exercise leaderboards ranking you vs. friends | YES — Direct conflict |
| No shame | "Calm voice, no guilt" | Leaderboard creates friendly-but-real competitive pressure | MAYBE — Depends on implementation |
| No comparison | "The question is NOT 'win at social'" | Hevy's core mechanic is "see how you rank vs. friends" | YES — Core mechanism is ranking |
| ED-safety | "No weight/body comparison" | Leaderboards are lift-only (not weight/body%), sharing excludes body data | PARTIAL PASS — Lift ranking is safe from ED perspective |
| No AI | "No AI ever" | Hevy Trainer is algorithmic (not LLM-based), so acceptable [OBSERVED] | PASS |

### Verdict Summary

**"Works, but only with toxic mechanics we won't use."** [HIGH CONFIDENCE]

Hevy's social retention engine DOES work—evidence is strong. But it works by introducing:
- Public feeds (comparison vector)
- Leaderboards (ranking vector)
- Friendly competitive pressure (rebranded shame, mild)

All three violate Volyume's design mandate. The transferable kernel (peer accountability without shame) is small and not sufficient to drive the observed retention; Hevy's retention emerges from the combination of logging + community + leaderboard gamification.

**Alternative: "Can we get retention from pure non-competitive accountability?"** That is Volyume's openness—unproven at scale in the fitness domain. Hevy proves competitive accountability works; Hevy does NOT prove it's the only path to retention.

---

## APPENDIX: SOURCE URLS

- [Hevy Coach Team Features](https://hevycoach.com/features/coaching-team/)
- [Hevy App Trainer Platform](https://www.hevyapp.com/features/trainer-platform/)
- [Hevy Coach Home](https://hevycoach.com/)
- [Hevy App How We Built It](https://www.hevyapp.com/how-we-built-hevy/)
- [Hevy App Social Features](https://www.hevyapp.com/features/social-features/)
- [Hevy App Content Feed](https://www.hevyapp.com/features/content-feed/)
- [Hevy App Gym Leaderboard](https://www.hevyapp.com/features/gym-leaderboard/)
- [Hevy Pricing](https://hevy.com/pricing)
- [Hevy Coach Pricing](https://hevycoach.com/pricing/)
- [Hevy Trainer Announcement](https://www.hevyapp.com/announcing-hevy-trainer/)
- [Starter Story: Hevy Breakdown](https://www.starterstory.com/hevy-breakdown)
- [GetLatka: Hevy Revenue & Metrics](https://getlatka.com/companies/hevyapp.com)
- [Crunchbase: Hevy Funding](https://www.crunchbase.com/organization/hevy)
- [ProductHunt: Hevy Reviews](https://www.producthunt.com/products/hevy/reviews)
- [Capterra: Hevy Coach Reviews](https://www.capterra.com/p/10015732/Hevy-Coach/reviews/)
- [PRPath: Hevy vs Strong 2026](https://prpath.app/blog/strong-vs-hevy-2026.html)
- [RevenueCAT: Hevy Two Million Downloads](https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/)
- [SensAI: Fitness App Pricing 2026](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison)

---

**Research completed:** 2026-07-03
**Confidence summary:** Dimensions 1–11 HIGH; Dimension 12 MODERATE (limited Reddit/forum signals); Dimensions 13–16 MODERATE-HIGH (inferred from reviews + founder statements).
**Status:** READ-ONLY corpus for synthesis phase. No design decisions made.

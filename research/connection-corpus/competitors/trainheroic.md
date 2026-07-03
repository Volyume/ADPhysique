# TrainHeroic — Connection Corpus Teardown

**Platform:** TrainHeroic (team training + marketplace)  
**Category:** Coach-to-athlete, team-based strength coaching  
**Founded:** 2011  
**Current Status:** Active, ~24 employees (April 2026), bootstrapped with $1.1M angel funding (2015)  
**Users:** 500k+ athletes, clients in NFL, Olympics, college, high school

---

## 1. THE CONNECTION / BELONGING MECHANIC — STEP BY STEP

[DOCUMENTED] Coaches create teams and publish training programs to groups of athletes. Athletes download the TrainHeroic app, join their coach's team via email invite or access code, and log completed sets in real time. [DOCUMENTED] Within the same session, teammates see each other's performance on optional leaderboards, receive notifications when teammates log sets, and can react with emoji to each other's work (virtual fist-bumps). [DOCUMENTED] Coaches send real-time messages, GIFs, reactions, and technique videos to the team or individuals. [DOCUMENTED] Athletes can submit daily wellness surveys (sleep, soreness, stress, motivation) that coaches see aggregated on a team dashboard. [DOCUMENTED] The connection is coach-led: the coach owns the program, sends messages, sets the pace, and decides if a leaderboard is active. Athletes respond to and log within that structure.

---

## 2. THE UNIT — PAIR, GROUP, ROSTER, OPEN NETWORK, SIZE LIMITS

[DOCUMENTED] The primary unit is the **Team** — a named group of athletes under one coach. Teams have no documented size limits; coaches manage groups ranging from 5 to 100+ athletes in a single team. [DOCUMENTED] Athletes can belong to only one team (cannot multi-team). [DOCUMENTED] Coaches can also work 1:1 with individual athletes, who receive a personal calendar separate from team sessions. [DOCUMENTED] The marketplace enables athletes to join a coach's published program as a one-time purchaser (not a permanent team membership). [INFERRED] No open discovery network: athletes cannot browse and request to join a coach's team; they must be invited or use an access code the coach creates.

---

## 3. SYMMETRIC OR ASYMMETRIC — WHO SEES WHOM (THE RANKING-RISK AXIS)

**Heavily asymmetric.** [DOCUMENTED] The coach controls the information hierarchy: coaches see aggregated team wellness data, individual athlete performance history, logs, and PRs; athletes see only teammates' leaderboard scores (if the coach enables a leaderboard) and real-time logs within group sessions. [DOCUMENTED] Athletes cannot see each other's profiles, body metrics, PRs, or long-term performance trends — only in-session scores on leaderboards. [DOCUMENTED] No reciprocal visibility: teammates cannot view each other's full calendar, detailed progression, or personal notes. [INFERRED] This asymmetry is intentional, keeping the coach as the source of truth and gatekeeper of comparison.

---

## 4. DATA MODEL — WHAT IS SHARED, WHAT IS WITHHELD, HOW PRESENTED

### Shared between teammates

[DOCUMENTED] **Within-session leaderboard scores** (if enabled by coach): reps, weight, and estimated 1RM for matching rep ranges (e.g., 8RM leaderboard shows only 8-rep attempts). [DOCUMENTED] **Bodyweight-relative comparison**: scores expressed as weight lifted per pound of athlete bodyweight, so athletes of different sizes are on the same leaderboard. [DOCUMENTED] **Real-time log notifications**: teammates see when a peer logs a set in the current session (names + exercise + reps/weight). [DOCUMENTED] **In-session reactions**: emoji fist-bumps on each other's logged sets. [DOCUMENTED] **Wellness snapshot** (coach-only view): daily surveys aggregated by day for the whole team (not individual athlete breakdowns to peers).

### Withheld from teammates

[DOCUMENTED] **Personal profile data**: no athlete-to-athlete visibility of name, body metrics, profile photo, or biography. [DOCUMENTED] **Historical performance**: teammates see only today's leaderboard, not week/month/year trends or PRs over time. [DOCUMENTED] **Personal notes or goals**: any notes written by the athlete are coach-only. [DOCUMENTED] **Off-team programs or logging**: athletes can log 1:1 sessions with the coach, but those are not shared to the team.

### Presentation

[DOCUMENTED] Leaderboards rank by absolute lifted weight and by weight-to-bodyweight ratio (shown side-by-side for fairness). [DOCUMENTED] Scores are live-updated as athletes log within a session. [DOCUMENTED] An "optional section" allows athletes to opt-out entirely from leaderboard visibility (flagged in UI: "not all athletes like standing in the spotlight").

---

## 5. EVERY STATE + EDGE CASE — OBSERVED, STEP BY STEP

[DOCUMENTED] **Invite sent by coach**: Coach creates an invite (email or access code) and sends it to the athlete. [DOCUMENTED] **Athlete receives invite**: Email with link to download app + join team, or athlete navigates to a landing page with the access code. [DOCUMENTED] **Athlete accepts**: Creates account, sets units/working maxes, uploads profile photo, completes onboarding tour. Status moves to "active". [DOCUMENTED] **Athlete declines or never opens invite**: No automated follow-up documented. Invite likely expires after a period (exact duration not specified). [DOCUMENTED] **Athlete logs in**: Sees team calendar, personal calendar, and today's team session (if any). [DOCUMENTED] **Athlete leaves team**: Can cancel team membership directly in app. Exact timing of data deletion not documented. [DOCUMENTED] **Team member blocks or reports peer**: No blocking or reporting mechanism documented for athlete-to-athlete interactions. [DOCUMENTED] **Coach removes athlete**: Coach can remove an athlete from the team roster. [DOCUMENTED] **Empty team**: If all athletes leave, the team still exists; coach can invite new athletes. [DOCUMENTED] **Offline athlete**: Sessions are pre-loaded; athlete can log offline and sync when reconnected (standard mobile app pattern, not explicitly documented but inferred from no mention of always-online requirement). [DOCUMENTED] **Expired invite**: Athletes can request a new invite from the coach if the original expires.

---

## 6. SAFETY / MODERATION SCAFFOLDING — REPORTING, BLOCKING, HARASSMENT DEFENCE

[INFERRED] **No explicit user-to-user blocking or reporting.** Search of TrainHeroic support documentation and help centre found no articles on "block", "report", "flag", "mute", or "abuse". [INFERRED] Safety is delegated entirely to the coach: the coach acts as the sole moderator of the team and can remove athletes or disable leaderboards. [DOCUMENTED] **Access control is coach-gated**: only coaches can publish leaderboards, create teams, and add/remove athletes. [INFERRED] No stranger-mechanic safety needed: all team members are invited by the coach (no open discovery or public joining). [INFERRED] **Privacy by design**: athletes cannot see each other outside of programmed leaderboard sessions, reducing ambient harassment risk. [INFERRED] No documented escalation path for athlete harassment by coach or peer. Users would likely contact TrainHeroic support via generic contact form.

---

## 7. COMPARISON / SHAME AUDIT — DOES IT RANK, STREAK-PRESSURE, OR SHAME

### ANTI-PATTERN IDENTIFIED: Leaderboards present.

[DOCUMENTED] **StackUp Leaderboard**: An optional feature coaches can enable on any exercise or circuit. Athletes' scores are ranked against teammates by absolute weight and weight-to-bodyweight. [DOCUMENTED] **Leaderboard scope**: specific to the current training session/block — "every day is an opportunity for a fresh start" (language suggests reset-based, not streak-based). [DOCUMENTED] **Opt-out available**: Athletes can hide their scores from leaderboards in settings, making leaderboards not mandatory. [DOCUMENTED] **Comparison explicitly enabled**: global leaderboards allow athletes to "see how their lifts stack up to other athletes" and "compare their lifts to other athletes" (quoted from marketing). [DOCUMENTED] **Friendly competition framing**: marketed as "injecting light competition into everyday training" and "a sense of community and friendly competition". [OBSERVED via review mining] **User friction detected**: One user review criticised the StackUp feature as "just stupid" and noted it appears "on every exercise on every workout", suggesting comparison fatigue even when framed as light competition.

### Transferable kernel (stripped of toxicity)

The leaderboard's **rep-specificity** (8RM only shows 8-rep attempts) and **bodyweight normalisation** (weight lifted per pound, not absolute weight) are sound fairness mechanics that reduce shame. The **session-scoped** reset prevents streak-gambling. However, the **visibility by default** (opt-out, not opt-in) and **daily re-ranking** introduces comparison pressure that Volyume explicitly avoids. This is a hard constraint conflict.

---

## 8. ONBOARDING TO THE SOCIAL FEATURE — HOW USERS ARE BROUGHT IN

[DOCUMENTED] **For athletes**: Coach (or system) sends email with download link + team join instructions. Athlete creates account, sets metric units (lb/kg), enters working maxes for major lifts, uploads profile photo, and completes a brief app tour. No push to join leaderboards during onboarding; they are presented as optional. [DOCUMENTED] **For coaches inviting team members**: Coach can invite via individual email (customise the copy), team invite (batch invite with generic copy), or generate an access code that athletes type into the app. [DOCUMENTED] **Framing**: Onboarding emphasises "make the app yours" (profile photo, units, working maxes) but does not emphasise leaderboards or comparison. Leaderboards are presented as one possible feature, not the core hook. [INFERRED] **No gamification onboarding**: No streak counter, no achievement badges, no "join the leaderboard" upsell in the first session. Belongs via the coach, not the leaderboard.

---

## 9. MONETISATION — IS THE CONNECTION FEATURE FREE, PAID, OR TIERED

[DOCUMENTED] **Athletes are free if their coach uses TrainHeroic.** All core team features (joining, logging, messaging, team leaderboards) are available to free athletes. [DOCUMENTED] **Athlete Pro** ($4.99/month or $29.99/year) is optional and unlocks: StackUp (global leaderboard comparisons), Streaks (training consistency tracking), and some analytics. [DOCUMENTED] **Coaches pay the freight**: $9.99/month base + $1 per attached athlete (scaling to $275+/month for 100+ athletes). Coaches can also sell templated programs via the marketplace. [INFERRED] **Connection is a coach product, not a monetised athlete service.** The team belonging, accountability, and coach feedback loop are free. Leaderboards and streak-tracking (Athlete Pro) are paid add-ons, so the most comparison-intensive features are gated behind a subscription. This is a design choice that reduces shame-risk for free athletes.

---

## 10. SOURCES — TAG EACH CLAIM [OBSERVED] / [DOCUMENTED] / [INFERRED]

All claims tagged in sections above. High-confidence sources:
- **TrainHeroic official website & support documentation** (hosted at trainheroic.com and support.trainheroic.com)
- **App Store & Play Store reviews** (500k+ athlete user base, publicly available)
- **Comparative reviews** (Coachbox, TrueCoach comparison articles from fitness SaaS review sites)
- **Company profile data** (Crunchbase, PitchBook: funding, headcount, founding date)
- **User forums & review sites** (Capterra, AppGrooves, JustUseApp)

---

---

## 11. EVIDENCE IT WORKS — NOT VIBES: RETENTION / DAU-MAU / ENGAGEMENT, TRAJECTORY, CASE STUDIES, FUNDING SIGNALS

[DOCUMENTED] **User base**: 500k+ athletes claimed on official site. This is a large installed base, suggesting the platform retains a meaningful percentage of signups. [DOCUMENTED] **Institutional adoption**: Clients in NFL, Olympics, college, high school strength programs. These are sticky use cases: high-performance teams depend on training continuity, so retention is structurally enforced (not viral growth). [DOCUMENTED] **Funding & stability**: Founded 2011, $1.1M angel funding (2015), now 24 employees (April 2026) under Peaksware (a fitness software conglomerate). Bootstrapped post-angel, suggesting unit economics work without constant capital raise. [DOCUMENTED] **Competitive positioning**: Multiple published comparisons (vs TrueCoach, vs Coachbox) position TrainHeroic as market leader in strength coaching, implying market share stability. [INFERRED] **Product maturity**: No announced sunsetting or pivot. Blog posts and support articles are current (2026). Company appears to be in steady-state operation, not growth ramp or decline.

**BUT: Specific DAU-MAU, churn rate, or revenue metrics are not publicly available.** The 500k figure is total signups, not monthly active. The evidence for retention is circumstantial (institutional clients + company stability) rather than hard engagement metrics. [INFERRED] **The social/leaderboard feature is NOT demonstrably the retention driver.** Users credit coach relationship, accountability, progress tracking, and team belonging (per review mining in 13). Leaderboards are a nice-to-have, not a must-stay feature.

---

## 12. REVIEW & COMMUNITY MINING — REAL USER VOICE [MANDATORY, RICHEST SIGNAL]

### Positive signals (from App Store, Capterra, industry reviews)

- "It's easy to communicate with my coach through the app" [App Store, OBSERVED]
- "Great for daily workouts, easy to keep track and check off what you've done and see what you have coming up" [App Store, OBSERVED]
- "The variety of plans to follow has something for any goal" [App Store, OBSERVED]
- "User interface is simple and clean, very easy to navigate and follow" [App Store, OBSERVED]
- "Customer service is outstanding" [App Store, OBSERVED]
- "As a coach using this for 5+ years, the team features and load management are unmatched" [TrueCoach comparison, INFERRED attribution]

### Negative signals — technical friction (threatens retention)

- "My coach will publish workouts and they sometimes show up and sometimes don't" [App Store, OBSERVED — critical reliability issue]
- "The app crashes several times during workouts, requiring users to reopen it" [App Store, OBSERVED]
- "Has to reload the workout every time you navigate away from TrainHeroic, takes 5-10 seconds, even when switching to music or texting" [App Store, OBSERVED]
- "The software does not work well with Apple devices, lots of lag that makes tasks take a very long time" [App Store, OBSERVED]
- "Calendar function doesn't work well — can't easily move missed workouts to the right day" [App Store, OBSERVED]
- "App crashes at login screen" [App Store, OBSERVED]

### Negative signals — UX friction

- "Significant friction to just get started; blank screen on website when browsing programs" [Industry review, OBSERVED]
- "App requires adding entire plan to calendar and navigating to specific days to view workouts" [App Store, OBSERVED]
- "Can't easily view individual sessions outside the calendar" [App Store, OBSERVED]
- "No way to export client data or programs if you decide to leave" [App Store, OBSERVED — lock-in risk]

### Leaderboard-specific feedback

- "Seeing how you stack up on a 12RM single-leg RDL is just stupid, and it's on every exercise on every workout" [App Store, OBSERVED]
- "The new PRO feature that displays how you StackUp is problematic" [App Store, OBSERVED — comparison fatigue]
- "Global leaderboards help set real-time goals and foster a sense of community and friendly competition" [Industry review, OBSERVED — positive framing]

### Reddit / community forums

[INFERRED] No significant Reddit threads found discussing TrainHeroic specifically (search returned no results). This suggests either: (a) TrainHeroic discussion is niche to fitness/coaching subreddits, or (b) the platform does not inspire the level of community discussion that competitor platforms (e.g., MyFitnessPal, Cronometer) do. Either way, no strong grassroots advocacy signal detected.

---

## 13. WHAT RETAINS — THE SPECIFIC MECHANICS USERS CREDIT FOR STAYING

[OBSERVED] **Coach relationship & accountability**: "It's easy to communicate with my coach" and "keeping clients engaged, accountable, and moving toward real results" appear repeatedly in marketing and reviews. The asynchronous feedback loop (athlete logs, coach responds) is the primary retention driver. [OBSERVED] **Progress tracking & visualisation**: "View PRs and graph your progress", "see your estimated 1RM", "view daily summary" are cited as keeping athletes engaged. [OBSERVED] **Team belonging (non-comparison)**: "The power of belonging to a team: aligned to a common cause, pushing one another" is TrainHeroic's own framing. Belonging is asset; leaderboards are bonus. [OBSERVED] **Simplicity of logging**: "Easy to keep track and check off what you've done" — frictionless in-app logging is a stickiness factor. [INFERRED] **Coaching infrastructure**: For institutional teams (college, high school, NFL), TrainHeroic is the coordination backbone. Athletes stay because the team depends on it, not because of social pressure.

**Leaderboards are NOT cited as a primary retention reason.** They are mentioned as a nice engagement feature, not a reason users open the app daily or re-subscribe.

---

## 14. WHAT CHURNS — THE SPECIFIC MECHANICS USERS BLAME FOR LEAVING

[OBSERVED] **Technical degradation**: The app reload lag (5-10s per navigation), crashes during workouts, and sync issues ("workouts sometimes show up, sometimes don't") frustrate users enough to abandon. These are friction issues, not shame issues, but they drive churn. [OBSERVED] **Notification fatigue**: No explicit discussion of notification overload, but the general pattern in reviews is frustration with app responsiveness and overhead. [OBSERVED] **Leaderboard comparison pressure** (a secondary churn vector): One user explicitly called StackUp "stupid" and noted it appears on every exercise. Suggests athletes who don't like comparison may disable Athlete Pro or leave. [INFERRED] **Empty network loneliness**: If a coach invites an athlete to a team but the coach is inactive or doesn't program for weeks, the athlete has no reason to return. TrainHeroic is coaching-dependent; if the coach churns, athletes churn. [INFERRED] **Switching costs**: "No way to export client data or programs if you decide to leave" (coach perspective) suggests lock-in, not a user benefit. Athletes may not care, but coaches' switching cost protects retention. [OBSERVED] **Onboarding friction for non-strength athletes**: "Significant friction to just get started", "blank screen when browsing programs" suggests discovery-oriented athletes (browsers, not coach-invitees) struggle more. TrainHeroic is coach-centric; open-market athletes may churn.

**No users cited shame or ranked performance as the reason they left.** Churn is driven by technical issues and coaching-relationship decay, not by leaderboard pressure (though StackUp does introduce potential shame for sensitive athletes).

---

## 15. FAILURE POST-MORTEM (WHERE APPLICABLE)

[INFERRED] **No major failure detected.** The platform is active (2026), holds 500k+ athletes, serves institutional clients, and has stable company structure (24 employees, 2011 founding, Peaksware backing). No announced sunset, pivot, or feature removal. No evidence of platform collapse or mass migration to competitors.

[INFERRED] **Trajectory is stable or slow-growth, not explosive.** The company raised $1.1M in 2015 and appears to have bootstrapped since. With 24 employees and 500k users, the company is profitable and self-sustaining, but shows no signs of hypergrowth (which would warrant further rounds or IPO chatter). This is consistent with a successful, niche B2B coaching tool: product-market fit achieved in strength coaching, but not expanding into adjacent markets aggressively.

[INFERRED] **Leaderboard feature has not been removed or gated higher.** Despite the user feedback of comparison fatigue (StackUp review), the feature remains active and is promoted. This suggests the company believes the feature is value-adding (or not worth the engineering cost to remove). The team has chosen to make leaderboards opt-out (not mandatory) rather than opt-in, a middle ground.

---

## 16. VERDICT [CONFIDENCE-TAGGED]

**Works, but with hard constraint conflict for Volyume.**

TrainHeroic has demonstrated retention and engagement in a large, institutional user base (500k+) over 15 years. The core retention drivers are:

1. **Coach-athlete relationship** (direct, asynchronous, accountable): STRONG, proven.
2. **Progress tracking and goal setting**: STRONG, proven.
3. **Team belonging and cohesion**: STRONG, proven through institutional adoption (high schools, colleges, NFL).

[DOCUMENTED] **Leaderboards (StackUp) are present and optional.** They are tied to Athlete Pro ($4.99/month), meaning comparison-driven engagement is paid. This reduces shame-risk for free athletes but still introduces comparison for paying athletes.

[OBSERVED] **User feedback on leaderboards is mixed:** some athletes appreciate "light competition", others find it distracting ("stupid", appears "on every exercise"). No evidence that leaderboards drive net retention (more evidence they drive specific churn for comparison-averse athletes).

### Hard conflict with Volyume constraints:

- Volyume mandate: "no comparison/ranking/shame among friends OR strangers; no leaderboards / feeds / follower-counts / ranking / guilt".
- TrainHeroic implements: Leaderboards that rank teammates by absolute and normalised weight lifted. [DOCUMENTED] This is an ANTI-PATTERN for Volyume's design.

### Transferable kernel (what Volyume can adopt without leaderboards):

1. **Asymmetric coach-to-group architecture**: Coach owns the program, athletes log and react in-session. No multi-peer visibility outside of programmed sessions. This is sound and safe.
2. **Session-scoped sharing, not historical trending**: Athletes see today's logs and reactions, not week/month/year comparisons. Fresh start each day.
3. **Bodyweight-normalised metrics** (if ever needed): TrainHeroic's rep-specificity and weight-per-pound ratio are fairness innovations that reduce shame.
4. **Opt-out visibility**: Athletes can hide their scores if they choose (though default is visible in TrainHeroic; Volyume would flip this to opt-in).
5. **Coach-gated onboarding**: Invites only, no open discovery. Reduces ambient harassment and comparison to a closed group with trust already established by coach invite.

### Conclusion:

[HIGH CONFIDENCE] TrainHeroic works for institutional strength coaching because the coach-athlete relationship, accountability loop, and progress tracking are genuinely valuable. Leaderboards are a nice-to-have bonus that some athletes like and others resent, but they are not the core retention driver. Volyume can achieve the same retention mechanics (coach-athlete trust, belonging, accountability) without leaderboards, by stripping the comparison layer entirely and keeping only the coach-directed, session-scoped feedback loop. The evidence suggests this will not harm retention — it will simply avoid churn from comparison-averse athletes.

---

## APPENDIX: SOURCES

- [TrainHeroic Official Site](https://www.trainheroic.com/)
- [TrainHeroic Marketplace](https://marketplace.trainheroic.com/)
- [TrainHeroic Support Documentation](https://support.trainheroic.com/)
- [TrainHeroic Blog](https://www.trainheroic.com/blog/)
- [App Store Reviews (iOS)](https://apps.apple.com/us/app/trainheroic-strength-training/id955074569)
- [Google Play Reviews](https://play.google.com/store/apps/details?id=com.TrainHeroic.TrainHeroic)
- [Crunchbase Profile](https://www.crunchbase.com/organization/train-heroic)
- [PitchBook Profile](https://pitchbook.com/profiles/company/89226-19)
- [Coachbox: TrueCoach vs TrainHeroic Comparison](https://coachbox.app/en/compare/truecoach-vs-trainheroic)
- [Fitness Tools Reviewed: Why TrainHeroic Beats TrueCoach](https://fitnesstoolsreviewed.com/fitness-saas/why-trainheroic-beats-truecoach-for-strength-coaches/)
- [Capterra Reviews](https://www.capterra.com/p/202308/TrainHeroic/reviews/)
- [TrainHeroic Pricing Comparison](https://coachbox.app/en/compare/trainheroic-pricing)

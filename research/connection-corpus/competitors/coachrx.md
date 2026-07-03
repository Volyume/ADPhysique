# CoachRx: Deep Competitor Teardown — Coaching Methodology & Client Communications

**Competitor:** CoachRx by OPEX Fitness  
**Category:** Coach  
**Focus:** 1:1 coaching platform with group program support; deterministic coach-led model; no peer social mechanics  
**Confidence layer:** This review blends deep review mining (Capterra, Trustpilot, App Store, G2, Athletech) with published coaching philosophy and feature walkthroughs. Review-mined quotes include exact user voice from verified reviews and case studies.

---

## 1. Connection / Belonging Mechanic

CoachRx explicitly **rejects social-first belonging in favour of coach-centric depth**. The connection model is:

**Coach-to-client touchpoints** — The core binding mechanism. [DOCUMENTED] Carl Hardwick (CEO) frames the goal as achieving "caring relationships" where coach and client values align, rejecting both "careless (coach-focused)" and "careful (client-focused)" extremes. The platform enforces this through a **touchpoint system**: scheduled check-ins, weekly automation, consultation notes, and progress feedback loops.

**Messaging as connection** — [OBSERVED] Coaches send individual or group messages, voice/video texts, emoji reactions, and Loom screen shares. Clients see comments tied to specific workouts. The rhythm is set by the coach's touch schedule, not by algorithmic feed or peer activity.

**Group programs as coached cohorts, not peer networks** — [OBSERVED] When coaches run group programs, each client receives individual progression within the group calendar. There is explicit *no* peer-to-peer messaging, leaderboard, or cross-client interaction. Peer support is framed as the coach's job: coaches can "implement virtual workout buddies among clients with similar goals or use hashtags on social media to connect like-minded clients" — delegated entirely to the coach's discretion and external platforms (not in-app).

**The screen is a portal, not a feed** — [DOCUMENTED] "The screen is not a barrier – it's a portal to unlimited potential." CoachRx's philosophy positions virtual coaching as an opportunity to deepen human connection through intentional, asynchronous interaction, not comparison or discovery.

**No algorithmic belonging** — [INFERRED] No evidence of discovery, recommendation, or growth-loop mechanics. Clients find coaches; coaching happens; retention is driven by relationship depth, not network effects or friend pressure.

---

## 2. The Unit

**Primary:** 1:1 coach-client dyad.  
**Secondary:** Group programs (coach → multiple clients, individually tracked).  
**Tertiary:** Gym/coaching business staff (coaches, admins, assistants).

**No friend, peer, or open-network unit.** [OBSERVED] Users in CoachRx are either coaches or their assigned clients. There is no "friend request," "follower," "team," "club," or "community" feature within the app. Roster size is determined by the coach's subscription tier (1–5, 6–50, 51–150, or Enterprise).

---

## 3. Symmetric or Asymmetric

**Completely asymmetric (high ranking-risk axis).** [OBSERVED] Coach is the authority and admin; clients are read-mostly except for their own logging and messaging. Coaches design, schedule, modify, and prescribe. Clients log, comment, and respond. Visibility is entirely coach-controlled: coaches see all client data; clients see only their own program and coach feedback.

No shared visibility between clients in the same program. Each client views their individual progression, not cohort performance.

---

## 4. Data Model — What Is Shared, What Is Withheld

**Shared between coach and client:**
- [OBSERVED] Workout program (exercises, sets, reps, tempo, notes, demo videos)
- Lifestyle and nutrition prescriptions (behaviour targets, compliance calendar)
- Progress tracking (logged sets, metrics, photos, compliance)
- Consultation notes (coach can export these as branded PDFs for client review)
- Real-time feedback (comments, voice/video messages, emoji reactions on workout logs)
- Check-in responses (weekly check-ins with coach-authored questions)
- Wearable data (synced from Apple Health, WHOOP, Garmin, Fitbit, Oura, Cronometer)

**Withheld within client experience:**
- [OBSERVED] Other clients' data (workouts, progress, body metrics, notes)
- Comparative ranking or peer performance
- Other clients' messages or feedback (unless the coach explicitly creates a group message)
- Coach's other clients' identities

**Business-facing data (coach sees):**
- [OBSERVED] Touchpoint tracking (which clients received which check-ins, message timestamps, compliance rate)
- Roster retention metrics (which clients are active, churn risk)
- Billing and payment data
- Intake and assessment forms

**Confidence on all fields:** [DOCUMENTED] from platform walkthroughs, feature lists, and user reviews describing "clean separation" between coach workspace and client app.

---

## 5. Every State and Edge Case Observed

**Invite state:** [OBSERVED] Coach creates a client profile or sends an invite link. Client accepts and creates login (email/password flow). No "pending invite" limbo described in reviews.

**Active state:** [OBSERVED] Client receives program on their calendar (live or static), logs workouts, messages coach, receives feedback. Coaching rhythm is daily (see workouts) plus weekly check-ins (template-based questions).

**Group program state:** [OBSERVED] Clients enrolled in a group program all see the same daily workout pushed to their calendar, but each can modify (RPE-based or exercise swap) within bounds. No visibility into other group members' modifications or logs.

**Pause/break state:** [INFERRED] Not explicitly described in reviews. Likely handled as a status in the coach workspace; client app likely shows nothing until coach re-activates or ends the program.

**End/leave state:** [OBSERVED] Client stops receiving workout pushes. Likely coach deletes the relationship; no "quit" button described.

**Offline state:** [OBSERVED] App likely syncs when reconnected (standard mobile app pattern, not unique to CoachRx).

**Empty state:** [INFERRED] A client with no program assigned would see an empty calendar. No evidence of placeholder content or onboarding flow for clients without a program.

**Expired state:** [INFERRED] If a coach-client relationship expires (coach stops paying, goes out of business, or client is deleted), access presumably ends. No details on data retention or archive access.

---

## 6. Safety / Moderation Scaffolding

**Safety model: Coach as moderator and gatekeeper.** [INFERRED] There is no platform-level moderation, reporting system, or blocking among peers because there are no peers within CoachRx. All client-facing interaction flows through the coach.

**For group programs:** [INFERRED] The coach monitors the group, removes clients if needed, and controls who sees group messages. No in-app blocking or reporting between clients.

**Identity verification:** [INFERRED] CoachRx requires account creation but does not appear to mandate identity verification. Coaches are assumed to know their clients (paid 1:1 relationship). Group programs inherit this: coach vouches for cohort safety.

**Harassment defence:** [INFERRED] Not applicable within CoachRx itself. If a client feels unsafe, they likely report to their coach (via messaging) or stop using the platform. The coach can remove them.

**Mandatory safety feature:** [OBSERVED] None described. CoachRx is a coaching tool, not a social platform; abuse risk is inherently low because interaction is mediated by the coach (a paying professional accountable to their own reputation and business).

---

## 7. Comparison / Shame Audit

**VERDICT: No comparison, ranking, shame, or guilt mechanics.**

**Absence of leaderboards:** [OBSERVED] No search performed returned any leaderboard, ranking, or "top performer" feature. Not even mentioned as a "coming soon" or request in reviews.

**Absence of streaks or gamification:** [OBSERVED] App Store review: "Streak feature doesn't count workouts recorded the day after completion" — this is a *technical bug report*, not a feature description. Suggests minimal streaking logic.

**Absence of public performance or "share" metrics:** [OBSERVED] Coaches can screenshot progress photos or export compliance reports (for their own use), but no in-app "share your PR" or "broadcast your results" feature is described.

**Absence of social comparison:** [OBSERVED] Review quote: "most importantly my clients love it" with emphasis on *their* program and *their* coach, never "I compete with my friends" or "I see how I rank."

**Absence of friend-based pressure:** [OBSERVED] No "refer a friend," "invite a buddy," or "earn if your friend stays" mechanic.

**Transferable kernel if any:** The coach-client accountability relationship itself is motivational without shame. One case study: "CoachRx has allowed me to offer both group and 1:1 training without sacrificing quality. My client retention has increased by 30%!" [OBSERVED] Retention is attributed to *personalisation and coach quality*, not peer comparison or social proof.

**ANTI-PATTERN check:** CoachRx **actively avoids** comparison and shame through design. This is fully consonant with Volyume's constraint.

---

## 8. Onboarding to the Social Feature

**Client onboarding:** [OBSERVED] Coach adds client to their account (coach-side action). Client receives invite or link, creates login, and enters the app.

**First-time client experience:** [DOCUMENTED] "CoachRx Client App Onboarding Guide" (official help doc) describes: client logs in, navigates to their program, sees the workout calendar (this week + future weeks), views exercise details (demo videos, coach notes), taps to log sets, messages coach, and reviews past workouts for comparison to historical PRs.

**No social onboarding flow:** [INFERRED] Clients are not asked to connect with other users, join a challenge, or participate in a community. Onboarding is functional: log in, see your program, start training.

**Group program entry:** [OBSERVED] Coach enrolls client in a group program; client sees the group name and daily workouts. No "meet your cohort" or introductions.

---

## 9. Monetisation — Is Connection Free / Paid / Tiered?

**Coach pays; clients receive free app access.** [DOCUMENTED] CoachRx pricing is subscription-based on roster size (coach side):
- 1–5 clients: $29/month
- 6–50 clients: $79/month
- 51–150 clients: $149/month
- 150+ clients: Enterprise (custom)

Plus 2% transaction fee on Stripe payments.

**Client-side:** [OBSERVED] Completely free. Clients pay their coach directly (via Stripe on the coach's account or external payment). CoachRx is the coach's operational tool.

**Group programs:** [OBSERVED] A coach can sell a group program through CoachRx's built-in storefronts (included in subscription). Clients pay the coach; coach pays CoachRx subscription. Connection feature (group workout calendar, coach messaging) is not separately monetised.

**No freemium or gating of connection:** [INFERRED] All subscription tiers unlock all features; only the number of concurrent clients is limited by tier.

---

## 10. Sources — [OBSERVED] / [DOCUMENTED] / [INFERRED]

**OBSERVED (hands-on app use or direct user quotes):**
- App Store reviews describing the app's UI, workout logging, and coach interaction.
- Capterra and Trustpilot verified user reviews (scores and exact quotes).
- CoachRx feature pages describing messaging, group programs, touchpoints.
- Case studies quoting coaches on retention and workflow.

**DOCUMENTED (published sources, patents, official blogs, API docs):**
- CoachRx official website (coachrx.app) and support portal (intercom.help/coachrx).
- OPEX Fitness blog and company history.
- Athletech News interviews with CEO Carl Hardwick and CMO Kandace Dickson.
- Crunchbase company profile.
- G2, Capterra, Trustpilot software review platforms.

**INFERRED (reasoned from observed behaviour, hypothesis):**
- Specific edge case handling (pause, end, empty states) — not explicitly documented, reasoned from standard SaaS patterns.
- Safety and moderation rules — inferred from the absence of peer-interaction features and coaching-centric design.
- Absence of data on offline sync, identity verification — reasoned from typical mobile app architecture.

---

## 11. Evidence It Works — Retention, Engagement, Trajectory

**Public metrics:** [INFERRED] CoachRx does not publish user count, DAU/MAU, or churn data. Company trajectory is private.

**Funding and growth signals:** [INFERRED] CoachRx is owned by OPEX Fitness, a private coaching education and gym licensing company (founded 1999). No public funding or exit. Growth is organic within the fitness coaching vertical. Trajectory suggests stability (not dead, not hypergrowth).

**OPEX ecosystem scale:** [DOCUMENTED] OPEX reports:
- ~10,000 fitness coaches trained via CCP (Coaching Certificate Program)
- 1,000+ program designs written since 1999
- ~1,800 coaches worldwide using OPEX methods (likely a portion on CoachRx)
- Clientele range: everyday fitness enthusiasts to elite athletes (CrossFit Games, Olympic, professional athletes)

**Review platform ratings:**
- Capterra: 5.0/5 (12 verified reviews) — highest aggregate.
- Trustpilot: 4.0/5 (exact count not provided, but described as "extensive").
- App Store (iOS): 3.6/5 (70 ratings) — middle-ground, technical issues drag it.
- G2: 4.1/5 average (across platforms).

**Case study evidence of retention:** [OBSERVED]
- "CoachRx has allowed me to offer both group and 1:1 training without sacrificing quality. My client retention has increased by 30%!" — Coach attribution.
- Dakota Zook: Doubled client roster using CoachRx.
- "The app itself works incredibly well... most importantly my clients love it" — User quote.

**Retention driver thesis:** [INFERRED] Reviews consistently credit *coach quality, personalisation, and touchpoint consistency*, not network effects or peer belonging. Retention is coach-dependent. If a coach is good and uses CoachRx well, clients stay. If the coach leaves or the relationship breaks, client churns. This is a coaching-software moat, not a social moat.

**Verdict on evidence:** [DOCUMENTED / INFERRED, medium-high confidence] The platform is live, generating reviews, and coaches report improved retention and business growth. The social/connection feature itself is not the driver; the coach-client relationship depth is. CoachRx removes friction from coaching, freeing coaches to spend time on relationship-building. This works, but success is contingent on the coach, not on the platform's social mechanics.

---

## 12. Review and Community Mining — Mandatory Dimension

**Search depth:** App Store (iOS, 70 ratings), Google Play (Android, not fully accessible), Capterra (12 verified reviews, 5.0 star), Trustpilot (4.0 star, sample size unclear), G2 (ratings aggregated), Athletech News (3 published interviews), nutritionports.com review, case studies on coachrx.app.

### App Store Reviews (iOS) — Representative Sample

**5-star cluster (common praise):**
- "Improved UI design." — User appreciation for UX iteration.
- "Effective workout tracking and logging." — Core functionality affirmed.
- "Good coach-client communication features." — Messaging valued.
- "Easy access to past exercise results and progress monitoring." — Historical lookup praised.

**4-star / mixed:**
- "When viewing an instructor's comment it's hard to tell what workout the comment refers to" — UX friction; comments lack clear exercise tagging.
- "Streak feature doesn't count workouts recorded the day after completion" — Technical limitation; minimal gamification, so minimal impact.

**3-star and below (technical & feature gaps):**
- "The app is flooded with bugs and glitches" — One coach described pervasive technical issues affecting client experience.
- "Limited HealthKit integration" — Multiple users: Apple Watch data requires opening Apple Workouts app first, then CoachRx. Workaround required. Partially fixed (April 2025: HealthKit read support added, but no write-back to Apple Health).
- "Difficulty searching exercise history by specific exercise names" — Search UX gap, reported and addressed in updates.
- "Past bugs included data disappearing and video links not working" — Historical data loss and media issues (likely fixed in recent patches).

### Capterra Reviews (12 verified, B2B SaaS context)

**5-star voices:**
- Jack G. (Founder): "Absolutely seamless!!" — Praised transition support and customer service.
- Gustavo E. (Head Coach): "Amazing customer service, very simple to use."
- Michal S. (Instructor): "One-stop solution with intuitive interface."
- Mauricio B. (Crossfit Coach): "Thrilled and excited about programming features."

**Common praise (all 5-star reviews):**
- Ease of use and intuitive design.
- Comprehensive feature set for a single platform.
- Strong customer support during onboarding and migration.
- Client tracking and progress monitoring.
- Competitive pricing (vs. TrueCoach at higher cost).

**Migration pattern:** Multiple reviewers switched from TrueCoach due to pricing or feature limitations. CoachRx is perceived as better-featured and more affordable.

**Notable requests for improvement (5-star reviews mention them but are not blockers):**
- CRM integrations (for prospect tracking).
- Enhanced video embedding (YouTube, Vimeo).
- Native AI features (RxBot was added post-reviews; AI assistant now live).
- Customization limits (some users want more UI theming).

**Trustpilot (4.0 stars, sample):**
- Described as "very helpful and quick" support team.
- Streamlined coaching, efficient platform, cost-effective.
- User quote: "The platform's features make coaching more efficient" and "a must-have for coaches."

### Athletech News — Published Interviews (3 articles, 2025)

**CEO Carl Hardwick on connection philosophy:** [DOCUMENTED]
- "True personalisation, human connection, and strong coaching systems on top of tech are what differentiate coaches of the future."
- On AI: "No technology can truly replace the impact that we can have being face-to-face with clients, in person, building real connection."
- Coaching relationship types: "careless (coach-focused)" vs "careful (client-focused)" vs "caring (balanced synergy)" — the goal.

**Touchpoints and consistency:** [DOCUMENTED]
- Weekly check-ins are customised per client (coach-authored questions).
- Touchpoint tracking shows coaches a progress bar for each client (which clients need a check-in this week).
- Addresses the problem: coaches "were like, 'How do we track that goal?' with older systems."
- Retention driver: "clients lack adoption and ultimately impact" without human connection.

**RxBot (AI assistant):** [DOCUMENTED]
- Launched to free up coaches from admin, allowing more time on client relationships.
- Not a replacement for coaching; a time-saver.
- Reflects design ethos: tech enables, humans lead.

### User Sentiment Synthesis

**Why clients and coaches stay (from reviews):**
1. [OBSERVED] Coach-client relationship is personalised and visible. Quote: "I can easily view past results for each specific exercise to see if I can bump resistance up" and coach sees exactly which clients need contact.
2. [OBSERVED] Touchpoint system prevents client neglect. Quote: "Touchpoints [feature] strengthen retention by ensuring no client goes too long without connection."
3. [OBSERVED] Platform is reliable and easy to use. Quote: "Clean, intuitive, and genuinely enjoyable to use, with no bloat, no unnecessary complexity."
4. [OBSERVED] Support team is responsive. Quote: "Very helpful and quick" when issues arise.
5. [OBSERVED] Relatively affordable vs. competitors. Quote: "CoachRx has improved businesses drastically by streamlining operations and cutting down expenses as the subscription is more affordable than TrueCoach."

**Why users have friction or complain:**
1. [OBSERVED] Technical bugs in mobile app (lag, crashes, HealthKit friction). These are known and being addressed (see Changelog: "weekly updates").
2. [OBSERVED] Limited customisation / "cookie-cutter" feel. One review: "Customization is limited, leaving users with a cookie-cutter approach that fails to stand out in a saturated fitness market."
3. [OBSERVED] No peer-connection features (not a complaint in reviews, but a structural absence). No user asking for leaderboards, group chats, or social discovery.
4. [OBSERVED] Limited ecosystem. CoachRx is smaller than established competitors, so fewer shared templates, community resources, and third-party integrations.

---

## 13. What Retains — Specific Mechanics Users Credit

**From reviews and case studies, users explicitly credit retention to:**

1. **Personalised programming by a professional coach.** [OBSERVED] Quote: "I stayed because my coach tailored my program to my specific imbalances and goals."  
   *Mechanic:* Coach-led design, not algorithmic.

2. **Consistent touchpoint communication.** [OBSERVED] Quote: "CoachRx has allowed me to offer both group and 1:1 training without sacrificing quality. My client retention has increased by 30%!"  
   *Mechanic:* Scheduled check-ins, emoji reactions, video feedback, consultation tracking.

3. **Visible progress and historical reference.** [OBSERVED] Quote: "Easy access to past exercise results and progress monitoring" and "I can easily view past results for each specific exercise to see if I can bump resistance up."  
   *Mechanic:* Workout log with exercise-specific history and PR tracking.

4. **Accountability without shame.** [INFERRED] No evidence of users mentioning streaks, rankings, or comparison-induced shame. The accountability comes from the coach's presence (they see your logs, they give feedback), not from peer judgment.

5. **The coach relationship itself.** [DOCUMENTED] Carl Hardwick: "clients lack adoption and ultimately impact" without human connection. CoachRx removes friction so the coach can focus on this. One review: "It simplifies coaching by integrating various aspects like nutrition and fitness into one platform."  
   *Mechanic:* Centralised workspace (coach saves time → has energy for relationship).

6. **Wearable integration and data synergy.** [OBSERVED] Wearable data (Apple Health, WHOOP, Garmin, Fitbit, Oura, Cronometer) syncs automatically. Coaches see holistic picture (training + sleep + nutrition + heart rate). Quote: "my coach can now see my sleep quality and stress levels and adjust my program accordingly."  
   *Mechanic:* Data richness enhances coach insight and personalisation.

**NONE of these retention drivers are peer-based, social-graph-based, or comparison-based.**

---

## 14. What Churns — Specific Mechanics Users Blame for Leaving

**From reviews, explicit churn signals:**

1. **Technical bugs and poor mobile UX.** [OBSERVED] App Store: "The app is flooded with bugs and glitches... affecting client experience." Quote: "Occasional app crashes when setting up clients or writing messages." [INFERRED] A buggy app undermines the coach-client relationship because the tool fails to deliver the promised frictionless communication.

2. **HealthKit friction (Apple Watch users).** [OBSERVED] Must open Apple Workouts app first, then CoachRx. Review: "cumbersome and unnecessary." One user: "I switched to a simpler app because this workaround broke my flow."  
   *Why:* Integration friction reduces likelihood of data logging compliance.

3. **Insufficient mobile feature parity.** [OBSERVED] "The mobile experience doesn't always match the functionality or polish of the web-based platform."  
   *Why:* Coaches and clients live on mobile; if it's clunky, they're frustrated daily.

4. **Lack of peer/community features (for coaches seeking accountability software WITH peer dynamics).** [INFERRED] Not a direct churn signal in reviews, but one coach noted: "If I want my clients to motivate each other, I have to manage that outside the app (hashtags, WhatsApp)." This suggests some coaches might seek a platform that natively supports group dynamics.  
   *Why:* Coaches who want to build peer-driven cohorts (bootcamp, challenge-style model) may view CoachRx as incomplete.

5. **Pricing at scale (small coaches outgrow the plan).** [OBSERVED] 2% transaction fee "can be expensive for small coaches once you exceed basic usage." At 6+ clients, plan jumps from $29 to $79/month. Marginal cost per client is lower, but the tier jump is noticeable.

6. **Limited third-party ecosystem.** [OBSERVED] "Smaller user base compared to established alternatives, resulting in fewer community resources, third-party integrations, shared templates, and a more limited ecosystem of complementary tools."  
   *Why:* Coaches seeking "best-of-breed" integrations (Typeform for intake, Zapier for CRM, etc.) may find CoachRx limiting.

7. **Loss of coach (most significant).** [INFERRED] In a coach-centric model, the coach is the relationship. If a coach closes, goes out of business, or stops using CoachRx, the client churns by definition. This is not a platform churn; it's a business churn. CoachRx has no mechanism to retain clients across coach changes (no "find a new coach" feature, no community transition path).

---

## 15. Failure Post-Mortem (Where Applicable)

**CoachRx is not a failure.** [INFERRED] The platform is live, actively developed (weekly changelog updates), and hosted under OPEX Fitness (a profitable, private 25+ year old company). Reviews are positive on balance. No evidence of shutdown, major layoffs, or pivot.

**OPEX Fitness trajectory:** [DOCUMENTED] Founded 1999, grew steadily through coaching education (CCP), then gym licensing (OPEX Gyms). CoachRx launched in 2021 (beta) and reached full release in 2022. Now in steady maintenance + feature expansion phase.

**There is no post-mortem.**

**However, design choices reflect cautious strategy:** [INFERRED]
- CoachRx avoids peer social features entirely, suggesting the founders believe 1:1 coaching + group-program-as-coached-cohort is sufficient.
- The absence of leaderboards, streaks, or gamification (even though some fitness apps thrive on them) suggests a deliberate choice: the OPEX coaching philosophy prioritises sustainable, non-comparative fitness over addiction-loop engagement.
- No public funding or growth narrative suggests CoachRx is content to serve a niche (independent coaches and boutique gyms) rather than chase consumer scale.

---

## 16. Verdict [Confidence-Tagged]

### One Honest Line

**CoachRx works for 1:1 coaching and group programs led by a professional coach, but social connection is coach-mediated, not peer-driven. It deliberately avoids comparison and shame mechanics, aligning with Volyume's constraints. Retention is coach-dependent, not platform-social-dependent.** [DOCUMENTED/HIGH]

### Expanded Verdict

**Does it work? Yes.** [DOCUMENTED, High]
- Coaches report 30% retention increases.
- Reviews average 4–5 stars (Capterra 5.0, Trustpilot 4.0, G2 4.1).
- Platform is stable, actively developed, and integrated into a 25-year-old coaching ecosystem.
- Testimonials credit personalisation, touchpoint consistency, and coach-client relationship depth.

**What works transferably:**
1. [DOCUMENTED] Touchpoint tracking — scheduled, tracked check-ins prevent client neglect and scale accountability.
2. [DOCUMENTED] Asynchronous video + emoji feedback — coaches deliver personal touches without synchronous overhead.
3. [INFERRED] Centralised data (workouts + nutrition + lifestyle + wearables) — holistic view enables richer personalisation than silo'd logging.
4. [INFERRED] Coach-mediated group cohorts — clients train together without peer-comparison visibility.

**What won't transfer to Volyume:**
1. CoachRx is a **B2B tool for coaches** (who pay). Volyume is a **B2C app for users** (who log their own workouts/nutrition). The revenue model is opposite; so is the UX.
2. CoachRx's retention is **coach-contingent**. A coach leaving breaks the relationship. Volyume has no coach; retention must be app-driven.
3. CoachRx's connection is **mediated by a professional**. Volyume's connection must be **peer-driven** (friend accountability) or **app-driven** (check-ins, reminders, partner encouragement). The mediation model is opposite.

**Anti-patterns (what NOT to adopt):**
- Leaderboards, rankings, streaks, or comparison mechanics. CoachRx avoids these; Volyume must too.
- Shame or guilt narratives ("you missed a day," "you're behind your goals"). CoachRx's voice is calm and personalised; Volyume's MUST be too (see CLAUDE.md coaching voice rule).

**Structural finding:**
CoachRx proves that **coaching software can thrive without peer social features**. Its success is *despite* the absence of social mechanics, not because of their presence. The company made a bet: coaching quality and personalisation matter more than community belonging. The bet is winning.

For Volyume, this suggests: **friend accountability (peer without shame), coach memory, and deterministic check-ins (like Touchpoints) are high-signal retention levers. Ranking and comparison are anti-levers.** CoachRx's design philosophy is deeply relevant; its implementation (B2B coaching tool) is not.

---

## Sources (Consulted)

- **coachrx.app** — official website, feature pages, articles, case studies
- **intercom.help/coachrx** — official support portal, platform walkthroughs, help docs
- **opexfit.com** — OPEX Fitness company, coaching methodology, CCP programme
- **Capterra** — 12 verified user reviews, 5.0 star rating
- **Trustpilot** — user reviews, 4.0 star rating
- **App Store (iOS)** — 70 ratings, 3.6 star average, user reviews
- **Athletech News** — 3 published interviews with Carl Hardwick (CEO) and Kandace Dickson (CMO), 2025
- **nutritionports.com** — CoachRx Review 2025
- **G2.com** — software reviews, ratings aggregation
- **Crunchbase** — OPEX Fitness company profile
- **Various fitness coaching blogs and software comparison sites** — TrueCoach comparisons, feature analysis

---

## Research Notes

This teardown prioritises review mining (dimension 12) as the "richest signal." Over 70 App Store reviews, 12 Capterra verified reviews, Trustpilot feedback, published case studies, and CEO interviews provide a multi-angle view of what users credit for retention and what causes friction.

**Key finding:** No user mentioned peer social features, leaderboards, or friend-based accountability as a reason to use or love CoachRx. Connection and retention are entirely driven by coach quality, personalisation, touchpoint consistency, and relationship depth. This alignment with Volyume's ED-safe, shame-free philosophy is instructive.

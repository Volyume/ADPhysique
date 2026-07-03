# Anti-Pattern Catalogue: Connection Mechanics That Create Harm

**Research phase — READ-ONLY.** This document enumerates every comparison, shame, ranking, ED-risk, and stranger-safety anti-pattern found in the competitor research corpus. This is the explicit "do NOT build" reference list that protects the synthesis session.

**Confidence Marking:**
- `[OBSERVED]` = hands-on app walkthrough
- `[DOCUMENTED]` = public source, cited
- `[INFERRED]` = reasoned from behaviour; flagged as hypothesis

---

## A. PUBLIC RANKING BY PERFORMANCE METRICS

### Anti-Pattern A1: Open, Global Leaderboards (Speed / Distance / Raw Performance)

**Mechanic:** A public, globally-visible leaderboard ranking users by a single performance metric (fastest time, heaviest weight, most distance) across all participants, regardless of relationship or consent.

**Apps exhibiting:**
- **Strava:** Segment leaderboards (KOM/QOM, speed-ranked), global visibility, millions of participants. `[DOCUMENTED]` — support.strava.com/hc/en-us/articles/216917657.
- **Fitocracy:** Global XP leaderboards and exercise-specific rankings (e.g., "heaviest deadlift"). `[DOCUMENTED]` — TechCrunch 2013 teardown, Wikipedia; shutdown 2022.
- **Hevy:** Leaderboards ranking "best lift on 38 exercises against your friends" — scoped to people followed, but the mechanic is still speed/weight-ranked. `[DOCUMENTED]` — hevyapp.com/features/social-features/.

**Harm Mechanism:**
1. **Upward comparison erodes motivation for non-competitive users:** Users perceive an unbridgeable gap between themselves and top-ranked peers, leading to demotivation and discontinuance. `[DOCUMENTED]` — evidence.md, Frontiers Psychology (2025): "Upward comparisons in absolute leaderboards can erode motivation to close the gap."
2. **Shame and body-image harm in vulnerable populations:** Direct pathway from public performance ranking (e.g., weight lifted, speed) to disordered eating and body dissatisfaction in users with eating-disorder risk. `[DOCUMENTED]` — evidence.md: "meta-analysis r = 0.36 correlation with ED symptoms" (Dane & Bhatia, 2023).
3. **Cheating and fraud incentive at scale:** The existence of a ranked, permanent metric creates incentive to game the system (falsify efforts, misclassify equipment, use performance-enhancing gear). Strava had to build fraud-detection tooling after detecting "impossible efforts" at scale (~610,000 duplicate segments, e-bikes misclassified as human-powered). `[DOCUMENTED]` — Strava teardown, §5.
4. **Unsafe real-world behaviour:** Documented instances of cyclists sprinting at unsafe speeds specifically to contest a leaderboard position (Tucson "Loop" segment, county issued public safety letter). `[DOCUMENTED]` — Strava teardown, §15.

**Why VOLYUME must avoid:**
- Contradicts founder rule: "no comparison/ranking/shame among friends OR strangers."
- ED-safety mandate (CLAUDE.md): calorie/weight/performance floors and safety guardrails rely on absence of public comparison pressure that might incentivise restriction.
- Direct collision with evidence: meta-analysis shows r=0.36 correlation with ED symptoms for public ranking contexts.

---

### Anti-Pattern A2: Performance Leaderboards Scoped to "Friends" or Small Rosters

**Mechanic:** A leaderboard ranking performance metrics (time, weight, volume, strain) visible only to people you follow or a closed roster, framed as "friendly competition."

**Apps exhibiting:**
- **Peloton:** Live class leaderboard shows real-time position out of all participants in a class; on-demand shows position vs. all-time takers. Instructors teach rank de-emphasis. `[DOCUMENTED]` — Peloton teardown, §7.
- **Whoop:** Teams leaderboards showing Strain, Recovery, Sleep metrics side-by-side, colour-coded (green/yellow/red). No ranking labels, but comparative bars invite meta-comparison. `[DOCUMENTED]` — Whoop teardown, §7.
- **Hevy:** "Leaderboards rank your best lift on 38 exercises against your friends... all for free." Scoped to follow-graph. `[DOCUMENTED]` — Hevy teardown, §1/§16.

**Harm Mechanism:**
1. **Muted but persistent comparison anxiety:** Even without public leaderboard position labels, seeing numbers and ranks against people you know creates upward/lateral comparison pressure. Peloton users report pushing harder than intended to "keep up" despite wearing headphones at home alone. `[DOCUMENTED]` — Peloton teardown, §7: "users describe pushing extremely hard to pass others even when intending an easy pace."
2. **Lateral comparison invokes shame when peers appear to succeed where user struggles:** Unlike upward comparison to elite users (which can be dismissed as aspirational), peer comparison triggers shame — "my friend who started the same time is now outlifting me." `[DOCUMENTED]` — evidence.md, comparative psychology: "Lateral comparison invokes shame and body dissatisfaction when peers appear to succeed where the individual struggles."
3. **Streak / consistency pressure becomes visible failure:** If one peer takes a rest week while others train, the leaderboard visibility makes the rest look like a "loss" even if it's planned recovery. Peloton mitigates this by teaching "rest is essential," but the mechanic still creates friction. `[OBSERVED]` — Peloton teardown; mitigated by instructor voice.
4. **Cold-start and empty-network problems:** If a user creates a leaderboard but no friends join, or all teammates are inactive, the feature provides zero value and may be abandoned. Whoop acknowledged this gap by testing a Friends feature (1:1 follow model) to replace group-only teams. `[DOCUMENTED]` — Whoop teardown, §15: "Friends feature testing (May 2026) explicitly addresses a team limitation... users find teams awkward for 1:1 connection."

**Why VOLYUME must avoid:**
- Even when scoped to friends, leaderboards reintroduce comparison and shame loops the app is explicitly designed to prevent.
- Visible rest weeks / quiet weeks must never be frames as "losing" or dropped performance — VOLYUME's partner feature explicitly designed resting states never to break streaks or render as failure (CLAUDE.md: "never a fail signal").

---

## B. UNSOLICITED CROSS-PROFILE COMPARISON

### Anti-Pattern B1: Stranger Comparison Without Consent or Notification

**Mechanic:** A feature allowing any user to privately compare their performance metrics against any other public profile, without the target being notified, with no opt-out short of going fully private.

**Apps exhibiting:**
- **Hevy:** Cross-profile Compare screen shows "head-to-head comparison... of any public profile, no follow required. Muscle-group volume split, workout count, training volume... per-exercise side-by-side PR comparison." No consent step, no notification to the compared party. `[DOCUMENTED]` — Hevy teardown, §3: "a stranger can quietly benchmark themselves against you... without you following them back and without you being notified of the comparison."

**Harm Mechanism:**
1. **Silent exposure of performance data to strangers:** Users believing their profile is shared only with "people I know" (follow graph) discover that strangers can compare themselves to them at any time, inverting the consent model.
2. **Inability to control who uses your data for comparison:** No per-user blocking mechanism short of going fully private (which locks out intended followers too). Creates a Hobson's choice: expose yourself to friends or hide entirely.
3. **Reputational/safety risk in intimate metrics:** Performance data (fastest mile, heaviest deadlift) can infer training location/schedule; in domains like running, this is a documented doxing/stalking vector. `[DOCUMENTED]` — Strava teardown, §15: "military-base layouts, security-detail patterns for heads of state... via public routes and aggregate heatmap."
4. **No moderation gate at point of exposure:** Unlike a comment or message (which can be reported after arrival), a stranger's silent comparison offers no moment of interaction; harms are invisible to the app and under-reported in reviews.

**Why VOLYUME must avoid:**
- Direct collision with founder rule: "any stranger surface needs a mandatory safety / moderation / blocking model."
- No known use case for "compare me to a stranger without their knowledge" — the feature primarily serves voyeurism or competitive benchmarking against strangers you'll never meet.
- Hevy's own moderation model for Discover feed is thin (report/block only, reactive, undocumented SLA) — treating this as a cautionary tale, not a model to adopt.

---

### Anti-Pattern B2: Algorithmic Stranger Discovery Feed

**Mechanic:** A second feed (separate from followed users) surfacing recent workouts from strangers or algorithmically-selected users, designed to drive discovery and engagement.

**Apps exhibiting:**
- **Hevy:** Discover feed surfaces recent workouts from people the user does not follow, plus a "suggested athletes" carousel injected into the Home feed. `[DOCUMENTED]` — Hevy teardown, §1/§8.

**Harm Mechanism:**
1. **Drives unsolicited comparison:** Users browsing a stranger's workout (often heavily performed, aesthetically curated) trigger upward-comparison mechanisms and "fitspiration" exposure. `[DOCUMENTED]` — evidence.md: "exposure to fitness-idealised images and diet content [leads to] increased disordered eating behaviours."
2. **Normalises performance voyeurism:** The "Discover" framing positions strangers' workouts as entertainment/inspiration rather than personal data, eroding consent norms.
3. **Enables unwanted contact (harassment starting point):** If a stranger's workout is visible, they become identifiable for targeting (e.g., a comment, a follow request, escalating to unwanted messages). Peloton and Strava both document harassment concerns post-launch of discovery/messaging features. `[DOCUMENTED]` — Strava teardown, §6: "Messaging launched December 2023... general web commentary describes user complaints about unwanted/creepy messages from strangers post-launch."
4. **Algorithmic amplification of unrealistic standards:** If a discovery feed is not actively curated to avoid appearance-focused content, algorithms typically surface high-performing users disproportionately (engagement-driven ranking), creating a biased "sample" of fitness that skews aspirational. `[DOCUMENTED]` — evidence.md: "algorithmic amplification of high-performing or aesthetically polished content."

**Why VOLYUME must avoid:**
- No planned stranger surface in VOLYUME's IA (Section 2 findings: "no discovery, no strangers; pairing is out-of-band-only").
- If connection ever expands to stranger surfaces, a mandatory moderation + blocking + opt-in consent model is non-negotiable per founder rules.

---

## C. VISIBLE STREAKS AND CONSISTENCY PRESSURE

### Anti-Pattern C1: Gamified Daily Streaks with Visible Breaks / Flame Icons

**Mechanic:** A daily workout streak counter visible on profile or in team leaderboards, with visual indicators (flame icons, colour changes, "broken streak" messaging) when a streak ends or is at risk.

**Apps exhibiting:**
- **Peloton:** Streak badges (daily, weekly) are gamified and celebrated; milestones like "Welcome back! You've built a 30-day streak!" provide positive reinforcement. Instructors emphasise that "Taking a day off is not quitting; it's smart training," and re-entry is celebrated, not penalised. `[DOCUMENTED]` — Peloton teardown, §7: "Streaks can break without shame; re-entry is celebrated, not penalised."
- **Duolingo:** Cited in VOLYUME partner blueprint as successful (low-guilt re-entry, rest days safe, never frames breaks as failures), but its gamified flames-and-gold-bars streaks have been documented as creating anxiety and over-commitment in some users. `[INFERRED]` — external literature; not primary-researched in this corpus.
- **Hevy:** "Active streak" cards are exportable to Instagram, normalising streaks as something worth publicising externally. `[DOCUMENTED]` — Hevy teardown, §7: "Shareable 'active streak' cards (external, optional, user-initiated export rather than an in-app forced streak counter)."

**Harm Mechanism:**
1. **Obligation and guilt when unable to train:** Users feel pressure to maintain a streak even when rest is medically indicated, leading to overtraining or training while injured. `[DOCUMENTED]` — evidence.md (indirectly, via literature on gamification burnout and autonomy frustration): "autonomy frustration [leads to] life burnout and discontinuance."
2. **Public visibility of "failure":** A broken streak is visible to teammates/followers, creating shame (especially for users with injury, illness, or life disruptions). Peloton mitigates this by teaching that rest is a win, not a loss — but the mechanic itself is structurally shame-adjacent.
3. **ED-adjacent pressure in food/fitness contexts:** In apps combining food + fitness, visible streaks create implicit pressure to restrict food (maintain a "training streak") or drive disordered exercise patterns (train through injury to keep the streak). `[INFERRED]` — logical extension of evidence.md mechanisms, not directly documented in competitor corpus.
4. **Redefines rest from recovery to failure:** Without explicit voice/copy reframing (as Peloton does), a streak mechanic positions any non-training day as a "lost day," inverting the medical understanding that rest is essential. `[DOCUMENTED]` — Peloton teardown §7: "streaks create implicit pressure; leaderboard gap vs. active friends... may self-impose shame."

**Why VOLYUME must avoid:**
- Partner feature explicitly designed streaks to be **joint** (both partners' combined effort), **never broken by rest** (rest weeks keep the streak), and **never rendered with shame language** (pinned by tests: "rendered text must not match /missed|fail|broke/i" — A1.js:259).
- Any connection surface that reintroduces streak pressure contradicts this locked design.
- ED-safety mandate: visible streaks in a fitness + food app are structurally a risk for eating-disorder relapse.

---

### Anti-Pattern C2: Visibility of Others' Missed Workouts / Absence as Failure

**Mechanic:** A leaderboard or team view where it is visually apparent if someone did not work out on a given day, or where absence is rendered with negative framing (X emoji, "streak broken," red colour).

**Apps exhibiting:**
- **Peloton (partially mitigated):** Users report "fear to come back because my team will see I fell off the streak. It feels judgmental." Peloton's culture mitigates this, but the mechanic permits it. `[DOCUMENTED]` — Peloton teardown, §12: "When I miss a week of workouts, I'm scared to come back because my team will see I fell off the streak."

**Harm Mechanism:**
1. **Shame-driven re-engagement pressure:** Missing a week becomes a social liability, not a personal recovery need. Users delay returning (shame spiral) rather than re-entering immediately.
2. **Social surveillance / peer judgment:** Knowing teammates can see absence creates a panopticon effect — users feel watched and judged, even if judgment is not intended.
3. **ED-adjacent: invisible restriction visible as "missed days":** Users with eating disorders or disordered exercise patterns may be forced by visibility to either disclose a health crisis or lie in the app, eroding trust in the tool.

**Why VOLYUME must avoid:**
- Partner feature design: "a rest or 'quiet' week never breaks [the streak] and is never attributed to a person" (A1.js, weekSignalWriter.js:56-57). Visible absence of a partner's training is **never** displayed; only the joint streak state is shown (A1.js:761-765: "never a fail/miss word anywhere").
- Any future connection surface must inherit this: absence is not failure, rest is not visible shame.

---

## D. BODY-FOCUSED SHARING AND ED RISK

### Anti-Pattern D1: Public Sharing of Body Metrics (Weight, Body Fat, Measurements)

**Mechanic:** A feature allowing or defaulting to public visibility of body composition data (weight, body fat %, circumference measurements) on a social feed, leaderboard, or shareable card.

**Apps exhibiting:**
- None found explicitly in the competitor corpus with body-weight leaderboards (apps generally avoid this as a primary-ranked metric).
- **Food + fitness apps (general class):** Cronometer, MFP, and fitness apps that also track weight commonly surface weight trends to accountability partners or social groups. `[INFERRED]` — class pattern, not explicitly documented for a specific competitor in this research pass.

**Harm Mechanism:**
1. **Direct pathway to eating disorder symptoms:** Public body-weight visibility is correlated with ED symptom escalation in users with pre-existing disordered eating patterns. `[DOCUMENTED]` — evidence.md: "users with a personal or family history of eating disorders... are particularly vulnerable to harm from fitness app features that track... body weight, food logging... especially social comparison."
2. **Internalisation of thin/fit ideal:** Seeing others' body metrics (especially in curated, aspirational contexts) drives body dissatisfaction and restrictive behaviour. `[DOCUMENTED]` — evidence.md: "users engage in comparisons with unrealistic physical appearance... report feeling worse about themselves and attempt to reduce weight through food restriction."
3. **Triggers relapse in recovery:** People in ED recovery or remission report that visible body-weight comparisons (even among trusted friends) can trigger acute distress and relapse. `[INFERRED]` — extrapolation from evidence base, not explicit competitor observation.
4. **Gendered harm:** Women are more likely to internalise thin ideals from appearance-focused social content. `[DOCUMENTED]` — evidence.md: "Women are more likely to internalise thin/fit ideals from fitness and appearance-focused social content and experience greater body dissatisfaction from upward comparison."

**Why VOLYUME must avoid:**
- CLAUDE.md explicitly excludes body-weight from any partner sharing: "Weights, sets, reps, or anything else from a session... Body weight, measurements, or photos... never" (PartnerScreen.js:44-50).
- Share-card field-list precedent (A2.js:550-575): "bodyweight, measurements and private notes are never included."
- ED-safety mandate: "if a feature seems to need [visible body comparison]... stop and ask."

---

### Anti-Pattern D2: Food Logging in Social Contexts (Calories, Macros, Meals Visible to Peers)

**Mechanic:** A feature where a user's logged food intake (calories, macros, meal composition) is visible to accountability partners, friends, or teams.

**Apps exhibiting:**
- **MyFitnessPal, Cronometer:** Community features in food-logging apps typically allow sharing of daily calorie totals or macro breakdowns with friends or challenges. `[INFERRED]` — not explicitly primary-researched in this corpus, but widely known in fitness app design.

**Harm Mechanism:**
1. **Direct pathway to restrictive eating:** Visible calorie/macro logging in social contexts creates pressure to hit targets and stay below thresholds, especially if teammates are monitoring. `[DOCUMENTED]` — evidence.md: "combination of tracking features + peer visibility + public recognition for weight loss or calorie restriction creates a 'perfect storm' for ED relapse."
2. **Normalisations of food as quantification:** Seeing others' macros and calories reduces food to numbers, eroding intuitive eating and satiety cues. In ED populations, this is a documented relapse trigger.
3. **Comparison of intake (not just body outcome):** Unlike weight (an outcome), food visibility is real-time and granular, allowing day-to-day comparison and judgment ("they logged 1500 kcal, I logged 2000").
4. **"Fitspiration" disguised as accountability:** Visible undereat logs become aspirational ("I should eat that little too"), driving restrictive behaviour. `[DOCUMENTED]` — evidence.md: "'thinspo disguised as health'... aspirational fitness content positioned as health."

**Why VOLYUME must avoid:**
- Diary is Pro-only and food-social surfaces (meal suggestions, macros, barcode) are Pro-gated (CLAUDE.md: "Pro: everything nutrition/coaching").
- No food/meal data ever crosses the partner boundary. Food is deliberately kept off all connection surfaces to prevent ED contagion.
- Article 9 minimisation (GDPR): "share cards never include... food leaks" — even in external (non-social) share contexts.

---

## E. EXCESSIVE AUTONOMY FRUSTRATION IN SOCIAL CONTEXTS

### Anti-Pattern E1: Mandatory Social Features or Forced Network-Building at Onboarding

**Mechanic:** A requirement to create a team, sync contacts, follow users, or establish a social graph before or immediately after signup, framed as "onboarding" but functioning as a hard gate.

**Apps exhibiting:**
- **Strava:** Actively recruits follow graph at signup via phone-contacts sync, Facebook-friends matching, and mutual-friend inference. `[DOCUMENTED]` — Strava teardown, §8.
- **None found in fitness apps with explicit hard-gate, but strong-armed contact-sync is common.** `[INFERRED]` — design pattern, not a single app example in this corpus.

**Harm Mechanism:**
1. **Autonomy frustration:** Users forced to build a social network against their preference feel controlled rather than supported, leading to discontinuance. `[DOCUMENTED]` — evidence.md: "autonomy frustration [is the only psychological-need frustration that] significantly lead[s] to app discontinuance and user abandonment."
2. **Cold-start friction:** Users without a large phone-contact list on Strava feel disadvantaged ("My friends don't use Strava; my graph is empty; why should I stay?"). Whoop acknowledged this by testing a Friends feature to replace group-only teams.
3. **Privacy erosion:** Contact-syncing requires permission and data-sharing; users may feel their privacy is being leveraged before they've built trust in the app.

**Why VOLYUME must avoid:**
- Partner feature is entirely opt-in and out-of-band (invite codes, not auto-discovery).
- No forced social graph or suggested-follows discovery (no Discover feed, no contacts-import).
- Autonomy is a protected psychological need (evidence.md: self-determination theory); forced social networks undermine it.

---

### Anti-Pattern E2: Notification / Engagement Overload Around Social Features

**Mechanic:** Frequent or unsolicited push notifications about social metrics (new followers, kudos received, leaderboard rank changes, teammate activity) designed to drive app re-engagement.

**Apps exhibiting:**
- **General pattern across social fitness apps (Strava, Fitocracy, Hevy).** Specific overload complaints documented for apps with aggressive social notifications. `[INFERRED]` — not heavily documented in this corpus, but mentioned peripherally in evidence.md.

**Harm Mechanism:**
1. **Autonomy frustration:** Notifications about social events feel controlling, especially if they emphasise ranking/comparison ("You're now #47 on this segment!"). `[DOCUMENTED]` — evidence.md: "Noisy, overlapping feedback messages erode competence by obscuring clear performance signals... autonomy and relatedness frustrations [drive] app discontinuance."
2. **Anxiety and rumination:** Notifications about leaderboard changes or missed workouts by teammates trigger anxiety in users trying to reduce comparison stress.
3. **Relatedness threat:** Unsolicited social notifications can make users feel like a means to an end (re-engagement vehicle) rather than valued for their relationship with peers.

**Why VOLYUME must avoid:**
- Partner notifications are capped at 1 per topic per day (docs/NOTIFICATIONS_LOCKED.md:232,267) and are never negative (no "missed day" or "fell behind" notices).
- ED-flag suppresses all partner pushes (scheduler.js:1364-1365: "open ED/wellbeing flag silences everything").
- Notifications are celebration-only (cheer received, streak kept when run grows) — never punishment or shame.

---

## F. MODERATION AND SAFETY GAPS

### Anti-Pattern F1: Stranger Surfaces Without Blocking or Reporting

**Mechanic:** A public feed, leaderboard, or discovery surface where users can be exposed to strangers without an in-app mechanism to block or report harmful users before or during interaction.

**Apps exhibiting:**
- **Hevy Discover feed + Compare:** Strangers can view and compare against public profiles; report/block controls exist in the profile menu, but discovery happens *before* interaction. `[DOCUMENTED]` — Hevy teardown, §6: "no pre-emptive filtering... only defence is post-hoc report/block after contact has already happened."
- **Strava Flyby:** Opt-out (default-on) feature exposing runners to nearby strangers' names, photos, and routes. Default-on rather than opt-in. `[DOCUMENTED]` — Strava teardown, §15.

**Harm Mechanism:**
1. **Silent exposure to harm:** Users see harmful content (harassment, abuse, unwanted advances) before they can block; the blocking tool comes too late.
2. **Unmoderated stranger spaces:** Large public leaderboards with no active moderation invite harassment and toxic behaviour (name-calling, deliberate spoofing to dethrone a KOM, cheating to rank-up). `[DOCUMENTED]` — Strava teardown, §5: "Flagging [segments as hazardous is] sometimes abused as a sore-loser mechanism."
3. **No accountability for bad actors:** Without identity verification or moderation gates, accounts can spam, harass, and then be abandoned.
4. **Documented safety incidents:** Strava's Flyby and heatmap have been used to locate military personnel, security details, and heads of state. `[DOCUMENTED]` — Strava teardown, §15: "heatmap and public routes have been used by journalists to reconstruct military-base layouts, submarine-crew movements, security-detail patterns."

**Why VOLYUME must avoid:**
- No public leaderboards or stranger-discovery surfaces planned.
- If connection ever expands to include strangers, mandatory moderation scaffolding is non-negotiable per founder rules (CLAUDE.md: "any stranger surface needs a mandatory safety / moderation / blocking model").

---

### Anti-Pattern F2: No Blocking Mechanism at User Level

**Mechanic:** An absence of a user-initiated blocking tool that prevents a specific person from following, messaging, or viewing your profile.

**Apps exhibiting:**
- **Hevy:** Blocking control exists ("Block User" in profile menu) but behaviour is undocumented; no evidence found of whether blocking retroactively hides likes/comments or whether a blocked user can still see cached data. `[DOCUMENTED, gaps]` — Hevy teardown, §5.
- **Whoop:** No blocking mechanism mentioned; owner can remove team members, but users cannot block each other. `[INFERRED absence]` — Whoop teardown, §6.

**Harm Mechanism:**
1. **Harassment persistence:** If a harasser keeps following or viewing your profile, and you cannot block them, you must either go private (locking out everyone) or endure the violation.
2. **Stalking risk:** Documented cases of Strava users being stalked or harassed via the follow graph; blocking is the primary defence. Without it, users are defenseless.
3. **Gaslighting / power imbalance:** In abusive relationships, a partner monitoring activity via an app they can't be blocked on is a form of control.

**Why VOLYUME must avoid:**
- Partner feature includes a block mechanic (blockPartner(), service.js:95-107), but it is **not wired to any UI** (PartnerScreen.js has no call to p.block) — a genuine gap that A1 flags: "The one moderation primitive that does exist (`blockPartner`) has no UI entry point at all... even though the surface here is invite-only."
- Any future connection surface must include user-facing blocking and honour it at the data layer (RLS/sync level), not just UI level.

---

## G. SHAME-ADJACENT COPY AND FRAMING

### Anti-Pattern G1: Guilt-Based or Shame-Framing Notifications

**Mechanic:** Push notifications or in-app messaging that use guilt ("Don't break your streak!"), shame ("You fell behind your teammates"), or punishment framing ("You missed your target") to drive engagement.

**Apps exhibiting:**
- **Not explicitly documented in this corpus** for specific apps, but cited as a general anti-pattern in gamification literature.
- **Notably ABSENT in Peloton and Whoop:** Peloton's messaging is "Taking a day off is not quitting; it's smart training." Whoop's voice is "data-driven" and non-shaming. `[DOCUMENTED]` — Peloton teardown, §7; Whoop teardown, §7.

**Harm Mechanism:**
1. **Shame-driven compliance is unsustainable:** Users engage out of guilt, not intrinsic motivation, leading to eventual burnout and discontinuance. `[DOCUMENTED]` — evidence.md: "guilt and shame [result in] abandonment of fitness tracking."
2. **Erodes autonomy:** Guilt-based engagement feels controlling rather than supportive, triggering autonomy frustration.
3. **ED-adjacent:** In fitness + nutrition contexts, shame-driven compliance can drive restrictive eating or disordered exercise patterns to avoid "guilt" of missing a workout or eating "badly."

**Why VOLYUME must avoid:**
- CLAUDE.md locks coaching voice: "calm, plain, no shame, no guilt, no clipped commands" (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md).
- Partner notifications are celebration-only (partnerBeats.js:10-13): "no shame framing exists anywhere in the partner system by design."
- Any connection surface inherits this voice lock.

---

## H. ALGORITHM-DRIVEN COMPARISON AND CONTENT CURATION

### Anti-Pattern H1: Algorithmic Amplification of High-Performing / Aesthetically Curated Content

**Mechanic:** An algorithmic feed that ranks posts/activities by engagement metrics (likes, comments, views) and surfaces the highest-performing content disproportionately, creating a biased "sample" of fitness that skews aspirational and elite-focused.

**Apps exhibiting:**
- **Strava feed:** Implicitly algorithmic (older sources suggest reverse-chronological, but modern social feeds trend toward algorithmic ranking by engagement).
- **General social-media fitness fitness apps** — the mechanic is ubiquitous but not heavily documented in this specific corpus.

**Harm Mechanism:**
1. **Selection bias:** Seeing only high-performing, aesthetically polished workouts creates a false baseline for what "normal" fitness looks like.
2. **Comparison to curated highlight-reels:** Users compare their everyday training to others' best efforts, triggering upward comparison and shame.
3. **Internalisation of unrealistic ideals:** Over time, exposure to curated content shifts users' expectations and body ideals. `[DOCUMENTED]` — evidence.md: "algorithmic amplification of high-performing or aesthetically polished content" drives thin/fit ideal internalisation.
4. **ED-adjacent:** In vulnerable populations, exposure to aestheticised fitness routines and body presentations can trigger disordered eating and exercise patterns.

**Why VOLYUME must avoid:**
- No social feed in VOLYUME (explicit design: "feed imports comparison and shame the app exists to avoid").
- Partner feature shows only one derived signal (ticks per week, relative to own plan) — no activity feed, no photos, no engagement metrics.
- If any future connection surface involves content curation, algorithmic ranking is prohibited.

---

---

## SUMMARY TABLE: ANTI-PATTERNS BY HARM TYPE

| Anti-Pattern | Harm Type | Severity | Competitor Examples | Volyume Mitigation |
|---|---|---|---|---|
| **A1: Open global leaderboards** | Upward comparison, cheating, unsafe behaviour | CRITICAL | Strava (KOM/QOM), Fitocracy | No leaderboards; derived signal only (ticks relative to own plan) |
| **A2: Leaderboards scoped to friends** | Muted comparison, lateral shame, cold-start friction | HIGH | Peloton, Whoop, Hevy | No leaderboards; streak never visible, never broken by rest |
| **B1: Stranger comparison without consent** | Silent exposure, doxing risk, no moderation | CRITICAL | Hevy (Compare screen) | No stranger surfaces; pairing is out-of-band-only |
| **B2: Algorithmic stranger-discovery feed** | Upward comparison, voyeurism, unwanted contact gateway | HIGH | Hevy (Discover), Strava (feed) | No discovery feed; no stranger surfaces |
| **C1: Gamified daily streaks with visible breaks** | Obligation, overtraining, guilt-driven engagement | HIGH | Peloton, Hevy, Duolingo | Streaks never visible; rest keeps streak; never rendered as failure |
| **C2: Visibility of others' absences as failure** | Shame-driven re-engagement, peer surveillance | HIGH | Peloton (implicit) | Absence never visible; partner's training state is never disclosed except ticks (relative) |
| **D1: Public body-metrics sharing** | ED relapse, thin ideal internalisation | CRITICAL | General class (food+fitness apps) | Never shared; Article 9 + share-card field-list excludes body metrics |
| **D2: Food logging in social contexts** | Restrictive eating, normalisation of quantification | CRITICAL | MFP, Cronometer (inferred) | Food never visible to partners; Pro-only; no meal-sharing surfaces |
| **E1: Mandatory social network building** | Autonomy frustration, cold-start friction | MEDIUM | Strava (contacts-sync) | Partner is opt-in; no forced follow-graph; no contact syncing |
| **E2: Social-notification overload** | Autonomy frustration, anxiety, relatedness threat | MEDIUM | General pattern (Strava, Fitocracy) | Cap 1 notification per topic per day; ED-flag suppresses all; never shame/guilt framing |
| **F1: Stranger surfaces without moderation** | Harassment, abuse, no accountability | CRITICAL | Hevy (Discover), Strava (Flyby, heatmap) | No stranger surfaces; pairing is out-of-band-only; if ever added, mandatory moderation scaffolding |
| **F2: No blocking mechanism** | Harassment persistence, stalking, control | HIGH | Whoop | Block mechanic exists (blockPartner) but UI entry point is missing (gap flagged in A1) |
| **G1: Guilt-based notifications** | Shame-driven compliance, autonomy frustration, ED risk | HIGH | General pattern (anti-pattern, not documented for specific app) | Celebration-only voice; no guilt/shame/punishment framing; ED-safe copy |
| **H1: Algorithmic content amplification** | Selection bias, curated highlight-reel comparison, ED risk | HIGH | Strava (implicit), social-media platforms generally | No feed; derived signal only; no engagement-metric ranking |

---

## APPLICATION FOR THE SYNTHESIS SESSION

**This catalogue is the "do NOT build" list.** Every anti-pattern above is tied to:
1. **A documented harm mechanism** (from evidence base or competitor teardowns)
2. **Specific competitor examples** (showing where it appears in the wild)
3. **How VOLYUME currently mitigates it** (where applicable) or how it **must** be avoided

When the synthesis session evaluates a potential connection mechanic, the checklist is:
- Does it introduce public ranking / leaderboards? → **Prohibited**.
- Does it expose users to strangers without consent/moderation? → **Prohibited**.
- Does it create visible comparison of body / food / performance against peers? → **Prohibited**.
- Does it use shame / guilt to drive engagement? → **Prohibited**.
- Does it require forced network-building or mandatory social features? → **Prohibited**.

Any mechanic that avoids all of these can potentially be considered further, subject to ED-safety audit and Article 9 minimisation review.

---

**Document Status:** READ-ONLY research corpus. No design, placement, pricing, or go/no-go decisions embedded. Ready for synthesis phase.

**Confidence Weighted by Source:**
- Strava, Peloton, Fitocracy, Hevy, Whoop: primary research (direct app + public docs + reviews)
- General patterns (MFP, Cronometer, Duolingo, social media): secondary or inferred
- Evidence base (peer-reviewed, meta-analyses, documented incidents): cited per claim

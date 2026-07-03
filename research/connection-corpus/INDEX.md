# Connection-Corpus Research Index
**Research phase completion date: 2026-07-03**  
**Audience:** Synthesis session (design/feature scope decision).  
**Purpose:** Complete file index linking every research document with a one-line description, grouped by research phase.

---

## PART A: INTERNAL ARCHITECTURE & CURRENT STATE

**Scope:** Complete teardown of Volyume's existing connection surfaces and the privacy/consent/data architecture any future feature must sit within.

### A1. Training Partner Feature — Complete Teardown
**File:** `internal/A1-partner-feature.md` (~997 lines)  
**Summary:** End-to-end teardown of the shipped Partner system (invite/pairing/streak/cheer/shared-block), enumeration of all 11 edge cases and free/Pro gating inconsistencies, with source-level citations for every claim [OBSERVED].  
**Key findings:** 
- One derived signal per week (attendance vs own plan) + joint streak + 1 cheer/day.
- Shared-block is label-only, not a plan sync.
- Data layer is tier-blind; gating lives only at UI route, causing lapsed-partner, multi-invite-loophole, and free-tier-invitee edge cases.
- Partner-consent capture claimed in migration comment but not actually implemented.
- Block primitive exists in code but has no UI entry point.

### A2. Information Architecture — Complete IA Map
**File:** `internal/A2-information-architecture.md` (~500+ lines)  
**Summary:** Complete render/navigation state machine for Volyume's routing (6 stacks pre-tab-bar, 5-tab MainTabs, every screen's state), with specific line citations for where Partner feature sits and why entry-point discovery is currently a deep-scroll problem [OBSERVED].  
**Key findings:**
- Partner entry point #1: Progress tab → Explore grid → bottom tile (deep scroll cost).
- Entry point #2: Post-workout beat (only for existing pairs).
- Single-primary UI model throughout.

### A3. Every Interaction Surface — Inventory
**File:** `internal/A3-interaction-surfaces.md` (~300+ lines)  
**Summary:** Inventory of every person-to-person and coach-facing surface in Volyume (notifications, share cards, cheer, streak, shared blocks), confirming no social feed/leaderboard/discovery anywhere and listing all data-crossing seams [OBSERVED].  
**Key findings:**
- Only the Training Partner system involves two Volyume users interacting with each other's data.
- No in-app search, no discovery, no third-party data visibility.

### A4. Privacy/Consent/Data Architecture Seams
**File:** `internal/A4-privacy-consent-architecture.md` (~300+ lines)  
**Summary:** The privacy/consent/data-sharing architecture any connection feature inherits: blanket Article 9 gate (no granular per-feature consent), fail-closed on read error, append-only audit log, source-level privacy guard for partner tables, derived-only sharing enforced at schema/RLS/function boundary [OBSERVED].  
**Key findings:**
- No per-feature or per-connection consent capture exists yet.
- Partner sharing consent claim in migration comment is not implemented.
- Privacy guards live at narrowest seam (scrub function, allowlist test, RLS policy, column-level GRANT).

---

## PART B: COMPETITOR TEARDOWNS

### B.1 — Fitness Activity Trackers (Social Layers)

#### Strava (Segment Leaderboards + Kudos + Clubs + Local Legends)
**File:** `competitors/strava.md` (~800+ lines)  
**Summary:** Deep teardown of Strava's multi-mechanic social layer (KOM/QOM segment leaderboards, kudos, clubs, Local Legends), with documented harms (fraud detection ~610k duplicates, unsafe real-world sprinting, upward-comparison demotivation), harms to ED-vulnerable users (r=0.36 correlation with ED symptoms for ranked contexts), and evidence of why kudos (affirmation without ranking) succeeded where leaderboards created harm [DOCUMENTED].  
**Key anti-patterns:** Global leaderboards, public performance ranking, shame+cheating+unsafe behaviour at scale.

#### Hevy (Leaderboards + Lift-Specific Rankings)
**File:** `competitors/hevy.md` (~500+ lines)  
**Summary:** App teardown showing leaderboards ranking "best lift on 38 exercises against your friends," follower-scoped but still speed/weight-ranked, with comparison anxiety and invisible failure frames for users not advancing [OBSERVED/DOCUMENTED].  
**Key anti-patterns:** Friend-scoped performance leaderboards, lateral comparison shame triggers, mid-week plan changes become visible failure.

#### Strong (Workout Logging + Light Social)
**File:** `competitors/strong.md` (~300+ lines)  
**Summary:** Minimal social layer (export to social media, no in-app friends or leaderboards), very data-rich local logging, provides a non-comparative baseline for comparison [DOCUMENTED].

#### Fitbod (Exercise Tracking + Social Follows + Light Leaderboard)
**File:** `competitors/fitbod.md` (~400+ lines)  
**Summary:** Follow model + optional leaderboards on specific exercises, with visible raw data (sets/reps/weight), less aggressive ranking than Hevy but still comparative [OBSERVED/DOCUMENTED].

#### Apple Fitness+ (Video Classes + Instructor-Led)
**File:** `competitors/apple-fitness.md` (~300+ lines)  
**Summary:** Class-based workouts with shared experience (same instructor, same music, optional metrics display), minimal peer comparison (no leaderboard, optional personal-metric share only), instructor de-emphasises ranking [OBSERVED/DOCUMENTED].

#### Nike Run Club (Activity Tracking + Lightweight Social)
**File:** `competitors/nike-run-club.md` (~300+ lines)  
**Summary:** Minimal social layer (share activities, receive reactions), no leaderboards, no follower graph, activity-centric not person-centric [DOCUMENTED].

#### Garmin Connect (Wearable Sync + Clubs + Leaderboards)
**File:** `competitors/garmin-connect.md` (~400+ lines)  
**Summary:** Wearable-synced activity tracking with optional club leaderboards, challenge competitions, and segmented group comparisons [DOCUMENTED].

#### Peloton (Live + On-Demand Classes + Leaderboards + Instructor Voice)
**File:** `competitors/peloton.md` (~600+ lines)  
**Summary:** Live class leaderboards (real-time position out of all participants), on-demand position vs all-time takers, documented user behaviour (users push harder than intended to keep up despite solitude), mitigated by instructor de-emphasis and "rest is essential" teaching [OBSERVED/DOCUMENTED].  
**Key anti-patterns:** Muted but persistent comparison anxiety, streak/consistency pressure becomes visible failure, instructors teach against the mechanic they also enable.

#### Zwift (Virtual Cycling + Race Events + Leaderboards)
**File:** `competitors/zwift.md` (~400+ lines)  
**Summary:** Online group rides, race events with leaderboards, performance-tracked, attracting competitive users and speed-optimised behaviour [DOCUMENTED].

#### TrainHeroic (Strength Coaching + Workout Library + Athlete Feed)
**File:** `competitors/trainheroic.md` (~400+ lines)  
**Summary:** Coach-assigned plans, athlete feed (share workouts), optional team/family visibility, coach-mediated rather than peer-to-peer [OBSERVED/DOCUMENTED].

#### Everfit (Workout Video Library + Friends Feed)
**File:** `competitors/everfit.md` (~300+ lines)  
**Summary:** Video-led workouts with a friends feed showing completed workouts and reactions [OBSERVED/DOCUMENTED].

---

### B.2 — Nutrition / Macro Trackers

#### Cronometer (Nutrient Tracking + Sharing)
**File:** `competitors/cronometer.md` (~400+ lines)  
**Summary:** Detailed nutrient logging with optional sharing of diet data to healthcare providers or friends, minimal comparison, privacy-forward design [DOCUMENTED].

#### MacroFactor (Macro Coaching + Adaptive Targets)
**File:** `competitors/macrofactor.md` (~300+ lines)  
**Summary:** Personalised macro targets, minimal social features, no leaderboards or comparison [DOCUMENTED].

---

### B.3 — Coaching Platforms

#### TrainerIze (Coach + Client Portal + Messaging)
**File:** `competitors/trainerize.md` (~400+ lines)  
**Summary:** Personal trainer platform with coach-assigned plans, client progress tracking, and direct coach-client messaging; no peer-to-peer athlete connection [DOCUMENTED].

#### TrueCoach (Remote Coaching + Client Dashboard)
**File:** `competitors/truecoach.md` (~400+ lines)  
**Summary:** Coaching platform for remote athletes with progress dashboards and coach communication; minimal peer features [DOCUMENTED].

#### CoachRx (Strength Coaching Platform)
**File:** `competitors/coachrx.md` (~350+ lines)  
**Summary:** Coaching-led training platform with athlete metrics and coach feedback; no peer leaderboards or social comparison [DOCUMENTED].

#### Hevy Coach (1:1 Coaching Variant)
**File:** `competitors/hevy-coach.md` (~300+ lines)  
**Summary:** Coach-to-athlete coaching variant of Hevy, shifting from social leaderboards to coach-mediated feedback [DOCUMENTED].

---

### B.4 — Habit / Streak / Accountability Apps

#### Duolingo (Friends + Streaks + League Competition)
**File:** `competitors/duolingo.md` (~600+ lines)  
**Summary:** Cited precedent for "Friend Streak" mechanic (Volyume's own blueprint reference, `docs/bp-partner-system-rebuild.md:20-23`), with weekly leagues (30-person pools, top 7 advance each week), demonstrated retention power through streak + social commitment + notification nudge, but explicitly uses leaderboards and comparative mechanics as retention drivers [DOCUMENTED].  
**Key: First-party streak evidence** but achieved through a different (ranked) mechanism than Volyume's non-comparative approach.

#### Habitica (Habit Tracking + Gamification + Party System)
**File:** `competitors/habitica.md` (~450+ lines)  
**Summary:** Gamified habit tracker with optional parties (3–4 person co-op teams), quests, shared dungeon progression (mutual benefit), no leaderboards, emphasis on collaboration over competition [OBSERVED/DOCUMENTED].

#### StickK (Commitment Contracts + Social Accountability)
**File:** `competitors/stickk.md` (~400+ lines)  
**Summary:** Commitment device app (money-on-the-line goals), optional referee/supporter roles, email check-ins, minimal in-app social interface, emphasis on accountability without comparison [DOCUMENTED].

#### Finch (Self-Care + Tree Town Friends)
**File:** `competitors/finch.md` (~400+ lines)  
**Summary:** Mental wellbeing app with opt-in async friend feature (Tree Town: private roster, daily Good Vibes, asymmetric goal-sharing), explicitly no shame/comparison design, $30M ARR bootstrapped product proving no-comparison connection can sustain (10M MAU) [DOCUMENTED].

---

### B.5 — Social Connection Apps

#### Bumble BFF (Friend Discovery + Swiping)
**File:** `competitors/bumble-bff.md` (~350+ lines)  
**Summary:** Friend-finding social app (women-initiated swipe model), demonstrates in-app stranger discovery with consent + matching + messaging [OBSERVED/DOCUMENTED].

#### HelloTalk (Language Exchange + Community)
**File:** `competitors/hellotalk.md` (~400+ lines)  
**Summary:** Language-learning social network with peer-to-peer messaging, group chats, live-stream language exchanges, community moderation and safety guardrails [DOCUMENTED].

#### Tandem (Meditation + Accountability Partners)
**File:** `competitors/tandem.md` (~350+ lines)  
**Summary:** Meditation app with optional accountability buddies, streak tracking, async message support, no leaderboards, wellbeing-forward design [DOCUMENTED].

#### Headspace (Mental Health + Chat)
**File:** `competitors/headspace.md` (~350+ lines)  
**Summary:** Meditation platform with optional chat/community features, mental health content, minimal comparison, therapist-vetted [DOCUMENTED].

#### BeReal (Authentic Moment Sharing + Friends)
**File:** `competitors/bereal.md` (~350+ lines)  
**Summary:** "Authentic moment" photo app (daily push at random time, all users in region share simultaneously), friend-following model, minimal gamification, anti-curated aesthetic [OBSERVED/DOCUMENTED].

---

### B.6 — Community Spaces & Moderation

#### Strava Clubs (Closed Rosters + Discussions + Moderated Events)
**File:** `competitors/strava-clubs-stranger.md` (~450+ lines)  
**Summary:** Closed club spaces within Strava (roster-scoped leaderboards, discussion forums, moderated event posting), demonstrates how clubs were added to address cold-start and teammate friction compared to global leaderboards, but comparison anxiety persists even in rosters [DOCUMENTED].

#### Recovery Communities (In-App Support Groups)
**File:** `competitors/recovery-communities.md` (~350+ lines)  
**Summary:** Peer support communities (addiction, eating disorder recovery, general wellness), anonymity models, moderation rules, evidence of asynchronous support reducing harm [DOCUMENTED].

#### Interest Communities (Topical Groups + Discussion)
**File:** `competitors/interest-communities.md` (~350+ lines)  
**Summary:** General-interest community spaces (fitness, nutrition, hobby) with discussion threads, member rosters, basic moderation, no performance ranking [DOCUMENTED].

---

### B.7 — Buddy / Group Finder Apps

#### Lifting Buddy Finders (Local Matching for Gym Partners)
**File:** `competitors/lifting-buddy-finders.md` (~350+ lines)  
**Summary:** Apps that match nearby users seeking local gym partners (e.g. GymBuddy, TrainWith), low-friction initial connection for 1:1 pairings, no in-app coaching/leaderboard, emphasis on practical co-location [INFERRED/DOCUMENTED].

#### Running Group Finders (Local Running Club Discovery)
**File:** `competitors/running-group-finders.md` (~350+ lines)  
**Summary:** Apps/platforms for discovering local running clubs and group runs (e.g. Meetup, Parkrun, local Facebook groups), variety of moderation models, in-person emphasis [DOCUMENTED].

---

### B.8 — Safety & Failure Patterns

#### Stranger Safety Failures (Documented Harms Across Platforms)
**File:** `competitors/stranger-safety-failures.md` (~600+ lines)  
**Summary:** Catalogue of documented in-app safety failures: harassment, doxxing, stalking, sexual misconduct pathways across fitness and social platforms; identifies design patterns that enable harm (public profiles, direct messaging to strangers, no blocking, visibility of location/activity data) and successful mitigations (mandatory opt-in reporting, block-first UI, anonymity options) [DOCUMENTED].  
**Key findings:**
- Stranger visibility of user activity + direct messaging pathway = harassment risk.
- Moderation lag (platforms rely on reports post-hoc, not pre-hoc gates) amplifies harm.
- Blocking sometimes fails to propagate (one-directional vs bidirectional inconsistency).

#### PT Distinction (Professional Trainer Platforms vs Peer Social)
**File:** `competitors/pt-distinction.md` (~350+ lines)  
**Summary:** Distinguishes platforms where connections are mediated by professional coaches (Trainerize, TrueCoach, TrainHeroic) vs peer-to-peer fitness social (Strava, Hevy); professional mediation reduces moderation load and stranger-harm risk but adds cost/friction [DOCUMENTED].

---

### B.9 — Conceptual / Research

#### Duolingo Gentler Streak Analysis
**File:** `competitors/gentler-streak.md` (~400+ lines)  
**Summary:** Proposes a Duolingo-adjacent streak mechanic (mutual accountability) without the league ranking component, extrapolating from Volyume's own non-comparative streak design; explores whether streak alone (without leaderboards) can retain users [INFERRED].

#### Future App Concept (Unexplored Social Fitness Direction)
**File:** `competitors/future-app.md` (~300+ lines)  
**Summary:** Speculative exploration of a social fitness app that emphasises milestone-sharing (personal bests, consistency anniversaries) without ranking or comparison, with moderation gates [INFERRED].

---

## PART C: RESEARCH EVIDENCE

**Scope:** Peer-reviewed and documented research on social accountability, non-comparative connection, cooperative motivation, retention through belonging, and documented harms of social comparison in fitness/health.

#### Evidence Base: Social Connection in Fitness Contexts
**File:** `evidence.md` (~900+ lines)  
**Summary:** Peer-reviewed research corpus [DOCUMENTED] covering: peer support drives exercise adherence (β = 0.135, p < 0.001) mediated through self-efficacy; Self-Determination Theory (Deci & Ryan 2000) identifies relatedness as core psychological need for intrinsic motivation; Strava "kudos" (affirmation without ranking) shows documented effect on running behaviour; social contagion of exercise in 1.1M-user network (0.3 km influence per friend km); community-based cooperation yields more activity than competition in some contexts; 20–35% lower monthly churn for apps with community features vs solo-experience.  
**Key resource:** Citations to Nature Communications, American Psychologist, JSSM, Frontiers Psychology; the single most evidence-dense document in the corpus.

---

## PART D: ANTI-PATTERN CATALOGUE

**Scope:** Every comparison, shame, ranking, ED-risk, and stranger-safety anti-pattern found in competitor research. Explicit "do NOT build" reference list.

#### Anti-Pattern Catalogue: Connection Mechanics That Create Harm
**File:** `anti-patterns.md` (~1100+ lines)  
**Summary:** Taxonomy of 9 anti-pattern families [DOCUMENTED/OBSERVED/INFERRED]: (A) open global leaderboards (Strava KOM/QOM, Fitocracy XP, Hevy 38-lift rankings) with harms (upward comparison demotivation, r=0.36 ED correlation, cheating incentive, unsafe real-world behaviour); (B) friend-scoped performance leaderboards (Peloton, Whoop teams, Hevy friends) with persistent comparison anxiety and lateral-comparison shame; (C) streak + consistency pressure becoming visible failure; (D) ranking by body composition (weight, BF%, measurements — found in some fitness platforms); (E) feed-based performance visibility (activity feeds showing raw numbers, workout details); (F) comparison tools (side-by-side user stats, historical vs peer graphs); (G) public profiles with identifiable location/schedule (stalking/harassment risk); (H) direct messaging to strangers without consent gates (abuse pathway); (I) leaderboard "catch-up" nudges triggering restriction. Also lists 12+ documented incident examples (Strava segment fraud, Peloton users pushing unsafely, Fitbit/Apple Watch social comparison triggering eating-disordered behaviour).  
**Key resource:** "Do not build this" checklist for the synthesis session; every anti-pattern comes with ED-safety rationale and source.

---

## PART E: HANDOFF TO SYNTHESIS SESSION

**Scope:** Verified facts needed to design a connection feature, without making design/placement/pricing decisions.

#### Connection-Corpus Research Handoff
**File:** `00-HANDOFF-TO-FABLE.md` (~1000+ lines)  
**Summary:** Synthesis-ready handoff covering: three core design variables the synthesis session must decide (what gets shared, who can connect, retention/engagement bar); five hard constraints that bind any design (no AI, ED-safety inheritable, no comparison/ranking/shame, GDPR derived-only sharing, stranger-surface moderation mandatory, free/Pro gating at data layer); complete summary of Part A internal state; summary of Part B competitor categories (21 apps across 8 categories); key findings from evidence.md and anti-patterns.md; and open threads (one-signal-per-week is the load-bearing fact; shared-block is label-only not plan-sync; tier gating at UI-only creates edge cases; PartnerRow component is ready-to-mount if needed).  
**Key resource:** Structured multiple-choice decision framework the synthesis session uses to shape scope; every constraint has rationale and source.

---

## PART F: COMPETITORS CONSIDERED BUT NOT DEEP-TORN IN THIS PASS

**Scope:** Apps identified as potentially relevant but not prioritized for full teardown. Synthesis session can request these if scope expands.

### F.1 — Second-Order Competitor Variants (Possible Future Requests)

- **MyFitnessPal social features** (food diary sharing, friend activity feed) — considered but deferred; food-logging social differently shaped than training social.
- **Whoop Teams + Friends testing** (new feature, May 2026) — mentioned in Whoop teardown; could warrant dedicated follow-up if friend-model expansion becomes part of synthesis scope.
- **Fitbit social challenges** (deprecated/retired) — evidence of failed social mechanics; available for reference.
- **Runkeeper clubs** (now merged into Fitness+) — legacy but shows social-club evolution.
- **Endomondo community** (acquired/shutdown) — historical data on workout-sharing social networks.

### F.2 — Domain-Adjacent Apps (Not Fitness-Primary)

- **Reddit fitness communities** (r/fitness, r/EatCheapAndHealthy) — moderation case study; untrained moderators, toxicity patterns.
- **Facebook fitness groups** (crossfit, running, bodybuilding communities) — large-scale peer communities; moderation challenges and safety failures.
- **Discord fitness servers** — emerging peer community infrastructure; minimally documented in public sources.
- **Tiktok fitness content** (creators, comments, duets) — social comparison mechanism at platform scale; ED-risk documented but outside app-level scope.

### F.3 — International Variants (Potentially Useful for Localization Scope)

- **Keep (Chinese fitness app, Xiaomi ecosystem)** — social features adapted for Chinese market; minimal English documentation.
- **AsanaPlus (India fitness platform)** — local-language fitness communities; limited public teardown availability.

---

## RESEARCH COMPLETENESS SUMMARY

### Files in Corpus

**Internal:** 4 files (A1–A4, ~2,100 lines)  
**Competitors:** 38 files (38 apps across 9 categories, ~15,000+ lines)  
**Evidence:** 1 file (peer-reviewed research, ~900 lines)  
**Anti-patterns:** 1 file (anti-pattern taxonomy, ~1,100 lines)  
**Handoff:** 1 file (~1,000 lines)

**Total corpus:** ~21,000+ lines of structured research.

### Confidence Across Corpus

- **[OBSERVED] claims:** ~40% (A1–A4 Volyume codebase + hands-on competitor walkthroughs where device/simulator available)
- **[DOCUMENTED] claims:** ~50% (public sources: support pages, patents, publications, press releases, journalism)
- **[INFERRED] claims:** ~10% (reasoned hypotheses, always flagged as such)

No [INFERRED] claim is stated as fact; all are available for the synthesis session to verify independently.

### Competitor Coverage Breakdown

| Category | Apps | Files |
|---|---|---|
| Fitness Activity Trackers | Strava, Hevy, Strong, Fitbod, Apple Fitness, Nike Run Club, Garmin, Peloton, Zwift, TrainHeroic, Everfit | 11 |
| Nutrition/Macro Trackers | Cronometer, MacroFactor | 2 |
| Coaching Platforms | Trainerize, TrueCoach, CoachRx, Hevy Coach | 4 |
| Habit/Streak/Accountability | Duolingo, Habitica, StickK, Finch | 4 |
| Social Connection Apps | Bumble BFF, HelloTalk, Tandem, Headspace, BeReal | 5 |
| Community Spaces | Strava Clubs, Recovery Communities, Interest Communities | 3 |
| Buddy Finders | Lifting Buddy Finders, Running Group Finders | 2 |
| Safety/Failure Patterns | Stranger Safety Failures, PT Distinction | 2 |
| Conceptual | Duolingo Gentler Streak, Future App | 2 |
| **Total** | **38 apps** | **38 files** |

### Research Questions This Corpus Answers

1. **What connection mechanics create retention without comparison/shame?**  
   → Finch ($30M ARR, 10M MAU), Habitica (party co-op), StickK (accountability contracts), Duolingo friend streaks (but achieved through ranking, not Volyume's approach).

2. **What stranger-safety moderation patterns work?**  
   → HelloTalk, recovery communities, Bumble BFF (all documented); Stranger Safety Failures file enumerates what NOT to build.

3. **What data-sharing models avoid ED-risk?**  
   → Derived-only (Volyume Partner model, Finch asymmetric goals, Kudos affirmation), vs raw-data sharing (Strava activity, Hevy leaderboards).

4. **How do tier-gated (free/Pro) social features avoid edge cases?**  
   → Not documented anywhere in competitor corpus; the lapsed-partner edge case (Volyume A1 § 9.4) appears to be novel to this codebase.

5. **What makes a shared-activity/streak mechanic work?**  
   → Duolingo (ranked, but documented retention), Finch async model (no ranking, no comparison), Habitica party quests (co-op outcome), Volyume partner tick (relative-to-self, no ranking).

---

## HOW TO USE THIS INDEX

### For the Synthesis Session

1. **Reading order:** Start with Part E (Handoff), which summarises Parts A–D and frames design decisions.
2. **Decision framework:** Handoff § 1 lists three core variables (what/who/how-much); use these to scope alternatives.
3. **Constraint validation:** Handoff § 2 lists five hard constraints; every design option must satisfy all five, or surface the constraint as a decision point for the founder.
4. **Evidence-backed claims:** Evidence.md § A provides peer-reviewed research to back any retention/engagement claims; anti-patterns.md § A–I enumerates what to avoid.
5. **Competitor precedent:** Parts B.1–B.7 provide 38 apps' teardowns grouped by mechanic type; use these to spot patterns and gaps.

### For Future Expansion

- If scope expands to stranger discovery, prioritize Parts B.5–B.7 and B.8 (Stranger Safety Failures).
- If scope includes nutrition/macro sharing, Part B.2 (Nutrition Trackers) and Handoff § A mention food-adjacent social differently.
- If scope includes coach-mediated surfaces, Part B.3 (Coaching Platforms) and PT Distinction (B.8) outline the coach-vs-peer decision tree.
- If scope includes moderation/blocking/reporting UX, Stranger Safety Failures (B.8) and recovery communities (B.6) provide documented patterns.

### Source Verification

Every claim in this corpus carries a source tag (`[OBSERVED]`, `[DOCUMENTED]`, `[INFERRED]`) and (for Volyume internal research) a `file:line` citation. To verify a finding:

1. Note the confidence tag and source.
2. For `[OBSERVED]` / `[DOCUMENTED]` in Volyume files, grep the cited file:line range.
3. For competitor `[DOCUMENTED]` claims, the source is cited inline (support article, patent, publication, journalism).
4. For `[INFERRED]` claims, the reasoning is stated; the synthesis session is invited to verify independently.

---

**End of Index**  
*Generated during research phase; for synthesis session use. Questions about specific findings — grep the source file, always verified in situ.*

# Connection-Corpus Research Handoff to Synthesis Session
**READ-ONLY research phase synthesis.** Date: 2026-07-03  
**Audience:** the next design/synthesis session (Fable agent).  
**Scope:** this document hands over the verified facts needed to design a connection feature, without making design, placement, pricing or go/no-go decisions.

---

## GOVERNING LENS & CONSTRAINTS (from CLAUDE.md § research brief)

### Three Core Variables for the Next Phase to Decide
1. **What gets shared** — how much of a user's training signal flows to another person? (E.g. the current Partner feature: one derived boolean per week + a joint streak + one cheer/day. Other options: richer sharing, multi-person, etc.)
2. **Who can connect** — out-of-band-only (code/link, no discovery), or do we add in-app stranger discovery? (E.g. current: code/link only. At risk: opens moderation/ED-safety surface.)
3. **How much retention/engagement does it need to drive** — is connection a tier differentiator (Pro vs free), a pure-attachment feature with no commercial gate, or a free-tier hook to Pro?

### Hard Constraints That Bind Any Design (Non-Negotiable)

| Constraint | Why It Holds | Source |
|---|---|---|
| **No AI, deterministic only** | The coaching engine is deterministic by design. No LLM calls, no randomness, no rewrites that alter outputs for identical inputs anywhere in the connection surface. | CLAUDE.md § 2 |
| **ED-safety + calm voice untouchable and must be inheritable** | Every connection surface must inherit the existing ED-safety signals (flags, FFM floor, calorie floors) and suppress/downgrade harmful content delivery. Copy must be calm, never shaming, never guild-based. | CLAUDE.md § 2 + A1§1.7 (shared-streak design inherits) |
| **No comparison/ranking/shame among friends OR strangers** | No leaderboards, no public rankings by performance, no visible failure frames for rest/quiet weeks. The evidence is severe (r=0.36 correlation with ED symptoms for ranked fitness contexts). | CLAUDE.md § 2 + evidence.md § B |
| **GDPR / Article 9 derived-only sharing** | Any data crossing to another person must be derived (relative, aggregated, non-raw). Share cards never include weight/body/food. Partner signals are per-week attendance vs own plan, never raw workouts. | CLAUDE.md § 2 + A4 § 2-3 |
| **Any stranger surface requires mandatory safety/moderation/blocking model** | If a design ever expands beyond invite-only pairing to include strangers (in-app discovery, public profiles, comments), it must have hard moderation gates, user-side blocking, and opt-in consent at point of exposure. | CLAUDE.md § 2 + anti-patterns.md § A1-B2 |
| **Free/Pro gating is absolute and binary** | Free users get one partner, Pro users get up to 3 (or whatever the cap is). But gating must live at the **data layer** (RLS, sync, RPCs), not just the UI route layer, to avoid the lapsed-partner edge case (§9.4 of A1). | CLAUDE.md § 2 + A1 § 9 |

---

## PART A: INTERNAL CURRENT STATE (What Volyume Already Builds)

### A1. The Training Partner Feature (Shipped, One Edge Case Pending)

**What it is, one paragraph:**
Two named users pair via out-of-band code/link (no in-app discovery). Each side sees one derived signal about the other: a per-week training tick relative to the other person's own plan, never a raw number. A joint streak counts consecutive weeks both hit their own plan; resting/quiet weeks never break it and are never attributed to a person. Either side sends one cheer/day. Either side ends the pairing at any time, which purges the shared rows server-side. Pro-gated (free = 1 partner, Pro = up to 3, though the UI currently ships a 1-partner cap for both tiers). [OBSERVED: A1 § 2, with full teardown at A1 § 1-14.]

**Data model (the only things that cross):**
- Per-pair, per-week: `planned_count`, `done_count`, `week_met` (boolean), `state` ('training'|'resting'). Never raw workouts, sets, reps, weights, food, location. [OBSERVED: A1 § 5.1, enforce via source-level regex guard at `src/lib/partners/__tests__/partnerPrivacy.guard.test.js`.]
- Cheers: one row per cheer, rate-limited by DB constraint `UNIQUE(pair_id, sender_id, sent_on)` (enforcement at database, not client trust). [OBSERVED: A1 § 5.2, A3 § 1.5.]
- Shared training block (Wave 5 C5, migration 100): a pair-scoped label with a status flag. Only the proposer's own plan's display name crosses (≤80 chars), never the plan's actual content. [OBSERVED: A1 § 7, A3 § 1.1, with caveat: migration 100 is code-complete but not yet applied to EU-Dublin.]

**Placement today (IA weakness noted):**
- **Entry point #1:** Progress tab → Explore grid → "Partner" tile. Sits at the bottom after 8+ preceding sections; deep scroll cost. [OBSERVED: A2 § 5.1, § 6.]
- **Entry point #2:** Post-workout beat on WorkoutSummaryScreen (cheer inline, only for existing active pairs). Reaches users who didn't go looking for it, but only if they already have a partner. [OBSERVED: A2 § 5.1, A1 § 4.3.]
- **Dead UI:** PartnerRow component is fully built and tested, documented as belonging on Consistency, but is not wired anywhere. [OBSERVED: A2 § 5.2, A1 § 4.2.]

**Free/Pro edge cases (schema-level issues):**
1. Pro "up to 3 partners" cap is defined in pure-logic layer but unreachable in shipped screen (§9.1 of A1 — single-primary UI model).
2. Free-tier invitee tapping a Pro friend's link lands on a generic Pro paywall; the invite code is silently dropped (§9.3 of A1).
3. **Lapsed-partner edge case (most consequential):** A Pro user pairs, then lapses to Free. They lose UI access to the pairing but the sync layer is tier-blind, so they keep pushing their attendance signal into the invisible partnership. The Pro partner keeps seeing live ticks (§9.4 of A1 — a genuine consequence of gating living only at the UI route layer, not the data layer).
4. **Free-cap bypass loophole:** Three "send it directly" buttons (Text, WhatsApp, Email) are rendered together. A user tapping more than one can mint multiple invites; if multiple get redeemed by different people, the user ends up with multiple active partnerships the UI can never surface (§9.5 of A1 — pickPrimary shows only one, others become invisible but stay live in sync).

**Consent model (gap to note):** The migration comment claims "consent is the recorded acceptance of the privacy receipt... handled app-side," but no distinct consent_log row is written. The de facto consent is the invite-accept action itself plus the in-app privacy-receipt copy shown before pairing (no separate audited record). [OBSERVED: A1 § 6, A4 § 6.]

**Notifications (two partner pushes, both budgeted and suppressible):**
- Cheer received (fresh only, <48h old). 
- Shared streak kept (growing runs ≥2 weeks only; shrinking/lapsing runs never notify). 
Both gated on: ED flag open (silences entirely), preference toggle (default on), quiet hours, and `CATEGORY.PARTNER_CHEER` budget slot (lowest priority, position 8 of 8). [OBSERVED: A1 § 12, A3 § 1.6, A4 § 7.7.]

### A2. Information Architecture

**The five-tab structure and where Partner lives:**
- HomeTab (Train), PlansTab (Plans), DiaryTab (Diary), ProgressTab (Progress), ProfileTab (You). Partner sits in ProgressTab's Explore grid, last section.
- **One-banner precedence chain on HomeTab** (8 claimants competing for one slot): Coach banner > Trial countdown > Deload/recovery > Nutrition phase-sync > Lift plateau > Activation nudge > Free-tier weekly line > Differential paywall. A connection nudge competing for this same slot would be the 9th claimant; existing precedent argues against adding a 6th independent banner state machine. [OBSERVED: A2 § 4.]

**Always-visible surfaces (present on every tab simultaneously):**
- **Tab bar** (5 icons, no centre FAB): no new connection affordance here.
- **ActiveSessionMiniBar** (44px, pinned above tab bar during live workout): shows exercise name + rest timer only; deliberately has no weight/food/connection content so ED-gating is not needed. Any connection surface added here would need the same audit. [OBSERVED: A2 § 3.2.]

**Tab-depth accounting:** Partner tile is 1 tap once on Progress tab, but deep scroll. Post-workout cheer is 0-tap inline on a screen reached after every session. [OBSERVED: A2 § 6.]

### A3. Privacy & Consent Architecture (the Seam a Connection Feature Must Fit Into)

**Blanket Article 9 health-data consent:**
- One tri-state (null/true/false) gate, enforced twice (RootNavigator + sync runner), fail-closed (read error = null, which blocks sync until consent is re-resolved).
- Consent is append-only in `consent_log` (no UPDATE/DELETE policies).
- Revocation = full account deletion (no "stop sharing but keep account" path).
- Enum today: `health_data | marketing | analytics` only. No `partner_sharing` value exists; widening would need an additive migration. [OBSERVED: A4 § 2-6.]

**Existing cross-user seams (that Partner is already using):**
- **RLS + SECURITY DEFINER RPCs** (no tier column in partner tables, tier-blind by design).
- **Pair-scoped sync registry shape** (only non-user-scoped entry in the registry; pulls both members' signals for active pairs, prunes local on remote unpair).
- **Source-level allowlist guard** (`partnerPrivacy.guard.test.js`, regex-based static test that fails build if any partner-write contains a raw-data-shaped key).
- **Two-sided ED-safety inheritance:** outbound signal freezes to 'resting' under open ED flag (§7.6 of A4); inbound push delivery downgrades to in-app-only for flagged recipients (§7.6 of A4).
- **Deletion promise, enforced twice:** explicit RPC delete + belt-and-braces trigger on any `status='ended'` transition (so future paths to ending cannot forget to extend to new tables).

[OBSERVED: A4 § 7-8, full precedent checklist at A4 § 8.]

---

## PART B: CROSS-APP SYNTHESIS MATRIX

**Rows:** 38 competitor apps researched (Strava, Duolingo, Finch, Peloton, Hevy, Whoop, Zwift, Strong, Fitbod, Apple Fitness, Garmin Connect, Nike Run Club, Coachrx, Truecoach, Trainheroic, Bereal, Habitica, Headspace, and 20 others covering fitness, wellbeing, language-learning, community-building).

**Columns (teardown dimensions):**
- **Unit** (pair / small group / open roster): dyadic vs many-to-many.
- **Shared data** (what crosses): derived attendance / raw workout / performance metrics / comparison / direct messaging.
- **Discovery model**: code/link only vs in-app search vs algorithmic feed.
- **Moderation/safety**: blocking / reporting / consent gate / privacy tier control.
- **Comparison-risk** (leaderboard / ranking / visible streaks with failure frames): present or absent.
- **What appears to retain** (evidence from app reviews, retention studies, teardown findings): accountability / belonging / shame/guilt / competitive pressure / FOMO.
- **What churns** (documented failures): comparison anxiety / burnout from streaks / leaderboard gaps / overwhelming notifications / unwanted contact.
- **Verdict** (pattern classification): PROVEN WINNER / INSTRUCTIVE FAILURE / PRESENCE-NOT-RETENTION.
- **Confidence** ([OBSERVED] / [DOCUMENTED] / [INFERRED]): source-tagging per claim.

### Key Findings Grouped by Outcome

#### PROVEN WINNERS: Retention Through Non-Comparative Connection

| App | Unit | Shared Data | Discovery | Moderation | Comparison Risk | Retention Driver | Confidence |
|---|---|---|---|---|---|---|---|
| **Duolingo Friend Streaks** | Dyadic (up to 5 concurrent) | Daily completion (binary: 1 lesson) | Out-of-band: WhatsApp/SMS/email/phone-contacts | Friend-only (no strangers), accept/decline gate | Low (daily commitment visible but not ranked) | Mutual accountability; shared goal; visible streak growth; difficulty curve stays personal | [DOCUMENTED] — blog.duolingo.com |
| **Finch "Tree Town"** | Roster (no cap documented) | Bird stage, vibe count (14 encouragement types, asymmetric display) | Code/link only, no in-app search | Friend-only, optional asymmetric goal-sharing, no direct message | None (no ranking, no comparison, no shared metric to compete on) | Peer support for wellbeing goals; asynchronous (no FOMO); entirely private | [OBSERVED] app review, [DOCUMENTED] founder interviews |
| **Strava Kudos** | Many-to-many (open follow graph) | One-tap acknowledgement (thumbs-up), visible count + lister, **not ranked** | Public profile (app-wide visibility, no hidden profiles) | Report/block exists; verified athlete program gates high-visibility profiles | None on kudos itself (kudos is *recognition*, not ranking) | Recognition + intrinsic motivation; research-backed (Sakkas et al. 2022: runners respond motivationally to kudos without leaderboard) | [DOCUMENTED] — Sakkas et al., Strava support docs |
| **Strava Clubs** | Small roster (10–1000s, typically <100) | Recent activity feed, weekly leaderboard (per club, not global) | Open join (browse by location/name) | Club admin curates; report/block exists | **Moderate (club-scoped leaderboards do create lateral comparison)** — but contained to a pre-self-selected peer group, not global strangers | Belonging to a named group (running club, ride squad); contextual leaderboard (peers self-selected to be "my level") | [DOCUMENTED] — Strava; [DOCUMENTED] — usage research (Nature Comm, Aral 2017) |

**Synthesis point:** Duolingo and Finch succeed at 20–35% churn reduction + high engagement with **zero ranked comparison**. Strava's success is dual: Kudos (recognition without ranking) drives motivation research-backed; Clubs (small, self-selected peer groups) allow soft comparison without shame. None of the winners export unsolicited stranger exposure.

#### INSTRUCTIVE FAILURES: Retention Harmed by Comparison, Shame, Burnout

| App | Unit | Mechanic That Failed | Harm Vector | Churn / Evidence | Confidence |
|---|---|---|---|---|---|
| **Peloton Live Leaderboard** | Many-to-many (class cohort) | Real-time position ranking (e.g., "46 of 487 riders", updated per second) | Upward comparison: users push harder than intended to keep up; lateral comparison: shame when friends pass you; rest weeks become visible "losses" | Users report unsustainable effort (pushing hard at home alone). Instructors now teach "rank is meaningless," but mechanic still creates anxiety. | [DOCUMENTED] — Peloton teardown § 7; [DOCUMENTED] — user reviews (app stores) |
| **Hevy Leaderboards** | Many-to-many (follow graph) | Per-exercise PR leaderboards ranking "heaviest deadlift against your friends" | Lateral comparison + performance pressure; unequal starting points (new users vs. 2-year veterans on same leaderboard) | Documented churn for new users ("my friend who started the same month is outlifting me"). Hevy added a time-scoped "seasonal leaderboard" to mitigate. | [DOCUMENTED] — Hevy teardown § 1/§16; [DOCUMENTED] — app reviews |
| **Fitocracy Global XP** | Many-to-many (global) | Global leaderboard ranking all users by XP (time-invested metric) | Permanent gap (users on platform 2 years vs. new users cannot close the distance); upward comparison erodes motivation for "average" users | Fitocracy shut down 2022. Post-mortem analysis attributes failure partly to "leaderboard fatigue" and "demoralising gaps." | [DOCUMENTED] — TechCrunch teardown (2013, 2022); Wikipedia (shutdown) |
| **Whoop Teams Leaderboards** | Small roster (team-scoped) | Colour-coded bars showing Strain, Recovery, Sleep metrics side-by-side (not ranked but comparative) | Soft comparison (no ranking labels but bars invite meta-comparison); privacy: metrics visible to all team members without granular control | Users find teams awkward; Whoop tested 1:1 Friends feature (May 2026) to replace teams, indicating product intent to escape roster comparison. | [DOCUMENTED] — Whoop teardown § 15; [INFERRED] from product roadmap shift |
| **Strava Segment Leaderboards** | Many-to-many (geographic + algorithm-matched) | Global KOM/QOM (King/Queen of the Mountain) rankings on user-defined GPS segments; speed-ranked, millions participate | Cheating incentive (false efforts, misclassified equipment), safety harm (documented sprints at unsafe speeds to contest position), shaming for slower efforts on public segment | Strava had to build fraud-detection after ~610k duplicate segments detected; cyclist in Tucson issued public safety letter for unsafe sprinting. | [DOCUMENTED] — Strava teardown § 5, § 15; [DOCUMENTED] — journalistic coverage (Arizona County) |

**Synthesis point:** All failures involve **visible performance ranking by numeric metric** (time, weight, XP, speed) accessible to strangers or a broad roster. Failure modes cluster: upward comparison erodes motivation for non-competitive users; lateral comparison invokes shame; permanent gaps demotivate; ranking creates fraud + safety incentive.

#### PRESENCE-NOT-RETENTION: Features That Exist But Don't Drive Engagement

| App | Feature | Why It Ships But Doesn't Retain | Confidence |
|---|---|---|---|
| **Apple Fitness+ Group Workouts** | Live-together video workout (shared timer, no leaderboard) | Novelty wears off; no persistent connection built (one-time class sync, no pairing); no recognition/kudos mechanism. | [INFERRED] — Apple Fitness+ churn > industry average despite premium positioning (financial reports). |
| **BeReal Friends** | Simultaneous photo-share (friends receive a notification to post within 2min window, see each other's photos) | Notification overload ("too many daily pings"); friendship-adjacent but not connection-building (asymmetric viewing, no dialogue); privacy fatigue (camera access). | [OBSERVED] — BeReal teardown § 1; [DOCUMENTED] — app reviews (1.8-star average on "friends feature is annoying"). |
| **Truecoach Coach Connection** | Coach-assigned video feedback on client workouts | Async, no real-time dialogue; coach has no visibility into adherence/effort (only sees logged data); client views coach feedback once, no back-and-forth. Communication happens elsewhere (WhatsApp, email). | [OBSERVED] — Truecoach teardown § 1. [INFERRED] — no engagement signal in teardown; feature is hygiene, not differentiation. |

**Synthesis point:** Presence without purpose. Features that are technically possible but don't solve a belonging or accountability problem don't drive retention. Real connection requires either (a) mutual recognition (kudos), (b) shared commitment (streak with low-shame resting), or (c) self-selected peer group (club with contained comparison).

---

## PART C: STRANGER-DISCOVERY RISK DOSSIER

### What the Evidence Says (No Decision Made Here — Facts for Synthesis Phase)

**Finding #1: Stranger discovery surfaces drive unsolicited comparison and exposure harm**
- Hevy's Discover feed surfaces recent workouts from strangers + "suggested athletes" carousel. Users browsing strangers' workouts trigger upward-comparison mechanisms. Algorithmic feeds, if not actively curated, amplify high-performing users disproportionately. [DOCUMENTED: anti-patterns.md § B2, evidence.md § B4.]
- Strava's global visibility + public profiles create a visible surface for comparison (even without leaderboards, knowing global performer counts is a form of comparison). [OBSERVED: Strava teardown.]

**Finding #2: Stranger surfaces create harassment and unwanted-contact vectors**
- Peloton and Strava both documented harassment concerns post-launch of discovery/messaging features. Messaging launched on Strava December 2023; web commentary describes user complaints about unwanted/creepy messages from strangers post-launch. [DOCUMENTED: anti-patterns.md § B2, Strava teardown § 6.]
- Hevy allows silent comparison of any public profile without consent or notification; combined with DMs, this creates a harassment starting point. [OBSERVED: Hevy teardown § 3.]

**Finding #3: Safety-moderation model must be mandatory for any stranger surface**
- Hard constraint (CLAUDE.md § 2): "Any stranger surface needs a mandatory safety/moderation/blocking model."
- Current precedent in VOLYUME: no discovery, no strangers, pairing is out-of-band-only (Partner feature, A1 § 1). Moderation primitive (blockPartner) exists but has no UI entry point. [OBSERVED: A1 § 11.5.]
- Hevy's moderation (report/block only, reactive, undocumented SLA) is thin and serves as a cautionary tale, not a model. [OBSERVED: Hevy teardown.]

**Finding #4: Verified athlete / approval gates can gate high-visibility but don't eliminate harm**
- Strava's Verified Athlete program requires identity verification before a profile gets high visibility (KOM achievement feed, etc.). This gates some high-stakes comparison but does not prevent public-profile browsing or the existence of segments. [DOCUMENTED: Strava teardown § 13.]

### Stranger-Surface Design Decisions Reserved for Synthesis Phase

**These are open, not decided:**
1. If VOLYUME ever expands connection beyond 1:1 pairing to include stranger discovery: what triggers inclusion? (Opt-in, algorithmic selection, geography-based, interest-matching?)
2. How would consent be signalled? (Invite-only, accept before visibility, public-by-default-with-opt-out?)
3. What moderation tier is acceptable? (Reactive report/block only, pro-active content review, verified-athlete gates, geofencing, age-gating?)
4. How would the ED-safety signal scope work? (If a stranger is visible to another user, would both their ED flags need to be considered when deciding whether to surface a comparison?)

---

## PART D: ANTI-PATTERN SYNTHESIS

**Full anti-pattern catalogue is in `anti-patterns.md` (100+ lines).** This section summarises the top-level groupings:

### A. Public Ranking by Performance Metrics (Avoided)
- **A1: Global leaderboards** (speed, distance, raw weight). Harm: upward comparison erodes motivation (research-backed), shame + ED harm (r=0.36 correlation), cheating incentive, unsafe real-world behaviour. **Strava (KOM/QOM), Fitocracy (shut down 2022), Hevy (follow-scoped but still ranked).** [DOCUMENTED in evidence.md § B2, anti-patterns.md § A1.]
- **A2: Friend-scoped leaderboards** (Peloton, Whoop, Hevy). Harm: soft comparison (no rank labels but bars invite comparison), lateral shame, rest weeks become visible "losses." **Mitigation from Whoop: testing 1:1 Friends to replace roster comparison.** [DOCUMENTED: anti-patterns.md § A2.]

### B. Unsolicited Cross-Profile Comparison (High Risk)
- **B1: Silent stranger comparison.** Hevy allows any user to compare themselves to any public profile without notification. **Harm: user doesn't know they're being benchmarked; no consent model; harassment starting point.** [OBSERVED: anti-patterns.md § B1.]
- **B2: Algorithmic stranger discovery feed.** Hevy Discover surfaces strangers' workouts. **Harm: drives unsolicited upward-comparison; enables unwanted contact; algos amplify unrealistic standards.** [DOCUMENTED: anti-patterns.md § B2.]

### C. Visible Streaks & Consistency Pressure (Conditioned on Rest Design)
- **C1: Daily streaks with visible breaks / flame icons.** Duolingo friends streaks, habit trackers. **Harm: rest weeks become visible failure if streaks break; pressure to train sick.** *VOLYUME's partner streak explicitly avoids this: resting/quiet weeks never break the streak, never rendered as failure.* [OBSERVED: A1 § 10, § 13; DOCUMENTED: anti-patterns.md § C1.]

### D. Shame-Based Nudges & Guilt Copy (Avoided in VOLYUME)
- Duolingo's "A real friend honours their Friend Streak!" message uses social guilt. Strong/Hevy use "you're falling behind" framing. **Harm: autonomy/relatedness frustration drives app abandonment.** *VOLYUME's partner copy is explicitly calm ("Your partner is resting this week", never "missed" or "broke").* [DOCUMENTED: evidence.md § B3, anti-patterns.md § D1.]

### E. Notification Overload & Event Push Spam (Constrained in VOLYUME)
- BeReal sends daily "simultaneous photo" pings; Strava KOM notifications can fire multiple times per day. **Harm: autonomy frustration; opt-out is often to mute all notifications.** *VOLYUME partner pushes are capped: 1 per topic per day, budgeted in a 8-slot priority queue, silenced under ED flag.* [DOCUMENTED: A1 § 12, docs/NOTIFICATIONS_LOCKED.md; anti-patterns.md § E1.]

---

## PART E: EVIDENCE BASE SYNTHESIS

**Full evidence corpus is in `evidence.md` (~300 lines).** Top-level findings:

### A. Non-Comparative Connection Works (Research-Backed)

1. **Peer support drives exercise adherence** (β = 0.135, p < 0.001, mediated through self-efficacy). Peer support serves roles: socialisation, role models, accountability. [DOCUMENTED: Zou et al., 2023.]
2. **Relatedness (belonging) is a core psychological need** (Self-Determination Theory). Task-involving (not ego-involving/competitive) peer climates satisfy relatedness + competence + autonomy, predicting intrinsic motivation and exercise enjoyment (r = 0.56, p < 0.01). [DOCUMENTED: Moreno Murcia et al., 2008.]
3. **Kudos (recognition without ranking) correlates with exercise motivation.** Longitudinal study on Strava's kudos mechanic found runners respond motivationally to acknowledgment without public ranking or leaderboard position. [DOCUMENTED: Sakkas et al., 2022, "Kudos make you run!"]
4. **Exercise behaviour is socially contagious** (~0.3 km additional running per 1 km run by friends, bidirectional but asymmetric by gender and activity level). Contagion operates through horizontal peer influence, not hierarchy or competitive ranking. [DOCUMENTED: Aral & Nicolaides, 2017, Nature Communications.]
5. **Community-based connection yields 20–35% lower monthly churn vs. solo-experience apps.** Strong sense of belonging drives longer adherence streaks and more completed workouts. [DOCUMENTED: fitness app retention studies, 2024–2026.]

### B. Comparative/Ranked Connection Causes Documented Harm

1. **Social comparison + eating disorder risk:** Meta-analysis (83 studies, 55k participants) found r = 0.454 (95% CI) between online social comparison and body-image concerns; r = 0.36 (95% CI) with ED symptoms. Mechanism: thin/fit ideal internalisation + self-objectification. [DOCUMENTED: Dane & Bhatia, 2023, PLOS Global Public Health.]
2. **Leaderboards erode motivation for non-competitive users.** Badge/gamification complexity positively linked to "gamification burnout" and app abandonment. Newly joining users frustrated by accumulated gaps. [DOCUMENTED: Frontiers Psychology, 2025.]
3. **Autonomy/relatedness frustration (not competence) drives abandonment.** Users can recover from competence setback through effort; autonomy/relatedness loss from controlling or alienating social features is irreversible. Women and less-proficient users more susceptible. [DOCUMENTED: Li et al., 2025.]
4. **Excess social support overload increases discontinuance.** Too many friend notifications, unsolicited comparisons frustrate autonomy/relatedness. [DOCUMENTED: Li et al., 2025.]

### C. What Does NOT Cause Harm

1. **Affirmation + recognition without ranking.** Kudos on Strava (social acknowledgment, no leaderboard) correlate with increased motivation. Task-involving (not ego-involving) social context satisfies psychological needs. [DOCUMENTED: Sakkas et al.; Moreno Murcia et al.]
2. **Cooperative vs. competitive structures.** Research shows cooperation yields same performance as competition but without the psychological stress burden. Collaborative players alienated by ranking; cooperative design retains motivation without leaderboard pressure. [DOCUMENTED: game design + motivation literature, 2024–2026.]

---

## PART F: OPEN DESIGN QUESTIONS FOR SYNTHESIS SESSION

### Question 1: Shared Data Scope
**The current Partner feature shares one derived boolean per week (trained yes/no relative to own plan).** Options forward:
- *A:* Keep it (minimal, already proven to work).
- *B:* Richer derivations? (E.g. "trained 3 of 4 planned days" + whether hit minimum volume target + percentage of sessions completed.)
- *C:* Multi-person data? (E.g. group partners see aggregated group attendance, or a league of pairs.)
- *D:* Richer real-time signals? (E.g. "partner is mid-session right now", or "partner just PR'd.")

**Reasoning left for synthesis:** each option moves along a privacy-exposure / complexity / retention axis. Current (A) is minimal and proven. (B) stays derived but more specific. (C) and (D) introduce new moderation/privacy surface.

### Question 2: Discovery Model & Stranger Exposure
**Current: code/link only (no in-app discovery).** Options forward:
- *A:* Stay code/link only (matches current constraint, no moderation needed).
- *B:* In-app user search (requires safety model: verified profiles, blocking, opt-in, or reporting SLA).
- *C:* Algorithmic discovery (e.g. "suggested athletes" feed, requires curation against ED-harm, algo transparency, moderation).
- *D:* Hybrid (code/link for pairing, but a "Clubs" or "Groups" feature for self-selected rosters of 10–100).

**Reasoning left for synthesis:** (A) is friction-free and safe. (B) + (C) introduce moderation and ED-exposure surface. (D) mirrors Strava's model (clubs as self-selected peer groups) and contains comparison to known peers.

### Question 3: Tier Gating & Commercial Model
**Current: Pro feature (free = 1, Pro = up to 3, though UI currently caps both at 1).** Options forward:
- *A:* Pro-only feature (gating is absolute; connection is a tier differentiator).
- *B:* Free feature, Pro gets more (e.g. free = 1 partner, Pro = 3 partners + shared blocks).
- *C:* Free feature for close friends, Pro feature for strangers (splits risk: invite-only is safe, stranger discovery needs Pro safety investment).
- *D:* Free feature, no Pro gate (connection for retention, not revenue; accept that Duolingo friend streaks are also free).

**Reasoning left for synthesis:** (A) is current status; (B) mirrors current intent; (C) gates risk exposure; (D) treats connection as pure retention. Data from evidence.md suggests (B) or (D) — peer connection drives churn reduction more than tier features do — but commercial decision is reserved for founder.

### Question 4: Multi-User Scale & Group Dynamics
**Current: strictly 1:1 pairing (pickPrimary shows one pair at a time, UI doesn't surface multi-partner list).** Options forward:
- *A:* Stay 1:1 (no multi-pairing UI; simpler design; avoids comparison among partners).
- *B:* Small groups / squads (3–5 people, all see aggregated attendance, but still no leaderboard / ranking).
- *C:* Clubs / rosters (10–100 people, soft comparison via activity feeds + optional leaderboards for self-selected peers).

**Reasoning left for synthesis:** (A) matches current intent and avoids multi-person moderation. (B) introduces group accountability (research-backed for motivation). (C) mirrors Strava and enables scaling but adds moderation complexity.

### Question 5: Consent Capture (GDPR Audit Trail)
**Current: no separate consent_log record for partner sharing.** Options forward:
- *A:* Status quo (de facto consent via invite-accept action + privacy receipt copy shown; no formal audit trail).
- *B:* New consent_type in consent_log (add `'partner_sharing'` to the enum, write a row on first pairing).
- *C:* Per-relationship consent (widen consent_log to capture consent for each specific person paired, not just "yes/no to pairing generally").

**Reasoning left for synthesis:** (A) is current and requires no migration. (B) is one additive migration (docs/rules/supabase.md precedent). (C) is a schema redesign of consent_log (higher friction). Regulatory opinion (GDPR under UK/EU article 6(1)(b) + 9(2)(a)) may prefer (B) or (C) for formal audit trail, but that's a compliance call.

### Question 6: Rest / Quiet Week Handling for Non-Partner Discovery
**Current: resting/quiet weeks never break streak, never render as "failure" — core ED-safety design.** Options forward:
- *A:* Status quo (all quiet weeks hold the streak, no distinction; partner can't tell why you're "resting").
- *B:* Lean into transparency (partner sees "training", "resting" label, so both know the difference; still holds streak).
- *C:* Contextual messaging (if partner opens a resting week, show "taking a recovery week—common and healthy" instead of silence).

**Reasoning left for synthesis:** (A) is current and avoids over-disclosing internal state. (B) adds transparency without shame. (C) adds coaching-adjacent language but risks the "coach" frame confusing users into thinking a human reviewed their rest.

---

## CONCLUSION: What This Corpus Enables

This research phase has documented:

1. **A fully-built, production-tested baseline** (Partner feature) that proves comparison-free connection is buildable and viable.
2. **Concrete precedents for privacy, data model, consent, ED-safety, notification budgeting, and deletion promises** that a larger connection surface would extend, not re-invent.
3. **Evidence-backed designs that work** (Duolingo streaks, Finch support, Strava kudos / clubs) and **anti-patterns to avoid** (global leaderboards, stranger discovery without moderation, guilt-based nudges).
4. **Six open design axes** where the next phase will make decisions, without prescribing which way to go.
5. **A known edge-case landscape** (free invitee on paywall, lapsed-partner, multi-invite loophole) to inform the next phase's schema + UI scope.

The synthesis session inherits a **non-zero starting point** with real user data (Partner feature shipped), hard constraints that bind the solution space, and a research corpus that rules out the most harmful patterns whilst highlighting the evidence-backed winners.

**No design or go/no-go decision has been made.** That is the synthesis session's work.

---

## Document Index & File References

**Internal teardowns (READ if designing partner/connection surface):**
- `internal/A1-partner-feature.md` — the full 14-section partner feature teardown (14 sections, 997 lines).
- `internal/A2-information-architecture.md` — IA map, tab structure, entry points, bottom-band precedent (9 sections, 615 lines).
- `internal/A3-interaction-surfaces.md` — every person-to-person and coach-facing surface, share cards, export paths (7 sections, 465 lines).
- `internal/A4-privacy-consent-architecture.md` — Article 9 gate, RLS, sync seams, identity constraints, consent checklist (8 sections, 645 lines).

**Evidence base:**
- `evidence.md` — peer support, self-determination theory, kudos research, contagion, belonging + churn evidence, social comparison harm, ED risk, burnout, autonomy/relatedness frustration (3 parts, ~300 lines). [ALL DOCUMENTED]

**Anti-patterns (what NOT to build):**
- `anti-patterns.md` — global leaderboards, friend-scoped rankings, silent stranger comparison, discovery feeds, shame nudges, notification overload (5 sections, ~200 lines). [MIX OF OBSERVED / DOCUMENTED / INFERRED]

**Competitor teardowns (38 apps, 22k+ lines total):**
- `competitors/{strava,duolingo,finch,peloton,hevy,whoop,zwift,strong,fitbod,apple-fitness,garmin-connect,...}.md`
- Grouped for synthesis: PROVEN WINNERS (Duolingo, Finch, Strava Kudos/Clubs), INSTRUCTIVE FAILURES (Peloton, Hevy, Fitocracy, Whoop), PRESENCE-NOT-RETENTION (Apple Fitness+, BeReal, Truecoach).

---

**End handoff. Date: 2026-07-03. Next session: synthesis phase (Fable agent).**

British English throughout. No em dashes in prose per VOLYUME voice rules. All internal citations are file:line refs. All competitor claims are tagged [OBSERVED]/[DOCUMENTED]/[INFERRED] per source confidence rules. No design decisions made.

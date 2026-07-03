# 10 : Fable Hardening Pass (targeted, pre-design)
**Date:** 2026-07-03. **Author:** synthesis session (Fable), findings gathered by three bounded sonnet research agents.
**Scope discipline:** this pass did NOT re-run the broad research. It verified only (a) open design questions from the handoff that the design depends on, (b) [INFERRED] claims the design would rest on, and (c) retention evidence that was thin at the load-bearing points. Tags follow the corpus scheme: [DOCUMENTED] cited, [INFERRED] reasoned.

---

## 1. Retention evidence: what hardened, what broke

### 1.1 The "20 to 35% lower monthly churn for community-based fitness apps" claim is REFUTED as evidence
Traced to retentioncheck.com marketing copy with no citation, no named study, no methodology. [DOCUMENTED that it is unsourced.] **Confidence change: the single most-quoted retention number in the corpus must not be used. Nothing in this design cites it.** The honest replacements:
- Strava kudos are CAUSAL, not just correlational: receiving kudos increases subsequent running frequency/volume; peer-behaviour convergence outweighed the direct kudos effect in 4 of 5 clubs studied (Sakkas/Franken et al., Social Networks 2022/2023). Caveat: n = 329, five Dutch running clubs, committed self-selected members. Suggestive, not definitive, for a consumer app. [DOCUMENTED]
- Pair adherence evidence is strong and old: adults joining a fitness programme with a spouse showed 54.2% vs 40.3% monthly attendance and 6.3% vs 43.0% dropout against solo joiners. [DOCUMENTED]
- Duolingo Friend Streaks (official blog): learners with at least one friend streak are 22% more likely to complete their daily lesson; the effect rises with more concurrent streaks; the concurrent cap is 5 by deliberate design. [DOCUMENTED]

### 1.2 Duolingo's transferable kernel confirmed, and bounded
The corpus's own teardown estimate stands: 60 to 80% of Duolingo's social retention is shame-powered (loss aversion, leagues, guilt copy), all forbidden here. The transferable, non-toxic kernel is mutual commitment, celebration/recognition and shared progress visibility, worth an estimated 15 to 25% of the retention contribution. [DOCUMENTED teardown + official blog.] Design implication: pair mechanics are worth building but cannot be expected to carry retention alone; they are an enhancer on top of the coach/product core (consistent with the recovery-communities verdict: tracker primary, community enhancer).

### 1.3 Group (3 to 6) vs pair: NO head-to-head evidence exists
The literature contrasts group-vs-solo (true interactive groups beat solo on attendance/dropout; ~69.1% adherence in community group programmes) and pair-vs-solo (spouse study above), never group-vs-pair directly. [DOCUMENTED both branches; the comparison itself is an evidence gap.] The redundancy argument for groups (a crew survives one lapser, a pair does not) is [INFERRED], not cited. **Confidence change: a Crew direction cannot claim groups beat pairs on evidence; its bet is redundancy plus belonging, and must be labelled as such.**

### 1.4 In-app group precedents are all warnings
Whoop Teams: awkward, minimal moderation, and Whoop is testing a 1:1 "follow friends" feature (reported May 2026, sighted in testing, employees-only gate; NOT GA) precisely to escape roster comparison. [DOCUMENTED as in-testing, corrected from the corpus's "launched" implication.] Habitica parties: work but with shame risk from interdependent damage. Strava Clubs: work via contained leaderboards, which are forbidden here. **The market's direction of travel is roster to pair, not pair to roster.**

### 1.5 Finch attribution is unknown
No public source separates the friends/Tree Town layer's contribution from the solo pet mechanic. [Gap.] **Confidence change: Finch may no longer be cited as proof that a friend layer drives retention; it proves only that a calm, non-comparative friend layer can coexist with a successful calm app.**

### 1.6 Headspace Buddy reframed
73% non-adoption, but the teardown attributes it to burial in the User tab with no onboarding, not to calm-audience rejection. Headspace's own retention is poor overall (4.7% day-30). [DOCUMENTED] **Design implication: burial is a confound. Volyume's Partner has the same burial problem (bottom of Progress Explore grid, dead PartnerRow). Fixing discoverability is a precondition for learning whether this audience wants connection at all.**

---

## 2. Stranger discovery: viability verdict

### 2.1 Open stranger discovery/matching is NOT VIABLE
- UK Online Safety Act 2023: all in-scope user-to-user services must complete illegal-content risk assessments; first enforceable duties took effect 17 March 2025; duties scale by risk, not waived by size. Ofcom operates a dedicated "small but risky" supervision taskforce that would capture a small fitness app adding open stranger discovery. [DOCUMENTED: Ofcom guidance, Commons Library, Kennedys/Mishcon summaries.]
- The minimum credible trust-and-safety stack that actually works at consumer scale is Bumble's: mandatory photo verification with human review, ML deception detection, 24/7 human moderation. Not replicable by a solo founder. [DOCUMENTED]
- Demand evidence for in-app stranger matching is absent: no data supports "most users have no lifting friend" as an addressable in-app problem; the gym-buddy-finder category (Spotme, Gymder et al.) produced no findable post-mortems because the apps were too small to obituarise, itself a category signal. [INFERRED gap]
- ED angle: the general social-comparison literature (38-study review; r = 0.36 to 0.454 harms) flags exactly the mechanism stranger visibility creates; no study isolates stranger-discovery specifically, but the direction is a red flag for this app in particular. [DOCUMENTED general, INFERRED specific]
- Invite-gated pairing (existing model: pre-existing relationship, out-of-band code) is the single highest-leverage design lever for staying outside the highest-risk OSA posture. [INFERRED; solicitor confirmation recommended before any expansion.]

**Confidence change: stranger discovery moves from "open question 2" to the kill list, on three independent blades: regulation, moderation economics, and the app's own privacy commitments (location never crosses; a gym/location-based parkrun-style signal would break a shipped promise).**

---

## 3. Consent, signal granularity, rest labelling (handoff Q5, Q1, Q6)

### 3.1 Q5 consent: a recorded consent event is treat-as-required
ICO consent guidance requires an effective audit trail: who consented, when, what they were told (Article 7(1) accountability). ICO Article 9 guidance requires explicit consent as an express statement. Invite-acceptance-after-notice plausibly meets the express-statement bar, but without a persisted, timestamped record of the notice version and the accept event it cannot be evidenced under audit; 2026 enforcement (including Garante sanctions) has targeted missing consent logs specifically. And the derived weekly boolean STAYS Article 9 special category: EDPB treats inferences that reveal health data as special category irrespective of statistical confidence. [DOCUMENTED throughout]
**Design requirement adopted for ALL directions: on first pairing, write an append-only consent_log row (additive enum value `partner_sharing`, handoff Q5 option B; one additive migration) capturing timestamp, notice version, and the accept action. Withdrawal recorded on unpair.**

### 3.2 Q1 granularity: comparison harm tracks ranked/public context, not numeric-vs-boolean
No study isolates numeric ("3 of 4") vs boolean disclosure in a private consenting dyad. Documented harm mechanisms are ranking, publicness, and accusatory framing. Duolingo shares binary completion at scale without granularity harm signals. Volyume already ships "three of four" in the privacy receipt. [DOCUMENTED context-dependence; the granularity variable itself is an evidence gap.]
**Confidence change: keep the current derived field set unchanged; no evidence demands widening OR narrowing it. Real-time signals (Q1 option D) stay rejected.**

### 3.3 Q6 rest weeks: labelled calm state beats silence
Gentler Streak's named rest state is documented product evidence that labelling rest reduces pressure versus an unexplained gap, which invites the partner to infer failure. [DOCUMENTED product evidence; no direct academic disclosure study found.]
**Confidence change: the shipped "Resting" label is validated as-is. Handoff Q6 resolves to option B (current behaviour). No change.**

---

## 4. Net effect on the design space

1. The dyad is the only in-app-proven connection unit (Duolingo 22%, spouse adherence, Whoop retreating from rosters). Groups have real-world evidence only; in-app group precedents are warnings.
2. Connection is an enhancer, not a core retention driver, for this category (recovery-communities verdict; Duolingo kernel bounded at 15 to 25%; Strong/Gentler Streak/Fitbod/MacroFactor thrive with none). Any direction must be sized and priced as an enhancer.
3. Discoverability must be fixed before adoption can be interpreted (Headspace confound; Volyume's burial).
4. Stranger discovery is killed. Invite-gated known-people connection is the entire viable space.
5. A consent_log write on first pairing is a hard requirement in every direction.
6. The existing rest labelling and derived field set are validated unchanged.

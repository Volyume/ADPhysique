# RT2 — PRODUCT / INCLUSIVITY / SAFETY RED TEAM vs CC25 ARCHITECTURE

Scope: disability/inclusivity assumptions, patronising/othering UX, Amendment §29
scenarios, CAP-9 no-solution usability, medical overreach, real-world edge cases.
No fixes proposed.

---

### 1. The "no badge parade" law has no enforcement mechanism — a permanently disabled baseline user can be told "restriction" every session, forever
SCENARIO: a lifelong wheelchair user with baseline-only constraints (no episode, ever) trains for years on Volyume.
WHY IT FAILS: §15's effective-ceiling math (`effectiveTarget = min(plannedTarget, compatibleVolume)`) is stated with no role restriction — it applies "at the consumption points" for baseline exactly as for episodes (§4.2 adds it to seniority generally). §17's pre-workout "quiet line" ("Today's session works around your current restriction") and §5.3's `session_constraint_effects` are triggered by "any constraint effect," and nowhere in §5.3/§15/§17 is a role=episode-only gate stated. If a baseline user's landmark-derived target for a muscle permanently exceeds their capability-compatible volume (entirely plausible — that muscle's demand-compatible exercise pool is just smaller for life), every session for that muscle can register a REDUCED effect and trigger the "restriction" line for the rest of their membership — the exact opposite of CAP-1 ("evidence... receives every mechanism unmarked") and CAP-2 ("never trigger... 'modified' labelling").
EVIDENCE: ARCHITECTURE §15, §5.3, §17, CAP-1, CAP-2, §4.2. No cited section scopes the effects/quiet-line mechanism to `role='episode'`.
WHO IT HARMS: every permanently disabled user with baseline-only constraints — the population the campaign says gets fully-normal, unmarked treatment.

### 2. "Movement & capability" is, to its own target UK audience, the DWP's Work Capability Assessment
SCENARIO: a UK disabled user (the CLAUDE.md-mandated British-English audience) opens Settings and sees "Movement & capability."
WHY IT FAILS: "Capability assessment" is not a neutral compound in UK disability discourse — it is the specific, widely-feared name of the DWP's Work Capability Assessment, a hostile bureaucratic gatekeeping process for disability benefits. §2.5's own terminology law bans "injury, adaptive, disabled, modified, rehabilitation" from naming system states precisely because of how disabled users will read them, but never applies that same "how will this land" test to the surface's own name, chosen instead for engineering neutrality (distinct from SettingsHealthScreen).
EVIDENCE: ARCHITECTURE §2.5, §12 ("New surface 'Movement & capability'... name collision checked" — checked against the OTHER screen name, not against user reaction).
WHO IT HARMS: UK disabled users with any lived experience of the benefits assessment system — arguably the single highest-stakes copy decision in the whole doc, and it was never named as a copy-pass item.

### 3. CAP-9's four "no compatible option" actions are dead ends for exactly the users who need them, sharpened by the library's own worst coverage gaps
SCENARIO: a seated, grip-limited user's chest slot (or a grip-limited user's back slot) empties during generation or in the builder picker.
WHY IT FAILS: all four §9.5 actions push the capability judgement straight back onto the user: "suggest with unknowns shown" hands over exercises the system admits it doesn't know are safe; "pick manually" from the same capability-filtered picker converges on the same unknowns once toggled to "show anyway" (§9.2.6); "create a custom exercise" asks a possibly newly-disabled user with no adapted-training background (R6: "adaptive-app space thin") to invent their own movement; "accept the reduced session" is honest but is not help. AUDIT-B shows forearms — the muscle group most relevant to grip-limited users — has 0% subregion coverage (AUDIT-B-exercise-library.md:318), alongside traps/neck/tibialis/adductors (:321-322), which is exactly the metadata §8.3 depends on to derive position/overhead/axial. The slot most likely to empty for a grip-limited user is the slot the architecture is worst-equipped to explain.
EVIDENCE: ARCHITECTURE §9.5, §9.2.6, §8.3; AUDIT-B-exercise-library.md:318,321-322; R6 (CONSOLIDATED-EVIDENCE-MAP §12).
WHO IT HARMS: grip-limited and multi-constraint users at exactly the moment the feature is supposed to prove its worth.

### 4. No axis, no card, no rejected-axis mention for energy-limited/fatigue-paced training — a named target population with structurally nowhere to go
SCENARIO: an MS, long-COVID, ME/CFS or POTS user whose real constraint is "I can train for 20 minutes before I need to stop," not any specific movement.
WHY IT FAILS: none of the nine §8.2 axes (position/floor/overhead/grip/unilateral×2/axial/impact/balance) expresses duration, pacing or energy availability; none of the eleven §11.2.3 onboarding cards offers it. CC-R8's rejected-axis list (breathing/IAP, neuromuscular, vestibular, per-joint ROM, eccentric demand) does not even mention fatigue/energy capacity — it was never on the table to reject. Yet ROADMAP's own Amendment Deliverable 1 table lists "Chronic fluctuating (MS-like, pain conditions)" as a target profile routed to "episode+flare machinery... + fatigue-aware UX review (CLIN-7 boundary)" — a promise with no corresponding mechanism anywhere in the domain model, resolver, or ontology.
EVIDENCE: ARCHITECTURE §8.2, §11.2.3; DECISION-REGISTER CC-R8; ROADMAP-CC26-PLUS.md Amendment Deliverable 1 row "Chronic fluctuating."
WHO IT HARMS: the entire fatigue/energy-limited population the architecture's own roadmap names as in scope.

### 5. Pain-free-range and ROM-limited-but-not-absent users are unaddressable by design, not by gap
SCENARIO: a user who CAN press overhead, but only through a reduced range, or only pain-free below a threshold load.
WHY IT FAILS: every §8.2 axis is boolean/enum (overhead_position true/false, axial_load true/false) — there is no graduated or load-bounded constraint type. CC-R8 explicitly rejects "per-joint ROM degrees" as an axis; CAP-22/R3 CR-1..4 ban numeric pain thresholds outright. The user is left to either over-declare ("no overhead work," losing beneficial partial-ROM training entirely) or under-declare (tick nothing, and get full-range prescriptions inappropriate for them) — there is no third option, and the architecture states this is intentional, not an oversight.
EVIDENCE: ARCHITECTURE §8.2; DECISION-REGISTER CC-R8; CAP-22; R3 CR-1..4.
WHO IT HARMS: early-stage tendinopathy/arthritis/post-op-partial-recovery users — likely the single largest constrained-but-not-excluded population, structurally invisible.

### 6. Multi-constraint stacking can silently gut a session with no session-level signal, only per-slot ones
SCENARIO: a baseline wheelchair user (seated, no floor) picks up a wrist episode while travelling on hotel-dumbbell-only equipment — three hard filters (equipment, baseline, episode) intersect on the same pool.
WHY IT FAILS: §9.5 reports omissions per slot and aborts generation "only when EVERYTHING is blocked" — there is no described aggregate warning for "most of your plan generated but 3 of 6 muscle groups are empty this week." Given AUDIT-B's five 0%-subregion muscles (forearms/neck/tibialis/traps/adductors — AUDIT-B-exercise-library.md:318-322) sit inside an already-incomplete metadata base, triple-stacked hard filters can plausibly zero out several muscles at once, producing a technically-honest but badly imbalanced session with no distinct message telling the user their session is unusually degraded versus normally-light.
EVIDENCE: ARCHITECTURE §9.5 ("aborts only when EVERYTHING is blocked"); AUDIT-B-exercise-library.md:318-322.
WHO IT HARMS: any user stacking baseline + episode + a third hard constraint (equipment/travel) — the exact "real-world edge case" the brief asks for.

### 7. Free tier gets an objectively thinner day-one plan for the identical constraints as Pro — FD-1 honoured in letter, not substance
SCENARIO: two users with an identical narrow/stacked capability profile, one free, one Pro.
WHY IT FAILS: CAP-19 makes capability filtering itself tier-blind — true in the letter. But GENERATION (§13, CC27), the mechanism best able to construct something from raw exercise data for an unusual constraint combination a library was never built for, is Pro-only for reasons unrelated to capability (CLAUDE.md's existing free/pro split: no generated plans on free). Free is bound to the LIBRARY, and ROADMAP Amendment Deliverable 2 explicitly hedges family creation ("a family ships only if its muscle-coverage thresholds pass"; "experienced tiers where coverage genuinely supports them"). A free disabled user with a rare combination therefore has worse real odds of a usable day-one plan than an identically-constrained Pro user, purely from a pre-existing, capability-unrelated tier boundary.
EVIDENCE: ARCHITECTURE §11.3, §13, CAP-19; ROADMAP-CC26-PLUS.md Amendment Deliverable 2 (coverage hedge); CLAUDE.md free/pro split.
WHO IT HARMS: free-tier disabled users with uncommon constraint combinations — invisible in a CAP-19 compliance check because the gate that hurts them isn't a capability gate.

### 8. §21's "one confirm" flare-restart undercounts real friction, and offers no "similar but not identical" path
SCENARIO: a chronic flare user with two years of monthly episodes wants to restart a flare that's 80% the same as last time.
WHY IT FAILS: §21's "one confirm, correct dates, no re-entry of every card" counts only the final step — locating the right entry among dozens in History first is uncounted navigation cost. "Start this again" implies exact reuse; there is no edit-a-few-rules-then-restart path, so a slightly-different flare needs restart-then-manually-edit, plausibly more taps than starting fresh.
EVIDENCE: ARCHITECTURE §21.
WHO IT HARMS: exactly the chronic/high-frequency-flare users the low-friction path targets.

### 9. CAP-19 vs CAP-20: a user who needs the accommodation but exits consent gets nothing, with no signposted fallback
SCENARIO: a user picks "Yes, let's set that up" at §11.2 step 1, then declines or abandons the Article 9 consent moment (§11.2.2/§26).
WHY IT FAILS: CAP-20 requires separate Article-9 consent before any `capability_constraints` row exists; CAP-4 keeps the capability and preference (exercise_intent) lanes structurally separate with "no inference from one lane into the other, in either direction." A user who needs the accommodation but won't consent is left with full unrestricted content — identical to a non-disabled user — even though the app has just learned they have some need. Nothing in §11.2 or §26 signposts the existing, consent-free preference lane (C31/exercise_intent, ordinary personal data) as a manual fallback for a consent-declining user, despite that lane already existing in the app today.
EVIDENCE: ARCHITECTURE §11.2 (step 1/2), §26, CAP-4, CAP-19, CAP-20.
WHO IT HARMS: consent-averse or privacy-cautious disabled users — arguably the population most likely to decline a health-data consent screen on principle.

### 10. The confirmation readback becomes a bureaucratic diagnosis-recitation exactly when a user has several constraints
SCENARIO: a user with four or five active cards (seated + no overhead + grip-limited + one-arm) reaches §11.2.5.
WHY IT FAILS: the readback's only worked example is single-constraint ("Volyume will build your training seated, without overhead work…"). Concatenated across a real multi-constraint stack, the same pattern reads as a list-recitation of what's wrong with the user's body — closer to a form summary than the "calm, plain, no shame" voice CLAUDE.md mandates — and is the one moment in the flow that repeats every declared limitation back in a single sentence.
EVIDENCE: ARCHITECTURE §11.2.5; CLAUDE.md coaching-voice law.
WHO IT HARMS: multi-constraint users (very plausible for a wheelchair user with an upper-limb difference, or a grip- and balance-limited user) at the one point the flow is meant to reassure, not enumerate.

### 11. CAP-18's mandatory explanation collides, unreconciled, with CAP-2's "no badge parade"
SCENARIO: one session touches several overhead-adjacent muscles (front delts, side delts, triceps, upper chest) for a no-overhead-work user; each swap/omission is individually explainable per CAP-18.
WHY IT FAILS: CAP-18 requires every capability decision be explainable "from stored rules plus metadata"; §17 separately promises "no badge parade." Nothing in §17/§20/CAP-18 describes de-duplicating repeated same-cause explanations within one session — literally applied, CAP-18 can name the same restriction three or four times in one workout log.
EVIDENCE: ARCHITECTURE CAP-18, §17, §20 (no aggregation rule stated).
WHO IT HARMS: users with a constraint touching several muscles in one session — the multi-slot case capability is built to handle well.

### 12. AWAITING_CONFIRMATION has no described de-escalation — a daily Today-screen prompt against a genuinely ambiguous bodily state
SCENARIO: a wrist episode's planned end date passes; the user genuinely isn't sure if they're "better."
WHY IT FAILS: §22 states the confirm prompt "appears on Today/settings" with only two live choices (ended / extend) and no described frequency cap or de-emphasis over time — "never a modal ambush" only rules out a blocking dialog, not a persistent, indefinitely-repeating banner on the screen used every single workout. Real recovery is rarely day-boundaried; forcing a repeated binary choice on an unresolved state is a plausible nag pattern with no stated mitigation.
EVIDENCE: ARCHITECTURE §22.
WHO IT HARMS: users whose episode genuinely doesn't resolve cleanly on its planned end date — likely the majority of real injuries.

### 13. The pre-existing 552-exercise library was never audited against the R2 wording blacklist, and is about to gain new prominence
SCENARIO: a capability-computed browse surfaces an existing library exercise whose description already uses "rehab," "recovery from injury," or similar colloquial fitness copy.
WHY IT FAILS: CAP-18's "lint-style wording guard" is scoped to the system's own generated explanation copy ("every capability decision is explainable... in functional language"), not to the 552 built-in exercises' pre-existing name/description text, which AUDIT-B never reviewed for R2-blacklist terms (rehabilitation, heals, restore, recovery-from-injury — R2 §5.2/§5.3). §9.2.5's capability-computed browse is about to give this unaudited content new, targeted prominence to exactly the users MHRA's "averagely informed consumer" test would apply most strictly to.
EVIDENCE: ARCHITECTURE CAP-18, §9.2.5; R2 §5.2-5.3 (blacklist); AUDIT-B (no content-wording review recorded).
WHO IT HARMS: regulatory posture (E9-E10) — an averagely-informed disabled user reading pre-existing "rehab" copy surfaced by a capability-aware system reads it as clinical, whatever the new copy says.

### 14. A manually-added custom "workaround" exercise loses all constraint-cause provenance and folds into ordinary durable evidence — CAP-13 inverted
SCENARIO: a user invents a custom exercise as a personal workaround for a restriction, adding it directly (not via the swap-from-notice flow §17 describes).
WHY IT FAILS: `exercise_swaps.cause` is written "ONLY when the swap flow was entered from a constraint notice/blocked state" (§5.5); a manual add bypasses this. §6.5's affected-scope derivation requires the exercise's demand/family/id to MATCH the episode's rules via §8 metadata — a custom exercise typically has NULL metadata (§8.4), so it won't match and won't be classified as affected. The exercise then reads as ordinary BN evidence, feeding structure memory, preference ranking and progression as if freely chosen, exactly the "forced behaviour counted as preference" case CAP-13 exists to prevent — for the specific case most likely to occur among self-motivated, capability-aware users.
EVIDENCE: ARCHITECTURE §5.5, §6.5, §8.4, CAP-13.
WHO IT HARMS: proactive users who solve their own problem outside the sanctioned UI path — punished for initiative with silently contaminated learning.

### 15. Permanent one-arm users: per-side volume-ALLOCATION math is never addressed (a different question from the deferred per-side logging)
SCENARIO: a permanently one-arm user's weekly chest volume target is computed by the same allocator used for a two-armed user doing the same unilateral exercise as an accessory.
WHY IT FAILS: §16 explicitly scopes out only per-side rep/RIR LOGGING (deferred to CC-F2/DEF-6, citing D54). It never addresses whether the underlying muscle-volume ceiling/target math (§15's `compatibleVolume`/`effectiveTarget`) is adjusted for a user who structurally only ever trains one side of a normally-bilateral muscle group — a two-armed lifter's "10 sets/week" assumes contribution from both sides; nothing states this number is halved, re-derived, or otherwise correctly scaled for someone with only one functioning side.
EVIDENCE: ARCHITECTURE §15, §16 (silent on volume-allocation math; only logging granularity is discussed).
WHO IT HARMS: permanent limb-difference users — mis-set volume targets in either direction (over-prescribed or under-credited) with no stated correction.

### 16. Accessibility promises don't reach the surfaces most at risk
SCENARIO: (a) a Switch Control user meets a swipe-shaped interaction on the onboarding cards or the §14 diff Apply/Decline UI; (b) a dexterity-limited user tries to operate the rest timer's adjust/skip buttons, not just perceive its alerts; (c) a VoiceOver user hits the new mid-workout "Work around this" sheet (§17).
WHY IT FAILS: §27 names "drag/long-press-only interactions" for remediation, never swipe — a different gesture class Switch Control also cannot perform. §27 commits to the timer's "sound+haptic+visual channels" (perceptual redundancy) but never to its controls' operability. §27's "new surfaces" list (cards, Movement & capability, diffs, notices) omits the mid-workout sheet, and R4 already documents unresolved RN Modal focus issues this codebase's new diff/warning modals inherit with no named fix.
EVIDENCE: ARCHITECTURE §27; CONSOLIDATED-EVIDENCE-MAP §12 (R4 Modal-focus finding).
WHO IT HARMS: Switch Control, dexterity-limited, and screen-reader users — on the newest UI the campaign itself adds.

### 17. Generated (Pro) plans get no equipment-transition/setup-burden check at all
SCENARIO: a seated user's generated plan alternates floor-adjacent and standing-machine exercises requiring repeated transfers within one session.
WHY IT FAILS: Amendment Deliverable 2's §17 quality-gate checklist (coverage/volume/frequency/fatigue/equipment transitions/setup burden/session duration) is stated as validating curated LIBRARY families "before listing" — it is never named as applying to CC27's generation engine. No §8.2 axis models transition burden between consecutive exercises at all (each axis is per-exercise). A generated plan can therefore combine individually-eligible exercises into a sequence that is, in practice, an "impossible equipment transition" for the user, with no check anywhere in the generation path.
EVIDENCE: ROADMAP-CC26-PLUS.md Amendment Deliverable 2 (checklist scoped to "listing," i.e. library); ARCHITECTURE §8.2 (per-exercise axes only), §13 (generation).
WHO IT HARMS: seated/floor-transfer/balance-limited users on generated (Pro) plans specifically — the library gets a check the generator does not.

---

## §29 SCENARIO SCORECARD

1. Experienced wheelchair lifter gets beginner content — PARTIAL: generation OK (orthogonal experience gating); library "experienced tiers where coverage supports" is a v1 hedge, not a guarantee (Amendment Deliverable 2).
2. One-arm user gets symmetrical instructions — PARTIAL: exercise selection fixed by §16/resolver; per-exercise instruction/cue TEXT for chosen unilateral exercises is never audited for symmetric-form wording.
3. Blind user in the logger — PARTIAL: core path + named new surfaces covered (§27); mid-workout capability sheet and check-in screen aren't in §27's explicit list; R4's known Modal-focus bug unaddressed for new diff/warning modals.
4. Dexterity user vs rest-timer controls — NOT PREVENTED: §27 covers redundant sensory output, not operable-control target size (attack #16).
5. Hearing user vs audio cues — PREVENTED: §27 names sound+haptic+visual redundancy explicitly.
6. Learning-disability user vs setup language — PARTIAL: onboarding cards get explicit COGA treatment; Art 9 consent-text legal-precision needs are never reconciled with plain language.
7. Forced diagnosis disclosure — PREVENTED: no free-text field anywhere in v1 schema (CAP-3/CC-D13); custom-exercise question is single-axis structured.
8. Condition-labelled routine assumes uniform capability — DEFERRED not live (Layer-2/CC-F3); no future mechanism yet requires population routines to ALSO pass through individual capability cards.
9. Full-body family with no pulling coverage — PARTIAL: Amendment §17 checklist named; pass/fail threshold and ship-with-gap-vs-block behaviour unspecified.
10. Impossible equipment transitions — NOT PREVENTED for generated plans (attack #17); library-only check.
11. Free support accidentally Pro-gated — PREVENTED: CAP-19 mechanical guard test + CF-11 baseline; best-defended claim in the document.
12. Custom movement excluded from progression — INVERTED, NOT PREVENTED: manual workaround adds outside the swap-flow gain no cause and wrongly count as durable evidence (attack #14).
13. Permanent "modified" badges — NOT PREVENTED: no role-scoping guard stated (attack #1).
14. Premature marketing claims — MOSTLY PREVENTED: explicit "NO for every row" + wording-guard wiring; gap is reach into founder/marketer copy authored outside the pipeline.
15. Wrong unilateral volume accounting — NOT ADDRESSED: only per-side logging is discussed; per-side volume-allocation math is never raised (attack #15).
16. Library search hiding compatible routines — MOSTLY PREVENTED: explicit no-segregated-shelf, computed compatibility; keyword-search path vs chip-browse path not explicitly unified.
17. Rehab-crossing content — PARTIAL: system-generated copy is guarded; the pre-existing 552-exercise library's own text was never retroactively audited (attack #13).
18. Disabled user + unrelated temporary injury collapsing — MOSTLY PREVENTED: role axis + per-muscle affected scope is genuinely well-modelled; §19's check-in wording doesn't name which of 2+ concurrent episodes it means.
19. VoiceOver dies in active workout — NOT ADDRESSED: explicitly out of this campaign's stated boundary (§27 covers authoring, not assistive-tech-failure/state-recovery resilience).
20. Switch Control vs swipe-only actions — NOT PREVENTED: §27 names drag/long-press alternatives; swipe is a different, unnamed gesture class (attack #16).

---

## WHAT WAS TRIED AND COULD NOT BE BROKEN

Tried to find a free-tier Pro-gate leak inside the capability mechanisms themselves (screen- and call-site-level): could not make it concrete — CF-11's all-nutrition/coaching baseline plus CAP-19's explicit CC26 mechanical guard-test commitment is the best-defended claim in the document. Tried to break CAP-3's no-diagnosis promise via the custom-exercise flow and the "clinician has given restrictions" card: could not — both are genuinely structured/single-axis, no free-text field exists anywhere in the v1 schema. Tried to break the baseline/episode role separation itself (collapsing a permanent disability into episode "injury" machinery or vice versa): the data model (two roles, per-muscle affected scope, separate settings sections) held up — the only crack found was the unscoped session-effects/quiet-line trigger (attack #1), not the underlying role model.

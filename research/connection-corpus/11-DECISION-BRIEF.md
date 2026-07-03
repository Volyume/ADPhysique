# 11 : Connection, Belonging & Discovery: Decision Brief
**Date:** 2026-07-03. **Author:** synthesis session (Fable).
**Status: NOTHING HERE IS APPROVED.** This is a decision brief, not a build order. The founder green-lights one direction, rejects, or combines elements; only then does any build begin.
**Evidence base:** `00-HANDOFF-TO-FABLE.md` + the full corpus behind it, as hardened by `10-fable-hardening.md`. Every mechanic proposed below is grounded in the retention layer (teardown dims 11-16) or explicitly labelled a bet. All hard constraints hold: deterministic no-AI engine, ED/calm inheritance on every surface, GDPR Article 9 derived-only sharing, locked free/Pro split, no new dependencies, no feed, no ranking, no shame, no stranger surface.

---

## 0. THE SHARED FOUNDATION (applies to every direction)

These items are common to all three directions because the evidence and the constraints demand them regardless of strategy. Presenting them once avoids padding each direction.

### 0.1 The discoverability and quality fix (the brief's own mandate)
Today the feature has ONE living entry point: a "Partner" NavTile at the bottom of the Progress tab's Explore grid, below eight other sections (A2 §5.1). The slim status row built FOR ConsistencyScreen (`PartnerRow.js`, fully built and tested) is wired nowhere (A2 §5.2). The Headspace Buddy lesson (73% non-adoption attributed to burial, not to calm-audience rejection; hardening §1.6) says adoption cannot even be measured until burial is fixed. The fix, identical in every direction:

- **One canonical destination**, reachable from two calm, sensible places, no new Home banner (the Home one-banner chain already has eight claimants; adding a ninth is anti-precedent, A2 §4):
  1. **You tab**: a first-class row in the existing settings-list idiom. Relationships live near identity. Zero Home-slot cost.
  2. **ConsistencyScreen**: wire the already-built PartnerRow. It was designed, written and tested for exactly this spot; shipping it is completion, not construction.
- **The Progress Explore tile stays** but is promoted out of last place and given honest copy (what it is, in one line), not just a label.
- **The post-workout beat stays** as the ambient surface for already-connected users (it is the only surface that reaches users who did not go looking, A2 §5.1) and remains gated exactly as today (never under calm suppression, never read-only, Pro).
- **No pressure mechanics anywhere**: no nudge banner, no badge counting, no "invite a friend" push. Presence through placement and legibility only. The calm rules hold absolutely.

### 0.2 The premium register (look and feel, all directions)
Reference standard: the free-trial screen (the founder's stated benchmark for quietly expensive). Applied here:
- Built entirely from the existing token system and the E1 motion language plus E15 signature elements; zero new visual vocabulary, zero hard-coded values. This is the same app levelled up, not a bolted-on module (the cohesion audit's style-drift warning binds).
- **The privacy receipt becomes the brand's hero moment.** It is already the most trust-dense copy in the app ("what they will see, what they never will", A2 §5.3). Rendered as a considered, beautifully typeset two-column moment rather than utility copy, it becomes the thing screenshots get taken of. Calm apps win trust with what they refuse to share; this is Volyume saying it out loud, premium.
- **The invite is a designed journey, not a share-sheet toss**: a named, unhurried three-beat flow (what this is, what crosses and what never does, send the code), then a quiet pending state.
- **Empty state**: one elegant card that explains, in coach voice, what pairing is and is not. No urgency, no social-proof counters, no FOMO.
- Connected state: a single pair (or crew) card carrying the week arcs, the streak line in weeks, the resting label rendered as rest-positive (amber-calm, per the deload banner's Class C precedent), and the one cheer affordance.

### 0.3 The safety and correctness debts (shipped-today bugs; every direction pays them)
From A1 §9 and A4, these exist in production NOW and are packaged into whichever direction is chosen:
1. **Lapsed-partner data-layer gate** (A1 §9.4): tier enforcement moves to the data layer (RPC/RLS) so a lapsed Pro stops pushing signals into an invisible pairing. Gating at the UI route only is the documented failure.
2. **Single-mint invite tokens** (A1 §9.5): kill the multi-invite loophole that can create invisible extra partnerships.
3. **Invitee code preservation** (A1 §9.3): an invited free user must not have the code silently dropped at the paywall; the code survives whatever screen the tier decision sends them to.
4. **Block UI** (A1 §11.5): the blockPartner primitive exists with no entry point; it gets one. A safety primitive without UI is not a safety feature.
5. **Consent row** (hardening §3.1, treat-as-required): on first pairing, write an append-only `consent_log` row with a new additive `partner_sharing` enum value, capturing timestamp, notice version and the accept act; record withdrawal on unpair. One additive migration, founder-run, per supabase rules.
6. **Sign-out wipe inconsistency** (A1 §8.5) folded in.

### 0.4 Scope boundary held everywhere
The deterministic coach engine is not touched. Weaving partner/crew references into weeklyCoach narrative would touch an ED-locked module and is explicitly OUT of every direction below; if ever wanted, it is its own founder-gated decision. The shared data model is not widened: the current derived field set (weekly tick count vs own plan, streak weeks, resting label, one cheer/day, block name) is validated unchanged by the hardening pass (§3.2, §3.3); real-time signals stay rejected.

---

## PART 1 : THE STRATEGIC DIRECTIONS

Three genuinely distinct answers to "how Volyume does connection." Each is defensible; none is a strawman. Stranger discovery is not among them because the hardening pass killed it on three independent blades (regulation, moderation economics, and Volyume's own shipped privacy promises); see Part 3.

---

### DIRECTION 1 : "PARTNERS": finish the pair, all-in on the dyad

**The one-line strategy:** commit to 1:1 as Volyume's permanent connection model; complete, polish and brand the pair to the trial-screen standard; unlock what is already built but unreachable.

**Unit and safety axis.** Strictly symmetric dyads. Both sides see the identical derived field set of each other; there is no follower asymmetry, no audience, no counters. Up to 3 concurrent pairs on Pro (the cap already coded in `usePartners.canAddPartner` but unreachable in the shipped single-primary UI, A1 §9.1). Critical isolation rule: **pairs never see each other**. Partner A never learns partner B exists; there is no roster view that juxtaposes people, so no one can be implicitly ranked even by the account holder's own eye. Multi-pair renders as separate cards, each a private world. This clears the asymmetric-visibility axis by construction.

**Discovery stance.** None. Out-of-band code/link only, exactly as shipped. This keeps the OSA posture at its safest (pre-existing relationships, invite-gated; hardening §2.1) and needs no moderation build beyond the block UI in §0.3.

**Mechanics added (each grounded):**
- **Milestone moments** (the Duolingo transferable kernel: celebration and recognition, hardening §1.2; kudos causality, hardening §1.1): when a partner completes a training block, keeps week N of the shared streak, or hits a PB, the other side sees a cheer-able moment card on the Partners surface and in the post-workout beat. Strictly training-derived events only (never weight, food or body data), rendered in the identity register. Cheer stays capped at one per day (the existing DB constraint is the rate limiter); moments do not add push notifications beyond the two existing budgeted partner pushes. ED inheritance: outbound moments freeze under the sender's open ED flag exactly as the weekly signal already freezes to resting (A4 §7.6); inbound rendering suppresses under the recipient's calm/ED state via the standard fail-closed read.
- **Multi-pair unlocked (Pro)**: the "up to 3" promise becomes real, with the pair-isolation rule above. Duolingo's cap-of-5 precedent says a small hard cap is a design feature, not a limitation (hardening §1.1); ours stays 3.
- **Shared block adoption stays** as shipped (name-only crossing).

**Placement.** §0.1 spine. The destination screen is `Partners` (plural), a stack screen reachable from You tab row + Consistency row + Progress tile; post-workout beat unchanged.

**How it pins together.** One unit (isolated pairs), one surface (the Partners destination plus two calm entry rows and the post-workout beat), one safety spine (invite-gated, derived-only, block UI, consent row, data-layer tier gate). Nothing ranks because nothing is ever juxtaposed: not people against people, not pairs against pairs.

**The bet.** The dyad is the only in-app-PROVEN connection unit: Duolingo's 22% completion lift is pairwise streaks [DOCUMENTED]; the spouse-pair study shows 6.3% vs 43% dropout [DOCUMENTED]; Whoop is retreating from rosters to 1:1 [DOCUMENTED, in-testing]. What must be TRUE for this to win: (a) a meaningful share of users have at least one person to invite, (b) the invite loop is not strangled at the paywall (see pricing), (c) the Headspace hypothesis holds, i.e. burial rather than disinterest explains today's low pairing.

**What kills it.** Telemetry after the placement fix shows pair formation stays near zero. That would mean this audience trains alone by preference (the Strong / Gentler Streak / Fitbod / MacroFactor natural experiments all thrive with zero social), and the premium brand spend was decoration on a ghost town.

**Effort and sequencing.** SMALL-to-MEDIUM. Rides the existing schema, sync registry, RPCs and guard tests end to end; the heavy pieces are the destination screen rebuild to the premium register and the §0.3 fixes. Sequence: safety debts → placement spine → premium destination → milestone moments → multi-pair unlock. Riskiest piece: the invite-loop economics through the Pro gate (a commercial call, below), because no amount of polish fixes a structurally throttled loop.

**Upgrade path from today.** It IS the upgrade path: nothing shipped is discarded; the feature is completed rather than replaced.

**Naming (Variable 3).** `Partners`. Plain, legible, single-word, exactly matching the app's nav vocabulary (Train, Plans, Diary, Progress, You). "Your partner" in copy; "Partners" as the destination. No invented brand noun; the calm register does not do cute names.

**Pricing (locked split respected; founder call).** Connection is not nutrition/coaching, so its gate is genuinely a commercial choice, not a locked-split consequence. Current state: fully Pro-gated (founder decision, 2026). The structural fact the founder should decide WITH: **a fully Pro-gated social feature cannot spread**, because the invited side hits the paywall and the code is dropped (A1 §9.3); pairing requires two valid sides, so the loop dies at every free invitee. Options, in rising openness: (a) keep Pro-only, accept connection as a pure Pro-retention differentiator with a low adoption ceiling; (b) **invitee-free acceptance**: initiating a pair stays Pro, but an invited user can accept and hold ONE pairing free regardless of tier; Pro remains the initiator/multi-pair differentiator while the loop unblocks; (c) free = 1 pair for everyone, Pro = 3. Evidence note only (not a recommendation): every proven pair mechanic in the corpus is free at the point of connection (Duolingo, Finch, Strava kudos).

---

### DIRECTION 2 : "CREW": the small known-people group

**The one-line strategy:** generalise the pair into one crew of 2 to 5 known people; bet on belonging and redundancy rather than dyadic reciprocity.

**Unit and safety axis.** One crew per user (not N crews), 2 to 5 members, invite-gated, every member symmetric: identical rights, identical derived fields, any member can leave or end their own sharing at any time. The safety-critical rendering rule, learned from Whoop Teams (roster comparison read as awkward even unranked; the market is retreating from it, hardening §1.4): **collective-first rendering**. The crew's week is one object ("Three of four of you trained this week"); individual members appear only as a list of calm state labels (Trained / Resting), never as a juxtaposed tick-grid, never with counts side by side, never ordered by anything except joining date. No member is ever named as the one who did not train; crew copy is written about the crew, not about people ("The crew kept its fourth week" and never "Everyone but Sam trained").
- **Crew streak is additive-only**: a week counts for the streak when every non-resting member trained; a missed week simply does not add, it never breaks, and it is never attributed. This deliberately rejects Habitica's interdependent-damage mechanic (shame by design, corpus verdict "works but flawed").

**Discovery stance.** None. You assemble a crew from people you already know, by code/link. Same OSA posture as Direction 1.

**Mechanics.** The pair's proven set, generalised: weekly derived tick per member (vs each person's OWN plan, never a shared standard, so different training ages never rank), resting label, one cheer per member per day, crew milestone moments (crew streak weeks kept, a member finishing a block, rendered collectively), shared block proposal to the crew. Nothing else crosses; the "never" list holds per member.

**Placement.** The §0.1 spine, with the destination named `Crew`. Post-workout beat becomes co-occurrence, not comparison: "Sam and Priya trained today too" (fact of company, no numbers).

**How it pins together.** One unit (the crew), collective-first rendering as the anti-comparison mechanism, the same invite-gated safety spine, per-member consent rows, per-member deletion on leave (the pair's deletion promise, extended by the existing belt-and-braces trigger pattern, A4 §7.8).

**The bet.** Two wagers, honestly labelled: (a) **redundancy** [INFERRED, hardening §1.3]: a pair has a single point of failure and the Duolingo review-mining documents the resentment when one friend quits; a crew survives one lapser; (b) **belonging**: real-world group-exercise evidence is strong (true-group settings beat solo on attendance/dropout; ~69.1% community-programme adherence; parkrun's social-identification effect) [DOCUMENTED, real-world only]. What must be TRUE: users can actually assemble 3+ known people who train (harder than finding one), and collective-first rendering genuinely defuses the comparison matrix for vulnerable users.

**What kills it.** Two things. First, formation economics: if inviting ONE person is already rare, requiring two-plus is rarer; the crew could be a beautifully engineered empty room. Second, the comparison matrix: if user testing or the ED review finds that even calm state-labels co-visible across 4 people read as ranking to a vulnerable user, the core rendering premise fails, and there is no fallback that preserves the crew concept. Also honestly: **no in-app small-group precedent has worked cleanly anywhere in the corpus** (hardening §1.4); every existing example is a warning. This direction has the weakest evidence floor of the three.

**Effort and sequencing.** LARGE. New tables (crew, crew_members, crew_weeks, crew_cheers), new RPC set, RLS, sync-registry shape (the pair registry entry is the only non-user-scoped one today; crews add a second), migrations founder-run, the allowlist privacy guard extended, per-member consent, and a genuinely new moderation surface (any member can be a bad actor to N-1 others; block semantics inside a crew need design: block = leave + prevent re-invite). Riskiest piece: shame-proofing the collective view, which is a design problem with an unforgiving failure mode.

**Upgrade path.** The pair becomes a crew of 2; existing pairs migrate losslessly (same derived fields). One mental model replaces two. But note the cost: this re-platforms the shipped feature rather than completing it.

**Naming.** `Crew`. Calm, plain, British, non-gamified (Squad is gamer, Team is corporate, Circle is cultish). "Your crew" in copy.

**Pricing.** Same structural insight as Direction 1. Options: free = pair (a crew of 2), Pro = crew up to 5; or Pro-only crew with invitee-free acceptance. The multi-member invite loop makes the paywall question N times more consequential.

---

### DIRECTION 3 : "PROVE IT FIRST": the smallest honest slice, then data decides

**The one-line strategy:** refuse to bet yet. Ship only the shared foundation (§0.1 to §0.3: placement, premium shell, safety debts, consent row) plus adoption telemetry; define numeric bars in advance; expand into Direction 1 or 2 only if this audience demonstrates it wants connection at all.

**Unit and safety axis.** The shipped pair, unchanged (single primary pair, symmetric, invite-gated). No new mechanics, no multi-pair unlock, no milestone moments.

**Discovery stance.** None, unchanged.

**What ships.** Exactly §0.1 (placement spine), §0.2 (the premium destination and invite journey; the brand fix is IN scope because without it the measurement is confounded by burial, hardening §1.6), §0.3 (all safety debts and the consent row), plus a small telemetry set through the existing `engineTelemetry` rail (counts only, no PII, consistent with the observability rules): tile/row views, invite journeys started, invites sent, codes redeemed, pairs active at week 2 and week 6, cheers sent per active pair, unpair rate.

**The decision bars (set by the founder before shipping, so the data cannot be argued with afterwards).** Illustrative shape, numbers the founder's to set: if fewer than X% of 60-day-active users form a pair within two months of the placement fix, connection stays exactly this size and the roadmap invests elsewhere; if X% to Y%, green-light Direction 1's mechanics; if above Y% AND a measurable share of paired users attempt a second invite (the cap-collision signal), Direction 2 enters consideration.

**The bet.** That the honest reading of the corpus is "maybe this audience does not want it": Strong is a large, healthy, long-lived logger with no feed and no social; Gentler Streak retains on the solo coach relationship alone; Fitbod ran 11 years solo; MacroFactor is social-free by design; Finch's social attribution is unknown; the kudos study is n=329 committed club runners [all per corpus verdicts + hardening §1.1, §1.5]. The cheapest true information available is "does OUR audience pair when the feature is findable and beautiful?", and this direction buys exactly that information at minimum spend.

**What kills it.** As a strategy: time. The measurement window costs a quarter of connection momentum, and a thin surface may underperform precisely because it is thin (a self-fulfilling null: no moments, no multi-pair, nothing to come back to). If the founder believes connection is strategically necessary for where Volyume is going, deferral is itself a decision with a price.

**Effort.** EXTRA-SMALL to SMALL. Almost entirely §0 work that every direction pays anyway; the only unique cost is the telemetry set.

**Upgrade path.** Perfect by construction: Directions 1 and 2 both begin with exactly this slice; nothing is thrown away, the decision is simply made later and with data.

**Naming.** `Partners`, as Direction 1 (the shell is the same).

**Pricing.** Unchanged today (Pro-gated), BUT the founder should note: keeping the full Pro gate during measurement will suppress the very signal being measured (the §9.3 paywall drop). Minimum honest variant: fix the code-preservation bug so the funnel is at least visible end to end, and read the paywall-abandonment step as its own data point.

---

## PART 2 : THE FAVOURED DIRECTION, ARGUED BOTH WAYS

### The pick: DIRECTION 1, "Partners", with Direction 3's telemetry bars built into its sequencing.

To be precise about what that means: build Direction 1 in its stated sequence (safety debts → placement spine → premium destination → moments → multi-pair), instrument everything from the first commit exactly as Direction 3 specifies, and treat the multi-pair unlock (the last, cheapest step) as gated on the telemetry confirming pairs actually form. That is not a hedge between directions; it is Direction 1's own risk management.

### The case FOR (on the evidence, not taste)
1. **The dyad is the only in-app-proven unit.** Every hard number in the hardened corpus is pairwise: Duolingo's 22% completion lift with a deliberate cap [DOCUMENTED], the spouse study's 6.3% vs 43% dropout [DOCUMENTED], kudos causality between individuals [DOCUMENTED]. Every in-app GROUP precedent is a warning, and Whoop is actively retreating from rosters to 1:1 [DOCUMENTED, in-testing]. Direction 2 asks Volyume to succeed where Whoop, Habitica and Headspace did not, on an [INFERRED] redundancy argument.
2. **The app has already half-decided this.** The 3-pair cap is coded, the Consistency row is built and tested, the block primitive exists, the privacy/consent/deletion seams are production-hardened (A4 §8). Direction 1 completes existing engineering; Direction 2 re-platforms it. Per unit of founder-run migration risk and per token of build effort, Direction 1 buys the most finished product.
3. **The Headspace confound cuts in favour of building, not waiting.** The strongest evidence FOR Direction 3 (calm audiences ignore social) is contaminated by burial. Volyume cannot learn whether its users want connection until placement is fixed and the surface is worth arriving at; a premium, complete pair is the cleanest possible experiment as well as a shippable product. Direction 1 gets the answer AND the feature; Direction 3 gets only the answer.
4. **It is the only direction whose failure mode is cheap.** If pairing stays rare, Direction 1 has still shipped: the safety debts paid (which were owed regardless), a premium surface that upgrades perceived app quality (the brief's own complaint), and telemetry that settles the question. Direction 2's failure strands new schema, a new sync shape and founder-run migrations on an empty room.
5. **The anti-comparison discipline is structurally easiest in a dyad.** One other person, isolated pairs, nothing juxtaposed. The crew needs an actively-designed defence (collective-first rendering) against a comparison matrix it creates itself; the pair simply does not create the matrix.

### The case AGAINST (the smart sceptic, not softened)
1. **You may be polishing something this audience will never use.** The strongest natural experiments in the corpus (Strong, Gentler Streak, Fitbod, MacroFactor) all thrive with zero social. Volyume's own pairing numbers to date are low. If the true cause is disinterest rather than burial, Direction 1 spends premium design effort on a ghost town, and Direction 3 would have bought the same lesson for a third of the cost. The 22% Duolingo lift is a different audience (language learners, median casual) and the spouse study is not an app.
2. **The invite loop may stay throttled anyway.** If the founder keeps the full Pro gate and declines invitee-free acceptance, every free invitee still dies at the paywall, and Direction 1's ceiling is structurally low no matter how beautiful the surface. In that world the honest move is Direction 3: do not gold-plate a loop you have chosen to keep closed.
3. **Multi-pair might be vanity.** If barely anyone forms one pair, the unlocked cap of 3 is irrelevant engineering. (Mitigated by sequencing it last and gating it on telemetry, but the sceptic notes that "we will gate it" often becomes "we built it anyway".)
4. **The belonging upside is forgone.** If Volyume's audience does contain ready-made training groups (gym trios, WhatsApp lifting chats), Direction 1 serves them awkwardly (three separate isolated pairs rather than one crew), and retrofitting crews later means re-branding and re-migrating a second time. The corpus's real-world group evidence is genuinely strong; Direction 1 deliberately leaves it on the table.

### What would change my mind
- **To Direction 3:** the founder keeps the full Pro gate with no invitee concession. A structurally closed loop removes Direction 1's main upside; measure first instead.
- **To Direction 2:** telemetry after Direction 1's placement fix shows strong pair formation AND a meaningful rate of cap collisions and chain-invites (users trying to add a second and third partner, invitees inviting onward). That is the audience saying "we come in groups", and it converts the crew's [INFERRED] redundancy bet into observed demand.
- **Also to Direction 2:** any real-world signal (support mail, reviews, invite patterns) that Volyume users predominantly train in pre-existing groups rather than pairs.
- **Abandon all three:** if after the placement fix, telemetry shows near-zero invite journeys even STARTED across a full quarter, the audience has answered; connection stays a finished, safe, minimal pair indefinitely and the roadmap moves on.

---

## PART 3 : THE KILL LIST

Considered and rejected outright. Each entry names the discipline that killed it.

1. **Stranger discovery or matching in any form** (search, suggestions, swipe, "athletes near you"): killed on three independent blades: UK Online Safety Act duties plus Ofcom's small-but-risky supervision posture make it a standing regulatory liability for a solo founder [DOCUMENTED, hardening §2.1]; a credible trust-and-safety stack is a Bumble-scale operation [DOCUMENTED]; and the only demand evidence is absent while the buddy-finder category died too quietly to obituarise [INFERRED]. It also inherits the full ED-exposure red flag [DOCUMENTED general literature].
2. **Location or gym-based anything** (parkrun-style "who trains at your gym"): would break the shipped, user-facing promise that location never crosses (A1 §5.5 "never" list). A privacy promise once published is load-bearing; no feature is worth breaking it.
3. **Any feed** (activity feed, discover feed, follower timeline): anti-pattern B2; feeds import comparison and are the thing Volyume exists to not be.
4. **Leaderboards of every scope**: global, friends, club, or "soft" comparative bars (Whoop-style side-by-side metrics). The harm evidence is the strongest in the corpus (r = 0.36 to 0.454 with ED symptoms and body-image harm; Fitocracy dead; Hevy churning new users) [DOCUMENTED].
5. **Public profiles and follower graphs**: asymmetric visibility is implicit ranking, and silent stranger comparison (Hevy's model) is a consent violation by design [OBSERVED in corpus].
6. **Per-member tick grids in any group view**: a proto-leaderboard; the Whoop Teams lesson. If a crew is ever built, collective-first rendering is mandatory, not optional.
7. **Guilt and obligation copy** ("don't let Sam down", "a real friend honours the streak"): Duolingo's engine, explicitly forbidden fuel here; autonomy/relatedness frustration is documented as the abandonment driver [DOCUMENTED evidence.md §B3].
8. **Interdependent penalties** (Habitica's party damage): shame by mechanism, not just by copy.
9. **Daily visible streaks with breakage**: the weekly rest-safe streak stays; daily flames and break-shame are anti-pattern C1.
10. **Real-time presence** ("your partner is mid-session right now"): surveillance-adjacent, zero retention evidence in the corpus, and it manufactures a new pressure surface (handoff Q1 option D, rejected).
11. **In-app direct messaging**: the harassment vector every stranger-adjacent teardown documents (Strava's December 2023 messaging launch and its complaint wave) and a permanent moderation liability. The one-cheer-per-day constraint plus the block primitive IS Volyume's entire messaging surface, deliberately.
12. **Any body, weight, food or coach-content data crossing between users, in any direction, ever**: Article 9 and the ED architecture are absolutes. Training-attendance derivatives against a person's OWN plan are the entire shareable universe.
13. **A Home-slot connection banner**: the one-banner chain has eight claimants and a documented invariant; connection does not get to be the ninth (A2 §4). Placement is solved in calmer real estate.
14. **Gamified connection currency** (XP for cheering, badges for streaks kept together): gamification burnout is documented [evidence.md §B2], and it would import a second economy into an app whose register is calm.

---

## WHAT HAPPENS NEXT (decision, not build)

The founder picks one of:
- **GO Direction 1** (recommended): the full sequence in Part 1.1, telemetry from day one, multi-pair gated on data. The pricing sub-decision (Pro-only vs invitee-free vs free-pair) should be made alongside, because it sets the loop's ceiling.
- **GO Direction 2**: accept the larger build and the weakest evidence floor for the bigger belonging bet.
- **GO Direction 3**: buy the answer first at minimum spend; revisit this brief with data.
- **Combine or reject**: any element-level mix; the shared foundation (§0) survives every combination.

No code, schema, or copy changes until that call is made.

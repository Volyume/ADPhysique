# Partners — Deep-Dive Audit (O6)

**Workstream:** Volyume Elite Audit · founder-priority. **Scope:** read-only. **Date:** 2026-07-04.
**Method:** every claim traced to source (`src/lib/partners/`, `src/screens/PartnerScreen.js`,
`src/hooks/usePartners.js`, `src/lib/notifications/`, `supabase/migrate_100/_102`) and cross-checked
against the shipped prior art: `docs/partners-build-2026-07-03/DESIGN-SPEC.md`,
`docs/bp-partner-system-rebuild.md`, and the 38-competitor `research/connection-corpus/`
(evidence.md, 11-DECISION-BRIEF.md, internal/A1–A4). Prior art was verified against code, not redone.

---

## Executive summary (10 lines)

1. **Verdict: a completed, premium, genuinely safe 1:1 system — architecturally central-ready, but experientially thin.** It is not a sloppy bolt-on; it is a *deliberately minimal* one.
2. The entire mechanic is **one derived weekly boolean** (trained-vs-own-plan) + a joint streak + **one cheer per day**. There is categorically no other information exchange (A1 §14).
3. **Partner→partner interaction is near-passive:** a single wordless cheer/day is the whole channel. No reactions, no nudge, no acknowledgement variety, no shared commitment. By lock, no messaging.
4. **The privacy receipt, deletion-on-unpair, safety-consent rail and three-layer ED freeze are real, verified differentiators** — best-in-class and screenshot-worthy. This is where the feature is elite.
5. **The peak social moment the feature can produce today is weak:** a calm milestone card ("Another week you both showed up.") plus a hand icon. Emotionally low-voltage.
6. **Integration is shallow by design/lock:** nothing links a partner to goals, achievements, weekly coach or progress. Only attendance, a block *name*, and two milestone booleans (PB / block-complete) cross.
7. **Discoverability was fixed** (You-tab row + promoted Progress tile) but the Consistency row was pulled; `PartnerRow.js` is now fully-built, fully-tested **dead code** with stale docstrings pointing at it.
8. **Waiting/limbo and quiet-partner states are calm but inert:** nothing notifies you when a partner *accepts*; a ghosting partner produces literally nothing — safe, but no help to reconnect.
9. Design-system adherence is excellent: token-pure, `BackHeader`/`Card`/`BottomSheet` reused, house voice held. Visually and tonally Partners **is** the app, not a module bolted on.
10. **The "make it central" question is strategic, not a bug list** — the DECISION-BRIEF already framed it as Directions 1/2/3; the current build is Direction 1 largely executed. Three system options below respect every lock.

---

## The ten founder questions, answered

### Q1 — What does the partner system ACTUALLY do today?
Full capability table below. In one line: invite (single-minted code, shared via SMS/WhatsApp/email/share-sheet), accept (server RPC + fail-closed consent), see a partner's weekly trained-vs-own-plan tick, a no-blame joint streak in weeks, at most one milestone moment/pair/day, one cheer/pair/day, a shared-block *name* proposal, block a person, and end/unpair with verified deletion. Two partner pushes exist (cheer received, streak kept). Free = 1 pair, Pro = up to 3.

### Q2 — What user job does it serve, and is it expressed in the UI?
**Job:** "quiet accountability — one person I trust knows whether I showed up." This is expressed *well* in copy: empty-state body (`PartnerScreen.js:580-583`), the HOW IT WORKS card (`:585-594`), Beat 1 "A partner, not an audience" (`:740-743`), and the privacy receipt. The job is **stated more clearly than it is delivered** — the copy promises a felt relationship; the mechanic delivers a weekly status glance.

### Q3 — Flow quality (invite → accept → daily life → unpair)
- **Invite:** 3-beat modal, one minted code, 3 share channels + share-sheet (`:718-800`). Low friction, premium. Single-mint prevents the old multi-invite loophole (`usePartners.js:174-180`, migrate_102).
- **Waiting/limbo:** a slim card, "Invitation sent. Waiting for your partner." + expiry + cancel (`:697-716`). **Bare:** no re-share, no "who/when," and **no push or in-app signal when the partner accepts** — the pending card silently becomes a PairCard only on the next screen open/sync. This is the weakest step. Friction: low; *feedback*: near-zero.
- **Daily life:** passive. You open the screen (or see the post-workout beat) and read a line. The only action is one cheer.
- **Partner goes quiet:** **calm-brand PASS.** Rest/quiet weeks hold the streak, never attribute a miss to a person, never render red (`sharedStreak.js:31-98`; `PartnerScreen.js:145-147,199` amber-calm dot). No guilt copy anywhere (`partnerBeats.js` header). But the system also does **nothing** to help reconnect — silence is inert.
- **Unpair:** one confirm, deletion promise stated and *true* (see What is good). Clean.

### Q4 — Accountability / motivation mechanics: exists vs absent
- **Exists:** weekly attendance signal; no-blame joint streak (weeks); one cheer/day (wordless, 1-tap); milestone moments (streak-week-kept / partner-completed-block / partner-hit-PB); optional shared-block *name*; two partner pushes.
- **Absent:** any mutual commitment/shared goal object; any streak *competition* or numeric comparison (deliberately killed, Kill List #4); check-ins between partners; encouragement variety; free-text or reactions; nudges. **The only partner→partner interaction beyond passive viewing is the single daily cheer** (`service.js:104-116`) — one boolean of encouragement, rate-limited by the DB. That is the entire social surface, by design (Kill List #11: the one-cheer + block *is* the whole "messaging" system).

### Q5 — Emotional / social value: is it motivating as built?
Modestly. The evidence base (Duolingo Friend Streak +22%, spouse-pair study 6.3% vs 43% dropout — `bp-partner-system-rebuild.md:20-32`) is pairwise and real, but those rely on a *felt* streak and reciprocal nudges. Volyume's streak is rest-safe and weekly (lower stakes, lower pull), and its "nudge" is one wordless icon. **Peak moment today:** a milestone card ("Another week you both showed up.") with an inline cheer, or the "N weeks running, together" RollingNumber hero (`PartnerScreen.js:165-182`). Considered and calm — but it is recognition *shown to* you, not a moment you *share*. There is no co-created high.

### Q6 — Integration depth (real data links, in code)
| Links to | Status | Evidence |
|---|---|---|
| Workouts / sessions | **Yes** (attendance only) | `weekSignalWriter.js:58-104` runs `computeWeekState` over `getWeeklySessionStats` |
| PBs / achievements | **Partial** (one boolean) | `getWeeklyPRCount` → `hit_pb` (`weekSignalWriter.js:48-49`); no achievement objects cross |
| Training blocks | **Partial** (name + one boolean) | `getBlockStatus` → `completed_block`; shared block is a *label*, not a synced plan (A1 §7, §14) |
| Progress photos | **None — locked** | device-only constraint; never crosses |
| Goals / targets | **None** | no goal object shared; target changes silently re-baseline (A1 §11.4) |
| Weekly coach | **None — locked out** | DECISION-BRIEF §0.4 keeps the ED-locked engine untouched |
| Reminders / notifications | **Yes (2 pushes)** | cheer-received + streak-kept (`scheduler.js:1338-1435`, `partnerBeats.js`) — **but nothing notifies you your partner accepted** |
| Diary / food / body / location | **None — locked** | Article 9 "never" list, source-guarded |

Depth is one signal wide. This is partly a hard lock (coach, food, body, photos) and partly a build gap (accept notification, goals, achievements).

### Q7 — Privacy / permissions
- **What is shared (schema-verified):** `partner_week_signals` = week_start, planned_count, done_count, week_met, state(training|resting), completed_block, hit_pb (`service.js:171-192`, migrate_102). `partnerships` = first names only (server-snapshotted from enrolment name, migrate_102 §6). `partner_shared_blocks` = one display *name* ≤80 chars + status, **no plan content** (migrate_100 header). Cheers = a boolean event. That is the entire universe.
- **How communicated:** the privacy receipt (`PartnerPrivacyReceipt.js`) — two columns, "THEY WILL SEE / THEY NEVER SEE," best trust copy in the app; shown in the empty state *and* as the recorded consent notice in invite Beat 2 (`:755-772`).
- **Granularity:** **coarse.** You cannot share workouts-but-not-streak, etc. The only per-relationship control is the `streakEnabled` toggle, and it is set **once, by the inviter, at invite time**; the invitee never sees or consents to it and there is no post-pair toggle (A1 §11.4). Everything else is all-or-nothing per pairing.
- **Safety-consent flow (migrate_102):** reads **trustworthy.** It appends a `partner_sharing` row to the same append-only `consent_log` rail as the Article 9 health consent, versioned by `PARTNER_PRIVACY_NOTICE_VERSION` (`consent.js`), **fail-closed on accept** (a failed consent rolls the pairing back — `service.js:84-88`), withdrawal recorded on unpair. This is a genuine differentiator, not theatre.

### Q8 — Tacked-on risk (design-system + voice)
**Low.** Every surface is token-pure (no hard-coded colours/sizes/durations), reuses `BackHeader`, `Card`, `BottomSheet`, `RollingNumber`, motion tokens, and the lock affordance (`PartnerScreen.js`, `PartnerPrivacyReceipt.js`). Voice is house-calm: British English, no em dash, no exclamation marks, no guilt (verified across screen + push copy). Visually and tonally Partners is indistinguishable from the core app. The "tacked-on" risk is **not** in the pixels — it is in the *thinness of the loop*: a beautiful shell around a single weekly boolean.

### Q9 — How best-in-class solves this (corpus + knowledge)
*[in-repo corpus]* DECISION-BRIEF Part 3 + evidence.md: Duolingo Friend Streak = deliberate 1:1 accountability (cap of 5), reciprocal nudges, celebration [DOCUMENTED]; Apple Activity Sharing still leaks calories/minutes/type + email — Volyume shares strictly less [DOCUMENTED]; Whoop is *retreating* from team rosters to 1:1 [in-testing]; Strava kudos = reciprocity is the active ingredient; Habitica interdependent-damage = shame-by-mechanic (rejected); Headspace Buddy 73% non-adoption attributed to *burial*, not calm-audience rejection. *[my knowledge]* the proven pairwise levers are: (a) a *shared, co-owned* object (streak/goal), (b) *reciprocal* lightweight encouragement, (c) *timely* recognition at the moment effort lands. Volyume has (a) thinly and (c) via the post-workout beat; (b) is throttled to one wordless tap. Every competitor lever that adds power via feeds/leaderboards/DMs is *correctly* killed here on ED/privacy grounds.

### Q10 — Options to make Partners a central elite system
See "System options" below.

---

## Capability table (what it does, from source)

| Capability | Built? | Where (file:line) | Notes |
|---|---|---|---|
| Invite via code | Yes | `service.js:30-52` (`create_partner_invite`) | Server mints code, stores hash only |
| Single-minted invite (no dupes) | Yes | `usePartners.js:174-180`; migrate_102 §3 | One live pending invite reused across channels |
| Share via SMS / WhatsApp / Email / sheet | Yes | `PartnerScreen.js:348-380,781-794` | All reuse the one code |
| Accept / redeem code | Yes | `service.js:60-95` (`redeem_partner_invite`) | not-self / not-expired / single-use / not-blocked, opaque `invite_invalid` |
| Fail-closed sharing consent on accept | Yes | `service.js:84-88`; `consent.js`; migrate_102 §2 | Rolls back pairing if consent write fails |
| Deep-link auto-redeem | Yes | `PartnerScreen.js:308-317` | Only when room to add |
| Paywall-preserved invite re-surface | Yes | `usePartners.js:100-117`; `pendingInvite.js` | Fixes A1 §9.3 |
| View partner weekly signal ("3 of 4") | Yes | `signals.js:12-30`; `usePartners.js:58-86` | Relative to *own* plan; derived only |
| Own signal push (keystone) | Yes | `weekSignalWriter.js:126-154` | Fire-and-forget on workout finish + focus |
| No-blame joint streak (weeks) | Yes | `sharedStreak.js:45-98` | Rest/quiet holds; archives after 4 quiet weeks |
| Milestone moments (streak/block/PB) | Yes | `moments.js:109-219` | ≤1/pair/day, PB capped 2/7d, 7-day horizon, fail-closed |
| Cheer (1 per pair per local day) | Yes | `service.js:104-116`; `signals.js:38-41` | Wordless; DB is limiter; downgrades to in-app-only under ED flag |
| Shared training block (name only) | Yes | `service.js:205-271`; migrate_100 | propose/adopt/leave; label + status, **no plan content** |
| Mute a partner | **No** | — | Not implemented (only end/block) |
| Block a person | Yes (UI now wired) | `PartnerScreen.js:457-480`; `service.js:123-135` | Was UI-less at A1 §11.5; Manage sheet now exposes it |
| End / unpair + real data deletion | Yes | `service.js:145-161`; migrate_092/100 | RPC purges signals+cheers+blocks, tombstones row |
| Multi-pair (Pro up to 3) | Yes (now reachable) | `PartnerScreen.js:536,545-566`; `signals.js:74-80` | Was unreachable at A1 §9.1; PairCards render per pair |
| Lapsed-Pro data-layer gate | Yes | `tierGate.js`; `weekSignalWriter.js:139-145` | Lapsed user's outbound signal forced to 'resting' |
| Cheer-received push | Yes | `partnerBeats.js:23-30`; `scheduler.js:1389-1408` | Framed as from the partner; <48h freshness |
| Streak-kept push | Yes | `partnerBeats.js:33-42`; `scheduler.js:1410-1435` | Only when run grows, ≥2 weeks |
| **Partner-accepted notification** | **No** | — | Silent; you learn only on next open/sync |
| **Mutual commitment / shared goal** | **No** | — | No shared target object exists |
| **Encouragement variety / reactions / nudge** | **No** | — | One wordless cheer is the whole channel (by lock) |
| Consistency-screen entry (PartnerRow) | **Removed** | `PartnerRow.js` unmounted | Built + tested; now dead code (stale docstrings) |
| You-tab entry | Yes | `YouScreen.js:96-109,225-235` | Live pair state sub-line; Pro-lock for free |
| Progress-tile entry (promoted) | Yes | `AnalyticsScreen.js:610-630` | Moved out of last place |
| Post-workout beat | Yes | `WorkoutSummaryScreen.js:207-228,848-882` | Ambient surface; ED/calm-suppressed, Pro |

---

## What is already GOOD (verified differentiators)

- **Deletion-on-unpair is REAL, not a claim.** `end_partnership` (migrate_092/100) hard-deletes the pair's `partner_week_signals`, `partner_cheers` and `partner_shared_blocks`, then tombstones the row; migrate_092's own header records that an earlier version *falsely* claimed a cascade did this — it was fixed and is now pinned by `service.test.js`. A belt-and-braces trigger in migrate_100 purges the block on *any* status→ended transition, covering account deletion too. **The promise on the privacy receipt is true.**
- **Safety-consent rail (migrate_102) is trustworthy:** append-only `consent_log`, versioned notice, fail-closed on accept, withdrawal on unpair — mirrors the Article 9 health consent exactly. A real GDPR posture, rare in this product category.
- **ED-safety is inherited at three independent layers** — compute (`weekSignalWriter.js:97-101`), write, and push-delivery (edge fn) — all freeze to 'resting' / force booleans false / downgrade push, tier-blind. A wellbeing hold is *indistinguishable* from a deload to the partner, by design.
- **No-blame, rest-safe streak** is a genuine improvement on Duolingo's break-and-shame.
- **The privacy receipt** is the strongest trust copy in the app and is token-pure, screenshot-worthy, and doubles as the consent notice.
- **Design + voice cohesion is excellent** — Partners reads as the same app levelled up.

---

## Findings

### F1 — The partner→partner channel is a single wordless cheer; the loop is near-passive
- **Area:** interaction / accountability mechanics · **Severity:** P1 · **Complexity:** M
- **Evidence:** `service.js:104-116`; `signals.js:38-41`; only interaction beyond viewing is `p.cheer` (`PartnerScreen.js:404-418`, `WorkoutSummaryScreen.js:864-882`). No reactions, no words, no nudge, no variety.
- **User impact:** the relationship never deepens; there is little reason to return between weekly glances. The corpus's proven lever (reciprocal, timely encouragement) is throttled to one boolean/day.
- **Business impact:** caps the retention lift the feature exists to produce; a beautiful shell on a thin loop.
- **Options:** (a) keep as-is — safest, lowest ceiling; (b) add a small *fixed, non-numeric, no-shame* acknowledgement set (still 1/day, still no free text — preserves the no-messaging lock); (c) add reactions to milestone moments only.

### F2 — No mutual commitment / shared goal object; accountability is observational, not committal
- **Area:** core mechanic · **Severity:** P1 · **Complexity:** M
- **Evidence:** the only shared objects are the derived streak and a block *name* (`sharedStreak.js`, `service.js:205-271`). No "we both aim for N this week" object anywhere.
- **User impact:** you watch each other; you never *commit* to each other. Accountability without a shared intention is weak.
- **Business impact:** the single highest-leverage, on-brand mechanic left unbuilt (see Option A).
- **Options:** (a) mutual weekly intention (Option A); (b) do nothing; (c) surface each person's own plan target as a soft shared "aim" without a commitment act.

### F3 — Nothing signals when a partner accepts; the waiting state is inert
- **Area:** flow / notifications · **Severity:** P2 · **Complexity:** S
- **Evidence:** pending card `PartnerScreen.js:697-716`; only two pushes exist and neither is "accepted" (`partnerBeats.js`, A1 §12). The pending→paired transition is silent until next open/sync.
- **User impact:** the most exciting moment of the whole flow (they said yes) is invisible; the inviter may assume it failed.
- **Business impact:** invite→active conversion loses its payoff moment; the loop feels broken ("did it work?").
- **Options:** (a) add a budgeted "your partner joined" push + in-app moment; (b) in-app only (no new push); (c) leave silent.

### F4 — Consistency PartnerRow removed; `PartnerRow.js` is built-and-tested dead code with stale docstrings
- **Area:** discoverability / hygiene · **Severity:** P3 · **Complexity:** S
- **Evidence:** `ConsistencyScreen.js` has zero partner refs; `PartnerRow.js` imported nowhere in `src/`; `usePartners.js:1-9` and `signals.js:19-24` still describe it as live. Founder removed the third row as clutter (per task context), leaving two entries (You row, Progress tile).
- **User impact:** none directly; two entries remain.
- **Business impact:** dead surface + misleading docstrings raise future-maintenance confusion; note DECISION-BRIEF §0.1 counted this row as part of the discoverability fix.
- **Options:** (a) delete PartnerRow.js + fix docstrings; (b) re-home the row elsewhere if a third calm entry is wanted; (c) leave as latent asset (document it).

### F5 — Sharing granularity is coarse; the streak toggle is inviter-only and invisible to the invitee
- **Area:** privacy / permissions · **Severity:** P2 · **Complexity:** M
- **Evidence:** `streakEnabled` set once in `create_partner_invite(_streak_enabled)`; no post-pair UI (A1 §11.4). No per-field sharing control.
- **User impact:** the invitee is silently governed by a setting they never saw or consented to; you cannot tune what you share.
- **Business impact:** minor trust gap against the otherwise-immaculate consent posture; asymmetric setting is a latent fairness snag.
- **Options:** (a) show the streak choice to both and allow either to toggle post-pair; (b) surface it read-only to the invitee at accept; (c) leave (accept that the field set is intentionally fixed).

### F6 — "Train the same block" over-promises: it is a shared label, not a shared plan
- **Area:** mechanic honesty · **Severity:** P2 · **Complexity:** L (to fix properly)
- **Evidence:** `service.js:205-271` shares only `block_name`; A1 §7/§14 and `wave5-plan-2026-07-02.md:52-57` note the missing cross-user programme identity and per-session schedule writer.
- **User impact:** copy ("You are both training X") implies synced training; nothing actually syncs.
- **Business impact:** a genuine shared-programme feature is a strong belonging lever, but the current version is a status flag dressed as more.
- **Options:** (a) soften copy to "you both named the same block"; (b) build real shared programme identity (Option C, large); (c) retire the shared-block chip.

### F7 — A quiet/ghosting partner produces nothing; safe, but the system offers no reconnection help
- **Area:** calm-brand / lifecycle · **Severity:** P2 · **Complexity:** M
- **Evidence:** rest/quiet holds streak silently (`sharedStreak.js:61-66`); no surface reflects a long silence; archive after 4 quiet weeks is invisible to the pair.
- **User impact:** correct *anti-guilt* behaviour — but a stalled pairing just fades with no calm off-ramp or gentle "still training together?" option.
- **Business impact:** stalled pairs quietly die instead of being recoverable.
- **Options:** (a) an optional, non-guilt "start a new run together?" surface on archive (copy already exists: `sharedStreak.js:95`, unused in the PairCard); (b) a calm end-of-run summary; (c) leave inert.

### F8 — Peak social moment is low-voltage
- **Area:** emotional value · **Severity:** P1 (value) · **Complexity:** M
- **Evidence:** best moment = a milestone card + RollingNumber hero (`PartnerScreen.js:132-139,165-182`); recognition is shown *to* you, never co-created.
- **User impact:** nothing to screenshot-and-send about *the two of you together*; the shared high the mechanic is built to create is muted.
- **Business impact:** the retention engine's emotional payload is under-charged.
- **Options:** (a) a shared milestone the pair reaches *together* (Option C); (b) a "you both kept week N" moment both can cheer (light Option A adjunct); (c) accept the calm-low register as the brand.

---

## System options (Q10) — each judged for calm-fit, privacy, complexity

These map onto the DECISION-BRIEF's already-framed strategy. The current build is **Direction 1 largely executed**; these deepen it *within every lock* (no feed, no ranking, no messaging, no shame, derived-only, ED-blind, no coach-engine touch).

### Option A — Mutual weekly commitment (the "shared intention")
Both partners each confirm a weekly session aim (against their *own* plan). The PairCard shows "You both aimed for four this week" and, at week close, "you both kept your week" as a *shared* kept-commitment moment. A miss **holds** the streak and is never attributed (reuses the rest-safe rule).
- **Calm-brand fit:** HIGH *if* worded as intention, never obligation ("aim," not "must"); no cross-person number comparison (each vs own aim). Must avoid "don't let them down" framing (Kill List #7).
- **Privacy:** clean — a single derived count per person, same class as today's tick.
- **Complexity:** **M** — one additive column/table + a confirm act + copy; rides existing sync/RPC/streak seams. No coach-engine touch.
- **Why it is the strongest lever:** it converts observation into a *shared object you both own*, the one proven pairwise mechanic Volyume currently lacks. Closes F2, feeds F8.

### Option B — Encouragement + lifecycle moments (the "reciprocity + payoff" upgrade)
Keep the one-per-day cap, but (1) expand the single cheer into a small **fixed, pre-written, non-numeric, no-shame** acknowledgement set ("proud of your week", "welcome back after rest"), still no free text (preserves the no-DM lock); (2) add the missing **"your partner joined" moment/push**; (3) add an optional, gentle **"start a new run together?"** reconnection surface on archive (copy already exists, unused).
- **Calm-brand fit:** HIGH — all fixed copy, all opt-in, zero guilt; must curate the phrase set through COACHING_VOICE.
- **Privacy:** unchanged (still booleans + a fixed enum).
- **Complexity:** **S–M** — copy + one push category (already have `PARTNER_CHEER` budget) + small UI. Closes F1, F3, F7.

### Option C — Real shared block + pair-level milestones (the "belonging" bet)
Give the shared block a genuine cross-user programme identity so "train the same block" is *true*, and add milestones the pair reaches **together** (block completed together, Nth shared week celebrated as one object).
- **Calm-brand fit:** MEDIUM — belonging is on-brand, but co-completion risks drifting toward comparison; needs careful collective-first framing.
- **Privacy:** widens the shared surface (programme identity, per-session schedule) — needs a fresh guard pass; the "never" list must hold.
- **Complexity:** **L** — new schema, cross-user programme identity, per-session writer (infra A1/wave5 explicitly note is missing), founder-run migrations, new guard tests. Highest cost, weakest evidence floor. Addresses F6, F8.

**Cross-cut:** A + B together, gated on the DECISION-BRIEF's telemetry bars, is the highest calm-brand-safe uplift per unit of build. C is a separate, larger strategic bet the founder should decide explicitly (it re-opens the privacy surface and touches programme identity).

---

## Scope notes / cuts (runtime-boxed)
- Verified prior art against code rather than re-deriving; A1 (996 lines) read for the debt sections (§9–§14) and cross-checked against current source — several A1-era debts (block UI, consent, single-mint, multi-pair reachability, paywall code preservation) are now **closed** by the DESIGN-SPEC build + migrate_102 and were re-verified as fixed.
- Did **not** re-read the full 38-competitor corpus file-by-file (used evidence.md + DECISION-BRIEF synthesis, which already digest them); labelled corpus vs my-knowledge in Q9.
- Did **not** run tests (read-only audit); referenced guard tests by path where they pin a claim.
- The A1 §11.9 shared-block-in-`delete_user_data` open thread appears resolved by migrate_100's belt-and-braces status→ended trigger; flagged as verify-with-DB, not re-tested here.

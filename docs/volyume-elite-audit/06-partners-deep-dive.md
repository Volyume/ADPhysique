# 06 · Partners — Deep Dive & Redesign Direction

**Author:** Fable (main loop), building on O6's read-only evidence audit
(`inputs/partners-deep-dive.md`). **Date:** 2026-07-04.
**Status:** direction + options. No code changed. Every fork is the founder's.

---

## The verdict, in one line

**Not a sloppy bolt-on — a deliberately minimal one. Elite in build quality,
safety and privacy; thin in felt accountability.** O6's framing is precise and I
agree with it entirely: in design cohesion, ED-safety, deletion-on-unpair and
consent posture, Partners is genuinely best-in-class and screenshot-worthy. In
*felt* accountability power, it is underpowered — the entire mechanic is one
derived weekly boolean, a no-blame streak, and one wordless cheer per day.

This is a fundamentally different situation from Progress Photos. Photos is a
great feature missing its connective tissue. Partners is a *safe, cohesive,
correctly-scoped skeleton* that needs one more layer of muscle — carefully, so
the muscle never becomes the shame mechanics the brand exists to refuse.

---

## What is genuinely excellent (and rare)

These are real competitive differentiators, verified in code — protect them:

1. **Deletion-on-unpair is REAL, not a claim.** The RPC hard-deletes the pair's
   signals, cheers and blocks, then tombstones the row; an earlier version that
   *falsely* claimed this was fixed and is now test-pinned. The promise on the
   privacy receipt is true. In this category, that is rare.
2. **The safety-consent rail (migrate_102) is trustworthy** — append-only,
   versioned, fail-closed on accept (a failed consent rolls the pairing back),
   withdrawal recorded on unpair. It mirrors the Article 9 health consent exactly.
   A genuine GDPR posture, not theatre.
3. **ED-safety is inherited at three independent layers** (compute, write,
   push-delivery), all tier-blind. A wellbeing hold is indistinguishable from a
   deload to the partner, by design. Exemplary.
4. **The no-blame, rest-safe streak** is a real improvement on Duolingo's
   break-and-shame — and aligns with the Gentler Streak soul O8 identifies as
   Volyume's closest analogue.
5. **The privacy receipt is the strongest trust copy in the app** ("THEY WILL SEE
   / THEY NEVER SEE"), token-pure, and doubles as the consent notice.
6. **Design + voice cohesion is excellent.** Unlike Progress Photos' modals,
   Partners *is* the app — token-pure, house voice, correct primitives. The
   "tacked-on" risk here is **not in the pixels; it is in the thinness of the
   loop.**

---

## The real gap: a beautiful shell around a single weekly boolean

O6's central finding, which I fully endorse: the copy *promises a felt
relationship* ("A partner, not an audience") while the mechanic *delivers a
weekly status glance*. The job is stated more clearly than it is delivered.

Three specific thinness points:
1. **The partner→partner channel is one wordless cheer per day.** No reactions,
   no words (messaging is correctly locked out), no variety, no nudge. The
   research's proven lever — *reciprocal, timely encouragement* — is throttled to
   one boolean.
2. **There is no shared object you both own.** Accountability is *observational*
   (you watch each other) never *committal* (you commit to each other). This is
   the single highest-leverage on-brand mechanic left unbuilt.
3. **The peak social moment is low-voltage** — recognition is shown *to* you (a
   milestone card, a streak number), never *co-created with* the partner. There
   is nothing to screenshot-and-send about *the two of you together*.

Plus one flow gap that undersells everything: **nothing signals when a partner
accepts** — the most exciting moment of the whole flow (they said yes) is silent
until the next sync.

---

## The redesign direction: from "watching" to "witnessing together"

The reframe (from `11-elite-volyume-vision.md`): **Partners = one trusted person
witnessing that you showed up.** The elevation is to move from *passive watching*
to *active-but-calm witnessing together* — adding exactly enough reciprocity and
shared ownership to make the bond felt, while refusing every mechanic that would
make it evaluative or shaming.

The guardrails that make this safe (all locked, all held by O6's options):
no feed, no ranking, no messaging, no shame, derived-only data, ED-blind, no
coach-engine touch, no cross-person number comparison.

O6 framed three system options mapping onto the existing DECISION-BRIEF. I'll
carry them forward with my read, and name the fork clearly.

### Option A — Mutual weekly commitment (the shared intention)
Both partners each confirm a weekly session aim against their *own* plan. The
PairCard shows "you both aimed for four this week," and at week close, "you both
kept your week" as a *shared* kept-commitment moment. A miss **holds** the streak
and is never attributed (reuses the rest-safe rule).

- **Why it is the strongest lever:** it converts observation into a *shared
  object you both own* — the one proven pairwise mechanic Volyume currently
  lacks. Closes the "observational not committal" gap and feeds the peak moment.
- **Calm-brand fit:** HIGH *if* worded as intention never obligation ("aim," not
  "must"), each vs their own aim (never cross-person comparison), and never
  "don't let them down" framing.
- **Complexity:** M — one additive column/table + a confirm act + copy; rides
  existing sync/RPC/streak seams. No coach-engine touch.

### Option B — Encouragement + lifecycle moments (reciprocity + payoff)
Keep the one-per-day cap, but (1) expand the single cheer into a small **fixed,
pre-written, non-numeric, no-shame** acknowledgement set ("proud of your week,"
"welcome back after rest") — still no free text, preserving the no-DM lock; (2)
add the missing **"your partner joined"** moment/push; (3) add an optional gentle
**"start a new run together?"** reconnection surface on archive (the copy already
exists, unused).

- **Calm-brand fit:** HIGH — all fixed copy, all opt-in, zero guilt; the phrase
  set must be curated through the locked coaching voice.
- **Complexity:** S–M — copy + one push category (the `PARTNER_CHEER` budget
  already exists) + small UI. Closes the interaction, accept-signal, and
  reconnection gaps.

### Option C — Real shared block + pair-level milestones (the belonging bet)
Give the shared block a genuine cross-user programme identity so "train the same
block" is actually *true* (today it's a shared label, not a synced plan), and add
milestones the pair reaches *together*.

- **Calm-brand fit:** MEDIUM — belonging is on-brand, but co-completion risks
  drifting toward comparison; needs careful collective-first framing.
- **Complexity:** L — new schema, cross-user programme identity, a per-session
  writer the infra explicitly lacks, founder-run migrations, fresh guard tests.
  Highest cost, weakest evidence floor, re-opens the privacy surface.

---

## My read (offered, not decided)

**A + B together is the highest calm-brand-safe uplift per unit of build.** A
gives the feature the shared object it's missing (the strategic gap); B gives it
the reciprocity and lifecycle payoff that make the bond *felt* day to day (the
experiential gap), and it's cheap. Together they turn "watching" into
"witnessing together" without touching a single lock. B's "partner joined" push
alone (P1-11) is nearly free and fixes the flow's most glaring dead moment.

**C is a separate, larger strategic bet** — I would not fold it into an
elevation pass. It re-opens the privacy surface and touches programme identity;
it deserves its own decision with its own guard pass, not a slot in a wave.

**⚖︎ The founder fork:** Option A / Option B / A+B / C / none. I present A+B as my
honest read of the evidence, explicitly *not* as a pre-decision — and I've kept
the lighter options (B alone, or none) as first-class choices, not framed as
lesser. The DECISION-BRIEF's telemetry bars (which go live once migrate_102 is
applied — P0-1) should gate whether even A+B ships, so the founder is deciding
with data, not instinct.

---

## The hygiene items (small, in the roadmap)

- **`PartnerRow.js` is built, tested, and now dead** (the Consistency row was
  removed as clutter). Its docstrings still describe it as live. ⚖︎ delete /
  re-home / keep as documented latent asset (P3-5).
- **Sharing granularity is coarse** and the streak toggle is inviter-only and
  invisible to the invitee — a small fairness snag against an otherwise immaculate
  consent posture. ⚖︎ surface to both / read-only at accept / leave (P2-15).
- **"Train the same block" over-promises** — it's a shared label, not a synced
  plan. Either soften the copy (S) or build Option C (L). ⚖︎ (F6).

---

## What NOT to build (the discipline that makes Partners special)

O6, the connection-corpus research, and O8 all converge here, and I agree
without reservation:
- **No feed, no leaderboard, no ranking.** Evaluative social "ejects the
  non-elite majority" and raises anxiety for ~68% of recreational users (O8, O7).
  Belonging, never comparison.
- **No free-text messaging.** The one-cheer + block *is* the messaging system, by
  design. Free text opens moderation, harassment and comparison surfaces the
  brand can't own.
- **No shame-by-mechanic** (Habitica-style interdependent damage). A miss holds
  the streak; it never punishes.
- **No cross-person number comparison.** Each partner sees their own aim vs their
  own result — never "you did 4, they did 5."
- **No coach-engine coupling.** The ED-locked deterministic engine stays untouched.

Partners is special *because* of what it refuses. The elevation adds a shared
intention and warmer reciprocity — and refuses everything else, on purpose.

---

## Summary of forks for the founder

| Fork | Options | My honest read (not a decision) |
|------|---------|--------------------------------|
| System depth | A / B / A+B / C / none | A+B is the best uplift-per-build; C is a separate bet |
| Accept-signal push | build / in-app only / leave | nearly free (P1-11); the flow's most glaring dead moment |
| Sharing granularity | surface to both / read-only / leave | small fairness fix; low urgency |
| Shared-block copy | soften / build C / retire | soften now; C only as its own decision |
| Dead `PartnerRow.js` | delete / re-home / keep | delete + fix docstrings unless a third entry is wanted |

Gate the depth decision (A/B/C) on the telemetry that goes live with P0-1, so the
founder chooses with data. Direction, not decisions.

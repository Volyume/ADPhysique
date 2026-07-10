⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Blueprint — Training Partner system (NEW-002 rebuild) — RECONSTRUCTED

> **Provenance / status.** The original `bp-partner-system-rebuild.md` was
> referenced by shipped code (`src/screens/PartnerScreen.js` header,
> `src/components/PartnerRow.js`) but was **missing from the repo** as of
> 2026-06-16. This file is a **reconstruction** assembled from (a) the locked
> invariants the code itself encodes, (b) the RE-3 retention research
> (`docs/ultimate-audit-2026-06-13/pass3-retention.md`), and (c) a deep-research
> pass on the 1:1 accountability standard (Duolingo Friend Streak, Apple Fitness
> activity sharing, Hevy/Strava) — see Sources. It restores a readable source of
> truth so the §-references in the code resolve. Founder to confirm; if the
> original is found in git history or another branch, reconcile.

## ID / CLUSTER / TITLE
NEW-002 / RETENTION / Training partner (1:1 accountability). Streak surface IDs:
COMP-018 (consistency streak). Backing research: RE-3 ("social accountability +
wearable anchoring retain", verified by all three research passes).

## STANDARD (what we match and improve on — do NOT invent)
- **The mechanic is proven.** Duolingo Friend Streak: a learner with ≥1 friend
  streak is ~22% more likely to complete the daily lesson; it works because it is
  an accountability partner, not a feed. Exercise-specific social support predicts
  adherence better than general support.
- **Privacy is our edge.** Apple Activity Sharing (the privacy gold standard)
  still shares calories, exercise minutes, workout type/duration and exposes an
  email. Hevy/Strava are full social feeds (likes, comments, leaderboards, photos,
  discovery). Volyume shares **one derived binary** (trained / didn't this week)
  plus a week count — and nothing else. This is stronger than every competitor.
- **No-blame is our improvement on the standard.** Duolingo's streak break is
  socially attributable and demotivating. Volyume's rest/quiet week **holds** the
  streak and **never** attributes a miss to a person — the right call for retention
  AND for the ED-safety posture.

## LOCKED INVARIANTS (the testable contract the code encodes)
- **§4.2 Pairing.** Invite by code / out-of-band link only. No user search, no
  discovery, no public profiles. The other person must **accept** (it is a shared
  commitment). `src/lib/partners/link.js`, `service.js`.
- **§4.4 Signals — derived only.** The only thing shared is a per-week training
  tick ("3 of 4") derived from sessions. NEVER raw weights, sets, reps, body
  weight, measurements, photos, food, calories, diary, check-ins, coach messages,
  or location. `src/lib/partners/signals.js`.
- **§4.5 Shared streak.** Counted in **weeks**, built together. A rest/quiet week
  shows as "Resting", never as a fail, and **does not break the streak**. After 4
  consecutive quiet weeks the run archives (no blame). `src/lib/partners/sharedStreak.js`.
- **Cheer.** One cheer per partner per **local day** (matches NOTIFICATIONS_LOCKED
  `partner_cheer` cap). A cheer is encouragement, never a metric.
- **§4.9 / §7 Cap (founder decision).** Free = **1** partner; Pro = up to **3**.
  Frame as capability gained, never restriction.
- **§5 Privacy property.** Either side can end the partnership at any time. On end,
  sharing stops immediately and everything shared between the pair is **deleted**;
  the other person sees only that the partnership has ended.
- **Gating.** PRO domain; free tier sees the upgrade path, never the live feature.

## EXPLICITLY OUT OF SCOPE (rejected from the standard)
Likes, comments, public feeds, leaderboards, user discovery, photos, numeric
comparison (RE-7 challenges/leaderboards dismissed). These break the no-feed /
no-PII architecture and the positioning.

## PRIORITISED MATCH-AND-IMPROVE BACKLOG (from the deep-research pass)
1. **P1 — Contextual post-workout nudge.** Surface the cheer at the moment it lands
   hardest (WorkoutSummary), and let a cheer act as a "where have you been" nudge
   worded as from the person, not the app. (Duolingo's highest-leverage mechanic.)
2. **P2 — Plain human British copy.** DONE 2026-06-16 (this rebuild): see below.
3. **P3 — Optimise the invite funnel** (the proven bottleneck); make first invite
   the priority surface; track invite-accept as the primary metric.
4. **P4 — Concrete, plain deletion promise** (own the privacy advantage).
5. **P5 — Word the Pro cap as capability, not restriction.** DONE 2026-06-16.
6. **P6 — "Streak safe" reassurance** after a quiet week (the no-blame counter to
   the standard's biggest weakness).

## LOCKED COPY (British English, full human sentences, no em dashes — founder voice)
Applied 2026-06-16 to `PartnerScreen.js`, `link.js`, and `public/partner/index.html`.

**Pitch:** "Pick one person you trust and you will both see whether the other
trained this week. There are no numbers to compare and there is no feed to scroll.
It is just the two of you, quietly keeping each other going."

**What you each see:**
- "Whether each of you trained this week, shown as a simple count like three of four. Never the numbers behind it."
- "A shared streak that you build together, counted in weeks rather than days."
- 'A rest week or a quiet week, which simply shows as "Resting". It never counts against either of you and it never breaks the streak.'
- "A cheer you can send each other once a day, so a good week never goes unnoticed."

**What neither of you will ever see:** weights/sets/reps; body weight/measurements/
photos; food/calories/diary; check-ins/coach; location — each as a full sentence.

**End/delete:** "Either of you can end this whenever you want. The moment you do,
sharing stops and everything that was shared between you is deleted. Your partner
simply sees that the partnership has ended, and nothing more."

**Cap:** "Free includes one training partner. With Pro you can train alongside up to three."

**Invite share message:** "Be my training partner on Volyume. It just shows whether
I trained this week, and nothing else about it. No numbers, no feed."

## VERIFICATION / TESTS
Invariant tests live in `src/components/__tests__/PartnerSurfaces.test.js`,
`src/lib/partners/__tests__/{link,service}.test.js`. The contract: resting never
reads as a fail anywhere; derived signals only; one cheer/day; free 1 / Pro 3;
full deletion on unpair.

## SOURCES (deep-research pass, 2026-06-16)
- Duolingo Friend Streak — product lessons: https://blog.duolingo.com/product-lessons-friend-streak/
- Duolingo gamification / retention figures: https://trophy.so/blog/duolingo-gamification-case-study
- Apple Activity Sharing & Privacy: https://www.apple.com/legal/privacy/data/en/activity-sharing/
- Hevy social guide: https://help.hevyapp.com/hc/en-us/articles/35688036014231
- Strava activity privacy controls: https://support.strava.com/hc/en-us/articles/216919377-Activity-Privacy-Controls
- Social support & exercise adherence (PMC): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9517627/

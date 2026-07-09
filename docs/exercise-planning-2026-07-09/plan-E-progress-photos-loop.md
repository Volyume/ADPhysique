# Plan E — Progress Photos: Encouragement Loop and Engine Consumption

Date: 2026-07-09. Planning agent (read-only). Founder question under investigation:
"Is there enough communication/feedback to encourage users to use progress photos? ...
give them the knowledge that it's beneficial. And ensure the engine is actually adequately
using them and making adjustments based on them if necessary. If their logs say they're
doing everything right and performing, but the photos say otherwise, perhaps we need some
modification."

**Headline finding before anything else**: a large, directly-relevant build landed on
today's date, same day as this question, per
`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` (STATUS: "BUILT AND
VERIFIED", commits `7fc4ba0`, `84cab3b`) and
`.volyume-audit/progress-scan-coach-worldclass/final-completion-report.md`. It wires the
photo-scan signal into both `WeeklyCheckInScreen` and `CoachOutputScreen` as a deterministic,
non-authoritative evidence/receipt layer, including an explicit **divergence ("conflicts")
state** for exactly the logs-say-fine/photos-say-otherwise case the founder describes. This
plan documents what that build already covers, what it deliberately still does not do (and
why, per source), and the specific decisions still open.

---

## 1. Encouragement loop — current-state map

Every surface that invites a photo, what triggers it, the copy, frequency, and its gate.

| Surface | File:line | Trigger | Copy | Frequency / suppression |
|---|---|---|---|---|
| `ProgressPhotoPrompt` ("Mark the moment" card) | `src/components/ProgressPhotoPrompt.js:107-213`, wired at `src/screens/WorkoutSummaryScreen.js:1086-1090` | A **competence** event only: a claimed session/consistency milestone rung, or a new PB this session (`photoPromptMilestoneId`, `WorkoutSummaryScreen.js:839-845`). Never a weigh-in, bodyweight, body-comp, calorie/macro event, or schedule (comment at `WorkoutSummaryScreen.js:832-838`). | "Mark the moment" / "You've just hit a milestone. If you'd like, add a photo. Your own pace, always private to this phone." (`ProgressPhotoPrompt.js:176-180`) | `usePhotoSuppression()` fail-closed gate (`ProgressPhotoPrompt.js:108,116`), Pro-only, permanent "Don't ask again" (`OPTOUT_KEY`), ≤1/day AND never-twice-per-milestone dedupe (`SHOWN_KEY`, `ProgressPhotoPrompt.js:46-97`). Starts suppressed; never flashes before the gate resolves (`ProgressPhotoPrompt.js:116,122`). |
| `WeeklyCheckInScreen` pre-check-in scan prompt | `src/screens/WeeklyCheckInScreen.js` (per `integration-plan.md` §5) | Shown only when `no_scan_ever`/`no_recent_scan` for the check-in window — never re-prompts someone who already has a receipt this period. | "Do a scan" / "Not now" (dismiss-this-visit-only, nothing persisted). | Photo-suppression fail-closed; skipping never blocks/delays check-in. |
| Home check-in-day nudge subline | `src/screens/HomeScreen.js:1985-1989` | Existing "Your weekly check-in is ready" nudge, on check-in day. | "If you like, add a progress scan first for extra visual context. Skipping it is fine." | Gated by `photoScanSuppressed` (`HomeScreen.js:180`, `usePhotoSuppression`); absent under suppression, no separate frequency cap (rides the existing nudge's own dismiss/one-time state). |
| `ProgressPhotosScreen` post-scan value line | `ProgressPhotosScreen.js:1323-1327` | After a scan is scored at High/Moderate confidence (`showCheckInValueLine`). | "If you check in this week, the coach can use this as context." | Suppression-gated; absent for withheld/low/baseline results and free tier (per `final-completion-report.md` §5, §9 checklist item 7). |
| `ProgressPhotosScreen` empty state | `ProgressPhotosScreen.js:1592-1599` | No saved photos at all. | "No saved photos yet" / "Add front, back and side photos to start." | N/A (always shown when empty; not suppression-gated, no benefit language). |

**Gap — the benefit is never explained.** Across every surface above (and
`src/lib/progressCaptureGuide.js`, which is capture-technique guidance only — framing,
lighting, repeatability, `progressCaptureGuide.js:1-90` — with no rationale copy), there is
no sentence anywhere that tells the user *why* photos matter: that they capture visual/body-
composition change the scale cannot (water weight, day-to-day fluctuation, recomposition
where weight is flat but the body is changing). Grepping the whole encouragement surface set
plus onboarding for "why/benefit/scale doesn't/fluctuat/water weight/recomposition" returns no
hits outside the coach's own receipt sentences (which explain the scan's role in a *decision*,
not why the user should bother capturing one in the first place). This is a real, narrow gap
against the founder's explicit ask ("give them the knowledge that it's beneficial").

**Score against "elegant, never pushy": strong.** Every prompt is dismissible, non-modal,
non-push, frequency-capped or one-shot, fail-closed under calm mode/open ED flag, and framed
on competence or plain optionality rather than appearance, weight, or urgency. No surface uses
guilt, streaks-at-risk, or shame language (confirmed by the dedicated
`progressScanIntegrationTone.guard.test.js`, which bans shame/panic words, em dashes and
exclamation marks across every new string). The one place it under-delivers is informational,
not tonal: it never makes the *case* for photos, only invites the *action*.

---

## 2. Engine consumption — current-state map

**Precise depth: deterministic evidence/receipt layer, composed AROUND the engine, never
inside it. Zero target-affecting consumption, by design and by test.**

- The pipeline: a scan is scored (`progressScanAnalysis.js`, not re-audited here — out of
  scope, covered by the separate accuracy-gate pass) → bounded into a v1 evidence object
  (`buildProgressScanCoachEvidence`, `src/lib/progressScanCoachEvidence.js:87-129`, hard-coded
  `affectsTargets: false` at line 127) → resolved into a coach-facing note
  (`resolveProgressScanCoachNote`, `src/lib/progressScanCoachResolver.js:94-140`) → reshaped
  into a v2 packet (`buildScanEvidencePacket`/`composeScanEvidencePacket`,
  `src/lib/progressScanCheckInEvidence.js:362-508`) that classifies the scan against the
  engine's **own already-computed outputs** (`weightTrend`, `goalPhase`, `heldDecisions`) into
  one of `supports | conflicts | visual_change_weight_stable | inconclusive | not_used |
  insufficient_data` (`progressScanCheckInEvidence.js:98-105`).
- This packet is rendered at `WeeklyCheckInScreen.js:1567` (`composeScanEvidencePacket`,
  as `scanEvidencePacket`, e.g. lines 884-897) and at `CoachOutputScreen.js:1567`
  (`composeScanEvidencePacket`). It is **never persisted** — `weekly_checkins` and
  `coach_outputs` stay scan-free by an existing, still-green source guard
  (`integration-plan.md` §3, §11).
- `runWeeklyCoach`, `coachApply`, `nutritionEngine`, `planEngine` take no scan input at all;
  the pre-existing byte-identical guard (`progressScanSafetyFloorIsolation.test.js`, cited in
  `progressScanCheckInEvidence.js:7-9`) still asserts identical engine output with and without
  scan evidence present.
- **The divergence case the founder describes is already modelled**, as the `conflicts`
  state: `classifyAgainstWeightAndGoal` (`progressScanCheckInEvidence.js:211-239`) declares a
  direct contradiction when the scale/weight-trend direction and the scan's visual direction
  point opposite ways, and the receipt is explicit and neutral: *"Your photo trend and scale
  trend disagree this week. The coach used weight and intake for the decision and kept the
  scan as context."* (`progressScanCheckInEvidence.js:277-278`, receipt pattern 2 in
  `integration-plan.md` §7). It never changes targets, never uses appearance language, and is
  suppressed identically to every other scan surface.
- What it explicitly does **not** do: change any calorie/macro/training value, corroborate or
  weaken the coach's decision-confidence caption, or feed the ED-pattern detector. This is not
  an oversight — it is `future-coach-checkin-integration-blueprint.md` §4's forbidden list
  (absolute) and the `integration-plan.md` §12 hard blocker: any step beyond receipt-only
  ("Tier 2 corroboration") "requires external ground-truth validation data" that does not
  exist in the codebase (`final-completion-report.md` §10 item 1).

**So: today's build already answers "is the engine adequately using them" for the
receipt/interpretation layer — it reads the photo trend, compares it against the logged trend
and goal, and tells the user plainly whether it agreed, disagreed, or was set aside, at both
check-in and coach output.** It deliberately stops short of any target *adjustment*, which is
correct per the ED-safety constraints in this task and per the founder's own prior-approved
blueprint (recomposition support one day, gated behind external validation data that does not
exist yet).

---

## 3. The divergence case — options for what (if anything) goes further

Everything below is bounded by the task's hard constraints, restated: no photo-driven signal
may ever lower calories below the floors; no appearance/shame language ("looking fatter" is
unsayable — must stay factual/trend-vs-goal framed); full suppression under calm mode/open ED
flag; adherence-neutral; any adjustment stays inside the existing deterministic engine's
floors/gates. The current build already satisfies all of these for the receipt-only case. The
options below describe *whether to go beyond receipt-only*, not whether to weaken any of the
above.

### Option 3a — Leave as built (receipt-only, no further engine wiring)
The `conflicts` state stands as the ceiling: it surfaces the disagreement, states the
hierarchy plainly (logs win), and changes nothing. No new code.
- ED-safety: cleanest possible — zero incremental risk, matches the blueprint's own
  recommendation until Tier 2 validation exists.
- Effort: none (already shipped).

### Option 3b — Add the "flag for manual review" surface (blueprint §3 item 6, not yet built)
On a `conflicts` classification, add one further calm sentence suggesting the user double-check
*their own logging conditions* (e.g. "when your logs and photos disagree, it's often worth
checking your weigh-in routine — same time of day, similar conditions"), phrased without blame,
appearing only alongside the existing receipt. Still zero effect on targets; purely a
logging-hygiene nudge, not a body/appearance comment.
- ED-safety: low risk if worded exactly as above (factual, about routine/conditions, never
  about the body); needs a dedicated tone-guard string addition mirroring the existing
  `progressScanIntegrationTone.guard.test.js` pattern.
- Effort: small (one new receipt line + guard test + copy review).

### Option 3c — Recomposition context in block/plan-advice surfaces (blueprint §12 item 3, not yet built)
Extend the same `visual_change_weight_stable` classification (flat scale + scan moving toward
goal) into `getBlockAdvice`-type surfaces as additional display-only context, mirroring what
`CoachOutputScreen` already does, so the recomposition read is visible in more places a user
looks for block-level guidance — still display-only, still not target-affecting.
- ED-safety: same profile as the existing coach-card receipt (already proven safe and tested);
  the only work is wiring it to a second display surface.
- Effort: small-medium (new surface, own guard tests, own tone-guard entries).

### Option 3d — Tier 2 corroboration (blueprint §12 item 4) — explicitly NOT proposed here
This is the only path that would let a strong multi-scan trend corroborate (never initiate)
the coach's existing decision-confidence caption by one step. It is hard-blocked pending
external ground-truth validation data that does not exist in this codebase
(`final-completion-report.md` §10 item 1). Not offered as a live option below; listed only so
the founder can see the full ceiling and consciously decline it, per the blueprint's own gate.

---

## 4. Gaps and options summary

**(a) Elegant encouragement improvements — the "why" is missing:**

- **A1 — Add one benefit sentence to the existing empty state.** Extend
  `ProgressPhotosScreen.js:1592-1599`'s "No saved photos yet" text with a single factual
  sentence on why photos help (e.g., "photos can show change the scale doesn't, especially
  when your weight is holding steady"). Lowest-effort, single-surface, no new gating logic.
- **A2 — Add the same sentence once, in onboarding or the Pro nutrition/coaching intro**, so
  the case is made once, up front, rather than only encountered by users who already opened
  Progress Photos. Slightly larger (touches onboarding copy, needs its own tone-guard pin).
- **A3 — Leave encouragement copy as-is.** The invitations are already frequent enough and
  well-gated; only the missing "why" is a gap, and the founder may judge that the check-in
  evidence block's own language ("your photo trend points the same way as your weight trend")
  already teaches the benefit experientially, once a user has already engaged.

**(b) Engine/coach use of the photo signal, incl. divergence case:**

- **B1 — Ship Option 3a (leave as built).** Today's build already closes the founder's ask at
  the receipt/interpretation layer; recommend confirming it as sufficient for now.
- **B2 — Ship Option 3b (manual-review-flag sentence) in addition to 3a.** Small, additive,
  stays entirely in the existing receipt pattern.
- **B3 — Ship Option 3c (recomposition context on a second display surface) in addition to 3a/3b.**
  Medium effort, same safety profile as what is already tested and live.

---

## 5. Founder questions

1. **Encouragement copy** — should a "why photos matter" sentence be added, and where?
   a) Add to the Progress Photos empty state only (Option A1, smallest).
   b) Add to both the empty state and onboarding/Pro coaching intro (Option A2, broader).
   c) Leave as-is; the check-in evidence block already teaches this experientially (Option A3).
   d) Something else — specify.

2. **Divergence-case engine use** — beyond today's `conflicts` receipt (logs win, scan shown
   as calm context), should anything more be built now?
   a) Nothing further — confirm Option 3a/B1 (receipt-only) as the final answer to this
      question.
   b) Add the manual-review-flag sentence on conflict (Option 3b/B2).
   c) Also extend recomposition context to a second display surface (Option 3c/B3).
   d) Something else — specify.

3. **Tier 2 corroboration (blueprint §12 item 4)** — this plan does not propose building it
   (hard-blocked on missing external validation data per the existing blueprint). Confirm this
   stays out of scope entirely, or should sourcing/designing that external validation dataset
   be commissioned as its own separate piece of work?
   a) Stays out of scope, no action.
   b) Commission a separate scoping task for the external validation dataset.

4. **Scan-specific notification copy** (`final-completion-report.md` §10 item 2, unrelated to
   the founder's specific ask but flagged as the other open item from today's build) —
   `docs/NOTIFICATIONS_LOCKED.md` currently has no scan-aware wording; the existing check-in
   reminder + deep link already reach the flow where the new scan prompt lives.
   a) Leave the locked notification copy untouched (current state).
   b) Commission a separate founder-gated change to add scan-aware notification wording.

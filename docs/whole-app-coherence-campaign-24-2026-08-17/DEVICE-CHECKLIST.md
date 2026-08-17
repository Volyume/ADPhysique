# CAMPAIGN 24 — FOUNDER DEVICE CHECKLIST (Android, EAS build from main after merge)

Bounded to the highest-risk visual/interaction changes — 26 checks
grouped by journey, not an 81-screen traversal. The still-outstanding
C20 logger retest, C22 Home walk (15 steps) and C23 Progress walk (12
steps) remain in their own campaign folders; nothing here repeats them.

## Startup / auth (the flash fix — highest value check)
1. Signed-in device, aeroplane mode ON, force-quit, reopen. Expected:
   neutral splash, then (after ~8s) "Couldn't check your sign-in" with
   Try again + Go to sign in — NEVER a flash of the Welcome/login
   screen. Turn network on, tap Try again: lands signed-in on Today.
2. Same aeroplane-mode reopen, tap "Go to sign in" instead. Expected:
   Welcome renders (explicit choice, not a flash); signing in works
   once network returns.
3. Fresh install (or cleared storage), aeroplane mode ON, open.
   Expected: straight to Welcome after the splash (no retry wall for a
   device that never signed in).
4. Normal online reopen. Expected: no visible change from before —
   splash straight to Today, no new delay.

## Train / programme
5. MesocycleBuilder (Edit Blocks): open with an active block. Expected:
   NO deload/recovery advisory banner anywhere on this screen (it now
   lives only with the coach); block editing unchanged.
6. MesocycleBuilder with data unavailable (aeroplane mode + fresh
   open): Expected a calm couldn't-load state with Retry, not a blank.
7. WorkoutSummary after any session (and from history in read-only):
   the Total lifted stat shows YOUR units (lbs user sees lbs); the
   read-only view now has the Share button, producing the same session
   card (no body data on it).
8. RoutineDetail: enter an invalid set/rep value and save. Expected: a
   calm warning toast; nothing silently ignored. The start-weight
   placeholder shows your units.
9. Plan Library quiz vs the free-starter quiz (fresh account): answer
   equivalently ("home / no equipment" etc.) — both must recommend a
   performable (no-equipment) plan, never a full-gym division plan.
10. Block reflection (end of block): tonnage figures in your units.

## Coach / check-in
11. CoachReview during a SCHEDULED recovery week (or a finished block
    awaiting decision): Expected NO "recovery week suggested"
    recommendation — the review's volume rows still render.
12. Weekly story (Pro, after a check-in): the eating chapter's
    "close to target" band now matches the check-in's own verdict
    (within 10%): a week ~7% over reads as close, not "above".
13. Methodology opens from the trial card and from held decisions —
    both land on the right section.

## Progress detail
14. BodyMetrics (lbs or stone user): EWMA weight, weekly change AND
    the rate all in your display units — no kg/week anywhere; the
    snapshot delta badge converts, not just relabels.
15. BodyMetrics with an OPEN ED flag (test account): the rate and
    effective-maintenance card do NOT render (direction-only trend);
    the raw chart and logging still work.
16. Progress Photos: the compare view's weight caption in your units.
17. Year of Lifts + monthly recap: every tonnage story card in your
    units.
18. Lifts (LiftProgress): opening shows skeleton rows while loading,
    then the Weight lifted hero — no blank flash.
19. Consistency: session-frequency view renders; no streak copy
    anywhere ("weeks running" gone from Progress surfaces).

## Nutrition
20. Meal plan settings: the "Meal plan meals per day" row reads
    distinctly from Nutrition Targets' meals-per-day and says which is
    which.
21. My recipes: the info button opens a read-only detail sheet
    (ingredients + per-serving and whole-recipe totals); Close does
    nothing but close; Edit/Delete unchanged.
22. Label scan: the torch button clicks (haptic) like the barcode
    scanner's.

## Settings / notifications
23. Settings > Display: no "Show nutrition on Home" toggle (it
    controlled nothing); remaining toggles all function.
24. Coaching reminders (Pro): the morning weigh-in on/off switch works
    and holds its state (matches the reconciled record).
25. Free-tier pass: Settings, Progress, Train and Coach all coherent —
    no dead ends, no new upgrade nags beyond the recorded set.

## Safety spot-check (ED/calm — tier-blind)
26. With calm mode ON: BodyMetrics shows no rate/maintenance, Progress
    Visual pillar absent, no weight-count notification fires, the
    check-in stays reachable. With the flag cleared, everything
    returns.

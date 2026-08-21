# PHYSICAL VALIDATION — ONE CONSOLIDATED DEVICE SCRIPT (CC26–CC32)

Physical Android device, green EAS build (custom native modules; not
Expo Go). One sitting, journeys in order — A seeds state the later
journeys reuse. Every step: action, then Expected. ED-safety cases are
in journey H. Journey F converts the readiness matrix's A11Y gates
from PARTIAL, so run it deliberately, TalkBack on.

## A. Free baseline capability user (setup is ordinary, day one fits)

1. Settings -> How you train opens FREE (no Pro sheet). Expected:
   renders with the empty-state copy.
2. Add a baseline demand rule (e.g. Standing work). Expected: consent
   moment first; readback is ONE grouped sentence; row under Your
   setup with no injury/restricted wording.
3. Kill the app; reopen. Expected: rows persist; no re-consent.
4. Second device (same account): rows arrive after sync; end a row on
   device B; device A converges to ended. (Requires migrations 145+
   run in production; until then note "pending production migrations".)
5. Fresh free first-run: the capability step appears after the three
   questions; skip is one tap; "Yes" opens How you train and returns.
6. With a rule set during onboarding: the recommended starter plan is
   fully compatible (no conflict sheet on install). If NO plan fully
   fits, the card says so honestly and Start offers "Browse plans that
   fit / Start it anyway" - never a silent activation.
7. Pro onboarding: the How you train step sits between Training week
   and Targets; skipping never blocks; step count reads 6 with Account
   excluded.

### A-plus (gap closure): the discovery surface
A1. Open How you train, then "Looking for a specific condition or injury?".
    Expected: Training considerations opens; searching "wheelchair" and
    "shoulder" both find profiles; a nonsense search still offers
    "Something else, or not listed".
A2. Open a condition profile and tap one question card.
    Expected: How you train opens at the durability step with that
    choice preselected; nothing saves until the readback; backing out
    saves nothing.

## B. Temporary episode (declare, apply, work around, end, restart)

8. Add a TEMPORARY change (episode) with a rough end date. Expected:
   temporary section with time wording; day-0 prompt absent.
9. With a plan active, the "Apply this to your current plan?" proposal
   appears with honest swap/left-out counts; "Not now" keeps sessions
   unchanged with quiet conflict notices.
10. Choose "Apply while it lasts", start an affected session.
    Expected: substitution with the marker "Temporarily in for
    {name}"; the Plans tab plan itself is unchanged.
11. Resume a mid-session workout with logged sets after applying.
    Expected: the session list is NOT rewritten.
12. Remove an exercise the change covers mid-session. Expected: no
    interrogation; the week still counts correctly (step 14).
13. Use the exercise sheet's "Work around this". Expected: three-way
    choice; "Swap and note a temporary change" opens the swap sheet
    and routes to How you train.
14. Perform everything except the covered exercise, finish via "ended
    early". Expected: Home/widget/coach weekly count treats the
    session as done; stopping beyond the covered exercise still counts
    ended early.
15. Swap a covered exercise from the strip notice. Expected: normal
    swap, no extra questions (the cause records internally).
16. End the episode from How you train. Expected: sessions return to
    the base plan, history intact; if the episode reduced a muscle's
    effective work, a toast reads "Rebuilding {muscle} gradually after
    your restriction ended" and the remaining weeks' planned volume
    for that muscle steps back up toward the plan's own peak (check
    the volume editor).
17. In How you train's Past list, the ended episode offers "Start this
    again". Expected: one confirm recreates the WHOLE saved shape from
    today; a promoted row offers no re-start.

## C. Custom adapted exercise

18. Create a custom exercise while a demand rule is active. Expected:
    exactly one optional question per constrained axis; skipping
    leaves it usable manually.
19. Give the custom compatible answers. Expected: it appears in
    suggestions/generation alongside built-ins (pool parity).

### C-plus (gap closure): adapted setup lines
C1. Open Lat Pulldown (Wide Grip) in the exercise library.
    Expected: "Ways to set this up" shows strap and one-arm lines under
    the instructions; TalkBack reads them as ordinary text.

## D. Compatible programme and library

20. With Standing work active: open the exercise picker. Expected:
    standing movements absent by default; "Show movements outside how
    you train" reveals them with per-row reasons.
21. Tap a revealed self-declared conflict. Expected: the three-way
    sheet (cancel / add anyway just this plan / works for me); "Works
    for me" shows it normally on the next open.
22. Mark a rule clinician-reported; tap a conflicting exercise.
    Expected: no add-anyway; "Update restriction" routes to How you
    train. The plan-install conflict sheet likewise offers "Update
    restriction" instead of "Keep it in this plan" for that row.
23. Recent rail never shows a capability-blocked movement.
24. Plan library with a rule active: "Fits how you train" collection;
    family plans carry the chip; a conflicting plan shows its honest
    to-swap count; installing it words capability rows separately and
    substitution works per row.
25. Pro: rebuild plan (Adjust training) with Standing work active.
    Expected: no standing movement in preview or saved plan; blocked
    copy splits set-aside vs "no match inside how you train"; thin
    sessions lead with the reduced banner; same-position work sits
    contiguously.
26. Session length is editable FREE under Settings -> Workout; the
    energy row on How you train routes there.
27. Airplane mode mid-picker (capability read fails with no known
    state): the picker shows "How you train could not be checked right
    now, so nothing is filtered for it" (only when the feature is on);
    generation surfaces offer Hold suggestions / Continue without
    checks.

### D-plus (gap closure): the five new families
D1. Browse the plan library; install Seated Home Strength and open its
    days. Expected: dumbbell and band work only, seated or lying
    throughout; the two seated band pulling movements resolve.
D2. Open Hinge & Hip Lower Builder. Expected: no squat, leg press,
    lunge or leg-curl anywhere; quad work is Terminal Knee Extension
    and Wall Sit only.
D3. Open Seated Upper Strength II and Steady-Base Strength. Expected:
    heavier rep ranges present; every movement machine-based or seated.

## E. Coach, check-in and the return path (Pro account)

28. With an active episode, open the weekly check-in. Expected: the
    joint-pain question is REPLACED by "How did training around your
    restriction go this week?" (three options, optional); submitting
    without answering works.
29. Type "my knee hurts" in the notes of a NON-episode week's
    check-in. Expected: the coach holds progression naming your note.
    An episode week with no such note must NOT produce that hold from
    the app's own appended sentences.
30. Run a week where the only misses are constraint-excused, then read
    the coach. Expected: the volume note reads "Training ran around
    your temporary change this week..." - never sessions-missed blame,
    and calories do not react to the constraint in any way.
31. Apply a coach volume INCREASE while an episode affects a muscle
    and another muscle was flagged sore at check-in. Expected: both
    held (unchanged planned sets), every other muscle takes the +1.
32. Home pre-workout brief with an active episode. Expected: one quiet
    line "Training works around your temporary change." - once, on
    the brief only.
33. Promote an episode ("this is how I train now"). Expected: rules
    continue as baseline; plan rebuild offered, nothing silent;
    Engine Log joint-discomfort entry still reads the honest copy (no
    rotation claim).

## F. Accessibility (TalkBack on; converts the matrix A11Y gates)

34. TalkBack walk of journey A steps 1-5: every row/action announces
    label + state; the add flow is operable start to finish; the
    fail-closed unavailable notice is announced.
35. TalkBack walk of journey B steps 8-13: strip notice, proposal
    sheet and Work-around entry announced and operable (the sheet is a
    native alert - focus lands in it).
36. Onboarding capability steps (both paths), library chips, conflict
    sheet: operable and announced.
37. Picker notices: with the capability read failing, the notice is
    ANNOUNCED when it appears, not only visible.
38. Logger steppers: focus one as a single adjustable control - swipe
    up/down increments/decrements within bounds; value announced.
39. Rest timer: end-of-rest arrives as sound + haptic + visible state;
    controls (add/remove 15s, skip) are labelled buttons with adequate
    targets; nothing is time-critical to operate.
40. Display scaling at maximum font size: journeys A-B core screens
    remain readable and operable (no clipped controls).

### F-plus (gap closure): discovery surface under TalkBack
F1. With TalkBack on, walk Training considerations: search, open a
    profile, activate a question card. Expected: every control is
    labelled, the detail-mode change is announced, and the question
    card's hint says it opens How you train.

## G. Export, delete, privacy

41. How you train -> export. Expected: a JSON share sheet with the
    user's own capability rows; nothing else attached.
42. Withdraw consent and erase. Expected: rows gone on BOTH devices
    (pending production migrations for the second device); feature
    off; workouts/history untouched; decline signposting names the
    consent-free lanes.
43. Delete account. Expected: capability rows leave the device wipe
    verification clean; (cloud reach verifiable only after migrations
    run).

## H. Unaffected training + ED-safety regression (run FIRST if short)

44. A user with NO capability rules: picker, generation, coach, library
    and logging behave exactly as before the workstream - no capability
    copy anywhere, no extra questions, no notices.
45. Calm mode ON with an active episode: progress-photo and
    weight-adjacent suppressions unchanged; the capability surfaces
    carry no weight/food content; coach upward carries stay vetoed
    under suppression exactly as before.
46. Open ED flag (test account): weight/food-adjacent notifications
    stay suppressed; capability episode creation neither weakens nor
    triggers any of it; the before/after share card stays withheld.
47. Weekly coach with no constraint and identical inputs: outputs match
    a pre-workstream build's numbers (spot-check calories, volume
    signal, notes) - the constraint machinery is invisible when absent.

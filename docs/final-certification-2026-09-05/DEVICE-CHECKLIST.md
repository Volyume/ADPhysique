# Device checklist — final certification 2026-09-05

Physical Android, EAS build from main at or after `865aa54`. Expected
result after each step. ED-safety cases are listed where a change is
weight, food or notification adjacent; none of today's changes touch the
floors, gates, calm mode or suppression.

## Injuries & limitations (D152)
1. Coach tab: the row under "Your body" reads "Injuries & limitations" with the line "Injuries, pain, long-term conditions or disabilities that affect your training." when nothing is saved.
2. Train tab, Plan tools: first row reads the same label and line. Settings: same label, same line.
3. Add a long-term rule (Overhead positions, left shoulder): the WHEN step asks "Is this long-term, or temporary?" with "Long-term" and "Temporary, for now". Save.
4. Back on Coach and Train the line reads "Leaves out overhead work with your left shoulder".
5. Add two more long-term rules of different kinds: the line reads "3 injuries or limitations saved. Used when Volyume picks exercises and builds your plan." No "things" anywhere.
6. Start a workout containing a conflicting movement: the notice badge reads "Limitation"; a temporary rule's badge reads "Temporary change".
7. Open the exercise picker in a workout: the toggle reads "Show movements that clash with your limitations"; a blocked row's reason names the limitation and offers "Open Injuries & limitations".
8. Plan Library: the filter chip and plan badge read "Fits your limitations".
9. Onboarding step 5 label reads "Injuries & limitations"; its skip is one button, "Not now", with the caption naming the Coach tab or Settings.
10. Home, fresh account after the welcome card retires: the offer card body names injuries, pain, long-term conditions and disabilities and says Volyume takes them into account when choosing exercises and building training.

## Library plans, circuits and kettlebells (F-10, F-13, F-17, F-11)
11. Plan Library: activate "Full-Body Circuit: Dumbbells". Open a day: stations show "3 rounds", rest "90s between rounds" (not "Superset A · 3 sets"). PlanDetail day line reads "Circuit · N stations · N rounds · 90s between rounds" before activating.
12. Start the circuit day: heads-up "Circuit coming up", repeat icon, no Unlink. Orientation row "Round 1 of 3 - Circuit"; chip "Circuit · Round 1 of 3 · with <stations>". Moving to the next station starts no rest; after the last station the round rest runs.
13. Skip a station for one round and come back: it reads "This station missed a round."
14. Logged rows read "… - Round 2 - Circuit"; tapping one opens "Edit round 2". Lock-screen notification reads "Round n of m".
15. Swap a station: only dumbbell-circuit movements are offered; "Search the full library instead" shows the whole library.
16. Background the app mid-round and return: the round and station are where you left them.
17. Routine edit sheet on a station: "Rounds" and "Rest between rounds (s)", no per-station rest; change rounds to 4 and every station reads 4 rounds.
18. Progress after a circuit week: the volume heatmap shows a normal read (circuit rounds count); no insight says to add sets to a muscle you trained only through swings.
19. Activate "Kettlebell Minimal: 3 Days" (beginner). Log a top set at 16 kg hitting the top of the range: the next prefill is 20 kg, never 18.5. The swap sheet offers kettlebell movements only; no snatch, clean or jerk on a foundations plan.
20. Adjust training on any kettlebell, circuit or band plan: the form is replaced by the notice and "Browse <style> plans", which opens the library on that chip. Update goal and phase on the same plan: goal and targets change, the plan is kept, the summary says so.
21. Adjust training on a generated plan containing a circuit you built: the "Circuit rounds are not kept" line shows and the confirm asks before rebuilding.

## Equipment routes (F-16)
22. Fresh onboarding, equipment step: "Kettlebells" and "Bands" appear, nothing preselected, Continue blocked until a choice. Choose Kettlebells, beginner, 3 days: one line "Volyume has kettlebell plans built for this kit. Kettlebell Foundations: 3 Days fits your week." Today then offers a session.
23. Repeat with Bands, 4 days: "Upper/Lower: Bands". Plan Library "Bands" chip shows the two band plans. Band set entry: leave weight blank, log reps; next session asks for another rep, never a heavier load.

## Today and Train (F-18)
24. Finish the last required session of the week: Today shows "Week complete", "Every session done this week", the Monday line, chip "Nothing outstanding this week.", no Start button; "Do another session" opens the choice. Train mirrors "Week complete. Your next session is on Monday."
25. On a block past its recovery week: Today shows "Block complete", "Every week of this block is done", "Choose what's next" opens Plans; no "Day 1 of N".
26. A plan with no sessions: Today reads "Your plan has no sessions yet" with "Open your plan", never "No active plan yet".

## Search (F-09)
27. Exercise picker: "bench" lists Barbell Bench Press first; "curl" lists Barbell Curl first; "swing" lists Kettlebell Swing in the top three; "dip" shows no hip thrust; "glute bridge" shows no bench press; "flat db press" finds Dumbbell Bench Press; "hamstring curl" finds Lying or Seated Leg Curl. The chip row includes Kettlebell. A zero-result search with a chip active says "Try fewer words, or clear a filter."

## Navigation (F-02 to F-07)
28. Tap a home-screen widget: the app opens. Tap a partner invite link (volyume://partner/CODE or https://volyume.app/partner/CODE): the pairing screen opens with the code filled. Tap the foreground-service notification after a force-close: Today opens with "Continue active workout".
29. Custom builder, page 2 with exercises, "Save draft": returns to My plans, no discard prompt. Activate from the builder, "Go to Today": Today opens and Train does not reopen the builder.
30. Meal plan blocked by missing targets, set targets, Back: returns to the meal plan.
31. Block reflection, "Choose your next block": lands on Plans, once.

## Copy truth
32. Coach output with Coached mode on: Methodology reads "It never overrules a safety hold. Unless you have chosen Coached mode in Settings, every change it suggests waits until you accept it." Train plan card reads "Your coach reviews this plan each week and suggests changes for you to apply."
33. Force a failed check-in save (aeroplane mode mid-save): the alert body is "Nothing has been lost. Try again in a moment.", never raw error text.

## ED-safety (unchanged, spot check)
34. Under an open ED flag or calm mode: no weight or food notification fires; the before/after progress card is withheld; calorie floors hold on any Coach nutrition change. None of today's changes touch these paths.

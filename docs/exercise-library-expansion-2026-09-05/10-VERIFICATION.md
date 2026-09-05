# 10 — Verification record (filled as lanes land)

## Performance (Part XXIII), measured 2026-09-05

| Measure | Result | Where |
|---|---|---|
| Corpus source size (families) | 627 KB of JS source, 552 KB as JSON | `wc -c src/lib/exerciseCorpus/families/*.js` |
| Full derivation of every live row (all metadata) | 934 rows in 33.5 ms (Node, this sandbox) | `corpusEntryToSeedRow` over `CORPUS` |
| Ranked search over a 1,600-row list | index build 20 to 30 ms once; worst keystroke 2 to 18 ms (Jest, this sandbox, measured 50 to 100x slower than a phone) | `exerciseFuzzySearch.test.js` |
| Seed insert of 934 rows | batched INSERTs in one transaction (top-up and fresh seed); device time to be read from the boot log on the checklist | `seedExercises.js` |

## Device checklist (Android, from a green build)

Library and search:
1. Sign in, open Train, Add exercise. Expected: with an empty search the
   list starts with Recent, then In your plan, then Staples, then All
   exercises, with headers. Type "rdl". Expected: Romanian Deadlift at
   the top. Type "kb swing". Expected: Kettlebell Swing first, then its
   single-arm and alternating variants. Every keystroke feels instant.
2. Open any exercise. Expected: two or three sentence setup and
   execution cue below the name; no clinical words.
3. Create a custom exercise named "Barbell Bench". Expected: a calm line
   "Looks like Barbell Bench Press already exists. Use it instead?"; tap
   it and the existing row is selected. Create anyway with another name;
   open it; Delete exercise; confirm. Expected: it is gone from the
   picker; any routine that used it still shows it by name.
4. Settings, How you train: set "avoid overhead". Open the picker and
   search "press". Expected: overhead presses show the existing
   conflict presentation; floor and bench presses do not.

Kettlebell and circuits:
5. Plan library. Expected: chips include Kettlebell, Circuits, Minimal
   equipment, Bodyweight, Bands; each card shows style, days, level,
   session minutes and the implements required.
6. Start Kettlebell Foundations: 2 Days. Expected: no single-arm swing,
   clean, snatch, jerk or push press anywhere in it. In a session, swap
   the goblet squat. Expected: the sheet says "Showing kettlebell
   exercises"; candidates are kettlebell rows only; "Show all exercises"
   widens the list for that sheet only.
7. Start Full-Body Circuit: Dumbbells. In the first circuit, log a set at
   station one. Expected: no rest timer; focus moves to station two; the
   chip reads "Circuit · Round 1 of 3". Log station three. Expected: the
   rest timer starts at 90 seconds and focus returns to station one,
   now "Round 2 of 3".
8. In the plan builder, select three exercises in a day and tap Make
   circuit. Expected: rounds stepper 2 to 6 sets all three the same;
   round rest stepper 30 to 180; the header reads "Circuit A · 3 rounds
   · 90 s between rounds"; Ungroup restores the previous sets and rest.
9. After the circuit session, open the exercise detail for a station.
   Expected: the sets carry a "Circuit" label; the e1RM chart does not
   include them; a heavier-than-ever set still shows as a PR.
10. Kettlebell Strength: 3 Days, log Kettlebell Swing (Single-Arm) sets.
    Expected: "Ballistic" label on the sets; no PR, no e1RM, no load-step
    suggestion; per-muscle weekly volume does not count them.

Coach and evidence:
11. Complete a block that contains circuit sessions and open the Coach.
    Expected: the muscles trained mostly in circuits read "was trained
    as part of a circuit this block, so nothing was judged from it"; no
    learned range changes from those muscles.

Existing installs:
12. Update an install that already has history. Expected: on first
    launch after the update the library grows to the new count without
    duplicates; history for Dumbbell Goblet Squat now shows under Goblet
    Squat; nothing is lost.
ED-safety: no weight or food surface is touched by this campaign.

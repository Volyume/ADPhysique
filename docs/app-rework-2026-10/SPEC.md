# App layout rework (D231): tabs, one home per thing, less text

Owner request, 2026-10-22 (verbatim): "Ok can you propose the compete rework
o that is in each page so the so  better and so on avoiding duplications
optical entry points, tsbe reduction with content restructuring and son"

The lead's proposal was put to the owner in chat on 2026-10-22. Owner
answers, verbatim from the structured question:
- Tabs: "5 tabs, Progress in Coach (Recommended)"
- Settings: "Remove both (Recommended)" (Injuries & limitations and
  Nutrition targets leave Settings; this amends the item 11 layout)
- Athlete profile: "Retire it, move its parts (Recommended)"
- Go: "Go on all of it"

This lifts the earlier out-of-scope lines for item 7 (Today layout) and
item 9 (tab changes) in the proposals brief, for exactly the changes below.

Fact base: the code inventory of v3.4.0,
`docs/app-rework-2026-10/TAB-INVENTORY.md` (every card, its condition, its
destination, with file:line).

## Rules applied everywhere

1. One home for each thing. Anywhere else gets at most one short line that
   opens it, and only when something needs you.
2. Today shows only what needs you today.
3. One door per screen: no screen has two doors to the same place.
4. Less standing text: explainer text on screens you see every day goes
   behind the info button.
5. Safety stays exactly as it is: Goal lock, Wellbeing check, Beat, calm
   mode and every hide-under-flag rule are unchanged, and a card that moves
   keeps its own rule.

Hard bounds for every batch: CLAUDE.md section 2. No change to any safety
rule (`src/lib/safetyState.js`, calm mode, ED flag, Beat, floors), no change
to engine output, no new dependency, no billing surface, no schema change.
A test may be re-pointed only where this spec changes the exact thing it
pins; a safety, age or privacy guard is never relaxed (stop and ask). User
copy in British English, no em dashes, the app's calm voice.

## Tab bar

Five tabs in this order: Today, Train, Nutrition, Coach, Community. The
Progress tab is removed; its content moves to Coach and Train as below. Every
route that opened the Progress tab (notifications, the `progress` link
path, cross-tab navigations, params such as `focusWeightTrend`) opens the
same content in its new home.

## Batch 1: Today

Top to bottom, at most these:
1. Morning weigh-in (unchanged).
2. The one "needs you" line (TodayLine). It also takes over three things that
   are separate cards now:
   - "Your plan can be updated" (PlanRebuildChoiceCard): opens the plan
     update as the card's "Update your plan" does; dismissing it is the
     card's "Not now".
   - the plan-rebuilt note (PlanRebuildNote): opens the note's lines in a
     sheet with "Got it", which retires it as now.
   - a limitation waiting for your decision (the "Still need it?" and "A
     change to your limitations is waiting for your decision." rows): opens
     Injuries & limitations as those rows do.
   Rank (one shows, the rest wait): block finished, plan update needs a
   choice, coaching decision, weekly check-in, limitation decision, recovery
   week, re-entry, plan rebuilt note, nutrition phase.
3. The main card. When it says "Week complete" or "Block complete", the line
   and the readiness chip no longer repeat it (the block-complete chip keeps
   only its new information, that sets stay as light as a recovery week
   until the next block is chosen).
4. One offer at a time, directly under the main card, in this order: Set up
   coaching (the full card; its once-a-day rule and its quiet row are
   unchanged, the quiet row is not an offer), the injuries question, "See
   who is training", the getting-started nudge (the activation banner). Each
   keeps its own conditions and safety gates.
5. "Since your check-in" (unchanged).
6. "N people you follow trained today", for Community members (unchanged,
   with its safety gate).
7. The plateau note, when there is one.

Leaves Today:
- The Welcome card: the main card already says "Start your first workout".
  The injuries question keeps its timing (it waits for the first session,
  the moment the welcome card used to retire).
- The Community header button: the Community tab has its own dot. Today's
  header gets the default brand mark like the other tabs.
- The last-session row: moves to Train (batch 2).
- The challenge row: Community is its home.
- The two always-on injury lines (how the plan works around an injury; the
  reintroduction ramp line) and the read-failure line: move to Train
  (batch 2).

## Batch 2: Train (your plan and your workouts)

1. The plan card: name and style ("Training style: X" as a line, its rules
   unchanged), "Week 3 of 6" with its info button, this week's days ("2 of 4
   done" with the day cells, moved from Progress), Start next workout, View
   plan. The peak-week note stays.
2. This week's training volume strip, moved from Progress (opens the
   one-week volume view as now).
3. The block card, unchanged.
4. Recent sessions (moved from Progress), with All sessions; the most recent
   one carries Repeat (moved from Today's last-session row).
5. Your setup: Adjust training plan; Injuries & limitations, with the
   always-on injury lines from Today under it and Avoided movements inside
   that screen.
6. Plans: the plan library, Create your own, Past blocks (the training
   blocks screen), Previous plans, Archived plans.
7. Saved workouts.

Cut: the "Your coach reviews this plan each week…" paragraph, the separate
"Week complete. Your next session is on Monday." line, the separate
Training style and Avoided movements rows, the two-line descriptions under
each tool (one short line each). With no active plan, the plan-week
count ("N sessions so far this week") shows on Train when it showed on
Progress.

Also in this batch: remove from Today the last-session row and the injury
lines; remove from Progress the plan-week card, the volume strip, Recent
sessions, and the "Volume heatmap" and "Full history" rows.

## Batch 3: Nutrition (the diary comes first)

1. Day picker.
2. Calorie and macro card. Tapping the target opens Nutrition targets, and
   "Targets updated. See why" sits inside the card.
3. One planned-meals line ("3 planned meals · Mark all eaten · Clear"). It
   replaces the bottom banner and the two hint captions.
4. Meals, Add another meal, Water.
5. Tools: Meal builder and Higher-calorie day (its safety gate unchanged).
   "Copy yesterday" joins "Copy from another day", with yesterday first.
6. One offer at a time, below the meals instead of above them: the
   meal-reminder offer, else the barcode-fixes offer (each with its own
   conditions and gates).

Trends (the header door stays) and Nutrition targets leave Day tools.
"Set up coaching" stays as decided on 20 October.

## Batch 4: Coach, with Progress inside

1. Header "Coach" with the settings button; the subtitle goes.
2. Set up coaching card and the load-error card, unchanged.
3. This week: one card that changes through the week. It shows the
   countdown first, then "Check-in is open", then "This week's decision ·
   See why". "Your week" and "Past decisions" sit under it. It replaces the
   decision card and the three "This week" rows (their wording rules under
   calm mode and an ED flag carry over).
4. Your progress: Training, Body, Progress photos, Recovery. Their safety
   rules do not change.
5. Looking back: Consistency, Recaps, Year of lifts. The monthly recap
   invitation becomes the Recaps row's own line in the first days of the
   month instead of a banner.
6. Your coaching setup: Goal and phase (with the focus line, for example
   "Building · 4 days a week", as its subtitle), and Nutrition targets.
7. Safety checks: unchanged.

Leaves Coach: the subtitle; the profile card and the Athlete profile screen;
the Injuries row (home: Train); the Community row; Coaching reminders (home:
Settings).

Athlete profile retired, its parts moved: your photo and details go to
Settings, Profile; body weight goes to Body; strength level goes to
Training; Volyume Score goes to Progress photos. Each part keeps its safety
rule.

## Batch 5: Community and Settings

Community (small changes; its layout was set recently):
- People loses its search box (the header search does the job) and its
  Requests row (requests are under the bell).
- You gets one "My profile" row instead of two.
- The "Partner invites have moved" notice is retired.

Settings:
- The "Community" row opens Community privacy and sharing instead of the
  tab.
- "Injuries & limitations" and "Nutrition targets" leave Settings.

## Order of work

Round 1: batch 1 and batch 3 in parallel. Round 2: batch 2 and batch 5.
Round 3: batch 4. Each batch lands on main over a green full run with a
phone checklist. No build is started; the owner runs builds.

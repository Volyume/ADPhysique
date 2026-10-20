# Volyume: current app map

Built 2026-10-20 from the code on `main` at version 3.2.0. It was derived
only from source code, configuration (`app.json`, `eas.json`,
`package.json`), Supabase migrations and tests. No earlier map, status file
or Markdown document was used.

**How to read the labels.** Every statement is *observed in code* unless it
carries one of these labels:
- **[comment claim]**: it rests on a code comment or a migration header, not
  on behaviour that was traced.
- **[not verified]**: it was looked for and not confirmed.
- **[documented claim, not verified]**: it comes from a document.

Internal route or file names are in `code` brackets. Paths are relative to
the repository root.

Screenshots are in `screenshots/current/`. They are dark-theme renders from the repo's own harness
(`scripts/paper-render/`, Jest plus headless Chromium, with a seeded
example user). The harness has two limits: images (avatars, the brand mark)
show as dark boxes, and chart canvases are not drawn. Otherwise the layout,
text, hierarchy and empty states are the real screens'.

---

## 1. What the app is

Volyume is a strength training, nutrition and coaching app for Android and
iPhone. People log workouts and food. A rule-based coach then sets the
training plan, calorie and macro targets and adjusts both weekly from what
was logged. It has a Community (feed, follows, messages, groups, boards) and
a gym challenge facility.

These principles are enforced in code:

- **Fully free.** `src/lib/proGate.js:43` sets `FULL_ACCESS_FOR_ALL = true`, so
  every signed-in user resolves to full access. Billing code exists but is
  dormant and unregistered (section 13).
- **Offline first.** The phone's encrypted SQLite database is the source of
  truth. The cloud is a sync target (section 12).
- **Predictable coaching, no AI.** Plan building, targets and weekly
  adjustments are pure functions with fixed rules. No language model is
  called anywhere in the engine.
- **Health data needs consent.** A separate consent screen must be accepted
  before the app opens (section 2.2).
- **Eating-disorder safety.** There are calorie floors, an eating-disorder
  pattern flag, calm mode, the Beat UK helpline and a wellbeing check, and
  they change what many screens show (section 11).
- **No personal data in usage data or error reports.** Usage events carry
  only enums, yes/no values, small counts and ranges. Error reports are
  scrubbed (section 12).

---

## 2. Getting in

### 2.1 What decides the first screen
`src/navigation/RootNavigator.js` (render decision ~2571-2737). The first
match wins:

1. A splash screen shows while sign-in, first-run and consent checks load.
2. If the sign-in check fails, the "Could not check your sign-in" retry
   screen shows.
3. If the local database cannot open, the "Could not open your data" screen
   shows. A reset is offered after two failures.
4. Not signed in: the Welcome screens (`Welcome`, `Login`, `PrivacyPolicy`).
5. Signed in without health consent: the consent screen
   (`Article9ConsentStack`).
6. Signed in, consented, setup not finished: onboarding
   (`ProOnboardingStack`).
7. Otherwise the main app (`LockedMainTabs`, which is the six tabs behind an
   optional Face ID or fingerprint lock).

### 2.2 Sign-in and consent
- **Sign-in:** Apple (iPhone only), Google (Android only), or email and
  password (`src/lib/supabase.js`, `src/components/auth/*`). There is no
  guest or anonymous mode; no such code path exists.
- **Health data consent** (`Article9ConsentScreen`): it records consent
  through the `record_health_consent` RPC with a pinned version and caches
  it locally. If the network call fails, consent is queued and retried.
  - A new account cannot pass without consent. If the consent read never
    settles, a 15-second failsafe routes a new user to the consent screen,
    not past it.
  - Withdrawing consent is tied to deleting the account: Settings > Privacy
    > "Delete account and withdraw consent".
  - Community calls are refused unless consent is `true`
    (`src/lib/community/transport.js:158-180`).
  - Usage events, apart from a small pre-consent list, are dropped until
    consent (section 12.4).

### 2.3 Onboarding
- **Where it starts:** `StartChoice` ("How would you like to start?"), or
  `ChallengeJoin` if the person arrived through a gym challenge link
  (`RootNavigator.js:901`).
- **Start choice** (`src/screens/StartChoiceScreen.js`) offers three routes:
  - **Set up coaching (Recommended):** the full setup wizard
    (`ProOnboarding`). If the person is in a challenge, the card adds that
    coaching earns up to 20 more points.
  - **Pick a ready-made plan:** opens the plan library.
  - **Build your own:** opens the manual plan builder.
  - The second and third routes mark coaching as "not set up"
    (`profile.coachingDeferred = true`). A "Set up coaching" card then
    appears on Today, Nutrition, Meal plans, Targets, Weekly check-in and
    Coaching decision until it is done (`src/lib/coachingSetup.js:46`).
- **Setup wizard** (`ProOnboardingScreen`): seven steps. Every required field,
  including biological sex, blocks progress until chosen. Nothing is
  pre-selected.
  - The training-style step is the internal step 7, shown to the user as
    "Step 6 of 7 - Targets, Set your training focus". It asks for the goal,
    the competition category, the training style (section 4.2), up to three
    muscles to bring up, and the protein target.
  - Progress is saved as a draft, so the wizard resumes where it was left.
- After setup the person lands on the Train tab once (`postSetupLanding`).

Screenshots:
- `11-onboarding-start-choice.png`: the three start options, coaching
  recommended.
- `12-onboarding-training-style.png`: the goal and category pickers, six
  training-style cards with muscle maps, the bring-up chips and the protein
  target.

### 2.4 Tabs
Six tabs, in this order (`RootNavigator.js:817-822`). The tab bar hides
during an active workout.

| Tab label | Route | Root screen |
|---|---|---|
| Today | `HomeTab` | `HomeScreen` |
| Train | `PlansTab` | `PlansScreen` |
| Nutrition | `DiaryTab` | `DiaryScreen` |
| Progress | `ProgressTab` | `AnalyticsScreen` |
| Community | `CommunityTab` | `CommunityHubScreen` |
| Coach | `ProfileTab` | `YouScreen` |

Size: 146 screen registrations, 105 distinct screen names, 108 screen
files in `src/screens/`. The extra files are dormant billing screens that
are not registered.

### 2.5 Links that open the app
- **Custom scheme:** `volyume://`.
- **Android:** verified web links on `https://volyume.app` for `/partner`, `/u`
  (profile), `/p`, `/s` (post), `/g/` (group) and `/c/` (gym challenge)
  (`app.json:84-180`).
- **iPhone: no web links open the app.** There are no `associatedDomains`, so
  on iPhone a `volyume.app` link opens the website. Only `volyume://` links
  open the app.
- **In-app paths** include `workout/start`, `active-workout`, `community`,
  `diary/:date?`, `routine/:planId`, `progress`, `coach`, `checkin` and
  `c/:code` (`RootNavigator.js:1015-1121`).
- **Gym challenge codes** are kept through sign-in and consent
  (`src/lib/challenges/pending.js`). If a different person signs in, the code
  is dropped. On Android, the Play install referrer (`challenge=<code>`) also
  carries a code into a fresh install, read once and only within 3 days.

---

## 3. Today (`HomeScreen`)

Screenshot `01-today.png`: the check-in banner, the next-session card, the
challenge card and the tab bar.

Cards render top to bottom when their condition holds:

1. **Header** with the Community action.
2. **Friends trained today row:** for Community members only. It is hidden
   under calm mode, an open ED flag or a failed read.
3. **Weigh-in box** (`TodayStrip`): shown when coaching is set up and no
   weight has been logged today. Under an open ED flag or a failed read it
   names no figure and opens empty; under calm mode alone it may still show
   the last weight (`safetyState.js:100-103`, `withholdsWeightFigures`).
4. **One "today line":** a single row chosen by rank: block complete,
   coaching decision, weekly check-in, recovery, re-entry, then nutrition
   phase. It is hidden during a workout.
5. **Welcome card:** before the first session, until dismissed.
6. **"How you train" offer:** when nothing is set up yet.
7. **Plan rebuild note and choice:** only when they have something to say.
8. **The main card, exactly one of:**
   - "Workout in progress".
   - "Block complete", with "Choose what comes next" and "Share this block".
   - "Week complete", with "Do another session".
   - The next session (Start workout, Options, a coach line and a readiness
     chip).
   - A plan with no sessions.
   - "No active plan yet", with "Start your first workout".
9. **"Set up coaching" card:** when coaching was skipped at the start.
10. **Evidence panel:** coaching progress. Under calm mode, an ED flag, a
    wellbeing score of 2 or more, or a failed read, it shows a countdown only,
    with no counts.
11. **Last session card.**
12. **Gym challenge card:** when the person is in an active or ended
    challenge.
13. **Community intro:** after the first session, until dismissed.
14. **Plateau or activation banner:** one at a time.
15. **"Injuries & limitations" group:** when any are set.

Sheets reached from Today include block shape, workout options, recovery
detail, a "How are you feeling today" readiness prompt, plan preview and
What's new.

**What changes the screen.** The rule is `src/lib/safetyState.js`:
`suppressed = calm mode OR open ED flag OR failed safety read`. When it
holds, valence (good or bad framing) and counts are withheld across Today.
Weight figures follow a narrower rule, `withholdsWeightFigures`: an open ED
flag, a failed read or an unknown state, but not calm mode alone. Coaching not set up adds the setup card.

---

## 4. Train

### 4.1 Plans
- **Train tab** (`PlansScreen`; screenshot `14-train-plans.png`) shows:
  - the active-plan card ("Start next workout", "View plan") and a
    block-advisor card;
  - plan tools: Injuries & limitations, Training blocks, Avoided movements,
    "Adjust training plan", "Pick from the plan library" and "Create your
    own";
  - previous plans, archived plans and saved workouts.
- **Plan library** (`PlanLibrary`): search, collection chips (Fits your
  limitations, Kettlebell, Circuits, Minimal equipment, Dumbbells only,
  Bodyweight, Bands, Short sessions, Beginner, For women, For men,
  Bodybuilding divisions), a quiz giving "your coach's suggestion", and
  "Preview plan" / "Add to my plans".
- **Plan detail** (`PlanDetail`): the plan's workouts, "Why this plan, for
  you", reorder, edit and archive.
- **Build your own** (`ManualBuilder`): days, exercises, supersets and
  circuits. It can save a draft, save and activate, or save changes.
- **One-off workout** (`BuildWorkout`): a blank workout or a quick full-body
  fill, started at once.
- **Training blocks** (`MesocycleBuilder`): block weeks, deload weeks, past
  blocks, block summaries and weekly load and recovery.
- **Adjust training** (`PlanUpdate`): a form covering category, training
  style, weak points, experience, days, session length, equipment and
  recovery. "Review my plan changes" previews the plan before replacing it.
- **Plan generation** runs through `generateAndSavePlan`
  (`src/lib/planAutoGen.js:994`) and the structure engine `buildStructurePlan`
  (`src/lib/structure/engine.js:2373`), which is live (`STRUCTURE_ENGINE =
  true`).
  - Inputs: goal, 2-6 days, session length, equipment, experience, focus
    muscles, the training style and the exercises the person already logs.
  - The engine either returns a plan or refuses with a reason. A refusal
    can suggest a different number of days or a different session length.

### 4.2 Training styles (archetypes)
There are six (`src/lib/trainingArchetypes.js:14-21`; effects in
`src/lib/structure/rulebook.js:150-167`). They are chosen in onboarding,
Adjust training and Update goal.

| Style | What it changes |
|---|---|
| Balanced | Nothing; every muscle trained evenly |
| V-taper | Upper-biased split; lats, side delts and upper back are priority, legs maintenance |
| X-frame | Lats, side delts, quads and hamstrings are priority |
| Upper-body density | Density split; chest, upper back and lats are priority, legs maintenance |
| Powerbuilder | Power split, main lifts at 3-6 reps (not for beginners); quads, glutes, chest and upper back are priority |
| Minimalist | Every muscle at its weekly minimum |

The style picker is hidden and ignored for anyone competing in a physique
category (bodybuilding, classic physique, men's physique, bikini, wellness,
figure, women's physique).

### 4.3 Workout logger (`ActiveWorkoutScreen`)
Screenshot `02-workout-logger.png`: an exercise with logged and pending
sets.

- **Set types:** working (straight), warm-up, drop set, myo-reps, rest-pause
  and AMRAP. Row markers are W, D, M, R and A. Myo-reps and rest-pause log as
  one summed row. Sets can be edited, deleted with Undo, or retyped.
- **Logging a set:** checks the entry, saves it, starts the rest timer and
  can move to the next set. The keyboard bar shows "Log set", "Start" or
  "Finish".
- **Warm-ups:** offered for compound weighted exercises before the first set.
  The ramp assumes a 20 kg bar with 2.5 kg rounding. Warm-ups never count
  towards working sets or volume.
- **Rest timer:** default 90 s, with -15 s, +15 s and Skip. It can be set per
  exercise from 0:30 to 10:00. Cluster mini-sets rest 20 s.
- **Exercise options:**
  - Swap exercise, with the choice "Just this session" or "From now on".
  - "I cannot do this", which offers "Just for today" or "From now on"; the
    second adds it to Injuries & limitations.
  - Add, reorder, shorten the session or remove an exercise.
- **Grouping:** supersets, giant sets and circuits.
- **Discard:**
  - An empty session is dropped silently; otherwise "Discard workout?".
  - A stale session offers Resume, Finish or Discard.
- **Finish:**
  - The logger checks "That is everything" or "Something left".
  - Ending early asks to confirm.
  - It then opens the workout summary.

### 4.4 Workout summary (`WorkoutSummaryScreen`)
Screenshot `15-workout-summary.png`.

- **Header and stats:** "Workout complete", a milestone card, the total
  weight lifted and a verdict, and stats for exercises, working sets and
  duration.
- **Context:** the block arc, the PR line, this week's volume, a block
  finished story and the session adjustment.
- **Optional feedback:** difficulty, muscle engagement, joint discomfort and
  fatigue.
- **Actions:** the videos row, "Save this workout to reuse", Done, and Share
  (when there are working sets).
- **Calm mode or ED flag:** some blocks are hidden.
- The same screen serves as the read-only history view.

### 4.5 Set videos (`ClipCameraScreen`, `src/lib/clips/*`)
- **Recording:** silent video (no microphone requested), 1080p, front camera
  mirrored.
  - Length 60, 90 or 120 s (default 90), with a countdown of 3-20 s.
  - Press and hold records up to 120 s; anything under 1 s is dropped.
- **Storage: on the phone only.** Files live in the app's `clips/` folder and
  a local `workout_clips` table.
  - Videos are never synced, never backed up, and Community cannot reference
    them (a guard test pins this).
  - Up to 3 per workout. They are kept 7, 30 or 90 days or forever (default
    7). PR videos are never cleared automatically.
- **Sharing:** a video becomes the background of a share image (section
  10.2), trimmed to at most 15 s. The finished video goes to the phone's share
  sheet, where the person chooses where it goes. The app never uploads the
  raw clip.

### 4.6 Other training screens
- **Workout history:** a list or calendar, with View summary and Repeat.
- **Lifts** (`LiftProgress`): a lift list, a weight-lifted chart, a
  relative-strength standing and a share image.
- **Volume heatmap:** a body map and per-muscle volume bands over 1, 2 or 4
  weeks.
- **Recovery:** readiness and a link to the weekly volume review.

---

## 5. Nutrition

### 5.1 Diary (`DiaryScreen`)
Screenshot `03-nutrition-diary.png`: the calorie ring, the macro bars and
the meals.

- **Header and day view:** "Nutrition", a Trends button (`FoodInsights`),
  and a day pager with jump-to-date.
- **Calorie ring and bars:** protein, carbs and fat bars, with fibre
  optional. The colours do not judge (no red for "over").
- **Targets:** one flat daily target. A "Targets updated. See why" chip
  appears when the coach has changed calories.
- **Meals:** numbered Meal 1 to N (default 4), plus optional pre- and
  post-workout slots. Meals can be renamed and added.
  - An empty meal offers usual foods, "Yesterday's" meal and an hour-based
    suggestion.
- **Adding food:** search, barcode scan, one-tap usuals and saved meals.
- **Copying and moving:**
  - "Copy yesterday" and "Copy a previous day".
  - Multi-select Move, To today, Save meal and Delete.
- **Planned meals:** these arrive from meal plans as planned rows.
  - Nothing counts until "Mark as eaten".
  - Future days cannot be confirmed.
- **Water:** +/- 250 ml per tap or 500 ml held. The target is 3000 ml by
  default, adjustable from 1000 to 6000.
- **Higher-calorie day:** move 50-500 kcal onto a day. It is only offered
  when targets exist, the target is not on a floor, and no ED flag is open.

### 5.2 Finding and adding food
- **Food data order** (`src/lib/food/waterfall.js`):
  1. The phone's own foods.
  2. A bundled Open Food Facts UK snapshot.
  3. Bundled CoFID UK generic foods (about 3,000).
  4. Live Open Food Facts.
  5. USDA, only if an API key is configured.
- **Food search** (`FoodSearch`):
  - Tabs: Recent ("Add again"), Suggested, Favourites, Often, More.
  - Also "Around this time", and typing a whole line of several foods to
    review at once.
  - A plate collects items, "Log N" writes them together, and Undo is
    offered.
- **Barcode scan:** a hit opens the food. A miss goes to label scan, which
  reads the front of the pack and the nutrition panel with on-device text
  recognition and pre-fills a custom food.
- **Custom food:** up to 3 named portions, 1-5000 g each.
- **Recipes:**
  - Servings and an optional cooked weight (1-50,000 g).
  - Import from a web address.
  - Log by servings or by grams.
- **Saved meals:** list, log, rename, edit and delete.
- **Trends** (`FoodInsights`):
  - 7, 14, 30 or 90 days, with calorie, protein and macro charts.
  - CSV and PDF export.
  - Under calm mode or an ED flag, totals stay and good or bad framing goes.

### 5.3 Raw or cooked weights (new)
`src/lib/food/cookYield.js:33-46`.

- **Foods covered (12 pairs, from CoFID):** white rice, brown rice, pasta,
  white potato, sweet potato, chicken breast, turkey breast, lean steak,
  5% beef mince, cod, salmon and bacon medallions.
- **How it converts:** the ratio comes from a nutrient that does not change
  in cooking (carbs for grains and potato, protein for meat and fish).
  Switching changes the grams shown, never the calories or macros.
- **Foods not covered:** oats, quinoa, lentils, turkey mince, tinned beans
  and cooked prawns.
- **Where it appears:**
  - a day-wide "Show weights: Raw or dry / Cooked" switch on the meal plan;
  - per-item "Weighed Raw / Cooked" chips on the meal plan;
  - the same chips on the food detail sheet.
- **Rounding:** under 15 g rounds to 1 g, otherwise to 5 g.
- A stale comment at `MealPlanScreen.js:905-908` says no conversion exists;
  the code does convert.

Screenshot `04-meal-plan-weights.png`: a built day plan with the switch set
to Cooked.

### 5.4 Meal plans (`MealPlanScreen`)
- **Before building:** set meal preferences (dietary needs, 3-6 meals a day,
  variety Repeat, Mixed or Varied), then "Build today" or "Build week".
  - A saved nutrition target is required.
- **How plans are built:** with fixed rules, from curated meals, the
  person's saved meals and their own recipes, to land each day within the
  target band. A day that misses the band is flagged.
- **Editing:**
  - swap a meal or a food, or "leave out for good";
  - keep a meal, repeat a day, or refresh;
  - rebuild when dietary needs conflict.
- **Into the diary:** "Add this day" or "Add this week" adds planned rows.
  Days that already hold food are skipped.
- **Shopping list:**
  - "Shop weight" (raw or dry first, cooked beside) or "Meal prep weight"
    (cooked first).
  - A one-day plan can be scaled to 1, 3, 5 or 7 days; a week plan sums the
    week.
  - Foods with no raw or cooked pair are listed unchanged.

### 5.5 How targets are worked out (`src/lib/nutritionEngine.js`)
- **Energy:**
  - BMR uses Katch-McArdle when a usable body-fat figure exists, otherwise
    Mifflin-St Jeor.
  - The activity factor is 1.2 to 1.725.
- **Goal adjustments:**

  | Goal | Adjustment |
  |---|---|
  | Lean gain | +10% |
  | Build | +17% |
  | Maintain | 0 |
  | Recomposition | -5% |
  | Mild cut | -13% |
  | Aggressive cut | -22% |

  Any surplus is scaled by experience.
- **Protein:** a floor per approach of 2.0, 2.2, 2.5 or 1.2 g/kg (custom up
  to 3.5).
- **Fat:** 0.75-1.0 g/kg, never under the larger of half bodyweight in grams
  and 40 g.
- **Carbs:** the remainder.
- **Range:** the target is shown with a band of ±10%.
- **Safety limits** (section 11.1).
- **Calorie choice slider:** moves inside the band in 25 kcal steps. Its
  lowest point is the highest of the band's low end, the sex floor, the FFM
  floor and the 0.8%-a-week loss line.
- **Hidden under calm mode or an ED flag:** the slider and "Training status"
  (Natural or Enhanced). Calm mode also hides the aggressive cut goal.

---

## 6. Progress (`AnalyticsScreen`)
Screenshot `05-progress.png`.

- **Overview:** this plan week and a volume strip.
  - "Your progress" pillars: Training (Lifts), Body (measurements),
    Progress photos and Recovery.
  - Recent sessions and a recap card.
  - More: Consistency, Volume heatmap, Full history, Recaps (after 10
    sessions) and Year of lifts (after a year).
  - Before any training it shows "No training trends yet".
- **Body measurements** (`BodyMetrics`):
  - Weight in kg, stone or pounds; body-fat % with its method; nine tape
    sites.
  - A trend chart, maintenance calories, recomposition, readings and history.
  - Under calm mode a "A gentle pause" screen shows once per visit. Calm mode
    or an ED flag withholds the verdict, rate, maintenance and recomposition,
    while the person's own entries stay visible.
- **Progress photos** (`ProgressPhotos`):
  - Stored on the phone only, in `progress_photos/`, with location data
    stripped. Never uploaded.
  - Compare, trend and share.
  - A body scan needs a front and a back photo (side optional) and is
    analysed on the phone, with a 7-day prompt.
  - Under calm mode or an ED flag, compare, share, trend, score and weight
    are hidden.
- **Consistency:** plan week, 12 weeks, block, weight lifted, sessions and
  "Signs of building fatigue". No safety read was found here.
- **Recaps and Year of lifts:** month, week, block and year stories. The
  framing is neutral under calm mode or an ED flag.
- **Your week** (`WeeklyStory`): chapters for training, eating, body and the
  decision. The body chapter is withheld under calm mode or an ED flag.

---

## 7. Coach tab

### 7.1 Coach home (`YouScreen`)
Screenshot `06-coach-home.png`.

- **Profile card** and the latest "Weekly coaching decision".
- **Your body:** Injuries & limitations.
- **This week:** Weekly check-in, Coaching decision, Your week, Community.
- **Setup** (once coaching is set up): Update goal and phase, Nutrition
  targets, Coaching reminders.
- **Safety checks:** Goal lock and Wellbeing check.
- The gear opens Settings.

### 7.2 Weekly check-in (`WeeklyCheckInScreen`)
Screenshot `07-weekly-check-in.png`: the quick check-in, before ratings.

- **Full check-in, four steps:**
  1. Energy, stress and sleep.
  2. This week's data (calorie and step adherence, weight).
  3. Soreness, muscles, joint pain and notes.
  4. Training performance.
- **Quick check-in:** when everything else can be read from the logs, only
  energy and soreness are needed.
- **When it can run:**
  - Not on the wrong day.
  - Not before 5 days of data since the first weight log (first check-in
    only).
  - At least 3 weigh-ins in the last 7 days.
  - Late and already-done states are handled.
- **Calm mode or ED flag:** the calorie judgement and the trend weight are
  dropped.

### 7.3 Coaching decision (`CoachOutput`)
Screenshot `08-coach-output.png`.

- **Nutrition card:** the calorie change, with Apply or "Keep as is". It
  says so when a floor holds or limits the change.
- **Training next week:**
  - Apply the volume change, or "Take a recovery week".
  - A deload never goes below half the minimum effective volume, or 1 set.
- **Diet break card:** "Set maintenance calories", after 8 weeks of dieting.
- **Held decisions, with reasons** (`src/lib/weeklyCoach.js:2034-2130`):
  - the ED-pattern lockout and its clearing;
  - FFM floor;
  - target not tested yet;
  - declined last time;
  - waiting on the last change;
  - one change at a time;
  - volume outcome memory;
  - a data hold (fewer than 3 morning weigh-ins).
- **Autonomy:**
  - Manual removes Apply.
  - Collaborative asks.
  - Coached applies automatically unless a safety hold stands.
- **Related screens:**
  - "Coaching history" (`CoachHeldHistory`) lists every weekly decision. Its
    scorecard is hidden under calm mode or an ED flag.
  - "Weekly volume review" (`CoachReview`).
  - "Block summary" (`BlockReflection`).
  - "Update goal" (`ProGoalSetup`) recalculates the targets and shows a
    change summary, which is neutral when an ED flag is open.

### 7.4 Goal lock, wellbeing check, injuries
- **Goal lock** (`GoalLockConsent`): standard or advanced ("prior experience
  or working with a coach"). Advanced raises the ED-pattern threshold from 2
  signals to 3. The FFM floor is unaffected [comment claim].
- **Wellbeing check** (`WellbeingCheckScreen`): five SCOFF yes/no questions.
  - The answers stay on the phone; the score is saved to the profile and the
    account.
  - A score of 2 or more shows "Thank you for sharing that" with a
    suggestion to see a GP or a registered dietitian.
  - The score also feeds the neutral evidence panel on Today and the Coach
    home.
- **Injuries & limitations** (`HowYouTrain`):
  - Long-term or temporary; "Waiting for you"; "Temporary right now", with
    Still going or Done with it.
  - Each can be a movement or position, a pattern, an exercise, or an
    exercise that is always fine.
  - Durations are open, a week, a fortnight or a month.
  - Export and delete are available.

---

## 8. Community
Screenshot `09-community-home.png`: a joined member's feed (empty
"Follow a few people" state) with the challenge invite card.

- **Transport:** every Community call is an RPC through
  `src/lib/community/transport.js`. Calls are refused after sign-out, without
  health consent, or with no session. Push notifications go through the
  `community-notify` edge function.
- **Hub:**
  - Feed, People, Groups and You.
  - Feed scopes: following, gym, groups and everyone. Sorts: newest or most
    respected. The feed is in time order, not ranked.
  - Someone without a profile can read the Everyone feed.
- **Joining:**
  - A handle of 3-20 lower-case letters, numbers or underscores, changeable
    once every 30 days.
  - A public or followers-only profile, a gym, up to 3 disciplines and up to
    3 style chips.
  - Rules version 3.
- **Posts:** PR, session, block, milestone or note.
  - Each kind accepts a fixed list of fields. Weight, food, scan and injury
    fields are refused.
  - Audience: public, followers or groups.
- **Automatic posts:**
  - Finishing a workout posts one session and up to three PRs when "share
    sessions" is on. Adults default to on with audience everyone.
  - Calm mode or an ED flag stops automatic posts on the phone. On the server
    an open ED flag withholds them; calm mode does not [comment claim,
    migration 192].
  - Manual posts stay allowed after a gentle confirm.
- **Respect and comments:** respect (likes) and comments of up to 500
  characters, plus "Respect everyone who trained today".
- **Follows and connections:**
  - Followers-only profiles use follow requests.
  - Connections carry a reason and a note of up to 120 characters.
- **Messages:** one to one, up to 1,000 characters. The push says "New
  message from @handle" and never includes the text.
- **Groups:**
  - Open or invite-only, with a name of up to 40 characters.
  - Text-only group chat of up to 500 characters.
  - Group challenges: one active per group, up to 31 days, a target of 1-200
    sessions, counting sessions only.
- **Boards:**
  - Scopes: gym, following, everyone or group. Windows: week, month or
    consistency (weeks in a row). No all-time board.
  - The metric is session count.
  - Fewer than 8 people means no ranking.
- **"Training now":** opt-in and shown to followers and group mates only. It
  goes stale after 3 hours and is cleared under calm mode or an ED flag.
- **Moderation:**
  - Reports cover profiles, posts, comments, messages, groups and group
    messages, with six reasons including "harmful body or eating content".
  - A post, comment or plan auto-hides once 3 different people have open
    reports on it. Profiles, messages and groups never auto-hide
    (`supabase/migrate_160_community.sql:1154-1172`).
  - Moderators can dismiss, hide, delete, restrict and suspend.
  - Members can block and mute.
  - A keyword filter runs on the phone and on the server.
- **Limits:**
  - New accounts (first 7 days): 3 posts a day, 10 comments an hour and 30
    follows a day.
  - Established accounts: 10, 30 and 100.
- **Under-18s:**
  - Forced to followers-only, and an unknown age counts as under 18.
  - Defaults to no automatic posts.
  - Excluded from search, suggestions, boards, groups, "training now" and
    connections.

---

## 9. Gym challenge (new; server migration 201)
Screenshot `10-gym-challenge.png`: a joined challenge showing 64 of 100, the
parts, the coaching parts and the top 10 board. The data is mocked for the
render.

- **Ways in:**
  - a `volyume.app/c/<code>` link or QR code (opens the app on Android; on
    iPhone it opens the web page, see 2.5);
  - the Android install referrer;
  - a gym invite card in Community for members whose gym has a challenge;
  - typing the code on the challenge screen;
  - the Today card.
- **Joining:** the person confirms they are 18 or over, chooses to show their
  name or their handle, and sets planned sessions a week (2-6).
  - Known under-18s are refused.
  - Joining is possible only while the challenge is upcoming or active.
- **Score out of 100:**

  | Part | Points | Basis |
  |---|---|---|
  | Train to your plan | 40 | training days against target |
  | Hit your week | 15 | weeks hit |
  | Get stronger | 15 | 3 points per lift beaten, up to 5 |
  | Be part of it | 10 | a Community post in the week |
  | Weekly check-in | 10 | coaching |
  | Food logging | 6 | a day with food logged, up to 3 a week |
  | Weigh-in | 4 | one a week |

  - The first four parts are core (80 points). The last three come with
    coaching (20 points).
  - A workout counts if it lasts 20 minutes or more, has 6 or more working
    sets and is synced within 7 days.
  - Food and weigh-ins count only that something was logged, never amounts.
- **Board:** entrants only, top 10 by score, shown by name or handle, plus
  how many have reached each draw level.
- **Safety:** a person under calm mode or an open ED flag:
  - is never shown on anyone's board;
  - sees their own score as withheld;
  - has the food and weigh-in rows hidden;
  - is not invited to log food or weight;
  - still gets the food and weigh-in points for those days, from an hourly
    server reading of the gate;
  - stays in the draws.
- **Draws** (server only):
  - A main draw at 70 points or more and a second at 50 or more, by default.
  - Winners are picked at random. The eligible list and its fingerprint are
    stored.
  - A winner is excluded from later draws, and known under-18s are excluded.
- **Free for life:** joining writes a grant that survives withdrawal. No app
  code reads it, because the app is free.
- **Web pages:**
  - `public/c/index.html` is the landing page. It shows the challenge, the
    scoring, the free-for-life line, "Open in Volyume" and "Get Volyume". It
    has no tracking and is not indexed.
  - `public/challenge-terms/index.html` has the terms. Volyume is the
    promoter; the postal address is blank on purpose.
- **Status:** the server side is live [comment claim, migration 201 header].
  No challenge has been created [not verified in this pass].

---

## 10. Supporting systems

### 10.1 Notifications (`src/lib/notifications/*`)
- **Categories:** 26, each with a channel (push, in-app or email). The ED
  lockout, FFM floor hold and sync error are in-app only.
- **Quiet hours:** default 22:00-07:00 and adjustable. Pushes move to the end
  of the window.
- **Budget:** at most 2 event pushes a day and 8 a week, by priority. Habit
  reminders and transactional pushes sit outside it.
- **Cancelled once done:** reminders stand down when the thing is done, for
  example a weigh-in reminder after a weigh-in.
- **Under an open ED flag, never scheduled:**
  - weigh-in reminders;
  - win-back;
  - missed check-in follow-ups;
  - the activation nudge;
  - the return nudge;
  - the planned-meal confirm;
  - meal reminders.
- **Calm mode also stops** win-back and the return nudge, and the monthly
  recap goes neutral.
- **Community pushes:** decided on the server, with no content and grouped
  within 15 minutes.

### 10.2 Share images and videos (`ShareCardScreen`, `src/lib/shareCard/*`)
- **Kinds:** session, new PR, milestone, weekly, before-and-after, plus a
  sticker.
- **Shapes:** Story, Full screen, Feed and Square, in a light or dark theme.
- **Background:** a photo, the camera, a set video or none.
  - A filter ("Look") with strength.
  - Framing by dragging and zooming.
  - For video, a trim of up to 15 s.
- **What can show:**
  - Session: sets, time, total weight lifted, chosen top lifts and the best
    lift marked "New PR".
  - PR: the PR weight and the previous best.
  - Weekly: weight progress and best lift of the week.
  - Any kind: the date, the plan name, and a quote or the person's own
    caption.
  - Exercise names appear only beside the chosen top lifts, the best lift
    and the PR; there is no full list of the session's exercises.
- **Destinations:** the phone's share sheet, Save to gallery, set as lock
  screen (Android, full screen), or Post to Community (session, PR and
  milestone only).
- **Under calm mode or an ED flag:** progress and weight wording, the phase
  label, the best-lift hero and photo and video backgrounds are removed or
  blocked.
  - The weekly card shows real weight progress only for a verified-safe week.
  - The before-and-after card may show bodyweight beside each photo.

### 10.3 Widgets
- **Android:** wired. There are two home-screen widgets, Next session and
  Weekly consistency (`react-native-android-widget` in `app.json`).
  - They never show weight, calories or body data.
  - Consistency falls back to neutral under an ED flag.
- **iPhone:** not wired. The plugin `plugins/withVolyumeWidget.js` exists but
  is not in `app.json`, and a test pins it as parked.

### 10.4 Member email
- **News by email:** on by default, switchable in Settings > Privacy.
- **Weekly summary email:** a separate switch.
- **Daily check-in:** once a day the app sends only the date, version and
  platform.
- **Server holds:** an open ED flag holds email; calm mode does not. There is
  a daily cap of 60 [comment claim, migrations 198-199].

### 10.5 Settings and accessibility (`SettingsScreen`)
Screenshot `13-settings.png`.

- **Rows:** Injuries & limitations, Account, Profile, Coaching, Workout &
  units, Nutrition targets, Dietary needs, Notifications and reminders,
  Coaching reminders, Display and accessibility, Home screen widget
  (Android), Your data, Community, Privacy and legal, Help and about.
- **Coaching:**
  - Calmer coaching (calm mode);
  - a session readiness check;
  - show the science;
  - cycle tracking.
- **Your data:**
  - import;
  - JSON backup and restore;
  - snapshot and CSV export;
  - workout videos;
  - clear history.
- **Privacy:**
  - Open Food Facts sharing;
  - "Share usage data";
  - the privacy policy;
  - app lock;
  - the email switches;
  - "Delete account and withdraw consent".
- **Display and accessibility:**
  - Theme: dark (default), light or match phone.
  - Energy units: kcal or kJ.
  - Optional nutrients: fibre, sugars and salt.
  - Switches: Larger text (sizes ×1.2), Higher contrast, Colour-blind safe
    palette (Okabe-Ito blue and purple for good and bad) and Reduce motion
    (the user's or the phone's).
  - Text follows the phone's text size, capped at 2× for reading text, 1.3×
    for interface labels and 1.15× for big numbers.
  - Haptics (small vibrations) turn off only with Reduce motion. There is no
    separate haptics switch, and the code flags this as an open decision.

---

## 11. Safety and privacy as built

### 11.1 Calorie and loss limits
Defined in `src/lib/nutritionEngine.js`; calorie floors re-enforced in
`src/lib/coachApply.js:41-42`.

- **Calorie floors:** 1,500 kcal for men (and for unknown sex), 1,200 kcal for
  women (`nutritionEngine.js:722`).
- **Fat-free mass floor:** 30 kcal per kg of fat-free mass (`:127`, `:681-706`).
  Without a body-fat figure, fat-free mass is estimated at 78% (men) or 72%
  (women) of bodyweight.
- **Loss rate:** above 0.8% of bodyweight a week the target calculation warns;
  above 1.5% a week it raises calories (`:111-112`, `:1028-1038`).
- **Energy availability caution:** 35 (men) or 40 (women) kcal per kg of
  fat-free mass [comment claim].
- **Weekly coach:** a cut is held if intake could not be read. The FFM floor
  becomes a held decision with "safety floor of N kcal".

### 11.2 Eating-disorder pattern flag
`src/lib/edPatternDetector.js`.

- **Signals:**
  - weight trend at or below -1.5% a week;
  - energy rated 2 or lower for 2 weeks;
  - under-eating against target in 2 of the last 3 weeks;
  - weight-only check-ins in 2 of the last 3 weeks.
- **Firing:** the flag is raised at 2 signals, or at 3 with the advanced goal
  lock.
- **Clearing:** the last 2 weeks must each have energy above 2, intake not
  under target and food logged, and the weight trend must be readable and not
  rapid. Missing data never clears it.
- **Storage:** the local `ed_pattern_flags` table, wiped at sign-out and
  account deletion and left out of backup restores.
  - Raises and clears go to the cloud through the `ed_flag_push` RPC; the
    pull is read-only.
  - A pulled clear never closes a flag that is open on the phone [comment
    claim].
- **Effects while open:**
  - calorie cuts are held;
  - weight and food figures are withheld across screens;
  - weight and food notifications are not scheduled;
  - automatic Community posts and "training now" stop;
  - the person is hidden from challenge boards;
  - member email is held.

### 11.3 Calm mode
`src/lib/wellbeing.js`. Calm mode is a user choice in Settings > Coaching
("Calmer coaching").

- **Effects:** most of the same withholding as an open ED flag
  (`safetyState.js`), with one difference: calm mode alone does not withhold
  weight figures on Today.
  - Today, body measurements, progress photos, the weekly story and the
    check-in calorie judgement are affected.
  - Share images are affected.
  - The aggressive cut goal is hidden.
- **Exceptions:**
  - member email continues;
  - the server does not withhold automatic posts;
  - the foreground notification handler checks the ED flag only.
- **The Beat UK helpline** is held in `WELLBEING_HELPLINE`: "Beat Eating
  Disorders UK: 0808 801 0677 (free, confidential)". The web link
  `beateatingdisorders.org.uk` is in `src/lib/whyThisTemplates.js`. Every
  screen that shows them was [not verified].

### 11.4 Share and privacy rules
- **Share images:** exercise names appear only beside the chosen top lifts,
  the best lift and the PR, never as a full session list. Weight progress
  appears only on a verified-safe weekly card. Bodyweight appears only on the
  before-and-after image. All of this is withheld under calm mode or an ED
  flag (10.2).
- **Kept on the phone:** set videos and progress photos never leave the
  phone unless the person shares an image or video themselves.
- **Usage data** (`src/lib/telemetry/*`):
  - 39 declared events in `src/lib/telemetry/schema.js` (app, onboarding,
    food, workout, coach, challenge, plan, performance, community).
  - Each event declares its fields. Undeclared fields and invalid values are
    dropped.
  - Before health consent, only a handful of events are sent (screen views,
    session end, screen ready, error shown, setup stalled, plus sign-in and
    consent events).
  - Private screens (injuries, wellbeing check, coaching history) report as
    "Private".
  - No event carries calm mode or an ED flag.
  - The person can turn it off ("Share usage data").
  - The server deletes rows older than six months, daily, and its summary
    views show a group only at 10 people or more [comment claim].
- **Error reports** (Sentry): weight, body, food, constraint and safety-flag
  keys are redacted before sending (`src/lib/observability/sentryScrub.js`).
  The trace sample rate is 5% (`src/lib/sentry.js:90`).

---

## 12. Data and sync

- **On the phone:**
  - SQLite encrypted with SQLCipher. The key is a random 256-bit value in the
    phone's secure store (`src/lib/dbCrypto.js`).
  - `src/lib/database.js` owns the schema and runs local migrations once each
    by `PRAGMA user_version`. About 96 migrations [not verified] and 64
    tables.
  - The food domain's queries live in `src/lib/food/db.js`.
- **Sync engine** (`src/lib/sync/*`):
  - 23 registered tables. Strategies are last-write-wins, server-wins
    (pull-only, for example the ED flag) and a per-column merge for profiles.
  - Deletes are soft and propagate as updates; the server hard-deletes after
    30 days [comment claim].
  - Older per-table code remains in `src/lib/sync.js` for tables not yet
    moved.
  - Changes push on save, with a retry queue, and the phone pulls on session
    restore. The queue internals are [not verified].
- **Feature flags** (`src/lib/sync/featureFlags.js`, all on):
  - circuit sync columns;
  - plan facts push;
  - typed-entry push;
  - structure-refused telemetry;
  - custom food portions push;
  - food entry note push;
  - recipe cooked weight push;
  - growth telemetry.
- **Never synced:** set videos and progress photos.
- **Community is separate:** it uses its own RPC transport and never goes
  through the sync engine.
- **Server:**
  - Supabase. The highest migration file is `migrate_201`.
  - Edge functions: `community-notify`, `community-public`, `delete-account`,
    `member-email-*` (admin, public, runner, webhook), `send-push`,
    `partner-cheer`, plus dormant store-billing functions.
  - Region: no region setting exists in the repo. "EU Dublin" appears only in
    code comments [comment claim].

---

## 13. Build and release facts

- **Version:** 3.2.0 (`package.json`, `app.json`).
  - iPhone build number 10; Android version code 3357. EAS manages the build
    counters remotely (`eas.json`).
  - Bundle id and package: `app.volyume`.
- **Platforms:** Android (minimum SDK 26, target 36) and iPhone (no tablet
  layout). Portrait only, new architecture on.
- **Stack:** React Native 0.81 with Expo SDK 54, in JavaScript with no
  TypeScript, and one Zustand store.
- **Free access:** `FULL_ACCESS_FOR_ALL = true`.
  - The payments package returns "billing_disabled" for every call.
  - The subscription, upgrade and cascade screens are on disk but
    unregistered.
  - `react-native-iap` is still installed.
- **Updates without a store build:** `expo-updates` is installed and the app
  checks for updates. However, no update channel or `updates` block is
  configured, so whether any update is ever delivered is [not verified].

---

## 14. Gaps and unwired items seen in code

1. **iPhone links:** iOS opens no web links (no `associatedDomains`).
   - Gym challenge QR codes and the shared profile, post and group links
     open the website on iPhone.
   - The challenge web page says "Already have the app? Scan the code
     again", which does not help on iPhone. Its "Open in Volyume" button
     does work.
2. **iPhone widgets:** not wired (10.3).
3. **Billing:** dormant (13).
4. **Free-for-life grants:** written but not read by the app (9).
5. **Haptics:** follow Reduce motion only, with no separate switch (10.5).
6. **Calm mode gaps:** calm mode does not hold member email, and does not
   stop automatic posts on the server (11.3).
7. **Age:** the coaching and nutrition engine has no under-18 rule. Age
   handling exists only in Community and the challenge.
8. **Stale comments:**
   - `MealPlanScreen.js:905-908` says no raw or cooked conversion exists.
   - The telemetry migration header says 35 events where the app declares 39
     (the 4 challenge events are in the server catalogue).
9. **Updates without a store build:** not configured (13).
10. **Screenshot limits:** the harness draws no images or charts.
    - In `10-gym-challenge.png`, the line under the board ("3 members have
      reached 80 points…") runs to the card's edge. This may be a padding
      fault on the real screen [not verified on a device].

---

## 15. Screenshot index (`screenshots/current/`)

| File | Screen | Notes |
|---|---|---|
| `01-today.png` | Today | check-in banner, next session, challenge card |
| `02-workout-logger.png` | Workout logger | logged and pending sets |
| `03-nutrition-diary.png` | Nutrition diary | calorie ring, macros, meals |
| `04-meal-plan-weights.png` | Meal plan | "Show weights" set to Cooked |
| `05-progress.png` | Progress | overview and pillars |
| `06-coach-home.png` | Coach home | six-tab bar, Coach selected |
| `07-weekly-check-in.png` | Weekly check-in | quick check-in, not yet rated |
| `08-coach-output.png` | Coaching decision | nutrition and training cards |
| `09-community-home.png` | Community | joined, empty following feed, challenge invite |
| `10-gym-challenge.png` | Gym challenge | 64 of 100, parts, top 10 (mocked data; the mock sets the main draw at 80, the default is 70) |
| `11-onboarding-start-choice.png` | Start choice | three routes, coaching recommended |
| `12-onboarding-training-style.png` | Setup, training focus | six training styles |
| `13-settings.png` | Settings | the rows in 10.5 |
| `14-train-plans.png` | Train | active plan and plan tools |
| `15-workout-summary.png` | Workout summary | stats, block arc, share |

The screenshots were rebuilt with `PAPER_RENDER_NO_FOLD=1 bash
scripts/paper-render/run.sh` (set `PAPER_RENDER_SCRATCH` to a scratch
folder), then cropped and copied here.

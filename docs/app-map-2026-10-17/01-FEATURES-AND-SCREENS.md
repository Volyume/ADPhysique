> ⚠ SUPERSEDED (2026-10-20): the current app map is `CURRENT-APP-MAP.md` at the repository root, built from the code with screenshots in `screenshots/current/`. This file is kept for history; do not build from it.

# Volyume: features and screens map

Snapshot date: 17 October 2026. App version 3.0.0 (Android via Google Play, iOS via TestFlight).

This document describes the Volyume app as it is built. It is written so that someone with no access to the code can understand the product, and so it can be pasted into another AI tool to ask for improvement ideas. Where a statement is an observation about the build rather than a product rule, it is labelled as such. Screen names are given in plain words, with the internal route name in brackets where it helps.

---

## 1. What Volyume is

Volyume is a UK-built fitness and nutrition coaching app for people who lift weights. It covers logging workouts, planning training blocks, logging food and body measurements, a weekly coaching review, progress tracking, and a community feature for sharing training. The whole product is free: there are no tiers, no trial, no paywall and no upsell anywhere in the user experience. The app works offline first: the phone holds the true copy of the user's data in an encrypted local database, and it syncs to a cloud backend hosted in the EU (Dublin). The coaching is deterministic. Its plan and nutrition maths are fixed rules, so the same inputs always give the same outputs, and no AI or language model writes or decides any coaching. Eating-disorder safety is built in at the core: calorie floors, rate-of-loss limits, a safety flag that pauses calorie reductions and some prompts, signposting to a UK eating-disorder charity, and a calm mode that quietens progress pressure. Health data (body weight, food, training that may reveal health conditions) is treated as special-category data under UK GDPR, so the app asks for explicit consent before it processes any of it.

---

## 2. App entry and gating

The app decides what to show from a fixed order of checks. Each check decides which branch of the navigator is mounted.

1. **Boot.** The app shows a plain charcoal background while it reads the saved sign-in, the first-run state, the saved tier and the consent state. There is no brand splash screen (removed deliberately). The first real screen fades in as soon as the boot checks finish.

2. **Not signed in: Welcome.** The Welcome screen is a product-led first screen with a short pitch and a start button. It opens a sign-in sheet with three options: Sign in with Apple, Continue with Google, and email (sign in with email, or create an account). There is no anonymous or guest mode. A privacy policy link is available from here.

3. **Signed in, consent still resolving.** For a signed-in account that has not finished setup, the app holds on a blank screen until it has read the health-data consent state. This is a short wait, not a screen the user chooses.

4. **Health-data consent gate (Article 9).** If consent has not been given (or, for a new account, the consent read failed and is unresolved), the user sees the consent screen. It explains what the app looks at, what leaves the phone, what the app never does with the data, the background safety check, and where the data lives. A "What if I do not agree?" panel explains the consequence. The full privacy policy can be read in-app from here. The gate cannot be skipped. A returning user who has finished setup is not re-prompted if a consent read fails.

5. **Onboarding (first run).** Until setup is finished, every user goes through the same guided setup, the Pro onboarding flow, with eight steps (shown as labels): Account, Baseline, Body composition, Training week, Your gym, Injuries and limitations, Targets, and Check-in rhythm. Each step must be answered before the user can move on. Biological sex and the other required onboarding fields cannot be skipped or defaulted. Setup can be resumed from a saved draft. It ends on a hand-off screen that explains the plan that was built and what changed, and links to the nutrition guide, notification settings, the coaching method page, and Injuries and limitations.

6. **Main app.** Once setup is finished, the user lands in the six-tab app described in section 3. Setup can land the user on the Train tab (the plan) rather than Today, once, after the setup payoff.

7. **Optional app lock.** Off by default. A user can turn on Face ID or fingerprint lock in Settings, Privacy. When it is on, the tabs sit behind a lock screen that asks for Face ID or fingerprint before they can be used. The lock never unmounts an active workout.

**Deep links.** The app answers to the custom scheme `volyume://` and to `https://volyume.app` links. Routes include a workout start, an active workout (opened from the rest-timer and workout notifications), the Community home, a Community profile, a Community post, a conversation, a group, a diary day, a plan detail, Progress analytics, the Coach output and the weekly check-in. Old partner-invite links from a retired feature now open Community with a short notice. A deep link only resolves once the user is signed in and on the main tabs; otherwise it is ignored and the user stays on the current screen.

---

## 3. The six tabs

The bottom bar shows six tabs, in this order: Today, Train, Nutrition, Progress, Community, Coach. Tapping the tab you are already on returns that tab to its first screen. A running workout appears as a mini bar docked above the tab bar ("Workout in progress, tap to return to your workout"), so the user can leave the workout and come back. Each tab keeps its own navigation history while the user switches tabs.

### 3.1 Today (home)

The Today tab is the daily starting point.

- **Workout in progress.** A banner that returns the user to an active workout.
- **Next session.** The next planned session from the active plan, with a start button. If there is no plan yet, the screen shows "Start your first workout".
- **Readiness check-in.** "How are you feeling today?" with four choices: Energised and ready, Normal day feeling fine, Below par, and Tired, stressed or off. It also asks about soreness coming in, sleep last night and energy today. A toggle, "Do not ask before each session", stops the prompt. The answers can shape the session's suggested load.
- **Quick weigh-in.** A card to log body weight in one step, with a check ("Is that weight right?") and a confirmation ("Weight saved").
- **Week progress.** Shows how many planned sessions are done this week, and "Every session done for this week" when complete.
- **Late or missed session prompts.** For a planned session that has passed its expected time, the app asks "You thought this would be done by about now. Still need it?". After a break, the app may offer a re-entry prompt.
- **Quick actions.** Build a workout (empty or from a template), repeat the last session, skip this workout, start a plan session, and open workout history.
- **Community share.** After a finished session, a shortcut opens a Community post composer with the session pre-filled.
- **What's new.** A sheet shows the release notes after an update.

### 3.2 Train (plans and workouts)

The Train tab is where the training plan lives.

- **Active plan card.** Shows the plan name, the week number out of the total (for example "Week 3 of 6"), the block state, and a tooltip explaining the block.
- **Next block.** When a block finishes, the app shows "Block finished" and offers to start the next block. It shows what stays the same and what changes ("What stays", "What changes", "New in your plan", "No longer in your plan").
- **Block reflection.** After a block, a reflection screen asks how the block went. A user can ask to be reminded after the recovery week ("Remind me after recovery week").
- **Restart a plan.** "Run this plan again?" offers two paths with the same targets: start a new block, or keep the current one with adjustments.
- **Injury-aware update.** If the user has added an injury or limitation, the app can offer to update the plan to match ("Update this plan to match your limitations?"), with "Leave it as it is" and "Update my plan" as options.
- **Plan library and folders.** Plans can be set as active, archived, restored, moved between folders, and deleted. Folders can be created, renamed and deleted. A plan that is already active says so.
- **Saved workouts.** A list of saved workouts (routines) that can be started directly. Saved workouts can be deleted.
- **Plan tools.** Adjust training plan (plan update), Pick from the plan library, Create your own plan (manual builder), Training blocks (mesocycle builder), Injuries and limitations, Avoided movements, and Training considerations.

Screens reached from here:

- **Plan detail.** The plan's week-by-week sessions, with options to start, set active, move, restart, archive or delete.
- **Routine detail.** One saved workout's exercise list. Long-pressing an exercise sets or clears an avoided movement pattern.
- **Exercise detail.** An exercise's description, its history and its place in the plan. Opens with a card-zoom transition.
- **Plan library.** Browse library plans, sorted into categories, with a recommendation score for each plan.
- **Manual builder.** Build a plan by hand. The builder nudges on per-exercise and per-session caps rather than on weekly totals.
- **Mesocycle builder.** Define a training block.
- **Avoided movements.** A list of movement patterns the user has asked the app to leave out of suggestions, with per-row removal.
- **Goal setup and goal change.** A goal can be changed through a goal-setup flow with a summary of what changes and a goal-lock consent screen before the active plan is rebuilt.

#### Logging a workout

- **Build workout.** Pick exercises, add sets and reps, and set the rest time. A newly added exercise pre-fills a suggested rest time until the user sets a default of their own.
- **Active workout.** The main logging screen. For each exercise the user logs sets (weight, reps and set type), with planned targets shown and a "Use planned targets instead" option. Set types include standard sets, drop sets, giant sets, cluster sets (with "Start cluster", "Finish cluster") and unilateral sets ("Other side", "Log other side"). Other actions: add an exercise, swap an exercise, add a temporary change (for example a pain or equipment change, which the coach then takes into account), read a coach note (with show more or less), and remove or edit a logged set (with undo). The rest timer starts after a set (auto-start can be turned off), and a rest notification keeps counting on the lock screen. The user can record a short video clip from the exercise menu.
- **Finish workout.** If sets are missing, the app asks "Something left", with "Go back" and "Finish anyway". Discard workout is available with a confirmation ("Keep training" or "Discard workout").
- **Workout summary.** Shown after finishing. It has the session's totals and personal bests, a block-progress story when relevant, notes on each exercise, a "How you train" link (to Injuries and limitations), an option to save the workout to reuse, a Share action, a way to post to Community, and "Watch your block story". Opening an old session from history shows the same summary.
- **Workout history.** Every past session, with its clips, which can be viewed and deleted. A "Clear workout history" option sits in Settings, Data.
- **Share card.** See section 4.2.

### 3.3 Nutrition (diary and food)

The Nutrition tab is the food diary. It was named Diary internally.

- **Day diary.** The selected day, with logged food grouped into meal slots. Each slot and the day show calorie and macro totals against the user's targets. A water tracker sits on the same screen, with a daily water target the user chooses.
- **Planned meals.** Meals can be planned for the day or the week. The app asks the user to confirm planned meals as eaten ("Marked as eaten"). Planned meals can be cleared, and planned meals are not copied when the day is copied.
- **Weekly calorie bank.** The user can plan a higher-calorie day within the week ("Higher-calorie day planned. Your weekly total stays the same."), with the rest of the week adjusted to match.
- **Copy and move.** Yesterday's entries can be copied into a slot, the day can be copied from another date, and entries can be copied to today or moved. Every copy, move and delete has an undo.
- **Food search (add food).** Search the food database. Tiles show recent and usual foods. From here, a user can scan a barcode (live camera scan that looks up the product), scan a nutrition label (two steps: front of pack, then the label table), create a custom food, or pick a saved meal or recipe.
- **Custom foods.** Create a food with its nutrition values and named portions. Custom foods can be edited and deleted, and they sync.
- **My meals.** Named saved meals that can be added to a slot in one step.
- **My recipes and recipe builder.** Compose a recipe from ingredients with total servings, a cooked weight, and notes. Recipes can be edited and logged per serving.
- **Food notes.** An entry can carry a short private note.
- **Meal plan.** A generated meal plan for the day or week, shown as slots with totals, progressive disclosure of ingredients, and the option to swap a meal or get a suggestion for a slot. Foods the user has flagged from a meal plan are listed under Dietary needs.
- **Food insights.** Adherence to targets over a window the user chooses, showing how often targets were met.
- **Nutrition targets.** Calorie and macro targets, with a preview of what a target change does to the user's food before it takes effect. The safety floors apply here (see section 4.3).
- **Nutrition education.** A short, friendly explainer about the basics of nutrition for people new to it.
- **Dietary needs.** Diet preference, allergen exclusions, and foods the user does not want to see in meal plans.

Data source note: barcode and label lookups go to the product database. Scanned labels can be shared with Open Food Facts (an opt-in toggle in Settings, Privacy).

### 3.4 Progress (analytics)

The Progress tab shows how training and the body are going.

- **Your plan week.** The current plan week and what is due.
- **Your progress.** Grouped into Training, Body, Progress photos and Recovery.
  - Training: **Lift progress** (strength trends by lift), **Volume heatmap** (weekly sets per muscle, judged against the user's plan with plain band words such as "very easy" to "brutal" for effort), and **Consistency** (sessions per week and the block's consistency).
  - Body: **Body metrics** (weigh-ins, a trend line, and "what changed this week"), and **Progress photos**.
  - Recovery: a dedicated page for the recovery picture (readiness cards, soreness, sleep and energy), with a link to the weekly volume review (Coach review).
- **Recent sessions and all sessions.** A list of sessions, with **Full history** and each session's summary.
- **Recaps.** **Year of lifts** (a swipeable story of the year's training, with an unlock notification) and **Weekly story** (a narrative of the week: train, eat, recover).

Screens reached from here:

- **Progress photos.** Add a photo by taking one or importing from the gallery, retake or use it, compare two photos side by side, and view the trend across photos. Shares can produce a before-and-after card (section 4.2).
- **Body metrics.** Weigh-ins over time, the trend and what changed. Morning and evening weigh-in reminders are set in Coaching reminders.

### 3.5 Community

Community is a social tab for sharing training stories, following people, joining groups and messaging. Every Community screen is optional and sits behind a connection: when offline, Community says "Community needs a connection. Your training is unaffected." Training data never depends on Community.

- **Community home.** A feed with three scopes: **Following** (people the user follows), **My groups**, and **Everyone**. Lists can be ordered by recency or by respect (the app's kudos mark), and there are named lists such as "Most respected". When the feed is empty, it suggests following a few people, finding people, or joining a group. A gym shortcut shows who at the user's gym has posted.
- **Posts.** Each post is one training story (usually a finished session) with its thread. Users can give Respect and comment. A post can be reported.
- **Composer.** Write a post or share a finished session. Audience is set to Followers or Everyone. Posts are checked by the server, and an automatic session post can be withheld while a safety flag is open.
- **Profile.** One person as a lifter: avatar, handle, training profile, recent posts, and a follow button. A profile can be opened from a post or a search. A separate training-profile view exists for each person.
- **Edit profile.** Display name, handle, bio, gym and sharing choices.
- **Find people and search.** Find people by handle or display name, and a suggested list built from training profile matches (for example the same gym, the same area or style, or a similar discipline and age band). People lists are scored lists, not an open directory.
- **Dimensions.** A dimension is a page of people who chose the same gym, area, training style, discipline or age group. It shows the people in it, a count, and a link to the monthly consistency board.
- **Board.** Ranked views of consistency and respect over a period (this week, this month, and so on).
- **Activity.** A record of what happened to the user in Community: respect given and received, new followers, group invites and joins.
- **Messages.** A list of one-to-one conversations, and each conversation with its own thread. Messages can be reported.
- **Followers and connections.** Lists of who follows the user, and of connections, with options to remove.
- **Groups.** A group has a page with its feed, members, rules, a chat band and, when running, a challenge. Users can create a group (name, description and access setting), see members, and join or decline invites. A group chat is a separate screen reached from the group page.
- **Challenges.** A group can start one active challenge at a time: a count of sessions over a set run (starts, runs for, and an optional target number of sessions). The only figure shown is the session count. No load, body or food figures appear in a challenge.
- **Gym directory.** Find a gym, or add one that is missing ("Can't find your gym? Add it"). The user sets a gym in the profile.
- **Join.** The onboarding path into Community: choose a handle and display name, pick a gym, and set sharing choices. Session sharing is on by default in the app. Server-side, a new profile with no sharing choice recorded is treated as off.
- **Privacy.** Choose what is shared (sessions, profile, who can follow).
- **Rules and moderation.** Community rules are shown in full. A moderation queue exists for moderators.

Note on "Partners": an older Partners feature has been retired. Its invite links now open Community with a notice.

### 3.6 Coach

The Coach tab is the coaching hub. Its home screen has four sections: "Your body", "This week", "Setup" and "Safety checks". A "Could not refresh Coach" card shows if the coaching state cannot load, and the saved profile is left unchanged.

- **Weekly check-in.** The weekly review. The user records body weight and the week's training and feeling (with an option to log weight first, or to check in anyway). The check-in day can be changed. It can show optional progress-photo evidence beside the week's data. It can be skipped, and a skipped check-in never blocks anything. Under calm mode or an open safety flag, the check-in changes what it shows (the code treats this as a safety read).
- **Coach review.** The judgement of each muscle's weekly sets against the plan's focus ranges, with the reason for each, so the user can see why a volume is "in range" or not.
- **Coach output.** The coaching decisions for the week, written from the engine's own context. The screen lists what changed, why, and what happened after. Sections include nutrition, training next week, and "Your meal plan". Decisions can be applied ("Apply") or declined ("Keep as is"), and the app remembers when a user has said no. "See your updated plan" opens the plan. "Set maintenance calories" appears when the coach advises maintenance.
- **Held decisions history.** A list of coaching changes the safety system held back, with the reason, so the user can see why a change did not happen.
- **Block reflection and weekly story.** See sections 3.2 and 3.4.
- **Athlete profile.** The body and training profile the coach works from.
- **Nutrition targets.** A shortcut to the targets screen (section 3.3).
- **Coaching reminders.** Reminders for morning and evening weigh-ins and the weekly check-in. The reminders nudge; turning one off does not stop the coaching loop.
- **Goal.** A shortcut to change the goal (section 3.2).
- **Injuries and limitations.** A shortcut to the constraints screen (section 4.3 and section 5).
- **Wellbeing check.** A five-question screen, reached from "Safety checks". The questions ask about eating and control, unhappiness with weight, weight loss, body image, and how much food thoughts take up. The app shows calm signposting to support (Beat UK) and never gates it.
- **Methodology.** "How Precision Coaching works": a static, offline explainer of the coaching method, with collapsible sections.
- **Settings.** A gear entry leads to the settings home.

#### Settings (reached from Coach)

The settings home lists these groups, each with its own sub-page:

- **Injuries and limitations.** Injuries, pain, long-term conditions and disabilities that affect training. A wizard ("Add something") adds each one, and the list sets the constraints the plan respects. Available to everyone, free.
- **Account.** Your sign-in identity, sign out, and delete account (the destructive actions are kept at the bottom).
- **Profile.** Name, sex, height, date of birth, and diet preference. Height and age feed the calorie maths and are checked for plausible values.
- **Coaching.** Calmer coaching (quieter progress prompts; see section 4.3), session readiness check, the coaching tone, "Show the science" (a layer that explains the reasoning behind coaching), and cycle tracking (shown only where the profile records a female sex).
- **Workout and units.** Body weight unit, session length, default rest timer, auto-start rest timer, whether the rest view opens after each set, rest finished alerts, rest timer sounds, and exact rest alerts.
- **Nutrition targets** and **Dietary needs** (described in section 3.3).
- **Notifications and reminders.** Training reminder, meal reminders, quiet hours, and the notification categories (section 4.1).
- **Coaching reminders** (section 3.6).
- **Display and accessibility.** Appearance (Dark is the default; Light is opt-in; Match phone follows the system), energy unit (kcal or kJ), show fibre, sugars and salt, larger text, higher contrast, a colour-blind-safe palette, and reduce motion. See section 4.5.
- **Data.** Skip the name step on label scans; import from another app (Hevy or Strong CSV exports); back up app data (JSON); restore from a backup; restore an automatic snapshot (taken before database changes); export the workout log (CSV); clear workout history; and sync status.
- **Privacy and legal.** Health-data consent (withdraw), sharing of scanned labels with Open Food Facts, sharing of anonymous usage data, the app lock toggle, email settings (news emails and the weekly summary), and the privacy policy.
- **About.** Help and FAQ, send feedback, rate the app, credits (open-source licences), and the version. A debug log is hidden in production builds.

---

## 4. Cross-cutting features

### 4.1 Notifications

Notifications are grouped into categories and sent by push, in-app, or email, depending on the category. Categories include: rest timer and the rest-finished alert; training reminders; meal logging reminders; a planned-meal confirmation; morning and evening weigh-in reminders; the weekly check-in reminder and a missed check-in nudge; the weekly coach ready message; monthly recap and year-of-lifts unlock; group chat messages and Community activity; and win-back messages to people who have stopped using the app. Notification settings include quiet hours and an overall push budget that limits how many prompts can arrive in a day. Under an open safety flag, weight and food notifications are suppressed, and an eating-disorder safety lockout notice appears in-app only.

### 4.2 Sharing images and videos

- **Share card.** A card for a workout, a personal best, a milestone, a weekly summary, or a moment. It is drawn by one renderer and can be saved to the gallery, shared through the system share sheet, set as a wallpaper, or posted to Community. The user can choose not to show any lifts, and can skip the quote or caption.
- **Progress card.** A before-and-after card from progress photos. Bodyweight can appear beside each photo. The card is withheld entirely under calm mode or an open safety flag. Names, measurements and private notes never appear on any share card.
- **Session "show progress" option.** Off by default. When on, a cut goal's weekly bodyweight change can appear on a session card. It is withheld under calm mode or an open safety flag.
- **Clip camera.** A full-screen camera for recording a short workout clip. It is built to work hands-free while the phone is propped up for a set, and it cannot be dismissed by a stray swipe while recording. Clips are kept with the workout in history and can be deleted there.

### 4.3 Calm mode, safety and eating-disorder protection

These are design rules built into the coaching and the screens. They are described here as the product's behaviour.

- **Calorie floors.** The app never recommends intake below 1,500 kcal per day for men or 1,200 kcal per day for women. An energy-availability floor (30 kcal per kg of fat-free mass) and rate-of-loss limits (a rapid-loss gate at 1.5% of bodyweight per week, and a maximum safe loss rate of 0.8% per week) also apply.
- **Safety flag.** When the app detects an eating-disorder pattern, it raises an open flag. While a flag is open: calorie reductions are paused; the coach can hold back its changes (see Held decisions history); weight and food notifications are suppressed; automatic Community posts are withheld; and news emails are paused.
- **Calm mode ("Calmer coaching").** Quieter progress prompts. Coaching does not push for more. Celebrations, streaks and progress comparisons go quiet. The plan and the user's own data stay visible.
- **Wellbeing check.** A short, optional five-question screen with signposting to Beat UK. It is never gated.
- **Consent-first.** The health-data consent gate (section 2) must be passed before any health data is processed.

### 4.4 Units and measurements

- Gym weights are in kilograms only, a UK design choice.
- Body weight has its own unit setting (Workout and units).
- Energy can be shown in kilocalories (default) or kilojoules (Display).
- Weeks start on a Monday, using UK local time for day boundaries.
- Spelling and copy are British English throughout.

### 4.5 Accessibility

- Display settings for larger text, higher contrast, a colour-blind-safe palette, and reduce motion (which also turns off screen transitions).
- Screen-reader support: controls carry accessibility labels, and while a sheet is open the rest of the screen is hidden from TalkBack and VoiceOver so focus stays in the sheet.
- The team checks layouts at the phone's maximum text size (a stated release rule).
- Appearance: Dark (default), Light, or Match phone.
- Haptic feedback on tab change and key actions (it stays silent under reduce motion).

### 4.6 Sync, offline and data safety

- The phone's encrypted local database is the source of truth on the device. The app works fully offline for training, food, body metrics and the coach. Community is the exception and needs a connection.
- Changes are saved locally at once and sent to the cloud in the background, with a retry queue for failures. When the user signs in, the app pulls the account's data down.
- Deletions sync, and an undo can bring back an item that was deleted on this device.
- Sync status can be seen in Settings, Data. A sync error shows an in-app notice rather than a crash.
- Backups: a JSON backup can be saved and restored. Automatic snapshots are kept before risky database changes and can be restored from Settings, Data.
- Cloud data stays in the EU (Dublin). Member emails (news and the weekly summary) are sent through Resend, which sends from Ireland and keeps its records in the United States under standard contract clauses, as the privacy policy states.

### 4.7 News and member emails

- Members receive news emails about new features, short surveys and a weekly summary, unless they turn them off. Choices are in Settings, Privacy and legal, and every email has an unsubscribe link.
- No news emails are sent while the safety flag is open.
- Volyume measures whether each email is opened and which links are clicked. The privacy policy says so.

### 4.8 Account and identity

- Sign-in: Apple, Google, or email with a password. There is no anonymous mode.
- Sign out and delete account are in Settings, Account.
- One account, one identity: data stays with the signed-in account.

---

## 5. Known gaps and rough edges (observations)

These are observations from reading the build. They are not decisions, and they are not verified against the live product on a device.

1. **Onboarding step count.** Code comments describe the onboarding as a "six-step" wizard, but the screen defines eight step labels. The comments are out of date, and the labels are what the user sees.
2. **Very large screen files.** Several screens run to thousands of lines (the active workout screen is over 7,000 lines; the Today, onboarding and Coach output screens are each around 3,000 to 4,000 lines). This does not change what users see, but it makes each change slower to make safely.
3. **Discoverability has been an issue before.** The founder noted that the Recovery area was "hidden behind a button", and it was moved to its own place in Progress. Several important features (Injuries and limitations, the weekly check-in, the coach decisions) are reached through the Coach tab and from more than one place. Users may not find them without a prompt. The app has many settings and many shortcuts, and some depth is only reached through Settings.
4. **Injuries and limitations appears in several places** (Today, Train, Coach and Settings, plus setup). This is deliberate, but it means changes to it must be checked in each place.
5. **Dormant billing code.** Billing screens (the upgrade, subscription, policy and cascade screens) and the billing modules still exist in the code, but they are not reachable. The product is free. Any future charge would be a deliberate new decision.
6. **Some screens are registered in more than one place.** The workout summary, the share card and the clip camera are each registered in several navigation stacks so back navigation returns to the right place. A "recap story" route points at the year-of-lifts screen. This is harmless but makes navigation harder to reason about.
7. **Home-screen widget.** The home-screen widget code exists but is not wired into the build, and the iOS widget extension is parked. Users cannot add a widget today.
8. **Live activity.** A native module exists for an iOS live activity; its status in the current build is not confirmed in this map.
9. **News emails default on.** News emails are on unless the user turns them off, and the app measures opens and clicks. This was a founder decision. It is listed here because it is a choice a reviewer may want to test with users.
10. **Connection-dependent Community.** Community needs a connection and shows a notice when offline. The Community screens reviewed here show that notice rather than queuing actions; this was not checked in depth.
11. **Older maps are stale.** The June 2026 app map and the product UX map describe an older layout (a Routines tab, a You tab, and a paywall). Do not use them for the current structure. This document follows the current navigator.
12. **Naming mismatch.** The visible tab names (Today, Train, Nutrition, Progress, Community, Coach) do not match the internal route names (HomeTab, PlansTab, DiaryTab, ProgressTab, CommunityTab, ProfileTab), and some screen files keep older names (for example, the Coach home is still in a file called YouScreen). This is harmless to users but confuses anyone reading the code.

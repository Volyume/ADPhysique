# Workout logger audit 2026-10-06: lane A7, the wider field, set 3 (web research)

Lane A7 (web research, Sonnet). Round: audit only, nothing built. Research day: 2026-10-06; every "now" below means that day.
Founder order, verbatim: "We are not accepting just hevy and strong that's lazy look at many more".
Scope: the long tail and the hardware, coaching-platform and programme-first loggers that lanes A4 and A5 do not name. A4 covers Hevy, Strong, Fitbod, JEFIT, Boostcamp, Alpha Progression, RP Hypertrophy, Juggernaut AI, Caliber, Setgraph, Gymaholic, Dr. Muscle. A5 covers FitNotes, GymBook, Liftin', StrongLifts, KeyLifts, Lyfta, Gravl, Gainframe, Sensai, Simple Workout Log, Stacked, Apple's own strength logging, Google Fit and Fitbit, Peloton Strength+, Ladder, Future, Trainerize, MyFitnessPal. No app of those two lists gets a dossier here. StrongLifts is on both the A5 list and the A7 brief: it gets a short cross-reference entry here, written only from the angle of a programme-first logger.
Code: not read, not touched. Volyume appears only in the judgement lines of section 5 and section 6.

## 0. Method, evidence tags and limits

This file was written incrementally: section 0 first, then one dossier per app appended as soon as the app was researched, then the matrix, the patterns section and the Sources list. A dossier that is present is complete for what the sources allowed.

**Citation form.** Every claim ends with its source in brackets: `(URL, date)`. The date is the source's own date (post date, release date, "updated" stamp, store-review date). `f` means the page carries no date, so the date is the fetch day, 2026-10-06. Where one page backs several bullets in a row, the URL is repeated rather than abbreviated, so any bullet can be checked on its own.

**Evidence tags** (each bullet starts with one):
- OBS/vendor: the vendor's own help centre, store listing, release notes or product page states it. This is a CLAIM about the product, not proof it works that way.
- OBS/review: an independent hands-on write-up (review site, blog, video summary) describes it. Evidence.
- OBS/user: a dated store review, forum post, Reddit or Hacker News comment reports it. Evidence of one person's experience.
- INFERRED: my reading of observed facts. Always labelled.
- UNKNOWN: looked for and not established. UNKNOWN is never a "no".

**Source tiers.** T1 vendor-authored (help centre, changelog, store listing); T2 independent hands-on write-up or dated user post; T3 competitor-published comparison (every "best app" listicle written by an app vendor ranks itself first, so a T3 page never carries a "no" on its own); T4 aggregator or search-summary text where the page itself would not load.

**Ten-point structure per app** (from lane A4's brief): 1 active-workout screen anatomy; 2 set-entry mechanics; 3 rest timer; 4 mid-workout exercise management; 5 finishing; 6 resilience; 7 how it fits together; 8 praise, complaints, switching; 9 distinctive; 10 price and tier. Where an app teaches little about logging, the ten points collapse to the ones the sources support and the rest are marked UNKNOWN in one line, not padded.

**Proportion rule.** Depth goes where the logger is distinctive (RepCount, Liftosaur, StrengthLog, Train Fitness, Tonal, Tempo, WHOOP, Garmin, TrainHeroic, Everfit, SugarWOD-class whiteboard loggers). Apps that are a thin variant of the common pattern are shorter.

## 2. Per-app dossiers

Each dossier answers the ten points. Platform differences (Android in particular) are called out wherever a source allows. The fetch tool answers through a small model: quotes below are as returned and were not re-checked against the raw page, except where a bullet says otherwise.

### 2.1 Liftosaur (programmable, open-source logger)

Snapshot. One-developer, open-source (AGPL-3.0) weightlifting planner and tracker; iPhone, iPad, Apple Watch (needs iOS 17, watchOS 10.6), Android and a web app; US App Store rating 4.9 from 409 ratings; free with in-app purchases (monthly $4.99, yearly $39.99, lifetime $99.99) (https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849, f). The native apps are "thin wrappers around the PWA with additional native features"; stack is Preact/TypeScript with AWS Lambda, DynamoDB and S3; 732 GitHub stars (https://github.com/astashov/liftosaur, f). The vendor documents the app as one page per topic, 31 pages, with dated updates in late September 2026 (https://www.liftosaur.com/features, f; the rest-timer page is dated 2026-09-27, modified 2026-09-28, https://www.liftosaur.com/features/rest-timer). Recent App Store version notes, as the converter returned them (build numbers look inconsistent, so treat as indicative): heart-rate display from Apple Watch or AirPods; "Redesigned workout screen with improved readability and set completion" (22 Sep); "Time-based exercise support with countdown timers" (9 Sep) (https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849, f).

**1. Active-workout screen anatomy**
- OBS/vendor: top header shows "the workout time with a blinking colon"; a pause icon beside it pauses, a play icon resumes. "Tap Finish in the top right." (https://www.liftosaur.com/features/workout-screen, f)
- OBS/vendor: a thumbnail strip of exercises sits at the top; "Swipe left or right to move between exercises, or tap a thumbnail in the strip at the top." A "+" at the end of the strip adds exercises. (https://www.liftosaur.com/features/workout-screen, f; https://www.liftosaur.com/features/changing-a-workout, f)
- OBS/vendor: exercise card header "has Equipment and, when the program uses percentages, 1RM"; a gear icon opens a menu (edit program exercise, swap for this workout only, notes). (https://www.liftosaur.com/features/workout-screen, f)
- OBS/vendor: "The next set is expanded. It has big Reps and Weight fields and a big checkmark." Under the fields the expanded set shows plates per side "as a bar and a list" and "Last, Best and Same day results for this set, each with its date. An AMRAP set shows Best AMRAP." (https://www.liftosaur.com/features/workout-screen, f). The plate display is a Premium item (https://www.liftosaur.com/features/premium, f).
- OBS/vendor: the prescription is the pre-filled field itself: "all the weights and reps already prefilled, so for most programs you just tap the check icon when you finish what's prescribed." (https://www.liftosaur.com/blog/posts/liftosaur-overview/, 2025-09-01)
- UNKNOWN: any pinned bottom bar. The sources describe the strip at the top and the expanded set; none describes a bottom bar.

**2. Set-entry mechanics**
- OBS/vendor: "Tap the checkmark to complete the set. The phone vibrates once, and the rest timer starts." (https://www.liftosaur.com/features/workout-screen, f)
- OBS/vendor: prompts are written into the programme text. `5+` makes the checkmark open a popup for "Completed reps"; `@8+` asks for RPE (1 to 10); `100lb+` or `70%+` asks for the weight used; "Tap the checkmark on such a set and a popup opens instead of completing the set right away." (https://www.liftosaur.com/features/set-types, f)
- OBS/vendor: built-in one-sided exercises (Bulgarian Split Squat, Lunge, Step Up, curls, one-arm row) show separate "L:" and "R:" fields. (https://www.liftosaur.com/features/set-types, f)
- OBS/vendor: timed sets: "Tap the play button. The app opens a Get Ready countdown, 5 seconds by default"; then a set clock with a progress bar; options are auto-complete at target, "Stop & record", or "Log 0:12, keep timing". `auto` opens the next timed set on its own when rest ends, for EMOM and Tabata. (https://www.liftosaur.com/features/timed-sets, f)
- OBS/vendor: warm-up sets exist as a set kind: "Warmup sets do not move you" in a superset rotation. The warm-up calculator's mechanics are UNKNOWN (not read). (https://www.liftosaur.com/features/supersets, f)
- OBS/vendor: notes: "Tap the cog, then Show Exercise Notes. A text field appears"; workout notes through the kebab menu. (https://www.liftosaur.com/features/workout-screen, f; https://www.liftosaur.com/features/workout-history, f)
- OBS/vendor: weights round to what you can load: plate-loaded equipment uses "the bar plus the heaviest plate combination that does not go over the target"; dumbbell and kettlebell racks use fixed-weight lists; bar weight, 1 to 4 plate sides, plate inventory and per-gym equipment lists are set in Me > Available Equipment. "Rounding happens on the workout screen only. Program state variables stay exact." (https://www.liftosaur.com/features/equipment-and-gyms, f)
- OBS/vendor: progression is code. Built-in Linear, Double and Rep Sum progressions or custom scripts; "Set weights as % of 1RM or by RPE" (https://liftosaur.com/, f). On finish, "it changes the current program. The program under the hood is just plain text...it rewrites that text, with the new weights, reps, sets" (https://www.liftosaur.com/blog/posts/liftosaur-overview/, 2025-09-01).
- UNKNOWN: custom numeric pad versus system keyboard; plus/minus steppers. The sources name "the weight keyboard" (https://www.liftosaur.com/features/premium, f) but do not describe it.

**3. Rest timer**
- OBS/vendor: "Complete a set, and the rest timer starts. No extra tap." Rest time is written per exercise or per set in the programme text (example `Bench Press / 5x5 / 90s`). (https://www.liftosaur.com/features/rest-timer, 2026-09-27)
- OBS/vendor: the timer pill offers "-15s and +15s to adjust the target" and expands when tapped. Chime and vibration at the end, each toggleable in Me > Settings > Sound; "Volume 0 with vibration on gives a vibration without sound". (https://www.liftosaur.com/features/rest-timer, 2026-09-27; https://www.liftosaur.com/features/lock-screen-and-notifications, f)
- OBS/vendor: superset-specific rest: a "Superset" timer in Me > Timers runs "after every working set of an exercise in a group, instead of the Workout timer"; a per-set rest in the programme overrides both. (https://www.liftosaur.com/features/supersets, f)
- OBS/vendor, Premium only: a notification when rest ends "with the next set and the plates to load"; iOS Live Activity and Dynamic Island with -15s and +15s; Android "Live Update chip next to the clock"; watch app Rest Timer screen with haptics. (https://www.liftosaur.com/features/rest-timer, 2026-09-27)
- OBS/vendor, Premium: the iOS Live Activity shows workout time, set progress ("Set: 2/5"), coloured dots per set status, exercise name, target reps and weight, plates; "Tap it to complete that set without unlocking the phone." Android shows an ongoing notification with "-15s, +15s, and Done" buttons; Android Premium users can "Ignore Do Not Disturb". With an Apple Watch and headphones in, "the phone plays the chime through the headphones even while the phone is locked". (https://www.liftosaur.com/features/lock-screen-and-notifications, f; https://www.liftosaur.com/features/rest-timer, 2026-09-27)
- OBS/vendor: Apple Watch app logs sets with the Digital Crown, answers AMRAP and RPE prompts, shows the rest timer "at the top of the exercise screen" turning red once over, shows heart rate, and "keeps its own copy of the program and the ongoing workout, so it works with the phone in the locker". It needs Premium ("Premium Required" otherwise). (https://www.liftosaur.com/features/apple-watch, f). No Wear OS app is described: UNKNOWN.

**4. Mid-workout exercise management**
- OBS/vendor: "Tap the cog on the exercise card and pick Swap Exercise" with two tabs: Ad-hoc Exercise (adjusts weights from your history) and From Program. "A swap changes this workout only. The program stays as it was." (https://www.liftosaur.com/features/changing-a-workout, f)
- OBS/vendor: add via "+" at the end of the strip, multi-select allowed; remove via the cog (this workout only); reorder by "Long-tap a thumbnail in the strip and drag it". (https://www.liftosaur.com/features/changing-a-workout, f)
- OBS/vendor: an "Ad-Hoc Workout" starts empty ("Tap Add Set on each card"); on finish "Create Program Day" turns it into a programme day. (https://www.liftosaur.com/features/changing-a-workout, f)
- OBS/vendor: supersets: each exercise shows "Supersets with:" plus the next exercise's name, thumbnails get one colour line per group, and completing a working set moves the screen to the next exercise in the group, skipping exhausted ones. (https://www.liftosaur.com/features/supersets, f)
- OBS/vendor: the library is "hundreds of exercises with muscle maps and personal records"; custom exercises can be added "with AI muscle-mapping" (feature-page summary only; the AI element is a vendor claim and unverified here). (https://www.liftosaur.com/features, f)
- OBS/vendor: a graph sits under each exercise on the workout screen (Premium). (https://www.liftosaur.com/features/premium, f)

**5. Finishing**
- OBS/vendor: "If some sets are not completed, the app asks 'Are you sure you want to FINISH this workout?'" Then progress scripts run and a "Congratulations!" summary appears. (https://www.liftosaur.com/features/workout-screen, f)
- OBS/vendor: the share card carries the logo, a trophy with the PR count, programme and day name, Time, Volume, Sets and Reps totals, and one row per exercise with picture, name, a trophy if it was a PR, and the sets. Targets: Instagram Stories and Feed, TikTok, text, web link, saved image; an opt-in public profile page shows the current programme and main-lift progress graphs. (https://www.liftosaur.com/features/sharing-workouts, f)
- UNKNOWN: a post-workout rating or "feel" prompt; what happens to skipped sets in the progression (INFERRED: progress scripts read completed sets, so an unticked set is not counted, but this was not read).

**6. Resilience**
- OBS/vendor: "No connection is needed to train. Start a workout, complete sets, edit programs, add measurements. The app saves to the device and syncs when it is online again." (https://www.liftosaur.com/features/sync-and-offline, f)
- OBS/vendor: sync runs after changes, on open and on return from background; "When two devices change the same thing, the later change is kept and the earlier one is dropped"; changes to different things merge; "The workout you have open syncs too. Start on your phone, complete a few sets, then open the web app. The same workout is there, with the same sets done." An account is optional. (https://www.liftosaur.com/features/sync-and-offline, f)
- OBS/vendor: the 2021 design note says local state is the source of truth, held in IndexedDB, with the service worker caching the app bundle; on reconnect both states are migrated and merged, preferring local for settings. (https://www.liftosaur.com/blog/posts/offline-mode-in-liftosaur/, 2021-03-04)
- INFERRED: a force-kill mid-workout loses nothing because state is written continuously; the sources do not state kill-and-resume behaviour in words.

**7. How it fits together**
- OBS/vendor: Home tab: "Every finished workout is a card on the Home tab, under a week strip and a month calendar." A card shows date, programme day and programme name, one row per exercise with sets as weight and reps, a trophy for a PR, and a bottom row of workout time, total weight, sets, reps. Tapping a card opens the workout screen to edit it, with the date as the title. (https://www.liftosaur.com/features/workout-history, f)
- OBS/vendor: Week Insights card on Home: Volume, Sets, PRs; "Show More" adds PR detail, a strength/hypertrophy split ("The default target is 30% strength and 70% hypertrophy") and per-muscle weekly set counts against a range ("10 to 12 sets unless you change it"; Novice 10-12, Intermediate 13-15, Advanced 16-20), coloured green inside the range, yellow within 70% to 130%, red beyond. (https://www.liftosaur.com/features/week-insights, f)
- OBS/vendor: about 60 built-in programmes (GZCLP, 5/3/1, Starting Strength, PHUL); a programme editor with calendar grid, per-day and text modes; a desktop web editor with autocomplete and volume stats; a "Playground" that simulates workouts without touching history; programmes shared by public link, QR code or private edit link. (https://www.liftosaur.com/features, f)
- OBS/vendor: import history from Hevy CSV or its own CSV or JSON; export JSON (everything), CSV (one row per set) or programmes as Liftoscript text; Apple Health and Health Connect sync; REST API and an MCP server so "AI assistants like Claude or ChatGPT" can create programmes and log workouts. (https://www.liftosaur.com/features/import-export, f; https://www.liftosaur.com/blog/docs/, 2026-10-05)
- OBS/vendor: first run asks for units, equipment, programme and personalisation. (https://www.liftosaur.com/features, f)

**8. Praise, complaints, switching**
- OBS/user (vendor-curated, selection bias): "This is it. This is my last workout exercise tracking app. It's that good it's that customizable." (App Store, 2025-05-02); "As an experienced lifter, this is by FAR the best app to write and track workouts." (2026-01-09); "No complicated entries, it just tells me the weight and reps and I tap once." (2024-03-05); "One of the few apps that includes a lifetime purchase model in era of subscriptions." (2025-11-04). (https://liftosaur.com/, f)
- OBS/user: the about page quotes a user: "like having Google Sheets and Strong in the same app!" (https://www.liftosaur.com/about, f). Notebooks and spreadsheets are the stated rivals: "Notebooks don't track. Spreadsheets are hard to use on your phone." (App Store, 2025-08-13, https://liftosaur.com/, f)
- OBS/user (independent): Hacker News, 2023-02-22: "Tried it, it looks pretty cool, I could use it. A bit confusing at the beginning, a lot of stuff going on"; the same commenter asked for tutorials and example scripts. (https://news.ycombinator.com/item?id=34896643, 2023-02-22)
- INFERRED: the cost is the learning curve of the scripting layer; the reward is that the check-tap logging path is the same as any other app's once the programme is set.

**9. Distinctive**
- The programme is text that the app rewrites after every workout (progress scripts), so the next session's prefilled numbers are the prescription. (https://www.liftosaur.com/blog/posts/liftosaur-overview/, 2025-09-01)
- Prompts are declared in the prescription (`5+`, `@8+`, `100lb+`): the checkmark opens a popup only for sets that need data, otherwise it completes in one tap. (https://www.liftosaur.com/features/set-types, f)
- Swapping an exercise offers an ad-hoc substitute that re-derives weight from your own history. (https://www.liftosaur.com/features/changing-a-workout, f)
- Per-gym equipment lists and rounding to loadable weights; one account, same workout live across phone and web. (https://www.liftosaur.com/features/equipment-and-gyms, f)
- Lock-screen set completion and Android Live Update buttons. (https://www.liftosaur.com/features/lock-screen-and-notifications, f)

**10. Price and tier.** Free: programmes, editor, Liftoscript, logging, history, measurements entry, equipment, sharing, import and export. Premium: plates display, graphs, muscle views, rest-timer notifications and Live Activity, Week Insights, the Apple Watch app, API and MCP keys; monthly and yearly carry a 14-day free trial; a lifetime option exists ($4.99 monthly, $39.99 yearly, $99.99 lifetime on the US App Store). (https://www.liftosaur.com/features/premium, f; https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849, f)

### 2.2 RepCount (Siper Apps AB)

Snapshot. A long-running minimalist strength log: US App Store 4.9 from about 13K ratings, "iPhone only (requires iOS 18.0 or later)" on the App Store, latest builds 10.8.1 (about 3 days before the fetch), 10.8.0 (28 Sep) and 10.7.0 (12 Sep, "Added superset exercise creation, iOS 27 fixes, improved translations") (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f). The vendor site says "Log sets, reps and weight on iOS and Android" and lists a Google Play app (package `sp.repcount`) with "your workout history synced between iPhone and Android" (https://www.repcountapp.com/, f; https://www.repcountapp.com/features, f). A search-engine summary of AppBrain puts Android at "more than 500 thousand installs" (T4, https://www.appbrain.com/dev/Siper+Apps/, undated; the page itself returned 403, so the figure is unverified). Google Play listing text did not load (truncated), so Android ratings and release notes are UNKNOWN.

**1. Active-workout screen anatomy**
- UNKNOWN in detail: no source read describes the header, the set row columns or any bottom bar.
- OBS/vendor: the logging page promises "your previous weights and reps as a starting point for today's sets", "a reminder of what you lifted last time", and "technique cues and machine settings" stored with each exercise. (https://www.repcountapp.com/features, f)
- OBS/vendor: the store description says "automatic prefill from previous sessions". (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f)

**2. Set-entry mechanics**
- OBS/vendor: prefill from the last session; basic cardio tracking; body-weight logging; supersets and drop sets are Premium. (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f; https://www.repcountapp.com/pricing, f)
- OBS/user: "Superset limitations: users report difficulties adding exercises to supersets"; "Cannot log strength exercises by time OR reps simultaneously (affects HIIT and calisthenics)"; "unclear 'end workout' function" (aggregator summary of 20 dated store reviews, T4). (https://justuseapp.com/en/app/594982044/repcount-gym-workout-log/reviews, f)
- UNKNOWN: numeric pad, set types beyond drop sets, RPE or RIR, plate calculator (the compare page speaks of "plate loading in context", https://www.repcountapp.com/compare, 2026-09), 1RM entry.

**3. Rest timer**
- OBS/vendor: "Rest timer with notifications" is on the free plan. (https://www.repcountapp.com/, f)
- OBS/vendor: the help centre has a six-article Timer collection, "understanding notification sounds and troubleshooting timer problems" (https://support.repcountapp.com/, f). A search-engine summary of those articles lists: no sound on the timer, silent-mode notifications, the timer buzzing every second, and an alarm ringing when Bluetooth headsets connect on Android (T4, https://intercom.help/repcount/en/collections/12878570-timer, undated; the page itself returned 404). INFERRED: the timer is notification-driven and the sound and silent-mode paths are a recurring support topic.
- OBS/vendor: Live Activities for the workout on iOS are Premium. (https://www.repcountapp.com/features, f)
- UNKNOWN: auto-start on set completion, per-exercise defaults, adjust while running, watch or Wear OS.

**4. Mid-workout exercise management**
- OBS/vendor: "Opening an exercise's history from inside a workout is a Premium feature." (https://www.repcountapp.com/, f) This is the single most telling gating choice in the app: previous values are free (prefill), the per-exercise history view in the workout is paid.
- UNKNOWN: add, replace, reorder, remove; exercise picker; PR hints while logging.

**5. Finishing**
- OBS/vendor: workouts and body measurements sync to Apple Health; Health Connect on Android. (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f; https://www.repcountapp.com/features, f)
- UNKNOWN: summary screen, share cards, feel rating, skipped sets.

**6. Resilience**
- OBS/vendor: free plan lists "Offline use", cloud sync and health integration; CSV export is Premium. (https://www.repcountapp.com/pricing, f)

**7. How it fits together**
- OBS/vendor: unlimited free routines ("Have your workout ready when you arrive"), unlimited custom exercises, complete history with notes "kept for free". Premium charts: zoom and pan, group by day, week, month or year, estimated 1RM, "personal records across rep ranges". (https://www.repcountapp.com/features, f)
- OBS/vendor: a web library of exercises by muscle with alternatives, calculators, and comparison articles (Hevy, Strong, Stronger). (https://www.repcountapp.com/, f; https://www.repcountapp.com/compare, 2026-09)

**8. Praise, complaints, switching**
- OBS/user: "I have been using the free version of this app for years...I really love the design of this app" (App Store, 2025-01-11); "This app is extremely polished and easy to follow" (2024-10-01); "Super simple and easy to use" (2024-08-29, developer replied). (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044?see-all=reviews, f)
- OBS/user: "$8/yr premium is ridiculously underpriced"; "I've used RepCount for the past 5 years...nothing...compares" (aggregator quotes, T4). (https://justuseapp.com/en/app/594982044/repcount-gym-workout-log/reviews, f)
- OBS/user: the developer answers reviews by first name and takes suggestions (for example separate client logs for a trainer). (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044?see-all=reviews, f)

**9. Distinctive**
- A free tier that keeps the whole log, routines, notes and the rest timer, and sells analysis (charts, PR table, supersets, drop sets, CSV, history-in-workout). (https://www.repcountapp.com/pricing, f)
- The founder publicly declines to copy a rival's "Strength Score" and says so on its compare page (vendor CLAIM; the text was summarised, not quoted). (https://www.repcountapp.com/compare, 2026-09)

**10. Price and tier.** Free: unlimited workouts, routines, custom exercises, notes, history, offline, body weight, rest timer, cloud sync, health sync. Premium $29.99 per year or $4.99 per month (annual has a one-week trial on iOS; the App Store also lists $6.99 and $39.99 SKUs). (https://www.repcountapp.com/pricing, f; https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f)

### 2.3 StrengthLog (Styrkelabbet AB)

Snapshot. Swedish strength-training log with a powerlifting lean. App Store: iPhone, iPad, Apple Watch, Apple Vision; 4.9 from 3.7K ratings; build 9.0.7 released about four days before the fetch; "unlimited workout logging without ads or account requirements" (https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662, f). The vendor site also lists Google Play and claims "Join 100.000+ monthly users" (https://www.strengthlog.com/, f; user count is a vendor CLAIM). The help centre is a dated, article-per-task knowledge base (https://help.strengthlog.com/, f); one article carries "last updated on April 22, 2026" (https://help.strengthlog.com/help-article/reorder-exercises/, 2026-04-22). The 9.0.x release notes: "The top of your home screen now has a calendar where you can start workouts, plan future workouts, add events"; a new Program Builder with Simple and Detailed modes; customisable graphs; workout-specific exercise comments (https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662, f).

**1. Active-workout screen anatomy**
- OBS/vendor: a "+" button in the bottom menu starts a new workout; "+ Exercise" opens a picker with "Most used" and "All Exercises" categories; plus signs under the first exercise add warm-up and working sets; "click on the checkmark in the upper right corner" finishes. (https://help.strengthlog.com/help-article/how-to-record-a-workout/, f)
- OBS/vendor: a timer field is pinned at the bottom; while it runs "you'll see a progress bar running in the background of the screen". (https://help.strengthlog.com/how-to-use-the-timer/, f)
- OBS/vendor: a three-dot menu sits to the right of every set (set type, handle set, RPE/RiR) and of every exercise (handle exercise, exercise-specific timer, reorder). (https://help.strengthlog.com/help-article/mark-sets-as-fails-or-max-reps/, f; https://help.strengthlog.com/help-article/reorder-exercises/, 2026-04-22)
- OBS/vendor: for barbell lifts "A small image will show up above your keyboard while updating the weight", showing how to load the bar. (https://help.strengthlog.com/help-article/plate-calculator/, f)
- UNKNOWN: previous-session ghost text or a "previous" column in the set row; how a programme target is drawn (the programme path fetches weights through "Retrieve From Training Log", point 4).

**2. Set-entry mechanics**
- OBS/vendor: the system keyboard is used. "Simply just tap the set number (or warm-up icon if it's a warm-up set), and it will turn green." The keyboard's own "done" key "doesn't mark the set as done". (https://help.strengthlog.com/mark-a-set-as-done/, f)
- OBS/vendor: set types are changed "by long-pressing or using the three-dot menu and selecting Set type"; drop sets are added with "+ New drop" and cannot be switched back to working or warm-up once drops exist. (https://help.strengthlog.com/help-article/how-to-record-a-workout/, f; https://help.strengthlog.com/help-article/drop-sets/, f)
- OBS/vendor: "Fails" and "Max reps" are per-set flags under Handle set. A fail's reps "will be added to your lifted weight and total volume, but not to any record lists"; for max reps you log the reps you completed. (https://help.strengthlog.com/help-article/mark-sets-as-fails-or-max-reps/, f)
- OBS/vendor: RPE or RiR is Premium and switched on per set: "click on the three dots to the right of the set you want to activate RPE/RiR for". (https://help.strengthlog.com/how-to-activate-rpe-rir-in-your-workouts/, f)
- OBS/vendor: "Special set" button offers Complex, Circuit, Superset, EMOM, Tabata (default 20 s work, 10 s rest) and AMRAP; circuits show a round number that gets a checkmark when every set in the round is done. (https://help.strengthlog.com/help-article/special-sets/, f; https://www.strengthlog.com/track-supersets-and-circuits-in-the-strengthlog-workout-app/, 2024-01-18)
- OBS/vendor: plate profiles (metric and imperial to start, "as many as you like") with exact plate counts and a bar linked per exercise; a bodyweight factor per exercise adds a share of bodyweight to total lifted weight and can be set to 0. (https://help.strengthlog.com/help-article/plate-calculator/, f; https://help.strengthlog.com/help-article/bodyweight-factors/, f)
- OBS/vendor: a "Warm-up for Max Attempt" calculator takes the day's target and returns warm-up sets with suggested rest; "you can start a workout with these warm-up sets directly from the calculator". (https://www.strengthlog.com/?p=26542 via search summary, T4, 2025-08-04; calculators list at https://www.strengthlog.com/workout-log-app/, f)
- OBS/vendor: notes: "set specific comments" plus exercise comments, and a comment and name on the whole workout. (https://help.strengthlog.com/article-categories/when-working-out/, f)

**3. Rest timer**
- OBS/vendor: tap the timer field to change it; "quick adjustment buttons that add or subtract 30 seconds" or a typed time; gear options are automatic start, progress-bar toggle, count-up instead of countdown, notification sound, and an "XL timer" mode; per-exercise rest via Handle exercise > Exercise specific rest timer, with a reset. (https://help.strengthlog.com/how-to-use-the-timer/, f)
- UNKNOWN: lock-screen or Live Activity surface; the Watch app's contents (the App Store lists Apple Watch as a platform); Android equivalents.

**4. Mid-workout exercise management**
- OBS/vendor: swipe left on an exercise border to change or delete it; reorder through Handle exercise > Reorder exercises, or "tap and hold on the border of an exercise" and drag; add exercises and special sets from that view. (https://help.strengthlog.com/help-article/reorder-exercises/, 2026-04-22)
- OBS/vendor: for programme workouts "Retrieve From Training Log" finds "the last time you logged a bench press set of 10 reps, to find what weight you used", picks the heavier weight if you did more reps heavier since, and matches warm-ups only with warm-ups. A swapped exercise keeps the first exercise's weights unless you fetch history or change the 1RM. (https://help.strengthlog.com/help-article/retrieve-from-training-log/, f; https://help.strengthlog.com/help-article/similar-exercises/, f)
- OBS/vendor: "Train Again" copies a logged workout exactly into a new one; Premium adds bulk reps and weight changes per exercise block. (https://help.strengthlog.com/help-article/train-again/, f)
- OBS/vendor: library of 450+ exercises with demos, muscles worked and written steps; custom exercises; a video library in which you upload videos tied to sets. (https://www.strengthlog.com/, f; https://help.strengthlog.com/article-categories/when-working-out/, f)

**5. Finishing**
- OBS/vendor: after the check mark you "change the date and/or time of your workout", name it, comment, "and rate a couple of parameters like sleep, stress, etc.", then Save. (https://help.strengthlog.com/help-article/how-to-record-a-workout/, f)
- OBS/vendor: the summary shows "how many calories your workout burned at the top", synced to Apple Health and Google Fit (a 2023 feature). (https://www.strengthlog.com/new-features-in-the-best-free-workout-tracker-app, 2023-05-10)
- OBS/vendor: skipped work has a defined path. On Save, a popup offers to delete unfinished sets or "Move remaining sets to a planned workout", which appears on the home screen to start, schedule, edit or delete later. (https://help.strengthlog.com/help-article/unfinished-sets-exercises/, f)
- OBS/vendor: personal records and yearly records ("YRs") are tracked; goals for 1RM, volume and workout count. (https://www.strengthlog.com/workout-log-app/, f)

**6. Resilience**
- UNKNOWN: kill-and-resume, background timer, offline behaviour. The help index has a "Possible Issues With Your Data" article that was not read. The store listing says no account is required. (https://help.strengthlog.com/, f; https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662, f)

**7. How it fits together**
- OBS/vendor: home-screen widgets are movable ("tap and hold on to a widget, and all the boxes will start wiggling"); a planned-workouts widget; "My latest workouts" scrolls the last ten; the calendar icon is a shortcut to the training log. (https://help.strengthlog.com/help-article/the-home-screen/, f)
- OBS/vendor: templates under a clipboard icon (programmes or workouts, then "Start workout"); 200+ programmes; a Program Builder; plan a workout for later; streaks, achievements, monthly challenges, and calendar events for "vacations, sickness, injuries" to explain gaps. (https://help.strengthlog.com/help-article/how-to-record-a-workout/, f; https://www.strengthlog.com/new-features-in-the-best-free-workout-tracker-app, 2023-05-10; https://help.strengthlog.com/, f)
- OBS/vendor: calculators for 1RM, IPF and Wilks, Sinclair, meet attempt selection, warm-up and calories. (https://www.strengthlog.com/, f)

**8. Praise, complaints, switching**
- OBS/user (vendor-curated page): "This app is a game changer. It can set up a program for you" (2023-03-20); "Without this app, I'd try to do it myself via the Notes app which got confusing and unorganized" (2024-02-01). (https://www.strengthlog.com/what-our-users-say-about-our-workout-log-app/, f)
- OBS/user (App Store, independent): a reviewer, month shown as September and year not shown, said recent changes left the interface "cluttered" with navigation "several menus deep". (https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662, f)
- INFERRED: the app's strength (depth of strength-sport tooling) and its reported weakness (menu depth after the 9.0 home-screen change) come from the same trait, breadth.

**9. Distinctive**
- Unfinished sets become a planned workout instead of being lost or silently dropped. (https://help.strengthlog.com/help-article/unfinished-sets-exercises/, f)
- "Fail" and "Max reps" are first-class flags with defined volume and record semantics. (https://help.strengthlog.com/help-article/mark-sets-as-fails-or-max-reps/, f)
- Calendar events to explain training gaps; sleep and stress ratings at save. (https://www.strengthlog.com/new-features-in-the-best-free-workout-tracker-app, 2023-05-10; https://help.strengthlog.com/help-article/how-to-record-a-workout/, f)
- Weights retrieved by matching the rep target against history. (https://help.strengthlog.com/help-article/retrieve-from-training-log/, f)

**10. Price and tier.** Free: unlimited logging, no ads, no account, plate calculator, rest timer, PR tracking, challenges. Premium: RPE/RiR, full programme library, advanced statistics, muscle analytics, Train Again bulk edits; US App Store $16.90 per month, $37.90 per 3 months, $109.00 per year, the dearest price seen in this set so far. (https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662, f; https://help.strengthlog.com/how-to-activate-rpe-rir-in-your-workouts/, f)


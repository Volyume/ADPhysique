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

### 2.4 Train Fitness, now Motra (automatic rep counting from an Apple Watch)

Snapshot. The only app in this set that counts reps and recognises exercises from wrist motion. Rebranded from Train Fitness to Motra in build 6.0.0 on 2026-01-07 (https://www.motra.com/what-is-new, 2026-01-07). App Store: developer Train Fitness Inc., 4.7 from 3K ratings, free with subscription tiers listed from $5.99 to $99.99, iPhone, iPad, Mac, Vision and Apple Watch Series 4 or later, iOS 17 and watchOS 10 or later (https://apps.apple.com/app/id1548577496, f). Funding report: $2.5M seed closed end of May 2023, "Over 10,000 weekly active users", "96% accuracy; targeting 99% by year-end" (a vendor claim relayed by the press; 160+ exercises then, 470+ now) (https://betakit.com/train-fitness-closes-2-5-million-usd-to-expand-automatic-workout-tracking-app-for-strength-training/, 2023-06-21). No Android app was found: UNKNOWN beyond "Apple Watch required" in the vendor copy (https://www.motra.com/, f). Release dates below come from the vendor changelog; the App Store listing dates the same builds a few weeks later, so treat dates as approximate to the week.

**1. Active-workout screen anatomy**
- OBS/vendor: "Start a workout on either your Apple Watch or iPhone. Your session will sync and mirror on both devices." (https://help.motra.com/en/articles/9980535-getting-started-with-motra, f)
- OBS/vendor: the watch workout display has three slots from six stats (heart rate, total volume lifted, workout duration, heart-rate zone, active calories, average rest time); "The first slot cannot be changed and will always show rest time or the rest alarm". Open it by swiping left, Settings, Display. (https://help.motra.com/en/articles/9911165-customizing-apple-watch-display, f)
- UNKNOWN: the iPhone set-row layout, top bar and pinned controls (no source read describes the phone screen).

**2. Set-entry mechanics**
- OBS/vendor: the primary path is no entry: "Simply start exercising, and you'll see automatic rep and weight detection on your watch." After the exercise: "confirm the sets and adjust the weight if necessary. The exercise will then be logged." Detection needs "a minimum of 3 reps", "real weights (not air exercises)" and the right Digital Crown orientation setting. (https://help.motra.com/en/articles/9980535-getting-started-with-motra, f)
- OBS/review (conflict with the vendor line above): "Train/Motra does NOT detect weight. The app can remember and predict what weight might be coming next" (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026, T3: the site sells a rival app). An App Store reviewer, 2025-08-20, "criticized inability to detect weight, poor machine-based leg exercise detection, and constant need for manual adjustment" (https://apps.apple.com/app/id1548577496, f). INFERRED: weight is a prefilled prediction from history that you correct, not a sensed value; the vendor help line overstates it.
- OBS/vendor: editing a set offers three scopes: "All Sets", "This Set", and "Auto Update" (the default), which changes later unlogged sets by the same increment; it never touches logged sets and can be switched off in Workout Settings. (https://help.motra.com/en/articles/11081434-updating-set-weight-reps-and-rest-time, f; https://help.motra.com/en/articles/14076038-workout-data-not-saving, f)
- OBS/vendor: changelog items that are set-entry features: per-exercise lb or kg (5.4.0, 2025-11-12); negative-weight support for assisted exercises and an "Integrated timer for time-based exercises" (5.5.0, 2025-11-22); "customizable exercise measurement (reps/distance/time)", a "Circuit" label on exercise groups and a "Smart Swap" feature (6.2.0, 2026-05-01); gym builder with "custom weight increments" (6.4.0, 2026-06-05). (https://www.motra.com/what-is-new, 2026-06-05)

**3. Rest timer**
- OBS/vendor: "Rest Time and Rest Alarm provide a visual and audio reminder to start the next set" (search summary of the help centre, T4: https://help.motra.com/en/collections/10026070-workouts-and-features, f); the watch's first display slot always shows rest time or the alarm (https://help.motra.com/en/articles/9911165-customizing-apple-watch-display, f).
- OBS/user: a 2-star review (2025-04-06) objected to an "intrusive voice rest timer that disrupts workflow". (https://apps.apple.com/app/id1548577496, f)
- OBS/vendor: two shipped fixes show the audio rest alarm is fragile in the background: "rest alarm audio not triggering when the phone app transitions to background" (5.3.2, 2025-11-10) and "audio playback rest alarms could become unreliable" (6.1.1, 2026-03-03). (https://www.motra.com/what-is-new, 2026-03-03)
- UNKNOWN: Live Activity or lock-screen surface on the phone; Wear OS (none found).

**4. Mid-workout exercise management**
- OBS/vendor: 470+ detectable exercises; 1,000+ exercises added in 5.5.0 along with stretches, warm-ups and an Exercise Details page with instructions; custom exercises can be auto-detected (5.3.0). (https://www.motra.com/what-is-new, 2025-11-22)
- OBS/vendor: "Gym Builder" lists the equipment a gym has so generated workouts "only use machines and weights you actually have access to". (search summary, T4: https://help.motra.com/en/articles/14076033-gym-builder, f)
- OBS/user: "removing exercise grouping, poor superset recognition" (2-star, 2025-04-06). (https://apps.apple.com/app/id1548577496, f)

**5. Finishing**
- OBS/vendor: at finish the app "alerts users to unlogged sets"; choices are "Log All Sets" or "Discard X Unlogged Sets", and discarded sets cannot be recovered. (https://help.motra.com/en/articles/14076038-workout-data-not-saving, f)
- OBS/vendor: after a template workout "The templated workout you saved will reflect the actual data (reps, weight, etc.) instead of the planned template", with a choice to update the template's weight, reps and structure. (https://help.motra.com/en/articles/9698208-templated-workouts, f)
- OBS/vendor: data export by date range and ChatGPT access to workout history through MCP, read-only (6.2.0, 2026-05-01). (https://www.motra.com/what-is-new, 2026-05-01)

**6. Resilience (the best-documented of any app in this file)**
- OBS/vendor: Watch workouts "are stored locally on the device first, then transferred to iPhone"; locally saved workouts are kept "up to 14 days". A workout stuck in "pending upload" shows a "Workout Processing" banner with "Upload Saved Workout", and is "automatically deleted after 14 days". (https://help.motra.com/en/articles/14076038-workout-data-not-saving, f)
- OBS/vendor: after a dead battery watchOS can preserve in-progress data "for up to 8 hours", but "recovery only works with freeform workouts, not template-based sessions". (https://help.motra.com/en/articles/14076038-workout-data-not-saving, f)
- INFERRED: the app has a real failure mode where a finished workout exists only in a pending state; the vendor's own help centre has an article for "Workout Data Not Saving".

**7. How it fits together**
- OBS/vendor: templates (start from phone or watch), "Last Hit Templates" and exercise search in Trends (6.1.0, 2026-03-01), recovery percentage and watch streak widgets, a Trends tab, AI-generated workouts "tailored to past sessions, recovery, and fitness goals", and an AI Coach with video chat and template saving (6.3.0, 2026-05-19). (https://www.motra.com/what-is-new, 2026-05-19; https://www.motra.com/, f)
- OBS/vendor: "Smart Weights" begin after "at least five logged workouts" and use a Brzycki 1RM, weight and rep history, muscle recovery, rest time and workout structure. (https://help.motra.com/en/articles/10060175-unlocking-gains-progressive-overload, f)

**8. Praise, complaints, switching**
- OBS/user: "This app is extremely convenient and best of all, it's free to use." Reviewer noted "not 100% accurate" but editing is easy (5 stars, 2025-01-03). (https://apps.apple.com/app/id1548577496, f)
- OBS/user: "The app tracks muscle group recovery and the AI will create a routine for your workout that day based on what has recovered" (5 stars, 2025-07-12). (https://apps.apple.com/app/id1548577496, f)
- OBS/review (T3, vendor-run sites): an independent score of 3 out of 5, "not yet reliable enough to replace intentional logging", with complex movements and cable work confusing it (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026); "Sometimes feels slower than manual logging" because of corrections (https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026, 2026-10-06; the site sells a rival app).
- INFERRED: on this evidence automatic counting saves taps only where detection is right; the cost of a wrong guess (confirm, correct, re-enter weight) can exceed the cost of tapping.

**9. Distinctive**
- Rep counting and exercise recognition from the watch's accelerometer, no manual entry, 470+ exercises (vendor CLAIM; accuracy contested by T3 reviews). (https://www.motra.com/, f)
- Auto Update: one edit rewrites the remaining unlogged sets by the same increment. (https://help.motra.com/en/articles/11081434-updating-set-weight-reps-and-rest-time, f)
- A documented offline pipeline: watch stores first, phone uploads later, with stated retention windows. (https://help.motra.com/en/articles/14076038-workout-data-not-saving, f)
- Other wrist-motion counters named by a T3 source: Gymatic, Rep Up (haptic count only), Fitnexx, Riven; none reads weight. (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026)

**10. Price and tier.** Free tier with paid subscriptions ($5.99 to $99.99 SKUs on the App Store); the 2023 launch pricing was $7.99 per month or $49.99 per year with a limited free version. (https://apps.apple.com/app/id1548577496, f; https://betakit.com/train-fitness-closes-2-5-million-usd-to-expand-automatic-workout-tracking-app-for-strength-training/, 2023-06-21)

### 2.5 Gymshark Training (retired Android app, frozen iOS app)

Snapshot. Free workout-video and log app from the apparel brand Gymshark Ltd. Status is the headline: the vendor's support article dated 2026-07-27 says "The Training app is no longer available to download on Android" and "The Training App will no longer be updated with any fixes or new features for both IOS & Android"; it remains downloadable on the iOS App Store "in most worldwide locations" (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27). A search-engine summary of APKMirror and AppBrain pages (T4, pages not loadable) dates the Google Play removal to 12 March 2025 with final Android build 2.54.0 on 3 December 2024 (https://www.appbrain.com/app/gymshark-training-fitness-app/com.gymshark.fitness, undated; search summary 2026-10-06). The App Store listing shows 4.8 from 15K ratings (the store API says 4.85 from 15,155), last build 2.62.0 on 2025-06-25, which "Migrated to new data management system; users must update and log in by September 2025 to maintain data sync" (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f; https://itunes.apple.com/search?term=workout%20tracker&country=us&entity=software&limit=40, 2026-10-06).

**1. Active-workout screen anatomy.** UNKNOWN in detail; no hands-on write-up could be read (Tom's Guide and a Medium review returned truncated or 403 pages). OBS/vendor: "video demonstrations with built-in timers" and rep and set monitoring. (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)

**2. Set-entry mechanics**
- OBS/vendor (search summary of release notes, T4): build 2.31.0 introduced "Sets & Reps: Tracked Mode" through "Gymshark Labs", letting you "record sets, reps, weight, and duration to match your training goals"; build 2.32.0 made Tracked Mode "show your previous exercise data", described as a response to user feedback. (https://apkmirror.com/apk/gymshark-ltd/gymshark-training-fitness-app/gymshark-training-fitness-app-2-32-0-release, undated; page returned 403, so the text is the search engine's summary)
- OBS/vendor: custom workouts have "personalised sets, reps, and rest". (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27)
- INFERRED: before Tracked Mode the app logged completion of prescribed sets, not performed weights; a free brand app added true logging late and then stopped.

**3. Rest timer.** OBS/vendor: rest is a field of the custom workout builder (above). Auto-start, lock-screen and wearable behaviour: UNKNOWN.

**4. Mid-workout exercise management.** OBS/vendor: "SMART SEARCH" filters workouts by type, duration, equipment or target muscle group; "Step by step videos". Replace, reorder, remove mid-session: UNKNOWN. (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27)

**5. Finishing.** UNKNOWN (summary, share, rating). The app also carried a "Gymshark66" 66-day habit challenge and Apple Health integration. (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)

**6. Resilience.** UNKNOWN beyond the 2025 forced migration: "users must update and log in by September 2025 to maintain data sync" (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, 2025-06-25). INFERRED: data lived on a vendor account that had to be re-authenticated, so a user who skipped the update risked losing sync.

**7. How it fits together.** OBS/vendor: library of "thousands of free workouts led by Gymshark athletes", programmes, a custom builder, "TRACK YOUR PROGRESS" tab; weekly new content. (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)

**8. Praise, complaints, switching**
- OBS/user: "completely free, no in app purchases" and a developer who answered suggestions within 10 minutes (5 stars, 2024-09-06); "10/10 Recommend ... clear video demonstrations" (2025-05-13); a 2022 user asked to "search progress during workouts" and for "progress graphs beyond three major lifts". (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)
- OBS/review (search summary of a hands-on review, T4): the Progress tab is "one of the least detailed and developed parts"; people wanted weight-progression graphs per exercise and workout streaks. (https://tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free, undated; page truncated)

**9. Distinctive.** A free, no-IAP, brand-funded logger; its end-of-life notice is itself the lesson for a free product (see section 4, pattern W-14). INFERRED.

**10. Price and tier.** Free, no in-app purchases. (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27)

### 2.6 Liftoff (two unrelated apps share the name)

Name collision, stated so nothing is mixed: "Liftoff - Ranked Gym Workouts" (Liftoff Labs Inc., formerly GymBros Inc., App Store ID 6448081563, Android package `com.gymbros.app`) is the gamified one covered below. A different, tiny "Liftoff - Workout Log" (ID 1085414909, developer Nicholas Domenicali) is described in one line at the end; its own page returned 404, so that line comes from a search summary only (T4). (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563, f; https://apps.apple.com/app/id1085414909, search summary 2026-10-06)

Snapshot. US App Store 4.83 from 98,347 ratings, free with Liftoff Pro ($3.99 to $79.99 SKUs), iPhone, iPad, Apple Watch, Vision; build 2.16.4 "Apple Watch support is here! Track workouts from your wrist" released the day before the fetch, build 2.15.6 on 3 Sep "Get your rank on 500+ exercises for free!" (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563, f; https://itunes.apple.com/search?term=workout%20tracker&country=us&entity=software&limit=40, 2026-10-06). Google Play: 4.8 from 94.5K reviews, "over 1 million downloads", in-app purchases (https://play.google.com/store/search?q=liftoff%20ranked%20gym%20workouts&c=apps&hl=en&gl=US, 2026-10-06; store search page, the detail page did not load). Business facts from a newsletter: founder Jason Lin, team of two or three, "$300,000" monthly revenue reported, growth by organic TikTok (https://ventureradar.substack.com/p/this-gym-app-built-by-college-students, 2025-05-21; second-hand revenue figures, unverified).

**1. Active-workout screen anatomy**
- OBS/review (UX teardown, T2, undated): card-based layout; each exercise card has name, illustration and muscle targets; a set table with weight, reps and completion status "with drag reordering"; an "Add Set" action that duplicates the previous set or adds an entry; session notes and a bodyweight field; contextual "How to Log" modals. (https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657, f)
- OBS/review: "Top-of-screen positioning" for a prominent countdown timer. (https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657, f)

**2. Set-entry mechanics**
- OBS/review: supersets, exercise reordering, notes and "detailed set-by-set input"; custom exercises and reusable routines. (https://screensdesign.com/showcase/liftoff-ranked-gym-workouts, f)
- OBS/user: a 4-star review asks for a pause on the timers and better logging for unilateral dumbbell work where one side is weaker; another (2025-12-31) says exercises cannot be skipped "without deleting them". (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563?see-all=reviews, f)
- UNKNOWN: numeric pad, RPE/RIR, plate calculator, previous-session ghost values.

**3. Rest timer.** OBS/review: adjustable-time buttons, a skip control, remaining minutes and seconds shown at the top; a second teardown says "no specific rest timer feature is mentioned", so the two teardowns disagree and the timer is only partly established. Lock screen, Live Activity, Wear OS: UNKNOWN; the Apple Watch app is new (2.16.4). (https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657, f; https://screensdesign.com/showcase/liftoff-ranked-gym-workouts, f)

**4. Mid-workout exercise management.** OBS/vendor: 600+ exercises; custom exercises and routines. Reorder by drag handles (OBS/review above). Skipping without deleting is requested by a user, so it is absent or hard to find. (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563, f)

**5. Finishing**
- OBS/review: summary cards for duration, total volume and experience points, a mascot celebration ("Jymbo", a blue elephant), rank-promotion and streak unlocks, sharing to Instagram or saved image, an egg/XP reward currency. (https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657, f)
- OBS/review: dual-media social posts that pair a real photo with in-app data graphics. (https://screensdesign.com/showcase/liftoff-ranked-gym-workouts, f)

**6. Resilience.** UNKNOWN. OBS/user (aggregator, T4): complaints of "App crashes and freezing issues". (https://mwm.ai/ko/apps/liftoff-ranked-gym-workouts/6448081563, f)

**7. How it fits together**
- OBS/review: onboarding is a quiz (goals, experience, age, weight, height, equipment), an avatar builder, Apple Health permission, account creation, AI plan generation, then a paywall with a "7-day free trial" and $79.99 per year; a "Welcome Quest" gamifies setup, including adding the home-screen widget. (https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657, f; https://screensdesign.com/showcase/liftoff-ranked-gym-workouts, f)
- OBS/vendor: global, regional and friends leaderboards; rank tiers (reported as Bronze, Silver, Gold, Olympian); a "General Strength Rank"; streaks, quests, achievements; a photo calorie scanner. (https://mwm.ai/ko/apps/liftoff-ranked-gym-workouts/6448081563, f)

**8. Praise, complaints, switching**
- OBS/user: "an excellent idea to rank people's workouts because...it makes me excited to go to the gym" (App Store review, undated in the fetch); concern that "some exercises receive disproportionately high ranks relative to difficulty" and that rank weighs absolute weight over reps. (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563, f)
- OBS/user: food search "completely random results about 90% of the time" (2025-04-11). (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563?see-all=reviews, f)
- OBS/user (aggregator, T4): surprise charges after the trial because the expiry alert was unclear. (https://mwm.ai/ko/apps/liftoff-ranked-gym-workouts/6448081563, f)

**9. Distinctive.** Per-exercise rank against a global population, an XP and level economy, an avatar and mascot, and a "tap and hold to commit" onboarding screen. The gamification replaces coaching rather than adding to it. (https://screensdesign.com/showcase/liftoff-ranked-gym-workouts, f)

**10. Price and tier.** Free base (ranks on 500+ exercises free per the 2.15.6 note); Pro $3.99 to $79.99 SKUs, annual $79.99 after a 7-day trial. (https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563, f; https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657, f)

The other "Liftoff - Workout Log": a search summary says "no ads or in-app purchases, unlimited routines, swipe gesture logging, progress graphs, 1 Rep Max tracking, automatic rest timers, and 100+ pre-loaded exercises", 4.7 from 31 ratings (T4, https://apps.apple.com/app/id1085414909, search summary 2026-10-06). UNKNOWN beyond that.

### 2.7 HeavySet (Runloop Ltd, iPhone and iPad only)

Snapshot. A long-lived, dense iPhone gym log: US App Store 4.6 from 1.3K ratings, free with a single "Lifetime Intermediate" purchase at $19.99, iPhone only, iOS 16.6 or later, latest build 2025.1 on 2025-08-20 (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310, f). No Android release (a third-party page last checked 2026-09-27 says so: https://wellnessproject.ai/heavyset-for-android, 2026-09-27; that site sells a rival).

**1. Active-workout screen anatomy.** UNKNOWN in layout. OBS/vendor: "View workout preview", "Local notifications when timers end", "View all current rep records for current exercise" and PR notifications during the log. (https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310, f)

**2. Set-entry mechanics**
- OBS/vendor: "Log using intelligent suggested values"; the site says it "logs a set in as few taps as possible" with Smart Values that "anticipate the weight and reps you'll enter next". (https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310, f; https://www.heavyset.app/, f)
- OBS/vendor: sets driven by intensity and training max ("Automatically calculate weight using intensity and training max"), rep ranges, set ranges, AMRAP, RPE, supersets and giant sets, base weight and bodyweight, assisted exercises, unilateral option that doubles volume in statistics, volume groups. (https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310, f)
- OBS/vendor: plate calculator; deload "intensity, volume or rest automatically". (same listing)
- OBS/user: older reviews (2021) missed warm-up, failed and dropped set logging and pre-entry of planned weights; 2020 review found "touchy buttons and unclear feedback during set logging". (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310?see-all=reviews, f) The 2018 release added "unilateral exercises, base weight options" and "new record alerts"; a 2019 build added timed exercises and deload parameters (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310, f). Current warm-up and drop-set support: UNKNOWN.

**3. Rest timer.** OBS/vendor: "Preset rest timers per exercise", "Rest timer with presets and quick modifiers", a "Tempo timer metronome" for pacing reps, "Auto-advancing exercises and super sets", local notifications when a timer ends. (https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310, f) Live Activity and watch: UNKNOWN (none mentioned).

**4. Mid-workout exercise management.** OBS/vendor: add any exercise; per-exercise notes; "Full exercise history with notes"; training max per exercise. Replace and reorder: UNKNOWN. (same listing)

**5. Finishing.** OBS/vendor: weekly progress stats, a log of every rep record "filter record log by rep amount", PR notifications for "rep records, estimated 1rm, volume & more". (same listing)

**6. Resilience.** OBS/vendor: "Automatic iCloud backup", CSV export "without upgrading", CSV import with presets "for Strong, StrongLifts, and more", in-app FAQs, help videos and developer chat. Offline and kill-resume: UNKNOWN (local-first is INFERRED from iCloud backup and no account). (https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310, f; https://www.heavyset.app/, f)

**7. How it fits together.** OBS/vendor: routines built from earlier workouts or imported and exported as plain text for sharing ("Import plain text routines for rapid routine building"); an estimated duration and intensity per routine. (same listing)

**8. Praise, complaints, switching.** OBS/user: "It's the best app for seriously tracking training I've ever seen" and "HeavySet finally dethroned the old app as my workout tracker" (App Store, undated in the fetch). A search summary quotes: "I've tried out Strong, Fitbod, and Stacked. Heavyset is far better than all of them." (T4; https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310, f). The 2023 request for "automatic weekly weight increases" (periodisation) is the recurring gap. (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310?see-all=reviews, 2023-06-26)

**9. Distinctive.** Plain-text routine import and export for sharing, a tempo metronome, intensity and training-max driven loads, and a rep-record log filterable by rep count. (https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310, f)

**10. Price and tier.** Free to download; the one in-app purchase is a $19.99 lifetime unlock, and a non-paying user is "limited in the number of times you can perform the routines you input" (search summary, T4). (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310, f)


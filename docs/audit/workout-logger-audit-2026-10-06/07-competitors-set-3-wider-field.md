# Workout logger audit 2026-10-06: lane A7, the wider field, set 3 (web research)

Lane A7 (web research, Sonnet). Round: audit only, nothing built. Research day: 2026-10-06; every "now" below means that day.
Founder order, verbatim: "We are not accepting just hevy and strong that's lazy look at many more".
Scope: the long tail and the hardware, coaching-platform and programme-first loggers that lanes A4 and A5 do not name. A4 covers Hevy, Strong, Fitbod, JEFIT, Boostcamp, Alpha Progression, RP Hypertrophy, Juggernaut AI, Caliber, Setgraph, Gymaholic, Dr. Muscle. A5 covers FitNotes, GymBook, Liftin', StrongLifts, KeyLifts, Lyfta, Gravl, Gainframe, Sensai, Simple Workout Log, Stacked, Apple's own strength logging, Google Fit and Fitbit, Peloton Strength+, Ladder, Future, Trainerize, MyFitnessPal. No app of those two lists gets a dossier here. StrongLifts is on both the A5 list and the A7 brief: it gets a short cross-reference entry here, written only from the angle of a programme-first logger.
Code: not read, not touched. Volyume appears only in the judgement lines of sections 4 and 5.

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

**Proportion rule.** Depth goes where the logger is distinctive (Liftosaur, StrengthLog, Strive, Progression, Motra, Garmin, WHOOP, Strava, Tonal, Tempo, Everfit). Evidence also set the depth: where a vendor publishes help text per task, the dossier is long; where only a store listing exists, it is short. Apps that are a thin variant of the common pattern are shorter.

**How the field was widened.** Beyond the apps the brief names, two store surfaces were read on 2026-10-06 to find loggers the other lanes do not cover: US App Store search for "workout tracker" and "gym log" (Apple's public search endpoint) plus the US and UK Top Free Health and Fitness charts, and Google Play search pages for "workout tracker", "gym log", "workout log", "strength training log", "weightlifting tracker" and "lifting log" (the package IDs in page order, then each listing read in full). The result is in section 2 ("Store-ranked loggers and Android-native rivals") and in the observed rank order stated there.

**Limits, stated so nobody over-reads the file.**
1. Reddit was unreachable. The fetch tool refuses reddit.com and old.reddit.com and the search tool will not filter to it. One third-party Reddit mirror snapshot (reddit.sentinel-team.org) was readable and is cited once, tagged as a mirror. User voice here is dated store reviews, vendor forums and boards, one Hacker News thread, and review-site comments.
2. Google Play detail pages came back truncated through the fetch tool, but a plain HTTP download of the same pages returned the full listing (description, "What's new", rating, review count, downloads, update date and dated reviews with developer replies). The Android evidence in this file is therefore direct for 48 listings (2.40), read on 2026-10-06 as raw page text. What a Play listing cannot show is how the app behaves: its feature lines are vendor claims and its reviews are individual reports.
3. The fetch tool answers through a small model. For the dossiers that carry the most weight (Liftosaur, StrengthLog's help pages, Motra's data-not-saving help, Progression, StrongLifts' Apple Watch help, Strive's home page, the WHOOP forum thread, Tonal's in-workout controls, Everfit's tracking help, RepCount's pricing page, and every Google Play listing) the raw page text was also downloaded and the quoted strings were checked against it; a bullet says "raw page" or "confirmed against the raw page text" where that was done. All other quotations are as the fetch tool returned them and were not re-checked.
4. Pages that stayed unreadable (403, 404, 429 or no text) by any route tried: TrainHeroic support, Samsung Community, WHOOP's Locker articles, RepCount's Intercom help centre, Medium, APKMirror, AppBrain, Digital Trends. TechRadar (Garmin, published 2022-06-08), Tom's Guide (Gymshark, 2024-03-06) and Garage Gym Reviews (Train Fitness product page, undated; Tempo Studio review, published 2021-09-28 and modified 2026-06-02) were downloaded as raw page text and read in full. The Tom's Guide page does not contain a Progress-tab quotation that a search-engine summary had attributed to it, so that claim was dropped; it is the reason claims that come from search-engine summaries of unreadable pages are tagged T4 and are weaker than the same claim read on the page.
5. Ratings, counts and prices are the US storefront on 2026-10-06 unless stated; Apple's public lookup returned no result for some apps (for example Wodify and one GymRun listing), which is why those rows are thin.
6. A vendor's marketing page and its curated testimonials are claims; the comparison pages published by app vendors (Hercules, Edge, Stronger, Progression, Wellness Project, Sleet, RepCount) rank their publisher first and carry no "no" on their own.
7. Undated pages carry the fetch day, 2026-10-06 (`f`). Sources published after that day do not exist in this file.
8. No code was read or changed; no file other than this one was written.

## 1. The set at a glance

Ratings are the US App Store unless "Play" is shown (Google Play search page); both read on 2026-10-06 and therefore snapshots. "n/r" = no rating read. Prices are the US headline from the dossier's source. The number after each app is its dossier in section 2.

| App (dossier) | Kind | Platforms observed | Rating | Price headline |
|---|---|---|---|---|
| Liftosaur (2.1) | Programmable open-source logger | iPhone, iPad, Apple Watch, Android, web | 4.9 (409) | Free; Premium $4.99 per month, $39.99 per year, $99.99 lifetime |
| RepCount (2.2) | Minimal strength log | iPhone, Android | 4.85 (13,330); Play 4.9 | Free; Premium $29.99 per year or $4.99 per month |
| StrengthLog (2.3) | Strength-sport log, powerlifting lean | iPhone, iPad, Apple Watch, Vision, Android | 4.9 (3.7K); Play 4.7 | Free; Premium $16.90 per month, $109.00 per year |
| Motra, was Train Fitness (2.4) | Wrist-motion rep counting plus AI plans | iPhone, Apple Watch, iPad, Mac, Vision | 4.7 (3K) | Free tier; subscriptions $5.99 to $99.99 SKUs |
| Gymshark Training (2.5) | Brand app, retired on Android, frozen on iOS | iPhone (Android removed 2025) | 4.85 (15,155) | Free, no IAP |
| Liftoff - Ranked (2.6) | Gamified rank and XP log | iPhone, iPad, Apple Watch, Android | 4.83 (98,347); Play 4.8 | Free; Pro $3.99 to $79.99 SKUs, $79.99 per year |
| HeavySet (2.7) | Dense iPhone log, plain-text routines | iPhone, iPad | 4.6 (1.3K) | Free; $19.99 lifetime unlock |
| Gymverse (2.8) | Adaptive planner that logs | iPhone, iPad, Apple Watch, Mac, Android | 4.85 (165,220); Play 4.3 | Subscription, Monthly Premium $19.99, 7-day trial |
| GymRun, Imperon (2.9) | Android diary with wearables | Android, Wear OS, Garmin | Play 4.4 | n/r |
| Hercules, five products (2.10) | Name collision | iOS, watchOS, Android | n/r | $4.99 per month or $49.99 once for the Android one |
| Fitlog, 15+ products (2.11) | Name collision | Android, iOS | n/r | n/r |
| Progression (2.12) | Auto-progression log with published rules | iPhone, Android | 4.48 (161) | Free 4 workouts; Pro EUR 4.99 per month, EUR 34.99 per year |
| Workit (2.13) | Frozen simple log (build of 2018) | iPhone | 3.98 (80) | Free; small IAPs |
| Leap Gym Workout Planner and Log (2.13) | Routine planner and log | iPhone, Android | 4.85 (1,398); Play 4.8 | Free; Premium $29.99 per year |
| WHOOP Strength Trainer (2.14) | Band-measured manual logger | WHOOP app | n/r | Part of membership (price not read) |
| Garmin (2.15) | Wrist rep counting, edit in Connect | Garmin watches and Connect app | n/r | Included with the device |
| Samsung Health (2.16) | Time and heart-rate recorder with a strength mode | Galaxy Watch (Wear OS) | n/r | Free |
| Strava strength (2.17) | Social hub with a new strength log | iOS, Android, 14 partner integrations | n/r | Not stated; reported free |
| Tonal (2.18) | Cable machine that is the logger | Tonal hardware plus app | n/a | $4,295 plus $59.95 per month |
| Tempo (2.19) | 3D-camera trainer | Tempo hardware plus app | n/a | About $39 per month (2022) |
| TrueCoach client (2.20) | Coach-prescribed log | iPhone, iPad | 4.9 (36K) | Free to client |
| TrainHeroic athlete (2.21) | Coach-prescribed log with 7 timers | iPhone | 4.3 (1.8K) | Free; Athlete Pro $4.99 per month |
| TeamBuildr athlete (2.22) | Team strength log, tablet floor mode | iOS, Android | n/r | Free to athletes, coach pays |
| Everfit client (2.23) | Coach-prescribed log | iPhone, iPad, Apple Watch | 4.7 (2.7K) | Free to client |
| Kahunas client (2.24) | Coach-prescribed log | iOS, Android | n/r | Coach tiers $35, $69, $99 per month |
| StrongLifts (2.25) | 5x5 programme log (lane A5 has the full entry) | iPhone, Android, Apple Watch | 4.86 (76,797) | Free to download, subscription for the full app |
| Starting Strength Official (2.26) | Novice-programme log with an AI chat coach | iOS, Android | 4.63 (41); legacy app 4.80 (2,553) | Free; Pro $14.99 per month, $89.99 per year, $179.99 lifetime |
| 5/3/1 apps (2.27) | Wendler cycle loggers | iPhone, Apple Watch | 4.80, 4.84, 4.51 | Free with one-time or subscription unlocks |
| GZCL Method Workout Logger (2.28) | GZCLP logger | iPhone, iPad, Mac | 4.73 (230) | Free; $9.99 one-time Pro |
| Bodybuilding.com app, BodySpace's successor (2.29) | Legacy merged app | iOS, Android | 4.56 (29,167) | Free; $9.99 per month or $59.99 per year |
| Stronger (2.30) | Log with a Strength Score | iOS, Android | 4.77 (17,522); Play 4.6 | $9.99 per month, $39.99 per year (vendor) |
| MacroFactor Workouts (2.31) | Adaptive programmes from a nutrition-app maker | iPhone, iPad, Android | 4.84 (4,648) | $11.99 per month, $71.99 per year |
| SmartGym (2.32) | Apple-only, independent watch app | iPhone, iPad, Mac, Apple Watch | 4.70 (34,237) | Free; premium subscription |
| Fitlist (2.33) | JEFIT publisher's second logger | iPhone, Apple Watch, Android | 4.73 (10,496) | Free; premium subscription |
| Strive (2.34) | Local-first log with a free-forever pledge | iOS, Android | 4.90 (867); Play 4.8 | Free; optional Pro |
| Long-tail Android names (2.35) | Seven apps, T4 evidence | Android (some iOS) | Play 4.5 to 4.9 | n/r |
| Open-source Android (2.36) | wger, GymLoga, GymRoutines | Android | n/r | Free |
| Gym Note Plus and chat or voice loggers (2.37) | Text-parsing entry | iOS | 4.8 (17) | Pro $4.99 per month, $99.99 lifetime |
| COROS, Amazfit, Oura (2.38) | Wearable brands | Watches, rings | n/r | n/r |
| SugarWOD, Wodify (2.39) | CrossFit-class athlete apps | iOS, Android | Wodify 4.9 (T4) | n/r |

## 2. Per-app dossiers

Each dossier answers the ten points. Platform differences (Android in particular) are called out wherever a source allows. The fetch tool answers through a small model: quotes below are as returned and were not re-checked against the raw page, except where a bullet says otherwise.

### 2.1 Liftosaur (programmable, open-source logger)

Snapshot. One-developer, open-source (AGPL-3.0) weightlifting planner and tracker; iPhone, iPad, Apple Watch (needs iOS 17, watchOS 10.6), Android and a web app; US App Store rating 4.9 from 409 ratings; free with in-app purchases (monthly $4.99, yearly $39.99, lifetime $99.99) (https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849, f). The native apps are "thin wrappers around the PWA with additional native features"; stack is Preact/TypeScript with AWS Lambda, DynamoDB and S3; 732 GitHub stars (https://github.com/astashov/liftosaur, f). The vendor documents the app as one page per topic, 31 pages, most dated 2026-09-27 or 2026-09-28 in their own page metadata (https://www.liftosaur.com/features, f; https://www.liftosaur.com/features/workout-screen, 2026-09-27). Recent App Store version notes, as the converter returned them (build numbers look inconsistent, so treat as indicative): heart-rate display from Apple Watch or AirPods; "Redesigned workout screen with improved readability and set completion" (22 Sep); "Time-based exercise support with countdown timers" (9 Sep) (https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849, f). Method note: the Liftosaur feature pages were read twice, once through the fetch tool and once as raw HTML text, and the raw text is the source of the quotations below.

**1. Active-workout screen anatomy**
- OBS/vendor: top header shows "the workout time with a blinking colon"; a pause icon beside it pauses, a play icon resumes; "Tap Finish in the top right." A thumbnail strip of exercises sits at the top, "Each thumbnail shows completed sets over total, like 2/5, and a check when the exercise is done", supersets share a coloured line under their thumbnails, and "Swipe left or right to move between exercises". (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor: the exercise card header "has Equipment and, when the program uses percentages, 1RM. Tap either value to change it"; a cog opens a menu (edit programme exercise, swap for this workout only, notes). (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor: "The next set is expanded. It has big Reps and Weight fields and a big checkmark." Tap a set row to expand or collapse it; after completing the expanded set "the next unfinished set expands". Under the fields: plates per side "as a bar and a list" (free accounts see a "See plates for each side" link) and "Last, Best and Same day results for this set, each with its date"; an AMRAP set shows Best AMRAP. (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor, the column that carries the prescription and the previous value: "The second column header is Target. Tap it to cycle: Target, Previous Set, Plates, e1RM." When the programme weight cannot be loaded the row shows the exact weight crossed out (212lb) and the rounded weight underlined (210lb); tapping it opens a sheet "Why is the weight adjusted?" that explains the percentage of 1RM, unit conversion, bar weight, plates or the nearest fixed dumbbell. (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor: below the sets, a graph of weights over time (Premium, after two or more past workouts), a Personal Records block with Max Weight and Max 1RM and dates (Max 1RM is an estimate, "a set without a logged RPE counts as RPE 10", using the OpenPowerlifting RPE chart), then every past workout of that exercise; "Hide Graphs and PRs" hides the block. (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- UNKNOWN: whether any bar is pinned at the bottom; the sources describe the strip at the top, the expanded set and the rest-timer pill in the bottom right corner.

**2. Set-entry mechanics**
- OBS/vendor: "Tap the checkmark to complete the set. The phone vibrates once, and the rest timer starts." (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor, a custom keypad, not the system keyboard: "Tap a Reps or Weight field. A keypad opens with digits, +, -, backspace and a close button. On the weight field, + and - step by the smallest weight your equipment can load. On reps they step by 1." The weight keypad also has a calculator key for the rep-max calculator (reps 1 to 24, RPE 1 to 10). (https://www.liftosaur.com/features/workout-screen, 2026-09-27; https://www.liftosaur.com/features/exercise-library, f)
- OBS/vendor, prompts declared in the prescription: "Sets that end in + ask a question after the tap. 5+ asks for reps, ?+ asks for weight, @8+ asks for RPE." The popup "shows only the fields that set needs", starts at the target (reps), RPE runs 0 to 10 in steps of 0.5 starting at the target RPE, weight has - and + buttons through loadable weights; "Tap Done to complete the set. Tap Cancel to leave the set as it was." (https://www.liftosaur.com/features/set-types, f)
- OBS/vendor: one-sided exercises (Bulgarian Split Squat, Lunge, Step Up, curls, one-arm row) show "an L: and an R: reps field"; dumbbell exercises can count both weights toward volume ("Two weights (count both)"). (https://www.liftosaur.com/features/set-types, f; https://www.liftosaur.com/features/exercise-library, f)
- OBS/vendor: the pencil on an expanded set opens "Edit Target": Min and Max reps, an AMRAP switch, an Ask switch on weight, and switches for RPE, set timer and custom rest timer; the change "applies to this workout only". "Add Warmup Set" and "Add Set" add one row each; "Add Set copies the last set of the exercise, or the last set from your previous workout when there are none." (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor: timed sets: "Tap the play button. The app opens a Get Ready countdown, 5 seconds by default"; then a set clock; options auto-complete, "Stop & record" or "Log 0:12, keep timing"; `auto` chains the next timed set for EMOM and Tabata. (https://www.liftosaur.com/features/timed-sets, f)
- OBS/vendor: warm-up sets are a first-class row kind ("Warmup sets do not move you" in a superset rotation). (https://www.liftosaur.com/features/supersets, f)
- OBS/vendor: notes: "Tap the cog, then Show Exercise Notes"; "Next time, the card shows it as Previous Note with its date, for two months"; workout-level notes through the kebab menu. (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor: weights round to what you can load: bar weight, 1 to 4 plate sides, plate inventory and per-gym equipment lists in Me > Available Equipment; "Rounding happens on the workout screen only. Program state variables stay exact." (https://www.liftosaur.com/features/equipment-and-gyms, f)
- OBS/vendor: progression is code. Built-in Linear, Double and Rep Sum progressions or custom scripts; on finish the app "rewrites that text, with the new weights, reps, sets" of the programme. (https://liftosaur.com/, f; https://www.liftosaur.com/blog/posts/liftosaur-overview/, 2025-09-01)

**3. Rest timer** (raw page text, https://www.liftosaur.com/features/rest-timer, 2026-09-27)
- OBS/vendor: "Complete a set, and the rest timer starts. No extra tap. A small pill appears in the bottom right corner of the workout screen. The big number is how long you have rested so far. The small number is your target rest. A progress bar fills the pill as you rest. When you reach the target, the pill turns red, and the timer keeps counting so you can see how far past your rest you are."
- OBS/vendor: tap the pill to expand: "-15s and +15s to adjust the target", a trash can to cancel, the elapsed and target times. For AMRAP, RPE or weight-prompt sets "the timer starts when you submit that popup, not when you tap the set".
- OBS/vendor, the resolution order is deterministic and documented: a per-set rest in the programme text, then the Superset timer, then the Warmup timer (default 90 s) or the Workout timer (default 180 s); "If the value that wins is empty or 0, no timer runs for that set." Set in Me > Timers.
- OBS/vendor: "When the rest ends, the app plays a chime and vibrates." Both are in Me > Settings > Sound; volume 0 gives vibration only; "Adding time with +15s arms the chime again for the new target."
- OBS/vendor, Premium only: a notification when rest ends with the next set and the plates ("It's time for the next set! Next set: Bench Press, 5 x 100lb"); iOS Live Activity and Dynamic Island with -15s and +15s; Android "Live Update chip next to the clock"; a watch Rest Timer screen that taps the wrist; with Apple Watch and headphones the phone plays the chime through the headphones while locked.
- OBS/vendor, Premium: the iOS Live Activity shows workout time, set progress ("Set: 2/5"), coloured dots per set status, exercise name, target and plates and lets you "Tap it to complete that set without unlocking the phone"; Android shows an ongoing notification with "-15s, +15s, and Done" buttons and can "Ignore Do Not Disturb". (https://www.liftosaur.com/features/lock-screen-and-notifications, f)
- OBS/vendor: the Apple Watch app logs sets with the Digital Crown, answers AMRAP and RPE prompts, shows the rest timer "at the top of the exercise screen" turning red once over, shows heart rate, "keeps its own copy of the program and the ongoing workout, so it works with the phone in the locker", and needs Premium. (https://www.liftosaur.com/features/apple-watch, f) No Wear OS app is described: UNKNOWN.

**4. Mid-workout exercise management**
- OBS/vendor: "Tap the cog on the exercise card and pick Swap Exercise" with two tabs: Ad-hoc Exercise (weights adjusted from your history) and From Program. "A swap changes this workout only. The program stays as it was." Add via "+" at the end of the strip (multi-select); remove via the cog (this workout only); reorder by "Long-tap a thumbnail in the strip and drag it". (https://www.liftosaur.com/features/changing-a-workout, f)
- OBS/vendor: alternatives can be pre-declared once in the programme with `used: none`, so a swap from the From Program tab arrives "with these sets and this weight instead of a guess from history" and its progression runs on finish. A swap to an ad-hoc exercise drops the old exercise's progression unless a setting keeps it. (https://www.liftosaur.com/features/exercise-library, f)
- OBS/vendor: an "Ad-Hoc Workout" starts empty ("Tap Add Set on each card"); on finish "Create Program Day" turns it into a programme day. (https://www.liftosaur.com/features/changing-a-workout, f)
- OBS/vendor: library of hundreds of exercises with muscle maps; Me > Exercises lists Custom Exercises, Current program exercises and Exercises from history with filter by name and type; "Override Muscles" lets a user give each muscle a multiplier from 0 to 1 so weekly set counts match how they train; custom exercises can be added with AI muscle-mapping (a vendor claim). (https://www.liftosaur.com/features/exercise-library, f; https://www.liftosaur.com/features, f)
- OBS/vendor: "Day Muscles" in the kebab menu opens a muscle map for today's programme day (Strength and Hypertrophy tabs, front and back, percentages). (https://www.liftosaur.com/features/workout-screen, 2026-09-27)

**5. Finishing**
- OBS/vendor: "If some sets are not completed, the app asks 'Are you sure you want to FINISH this workout? Some sets are not marked as completed.' Then the progress scripts run and update the program." If enabled, the workout goes to Apple Health or Google Health. The "Congratulations!" screen shows Totals (time, volume, sets, reps), exercises with their sets, sets per muscle group, new PRs and share buttons; Continue returns to Home. (https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- OBS/vendor: the share card carries the logo, a trophy with the PR count, programme and day name, Time, Volume, Sets and Reps totals, and one row per exercise with picture, name, PR trophy and sets; targets are Instagram Stories and Feed, TikTok, text, web link, saved image; an opt-in public profile page shows the current programme and main-lift progress graphs. (https://www.liftosaur.com/features/sharing-workouts, f)
- UNKNOWN: a post-workout rating or "feel" prompt (none is described); what happens to skipped sets in the progression (INFERRED: progress scripts read completed sets, so an unticked set is not counted; not read).

**6. Resilience**
- OBS/vendor: "No connection is needed to train. Start a workout, complete sets, edit programs, add measurements. The app saves to the device and syncs when it is online again." Sync runs after changes, on open and on return from background; "When two devices change the same thing, the later change is kept and the earlier one is dropped"; changes to different things merge; "The workout you have open syncs too. Start on your phone, complete a few sets, then open the web app. The same workout is there, with the same sets done." An account is optional. (https://www.liftosaur.com/features/sync-and-offline, f)
- OBS/vendor: the 2021 design note says local state is the source of truth, held in IndexedDB, with the service worker caching the app bundle; on reconnect both states are migrated and merged, preferring local for settings. (https://www.liftosaur.com/blog/posts/offline-mode-in-liftosaur/, 2021-03-04)
- OBS/vendor: an "Always On Display" setting (off by default) keeps the screen awake while the app is open. (https://www.liftosaur.com/features/first-run-and-settings, f)
- INFERRED: a force-kill mid-workout loses nothing because state is written continuously; the sources do not state kill-and-resume behaviour in words.

**7. How it fits together**
- OBS/vendor: Home tab: "Every finished workout is a card on the Home tab, under a week strip and a month calendar." A card shows date, programme day and programme name, one row per exercise with sets as weight and reps, a trophy for a PR, and a bottom row of workout time, total weight, sets, reps. Tapping a card opens the workout screen to edit it, with the date as the title. (https://www.liftosaur.com/features/workout-history, f)
- OBS/vendor: Week Insights card on Home: Volume, Sets, PRs; "Show More" adds PR detail, a strength/hypertrophy split ("The default target is 30% strength and 70% hypertrophy") and per-muscle weekly set counts against a range ("10 to 12 sets unless you change it"; Novice 10-12, Intermediate 13-15, Advanced 16-20), coloured green inside the range, yellow within 70% to 130%, red beyond. (https://www.liftosaur.com/features/week-insights, f)
- OBS/vendor: onboarding is units, equipment and plates, then "Choose your program" with four options: a built-in programme (about 60, including GZCLP, 5/3/1, Starting Strength, PHUL), create your own, import from a link, or "Go without program" (ad-hoc workouts, building the programme along the way). Until four workouts are finished the app shows a tour card set the first time each of three screens opens, with a question-mark icon on tour screens to replay it. (https://www.liftosaur.com/features/first-run-and-settings, f; https://www.liftosaur.com/features, f)
- OBS/vendor: a programme editor with calendar grid, per-day and text modes; a desktop web editor; a "Playground" that simulates workouts without touching history; programmes shared by public link, QR code or private edit link; import history from Hevy CSV, its own CSV or JSON; export JSON (everything), CSV (one row per set) or programmes as Liftoscript text; Apple Health and Health Connect sync; a REST API and an MCP server so "AI assistants like Claude or ChatGPT" can create programmes and log workouts. (https://www.liftosaur.com/features/import-export, f; https://www.liftosaur.com/blog/docs/, 2026-10-05)
- OBS/vendor: settings: text size slider (12 to 24), dark mode following the phone by default, week start Sunday or Monday, one weight unit with per-equipment overrides. (https://www.liftosaur.com/features/first-run-and-settings, f)

**8. Praise, complaints, switching**
- OBS/user (vendor-curated, selection bias): "This is it. This is my last workout exercise tracking app. It's that good it's that customizable." (App Store, 2025-05-02); "As an experienced lifter, this is by FAR the best app to write and track workouts." (2026-01-09); "No complicated entries, it just tells me the weight and reps and I tap once." (2024-03-05); "One of the few apps that includes a lifetime purchase model in era of subscriptions." (2025-11-04). (https://liftosaur.com/, f)
- OBS/user: the about page quotes a user: "like having Google Sheets and Strong in the same app!" (https://www.liftosaur.com/about, f). Notebooks and spreadsheets are the stated rivals: "Notebooks don't track. Spreadsheets are hard to use on your phone." (App Store, 2025-08-13, https://liftosaur.com/, f)
- OBS/user (independent): Hacker News, 2023-02-22: "Tried it, it looks pretty cool, I could use it. A bit confusing at the beginning, a lot of stuff going on"; the same commenter asked for tutorials and example scripts. (https://news.ycombinator.com/item?id=34896643, 2023-02-22) The 2026 onboarding tours (point 7) are consistent with that complaint having been acted on. INFERRED.

**9. Distinctive**
- The programme is text that the app rewrites after every workout (progress scripts), so the next session's prefilled numbers are the prescription. (https://www.liftosaur.com/blog/posts/liftosaur-overview/, 2025-09-01)
- Prompts are declared in the prescription (`5+`, `@8+`, `100lb+`, `?+`): the checkmark opens a popup only for sets that need data, otherwise it completes in one tap. (https://www.liftosaur.com/features/set-types, f)
- A documented, deterministic rest-time precedence (per-set, superset, warm-up or workout default), and a column header that cycles Target, Previous Set, Plates, e1RM so one column serves four jobs. (https://www.liftosaur.com/features/rest-timer, 2026-09-27; https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- Swapping an exercise offers an ad-hoc substitute that re-derives weight from your own history, or a pre-declared alternative with its own progression. (https://www.liftosaur.com/features/exercise-library, f)
- Per-gym equipment lists and rounding to loadable weights shown with the reason ("Why is the weight adjusted?"); one account, same workout live across phone and web. (https://www.liftosaur.com/features/equipment-and-gyms, f; https://www.liftosaur.com/features/workout-screen, 2026-09-27)
- Lock-screen set completion and Android Live Update buttons. (https://www.liftosaur.com/features/lock-screen-and-notifications, f)

**Android (Google Play, raw page text read 2026-10-06).** 4.8 from 1.12K reviews, 100K+ downloads, updated 2026-09-22. The latest note states the design intent of the new workout screen: "Redesigned the workout screen. Decluttered it, and now expanding the current set row to make it readable from distance, and also easier to tap the checkmark to complete set." The listing calls Liftosaur "the only scriptable workout app", lists "Equipment rounding & exercise substitutions", "Web Editor" and cloud sync. Reviews: "The interface isn't necessarily intuitive but simple enough. My main critique is the steep subscription price for the premium features" (2025-01-16); "the developer is also super responsive on Discord" (2024-05-26). (https://play.google.com/store/apps/details?id=com.liftosaur.www.twa&hl=en&gl=US, 2026-09-22)

**10. Price and tier.** Free: programmes, editor, Liftoscript, logging, history, measurements entry, equipment, sharing, import and export. Premium: plates display, graphs, muscle views, rest-timer notifications and Live Activity, Week Insights, the Apple Watch app, API and MCP keys; monthly and yearly carry a 14-day free trial; a lifetime option exists ($4.99 monthly, $39.99 yearly, $99.99 lifetime on the US App Store). (https://www.liftosaur.com/features/premium, f; https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849, f)

### 2.2 RepCount (Siper Apps AB)

Snapshot. A long-running minimalist strength log. App Store: 4.9 from about 13K ratings (the store API gives 4.85 from 13,330), "iPhone only (requires iOS 18.0 or later)", builds 10.8.1 (about 3 days before the fetch), 10.8.0 (28 Sep) and 10.7.0 (12 Sep, "Added superset exercise creation, iOS 27 fixes, improved translations") (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f). Google Play (package `sp.repcount`, read as raw page text): 4.9 from 8.38K reviews, 500K+ downloads, updated 2026-10-06, and the listing says "downloaded more than 2 million times on Android and iPhone" (a vendor CLAIM) (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06). The vendor site says "Log sets, reps and weight on iOS and Android" with "a native app on each platform" (https://www.repcountapp.com/, f; https://www.repcountapp.com/features, f). The help centre is on Intercom and its pages returned 404 to both fetch routes, so help-article content is UNKNOWN except through a search summary (T4).

**1. Active-workout screen anatomy.** UNKNOWN in layout: no source read describes the header, the set-row columns or any bottom bar. OBSERVED fragments, all vendor text: "Every workout starts with the weights and reps from last time, so you always know what to beat"; "Warm-up sets, plus notes on every set, exercise and workout"; built-in exercises "show a demo and the muscles they work". (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06; https://www.repcountapp.com/features, f)

**2. Set-entry mechanics**
- OBS/vendor: prefill from the last session ("automatic prefill from previous sessions" on the App Store); "12 exercise types, from weight and reps to bodyweight, assisted, timed holds, farmer's walks and cardio"; warm-up sets; notes on each set, exercise and workout are free. (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06; https://www.repcountapp.com/pricing, 2026-09-12)
- OBS/vendor, Premium: "Supersets and drop sets", "Duplicate routines, copy several sets at once, and more rest timer sounds", CSV export. (same pages; the pricing page says features and prices were "verified against the app on 2026-09-12")
- OBS/user: a trainer-minded reviewer on Play: "one can change, add or delete and adjust as necessary, right after doing each exercise" (2022-04-19, 16 helpful votes); another: "I had to play around with the app to figure out how it works, a quick tutorial would be nice" (2022-11-15). (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06)
- OBS/user (aggregator of store reviews, T4): "Superset limitations: users report difficulties adding exercises to supersets"; "Cannot log strength exercises by time OR reps simultaneously (affects HIIT and calisthenics)"; "unclear 'end workout' function". (https://justuseapp.com/en/app/594982044/repcount-gym-workout-log/reviews, f)
- UNKNOWN: numeric pad or system keyboard, RPE or RIR, plate calculator (the compare page speaks of "plate loading in context", https://www.repcountapp.com/compare, 2026-09), 1RM entry.

**3. Rest timer**
- OBS/vendor, free on Android: "A rest timer that can start when you complete a set and keeps running on your lock screen." The pricing page lists "Rest timer with notifications" as free. (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06; https://www.repcountapp.com/pricing, 2026-09-12) The word "can" implies auto-start is a setting (INFERRED).
- OBS/vendor: Live Activities for the workout on iOS are Premium. (https://www.repcountapp.com/features, f)
- OBS/vendor: the help centre has a six-article Timer collection on notification sounds and troubleshooting (https://support.repcountapp.com/, f); a search summary lists "no sound on the timer", silent-mode notifications, the timer buzzing every second and an alarm ringing when Bluetooth headsets connect on Android (T4, https://intercom.help/repcount/en/collections/12878570-timer, undated). INFERRED: sound and silent-mode paths are a recurring support topic.
- UNKNOWN: per-exercise defaults, adjust while running, watch.

**4. Mid-workout exercise management**
- OBS/vendor: "Opening an exercise's history from inside a workout is a Premium feature" and the Play text repeats "Exercise history and charts right from the workout screen" under Premium. Previous values are free (prefill); the per-exercise history view in the workout is paid. (https://www.repcountapp.com/, f; https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06)
- OBS/vendor: "Save any workout as a routine, or repeat a past workout" is free; Push, Pull, Legs and Full Body starter routines; "Add your own exercises". (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06)
- UNKNOWN: replace and reorder mechanics (the 2026-10-06 build note is "Fixed a crash when returning to the app while reordering exercises", so reordering exists).

**5. Finishing.** OBS/vendor: workouts and body weight go to Apple Health or Health Connect. Summary screen, share cards, feel rating, skipped sets: UNKNOWN. (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06)

**6. Resilience**
- OBS/vendor: "The workout tracker works offline, even in a basement gym"; "Do I need an account? No. Install the app and start logging right away. Sign in with Google, Apple or email to back up your log and get it back on a new phone"; cloud sync between iOS and Android is free. (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06; https://www.repcountapp.com/pricing, 2026-09-12)
- OBS/vendor: latest Android note (2026-10-06): "Fixed a crash when returning to the app while reordering exercises". Kill-and-resume: UNKNOWN.

**7. How it fits together**
- OBS/vendor: unlimited free routines, custom exercises, "complete workout history ... kept for free", history browsed "month by month"; Premium charts zoom and pan and group by day, week, month or year, with estimated 1RM and "personal records across rep ranges". A web library of exercises, calculators and comparison articles (Hevy, Strong, Stronger) sits beside the app. (https://www.repcountapp.com/features, f; https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06; https://www.repcountapp.com/compare, 2026-09)

**8. Praise, complaints, switching**
- OBS/user (Google Play): "I've been using RepCount to track lifts since 2022. I definitely recommend it if you're looking for a workout tracker that doesn't try to babysit you ... The only feature I wish it had is desktop synchronization" (2026-01-31); the developer answered "I absolutely think we will have a web version in the future" (2026-02-02). (https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06)
- OBS/user (App Store): "I have been using the free version of this app for years...I really love the design of this app" (2025-01-11); "This app is extremely polished and easy to follow" (2024-10-01); developer replies by first name. (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044?see-all=reviews, f)
- OBS/user (aggregator, T4): "$8/yr premium is ridiculously underpriced"; "I've used RepCount for the past 5 years...nothing...compares". (https://justuseapp.com/en/app/594982044/repcount-gym-workout-log/reviews, f)

**9. Distinctive**
- A free tier that keeps the whole log, notes on every set, warm-ups, twelve exercise types, offline use, an optional account and an Android lock-screen timer, and sells analysis (charts, PR table, supersets, drop sets, CSV, in-workout history). (https://www.repcountapp.com/pricing, 2026-09-12; https://play.google.com/store/apps/details?id=sp.repcount&hl=en&gl=US, 2026-10-06)
- The founder publicly declines to copy a rival's "Strength Score" and says so on its compare page (vendor CLAIM; summarised, not quoted). (https://www.repcountapp.com/compare, 2026-09)

**10. Price and tier.** Free: unlimited workouts, routines, custom exercises, notes, history, offline, body weight, rest timer, cloud sync, health sync. Premium $29.99 per year or $4.99 per month (annual has a one-week trial on iOS; the App Store also lists $6.99 and $39.99 SKUs). (https://www.repcountapp.com/pricing, 2026-09-12; https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044, f)

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

**Android (Google Play, raw page text read 2026-10-06).** 4.7 from 11.7K reviews, 100K+ downloads, updated 2026-10-02. Free list on the listing: "A plate calculator that shows you how to load the barbell", "A workout rest timer", "Plan your workouts in advance", PR tracking, goals and streaks, "1RM estimates and suggested warm-ups before PR attempts", Health Connect sharing, and "Wear OS support with Tiles for your goals, streaks, weekly training stats, and monthly challenges"; the watch app shows heart rate during active workouts, read from Health Connect and not stored by StrengthLog. Premium: "% of 1RM, Rate of Perceived Exertion, Reps in Reserve, and quick stats for every set". The release note is too long for Play ("find Version history in Settings"; the 9.0 release moved Settings under Profile). Reviews: "If ... your previous weights and reps aren't showing up for a workout you've already done, check your settings; it's likely that you haven't set it up to your specifications" (2026-07-03); a 2026-06-11 reviewer: "The workout doesnt remember your last sets ... if I add an exercise, it doesnt copy it over next week. Not worth the price. I suggest FITNOTES", answered by the developer: "The app does remember what you've done, but maybe you've misunderstood how it works?" INFERRED: previous-value behaviour depends on a setting and differs for programme workouts, and that confuses some users. (https://play.google.com/store/apps/details?id=com.styrkelabbet.Styrkelabbet&hl=en&gl=US, 2026-10-02)

**10. Price and tier.** Free: unlimited logging, no ads, no account, plate calculator, rest timer, PR tracking, challenges. Premium: RPE/RiR, full programme library, advanced statistics, muscle analytics, Train Again bulk edits; US App Store $16.90 per month, $37.90 per 3 months, $109.00 per year. (https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662, f; https://help.strengthlog.com/how-to-activate-rpe-rir-in-your-workouts/, f)

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
- OBS/vendor (raw help page dated 2026-08-10): the logging gesture is a swipe: "During your workout, swipe right on each set as you complete it. This logs the set in real time and ensures nothing is missed when you finish." On Finish the app shows an "X/Y Sets Logged" screen with "Log All Sets" (marks every unlogged set complete) and "Discard X Unlogged Sets" (shown only if at least one set was logged). (https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10)
- OBS/vendor: changelog items that are set-entry features: per-exercise lb or kg (5.4.0, 2025-11-12); negative-weight support for assisted exercises and an "Integrated timer for time-based exercises" (5.5.0, 2025-11-22); "customizable exercise measurement (reps/distance/time)", a "Circuit" label on exercise groups and a "Smart Swap" feature (6.2.0, 2026-05-01); gym builder with "custom weight increments" (6.4.0, 2026-06-05). (https://www.motra.com/what-is-new, 2026-06-05)

**3. Rest timer**
- OBS/vendor: "Rest Time and Rest Alarm provide a visual and audio reminder to start the next set" (search summary of the help centre, T4: https://help.motra.com/en/collections/10026070-workouts-and-features, f); the watch's first display slot always shows rest time or the alarm (https://help.motra.com/en/articles/9911165-customizing-apple-watch-display, f).
- OBS/user: a 2-star review (2025-04-06) objected to an "intrusive voice rest timer that disrupts workflow". (https://apps.apple.com/app/id1548577496, f)
- OBS/review (Garage Gym Reviews product page, undated; its own wording says other platforms were planned for "Spring 2023", so it was written before then): lists "Automatic rest timer" and "Enables hands-free training" among the pros of the Train Fitness app. (https://www.garagegymreviews.com/equipment/train-fitness-app, f)
- OBS/vendor: two shipped fixes show the audio rest alarm is fragile in the background: "rest alarm audio not triggering when the phone app transitions to background" (5.3.2, 2025-11-10) and "audio playback rest alarms could become unreliable" (6.1.1, 2026-03-03). (https://www.motra.com/what-is-new, 2026-03-03)
- UNKNOWN: Live Activity or lock-screen surface on the phone; Wear OS (none found).

**4. Mid-workout exercise management**
- OBS/vendor: 470+ detectable exercises; 1,000+ exercises added in 5.5.0 along with stretches, warm-ups and an Exercise Details page with instructions; custom exercises can be auto-detected (5.3.0). (https://www.motra.com/what-is-new, 2025-11-22)
- OBS/vendor: "Gym Builder" lists the equipment a gym has so generated workouts "only use machines and weights you actually have access to". (search summary, T4: https://help.motra.com/en/articles/14076033-gym-builder, f)
- OBS/user: "removing exercise grouping, poor superset recognition" (2-star, 2025-04-06). (https://apps.apple.com/app/id1548577496, f)

**5. Finishing**
- OBS/vendor: at finish the app "alerts users to unlogged sets"; choices are "Log All Sets" or "Discard X Unlogged Sets", and discarded sets cannot be recovered. (https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10)
- OBS/vendor: after a template workout "The templated workout you saved will reflect the actual data (reps, weight, etc.) instead of the planned template", with a choice to update the template's weight, reps and structure. (https://help.motra.com/en/articles/9698208-templated-workouts, f)
- OBS/vendor: data export by date range and ChatGPT access to workout history through MCP, read-only (6.2.0, 2026-05-01). (https://www.motra.com/what-is-new, 2026-05-01)

**6. Resilience (the best-documented of any app in this file)**
- OBS/vendor (raw help page dated 2026-08-10): Watch workouts "are saved locally on the Watch first" and then transferred to the iPhone for upload; locally saved workouts are kept "up to 14 days". A workout stuck in "pending upload" shows a "Workout Processing" banner with "Upload Saved Workout"; "Motra retries uploading in the background using an increasing interval (starting at 90 seconds, up to every 2 hours), but if 14 days pass without a successful upload, the workout data is removed with no warning"; a "Clear" button permanently deletes all pending uploads. (https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10)
- OBS/vendor: after a dead battery "watchOS can retain in-progress workout data for up to 8 hours", but "This recovery only works with Freeform workouts (workouts started without selecting a template)". (https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10)
- INFERRED: the app has a real failure mode where a finished workout exists only in a pending state; the vendor's own help centre has an article for "Workout Data Not Saving".

**7. How it fits together**
- OBS/vendor: templates (start from phone or watch), "Last Hit Templates" and exercise search in Trends (6.1.0, 2026-03-01), recovery percentage and watch streak widgets, a Trends tab, AI-generated workouts "tailored to past sessions, recovery, and fitness goals", and an AI Coach with video chat and template saving (6.3.0, 2026-05-19). (https://www.motra.com/what-is-new, 2026-05-19; https://www.motra.com/, f)
- OBS/vendor: "Smart Weights" begin after "at least five logged workouts" and use a Brzycki 1RM, weight and rep history, muscle recovery, rest time and workout structure. (https://help.motra.com/en/articles/10060175-unlocking-gains-progressive-overload, f)

**8. Praise, complaints, switching**
- OBS/user: "This app is extremely convenient and best of all, it's free to use." Reviewer noted "not 100% accurate" but editing is easy (5 stars, 2025-01-03). (https://apps.apple.com/app/id1548577496, f)
- OBS/user: "The app tracks muscle group recovery and the AI will create a routine for your workout that day based on what has recovered" (5 stars, 2025-07-12). (https://apps.apple.com/app/id1548577496, f)
- OBS/review (T3, vendor-run sites): an independent score of 3 out of 5, "not yet reliable enough to replace intentional logging", with complex movements and cable work confusing it (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026); "Sometimes feels slower than manual logging" because of corrections (https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026, 2026-10-06; the site sells a rival app).
- OBS/review (same Garage Gym Reviews page, written before spring 2023): pros "Can automatically detect 100 exercises plus over 400 can be manually entered", "Automatic rest timer", "Logs multiple metrics for you to later review", "Free"; cons "Does not have any workouts or training programs" and "Currently only supported by Apple Watch Series 4+". The product summary says the app "works with your Apple Watch Series 4+ to automatically track workout sets and reps using an AI program". The page describes no hands-on rep-accuracy test. (https://www.garagegymreviews.com/equipment/train-fitness-app, f)
- INFERRED: the product has grown from a counter with 100 detected exercises and no programmes (this page) to 470+ detectable exercises and AI-generated workouts (vendor, 2026); the two sources are years apart and from different authors, so the comparison is loose.
- INFERRED: on this evidence automatic counting saves taps only where detection is right; the cost of a wrong guess (confirm, correct, re-enter weight) can exceed the cost of tapping.

**9. Distinctive**
- Rep counting and exercise recognition from the watch's accelerometer, no manual entry, 470+ exercises (vendor CLAIM; accuracy contested by T3 reviews). (https://www.motra.com/, f)
- Auto Update: one edit rewrites the remaining unlogged sets by the same increment. (https://help.motra.com/en/articles/11081434-updating-set-weight-reps-and-rest-time, f)
- A documented offline pipeline: watch stores first, phone uploads later, with stated retention windows. (https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10)
- Other wrist-motion counters named by a T3 source: Gymatic, Rep Up (haptic count only), Fitnexx, Riven; none reads weight. (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026)

**10. Price and tier.** Free tier with paid subscriptions ($5.99 to $99.99 SKUs on the App Store); the 2023 launch pricing was $7.99 per month or $49.99 per year with a limited free version. (https://apps.apple.com/app/id1548577496, f; https://betakit.com/train-fitness-closes-2-5-million-usd-to-expand-automatic-workout-tracking-app-for-strength-training/, 2023-06-21)

### 2.5 Gymshark Training (retired Android app, frozen iOS app)

Snapshot. Free workout-video and log app from the apparel brand Gymshark Ltd. Status is the headline: the vendor's support article dated 2026-07-27 says "The Training app is no longer available to download on Android" and "The Training App will no longer be updated with any fixes or new features for both IOS & Android"; it remains downloadable on the iOS App Store "in most worldwide locations" (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27). A search-engine summary of APKMirror and AppBrain pages (T4, pages not loadable) dates the Google Play removal to 12 March 2025 with final Android build 2.54.0 on 3 December 2024 (https://www.appbrain.com/app/gymshark-training-fitness-app/com.gymshark.fitness, undated; search summary 2026-10-06). The App Store listing shows 4.8 from 15K ratings (the store API says 4.85 from 15,155), last build 2.62.0 on 2025-06-25, which "Migrated to new data management system; users must update and log in by September 2025 to maintain data sync" (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f; https://itunes.apple.com/search?term=workout%20tracker&country=us&entity=software&limit=40, 2026-10-06).

**1. Active-workout screen anatomy.** UNKNOWN at set-row level: the one hands-on review read (Tom's Guide, 2024-03-06) describes browsing and playback, not a set row. OBS/review: the app has sections "featured (curated workouts), workouts, plans, progress, and settings"; the design is "clean, modern, and minimal" with "bold headlines and a clutter-free layout"; once a routine starts, "Gymshark guides you through each exercise with a video demonstration". (https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free, 2024-03-06) OBS/vendor: "video demonstrations with built-in timers" and rep and set monitoring. (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)

**2. Set-entry mechanics**
- OBS/vendor (search summary of release notes, T4): build 2.31.0 introduced "Sets & Reps: Tracked Mode" through "Gymshark Labs", letting you "record sets, reps, weight, and duration to match your training goals"; build 2.32.0 made Tracked Mode "show your previous exercise data", described as a response to user feedback. (https://apkmirror.com/apk/gymshark-ltd/gymshark-training-fitness-app/gymshark-training-fitness-app-2-32-0-release, undated; page returned 403, so the text is the search engine's summary)
- OBS/vendor: custom workouts have "personalised sets, reps, and rest". (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27)
- OBS/review: "you can't really do much to customize them, so there's no option for you to add drop sets, supersets, or properly track your progress, which is a shame." Whether this 2024 review pre-dates Tracked Mode (build 2.31.0) is UNKNOWN, because the page that dates the build returned 403. (https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free, 2024-03-06)
- INFERRED: before Tracked Mode the app logged completion of prescribed sets, not performed weights (consistent with the 2024 review above); a free brand app added true logging late and then stopped.

**3. Rest timer.** OBS/vendor: rest is a field of the custom workout builder (above). Auto-start, lock-screen and wearable behaviour: UNKNOWN.

**4. Mid-workout exercise management.** OBS/vendor: "SMART SEARCH" filters workouts by type, duration, equipment or target muscle group; "Step by step videos". Replace, reorder, remove mid-session: UNKNOWN. (https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27)

**5. Finishing.** UNKNOWN (summary, share, rating). The app also carried a "Gymshark66" 66-day habit challenge and Apple Health integration. (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)

**6. Resilience.** UNKNOWN beyond the 2025 forced migration: "users must update and log in by September 2025 to maintain data sync" (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, 2025-06-25). INFERRED: data lived on a vendor account that had to be re-authenticated, so a user who skipped the update risked losing sync.

**7. How it fits together.** OBS/vendor: library of "thousands of free workouts led by Gymshark athletes", programmes, a custom builder, "TRACK YOUR PROGRESS" tab; weekly new content. (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)

**8. Praise, complaints, switching**
- OBS/user: "completely free, no in app purchases" and a developer who answered suggestions within 10 minutes (5 stars, 2024-09-06); "10/10 Recommend ... clear video demonstrations" (2025-05-13); a 2022 user asked to "search progress during workouts" and for "progress graphs beyond three major lifts". (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, f)
- OBS/review (page read in full): verdict "easy navigation and enjoyable, effective workouts"; reasons to avoid "Lacks workout customization" and "No community features"; it is "best suited for beginners and those seeking a straightforward, no-frills workout companion. For the seasoned gym-goer or the detail-oriented user, however, it might prove underwhelming"; sign-up took "around a minute" and asked "just a few generic questions such as age and gender", so "there's not a lot of personalization". (https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free, 2024-03-06)

**9. Distinctive.** A free, no-IAP, brand-funded logger; its end-of-life notice is itself the lesson for a free product (see pattern W-11 in section 4). INFERRED.

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

**Android (Google Play, raw page text read 2026-10-06).** 4.8 from 94.5K reviews, 1M+ downloads, in-app purchases, rated Teen; the listing says "join over 4 million lifters" (vendor CLAIM) and "Accessibility Features: Enjoy a user-friendly interface with accessibility options". Latest note: "Get your rank on 500+ exercises!". Reviews: wants "to separately track my left/right hands and legs when doing single arm/leg workouts" (2024-12-14, 55 helpful votes); the food-label scanner "never gets it right" (2026-07-11); "sometimes it crashes when you leave the app to switch music or something" and a bug that stops friend-rank views (2026-07-30, 18 helpful votes). (https://play.google.com/store/apps/details?id=com.gymbros.app&hl=en&gl=US, 2026-10-03)

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

### 2.8 Gymverse (Fitness22)

Snapshot. A planner-first app that logs: US App Store 4.85 from 165,220 ratings, version 8.8800 released 2026-09-27, iPhone, iPad, Apple Watch, Vision and Mac; Android listing 4.3 on Google Play (store search page); the vendor site shows a free 7-day trial (https://itunes.apple.com/lookup?id=1048454034&country=us, 2026-09-27; https://play.google.com/store/search?q=GymRun%20workout%20tracker&c=apps&hl=en&gl=US, 2026-10-06; https://gymverse.app/, f). Release notes are generic ("bug fixes and performance improvements") across 8.52 to 8.88, so the change history carries no feature evidence (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f).

**1. Active-workout screen anatomy.** UNKNOWN: no hands-on write-up or help page was found; the vendor site has no help centre. OBS/vendor: "AI-optimized weights, sets, reps, and rest periods", a "customizable rest timer", and "Apple Watch hands-free training". (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f)

**2. Set-entry mechanics.** OBS/vendor: "Smart weight suggestions that adjust as you improve", "automatically adapts week to week", "advanced periodization and deload week implementation". (https://gymverse.app/, f; https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f). OBS/user: "There's no way to build exercises that use both time and weight" (1 star, 2025-04-17). (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034?see-all=reviews, f)

**3. Rest timer.** OBS/user: "in app timer while working out is seamless and an awesome feature"; the same reviewer wants "a default rest timer from the settings rather than having to manually set every single timer during every single workout" (2025-02-23). INFERRED: rest is chosen per workout, with no global default at that date. (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034?see-all=reviews, f)

**4. Mid-workout exercise management.** OBS/vendor: 500+ exercises with multi-angle video, library filterable "by muscle group, equipment, or keyword", "extensive exercise alternatives" (from review praise). Replace and reorder mechanics: UNKNOWN. (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f)

**5. Finishing.** OBS/vendor: personal records, achievement badges, leaderboards, shareable achievements, progress photos and body measurements. (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f)

**6. Resilience.** UNKNOWN. OBS/user: "lack of user account login/password recovery system" (store review theme). (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f)

**7. How it fits together.** OBS/vendor: onboarding builds "a fully managed, multi-week training plan tailored to your goals, schedule, and equipment"; plan splits, exercises, schedule and equipment are adjustable ("so your plan always fits your life"); workout calendar and reminders. (https://itunes.apple.com/lookup?id=1048454034&country=us, 2026-09-27; https://gymverse.app/, f)

**8. Praise, complaints, switching.** OBS/user: "Deceptive charging practices ... Charged $80 annually without consent during trial" (1 star, 2025-06-30); workout scheduling rigidity and limited renaming of workout days (store review themes, undated). (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034?see-all=reviews, f; https://apps.apple.com/app/id1048454034, f)

**9. Distinctive.** Scale (165K ratings) and a plan-that-adapts promise sold with a trial; billing complaints recur in the review sample. INFERRED. 

**Android (Google Play, raw page text read 2026-10-06).** 4.3 from 48.3K reviews, 1M+ downloads, "Contains ads" and in-app purchases, updated 2026-09-22; the Play description reads like an older exercise-library and routine app ("Audio cues for your rest time in between sets", "Search by muscle group, equipment type or keyword", "Gym Tracker: Access your workout history via your gym log") and does not mention the adaptive plan the App Store text leads with. Review: "on Apple I had a whole lot more features but with switch over to an Android device it just doesn't have the same bells and whistles ... thought I could get along with out the ability to swap exercises on the fly and adjust as needed but I can't" (2026-06-15, 3 helpful votes); an older review asks for "checking off the Ex and tracking nr of reps and weight increases" and a way to skip an exercise and return later (2019-10-28). INFERRED: the Android build is a thinner product than the iOS one, which fits the 0.55 rating gap in section 5.3. (https://play.google.com/store/apps/details?id=com.fitness22.workout&hl=en&gl=US, 2026-09-22)

**10. Price and tier.** Free download; subscription SKUs from $14.99 up to $119.99, "Monthly Premium $19.99"; 7-day trial. (https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034, f)

### 2.9 GymRun (Imperon, Android-native, Wear OS and Garmin)

Name collision. The GymRun covered here is the Android diary "Workout Tracker & Gym Plan Log" by the GymRun Team (Imperon), package `com.imperon.android.gymapp`. A different App Store app called GymRun exists under another developer (a rival's page says calendar-based planning and nutrition) and is not covered (https://wellnessproject.ai/gymrun-for-iphone, 2026-09-27). The Google Play listing was read as raw page text, which replaces the earlier reliance on a rival's comparison page.

Snapshot. 4.4 from 17.3K reviews, 1M+ downloads, in-app purchases, updated 2026-08-31, rated for Phone, Watch and Tablet (https://play.google.com/store/apps/details?id=com.imperon.android.gymapp&hl=en&gl=US, 2026-08-31).

**1-2. Screen and set entry.** Layout UNKNOWN (no source describes the set row). OBS/vendor from the Play listing:
- "Customizable Workout Plans: Create and share routines for weight lifting, bodyweight, and cardio, supports supersets, circle training, and mixed routines"; "Smart Logging: Enjoy convenient pre-filling options based on your historical log data"; "Warm-Up Pro: Use flexible templates to log your warm-up routines"; "Essential Tools: Integrated plate calculator"; "Your Personal Log: Customize logging fields, add notes, and track body metrics and progress photos"; multi-user profiles; favourite lists, muscle-group filters, "new record notifications". (https://play.google.com/store/apps/details?id=com.imperon.android.gymapp&hl=en&gl=US, 2026-08-31)
- "Dynamic Target Adjustment: Instantly scale your workout values (weights, reps) globally to match your daily form and energy levels." This is a one-control, whole-session autoregulation: the planned numbers move together, with no AI claimed. (same listing)
- OBS/user (2019, with the developer's answer): a user who made a light day with lower weights found it lowered the weights of the normal routine; the developer said to duplicate the exercises or "disable the historical autofill feature only on the first run of the workout plan to use the predefined (lighter) values". (same listing, 2019-11-19) INFERRED: history-based autofill is a global setting that can fight a plan's own numbers.

**3. Rest timer.** OBS/vendor: "Individual rest countdown timer per exercise and a stopwatch with automatic rounds (great for Tabata)"; analytics include rest times. Lock-screen route: the listing says GymRun "utilizes foreground services" to sync "between the phone, the notification widget, and the smartwatch app", so a notification widget exists; its controls are UNKNOWN. (same listing)

**4. Mid-workout management.** OBS/vendor: "Gym Flexibility: Equipment occupied? Switch to an alternative exercise instantly." (same listing)

**5-6. Finishing and resilience.** OBS/vendor: backup, data transfer and CSV export; sync with Health Connect, Garmin Connect, Google Fit and Samsung Health; the foreground-service note says "your workout continues to be logged reliably, even if your screen is off or you are using the widget". A 2019 reviewer: "Currently the only way to get your data out is via manual export" and asked for an API. (same listing)

**7. Wearables (the reason this app is in the file).** OBS/vendor: "GymRun offers top-tier support for Samsung Galaxy, Google Wear OS, and Garmin"; "Log directly on your wrist: Use the standalone watch app"; "Companion Mode: Keeps a live connection to your smartphone during the workout"; "Standalone Mode: No phone needed! Sync data/routines before and after your session"; heart-rate recording. (same listing) OBS/user: "Gymrun is the best wear os app. if you want to track what you're doing and your progress ... Google Fit used to track your reps and sets during weightlifting. Now it's a joke." (2024-09-18). (same listing)

**8. Praise and complaints.** OBS/user: "It's a huge motivator to see your personal records displayed this clearly" (2019-10-21); "pretty steep learning curve" (2019-11-19); the best-reviewed Wear OS logging app in one reviewer's words (2024). The review sample on the page is old; recent complaint themes are UNKNOWN. (same listing)

**9-10. Distinctive and price.** A standalone Wear OS and Garmin watch app with a companion mode and a standalone mode; a global target scaler; in-app purchases (tier prices UNKNOWN). The functional precedent most like an Android-first free logger with a wrist presence. INFERRED. (same listing)

### 2.10 Hercules (five unrelated products share the name)

Name collision, listed so the reader can see why no single dossier is given. (a) Hercules, the 2017 iOS and watchOS app: "plan workouts, record results, analyze 3D exercise movements"; its designers' case study says 20,000 downloads and over 1,000 monthly active users in four months, featured twice by Apple, and the Contra write-up speaks of it in the past tense ("was a fitness application") (https://www.olmps.co/cases/hercules, undated; https://contra.com/p/k6rZPMoE-hercules, 2024-04-22). (b) Hercules Today for the Watch (Yezgro Incorporated): Apple Watch strength app with 3D animations, "AI-powered workouts", "Smart rest timer - background rest tracking with haptic feedback", offline mode, build 1.1.14 of 2025-07-27, one rating (https://apps.apple.com/app/id6478716222, 2025-07-27). (c) Hercules: Strength Log Tracker (Spider Inc.): first build 2025-11-17, "rapid set logging, integrated rest timers, unit conversion", $4.99 monthly or $39.99 yearly, notes and Face ID in 26.0, unlocked 1RM charts in 1.1.1, no ratings yet (https://apps.apple.com/au/app/hercules-strength-log/id6754724033, f). (d) Hercules - Gym Tracker (hercules-gym.com, Persimmon Apps, package `com.ocreynolds.hercules`): "a free AI-powered gym tracker for Android", iOS "coming soon", Pro $4.99 per month, $24.99 per year or $49.99 once (https://hercules-gym.com/, f). (e) Ingeniooz's old Android "Workout Tracker & Gym Trainer" (Hercules), last updated 2016, whose logging screen "displays the current exercise... with the number of repetitions and loads the objectives", starts a timer automatically at the end of a set, and compares with the last session (https://pdalife.com/workout-tracker-gym-trainer-android-a24095.html, 2016-10-18; https://www.yourlifeupdated.net/android/app-del-giorno-android-bodybuilding-hercules-gratis-sul-play-store, 2016-07-13).

Per the ten points, only (d) is current, Android and in scope: its vendor copy lists set, rep and weight logging, volume by muscle group, "Smart Set Suggestions", an AI coach, GPS cardio, and free versus Pro tiers; the rest timer is not described on the page, so it is UNKNOWN (https://hercules-gym.com/, f). The vendor's own Android listicle (T3, 2026-05-21, updated 2026-06-16) ranks Hercules first, Hevy "Best for Simplicity", Strong "Best for Minimalists", MyFitnessPal and Jefit; it contains nothing on logging speed or rest timers (https://hercules-gym.com/blog/best-gym-tracker-apps-android-2026, 2026-06-16).
Android check (Google Play, read 2026-10-06): Hercules - Gym Tracker (`com.ocreynolds.hercules`, Persimmon Apps) has "100+ downloads", no rating, updated 2026-09-22, build 1.4.4 ("Change units in-session", "Updated smart set suggestions"); its description leads with an "AI WORKOUT COACH" and "SMART PROGRESSIVE OVERLOAD ... analyzes your workout history to recommend the ideal weight and reps", seven exercise types, GPS cardio. It is a brand-new app, not an established Android logger. (https://play.google.com/store/apps/details?id=com.ocreynolds.hercules&hl=en&gl=US, 2026-09-22)

### 2.11 Fitlog (more than fifteen Android apps share the name)

Name collision. A Google Play search for "fitlog workout" returns fifteen different apps, from "Fitlog" (Fitlog inc, 2.5 stars) to "FitLog - Workout Tracker & Log" (Milan Lazarevic), "FitLog Workout Notes", "FitLog: Workout Tracker & Gym" (NEXFOLIO) and "Fitlog - AI Macro Food Tracker" (https://play.google.com/store/search?q=fitlog%20workout&c=apps&hl=en&gl=US, 2026-10-06). No single product can be named as "the" Fitlog. Two things are established. First, a search summary quotes one of them: "FitLog is a clean, no-nonsense companion for strength training that lets you plan your training days, log your weights, reps and sets ... offline-first by default with all data stored locally on your device, and offers optional cloud backup ... with no account required" (T4: https://play.google.com/store/apps/details?id=fit.log, search summary 2026-10-06; the page did not load, so the claim is unverified and the developer is unnamed). Second, "FitLog-" by Yug Thakkar (iOS, first released 2026-01-20, no ratings) is a gamified workout and meal logger with a coin reward system (https://mwm.ai/apps/fitlog/6757781259, f). UNKNOWN for all ten points beyond this. INFERRED: the name's collision count is itself a finding about how crowded the free-logger shelf is on Google Play.

### 2.12 Progression (Martin Pietrowski, de.progression.flutter)

Snapshot. A minimalist logger whose headline is a published, deterministic progression rule. US App Store 4.48 from 161 ratings, version 2026.11.3 released 2026-09-05 ("Workout results can now be shared"), iPhone, iPad, Mac, Vision; the vendor site also links Google Play (package `de.progression.flutter`); no Apple Watch app (https://itunes.apple.com/lookup?id=1090687896&country=us, 2026-09-05; https://get-strong.app/, f; https://get-strong.app/en/, f). Recent releases: 2026.10.8 (2026-07-11) deload week; 2026.10.6 (2026-06-04) "Rolling number animations for reps/weight"; 2026.8 (2026-03-21) reorderable templates for Pro (https://apps.apple.com/us/app/-/id1090687896, f).

**1-2. Screen and set entry.** OBS/vendor (raw page): the page's demo card reads "Bench Press, Set 3 of 3, kg x 8 reps, +2.5 kg for next time, Set done"; "Tap once & see for yourself"; "During your workout you tap in what you managed"; you "pick a rep range per exercise, for example 8 to 12"; "Progression remembers every set" and a user says "I first of all have a much better idea of which weights I used last time". Numeric pad versus keyboard: UNKNOWN. (https://get-strong.app/en/, f; https://itunes.apple.com/lookup?id=1090687896&country=us, 2026-09-05)

**3. Rest timer.** OBS/vendor: built-in rest timer; "Your current set and the rest timer right on the lock screen - without opening the app" through Live Activity and Dynamic Island (iPhone, Pro). Android equivalent: UNKNOWN. (https://get-strong.app/en/, f)

**4-5. Exercise management and finishing.** OBS/vendor: templates, history ("Jede Übung, jeder Satz, sauber archiviert"), shareable workout results, "League" classes that compare your numbers with competition athlete classes. (https://get-strong.app/, f; https://apps.apple.com/us/app/-/id1090687896, f)

**6. Resilience.** OBS/vendor: "Yes, completely. You need no internet connection and no account to log your workouts." (https://get-strong.app/en/, f)

**7-9. The distinctive part, the rules.**
- OBS/vendor: "Hit the top of the range in every set and Progression raises the weight next time"; the interface shows "+2.5 kg for next time". (https://get-strong.app/en/, f)
- OBS/vendor: automatic deload "at set intervals Progression lowers your weight for a week"; the vendor blog states the trigger: "zwei Einheiten hintereinander verfehlte Wiederholungen über mehrere Übungen bedeuten nächste Woche 90 %" (two sessions in a row with missed reps across several exercises mean 90% of the weight the next week), and says what the app deliberately does not decide: "ob du krank bist, schlecht schläfst oder außerhalb des Studios unter Last stehst" (whether you are ill, sleeping badly or under stress outside the gym). (https://get-strong.app/blog/wann-deload-noetig-ist, 2026-08-11)
- OBS/vendor, the vendor's self-comparison table (a T3-style claim against Strong and Hevy): "Weight increases automatically" yes for Progression, no for both; "Live Activity / Dynamic Island" yes, no, no; "Community feed" no, no, yes; "Apple Watch app" no, yes, yes; and a candid section "Honestly Progression isn't for everyone": no Apple Watch app, no community or feed, no exercise videos. (https://get-strong.app/en/, f)

**8. Praise.** OBS/user: "Simple and works all the time. No clutter" (2018); "this app is a phenomenal tool" (2022-08-14). (https://apps.apple.com/us/app/-/id1090687896, f)

**Two Android apps named Progression (a collision the brief does not resolve).** (a) Martin Pietrowski's "Progression: Get Strong" (`de.progression.flutter`): 4.2 from 53 reviews, 5K+ downloads, last updated 2024-08-23, a thin description ("log your workouts with just one tap", "automatic weight increases after you've hit your maximum repetitions"); a 2024-11-22 reviewer: "Too expensive for what it does. Also subscription model for such simple app is cringe"; an older reviewer wanted charts and the developer later added them under the "log" tab (2023-10-26). INFERRED: the vendor site says "iPhone & Android", but the Android build has not been updated for two years and has few ratings. (https://play.google.com/store/apps/details?id=de.progression.flutter&hl=en&gl=US, 2024-08-23) (b) Zoltan Demant's "Progression - Gym Workout Log" (`workout.progression.lite`): 4.7 from 4.05K reviews, 100K+ downloads, updated 2026-06-16, "Zero ads", "Join nearly 500,000 fitness enthusiasts", "Smart rest timer with overlay support for seamless multitasking", plate calculator, "Set tagging (dropsets, negatives, tempo training)", "Drag-and-drop handles & pre-filled sets", "Timeline view", cloud backup and real-time sync, "Complete data import/export with offline functionality", Health Connect. A 2021 review: the import from the previous version "didn't exactly translate very well" (the developer asked for an email). Which of the two the brief means is UNKNOWN; (b) is the larger Android product. (https://play.google.com/store/apps/details?id=workout.progression.lite&hl=en&gl=US, 2026-06-16)

**10. Price and tier.** Free: up to 4 workouts, tracking, automatic progression, history; Pro EUR 4.99 per month or EUR 34.99 per year (unlimited exercises, Live Activity, Apple Health, statistics); US App Store lists $6.99 to $99.99 SKUs. (https://get-strong.app/, f; https://apps.apple.com/us/app/-/id1090687896, f)

### 2.13 Workit (James Bergeron) and Gym Workout Planner and Log (Leap Health), compact entries

**Workit.** US App Store 3.98 from 80 ratings; the current iOS build is 1.2.4 released 2018-04-07 ("Fixed issue with timer causing app to crash"), so the iOS app is frozen at 2018; site `workoutwithworkit.com` did not resolve when fetched (https://itunes.apple.com/lookup?id=1227910528&country=us, 2018-04-07). OBS/vendor: hundreds of exercises "with HOW TO descriptions, animations, and YouTube video links", programmes (StrongLifts, Starting Strength, PPL), "Rest timer and Stopwatch", statistics and one-rep-max data, muscle charts, calendar history, export, iCloud backup; PRO adds body stats, BMI, progress photos and themes; IAPs $4.99 body stats, $2.99 remove ads, $1.99 theme bundle (https://apps.apple.com/us/app/id1227910528, f). OBS/user: "Not a lot of people know about this app...great tool for first timers" (2023-01-31); "Most under rated app for logging lifts" (2024-11-20). Anatomy, entry mechanics, Android state: UNKNOWN. INFERRED: a loyal niche on a seven-year-old build, evidence that a simple local log can hold users with no development.

**Gym Workout Planner and Log (Leap Health Fitness Limited; Google Play listing "Gym Workout Tracker: Gym Log" by Leap Fitness Group, 4.8 stars).** US App Store 4.85 from 1,398 ratings, version 1.3.7 of 2026-08-06 ("Bug fixed", "UI upgraded"), free with Premium Yearly $29.99 (https://itunes.apple.com/lookup?id=1602190236&country=us, 2026-08-06; https://play.google.com/store/search?q=gym%20log&c=apps&hl=en&gl=US, 2026-10-06). OBS/vendor: "log the weight and reps of each set in succession or log all sets in one click"; 500+ exercises with HD photos and video; routines that "adapt to your goals and available gym equipment"; routines "without number limits"; 1RM used "to adjust the weight of your routines"; bar charts of highest 1RM, max weight and max volume; line chart of body weight; notes; offline; "Personalize your exercises by image" (1.1.3, 2023-07-19) (https://apps.apple.com/us/app/-/id1602190236, f). OBS/user: "There's no way to track minutes on things like elliptical, running, or other cardio machines" (3 stars, 2024-11-21); "Perfect for anyone who wants to creat their own custom workout plan" (2024-07-04) (https://apps.apple.com/us/app/-/id1602190236, f). The "log all sets in one click" line is the one logging-mechanics claim worth noting: a single action that marks every set at the prescribed values (vendor CLAIM, mechanics not read). Rest timer, set types, watch: UNKNOWN.
**Leap, Android (Google Play, raw page text read 2026-10-06).** "Gym Workout Tracker: Gym Log" by Leap Fitness Group: 4.8 from 233K reviews, 10M+ downloads, "Contains ads" and in-app purchases, updated 2026-09-20. This is the most-downloaded dedicated gym log among the Play listings read, ahead of Hevy (5M+). The listing repeats "log all sets in one click", "Flexible overall and specified rest timer", "Need no network" and "Use for no cost". Reviews: "Half the exercises are behind a paywall. Even if im just using the app for tracking ... (there are a LOT of ads) ... I'd pay a one time download fee, or the fee to remove the ads, but I'm not subscribing" (2024-10-15, 126 helpful votes; the developer replied that exercises can be added manually); "the only competition is against my own goals; no intimidation and no self-conscious checking yourself against others" (2026-09-11); cannot rename an exercise to distinguish angles (2026-08-29). (https://play.google.com/store/apps/details?id=gymworkout.gym.gymlog.gymtrainer&hl=en&gl=US, 2026-09-20)

### 2.14 WHOOP Strength Trainer (band-based logger with a measured rep)

Snapshot. Strength Trainer is the manual-plus-sensor logging mode inside WHOOP's membership app. Official WHOOP "Locker" and support pages returned 403 to the fetch tool, so the product description below comes from search-engine summaries of those pages (T4) and the evidence is carried by WHOOP's own public community forum, where staff reply (T2). (https://www.whoop.com/us/en/thelocker/how-whoop-measures-muscular-load/, search summary 2026-10-06)

**1. Active-workout screen anatomy.** UNKNOWN in layout. T4 summary of WHOOP pages: open it with the plus beside "My Day"; build a workout under "My Workouts" with "Create New Workout", add exercises and supersets and "input details like your weight and reps"; 200+ exercise library; "Add Custom Exercise" still yields a muscular-load figure; drag-and-drop ordering. (https://support.whoop.com/s/article/Automatic-and-Manual-Activity-Detection, search summary 2026-10-06; https://www.whoop.com/us/en/thelocker/whoop-introduces-strength-trainer-becomes-first-wearable-to-measure-muscular/, search summary 2026-10-06)

**2. Set-entry mechanics (the distinctive design choice)**
- OBS/vendor (staff, 2025-05-19): "The original idea behind entering reps before a set was to help drive the algorithm engine when measuring sets to know what it's looking for to improve accuracy." Staff also confirmed "you cannot go back and edit" after a set is processed and called it a "pain point" for a planned revamp. (https://www.community.whoop.com/t/strength-trainer-let-us-edit-sets-after-execution/1307, 2025-05-19)
- OBS/user: "It makes no sense that I have to enter reps before doing a set - and can't update it afterward." (2025-05-17); the same thread shows the gap still open on 2026-03-25. (https://www.community.whoop.com/t/strength-trainer-let-us-edit-sets-after-execution/1307, 2026-03-25)
- OBS/vendor (T4 summary): three logging tiers by precision: automatic estimate from activity type and duration; link exercises after the workout; real-time logging in Strength Trainer, where "WHOOP measures each rep's speed and intensity" and learns your baselines. (https://www.whoop.com/us/en/thelocker/how-whoop-measures-muscular-load/, search summary 2026-10-06)
- OBS/user: a 2026-08-05 request lists "RPE per set rather than per workout", "Warm up vs working set log", "Rest timer" and "toggle save changes to workout automatically". INFERRED: RPE is per workout, there is no warm-up set type, and edits are not auto-saved to the template at that date. (https://www.community.whoop.com/t/strength-trainer-upgrades/15744, 2026-08-05)

**3. Rest timer**
- OBS/user: the most critical request in an April 2026 thread: "finish set -> validate set -> rest timer starts automatically -> alert/vibration when rest is over -> validate end of rest -> next set"; the poster says manual rest management makes users "lose track of rest periods during gym sessions". (https://www.community.whoop.com/t/strength-trainer-feedback-rest-timer-workflow-progression-targets-notes-measurements-and-exercise-mapping/14544, 2026-04-15; the quotation marks follow the fetch tool's rendering of the post)
- OBS/user: "Add a rest timer in the iphone dynamic island during strength training workouts" (2026-09-18, no reply visible). (https://www.community.whoop.com/t/feature-request-dynamic-island-timer-for-strength-trainer/16274, 2026-09-18)
- INFERRED: as of autumn 2026 the app has no automatic, alerting rest timer, and no Live Activity for it; the forum is the only evidence, and WHOOP's current behaviour was not confirmed in vendor text.

**4. Mid-workout exercise management**
- OBS/user + staff (2025-09-08): users cannot "skip or opt-out of sets/exercises during a workout without permanently altering the template"; the community manager agreed that "deleting or adding exercises erases your performance history" is a friction point; one user "abandoned the feature entirely due to these limitations"; a per-exercise history beyond the last session was requested. (https://www.community.whoop.com/t/reps-tracking-and-exercise-swaps/7967, 2025-09-08)

**5. Finishing and 6. Resilience.** UNKNOWN beyond the muscular-load readout; an "API for Strength Trainer" request thread exists (title only, https://www.community.whoop.com/t/api-for-strength-trainer/10517, search listing 2026-10-06). Strava lists WHOOP as a strength integration partner (https://press.strava.com/articles/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps, 2026-05-21).

**7. How it fits together.** T4 summary: Strength Trainer feeds muscular load into WHOOP's strain and recovery model; an AI coach can "Log Automatically" or generate a workout from typed text or a photo of workout notes. (https://support.whoop.com/s/article/How-to-Use-the-AI-Powered-WHOOP-Coach?language=en_US, search summary 2026-10-06)

**8-9. Praise, complaints, distinctive.** The distinctive idea is a measured rep: the wearable's motion data is used to score set quality, so the user is asked for intent (reps) before the set rather than a record after it. The forum shows the price of that choice: no post-hoc edit, no auto rest timer, history lost on exercise changes. INFERRED from the sources above.

**10. Price and tier.** UNKNOWN (membership price not read); the logger is part of the WHOOP membership, not sold separately (INFERRED from the support pages' framing).
Android stats (Google Play, read 2026-10-06): 4.7 from 30K reviews, 1M+ downloads; the listing text read has no mention of strength logging. (https://play.google.com/store/apps/details?id=com.whoop.android&hl=en&gl=US, 2026-10-02)

### 2.15 Garmin Connect and Garmin watches (wrist rep counting, edit on the phone)

Snapshot. Not an app you open to train: the watch records the set, Garmin Connect holds the log. Official manual text is for the Forerunner 965 (undated); the Connect app is #14 in the UK Top Free Health and Fitness chart on 2026-10-06 (https://apps.apple.com/gb/charts/iphone/health-fitness-apps/6013, 2026-10-06).

**1-3. Screen, set entry, rest**
- OBS/vendor: "You can record sets during a strength training activity. A set is multiple repetitions (reps) of a single move." The watch counts reps; "Your rep count appears when you complete at least four reps"; "Each rep is counted when the arm wearing the watch returns to the starting position." (https://www8.garmin.com/manuals-apac/webhelp/forerunner965/EN-SG/GUID-66478414-4338-418E-9E0A-90162F21A62A-2265.html, undated)
- OBS/vendor: "Turn on automatic set detection to start and stop your sets"; after a set "The watch displays the total reps for the set"; "After several seconds, the rest timer appears"; you can edit the number of reps and "add the weight used for the set". (same page)
- OBS/vendor: tips: "Do not look at the watch while performing reps"; "Perform bodyweight or free weight exercises"; "Perform reps with a consistent, wide range of motion"; leg exercises may not be counted accurately; interact with the watch only at set boundaries and rests. (https://www8.garmin.com/manuals/webhelp/GUID-0221611A-992D-495E-8DED-1DD448F7A066/EN-AU/GUID-7C8D56F5-E9F5-4825-9F66-3CC9124B2979.html, undated)
- OBS/vendor (a newer watch's manual, "v5 September 2026"): "TIP: Press and select Edit Last Set after the rest timer appears"; the set screen lets you "edit the number of reps, select to add the weight used for the set, and select Done. The rest timer appears and counts down to the next set. TIP: You can wait for the timer to elapse, or press to immediately start your next set."; "You can disable rep counting in the activity settings"; "The watch can only count reps of a single move for each set. When you want to change moves, you should finish the set and start a new one."; "If available, the watch displays an animation of the exercise." The Forerunner 965 manual ("v11 April 2026") adds "While viewing workout steps, you can press START to view an animation of the selected exercise" and that the first time you record you "must select which wrist your watch is on". (https://www8.garmin.com/manuals/webhelp/GUID-49EC93CF-DA3F-4514-817F-4098FC4A71AE/EN-US/GUID-49D892BF-429E-454D-B0C6-D4AE07E9D4A0.html, 2026-09; https://www8.garmin.com/manuals/webhelp/GUID-0221611A-992D-495E-8DED-1DD448F7A066/EN-US/GUID-CF2D7922-A1AC-4510-9480-E7CE8119EAF2.html, 2026-04)

**4-5. Exercise management and finishing.**
- OBS/vendor: after the last set, "Select Stop Workout > Save", then "Save and send your strength training activity to your Garmin Connect account. You can use the tools in your Garmin Connect account to view and edit activity details." Strength workouts are created in Garmin Connect and sent to the watch. (https://www8.garmin.com/manuals/webhelp/GUID-49EC93CF-DA3F-4514-817F-4098FC4A71AE/EN-US/GUID-49D892BF-429E-454D-B0C6-D4AE07E9D4A0.html, 2026-09)
- OBS/review: a Garmin Connect control found on the website only: click a set number, then a header such as "Exercise Name", and you can "re-display your set by sets, exercises, or primary muscle"; the author guessed it would reach the phone app, and reader comments disputed whether it was new (the fetch tool's answer, not re-checked on the raw page). (https://the5krunner.com/2024/06/23/new-garmin-connect-feature-heading-for-the-app-or-is-it-a-hidden-feature, 2024-06-23)
- UNKNOWN: whether the phone app edits auto-detected reps and exercise types after saving. A search-engine summary claimed a 2026 Connect update does, and I found no page that says so, so it is not relied on.

**6. Resilience.** UNKNOWN for the strength mode specifically (a watch activity file is stored on the watch until synced; INFERRED from the manual's "Save and send ... to your Garmin Connect account"). Two 2026 reports concern Garmin's screenless Cirqa band, not the strength mode as such, but they show what happens when a session can be started on the device and ended on the phone:
- OBS/review: workouts "disappearing when they're finished": users who began an activity with the button and ended it in the Connect app lost it; a forum member: "If you start an activity with the button, you have to end it with the button." Garmin's reply: "Several users in this thread have reported losing activity data after selecting End from the initial prompt"; the workaround is to choose Resume, then stop and save from the recording screen. (https://www.techradar.com/health-fitness/fitness-trackers/garmin-investigates-disappearing-workouts-issue-thats-hitting-cirqa-owners-and-confirms-a-workaround-to-stop-it-happening-to-you, 2026-09-18)
- OBS/review (the fetch tool's answer, not re-checked on the raw page, because the page returned 403 to a plain download): the5krunner lists further causes of lost sessions including a missed button press at the end and recording beside a second Garmin device, says two of the lost sessions were strength sessions, and concludes "it doesn't reliably save the workouts it records, and a reference sensor that occasionally loses a session is no use to me." (https://the5krunner.com/2026/09/26/garmin-cirqa-workouts-disappearing/, 2026-09-26)
- INFERRED: when a watch, a phone and a notification can all end the same session, one of them has to be the single owner of Finish, and the others must not be able to discard work.

**8. Evidence on accuracy and trust**
- OBS/review (peer-reviewed): 20 participants, four Garmin models (Instinct x2, Fenix 6 Pro, Vivoactive 3), four exercises: "None of the devices met validity criteria across any exercise", mean absolute percent error 3.0 to 67.5%, and the authors concluded "manual counting should be utilized". (https://digitalcommons.wku.edu/ijesab/vol14/iss3/143, 2023)
- OBS/user: Garmin forum: weights entered on the watch are replaced by "Body" values after the exercise is re-classified in Garmin Connect; workarounds are manual editing of every entry, rolling back firmware or keeping a spreadsheet; the thread shows staff asking for sample activities and no documented fix. (https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-965/353939/strength-activity-profile-detects-the-wrong-exercise/1744119, undated)
- OBS/review (TechRadar, Matt Evans, hands-on with a Garmin Enduro; the text is four years old and pre-dates the 2026 Connect changes, so today's behaviour is UNKNOWN): "In practice, it's a hot mess. The in-built technology consistently failed to record the right number of reps for me."; once he knew, "my eye was consistently drawn to it all throughout my set, to ensure it was recording it correctly"; "Then my form vanished, as I was thinking more about my watch than I was about my exercises."; "I spent my rest periods using the watch's up and down buttons to manually adjust the right number of reps for that particular set"; "manually readjusting the sets and reps counter on my watch five times during a 50-minute gym session"; "I've avoided using the feature ever since"; the Notes app, or "a pen and paper training notebook", would do the job better. (https://www.techradar.com/features/why-garmins-strength-training-mode-needs-to-be-improved-or-scrapped, 2022-06-08)
- INFERRED: the failure the review names applies to any counted or prefilled value. A wrong prefill pulls attention from the lift to the device, and correcting it costs more than typing the number would have.

**9-10.** Distinctive: counts reps and splits sets on the wrist with no phone, and edits afterwards. Price: included with the device; Garmin Connect+ is a separate subscription (the5krunner headline, not read).
Android stats (Google Play, read 2026-10-06): Garmin Connect 4.4 from 1.11M reviews, 50M+ downloads, updated 2026-10-05; the listing text read has no mention of strength training. (https://play.google.com/store/apps/details?id=com.garmin.android.apps.connectmobile&hl=en&gl=US, 2026-10-05)

### 2.16 Samsung Health strength logging (Galaxy Watch)

Evidence is the weakest of any app in this file and is stated as such. The Samsung support pages read (Watch workout guide, HK exercise monitoring page, AU "record a workout" page) contain no strength-training section: they describe a six-step flow (open Samsung Health, "Work out", pick an exercise, Start, swipe, Finish), automatic detection for walking, running and biking, and Auto Pause (https://www.samsung.com/au/support/mobile-devices/record-a-workout-on-samsung-watch/, f; https://www.samsung.com/hk_en/support/apps-services/how-to-monitor-exercises-with-samsung-health/, f). The Samsung Community threads that discuss strength logging returned 403, so what follows is from their search-engine summaries (T4) and is UNVERIFIED:
- T4: "Strength Training" mode "is designed specifically to track reps, sets, rest times"; routines can be created on the phone and started on the watch with time per exercise, reps and sets; "Adding weight to exercises isn't possible"; reps are "not counted automatically when you set a target"; in weight-training mode the watch stops counting time and calories during rest between sets, and Auto Pause can be disabled. (https://eu.community.samsung.com/t5/wearables/custom-workout-routine-for-galaxy-watch/td-p/5325181, search summary 2026-10-06; https://us.community.samsung.com/t5/Galaxy-Watch/Watch-workout-stops-during-periods-if-rest-between-weight/td-p/2637205, search summary 2026-10-06)
- OBS/vendor: the June 2026 Samsung Health redesign (announced 2026-06-04, rolling out from 2026-06-08) adds Daily Cardio Load, Fitness Index, Heart Health Score and five categories; nothing in the announcement concerns strength logging. (https://www.gsmarena.com/samsung_health_app_update_new_galaxy_watch_features-news-73127.php, 2026-06-04)
- INFERRED: the platform default on Android and Wear OS is a time-and-heart-rate recorder with no weight field, which is why Android lifters install a third-party logger. A Samsung feature-request thread titled "Optimizing Samsung Health and Watch Ultra for Strength Training" exists (title only, https://r2.community.samsung.com/t5/Samsung-Health/Feature-Request-Optimizing-Samsung-Health-and-Watch-Ultra-for/m-p/22848226).
Android stats (Google Play, read 2026-10-06): Samsung Health 3.1 from 1.58M reviews, 1B+ downloads, updated 2026-09-07; the listing text read mentions workout intensity and heart rate but no strength logging, and its latest notes are about vitals, daily cardio load and heart health. The lowest rating among the Play listings read, on the largest install base. (https://play.google.com/store/apps/details?id=com.sec.android.app.shealth&hl=en&gl=US, 2026-09-07)

### 2.17 Strava's strength support (2026 overhaul)

Snapshot. On 2026-05-21 Strava announced "a full overhaul" of strength: a purpose-built workout log, auto-populated muscle maps, five strength shareables and 14 partner integrations (24 Hour Fitness from summer 2026, Amazfit, Caliber, COROS, Fitbod, Garmin, Hevy, iFIT, JEFIT, Liftoff, Motra, REMAKER, Runna, WHOOP), citing "more than 500 million strength activities logged on the platform in 2025", with rollout "in the coming weeks" (https://press.strava.com/articles/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps, 2026-05-21; https://9to5mac.com/2026/05/21/strava-adds-dedicated-strength-training-support-for-sets-reps-weight-and-muscle-groups/, 2026-05-21). Strava is #2 in the US and UK Top Free Health and Fitness charts on 2026-10-06 (https://apps.apple.com/us/charts/iphone/health-fitness-apps/6013, 2026-10-06).

**1-2. Log and entry.** OBS/vendor: the log shows "set number, reps, weight, and duration for time-based exercises", weight in your preferred unit. A manual strength activity is built by tapping to add exercises, searching "Strava's exercise library", entering sets, reps and weight and saving; "Your summary stats and muscle map will generate automatically". Types supported: Weight Training, Workout, HIIT, CrossFit. Edits (change exercise, update set, delete) recalculate volume, sets and the map. (https://support.strava.com/en-us/articles/15401547-strength-training, f)

**3-6. Rest timer, resume, summary.** UNKNOWN: no rest timer is mentioned in the press release or support article; another outlet notes the same absence (https://athletechnews.com/strava-strength-training-major-update/, 2026-05-21, "Rest Timer: Not mentioned"). Strava states strength sessions arrive mainly from partner apps and watches: "Once connected, your strength workouts will automatically sync to Strava with full exercise data." (https://support.strava.com/en-us/articles/15401547-strength-training, f)

**7. Muscle map rule.** OBS/vendor: "Shading is based on the number of working sets for each muscle group, not the weight you lifted or your reps"; four intensity levels; "Exercises that work more than one muscle group split the credit"; front and back views. (https://support.strava.com/en-us/articles/15401529-muscle-map-for-strength-activities, f)

**8. Critique.** OBS/review: "most gym sessions are improvised. Sets are skipped, weights adjusted mid-workout, and exercises substituted when equipment is occupied" and "A muscle map generated from incomplete or approximate inputs looks informative. It is not."; a commenter calls the current map "little more than a front-and-back body-image generator" with no way to correct it; the analyst's view is that Strava's opening is the social layer, since "Hevy, Strong, and Fitbod already dominate strength logging". (https://the5krunner.com/2026/05/21/strava-strength-training/, 2026-05-21)

- OBS/user (third-party mirror of an r/Strava thread, T2): strength sets uploaded from a Garmin arrived without the exercise list; a user wrote "The matching of exercises between Garmin and Strava is not perfect at all" and a Strava team account answered that "The per-exercise list is the newest part" and "requires exercise names to match Strava's database", with unmatched ones editable as "Unknown". (https://reddit.sentinel-team.org/posts/1v39e8f/snapshots/2026-07-23T07%3A38%3A40.428Z, 2026-07-23)

**9-10. Distinctive and price.** A social network used as the aggregation point for other loggers' data. Price: Strava's own text does not say; a Notebookcheck report on the Amazfit integration states "All these capabilities are included at no cost" (OBS/review, https://notebookcheck.net/Amazfit-joins-Strava-s-new-strength-training-ecosystem-new-features-free-for-everyone.1306179.0.html, undated, reporting the 2026-05-21 announcement; the headline reads "new features free for everyone"). (https://www.tour-magazin.de/en/training/strength-training-on-strava-update-with-muscle-maps-and-training-log/, 2026-05-28)
Android (Google Play, read 2026-10-06): Strava is 4.6 from 1.2M reviews, 100M+ downloads, updated 2026-10-05, and its listing states "See the full story of your strength training. Lifting in the gym weekly, doing HIIT workouts? Use your favorite device or strength app and your exercises, sets, reps, weights and a muscle map show up automatically." So the strength view is advertised on Android. (https://play.google.com/store/apps/details?id=com.strava&hl=en&gl=US, 2026-10-05)

### 2.18 Tonal (cable-resistance machine with a built-in logger)

Snapshot. A $4,295 wall-mounted digital-weight trainer plus $59.95 per month membership (12-month minimum) per a May 2026 review (https://trailandkale.com/tonal-2-home-gym-review/, 2026-05-04). The machine is the logger: it counts reps from cable travel and sets the resistance, so the "log" is a by-product.

**1. How a set is presented.** OBS/review: "the system automatically loads your next exercise, adjusts resistance, counts reps, and tracks your progress in the background"; intro screens list the muscle groups and accessories needed. (https://trailandkale.com/tonal-2-home-gym-review/, 2026-05-04) OBS/vendor: "Tracking can happen using the on-screen rep counter", with live stats, time under tension, total volume and set volume available. (https://knowledge.tonal.com/s/article/Free-Lift, f)

**2. Set entry.** OBS/vendor: in Free Lift you press and hold the weight dial, choose a move from the library (filters by body region, muscle group, accessory and arm position), choose rep or duration goals and any Dynamic Weight Mode, then "Start Movement" or "Create Block". (https://knowledge.tonal.com/s/article/Free-Lift, f) OBS/vendor: "Tonal sets your optimal resistance in one-pound increments up to 250 pounds"; "Spotter" lowers weight if you struggle and restores it if you recover; "Drop Sets ... automatically lower weight as you fatigue"; modes such as Eccentric and Chains. (https://www.tonal.com/intelligence/, f)

**3. Rest and set boundaries.** OBS/vendor: "Auto-Advance: when 50%+ reps are completed after releasing the cable, a prompt asks 'next move?'", letting you continue or stay on the set; weight "-/+" buttons on the dial; pause with advance or rewind of reps ("Want to skip a rep? No problem!"). (https://knowledge.tonal.com/s/article/In-Workout-Controls, f) Custom workouts accept rest periods between sets (search summary, T4: https://tonal.com/blogs/all/build-your-own-custom-workouts, 2026-10-06). The rest screen itself is UNKNOWN.

**4-6. Management, finishing, resilience.** OBS/vendor: a Free Lift session can be saved as a Custom Workout in the mobile app; history is under the Activity icon; Apple Health sync. OBS/review: "video replays" through the Smart View camera and an occasional false Spotter trigger as a stated con. (https://knowledge.tonal.com/s/article/Free-Lift, f; https://trailandkale.com/tonal-2-home-gym-review/, 2026-05-04) Offline behaviour: UNKNOWN.

**9. Distinctive.** The weight is set by the machine from your history ("Smart weights ... as you get stronger, it adds weight for you based on your individual progress") and changed mid-set by the machine, so the log records what the machine did, not what the user typed. (https://trailandkale.com/tonal-2-home-gym-review/, 2026-05-04) 

**10. Price.** As above; a household shares one membership. (https://trailandkale.com/tonal-2-home-gym-review/, 2026-05-04)

### 2.19 Tempo (camera-based rep counting and weight recognition)

Snapshot. Tempo Studio (42-inch display with a 3D time-of-flight sensor) and the newer Move product; membership about $39 per month at the 2022 launch review (https://www.t3.com/reviews/tempo-studio, 2022-07-07). The 3D sensor counts reps and reads the weights you pick up. One independent hands-on review was read (Garage Gym Reviews, first published 2021-09-28, page modified 2026-06-02, its text describing the July 2023 software update); a Digital Trends review returned 403, so the remaining mechanics below are vendor-documented.

**1. How a set and a rest are presented.** OBS/vendor (2021): the rep counter "will continue to grow alongside your white progress bar", showing previous round rep counts for comparison; a pace ring ("fill up the half-circle... turns red if pace is too fast") for time under tension; during rest "a chart of heart rate and time spent in target zone from previous round". (https://tempo.fit/blog/the-new-metrics-system, 2021-01-12)

**2. Set entry (weight recognition).** OBS/vendor: "Weight recognition works with Tempo dumbbells and weight plates that are <= 10lbs" (newer extended dumbbells detect up to 65 lb, manual adjustment capped at 52.5 lb); needs a lit room, whole dumbbells visible at the start of each set, plates loaded biggest to smallest; "Tempo will not detect weight changes if you make them mid-set"; when recognition is wrong "pause the class and adjust the weights"; it can be toggled in class. (https://support.tempo.fit/support/solutions/articles/151000154718-weight-recognition-faqs, f)

**3. Rest.** OBS/vendor: "Dynamic Rest" automatically extends recovery "if heart rate remains elevated"; plans adapt to a daily Readiness score built from workout data and Apple Health; "Reps in Reserve" feedback. (https://tempo.fit/blog/a-new-era-for-tempo, undated, about 2023)

**6. Resilience and limits.** OBS/vendor: reps count only inside official classes; "at least an earnest attempt at doing the exercise for it to count"; the sensor "can have a hard time distinguishing part of your body from the background"; "Using empty dumbbells may lead to counting errors"; form cues appear "intermittently ... not designed to appear 100% of the time, as this can be demoralizing". (https://support.tempo.fit/support/solutions/articles/151000154714-3d-tempo-vision-form-feedback, f)

**8. Independent evidence (Garage Gym Reviews, two testers, page text about the July 2023 update)**
- OBS/review: Tempo's "3D motion sensing technology" (formally Time-of-Flight sensors) "captures your movements and provides form feedback, rep counting, and weight recommendations based on your technique". The second tester: "I noticed some missed reps every once in a while, and the form critiques felt pretty average, but it's cool technology"; the first calls the rep tracking "pretty dependable". (https://www.garagegymreviews.com/tempo-studio-review, modified 2026-06-02)
- OBS/review: weight recommendations are tied to how the reps look: "if you select 10 pounds for biceps curls and fly through the reps with good form, Tempo will suggest using 15 or maybe 20 pounds for the next set"; "if you choose 20 pounds and end up swinging your whole torso to curl the dumbbells, Tempo will suggest you lower the weight for the rest of the workout". (same page)
- OBS/review: rest and effort capture in the 2023 software: "Rest intervals are based on heart rate ... Your next set will automatically begin when your heart rate drops back to Zone 1 or 2, or whatever the algorithm wants it to drop to"; "At the end of a set, Tempo will ask you how many more reps you thought you could do with that weight for that exercise. Based on your answers, Tempo calculates an RPE and then provides recommendations for the next set and future workouts." The review says these updates were "currently only available on the Tempo Move" with parity for Studio promised, so which product has them today is UNKNOWN. (same page)
- OBS/review: equipment friction is named by the second tester: loadable dumbbells "can be a hassle when you have to change weights during the workout". Fit: "fitness beginners and anyone who loves the vibes at fitness studios"; "not great if your fitness goals involve, say, squatting 400 pounds". (same page)

**9. Distinctive.** The vendor deliberately rations negative feedback and frames the rest period as adaptive to heart rate. UNKNOWN for the remaining points (free-lift logging outside classes, exercise management, finishing screen).

**10. Price.** Membership "$39 per month (or less, if you choose to pay annually)", unchanged by the 2023 update; hardware prices were not read. (https://www.garagegymreviews.com/tempo-studio-review, modified 2026-06-02)

### Athlete-side loggers inside coaching platforms (2.20 to 2.24)

Common frame. In these products the coach writes the prescription and the client or athlete only fills in results, so the logger is a form attached to someone else's plan. The athlete app is free to the athlete and the coach pays. Evidence per platform is thinner than for consumer apps: their help centres describe the coach's builder far more than the athlete's screen, and several support pages returned 403 (TrainHeroic support). Where a bullet rests on a search summary of a page that would not load, it is tagged T4.

### 2.20 TrueCoach (client app)

Snapshot. App Store 4.9 from 36K ratings, free, iPhone, iPad and Mac; build 13.5.1 six days before the fetch, 13.5.0 on 23 Sep ("Edit Exercise", "Assign Program"), 13.2.0 "Voice Notes! Record and send voice messages directly in the chat"; a "900+ video exercise library" (https://apps.apple.com/app/id1439127794, f).

**1-2. Screen and entry.** OBS/vendor: the client "will first see the entire workout at the top of the screen" (warm-up, exercises, cool-down), can "enter in results as well as upload photos to the exercise", and is prompted to "Update results for A" for each exercise. (https://help.truecoach.co/en/articles/2403707-the-truecoach-client-experience, f) Fields, keyboard and previous-value display: UNKNOWN (no source describes the result fields).

**3-5. Rest, management, finishing.** OBS/vendor: "Each exercise has an Exercise History feature so they can easily see any previous results they've logged for that movement"; clients swipe through demo videos; a "Past tab" shows earlier dates; real-time messaging, comments and gifs sit beside the log. (https://help.truecoach.co/en/articles/2403707-the-truecoach-client-experience, f) Rest timer: UNKNOWN.

**8. Complaints (the evidence).** OBS/user, after the "version 11" redesign: "Too many button clicks to enter workout results...Font choice and size for workout results is too small and hard to read" (2021-10-08); "the new update now acts as a barrier of entry...clients have been messaging and dm'ing me confused how to read or navigate their workouts" (a coach, 2021-09-22); "updating notes on the workout is now an extra touch" (2021-10-13); reviewers also object that swiping was replaced by scrolling and that video autoplays. (https://apps.apple.com/app/id1439127794?see-all=reviews, f) INFERRED: a logger redesign that adds taps per result is punished by clients within weeks, and the coach carries the support burden.

**10. Price.** Free to the client; coach plans not read (UNKNOWN).

### 2.21 TrainHeroic (athlete app)

Snapshot. App Store 4.3 from 1.8K ratings, free with "Athlete Pro Monthly $4.99" and marketplace programmes at $29.99 each; build 9.0.0 the day before the fetch; 8.22.0 (20 April) added a "Trophy Case for Pro athletes" and goal tracking (https://apps.apple.com/us/app/id955074569, f). Support pages returned 403; their content below is from search summaries (T4).

**1-2. Screen and entry.** T4: "Start Session", then "log each set's weight, reps, and RPE"; a built-in calculator turns a percentage into a load ("80% of your 1RM"); a PR goal is set from the three-dot menu with "Set a Goal", target reps and target weight. (https://support.trainheroic.com/hc/en-us/articles/18156961923981-For-Athletes-Creating-Training-Sessions, search summary 2026-10-06; https://www.trainheroic.com/athlete/, f; https://support.trainheroic.com/hc/en-us/articles/45097749410701, search summary 2026-10-06)

**3. Timers (the distinctive part).** T4: timers are reachable only inside the logging view; "Select Time" at the bottom opens seven timers (Rest timer, Stopwatch, AMRAP, For Time, Tabata, Custom Interval, EMOM); the running timer can be full screen or collapsed "to review and log your set during rest periods". (https://support.trainheroic.com/hc/en-us/articles/18156558387469-For-Athletes-Using-in-app-Timers, search summary 2026-10-06)

**5. Finishing.** OBS/vendor: a PR celebration screen with a share-to-Instagram button (search summary of the store text, T4), a Trophy Case, global leaderboards, totals for volume, reps and hours, and "Readiness Insights". (https://apps.apple.com/us/app/id955074569, f)

**6. Resilience (the evidence).** OBS/user: "previously logged workouts are being erased...workouts themselves are not populating" (1 star, 2023-11-22); a coach's published workouts "sometimes show up" (2025-01-01); "app forces to auto populate to todays date...pushed me to todays workout" (2024-01-24); "hangs up after the first video...Can't click out of video window to reach" the timer (2024-06-29, developer replied with a support address). (https://apps.apple.com/us/app/id955074569?see-all=reviews, f)

**Android (Google Play, raw page text read 2026-10-06).** 3.1 from 1.57K reviews, 500K+ downloads, updated 2026-10-02, against 4.3 on the App Store. Reviews: "App is buggy on my phone - won't actually finish logging workouts. I'll finish a workout and it won't actually log my last set and will say I have been exercising for 12 hours" (2026-07-30); "I finished my session last night and hit complete session and the timer was still going. Almost 24 hours later" (2026-06-10); history "still not pulling history correctly" and a new vibration on each key tap (2026-09-02). The developer replies point to the support address. (https://play.google.com/store/apps/details?id=com.TrainHeroic.TrainHeroic&hl=en&gl=US, 2026-10-02)

**8-10.** OBS/user praise: "allows you keep track of your sets" with room to rearrange exercises (5 stars, 2024-07-16). INFERRED: the timer set is the best-in-class idea here (seven formats in one tray, usable while logging), and the reliability record is the weakest part of the app. Price: athlete free, Pro $4.99 per month. (https://apps.apple.com/us/app/id955074569, f)

### 2.22 TeamBuildr (athlete app, tablet Weight Room View)

OBS/vendor: native iOS and Android apps "free" and "included with every subscription", "no per-athlete fees, no tiers"; athletes "log sets and reps, upload video, track personal records"; 1RM tracking, progress graphs, a team feed with PR posts, leaderboards. (https://www.teambuildr.com/mobile-app, f) Coaches assign percentage-based lifts and the app turns stored maxes into suggested loads per set; athletes enter the weight if not given, reps for AMRAP, circuit time, and bar velocity from devices such as Tendo (T2, https://www.freelapusa.com/teambuildr-the-company-and-the-tool/, undated, search summary). Weight Room View is a Platinum-tier tablet mode where "4+ athletes can receive their workout and log their load/reps back into TeamBuildr", sold with tablets and rack mounts; a Whiteboard module runs a "work/rest/transition timing system for up to 4 groups" on a TV (https://support.teambuildr.com/article/2Mz1MesIhQ-what-is-weight-room-view, f; https://www.teambuildr.com/whiteboard-weight-room-tv-timing-system, search summary 2026-10-06). Version 4.0 (2016-05-20) added swipe between exercise cards, history as "an online workout journal" with earlier notes, and an opt-out per exercise (https://blog.teambuildr.com/posts/teambuildr-4-0-is-here, 2016-05-20). UNKNOWN: set row, rest timer in the phone app, offline, wearable. The platform's distinctive contribution is the shared-device floor model: one tablet, several athletes, a facility timer.

### 2.23 Everfit (client app)

Snapshot. "Everfit - Train smart": App Store 4.7 from 2.7K ratings, free, iPhone, iPad, Apple Watch and Mac; release 3.94.1 the day of the fetch (https://apps.apple.com/app/id1438926364, f). The client flow is documented in the vendor help centre (https://help.everfit.io/en/articles/5829094-client-app-track-a-workout, f).

**1-2. Screen and entry.** OBS/vendor: tap "Start Workout" on the Today screen; each item is a single exercise, a superset or a section (Regular, Interval, Timed, AMRAP) with video or image and prescribed sets; "Tap on the checkmark icon next to each exercise when you are finished"; the "..." menu adds or removes sets; a stopwatch icon opens the stopwatch or timer; a message icon contacts the coach and carries form-check videos. (https://help.everfit.io/en/articles/5829094-client-app-track-a-workout, f)
- OBS/vendor (release note, 2026-06-04): "Auto-fill Weights and Reps": clients begin with values pre-populated "based on their past performance" (most recent completed session, matched by set type) or, if reps are assigned and weights blank, from the client's 1RM; autofill can be switched off. (https://blog.everfit.io/everfit-may-2026-new-features, 2026-06-04)

**3. Rest timer.** OBS/vendor: "By default, the rest timer is turned 'On'" and runs when a set is checked, using "the rest times assigned by your coach"; you can use other apps and "be reminded with a notification"; switched off, the coach's rest time shows "under each exercise as a note". Setting: Workout Preview, gear icon, "Rest timer on/off". (https://help.everfit.io/en/articles/4701773-client-app-turn-on-off-rest-timer, f)

**4-5. Management and finishing.** OBS/vendor: "swipe right on the button to save your workout", then rate difficulty and add comments; the end time can be edited after saving, the start time cannot. A workout-history article and a rearrange article exist (titles only). (https://help.everfit.io/en/articles/5829094-client-app-track-a-workout, f)

**8. Evidence from reviews, before and after autofill.** OBS/user: "Takes forever to load or do anything in the app...very clunky...I have to always double verify that I completed something...It's just one exercise per screen...No autofill, I have to scroll to log my reps" and "I now keep an extra log...in case this thing randomly crashes" (1 star, 2025-10-16); "The active and inactive buttons look almost identical...I can't easily tell which ones I've marked as complete" (2025-10-15); a client wanted "easier access to previous week's weight/rep data during active workouts" and the developer pointed to the Exercise History button (2025-07-17). (https://apps.apple.com/app/id1438926364?see-all=reviews, f; https://apps.apple.com/app/id1438926364, f) INFERRED: autofill shipped about seven and a half months after the 2025-10-16 complaint and is plausibly the vendor's response to complaints of that kind.

**10. Price.** Free to the client; coach plans not read.

### 2.24 Kahunas (client app)

OBS/vendor: clients "log their workouts (weights/reps), track their nutrition, complete check-ins, access their plans, view the content library" (https://help.kahunas.io/en/articles/44-what-comes-with-the-app, f). OBS/review (2026-10, a coach-software review site): workouts include "1,000+ exercise videos, sets, supersets and circuits, rest timers and a workout log"; "supersets, dropsets, per-set logging and rest timers"; English-only interface; the fully branded white-label app needs the $99 per month Ultimate tier (Essentials $35, Growth $69) (https://coachway.io/articles/kahunas-review/, 2026-10; tier prices also in a search summary, https://kahunas.io/, 2026-10-06). The vendor claims "750,000+ users" (https://kahunas.io/, search listing 2026-10-06, vendor CLAIM). UNKNOWN: set row, automatic versus manual rest timer, offline, wearable. A second iOS listing of a branded Kahunas client app could not be read (HTTP 429).

### Programme-first loggers (2.25 to 2.29)

Common frame. These apps start from a named programme (5x5, Novice Linear Progression, 5/3/1, GZCLP) and the logger exists to run its arithmetic: next weight, warm-ups, plates, deload. Boostcamp, Liftosaur and Alpha Progression (lanes A4 and the entries above) also ship these programmes; the dedicated apps below are the ones the brief names.

### 2.25 StrongLifts 5x5 (short entry; lane A5 holds the full dossier)

Snapshot. US App Store 4.86 from 76,797 ratings, free with a subscription required for the full app, build 4.4.0 released 2026-10-05 with "A new home screen" and "A rebuilt Apple Watch app" (https://itunes.apple.com/lookup?id=488580022&country=us, 2026-10-05). The vendor claims "5m+ app downloads" and "30m+ workouts logged" (https://stronglifts.com/app/, f; vendor CLAIM).

Only what is useful from the programme-first angle:
- OBS/vendor: set logging is a tap on circles, and fewer reps are logged by tapping again: "Simply tap the red circles to mark your set completed"; tap repeatedly "to log fewer reps or hold to log more reps than planned". (https://stronglifts.com/app/, f)
- OBS/vendor: on Apple Watch, "Tap the big circle one time. StrongLifts logs 5 reps and starts the rest timer"; "Each quick tap takes 1 rep off: 4, 3, 2, 1, 0"; warm-ups come first on a separate page with an orange circle. (https://support.stronglifts.com/article/111-apple-watch, f) Success is the default and one tap is a whole set; failure is the extra work.
- OBS/vendor, a deterministic rule that shapes the timer: "If you fail reps, we'll tell you to rest longer. If you succeed, we'll give you a shorter break." Weight rises automatically when all sets succeed; after several failed workouts in a row it falls, with user-set thresholds and deload percentage. (https://stronglifts.com/app/, f)
- OBS/vendor: plate calculator shows "which plates and how many" per side; warm-up calculator picks the sets and the jumps. (https://stronglifts.com/app/, f) Wear OS: not mentioned on the vendor page (a search summary says it supports Wear OS logging: T4, https://support.stronglifts.com/article/111-apple-watch, unverified).
**Android (Google Play, raw page text read 2026-10-06).** 4.3 from 101K reviews, 1M+ downloads, updated 2026-09-02, against 4.86 on the App Store. The listing says "StrongLifts is free to download, but requires a subscription to use. All new users get a 7-day free trial for the yearly plan", and the latest notes are "adjust weights, dates or workouts directly from the home screen", "estimated workout duration" and "annotations showing weight increases". Reviews in the last three months are about money, not logging: "Used to be free to log workouts, but I bought a PowerPack that was supposed to be lifetime ... Now, even that is gone, and I'm required to pay $12 a month just to be able to log my workouts?? No, thanks. I can create a simple spreadsheet for that!" (2026-08-30, 12 helpful votes); "I bought a lifetime pass, but I still receive a pop-up that I can't close out of after every workout" (2026-08-05, 12 helpful votes); the developer's emailed answer, quoted by a user: "The app has been a subscription since 2018 and a subscription is now required for everyone" (2026-07-08, 19 helpful votes). (https://play.google.com/store/apps/details?id=com.stronglifts.app&hl=en&gl=US, 2026-09-02) This is evidence for pattern W-11 in section 4.

### 2.26 Starting Strength Official (two apps from Shabu Pty Ltd)

Snapshot. Two products. "Starting Strength (Legacy)" is a paid iPhone app, $14.99, build 6.003 of 2026-07-09, 4.80 from 2,553 ratings (https://itunes.apple.com/lookup?id=1008697836&country=us, 2026-07-09). "Starting Strength Official" (the v2 app, Android and iOS) is free with Pro at $14.99 per month, $89.99 per year or $179.99 lifetime, build 1.1.5 of 2026-09-15, 4.63 from 41 ratings (https://itunes.apple.com/lookup?id=6753924510&country=us, 2026-09-15). The Android package is `com.shabu.startingstrength` (https://appfollow.io/android/starting-strength-official/com.shabu.startingstrength?country=us, search listing 2026-10-06).

**1-3. Screen, entry, rest.** OBS/vendor (v2): free tier has "NLP Phase 1 Program", onboarding "that walks you through your first workout", a "Custom/free training log for post-novice trainees", legacy-data import, history, basic progress; Pro adds the other programmes, a custom workout builder, "Warmup & Work Set Rest Timers", "Instant Plate Math", cloud sync, the Blue Book on the phone and "Progress Predictions - projected strength gains at 4, 8, and 16 weeks"; for everyone: "Linear progression tracking with automatic weight increases", "Stall detection and deload recommendations", an automatic warm-up calculator. (https://aasgaardco.com/store/books-posters-dvd/apps/starting-strength-official-mobile-app/, f) The App Store text adds an "AI Coach" for training questions and workout adjustments by chat, Texas Method and HLM post-novice programmes, Apple Watch with haptic rest alerts, Apple Health body weight, and cross-device workout restoration. (https://itunes.apple.com/lookup?id=6753924510&country=us, 2026-09-15)

**4-6. Management, finishing, resilience.** OBS/vendor: workout history is searchable; "cross-device workout restoration" and cloud backup; paid form checks from certified coaches. (https://itunes.apple.com/lookup?id=6753924510&country=us, 2026-09-15)

**8. Praise and complaints (dated, with developer replies).**
- OBS/user, v2: "Still haven't fixed main issues with v1... you can't customize it, like at all" (reviewer, Aug 21); developer: 1.1.4 beta addresses customisation (Aug 24). "No health integration" (Aug 8); developer: Apple Health and Watch "in active development" (Aug 11). "they charge you to break down the plates" (Sep 10); developer called it "genuinely fair feedback" and said plate math ties to the programming engine (Sep 23). Years not shown by the fetch; builds 1.1.2 to 1.1.5 place them in 2026. (https://apps.apple.com/us/app/starting-strength-official/id6753924510?see-all=reviews, f)
- OBS/user, legacy app: the timer is "finicky", resets unexpectedly and stops when switching apps; "Users cannot exceed 5 reps or 3 sets, forcing graduates of the novice program to switch applications entirely"; "It lets you have your data, and has good privacy policies" (most recent shown 2025-01-31). (https://apps.apple.com/us/app/starting-strength-legacy/id1008697836?see-all=reviews, f; summary by the fetch tool)

**Android (Google Play, raw page text read 2026-10-06).** The Play listing is the legacy app: $14.99, 4.3 from 3.45K reviews, 10K+ downloads, last updated 2025-03-13, opening with "Please note this is a legacy app and no longer support (new app coming soon!)". It lists "Warmup and workset calculator shows you exactly how many plates to put on each side of the bar", "Workset Rest Timer, customisable for each exercise", "Customise your progression for each exercise" and cloud sync with CSV export. A 2024 review: "I have very poor Wi-Fi in my basement where I work out, it seems the app depends on a solid Internet connection. Make the app almost useless" and "There's no way to go back and complete today's training if you accidently submit it", answered by the developer as fixed (2024-05-27). The new v2 app was not found on Google Play in the search pages read, so its Android availability is UNKNOWN beyond the vendor page's "Android and iOS". (https://play.google.com/store/apps/details?id=com.shabu.startingstrength&hl=en&gl=US, 2025-03-13)

**9. Distinctive.** A programme author's own app that gates the plate arithmetic and the rest timer behind Pro while giving the novice programme away, and adds an AI chat coach (see pattern W-20 in section 4 on why that last element conflicts with a deterministic engine). INFERRED from the sources.

### 2.27 5/3/1 apps (three dedicated loggers)

Common frame. None is made by Jim Wendler; two state they are independent ("not affiliated with Jim Wendler"). Boostcamp bundles the official programmes (vendor CLAIM, https://www.boostcamp.app/best/5-3-1, search summary 2026-10-06).

- "5/3/1 Workout logger - 531" (Seetha Thangarasa): US 4.80 from 3,229 ratings, build 10.2 of 2026-03-11, free; "automatic cycle management, plate loading calculations supporting both kg and lb, progress visualization, warm-up set generation, rest timers, and Apple Health"; a 3-week full-feature trial, then a one-time purchase; "no subscriptions, registration, ads". (https://itunes.apple.com/lookup?id=1114435690&country=us, 2026-03-11) Reviews: "watch app frequently seems to forget you are lifting and loses your workout progress" (5 stars, 6 March, year not shown, developer: "I'll work on improving these issues"); "reminder for your plus sets (5+, 3+, 1+, etc) with a '+' may be helpful" (2020-09-17); a crash fixed "within 24 hours on a weekend" (2021-12-12). (https://apps.apple.com/us/app/5-3-1-workout-logger-531/id1114435690?see-all=reviews, f)
- "Five/Three/One - 531 Workouts" (Strong Pigeon LLC): 4.84 from 1,463 ratings, build 2.6.5 of 2025-08-01; plans the whole cycle, rest timer with notifications, automatic plate calculation, "Calculating your next cycle based on your performance", "Notes associated with each sets", and "Home screen widget showing your current and upcoming workouts"; paid extras: custom plates and bar, assistance templates, Beyond 5/3/1 templates. (https://itunes.apple.com/lookup?id=1560266240&country=us, 2025-08-01)
- "Wendler Log 531" (Charles Vanderhoff): 4.51 from 547 ratings, build 108.0.26 of 2026-09-29; "Enter your one rep max once and never calculate percentages again"; AMRAP score tracking; cycle length 3 to 10 weeks including deload weeks; warm-ups calculated; Pro adds assistance programmes, plate calculator, charts, cloud backup. (https://itunes.apple.com/lookup?id=962162633&country=us, 2026-09-29)
- INFERRED: the one interaction these apps all handle specially is the "plus" AMRAP set, whose result sets the next cycle's training max; a reviewer's request for a "+" reminder shows it is easy to forget without a visual marker.
**Android (Google Play, raw page text read 2026-10-06).** Wendler Log 531 (Vandersoft, `com.vandersw.wenderlogbook`): 4.4 from 1.92K reviews, 100K+ downloads, updated 2026-09-29. Two recent reviews report that features that were free are now behind a subscription: "Now if I try to track more than 1 workout a day it tells me I've used all my free workouts and have to pay" (2026-01-06, 10-year user; the developer says previous Pro purchasers can restore) and "used to be 5 star now 1, new update requires a subscription? so free app is now paid for same features. I'll just install an old version for free" (2026-08-31). The 2026-09-29 note says the app was "Upgraded to the latest Android frameworks with refreshed sign-in. Your cycles and training maxes carry right over." (https://play.google.com/store/apps/details?id=com.vandersw.wenderlogbook&hl=en&gl=US, 2026-09-29)

### 2.28 GZCLP apps

- "GZCL Method Workout Logger" (Strongomatic, LLC): US 4.73 from 230 ratings, build 1.8.5 of 2025-10-24, free with a $9.99 one-time Pro (charts); preloaded GZCLP, Jacked and Tan 2.0, The Rippler and Ultra High Frequency variants; automated tier progression, exercise images, warm-up and failure and AMRAP sets, customisable rest timers. (https://itunes.apple.com/lookup?id=1517032809&country=us, 2025-10-24; https://www.boostcamp.app/best/gzcl, 2026-05, T3)
- OBS/user (aggregator, T4): crashes when starting workouts, rest timer hard to adjust on a small iPhone SE, notes not kept between sessions, weights wrong after missed weeks, custom exercises showing blank, and no login or backup: "Got a new phone and lost all of my workout history and stats". (https://justuseapp.com/en/app/1517032809/gzcl-method-workout-logger/reviews, f)
- The competing path for GZCLP users is a programmable app: Liftosaur ships GZCLP with "full T1/T2/T3 tier structure" and lets users "build a custom GZCL variant" (https://www.boostcamp.app/best/gzcl, 2026-05, T3 page by a rival). INFERRED: a single-programme app is cheap to make and easy to outgrow.

### 2.29 Bodybuilding.com BodySpace (state: legacy)

Snapshot. BodySpace, the free workout-plan and social network of Bodybuilding.com, is no longer a product in its own right. The company's support text says it combined "the Bodybuilding.com Store, BodyFit, and BodySpace into one seamless experience - now called the Bodybuilding.com - Fitness App" (https://support.bodybuilding.com/en-US/articles/bodybuildingcom-app-225629, f). Users report support saying BodySpace is a "legacy program that we aren't getting rid of but are no longer managing" (OBS/user, aggregator T4, undated: https://justuseapp.com/en/app/1389506691/bodyfit-fitness-training-coach/reviews, f). The Bodybuilding.com forums closed in September 2024 (https://en.wikipedia.org/wiki/Bodybuilding.com, f).

- OBS/vendor: the current app (seller Dynamo Group LLC) is 4.56 from 29,167 ratings, free with subscriptions at $9.99 per month or $59.99 per year, build 5.3.4 of 2026-08-03, with "seven different ways to workout", health-metric tracking, a supplement shop, and in 5.3.4 "a new Past Workouts review section" and "corrected workout duration display". (https://itunes.apple.com/lookup?id=1389506691&country=us, 2026-08-03)
- OBS/user (T4): "I switched over to BodyFit thinking that my workout history would come over and it didn't"; "BodySpace was amazing...BodyFit requires a steep annual fee and includes far fewer, less customizable plans"; "When tracking my workout i will select 'save and go to next exercise' only to find that the last exercise did not save"; "my workouts simply wont be logged onto the calendar after I've fully completed the workout". (https://justuseapp.com/en/app/1389506691/bodyfit-fitness-training-coach/reviews, f)
- INFERRED: a merger of three products lost users' history and a free library, which is the concrete cost of migrating a logger's data without a mapping; the cited complaint set is undated.

### Store-ranked loggers and Android-native rivals not named by lanes A4 or A5 (2.30 to 2.37)

How these were found. The store search surfaces were read on 2026-10-06. US App Store search for "workout tracker" and "gym log" via Apple's public search endpoint (https://itunes.apple.com/search?term=workout%20tracker&country=us&entity=software&limit=40 and https://itunes.apple.com/search?term=gym%20log&country=us&entity=software&limit=40), and Google Play search pages for "workout tracker", "gym log" and "workout log" (https://play.google.com/store/search?q=workout%20tracker&c=apps&hl=en&gl=US, https://play.google.com/store/search?q=gym%20log&c=apps&hl=en&gl=US, https://play.google.com/store/search?q=workout%20log&c=apps&hl=en&gl=US). OBSERVED rank order, not a download ranking: App Store "workout tracker": Strong, Hevy, (a habit app), Fitbod, Apple Fitness, Liftoff, RepCount, Iron, GymRun, then Gymverse, Stronger, Setgraph, JEFIT, MyFitnessPal, Home Workout, Fitlist, MacroFactor Workouts, SmartGym, Gymshark. Google Play "gym log": Hevy, FitNotes, Leap's "Gym Workout Tracker: Gym Log", Strive, Lyfta, "Workout Planner Gym Log Fit AI", RepCount, Strong (4.3 stars), Pumped, "Gym Workout Tracker & Log" (Yuri Koshiishi), JEFIT (4.4 stars), Map My Fitness, Bench. The US Top Free Health and Fitness chart the same day had LADDER at #5, Fitbod at #23 and Hevy at #25; Strong was not in its top 25 (https://apps.apple.com/us/charts/iphone/health-fitness-apps/6013, 2026-10-06). The search order is a relevance order, so it is evidence of visibility for those queries, not of install counts. Apps already covered by lanes A4 or A5 or by dossiers above are skipped.

### 2.30 Stronger (Atlas Smart Technologies)

Snapshot. US App Store 4.77 from 17,522 ratings, build 6.0.1 of 2026-09-11, free; Google Play listing "Stronger - Workout Gym Tracker" 4.6 from 11.4K reviews, over 500,000 downloads (https://itunes.apple.com/lookup?id=1621719397&country=us, 2026-09-11; https://play.google.com/store/search?q=stronger%20gym%20workout%20planner&c=apps&hl=en&gl=US, 2026-10-06). The vendor claims "2M+ downloads" and "10k+ 5-star reviews" (https://www.strongermobileapp.com/, f).
- OBS/vendor: "Strength Score: a single number that measures your overall strength. Track it, grow it, compare it"; strength standards "for your bodyweight, from Beginner up to World Class" across 12 muscle groups; group challenges; 400+ exercises; rest timers; "one-tap set completion" per the vendor's own blog. (https://www.strongermobileapp.com/, f; https://www.strongermobileapp.com/blog/best-workout-tracker-apps, 2026-02-21, updated 2026-09-28, vendor-published)
- OBS/vendor: premium $9.99 per month or $39.99 per year with a 7-day trial; "AI routines" in Premium. (https://www.strongermobileapp.com/blog/best-workout-tracker-apps, 2026-02-21)
- OBS/vendor: RepCount's compare page says its founder explains why RepCount has not built the Strength Score, so the feature is a known point of differentiation in the field. (https://www.repcountapp.com/compare, 2026-09)
- UNKNOWN: set row, rest timer mechanics, resilience.
**Android (Google Play, raw page text read 2026-10-06).** 4.6 from 11.4K reviews, 500K+ downloads, updated 2026-04-20; the listing leads with "Track your workouts, receive AI coaching, and compete with your friends", "Recovery Insights", "Lifting Groups", "Strength Score" and "Visual Guidance: ... detailed instructional GIFs". Reviews (all 2026): "The progress tracking makes no sense. one week I get 'Advanced' or better, the next week I go back and do a higher weight with the same reps and it goes backwards to 'Beginner'" (2026-08-26); "Functional as journal, not accurate ... There is no customer service" (2026-06-10); "I am doing unilateral exercises, so I have two exercise with the same name. It makes the builder loose its mind: infinite scrolling, exercises and supersets disappear. Moreover, setting the reps range proved tedious" (2026-06-03). INFERRED: the Strength Score's instability is the app's main trust problem in these reviews. (https://play.google.com/store/apps/details?id=com.atlassmarttech.stronger&hl=en&gl=US, 2026-04-20)

### 2.31 MacroFactor Workouts (Stronger By Science Technologies)

Snapshot. The workout app from a nutrition-algorithm company: US App Store 4.84 from 4,648 ratings, build 1.4.1 of 2026-10-03, free with a premium subscription, iPhone and iPad; Android too ("2K+ reviews" on Google Play per the vendor) (https://itunes.apple.com/lookup?id=6737156524&country=us, 2026-10-03; https://macrofactor.com/workouts/, f).
- OBS/vendor: "Track every rep and set"; "Create gym profiles for each of the places you work out"; 900+ exercises with technique videos; "Customizable rest timers"; "Track supersets, partial reps, and myoreps"; "Track weights and reps on your right and left sides"; "RIR tracker"; "Smart warm-up suggestions". (https://macrofactor.com/workouts/, f)
- OBS/vendor: programmes "auto-adjust based on your progress"; "After your first workout, the app begins learning your rate of progress". The latest release notes: smart generation with new splits including PPL and rep-progression schemes "Static, Linear, Reverse Linear, and Undulating". (https://macrofactor.com/workouts/, f; https://itunes.apple.com/lookup?id=6737156524&country=us, 2026-10-03)
- OBS/user: positive: "Easily swap exercises during a session"; "sleek ui"; "Gym profiles"; a user whose "program automatically adjusted during caloric deficit"; "The AI suggestions for added sets are spot on with regard to RIR targets" (January review). Negative: "Lost multiple workout sessions due to bugs"; "Way too many clicks to just see what I did on an exercise last session"; "cannot modify logged weights without resetting timer"; "Timer sound unreliable"; "lacks persistent workout notes"; custom programme building "incredibly time consuming"; "I don't understand the UI". Years not shown by the fetch. (https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524?see-all=reviews, f)
- OBS/vendor: prices $11.99 per month, $71.99 per year, $47.99 per 6 months, 7-day trial; "200k+ downloads". (https://macrofactor.com/workouts/, f)
- INFERRED: the one cross-domain claim in the field, a training plan that reacts to a nutrition state (a calorie deficit), sits in the same company's nutrition engine; this is the closest outside example of what Volyume's engine already does, and the review evidence is a single user comment.

### 2.32 SmartGym (SmartGym Services LLC)

Snapshot. US App Store 4.70 from 34,237 ratings, build 8.0.3 of 2026-09-16, free; Apple platforms only, "No Android mentioned" on the vendor page (https://itunes.apple.com/lookup?id=922744883&country=us, 2026-09-16; http://smartgymapp.com/, f). Build 8.0.3 notes: "natural language workout creation, Siri AI integration, improved exercise guidance using on-device Foundation Models" (https://itunes.apple.com/lookup?id=922744883&country=us, 2026-09-16).
- OBS/vendor: the Apple Watch app is "Completely independent. No iPhone. No internet."; "Apple Watch App of the Year 2023" (vendor CLAIM). (http://smartgymapp.com/, f)
- OBS/vendor: on the watch, "tap the rest timer button to log the current set and start the rest countdown"; during rest the screen shows all sets done and remaining, vibrates at the end, and shows the next set's details "so users can prepare for any necessary adjustments"; the Digital Crown moves between exercises. (https://help.smartgymapp.com/article/59-apple-watch-app, f)
- OBS/vendor: "Smart Trainer" adjusts weights, reps and exercises from history and "muscle group recovery", on a periodisation model the vendor attributes to NSCA and ACSM guidance. (http://smartgymapp.com/, f)

### 2.33 Fitlist (Fitmobi, LLC, the JEFIT publisher)

US App Store 4.73 from 10,496 ratings, build 4.0.22 of 2026-03-27, free with premium subscription (https://itunes.apple.com/lookup?id=696350076&country=us, 2026-03-27). OBS/vendor: "Tap a checkmark and rest timers start automatically"; "we'll remember your past sets"; Apple Watch tracking; 1000+ exercises; routine sharing; an Android app link (https://www.fitlist.com, f). It is the second Fitmobi logger beside JEFIT (lane A4), which the store search ranks separately; no evidence read says how they differ in the set row (UNKNOWN).

### 2.34 Strive (Gym log - Strive, Artur Fijal, Android and iOS, local-first)

Snapshot. US App Store 4.90 from 867 ratings, build 2.0.5 of 2026-10-02, free; Android 4.8 on the Google Play search page under "Artur Fijał KOALASOFT"; the vendor site says "iOS · Android · Free forever" and claims "4.9 App rating", "5,000+ Reviews" (App Store and Google Play combined) and "1M+ Workouts logged" (https://itunes.apple.com/lookup?id=6449553638&country=us, 2026-10-02; https://play.google.com/store/search?q=gym%20log&c=apps&hl=en&gl=US, 2026-10-06; https://strive-workout.com/, f; the counts are vendor CLAIMS). The closest functional analogue in this file to a free, offline-first, Android-and-iOS logger. The vendor page was read as raw text.
- OBS/vendor: "Logging a set should take 2 seconds. Custom keyboard with copy/repeat buttons. Rest timer fires automatically. Last week's reps right there. No tapping through menus mid-set." The three named features are a custom keyboard ("Numpad with copy, repeat, +/-"), an auto rest timer ("Starts when you save a set") and pinned targets ("See your goal every set"). (https://strive-workout.com/, f)
- OBS/vendor: one screen shows "Progress charts, grouped data, your next workout, consistency views, and a sticky note for whatever else matters to you"; free charts include per-exercise progress curves, bodyweight trends, volume, 1RM estimates, filters by time frame, weight type and rep range, "Compare exercises side-by-side". (https://strive-workout.com/, f)
- OBS/vendor, Pro: RPE and RIR tracking ("Log proximity to failure on every set"), "Effective reps & volume" ("Filter junk volume from real growth-driving sets. Set your own effective threshold"), Apple Health and Health Connect sync, workout plans and schedules, themes with a builder, home-screen widgets on iOS and Android, unlimited routine import and export. (https://strive-workout.com/, f)
- OBS/vendor, the stated policy: "Yes, fully. Your data is stored on your device"; "Your workout data never leaves your phone unless you explicitly export it"; "What's free today stays free. I may add new advanced features to Pro, but I will never move existing free features behind a paywall. No ads, no data selling. Ever." The author describes it as a solo side project "for years, used by people in 100+ countries", "No VC money." (https://strive-workout.com/, f)
- OBS/vendor: store text adds "placeholder exercises", "deload marking", year-end "wrapped" summaries, link-based plan sharing, "experimental gesture input for numbers"; one release note says swipe-to-delete was removed. (https://itunes.apple.com/lookup?id=6449553638&country=us, 2026-10-02)
- OBS/user (vendor-curated, selection bias): "Most clear and simple tracker I found. Switched from Jefit." and "I've spent years installing and uninstalling workout apps. I don't need routines. I don't need videos. I don't need community. I just need to track my workouts." (https://strive-workout.com/, f)
- OBS/user (App Store, independent): "100% free, no ads and no sign-in" (5 stars, 2025-10-18); "Like it Better than Strong" (4 stars, 6 March, year not shown) with a complaint of accidental deletion of routine exercises and no undo, which the developer logged; the rest timer is "clutch" and customisable by workout or exercise. (https://apps.apple.com/us/app/gym-log-strive/id6449553638?see-all=reviews, f)
- INFERRED: the vendor's headline is a number (two seconds per set), its UI is a custom numpad with copy and repeat keys, and its business promise is a written no-regression pledge on free features; for a free local logger the number pad and the pledge are the product.
**Android (Google Play, raw page text read 2026-10-06).** 4.8 from 3.34K reviews, 50K+ downloads, updated 2026-10-05. The listing repeats the pledge ("I will never change the free feature to a paid one, spam the paywall, limit routines or workout logs") and adds: "Workout planner: Set weight or reps for the next workout and ensure progressive overload", "Mark deloads", "Fully offline workout planner", "Rest timer personalizable per exercise", "Custom keyboard to easily input data", RIR and RPE, "all the set types, warmup, dropset, myo reps", Health Connect (off by default), and a "Placeholder exercise": "select exercise category and bodypart or a group of exercises and then select the actual exercise when working out, based on the feelings or what's free at the gym". Note a conflict: the Play text lists RIR and RPE among the app's features while the vendor site puts RPE and RIR tracking in Pro (the listing does not say which tier). The 2026-10-05 note lists link and text plan sharing, "Simpler progression & deload automation", milestone share cards, "Experimental gesture input for numbers (Settings > Workout)", and "Swipe-to-remove is gone, no more accidental removals". Reviews: "simple things like keeping a timer between sets isn't premium like it was on Boost" (2025-08-31); "Strive has everything you'd want from a paid workout tracker, except it's actually free" (2025-08-30); developer replies are short and prompt. (https://play.google.com/store/apps/details?id=com.koalasoft.gymnasium&hl=en&gl=US, 2026-10-05)

### 2.35 Android-native and cross-platform long tail, read from Google Play listings

Method. The Play listings below were read as raw page text on 2026-10-06 (package IDs in brackets), so ratings, review counts, download bands, update dates, release notes and dated reviews are direct. Feature lines are the vendor's listing text (OBS/vendor) and reviews are dated user posts (OBS/user). Rating and review counts are for the US Play storefront. Download bands are Google's ("10M+" means at least ten million). A summary table for every listing read is in 2.40.

**The two largest are ad-supported and little known outside Play.**
- Gym Workout Tracker: Gym Log (Leap Fitness Group, `gymworkout.gym.gymlog.gymtrainer`): 4.8, 233K reviews, 10M+, "Contains ads" (detail in 2.13).
- Gym WP - Workout Tracker & Log (Leal Apps LTDA, `com.lealApps.pedro.gymWorkoutPlan`): 4.6 from 141K reviews, 10M+ downloads, "Contains ads", updated 2026-09-24; "join over 5 million users"; the listing says its "Personalized Workout Plan uses artificial intelligence (AI)", with "Track muscle recovery and find out which muscle you should train"; over 500 exercises; "Log your sets, reps count, lifting weights, and rest time". Reviews: "Great concept. Huge bugs. Burns massive amount of battery. Slows down my phone due to memory leaks, and loses where I am in my workout when I switch between apps during rest periods. I have been using this app for 8 years. I have thousands of workouts of data ... and there is no way to get MY data out of the app" (2026-07-07, 9 helpful votes); the developer answered "Our team is working to improve stability and add data export options". Also: "I lose all my weight input whenever the workout changes from one program to another ... the app doesn't really build on what you have already accomplished. It just starts from zero" (2026-05-13); "it's not really all that easy to adjust or replace workouts on the fly ... I lost my first couple workouts after a series of wrong button presses" (2025-06-23). (https://play.google.com/store/apps/details?id=com.lealApps.pedro.gymWorkoutPlan&hl=en&gl=US, 2026-09-24) INFERRED: the second-largest Android gym log by installs has no data export and loses its place when the user switches apps during rest, which are the resilience failures a local-first logger should be built to avoid.

**Mid-size, healthy ratings.**
- Gym Day: Workout Planner & Log (Daily Strength, `com.anthonyng.workoutapp`): 4.8 from 30K reviews, 1M+, updated 2026-09-30. Listing: "Group exercises into supersets, trisets, or giant sets"; "Include warm-up sets, drop sets, and sets to failure"; "Configure rep ranges, weight, distance, duration, and rest intervals"; "Monitor your rate of perceived exertion (RPE)"; plate calculator; built-in plans (StrongLifts 5x5, Ice Cream Fitness, Madcow, PHUL, PHAT); "Track the sets you perform for each muscle group weekly"; "Repeat past sessions with automatically pre-filled logs"; an "AI Coach" that crafts a plan from weekly availability. Reviews: the "history" feature "where I can see what weight, sets, reps, or time I've done in the past" (2026-05-05); the developer promises "more stats, stretching/mobility exercises, and a watch app" (2026-05-11); latest note "Added over 100 static and dynamic stretches". (https://play.google.com/store/apps/details?id=com.anthonyng.workoutapp&hl=en&gl=US, 2026-09-30)
- GymKeeper, "Workout Tracker - GymKeeper" (GDev, `com.kg.app.sportdiary`): 4.7 from 8.6K reviews, 500K+, updated 2026-03-30. Listing: "No subscriptions & no ads - one-time purchase only!"; "No registration required"; "Easily navigate between workout sessions using the intuitive calendar and simple swiping"; "smart automatic tracking that fills in your training data based on past performance"; countdown, rest and Tabata timers; barbell, 1RM, BMI and heart-rate-zone calculators; "Manage multiple clients' workout journals"; Google Drive backups; TXT and CSV export; an AMOLED black theme. Reviews: "calculates 1RM, understands to double count volume if dumbbells are used. Let's me track effort level, ie easy, normal hard. Auto starts a timer so I neither rush nor lolligag. Plus can export!" (2021-07-24); "For it's full version price of under $10 ... I had no reservations to purchase" (2020-09-10). Release 6.15: floating comments on programmes, a revamped TXT and CSV export, automatic light and dark theme. (https://play.google.com/store/apps/details?id=com.kg.app.sportdiary&hl=en&gl=US, 2026-03-30)
- Pumped Workout Tracker Gym Log (Tip Tap Apps, `app.pumped.workout.log.tracker.strong.gym.exercise`): 4.6 from 10.8K reviews, 100K+, updated 2026-07-28. Review on the finish path: "I need to track the overall workout time. Even if I manually select the start and end times, the final workout time doesn't match my selection. Also, there should be a one-click option to complete the session instead of having to go through each individual workout to end it" (2026-07-21); another: "simple, functional, and beautiful in dark mode" (2026-08-14). (https://play.google.com/store/apps/details?id=app.pumped.workout.log.tracker.strong.gym.exercise&hl=en&gl=US, 2026-07-28)
- FitHero (FitHero, LLC, `com.fnp.fithero`): 4.6 from 1.02K reviews, 100K+, updated 2026-10-04; ad-free, 450+ video exercises, supersets, a customisable rest timer, warm-up, drop and failure sets, streaks, "easily copy or duplicate past workouts", Google Fit sync, backup and restore. Latest note: "Meet FlexHero, our new stretching and mobility app. Your home screen now suggests the right routine for your day, like a warm-up before the big lifts or a recovery session on rest days." A 2022 review: "No syncing, but can backup to cloud services." (https://play.google.com/store/apps/details?id=com.fnp.fithero&hl=en&gl=US, 2026-10-04)
- WorkoutWise, "Gym Workout Tracker & Log" (Yuri Koshiishi, `com.yurikoshiishi.workoutwise`): 4.9 from 328 reviews, 10K+, updated 2026-09-26; no ads; templates, rest timer, warm-up, drop and failure sets, supersets, RPE, calendar, Health Connect; Pro adds "Real-time workout autoregulation while logging", backup and CSV export. A 2024 review found "an incompleted workout running in the background without indicating so, and no clear way to find that background workout", and the developer's answer was to open the original date in the calendar and tap "Edit Workout". INFERRED: resume exists but is not discoverable. (https://play.google.com/store/apps/details?id=com.yurikoshiishi.workoutwise&hl=en&gl=US, 2026-09-26)
- Blast: Gym Log Workout Tracker (Mad Mustache Company, `com.madmustachecompany.workoutapp`): 4.3 from 417 reviews, 50K+, updated 2026-09-19; "log sets, reps, weight, and RPE with a single tap"; a free AI routine generator; PR shown "the moment you finish a session"; "Core tracking works fully offline"; Google Drive backup and CSV export. Reviews: an option that "automatically sets the weight from 1RM or previous" (2025-10-18) and "the free tier is a bit too naggy ... I would drop the nag screen when opening the app", after which the developer removed the pop-up (2025-10-19). (https://play.google.com/store/apps/details?id=com.madmustachecompany.workoutapp&hl=en&gl=US, 2026-09-19)

**Small and new (under 20K downloads).**
- Fitness Logbook (Fitness Logbook OU, `com.fitnesslogbook.app`): 4.5 from 192 reviews, 10K+; "Set RPE, RIR, tempo, and intensification methods, including drop sets, rest-pause sets, negative repetitions, and partial repetitions"; "Configure automatic rest timers between sets and exercises". (https://play.google.com/store/apps/details?id=com.fitnesslogbook.app&hl=en&gl=US, 2026-10-03)
- LiftLog (`com.limajuice.liftlog`): 4.7 from 173 reviews, 10K+; "Track a completion of a set with a single tap. Automatically set rest timers. Track failures accurately"; optional automatic progressive overload; a plan wizard using "the latest AI". (https://play.google.com/store/apps/details?id=com.limajuice.liftlog&hl=en&gl=US, 2026-08-30)
- WLog (Better Life With Apps, `com.mdikcinar.workoutplanner`): 5K+; double progression ("Once you reach the upper end, WLog raises the weight for your next session"), back-off sets tied to another set as a percentage, and "IMPORT YOUR PROGRAM WITH AI (PRO)" from a photo, PDF or notebook page. (https://play.google.com/store/apps/details?id=com.mdikcinar.workoutplanner&hl=en&gl=US, 2026-09-28)
- GymDroid (DedalDev, `com.dedaldev.gymdroid`): 1K+; "Your training plan lives on the Home screen: it shows exactly what to train today, prefills your reps, sets, and weights, and raises them week after week"; "Missed a day? Confirm it or fill it in later. The plan keeps up with real life."; the latest note adds right-to-left layouts for Arabic and Hebrew. (https://play.google.com/store/apps/details?id=com.dedaldev.gymdroid&hl=en&gl=US, 2026-09-02)
- Power Log (Kotlan Apps, `com.kotlan.powerlog`): 1K+; "intelligent autofill, previous set references, rest timer, supersets, dropsets"; the release note lists "Fixed timer and popup notification issues" and "Fixed keyboard display when entering data". (https://play.google.com/store/apps/details?id=com.kotlan.powerlog&hl=en&gl=US, 2026-09-30)
- Vigor (Dev-Krsmanovic, `com.krsmanovic.vigor`): 1K+; fully offline; RPE; "AI coach that runs entirely on-device ... without sending data online"; muscle-frequency heat map; period tracking; import of existing data. (https://play.google.com/store/apps/details?id=com.krsmanovic.vigor&hl=en&gl=US, 2026-10-03)
- Gym Track (Viking Tech, `com.vikingtech.gymtrack`): 50+ downloads; "Rest timer with auto-start, vibration, and custom presets", "Per-side rep tracking for unilateral exercises", ten pre-built programmes, 17 languages. Legend (Viszen, `com.gains.gains`): 4.5 from 75 reviews, 5K+, free and ad-free. Bench Gym Log (Bench LLC, `com.thebenchapp.bench`): 4.7 from 36 reviews, 1K+; rest timer "that runs in the background and notifies you"; publishable routines. Musclog (`com.werules.logger`), Gym Notes (`app.rork.gymnotes_workout_tracker`): under 1K downloads. (https://play.google.com/store/apps/details?id=com.vikingtech.gymtrack&hl=en&gl=US, 2026-09-24; https://play.google.com/store/apps/details?id=com.gains.gains&hl=en&gl=US, 2026-09-17; https://play.google.com/store/apps/details?id=com.thebenchapp.bench&hl=en&gl=US, 2026-09-29; https://play.google.com/store/apps/details?id=com.werules.logger&hl=en&gl=US, 2026-10-05; https://play.google.com/store/apps/details?id=app.rork.gymnotes_workout_tracker&hl=en&gl=US, 2026-10-03)
- Iron - Workout Tracker (Karim Abou Zeid, iOS only here): a free app; 4.83 from 371 ratings; build 1.6 of 2022-09-29 (only a watchOS-compatibility refresh since); watchOS app, automatic rest intervals, Siri Shortcuts, "no analytics or third-party tracking". (https://itunes.apple.com/lookup?id=1479893244&country=us, 2022-09-29)
- INFERRED across this tier: the small Android indie listings of 2026 all promise the same core (previous-set prefill, auto rest timer, supersets, set types, 1RM), and about half add an AI plan or AI import. What separates the healthier ones (FitHero, WorkoutWise, Blast, Gym Day) in the reviews is support responsiveness and a free tier that does not nag.

### 2.36 Open-source Android loggers (F-Droid, official metadata)

- wger Workout Manager (`de.wger.flutter`, AGPL-3.0): "Fitness/workout, nutrition and weight tracker", 200+ exercises, a "Gym Mode" for logging weights, a REST API so users own their data; build 2.1.1 released 2026-10-05, Android 8.0 or later. (https://f-droid.org/packages/de.wger.flutter/, 2026-10-05)
- GymLoga (`com.mbosse.gymloga`, AGPL-3.0): "Simple, native, and private workout logger for strength training"; shorthand input such as `135x5x3` or `20x10`; automatic PR tracking; estimated 1RM; all data on the device; build 1.2 of 2026-04-25; the repository shows 11 stars and no rest timer; export was planned for 1.1. Native Kotlin and Jetpack Compose. (https://f-droid.org/packages/com.mbosse.gymloga/, 2026-04-25; https://github.com/GymLoga/GymLoga-Android, f)
- GymRoutines (`com.noahjutz.gymroutines`, GPL-3.0): routines and exercises, statistics, data stored locally, build 0.1.1 of 2025-04-22. (https://f-droid.org/packages/com.noahjutz.gymroutines/, 2025-04-22)
- Kenko, iTrack, Liftlog and others are listed by AlternativeTo as free or open alternatives to Hevy; Kenko is the first-ranked alternative there, described as "free and open source, privacy focused and lightweight" with a Material You design (T4, https://alternativeto.net/software/hevy-workout-tracker, search summary 2026-10-06). Liftosaur (section 2.1) is the largest open-source logger in the set.
- INFERRED: the open-source shelf is small, mostly single-author and partly stale (0.1.x builds, 11-star repos), with the exceptions of wger and Liftosaur; none matches a commercial logger on rest-timer and set-row polish.

### 2.37 Text, voice and chat entry (three small examples)

- Gym Note Plus (iOS, Joshua Samuel Ibbotson, 4.8 from 17 ratings): you type a shorthand line ("bench 225lbs - 8,8,6") and the app parses exercise, weight, sets and reps, recognising warm-ups, drop sets, supersets and failure; "Photo conversion: Scan handwritten logbook pages"; offline with later sync; Pro $4.99 monthly, $29.99 or $39.99 yearly, $99.99 lifetime. (https://apps.apple.com/us/app/gym-note-plus-fitness-journal/id6746699616, f)
- GymLoga (above) uses the same idea with a fixed `weightxrepsxsets` grammar, on-device. (https://github.com/GymLoga/GymLoga-Android, f)
- Wellness Project (an AI logging app, T3 source for this entry): "Log sets, reps, weight and RPE by chat, manual entry or import"; its page for HeavySet users lists what it lacks versus HeavySet (tempo timer, plate calculator, preset per-exercise rest timers, dedicated superset structure). (https://wellnessproject.ai/heavyset-for-android, 2026-09-27; https://wellnessproject.ai/, f) Sleet (a rival AI logger with voice logging) is named by listicles but its page returned 404, so UNKNOWN.

### 2.38 Wearable brands with set and rep logging: COROS, Amazfit, Oura (compact)

- COROS: OBS/review (2020, T2) and a search summary of COROS support pages (T4): the watch has a strength mode with 200+ exercises, selectable muscle groups, automatic rep detection and set counting, with a body-mapped heat map in the app; in the app you open a finished activity, find the Exercise section, tap edit to change reps and intensity per set, or tap "+" to add a set you did not record on the watch. (https://the5krunner.com/2020/05/20/coros-strength-training-workout-builder/, 2020-05-20, search listing; https://support.coros.com/hc/en-us/articles/48547231345684, search summary 2026-10-06; support page returned 403) COROS is a Strava strength partner. (https://press.strava.com/articles/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps, 2026-05-21)
- Amazfit (Zepp app): OBS/review: the watches "auto-detect 25 exercise types and will intelligently count reps, sets, and rest time" (a search summary, T4) and push full strength workouts to Strava since 2026-05-21; Notebookcheck says the integration gives each synced workout a muscle map and is free, and that the article does not describe the counting algorithm. (https://notebookcheck.net/Amazfit-joins-Strava-s-new-strength-training-ecosystem-new-features-free-for-everyone.1306179.0.html, undated, reporting the 2026-05-21 announcement)
- Oura: UNKNOWN whether any set logging exists; the support text found describes automatic activity detection and a manual "Add an activity" with type, duration and intensity, and a search summary says the ring "cannot log detailed strength training sessions". (https://support.ouraring.com/hc/lv/articles/42821224955795-Record-a-Workout-with-Oura, search summary 2026-10-06, T4) Oura is #10 in the US Top Free Health and Fitness chart on 2026-10-06 (https://apps.apple.com/us/charts/iphone/health-fitness-apps/6013, 2026-10-06), so the mass market is large without a set logger.
- INFERRED across Garmin, COROS and Amazfit: every wrist vendor lets you edit reps and add missed sets on the phone afterwards, which is an admission that the wrist count needs a correction step.

### 2.39 CrossFit-class athlete loggers: SugarWOD and Wodify (compact)

Why included. They are the athlete-side apps of box gyms and use a score-and-whiteboard model that no consumer strength logger copies.
- SugarWOD: OBS/vendor: log a score on the gym whiteboard or in a personal logbook; "PRs are automatically calculated"; a daily scoreboard and gym leaderboards; "Friends Feed", photo sharing, fist bumps and comments; barbell percentage calculator and percentage charts for 1, 2, 3 and 5RM attempts; movement videos served from the prescribed workout; a personal logbook for workouts outside the gym with 1000s of built-in workouts; "Account Portability when changing gyms"; "Your data is yours... Pull it into a spreadsheet or a new system anytime"; multiple privacy levels; iOS and Android. "Over 500,000 athletes" is a vendor CLAIM from a search summary. (https://www.sugarwod.com/athlete-features/, f)
- Wodify Athlete: T4 (search summary of store and review pages): log results and view history "even if you're offline"; a whiteboard of the day's performances with like and comment; class schedule, reservations and sign-ins in one app; 4.9 stars on the App Store. (https://appfollow.io/ios/wodify-athlete/1235645130?country=us, search summary 2026-10-06)
- UNKNOWN: both apps' set-row mechanics, rest handling, and resilience; the sources are marketing pages and summaries.

### 2.40 Android market snapshot (all Google Play listings read, 2026-10-06)

What this is. The Play listing of every Android logger and platform app this lane reached, read as raw page text on 2026-10-06, sorted by review count. It includes the listings of apps that lanes A4 and A5 cover (Hevy, Strong, JEFIT, Fitbod, Alpha Progression, Caliber, Setgraph, FitNotes, Lyfta, Simple Workout Log), as context for the Android-first question, not as dossiers. Flags in the last four columns come from a text search of each listing's description, so they show what the vendor says, not what the app does: "Ads" is Google's "Contains ads" label; "AI in text" means the description uses the word "AI" or "artificial intelligence"; "Health Connect in text" and "Wear OS or Garmin in text" likewise. Source for every row: the Play URL `https://play.google.com/store/apps/details?id=<package>&hl=en&gl=US`, read 2026-10-06, with the package shown in the row; the rank order in which Google Play's search returned the packages for "gym log", "workout log", "workout tracker", "strength training log", "weightlifting tracker" and "lifting log" is in the search pages cited in 2.35. (https://play.google.com/store/search?q=gym%20log&c=apps&hl=en&gl=US, 2026-10-06)

| App (Play package) | Play rating | Reviews | Downloads | Updated | Ads | AI in text | Health Connect in text | Wear OS or Garmin in text |
|---|---|---|---|---|---|---|---|---|
| Samsung Health (`com.sec.android.app.shealth`) | 3.1 | 1.58M | 1B+ | Sep 7, 2026 | no | no | no | yes |
| Strava (`com.strava`) | 4.6 | 1.2M | 100M+ | Oct 5, 2026 | no | yes | no | yes |
| Garmin Connect (`com.garmin.android.apps.connectmobile`) | 4.4 | 1.11M | 50M+ | Oct 5, 2026 | no | no | no | yes |
| Hevy (`com.hevy`) | 4.9 | 274K | 5M+ | Oct 1, 2026 | no | no | no | yes |
| Gym Workout Tracker: Gym Log (Leap Fitness Group) (`gymworkout.gym.gymlog.gymtrainer`) | 4.8 | 233K | 10M+ | Sep 20, 2026 | ads | no | no | no |
| Gym WP - Workout Tracker & Log (Leal Apps) (`com.lealApps.pedro.gymWorkoutPlan`) | 4.6 | 141K | 10M+ | Sep 24, 2026 | ads | yes | no | no |
| StrongLifts 5x5 (`com.stronglifts.app`) | 4.3 | 101K | 1M+ | Sep 2, 2026 | no | no | no | no |
| Liftoff - Ranked Gym Workouts (`com.gymbros.app`) | 4.8 | 94.5K | 1M+ | Oct 3, 2026 | no | no | no | no |
| JEFIT (`je.fit`) | 4.4 | 89.9K | 5M+ | Sep 30, 2026 | no | yes | no | yes |
| Lyfta (`com.lyfta`) | 4.7 | 62.9K | 1M+ | Sep 24, 2026 | no | no | no | yes |
| Gymverse (`com.fitness22.workout`) | 4.3 | 48.3K | 1M+ | Sep 22, 2026 | ads | no | no | no |
| Strong (`io.strongapp.strong`) | 4.3 | 42.7K | 1M+ | Oct 6, 2026 | no | no | no | no |
| Fitbod (`com.fitbod.fitbod`) | 4.5 | 31.5K | 1M+ | Sep 30, 2026 | no | yes | no | yes |
| FitNotes (`com.github.jamesgay.fitnotes`) | 4.8 | 31.5K | 1M+ | Oct 24, 2025 | no | no | no | no |
| WHOOP (`com.whoop.android`) | 4.7 | 30K | 1M+ | Oct 2, 2026 | no | yes | yes | no |
| Gym Day: Workout Planner & Log (Daily Strength) (`com.anthonyng.workoutapp`) | 4.8 | 30K | 1M+ | Sep 30, 2026 | no | yes | no | no |
| Alpha Progression (`com.alphaprogression.alphaprogression`) | 4.8 | 21.2K | 1M+ | Oct 6, 2026 | no | no | no | no |
| GymRun (Workout Tracker & Gym Plan Log) (`com.imperon.android.gymapp`) | 4.4 | 17.3K | 1M+ | Aug 31, 2026 | no | no | yes | yes |
| Simple Workout Log (`com.selahsoft.workoutlog`) | 4.9 | 15.5K | 500K+ | Sep 22, 2026 | ads | no | no | no |
| StrengthLog (`com.styrkelabbet.Styrkelabbet`) | 4.7 | 11.7K | 100K+ | Oct 2, 2026 | no | no | yes | yes |
| Stronger (`com.atlassmarttech.stronger`) | 4.6 | 11.4K | 500K+ | Apr 20, 2026 | no | yes | no | no |
| Pumped Workout Tracker Gym Log (`app.pumped.workout.log.tracker.strong.gym.exercise`) | 4.6 | 10.8K | 100K+ | Jul 28, 2026 | no | no | no | no |
| GymKeeper (Workout Tracker, GDev) (`com.kg.app.sportdiary`) | 4.7 | 8.6K | 500K+ | Mar 30, 2026 | no | no | no | no |
| RepCount (`sp.repcount`) | 4.9 | 8.38K | 500K+ | Oct 6, 2026 | no | no | yes | no |
| Caliber (`com.caliberfitness.app`) | 4.6 | 4.12K | 500K+ | Sep 4, 2026 | no | yes | yes | no |
| Progression - Gym Workout Log (Zoltan Demant) (`workout.progression.lite`) | 4.7 | 4.05K | 100K+ | Jun 16, 2026 | no | no | yes | no |
| Starting Strength (Legacy, paid $14.99) (`com.shabu.startingstrength`) | 4.3 | 3.45K | 10K+ | Mar 13, 2025 | no | no | no | no |
| Gym log - Strive (`com.koalasoft.gymnasium`) | 4.8 | 3.34K | 50K+ | Oct 5, 2026 | no | no | yes | no |
| Wendler Log 531 (Vandersoft) (`com.vandersw.wenderlogbook`) | 4.4 | 1.92K | 100K+ | Sep 29, 2026 | no | no | no | no |
| TrainHeroic (`com.TrainHeroic.TrainHeroic`) | 3.1 | 1.57K | 500K+ | Oct 2, 2026 | no | no | no | no |
| Liftosaur (`com.liftosaur.www.twa`) | 4.8 | 1.12K | 100K+ | Sep 22, 2026 | no | no | no | no |
| FitHero (`com.fnp.fithero`) | 4.6 | 1.02K | 100K+ | Oct 4, 2026 | no | no | no | no |
| Blast: Gym Log Workout Tracker (`com.madmustachecompany.workoutapp`) | 4.3 | 417 | 50K+ | Sep 19, 2026 | no | yes | no | no |
| Setgraph (`app.setgraph`) | 3.9 | 363 | 50K+ | Sep 23, 2026 | no | no | no | no |
| Gym Workout Tracker & Log (WorkoutWise, Yuri Koshiishi) (`com.yurikoshiishi.workoutwise`) | 4.9 | 328 | 10K+ | Sep 26, 2026 | no | no | yes | no |
| Fitness Logbook (`com.fitnesslogbook.app`) | 4.5 | 192 | 10K+ | Oct 3, 2026 | no | no | no | no |
| LiftLog (`com.limajuice.liftlog`) | 4.7 | 173 | 10K+ | Aug 30, 2026 | no | yes | no | no |
| Legend: Gym Log Workout Tracker (Viszen) (`com.gains.gains`) | 4.5 | 75 | 5K+ | Sep 17, 2026 | no | yes | yes | no |
| Progression: Get Strong (Martin Pietrowski) (`de.progression.flutter`) | 4.2 | 53 | 5K+ | Aug 23, 2024 | no | no | no | no |
| Bench Gym Log (`com.thebenchapp.bench`) | 4.7 | 36 | 1K+ | Sep 29, 2026 | no | no | no | no |
| Power Log (`com.kotlan.powerlog`) | n/r | - | 1K+ | Sep 30, 2026 | no | no | no | no |
| Hercules - Gym Tracker (`com.ocreynolds.hercules`) | n/r | - | 100+ | Sep 22, 2026 | no | yes | no | no |
| Gym Track (Viking Tech) (`com.vikingtech.gymtrack`) | n/r | - | 50+ | Sep 24, 2026 | no | no | no | no |
| Musclog (`com.werules.logger`) | n/r | - | 100+ | Oct 5, 2026 | no | yes | yes | no |
| GymDroid (`com.dedaldev.gymdroid`) | n/r | - | 1K+ | Sep 2, 2026 | no | no | no | no |
| Gym Notes (MartaAZP3) (`app.rork.gymnotes_workout_tracker`) | n/r | - | 1K+ | Oct 3, 2026 | no | no | no | no |
| WLog (Better Life With Apps) (`com.mdikcinar.workoutplanner`) | n/r | - | 5K+ | Sep 28, 2026 | no | yes | no | no |
| Vigor (`com.krsmanovic.vigor`) | n/r | - | 1K+ | Oct 3, 2026 | no | yes | no | no |

OBSERVED from the table (48 listings):
- Install bands: two ad-supported dedicated gym logs sit at 10M+ downloads (Leap's Gym Workout Tracker: Gym Log and Leal Apps' Gym WP); Hevy and JEFIT are at 5M+; ten more dedicated loggers are in the 1M+ band (StrongLifts, Liftoff, Lyfta, Gymverse, Strong, Fitbod, FitNotes, Gym Day, Alpha Progression, GymRun). The platform apps dwarf them (Samsung Health 1B+, Strava 100M+, Garmin Connect 50M+), and Samsung Health rates 3.1.
- Ratings of 4.3 or lower among listings with 1K or more reviews: Samsung Health 3.1 (1.58M reviews), TrainHeroic 3.1 (1.57K), StrongLifts 4.3 (101K), Gymverse 4.3 (48.3K), Strong 4.3 (42.7K), Starting Strength legacy 4.3 (3.45K). Ratings of 4.8 or higher with more than 15K reviews: Hevy 4.9 (274K), Leap 4.8 (233K), Liftoff 4.8 (94.5K), FitNotes 4.8 (31.5K), Gym Day 4.8 (30K), Alpha Progression 4.8 (21.2K), Simple Workout Log 4.9 (15.5K).
- Of the 48 listings, 15 use the word "AI" in their description, 4 carry ads, 10 mention Health Connect and 9 mention a watch platform. These are counts over the listings this lane chose to read, not a sample of the store.
- Freshness: 41 of 48 were updated since 2026-08-25 (about six weeks before the read). The seven older: FitNotes (2025-10-24), Stronger (2026-04-20), GymKeeper (2026-03-30), Progression by Zoltan Demant (2026-06-16), Pumped (2026-07-28), Starting Strength legacy (2025-03-13) and Martin Pietrowski's Progression (2024-08-23).
- INFERRED: a free, ad-free, Android-first logger is competing in a field where the largest installs are ad-supported, the best-rated large apps are Hevy and a handful of simple loggers, and many small entrants advertise AI; deterministic, local and ad-free is a real position on that shelf. This is positioning commentary, not evidence of demand.

## 3. Set-3 feature matrices (same rows as lane A4)

**Legend.** Cells follow lane A4's convention. Y = yes, documented. P = partial or conditional (condition in the row note). N = no, stated by a vendor page or an open request on the vendor's own board. N? = probably no, INFERRED from silence in documentation that otherwise covers the area. ? = unknown, not established (never read it as no). n/a = does not apply to the product (a cable machine has no plate calculator). `$` after a value = behind a paid tier in an app whose basic logging is free. The number in each column header is the dossier in section 2 that holds the source URLs and dates for that column; a cell is only as good as its dossier, and a cell marked T3 or T4 in the row notes rests on a competitor page or a search summary, not the vendor. Lane A4's rows A1 to C11 are kept, in order and wording, so the three lanes can be read side by side; A4's row C10 reads "free logging with no time limit".

**Columns, group 1 (consumer loggers and the long tail).** Lif Liftosaur 2.1; RC RepCount 2.2; SL StrengthLog 2.3; HS HeavySet 2.7; Sv Strive 2.34; Pg Progression 2.12; Stg Stronger 2.30; MF MacroFactor Workouts 2.31; Gvs Gymverse 2.8; Lof Liftoff 2.6; SmG SmartGym 2.32; Flt Fitlist 2.33; GR GymRun 2.9; GyS Gymshark Training 2.5; Lp Leap Gym Workout Planner and Log 2.13; GLg GymLoga 2.36. Not in the matrix because the evidence read established none of the rows: Workit, Hercules, Fitlog (2.10, 2.11, 2.13), the Android long-tail names in 2.35 and Gym Note Plus (2.37).

**Columns, group 2 (wrist, hardware, coaching platforms, programme-first).** Mot Motra 2.4; Whp WHOOP 2.14; Gar Garmin 2.15; SmH Samsung Health 2.16; Stra Strava 2.17; Ton Tonal 2.18; Tmp Tempo 2.19; TC TrueCoach 2.20; TH TrainHeroic 2.21; TB TeamBuildr 2.22; Evf Everfit 2.23; Kah Kahunas 2.24; SLf StrongLifts 2.25; SS2 Starting Strength Official 2.26; 531 the three 5/3/1 apps 2.27; GZ GZCL Method Workout Logger 2.28; BB Bodybuilding.com app 2.29. For the wrist vendors, rows B6 and B7 ask about Apple Watch and Wear OS apps; Garmin and WHOOP are n/a because their own device is the logger.

#### 3A-1. Set entry and logging, consumer loggers and long tail

| Capability | Lif 2.1 | RC 2.2 | SL 2.3 | HS 2.7 | Sv 2.34 | Pg 2.12 | Stg 2.30 | MF 2.31 | Gvs 2.8 | Lof 2.6 | SmG 2.32 | Flt 2.33 | GR 2.9 | GyS 2.5 | Lp 2.13 | GLg 2.36 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 Previous values at the set | Y | Y | ? | Y | Y | P | ? | ? | ? | ? | ? | Y | ? | P | ? | ? |
| A2 One-gesture fill from previous | P | ? | P | ? | Y | ? | ? | ? | ? | ? | ? | ? | Y | ? | P | ? |
| A3 Custom keyboard or accessory bar | Y | ? | N? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | N? |
| A4 Per-set target shown before the set | Y | N? | Y | Y | Y | Y | ? | Y | Y | ? | ? | ? | ? | Y | Y | ? |
| A5 Warm-up set type | Y | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A6 Drop-set type | P | P$ | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A7 Failure or AMRAP type | Y | ? | Y | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A8 RPE or RIR per set | Y | ? | Y$ | Y | Y$ | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? |
| A9 Exercise notes that persist | Y | Y | Y | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A10 Plate calculator | Y$ | ? | Y | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A11 Warm-up calculator | ? | ? | Y | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? |
| A12 Estimated 1RM | Y | Y$ | Y | Y | Y | ? | ? | Y | ? | ? | ? | ? | ? | ? | Y | Y |
| A13 Duration or distance sets | Y | P | P | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A14 Bodyweight, assisted, weighted | ? | ? | Y | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A15 Weight-unit toggle, global or per exercise | Y | ? | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A16 Equipment or available-weights profile | Y | ? | Y | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? |
| A17 Rest-pause, cluster or pyramid set styles | P | ? | N? | ? | ? | ? | ? | P | ? | ? | ? | ? | ? | ? | ? | ? |

#### 3B-1. Rest timer and surfaces outside the app, consumer loggers and long tail

| Capability | Lif 2.1 | RC 2.2 | SL 2.3 | HS 2.7 | Sv 2.34 | Pg 2.12 | Stg 2.30 | MF 2.31 | Gvs 2.8 | Lof 2.6 | SmG 2.32 | Flt 2.33 | GR 2.9 | GyS 2.5 | Lp 2.13 | GLg 2.36 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 Auto-start on set completion | Y | ? | P | ? | Y | ? | ? | ? | ? | P | P | Y | ? | ? | ? | N? |
| B2 Default plus per-exercise duration | Y | ? | Y | Y | Y | ? | ? | Y | P | ? | ? | ? | ? | P | ? | ? |
| B3 Adjustable while it runs | Y | ? | Y | Y | ? | ? | ? | ? | ? | P | ? | ? | ? | ? | ? | ? |
| B4 iOS lock screen, Live Activity, Dynamic Island | Y$ | Y$ | ? | ? | ? | Y$ | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B5 Android lock-screen or notification route | Y$ | ? | ? | N | ? | N? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B6 Apple Watch logging | Y$ | N? | ? | N? | ? | N | ? | ? | Y | Y | Y | Y | N? | ? | ? | ? |
| B7 Wear OS logging | N? | N? | ? | N | ? | ? | ? | ? | ? | ? | ? | ? | Y | ? | ? | ? |
| B8 Complete or repeat a set from lock screen or notification | Y$ | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B9 Sound or vibration at timer end | Y | ? | Y | P | ? | ? | ? | P | ? | ? | Y | ? | ? | ? | ? | ? |

#### 3C-1. Mid-workout management, finishing, resilience, access, consumer loggers and long tail

| Capability | Lif 2.1 | RC 2.2 | SL 2.3 | HS 2.7 | Sv 2.34 | Pg 2.12 | Stg 2.30 | MF 2.31 | Gvs 2.8 | Lof 2.6 | SmG 2.32 | Flt 2.33 | GR 2.9 | GyS 2.5 | Lp 2.13 | GLg 2.36 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 Supersets or circuits | Y | Y$ | Y | Y | ? | ? | ? | Y | ? | Y | ? | ? | Y | ? | ? | ? |
| C2 Replace an exercise mid-workout | Y | ? | Y | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? |
| C3 Reorder exercises mid-workout | Y | ? | Y | ? | ? | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? |
| C4 Exercise history or charts one tap from the workout | Y | Y$ | ? | Y | P | ? | ? | P | ? | ? | ? | ? | ? | ? | ? | ? |
| C5 Live PR hint while logging | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C6 Share card or summary image | Y | ? | ? | ? | Y | Y | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? |
| C7 Write-back prompt after in-session edits | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C8 Offline logging documented | Y | Y | ? | P | Y | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | Y |
| C9 Resume an unfinished workout after a kill | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C10 Free logging with no time limit | Y | Y | Y | P | Y | P | P | P | ? | P | P | P | ? | Y | P | Y |
| C11 Exercise instruction media (video, animation, illustration) | P | ? | Y | ? | ? | ? | ? | Y | ? | Y | Y | ? | ? | Y | Y | ? |


**Row notes, group 1.**
- A1: Liftosaur's second column header cycles Target, Previous Set, Plates, e1RM (2.1); Strive lists "Last week's reps right there" (2.34); RepCount's prefill and "reminder of what you lifted last time" (2.2); Gymshark added previous data to Tracked Mode in build 2.32.0 per a search summary (T4, 2.5); Progression is P because only a vendor-curated user quote supports it (2.12); Fitlist says it remembers past sets (2.33).
- A2: Strive's numpad has copy and repeat keys (2.34); Liftosaur's "Add Set copies the last set" (2.1); StrengthLog's "Train Again" copies a whole workout, not a set (2.3); Leap says "log all sets in one click", mechanics not read (2.13); GymRun's "history autocompletion" is T3 (2.9).
- A3: Liftosaur's keypad has digits, plus, minus, backspace, close, with the weight stepper moving by the smallest loadable weight (2.1); Strive's numpad (2.34); StrengthLog uses the system keyboard (its help warns the keyboard's own "done" key does not mark a set done, 2.3); GymLoga takes a typed shorthand line instead (2.36).
- A4: where an app prescribes, the target is the prefilled field (Liftosaur), a pinned goal (Strive), or a programme weight fetched from history (StrengthLog "Retrieve From Training Log"); RepCount is a log, so N? (2.1, 2.34, 2.3, 2.2).
- A6, A7: Liftosaur treats drop sets and myo-reps as script behaviour, AMRAP as a first-class `5+` set (2.1); StrengthLog has drop sets, "Fail" and "Max reps" flags, and AMRAP, EMOM, Tabata special sets (2.3); RepCount sells drop sets (2.2).
- A8: Liftosaur `@8+` prompts after the tap; StrengthLog Premium switches RPE or RiR on per set; Strive Pro; MacroFactor "RIR tracker" (2.1, 2.3, 2.34, 2.31).
- A10: Liftosaur shows plates per side only with Premium, StrengthLog shows a bar image above the keyboard free (2.1, 2.3).
- A11: StrengthLog's "Warm-up for Max Attempt" calculator and MacroFactor's "Smart warm-up suggestions" (2.3, 2.31); Liftosaur has warm-up sets, calculator not read.
- A13, A14: StrengthLog bodyweight factor per exercise (can be set to 0); HeavySet base weight, bodyweight and assisted; RepCount reviewers cannot log time and reps together (2.3, 2.7, 2.2).
- B1: StrengthLog auto-start is a setting (P); Liftoff's two teardowns disagree (P); SmartGym's auto behaviour is documented for the watch only (P); GymLoga's README names no timer (N?) (2.3, 2.6, 2.32, 2.36).
- B4, B5, B8: Liftosaur Premium: Live Activity and Dynamic Island on iOS, Live Update chip and an ongoing notification with "-15s, +15s, Done" on Android, set completion from the lock screen (2.1); Progression's Live Activity is iPhone only and Pro (2.12); RepCount's Live Activities are Premium (2.2).
- B6, B7: Liftosaur's Apple Watch app needs Premium and no Wear OS app is described; GymRun runs on Wear OS and Garmin and has no iPhone app (T3); Progression has no watch app (2.1, 2.9, 2.12).
- C4: Liftosaur shows a graph (Premium) and PR block under the sets; RepCount charges for "Exercise history from the workout screen" (Y$); HeavySet shows "all current rep records for current exercise" (2.1, 2.2, 2.7).
- C5: HeavySet raises PR notifications during the log (2.7); Liftosaur marks PRs on history cards and the finish screen, live hint not documented.
- C7: Liftosaur's swap "changes this workout only" and a separate "Edit Program Exercise" route exists (P) (2.1).
- C10: StrengthLog, Strive, Gymshark, GymLoga and Liftosaur have no stated time limit; HeavySet limits non-paying users' routine runs (T4); Progression's free tier is four workouts; MacroFactor and Stronger need a subscription for the full app.

#### 3A-2. Set entry and logging, wrist, hardware, coaching and programme-first apps

| Capability | Mot 2.4 | Whp 2.14 | Gar 2.15 | SmH 2.16 | Stra 2.17 | Ton 2.18 | Tmp 2.19 | TC 2.20 | TH 2.21 | TB 2.22 | Evf 2.23 | Kah 2.24 | SLf 2.25 | SS2 2.26 | 531 2.27 | GZ 2.28 | BB 2.29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 Previous values at the set | P | P | ? | ? | ? | ? | ? | P | ? | ? | Y | ? | ? | ? | ? | ? | ? |
| A2 One-gesture fill from previous | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | P | ? | Y | ? | ? | ? | ? |
| A3 Custom keyboard or accessory bar | ? | ? | ? | ? | ? | n/a | n/a | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A4 Per-set target shown before the set | Y | ? | ? | ? | ? | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | ? |
| A5 Warm-up set type | ? | N? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | Y | Y | Y | P | ? |
| A6 Drop-set type | ? | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A7 Failure or AMRAP type | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | P | ? | Y | Y | ? |
| A8 RPE or RIR per set | ? | P | ? | ? | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? | ? |
| A9 Exercise notes that persist | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A10 Plate calculator | ? | ? | ? | ? | ? | n/a | n/a | ? | ? | ? | ? | ? | Y | Y$ | Y | ? | ? |
| A11 Warm-up calculator | ? | ? | ? | ? | ? | n/a | n/a | ? | ? | ? | ? | ? | Y | Y | ? | ? | ? |
| A12 Estimated 1RM | Y | ? | ? | ? | ? | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? | ? |
| A13 Duration or distance sets | Y | ? | ? | ? | Y | ? | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? |
| A14 Bodyweight, assisted, weighted | Y | ? | ? | N? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A15 Weight-unit toggle, global or per exercise | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | Y | ? | ? | ? | ? | ? | ? |
| A16 Equipment or available-weights profile | Y | ? | ? | ? | ? | n/a | n/a | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| A17 Rest-pause, cluster or pyramid set styles | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |

#### 3B-2. Rest timer and surfaces outside the app, wrist, hardware, coaching and programme-first apps

| Capability | Mot 2.4 | Whp 2.14 | Gar 2.15 | SmH 2.16 | Stra 2.17 | Ton 2.18 | Tmp 2.19 | TC 2.20 | TH 2.21 | TB 2.22 | Evf 2.23 | Kah 2.24 | SLf 2.25 | SS2 2.26 | 531 2.27 | GZ 2.28 | BB 2.29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 Auto-start on set completion | ? | N? | Y | N? | N? | ? | ? | ? | ? | ? | Y | P | Y | ? | P | ? | ? |
| B2 Default plus per-exercise duration | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | Y | ? | ? | Y$ | ? | Y | ? |
| B3 Adjustable while it runs | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B4 iOS lock screen, Live Activity, Dynamic Island | ? | N? | ? | ? | ? | n/a | n/a | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B5 Android lock-screen or notification route | N? | ? | ? | ? | ? | n/a | n/a | ? | ? | ? | P | ? | ? | ? | ? | ? | ? |
| B6 Apple Watch logging | Y | n/a | n/a | n/a | ? | n/a | n/a | ? | ? | ? | ? | ? | Y | Y | P | ? | ? |
| B7 Wear OS logging | N? | n/a | n/a | Y | ? | n/a | n/a | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B8 Complete or repeat a set from lock screen or notification | ? | ? | ? | ? | ? | n/a | n/a | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| B9 Sound or vibration at timer end | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | P | ? | ? | ? | ? | ? | ? |

#### 3C-2. Mid-workout management, finishing, resilience, access, wrist, hardware, coaching and programme-first apps

| Capability | Mot 2.4 | Whp 2.14 | Gar 2.15 | SmH 2.16 | Stra 2.17 | Ton 2.18 | Tmp 2.19 | TC 2.20 | TH 2.21 | TB 2.22 | Evf 2.23 | Kah 2.24 | SLf 2.25 | SS2 2.26 | 531 2.27 | GZ 2.28 | BB 2.29 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 Supersets or circuits | P | Y | ? | ? | ? | ? | ? | ? | ? | ? | Y | Y | ? | ? | ? | ? | ? |
| C2 Replace an exercise mid-workout | Y | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C3 Reorder exercises mid-workout | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C4 Exercise history or charts one tap from the workout | ? | N? | ? | ? | ? | ? | ? | Y | ? | P | ? | ? | ? | ? | ? | ? | ? |
| C5 Live PR hint while logging | ? | ? | ? | ? | ? | ? | ? | ? | P | ? | ? | ? | ? | ? | ? | ? | ? |
| C6 Share card or summary image | ? | ? | ? | ? | Y | ? | ? | ? | Y | P | ? | ? | ? | ? | ? | ? | ? |
| C7 Write-back prompt after in-session edits | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C8 Offline logging documented | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C9 Resume an unfinished workout after a kill | P | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| C10 Free logging with no time limit | P | ? | P | Y | ? | N | N? | Y | Y | Y | Y | Y | P | P | P | P | P |
| C11 Exercise instruction media (video, animation, illustration) | Y | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |


**Row notes, group 2.**
- A1, A2: Motra prefills predicted weights from history and its "Auto Update" rewrites later unlogged sets by the same increment (2.4); StrongLifts logs the programme reps with one tap on the circle (2.25); Everfit autofill is from the most recent completed session or the client's 1RM and can be switched off (2.23); TrueCoach offers an Exercise History view (2.20).
- A4: the coach or programme prescribes in TrueCoach, TrainHeroic, TeamBuildr, Everfit, Kahunas, and in the programme-first apps; Tonal sets the weight itself and Tempo recommends it (2.18, 2.19).
- A5, A7: StrongLifts puts warm-ups on a separate page; the 5/3/1 apps generate warm-ups and treat the "+" set as AMRAP; WHOOP users ask for a warm-up versus working set log (N?) (2.25, 2.27, 2.14).
- A8: TrainHeroic logs RPE per set (T4); WHOOP's RPE is per workout by inference from a request for per-set RPE (2.21, 2.14).
- A10: Starting Strength charges for "Instant Plate Math" and a developer reply calls the complaint "genuinely fair feedback" (2.26).
- B1: WHOOP, Samsung and Strava are N? because forum or documentation evidence shows no auto rest timer (2.14, 2.16, 2.17); Garmin shows a rest timer a few seconds after a set (2.15); Everfit's timer is on by default (2.23).
- B5: Everfit sends a notification when rest ends (generic, not Android-specific, P) (2.23).
- B6, B7: Motra has no Android app found (N?); Samsung's wrist mode runs on a Wear OS Galaxy Watch (T4); the 5/3/1 logger's watch app is reported to lose progress (P) (2.4, 2.16, 2.27).
- C1: WHOOP lists supersets (T4); Motra's superset recognition is criticised and it adds a "Circuit" label (P) (2.14, 2.4).
- C2: Motra's "Smart Swap"; WHOOP swaps erase performance history (P) (2.4, 2.14).
- C7: Motra asks after a template workout whether to update the template's weight, reps and structure (2.4).
- C8, C9: Motra's watch stores locally and uploads later; a pending upload is deleted after 14 days; a dead-battery recovery works only for freeform workouts (P, P) (2.4).
- C10: Tonal needs a $59.95 per month membership (N); Tempo has a membership (N?); coaching apps are free to the client and paid by the coach; StrongLifts, Starting Strength, the 5/3/1 apps, the GZCL logger and the Bodybuilding.com app are free to download with paid unlocks (P) (2.18, 2.19, 2.25 to 2.29).

### 3D. Supplementary table: how sensor-backed loggers capture a set (rows that lane A4's list does not have)

Lane A4's rows assume a person types a set. Eight products in this set capture the set another way, so these rows ask the questions that matter for them. Cells are OBSERVED unless tagged INFERRED or T3 or T4; dossier numbers point to the URLs.

| Question | Motra 2.4 | WHOOP 2.14 | Garmin 2.15 | Samsung 2.16 | COROS, Amazfit 2.38 | Tonal 2.18 | Tempo 2.19 |
|---|---|---|---|---|---|---|---|
| Source of the rep count | Wrist accelerometer (vendor CLAIM); needs 3+ reps and real weights | Band measures rep speed and intensity; the user enters target reps BEFORE the set | Wrist: a rep counts when the arm returns to the start; count shows after at least 4 reps | T4: reps "not counted automatically when you set a target" | Wrist auto-detection (T4, 25 exercise types claimed for Amazfit) | Cable travel on the machine | 3D time-of-flight camera, only inside official classes |
| Source of the weight | Predicted from history and corrected by the user (vendor help says "automatic rep and weight detection"; a T3 review and a store review say it is not sensed) | Typed by the user | Typed on the watch or edited in Connect | T4: cannot be added | Edited in the app (T4) | The machine sets it (Smart weights) and the user nudges with -/+ | Camera reads Tempo plates up to 10 lb and dumbbells up to 65 lb; manual otherwise; mid-set changes are not detected |
| Who ends the set | Auto-detected | The user | Optional "automatic set detection" | Manual | Auto-detected (T4) | Auto-Advance prompt "next move?" when 50% or more of the reps are done and the cable is released | The class timeline |
| Edit afterwards | Three scopes (all sets, this set, Auto Update to later unlogged sets) | Reps editable during the workout, not once processed (staff, 2025-05-19; still open 2026-03-25) | Edit last set on the watch, edit in Connect (users: weights revert to "Body") | ? | Edit reps and intensity, add a missed set in the app (T4) | Rewind or skip reps; tap the screen to return to a set | Pause the class and adjust weights |
| Rest presentation | First display slot always rest time or the rest alarm; a voice timer was criticised | No automatic rest timer per users (INFERRED) | Rest timer appears after several seconds | ? | ? | ? | "Dynamic Rest" extends rest while heart rate stays high; a heart-rate chart during rest (2021) |
| Documented trust problems | Weight not sensed; cable, leg and machine work miscounted (T3) | No edit after processing; swaps erase history | Peer-reviewed error 3.0% to 67.5%; "Body" reversion; leg work not counted accurately (manual); on import to Strava, unmatched exercise names show as "Unknown" | Time and calories pause during rest (T4) | ? | Occasional false Spotter triggers (review) | Needs line of sight, light and real weights |

Sources for 3D are the dossier citations above; the Garmin-to-Strava name-matching point comes from a Reddit-mirror snapshot dated 2026-07-23 in which a Strava team account says the per-exercise list "requires exercise names to match Strava's database" and unmatched ones appear as "Unknown" (https://reddit.sentinel-team.org/posts/1v39e8f/snapshots/2026-07-23T07%3A38%3A40.428Z, 2026-07-23; a third-party mirror of an r/Strava thread, T2).

## 4. Patterns that appear only in the wider field

Scope. "The big five" below means Hevy, Strong, Fitbod, JEFIT and Boostcamp, the five lane A4 leads with; "A4 does not show it" means the pattern is absent from that lane's file (`04-competitors-set-1.md`) as read on 2026-10-06, which is a statement about those documents, not about the apps' every screen. Each pattern gives: where it is seen, the evidence, and then a line labelled JUDGEMENT. A judgement line is my opinion about value to a free, offline-first, Android-first app with a deterministic coaching engine; it is not evidence. No Volyume code was read, so every "if absent" is a condition for the lead to check against the maps in `01-logger-core-map.md` and `02-logger-periphery-map.md`. Constraints from CLAUDE.md that bear on the judgements: deterministic engine, no AI; ED-safety system untouched; free product with no gating (D137); offline-first with the device as truth; calm voice with no shame; no new dependencies without asking; no outside-party dependencies.

**W-01. The check tap opens a popup only on sets that need data, declared in the prescription.**
- Seen in: Liftosaur (2.1). "Sets that end in + ask a question after the tap. 5+ asks for reps, ?+ asks for weight, @8+ asks for RPE"; the popup "shows only the fields that set needs"; every other set completes in one tap; the timer starts when the popup is submitted. (https://www.liftosaur.com/features/workout-screen, 2026-09-27; https://www.liftosaur.com/features/set-types, f)
- A4 does not show it: Hevy shows an RPE column when enabled, Strong an RPE key, Boostcamp RPE and RIR on every set.
- JUDGEMENT: high value if the logger today shows effort and AMRAP fields on every row. A deterministic engine already knows which prescribed sets are AMRAP or RPE-targeted, so it can set the "ask" flag itself; the rest of the session stays one tap per set. Cost small to medium; no constraint touched.

**W-02. Show the working: rounding and rest precedence stated in the UI and the docs.**
- Seen in: Liftosaur (2.1). The target shows the exact weight crossed out (212lb) and the rounded weight underlined (210lb); tapping opens "Why is the weight adjusted?" naming percentage of 1RM, unit conversion, bar weight, plates or nearest dumbbell; rest time resolves in a published order (per-set value, superset timer, warm-up or workout default; 0 or empty means no timer). (https://www.liftosaur.com/features/workout-screen, 2026-09-27; https://www.liftosaur.com/features/rest-timer, 2026-09-27)
- A4 does not show it.
- JUDGEMENT: high value as trust-building for a deterministic engine: the founder's product can say why a number is what it is without any AI. If Volyume already rounds to available plates, the missing piece is the one-tap explanation. Small cost.

**W-03. Progression and deload rules stated in plain words, including what the app will not decide.**
- Seen in: Progression (2.12), StrongLifts (2.25), Starting Strength Official (2.26), Liftosaur in code (2.1). "Hit the top of the range in every set and Progression raises the weight next time" (+2.5 kg shown); "two sessions in a row with missed reps across several exercises mean 90% next week"; "what it deliberately doesn't decide: whether you are ill, sleeping badly or under stress outside the gym". (https://get-strong.app/en/, f; https://get-strong.app/blog/wann-deload-noetig-ist, 2026-08-11) StrongLifts: "If you fail reps, we'll tell you to rest longer", automatic deload after several failed workouts with user-set thresholds. (https://stronglifts.com/app/, f) Starting Strength: "Stall detection and deload recommendations" for everyone. (https://aasgaardco.com/store/books-posters-dvd/apps/starting-strength-official-mobile-app/, f)
- Big five: Boostcamp's Auto Progression and Fitbod's algorithm exist but A4 documents no published rule; Alpha Progression publishes RIR-based recommendations (A4).
- JUDGEMENT: high value and the clearest match to the deterministic-engine rule: a published, testable rule is an asset, not a limitation. The "what it does not decide" sentence maps to Volyume's ED-safety posture: say plainly that training rules never read food or weight guardrails, and the reverse. Note: any rule that reduces training load must stay independent of the calorie floors.

**W-04. A session cut short has a defined path: carry the remainder to a planned workout.**
- Seen in: StrengthLog (2.3): on Save a popup offers to delete unfinished sets or "Move remaining sets to a planned workout", which then sits on the home screen to start, schedule, edit or delete. (https://help.strengthlog.com/help-article/unfinished-sets-exercises/, f; confirmed against the raw page text) Neighbouring behaviours: Motra asks "Log All Sets" or "Discard X Unlogged Sets" and discarded sets "cannot be recovered" (2.4); Liftosaur asks "Are you sure you want to FINISH this workout?" (2.1); Hevy saves only completed sets (A4).
- JUDGEMENT: high value if Volyume's finish path only drops or counts skipped sets. It fits the calm, no-shame voice (a short session is not a failure) and is deterministic. Open design question for the engine: whether carried sets count toward the week's volume landmarks; that must be decided as a rule, not left implicit. Medium cost.

**W-05. "Fail" and "Max reps" flags with stated record semantics.**
- Seen in: StrengthLog (2.3): a failed set's reps "will be added to your lifted weight and total volume, but not to any record lists"; max reps logs only the reps completed. (https://help.strengthlog.com/help-article/mark-sets-as-fails-or-max-reps/, f)
- A4 does not show it as a record rule: Hevy, Strong and Boostcamp have failure as a set type (A4 matrix A7) but A4 does not state its effect on records.
- JUDGEMENT: medium value. Cheap if the set model already has types; it matters for PR integrity and for any e1RM the engine derives.

**W-06. Context for gaps and a rating at save: calendar events and sleep and stress.**
- Seen in: StrengthLog (2.3): calendar events for "vacations, sickness, injuries" ("I will remember why I didn't workout for several weeks"); at save you can "rate a couple of parameters like sleep, stress, etc." (https://www.strengthlog.com/new-features-in-the-best-free-workout-tracker-app, 2023-05-10; https://help.strengthlog.com/help-article/how-to-record-a-workout/, f)
- A4 does not show it (Alpha's and Fitbod's recovery inputs are different).
- JUDGEMENT: medium to high value for an engine that interprets absence (deload versus detraining versus illness). The event is user-entered, so no inference is needed. Health-adjacent free text is Article 9 data: keep it local and inside the consent gate. Do not let an "injury" or "sickness" event feed anything weight- or food-adjacent without the ED-safety review.

**W-07. One edit rewrites the remaining unlogged sets.**
- Seen in: Motra (2.4): "Auto Update" (default) applies the same increment to later unlogged sets, never to logged ones, and can be switched off; users still report "Unintended Value Changes" in the help article. (https://help.motra.com/en/articles/11081434-updating-set-weight-reps-and-rest-time, f; https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10)
- A4 does not show it: Fitbod edits last for that workout; Setgraph repeats a logged set.
- JUDGEMENT: medium to high value; saves taps when the first set shows the real load of the day. Deterministic rule. Must be visible and reversible (Motra's own help treats surprise changes as a support topic).

**W-08. A whole set is one tap, and failure is the extra gesture.**
- Seen in: StrongLifts (2.25): on the phone "tap the red circles to mark your set completed", tap again to log fewer reps; on the watch "Tap the big circle one time. StrongLifts logs 5 reps and starts the rest timer. ... Each quick tap takes 1 rep off: 4, 3, 2, 1, 0." (https://support.stronglifts.com/article/111-apple-watch, f; confirmed against raw page text)
- Big five: tick-to-complete exists (A4 pattern 1); the novelty is that the tick logs the prescribed reps and weight with no field open.
- JUDGEMENT: medium value, and only for programme-first flows where the prescription is fixed. Pairs naturally with W-01.

**W-09. A column that cycles its content, and a target that stays pinned.**
- Seen in: Liftosaur (2.1): the second column header cycles Target, Previous Set, Plates, e1RM; Strive (2.34): "Pinned targets: See your goal every set". (https://www.liftosaur.com/features/workout-screen, 2026-09-27; https://strive-workout.com/, f)
- JUDGEMENT: medium value for narrow Android screens and large-text settings (Liftosaur ships a 12 to 24 text-size slider, 2.1): one column serves four jobs. Check against the accessibility rules before copying a cycling control.

**W-10. Lower the cost of arriving, and of leaving: rival CSV import, plain-text routines, typed shorthand.**
- Seen in: Liftosaur imports "Hevy as a CSV file" and exports JSON, CSV and programmes as text (2.1; https://www.liftosaur.com/features/import-export, f); HeavySet imports CSV "with presets for Strong, StrongLifts, and more" and exports routines as plain text (2.7; https://www.heavyset.app/, f); GymLoga takes `135x5x3` (2.36; https://github.com/GymLoga/GymLoga-Android, f); Gym Note Plus parses "bench 225lbs - 8,8,6" (2.37; https://apps.apple.com/us/app/gym-note-plus-fitness-journal/id6746699616, f).
- JUDGEMENT: high value for acquisition: importing a Hevy or Strong export is the single cheapest answer to "why would I switch", and it runs on-device with no outside party. A fixed-grammar shorthand line (GymLoga's) is parseable deterministically; Gym Note Plus's photo scan of handwritten pages is a different, ML-based thing (see W-20). Medium cost; the privacy and consent story is a plus (nothing leaves the device).

**W-11. The free-forever pledge, and the four ways free products fail.**
- Seen in: Strive's written pledge "What's free today stays free. I may add new advanced features to Pro, but I will never move existing free features behind a paywall" (2.34; https://strive-workout.com/, f). The failures: Gymshark Training removed from Android and frozen on iOS ("will no longer be updated", 2026-07-27, 2.5; https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app, 2026-07-27) after a forced re-login migration (https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320, 2025-06-25); RepCount sells "Exercise history from the workout screen" (2.2; https://www.repcountapp.com/pricing, 2026-09-12); Bodybuilding.com's merged app lost history for a user ("I switched over to BodyFit thinking that my workout history would come over and it didn't", 2.29; https://justuseapp.com/en/app/1389506691/bodyfit-fitness-training-coach/reviews, f); Motra deletes a pending upload after 14 days (2.4).
- JUDGEMENT: high strategic value for a product that is free by founder decision (D137): publish the no-regression pledge, keep export complete, and never strand local data in a migration. This is positioning and process, not code.

**W-12. Per-gym equipment profiles.**
- Seen in: Liftosaur ("Current Gym", per-gym lists, 2.1), MacroFactor Workouts ("Create gym profiles for each of the places you work out", 2.31), Motra's Gym Builder (generator limited to equipment you have, plus per-exercise custom weight increments, 2.4).
- A4 shows equipment profiles in Fitbod and Alpha but not per-gym switching.
- JUDGEMENT: medium value (home versus commercial gym is common on Android); small data-model addition; interacts with rounding (W-02).

**W-13. Wrist rep counting, and the universal correction loop.**
- Seen in: Motra, Garmin, COROS, Amazfit (2.4, 2.15, 2.38). Evidence on reliability: a peer-reviewed test of four Garmin models found "None of the devices met validity criteria across any exercise", error 3.0% to 67.5%, "manual counting should be utilized" (https://digitalcommons.wku.edu/ijesab/vol14/iss3/143, 2023); a T3 review calls Motra "not yet reliable enough to replace intentional logging" (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026); every wrist vendor offers edit-afterwards (2.15, 2.38).
- JUDGEMENT: low value to build; do not. The useful lesson is the correction loop, and the useful input is import: if Volyume ever reads wrist sessions through a platform health store, it needs a correction screen and a name-mapping step (Strava's name-matching problem, 2.17). Any new library is a dependency question for the founder.

**W-14. Hardware-only capture (Tonal, Tempo, WHOOP).**
- Seen in: Tonal's "next move?" prompt after 50% of reps; Tempo's camera weight recognition with stated limits; WHOOP's reps-before-the-set (2.18, 2.19, 2.14; table 3D).
- JUDGEMENT: not applicable to a phone logger. One cautionary transfer from WHOOP: a design that blocks editing after the set is processed drew public criticism for ten months (2025-05-17 to 2026-03-25 in one thread); a free logger should keep every set editable after the fact.

**W-15. The aggregation hub.**
- Seen in: Strava (2.17): 14 integrations, a workout log, muscle maps by working sets, "five new strength-specific sharing formats"; the per-exercise list "requires exercise names to match Strava's database". (https://press.strava.com/articles/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps, 2026-05-21; https://reddit.sentinel-team.org/posts/1v39e8f/snapshots/2026-07-23T07%3A38%3A40.428Z, 2026-07-23)
- JUDGEMENT: low to medium. A stable exercise taxonomy matters for any export. Sharing to a third-party network touches data minimisation and the Article 9 stance, so it would need to be explicit, opt-in and exclude body data; share cards already carry strict rules in CLAUDE.md.

**W-16. Rank, XP and strength standards.**
- Seen in: Liftoff (2.6): per-exercise rank against a global population, XP, levels, mascot; users say some exercises rank too high and rank "heavily weighs absolute weight over repetitions". Stronger (2.30): a Strength Score and standards "from Beginner up to World Class". Fitbod, Boostcamp and Caliber have Strength Scores too (A4), so standards are not wider-field-only; the rank-against-everyone loop is.
- JUDGEMENT: avoid the rank loop (comparison pressure conflicts with the calm, no-shame voice and with the ED-safety posture). If strength standards are ever shown, keep them private and optional. Low value, with a safety caution.

**W-17. A timer tray and conditioning formats usable mid-log.**
- Seen in: TrainHeroic (2.21; seven timers: Rest timer, Stopwatch, AMRAP, For Time, Tabata, Custom Interval, EMOM, collapsible "to review and log your set during rest", T4); StrengthLog special sets EMOM, Tabata, AMRAP (2.3); Liftosaur timed sets with `auto` chaining and a Get Ready countdown (2.1).
- JUDGEMENT: low to medium for a strength-first product; relevant only if conditioning blocks are in scope. The reusable idea is a timer that shrinks so the set row stays reachable.

**W-18. Weekly muscle-set ranges with colour, and an override multiplier.**
- Seen in: Liftosaur (2.1): default weekly range "10 to 12 sets", presets Novice 10-12, Intermediate 13-15, Advanced 16-20, green inside the range, yellow within 70% to 130%, red beyond; "Override Muscles" with a 0 to 1 multiplier per exercise. (https://www.liftosaur.com/features/week-insights, f; https://www.liftosaur.com/features/exercise-library, f)
- JUDGEMENT: medium value. Volyume's engine already works from volume landmarks (CLAUDE.md names MEV, MRV, MAV), so the contribution would be a display; use calm wording rather than red for "below range". The override multiplier is a clean, deterministic way to let users correct muscle credit.

**W-19. Lessons from the coaching platforms' athlete apps.**
- Seen in: TrueCoach (2.20), Everfit (2.23), TrainHeroic (2.21). Complaints: "Too many button clicks to enter workout results...Font choice and size ... too small" after a redesign (2021-10-08); "one exercise per screen...No autofill, I have to scroll to log my reps" and "The active and inactive buttons look almost identical" (2025-10); "previously logged workouts are being erased" (2023-11-22). Everfit's fix, autofill from the last session or from 1RM, shipped 2026-06-04. (https://apps.apple.com/app/id1439127794?see-all=reviews, f; https://apps.apple.com/app/id1438926364?see-all=reviews, f; https://apps.apple.com/us/app/id955074569?see-all=reviews, f; https://blog.everfit.io/everfit-may-2026-new-features, 2026-06-04)
- JUDGEMENT: medium value as a checklist: taps per result, readable result fonts, a visibly different completed state, autofill, and never losing a logged workout. These are cheap to test on a physical device.

**W-20. AI chat, photo and voice entry, and AI coaches.**
- Seen in: Starting Strength Official's "AI Coach" for "workout adjustments via chat" (2.26); Stronger's "AI routines" (2.30); SmartGym's "natural language workout creation" and on-device models (2.32); Motra's AI Coach and ChatGPT access through MCP (2.4); Liftosaur's MCP server so assistants can "create programs, log workouts" (2.1); Wellness Project's chat logging (2.37); Gym Note Plus's handwritten-page scan (2.37).
- JUDGEMENT: AI coaches and AI-written plans are barred by CLAUDE.md ("No AI. Ever.") and are not candidates. Read-only export so a user can point their own assistant at their own data is a separate question that is the founder's to rule on; photo scanning of a paper log is also a question for the founder, since the constitution is written about the coaching engine and says "If a feature seems to need AI: stop and ask."

**W-21. Floor and whiteboard models (TeamBuildr, SugarWOD, Wodify).**
- Seen in: TeamBuildr's tablet "Weight Room View" for 4+ athletes and a facility timer (2.22); SugarWOD's whiteboard, leaderboards, Rx-style scores and "Account Portability when changing gyms" (2.39).
- JUDGEMENT: low; they serve gyms and coaches. One transferable detail: portability language ("Your data is yours... pull it into a spreadsheet or a new system anytime") as a trust line.

## 5. What the wider field agrees on, where it splits, and what to take or leave

### 5.1 Agreements (each with its evidence)

1. **Completing a set starts the clock.** Liftosaur, Strive, Fitlist, Everfit and StrongLifts start rest on the completing tap; SmartGym's watch logs a set with the rest-timer button; Motra's first display slot always shows rest time or the alarm (2.1, 2.34, 2.33, 2.23, 2.25, 2.32, 2.4; https://www.liftosaur.com/features/rest-timer, 2026-09-27; https://strive-workout.com/, f; https://help.everfit.io/en/articles/4701773-client-app-turn-on-off-rest-timer, f). Exceptions are the products where the set is not a tap at all (WHOOP, Samsung, Strava; 2.14, 2.16, 2.17).
2. **Last time, or today's target, sits at the point of entry.** Liftosaur's Target and Previous Set column, Strive's "Last week's reps right there", Everfit's autofill (2026-06-04), HeavySet's suggested values, RepCount's prefill and "reminder of what you lifted last time", StrongLifts' prescribed circle (2.1, 2.34, 2.23, 2.7, 2.2, 2.25). The coaching platforms added it late and users complained first (2.23).
3. **Every wrist or sensor product needs an edit-afterwards step.** Garmin, COROS, Amazfit, Motra and Tempo all provide one; WHOOP's lack of it is the most criticised design choice in the set (2.15, 2.38, 2.4, 2.19, 2.14).
4. **Free tiers keep the log and sell analysis, wrist and history.** RepCount sells in-workout history, charts, supersets and CSV; Liftosaur sells watch, plates, graphs and lock-screen timer; Strive sells RPE, plans and widgets; StrengthLog sells RPE, programmes and statistics; Starting Strength sells plate math and rest timers (2.2, 2.1, 2.34, 2.3, 2.26). The lock-screen rest timer is a paid feature in three of the wider-field apps (Liftosaur, RepCount, Progression), where lane A4's loggers mostly include it free.
5. **Where progression is automatic, the rule is simple and written down.** Progression (top of range in every set, then +2.5 kg; two missed sessions, then 90%), StrongLifts (fail, rest longer; several fails, deload), Starting Strength (stall detection), Liftosaur (user-written scripts) (2.12, 2.25, 2.26, 2.1).
6. **Coach-platform logging is a form, and users judge it on taps and legibility.** TrueCoach 2021, Everfit 2025 and TrainHeroic reviews all name taps, font size, state contrast or lost data (2.20, 2.23, 2.21).

### 5.2 Where the field splits (no norm)

- Entry control: system keyboard (StrengthLog), custom keypad with steppers (Liftosaur) or copy and repeat keys (Strive), typed shorthand line (GymLoga, Gym Note Plus), swipe right to log a set (Motra), tap a circle (StrongLifts) (2.3, 2.1, 2.34, 2.36, 2.37, 2.4, 2.25).
- Where the prescription lives: in text the user writes (Liftosaur), in a coach's builder (TrueCoach, TrainHeroic, Everfit, Kahunas), in a generator (Motra, MacroFactor, Gymverse, Stronger), or nowhere (RepCount, Strive) (2.1, 2.20 to 2.24, 2.4, 2.31, 2.8, 2.30, 2.2, 2.34).
- What happens to unfinished work: carry to a planned workout (StrengthLog), log all or discard (Motra), ask only (Liftosaur), save completed only (Hevy per lane A4) (2.3, 2.4, 2.1).
- Who decides: rules (Progression, StrongLifts, Liftosaur code) versus AI chat or AI plans (Starting Strength Official, Stronger, SmartGym, Motra, Gymverse's "AI-optimized") (2.12, 2.25, 2.1, 2.26, 2.30, 2.32, 2.4, 2.8).

### 5.3 Android rating gap, as observed on 2026-10-06

Read from the US App Store (iTunes lookup or search) and Google Play search pages the same day; different populations, so this is a snapshot and not a controlled comparison. (https://itunes.apple.com/search?term=workout%20tracker&country=us&entity=software&limit=40, 2026-10-06; https://play.google.com/store/search?q=workout%20tracker&c=apps&hl=en&gl=US, 2026-10-06; https://play.google.com/store/search?q=gym%20log&c=apps&hl=en&gl=US, 2026-10-06; https://play.google.com/store/search?q=workout%20log&c=apps&hl=en&gl=US, 2026-10-06)

| App | App Store | Google Play | Gap (App Store minus Play) |
|---|---|---|---|
| Hevy | 4.92 | 4.9 | 0.02 |
| Strong | 4.86 | 4.3 | 0.56 |
| JEFIT | 4.76 | 4.4 | 0.36 |
| Gymverse | 4.85 | 4.3 | 0.55 |
| Liftoff | 4.83 | 4.8 | 0.03 |
| Stronger | 4.77 | 4.6 | 0.17 |
| StrengthLog | 4.9 | 4.7 | 0.2 |
| Strive | 4.90 | 4.8 | 0.10 |
| RepCount | 4.85 | 4.9 | -0.05 |
| Leap Gym Workout Planner and Log | 4.85 | 4.8 | 0.05 |
| FitNotes (lane A5) | none | 4.8 | n/a |
| GymRun (Imperon) | none | 4.4 | n/a |
| Yuri Koshiishi "Gym Workout Tracker & Log" | n/r | 4.9 | n/a |

OBSERVED: the three largest gaps are Strong (0.56 lower on Play), Gymverse (0.55) and JEFIT (0.36); Hevy, RepCount, Strive, Leap and the Android-only FitNotes sit at 4.8 to 4.9 on Play. The sources read give neither launch platforms nor reasons, so no cause is claimed. INFERRED, and weak: Android users rate some of the largest loggers materially lower than iOS users do, so a free Android-first logger is not competing against a uniformly polished Android field; whether the gap comes from timer and notification behaviour, from layout, from the user base or from something else is not established here.

### 5.4 Candidate list for the lead (JUDGEMENT, not evidence)

Value is my judgement of benefit to Volyume if the capability is absent today; cost is a rough size (S small, M medium, L large) with no code read; "constraint" names the CLAUDE.md rule most in play.

| Pattern | Value | Cost | Constraint in play |
|---|---|---|---|
| W-03 Published progression and deload rules in plain words | High | S to M | Deterministic engine; ED-safety independence |
| W-04 Unfinished sets carried to a planned workout | High | M | Calm voice; volume-landmark rule needed |
| W-01 Ask-on-tick popup for AMRAP, RPE and weight sets | High | S to M | None |
| W-06 Illness, injury and holiday events, save-time ratings | Medium to high | M | Article 9, ED-safety review |
| W-10 Import from Hevy and Strong exports, plain-text export | High | M | New-dependency gate if a parser library is wanted |
| W-02 Show the working for rounding and rest | High | S | None |
| W-07 One edit rewrites remaining unlogged sets (toggle) | Medium to high | S | None |
| W-11 No-regression pledge, full export, no stranded data | High | S (process) | Free product (D137), migration rules |
| W-12 Per-gym equipment profiles | Medium | M | Schema rule: additive, idempotent |
| W-09 Cycling column, pinned target | Medium | S to M | Accessibility rules |
| W-05 Fail and max-reps flags | Medium | S | Set-model change |
| W-18 Weekly set ranges with calm colours, muscle override | Medium | M | Calm voice (no red shaming) |
| W-17 Timer tray and conditioning formats | Low to medium | M to L | Scope |
| W-15 Aggregation and export to other networks | Low to medium | L | Data minimisation, Article 9 |
| W-13 Wrist rep counting | Low | L | Dependency gate; reliability evidence |
| W-14, W-21 Hardware and floor models | Not applicable | n/a | n/a |
| W-16 Rank, XP, strength-standard loops | Avoid | n/a | Calm voice; ED-safety posture |
| W-20 AI coach, AI plan, chat or photo entry | Barred | n/a | "No AI. Ever." |

### 5.5 Do-not-copy list, each with the failure that earned it

- AI coaches and AI-written plans: Starting Strength Official's chat coach, Stronger's "AI routines", SmartGym's natural-language creation (2.26, 2.30, 2.32). Barred by the constitution.
- Rank-against-everyone loops: Liftoff's users say rank "heavily weighs absolute weight over repetitions" (2.6).
- Locking a set after processing: WHOOP, open from 2025-05-17 to 2026-03-25 (2.14; https://www.community.whoop.com/t/strength-trainer-let-us-edit-sets-after-execution/1307, 2026-03-25).
- Silent deletion windows: Motra removes a pending upload "with no warning" after 14 days (2.4; https://help.motra.com/en/articles/14076038-workout-data-not-saving, 2026-08-10).
- Forced re-login migrations and merged-product history loss: Gymshark (2.5) and Bodybuilding.com (2.29).
- Charging for the one-tap history the user wants mid-workout: RepCount (2.2); it is the single paid item most often a reason to leave in the reviews read, and Volyume has no tier to put it in.
- A muscle map built from approximate inputs: "A muscle map generated from incomplete or approximate inputs looks informative. It is not." (https://the5krunner.com/2026/05/21/strava-strength-training/, 2026-05-21). If Volyume shows muscle credit, label it an estimate and let users correct it (W-18).

### 5.6 Ambiguities, collisions, conflicts and gaps

**Name collisions (nothing in the file is mixed across them).** Hercules (five products, 2.10); Fitlog (fifteen or more Android apps, 2.11); Liftoff (two apps, 2.6); GymRun (an Android diary and an unrelated App Store app, 2.9); Starting Strength (a paid legacy app and a free v2 app, 2.26); Gymaholic is lane A4's and not repeated here.

**Conflicts between sources.**
1. Motra and weight. Vendor help: "you'll see automatic rep and weight detection on your watch" (https://help.motra.com/en/articles/9980535-getting-started-with-motra, f); a T3 review: "Train/Motra does NOT detect weight" (https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch, 2026) and a store review of 2025-08-20 agree with the T3 view. Not resolved; the dossier reads weight as predicted, INFERRED.
2. Liftoff and the rest timer. One teardown lists a countdown timer with adjust and skip, another says no rest timer is mentioned (2.6). Not resolved.
3. Gymshark's Android removal date. The vendor article (2026-07-27) states the removal but no date; "12 March 2025" and "final build 2.54.0 on 3 December 2024" are from a search summary of third-party pages (2.5).
4. Strava's price. Strava's own pages read do not say; Notebookcheck's report says the new features are free (2.17).
5. Motra release dates. The vendor changelog and the App Store history differ by weeks for the same builds (2.4).
6. Samsung strength features. Official pages read have none; the feature list comes from community threads seen only as search summaries (2.16).

**Evidence gaps (UNKNOWN stays UNKNOWN).**
- Set-row anatomy is not established for RepCount, HeavySet, Gymverse, Gymshark, WHOOP, TrueCoach, TeamBuildr or Kahunas.
- Kill-and-resume is documented only indirectly (Liftosaur, Motra's watch recovery); no wider-field vendor states it plainly for the phone.
- Android behaviour is largely UNKNOWN: Google Play detail pages did not load (truncated), so Android evidence is vendor help or search pages. Wear OS appears only in Samsung's mode (T4), GymRun (T3) and the Garmin and COROS lines.
- User voice is store reviews, forum posts, one Hacker News thread and one Reddit-mirror snapshot; no live Reddit threads were read (section 0).

## 6. Sources

Every URL cited anywhere in this file, in order of first use, with the source's own date where the citation gave one (`f` = undated page, read 2026-10-06; "see text" = the date sits in the citing sentence, for example a search summary or a dated review inside the page) and the sections that cite it. 245 distinct URLs. Search-engine summaries are cited in the text as T4 and the URL listed is the page that was summarised, not a page that was read.

1. https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849 | f | cited in 2.1
2. https://github.com/astashov/liftosaur | f | cited in 2.1
3. https://www.liftosaur.com/features | f | cited in 2.1
4. https://www.liftosaur.com/features/workout-screen | 2026-09-27 | cited in 2.1, 4
5. https://www.liftosaur.com/features/exercise-library | f | cited in 2.1, 4
6. https://www.liftosaur.com/features/set-types | f | cited in 2.1, 4
7. https://www.liftosaur.com/features/timed-sets | f | cited in 2.1
8. https://www.liftosaur.com/features/supersets | f | cited in 2.1
9. https://www.liftosaur.com/features/equipment-and-gyms | f | cited in 2.1
10. https://liftosaur.com/ | f | cited in 2.1
11. https://www.liftosaur.com/blog/posts/liftosaur-overview/ | 2025-09-01 | cited in 2.1
12. https://www.liftosaur.com/features/rest-timer | 2026-09-27 | cited in 2.1, 4, 5.1
13. https://www.liftosaur.com/features/lock-screen-and-notifications | f | cited in 2.1
14. https://www.liftosaur.com/features/apple-watch | f | cited in 2.1
15. https://www.liftosaur.com/features/changing-a-workout | f | cited in 2.1
16. https://www.liftosaur.com/features/sharing-workouts | f | cited in 2.1
17. https://www.liftosaur.com/features/sync-and-offline | f | cited in 2.1
18. https://www.liftosaur.com/blog/posts/offline-mode-in-liftosaur/ | 2021-03-04 | cited in 2.1
19. https://www.liftosaur.com/features/first-run-and-settings | f | cited in 2.1
20. https://www.liftosaur.com/features/workout-history | f | cited in 2.1
21. https://www.liftosaur.com/features/week-insights | f | cited in 2.1, 4
22. https://www.liftosaur.com/features/import-export | f | cited in 2.1, 4
23. https://www.liftosaur.com/blog/docs/ | 2026-10-05 | cited in 2.1
24. https://www.liftosaur.com/about | f | cited in 2.1
25. https://news.ycombinator.com/item?id=34896643 | 2023-02-22 | cited in 2.1
26. https://www.liftosaur.com/features/premium | f | cited in 2.1
27. https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044 | f | cited in 2.2
28. https://www.repcountapp.com/ | f | cited in 2.2
29. https://www.repcountapp.com/features | f | cited in 2.2
30. https://www.appbrain.com/dev/Siper+Apps/ | see text | cited in 2.2
31. https://www.repcountapp.com/pricing | 2026-09-12 | cited in 2.2, 4
32. https://justuseapp.com/en/app/594982044/repcount-gym-workout-log/reviews | f | cited in 2.2
33. https://www.repcountapp.com/compare | 2026-09 | cited in 2.2, 2.30
34. https://support.repcountapp.com/ | f | cited in 2.2
35. https://intercom.help/repcount/en/collections/12878570-timer | see text | cited in 2.2
36. https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044?see-all=reviews | f | cited in 2.2
37. https://apps.apple.com/us/app/strengthlog-workout-tracker/id1434229662 | f | cited in 2.3
38. https://www.strengthlog.com/ | f | cited in 2.3
39. https://help.strengthlog.com/ | f | cited in 2.3
40. https://help.strengthlog.com/help-article/reorder-exercises/ | 2026-04-22 | cited in 2.3
41. https://help.strengthlog.com/help-article/how-to-record-a-workout/ | f | cited in 2.3, 4
42. https://help.strengthlog.com/how-to-use-the-timer/ | f | cited in 2.3
43. https://help.strengthlog.com/help-article/mark-sets-as-fails-or-max-reps/ | f | cited in 2.3, 4
44. https://help.strengthlog.com/help-article/plate-calculator/ | f | cited in 2.3
45. https://help.strengthlog.com/mark-a-set-as-done/ | f | cited in 2.3
46. https://help.strengthlog.com/help-article/drop-sets/ | f | cited in 2.3
47. https://help.strengthlog.com/how-to-activate-rpe-rir-in-your-workouts/ | f | cited in 2.3
48. https://help.strengthlog.com/help-article/special-sets/ | f | cited in 2.3
49. https://www.strengthlog.com/track-supersets-and-circuits-in-the-strengthlog-workout-app/ | 2024-01-18 | cited in 2.3
50. https://help.strengthlog.com/help-article/bodyweight-factors/ | f | cited in 2.3
51. https://www.strengthlog.com/?p=26542 | see text | cited in 2.3
52. https://www.strengthlog.com/workout-log-app/ | f | cited in 2.3
53. https://help.strengthlog.com/article-categories/when-working-out/ | f | cited in 2.3
54. https://help.strengthlog.com/help-article/retrieve-from-training-log/ | f | cited in 2.3
55. https://help.strengthlog.com/help-article/similar-exercises/ | f | cited in 2.3
56. https://help.strengthlog.com/help-article/train-again/ | f | cited in 2.3
57. https://www.strengthlog.com/new-features-in-the-best-free-workout-tracker-app | 2023-05-10 | cited in 2.3, 4
58. https://help.strengthlog.com/help-article/unfinished-sets-exercises/ | f | cited in 2.3, 4
59. https://help.strengthlog.com/help-article/the-home-screen/ | f | cited in 2.3
60. https://www.strengthlog.com/what-our-users-say-about-our-workout-log-app/ | f | cited in 2.3
61. https://www.motra.com/what-is-new | 2026-01-07 | cited in 2.4
62. https://apps.apple.com/app/id1548577496 | f | cited in 2.4
63. https://betakit.com/train-fitness-closes-2-5-million-usd-to-expand-automatic-workout-tracking-app-for-strength-training/ | 2023-06-21 | cited in 2.4
64. https://www.motra.com/ | f | cited in 2.4
65. https://help.motra.com/en/articles/9980535-getting-started-with-motra | f | cited in 2.4, 5.6
66. https://help.motra.com/en/articles/9911165-customizing-apple-watch-display | f | cited in 2.4
67. https://riven.fit/blog/best-automatic-rep-counter-apps-apple-watch | 2026 | cited in 2.4, 4, 5.6
68. https://help.motra.com/en/articles/11081434-updating-set-weight-reps-and-rest-time | f | cited in 2.4, 4
69. https://help.motra.com/en/articles/14076038-workout-data-not-saving | f | cited in 2.4, 4, 5.5
70. https://help.motra.com/en/collections/10026070-workouts-and-features | f | cited in 2.4
71. https://help.motra.com/en/articles/14076033-gym-builder | f | cited in 2.4
72. https://help.motra.com/en/articles/9698208-templated-workouts | f | cited in 2.4
73. https://help.motra.com/en/articles/10060175-unlocking-gains-progressive-overload | f | cited in 2.4
74. https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026 | 2026-10-06 | cited in 2.4
75. https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app | 2026-07-27 | cited in 2.5, 4
76. https://www.appbrain.com/app/gymshark-training-fitness-app/com.gymshark.fitness | see text | cited in 2.5
77. https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320 | f | cited in 2.5, 4
78. https://itunes.apple.com/search?term=workout%20tracker&country=us&entity=software&limit=40 | 2026-10-06 | cited in 2.5, 2.6, 2 (group intro), 5.3
79. https://apkmirror.com/apk/gymshark-ltd/gymshark-training-fitness-app/gymshark-training-fitness-app-2-32-0-release | see text | cited in 2.5
80. https://tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free | see text | cited in 2.5
81. https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563 | f | cited in 2.6
82. https://apps.apple.com/app/id1085414909 | see text | cited in 2.6
83. https://play.google.com/store/search?q=liftoff%20ranked%20gym%20workouts&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2.6
84. https://ventureradar.substack.com/p/this-gym-app-built-by-college-students | 2025-05-21 | cited in 2.6
85. https://screensdesign.com/apps/liftoff-ranked-gym-workouts/?vs=261657 | f | cited in 2.6
86. https://screensdesign.com/showcase/liftoff-ranked-gym-workouts | f | cited in 2.6
87. https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563?see-all=reviews | f | cited in 2.6
88. https://mwm.ai/ko/apps/liftoff-ranked-gym-workouts/6448081563 | f | cited in 2.6
89. https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310 | f | cited in 2.7
90. https://wellnessproject.ai/heavyset-for-android | 2026-09-27 | cited in 2.7, 2.37
91. https://apps.apple.com/us/app/heavyset-gym-log-1rm-tracker/id1171500310 | f | cited in 2.7
92. https://www.heavyset.app/ | f | cited in 2.7, 4
93. https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310?see-all=reviews | f | cited in 2.7
94. https://itunes.apple.com/lookup?id=1048454034&country=us | 2026-09-27 | cited in 2.8
95. https://play.google.com/store/search?q=GymRun%20workout%20tracker&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2.8, 2.9
96. https://gymverse.app/ | f | cited in 2.8
97. https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034 | f | cited in 2.8
98. https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034?see-all=reviews | f | cited in 2.8
99. https://apps.apple.com/app/id1048454034 | f | cited in 2.8
100. https://wellnessproject.ai/gymrun-for-iphone | 2026-09-27 | cited in 2.9
101. https://wellnessproject.ai/es/gymrun-for-iphone | 2026-09-27 | cited in 2.9
102. https://www.olmps.co/cases/hercules | see text | cited in 2.10
103. https://contra.com/p/k6rZPMoE-hercules | 2024-04-22 | cited in 2.10
104. https://apps.apple.com/app/id6478716222 | 2025-07-27 | cited in 2.10
105. https://apps.apple.com/au/app/hercules-strength-log/id6754724033 | f | cited in 2.10
106. https://hercules-gym.com/ | f | cited in 2.10
107. https://pdalife.com/workout-tracker-gym-trainer-android-a24095.html | 2016-10-18 | cited in 2.10
108. https://www.yourlifeupdated.net/android/app-del-giorno-android-bodybuilding-hercules-gratis-sul-play-store | 2016-07-13 | cited in 2.10
109. https://hercules-gym.com/blog/best-gym-tracker-apps-android-2026 | 2026-06-16 | cited in 2.10
110. https://play.google.com/store/search?q=fitlog%20workout&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2.11
111. https://play.google.com/store/apps/details?id=fit.log | see text | cited in 2.11
112. https://mwm.ai/apps/fitlog/6757781259 | f | cited in 2.11
113. https://itunes.apple.com/lookup?id=1090687896&country=us | 2026-09-05 | cited in 2.12
114. https://get-strong.app/ | f | cited in 2.12
115. https://get-strong.app/en/ | f | cited in 2.12, 4
116. https://apps.apple.com/us/app/-/id1090687896 | f | cited in 2.12
117. https://get-strong.app/blog/wann-deload-noetig-ist | 2026-08-11 | cited in 2.12, 4
118. https://itunes.apple.com/lookup?id=1227910528&country=us | 2018-04-07 | cited in 2.13
119. https://apps.apple.com/us/app/id1227910528 | f | cited in 2.13
120. https://itunes.apple.com/lookup?id=1602190236&country=us | 2026-08-06 | cited in 2.13
121. https://play.google.com/store/search?q=gym%20log&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2.13, 2 (group intro), 2.34, 5.3
122. https://apps.apple.com/us/app/-/id1602190236 | f | cited in 2.13
123. https://www.whoop.com/us/en/thelocker/how-whoop-measures-muscular-load/ | see text | cited in 2.14
124. https://support.whoop.com/s/article/Automatic-and-Manual-Activity-Detection | see text | cited in 2.14
125. https://www.whoop.com/us/en/thelocker/whoop-introduces-strength-trainer-becomes-first-wearable-to-measure-muscular/ | see text | cited in 2.14
126. https://www.community.whoop.com/t/strength-trainer-let-us-edit-sets-after-execution/1307 | 2025-05-19 | cited in 2.14, 5.5
127. https://www.community.whoop.com/t/strength-trainer-upgrades/15744 | 2026-08-05 | cited in 2.14
128. https://www.community.whoop.com/t/strength-trainer-feedback-rest-timer-workflow-progression-targets-notes-measurements-and-exercise-mapping/14544 | 2026-04-15 | cited in 2.14
129. https://www.community.whoop.com/t/feature-request-dynamic-island-timer-for-strength-trainer/16274 | 2026-09-18 | cited in 2.14
130. https://www.community.whoop.com/t/reps-tracking-and-exercise-swaps/7967 | 2025-09-08 | cited in 2.14
131. https://www.community.whoop.com/t/api-for-strength-trainer/10517 | see text | cited in 2.14
132. https://press.strava.com/articles/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps | 2026-05-21 | cited in 2.14, 2.17, 2.38, 4
133. https://support.whoop.com/s/article/How-to-Use-the-AI-Powered-WHOOP-Coach?language=en_US | see text | cited in 2.14
134. https://apps.apple.com/gb/charts/iphone/health-fitness-apps/6013 | 2026-10-06 | cited in 2.15
135. https://www8.garmin.com/manuals-apac/webhelp/forerunner965/EN-SG/GUID-66478414-4338-418E-9E0A-90162F21A62A-2265.html | see text | cited in 2.15
136. https://www8.garmin.com/manuals/webhelp/GUID-0221611A-992D-495E-8DED-1DD448F7A066/EN-AU/GUID-7C8D56F5-E9F5-4825-9F66-3CC9124B2979.html | see text | cited in 2.15
137. https://the5krunner.com/2026/04/20/garmin-connect-plus-review/ | see text | cited in 2.15
138. https://digitalcommons.wku.edu/ijesab/vol14/iss3/143 | 2023 | cited in 2.15, 4
139. https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-965/353939/strength-activity-profile-detects-the-wrong-exercise/1744119 | see text | cited in 2.15
140. https://www.techradar.com/features/why-garmins-strength-training-mode-needs-to-be-improved-or-scrapped | see text | cited in 2.15
141. https://www.samsung.com/au/support/mobile-devices/record-a-workout-on-samsung-watch/ | f | cited in 2.16
142. https://www.samsung.com/hk_en/support/apps-services/how-to-monitor-exercises-with-samsung-health/ | f | cited in 2.16
143. https://eu.community.samsung.com/t5/wearables/custom-workout-routine-for-galaxy-watch/td-p/5325181 | see text | cited in 2.16
144. https://us.community.samsung.com/t5/Galaxy-Watch/Watch-workout-stops-during-periods-if-rest-between-weight/td-p/2637205 | see text | cited in 2.16
145. https://www.gsmarena.com/samsung_health_app_update_new_galaxy_watch_features-news-73127.php | 2026-06-04 | cited in 2.16
146. https://r2.community.samsung.com/t5/Samsung-Health/Feature-Request-Optimizing-Samsung-Health-and-Watch-Ultra-for/m-p/22848226 | see text | cited in 2.16
147. https://9to5mac.com/2026/05/21/strava-adds-dedicated-strength-training-support-for-sets-reps-weight-and-muscle-groups/ | 2026-05-21 | cited in 2.17
148. https://apps.apple.com/us/charts/iphone/health-fitness-apps/6013 | 2026-10-06 | cited in 2.17, 2 (group intro), 2.38
149. https://support.strava.com/en-us/articles/15401547-strength-training | f | cited in 2.17
150. https://athletechnews.com/strava-strength-training-major-update/ | 2026-05-21 | cited in 2.17
151. https://support.strava.com/en-us/articles/15401529-muscle-map-for-strength-activities | f | cited in 2.17
152. https://the5krunner.com/2026/05/21/strava-strength-training/ | 2026-05-21 | cited in 2.17, 5.5
153. https://reddit.sentinel-team.org/posts/1v39e8f/snapshots/2026-07-23T07%3A38%3A40.428Z | 2026-07-23 | cited in 2.17, 3, 4
154. https://notebookcheck.net/Amazfit-joins-Strava-s-new-strength-training-ecosystem-new-features-free-for-everyone.1306179.0.html | see text | cited in 2.17, 2.38
155. https://www.tour-magazin.de/en/training/strength-training-on-strava-update-with-muscle-maps-and-training-log/ | 2026-05-28 | cited in 2.17
156. https://trailandkale.com/tonal-2-home-gym-review/ | 2026-05-04 | cited in 2.18
157. https://knowledge.tonal.com/s/article/Free-Lift | f | cited in 2.18
158. https://www.tonal.com/intelligence/ | f | cited in 2.18
159. https://knowledge.tonal.com/s/article/In-Workout-Controls | f | cited in 2.18
160. https://tonal.com/blogs/all/build-your-own-custom-workouts | 2026-10-06 | cited in 2.18
161. https://www.t3.com/reviews/tempo-studio | 2022-07-07 | cited in 2.19
162. https://tempo.fit/blog/the-new-metrics-system | 2021-01-12 | cited in 2.19
163. https://support.tempo.fit/support/solutions/articles/151000154718-weight-recognition-faqs | f | cited in 2.19
164. https://tempo.fit/blog/a-new-era-for-tempo | see text | cited in 2.19
165. https://support.tempo.fit/support/solutions/articles/151000154714-3d-tempo-vision-form-feedback | f | cited in 2.19
166. https://apps.apple.com/app/id1439127794 | f | cited in 2.20
167. https://help.truecoach.co/en/articles/2403707-the-truecoach-client-experience | f | cited in 2.20
168. https://apps.apple.com/app/id1439127794?see-all=reviews | f | cited in 2.20, 4
169. https://apps.apple.com/us/app/id955074569 | f | cited in 2.21
170. https://support.trainheroic.com/hc/en-us/articles/18156961923981-For-Athletes-Creating-Training-Sessions | see text | cited in 2.21
171. https://www.trainheroic.com/athlete/ | f | cited in 2.21
172. https://support.trainheroic.com/hc/en-us/articles/45097749410701 | see text | cited in 2.21
173. https://support.trainheroic.com/hc/en-us/articles/18156558387469-For-Athletes-Using-in-app-Timers | see text | cited in 2.21
174. https://apps.apple.com/us/app/id955074569?see-all=reviews | f | cited in 2.21, 4
175. https://www.teambuildr.com/mobile-app | f | cited in 2.22
176. https://www.freelapusa.com/teambuildr-the-company-and-the-tool/ | see text | cited in 2.22
177. https://support.teambuildr.com/article/2Mz1MesIhQ-what-is-weight-room-view | f | cited in 2.22
178. https://www.teambuildr.com/whiteboard-weight-room-tv-timing-system | see text | cited in 2.22
179. https://blog.teambuildr.com/posts/teambuildr-4-0-is-here | 2016-05-20 | cited in 2.22
180. https://apps.apple.com/app/id1438926364 | f | cited in 2.23
181. https://help.everfit.io/en/articles/5829094-client-app-track-a-workout | f | cited in 2.23
182. https://blog.everfit.io/everfit-may-2026-new-features | 2026-06-04 | cited in 2.23, 4
183. https://help.everfit.io/en/articles/4701773-client-app-turn-on-off-rest-timer | f | cited in 2.23, 5.1
184. https://apps.apple.com/app/id1438926364?see-all=reviews | f | cited in 2.23, 4
185. https://help.kahunas.io/en/articles/44-what-comes-with-the-app | f | cited in 2.24
186. https://coachway.io/articles/kahunas-review/ | 2026-10 | cited in 2.24
187. https://kahunas.io/ | 2026-10-06 | cited in 2.24
188. https://itunes.apple.com/lookup?id=488580022&country=us | 2026-10-05 | cited in 2.25
189. https://stronglifts.com/app/ | f | cited in 2.25, 4
190. https://support.stronglifts.com/article/111-apple-watch | f | cited in 2.25, 4
191. https://itunes.apple.com/lookup?id=1008697836&country=us | 2026-07-09 | cited in 2.26
192. https://itunes.apple.com/lookup?id=6753924510&country=us | 2026-09-15 | cited in 2.26
193. https://appfollow.io/android/starting-strength-official/com.shabu.startingstrength?country=us | see text | cited in 2.26
194. https://aasgaardco.com/store/books-posters-dvd/apps/starting-strength-official-mobile-app/ | f | cited in 2.26, 4
195. https://apps.apple.com/us/app/starting-strength-official/id6753924510?see-all=reviews | f | cited in 2.26
196. https://apps.apple.com/us/app/starting-strength-legacy/id1008697836?see-all=reviews | f | cited in 2.26
197. https://www.boostcamp.app/best/5-3-1 | see text | cited in 2.27
198. https://itunes.apple.com/lookup?id=1114435690&country=us | 2026-03-11 | cited in 2.27
199. https://apps.apple.com/us/app/5-3-1-workout-logger-531/id1114435690?see-all=reviews | f | cited in 2.27
200. https://itunes.apple.com/lookup?id=1560266240&country=us | 2025-08-01 | cited in 2.27
201. https://itunes.apple.com/lookup?id=962162633&country=us | 2026-09-29 | cited in 2.27
202. https://itunes.apple.com/lookup?id=1517032809&country=us | 2025-10-24 | cited in 2.28
203. https://www.boostcamp.app/best/gzcl | 2026-05 | cited in 2.28
204. https://justuseapp.com/en/app/1517032809/gzcl-method-workout-logger/reviews | f | cited in 2.28
205. https://support.bodybuilding.com/en-US/articles/bodybuildingcom-app-225629 | f | cited in 2.29
206. https://justuseapp.com/en/app/1389506691/bodyfit-fitness-training-coach/reviews | f | cited in 2.29, 4
207. https://en.wikipedia.org/wiki/Bodybuilding.com | f | cited in 2.29
208. https://itunes.apple.com/lookup?id=1389506691&country=us | 2026-08-03 | cited in 2.29
209. https://itunes.apple.com/search?term=gym%20log&country=us&entity=software&limit=40 | see text | cited in 2 (group intro)
210. https://play.google.com/store/search?q=workout%20tracker&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2 (group intro), 5.3
211. https://play.google.com/store/search?q=workout%20log&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2 (group intro), 2.35, 5.3
212. https://itunes.apple.com/lookup?id=1621719397&country=us | 2026-09-11 | cited in 2.30
213. https://play.google.com/store/search?q=stronger%20gym%20workout%20planner&c=apps&hl=en&gl=US | 2026-10-06 | cited in 2.30
214. https://www.strongermobileapp.com/ | f | cited in 2.30
215. https://www.strongermobileapp.com/blog/best-workout-tracker-apps | 2026-02-21 | cited in 2.30
216. https://itunes.apple.com/lookup?id=6737156524&country=us | 2026-10-03 | cited in 2.31
217. https://macrofactor.com/workouts/ | f | cited in 2.31
218. https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524?see-all=reviews | f | cited in 2.31
219. https://itunes.apple.com/lookup?id=922744883&country=us | 2026-09-16 | cited in 2.32
220. http://smartgymapp.com/ | f | cited in 2.32
221. https://help.smartgymapp.com/article/59-apple-watch-app | f | cited in 2.32
222. https://itunes.apple.com/lookup?id=696350076&country=us | 2026-03-27 | cited in 2.33
223. https://www.fitlist.com | f | cited in 2.33
224. https://itunes.apple.com/lookup?id=6449553638&country=us | 2026-10-02 | cited in 2.34
225. https://strive-workout.com/ | f | cited in 2.34, 4, 5.1
226. https://apps.apple.com/us/app/gym-log-strive/id6449553638?see-all=reviews | f | cited in 2.34
227. https://apps.appfollow.io/ios/gym-workout-tracker-log-wise/1662348638?country=us | see text | cited in 2.35
228. https://apps.apple.com/us/app/-/id6474732457 | see text | cited in 2.35
229. https://www.mydealz.de/deals/lifetime-vollversion-pumped-workout-tracker-gym-log-kostenlos-freebie-android-ios-2825736 | see text | cited in 2.35
230. https://apps.apple.com/app/id1465707550 | see text | cited in 2.35
231. https://apps.apple.com/us/app/fitness-logbook-workout-log/id1524503407 | see text | cited in 2.35
232. https://apps.apple.com/us/app/bench-gym-log-workout-tracker/id1608629087 | see text | cited in 2.35
233. https://itunes.apple.com/lookup?id=1479893244&country=us | 2022-09-29 | cited in 2.35
234. https://f-droid.org/packages/de.wger.flutter/ | 2026-10-05 | cited in 2.36
235. https://f-droid.org/packages/com.mbosse.gymloga/ | 2026-04-25 | cited in 2.36
236. https://github.com/GymLoga/GymLoga-Android | f | cited in 2.36, 2.37, 4
237. https://f-droid.org/packages/com.noahjutz.gymroutines/ | 2025-04-22 | cited in 2.36
238. https://alternativeto.net/software/hevy-workout-tracker | see text | cited in 2.36
239. https://apps.apple.com/us/app/gym-note-plus-fitness-journal/id6746699616 | f | cited in 2.37, 4
240. https://wellnessproject.ai/ | f | cited in 2.37
241. https://the5krunner.com/2020/05/20/coros-strength-training-workout-builder/ | 2020-05-20 | cited in 2.38
242. https://support.coros.com/hc/en-us/articles/48547231345684 | see text | cited in 2.38
243. https://support.ouraring.com/hc/lv/articles/42821224955795-Record-a-Workout-with-Oura | see text | cited in 2.38
244. https://www.sugarwod.com/athlete-features/ | f | cited in 2.39
245. https://appfollow.io/ios/wodify-athlete/1235645130?country=us | see text | cited in 2.39

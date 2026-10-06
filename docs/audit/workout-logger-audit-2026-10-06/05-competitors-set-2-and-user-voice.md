# Workout logger audit 2026-10-06: lane A5, the remaining loggers (set 2) and what users switch for (web research)

Lane A5 (web research, Sonnet). Round: audit only, nothing built. Research day: 2026-10-06; every "now" below means that day.
Founder order, verbatim: "We are not accepting just hevy and strong that's lazy look at many more".
Part 1 (sections 1 and 2): the remaining loggers, one dossier each. Part 2 (section 3): cross-cutting user voice, the main value of this lane: why people switch, the top complaints, the top delights, the fast micro-interactions, lock-screen and watch logging, design language.
Lane A4 covers Hevy, Strong, Fitbod, JEFIT, Boostcamp, Alpha Progression, RP Hypertrophy, Juggernaut AI, Caliber, Setgraph, Gymaholic, Dr. Muscle; lane A7 covers Liftosaur, RepCount, StrengthLog, Train Fitness (Motra), Tonal, Tempo, WHOOP, Garmin, TrainHeroic, Everfit and similar. Those apps get no dossier here, though users of them speak in Part 2.
Code: not read, not touched. Volyume is not discussed in this file; it is a competitor-and-user-voice file.

## 0. Method, evidence tags and limits

**Status of this section.** Written first, then amended at the end of the lane with the final reachability record (section 0.3) and counts. This file was written incrementally: header and method, then one dossier per app as soon as the app was researched, then Part 2 section by section, then the Sources list.

### 0.1 Citation form

A tag such as `[GV3 2026-09-29]` is a source ID from section 5 (the Sources list holds the full URL) plus the source's own date: its "updated" stamp, release date, post date or the date of the individual review or comment. `f` means the page carries no date, so the date is my fetch day, 2026-10-06. The ID prefix names the app: FN FitNotes, GB GymBook, LF Liftin', SL StrongLifts, KL KeyLifts, LY Lyfta, GV Gravl, GF GainFrame, SN SensAI, SW Simple Workout Log, SK Stacked, AW Apple Workout and Fitness, FT Google Fit and Fitbit, PL Peloton Strength+, LD Ladder, FU Future, TZ Trainerize, MF MyFitnessPal, AN Android-native rivals found in Play rankings, PF programme-first rivals of Boostcamp, X cross-app articles. A tag `U01` to `U99` is one dated user statement, listed in full in section 3A and resolved in section 5. Tags are local to this file; they are not the A4 tags.

### 0.2 Evidence tags and tiers

- OBSERVED: the source itself states it (vendor help centre, release notes, store listing, a hands-on write-up, a dated store review, a dated forum or Reddit post).
- CLAIM: a marketing assertion by a vendor about itself, or by a competitor about someone else.
- INFERRED: my reading of observed facts; labelled every time.
- UNKNOWN: looked for and not established. UNKNOWN is never a "no".
- USER: a dated statement by a user (store review, Reddit comment, Hacker News comment, forum post). Evidence of one person's experience, not of how the app behaves for everyone.

Tiers. T1: vendor help centre, changelog, store listing, vendor product page (authoritative for what the vendor says the app does). T2: independent hands-on write-up, dated store review, dated Reddit, Hacker News or forum post, vendor public feedback board. T3: competitor-published page (every "best app" listicle written by an app vendor ranks itself first, so a T3 page never carries a "no" on its own). T4: aggregator or search-engine summary, used only where the page itself would not load.

### 0.3 Reachability record (which sources could be read)

TO BE COMPLETED AT THE END OF THE LANE.

### 0.4 Limits, stated so nobody over-reads the file

TO BE COMPLETED AT THE END OF THE LANE.

<!-- GLANCE-TABLE-HERE -->

## 2. Part 1: per-app dossiers

Each dossier answers the ten points of lane A4: (1) active-workout screen anatomy, (2) set-entry mechanics, (3) rest timer, (4) mid-workout exercise management, (5) finishing, (6) resilience, (7) how it fits together, (8) praise, complaints and switching, (9) what is distinctive, (10) price and tier. Where an app teaches little about logging, the points collapse to those the sources support and the rest are marked UNKNOWN in one line, not padded.

### 2.1 FitNotes (Android, James Gay)

Snapshot. Android-only logger, first listed 16 Mar 2013; version 25.1, last updated 24 Oct 2025; 4.82 from 31,525 ratings; 1,000,000+ downloads; "Free to use, and no ads - ever." [FN1 2025-10-24]. The vendor homepage says "A clean, simple, powerful workout tracking app" [FN2 f]. The Play "What's new" shows only highlights: a dark theme and "Support for Android automatic backups" [FN1]. INFERRED from the listing dates and the review versions (v24.1 in mid-2024, v25.0 in mid-2025, v25.1 from Oct 2025): the app is maintained slowly, about two releases a year.
Name collision, affects every claim: two unrelated iOS apps use the name. "FitNotes 2 - Gym Workout Log" (Ginger Technologies Pte. Ltd., 4.57 from 569 ratings, build 14 of 9 Sep 2026) says it is "Based on the popular FitNotes app" and is a different developer [FN3 2026-09-09]. "FitNotes - Workout Tracker" (Evgeny Uralsky, 4.47 from 1,477 ratings, v3.4.2 of 11 May 2026) is a separate product [FN4 2026-05-11]. Nothing from those two is attributed to the Android original below unless a bullet says so.

**1. Active-workout screen anatomy**
- Day-based, not session-based. OBSERVED: "View and navigate daily workout logs quickly by swiping between them"; "Navigate to a specific day using the inbuilt calendar" [FN1 2025-10-24]. The listing text has no "start workout" step: whether one exists is UNKNOWN.
- Exercise block is a card the user can reorder: "long press an exercise card to initiate 'edit mode' and then press and drag the blue drag icon at the top right of the card" [FN1].
- While recording sets: "Swipe across when recording sets to view your workout history with the exercise"; "Attach comments/notes to sets" [FN1]. INFERRED from that sentence: history is one swipe from the entry screen. The layout itself was not seen.
- Previous performance: USER says "it remembers the last weight and reps I used" [P:fb2269e2 2024-06-12]. Whether it is a column, ghost text or a pre-filled value is UNKNOWN.
- Target or coach prescription: none in the listing. A routine day can add "an empty set for each exercise which can then be filled in later" ("Log All") [FN1]. USER, second-hand and unconfirmed by any vendor text: the paid version "will automatically add reps or weight to the bar depending on how you set it" [R:l3zygag 2024-05-14].
- Top bar, pinned bottom controls, overall layout: UNKNOWN. The vendor help URL returned 404 and the Android Authority review returned 403 [FN2 f, FN5 f].

**2. Set entry mechanics**
- Two exercise types: "Resistance - record training in weight and reps" and "Cardio - record training in distance and time" [FN1].
- The entry control (system keyboard, custom pad, steppers): UNKNOWN. No source read describes it.
- Tap cost, USER (3 stars, v25.1): "Add an exercise, takes 4 presses to get back to your workout. Can't delete more than 1 set at a time, and have to confirm each one, no swipe actions." [P:6995e61c 2026-08-30]. Moving between exercises costs a page change, per a user comparing it with Strive: "you have to go to another page to see other exercises for that workout" [R:mcoo8ow 2025-02-14].
- Set types: the listing names none (no warm-up, drop, failure). USER (v24.1): "there's no way to tell it not to count warm-up sets" in volume, and PRs are not recognised "on unweighted exercises" [P:b99bfef7 2024-05-24]. INFERRED: no warm-up flag as of mid-2024; a 2026 state is UNKNOWN.
- RPE or RIR: not in the listing: UNKNOWN. (The iOS clone "FitNotes 2" lists "RPE, RIR" and "Warmup sets", but it is another developer [FN3].)
- Notes: "you can add a note for each set or comment on the entire day" [R:l0brjoa 2024-04-19].
- Calculators, USER: plates "calculating the plates for your weight" free [P:f1c9ef06 2026-03-31]; "a plate calculator" [R:lv8tjk0 2024-11-03]; "estimates your 1RPM on a given workout" [R:msdnvtl 2025-05-15]; "goals, 1rpm calc" [P:ec1eb804 2026-07-13].
- Categories: an exercise sits in one category only: "you can't put an exercise into multiple categories" [P:b99bfef7 2024-05-24]; the same wish in 2022 [P:8e756288 2022-04-15].
- Units, bar weight, bodyweight and assisted loads: UNKNOWN.

**3. Rest timer**
- OBSERVED: "Rest timer with sound and vibration options"; the app requests "Prevent device from sleeping" to "ensure the rest timer continues to count down when the screen is off" [FN1].
- Auto-start, USER: it can be set "to automatically start when you mark a set as completed or you can manually start it every time" [R:l5amd7c 2024-05-23]; "When I log my set in FitNotes, it automatically starts a rest timer that beeps at me" [R:o77sx6l 2026-02-24]; "the rest timer with alarm" [P:9fa5202c 2024-08-31].
- Per-exercise default, adjust while running, skip: UNKNOWN. Notification or lock-screen surface, Live Activity equivalent, Wear OS: UNKNOWN; no source describes one. A Garmin user logs on the phone and uses the watch only for set timing [R:mua7tul 2025-05-26].

**4. Mid-workout exercise management**
- Add and create: "Add new exercises quickly using 'Save and New'"; custom categories "e.g. Olympic Lifts, Plyometrics, Ab Training"; default categories "Chest, Back, Legs" each with "a small default list of exercises" [FN1].
- Reorder: long-press edit mode (point 1). Replace and remove an exercise: UNKNOWN.
- Supersets, USER: "you can link together supersets so it jumps between them when you mark a set complete" [R:lv8tjk0 2024-11-03]; another user found them "hard to find and utilize" [P:fb2269e2 2024-06-12].
- Instructions or video: none. USER: "I only wish I could add pictures or something to visualize each type of exercise like other apps do" [P:be1dd64b 2025-07-30].
- History in one tap: swipe on the entry screen [FN1]. PR hints while logging: PR tracking exists per users ("I love watching my personal records (weights or reps) each time I work out" [P:3412d90f 2026-05-13]); an in-workout PR alert is UNKNOWN.

**5. Finishing**
- No summary screen is described anywhere read. USER: "straight checkmark todo list of workouts and a rest timer ... it doesn't involve any streaks/goals etc. Just simple stats." [R:obwlzfo 2026-03-22]. Sharing is text: "copy a full workout into text and send it to someone" [R:m0zdhy7 2024-12-08]; "a text summary that I can copy to the activity" [R:m6y8a9e 2025-01-13].
- Calendar: "Dates on which you have recorded training logs are highlighted"; a filter such as "Highlight days where I did bench press and lifted more than 80kg for at least 5 reps" [FN1]. Skipped sets: UNKNOWN.

**6. Resilience**
- Offline, no account: "offline, no social media, best calendar history" [R:mcoo8ow 2025-02-14]. The listing's permissions are storage, vibration and wake lock only [FN1].
- Backup and export: device storage, Dropbox or Google Drive; CSV export; Android automatic backups [FN1 2025-10-24].
- No built-in cross-device sync: a search summary of the Android Authority review says "There's no cloud sync" (T4) [FN5 f]; a 2026 review says keeping exercises and sessions "synched between my devices is nearly impossible" [P:971d37a8 2026-07-23]. A 2026 comment says the paid upgrade "lets you sync because I lost my phone and all old data was gone so now it will be saved" [R:oo3i4au 2026-05-27]. INFERRED: the paid tier adds backup or sync; its scope is UNKNOWN.
- Resume after the app is killed, mid-session autosave: UNKNOWN.

**7. How it fits together**
- Surfaces named in the listing: daily log, calendar, routines with named days ("Monday, Chest Day, Workout A"), exercise database, body tracker, graphs. Routines: "Create as many routines as you want and switch between them using dropdown list"; "Remembers which routine you selected last" [FN1, FN2].
- Copying: "copy workout from the previous week and reuse them" [P:8f32ac88 2026-04-22]; but "Copying previous workouts or setting up a routine is a mess" [P:6995e61c 2026-08-30].
- Onboarding: none; users disagree on the learning curve. "surprisingly intuitive to use without need for a tutorial" [P:9b997810 2026-05-17]; "It takes like a day to get used to" [R:msdnvtl 2025-05-15]; "UI can be a little tricky to navigate" [P:f1c9ef06 2026-03-31].

**8. Praise, complaints, switching** (all USER)
- Praise, the same three words recur: free, no ads, simple. "no ads, no unnecessary features, lightweight, simple UI" [P:ef9b948f 2026-06-25]; "there is NO PAYWALL for graph progression" [P:8a57363e 2026-07-06]; "doesn't try to integrate with all your devices and apps ... doesn't coach you or make exercise recommendations ... super efficient at planning a workout and recording your weights and reps" (77 helpful votes) [P:b4a06df4 2024-04-16]; "I've used this app literally for 6 years and never thought to write a review because it has just worked flawlessly" (37 votes) [P:9fa5202c 2024-08-31]. Users pay to support the developer: "I'm trying to find where to donate to this creator!" [P:ec1eb804 2026-07-13]; "premium version for a very reasonable one time payment instead of an insane fee or a subscription ... the app doesn't collect any of my data" [P:c7df3079 2026-06-29].
- Complaints: dated look, "FitNotes UI just isnt good" [R:nkal2n6 2025-10-19]; "Some parts of the UI feels clunky" and a locked exercise type that cannot be changed after the fact [R:novitqv 2025-11-14]; four presses to return to the workout and no swipe actions (see point 2); no sync (point 6); "it's old and just workouts" per a hybrid-athlete app author [R:pb83m18 2026-09-21].
- Switching away: to Hevy for the rest timer or the watch: "Hevy, nutze nur noch Hevy. Davor Fitnotes" ("I only use Hevy now. Before that FitNotes") with Hevy's rest-timer as the reason (German, translation mine) [R:oqnp6qe 2026-06-09]; "only just switched to using Hevy from Fitnotes. Liking the app and the Apple Watch integration" [R:l2cps8b 2024-05-03]; to Strive: "random log-outs made me switch to Strive" (from Strong, having left FitNotes first) [R:mcoo8ow 2025-02-14]; "Thinking of switching from FitNotes, but FN has Apple Watch integration and I don't need to bring my phone along in the gym" (on a Boostcamp request thread, 2024) [R:kpzmeg0 2024-02-11].
- Switching to it: "I had been using the original FitNotes for a while and am now using GymBook" for the Apple Watch and Health integration (iPhone user) [R:kibiiiw 2024-01-17].

**9. Distinctive**
- Free, ad-free, no account, with a cheap one-time premium and the developer treated as someone to pay: [FN1, P:ec1eb804 2026-07-13, R:l5amd7c 2024-05-23].
- A calendar that doubles as a query tool ("days where I did bench press and lifted more than 80kg for at least 5 reps") [FN1].
- "Log All" turns a routine day into empty sets to fill in [FN1]; routines remember the last one chosen [FN1].

**10. Price and tier.** Android original: free, no ads; a one-time premium exists, reported by users as "very cheap" and "like $10 usd" for lifetime [R:l5amd7c 2024-05-23, R:oo3i4au 2026-05-27]; the vendor listing text read states no price [FN1]. The iOS clone "FitNotes 2": free for up to 12 saved workouts, then a lifetime purchase or subscription [FN3 2026-09-09]; one user paid "like $40" for its lifetime tier [R:p7znsi7 2026-09-05].

### 2.2 GymBook (iOS only, Appwise GmbH)

Snapshot. iPhone, iPad and Apple Watch; first released 22 May 2013; 7.1.8 released 30 Sep 2026 (iOS 27 and watchOS 27 support, six new Zercher exercises); 4.79 from 2,431 US ratings; free with in-app purchases [GB1 2026-09-30]. "Is there a GymBook app for Android? Unfortunately not. As of today, GymBook is an iOS-only app." [GB3 f]. The listing's stance: "GymBook is developed by gym experts, for gym experts. Therefore it focuses on YOUR workouts and provides only example workouts" [GB1]. Release cadence read from the store page: 7.1.0 (2 Aug), 7.1.1 (9 Aug), 7.1.2 (22 Aug), 7.1.3 (29 Aug), 7.1.4 (5 Sep) and four compatibility builds in September 2026 [GB4 2026-10-06, via the fetch tool].

**1. Active-workout screen anatomy**
- There is no start button: "workouts are started implicitly by starting to log sets" [GB3 f]. A workout is a list of exercises "grouped and sorted" by the user, each with planned sets, weight and reps [GB1].
- The listing names three in-workout surfaces: "The workout screen immediately shows a detailed overview about today's workout"; "The innovative 'Workout Matrix' gives you always a detailed overview about your current workout"; a progress bar [GB1 2026-09-30, GB2 f]. What the matrix looks like is UNKNOWN (no screenshot or review describes it).
- Previous performance: "Immediately see how you did last time" and "Quickly access logs from within a workout, including the graphical statistics" [GB1].
- Prescription or target: the user plans "the sets, weight and reps you want to perform" per exercise [GB1]; no coach. An optional Pro "Assistant" (listed at $3.99 as a single purchase) is described as keeping "workout focus and progressive strength" [GB2 f, GB4]; its behaviour is UNKNOWN.
- Pinned bottom controls: UNKNOWN.

**2. Set entry mechanics**
- Entry is wheel pickers, not the keyboard: "Use the pre-filled picker views for fast logging and Quick-Log for super fast logging" [GB1]. What Quick-Log does is UNKNOWN.
- The wheel is the most repeated complaint in the reviews read. "Could you guys please add the ability to type in the weight instead of having to scroll the number wheel? ... if we are using the same weight for our sets, could you add a feature where the previous weight used just passes over to the new set that was just completed?" [A:13894602298 2026-03-27]; "Scrolling by 1 lb is annoying. Can you add a feature to type weight?" [A:12940553169 2025-07-26]; "Most weights I have move up in increments of five. The app has it in 1 lbs ... you have to scroll for a minute" [A:14226130276 2026-06-25]. Three separate users, 2025 to 2026: OBSERVED as reports, not a measured tap count.
- Auto-advance: "Move automatically to the next exercise of your workout after saving a log (configurable)" [GB1].
- Set variants: "Define different settings for your sets of an exercise (e.g. for warm up sets or pyramid training)" [GB1]; 7.1.3 "refined warm-up/cool-down set markers" [GB4]. Supersets: "Add the exercises (and their sets) you want to have in a superset into the same group" [GB3]. RPE, RIR, plate or 1RM calculator: not in the listing or FAQ: UNKNOWN.
- Notes: "Note-taking with free text and emoji support" [GB2 f]. Weighted bodyweight: one user lost then regained "adding weights from push ups and pull ups" in 2025 [A:13144361644 2025-09-16].

**3. Rest timer**
- "Time your rests with the adjustable timer which also works when you set your device to sleep or close your app": configurable duration, "a primary and a secondary timer (even specific to an exercise)", classic or graphical timer, different sounds [GB1]. The FAQ: the primary timer "is supposed to be used as rest timer between sets" [GB3].
- Auto-start is listed under Pro: the site's Pro list names a "Super Timer" with a secondary timer, set-based timing, graphical display, custom sounds and auto-start (paraphrase of the fetch-tool summary) [GB2 f, CLAIM]. The single "Timer+" purchase is listed at $3.99 [GB4].
- 7.1.4 (5 Sep 2026): timer sounds now play at media volume and a "None" sound was added; 7.1.2 (22 Aug 2026): a timer freeze bug was fixed (both paraphrased by the fetch tool) [GB4]. INFERRED: timer reliability was an open problem until late summer 2026.
- Lock screen: "Live Activities show your current workout right on your Lock Screen or on your Dynamic Island" [GB1]; what the Live Activity lets you do (tap to log) is UNKNOWN. Apple Watch: a standalone watch app; a user "was looking for an app that would allow me to add custom routines to use standalone on my watch" and found it here [A:13280355062 2025-10-17]; entering a workout starts a "Traditional Strength Training" session on the watch [GB3]. A user wants a smart-stack widget for the watch [A:13321968883 2025-10-27].

**4. Mid-workout exercise management**
- 50+ exercises with "animated images and visualizations of the affected primary and secondary muscle groups" free, 400+ with Pro; custom exercises incl. cardio and stretching; "Add a photo to your exercises" [GB1, GB2 f].
- Change the routine mid-workout works per a user ("allows me to change my routine mid-workout") [A:14282274421 2026-07-09]. Exercise swap: 7.1.1 lists "exercise swap preparation", INFERRED as not yet shipped on 9 Aug 2026 [GB4].
- Exercise history and graphs: reachable from within a workout [GB1]. PR hints while logging: UNKNOWN.

**5. Finishing**
- "After completing a workout, a summary shows your performance as well as your heat map and lets you analyze your progress compared to last time" [GB1]. Saved to Apple Health and Strava (7.1.2 note, paraphrased by the fetch tool: the Strava export now carries exercise details) [GB1, GB4].
- Unfinished workouts, USER: "If you don't complete the workout it won't save it. I constantly forget to manually click compete and my logs getting deleted after 12AM. Very inconvenient." (the reviewer later wrote "thanks for clarifying") [A:12754758088 2025-06-09]. 7.1.1 lists "Midnight workout support" [GB4]. INFERRED: an unfinished workout was discarded at midnight on at least one 2025 build; the current rule is UNKNOWN.

**6. Resilience**
- Sync is manual: "backup on iPhone via Settings, then restore on iPad" [GB3]. USER: "does not sync across devices unless you export and import on another device and then back again" [A:14449678998 2026-08-19]; the iCloud auto-backup dropped the last set of a group session (2026-04) [A:14000107230 2026-04-26]; timezone move broke log display [A:12323753700 2025-02-17].
- Local-first by design: "100% Privacy with no data collection, subscriptions, or ads" [GB2 f, CLAIM]. A 2026-04-08 report after an update: it "will not enter new logs for exercises in my workouts" (2 stars) [A:13935521049 2026-04-08].

**7. How it fits together**
- Surfaces named: Log and History tabs ("The log and history tabs are a great way to track and see your progress") [A:14000107230 2026-04-26], workouts, exercises, statistics, body measurements; 9 designs and 13 app icons (Pro) [GB2, GB1].
- Onboarding: none to speak of. "needs better and more tutorials on how to use it" [A:12299032673 2025-02-11]; "a full tutorial for brand new individuals" [A:13521248733 2025-12-16]. One reviewer wants the app to open on a tappable body model [A:14256679191 2026-07-02].

**8. Praise, complaints, switching** (USER)
- Praise: price model above all. "No subscription only 17 bucks once and thats it. Totally worth it." [A:14360447640 2026-07-28]; "It seems like every single simple app now requires a subscription to make it usable and not bombarded with ads." [A:14380504039 2026-08-02]; "No gross social feature" [A:14015178350 2026-04-30]; "I've been using GymBook since 2015, and it's given me everything I've ever needed in a logger." [A:13989214732 2026-04-23].
- Complaints: the number wheel (point 2); sync (point 6); upsell pressure ("Very annoying pop ups prompting for add ons." [A:12411573113 2025-03-12]; "I don't like being surprised into paying ... $8 - $10" [A:12472273908 2025-03-27]); a 2026 reviewer who calls the UI "poorly designed" and wants a body-model entry [A:14256679191 2026-07-02]; "All of the updates are worthless for me" [A:14271902280 2026-07-06].
- Switching in: from JEFIT on price: "ever since they changed their subscription pricing I wasn't willing to pay monthly for a simple gym log app, and their free tier limits custom exercises to only 7" [A:13236781446 2025-10-07]; from FitNotes for the watch: "I had been using the original FitNotes for a while and am now using GymBook. It has Apple Watch/Health integration" [R:kibiiiw 2024-01-17].

**9. Distinctive**
- One-time pricing treated as the product's identity: "GymBook has always offered, and will always continue to offer, a lifetime one-time purchase option" (my punctuation; the FAQ uses dashes) [GB3 f].
- No start step; Workout Matrix overview; a standalone watch app; pick-by-wheel logging; nine themes in light and dark [GB1, GB3].

**10. Price and tier.** Free tier unlimited workouts, custom exercises, Watch app, Live Activity, heat maps. In-app purchases listed 6 Oct 2026 (read through the fetch tool): Pro Lifetime $22.99, Pro Yearly $8.99, Pro Monthly $1.99, Platinum Package $17.99, Gold Package $12.99, "+Exercises" $5.99, Export $3.99, Assistant $3.99, Cloud $3.99, Timer+ $3.99 [GB4]. Reviewers quote other figures at other dates ($8.99 in Feb 2025, "$5.99" one-time in Oct 2025, "17 bucks" in Jul 2026), so INFERRED: the bundles were repriced over time [A:12315613102 2025-02-15, A:13280355062 2025-10-17, A:14360447640 2026-07-28]. Volyume is free; GymBook gates Cloud, Export, Assistant, Timer+, more exercises and themes behind purchases.

### 2.3 Liftin' (iOS only, Valter Hemmi)

Snapshot. iPhone, iPad, Mac and Apple Watch; store "first release" date 2 May 2019 (a reviewer claims ten years of use [A:14057224542 2026-05-12], so that field may not mark the app's origin); 53.0.4 released 5 Oct 2026, needing iOS 26; 4.74 from 765 US ratings [LF1 2026-10-05]. A different product, "Liftin: Show Up. Get Strong." (Liftin App Inc.), shares the name and is not covered [LF1 note]. Notes of 53.0.4: "Liftin' in ChatGPT and Claude: ask about your progress, or build and edit your programs, from the AI assistant you already use"; "the sets on the workout screen have a new look. Your next set is bigger and clearer, on iPhone, Apple Watch and in the Live Activity"; "All-new Watch sync, rebuilt from the ground up for improved speed and reliability" [LF1]. The developer answers users himself: "the developer has been highly engaged on support and Reddit" [A:13697371457 2026-01-31].

**1. Active-workout screen anatomy**
- The one detailed statement is the 53.0.4 note: the current set is enlarged ("Your next set is bigger and clearer") on phone, watch and Live Activity [LF1 2026-10-05]. Everything else about the layout is UNKNOWN from vendor text. A user: "Design reminds Fitness app" [A:14502656722 2026-09-02]; "feels like an apple developed app" [A:13232418119 2025-10-06].
- Quick edit: "Long press on a set to make quick adjustments on the go" (2020 build) [LF3 2020-09-18].
- Previous performance and prescription: auto-progression sets the next target weights (point 2). How previous values display: UNKNOWN.

**2. Set entry mechanics**
- Feature list on the vendor page: warm-up calculators, rest timers, custom equipment, supersets, drop sets, rep ranges, AMRAP, RPE tracking, one-rep-max calculations, training max, notes, plate calculator (a user: "The plate calculator is super useful (I've often needed a separate app for this with other apps I've used)" [A:13182418151 2025-09-25]) [LF2 f].
- Auto-progression is the signature: "Automatically increase weights on success" and "Automatically decrease weights on failure", "full customization" [LF2 f, CLAIM]. USER confirms: "progression options and deloads for failures that are customizable" [A:14061718204 2026-05-13]; "increases the weight or reps after a certain number of successful session" [A:13986485945 2026-04-22]. A user asks for "dynamic double progression" [A:13827554089 2026-03-08]; another for weight suggestions based on the last workout [A:13008353579 2025-08-12].
- Keyboard versus pad versus steppers: UNKNOWN.

**3. Rest timer, lock screen, watch**
- USER: "Start a workout on your phone? Instantly starts and syncs with your Apple Watch. Lock your phone screen? The Live Activity lets you mark sets as complete and watch rest timers without having to unlock your phone." [A:13830020878 2026-03-09]. 52.0 and 52.0.1 (11 and 12 Sep 2026) are summarised by the fetch tool as an enhanced Lock Screen and Dynamic Island and a richer Live Activity with illustrations [LF4 2026-10-06, paraphrase]. Action Button on Apple Watch Ultra is supported [LF2 f].
- Watch: "I use the Apple Watch app and leave my phone behind. The watch app lets me track my reps, weight, and rest time." [A:13986485945 2026-04-22]. Failure reports: "The two constantly come out of sync ... the workout is still running a day later on the watch" (1 star, v52.0.1) [A:14592937205 2026-09-25]; a heart-rate timer glitch on the watch was fixed months earlier [A:14492259351 2026-08-30]. INFERRED: watch sync was a weak point, which is what 53.0's "rebuilt from the ground up" targets.

**4. Mid-workout exercise management**
- Exercise animations and a form guide with a linked video per preconfigured exercise [A:14129570346 2026-05-31, A:12864510423 2025-07-07]; 51.9 (29 Jul 2026) added 50 exercises (paraphrase) [LF4]. Switch suggestions: "suggestions for switching exercises in the same muscle group" [A:13132813960 2025-09-13]. Add or edit exercises and equipment [A:14061718204 2026-05-13].
- AI generation arrived with 52.0 (11 Sep 2026): the fetch tool quotes the note as "Generate a single workout, a routine, or a full program" [LF4]. NOTE for the engine rule: this is a competitor using an AI feature; it is recorded as fact only.

**5. Finishing**
- 51.8 (19 Jul 2026): workout summary image export and Strava sync with heart rate and set data (paraphrase of the fetch-tool table) [LF4]; Apple Health and Activity Rings [LF1]. A user could not get a first workout into Apple Fitness until support helped [A:14052945145 2026-05-11].
- Calendar caveat: the progress calendar "only shows the last workout session that you did that day" when there are three sessions [A:14492259351 2026-08-30].

**6. Resilience**
- "Everything is tracked locally. There's no account you have to create. Integrates perfectly with Apple Health. iCloud sync keeps everything in sync and backed up." [A:13830020878 2026-03-09]; "does not collect any data" [A:13232418119 2025-10-06]. Note-editing regression in 45.9 (2 stars) [A:13402302872 2025-11-15]. Resume after kill: UNKNOWN.

**7. How it fits together**
- Built-in programmes (5x5, Wendler, nSuns) [LF2 f]; a Mac app that "syncs to iPhone and Apple Watch" [A:14053123554 2026-05-11]; import from Strong and Hevy: "you can import both Hevy and strong data easily" [A:14052945145 2026-05-11]. Onboarding: "within 10-15 minutes my wife and I signed up" [A:12694623124 2025-05-24]; "it takes a bit of time to setup your workout how you'd like" [A:12956453543 2025-07-30].

**8. Praise, complaints, switching** (USER)
- Praise: the developer, privacy, design, watch, auto-progression. "The developer is extremely quick to make fixes" [A:13755437276 2026-02-16]; "no social nonsense or ads" [same]; "Support is mind blowingly amazing where bugs are resolved in real time" [A:13143732376 2025-09-16].
- Complaints: watch sync (above); calendar shows one session a day; Strava lacks heart rate on some builds [A:13955157570 2026-04-13]; two reviewers single out AI routine suggestions as a plus ("AI exercise routine suggestions, its amazing") [A:13708623912 2026-02-03, A:13132813960 2025-09-13].
- Switching in: "I switched from Strong to Liftin and wow it is SO much better. It's so easy to customize workouts, including supersets and warm up sets." [A:13474774764 2025-12-04]; "Have used many workout apps over the years with Strong most of those years, but then stopped getting updated and the newer version was not ideal. Then tried Hevy ... lots of little oddities. Then saw someone mention Liftin" [A:13143732376 2025-09-16]; "I was looking for an app to support more customization options than SL and still have the Apple watch" [A:14206092837 2026-06-20]. Discovery is by Reddit: "I saw Liftin posted on Reddit" [A:13015893842 2025-08-14].

**9. Distinctive**
- Rules-based auto-progression with failure deloads, on phone and watch [LF2, A:14061718204 2026-05-13]; a Mac app; one developer who answers users; AI-assistant integration (ChatGPT and Claude) and AI workout generation added in September 2026 [LF1, LF4].

**10. Price and tier.** Free: up to five workouts a month. Unlimited: Monthly $2.99, Yearly $24.99, Lifetime $99.99 [LF4 2026-10-06, via the fetch tool]; the vendor page says website signups get a 3-month trial against 1 month standard [LF2 f, CLAIM]. Reviewers praise the lifetime option: "having a lifetime membership is a MUST in this day and age" [A:12864510423 2025-07-07].

### 2.4 StrongLifts (iOS and Android, StrongLifts Limited)

Snapshot. Programme-first logger built around the 5x5 barbell programme (Madcow and an intermediate programme also offered [SL4 f]). iOS 4.4.0 released 5 Oct 2026, 4.86 from 76,797 ratings [SL1 2026-10-05]; Google Play 4.27 from 101,287 ratings, 1,000,000+ installs, version 4.4.1 updated 2 Sep 2026 [SL2 2026-09-02]. 4.4.0 notes: "A new home screen. Change the date, workout, weights and schedule right from your workout card" and "A rebuilt Apple Watch app. New workout screens, Digital Crown controls, complications and a Smart Stack card" [SL1]. The listings as read on 6 Oct 2026 say "StrongLifts is free to download, but requires a subscription to use. All new users get a 7-day free trial for the yearly plan." [SL1, SL2]. That change is the dominant fact in the user voice (point 8): of the 150 most recent US App Store reviews (30 May to 3 Oct 2026) 108 are one star and 92 mention a subscription, paywall, "Power Pack" or "lifetime" [SL12, my count over the fetched feed pages].

**1. Active-workout screen anatomy**
- The set is a circle. "Most of the time it will only take one tap on a set circle to log your set." [SL5 2026-10-05]. The programme prescribes exercise, weight and reps; there is no previous-value column in anything read: the target IS the display. The Play "What's new" for 4.4.1 lists "estimated workout duration" and "annotations showing weight increases" [SL2 2026-09-02].
- Rest timer is pinned: it "displays at the bottom of the workout screen" [SL6 2026-10-05].
- Home: 4.4.0 puts date, workout, weights and schedule on a "workout card" on a new home screen [SL1]. Whether the logging screen has a header, a Finish button or a notes field: UNKNOWN (help text read does not say).

**2. Set entry mechanics**
- No keyboard in the normal path. One tap logs the goal reps; "Tap the set circle several times in a row to decrease the reps" (goal 5: 5, then 4, then 3); repeated taps reach 0 for a failed set [SL5]. The vendor page adds tap-and-hold to log additional reps or change the weight for that set (paraphrase of the fetch-tool summary) [SL4 f].
- Skipped set: "Don't log it. Just leave the set circle blank. Stronglifts will understand that you didn't do the set and repeat the weight next workout." [SL5].
- Warm-up calculator and plate calculator: "the optimal amount of warmup sets", "the exact weight to add on each side of the bar" [SL4 f, CLAIM]; the vendor article says the legacy "Power Pack" unlocked "warmup, plate calculator, and assistance work" [SL10 2026-09-01]. RPE, RIR, set types such as drop or failure: UNKNOWN (the help read does not mention them).
- Auto-progression and deload are the product: weight goes up "if you complete all sets successfully", increments user-set ("as little as 1lb every three workouts"); several failed workouts in a row lowers the weight, for example "15% after two failed attempts" (paraphrase of the fetch-tool summary) [SL4 f].
- Pause: "Workouts logged with your phone are automatically paused when you do nothing for 10min." [SL5].

**3. Rest timer, lock screen, watch**
- "automatically starts when you log sets" [SL6]. Defaults: 1:30 after a successful set, 3:00 for the final warm-up set, 5:00 after a failed set; changed in Settings > Timer; per-exercise times per the vendor page [SL6, SL4 f].
- iPhone notification when the timer ends works locked; "Tap/hold the notification. You'll get a menu to enter the exact amount of reps you did." [SL5, SL6]. Live Activity: shows "rest time, exercise, set x weight, which set you're currently doing"; the Dynamic Island shows "the ongoing timer at the top of your screen"; enabling takes six settings steps; the article does not say whether a set can be logged from it [SL8 2026-10-05].
- Android: the notification carries Done and Failed buttons: "If the goal is 5 reps and you tap Done, it will log 5 reps"; Failed logs 4 [SL7 2026-10-05].
- Apple Watch: "the exercise, the weight and a big circle for the next set"; one tap logs 5 reps and starts the timer; quick extra taps take reps off ("4, 3, 2, 1, 0"); a "Reset Set" arrow undoes; navigate by swipe or Digital Crown (paraphrase and short quotes via the fetch tool) [SL9 2026-10-05]. Wear OS: none listed by the vendor; a 2026 Android user: "I asked for Android watch support back in 2023 and it was never added." [P:4082959b 2026-06-21].

**4. Mid-workout exercise management**
- Replace exercises "with suggested alternatives", unlimited custom exercises, fully custom programmes, 100+ exercise videos [SL4 f, CLAIM]. USER on picking a programme: "adding them to your workout schedule is a pain" [P:bd4a2a27 2025-10-02].
- Per-exercise history, charts, PR hints while logging: UNKNOWN from sources read.

**5. Finishing**
- Summary, share image, rating or feel: UNKNOWN. Progress charts are listed ("See your strength go up every week with clear progress charts") [SL1].

**6. Resilience**
- USER (v4.2.2, 2 stars): "Workouts keep resetting unexpectedly ... Individual exercises sometimes don't update after completion, even when the workout itself is finished." [P:3545f9c3 2026-04-10]. An older build: workouts "changing on the middle of my workout from A to B" [P:d08f0818 2019-07-20].
- Data access since the paywall, USER: "Now I can't even open and see my workout history without starting a 7 day trial followed by a subscription." [P:afbb05f0 2026-05-18]; "app now forces you to choose a subscription plan with no way to access basic features anymore or export years of data tracked" [A:14596692421 2026-09-26]; "I am deleting the app after exporting my data." [A:14622948236 2026-10-03]. The vendor line is that users "maintain their workout history" once they subscribe (paraphrase of the fetch-tool summary) [SL10].

**7. How it fits together**
- Help centre categories: Getting Started, Apple Watch (8 articles), Equipment, Customization, Purchase, Integrations, Account, Contact Support [SL14 f]. Programme list with a schedule; new home workout card (4.4.0) [SL1, P:bd4a2a27 2025-10-02].
- Onboarding since v4.0.3: "a series of unskippable questions, all leading up to a 'personalized workout plan,' and then told I need to pay for the app" (1 star, 85 helpful votes) [P:1b3845a1 2025-11-17].

**8. Praise, complaints, switching** (USER)
- Praise (still present): "My most trusted app for no BS training guidance. Super clean interface and intuitive design that lets me focus on the workout in the gym" [A:14618412156 2026-10-02]; on Hacker News: "Stronglifts is one flavor with a great app that just works and tracks all the little stuff (progression, giving you a specific rest time)" [H:44310861 2025-06-18].
- Complaint 1, the dominant one, a retroactive paywall. The vendor article says Power Pack "was an add-on that unlocked three features" sold 2014 to 2018 at $9.99, and was retired "because keeping separate code for them prevented us from continuing to improve the app for the majority of users with a subscription"; Power Pack users get 50% off the first year; the "lifetime" wording is said to have been added later in error (paraphrase and short quotes via the fetch tool, last updated 1 Sep 2026) [SL10]. Users: "I can no longer access any of the app, including my history and data, unless I pay $12 a month subscription. I used this app for years and now all my progress is locked behind a paywall" [P:4c0c4f1b 2026-06-21, 33 votes]; "The new version no longer honors this purchase and paywalls you to a $60.00 a year minimum subscription." [A:14624635128 2026-10-03]; "it's unfortunate that when people apparently weren't shifting to the paid version this app just went full $60-$120/year for what is at the end of the day a few basic algorithms and a database" [P:ed15d8e2 2025-11-09, 63 votes].
- Complaint 2, "build it myself": "in the age of vibe coding, maybe it's time to just roll your own fitness tracker" [P:afbb05f0 2026-05-18]; "I'll probably run this subscription out and then vibe code my own version, as this is a fairly trivial app to [...]" [P:3aa4a89c 2026-05-04]; "Vibe code your own 5x5 app or use another reputable workout tracking app." [A:14579000399 2026-09-21].
- Switching away, stated: "I just switched to Hevy. it does everything I need and it's free. Vote with your dollar people." [P:d7ddbb35 2026-07-14]; "Killed the app by making it require a subscription. Give me a $10 or $20 one time payment and I'll bite. We don't need a subscription for everything. Moving to a competitors app because of this." [A:14585564509 2026-09-23]; HN: "its the stronglifts app. But I switched to hevy and I'm happy with it. But I did paper for a while and liked it until I missed mu graphs" [H:49036005 2026-07-24]. The competitor Lift5x5 (T3) says most users leave StrongLifts for pricing and lists Strong, Hevy, Boostcamp and Liftosaur as alternatives [SL11 2026-06-09, updated 2026-10-06].
- Switching onward to Liftin': a reviewer titled "StrongLifts+" wanted "more customization options than SL and still have the Apple watch" [A:14206092837 2026-06-20].

**9. Distinctive**
- The prescription is the interface: one circle per set, tap to confirm, extra taps to lower reps, a blank circle means "repeat next time"; the rest time is chosen from the outcome of the set (1:30 success, 5:00 failure) [SL5, SL6].
- Android notification buttons that log a set ("Done", "Failed") without opening the app [SL7].
- A cautionary distinction: a once-loved free logger whose history became hostage to a subscription, and whose "lifetime" purchases were declared void [SL10, A:14624635128 2026-10-03].

**10. Price and tier.** Free to download, subscription required; 7-day trial on the yearly plan only. In-app purchases read 6 Oct 2026 via the fetch tool: Pro Weekly $4.99, Monthly $11.99, Quarterly $29.99, Yearly $59.99, 5 Years $199.99 to $239.99 [SL3]. Reviews quote "$12 a month", "$60 a year" and "$180 for 5 years", so INFERRED: tiers differ by storefront or date [P:4c0c4f1b 2026-06-21, A:14613482446 2026-09-30]. Volyume is free; this app gates everything, including viewing history.

### 2.5 KeyLifts (iOS and Android, Strongomatic LLC)

Snapshot. A percentage-based programme logger, centred on 5/3/1 but "not limited to that in anyway" per a user [A:11689287128 2024-09-04]. One developer: "such an amazing app that's made by just one guy" [A:11523127296 2024-07-22]. iOS 5.22.8 released 15 Sep 2026, 4.81 from 836 US ratings [KL1 2026-09-15]; Google Play 4.56 from 381 ratings, 10,000+ installs, 5.22.7 updated 15 Sep 2026 [KL2 2026-09-15]. The vendor homepage says it supports "5/3/1, GZCL, nSuns, Tactical Barbell, Starting Strength", "over 170 verified templates" and programmes of 1 to 52 weeks (paraphrase of the fetch-tool summary) [KL4 f]. No vendor help centre was found (the /faq URL returned 404), so mechanics below come from the store listings, release notes and user reviews.

**1. Active-workout screen anatomy**
- Everything is planned before you open it: "Know exactly what you need to do as soon as you step into the gym" and "With one button press, you can create a new cycle with all the weights automatically calculated for you" [KL1 2026-09-15]. The layout of the logging screen (header, set rows, pinned bar): UNKNOWN.
- Target is the display: weights come from the training max ("it will auto calculate your next workouts weights based on your training maxes, which is something I have found other apps lack" [A:11888029758 2024-10-29]). A previous-performance column: UNKNOWN.
- A user on watch behaviour: "You can also use an Apple Watch to check off each set" [A:11523127296 2024-07-22].

**2. Set entry mechanics**
- Tap-to-check sets on phone and watch (point 1). Entry of actual reps (AMRAP) and keyboard versus pad: UNKNOWN.
- Warm-ups, rest timer, PR alerts, assistance exercises and Joker sets are listed as free on the iOS listing; "Delete or swap exercises during a workout" too [KL1]. Training-max progression, plate calculator, cloud sync and graphs are Pro on iOS [KL1]. CONFLICT: the Android listing puts "150+ strength templates", editing templates, the plate calculator, graphs, Joker sets and assistance exercises under Pro [KL2]; a 2021 Android review calls it a template paywall ("Literally all of the templates (except 4) are behind a $20 ANNUAL subscription pay wall") [P:3f86effc 2021-05-13]. INFERRED: the free tier differs by platform or changed over time; not resolved.
- Progression rules, USER: "you can set it to automatically adjust your max training weight after every workout" [A:11859661322 2024-10-21]; "it responds when you don't hit your PR's in a month by not auto incrementing your training maxes on the next cycle", and target reps can be reset "if you've had a long break or an injury" [A:10909497954 2024-02-06]. Rounding: "auto rounding to the plates you have and auto progressions" [P:6526af31 2026-02-12]; "customizable plate math" [A:11626498210 2024-08-18].
- Gaps named by users (Android, 2024): no empty-bar warm-up, "No ability to set a minimum weight" for deloads [P:b5276f66 2024-01-27]; accessory progression preferences "don't save" [P:e75d120c 2024-02-11].

**3. Rest timer, lock screen, watch**
- "Rest Timer" is a listed free feature [KL1]. Per-set timers: "shows timers for each sets" [A:11523127296 2024-07-22]. 5.22.8 (15 Sep 2026) fixed "default rest timers" using the wrong time value and brought "Use least plate changes" and the plate calculator to Apple Watch (paraphrase of the fetch-tool table plus the listing's own release note) [KL1, KL3].
- Watch complaint (3 stars): "the main screen always automatically shows the workouts ... the only fix is uninstalling it" [A:11162206873 2024-04-15]. Lock-screen or Live Activity: UNKNOWN. Wear OS: UNKNOWN; Android Health Connect write errors reported in 2024 [P:1a87a106 2024-10-01].

**4. Mid-workout exercise management**
- Swap or delete an exercise during a workout [KL1]; custom exercises needed the full version on a 2021 Android build ("Without the full version you can't log custom exercises") [P:59ed1978 2021-06-06]. Exercise videos or instructions: none mentioned. PR alerts: "Alerts when you hit a new Personal Record (PR)" [KL1]; "a great feature that shows you PRs so you know how hard you need to push" [A:10898655386 2024-02-03].

**5. Finishing**
- Not described in sources. 5.22.0 (24 Jul 2026) adds "Workout Memories" and age-adjusted Wilks scores (fetch-tool table) [KL3]. Apple Health sync of weight and workouts [KL1].

**6. Resilience**
- Cloud backup and sync is Pro [KL1]. A web app exists: 5.20.7 "Web app sync fix" [KL3]. Reliability reports: "weights reset whenever they please" (1 star, v5.12.3) [A:12157004199 2025-01-07]; "the newest update totally borked it" (v5.11.11) [A:12006805362 2024-11-29]; crash loops and a lost 30-minute programme build on Android 2022 and 2023 [P:6c296ad5 2022-12-18, P:4097e600 2023-09-11]; release 5.22.7 (3 Sep 2026) "Fixed duplicate workouts/exercises after template updates" [KL3].

**7. How it fits together**
- Programme library plus template editor feed a "cycle"; profile tab with one-rep-max graphs and charts [A:11500489603 2024-07-16]. Onboarding: "Easy to use for a beginner" [A:11292349008 2024-05-21] versus "if you learn and understand the app, there's so many possibilities" [A:13812829927 2026-03-04].

**8. Praise, complaints, switching** (USER)
- Praise: the developer ("Super responsive, and really cares about his product" [A:11939955479 2024-11-11]), depth, and what it is not: "mercifully bloat free and AI-free, which is increasingly rare for those who are looking for an app that will work for them, not sell them things." [P:9b4cef2a 2026-02-09]. On looks: "It doesn't look incredibly sexy, but neither does Excel and we all know how powerful that tool is." [A:13423643925 2025-11-21].
- Complaints: consistency and regressions (point 6); paywall and cancelling: "Offers no trial. Trying to cancel but nothing happens when I click on manage subscription." [A:14403664505 2026-08-08]; "I'm completely unable to initiate a workout without paying for a subscription" (Android 2023) [P:9a8859b7 2023-08-21].
- Switching in: "I went from Strong and using spreadsheets to calculate my 5/3/1 weights to trying other apps like persist / perseus and 5/3/1 strength ... keylift is the first app that has all of the features i want and i just bought the lifetime sub." [A:11185430276 2024-04-21]; "I've tried many different apps over the years: Strong, Strength Log, StrongLifts, 531 Strength, Boostcamp. This one works the best for me. Especially if you like to use a % based program." [A:11927089845 2024-11-08].

**9. Distinctive**
- Training-max arithmetic as the core object: a whole cycle generated by one press, rounded to the user's plates, with the training max stepping up only if the month's targets were met [KL1, A:10909497954 2024-02-06]. A one-person product whose users credit direct support ("The developer actually responded to my email" [A:11389086790 2024-06-16]).

**10. Price and tier.** Free to download with a limited free tier. In-app purchases read 6 Oct 2026 via the fetch tool: Monthly $4.99, "A Year of KeyLifts Pro" $29.99, Lifetime Access $99.99 [KL3]. A 2021 Android review put the yearly price at about $20 [P:3f86effc 2021-05-13].

### 2.6 Lyfta (iOS, Android, web; Lindberg Development AS)

Snapshot. Free-to-start logger plus library, programmes and a social layer. iOS 1.163 released 1 Oct 2026, 4.81 from 6,812 US ratings, "Join over 7 million" [LY1 2026-10-01]; Google Play 4.71 from 62,868 ratings, 1,000,000+ installs, updated 24 Sep 2026 [LY2 2026-09-24]. The vendor's own page says "Join 7M+ users who have tracked 600M+ lifts" and rates it 4.9 on the App Store and 4.7 on Google Play (CLAIM) [LY4 f]. The App Store release notes carry no feature detail ("Continuous improvements"), so changes are read from reviews: a new layout appears to have shipped around August 2026 (a reviewer says the team "walked me through the new layout") [P:d930d171 2026-08-20].

**1. Active-workout screen anatomy**
- Listing text: "See your previous performance while you train and keep your progressive overload on track" [LY2]. A user confirms: "it tells you your previous weight so you can pick up from where you left off" [A:14196329183 2026-06-17]. Whether previous values are a column, ghost text or a pre-fill: UNKNOWN.
- Header and pinned controls: UNKNOWN. A user running several workouts: "when I'm doing one I can't tell which one I'm on. Example put the title at the top of the current inprogress workout." [P:480064f2 2026-09-16].
- Prescription: ready-made programmes and a "free AI generator" (vendor claim) tell the user which workout is next ("always know which workout comes next") [LY2, LY5 2026-10]; there is no weight prescription in the sources read.

**2. Set entry mechanics**
- "Log sets, reps, weight, RPE, notes, and more in seconds" [LY2]; "Warm-up sets, drop sets, failure sets, and supersets" [LY2]; a built-in one-rep-max calculator [LY1]. Keyboard versus pad: UNKNOWN.
- Slowness is the loudest UX complaint: "it's so damn difficult to put in information and it takes FOREVER" (1 star, v1.578) [P:08beba77 2026-07-20]; "UI could do some improvements especially around timed exercises" [P:5e8edd95 2026-08-11].
- Load handling: dumbbell exercises are doubled by the app ("Exercises that use dumbbells inherently have a x2 for the weight so you just list ...") [P:d49d7972 2025-03-20]; "Single arm exercises can be logged independently which is a nice and unusually rare feature" [P:5e8edd95 2026-08-11].
- Gaps named: cannot switch an exercise "from counted reps to timed sets" [P:a706448e 2025-01-30]; no per-set timer, wanted with 70 helpful votes [P:3b7b5e3f 2025-11-04]; cardio is logged "the same way as weights in terms of reps and sets" [A:14016937758 2026-05-01].

**3. Rest timer, lock screen, watch**
- "Auto rest timers keep your sessions efficient" [LY1]; the Android listing adds "Rest timers and live workout notifications" [LY2]. Reliability, USER: "a tracker with a timer that doesn't always work" [P:d5dfbb47 2026-09-14]; "PR alert vibrates but can't make the rest timer notification vibrate" [A:13444171972 2025-11-26].
- Watch: iOS "Apple Watch support for live workout tracking" [LY1]; a user "synced to my Apple Watch" [A:14605630109 2026-09-28]; a calorie double-count between Lyfta and Apple Fitness [A:14091316061 2026-05-21]. The vendor claims Wear OS support ("Yes") in its comparison table (CLAIM, T1 for its own feature) [LY5 2026-10]; no Wear OS user report was found. Live Activity: UNKNOWN.

**4. Mid-workout exercise management**
- "5,000+ exercises with HD video guides"; add custom lifts "with muscle groups & equipment" [LY1]; custom exercises "with images" [P:5e8edd95 2026-08-11]. Instructions: "click the question mark next to the exercise" [P:83fa35bb 2026-05-09]; "mini video demonstrations" [P:fa491aa6 2025-02-21].
- Editing a live or planned workout is weak, USER: "can't move same day workouts ... you cannot edit workouts to delete an entry" (1 star) [P:32510cff 2026-07-26]; saving exercises into a workout fails ("each time you attempt to save exercises into a workout, they don't save") [A:14099088718 2026-05-23]; library noise: "a doom scroll of endless variations ... (misspellings and missing pictures aplenty)" [P:def04cd0 2026-08-24]; "full of typos, workouts in languages I don't know" [A:14294685460 2026-07-12].
- PR hints: "Automatic personal record tracking" [LY2]; a PR alert vibrates in-session [A:13444171972 2025-11-26].

**5. Finishing**
- "Complete workout history", strength, volume and body-weight tracking, "Muscle group insights", and a muscle-recovery percentage that users like ("It shows muscle recovery %, which is amazing") [LY2, P:9f5a0b28 2026-08-05]. A summary screen and share card: UNKNOWN. Photo upload cannot be saved back to the camera roll [A:13937891354 2026-04-08].

**6. Resilience**
- "Seamless data sync across all devices" (CLAIM) [LY1]. USER losses: "Exited app to research. Returned to the app being refreshed and lost program." [A:12850366093 2025-07-03]; a routine "Workout not found" error after long editing "means all the time you spent adding exercises to a routine are lost" [A:14152721137 2026-06-06].

**7. How it fits together**
- Library, routines and programmes, community feed and challenges, web app (my.lyfta.app) and browser tools (1RM and strength-level calculators) [LY1, LY5]. Import from Boostcamp, Hevy, Strong, Fitbod, JEFIT and FitNotes is claimed [LY5 2026-10]. Integrations claimed: Strava, Apple Health, Health Connect, Garmin, Fitbit [LY5].
- Onboarding is a sign-up quiz followed by a trial offer (search-engine summary of a paywall teardown, T4) [LY7 f]; users read it as bait: "As soon as you create a login and answer questions about your goals, you're required to start a subscription. The description in the AppStore stated this was a free workout tracker." [A:14551010269 2026-09-14].

**8. Praise, complaints, switching** (USER)
- Praise: generosity and breadth. "Probably the best FREE app for tracking workouts, looking up specific exercises and the best app I've come across for comparing previous workouts. App isn't constantly badgering users for in-app purchases." [A:14229748303 2026-06-26]; "I'll be upgrading to premium soon to support the creator" [A:14196329183 2026-06-17].
- Complaints, 2026: "free" versus paywall ("Seen the reviews saying it was free ... it says it's free for 2 weeks and then $60/year. Such a waste of time." [A:14625195868 2026-10-03]); pressure: "a one time offer ... once you close this one time offer, it's gone ... a high-pressure sales tactic" (offer quoted as 24.99 pounds a year instead of 191.88) [P:6f49a3ed 2026-08-05]; editing and UI points above. Of the 150 most recent US App Store reviews (6 Apr 2025 to 3 Oct 2026), 10 are one star, 117 are five stars [LY6, my count]; the one-star reviews cluster in Aug to Oct 2026 and are mostly about price or "not free".
- Switching: "I used Fitbod for years ... the charge for the other app was too much ... This app came up on IG and it's everything I needed and more. Only thing I miss from previous app is the aesthetics" [A:14538534321 2026-09-11]; away: "Not recommended, I prefer Gravl! Lyfta is confusing/poorly designed" [P:def04cd0 2026-08-24].

**9. Distinctive**
- Scale of free content: thousands of videoed exercises, hundreds of programmes, a social layer with streaks and challenges, muscle-recovery percentage, one-tap import from rival apps (claimed), a free AI generator (claimed) [LY1, LY5].

**10. Price and tier.** Free core logging and library; Premium adds "deeper analytics, recaps, strength standards, and premium programs" [LY5]. The iOS listing offers a 14-day Pro trial [LY1]. In-app purchases read 6 Oct 2026 via the fetch tool: eight "Lyfta Premium" SKUs at $5.99, $11.49, $12.99, $17.99, $29.99, $49.99, $59.99 and $79.99 [LY3]. Reviewers quote "$60/year", "£45pa", "£24.99 a year" and "approximately 15$ per year" [A:14625195868 2026-10-03, P:def04cd0 2026-08-24, P:6f49a3ed 2026-08-05, P:a9c1bdab 2026-08-04], INFERRED: several concurrent offers and a countdown-style "one time offer".

### 2.7 Gravl (iOS, Android, Apple Watch, Wear OS, Garmin; Gains Coach Pty Ltd)

Snapshot. An algorithmic planner that logs, the nearest Fitbod-style rival: "an AI personal trainer for strength training. It builds your plan, coaches you through every set, and tells you exactly how much weight to lift next time" [GV1 2026-10-05]. iOS 1.53.4 released 5 Oct 2026, 4.89 from 5,677 US ratings [GV1]; Google Play 4.83 from 17,105 ratings, 1,000,000+ installs, updated 5 Oct 2026 (package com.liteup.getgains) [GV3 2026-10-05]. Release rhythm (store page, via the fetch tool): 1.48 (11 Jul, Garmin support, XP levels), 1.49 (29 Jul, custom exercises from social media, offline videos), 1.50 (7 Aug), 1.51 (18 Aug, per-gym records and plate inventory), 1.52 (24 Aug, injuries feature, plate calculator improvements), 1.53 (26 Sep, "Workout Focus" app blocker, rebuilt Apple Watch app, creator training plans, redesigned Library) [GV2 2026-10-06]. A user reads that rhythm as churn: "every other week there is an update that adds no meaningful features, just rearranging the app" [A:14609620233 2026-09-29].

**1. Active-workout screen anatomy**
- The prescription is on the screen: "You open your workout and have your exercises, sets, reps, and suggested weights ready to go" (T3 branded review) [GV10 2026-10-05]. Above the sets sits a row of buttons including "Insights", which explains the reasoning for a recommendation [GV7 2026-09-27].
- Per-set display format, header, pinned bar: UNKNOWN (the help article says it does not describe it). A user complaint hints at removed information: "You used to see your records underneath each exercise after you submit a workout - no more." [A:14609620233 2026-09-29].
- A progress notification mirrors the workout on Android: current exercise, "Your next set, for example 'Set 2/4' with its reps and weight", set type (Workout, Warmup, Superset, Dropset) and a progress bar of logged sets; on Android 16 and later it is a Live Update with one segment per exercise [GV5 2026-09-27].

**2. Set entry mechanics**
- Entry method (keyboard, pad, tap to complete) is not described in the help read ("The article provides no details about how sets are initially logged") [GV8 2026-09-27]. Editing a finished workout is allowed except imported ones: "Workouts imported from Apple Health or Health Connect are locked" [GV8].
- Effort capture is a three-way rating after each exercise: "Could you do more? (but with good form, of course)" [GV7]; the store description says "Rate a set Easy or Hard and the next prescription adjusts" [GV1]. RPE and RIR numbers: UNKNOWN.
- Prescription logic as the vendor states it: one-rep max estimated from logged history; "Reps climb set by set; when the ladder fills, the weight steps up, snapped to the plates or stack you actually have" [GV1, CLAIM]; after a break, "Adjust all recommended weights" lowers all weights by up to 60% [GV7]. Set types: warm-up (customisable), superset, dropset [GV5, GV9]. Plate calculator and per-gym plate inventory exist (1.51, 1.52) [GV2].
- The weight-change gap, USER: "They make it difficult to change the weight amount one time. Aka there isn't one." [A:14464496778 2026-08-23]; plate arithmetic that ignores the plates you hold: "lunges 135lbs it wants you to use 35lbs + 5lbs+ 2 2.5lbs plates. When you can just place a 45 plate on and eliminate all the nonsense." [A:14478568259 2026-08-27]; a reviewer says the app "has tried to up my weights sometimes by 20-3 [...]" [P:6d8bc94d 2026-06-12]. A 2025 review says users can "modify the weights, reps, sets, and have it give me drop sets or supersets" [P:05ecc784 2025-09-23].

**3. Rest timer, lock screen, watch**
- Defaults: "90 seconds for isolation exercises and 120 seconds for compound exercises"; change in Workout Settings (sliders icon, upper right of the Train tab) [GV4 2026-08-07]. The vendor says timers are "set per exercise" and that the workout "lives on your iOS lock screen as a Live Activity (interactive notifications on Android), so logging a set never means unlocking and navigating" (CLAIM, vendor comparison page) [GV11 2026-07-28]. The help articles read do not describe the Live Activity itself: UNKNOWN.
- USER on reliability: "The rest timer often doesn't g [...]" and a workout "still going 3 hours after ending, it won't allow me to correct the time" [P:9f05cfe7 2026-04-01]; an Android reviewer of the watch app (version tag v1.0.3; INFERRED to be the Wear OS app): "only syncs when changing/adding info from the watch; nothing syncs from the phone to the watch ... always changing my inputs (adding/subtracting weight)" [P:e001535b 2026-07-09]; "the lack of Android syncing is a total dealbreaker. The app can read your health data, but it will not export your workouts back out to Google Health" [P:07054b9f 2026-06-29].
- Watch, vendor: all three platforms "Log sets", "edit reps and weights on the fly", rest timers "buzz your wrist when time's up", rate exertion; but "The watch needs your phone within reach to start a session"; Wear OS and Garmin start from the phone only, Apple Watch from either [GV6 2026-09-27]. The iOS store text calls the Apple Watch app standalone and the 1.53 build "rebuilt" it [GV1, GV2]. USER: "I really like the integration with my apple watch, its a lot smoother" (a Fitbod switcher) [A:14573506252 2026-09-20].

**4. Mid-workout exercise management**
- The help centre lists, each as its own article: replace, reorder, skip, supersede with extra exercises or cardio, create a superset or dropset, "Queued Exercises: Your Workout Wish List", exercise variety level, focus on or exclude muscle groups, train around an injury, custom exercises and equipment, form analysis, and offline video downloads [GV9 2026-10-06]. Library: "300+ trainer-led exercise videos, downloadable for offline use" [GV1].
- USER gaps: lack of "Landmine exercises", "Kettlebell exercises" [A:14575805539 2026-09-21]; "Why isn't a pendulum squat in the list of equipment?" [A:14629247064 2026-10-04]; back-to-back days that hit the same muscles "no matter what options i pick" [P:233ecf7e 2026-08-14]; the weekly order "CONSTANTLY" scrambles [P:a0bcc38d 2026-05-18].

**5. Finishing**
- Edit after finishing is supported (point 2). Strength Score "compared against standards for your body weight and sex" across muscle groups [GV1]; monthly review stories (1.52) [GV2]; streaks, XP levels and friend comparison [GV9, GV2]. USER on Strength Score: "The strength score is a joke, The AI system doesn't understand that you can't always increase weight." [A:14478536777 2026-08-27]; supportive: "the mild gamification elements of the strength scoring encourages me to push myself" [A:14464205238 2026-08-23].

**6. Resilience**
- "automatic retry for failed workouts" arrived in 1.53.1 (28 Sep 2026), and the store text offers downloadable exercise videos for offline use [GV1]; offline logging itself: UNKNOWN. USER losses: "all my saved workouts in the library is gone, my feeds are all erased" after an update [A:14447053116 2026-08-19]; "locks in incorrect data with no way to edit it" [P:9f05cfe7 2026-04-01]; an app that will not start [P:21960e2b 2025-07-07]. Whether a workout survives the app being killed: UNKNOWN.

**7. How it fits together**
- Train tab (workout settings icon), Feed, Progress tab with calendar, Library; setup by "Essentials", gym profile and equipment, splits, programme designer [GV8, GV9, GV4]. Onboarding is a long quiz that ends at the paywall: "after you go through the entire setup process, THEN they hit you with the sign up for the payment plan ... There is no skip button" (115 helpful votes, 2025) [P:d6a7d030 2025-02-06]; "it did not ask for that until I had spent 10 minutes loading all information" [P:49de748b 2026-08-18]. Free access is "three workouts free" [GV10 2026-10-05].

**8. Praise, complaints, switching** (USER)
- Praise: structure and decision relief. "I've followed all kinds of programs over the years, changing over time as my goals evolved, from classic 5x5 to niche hybrid athletic training. When it comes to strength training, Gravl hits the nail on the head." [A:14464205238 2026-08-23]; "For experienced lifters: It eliminates decision fatigue." [A:14412823414 2026-08-10]; "this guides you as if my strength coach is back with us" [A:14476259057 2026-08-26]. Of the 100 most recent US App Store reviews (26 Mar to 4 Oct 2026), 65 are five stars and 14 are one star [GV12, my count].
- Complaints: paywall timing and no trial ("I can't pay for a hefty subscription without trying it. No free trial at all." [A:14451569989 2026-08-20]); churn and removed records (above); equipment database limits; prescriptions that jump or do not respect plates.
- Switching in, from Fitbod, repeatedly: "I have been a Fitbod loyalist for YEARS now. I felt like a had plateaued ... thought I would try GRAVL." [A:14591224816 2026-09-25]; "Ive had fitbod for years. This is much better ... This app is more expensive than my grandfathered fitbod account but i made the switch regardless." [A:14573506252 2026-09-20]; "Used Fitbod for a little over a year and kept getting stuck. Switched to them and I felt like I got my mojo back." [A:14448423068 2026-08-19]; "the interface looks 100% better than Fitbod" [P:07054b9f 2026-06-29]. On price: "I have probably tried and paid for about 15 different apps. This one by far beat every one of them and is a quarter of the price." [A:14581423678 2026-09-22]. Away from Gravl: "I switched from Fitbod to Gravl 2-3 months ago. Gravl is the superior app but there are a few things that are quite annoying" [P:a0bcc38d 2026-05-18]; a 1-star user who cancelled Fitbod after seeing "the smear campaign ads against Fitbod" could not finish the profile [A:14446696350 2026-08-19].

**9. Distinctive**
- Prescription by estimated 1RM with a three-way effort rating, snapped to the user's plates and per-gym equipment; an injuries feature; a Workout Focus mode that blocks distracting apps; creator training plans; watches on three platforms with live phone sync [GV1, GV2, GV6, GV7].

**10. Price and tier.** Free to start (three workouts); Premium adds full plans, the watch apps and analytics [GV1, GV3]. In-app purchases read 6 Oct 2026 via the fetch tool: Monthly $14.99, 3 Months $34.99, Yearly at $59.99, $79.99 and $89.99 [GV2]. A Dec 2024 review shows no monthly option then ("Disappointed there is no monthly billable option", 131 votes) [P:0c3a0a51 2024-12-30]; a Feb 2025 review quotes "59.99 billed annually 24.99 billed quarterly 10.99 billed monthly" [P:d6a7d030 2025-02-06], so INFERRED: prices and plan menu changed within 2025 to 2026.

### 2.8 GainFrame (iOS; progress photos and body composition, not a set logger)

Snapshot. Two unrelated iOS apps carry the name. "GainFrame: Gym Progress Photos" (Michael Rode) is the real product: iOS 3.24 released 3 Oct 2026, first release 8 Mar 2026, 4.89 from 66 US ratings, needs iOS 17 [GF1 2026-10-03]. "GainFrame" (Evan Hunter Aldrich, 3 ratings, build 1.20 of 23 Mar 2026) is a plain side-by-side photo comparer [GF2 2026-03-23]. Only the first is discussed. Android: UNKNOWN (no Android listing found).

Because the product does not log sets, the ten points collapse to what matters for the logger audit.
- Points 1 to 3 (set screen, set entry, rest timer): not applicable. The app has no set row, no rest timer and no watch app in its listing [GF1].
- How it touches workouts: "Connect Apple Health, Hevy, and Strava to bring weight, workouts, cardio, sleep, HRV, and recovery into the same progress story" [GF1]. Hevy is named as an input, so the workout log is somebody else's.
- What it does: body-fat estimates from progress photos, "12 muscle groups across front and back poses", physique scoring, "Future You physique projections", side-by-side check-ins, shareable before-and-after cards, and an AI Coach "grounded in your real check-ins" [GF1]. The 3.24 notes add a calories-and-macros summary, food logging and saved meals, so the app is widening into nutrition [GF1 2026-10-03].
- Privacy claims (CLAIM): "Your progress-photo library is stored on your device, and no account is required to start tracking. When you choose an AI feature, the selected photos are securely processed for analysis and are not stored on GainFrame servers." The listing adds that AI body-fat, BMI, FFMI and muscle scores "are approximations ... not a medical device" [GF1].
- USER (App Store, 2026): "needing pro features doesn't seem that important so far" [A:14441364768 2026-08-17]; "Developer Michael reached out promptly" [A:14179973658 2026-06-13]; crash after an OS update [A:14525214084 2026-09-08]; a user found it "when looking for alternatives to Spren and some other body-scanning tools" [A:14545016301 2026-09-13].
- Price and tier: free with in-app purchases; "The subscription (at a reasonable price) is all about the AI insight" [A:14179973658 2026-06-13]. Amounts: UNKNOWN (not read).
- Why it is on this list: it shows where the market puts physique tracking (photo and AI estimates beside the logger) and that a logger such as Hevy is treated as a data source for it [GF1].

### 2.9 SensAI (iOS, Origami Inc.; LLM coach with guided logging)

Snapshot. "SensAI: Fitness Sensei" (Origami, Incorporated): iPhone, iPad and Apple Watch; iOS 26 or later; first release 5 Sep 2025; 1.1.6 released 30 Sep 2026; 4.64 from 36 US ratings [SN1 2026-09-30]. The FAQ says the coach is "powered by the same technology behind ChatGPT and Claude" [SN3 f]. Not to be confused with SensAI.PT (UnderstandLing BV, 0 ratings), SENS.AI brain training, or OCD SensAI [SN6 f]. SensAI's vendor blog (sensai.fit) is also the source of the "Gravl app review" and "Hevy review" comparison pages other lanes read: a competitor publishing about competitors (T3).

**1. Active-workout screen anatomy**
- "On iPhone, your current exercise fills the screen with your target weights, set history, and animated form guides"; "Your full workout is one tap away for exercise swaps and adjustments" [SN1]. One exercise at a time, full screen, is OBSERVED from the listing; the visual layout is UNKNOWN. The prescription is the "target weights" on that screen, set by the coach from "what you actually did and how you recovered" [SN1, SN3].
- Apple Watch: a "Sets page shows every set of the current exercise, or what's next while you rest" [SN1 2026-09-30].

**2. Set entry mechanics**
- "Adjust your current set and matching upcoming sets update automatically. Add an exercise mid-workout and it loads your last performance. Never done it? SensAI estimates a starting point from your fitness data." [SN1]. On the watch: "Tap the pencil on the current set, then turn the Digital Crown or swipe to change weight, reps, time or distance, and your iPhone and Lock Screen update to match" [SN1]. Phone entry control, RPE or RIR: UNKNOWN. A user flags that a missing exercise cannot be added or tracked: "if the exercise you want to do doesn't exist in the library, you can't add it which means you can't track it" [A:14414245711 2026-08-11].

**3. Rest timer, lock screen, watch**
- "Complete a set and your rest timer starts automatically. When rest ends, SensAI takes you to your next set. Follow along from the Lock Screen and Dynamic Island." [SN1]. Timer and Dynamic Island upgrades shipped in 1.0.10 (7 Feb 2026); the set-by-set tracker redesign with Lock Screen and Dynamic Island and Smart Swap and Smart Modify in 1.0.11 (6 Mar 2026) (fetch-tool summary of the version table) [SN2 2026-10-06].
- Watch: start from the wrist with the phone nearby, "Complete sets, control exercise and rest timers, adjust rest, and get a tap when timers end"; Apple Watch Ultra Action button "to complete a set or skip rest with a press"; "minus now goes down to 0:15 and no longer ends a rest early" [SN1 2026-09-30]. A user on cues: "doesn't give any audio cues" [A:14549597299 2026-09-14].

**4. Mid-workout exercise management**
- "Smart Swap replaces a single exercise when equipment is busy or something doesn't feel right. Smart Modify restructures your entire workout - make it shorter, add volume, dial back intensity, shift focus to a different muscle group. Just type what you need." [SN1]. This is natural-language editing by an LLM, available during a workout.

**5. Finishing**
- "Finish on Apple Watch once all sets are complete"; "See every completed SensAI workout in your Activity tab, with or without Apple Health" [SN1]. Share card, PR list: UNKNOWN.

**6. Resilience**
- "works offline so you can train without WiFi" [SN3 f]; 1.1.4 (6 Aug 2026) says completed workouts "save more reliably to Apple Health with offline support" (summary) [SN2]. USER: "App gets hung up a lot" [A:14237825198 2026-06-28].

**7. How it fits together**
- Chat-first: a Coach thread returns "interactive cards for exercises, workout plans, progress charts, and workout updates"; an Activity tab holds history; Settings changes by the coach produce "a summary card in chat" [SN1]. It generates a plan weekly from HRV, sleep and training (vendor claim via a search-engine summary, T4) [SN5 f].

**8. Praise, complaints** (USER, five reviews in the feed read)
- Praise: "I have made more progress in these two months with SensAI than I ever did working with a trainer" [A:13809269729 2026-03-03]; "I can very easily tweak the workouts by asking it to change something up" [A:14116473716 2026-05-28].
- Complaints: "Generic advice. Doesn't ask any questions. Doesn't ask about perceived exertion very poor UX" [A:14549597299 2026-09-14]; "The AI is mediocre and can't remember my instructions" [A:14237825198 2026-06-28]. Sample is five reviews: indicative only.

**9. Distinctive.** Typed-instruction workout editing mid-session; Action-button set completion on Apple Watch Ultra; recovery-driven weekly regeneration (claimed) [SN1, SN5].

**10. Price and tier.** In-app purchases: Premium Monthly $6.99, Premium Yearly $69.99 (read through the fetch tool) [SN2]; a 7-day trial per a search summary (T4) [SN5].

### 2.10 Simple Workout Log (Android and web, SelahSoft)

Snapshot. "Simple Workout Log" by SelahSoft, LLC: Android app first released 1 Aug 2012, 4.87 from 15,548 ratings, 500,000+ installs; a companion website; an iOS app "under development, coming soon to the App Store" per the vendor page [SW1 f, SW2 f]. The iOS App Store has several unrelated apps with the same name, notably "Simple Workout Log - Ironotes" (Arnas Dilys, 4.84 from 354 ratings, build 1.216 of 29 Sep 2026), which is a different product and is covered at the end of this entry because users compare it with FitNotes [SW3 2026-09-29, SW5 f].

**1 to 3. Screen, entry, rest timer**
- The Play description: "designed to require minimal user input"; it "automatically logs the current date and time each time you start an exercise so you can compare your current exercise to the last time you completed it at just a glance" [SW2]. A reviewer confirms "Glance at what you did last session inside each category ... inside of leg press you have a history button" [P:e0ef44a9 2019-03-23]. A known bug in 2025: the "last completed" field reports the first completion [P:0f0d5e1e 2025-01-21].
- Entry: free-text notes ("I really like the feature for entering free-text notes") [P:803412d8 2024-04-16]; a weight plate calculator exists (a user asks for a 7.5 lb plate checkbox) [P:1f77bc38 2024-11-28]. Rest timer: an optional stopwatch and countdown [SW1 f]; USER: "I wish I could change the notification volume or noise for when you're done with a set" [P:ed4e1235 2025-11-20]; "my phone locking each time I submit my set and the app asking me if I want to save my set a second time [...]" [P:b44eace9 2025-05-18]. Lock screen use: "you can use it when your phone screen is locked" [P:d6a940d0 2025-06-13]. Wear OS, Live Update: UNKNOWN.

**4 to 7. Management, finishing, resilience, fit**
- Create routines and custom exercises; supersets; copy previous workouts; edit and delete past workouts; history by date; charts; CSV or Excel export; offline Android app; cloud backup optional: "Signing in is optional, so no account required unless you want your data backed up to the cloud" [SW1 f, P:bc3d6eff 2025-07-23]. A user routine hack: naming a routine with the date to plan ahead [P:ee4f6382 2020-02-06].
- Learning curve: "Very nice to use, once you get past the learning curve" [P:0b8ba6ce 2020-09-30]; "It was a little tricky to figure out at first how I wanted my exercises to be setup" [P:b44eace9 2025-05-18].

**8. Praise, complaints, switching** (USER)
- Praise: "No account bs, no tracking. Just a simple way to log your workouts." [P:ed4e1235 2025-11-20]; "SWL is the easiest to set up, use while in the gym, and go to later for looking at progress" [P:0c2cdf68 2025-03-28]; "Just switched to this from another app that was trying to shove their social media down my throat" [P:1f77bc38 2024-11-28].
- Complaints: ads in the free version ("The ads on the free version are annoying, but any app you pay for *once* to remove ads ...") [P:0c2cdf68 2025-03-28]; others call them "very small and not intrusive" [P:7a12b7c2 2026-07-31]; unexpected closes [P:ba2588b2 2024-12-24].
- Switching onward: an iOS reviewer left simpleworkoutlog.com for Ironotes "since it started being glitchy" [A:14588113387 2026-09-24].

**10. Price and tier.** Free with small ads; a paid "PRO Key" removes ads (one reviewer: "worth dropping $5 on to remove ads") [SW2, P:7a12b7c2 2026-07-31].

*Ironotes (iOS), as a contrast.* "No sign-up, no subscription - just voluntary donations"; "Auto-load previous sets", "Built-in rest timers", "Tag sets however you like", "Import workouts from text", Apple Health, iCloud sync, CSV export, and "No sign-up. No questionnaires. No AI workout plans. No social feed." [SW3 2026-09-29]. Users: "every other app requires signup, a monthly fee to do this, to track more than 5 workouts, to see a graph, etc. - this app does it all for free!" [A:14064269750 2026-05-14]; "I recently moved from an Android phone to an iPhone. One app I missed was FitNotes ... Ironotes gives me that same great vibe" [A:13670207248 2026-01-24]; a 1-star report of lost workout data ("Have messaged the developer twice, no response") [A:14110002973 2026-05-26]; developer speed: "implemented this feature in just several days" [A:14463560183 2026-08-23]. Of 34 reviews read, 29 are five stars [SW4, my count].

### 2.11 Stacked (iOS, M4L Inc., Muscle For Life)

Snapshot. A free weightlifting log from Mike Matthews's Muscle For Life: 4.56 from 1,725 US ratings; first release 19 Jan 2017; the current build is 3.7 of 7 Jun 2022 ("Small fixes - Delete account functionality") [SK1 2022-06-07]. It was announced in 2015 as "the workout app you've always wanted" [SK3 2015-03-26]. No Android listing was found (the Play package guess returned 404). The listing's pitch: "100% FREE ... unlike most other weightlifting apps, Stacked isn't ugly, unwieldy, unintuitive, and cluttered with unimportant features" [SK1].

- Listed features: simple or complex routines, imperial or metric, weight and rep goals, personal records, add or remove exercises and sets on the fly, "Automatically do plate math (always know how to load the bar correctly!)", past-workout review incl. duration and volume, "Automatically back up your data in the cloud" [SK1]. Set entry, rest timer, watch, Live Activity: not in the listing; a rest timer exists per users ("rest timer is really helpful") [A:13405687463 2025-11-16].
- Visual plate loading, USER: "it shows the barbell and lets you select the different plates and weights you put on" [A:13167938300 2025-09-21]. Dumbbell limitation: "I can't customize my weight for dumbbell exercises ... it auto reverts to a preselected weight" [A:13137650527 2025-09-14].
- Staleness and loss, USER: "Seems app is EoL as it hasn't been updated in 3 years and when I tried to login with my previous account it shows 'server connection error'" [A:13741216317 2026-02-12]; "The biggest problem is it loses workout data. I've done 6 workouts so far, it remembers 4 of them." [A:13405687463 2025-11-16]; "Why is there never an update put out for this app? Many annoying bugs" [A:14220421193 2026-06-24].
- Praise is about price alone: "every other comparable app in quality forces you to pay monthly/annual and this app is completely free while also not giving any/barely any ads" [A:13492586066 2025-12-08]. Of the 100 reviews read (26 Nov 2024 to 10 Sep 2026), 85 are five stars and 7 are one star [SK2, my count].
- Price and tier: free, no tier [SK1]. Instructive as the nearest precedent for a "100% free" lifter app: three-year-old build, a login server that may be gone, and reviews that mix gratitude for being free with reports of lost data.

### 2.12 Apple Workout and Fitness (watchOS 26 and 27, iOS 26 and 27)

Snapshot. Apple's own strength support is a workout-session container, not a set logger, as of the sources read. The Apple Watch Workout app offers strength types (Functional Strength Training, Traditional Strength Training) and records time, heart rate and energy; per-set weight, reps and rest are left to third-party apps, which write their sessions into Apple Health. watchOS 27 is reported to add a per-set data model, but I found no source showing a user-facing logging screen shipping. Everything in this entry is therefore either "what Apple records today" or "what beta code and press report".

**What Apple records today (point 1 to 6 collapsed)**
- Apple's Watch guide: during a workout the watch shows elapsed time, heart rate and energy; its running view lists "elapsed time, the zone you're currently in, heart rate, time in zone, and average heart rate"; the page read says nothing on sets, reps or weights [AW1 f, via the fetch tool]. A machine-written search summary of Apple's guide says Workout "does not record reps or sets" (T4, the wording is the summariser's, not Apple's) [AW2 f]. INFERRED: no per-set logging in watchOS 26.
- Third-party apps use Apple's session type: GymBook states that its watch app "starts a workout session of the type Traditional Strength Training on your Apple Watch, as soon as you enter a workout" [GB3 f]. Liftin' and Lyfta users report their sessions landing in Apple Fitness, once with duplicated calories ("it counts my active calories as active calories and calories burned from the workout so my active calories in the Fitness app is doubles") [A:14091316061 2026-05-21] and once not arriving at all until support helped [A:14052945145 2026-05-11].
- Workout Buddy (watchOS 26): an Apple Intelligence voice coach for running, walking, HIIT, cycling and "traditional and functional strength training"; in watchOS 26 it needed a nearby Apple-Intelligence iPhone (T2, heise and Tom's Guide via search summaries) [AW3 f]. MacStories on watchOS 27: Workout Buddy "no longer requires carrying an iPhone", works over Wi-Fi or cellular on Series 9 or later, Ultra 2 or later, or SE 3, and is "compatible with walking, running, cycling, hiking, elliptical, stair stepper, HIIT, and functional and traditional strength training" (the review page read, by John Voorhees, does not date itself) [AW4 f].

**What is coming (reported, not confirmed shipped)**
- Tom's Guide, dated 8 Sep 2026 on the Yahoo copy (the text reads like WWDC-week coverage, so the date is doubtful): in watchOS 27 the "Functional Strength Training" mode will "store individual sets, repetition counts, weights, equipment and duration" [AW5 2026-09-08]. A search summary of MacRumors, Cult of Mac and TechRadar reports says Apple's health store can describe sets with repetition counts, weight, equipment, body side and duration, and that developers could not yet create such records in the beta; the MacRumors page itself returned HTTP 403 and the TechRadar page loaded only navigation, so those are T4 [AW6 f]. A new "Readiness" watch app is reported beside it [AW5].
- Whether set logging is in the public watchOS 27: UNKNOWN. GymBook's 7.1.8 (30 Sep 2026) is "updated for iOS 27 and watchOS 27" and says nothing about new set APIs [GB1 2026-09-30].

**Why it matters for the field.** If Apple's store gains a per-set record, every logger on the platform becomes a producer for it; that is INFERRED from the reports, not stated by Apple.

### 2.13 Google Fit, Fitbit and Google Health (Android, Wear OS, Pixel Watch)

Snapshot. Google Fit is being retired: 9to5Google (7 May 2026) quotes Google, "We'll invite Google Fit users to migrate their data into Google Health app later this year" [FT1 2026-05-07]. The Fitbit app is now "Google Health (Fitbit)" with a Gemini coach, "Google Health Coach", for running and strength training behind Premium at $9.99 a month or $79.99 a year [FT2 2026-10-06]; TechCrunch (7 May 2026) has the coach launching 19 May [FT3 f, search summary]. Rating of the app on iOS: 4.5 from 703,000 ratings [FT2].

**What it does for strength today (point 1 to 6 collapsed)**
- Manual logging only for a long time: a search summary of third-party guides says Fitbit "doesn't track the weight you're lifting" and does not count reps or sets (T4) [FT4 f]. Google Health 5.07 (28 Aug 2026) lists "Improved Manual Workout Logging": "you can now add and adjust more metrics when logging an exercise manually" [FT5 2026-08-28].
- Announced, "coming soon": "our new on wrist Strength Training workout experience brings step-by-step guidance directly to your wrist, helping you move through sets and rest periods while making it easy to log your weights and reps on the go" (Pixel Watch 5 pre-order notice, 11 Aug 2026; Google's blog of 12 Aug 2026 repeats it with no launch date) [FT5 2026-08-11, FT6 2026-08-12].
- Engadget hands-on (Cherlynn Low, 12 Aug 2026): the Health app gets a workout builder "starting in September" to "create custom strength training routines" from a movement library or via the Coach; the tester could "enter the number of pounds and reps per station" on the watch, heard audio cues when rest ended, and found "workout guides were easier to see on the phone" [FT7 2026-08-12]. Pixel Watch 5 ships from 20 Aug 2026 at $399.99 [FT7]. Whether the same experience reaches other Wear OS watches: UNKNOWN.
- Phone logging screen, rest timer, previous values, Live Update: UNKNOWN; none of the pages read describes them.

**Praise, complaints** (USER)
- On a competing app's page, a user complains that Fitbit's new cardio-load feature swings between "STOP!! YOU'RE OVERTRAINING" and "you kinda haven't done jack shit ever" and says they use FitNotes instead for lifting [R:obwlzfo 2026-03-22].

**Price and tier.** Google Health Premium $9.99 a month or $79.99 a year [FT2]; Fitbit and Google Fit data basics free. The strength experience's tier is UNKNOWN.

### 2.14 Peloton Strength+ (iOS, Android, Apple Watch; Peloton Interactive)

Snapshot. Peloton's separate strength app: iOS 1.16.0 released 7 May 2026 ("Bug fixes and performance improvements"), 4.77 from 17,166 US ratings, first release 4 Dec 2024 [PL1 2026-05-07]. Android arrived on 18 Aug 2026 (Play 1.6.1 updated 21 Sep 2026, 1,000+ installs, 17 ratings, so far a tiny sample) [PL2 2026-09-21]. Peloton's page says it is "now available on both iOS and Android in the US and Canada" [PL3 2026-08-20].

**1 to 3. Screen, entry, rest timer (collapsed: vendor text is thin)**
- "Progress Tracking: Log your weights and reps to visualize your journey" and, on Apple Watch, "Follow along with workout cues, and easily log your weights and reps" [PL1]. The vendor page: "You can also log the weights you've used and reps completed to chart your journey" [PL3]. Per-set entry control, previous-value display, rest timer, Live Activity: UNKNOWN from vendor text; the page read says it "does not mention Apple Watch availability, rest timers, or per-set weight/rep entry specifics" [PL3].
- Structure: video-led, block-by-block coaching with "In-Ear Coaching" through headphones, a Workout Generator ("muscle focus, workout length, available equipment, and experience level"), and instructor-led multi-week programmes [PL1]. "Once your custom workout is generated, you can swap, add, delete, or re-order any movement." [PL3]
- USER evidence on the logging screen (iOS, 100 most recent reviews, 15 Aug 2025 to 23 Sep 2026: 18 one-star, 22 two-star, 23 three-star, 9 four-star, 28 five-star [PL4, my count]): "Wasn't intuitive how to add reps and weight. I could only get one field to load." [A:14391252233 2026-08-05]; "the app feature where you enter the weight is buggy, doesn't respond or doesn't open" [A:14584507862 2026-09-23]; "it doesn't consistently save my weights" [A:14521451573 2026-09-07]; "It's way too difficult to see 'previous lifts' during a workout. Having that information at a glance really helps me know what [...]" [A:14454690346 2026-08-21]; a wish for the previous weights to show during the rest countdown: "Can you show the workout and the weights used the last time so I can prepare it during the rest countdown" [A:14286878219 2026-07-10].
- Watch and battery, USER: "If you try to turn the screen off and just use the watch app, the phone app will log you out and lock up the watch app." [A:14578774363 2026-09-21]; "new app doesnt work on apple watch" [A:14424171269 2026-08-13]; "Still some bugs with rest times and connecting with my watch" [A:14483460639 2026-08-28]. Android (Play, Sep 2026): "WearOS support is coming" [P:ae85936a 2026-08-21]; "no heart rate connection to app" and a custom workout that "reverts back to 3 sets no rest time" [P:60815b42 2026-09-08].

**4 to 7. Management, finishing, resilience, fit**
- Library gaps: "You cannot add a custom exercise or movement" [A:14454690346 2026-08-21]; "lacks search feature for exercises" [A:14584507862 2026-09-23]; Android: "My only major ask is that you add a feature to create an exercise if it's not in their database" [P:ae85936a 2026-08-21].
- Neglect, USER: "it's been 10 months since its last development" [A:14169737144 2026-06-11]; "the developers have basically given up on it" [A:14483460639 2026-08-28]; "There haven't been new programs added in over a year" [A:14168555783 2026-06-10].
- Fit: classes and programmes tie to the main Peloton catalogue; one user wants class-to-programme conversion [A:14168555783 2026-06-10]; another objects that regular classes were relabelled "exclusive" to a higher tier [A:14196777675 2026-06-18].

**8. Switching**
- To it: from Fitbod on Android: "as a former Fitbod user, theres definitely room for improvement" [P:f8ca2e0e 2026-09-13]. Away: "I switched to a different app" (recommendations did not appear even when selected) [A:14170183194 2026-06-11]; a 2-star Android user "could learn a few things from Gravl ... I like the customization from Gravl where I can specifically list what weights I have in my gym" [P:b4ea7474 2026-10-05].

**10. Price and tier.** $9.99 a month in the US ($12.99 CAD); "Current All Access or App+ Members can access Strength+ for free" [PL3 2026-08-20]. A user who gets it free with a credit card says they would cancel otherwise [A:14521451573 2026-09-07].

### 2.15 Ladder (iOS and Apple Watch only; Ladder Technologies)

Snapshot. A coach-built, team-based programme app: iOS 4.13.1 released 29 Sep 2026, 4.95 from 204,375 US ratings, first release 23 Jun 2020, needs iOS 18; listing cites "Apple's 2025 App of the Year Finalist" [LD1 2026-09-29]. "Try Ladder COMPLETELY FREE for 7 days. NO PAYMENT collected during trial." [LD1]. No Android app: the vendor lists iPhone and Apple Watch; a competitor's review says "no Android app" (T3) [LD4 f].

**1 to 3. Screen, entry, timer**
- Described as "A NEW WORKOUT PLAN EVERY DAY", "In-ear coaching, video demonstrations and a built-in timer", and "Use the Ladder Journal to visualize your rep and weight progress over time" [LD1]. Per-set entry control: UNKNOWN. The prescription is the coach's: a new weekly plan "drops" on Sunday, moved from 8 PM to 9 AM local in 4.13.1 [LD1, LD2 2026-10-06].
- Flexibility is the user-visible mechanic: "I can add weight or slow down or pause and add a set. Or just add a random 'Flex' workout." [A:14616726132 2026-10-01]; "I was able to swap exercises to complete my workout with the hotel equipment" [A:14624170762 2026-10-03]. Version 4.12.0 (29 to 30 Aug 2026) added weekly planning "allowing rest days and double sessions"; 4.10.1 and 4.10.2 (Jul 2026) added plateau detection alerts [LD2 2026-10-06, via the fetch tool].
- Watch: "Watch + Apple Music sync is seamless" [A:14626883944 2026-10-04]. Live Activity and lock-screen logging: UNKNOWN.

**4 to 8. Management, finishing, praise, complaints**
- Of the 150 most recent US App Store reviews (23 Sep to 4 Oct 2026, a window of only 12 days), 141 are five stars and 2 are one star [LD3, my count]. Praise is about structure: "Ladder is the first app that has really given me the structure and consistency I was looking for. I love being able to follow an actual program with a coach instead of walking into the gym wondering what I should do that day." [A:14607871723 2026-09-29].
- Complaints in the same window: PR visibility, "I never get the popup after a workout that tells me I hit a PR but other people post their notifications. Going to the journal and clicking on each exercise is just tedious." [A:14605168403 2026-09-28]; newcomer fit, "this is not a place for 'newbie' starting out anything. you have to already be doing your thing" [A:14608377901 2026-09-29]; sync and stability, "The audio and video don't sync, the app doesn't work half the time" [A:14611588214 2026-09-30].
- Nutrition logging, a food library and wearable tracking were added in 4.8 to 4.11 (Jun to Aug 2026) [LD2].

**10. Price and tier.** In-app purchases read 6 Oct 2026 via the fetch tool: PRO $29.99, PRO Annual $179.99, PRO+ $34.99, PRO+ Annual $329.99, ELITE $44.99, ELITE+ $49.99, ELITE Annual $449.99, ELITE+ Annual $479.99 [LD2]. Volyume is free; Ladder's price reflects human-coach programming, not logging.

### 2.16 Future (iOS, Android reported, Apple Watch; human coach)

Snapshot. A human-coach subscription whose app is the delivery channel: "Future Pro membership is $199/month" [FU1 2026-10-03]. iOS 2026.17 released 3 Oct 2026, 4.87 from 10,716 US ratings; iPhone, Apple Watch and Vision [FU2 2026-10-06]. A competitor's review summary says it is US-only and that in June 2026 Future cancelled a free AI coaching product to "double down" on human coaches (T3, search summary) [FU5 f].

**1 to 5. Workout screen, entry, timer, management, finishing (vendor FAQ, 5 Feb 2026)**
- During a workout: "expert visual demonstrations" with the coach's voice, "Report Your Reps", "Adjust Your Weight as you go", "Flag to instantly replace an exercise", "Repeat Cues", "Record My Form" (video to the coach), "Exercise History"; "Your feedback goes straight to your coach" [FU3 2026-02-05]. The FAQ does not mention rest displays or the watch.
- Coach loop is the product: "Your coach checks in, monitors your progress, and holds you accountable"; "Move workouts, adjust days, and adapt your plan at any time without penalty"; "Visualized workout reports" [FU1].
- USER on the watch and the phone: "When you tap to move to new exercises, sometimes it simply doesn't work and you need to unlock your phone to continue." [A:14008789827 2026-04-29]; "Heart rate inconsistent ... Should be able to use speech to text on feedback. Should be able to speak commands to go to next exercise" [A:14600466712 2026-09-27]; "AirPods tend to disconnect often in the middle of a workout when iPhone and Apple Watch are used simultaneously" [A:14140937607 2026-06-03]; "The integration between iOS, Apple Watch, and iPhone is spectacular" [A:13820240582 2026-03-06].
- Gaps: "Unable to see muscles worked during exercises, limited exercise selection and inability to jump to the next non-started if I have to change the order." [A:13876071192 2026-03-22]; "I wish I could use it to make my own workouts" [A:14362732315 2026-07-29].

**8. Praise, complaints** (USER; 150 reviews 25 Jan 2024 to 30 Sep 2026: 92 five-star, 28 one-star [FU4, my count])
- Praise is the coach, not the logger: "Hope is awesome and keeps me accountable" [A:14604574711 2026-09-28]; "after trying to afford personal trainers who barely put together 2 workouts a week for the same price" [A:14577691414 2026-09-21].
- Complaints: price ("$199 is too much money to be spending to not be heard" [A:14335573512 2026-07-22]; "$200 is too high" [A:13858002936 2026-03-17]); "recurring glitches that don't get corrected for months, and coach turnover" [A:13861170626 2026-03-18].

**10. Price and tier.** $199 a month per the listing; the 2026 competitor summary says $50 for the first month, then $199, or $149 a month prepaid for a year (T3) [FU1, FU5 f].

### 2.17 Trainerize (ABC Trainerize client app; coach-delivered logging)

Snapshot. The client app of ABC Trainerize, "all-in-one coaching software for personal trainers, online coaches, gyms, and fitness studios": iOS 8.18.7 released about 5 Sep 2026, 4.9 from 68,390 US ratings, free to download, no in-app purchases (the coach or gym pays) [TZ1 2026-10-06]. "Workouts & Training: Create and deliver personalized workout programs, on-demand workouts, classes, and exercise libraries" and wearable sync from "Apple Health, Apple Watch, Fitbit, Garmin, and Withings" [TZ1].

**What the client logs, from the vendor feedback board and reviews (dated).**
- Guided workouts could not capture reps and weight in mid-2023: an idea posted 5 Jun 2023 (1 vote) asks to "Create ability to record reps & weight lifted during guided workouts", either during the exercise or as a post-set entry [TZ2 2023-06-05]. A coach's idea of 5 May 2022 (6 votes): "it's really frustrating to have to go to the client's profile, view progress, then select each exercise individually and change the option to max weight (rather than estimated 1RM) to view their previous weights/reps for that exercise" [TZ3 2022-05-05]. Status of both ideas: none shown.
- Previous values, USER (2026): "I also don't love that the previous rep count for an exercise shows under the exercise name, with the prescribed reps to the right, only because this is slightly confusing for clients." [A:14562880886 2026-09-17]; "History often does not load for exercises making it difficult to recall previous weight/reps." [A:14540473226 2026-09-12]; "App no longer showing previous weights ... I can no longer see any of my history of weights and reps in the app!" [A:14198139389 2026-06-18].
- Watch: "when connected to my Apple Watch, the workout will randomly end and restart" [A:14549626577 2026-09-14]; "It randomly stops the workout on my watch mid-workout so my workout isn't recorded properly. ... The issue has been occurring for years !" [A:14535133110 2026-09-10]. A countdown bug: the app "played the loud 'We'll start in 3, 2, 1' cardio countdown in the middle of the night" [A:14611042350 2026-09-30].
- Editing in-session: "While replacing exercising, there should be some kind of swap options ... I have to delete the scheduled exercises, drag the new exercises AND rest times into positions." [A:14062026756 2026-05-13].
- Of the 200 most recent US reviews (15 Oct 2025 to 2 Oct 2026): 96 five-star, 39 one-star [TZ4, my count].
- Price and tier: free for the client; cost sits with the coach.

### 2.18 MyFitnessPal (iOS, Android, Wear OS; the mass-market floor)

Snapshot. A nutrition-first app with an exercise diary: iOS 26.39.0 released 29 Sep 2026, 4.71 from 2,372,038 US ratings [MF1 2026-09-29]; Google Play 4.41 from 2,917,644 ratings, 100,000,000+ installs [MF2 2026-09-25]. Premium: monthly $9.99 to $19.99, yearly $49.99 to $79.99 (a price range per storefront, via the fetch tool) [MF1].

**What strength logging is (the floor)**
- A search summary of MyFitnessPal's support pages: logging a strength exercise means choosing Strength, then entering "sets, reps, and weight", from the Exercise card on the Today screen; a Workout Routines feature saves multi-exercise routines with "load, rep, and duration stat data per exercise set"; strength logged under plain Strength "will still not count towards your calorie expenditure", only routines do (T4; the support page returned HTTP 403) [MF3 f].
- The listing's own words: "Log workouts & steps to monitor health, nutrition & calorie burn"; "Wear OS support - calorie tracker, water tracker & macro tracker on your wrist" [MF1, MF2]. No rest timer, previous-value display or set types appear in any text read: UNKNOWN.
- USER (iOS, 300 reviews 6 Sep to 4 Oct 2026; 95 one-star, 112 five-star; 15 mention strength, lifting, sets, reps or exercise [MF4, my regex count]): "logging exercise is near impossible, they have close to know activities to log. Can't log standing abs or regular yoga even." [A:14581285689 2026-09-22]; "I can't log something simple like yoga or mat Pilates" [A:14590221152 2026-09-24]; "They charge for everything now ... even to use the barcode scanner" [A:14581285689 2026-09-22].
- Where lifters go instead: a FitNotes user lists "FitNotes for workouts ... Myfitness pal (good enough, I like the scan label function)" [R:pdlmwib 2026-10-03].
- Price and tier: free tier with ads and Premium; the strength logging tier is UNKNOWN.

### 2.19 Android-native rivals found in Google Play rankings (additions to lane A7)

Scope note. Lane A7 (file 07, sections 2.30 to 2.37) already holds dossiers on Strive, Liftoff, Gymverse, MacroFactor Workouts, FitHero, WorkoutWise, Pumped and the rest of the Play long tail. This entry does not repeat them. It adds two things A7 says it could not get: the observed Play search order from four queries, and Play detail-page numbers (rating, ratings count, installs, last update) read by parsing the page data, which loaded for me where A7 reports that "store detail pages did not load".

**Observed Play order, 6 Oct 2026, US, first appearance in the page (not a download ranking)** [AN1 2026-10-06]
- "gym workout tracker": Hevy, Gym Workout Tracker: Gym Log (Leap Fitness Group), RepCount, JEFIT, Lyfta, FitHero, Gymverse, Strong, FitNotes, WorkoutWise, MapMyFitness, Fitbod, Liftoff (13 results).
- "workout log": FitNotes, Hevy, Simple Workout Log (SelahSoft), Gym Workout Tracker: Gym Log, Strive (package com.koalasoft.gymnasium), WorkoutWise, StrengthLog, Strong, MapMyFitness, Pumped, Power Log, Lyfta, Fitness Logbook, RepCount (14).
- "weightlifting log": Hevy, StrengthLog, Strong, RepCount, JEFIT, FitNotes, Liftosaur, Lyfta, Gym Workout Tracker: Gym Log, a Wendler log book (com.vandersw.wenderlogbook), Gym Workout Plan (com.lealApps.pedro.gymWorkoutPlan), Setgraph, WorkoutWise (13).
- "strength training tracker": Hevy, RepCount, StrengthLog, Strong, JEFIT, FitNotes, MapMyFitness, WorkoutWise, Lyfta (9).
- INFERRED: Hevy is the first result in three of the four queries (FitNotes leads "workout log"); Hevy, Strong, FitNotes, RepCount and Lyfta appear in all four; JEFIT in three (not "workout log"); Fitbod only under the broadest query. A search order is not an install count.

**Play detail-page numbers read on 6 Oct 2026 (Google Play, US)**
- Gym Workout Tracker: Gym Log (Leap Fitness Group): 4.82 from 232,664 ratings, 10,000,000+ installs, updated 20 Sep 2026, first released 8 Dec 2021 [AN2 2026-09-20]. USER, a paywall complaint with 126 helpful votes: "Half the exercises are behind a paywall. Even if im just using the app for tracking. There are random exercises I can't add to my workout." [P:147e6574 2024-10-15].
- FitHero: 4.64 from 1,019 ratings, 100,000+ installs, updated 4 Oct 2026; the latest note advertises a stretching app, "Meet FlexHero" [AN3 2026-10-04]. USER: "Not a lot of clutter, no gimmicky frills or monthly fees ... No syncing, but can backup to cloud services." [P:03f7c4f6 2022-05-14]; "It has fair upsell pricing" [P:50f1811b 2026-07-07].
- Gymverse (Android): 4.25 from 48,307 ratings, 1,000,000+ installs, updated 22 Sep 2026 [AN4 2026-09-22]; on iOS the same publisher's app has 4.85 from 165,220 ratings (App Store search, 6 Oct 2026) [AN8 2026-09-27]. USER on parity: "on Apple I had a whole lot more features but with switch over to an Android device it just doesn't have the same bells and whistles" [P:81d77491 2026-06-15].
- WorkoutWise: 4.94 from 328 ratings, 10,000+ installs, updated 26 Sep 2026; "Super intuitive workout tracker & planner. No ads." [AN5 2026-09-26]. USER: "especially that it's possible to record RPE" [P:9077e947 2024-06-25].
- Liftoff: 4.78 from 94,490 ratings, 1,000,000+ installs, updated 3 Oct 2026; gamified ranks, streaks, social [AN6 2026-10-03].
- Strive (Gym log - Strive): 4.79 from 3,343 ratings, 50,000+ installs, updated 5 Oct 2026 [AN7 2026-10-05]. The Play text promises "I will never change the free feature to a paid one, spam the paywall, limit routines or workout logs", and lists a "Custom keyboard", "Placeholder exercise", per-exercise rest timer, set types "warmup, dropset, myo reps", "Fully offline workout planner"; the 2026-10-05 Play notes list "Experimental gesture input for numbers (Settings > Workout)" and "Swipe-to-remove is gone, no more accidental removals" [AN7]. USER: "Strive has everything you'd want from a paid workout tracker, except it's actually free, and doesn't try to take your money from you." [P:ab85890d 2025-08-30]; "I prefer Strive's UI; you can change the reps, weights, notes, etc., in one page" [R:mcoo8ow 2025-02-14].
- Cross-reference: A7's Strive dossier reads the vendor site and App Store notes; the Play-side pledge text and numbers above are the addition.

### 2.20 Boostcamp's closest programme-first rivals (cross-reference, plus user voice)

Which apps are the nearest to a programme-library-first logger depends on who says so. Sources in this file and its siblings:
- Boostcamp's own comparison pages name Hevy, Strong and Fitbod; a vendor-written three-way comparison (SensAI, T3) pairs Boostcamp with Hevy and Liftosaur: Boostcamp "asks which program do you want to run", Hevy "asks what did you lift today", Liftosaur "asks how exactly should your weights progress" (paraphrase of a search summary, T4) [PF1 f].
- Lyfta publishes a "Lyfta vs Boostcamp" page and claims one-step import of a Boostcamp history ("Lyfta lets you import your complete workout history from Boostcamp") with Hevy, Strong, Fitbod, JEFIT and FitNotes imports too (CLAIM) [LY5 2026-10]. Gravl 1.53 (26 Sep 2026) added "creator training plans" [GV2 2026-10-06].
- Dedicated programme runners covered here or by A7: StrongLifts (section 2.4), KeyLifts (2.5), Liftin' (built-in 5x5, Wendler and nSuns, 2.3), Liftosaur, Starting Strength, 5/3/1 and GZCLP apps (A7, file 07, sections 2.1 and 2.25 to 2.29).
- USER switching evidence toward programme-first apps: "I switched from strong to boostcamp about six months ago and it's been perfect, you have the full workout history, no routine limits and it has a library of structured programs if you want them. The tracking is similar to strong and it is actually free without the paywall" (r/EasyFitness, 11 Aug 2026; text as returned by the fetch tool) [R:p30v1cn 2026-08-11]; "You can nerd out way harder, I switched from strong to Liftosaur. I'd say stick to strong if you want extra clean and go with Liftosaur if you want more options on programming." (29 Sep 2026; fetch-tool text) [R:pctwg7w 2026-09-29]; a FitNotes user "Thinking of switching from FitNotes, but FN has Apple Watch integration" on a Boostcamp feature-request thread [R:kpzmeg0 2024-02-11]; a KeyLifts reviewer who tried "Strong, Strength Log, StrongLifts, 531 Strength, Boostcamp" and settled on KeyLifts for percentage-based programmes and a training max [A:11927089845 2024-11-08].
- INFERRED: the programme-first niche splits three ways by what the user wants from the programme: a library to pick from (Boostcamp), a rule you write (Liftosaur), or arithmetic done for you on one programme family (StrongLifts, KeyLifts). The sources do not rank them.


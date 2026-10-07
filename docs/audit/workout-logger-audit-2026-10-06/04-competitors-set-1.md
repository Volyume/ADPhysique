# Workout logger audit 2026-10-06: lane A4, the leading loggers, set 1 (web research)

Lane A4 (web research). Round: audit only, nothing built. Research day: 2026-10-06; every "now" below means that day.
Apps (founder's list, all twelve at equal weight): Hevy, Strong, Fitbod, JEFIT, Boostcamp, Alpha Progression, RP Hypertrophy, Juggernaut AI, Caliber, Setgraph, Gymaholic, Dr. Muscle.
Code: not read, not touched. Volyume appears only where a competitor fact needs a free-product or deterministic-engine caveat.

## 0. Method, evidence tags and limits

**Citation form.** A tag such as `[HV16 2026-10-01]` is a source ID from section 7 (the Sources list holds the full URL) plus the source's own date: its "updated" stamp, release date or post date. `f` means the page carries no date, so the date is my fetch day, 2026-10-06. The ID prefix names the app (HV Hevy, ST Strong, FB Fitbod, JF JEFIT, BC Boostcamp, AP Alpha Progression, RP RP Hypertrophy, JA Juggernaut AI, CB Caliber, SG Setgraph, GY Gymaholic, DM Dr. Muscle, X cross-app).

**Evidence tags.**
- OBSERVED: the source itself states it (vendor help centre, release notes, store listing, a hands-on write-up, a dated store review).
- CLAIM: a marketing assertion, by a vendor about itself or by a competitor about someone else.
- INFERRED: my reading of observed facts; labelled every time.
- UNKNOWN: looked for and not established. UNKNOWN is never a "no".

**Source tiers.**
- T1: vendor help centre, changelog, store listing (authoritative for what the vendor says the app does).
- T2: independent hands-on write-up, dated store review, forum or Hacker News post, vendor public feedback board.
- T3: competitor-published page. JEFIT, Boostcamp, Alpha Progression, Setgraph, Dr. Muscle, SensAI and GymGod publish comparisons that rank themselves first; RepReturn is treated as T3 because it may be a competing app (its ownership was not checked). A T3 page never carries a "no" on its own.
- T4: aggregator or search-engine summary. The mwm.ai review analysis is machine-generated; its quotes carry rating, version and date, its theme counts are indicative only. Search-engine summaries are used only where the page itself would not load.

**Limits, stated so nobody over-reads the file.**
1. Reddit was unreachable: the fetch tool refuses www.reddit.com and the search tool rejects reddit.com as a domain. No r/Fitness, r/weightroom, r/Hevy or r/StrongApp thread was read. User voice below comes from dated App Store reviews, mwm.ai quotes, Hacker News, one lifting forum, vendor feedback boards and independent reviews.
2. Google Play listings load truncated, so Play-side "what's new", ratings and reviews were not read. Android behaviour is documented mainly from vendor help text; many Android cells in the matrix are UNKNOWN for that reason.
3. The Zendesk help centres (Hevy, Fitbod, RP) refuse page fetches (HTTP 403) but their public help-centre API returned the article text. The Sources list gives the canonical article URL.
4. Garage Gym Reviews pages returned 404 or 403 to the fetch tool; its verdicts are cited only through search-engine summaries (T4).
5. The fetch tool answers through a small model. Quotes were requested verbatim and are shown as returned; I did not re-check each string against the raw page. Where a source was only summarised I write "paraphrase".
6. App Store version-history tables came through a converter that repeats one release note across consecutive builds. I use a row's note only where it names a feature.
7. Ratings and prices are the US App Store unless stated.
8. The newest dated source is the Fitbod listing build of 2026-10-06; nothing later was available.

## 1. The twelve at a glance

| App | Kind | Platforms (OBSERVED) | iOS rating (count) | Price headline | What the free tier covers |
|---|---|---|---|---|---|
| Hevy | Logger with social layer; Pro adds a rules-based Trainer | iPhone, iPad, Android, Apple Watch, Wear OS, web [HV24 2026-10-04] | 4.92 (96,234) [HV1 2026-10-02] | Pro $2.99/mo (a $3.99 SKU also listed), $23.99/yr, $74.99 lifetime [HV1] | Unlimited logging, rest timer, RPE, plate calculator; capped at 4 routines, 7 custom exercises, 3 months of stats [HV24] |
| Strong | Minimal logger, no coaching | iPhone, Apple Watch, Android [ST30 f, ST27 f]; Wear OS not stated | 4.86 (108,525) [ST1 2026-08-12] | PRO $4.99/mo, $29.99/yr [ST1]; "Forever" SKUs $79.99 and $99.99 [ST29 2026-04-05] | Unlimited workouts, 3 templates; plate calculator, warm-up calculator, charts, body-part measurements are PRO [ST1, ST16 f] |
| Fitbod | Algorithmic planner plus logger | iPhone, Android, Apple Watch, Wear OS (limited) [FB11 2026-09-03, FB10 2026-01-24] | 4.81 (286,624) [FB1 2026-10-06] | $15.99/mo, $95.99/yr [FB21 2026-09-30, FB22 2026-09-08] | No permanent free tier; 7-day trial then read-only (two sources agree; a third says "3 workouts", see section 5) [FB22, FB21, FB24] |
| JEFIT | Logger, 1,400-exercise library, adaptive plan | iPhone, Android, web, Apple Watch, Wear OS [JF10 2026-09-04, JF13 2026-03-16] | 4.76 (46,905) [JF1 2026-10-05] | Elite $12.99/mo, $69.99/yr [JF1] | Logging, history, library, community with ads; 7 custom exercises; watch app, analytics, video demos, ad-free are Elite [JF14 f, JF12 2026-09-16] |
| Boostcamp | Programme library (11,000+) plus logger | iPhone, iPad, Android; Apple Watch companion only mirrors a workout [BC5 f, BC6 2026-07] | 4.85 (10,428) [BC1 2026-10-02] | Pro from $4.99/mo billed yearly ($59.99/yr), or $14.99/mo [BC5, BC8 2026-07] | Full tracker incl. RPE, RIR, plate calculator, rest timer, custom programme builder with no cap [BC1, BC5] |
| Alpha Progression | Logger plus per-set recommender | iPhone, Android [AP4 f]; no watch app, no web logging, no social [AP7 2026-09-15, T3] | 4.92 (2,200) [AP1 2026-09-30] | Pro $12.99/mo, $79.99/yr, 14-day trial on yearly [AP1, AP8 2026-08-14] | Unlimited logging, 795 videos, rest timer, records, CSV export, no account needed [AP1] |
| RP Hypertrophy | Mesocycle coach (Dr. Mike Israetel) | iOS app since 20 Dec 2025, web app; Android "coming soon" per vendor page [RP4 2026-05-14, RP3 f] | 4.29 (236) [RP1 2026-10-01] | $34.99/mo, $299.99/yr [RP3] | None (30-day refund, no trial per a T3 review) [RP3, RP11 2025-04-26] |
| Juggernaut AI | AI powerlifting and powerbuilding coach | iPhone, iPad, Android [BC12 2026-07, T3]; no Apple Watch listed | 4.85 (5,655) [JA1 2026-09-24] | $34.99/mo, $349.99/yr [JA7 2026-09-04] | None; trial 7 days or 2 weeks, sources disagree [JA7, BC12] |
| Caliber | Coaching marketplace with a logger | iPhone, Android; no Apple Watch app [CB8 2022-06-29] | 4.84 (5,992) [CB1 2026-09-08] | Plus $9 to $12/mo, $36 to $72/yr across SKUs [CB10 2026-06-30]; 1-on-1 coaching about $200/mo [JF11 2026-09-14, T3] | Unlimited workout logging, 800+ exercises, Circles; supersets, swaps, custom exercises, automatic rest timer are Plus [CB1, CB5 2025-05-13] |
| Setgraph | Swipe-first logger, lists not routines | iPhone, Apple Watch [SG1 2026-09-18]; Android UNKNOWN | 4.72 (6,157) [SG1] | Pro $4.99/mo, $29.99/yr, $199.99 lifetime [SG10 2026-07-01] | Free tier exists; its limits are not published in anything read [SG1] |
| Gymaholic (Workout Tracker, Devenyi Gabor) | Apple-ecosystem logger with standalone watch app | iPhone, iPad, Apple Watch, Mac, Apple TV, Vision Pro [GY1 2026-09-18]; Android UNKNOWN | 4.58 (3,464) [GY1] | $3.99/mo, $31.99/yr, plus legacy "Pro" $4.99 and "Pro Gold" $14.99 [GY6 2026-07-26] | Free version hides workout titles and 3D models, per user reviews [GY4 f] |
| Dr. Muscle | AI personal trainer, fully automatic prescription | iPhone, Android, web [DM3 2026-10-01, DM4 2026-04-04] | 4.49 (382) [DM1 2026-10-02] | $48.99/mo, $399.99/yr [DM1] | Free trial, "No payment info needed" per the listing [DM1]; a T2 review says 7 days and a card [DM7 2026-09-04] |

Kind groups. Pure loggers: Hevy, Strong, Setgraph, Gymaholic. Library plus logger: Boostcamp, JEFIT. Algorithmic prescribers that log: Fitbod, Alpha Progression, Dr. Muscle. Periodised coaches that log: RP Hypertrophy, Juggernaut AI. Human-coaching marketplace that logs: Caliber.

Name collision (affects Gymaholic): the App Store has two products called Gymaholic. "Gymaholic: Workout Tracker" by Devenyi Gabor (App Store ID 648518560, the Apple-ecosystem logger) is the one covered here. "Gymaholic: Fitness & Nutrition" by James Bechet (ID 1409925959) is a different product and is the one with an Android listing and calorie scanning [GY8 2026-10-06, GY7 f]. Nothing in section 2.11 is taken from the second product. INFERRED: the first is iOS-only.

## 2. Per-app dossiers

Each dossier answers the same ten questions from the brief: (1) active-workout screen anatomy, (2) set-entry mechanics, (3) rest timer, (4) mid-workout exercise management, (5) finishing, (6) resilience, (7) how it fits together, (8) praise, complaints and switching, (9) what is distinctive, (10) price and tier. Android is called out where the sources allow.

### 2.1 Hevy

Snapshot. iOS 3.1.16, released 2 Oct 2026, 4.92 from 96,234 ratings, "Join +10 million users" [HV1 2026-10-02]. Ships "almost every week", each build beta-tested for about a week [HV14 2026-07]. July 2026 update: iOS rebuilt in "Liquid Glass", Android in "Material 3", navigation reworked natively "to make the app faster and more fluid" [HV14].

**1. Active-workout screen anatomy**
- Top left: the running workout duration; tapping it opens Pause / Resume Workout Timer (phone only, not from the watch). Top right: Finish. OBSERVED [HV34 2026-10-01, HV9 f].
- Exercise block: exercise name; a "Rest Timer" control directly beneath it; a three-dots menu per exercise (reorder, replace, remove, add to superset, add warm-up sets, update bodyweight); a "+ Add Set" button under the sets. OBSERVED [HV16 2026-10-01, HV11 f, HV19 2026-10-01, HV40 2026-10-01, HV30 2026-10-01].
- Set row, left to right: SET number (tap it to open the set-type menu: W warm-up, D drop set, F failure; a plain number is a normal set); PREVIOUS (prior values, "on the left side"); weight (KG or LBS); reps, or a rep range such as 6 to 8 when the routine uses ranges; an RPE column only when enabled in settings; a checkmark to complete the set. Drop sets show "a blue D on the left". OBSERVED [HV18 2026-10-01, HV20 2026-10-01, HV7 f, HV27 2026-10-01, HV10 f, HV8 f].
- Pinned and bottom: a blue "+ Add Exercise" button; a grey "Settings" button at the bottom of a live session (the Smart Superset Scrolling toggle lives there). OBSERVED [HV9 f, HV31 2026-10-01, HV19 2026-10-01].
- Previous performance is a column, not ghost text. A setting picks its source, "any workout" or "same routine", and it changes only the PREVIOUS column, never the weight or reps cells. OBSERVED [HV20 2026-10-01, HV21 2026-10-01].
- Target or prescription: routines pre-fill weight and reps and may carry a rep range [HV7 f, HV21]. Pro "Trainer" adds suggested weights and reps and progressive-overload recommendations, and is "algorithm-driven rather than AI" [HV24 2026-10-04, HV35 2026-10-01].
- Redesign in flight: the App Store history lists "Redesigned Set Row UI; progressive overload for reps-only exercises" at 3.1.10 (20 Aug 2026) [HV2 f]; an APKMirror summary of 3.1.11 adds "clearer active/checked states and an RPE color scale" [HV47 2026-08-28, T4].

**2. Set entry mechanics**
- Keyboard: tap the weight field and type; for barbell exercises a "Calculator" button sits "just above the keyboard". OBSERVED that an accessory bar exists [HV39 2026-10-01, HV13 f]. INFERRED that the keyboard is the system one: no custom numeric pad is described in any Hevy source.
- Tap cost, hands-on: "Adding a set is a single tap, modifying weight and reps takes two taps" [HV45 undated, T4].
- Auto-fill: re-added exercises return with their previous sets, weights and reps [HV9 f]. Routine values update after each workout unless "Update Routine Values" is switched off on the Save Workout screen, and never update when a rep range is set [HV21 2026-10-01]. Tap-the-previous-value-to-fill: UNKNOWN.
- Set types: normal, warm-up, drop, failure. No AMRAP, cluster or rest-pause type is listed [HV18 2026-10-01, HV8 f]. Failure sets: "log the last completed rep"; the app "currently prevents logging 0 reps" [HV26 2026-10-05]. A setting decides whether warm-ups count in workout stats [HV15 2026-10-01].
- RPE: Settings > Workouts > RPE Tracking adds a column; tap to choose 6 to 10, blank allowed (warm-ups). 6 is "could have done 4+ more reps", 10 is "couldn't have done more reps with proper form". No separate RIR field [HV27 2026-10-01].
- Notes: routine notes reappear every session and are private; workout notes show greyed-out next time and are replaced when a new note is saved [HV25 2026-10-03].
- Units: kg or lbs globally or per exercise [HV6 f].
- Plate calculator: barbell, short bar, EZ bar; pick available plates and bar weight; shows the closest achievable weight when plates do not add up; "+ Custom Bar" and "+ Custom Plate" [HV39, HV13].
- Warm-up calculator (Pro): percentage-based, default formula editable per set, plate and dumbbell rounding; three dots -> Add Warm Up Sets -> enter target weight -> Insert Warmup Sets [HV40 2026-10-01].
- 1RM: estimated from a rep-to-percentage table (1 rep 100%, 10 reps 75%, 30 or more reps 50%) [HV41 2026-10-01].
- Duration and distance: duration sets have an inline stopwatch that counts up (a separate countdown sits behind the clock icon); "Distance & duration" is an exercise type [HV15, HV28 2026-10-01].
- Bodyweight, assisted, weighted: three types; volume uses bodyweight, bodyweight minus assistance, or bodyweight plus load; custom bodyweight exercises do not add bodyweight to volume; bodyweight can be updated from the exercise menu mid-workout [HV30 2026-10-01].
- Dumbbell single versus pair: "Single vs. double weight logging investigation" is listed as upcoming work, so there is no toggle yet (INFERRED) [HV14 2026-07].
- Cap: 150 sets per workout or routine, Pro included [HV42 2026-10-01].

**3. Rest timer**
- Starts when a set is marked complete. Per exercise from 5 seconds to 5 minutes, or off. A default in Settings > Workouts applies to exercises added to new workouts and routines, not retroactively [HV5 f, HV16 2026-10-01].
- Adjust: -15 and +15 buttons while it runs; the lock-screen widget offers 15-second steps or skip [HV5, HV17 2026-10-01].
- Does not start when the next set is a drop set [HV18]. In supersets, Smart Superset Scrolling jumps to the next exercise and shows its timer [HV19].
- Alerts: three sounds (rest timer, check-set, PR), only the timer has five choices; volume off, low, normal or high [HV16, HV15].
- Lock screen: iOS Live Activity; Android lock-screen and pop-up notifications. The widget shows the next activity, sets done and prescribed weight and reps, and lets you "mark set as completed without unlocking your phone" [HV12 f, HV17 2026-10-01]. The App Store text adds "Dynamic island to never lose track of your workout" [HV1].
- Watches: Apple Watch (live sync, routines, timers for duration exercises, heart rate, set types, auto-save on reconnect) [HV1]; Wear OS on Galaxy Watch 4 and newer [HV32 2026-10-01].
- Gap: no separate timer for warm-up versus working sets, reported by a hands-on reviewer and by the vendor's own comparison page [HV45 undated T4, HV46 f]. The Trainer has Short, Medium and Long rest lengths [HV36 2026-10-01].

**4. Mid-workout exercise management**
- Three-dots menu per exercise: reorder, replace, remove. Swipe left on a set to delete it. "+ Add Exercise" adds several at once [HV11 f, HV38 2026-10-01, HV9 f].
- Supersets: three dots -> + Add To Superset; any number of exercises (circuits); each superset gets a colour [HV19 2026-10-01].
- At finish, an "Update Routine" / "Keep Original Routine" choice appears only if exercises or sets were reordered, added or removed; weight and rep edits are saved per the routine settings and never trigger it [HV22 2026-10-01].
- Picker: 400+ exercises, equipment and muscle filters, search; custom exercises (7 free) of type weight and reps, bodyweight reps or duration, type fixed after saving, duplicate to change it [HV31 2026-10-01]. Recents and favourites: UNKNOWN.
- Instructions: animations and step-by-step setup text on each exercise [HV31].
- History and charts: graphs, PRs and the Set Records table live on the exercise screen (library, or Profile > Exercises) [HV28 2026-10-01, HV31]. Whether one tap from the live workout opens it: UNKNOWN.
- PR hints: a "Live Personal Record Notification" setting shows a banner on the set that makes a PR [HV29 2026-10-01].

**5. Finishing**
- Finish -> Save Workout screen: name, duration (scroll list), start date and time, photos or videos, description, visibility, a Strava toggle, "Routine Settings" -> Update Routine Values [HV10 f, HV34 2026-10-01, HV21].
- "Hevy will only display the sets and exercises you've completed"; "as little as one activity and one set" is enough. INFERRED: unticked sets are not saved [HV10 f].
- Summary numbers named: duration, volume, set count [HV9 f]. A monthly report exists [HV46 f]. Sharing: "share summary illustrations of your workouts outside Hevy" [HV46]. New on 2 Oct 2026: "Send workouts to ChatGPT & Claude directly from the finish workout screen"; what it sends is UNKNOWN [HV1 2026-10-02].
- Rating or feel: none described. Post-workout suggestions: Trainer progress reports, Pro only [HV24].

**6. Resilience**
- OBSERVED: unfinished workouts are "stored to your device" and "can still be resumed within the app"; uninstalling before saving loses them; saved history is server-side and survives reinstall [HV23 2026-10-02]. Watch workouts "automatically save when reconnecting to iPhone" [HV1].
- Offline logging: not documented in anything read. A competitor claims "Hevy requires an internet connection for many features" and "Your data lives on their servers" (UNVERIFIED, T3) [X2 2026-01-14].
- Reported bug: "I SWEAR THIS APP ADDS GHOST SETS...on random workouts!" (2 stars, v3.0.5) [HV3 2026-04-02].

**7. How it fits together**
- Tabs seen in help text: Home (a social feed that cannot be removed, per Hevy's own help centre), Workout (routines in folders, New Routine, Start Empty Workout, Explore, and a dropdown that switches to Trainer), Profile (stats, exercises, measures, settings) [HV43 2026-10-05, HV26 2026-10-05, HV36 2026-10-01, HV31].
- Routines live in the Workout tab, in folders, drag and drop; free users cap at 4 [HV26, HV24]. Start paths: empty workout, routine, or "Copy workout" from any past workout, yours or another user's [HV33 2026-10-01].
- History: Profile -> workouts (edit, delete, convert to routine); calendar; muscle-group graphs; charts of muscle activity, frequency and consistency; monthly report [HV10 f, HV38 2026-10-01, HV1 2026-10-02, HV24 2026-10-04, HV46 f]. Ten home-screen widgets including Routine of the Day, Quick Access and Streak [HV37 2026-10-01].
- Onboarding: free users go straight to an empty workout or the routine library [HV33]; the Pro Trainer opens with an intake questionnaire and a health disclaimer [HV35]. First-run screens for free users: UNKNOWN.

**8. Praise, complaints, switching**
- Praise: "Seriously the best workout tracker I've ever used. Simple. Free. Tons of graphs. Amazing quality videos" (listing testimonial, T1 marketing) [HV1]. "The free features are very generous" (v3.0.5, 10 May 2026) [HV3 2026-05-10]. "Seeing my progress & comparing my charts to others" (v3.0.11, 8 May 2026) [HV3 2026-05-08]. "there are workouts that are easy to replace and add when you're in the gym and you need to use another piece of equipment" (store review, 18 Jun 2025) [HV2 2025-06-18]. mwm.ai themes (T4): rest timer 15 mentions, free version 14, interface 22 [HV3 f].
- Complaints: ghost sets and battery drain (2 stars, 2 Apr 2026) [HV3]. "The only thing that I don't like is the fact that it's no volume added to your total volume when doing body weight squats" (26 Jul 2025) [HV2 2025-07-26]. Mandatory feed: "The Discover feed will remain on the Home screen. As of right now, there is no way to remove this feature" (Hevy help centre, quoted) [HV43 2026-10-05]. 150-set cap, no Garmin, one-time CSV import only [HV43, HV42]. Hacker News: "subscription-laden feature bloat and enshittification, more like ... (JEFIT, Strong, Hevy)" (12 Feb 2026) [X4 2026-02-12].
- Switching: "I've tried quite a few over the past year including the popular Strong app ... I started out with the free version but have since upgraded to the Lifetime membership because I needed to create more than 5 custom exercises" (2 May 2022) [HV2 2022-05-02]. "I'm now working on retroactively adding all my workouts from BodySpace into Hevy (over 800 workouts)" (23 Dec 2024) [HV2 2024-12-23]. A competitor's reading: "a lifter running a fixed 3- or 4-day split ... may genuinely never need to pay" (T3) [HV44 2026-09-15].

**9. Distinctive**
- Social feed, leaderboards and copying another user's workout into your own session [HV1 2026-10-02, HV24].
- Smart Superset Scrolling, and per-exercise timers inside supersets [HV19].
- The Update Routine / Keep Original prompt [HV22].
- Ten widget types, and a lock-screen widget that completes sets [HV37, HV17].
- Strava one-way sync with "a full list of exercises, sets, reps (or duration), and weight" since June 2026 [HV14 2026-07].
- The ChatGPT and Claude hand-off from the finish screen (2 Oct 2026) [HV1].
- Hevy's own feature index also lists a built-in routine library, custom exercises and social-media shareables [HV4 f].

**10. Price and tier.** Free: unlimited logging; 4 routines, 7 custom exercises, 3 months of history; body weight and waist only. Pro: $2.99/mo ($3.99 SKU also listed), $23.99/yr, $74.99 lifetime; adds unlimited routines and custom exercises, all-time stats, set count per muscle, extra measurements, warm-up calculator, Trainer with progressive overload and progress reports [HV1, HV24 2026-10-04, HV43]. Volyume is free: Hevy gates the warm-up calculator, the Trainer, history depth and routine count.

### 2.2 Strong

Snapshot. iOS 6.5.0, released 12 Aug 2026, 4.86 from 108,525 ratings; listing says "over 1.2 million people have downloaded" it [ST1 2026-08-12]. Kind: a minimal logger with no coaching. "Strong 6.0" is the current cross-platform generation (help articles refer to "Strong 6.0" and "Strong 6.X" share links) [ST26 f]. iPhone, Apple Watch and Android are named by the vendor; Wear OS is not mentioned [ST27 f, ST30 f]; a competitor's smartwatch list says no Wear OS [JF13 2026-03-16, T3].

**1. Active-workout screen anatomy**
- Top: a workout note field at the top of the Log Workout screen; Finish in the top right. "A Workout consists of a list of Exercises, which you will perform in order." OBSERVED [ST11 f, ST4 f].
- Exercise block: exercise name (tap it to open the Exercise Detail screen); a More menu (Add a Note, rest-timer duration, Bar Type, Add Warm-up Sets); an "Add Set" button; swipe to delete a set; drag and drop on the exercise name to reorder. Superset members "will be displayed with a vertical line on the left side". Pinned notes show in yellow on the workout screen [ST4, ST11, ST5 f, ST9 f, ST10 f, ST13 f, ST7 f].
- Set row: set number (tap to tag it), weight, reps, a completion checkbox [ST4, ST8 f]. RPE is entered from the keyboard, not a column [ST6 f].
- A PREVIOUS column: the Strong help articles read do not describe the columns. A third-party comparison says "Previous session weights are pre-loaded" [X1 2026-03-13, T3 possible]; the store reviews say it "keeps track of how much I lifted last" [ST2 2020-11-19]. OBSERVED only second-hand.
- Per-exercise "Focus Metric": pick one metric per exercise (Volume Increase, Weight/Rep, Total Reps, Reps/Set, Total Time, Total Distance) and the workout screen compares today with last workout, for example "-10%" [ST12 f]. Not on Apple Watch.
- Bottom: "Add Exercises" button [ST4]. Rest timer: a timer button; tapping a running timer expands it full-screen [ST5 f].
- Prescription or target: none. Strong records what you did; it does not tell you what to lift (see item 8).

**2. Set entry mechanics**
- Custom keyboard. OBSERVED: "select the Reps cell, and hit the RPE button in the keyboard"; "Hit the plate calculator button on the right hand side of the keyboard"; a Next button "to move between sets" that, inside a superset, selects "the next set from the appropriate exercise" [ST6 f, ST9 f, ST7 f]. Release notes name an "RPE keyboard fix" (6.4.2, 25 Jun 2026) and "Keyboard dismissal fixes" [ST2 f].
- Set tags: tap the set number to choose Warm-up, Drop or Failure; tap again to clear. Warm-ups "will not be included in charts or metrics". Failure means "a 6th rep attempted but not completed"; a zero-rep Failure records a missed 1RM [ST8 f].
- RPE: 6 to 10 only (below 6 is "highly subjective"), mapped to reps in reserve; tap the value again to remove it [ST6].
- Plate calculator (PRO): for barbell or machine exercises; shows "the most efficient plates" for each side; Olympic bar default 20 kg or 45 lb; change Bar Type in the More menu; not on Apple Watch [ST9]. A 2020 reviewer wanted a 25 lb Smith-machine bar option [ST2 2020-11-19].
- Warm-up calculator (PRO): More menu -> Add Warm-up Sets (or Update); barbell, dumbbell and machine exercises only; formulas are editable in Settings on iPhone and in-workout on Android; not on Apple Watch [ST10 f].
- Notes: workout notes and exercise notes, both copied from a template each time; "pinned" notes appear every time but not in history [ST11].
- Units: pounds, kilograms or a combination; exercise types include assisted bodyweight and duration [ST1 2026-08-12].
- 1RM and records: the Records screen shows best performance at each rep count, actual and projected; only sets of 12 reps or fewer are used "as rep values > 12 typically lead to inflated NRM values" [ST14 f].
- Exercise database limits, from a store review: some pairings are not allowed, "like added weight and duration"; custom exercises can be hidden but not deleted (24 Oct 2023) [ST2 2023-10-24].

**3. Rest timer**
- "The default Rest Timer for all exercises is 2:00 and triggers immediately after a set is completed"; can also be started by hand. Per exercise from the More menu, with separate durations for warm-up sets and working sets. Tapping a running timer opens full-screen where you change the remaining time or Skip. Settings > Rest Timer sets the sound effect and behaviour [ST5 f].
- Live Activity and Dynamic Island for rest timers: "New" in iOS 6.5.0, 12 Aug 2026 [ST1]. Earlier builds fixed timer problems: "Timer countdown background fix; Timer reset fix" (6.2.8, 23 Feb 2026), "Paused rest timer notifications fix" (6.3.2, 16 Apr 2026) [ST2 f]. INFERRED: background timers were fragile until 2026.
- Apple Watch: records and controls a workout, set logging, timers, heart rate, calories; watchOS 10 or later; companion, not full parity [ST18 f]. Android lock-screen equivalent and Wear OS: UNKNOWN.

**4. Mid-workout exercise management**
- "Add Exercises" opens the built-in library or custom exercises; reorder by drag and drop; swipe to delete a set [ST4]. Supersets: on iPhone select exercises then "Superset" in the upper right; on Android use the menu, then the chain icon; "We'll be unifying the user experience of Supersets across all platforms in a future update" [ST7].
- Replace: the Apple Watch app gained a "Replace exercise option" in 6.1.1 (2 Jul 2025) [ST2 f]; the phone replace path is not in the help read: UNKNOWN. Remove an exercise: UNKNOWN.
- Exercise Detail (tap the name, or the info button in Add Exercise): About (video or image plus steps), History (every workout with it), Charts (PRO), Records [ST13 f]. Search got "exercise search highlighting; improved search ranking" (6.3.3, 30 Apr 2026) [ST2].
- PR hints while logging: the Records article does not mention an in-workout alert: UNKNOWN [ST14].

**5. Finishing**
- Finish in the top right [ST4]. A workout started from a template ends with an update prompt: "Update Template", "Update Values Only", "Update Template and Values" or "Keep Original Template"; the prompt can be turned off [ST24 f]. Free tier: up to 3 templates [ST23 f].
- Unchecked or skipped sets: a search of the help centre for "incomplete sets finish" returned 26 articles and none on the topic: UNKNOWN [ST26 f].
- Summary, PR list, image cards: not described. A share sheet shares routines and workouts, and progress pictures and notes can be attached [ST1]. Past workouts are editable "at any time" [ST25 f]; a help article covers logging a past workout [ST26].

**6. Resilience**
- Cloud sync: "Your workouts will automatically sync to your Strong Account in the background or when you complete a workout"; Force Sync is a pull-down on the iPhone History tab and a button in Android Settings; "Please do not delete the app or you risk data loss" [ST20 f]. "Session Expired": until you sign in again "your workouts will not be synced" [ST21 f].
- Lost workouts: the main cause given is an account created by accident [ST15 f]. iOS templates "keep disappearing", fixed in 6.0, re-login brings them back [ST22 f].
- Offline logging and resume of an unfinished workout: UNKNOWN (the help says nothing). An account is required for cloud sync and sharing [ST17 f].
- Field reports (T4 quotes, with rating, version, date): "I lost 6 months of data without any reason, and it's not recoverable" (1 star, v6.3.3, 6 May 2026); "it freezes A LOT...I have to close the app and restart it each time" (1 star, 9 May 2026); "unfortunately since the last few updates...it's become unreliable to use" (1 star, 14 May 2026) [ST3 f]. unitQ scored the app 49 ("poor"), down 20 points in 30 days at 5 Oct 2026, 68% of reports from iOS; the page gives no themes [ST28 2026-10-05].

**7. How it fits together**
- Help centre structure: Getting Started; Record a Workout; Using Workout Templates; Exercises; More Strong Features (history, charts, metrics, widgets, measurements, nutrition, exercise detail, records, export); Apple Watch; Integrations; Accounts and PRO; Troubleshooting [ST26 f].
- Screens named: a Start Workout tab with a "+ Template" button, the Log Workout screen, History (edit a past workout, "+ Save as Template"), an Exercises tab, profile widgets, measurements [ST23 f, ST25 f, ST13 f, ST26]. A full tab-bar order is UNKNOWN.
- Onboarding: built-in templates and "over 200 built in exercises"; "If you lift more than you did in your previous session, you're getting stronger" [ST19 f].
- Home-screen widgets (calendar, activity) arrived in 6.4.0 (28 May 2026) [ST2].

**8. Praise, complaints, switching**
- Praise: "It is the best tracking app for strength training and weightlifting there is. Period." (24 Jul 2021) [ST2 2021-07-24]. "this is the best workout app i've tried im not exaggerating" (30 Mar 2026) [ST3 2026-03-30]. Listing quotes CNBC, The Verge and "This is bare bones and serious" (T1 marketing) [ST1].
- Complaints: lost data, freezes, "Watch sync issues (22), Stale updates (9), Premium pricing (8)" (mwm.ai machine themes, T4) [ST3]. "Strong requires multiple taps for basic logging tasks" is a competitor's line (T3) [SG8 2026-10-05]. A GGR verdict via search summary: "Reports of workouts being lost and lack of guidance features" (T4) [X5 undated].
- Switching: Hacker News on JEFIT: "If you're on iOS, the app 'Strong' is a really simple but great tracking app" (18 Jul 2025) [JF5 2025-07-18]; "Hevy is another great and simple iOS workout tracking app in the same vein as Strong" [JF5].

**9. Distinctive**
- A custom keyboard whose extra buttons carry RPE, the plate calculator and Next [ST6, ST9, ST7].
- Focus Metric per exercise [ST12]; pinned yellow notes [ST11]; separate warm-up and working rest defaults [ST5]; a four-way template write-back prompt [ST24].
- Records with projected best at every rep count [ST14]. The vendor lists Siri Shortcuts, Muscle Heat Map, Custom Timers and Workout Scheduling [ST27 f].

**10. Price and tier.** Free: unlimited workouts and Strong account sync; 3 templates. PRO: $4.99/mo or $29.99/yr per the listing; the pricing tracker also shows 6-month $19.99 and "Forever" $79.99 and $99.99 SKUs; PRO adds unlimited templates, all charts, plate calculator, warm-up calculator, body-part measurements, custom icons and themes [ST1, ST29 2026-04-05, ST16 f].

### 2.3 Fitbod

Snapshot. iOS 8.35.1, released 6 Oct 2026, 4.81 from 286,624 ratings; "1000+ exercises", Apple Editor's Choice [FB1 2026-10-06]. Kind: an algorithm builds every session from a "My Plan" profile (goal, equipment per location, days a week, duration, experience, split, variability, focus exercises, warm-ups, circuits, timed intervals, units) and the logger sits inside that plan [FB16 2026-09-26, FB6 2026-10-02]. The vendor says the engine is proprietary ("mStrength") and varies rep ranges between sessions on purpose [FB15 2026-09-15].

**1. Active-workout screen anatomy**
- Workout tab: the generated exercise list; a "Swap" button top right opens the Swap Menu (pick muscle groups, create a workout from scratch, saved workouts, on-demand workouts); "..." beside Swap holds "Share Workout Link"; "+Add Exercise" sits at the bottom of the list. OBSERVED [FB4 2026-09-28, FB5 2026-08-11, FB20 2026-01-15]. "Training Session Mods" change duration (15 minutes to 1 hour 30) and equipment for that session only [FB5].
- Tap an exercise to open the Exercise Details screen: name, written and video instructions, AI recommendations for sets, reps and weight, "Historical Logs & Performance", per-side labels, notes, rest-timer access and Reps in Reserve. A video sits at the top; GIFs "were removed in a recent update" and offline video is unavailable [FB7 2026-07-10].
- Set rows live on that screen: tap the reps or weight field and type, "changes save automatically"; "+Add Set" at the bottom; swipe left to delete a set; the More menu (top right) holds Add Warm-Up Set, Notes and Build Superset/Circuit [FB7, FB4]. The rest-timer icon sits "next to the sets display, directly under the exercise title" [FB8 2026-07-26].
- Exercises on a Max Effort Day carry a "MAX EFFORT DAY" label and their last two sets are marked "+ reps" (AMRAP) [FB13 2026-10-04].
- Previous performance: there is no PREVIOUS column in the sources; history is one level down in Exercise Details, and the recommendation is the number on screen. INFERRED from [FB7, FB15].

**2. Set entry mechanics**
- Entry: "Logging a set takes one tap" (hands-on, 30 Sep 2026) [FB21 2026-09-30]. A custom numeric pad is not described: UNKNOWN.
- Auto-fill: the recommended sets, reps and weight are pre-populated; any manual change feeds the algorithm ("The algorithm learns from adjustments") [FB15].
- Set types: warm-ups come from the My Plan "Warm-Up Sets" toggle or "Add Warm-Up Set"; AMRAP exists only on generated Max Effort Days. Drop and failure types are not listed: UNKNOWN [FB16, FB4, FB13].
- Effort: "Reps in Reserve (RiR), formerly Exertion Rating/RPE": after a set "enter your RiR rating when prompted"; 4+ (very easy) to 0 (failure); editable after logging; also at the bottom of Exercise Details or in the More menu as Easy to Hard; not for timed exercises [FB12 2026-09-21, FB7].
- Notes: More -> Notes -> Save [FB7].
- Units and weights: lb or kg in My Plan; per-equipment weight increments editable ("Tap Edit next to the equipment type") [FB16].
- Apple Watch can change reps, weight, distance, duration, resistance, incline or band per set, to a maximum of 9 sets per exercise [FB11 2026-09-03].
- Superset "Normalize Weights" (iOS only) balances weights across the group; "Can't find weight match" appears when the gap is too large [FB4].
- Plate calculator and warm-up calculator as tools: UNKNOWN. 1RM: an internal "Estimated Strength" (projected 1RM) drives prescriptions; a Strength Score (0 to 100 plus) is shown [FB13, FB15, FB21].

**3. Rest timer**
- "Once you log a set, the countdown starts and a tone and/or vibration will emit when it's time for your next set." The timer icon switches it ON or OFF per exercise; durations are "exercise and workout-specific, generated by lift difficulty". Adjusting before the workout changes all timers for that exercise; adjusting during a workout changes only the current timer [FB8 2026-07-26].
- Alerts: an in-app tone only while the app is open; otherwise a push notification, enabled under Workout Settings > Notifications > "When rest timer has ended" [FB8]. That notification is the Android lock-screen route; a dedicated Android ongoing-notification is not described.
- iOS Live Activities and the Dynamic Island show the current exercise, rest timers, duration and set and rep progress [FB9 2026-02-03].
- Apple Watch: rest timer with haptic and audio cues; the timer pauses when the screen dims because Always On is not supported [FB11]. Wear OS: logging works but "cannot initiate rest-timers"; adding or deleting exercises and editing values need the phone [FB10 2026-01-24].

**4. Mid-workout exercise management**
- Before, during and after the session [FB4 2026-09-28]: add with "+Add Exercise"; replace by swiping left -> Replace (sort by Best Replacements, Your Most Logged, Your Least Logged, Never Logged; equipment filter); delete by swiping left -> Delete; reorder by press-and-hold; build supersets and circuits from the "..." menu.
- Picker: filter icon matches your equipment; sort alphabetical or Most Logged; browse All, By Muscle groups, Recently Added, Custom Exercises, By Equipment, Weighted, Bodyweight Only, Bodyweight with Equipment, Cardio, Stretching & Mobility, Pregnancy [FB4]. "1,500+ exercises" in the getting-started guide against "1000+" on the listing [FB19 2026-08-30, FB1].
- Feedback buttons "Recommend More, Less, or Exclude" shape later selection [FB6].
- Instructions: hi-res multi-angle video plus steps [FB1, FB7]. History: inside Exercise Details [FB7]. Live PR hints: UNKNOWN.

**5. Finishing**
- Share: after finishing, the Share button at the bottom left; swipe to a workout card; post to Instagram Stories or More; this makes "a shareable summary image along with a link" [FB20].
- After logging: Log tab -> "..." on the workout -> Save New Workout, Edit Workout Duration, Delete; tap into the workout to edit exercises, sets, reps, weights [FB4].
- A post-workout muscle heat map shows muscle usage; recovery percentages (0 to 100) steer the next session [FB14 2026-09-22]. Weekly Set Targets count each primary-muscle set as 1 and each secondary-muscle set as 0.5 [FB18 2026-10-04].
- Skipped sets and a feel rating: UNKNOWN. Wear OS: after finishing on the watch you "must log the workout on your Android phone" [FB10].

**6. Resilience**
- "Fitbod supports offline training with local workout generation and set logging. Data syncs when reconnected. To avoid losing locally saved data, please reconnect and let the app sync before deleting it" (help-centre search excerpt, T1 via excerpt) [FB17 2026-09-04].
- The Apple Watch needs the iPhone to save a workout [FB11]. Resume after the app is killed: UNKNOWN.

**7. How it fits together**
- Named areas: Workout tab (My Plan, Swap), Log tab (history, settings), Body tab (Recovery), Targets tab (weekly set targets); Android uses "Your Gym Profile" for recovery [FB16, FB4, FB14 2026-09-22, FB18].
- Plan structure: splits (Push/Pull/Legs, Upper/Lower, Full Body, Fresh Muscle Groups); exercise variability (Consistent, Balanced, Variable); Focus Exercises (a compound movement per day, repeated weekly for four weeks with automatic progression); multiple gym locations that can be shared by link [FB16].
- Onboarding: questions on experience, goals and equipment; "If a workout feels too difficult, lower the sets, reps, or weight" [FB19]. Widgets: a next-workout widget "locked for 3 days" and a weekly ring [FB9].

**8. Praise, complaints, switching**
- Praise: "Decision fatigue SOLVED!... it decides my workouts based on the muscle groups I need to work" (5 stars, v8.15.0, 3 May 2026) [FB3 2026-05-03]. The App Store editors: "makes logging your exercises as simple as lifting the actual dumbbell" [FB2 f]. mwm.ai themes: personalised workouts (48), progress tracking (35), AI coaching tips (28) (T4) [FB3].
- Complaints: "Scammed... they have been charging me $15.99 since February 1st" (1 star, v8.16.0, 5 May 2026); "Needs a subscription... I would never recommend this app unless you want to be deceived" (1 star, v8.17.0, 11 May 2026); themes subscription cost (18) and injury modification (10) [FB3]. "No free version after 7-day trial ends"; "Limited long-term programming blocks compared to alternatives like Alpha Progression" (30 Sep 2026) [FB21]. Low-reliability SEO blog: the algorithm "needs 10-15 workouts of input data" [FB24 2026-04-30].
- Switching: "I am also tired of paying for Fitbod and it seems to only get worse over the years" (Hacker News, 24 Dec 2025) [X3 2025-12-24].

**9. Distinctive**
- Muscle recovery percentages that choose the day's muscles, viewable and editable [FB14].
- Max Effort Day: ramp-up sets then two AMRAP sets, auto-assigned, hideable per exercise, never user-started [FB13].
- Weekly Set Targets per muscle group with primary/secondary weighting [FB18].
- Shareable workout links that rescale for the recipient; shareable gym-equipment setups [FB20, FB16].
- "Normalize Weights" for supersets (iOS) [FB4].

**10. Price and tier.** No permanent free tier: 7-day trial, then old workouts stay readable but new ones cannot be logged (two sources). One T4-grade blog says "Free tier: 3 workouts" (see section 5). Paid: $15.99/mo, $95.99/yr; the pricing tracker also lists $79.99 and $12.99 SKUs and legacy "Elite" prices [FB22 2026-09-08, FB21 2026-09-30, FB23 2026-03-21, FB24]. Volyume is free: Fitbod gates all logging behind the subscription after seven days.

### 2.4 JEFIT

Snapshot. iOS 17.2.6, released 5 Oct 2026, 4.76 from 46,905 ratings; the listing says "over 12 million people" and the company's anniversary page says "over 13 million users" [JF1 2026-10-05, JF4 2025-07-15]. Founded 2010 by a solo developer; "a refreshed mobile app interface" and "faster, frictionless logging" were announced for the 15-year mark [JF4]. Kind: a logger on top of a 1,400-exercise library, community plans and, in Elite, an "Adaptive Plan" [JF1].

**1. Active-workout screen anatomy**
- Two modes. Tracker Mode is the traditional logger. Autoplay Mode runs timed workouts and "Logs are automatically recorded as the workout session runs", but "focuses solely on tracking timed workouts", not reps and weights [JF15 f].
- Logging screen (December 2023 redesign): "Swap exercise, exercise notes, and superset are now tucked in three dots menu"; "Swipe up to fold the video for focused logging"; a timer panel where the interval timer can be adjusted in place and "automatically switches to the rest timer after logging - NO simultaneous displays"; 1RM percentage with 3-month and 6-month history; "Pre-Log Set Editing" to "jump and edit between sets" [JF8 2023-12-08]. "Start Workout" sits on the My Plans page [JF8].
- Plan editor (May 2025): one screen where each set has its own type, reps, weight and rest time; interval timers toggle per exercise; cardio sets take a duration; reached from Workout tab -> My Plans -> Overview or Day Details -> three dots -> Edit [JF6 2025-05-16].
- Set row contents (column order, check or tap-to-complete) are not described in any source read: UNKNOWN. Set tags are warm-up, working, drop and failure [JF1].
- Previous performance: a user says the app will "remember Weights you lifted last time" [JF1]; two pre-fill settings exist (item 2) [JF7 2023-02-23].
- Prescription: Elite "built-in AI-powered progressive overload system" that "analyzes your past workout logs to suggest exactly what weight and reps to lift next" [JF1]. The vendor's own article does not say how the suggestion appears while logging or how to override it: UNKNOWN [JF9 f].

**2. Set entry mechanics**
- Pre-fill: "Load Exercise Reps From" chooses last workout's log (default) or the programmed value; "Load Last-Time Log" (premium) chooses last time for the exercise anywhere or last time in that routine. Weights are not described [JF7].
- Control type: a 2020 store review says weight and reps entry kept "resetting itself each time to a less intuitive scroller option instead of just using the keyboard"; current state UNKNOWN [JF2 2020-10-26]. Build 17.2.1 (16 Sep 2026) added "Edit available weights from workout screen" [JF2 f].
- RPE: JEFIT's own comparison pages say it is logged once per session, "not per individual set" (T3) [JF10 2026-09-04, JF11 2026-09-14]. INFERRED: no per-set RPE or RIR field.
- Notes and progress photos attach to any workout [JF1]. 1RM is calculated for every exercise [JF1].
- Timers as entry: per-set rest times; and from 17.2.6 "Set an interval timer on your sets and JEFIT will auto-log each one when the countdown ends, kick off rest, then start the next set automatically - no tapping needed" [JF1]. The interval timer syncs between phone and Apple Watch (17.2.3, 23 Sep 2026) [JF2 f].
- Plate calculator, warm-up calculator, per-exercise unit toggle: not found: UNKNOWN.

**3. Rest timer**
- "Rest and interval timers major upgrade" shipped in 17.0.10 (23 Jun 2026) [JF2 f]. Each exercise can have "a custom rest timer, stopwatch, or countdown" [JF1]; rest time can differ per set [JF6].
- Lock screen: "See your set count and rest timer right on your lock screen" [JF1]. Android equivalent: UNKNOWN.
- Watches: Apple Watch live-sync with heart rate and calories; Wear OS is claimed by JEFIT's own blog ("Jefit is the only app in this list with Wear OS support", a list that omits Hevy and Fitbod, which also have Wear OS apps) [JF1, JF13 2026-03-16]. The watch app is an Elite feature [JF14 f]. A 2022 store review of the watch app: "Timer will freeze so you have to keep tapping the screen to keep it moving" [JF2 2022-10-29].

**4. Mid-workout exercise management**
- Swap, notes and supersets are in the three-dots menu [JF8]. Elite members get "instant confirmation" when swapping (17.0.17, 11 Aug 2026) [JF2]; Hacker News: "I'd just as soon they didn't lock alternative exercises behind the paywall" [JF5 2025-07-18].
- Library: "1,400+ exercises with HD video instructions and animations" [JF1]. Custom exercise creation was redesigned with "dynamic equipment selection" (17.0.11, 24 Jun 2026) [JF2]. "Instant workout" builds a session from time, equipment and muscle focus [JF1].
- Exercise history on the logging screen: 1RM percentage and 3-month and 6-month records [JF8]; "Exercise progress charts improvements" (17.1.3, 28 Aug 2026) [JF2].
- PR hints: "Every record breaker in your sets triggers instant notifications" [JF8].

**5. Finishing**
- "Beautiful new share cards with milestones and 1RM records" (17.0.16, 7 Aug 2026); confetti when a training phase finishes (17.0.7, 22 May 2026); Strava syncing improvements (17.0.5) [JF2 f].
- Analytics named by the listing: volume, muscle focus, weekly sets per muscle, movement balance; automatic 1RM; muscle map; a recovery chart; body weight, body fat and measurements [JF1].
- Skipped sets, a feel rating: UNKNOWN. Injury tracking gained severity ratings and recovery reminders (17.0.9, 9 Jun 2026) [JF2].

**6. Resilience**
- Offline logging and resume after a kill: UNKNOWN. CSV export is praised [JF5]. "Continue as" login now syncs via iCloud Keychain [JF1].
- Field reports: "There is not A DAY that goes by without having to report a bug" (store review dated "Jul 25", year not shown) [JF2 f]; mwm.ai themes device sync issues (5) [JF3 f, T4].

**7. How it fits together**
- Workout tab -> My Plans (Overview, Day Details). Adaptive Plan (Elite): a 12-week programme as three four-week blocks (T3); periodisation "fully live on iOS" (17.2.4, 25 Sep 2026); DIY and custom plans support full mesocycle periodisation (17.1.0, 17.1.1); "Adaptive Plans available free with 7-day trial" (17.0.14, 8 Jul 2026) [JF12 2026-09-16, JF2].
- Plan library: "700+ built by JEFIT plus 20,000+ by the community" (T3) [JF12]. Calendar view and a widget to "jump straight into today's workout" [JF1].
- Onboarding "reimagined ... with animations and haptics" (17.1.2, 26 Aug 2026); reminders "drop directly into current training plan" (17.0.15) [JF2].

**8. Praise, complaints, switching**
- Praise: "I've stuck with it because it was the only app that did the simple function of creating a routine with a schedule then logging your performance over time" (Hacker News, 18 Jul 2025) [JF5]. "Lots of respect with allowing data export in a simple format like .csv" [JF5]. "Especially love the Apple Watch app" [JF5]. "It is exactly what I was looking for. User-friendly. Detailed data entry possible, without being over-complicated" (listing quote) [JF1]. "Over the last six months I've increased muscle mass and definition more than I ever had!" (v17.0.6, 7 May 2026) [JF3 2026-05-07].
- Complaints: "I'm really tired of the constant up-sell attempts. I really just want a dead simple app to track my work" and "Jefit is moving further and further away from that" (18 Jul 2025) [JF5]. "I stopped using the app around 2018 and went back to pencil and paper" [JF5]. "Unfortunately, many of the features are being placed behind the pay wall" (v17.0.0, 16 Apr 2026); "endlessly spam you with notifications" (v17.0.7, 22 May 2026) [JF3]. 2020: "Inputting your weight and reps has become more convoluted"; "The set counters were removed from the training outline page so you can't see how much you've done at a glance"; "I just wish they asked users what they like/dislike or need/don't need so they can avoid bloat" [JF2 2020-10-26]. GGR via search summary: "the free version has a lot of ads and not many cardio options" (T4) [JF17 undated]. mwm.ai negative themes: AI coach integration (11), UI updates (9) [JF3].
- Switching: a store reviewer "Used to use Jefit", moved to Gymaholic for Apple Watch support [GY4 f]. A 2024 reviewer "always come back to JETFIT" despite regular UI churn [JF2 2024-03-28].

**9. Distinctive**
- Autoplay Mode and interval timers that auto-log sets and chain into rest [JF15, JF1].
- Per-set type, reps, weight and rest in one plan editor [JF6].
- Two named pre-fill policies for reps and for "last time" source [JF7].
- A very large library plus 20,000 community plans (T3 count) [JF12]; Wear OS and Apple Watch (watch is Elite) [JF13, JF14].
- Vendor-described "Hard-Set Equivalents" weighted by "muscle activation intensity (EMG)" inside the progressive overload engine (CLAIM) [JF9].

**10. Price and tier.** Basic (free, ads): custom routines, 1,400 exercises with guided instructions, logging and history, community; custom exercises capped at 7 (T3 sources). Elite $12.99/mo or $69.99/yr: pro plans, advanced analytics, watch app, video demonstrations, ad-free [JF1, JF14 f, JF12]. Volyume is free; JEFIT's Hacker News thread is dominated by up-sell and paywall complaints (INFERRED reading of [JF5]), while mwm.ai's top machine-counted negative theme is AI coach integration, 11 mentions [JF3].

### 2.5 Boostcamp

Snapshot. iOS build 266, released 2 Oct 2026, 4.85 from 10,428 ratings; "Trusted by over 1,300,000 lifters. 300M+ workouts logged"; "11,000+ programs and an AI coach" [BC1 2026-10-02]. Kind: a programme library with a full tracker and, since March 2026, an AI programme builder [BC1, BC2 f]. Platforms: iPhone, iPad, Android; the Apple Watch app only "mirrors active workouts", with no native watch app and no Mac client by the vendor's own admission [BC5 f, BC6 2026-07].

**1. Active-workout screen anatomy**
- Set row (vendor description): "the exercise, target sets and reps, and your last logged weight"; "Hit the set, tap to log it. The rest timer starts automatically" [BC4 f]. Every set has RPE (5 to 10) and RIR fields [BC4]. Sets can be defined by rep range ("8 to 12") or RPE range ("RPE 7 to 9"); timed holds and planks are supported [BC6 2026-07].
- Gestures and menus (April 2024 guide): tap the exercise name for the demo video, past performance and PRs; tap the swap icon for coach suggestions or the three dots to replace; swipe left on a set to delete it (sets a coach added cannot be deleted) and on an exercise to remove one you added; tap the set number to mark Work, Warm-up, Drop or Failure; tap the Previous column's weight and reps to auto-fill today's set; a planner icon shows all scheduled weeks [BC9 2024-04-23].
- Screen-flow capture: during a session you can "add, delete, reorder, or swap exercises", "create a superset", and open the Plate Calculator without leaving the workout screen [BC10 f]. Top bar, bottom bar and the rest-timer position are not described: UNKNOWN.
- Lock screen: "Live Activities put your set and rest timer on the Lock Screen and Dynamic Island" [BC1].
- Prescription: programme targets per set; Auto Progression (PRO) "Get personalized weight targets that adjust based on your performance. Works with programs and empty workouts" [BC1]. "Hit your reps; the app loads next session's weights ... Miss reps and it adjusts down" (CLAIM) [BC4].

**2. Set entry mechanics**
- RPE and RIR are "first-class set-level fields on the free tier" and RPE-driven programmes "consume those fields natively" (T3 wording, by Boostcamp about itself) [BC7 2026-05].
- Auto-fill: tap the Previous column [BC9]; Auto Progression "fills in your weights" [BC4].
- Set types: Work, Warm-up, Drop, Failure [BC9]; "customizable warmup sets you can apply to any working weight"; supersets and drop sets [BC4].
- Plate calculator: "tells you exactly which plates to load on each side of the bar" [BC4]. e1RM curve "calculated from your top sets" [BC5]. PR families: max weight per rep range, max volume per session, max reps at a given weight; "Max Weight Reps" is a new PR type [BC4, BC1].
- Custom keyboard, steppers, per-exercise unit toggle: UNKNOWN. Apple Health syncs bodyweight [BC1].

**3. Rest timer**
- Auto-starts when a set is logged [BC4]; default, per-exercise and adjust-while-running controls: UNKNOWN.
- Live Activity and Dynamic Island on iOS [BC1]. Android equivalent: UNKNOWN. Apple Watch: mirror only [BC5].
- Field reports: "Update broke the timers and the app now closes inconsistently" (v258, 22 May 2026); mwm.ai theme "Timer Bugs (8): Rest timer resets during multitasking" (T4) [BC3 2026-05-22].

**4. Mid-workout exercise management**
- Add, delete, reorder, swap during a live session [BC10]. "Mid-workout exercise alternatives carry your weights over to substitutes" [BC4]. Build 266 adds "Similar Exercises: ... recommended alternatives for every exercise" [BC1]. A search-engine summary of the tips page says Boostcamp asks whether a swap applies "to future workouts, or just today" (T4; not seen in the fetched text) [BC9].
- Picker: exercise search was revamped in 252 (14 Mar 2026) [BC2 f]. Custom exercises and recents: UNKNOWN.
- Instructions: demo video on the exercise screen [BC9, BC1]. History: one tap on the name shows past performance and PRs [BC9].
- PR hints: "PRs are flagged the moment you hit them, with confetti and a record badge in the workout summary" [BC4].

**5. Finishing**
- A "shareable summary card" showing total volume and muscles worked [BC10]. Weekly Sunday report: PRs, weekly volume by muscle, adherence, workout list; year-end Wrapped (2025 review, build 250, 16 Dec 2025) [BC4, BC2 f].
- History month view and community photo sharing (265, 5 Sep 2026); PR reset (262); past workouts can be saved as templates from History [BC2, BC9].
- Skipped sets and a feel rating: UNKNOWN.

**6. Resilience**
- Vendor: "works offline once a program is loaded" [BC5 f]. A 2023 reviewer lost data "without stable internet"; the developer replied on 12 Mar 2024 that offline mode had been added [BC2 2024-03-12]. A 2025 reviewer reports a freeze "when completing workouts or skipping to the next day" (29 May 2025) [BC2 2025-05-29]. 2023: "completed workouts weren't registered" (9 Jul 2023) [BC2 2023-07-09].
- 2026: "I spent quite a while making a custom routine...only for it to disappear" (v255, 2 May 2026) [BC3 2026-05-02]. Resume after a kill: UNKNOWN.

**7. How it fits together**
- Surfaces named: a planner (all weeks), All Templates, All Programs, History tab, Community feed (263, 25 Jul 2026), Program Creator (redesigned in 264, 13 Aug 2026), AI programme creation (252) [BC9, BC2]. Full tab-bar order: UNKNOWN.
- Onboarding: a 30-step personalisation quiz covering goals, injuries and the exact equipment available, then a generated plan is revealed [BC10 f].
- Library: filter by goal, level and days a week; fork any programme; build your own multi-week mesocycle with no cap [BC5].

**8. Praise, complaints, switching**
- Praise: Lifehacker, quoted on the listing: "Boostcamp puts all of Reddit's best free workouts in one slick app...give Boostcamp a try" [BC1]. A Garage Gym Reviews tester, quoted on the listing: "Boostcamp is the best app I've ever used. I love all the data it provides" (T1 marketing quoting a review) [BC1]. A search summary says GGR put Boostcamp at the top of its best-apps list in July 2026 (T4) [X5 undated]. "I am loving the workout tracking portion of this app!" (v257, 15 May 2026) [BC3].
- Complaints: broken timers and a vanished routine (above); mwm.ai themes Subscription Pricing (7), User Interface (9) [BC3]. Boostcamp's own comparison admits "Boostcamp lacks native Apple Watch support, unlike Strong, Hevy, and JEFIT Elite" (T1 self-admission) [BC6].
- Switching: the vendor's framing, "Hevy ... you create a routine ... and progression across weeks is on you" (T3) [BC8 2026-07].

**9. Distinctive**
- 11,000+ community and coach programmes, each with progression built in; programmes such as nSuns, GZCLP, 5/3/1 run as written [BC1, BC5].
- RPE and RIR both on every set, free [BC7].
- Alternatives that carry the weights across [BC4]; community publishing of programmes [BC9].
- Pro Strength Score (0 to 100, IPF DOTS-based across squat, bench, deadlift, overhead press, rows) and a per-muscle volume heatmap [BC5].

**10. Price and tier.** Free: full tracker, programme library, custom builder with no cap, no ads. Pro "From $4.99/month · 7-day free trial", that is $59.99/yr or $14.99/mo; adds Strength Score, per-muscle heatmap, exclusive coach programmes and Auto Progression [BC5, BC8, BC1]. The pricing tracker shows six Pro SKUs from $11.99 to $79.99 and a $48.99 "Limited-Time Offer" [BC11 2026-06-05]. INFERRED: the "Auto Progression (PRO)" note repeats from build 241 (13 May 2025) through 266, so the feature predates this build [BC2].

### 2.6 Alpha Progression

Snapshot. iOS 7.6.2, released 30 Sep 2026, 4.92 from 2,200 ratings; the listing says "4.9 stars from 40,000+ lifters. 25 million workouts logged" and "App of the Day on the App Store, twice" [AP1 2026-09-30]. Kind: a logger whose Pro tier recommends a weight and rep target before every set. Platforms: iOS and Android [AP4 f]. No dedicated watch app, no web logging, no social feed, by the vendor's own comparison page (T3 about a rival, but a self-admission here) [AP7 2026-09-15].

**1. Active-workout screen anatomy**
- Exercise navigation: "A horizontal list of thumbnails shows all of the workout's exercises and functions as a tab header for switching between exercises and showing which are completed" [AP5 2026-09-10].
- Before each set: "the current recommendation is shown as a blue bubble" carrying a weight, a rep count and optionally an RIR target; "Recommendations shift from set to set because fatigue is real: set 3 is not set 1" [AP5, AP1 2026-09-30].
- Entry: "Weight, reps and RIR in two taps, with your notes and your last sets in view" [AP1]. "Your previous sets and notes remain visible so you do not need to remember what happened in the previous workout" [AP5].
- Rest timer "starts automatically as soon as you complete a set" with an alarm; lock-screen and Dynamic Island countdown [AP5, AP1]. Top bar, bottom bar and the Finish control: UNKNOWN.
- Multiple gyms (Pro): "Multiple gyms, each with its own equipment and weights; switch with one tap and your recommendations adjust" [AP1].

**2. Set entry mechanics**
- Weight uses "our convenient weight picker, which suggests likely weights but also has a keyboard for manual input"; RIR accepts half values such as 1.5 [AP5].
- RIR and recommendations are optional Pro features: "you can follow a generated plan and receive weight and rep recommendations without using either" [AP4 f].
- Supported set shapes: supersets, dropsets, bodyweight, assisted and timed exercises [AP1]. Notes can be pinned so they show every time the exercise is performed [AP5].
- Warm-up calculator (Pro): "warm-up sets are added automatically, scaled to the exercise, your first working set and the weights you have". Plate calculator (Pro): "exactly which plates to load, or the closest weight below if your plates don't add up" [AP1].
- Units: kg and lb, "even mixed" [AP1]. Records: weight, reps, volume, estimated 1RM and 10RM, best per muscle group [AP1].
- Per-set recommendation source: "your previous workouts and what you have already done today" [AP1]; the vendor pages read do not publish the formula (the plan-generator article, fetched for this, has no computation details) [AP4, AP9].

**3. Rest timer**
- Free tier: "Rest timer with alarm" [AP4]. Auto-start on set completion [AP5]. Live Activity and Dynamic Island arrived in 6.7 (30 Apr 2026), with iOS 16 to 18 fixes in 6.8.1 [AP2 f].
- A hands-on reviewer lists "No audio cues for workouts" and no smartwatch app (roadmap planned) as cons [AP6 2026-09-28]. mwm.ai counts "Apple Watch integration" as the top negative theme (12 mentions, T4) [AP3 f]. Android lock-screen equivalent: UNKNOWN.
- Per-exercise default, adjust-while-running and skip controls: UNKNOWN.

**4. Mid-workout exercise management**
- Switching exercises is by the thumbnail strip [AP5]. "Every detail stays editable, or build your own plan from scratch" [AP1]. Adding, replacing and reordering mid-session: not documented in the sources read (a search-engine summary says an exercise can be swapped easily, T4): UNKNOWN [AP1].
- Library: 795 exercises "filmed in a real gym with certified trainers. No stock footage, no animations"; filters for muscle, equipment, compound versus isolation; an "exercise evaluation of how well it builds muscle"; custom exercises can have a photo or copy an existing one [AP1].
- PR hints while logging: records are shown after the workout, "every record you beat" [AP1]. A live banner is not described: UNKNOWN.

**5. Finishing**
- "After every workout you see every record you beat: weight, reps, volume, estimated 1RM and 10RM, best per muscle group", plus charts for strength, volume, sets per muscle, workouts per week, bodyweight and measurements, streaks and achievements [AP1].
- Plans can be shared with friends or clients; CSV export can now be emailed, downloaded or copied (7.6.2) [AP1].
- Skipped sets and a feel rating: UNKNOWN.

**6. Resilience**
- "Works fully offline", including the progression recommendations; an optional account syncs devices; no account is needed to log [AP1, AP6 2026-09-28]. 6.2 (22 Oct 2025) was a "Critical set completion bugfix" [AP2 f].
- Field reports: "Why do I have my plan one day and the next day everything is gone? That makes no sense" (1 star, v6.4, 16 Jan 2026); mwm.ai "Input bugs (7): Weight logging issues reported" (T4) [AP3 2026-01-16]. Resume after a kill: UNKNOWN.

**7. How it fits together**
- Plan generator: pick goal, days, time, muscles to prioritise; it builds split, exercises, sets and rep ranges around the gym's equipment, "Beginners and advanced lifters get fundamentally different plans"; a one-off workout generator exists; periodisation and deloads ramp sets and RIR week by week [AP1].
- Plans can be edited day by day; "Workout/day import between plans" (6.3.1, 2 Jan 2026) [AP2 f]. History cannot be imported from other apps [AP6]. No social layer, no web logging [AP7].
- Onboarding promise: "Build your plan in a minute, then follow weight and rep recommendations" [AP1].

**8. Praise, complaints, switching**
- Praise: "completely replaced my need for a notebook" (10 Jul 2024) [AP2 2024-07-10]. "Very useful App! I have been tracking my training daily for half a year now and I'm really satisfied" (5 stars, v6.8, 9 May 2026) [AP3 2026-05-09]. A reviewer: "Very easy to use ... No bugs whilst using it ... Works fully offline" (28 Sep 2026) [AP6].
- Complaints: Apple Watch missing; input bugs; subscription cost (6 mentions) [AP3]. "The only thing I can think of to better my experience would be implementing some form of custom periodization in the free version" (3 stars, 9 May 2026) [AP3]. Reviewer cons: no audio cues, no mobility routines, cannot import history, limited cardio [AP6].
- Switching: "previous struggles with manual Excel tracking and inconsistent recommendations from competitors" (paraphrase of a 4 Feb 2023 review) [AP2 2023-02-04].

**9. Distinctive**
- The blue-bubble per-set target that updates inside the session as fatigue accrues [AP5, AP1].
- Per-gym equipment profiles that change both the plates shown and the recommendation [AP1].
- Half-value RIR; a weight picker that suggests plausible loads [AP5].
- Real-person exercise videos and a per-exercise "how well does it build muscle" rating [AP1].
- Logging with no account at all [AP1].

**10. Price and tier.** Free: unlimited logging, all 795 videos, own plans, rest timer, records, achievements, plan sharing, CSV export, no ads, no account. Pro $12.99/mo or $79.99/yr with a 14-day trial on the yearly plan (legacy $24.99 and $99.99 SKUs exist): plan and workout generators, progression recommendations, charts, multiple gyms, periodisation, deloads, plate calculator, warm-up calculator, exercise evaluations [AP1, AP4, AP8 2026-08-14]. Volyume is free: Alpha lists both calculators and the charts under Pro.

### 2.7 RP Hypertrophy (Renaissance Periodization)

Snapshot. iOS 1.7.0, released 1 Oct 2026, 4.29 from 236 ratings [RP1 2026-10-01]. The native iOS app launched in the US on 20 Dec 2025 (1.0.0); before that the product was a web app that reached its 0.31.0 build on 5 Sep 2025 [RP4 2026-05-14]. Platforms: iOS and the web app at training.rpstrength.com; the vendor's page lists Android as "coming soon" [RP3 f]. Kind: a mesocycle coach; "45+ premade training plans" and a custom "Meso Builder" [RP1]. Evidence for this app is thinner than for the others: the vendor documents mesocycle set-up and training advice in its help centre, not the logging screen, and Reddit was unreachable.

**1. Active-workout screen anatomy.** The set row, top bar and bottom bar are NOT established from any source read: UNKNOWN. What is observed:
- A "mesos" tab at the bottom of the screen, a (+) icon top right to create a block [RP8 2026-10-05].
- The vendor promises "Know exactly the weight and reps to hit every week" and that "workouts are fully customizable so you can change things on the fly" [RP1, RP3 f].
- A forum user describes the targets: "it starts you off at 3 RIR and then you go to 2, 1, and 0 RIR as the mesocycle progresses" (19 Sep 2023, web-app era) [RP13 2023-09-19].

**2. Set entry mechanics**
- Warm-ups: "We recommend you do not log warm up sets in the app, as the app treats all sets logged as working sets." So there is no warm-up set type [RP5 2026-10-05].
- Feedback: the vendor says the app "adjusts to your pump, soreness and workload feedback" [RP1, RP3]. A competitor's description adds joint pain, performance and "disruption" prompts (T3) [RP11 2025-04-26]. How and when the prompts appear is UNKNOWN.
- Exercise slots: each meso exercise is picked from a drop-down per muscle group or by a "flash" icon that lets the app choose; swapping an exercise "will reset that slot's data since the app cannot retrieve previous information" [RP8, RP9 2026-10-05].
- Units are chosen when a block is created and "this cannot be changed"; copying a block also cannot change units [RP8, RP9].
- RPE or RIR entry mechanics, plate calculator, notes, 1RM, duration sets: UNKNOWN.

**3. Rest timer**
- No timer is mentioned. The vendor's "Rest Times" article gives a four-box test (breathing normal, mentally ready, no supporting-muscle cramp, able to do at least 3 to 5 reps), "30 seconds to 5 minutes", and does not mention a timer [RP6 2026-10-05].
- A store reviewer asks for "rest timer functionality between sets" (review dated "Sep 8", year not shown; paraphrase) [RP2 f]. A search-engine summary of a help article no longer in the current help centre says the app "intentionally doesn't include a rest timer" because rest is not one-size-fits-all (T4) [RP15 undated]. A competitor's review says "It does not prescribe rest periods" (T3) [RP12 2025]. INFERRED: no rest timer; it looks deliberate.
- Live Activity, lock screen, watch: nothing found: UNKNOWN.

**4. Mid-workout exercise management**
- Customisation "on the fly" is promised [RP3]; the exact add, replace, reorder and remove controls are UNKNOWN. Exercise library: "250+ technique videos" [RP1].
- Per-exercise history and live PR hints: UNKNOWN.

**5. Finishing**
- "Finished Mesocycle": repeat the set-up, or copy the block; weights and targets transfer if nothing changed [RP9 2026-10-05]. Export lives under Settings > "Your Data"; importing is unavailable [RP10 2026-09-24].
- Session summary, sharing, feel rating, skipped sets: UNKNOWN.

**6. Resilience**
- A competitor said in April 2025, before the native app, that the product "requires internet (not truly offline)" (T3) [RP11]; the current state is UNKNOWN.
- Release notes include "Fixes layout issues preventing workout completion" (1.0.2, 10 Mar 2026) [RP2 f]. Resume after a kill: UNKNOWN.

**7. How it fits together**
- Block creation: premade templates (2-day full body to 6-day delt specialisation, upper/lower, push/pull/legs), build from scratch, or the Meso Builder (days per week, then a muscle emphasis of Emphasize, Grow or Maintain for each muscle, then the app builds the structure); block length includes a final deload week [RP7, RP8, RP4 2026-05-14].
- Muscle priorities arrived in 0.31.0 (5 Sep 2025) with a "new mobile meso planning experience" [RP4]. A separate RP Diet Coach & Planner app exists from the same seller [RP17 f].
- A store reviewer criticised "mandatory Monday start dates, lack of cardio logging, and missing calendar view for workout history" (paraphrase, review dated 18 Mar); the developer replied with scheduling options [RP2 f].
- Onboarding into a first workout: UNKNOWN.

**8. Praise, complaints, switching**
- Praise: a two-year user says gains "trumps the previous 10 in a landslide" (5 stars, 7 Jan) [RP2 f]. "I was stuck in a loop of second guessing my programming and I wanted to stop thinking about lifting and just blindly follow something" (forum, 30 Sep 2023) [RP13 2023-09-30].
- Complaints: "Decent - Not Worth the $" (store review, 18 Mar; paraphrase) [RP2]. "I don't think the app does anything better at all than the old RP spreadsheet based templates did" and "why am I going 2 RIR on ... cable curls" (forum, 19 Sep 2023) [RP13]. A competitor calls it "quite pricey" (T3) [RP11].
- Switching: the stated reason to adopt is decision fatigue, and the stated rival is the RP spreadsheet [RP13].

**9. Distinctive**
- A mesocycle with an RIR wave from 3 down to 0 and a built-in deload week [RP13, RP8].
- A pump, soreness and workload feedback loop (vendor CLAIM) [RP1].
- Muscle emphasis tags Emphasize, Grow, Maintain feeding a generated structure [RP4, RP8].
- No rest timer and no warm-up logging (INFERRED to be deliberate) [RP5, RP6].

**10. Price and tier.** No free tier. $34.99/mo or $299.99/yr ($24.99/mo); a 6-month term at $199.99 is reported by a T3 review [RP3, RP11]. Volyume is free. RP's annual price ($299.99) sits below Juggernaut AI ($349.99) and Dr. Muscle ($399.99) and its monthly price equals Juggernaut's; all three are far above the loggers.

### 2.8 Juggernaut AI

Snapshot. iOS 3.0.12, released 24 Sep 2026, 4.85 from 5,655 ratings [JA1 2026-09-24]. Build 3.0.0 (11 Aug 2026) was a "Complete rebuild with dashboard, streamlined workouts, and analytics overhaul"; 3.0.3 (15 Aug 2026) split the "Auto timer" into main lifts versus accessories; eleven further point releases are listed up to 24 Sep (3.0.1 to 3.0.12; 3.0.11 is not shown) [JA2 f]. Kind: an AI-driven powerlifting and powerbuilding coach from Juggernaut Training Systems ("designed by legendary coach Chad Wesley Smith ... technology by Tim Arnold") [JA1]. Platforms: iPhone, iPad, Apple Vision and Android; no Apple Watch listed (a rival's page, T3) [BC12 2026-07]. Evidence for the set row itself is thin: the vendor help centre points to a video, and the one screen-flow capture is mostly onboarding.

**1. Active-workout screen anatomy.** Set row, top bar and bottom bar: UNKNOWN [JA6 f, JA8 f]. What is observed or reported:
- Three main areas, from a search-engine summary of a Garage Gym Reviews write-up (T4): a Dashboard (progress through the programme, week overview), Workouts (the plan for the day) and Exercises (demo videos and written cues) [JA12 undated].
- A training day, same summary (T4): a daily readiness check, a guided warm-up, main lifts, accessories, then session feedback (difficulty rating and notes) [JA12].
- Vendor: the readiness rating drives changes "pre-session, intra-session, session to session, week to week, block to block, and program to program" [JA1].
- Targets: main lifts carry an RPE target; accessories carry an RIR target [JA4 f]. A flow capture counts 46 screens: 25 onboarding, 1 paywall, and 20 more (my subtraction) that it describes only through video-player controls [JA8].

**2. Set entry mechanics**
- RPE (main lifts): "the RPE ratings you input will adjust your weights and volume from set to set, and influence your targets for future weeks". RIR (accessories): "perform reps until you feel like you can only do 3 more reps, then stop and enter your total reps into the app"; the app "will track these numbers and make future weight suggestions" [JA4].
- Readiness: ratings combine with RPE and RIR "to adjust your training volume, intensity, and frequency" [JA4]. The scale is reported as 1 to 5 across motivation, sleep, calories and per-muscle soreness in one search summary and as 1 to 10 in another (T4, conflict, section 5) [JA12]. A user: it "asks about different body areas being sore, sleep, nutrition, to curtail or dial back" (v2.6.0) [JA3 f].
- A 2021 forum user: "if it wants me to do 5 sets of pull-ups, but on the second set I only get half of what's prescribed, it will remove the remaining sets" [JA10 2021-11-10]. A 2023 reviewer: the app caps load by readiness "before you begin warming up ... but the app will then totally ignore that limit during your warmups" [JA2 2023-04-12].
- Warm-ups: a "guided warm-up feature" aimed at "hitting your RPE targets"; the vendor admits "it may still have some bugs" and plans to consider the whole block [JA5 f]. Plate-math and RPE calculators are listed by a search summary (T4) while a September 2026 review says "No rack calculator, no built-in workout timer" (conflict, section 5) [JA12, JA7 2026-09-04].
- Substitutions: "The exercise substitutions available are excellent ... tons to choose, with great variety and short demo videos" (24 Mar 2021) [JA10 2021-03-24]. Notes, units, bar weights: UNKNOWN.

**3. Rest timer**
- Release notes confirm a timer: "Minor improvements to timer" (3.0.2, 14 Aug 2026) and "Auto timer split into upper/lower main lifts and accessories" (3.0.3, 15 Aug 2026) [JA2]. A 2021 user: "the workouts can be long if you're not strict on the rest timer" [JA10 2021-11-10].
- Against that, a 4 Sep 2026 review says there is "no built-in workout timer", and store-review titles list timers among missing basics [JA7, JA9 f]. INFERRED: the review is stale or refers to a different kind of timer.
- Lock screen, Dynamic Island, watch: UNKNOWN; no Apple Watch app is listed [BC12].

**4. Mid-workout exercise management**
- Exercise selection targets the user's weak points; powerbuilding users can choose a body part to emphasise [JA1]. Substitutions exist [JA10]. 300+ technique videos [JA7]. Add, reorder, remove, per-exercise history, live PR hints: UNKNOWN.

**5. Finishing**
- Session feedback (difficulty and notes), then automatic adjustment of future weights, sets and sometimes training days (T4 summary) [JA12]. Meet Day Advisor for competition attempts [JA7]. The 3.0.0 rebuild reworked analytics [JA2].
- Share cards and a PR list: UNKNOWN. Skipped sets: remaining sets are removed after underperformance, per a 2021 user (above) [JA10].

**6. Resilience**
- No offline capability is mentioned by a September 2026 review [JA7]. Store-review themes: free-trial confusion ("charged immediately via app store"), "Missing standard features: Apple Health integrations, timers, volume summaries" (T4, undated) [JA9]. A flow capture shows Apple Health toggles for sleep, weight and workout data in onboarding, against the review's "no Apple Health" (conflict) [JA8, JA7].
- Eleven listed point releases in about six weeks after the 3.0.0 rebuild, nearly all noted only as bug, UI or performance fixes (INFERRED stabilisation churn) [JA2]. Resume after a kill: UNKNOWN.

**7. How it fits together**
- Onboarding is long: authentication, Apple Health permissions, profile, training-history and recovery-factors quizzes, programme choice, preferences (nutrition goal, powerlifting versus bodybuilding, schedule, test dates, accessory selection, periodisation approach, lifting weaknesses), a generation screen, then the paywall at $34.99 a month [JA8 f].
- Scope: Powerlifting and Powerbuilding, plus a newer Strongman programme (T3) [BC12]. Help centre collections include Getting To Know JuggernautAI, Common Training Terms, Account & Billing, Live Q&A Roundups, Getting Ready for My Meet, Rehab & Injury Workarounds, squat and bench technique [JA13 f]. Weekly coach Q&As and a 30-minute call with the founder on the annual plan [JA7].

**8. Praise, complaints, switching**
- Praise: "I love how I don't have to think about my workout or warmup since Juggernaut tells me exactly what I need to do" (8 Jan 2025) [JA2 2025-01-08]. "It's like having the most knowledgeable coach ever who knows my situation" (22 Dec 2025) [JA2 2025-12-22]. "I've had this app for a little over a year and a half done several training cycles with it and have PR every single time" (v2.5.11) [JA3]. "I LOVE working off an app for workouts instead of spreadsheets" (24 Mar 2021) [JA10].
- Complaints: "Every session has my lifting really really really light, it is very annoying" (15 Mar 2021) [JA2]. "The volume can feel excessive or unpredictable ... some users report being prescribed more volume than their recovery can handle" (4 Sep 2026) [JA7]. "No trial, expects fee higher than some gyms" (v2.5.11) [JA3]. "Right now it's got me scheduled to deload every fourth week. Seems a little excessive to be on deload 25% of the time" (1 Dec 2021) [JA10]. Review titles: "Ridiculous Volume", "Too many exercises" [JA9].
- Switching: "cheaper than hiring a coach at $35/month" (paraphrase of a 22 Dec 2025 review) [JA2].

**9. Distinctive**
- A daily readiness check that changes that day's loads, plus set-to-set RPE adjustment [JA1, JA4].
- Block periodisation with competition peaking and a recoverable-volume model; a Meet Day Advisor [JA7].
- Automatic set removal when a lifter underperforms (a 2021 user report, not re-verified) [JA10].

**10. Price and tier.** No free tier. $34.99/mo or $349.99/yr; the App Store lists a single in-app purchase, "JuggernautAI Monthly $34.99" [JA7, JA11 2026-07-01]. Trial length is unresolved: 7 days with a card (review), 2 weeks (a rival's page), and a reviewer complaint "There was supposed to be a two week free trial" [JA7, BC12, JA9]. Volyume is free.

### 2.9 Caliber

Snapshot. iOS 5.16.1, released 8 Sep 2026, 4.84 from 5,992 ratings; "800+ exercises" [CB1 2026-09-08]. Kind: a human-coaching marketplace whose free app is a logger; tiers are Free, Caliber Plus and Premium Coaching [CB1]. Platforms: iOS and Android store badges [CB9 f]. No Apple Watch app: a 1.2K-vote request has been open since 29 Jun 2022 [CB8 2022-06-29]. Caliber runs a public feedback board with vote counts and a roadmap, which is the main source below [CB4, CB6, CB7]. Caveat: the roadmap page lists dark mode as "In Progress" although the changelog shows dark mode sections shipped in 2025, so it may lag.

**1. Active-workout screen anatomy**
- Custom keyboard (5.4.0, 13 May 2025): "context-specific keyboard with adaptive buttons"; the bottom-right button reads "Next Set", becomes "Complete" on the last set of an exercise and stays "Next Set" in supersets; a "Last" button "allows quick population of fields with previous values" [CB5 2025-05-13].
- Weight and reps field order is configurable (Menu > Workout) and is the default for new users [CB5]. Default exercise targets (sets, reps, time, rest) live in Menu > Workout [CB5].
- Superset create and edit flows were redesigned (28 Mar 2025); workout-level muscle groups are shown (21 Feb 2025) [CB4 f]. A store review: "I love being able to track the weight, how many reps I did before in the past, what muscle groups the exercise hits" (v5.12.2, 7 May 2026) [CB3 2026-05-07].
- Notes: "Leave notes and reminders for any exercise"; the notes field was expanded (5.11.1, 5.12.0) [CB9 f, CB2 f]. Top bar, bottom bar, timer placement: UNKNOWN.
- Prescription: plans carry targets; "Adaptive weight suggestions" is In Progress with 1.1K votes, described as "learn after a couple of workouts and then start to prefill my log with recommended weight sets and reps" [CB6 f, CB7 f].

**2. Set entry mechanics**
- The keyboard's "Last" button is the fill-from-previous control; the Next and Complete button doubles as the set-completion control [CB5].
- Set types: the board shows "Mark sets as warmups" (161 votes) and "Logging Dropsets" (248 votes) Under Consideration and "RPE for sets" (182 votes) Planned. INFERRED: none of the three exists yet [CB6 f].
- Plus-only: custom exercises, supersets, swapping exercises, nutrition targets [CB1]. Plate calculator and 1RM: not found; Plus adds a Strength Score and Strength Balance [CB1]. Time-based exercises exist (default settings include Time) [CB5]. Cardio logging is not available free: "you can't log any cardio workouts on the free version so it's useless to me" (1 star, 13 Feb 2026) [CB3 2026-02-13].

**3. Rest timer**
- "The timer now automatically starts as soon as you enter reps/time for a completed set"; this automatic start is Plus or Premium, switched on at Menu > Workout; it uses the exercise's rest time or the default, now settable "down to the second" [CB5]. A manual timer and stopwatch are in the free app (INFERRED from [CB9] "Automatic rest timer & stopwatch" and [CB5]).
- Open requests: "Have timer ding when outside of the app" (682 votes, Planned) and "Rest Timer enhancements" with a Live Activity and Dynamic Island (87 votes, Planned) [CB7, CB6]. INFERRED: no Live Activity yet and background alerts are not reliable. Android equivalent: UNKNOWN.

**4. Mid-workout exercise management**
- Swapping and custom exercises are Plus [CB1]. "Smart exercise substitutions" has 1.6K votes (Planned); "Substitute exercises in supersets" is In Progress [CB7, CB6]. Search was revamped (28 Mar 2025) and re-ranked by popularity (8 Sep 2026) [CB4].
- Instructions: "Detailed instructions and demonstration videos" and "Coach-led form videos for every exercise" [CB9]. A 3-star review noted an instruction text that contradicted its video (6 May 2026) [CB3].
- History and PR hints: previous reps are visible [CB3]; "Realtime Personal Bests" (5.12.1, 23 Feb 2026) calculates PRs "immediately after exercise completion rather than at workout end" [CB4 2026-02-10, CB2 f].

**5. Finishing**
- A "New Workout Summary Screen" with redesigned summary cards (10 Feb 2026); shareable workout completion cards and total volume (23 Dec 2025); direct Strava connection with automatic upload; CSV export of workout and cardio data (7 Oct 2025); reset exercise PRs and show PR dates (3 Mar 2026) [CB4].
- Estimated workout duration (533 votes, Planned) and calories (285 votes) are requested, so the summary does not yet carry them (INFERRED) [CB7]. Skipped sets and a feel rating: UNKNOWN.

**6. Resilience**
- An offline mode exists: "Offline mode fix" (5.12.2, 2 Mar 2026); mwm.ai counts "Limited offline mode" as a negative theme (8 mentions, T4); a rival's page says offline is in the free tier (T3) [CB2 f, CB3 f, JF11 2026-09-14]. "App freeze bug fix" shipped in 5.13.2 (22 Jun 2026) [CB2]. Resume after a kill: UNKNOWN.

**7. How it fits together**
- Plans section rebuilt with dark mode, plan duplication and export (5.7.1, 8 Oct 2025); Progress section rebuilt and moved to bottom navigation (14 May 2026); Circles and Communities plus an onboarding widget (5.8.1, 17 Nov 2025); Messenger for coach chat; Lessons [CB4, CB2, CB1].
- "Connect to AI": official MCP support for ChatGPT (8 Sep 2026), also Claude per the listing [CB4, CB1]. Strava, Apple Health, Hyrox exercise set [CB2].

**8. Praise, complaints, switching**
- Praise: tracking praised in store reviews, and coaching praised in older ones ("Coaching is the best investment I've made in my self", 7 Nov 2024) [CB3, CB2 2024-11-07]. mwm.ai themes: workout tracking (42), professional coaching (31), free version (28) (T4) [CB3].
- Complaints: no Apple Watch app (9 mentions) and limited offline mode (8) (T4); "the instructions say not to raise your leg too high ... But then the video shows this guy lifting his foot above his head!" (3 stars) [CB3]. Voted requests: Apple Watch app 1.2K, adaptive weights 1.1K, smart substitutions 1.6K, timer alert outside the app 682, Garmin 685 [CB7, CB8]. A rival (T3) notes adaptive suggestions "In Progress" and unreleased [JF11].
- Switching: none observed.

**9. Distinctive**
- Human coaches inside the logger: 1-on-1 messaging, video form reviews, weekly progress reviews [CB1].
- A custom keyboard with an adaptive Next / Complete button and a "Last" button [CB5].
- Strength Score (relative to potential for age and gender), Strength Balance, Workout Circles that share personal bests [CB1].
- A public, vote-ranked roadmap [CB6, CB7]; an MCP server for chat assistants [CB4].

**10. Price and tier.** Free: unlimited workout creation and logging, 800+ exercises, Circles, Apple Health, "Connect to AI". Plus: $9 to $12/mo or $36 to $72/yr across SKUs (plus a $3 "Supporter" tier): 120+ coach plans, Strength Score, Strength Balance, Lessons, nutrition targets, custom exercises, supersets, swaps, progress photos, automatic rest timer. Coaching about $200/mo with a 3-month minimum (T3) [CB1, CB10 2026-06-30, CB5, JF11]. Volyume is free: Caliber gates supersets, swaps, custom exercises and the auto-start timer.

### 2.10 Setgraph

Snapshot. iOS 26.9.2, released 18 Sep 2026, 4.72 from 6,157 ratings; the 18 Sep release added "Exercise Illustrations ... showing the start, middle, and end of the movement" [SG1 2026-09-18]. Kind: a swipe-first logger organised around exercise lists rather than routines. Platforms: iPhone and Apple Watch [SG1]. Android: one search-engine summary says an Android version exists; no primary page confirms it: UNKNOWN. The version numbers jumped from 10.x to 26.x on 18 Sep 2025, the build whose note reads "iOS 26 compatibility" (INFERRED: the scheme follows the iOS release) [SG2 f].

**1. Active-workout screen anatomy**
- Quick-log: "record a set with a simple right-swipe from their workout list"; "swiping on a logged set provides an option to instantly repeat it" [SG9 f]. The homepage: "Swipe to log reps and weight, pull straight from history, or add context with notes" [SG11 f].
- Lists: "Group exercises by Workout, Muscle Group, Program, Day of Week, and more with flexible lists"; colour-coding; an exercise can sit in several lists "for quick access to their history"; sort by recent completion, alphabetical or manual [SG1].
- Set row evolution (release notes): Set Input Screen redesign (10.1.2, 13 May 2025); set numbering and rest-time display (10.2.0, 16 Jul 2025); set order options (10.3.0, 25 Aug 2025); partial reps and date/time editing (10.3.1, 27 Aug 2025); set labels (26.2.0, 9 Dec 2025) [SG2 f]. The current column layout is not described: UNKNOWN.
- Analytics are reached "directly from the exercise screen"; a 1RM calculator appears in context [SG9]. Previous values: "pre-fills your last set data" (a Setgraph marketing claim, T3) while another Setgraph page says "previous values are a reference, not a progression command" [SG8 2026-10-05, SG7 2026-08-04].
- Rest timer on the Lock Screen or Dynamic Island, and a "Next Set Due" notification [SG1].

**2. Set entry mechanics**
- Swipe-right logs a pre-filled set from the list; swipe on a logged set repeats it [SG9, SG1].
- Smart Plates: choose or create a named plate configuration; enter the real bar weight ("Do not assume every bar weighs 45 lb"); pick "Evenly" (pairs) or "One Side"; tap plates on the set-entry screen; plus and minus controls adjust between sets; the page calls it an entry aid that "requires manual verification" [SG4 2024-11-07].
- Supersets, circuits and multisets logged together (26.6.0, 23 Jun 2026) [SG1, SG2]. Duration tracking and exercise properties (26.4.3); "calories, incline level, and sport-specific metrics" per session [SG2, SG1].
- 1RM: choose the formula; 1RM Percentage Tables [SG1]. "Filter set history by weight or rep range" [SG1].
- Notepad mode keeps the screen awake so data can be entered after every set (9.41, 25 Oct 2024) [SG6]. RPE, per-set type choices, per-exercise unit toggle: UNKNOWN.

**3. Rest timer**
- "Rest timers start automatically after recording a set" and "are accessible from your Lock Screen or Dynamic Island"; a global "Default Interset Rest" in Settings and a per-exercise value in the three-dot menu [SG1, SG5 2026-10-05].
- "Use the 'Next Set Due' notification to stay on track without reopening the app"; a Setgraph page describes "repeating a set from a timer notification" [SG1, SG7].
- Apple Watch: "Access Setgraph's core functionality directly on your Apple Watch"; a set-sheet sizing fix shipped in 26.4.4 (6 May 2026) [SG1, SG2]. Wear OS: none, per a rival's list (T3) [JF13 2026-03-16]. Adjust-while-running controls and Android behaviour: UNKNOWN.
- History of the gap: a 30 Aug 2022 reviewer asked for "a timer feature"; rest-time display arrived in 10.2.0 [SG2].

**4. Mid-workout exercise management**
- An exercise can be assigned to several lists and keeps one history [SG1]; INFERRED: any exercise can be logged from any list without a routine. "Build and customize your own routines, or use a plan. Either way it drops straight into your workout lists" [SG1].
- Library: illustrations for start, middle and end positions are shown while browsing [SG1]. Reorder: manual sort of the exercise list [SG1]. Replace and remove mid-session: UNKNOWN.
- History and PRs: per-exercise graphs and filters; a Personal Records tab and Share Cards (26.8.0, 18 Aug 2026); muscle recovery and muscle-group summaries (26.4.0) [SG1, SG2]. A live PR banner: UNKNOWN.

**5. Finishing**
- There is no described "finish workout" step: the app is exercise-centred and sessions are derived (INFERRED from [SG1], [SG7]). Daily Summary Stats, sharing and data export arrived in 26.3.0 (16 Feb 2026); streaks, rest days and a streak calendar in 26.5.0 (20 May 2026); Share Cards in 26.8.0 [SG2].
- Skipped sets and a feel rating: UNKNOWN.

**6. Resilience**
- Field reports: "Recent update CRASHES every time the app is minimized" (1 star, v26.3.0, 17 Feb 2026); "It has a tendency to change my weights between sessions" (3 stars, v26.2.2, 30 Jan 2026) [SG3 f]. A 13 Sep 2025 reviewer lists set order reversing and session-modal timing bugs [SG2].
- mwm.ai themes: streak bugs (12), watch sync (10), "Missing export option" (8); the last is probably stale because export shipped in 26.3.0 (INFERRED) [SG3, SG2]. Offline behaviour and resume after a kill: UNKNOWN.

**7. How it fits together**
- Lists and programmes are the structure; "Choose your primary focus" yields a personalised plan (aesthetic goals with muscles to "grow" or "define", or performance goals); an AI workout planner launched in 10.0.0 (2 Jan 2025); calendar and reminders; Apple Health [SG1, SG2].
- Onboarding: eight steps; the paywall appears during onboarding after a personalisation quiz, "a 7-day free trial for the yearly plan" and a lifetime option [SG9].

**8. Praise, complaints, switching**
- Praise: "I love seeing the total volume of weight I've lifted during each session" (5 stars, v26.3.1, 17 Mar 2026) [SG3 2026-03-17]. "wonderful app with no real issues to speak of" (paraphrased end of a 24 Feb 2024 review) [SG2 2024-02-24]. A Notes-app switcher: "I love the app and it is well deserving of its 5 star rating" (24 Feb 2023) [SG2 2023-02-24].
- Complaints: crash and weight-drift reports above; a 4-star downgrade after "UI bugs and feature creep" with "I'll have to start scoping out other apps" (13 Sep 2025) [SG2 2025-09-13].
- Switching: a user moved from tracking workouts in the Notes app [SG2 2023-02-24].

**9. Distinctive**
- Swipe-right logging from the list, and repeating the last set from the rest notification [SG9, SG7].
- Smart Plates tapping; lists instead of routines; exercise illustrations; Notepad mode; a lifetime purchase at $199.99 [SG4, SG1, SG6, SG10].

**10. Price and tier.** Free download with a Pro tier: $4.99/mo, $29.99/yr, $199.99 lifetime; the 7-day trial applies to the yearly plan; the free tier's limits are not stated in anything read [SG10 2026-07-01, SG9, SG1].

### 2.11 Gymaholic (Workout Tracker, Devenyi Gabor)

Snapshot. iOS 16.6, released 18 Sep 2026, 4.58 from 3,464 ratings; "Used by serious lifters for over a decade" [GY1 2026-09-18]. Kind: an Apple-ecosystem logger: iPhone, iPad, Apple Watch, Mac, Apple TV and Vision Pro [GY1, GY3 f]. Android: UNKNOWN (INFERRED iOS-only; see the name collision in section 1). The iPhone set row is not described in any source read.

**1. Active-workout screen anatomy.** Set row, top and bottom bars: UNKNOWN. Observed:
- The Watch is the headline surface: "Start, track, and log workouts directly from your Apple Watch. Record sets, reps, weight, heart rate, and calories without taking your phone out of your pocket" [GY1].
- The iPhone is "for planning workouts and tracking progress"; the Mac for "analyzing your training history"; Apple TV for "following workouts on a bigger screen" [GY1].
- Release notes: "iPhone workout screen enhancements; new drop sets feature" (15.7, 18 May 2026); "Improved workout exercise reordering on mobile" (16.3, 29 Jun 2026); "Fixed notes reset issue on iPhone" (16.2); "Exercise notes visibility; prevent workout edits option" (14.4, 17 Sep 2025) [GY2 f].

**2. Set entry mechanics**
- Set families on the vendor site: "Supersets, Tri-sets, Giant sets, Drop sets, Pyramid sets, Fail sets" [GY5 f]. Metrics: "1RM, Best 1RM, Personal records, Exercise notes" [GY5].
- A new plate calculator shipped in 14.5 (17 Sep 2025); a heart-rate graph in 14.6; voice guidance is built in [GY2, GY1]. Fill-from-previous, keyboard, units, RPE: UNKNOWN.

**3. Rest timer**
- "Rest timers and HIIT interval timers"; "Improved rest timer; discard changes option" (14.3, 23 Jul 2025) [GY1, GY2]. A reviewer reports "issues with rest timer functionality" and set navigation (T4 summary) [GY4 f]. A 9 Feb 2025 reviewer says the default voice coach "interrupts music playback" [GY3 f].
- Apple Watch: standalone logging; "Major Apple Watch app improvements" (15.8, 20 May 2026); "replace exercises from Apple Watch" (16.0, 5 Jun 2026) [GY1, GY2]. Live Activity and Android: UNKNOWN. A rival's page says all seven apps in its list log standalone on the Watch with offline sync and none has Wear OS except JEFIT (T3) [JF13].

**4. Mid-workout exercise management**
- "Discover alternative exercises" and Watch-side replacement (16.0); reordering improved (16.3) [GY2]. Library: "850+ exercises with interactive 3D animations", viewable on iPhone, Watch, Mac, Apple TV and Vision Pro [GY1].
- Plans: pre-made programmes "created by a competitive bodybuilding champion", build from scratch, modify any plan; an "AI Buddy" creates workouts and answers questions [GY1, GY5]. History and live PR hints: UNKNOWN.

**5. Finishing**
- Progress charts and personal records; an achievements system (15.4, 8 Apr 2026) and "enhanced Achievements" (15.8); social-media sharing (14.8, 6 Oct 2025); Apple Health writes workouts, calories and body metrics [GY1, GY2]. A reviewer values post-workout muscle analysis [GY4].
- Skipped sets and a feel rating: UNKNOWN.

**6. Resilience**
- An iCloud backup option shipped in 14.8; a "discard changes" option in 14.3 [GY2]. A 2024 reviewer: "Great, but annoying bugs not fixed for years" (3 Jul 2024) [GY2 2024-07-03]. A 2024 reviewer: it "synchs between my phone and two Apple Watches flawlessly" (7 Oct 2024) [GY3 2024-10-07]. Offline logging and resume after a kill: UNKNOWN.

**7. How it fits together**
- The Watch logs, the iPhone plans, the Mac analyses, the Apple TV guides; iOS 26 design, widgets and an AI Buddy conversion step (14.5, 14.6, 15.3) [GY1, GY2]. Onboarding: UNKNOWN. The free version "blocks workout titles" and lacks 3D models (user reports) [GY4].

**8. Praise, complaints, switching**
- Praise: "I have downloaded dozens of weight-tracking apps. And I've even paid for multiple. None come close to the functionality that is built into this great app" (9 Apr 2023) [GY2 2023-04-09]. "Used to use Jefit": switched for "superior Apple Watch support" (paraphrase) [GY4]. "The Perfect Workout app for the Apple Watch" (title) [GY4].
- Complaints: "Best weightlifting app. Aggressive paywall" (title) [GY4]. "Great Strength-Training App, But New Premium Model Diminishes Value..." (a long-time user on the move from one-time Pro to subscription) [GY4]. In 2017: "6.0 was a swing and a miss. They got back up to bat and hit a homer with 6.1" (23 Sep 2017) [GY2 2017-09-23]. "Great, but annoying bugs not fixed for years" [GY2].
- Switching: from JEFIT for Watch support [GY4].

**9. Distinctive**
- Standalone Watch logging with heart rate and 3D exercise animations, plus Mac and Apple TV companions [GY1].
- Voice guidance; an "AI Buddy" [GY1, GY5]; a history of one-time "Pro" and "Pro Gold" purchases before the subscription [GY6, GY4].

**10. Price and tier.** Premium $3.99/mo or $31.99/yr; legacy "Pro" $4.99 and "Pro Gold" $14.99 SKUs remain listed (UK: GBP 3.49 and 29.49); 7-day trial; the free version hides workout titles [GY6 2026-07-26, GY3, GY1, GY4].

### 2.12 Dr. Muscle

Snapshot. iOS 4.2609.2805, released 2 Oct 2026, 4.49 from 382 ratings; release notes: "Weekly updates! dr-muscle.com/timeline" [DM1 2026-10-02]. Kind: an AI "personal trainer in your phone" by Dr. Carl Juneau that prescribes every set [DM1]. Platforms: iPhone, Android (a 28 Jul 2026 note fixes the "Android Nav bar UI") and a web view of history [DM3 2026-10-01, DM1]. "34+ workouts, 500+ exercises" [DM1].

**1. Active-workout screen anatomy**
- Vendor description of a set: before it, "Get ready for 120 lbs"; after it, "How hard was that?"; the next set "adjusts automatically" [DM5 2025-04-26]. A "Save Set" button exists (a 1 Oct 2026 fix: "Fixed the Save Set button during mobility workouts") and a custom increment can be set per exercise ("Fixed: Custom increment in exercise setting") [DM3].
- A summary page exists ("Fixed: Freeze on summary page", 17 Aug 2026) [DM3]. Top bar, bottom bar, set-row columns: UNKNOWN.
- Interface quality, reported: "Interface is rough" (described as "ugly", "dated", "like a 2015 app") [DM7 2026-09-04].

**2. Set entry mechanics**
- Prescription: reps vary each workout (daily undulating periodisation) and weights follow [DM4 2026-04-04, DM1]. A search-engine summary of the vendor's progressive-overload page adds that it targets a few percent more per session and chooses another weight and rep combination when the user's increments do not allow it (T4, not seen in the fetched text) [DM5 2025-04-26].
- Set styles built in: drop sets, rest-pause ("rest 20-40 seconds, then squeeze out more reps"; a search summary says it is the default recommendation, T4), pyramid, reverse pyramid, back-off sets and a "Challenge Mode" AMRAP; RPE and RIR guidance after sets [DM4, DM1].
- Plate calculator, warm-up calculator, notes, units: UNKNOWN.

**3. Rest timer**
- "Automated Rest Management" sets rest from set style and goals; "Rest Timer: Get rest timer recommendations between sets" [DM4]. Lock screen, Dynamic Island and watch: UNKNOWN. A review says there is "No wearable/Apple Health integration" while the listing says Apple Health tracks calories and workout time (conflict, section 5) [DM7, DM1].

**4. Mid-workout exercise management**
- Exercise swapping exists: "Fixed: Restore workout after swapping exercise" (22 Jul 2026) and "Fixed: Custom exercise dialog shown when swapping exercise" (7 Jul 2026); "Improved: Superset flow" (7 Jul 2026) [DM3]. Custom exercises and workouts, 500+ exercises [DM1].
- History: "Full workout history" and charts for all exercises [DM1]. Live PR hints: UNKNOWN.

**5. Finishing**
- "Post-Workout Coaching: Feedback after each session with insights on performance" and AI progress reports (vendor CLAIM) [DM4]. Automated deloads cut sets by 50% and weights by 10%; "Automated Light Sessions" lower weights after a break of 10 days or more [DM4].
- Sharing, PR list, skipped sets: UNKNOWN.

**6. Resilience**
- Vendor: "Backed up in the cloud (never lose your data)" and "Offline Mode: Work out without internet" [DM1, DM4]. The vendor also says, about a rival, that it "fixes this issue by initiating several auto saves" (T3, and the author wrote "I was paid to try both apps") [DM6 2025-04-26].
- Fix log (observed failures): "Missing workout after Apple and Google Login" (1 Sep 2026); "Freeze during workout" and "Freeze on summary page" (17 Aug 2026); "Restore workout after swapping exercise" (22 Jul 2026) [DM3].

**7. How it fits together**
- Onboarding: "Busy? Get a custom program in 5 minutes", based on age, goals and experience; advanced users add their own exercises and workouts or upload a custom programme [DM1]. Chat with a human coach and the community, an AI chat, and history viewable online [DM1, DM4]. Free calorie and macro targets, with an optional AI meal planner [DM4].

**8. Praise, complaints, switching**
- Praise (older store reviews): "Great 'Set it and forget it' workout app!" (25 Sep 2020), citing automatic weight and rep selection and rest-pause halving session time [DM2 2020-09-25]. A 2021 user credits the progression logic during injury recovery (paraphrase) [DM2 2021-08-02].
- Complaints (a September 2026 review): the interface; $49 a month; "Not beginner-friendly; no form coaching"; billing and cancellation problems, "Being charged for a full additional year after attempting to cancel" [DM7].
- Switching: the vendor's pitch to Strong users is that Strong has "no autosave feature and workouts get lost after updates" (CLAIM, T3) [DM6].

**9. Distinctive**
- Fully automatic per-set prescription with an in-set effort question [DM5].
- Rest-pause as a default technique, automated deloads and light sessions after time off, DUP and "Strength Cycles" [DM4].
- The highest price in this set: $48.99/mo and $399.99/yr [DM1].

**10. Price and tier.** $48.99/mo or $399.99/yr. Trial: the listing says "No payment info needed" and gives no length; a review says 7 days with a card (unresolved, section 5); the same review says there is no free tier [DM1, DM7 2026-09-04]. Volyume is free.

## 3. Cross-app feature matrix

**Legend.** Cells read `value tag`. Y = yes, documented. P = partial or conditional (the condition is in the row note). N = no, stated by a vendor page or shown by an open vote request on the vendor's own board. N? = probably no, INFERRED from silence in documentation that otherwise covers the area. ? = unknown, not established (never read it as no). `$` after a value = sits behind a paid tier in an app whose basic logging is free. A tag in a cell is a source ID from section 7; a tag marked T3 or T4 in its row note is a competitor page or a summary, not the vendor. Columns, left to right: Hevy, Strong, Fitbod, JEFIT, Boostcamp, Alpha Progression (Alpha), RP Hypertrophy (RP), Juggernaut AI (JAI), Caliber, Setgraph, Gymaholic (Gym), Dr. Muscle (DrM). Fitbod, RP, Juggernaut AI and Dr. Muscle are paid from the start (row C10), so `$` is not repeated for them.

### 3A. Set entry and logging

| Capability | Hevy | Strong | Fitbod | JEFIT | Boostcamp | Alpha | RP | JAI | Caliber | Setgraph | Gym | DrM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 Previous values at the set | Y HV20 | P ST2 X1 | P FB7 | Y JF7 | Y BC9 | Y AP5 | ? | ? | Y CB5 | Y SG1 | ? | P DM5 |
| A2 One-gesture fill from previous | ? | ? | P FB15 | P JF7 | Y BC9 | ? | ? | ? | Y CB5 | Y SG9 | ? | P DM5 |
| A3 Custom keyboard or accessory bar | P HV39 | Y ST6 | ? | ? | ? | Y AP5 | ? | ? | Y CB5 | P SG4 | ? | P DM3 |
| A4 Per-set target shown before the set | P$ HV24 | N? ST1 | Y FB7 | P$ JF1 | P$ BC1 | Y$ AP5 | Y RP1 | Y JA4 | N CB7 | N? SG7 | N? GY1 | Y DM5 |
| A5 Warm-up set type | Y HV18 | Y ST8 | P FB4 | Y JF1 | Y BC9 | P$ AP1 | N RP5 | P JA5 | N CB6 | ? | ? | ? |
| A6 Drop-set type | Y HV18 | Y ST8 | ? | Y JF1 | Y BC9 | Y AP1 | ? | ? | N CB6 | ? | Y GY5 | Y DM4 |
| A7 Failure or AMRAP type | Y HV18 | Y ST8 | P FB13 | Y JF1 | Y BC9 | ? | ? | ? | ? | ? | Y GY5 | Y DM4 |
| A8 RPE or RIR per set | Y HV27 | Y ST6 | P FB12 | P JF10 | Y BC7 | Y$ AP4 | P RP13 | Y JA4 | N CB6 | ? | ? | Y DM5 |
| A9 Exercise notes that persist | Y HV25 | Y ST11 | Y FB7 | Y JF1 | P BC2 | Y AP5 | ? | P JA12 | Y CB9 | Y SG1 | Y GY5 | ? |
| A10 Plate calculator | Y HV39 | Y$ ST9 | ? | ? | Y BC4 | Y$ AP1 | ? | ? JA12 | ? | Y SG4 | Y GY2 | ? |
| A11 Warm-up calculator | Y$ HV40 | Y$ ST10 | P FB16 | ? | P BC4 | Y$ AP1 | N RP5 | Y JA5 | N? CB1 | ? | ? | ? |
| A12 Estimated 1RM | Y HV41 | Y ST14 | Y FB13 | Y JF1 | Y BC5 | Y AP1 | ? | ? | P CB1 | Y SG1 | Y GY5 | ? |
| A13 Duration or distance sets | Y HV28 | Y ST1 | Y FB7 | Y JF6 | Y BC6 | Y AP1 | ? | ? | P CB3 | Y SG2 | P GY1 | P DM3 |
| A14 Bodyweight, assisted, weighted | Y HV30 | Y ST1 | ? | ? | ? | Y AP1 | ? | ? | ? | ? | ? | ? |
| A15 Weight-unit toggle, global or per exercise | Y HV6 | Y ST1 | P FB16 | ? | ? | Y AP1 | P RP8 | ? | ? | ? | ? | ? |
| A16 Equipment or available-weights profile | P HV39 | P ST9 | Y FB16 | P JF2 | P BC10 | Y$ AP1 | N? RP8 | ? | ? | P SG4 | ? | P DM3 |
| A17 Rest-pause, cluster or pyramid set styles | N? HV18 | N? ST8 | ? | ? | N? BC9 | ? | P RP6 | ? | ? | ? | P GY5 | Y DM4 |

Row notes (3A).
- A1: Strong's own help is silent; a rival page (T3) says previous weights are pre-loaded and store reviews praise remembering last lifts [X1, ST2]. Fitbod and Dr. Muscle show a prescription in place of last time.
- A2: Caliber's "Last" key and Boostcamp's tap on the Previous column are the explicit fill controls; Setgraph swipes to repeat a logged set; JEFIT pre-fills reps from the last log by a setting; Fitbod and Dr. Muscle pre-set the prescription.
- A3: Hevy's bar above the keyboard carries the plate calculator. A 2020 JEFIT review said entry had become a scroller picker instead of the keyboard (current state unknown) [JF2].
- A4: Paid cells: Hevy Trainer (Pro), JEFIT Elite, Boostcamp Auto Progression (Pro), Alpha Pro. Strong N? because its feature list has no prescription; Setgraph N? because its own page says previous values "are a reference, not a progression command"; Gymaholic N? because the listing offers an AI Buddy for building workouts, not per-set targets.
- A5: Fitbod gets warm-ups from a plan toggle or the More menu, not a set tag; Alpha generates them in the Pro calculator; Juggernaut has a "guided warm-up feature"; Caliber's request is Under Consideration with 161 votes; RP tells users not to log them.
- A8: JEFIT is session-level by its own comparison pages (T3) [JF10]; RP's RIR wave is reported by a 2023 forum user and the entry control is unknown; Fitbod prompts for an Easy-to-Hard or 4+-to-0 rating; Alpha's RIR is a Pro option [AP4].
- A10: Juggernaut is unresolved: a search summary lists a plate-math calculator, a September 2026 review says "No rack calculator" [JA12, JA7].
- A11: Boostcamp has customisable warm-up templates, not a calculator; Fitbod has an automatic warm-up setting.
- A13: Gymaholic documents HIIT interval timers only; Caliber has time targets but no free cardio logging; Dr. Muscle has timed workouts and moved Jumping Jacks to reps.
- A16: Strong sets bar type per exercise; Boostcamp asks for equipment at onboarding; Setgraph stores named plate configurations; Dr. Muscle has a custom increment setting; Hevy has custom plates and bars plus Trainer equipment presets.
- A17: Hevy, Strong and Boostcamp list only their warm-up, drop, failure (and work) types, so N? is inferred from a closed list; RP's rest article names "myorep match set" as a technique, which is advice, not a set type [RP6]; Gymaholic lists pyramid, tri-set and giant-set families but not rest-pause; Dr. Muscle builds rest-pause, pyramid, reverse-pyramid and back-off sets into its prescriptions [GY5, DM4].

### 3B. Rest timer and surfaces outside the app

| Capability | Hevy | Strong | Fitbod | JEFIT | Boostcamp | Alpha | RP | JAI | Caliber | Setgraph | Gym | DrM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 Auto-start on set completion | Y HV5 | Y ST5 | Y FB8 | Y JF8 | Y BC4 | Y AP5 | N? RP6 | P JA2 | P$ CB5 | Y SG1 | P GY2 | P DM4 |
| B2 Default plus per-exercise duration | Y HV16 | Y ST5 | P FB8 | Y JF6 | ? | ? | N? RP6 | ? | Y CB5 | Y SG5 | ? | P DM4 |
| B3 Adjustable while it runs | Y HV5 | Y ST5 | Y FB8 | Y JF8 | ? | ? | ? | ? | ? | ? | ? | ? |
| B4 iOS lock screen, Live Activity, Dynamic Island | Y HV12 | Y ST1 | Y FB9 | Y JF1 | Y BC1 | Y AP2 | ? | ? | N CB6 | Y SG1 | ? | ? |
| B5 Android lock-screen or notification route | Y HV17 | ? | P FB8 | ? | ? | ? | ? | ? | N? CB7 | ? | ? | ? |
| B6 Apple Watch logging | Y HV1 | Y ST18 | Y FB11 | Y JF1 | P BC5 | N AP7 | ? | N? BC12 | N CB8 | Y SG1 | Y GY1 | ? |
| B7 Wear OS logging | Y HV32 | N? JF13 | P FB10 | Y JF13 | ? | N AP7 | ? | ? | ? | N? JF13 | N? JF13 | ? |
| B8 Complete or repeat a set from lock screen or notification | Y HV17 | ? | ? | ? | ? | ? | ? | ? | ? | P SG7 | ? | ? |
| B9 Sound or vibration at timer end | Y HV16 | Y ST5 | Y FB8 | ? | ? | Y AP5 | N? RP6 | ? | P CB7 | P SG5 | ? | ? |

Row notes (3B).
- B1: Caliber's auto-start is Plus-only (a manual timer is free); Juggernaut ships an "Auto timer" whose behaviour is unknown; Gymaholic has rest timers with auto-start not stated; Dr. Muscle sets rest from set style ("Automated Rest Management"); RP has no timer mention, INFERRED none.
- B2: Strong also keeps separate warm-up and working defaults; Fitbod's durations are generated from lift difficulty and edits last only for that workout; JEFIT sets rest per set.
- B3: Skip is documented for Strong (a Skip button in the expanded timer) and Hevy (the widget can "skip it altogether") [ST5, HV17].
- B4: Strong added it on 12 Aug 2026 and Alpha on 30 Apr 2026 [ST1, AP2]; Caliber's Live Activity request has 87 votes and is Planned [CB6].
- B5: Fitbod sends a push when the timer ends if the app is in the background; Caliber has a 682-vote request for a timer alert outside the app, status Planned.
- B6: Boostcamp's watch app only mirrors an active workout; Fitbod's needs the iPhone to start, swap and save; Strong's is a companion with fewer features.
- B7: Fitbod's Wear OS app logs sets but cannot start rest timers and cannot add or delete exercises; JEFIT's Wear OS claim comes from its own blog (T3); the Strong, Setgraph and Gymaholic N? cells come from JEFIT's smartwatch list (T3).
- B8: Setgraph's "Next Set Due" notification can repeat the previous set; Hevy's widget marks sets complete and adjusts the timer.
- B9: Hevy has five timer sounds and volume levels for its three alerts; Fitbod emits "a tone and/or vibration"; Alpha sounds an alarm; Caliber's 682-vote request for a timer ding outside the app implies an in-app alert only (INFERRED); Setgraph mentions alerts without detail [HV16, FB8, AP5, CB7, SG5].

### 3C. Mid-workout management, finishing, resilience, access

| Capability | Hevy | Strong | Fitbod | JEFIT | Boostcamp | Alpha | RP | JAI | Caliber | Setgraph | Gym | DrM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 Supersets or circuits | Y HV19 | Y ST7 | Y FB4 | Y JF1 | Y BC1 | Y AP1 | ? | ? | P$ CB1 | Y SG1 | Y GY5 | P DM3 |
| C2 Replace an exercise mid-workout | Y HV11 | P ST2 | Y FB4 | P$ JF8 | Y BC9 | ? | P RP9 | Y JA10 | P$ CB1 | ? | Y GY2 | Y DM3 |
| C3 Reorder exercises mid-workout | Y HV11 | Y ST4 | Y FB4 | ? | Y BC10 | ? | ? | ? | ? | P SG1 | Y GY2 | ? |
| C4 Exercise history or charts one tap from the workout | P HV28 | Y ST13 | Y FB7 | Y JF8 | Y BC9 | P AP5 | ? | ? | P CB3 | Y SG9 | ? | ? |
| C5 Live PR hint while logging | Y HV29 | ? | ? | Y JF8 | Y BC4 | P AP1 | ? | ? | Y CB4 | ? | ? | ? |
| C6 Share card or summary image | Y HV46 | P ST1 | Y FB20 | Y JF2 | Y BC10 | ? | ? | ? | Y CB4 | Y SG2 | P GY2 | ? |
| C7 Write-back prompt after in-session edits | Y HV22 | Y ST24 | ? | ? | P BC9 | ? | N? RP9 | ? | ? | ? | ? | ? |
| C8 Offline logging documented | ? | ? | Y FB17 | ? | Y BC5 | Y AP1 | N? RP11 | N? JA7 | P CB2 | ? | ? | Y DM4 |
| C9 Resume an unfinished workout after a kill | Y HV23 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | P DM3 |
| C10 Free logging with no time limit | Y HV24 | Y ST1 | N FB22 | Y JF14 | Y BC1 | Y AP1 | N RP3 | N JA7 | Y CB1 | P SG1 | P GY4 | N DM7 |
| C11 Exercise instruction media (video, animation, illustration) | Y HV31 | Y ST13 | Y FB7 | P$ JF14 | Y BC9 | Y AP1 | Y RP1 | Y JA7 | Y CB9 | Y SG1 | P GY1 | ? |

Row notes (3C).
- C2: Strong shows a Replace option on the Apple Watch (6.1.1); the phone path was not in the help read. JEFIT: swap is in the three-dots menu, and a Hacker News user complains alternative exercises are paywalled [JF5]. RP: swapping resets that slot's data. Juggernaut's evidence is a 2021 forum post. Caliber: swaps are Plus.
- C4: Hevy's exercise screen holds graphs, PRs and set records but a one-tap route from the live workout is not documented; Alpha keeps previous sets visible without a chart link; Caliber shows previous reps, with charts elsewhere.
- C5: Alpha shows records after the workout, not live; Caliber calculates PRs "immediately after exercise completion" since 10 Feb 2026 [CB4].
- C6: Strong has a share sheet for routines and workouts, not image cards (as far as read); Gymaholic added social-media sharing in 14.8.
- C7: Boostcamp's swap-today-or-future prompt is from a search summary (T4). RP copies a block instead of writing edits back.
- C8: RP and Juggernaut N? come from a 2025 competitor review and a September 2026 review that does not mention offline; Caliber has an offline mode with a "limited" theme (T4); Dr. Muscle's is a vendor claim.
- C9: Dr. Muscle's evidence is a fix log ("Restore workout after swapping exercise"), not a feature statement.
- C10: Fitbod's trial ends after 7 days; JEFIT's free tier carries ads; Setgraph's free limits are unpublished; Gymaholic's free version hides workout titles.
- C11: JEFIT lists video demonstrations under Elite; Gymaholic's free version lacks the 3D models (user reports); Fitbod removed GIFs and has no offline video; Alpha films its own gym videos and keeps all 795 in the free tier [JF14, GY4, FB7, AP1].
- Not tabulated: per-set notes and a post-workout feel rating. Hevy, Strong and Fitbod document exercise-level and workout-level notes only [HV25, ST11, FB7]; no vendor source read documents a post-workout feel rating, and Juggernaut's session feedback (difficulty rating and notes) is known only from a search summary (T4) [JA12].

## 4. The five things the best loggers agree on

"Best loggers" here means the apps whose logger is documented in vendor-grade detail and who rate highest on large counts: Hevy (4.92 from 96,234), Strong (4.86 from 108,525), Fitbod (4.81 from 286,624), Boostcamp (4.85), Alpha Progression (4.92), Caliber (4.84), JEFIT (4.76), Setgraph (4.72) [HV1, ST1, FB1, BC1, AP1, CB1, JF1, SG1]. A point counts as agreement only when at least four apps document it in a vendor source (T1) and none of the best-documented contradicts it. Counts below say "of twelve" and treat UNKNOWN as not documented.

**1. Completing a set is one deliberate tap, and completion is the trigger for what follows.**
- The rest timer starts on completion in eight of twelve: Hevy "triggered once you mark a set as completed" [HV5 f]; Strong "triggers immediately after a set is completed" [ST5 f]; Fitbod "Once you log a set, the countdown starts" [FB8 2026-07-26]; Alpha "starts automatically as soon as you complete a set" [AP5 2026-09-10]; Boostcamp "Hit the set, tap to log it. The rest timer starts automatically" [BC4 f]; Setgraph "start automatically after recording a set" [SG1 2026-09-18]; JEFIT "automatically switches to the rest timer after logging" [JF8 2023-12-08]; Caliber starts it "as soon as you enter reps/time for a completed set", Plus only [CB5 2025-05-13].
- Other behaviour hangs off the same act: Hevy's live PR banner appears on "a set that achieves a Personal Record" and only completed sets are saved [HV29 2026-10-01, HV10 f]; Caliber's keyboard key becomes "Complete" on the last set and PRs are calculated on exercise completion [CB5, CB4 2026-02-10]; Boostcamp flags PRs "the moment you hit them" [BC4]; Hevy's lock-screen widget completes sets [HV12 f].
- Where the trigger is missing or gated, users ask for it: Caliber's auto-start is Plus-only and a 682-vote request seeks a timer alert outside the app [CB5, CB7 f]; an RP store reviewer asks for a rest timer [RP2 f].
- Hands-on: "Logging a set takes one tap, which matters more than it sounds when you're sweaty, out of breath" [FB21 2026-09-30].
- Limit: only Hevy documents what happens to an unticked set at finish ("Hevy will only display the sets and exercises you've completed") [HV10 f].

**2. Last time's numbers sit at the point of entry, and one gesture copies them.**
- Hevy's PREVIOUS column, with a setting for "any workout" versus "same routine" as the source [HV20, HV21 2026-10-01]; Boostcamp "tap on the previous column's weight and reps to auto-fill" [BC9 2024-04-23]; Caliber's "Last" key [CB5]; Setgraph's swipe to repeat a logged set [SG9 f]; Alpha keeps "previous sets and notes" visible [AP5]; JEFIT has two pre-fill policies, "Load Exercise Reps From" and "Load Last-Time Log" [JF7 2023-02-23].
- Strong compares today with last workout in its Focus Metric, and a third party says previous weights are pre-loaded (second-hand) [ST12 f, X1 2026-03-13]. Fitbod and Dr. Muscle replace "previous" with a prescription: "Get ready for 120 lbs" [FB15 2026-09-15, DM5 2025-04-26].
- Pre-fill is also where complaints start: "It has a tendency to change my weights between sessions" (Setgraph, 3 stars, v26.2.2, 30 Jan 2026) [SG3 f]; Hevy added a setting to choose which history feeds the column [HV20].

**3. Set type and effort are attached to the row by small, optional controls, and warm-ups stay out of the numbers.**
- Type is set by tapping the set number in Hevy (W, D, F), Strong (Warm-up, Drop, Failure) and Boostcamp (Work, Warm-up, Drop, Failure); JEFIT tags sets warm-up, working, drop, failure, with the gesture not documented [HV18 2026-10-01, ST8 f, BC9, JF1].
- Effort is optional or hidden until wanted: Hevy's RPE column appears only when enabled [HV27 2026-10-01]; Strong's RPE lives on a keyboard key [ST6 f]; Alpha's RIR is optional and accepts half values [AP5, AP4]; Boostcamp carries RPE and RIR on every set [BC7 2026-05]; Fitbod asks for a rating after the set [FB12 2026-09-21].
- Warm-ups are kept out of stats: "Warm-up sets will not be included in charts or metrics" (Strong) [ST8]; Hevy has a stats toggle [HV15 2026-10-01]; RP tells users not to log them because "the app treats all sets logged as working sets" [RP5 2026-10-05].
- Demand where it is missing: Caliber's board has Mark sets as warmups (161 votes), Logging Dropsets (248) and RPE for sets (182) [CB6 f].

**4. Mid-session structure edits are cheap and sit in one menu, and the app asks what to do with them afterwards.**
- Hevy: a three-dots menu for reorder, replace and remove, then an "Update Routine" or "Keep Original Routine" choice [HV11 f, HV22 2026-10-01]. Strong: drag to reorder, and a four-way prompt (Update Template, Update Values Only, Update Template and Values, Keep Original Template) [ST4, ST24 f]. Fitbod: edit before, during and after, swap sorted by "Best Replacements" [FB4 2026-09-28]. Boostcamp: add, delete, reorder, swap, and alternatives "carry your weights over" [BC10 f, BC4].
- Gymaholic improved reordering and added Watch-side replacement in 2026 [GY2 f]. Dr. Muscle shipped "Restore workout after swapping exercise" on 22 Jul 2026, which shows the risk [DM3 2026-10-01].
- Friction where swaps are gated: "I'd just as soon they didn't lock alternative exercises behind the paywall" (JEFIT, 18 Jul 2025); Caliber swaps are Plus and "Smart exercise substitutions" has 1.6K votes [JF5, CB1, CB7].

**5. The rest timer has left the app.**
- Seven of twelve document an iOS lock-screen surface: Hevy, Strong (since 12 Aug 2026), Fitbod, JEFIT, Boostcamp, Alpha (since 30 Apr 2026), Setgraph [HV12 f, ST1 2026-08-12, FB9 2026-02-03, JF1 2026-10-05, BC1 2026-10-02, AP2 f, SG1]. One documents the Android equivalent: Hevy's lock-screen and pop-up widget [HV17 2026-10-01]; Fitbod sends a push when the timer ends [FB8].
- Two go further: Hevy's widget completes sets and adjusts the timer in 15-second steps; Setgraph's "Next Set Due" notification repeats the previous set [HV12, SG1, SG7].
- Caliber and RP document none; Caliber has an 87-vote Live Activity request and a 682-vote request for a timer alert outside the app [CB6, CB7].
- It is hard to do reliably: Strong shipped "Timer countdown background fix; Timer reset fix" (23 Feb 2026) and "Paused rest timer notifications fix" (16 Apr 2026); "Update broke the timers and the app now closes inconsistently" (Boostcamp, v258, 22 May 2026); a 2022 JEFIT Watch review: "Timer will freeze so you have to keep tapping the screen" [ST2 f, BC3 2026-05-22, JF2 2022-10-29].

**Where they do not agree (so no norm exists).**
- Who pays for what: logging is free in Hevy, Strong, Boostcamp, Alpha, Caliber and JEFIT (with ads); Fitbod, RP, Juggernaut AI and Dr. Muscle charge from the first week [HV24, ST1, BC1, AP1, CB1, JF14, FB22, RP3, JA7, DM1]. Plate and warm-up calculators are paid in Strong and Alpha, the warm-up calculator alone is paid in Hevy, and Boostcamp's plate calculator is free [ST16, AP1, HV24, BC4].
- Entry control: Strong and Caliber use custom keyboards with action keys, Hevy an accessory bar, Alpha a picker plus keyboard [ST6, CB5, HV39, AP5].
- Effort scale: RPE 6 to 10 (Hevy, Strong), RIR 4+ to 0 (Fitbod), both (Boostcamp), one prompt "How hard was that?" (Dr. Muscle) [HV27, ST6, FB12, BC7, DM5].
- Record or prescribe: Alpha, Fitbod, Dr. Muscle, Juggernaut AI and RP prescribe; Hevy (Trainer aside), Strong, Setgraph and Gymaholic record [AP1, FB6, DM5, JA4, RP1].
- Wrist: Apple Watch logging is common (Hevy, Strong, Fitbod, JEFIT, Setgraph, Gymaholic); Wear OS only in Hevy, JEFIT and, partially, Fitbod; Alpha and Caliber have no watch app and Boostcamp only mirrors [HV32, FB10, JF13, AP7, CB8, BC5].

## 5. Conflicts, ambiguities and evidence gaps

**Conflicts between sources (what each says, and what this file did).**
1. Hevy plate calculator and caps. RepReturn (13 Mar 2026, T3 possible competitor) says Hevy has no plate calculator and has unlimited routines [X1]. Hevy's help (1 Oct 2026) documents the plate calculator and a cap of 4 routines, 7 custom exercises and 3 months of history [HV39, HV24]. This file follows the vendor documents; GymGod (T3) agrees that Hevy has plate calculations [X2].
2. Hevy's set-row redesign build. The App Store history puts "Redesigned Set Row UI" at 3.1.10 (20 Aug 2026) [HV2]; an APKMirror summary attaches "clearer active/checked states ... RPE color scale" to 3.1.11 [HV47]. Unresolved; both are August 2026.
3. Strong's Live Activity date. The App Store history table has a "6.0.4, 4 Jun 2025" row that points to 6.5.0, while the release notes list Live Activity as New in 6.5.0 (12 Aug 2026) [ST2, ST1]. This file uses 6.5.0.
4. Fitbod trial and price. "Seven days, then you can still read old workouts but cannot log new ones" and "No free version after 7-day trial ends" [FB22, FB21] against "Free tier: 3 workouts" from a low-reliability SEO blog [FB24]. Annual price $95.99 [FB21, FB22] while the pricing tracker also lists $79.99 and $12.99 SKUs [FB23].
5. JEFIT. 12 million users (listing) against 13 million (anniversary page) [JF1, JF4]. "Jefit is the only app in this list with Wear OS support" comes from a list that omits Hevy and Fitbod, which have Wear OS apps [JF13, HV32, FB10]. Per-session RPE comes only from JEFIT's own comparison pages [JF10, JF11].
6. Boostcamp. The features page lists "Apple Watch companion that mirrors active workouts" while the comparison page admits it "lacks native Apple Watch support" [BC5, BC6]; consistent only if "mirror" means display (INFERRED). The "Auto Progression (PRO)" release note repeats from build 241 (13 May 2025) to 266 [BC2, BC1].
7. RP Hypertrophy. The vendor page says Android is "coming soon" while a search result shows a Play listing URL I could not read [RP3]. "No rest timer" rests on a search summary of a help article that is not in the current help centre, on silence in the current "Rest Times" article, and on a store request [RP15, RP6, RP2].
8. Juggernaut AI. Timer: "no built-in workout timer" [JA7] against "Auto timer" release notes and a 2021 forum post [JA2, JA10]. Readiness scale: 1 to 5 in one summary, 1 to 10 in another [JA12]. Trial: 7 days with a card [JA7], 2 weeks [BC12], a store-review title complaining the two weeks were missing [JA9]. Apple Health: onboarding toggles [JA8] against "No Apple Health" [JA7]. Calculator: plate-math listed [JA12] against "No rack calculator" [JA7].
9. Dr. Muscle. Trial "No payment info needed" [DM1] against a card required [DM7]; the listing says Apple Health tracks calories and workout time [DM1] while the review says "No wearable/Apple Health integration" [DM7].
10. Caliber. The roadmap shows dark mode "In Progress" although the changelog shipped dark-mode sections in 2025 [CB6, CB4]. The board shows no per-item dates, so every roadmap status is as of 2026-10-06 and may lag.
11. Setgraph. A "Missing export option" theme (8 mentions) against export shipping in 26.3.0 on 16 Feb 2026 [SG3, SG2]; read as a stale theme (INFERRED).
12. Gymaholic. Two different products share the name; the Android listing found belongs to the other one [GY7, GY8].

**Evidence gaps (UNKNOWN stays UNKNOWN).**
- Set-row anatomy is not established for RP, Juggernaut AI, Gymaholic (iPhone), JEFIT, and only partly for Setgraph and Caliber. For these the dossiers say so under item 1.
- Resume-after-kill is documented only for Hevy [HV23]. Offline logging is documented for Fitbod, Boostcamp and Alpha, indirectly for Caliber (a fix note and a "limited" review theme), and as a vendor claim for Dr. Muscle. Skipped-set handling at finish is documented only for Hevy.
- Android: Play pages are unreadable here, so Android evidence is whatever vendor help says. The Android lock-screen route is documented for Hevy and, partly, Fitbod.
- User voice: no Reddit; non-US storefront reviews were not read; Trustpilot was not fetched (a search summary reports Caliber at 5.0 from 922 reviews, T4, unused).
- Garage Gym Reviews verdicts appear only through search summaries (T4) [X5, JF17, JA12].

## 6. Capabilities worth checking against Volyume (judgement, not evidence)

Judgement only. No Volyume code was read in this lane, so none of these says Volyume lacks the capability. Each is a competitor capability that shows up in more than one app. Each is also checked against three constraints in CLAUDE.md that bear on the web evidence: a deterministic engine with no AI, a free product with no gating, and the ED-safety system.

1. A per-set target shown before each set, rounded to the user's available weights, with per-gym equipment profiles. Seen in Alpha [AP1, AP5], Fitbod [FB15, FB16], JEFIT's editable available weights [JF2] and Hevy Trainer equipment presets [HV36]. Demand signal: Caliber's 1.1K-vote request [CB7]. Constraint fit (INFERRED): Hevy calls its Trainer "algorithm-driven rather than AI" [HV35], so a rules-based version matches how a competitor describes itself.
2. Completing or repeating the next set from the lock screen or a notification, and adjusting rest from there. Hevy documents it on iOS and Android [HV12, HV17]; Setgraph repeats the previous set from its notification [SG7]. Only Hevy documents an Android route.
3. A write-back choice after in-session structural edits. Hevy's "Update Routine / Keep Original Routine" and Strong's four-way prompt [HV22, ST24]. Both market leaders built it.
4. A live PR banner on the completing set. Hevy, JEFIT, Boostcamp and Caliber [HV29, JF8, BC4, CB4]. Check the copy against the coaching-voice rules and the calm mode; PR banners concern lifts, not body weight (INFERRED).
5. One-gesture fill from last time ("Last" key, tap Previous, swipe to repeat). Caliber, Boostcamp, Setgraph [CB5, BC9, SG9].
6. Wear OS wrist logging. Hevy, JEFIT, and Fitbod in part [HV32, JF13, FB10]. Relevant to an Android-first product; only three of twelve apps offer it, and Fitbod's version cannot start rest timers [FB10].
7. Free plate and warm-up calculators. Paid in Strong and Alpha, and the warm-up calculator is paid in Hevy [ST16, AP1, HV24]. For a free product this is positioning, not engineering.
8. Per-muscle weekly set targets and a recovery or volume heat map. Fitbod [FB18, FB14], JEFIT [JF1], Boostcamp Pro [BC5]. Check against the ED-safety system before any recovery wording.
9. A mid-session swap that carries weights across, plus a "similar exercises" list. Boostcamp [BC4, BC1].
10. Interval-timer auto-log of timed sets. JEFIT 17.2.6 only [JF1]; niche.

## 7. Sources

Every citation tag used anywhere in this file is resolved below to its URL, the source's own date and its tier (section 0). A tag in the text can carry the date of an individual review, post, release note or changelog entry inside a page whose own date is "undated" or a range; the date in this list is the page's own date or last-updated stamp. "undated page, fetched 2026-10-06" means the page shows no date and 2026-10-06 is the day it was read. Pages the fetch tool could not read are cited only where a search-engine summary supplied the fact, and say so.

### Hevy

- **HV1** (2026-10-02, T1) App Store listing text, release notes, rating, in-app prices (lookup API and listing page): https://itunes.apple.com/lookup?id=1458862350&country=us ; https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350
- **HV2** (undated page, fetched 2026-10-06, T2) App Store page: version history table and store reviews: https://apps.apple.com/us/app/id1458862350
- **HV3** (undated page, fetched 2026-10-06, T4) mwm.ai machine review analysis; quotes carry rating, version, date: https://mwm.ai/apps/hevy-workout-tracker-gym-log/1458862350
- **HV4** (undated page, fetched 2026-10-06, T1) Hevy features index: https://www.hevyapp.com/features/
- **HV5** (undated page, fetched 2026-10-06, T1) Hevy rest timer feature page: https://www.hevyapp.com/features/workout-rest-timer/
- **HV6** (undated page, fetched 2026-10-06, T1) Hevy workout settings feature page (twelve settings): https://www.hevyapp.com/features/workout-settings/
- **HV7** (undated page, fetched 2026-10-06, T1) Hevy exercise programming options page: https://www.hevyapp.com/features/exercise-programming-options/
- **HV8** (undated page, fetched 2026-10-06, T1) Hevy set types page: https://www.hevyapp.com/features/workout-set-types/
- **HV9** (undated page, fetched 2026-10-06, T1) Hevy start-empty-workout page: https://www.hevyapp.com/features/start-empty-workout/
- **HV10** (undated page, fetched 2026-10-06, T1) Hevy workout log page (finish, what is saved): https://www.hevyapp.com/features/workout-log/
- **HV11** (undated page, fetched 2026-10-06, T1) Hevy track-workouts page (add set, three-dots menu): https://www.hevyapp.com/features/track-workouts/
- **HV12** (undated page, fetched 2026-10-06, T1) Hevy Live Activity feature page: https://www.hevyapp.com/features/live-activity/
- **HV13** (undated page, fetched 2026-10-06, T1) Hevy plate calculator feature page: https://www.hevyapp.com/features/weight-plate-calculator/
- **HV14** (2026-07, T1) Hevy July 2026 community update: https://www.hevyapp.com/community-updates/july-26/
- **HV15** (2026-10-01, T1) Help: workout settings: https://help.hevyapp.com/hc/en-us/articles/33882110558743-Workout-Settings-Preferences-Timer-Warm-up-calculator-Plate-Calculator-Smart-Superset-Scrolling
- **HV16** (2026-10-01, T1) Help: rest timer: https://help.hevyapp.com/hc/en-us/articles/35385404949143-Rest-Timer-Default-Rest-Timer-How-to-Add-Adjust-Volume-and-Sound
- **HV17** (2026-10-01, T1) Help: Live Activity on iOS and Android: https://help.hevyapp.com/hc/en-us/articles/35649846517399-How-to-Use-Hevy-s-Live-Activity-on-iOS-and-Android
- **HV18** (2026-10-01, T1) Help: set types: https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More
- **HV19** (2026-10-01, T1) Help: supersets and Smart Superset Scrolling: https://help.hevyapp.com/hc/en-us/articles/35650286563095-The-Complete-Guide-to-Supersets-and-Smart-Superset-Scrolling
- **HV20** (2026-10-01, T1) Help: previous workout values: https://help.hevyapp.com/hc/en-us/articles/36011896355479-How-to-Use-Previous-Workout-Values-to-Improve-Performance-in-Hevy
- **HV21** (2026-10-01, T1) Help: previous versus routine values: https://help.hevyapp.com/hc/en-us/articles/34105442929943-Previous-Workout-Values-Vs-Routine-Values-How-to-Adjust-in-Settings
- **HV22** (2026-10-01, T1) Help: Update Routine versus Keep Original Routine: https://help.hevyapp.com/hc/en-us/articles/38387296276375-Update-Routine-vs-Keep-Original-Routine
- **HV23** (2026-10-02, T1) Help: uninstall and reinstall, unfinished workouts: https://help.hevyapp.com/hc/en-us/articles/38223672272791-What-will-happen-to-my-information-if-I-uninstall-and-reinstall-the-Hevy-app
- **HV24** (2026-10-04, T1) Help: features guide with free versus Pro table: https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2025-Features-Guide
- **HV25** (2026-10-03, T1) Help: exercise notes: https://help.hevyapp.com/hc/en-us/articles/34463684392983-How-do-the-exercise-notes-routine-and-workout-notes-work
- **HV26** (2026-10-05, T1) Help: build a programme, folders, set types: https://help.hevyapp.com/hc/en-us/articles/34953606698903-Build-a-Workout-Program-Create-Organize-Routines
- **HV27** (2026-10-01, T1) Help: RPE: https://help.hevyapp.com/hc/en-us/articles/35687721776663-How-to-Use-RPE-Rate-of-Perceived-Exertion
- **HV28** (2026-10-01, T1) Help: PRs and set records: https://help.hevyapp.com/hc/en-us/articles/35649367857175-Personal-Records-PRs-and-Set-Records-Explained-How-They-Work-in-the-Hevy-App
- **HV29** (2026-10-01, T1) Help: live PR notifications: https://help.hevyapp.com/hc/en-us/articles/36012016405655-Hevy-Live-PR-Notifications-Get-Instant-Updates-on-Your-Best-Lifts
- **HV30** (2026-10-01, T1) Help: bodyweight, assisted, weighted: https://help.hevyapp.com/hc/en-us/articles/38386262243223-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted
- **HV31** (2026-10-01, T1) Help: exercise library and custom exercises: https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises
- **HV32** (2026-10-01, T1) Help: Wear OS compatibility: https://help.hevyapp.com/hc/en-us/articles/34895840771479-WearOS-Watch-Compatibility-and-Syncing-Troubleshooting
- **HV33** (2026-10-01, T1) Help: how to log a workout: https://help.hevyapp.com/hc/en-us/articles/35361530647959-How-to-Log-a-Workout-in-the-Hevy-App-Step-by-Step-Guide
- **HV34** (2026-10-01, T1) Help: pause and adjust duration, Save Workout screen: https://help.hevyapp.com/hc/en-us/articles/34513981310615-How-to-I-adjust-duration-and-pause-a-workout
- **HV35** (2026-10-01, T1) Help: Hevy Trainer explained: https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program
- **HV36** (2026-10-01, T1) Help: Trainer settings: https://help.hevyapp.com/hc/en-us/articles/43572343844247-How-Hevy-Trainer-Settings-Work
- **HV37** (2026-10-01, T1) Help: widgets: https://help.hevyapp.com/hc/en-us/articles/36956630666647-Hevy-App-Widgets-Explained-Setup-Features-and-How-to-Use-Them
- **HV38** (2026-10-01, T1) Help: deleting sets, workouts, routines: https://help.hevyapp.com/hc/en-us/articles/38030200802583-How-to-Delete-Comments-Sets-Workouts-Routines-Your-Hevy-Account
- **HV39** (2026-10-01, T1) Help: plate calculator, custom plates and bars: https://help.hevyapp.com/hc/en-us/articles/34518876511383
- **HV40** (2026-10-01, T1) Help: warm-up calculator: https://help.hevyapp.com/hc/en-us/articles/35650921359639-How-to-Use-the-Warm-Up-Calculator-for-Percentage-Based-Warm-Up-Sets
- **HV41** (2026-10-01, T1) Help: estimated 1RM and rep-to-percentage table: https://help.hevyapp.com/hc/en-us/articles/36954464726167-Understanding-Your-Estimated-One-Rep-Max-1RM-in-Hevy
- **HV42** (2026-10-01, T1) Help: 150-set limit (read via help-centre search excerpt): https://help.hevyapp.com/hc/en-us/articles/34896183826455-Hevy-Set-Limit-Explained-Why-Workouts-and-Routines-Have-a-150-Set-Cap
- **HV43** (2026-10-05, T2) Independent Hevy review quoting Hevy's help centre: https://aitoolsbakery.com/?p=18424
- **HV44** (2026-09-15, T3) SensAI (competitor) Hevy review: https://www.sensai.fit/blog/hevy-review-2026
- **HV45** (undated, T4) Hands-on Hevy review; page returned 403, read through a search-engine summary: https://cellphoneplans.androidauthority.com/CellPhones/Guides/hevy-app-review
- **HV46** (undated page, fetched 2026-10-06, T1) Hevy's own best-tracker page (monthly report, sharing, drawbacks list): https://www.hevyapp.com/best-workout-tracker-app/
- **HV47** (2026-08-28, T4) APKMirror 3.1.11 entry; page returned 403, read through a search-engine summary: https://www.apkmirror.com/apk/hevy-gym-workout-tracker/hevy-gym-log-workout-tracker/hevy-gym-log-workout-tracker-3-1-11-release/

### Strong

- **ST1** (2026-08-12, T1) App Store listing text, release notes 6.5.0, rating: https://itunes.apple.com/lookup?id=464254577&country=us
- **ST2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577
- **ST3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/strong-workout-tracker-gym-log/464254577
- **ST4** (undated page, fetched 2026-10-06, T1) Help: how do I perform a workout: https://help.strongapp.io/article/229-my-first-workout
- **ST5** (undated page, fetched 2026-10-06, T1) Help: rest timer: https://help.strongapp.io/article/231-rest-timer
- **ST6** (undated page, fetched 2026-10-06, T1) Help: RPE: https://help.strongapp.io/article/230-about-rpe
- **ST7** (undated page, fetched 2026-10-06, T1) Help: supersets and circuits: https://help.strongapp.io/article/98-supersets-and-circuits
- **ST8** (undated page, fetched 2026-10-06, T1) Help: warm-up, drop and failure set tags: https://help.strongapp.io/article/166-set-tags
- **ST9** (undated page, fetched 2026-10-06, T1) Help: plate calculator: https://help.strongapp.io/article/169-plate-calculator
- **ST10** (undated page, fetched 2026-10-06, T1) Help: warm-up calculator: https://help.strongapp.io/article/171-warm-up-calculator
- **ST11** (undated page, fetched 2026-10-06, T1) Help: workout notes, exercise notes, pinned notes: https://help.strongapp.io/article/134-about-notes
- **ST12** (undated page, fetched 2026-10-06, T1) Help: Focus Metric: https://help.strongapp.io/article/226-focus-metric
- **ST13** (undated page, fetched 2026-10-06, T1) Help: exercise detail screen: https://help.strongapp.io/article/237-about-exercise-detail
- **ST14** (undated page, fetched 2026-10-06, T1) Help: records screen: https://help.strongapp.io/article/216-exercise-records-screen
- **ST15** (undated page, fetched 2026-10-06, T1) Help: lost data: https://help.strongapp.io/article/217-lost-data
- **ST16** (undated page, fetched 2026-10-06, T1) Help: what Strong PRO unlocks: https://help.strongapp.io/article/132-strong-pro
- **ST17** (undated page, fetched 2026-10-06, T1) Help: why an account is needed: https://help.strongapp.io/article/143-strong-account
- **ST18** (undated page, fetched 2026-10-06, T1) Help: Apple Watch app: https://help.strongapp.io/article/222-strong-for-apple-watch
- **ST19** (undated page, fetched 2026-10-06, T1) Help: best way to train with Strong: https://help.strongapp.io/article/236-best-way-to-train
- **ST20** (undated page, fetched 2026-10-06, T1) Help: force sync: https://help.strongapp.io/article/241-force-sync
- **ST21** (undated page, fetched 2026-10-06, T1) Help: Session Expired prompt: https://help.strongapp.io/article/218-session-expired
- **ST22** (undated page, fetched 2026-10-06, T1) Help: templates disappearing on iOS: https://help.strongapp.io/article/253-templates-disappearing
- **ST23** (undated page, fetched 2026-10-06, T1) Help: templates, free limit of 3: https://help.strongapp.io/article/105-about-templates
- **ST24** (undated page, fetched 2026-10-06, T1) Help: update-template prompt after a workout: https://help.strongapp.io/article/177-update-template
- **ST25** (undated page, fetched 2026-10-06, T1) Help: edit a past workout: https://help.strongapp.io/article/249-how-do-i-edit-a-past-workout
- **ST26** (undated page, fetched 2026-10-06, T1) Help centre index, category pages 131, 165, 233, 128 and a search for incomplete sets: https://help.strongapp.io/
- **ST27** (undated page, fetched 2026-10-06, T1) Strong website feature list: https://www.strong.app/
- **ST28** (2026-10-05, T4) unitQ quality scorecard (score and trend only): https://unitq.com/unitq-scorecards/strongworkouttracker
- **ST29** (2026-04-05, T4) App Pricing Lab: Strong in-app purchase SKUs: https://apppricinglab.com/iap/apple/464254577
- **ST30** (undated page, fetched 2026-10-06, T1) Help: what is Strong (platform support): https://help.strongapp.io/article/228-what-is-strong

### Fitbod

- **FB1** (2026-10-06, T1) App Store listing text, release notes 8.35.1, rating: https://itunes.apple.com/lookup?id=1041517543&country=us
- **FB2** (undated page, fetched 2026-10-06, T2) App Store page: editors' note, store reviews, version history: https://apps.apple.com/us/app/id1041517543
- **FB3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/fitbod-gym-fitness-planner/1041517543
- **FB4** (2026-09-28, T1) Help: editing workouts (read through the help-centre API): https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod
- **FB5** (2026-08-11, T1) Help: customising today's workout: https://help.fitbod.me/hc/en-us/articles/38318585683991
- **FB6** (2026-10-02, T1) Help: how Fitbod creates your workout: https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout
- **FB7** (2026-07-10, T1) Help: exercise details screen: https://help.fitbod.me/hc/en-us/articles/30721437384215-How-to-Navigate-the-Exercise-Details-Screen
- **FB8** (2026-07-26, T1) Help: rest timer: https://help.fitbod.me/hc/en-us/articles/360006340194-Rest-Timer
- **FB9** (2026-02-03, T1) Help: iOS widget and Live Activities: https://help.fitbod.me/hc/en-us/articles/360058341233-iOS-Widget
- **FB10** (2026-01-24, T1) Help: Wear OS on Android: https://help.fitbod.me/hc/en-us/articles/4406074415383-WearOS-on-Android
- **FB11** (2026-09-03, T1) Help: Apple Watch: https://help.fitbod.me/hc/en-us/articles/360006499194-Apple-Watch
- **FB12** (2026-09-21, T1) Help: Reps in Reserve: https://help.fitbod.me/hc/en-us/articles/360033133174-Reps-in-Reserve-RiR-Formerly-Exertion-Rating-RPE
- **FB13** (2026-10-04, T1) Help: Max Effort Day: https://help.fitbod.me/hc/en-us/articles/360033675553-Max-Effort-Day
- **FB14** (2026-09-22, T1) Help: muscle recovery: https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery
- **FB15** (2026-09-15, T1) Help: how sets, reps and weight are decided: https://help.fitbod.me/hc/en-us/articles/43489869175063-How-does-Fitbod-decide-my-sets-reps-and-weight
- **FB16** (2026-09-26, T1) Help: My Plan settings: https://help.fitbod.me/hc/en-us/articles/34336407191191-My-Plan
- **FB17** (2026-09-04, T1) Help: offline use (read via help-centre search excerpt): https://help.fitbod.me/hc/en-us/articles/360006572594-Can-I-use-Fitbod-without-an-internet-connection
- **FB18** (2026-10-04, T1) Help: weekly set targets: https://help.fitbod.me/hc/en-us/articles/24739986755223-Weekly-Set-Targets
- **FB19** (2026-08-30, T1) Help: getting started: https://help.fitbod.me/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide
- **FB20** (2026-01-15, T1) Help: sharing workouts, gyms, summaries: https://help.fitbod.me/hc/en-us/articles/360006427453-Sharing-a-Workout-Gym-Location-Settings
- **FB21** (2026-09-30, T2) Independent hands-on Fitbod review: https://fitnessdrum.com/fitbod-review/
- **FB22** (2026-09-08, T3) SensAI (competitor) pricing comparison: https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison
- **FB23** (2026-03-21, T4) App Pricing Lab: Fitbod in-app purchase SKUs: https://apppricinglab.com/iap/apple/1041517543
- **FB24** (2026-04-30, T4) SEO-style blog review; low reliability: https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b

### JEFIT

- **JF1** (2026-10-05, T1) App Store listing text, release notes 17.2.6, rating: https://itunes.apple.com/lookup?id=449810000&country=us
- **JF2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id449810000
- **JF3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/jefit-workout-plan-gym-tracker/449810000
- **JF4** (2025-07-15, T1) JEFIT 15-year story: https://www.jefit.com/our-story
- **JF5** (2025-07-18, T2) Hacker News thread '15 Years of Building Jefit' (read through the Algolia API): https://news.ycombinator.com/item?id=44568761 ; https://hn.algolia.com/api/v1/items/44568761
- **JF6** (2025-05-16, T1) JEFIT blog: unified workout editing screen: https://www.jefit.com/blog/meet-jefits-all-new-unified-workout-editing-screen
- **JF7** (2023-02-23, T1) JEFIT blog: pre-fill value settings: https://www.jefit.com/blog/teach-jefit-how-you-workout-with-pre-fill-value-settings
- **JF8** (2023-12-08, T1) JEFIT blog: revamped workout tab and logging screen: https://www.jefit.com/blog/upcoming-enhancements-revamped-workout-tab-and-improved-exercise-screens
- **JF9** (undated page, fetched 2026-10-06, T1) JEFIT blog: progressive overload system: https://www.jefit.com/blog/the-new-era-of-jefit-the-progressive-overload-system
- **JF10** (2026-09-04, T3) JEFIT's own JEFIT versus Strong comparison: https://www.jefit.com/blog/jefit-vs-strong
- **JF11** (2026-09-14, T3) JEFIT's own JEFIT versus Caliber comparison: https://www.jefit.com/blog/jefit-vs-caliber
- **JF12** (2026-09-16, T3) JEFIT's own four-app comparison: https://www.jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy
- **JF13** (2026-03-16, T3) JEFIT's own smartwatch roundup: https://www.jefit.com/blog/best-apps-to-log-sets-and-reps-on-smartwatch-in-2026-top-7-tested
- **JF14** (undated page, fetched 2026-10-06, T1) JEFIT Basic versus Elite plans: https://www.jefit.com/elite
- **JF15** (undated page, fetched 2026-10-06, T1) JEFIT Autoplay mode page: https://www.jefit.com/download/autoplay
- **JF17** (undated, T4) Garage Gym Reviews JEFIT verdict; page returned 404, read through a search-engine summary: https://www.garagegymreviews.com/equipment/jefit

### Boostcamp

- **BC1** (2026-10-02, T1) App Store listing text, release notes build 266, rating: https://itunes.apple.com/lookup?id=1529354455&country=us
- **BC2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1529354455
- **BC3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/boostcamp-gym-workout-fitness/1529354455
- **BC4** (undated page, fetched 2026-10-06, T1) Boostcamp workout tracker page: https://www.boostcamp.app/workout-tracker
- **BC5** (undated page, fetched 2026-10-06, T1) Boostcamp features page (the second URL redirects to the first): http://www.boostcamp.app/features ; https://boostcamp.app/features
- **BC6** (2026-07, T3) Boostcamp's own workout-logging comparison: https://www.boostcamp.app/best/workout-logging
- **BC7** (2026-05, T3) Boostcamp's own RPE and RIR comparison: https://www.boostcamp.app/best/rpe-rir
- **BC8** (2026-07, T3) Boostcamp's own Hevy comparison: https://www.boostcamp.app/alternatives/hevy
- **BC9** (2024-04-23, T1) Boostcamp blog: ten tips and tricks: https://www.boostcamp.app/blogs/tips-and-tricks-to-using-boostcamp-app
- **BC10** (undated page, fetched 2026-10-06, T2) ScreensDesign UI-flow capture of the app: https://screensdesign.com/showcase/boostcamp-gym-workout-fitness
- **BC11** (2026-06-05, T4) App Pricing Lab: Boostcamp in-app purchase SKUs: https://apppricinglab.com/iap/apple/1529354455
- **BC12** (2026-07, T3) Boostcamp's own JuggernautAI comparison: https://www.boostcamp.app/vs/juggernautai

### Alpha Progression

- **AP1** (2026-09-30, T1) App Store listing text, release notes 7.6.2, rating: https://itunes.apple.com/lookup?id=1462277793&country=us
- **AP2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1462277793
- **AP3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/alpha-progression-gym-tracker/1462277793
- **AP4** (undated page, fetched 2026-10-06, T1) Alpha Progression homepage: https://alphaprogression.com/en
- **AP5** (2026-09-10, T1) Alpha Progression guide to the app: https://alphaprogression.com/en/blog/alpha-progression-guide
- **AP6** (2026-09-28, T2) Independent hands-on Alpha Progression review: https://fitnessdrum.com/alpha-progression-app-review/
- **AP7** (2026-09-15, T3) Alpha Progression's own Hevy comparison: https://alphaprogression.com/en/blog/alpha-progression-vs-hevy
- **AP8** (2026-08-14, T4) App Pricing Lab: Alpha Progression in-app purchase SKUs: https://apppricinglab.com/iap/apple/1462277793
- **AP9** (undated page, fetched 2026-10-06, T1) Alpha Progression plan-generator article (no computation detail): https://alphaprogression.com/en/blog/alpha-progression-workout-plan-generator

### RP Hypertrophy

- **RP1** (2026-10-01, T1) App Store listing text, release notes 1.7.0, rating: https://itunes.apple.com/lookup?id=1555614554&country=us
- **RP2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1555614554
- **RP3** (undated page, fetched 2026-10-06, T1) RP Hypertrophy official page (platforms, prices): https://rpstrength.com/pages/hypertrophy-app
- **RP4** (2026-05-14, T1) Help: what's new (read through the help-centre API): https://help.rpstrength.com/hc/en-us/articles/34725726510999-RP-Hypertrophy-App-What-s-new
- **RP5** (2026-10-05, T1) Help: warm-ups and starting weights: https://help.rpstrength.com/hc/en-us/articles/43549480893591-Warm-ups-and-Starting-Weights
- **RP6** (2026-10-05, T1) Help: rest times: https://help.rpstrength.com/hc/en-us/articles/43549598219799-Rest-Times
- **RP7** (2026-10-05, T1) Help: template selection: https://help.rpstrength.com/hc/en-us/articles/43549415338007-Template-Selection
- **RP8** (2026-10-05, T1) Help: mesocycle creation: https://help.rpstrength.com/hc/en-us/articles/43746837058583-Mesocycle-Creation
- **RP9** (2026-10-05, T1) Help: finished mesocycle: https://help.rpstrength.com/hc/en-us/articles/44019834219543-Finished-Mesocycle
- **RP10** (2026-09-24, T1) Help: importing and exporting data (read via search excerpt): https://help.rpstrength.com/hc/en-us/articles/43551864598423-Importing-Exporting-Data
- **RP11** (2025-04-26, T3) Dr. Muscle (competitor) review of RP Hypertrophy: https://dr-muscle.com/rp-hypertrophy-app-for-strength-training-expert-review/
- **RP12** (2025-05, T3) Dr. Muscle (competitor) second review of RP Hypertrophy: https://dr-muscle.com/rp-hypertrophy-app-review/amp
- **RP13** (2023-09-19, T2) Exodus Strength forum thread, user posts of 19 and 30 Sep 2023: https://www.exodus-strength.com/forum/viewtopic.php?p=327524
- **RP15** (undated, T4) Help article not in the current help centre; read through a search-engine summary: https://help.rpstrength.com/hc/en-us/articles/30805293312407-Why-is-there-no-rest-timer
- **RP17** (undated page, fetched 2026-10-06, T1) iTunes search result: RP Strength's apps: https://itunes.apple.com/search?term=RP+Hypertrophy&entity=software&country=us&limit=5

### Juggernaut AI

- **JA1** (2026-09-24, T1) App Store listing text, release notes 3.0.12, rating: https://itunes.apple.com/lookup?id=1515756471&country=us
- **JA2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1515756471
- **JA3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and review quotes: https://mwm.ai/apps/juggernautai/1515756471
- **JA4** (undated page, fetched 2026-10-06, T1) Help: RPE and RIR: https://help.jtsstrength.com/en/articles/2-all-about-rpe-and-rir
- **JA5** (undated page, fetched 2026-10-06, T1) Help: rest days, meet date, warm-up features: https://help.jtsstrength.com/en/articles/27-optimizing-training-with-juggernautai-a-guide-to-rest-days-meet-date-adjustments-and-warm-up-features
- **JA6** (undated page, fetched 2026-10-06, T1) Help: welcome (points to a video): https://help.jtsstrength.com/en/articles/1-welcome-to-juggernautai
- **JA7** (2026-09-04, T2) Independent JuggernautAI review: https://aitoolsbakery.com/blog/juggernautai-review/
- **JA8** (undated page, fetched 2026-10-06, T2) ScreensDesign UI-flow capture (46 screens): https://screensdesign.com/apps/juggernautai/
- **JA9** (undated page, fetched 2026-10-06, T4) Store-review titles and machine-summarised themes: https://justuseapp.com/en/app/1515756471/juggernautai/reviews
- **JA10** (2021-03-24, T2) Exodus Strength forum thread, posts from 24 Mar to 1 Dec 2021: https://www.exodus-strength.com/forum/viewtopic.php?p=131379
- **JA11** (2026-07-01, T4) App Pricing Lab: JuggernautAI in-app purchase: https://apppricinglab.com/iap/apple/1515756471
- **JA12** (undated, T4) Garage Gym Reviews JuggernautAI review; page returned 404, read through search-engine summaries: https://www.garagegymreviews.com/juggernautai-review
- **JA13** (undated page, fetched 2026-10-06, T1) Juggernaut help centre home: https://help.jtsstrength.com/en/

### Caliber

- **CB1** (2026-09-08, T1) App Store listing text, release notes 5.16.1, rating: https://itunes.apple.com/lookup?id=1482405410&country=us
- **CB2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1482405410
- **CB3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/caliber-strength-training/1482405410
- **CB4** (2026-09-08, T1) Caliber announcements (changelog) board: https://feedback.caliberstrong.com/announcements
- **CB5** (2025-05-13, T1) Caliber 5.4.0 release notes: https://feedback.caliberstrong.com/announcements/caliber-540-custom-keyboard-automatic-rest-timer-default-exercise-settings-sundaymonday-start-date-g
- **CB6** (undated page, fetched 2026-10-06, T2) Caliber public roadmap (no per-item dates; may lag): https://feedback.caliberstrong.com/roadmap
- **CB7** (undated page, fetched 2026-10-06, T2) Caliber feature-request board with vote counts: https://feedback.caliberstrong.com/b/7vz226vy/feature-ideas
- **CB8** (2022-06-29, T2) Caliber Apple Watch app request (created 29 Jun 2022): https://feedback.caliberstrong.com/b/7vz226vy/feature-ideas/apple-watch-app
- **CB9** (undated page, fetched 2026-10-06, T1) Caliber workout app page: https://caliberstrong.com/workout-app/
- **CB10** (2026-06-30, T4) App Pricing Lab: Caliber in-app purchase SKUs: https://apppricinglab.com/iap/apple/1482405410

### Setgraph

- **SG1** (2026-09-18, T1) App Store listing text, release notes 26.9.2, rating: https://itunes.apple.com/lookup?id=1209781676&country=us
- **SG2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1209781676
- **SG3** (undated page, fetched 2026-10-06, T4) mwm.ai review analysis and 2026 review quotes: https://mwm.ai/apps/setgraph-gym-workout-tracker/1209781676
- **SG4** (2024-11-07, T1) Setgraph article: Smart Plates: https://setgraph.app/articles/smart-plates-effortless-weight-calculation-for-lifters
- **SG5** (2026-10-05, T1) Setgraph article: rest timer: https://setgraph.app/articles/get-the-most-out-of-setgraph-s-rest-timer
- **SG6** (2024-10-25, T1) Setgraph article: Notepad mode: https://setgraph.app/articles/setgraph-9-41-notepad-mode-for-faster-logging
- **SG7** (2026-08-04, T3) Setgraph's own Hevy comparison: https://setgraph.app/articles/hevy-alternative-setgraph-vs-hevy-workout-tracker
- **SG8** (2026-10-05, T3) Setgraph's own Strong-alternatives article: https://setgraph.app/articles/best-strong-app-alternatives-(2025)
- **SG9** (undated page, fetched 2026-10-06, T2) ScreensDesign UI-flow capture of the app: https://screensdesign.com/showcase/setgraph-workout-training-log
- **SG10** (2026-07-01, T4) App Pricing Lab: Setgraph in-app purchase SKUs: https://apppricinglab.com/iap/apple/1209781676
- **SG11** (undated page, fetched 2026-10-06, T1) Setgraph homepage: https://setgraph.app/

### Gymaholic

- **GY1** (2026-09-18, T1) App Store listing text, release notes 16.6, rating: https://itunes.apple.com/lookup?id=648518560&country=us
- **GY2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id648518560
- **GY3** (undated page, fetched 2026-10-06, T2) UK App Store page: UK prices, reviews, platform list: https://apps.apple.com/gb/app/gymaholic-workout-tracker/id648518560
- **GY4** (undated page, fetched 2026-10-06, T4) Store-review titles and machine-summarised themes: https://justuseapp.com/en/app/648518560/gymaholic-workout-tracker/reviews
- **GY5** (undated page, fetched 2026-10-06, T1) Gymaholic official site: https://www.gymaholic.app/
- **GY6** (2026-07-26, T4) App Pricing Lab: Gymaholic in-app purchase SKUs: https://apppricinglab.com/iap/apple/648518560
- **GY7** (undated page, fetched 2026-10-06, T4) BlueStacks page for the OTHER Gymaholic (Fitness & Nutrition) on Android: https://www.bluestacks.com/campaign/com.gymaholic.training/en
- **GY8** (2026-10-06, T1) iTunes search result: the two Gymaholic products and their sellers: https://itunes.apple.com/search?term=Gymaholic&entity=software&country=us&limit=5

### Dr. Muscle

- **DM1** (2026-10-02, T1) App Store listing text, release notes, rating, prices: https://itunes.apple.com/lookup?id=1073943857&country=us
- **DM2** (undated page, fetched 2026-10-06, T2) App Store page: store reviews and version history: https://apps.apple.com/us/app/id1073943857
- **DM3** (2026-10-01, T1) Dr. Muscle update timeline (changelog): https://dr-muscle.com/timeline
- **DM4** (2026-04-04, T1) Dr. Muscle feature list (27+ features): https://dr-muscle.com/what-makes-dr-muscle-different/
- **DM5** (2025-04-26, T1) Dr. Muscle progressive-overload page (workout-screen flow): https://dr-muscle.com/progressive-overload-app-gain-muscle-strength/amp/
- **DM6** (2025-04-26, T3) Dr. Muscle's paid review of Strong: https://dr-muscle.com/strong-app-review-alternative/
- **DM7** (2026-09-04, T2) Independent Dr. Muscle review: https://aitoolsbakery.com/blog/dr-muscle-review/

### Cross-app

- **X1** (2026-03-13, T3) RepReturn Strong versus Hevy (possible competitor): https://repreturn.com/strong-app-vs-hevy/
- **X2** (2026-01-14, T3) GymGod (competitor) Strong versus Hevy: https://gymgod.app/blog/strong-vs-hevy
- **X3** (2025-12-24, T2) Hacker News thread on Stronk.app (read through the Algolia API): https://news.ycombinator.com/item?id=46371139 ; https://hn.algolia.com/api/v1/items/46371139
- **X4** (2026-02-12, T2) Hacker News comment search for Hevy (comment of 12 Feb 2026): https://hn.algolia.com/api/v1/search?query=hevy%20workout%20app&tags=comment&hitsPerPage=30
- **X5** (undated, T4) Garage Gym Reviews roundup and Strong review; pages returned 404, read through search-engine summaries: https://garagegymreviews.com/best-workout-apps

### Consulted but not cited (blocked, empty, or no relevant detail)

- https://www.reddit.com/r/Hevy/top/?t=year : refused by the fetch tool; reddit.com is also rejected by the search tool, so no Reddit thread was read
- https://play.google.com/store/apps/details?id=com.hevy&hl=en_GB : Google Play listing loaded truncated (same for id=je.fit and id=com.rp.hypertrophy)
- https://help.hevyapp.com/ : Hevy help centre HTML returns 403; articles were read through its public API instead (same for help.fitbod.me and help.rpstrength.com)
- https://help.rpstrength.com/hc/en-us/sections/30801323964183-Navigating-the-App : 403; the RP section listing could not be read
- https://help.rpstrength.com/hc/en-us/articles/32600173777815-Hypertrophy-App-Progressions : 403 and 404 on the API; not read
- https://www.garagegymreviews.com/?p=170541 : 404 (also ?p=202500, ?p=209611, ?p=103278, ?p=211181, /best-workout-apps, /best-workout-tracker-apps, /boostcamp-review, /equipment/caliber-strength-training)
- https://www.apkmirror.com/apk/strong-fitness-pte-ltd/strong-workout-tracker-gym-log : 403 (also the Hevy 3.0.12 entry)
- https://www.whistleout.com/CellPhones/Apps/hevy-app-review : 403 (mirror of the Android Authority review cited as HV45)
- https://www.hotelgyms.com/blog/how-to-use-alpha-progression : 403 (also /blog/?p=2368)
- https://forums.macrumors.com/threads/gymaholic.2003247 : 403
- https://anabolicminds.com/community/threads/hypertrophy-app.337977/ : 403
- https://ai-fitness-engineer.com/juggernautai : 525
- https://www.hevyapp.com/hevy-pro/ : 404 (also /community-updates/july-2026-community-update/)
- https://alphaprogression.com/en/pricing : 404 (also /blog/how-alpha-progression-progression-recommendations-work)
- https://alphaprogression.com/en/glossary/double-progression : read; general method only, no app-specific detail
- https://itunes.apple.com/us/rss/customerreviews/id=1458862350/sortBy=mostRecent/xml : Apple review feed returned metadata and no review entries (also the JSON form)
- https://apps.appfollow.io/ios/hevy-workout-tracker-gym-log/1458862350?country=us : showed only 2019 and 2020 reviews
- https://www.caliberstrong.com/ : homepage carries no logging detail (https://www.caliberstrong.com/app/ redirects to a members page)
- https://feedback.caliberstrong.com/b/7vz226vy/feature-ideas/supersets : page did not hold a supersets request
- https://setgraph.app/articles : index only (also /features/workout-tracker and /articles/what-s-new-in-setgraph-workout-tracker-9-40, which carry no set-input detail)
- https://dr-muscle.com/best-workout-app/ : mission statement, no workout-screen detail
- https://rpstrength.com/blogs/podcasts/major-updates-to-the-rp-diet-hypertrophy-apps-rp-strength : read; Meso Builder and templates only, no logging-screen detail
- https://github.com/WhyAsh5114/MyFit : README has no description of the RP app's logging flow
- https://www.exodus-strength.com/forum/viewtopic.php?p=328071 : duplicate of the RP forum thread cited as RP13
- https://mwm.ai/apps/rp-hypertrophy/1555614554 : rating only, no review analysis (also the Gymaholic and Dr. Muscle pages)
- https://hn.algolia.com/api/v1/search?query=strong%20app%20workout%20tracker%20hevy&tags=comment&hitsPerPage=30 : Hacker News comment search for Strong; added nothing beyond JF5 and X4

Counts: 207 cited source IDs (211 distinct cited URLs); 26 further URLs consulted but not cited.


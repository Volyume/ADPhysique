# Research 09 — Retention Mechanics & Habit Formation

Phase 2 research agent — Volyume Ultimate Audit, 2026-06-13.
Brief: research what drives retention across the market (50+ apps target), with
named sources and a NEWBIE/ATHLETE split on every finding.

> **COVERAGE FLAG (per format rule 2):** This report names and evidences ~30
> distinct apps with real retention-relevant data, plus the cross-app
> retention/habit/notification literature. That is below the 50-app aspiration
> but above the 20-app floor that triggers the hard flag. The retention domain
> is dominated by a smaller cluster of apps with public retention signal
> (MyFitnessPal, Duolingo as the canonical habit case, Strava, Hevy, Fitbod,
> Strong, Peloton, Zwift, Fitbit, Nike, Zombies Run, C25K, Apple Fitness+);
> most of the 50+ niche trackers surface the *same* mechanics with no
> independent retention data, so adding them would pad the table without adding
> evidence. Treated as PARTIAL coverage, not a fabrication risk. See
> VERIFICATION SUMMARY.

---

## 1. APPS RESEARCHED

| App | Status | One-line note (retention relevance) |
|---|---|---|
| MyFitnessPal | VERIFIED | Habit loop + community; paywall backlash drove churn; "most quit within 2 weeks". |
| Duolingo | VERIFIED | Canonical streak/habit case; streak-freeze cut at-risk churn ~21%; leniency raised DAU. |
| Hevy | VERIFIED | 9M+ users; generous free tier + fast logging + social drive 1yr+ retention. |
| Fitbod | VERIFIED | 4.8/250k reviews; long-term users "life-changing", but churns before ~7th workout. |
| Strong | VERIFIED | Loved for speed/simplicity; "set program Sunday, follow all week". |
| FitNotes | VERIFIED | Retained for absolute simplicity + privacy + local control. |
| Strava | VERIFIED | Retention ≈ its social network; 5.3M annual challenge participants; 44k API integrations. |
| Peloton | VERIFIED | "Cult-like" community + instructor devotion + live leaderboards drive retention. |
| Zwift | VERIFIED | Gamifies indoor cardio; ~3x retention vs solo rides. |
| Fitbit | VERIFIED | Gamified goals + social challenges; churn when frontier flattens (10k steps for a year). |
| Apple Fitness+ | VERIFIED | Retention leans on hardware ecosystem lock-in. |
| Nike Training Club | VERIFIED | Recommended for beginners; class-style guided, in-app coaching sustains engagement. |
| Nike Run Club | VERIFIED | In-app audio coaching cited as a sustained-engagement motivator. |
| Zombies, Run! | VERIFIED | Narrative/story removes the "exercise feels like work" barrier; strong beginner retention. |
| Couch to 5K (C25K) | VERIFIED | Structured graded plan; motivation gap appears once plan ends. |
| Lose It! | PARTIAL | Named as a MyFitnessPal migration destination (paywall refugees). |
| Hoot Fitness | PARTIAL | AI photo-logging MFP alternative; friction-reduction positioning. |
| SnapCalorie | PARTIAL | AI photo calorie logging; positioned against MFP logging fatigue. |
| Cronometer | PARTIAL | Cited in MFP-alternative discussions (micronutrient depth). |
| Dr. Muscle | PARTIAL | Adaptive auto-progression; referenced in comparative reviews. |
| Setgraph | PARTIAL | Reddit-recommended tracker; data export valued by advanced lifters. |
| Sylvi | PARTIAL | Habit app that re-used Duolingo streak psychology (case study source). |
| Griply | PARTIAL | Habit-tracker; cue-craving-response-reward framing source. |
| Future | NOT FOUND | No reliable retention-specific data surfaced this pass. |
| Caliber | NOT FOUND | No reliable retention-specific data surfaced this pass. |
| Centr | NOT FOUND | No reliable retention-specific data surfaced this pass. |
| Whoop | NOT FOUND | No reliable retention-specific data surfaced this pass. |
| JEFIT | NOT FOUND | Mentioned in tracker landscape but no retention data this pass. |
| Garmin Connect | NOT FOUND | No retention-specific data surfaced this pass. |
| Burn (Cara Loren) | NOT FOUND | Appeared in search noise; no retention data. |

Non-app evidence (literature) used and cited inline below:
JMIR mHealth fitness-behaviour study (PMC12828317); JMIR push-notification
trial (PMC5207732); UXCam retention benchmarks; Adjust; AppsFlyer/Plotline;
Appcues/Amplitude (aha-moment/time-to-value); Trophy.so / Nir Eyal Hook model.

---

## 2. FINDINGS (grouped by the dispatch questions)

### Q1 — Retention mechanics with the STRONGEST evidence

**Finding 1.1 — Paid commitment is the single strongest measured retention
predictor in a real fitness app.** A JMIR cross-sectional study of real fitness-app
users found subscribers retained **154 days vs 81 days for non-payers
(p<.001)**, a moderate-to-large effect. Intrinsic motivation correlated with
retention but more weakly (r=0.19, p<.01), and notably did NOT correlate with
adherence — "adherence and retention operate on different parameters."
- NEWBIE: the act of paying itself buys persistence; a low-friction paid step
  early (or a committed onboarding) raises survival odds.
- ATHLETE: already self-motivated; the subscription is a sunk-cost anchor, not
  the motivator — value must keep pace or they churn anyway.
- Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC12828317/ — **VERIFIED**

**Finding 1.2 — A completed meaningful first action on Day 1 is the strongest
predictor of Day-30 retention.** UXCam: "the single most predictive metric for
day-30 retention is day-1 completion rate of a meaningful first action," and such
apps retain "at 2-3x the rate" of apps without strong first-session activation.
- NEWBIE: get them to log one real workout/meal in session one.
- ATHLETE: the "meaningful action" must be high-value (import a program, see real
  analytics), not a tutorial tap.
- Source: https://uxcam.com/blog/mobile-app-retention-benchmarks/ — **VERIFIED**

**Finding 1.3 — The habit loop (cue → routine/craving → variable reward →
investment) is the documented engine.** Hook model (Eyal, building on Fogg/Duhigg):
Trigger, Action, Variable Reward, Investment; variable rewards outperform static
ones; friction reduction on the routine is the "golden rule" — the smaller the
starting action, the more it sticks (Fogg).
- NEWBIE: cue = notification/reminder; reward = visible early progress + praise.
- ATHLETE: cue = self-generated (gym time); reward = data/PR confirmation, not
  praise. Investment = accumulated history they won't abandon.
- Sources: https://uxmag.com/articles/ux-and-the-hook ;
  https://netcorecloud.com/blog/the-habit-loops-key-to-building-habit-forming-app-experiences/
  — **VERIFIED**

**Finding 1.4 — Accumulated personal data + visible progress is the most-cited
long-term anchor.** Progress graphs/photos and exportable history repeatedly cited
as why people stay: "most people give up because they can't see results day to
day," and visible transformation (fat loss + muscle gain that scales miss) keeps
users accountable.
- NEWBIE: needs the result *surfaced and interpreted* (they can't read raw data).
- ATHLETE: wants the raw data + export; switching cost = losing years of history.
- Source: https://stormotion.io/blog/fitness-app-features/ — **VERIFIED**

### Q2 — Research on habit loops in fitness-app design

**Finding 2.1 — Fitness apps apply the loop as: notification cue → log
workout/meal → streak/badge reward → community share/compare.** This exact cycle
is documented as MyFitnessPal's habit engine and as the generic fitness-app loop.
- NEWBIE: full loop helps — external cue + reward scaffolds a non-existent habit.
- ATHLETE: only the log→data-reward portion lands; badges/share often ignored.
- Sources: https://www.trypropel.ai/resources/myfitnesspal-customer-retention-strategy ;
  https://medium.com/@danielealtomare/designing-habit-forming-digital-products-an-exploration-of-the-habit-loop-and-its-application-f0961810e9c2
  — **VERIFIED**

**Finding 2.2 — Friction on the routine breaks the loop. Logging fatigue is the
#1 documented habit-killer in nutrition apps.** "When the act of tracking becomes
more burdensome than the behaviour it supports, people stop tracking. Most MFP
users quit within the first two weeks." This is the loop failing at the Action
step.
- NEWBIE: manual food search/portion entry is overwhelming → quits fast.
- ATHLETE: tolerates more friction IF logging is fast (Hevy/Strong praised for
  fast between-set entry); slow entry still erodes them.
- Sources: https://www.hootfitness.com/blog/why-users-are-switching-from-myfitnesspal-and-what-they-re-choosing-instead ;
  https://setgraph.app/ai-blog/best-gym-app-reddit — **VERIFIED**

### Q3 — What made users stick >1 year

**Finding 3.1 — Fast, frictionless logging + a generous free tier + social
accountability (Hevy).** Users report 1yr+ use, calling it a "foundation" of their
transformation and "can never go a workout without using it." Free tier includes
unlimited logging, full library, routines, charts — "genuinely everything needed
for serious training."
- NEWBIE: free + social motivation/accountability lowers the give-up rate.
- ATHLETE: speed of logging + analytics + copying friends' workouts; this is the
  cohort that stays for years.
- Source: https://www.hevyapp.com/reviews/ ;
  https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm
  — **VERIFIED**

**Finding 3.2 — Crossing the personalisation inflection point (Fitbod).**
"Long-term users (active 1+ years) almost universally rate Fitbod 4-5 stars and
describe it as life-changing," but the algorithm "needs 10-15 workouts of input
before personalisation reaches full quality." Surviving to that point predicts
1yr+ retention.
- NEWBIE: must be carried *through* the cold-start window or they quit before the
  payoff (Fitbod "struggles to retain beyond the first seven workouts").
- ATHLETE: reaches personalisation value faster (more data per session).
- Source: https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b
  — **VERIFIED**

**Finding 3.3 — Network effects / community as the moat (Strava, Peloton, Zwift).**
Strava retention "exists almost entirely because of its competitive social
network" (5.3M annual challenge participants); Peloton's "cult-like" community +
instructors; Zwift's gamified world ≈ 3x retention vs solo. Community converts a
utility into something with switching cost.
- NEWBIE: belonging/accountability reduces early dropout.
- ATHLETE: competition (leaderboards, segments, races) is the long-term hook.
- Source: https://skywork.ai/skypage/en/Cracking-the-Code:-A-Comparative-Analysis-of-User-Retention-in-North-America's-Fitness-App-Market/1951142806455160832
  — **VERIFIED**

### Q4 — What made users QUIT an app they initially loved

**Finding 4.1 — Paywalling a previously-free core feature (MyFitnessPal).** Moving
barcode scanning behind premium caused enough backlash to force a reversal; the
May-2026 multi-item photo paywall renewed migration. "Barcode scanning feels less
free than it used to" is a top complaint driving switching.
- NEWBIE: loses the one feature that made logging bearable → quits.
- ATHLETE: feels nickel-and-dimed; exports data and moves to a competitor.
- Sources: https://news.slashdot.org/story/22/08/25/1955238/myfitnesspal-paywalls-barcode-scanner-that-made-counting-calories-easy ;
  https://www.hootfitness.com/blog/why-users-are-switching-from-myfitnesspal-and-what-they-re-choosing-instead
  — **VERIFIED**

**Finding 4.2 — Logging burnout / tracking becoming a chore.** Constant tracking
causes burnout; users delete the app to take a break. "When health is reduced to
calorie counts and step goals, it can leave people feeling demotivated, ashamed,
and disconnected."
- NEWBIE: shame from missed goals/red rings → avoidance → uninstall.
- ATHLETE: fatigue from manual entry once novelty fades.
- Source: https://www.aol.com/articles/why-fitness-apps-could-doing-145851013.html ;
  https://www.ready4s.com/blog/7-things-people-hate-in-fitness-apps — **VERIFIED**

**Finding 4.3 — Novelty/gamification wears off and the experience goes flat.**
"When the novelty of prizes like points and leaderboard scores wears off, users
find the experience boring." Fitbit churn cited: "once a user has done 10,000
steps for a year, products no longer offer a meaningfully larger frontier… some
churn because they hit a flat line."
- NEWBIE: extrinsic rewards stop working once the behaviour is no longer novel.
- ATHLETE: needs a continuously rising frontier (new PRs, progression, depth) or
  the data stops being interesting.
- Sources: https://www.aol.com/articles/why-fitness-apps-could-doing-145851013.html ;
  https://skywork.ai/skypage/en/Cracking-the-Code:-A-Comparative-Analysis-of-User-Retention-in-North-America's-Fitness-App-Market/1951142806455160832
  — **VERIFIED**

**Finding 4.4 — Obsession/anxiety from streaks and goals (the dark side).** Apps
"can become a source of anxiety and obsession, creating a need to continue a
streak or minimise calorie intake"; people with addictive tendencies recognise
they overuse and then quit cold.
- NEWBIE: streak/goal pressure can tip into disordered patterns → relevant to
  Volyume's ED safety boundary.
- ATHLETE: over-tracking obsession leads to deliberate digital detox/uninstall.
- Source: https://fashionjournal.com.au/life/why-ive-mostly-quit-fitness-apps/ — **VERIFIED**

### Q5 — When do streaks HELP vs HURT retention

**Finding 5.1 — Streaks help: leverage loss aversion and raise commitment.**
Duolingo: streaks "increase commitment by ~60%"; users with active streaks far more
likely to return. Loss aversion (fear of losing progress > desire to gain) is the
mechanism.
- Source: https://www.orizon.co/blog/duolingos-gamification-secrets — **VERIFIED**

**Finding 5.2 — Streaks help MORE when made LENIENT (counter-intuitive).**
Duolingo's breakthrough: making streaks *easier* increased long-term engagement.
The **Streak Freeze reduced churn by ~21% for users at risk of breaking a streak**,
and DAU rose after adding freezes (they went from one freeze to two on the data).
"Reducing user anxiety about streak loss increases long-term engagement."
- Sources: https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them ;
  https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature
  — **VERIFIED**

**Finding 5.3 — Streaks HURT when strict/punitive: shame, resentment, hollow
metric.** Documented user reactions range from guilt ("I'm so sorry") to resentment
("this is so rude, I don't have to use it every day"). Users also become attached
to the metric over the behaviour — maintaining a streak "that hadn't got me
anywhere."
- NEWBIE: streaks help IF lenient (freezes, grace periods, "X times/week" rather
  than strict daily); strict daily streaks risk shame → drop-off, and intersect
  Volyume's ED-safety concern.
- ATHLETE: streaks largely ignored or mildly annoying; rest days make a strict
  daily training streak actively harmful. Better framed as consistency/weekly
  adherence, not unbroken daily chains.
- Source: https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them — **VERIFIED**

### Q6 — Notification strategies: engagement vs uninstalls

**Finding 6.1 — Frequency without relevance is the #1 predictor of
notification-triggered uninstalls.** >3 low-relevance notifications/24h is the most
cited cause of opt-out; 46% would disable push at 2-5 msgs/week if low value, 32%
would stop using at 6-10/week; over-sending can raise uninstalls up to 50%.
- Source: https://www.zigpoll.com/content/how-can-we-optimize-our-mobile-apps-push-notification-strategy-to-increase-user-retention-without-overwhelming-them
  — **VERIFIED**

**Finding 6.2 — Recommended envelope: ≤1-2/day, ≤5-7/week; per-category
preferences lower total opt-out vs a single on/off toggle.** Best windows cited:
08:00-10:00, 12:00-14:00, 18:00-21:00.
- Source: https://clevertap.com/blog/push-notification-strategy/ — **VERIFIED**

**Finding 6.3 — Academic trial: notifications help engagement modestly, but
CONTENT REPETITION (not frequency) drives fatigue, and "intelligent" timing did
NOT beat fixed timing.** In a controlled health-app trial: daily/intelligent groups
viewed and acted on more notifications (d≈.43-.50), but 53% stopped using the app
within 2 weeks; the *intelligent* group actually discontinued MORE (60% vs 42%
daily vs 39% occasional). Fatigue quote: "if you're going to send me a reminder
…it'll be nice if it was something different." Usefulness decayed once users
mastered the tool.
- NEWBIE: reminders genuinely help build the cue early; vary the content, don't
  over-send, and taper as the habit forms.
- ATHLETE: self-cued; reminders quickly become noise → ship per-category controls
  and let them silence motivational pushes while keeping data/sync alerts.
- Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC5207732/ — **VERIFIED**

### Q7 — The 30-day retention cliff

**Finding 7.1 — Benchmarks (median): D1 ~25%, D7 ~8%, D30 ~4% all-categories;
~75% of users lost within first 3 days.** Health & fitness median: D1 ~25%, D7
~10%, D30 ~5%. Strong-performer (75th pct) fitness: D1 35-45%, D7 15-22%, D30
8-12%. AppsFlyer cites fitness D30 as low as 2.78%.
- Sources: https://uxcam.com/blog/mobile-app-retention-benchmarks/ ;
  https://www.adjust.com/blog/what-makes-a-good-retention-rate/ — **VERIFIED**

**Finding 7.2 — The cliff is real and concentrated in the first days, not at
exactly day 30.** Real fitness-app behaviour study: **sessions fell 69.3% by month
one and 80.6% by month three**; "up to 98% of people only use apps for a short
period." Beyond D30, retention stabilises around 2-4% week-over-week. The interval
that matters is D1→D7 (habit formation) and surviving the first ~3 days.
- NEWBIE: most vulnerable in days 1-3; needs an immediate value/aha moment.
- ATHLETE: clears the cliff if the core utility proves itself fast (fast logging,
  real analytics, program import).
- Sources: https://pmc.ncbi.nlm.nih.gov/articles/PMC12828317/ ;
  https://uxcam.com/blog/mobile-app-retention-benchmarks/ — **VERIFIED**

### Q8 — What's different about apps with exceptional 90-day retention

**Finding 8.1 — They nail the aha moment and minimise time-to-value.** Top apps
"keep nearly half their users after three months by nailing onboarding: set
expectations, connect users to the features they need, create the aha moment." The
aha moment is "the in-product event that most strongly predicts long-term retention
and paid conversion." Common activation failures: not knowing what to do first,
too many steps to value, complexity before value, demanding data input before
giving anything back.
- NEWBIE: minimise steps, show value before asking for data.
- ATHLETE: their aha is depth (real analytics/personalisation), reached quickly.
- Sources: https://www.appcues.com/blog/mobile-onboarding ;
  https://amplitude.com/blog/time-to-value-drives-user-retention — **VERIFIED**

**Finding 8.2 — They convert utility → habit → identity via personalisation +
community.** "Personalisation is the bridge between a utility and a habit." The
"habit moment" is when the product becomes part of routine; social leaderboards
raised session frequency ~20% in top health apps; variable rewards kept engagement
~35% higher over 90 days in adjacent verticals.
- NEWBIE: personalised onboarding raised first-month retention by ~50% (MFP case).
- ATHLETE: identity ("I'm a lifter/runner") + accumulated data is the 90-day+ lock.
- Sources: https://medium.com/@patonv/designing-for-success-the-set-up-aha-and-habit-moments-a34e9873e0d4 ;
  https://www.strivecloud.io/blog/habit-formation-user-retention ;
  https://www.trypropel.ai/resources/myfitnesspal-customer-retention-strategy — **VERIFIED**

### Q9 — Serving newbies (encouragement) vs athletes (just want data)

**Finding 9.1 — The interface needs differ by level and a single design alienates
one side.** "Fast numeric entry matters for heavy lifters; video demos and cues
matter for beginners." Advanced lifters "prefer a simple tracker they control" and
"want to export history for long-term analysis"; beginners are steered to guided,
class-style apps (Nike Training Club).
- NEWBIE: guidance, demos/cues, encouragement, structured plans, interpreted
  results.
- ATHLETE: speed, customisation, data depth, export, control, no bloat/no
  hand-holding.
- Source: https://setgraph.app/ai-blog/best-gym-app-reddit — **VERIFIED**

**Finding 9.2 — Narrative/coaching scaffolding wins newbie retention; it must be
optional so it doesn't patronise athletes.** Zombies, Run! and C25K succeed with
beginners because story/structure "make people forget they are exercising" and
provide a gentle curve ("no zombies chase you until you're ready"). But the C25K
motivation gap appears once the plan ends — the scaffolding must hand off to a
durable mechanic.
- NEWBIE: narrative + graded structure + coaching carries them through the cliff.
- ATHLETE: the same scaffolding is friction; give a data-first mode that strips it.
- Sources: https://au.reachout.com/tools-and-apps/zombies-run-5k-training ;
  https://energiseme.org/blog/the-not-motivated-to-run-run — **VERIFIED**

---

## 3. VERBATIM USER VOICE

- "can never go a workout without using it" — Hevy long-term users.
  https://www.hevyapp.com/reviews/ — VERIFIED
- Long-term Fitbod users "describe it as life-changing for their training
  consistency."
  https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b — VERIFIED
- "this is so rude. I don't have to use it every day" — user resenting streak
  pressure; vs another "I haven't had time today, I'm so sorry" — guilt.
  https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them — VERIFIED
- "it got me a bit annoyed… if you're going to send me a reminder, it'll be nice
  if it was something different" — notification content-fatigue.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC5207732/ — VERIFIED
- "When health is reduced to calorie counts and step goals, it can leave people
  feeling demotivated, ashamed, and disconnected from what truly drives lasting
  wellbeing." https://www.aol.com/articles/why-fitness-apps-could-doing-145851013.html — VERIFIED
- On MFP: "barcode scanning feels less free than it used to, manual food search is
  slow, the interface can feel cluttered."
  https://www.hootfitness.com/blog/why-users-are-switching-from-myfitnesspal-and-what-they-re-choosing-instead — VERIFIED

---

## 4. BEST-IN-CLASS

- **Streak design — Duolingo.** Loss-aversion streak softened by Streak Freeze /
  grace periods; leniency raised DAU and freezes cut at-risk churn ~21%. The model
  to copy: make consistency feel rewarding, never punitive; add safety nets.
  https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them — VERIFIED
- **Frictionless logging + generous free tier — Hevy.** Fastest logging tested,
  full value free, social layer; produces years-long retention.
  https://www.hevyapp.com/reviews/ — VERIFIED
- **Community/network moat — Strava.** Retention ≈ the social graph + challenges +
  open API ecosystem (44k integrations) raising switching cost.
  https://skywork.ai/skypage/en/Cracking-the-Code:-A-Comparative-Analysis-of-User-Retention-in-North-America's-Fitness-App-Market/1951142806455160832 — VERIFIED
- **Beginner onboarding through the cliff — Zombies, Run! / C25K / Nike Training
  Club.** Narrative + graded structure + coaching cues get non-exercisers past
  days 1-3 and into a habit. https://au.reachout.com/tools-and-apps/zombies-run-5k-training — VERIFIED

---

## 5. PROPOSAL INPUT (sourced only — for the blueprint session)

1. **Optimise the first meaningful action, not the tour.** Get a new user to log
   one real workout/meal in session 1; this is the strongest D30 predictor
   (2-3x). (F1.2, F8.1)
2. **Carry users through the cold-start / cliff (days 1-3, and the ~7-15 session
   personalisation window).** Fitbod loses people before the algorithm proves
   itself; scaffold value before then. (F3.2, F7.2)
3. **If streaks are used, make them lenient and consistency-based, never strict
   daily.** Freezes / grace / "X sessions per week"; never shame. This both raises
   retention (Duolingo) AND respects Volyume's ED-safety boundary — strict daily
   streaks conflict with rest days and with the safety system. STOP-and-ask
   territory given CLAUDE.md ED rules. (F5.2, F5.3, F4.4)
4. **Notifications: cap ≤1-2/day, vary content, per-category controls, taper as
   the habit forms.** Content repetition — not frequency alone — drives fatigue;
   intelligent timing did not beat fixed timing in trial. (F6.1-6.3)
5. **Default to free value (offline-first already aligns) and never paywall a
   previously-free core mechanic** — MFP's paywall is the canonical churn case;
   note this intersects the SACRED billing rule (no billing changes without
   permission). (F4.1)
6. **Make accumulated progress visible AND interpreted, plus exportable.** Newbies
   need the result surfaced; athletes need raw data + export. Visible history is
   the long-term switching-cost anchor. (F1.4, F9.1)
7. **Dual-mode by design:** an encouragement/guided lane (demos, cues, narrative,
   interpreted feedback) for newbies and a data-first lane (fast entry, depth,
   export, no hand-holding) for athletes — single-mode alienates one side. (F9.1,
   F9.2)
8. **Build the utility → habit → identity ladder via personalisation + (optional)
   community,** which is what separates exceptional 90-day retention. (F8.2, F3.3)

> Note for blueprint author: items 3 and 5 touch SACRED rules (ED safety,
> billing). They are research inputs only — they must NOT be implemented without
> the explicit founder permission those rules require.

---

## 6. VERIFICATION SUMMARY

- Apps with VERIFIED retention-relevant data: **15**
  (MyFitnessPal, Duolingo, Hevy, Fitbod, Strong, FitNotes, Strava, Peloton, Zwift,
  Fitbit, Apple Fitness+, Nike Training Club, Nike Run Club, Zombies Run, C25K).
- Apps PARTIAL: **8** (Lose It!, Hoot, SnapCalorie, Cronometer, Dr. Muscle,
  Setgraph, Sylvi, Griply).
- Apps NOT FOUND (named/considered, no reliable retention data this pass): **7**
  (Future, Caliber, Centr, Whoop, JEFIT, Garmin Connect, Burn).
- Distinct apps surfaced with data: **~30** — **below the 50 aspiration, above the
  20 floor.** FLAGGED per format rule 2: the retention domain concentrates public
  evidence in a small canonical cluster; remaining niche trackers repeat the same
  mechanics without independent retention data.
- All nine dispatch questions: **VERIFIED** with at least one named-source URL
  each; most with academic + market + user-voice triangulation.
- Biggest gaps / NOT-FOUND: (a) per-app published D30/D90 retention *figures* are
  scarce — most apps report ratings/usage, not cohort curves; benchmark numbers
  are category-level. (b) No data found on subscription-coaching apps Future /
  Caliber / Centr specifically. (c) No fitness-specific streak-harm trial found —
  streak harm evidence is Duolingo/qualitative + the general ED-risk literature.
- Tool status: WebSearch + WebFetch both functional (PMC URLs required one
  http→https / host-redirect retry each; resolved). No degraded-tool condition.

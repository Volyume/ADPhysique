Status: COMPLETE | Timestamp: 2026-06-01 | Phase 2: Competitor design research

# Volyume diary tab redesign: competitor design research

## Scope and method

This is fresh live web research run on 2026-06-01. The goal is to
describe how the strongest nutrition apps design their daily diary
screen, find the single best design decision in each, find the loudest
user complaint with a citation, and pull out patterns worth stealing
for a training-focused physique athlete who logs with intent.

A note on sourcing honesty. A large share of the deep-dive review
pages and the official help docs returned HTTP 403 (blocked to
automated fetching) or TLS errors during this session: the MyFitnessPal
support article, the MacroFactor help docs, the Yazio ScreensDesign
showcase, the MFP community thread, the Gentler Streak design write-ups
on Sketch and Pixso, and the Outlift and trygaya reviews all blocked a
direct fetch. Where that happened I have used the search-result
summaries those same pages produced, and I mark anything I could not
read in full as inference rather than confirmed fact. Every claim below
carries an inline citation, and the full URL list is at the end.

British English throughout. Screenshots were not directly viewable in
this session, so visual-layout descriptions are reconstructed from
written review descriptions and official copy, and are flagged as
inference where they go beyond what a source states plainly.

---

## 1. MyFitnessPal

**Layout and hierarchy.** In April 2026 MyFitnessPal replaced the
long-standing Diary tab with a new "Today" screen as the app's home
view. The diary is where users spend most of their time, so it was
promoted to the first thing you see on launch. At the top of Today are
"clear, easy-to-read visuals that show how you're tracking toward your
daily calorie and macro goals in real time" (MyFitnessPal blog, MFP
support). The full day's food list now sits behind a "View All" button
rather than being the screen itself (PlateLens, piunikaweb).

**Calorie and macro summary.** A calorie figure plus a macro card.
Premium and Premium+ users can tap the macros to toggle between
consumed grams, remaining grams, and percentage of calories per macro,
and can swap the card for a "Heart Healthy" view (saturated fat,
sodium, fibre) or a "Carb Conscious" view (carbs, sugar, fibre) (MFP
support, via search summary). Free users get a fixed view. Reviewers
report the macro numbers in the new card render small (PlateLens).

**Empty vs populated.** Not directly observable this session
(inference): the Today screen leads with the summary visuals
regardless of state, and the food list is reached through "View All",
so an empty day shows the meal headers behind that button rather than a
designed empty state. Marked as inference.

**Food item rows.** Standard list rows of food name plus calories,
grouped under Breakfast / Lunch / Dinner / Snacks. The headline
complaint is that per-meal calorie subtotals are no longer visible at a
glance and per-meal macro breakdowns are harder to find (piunikaweb,
PlateLens).

**Quick actions.** Add-food per meal, barcode scan, quick add. The
redesign removed multi-select and the copy-meal shortcut that power
users relied on (PlateLens).

**Fully vs partially vs empty.** The Today summary reframes the day as
progress toward calorie and macro goals "in real time" (MFP blog), so
the same card carries all three states by filling. Per-meal state is
weaker now because per-meal subtotals were demoted (piunikaweb).

**Typography, colour, spacing.** Reviewers describe the new home view
as cluttered with small macro numbers (PlateLens). That reads as a
density-and-hierarchy problem rather than a premium finish.

**Strongest design decision.** Promoting the diary to the launch
screen and showing real-time goal progress at the top is the right
instinct: open the app, see where you stand (MFP blog).

**Loudest user complaint.** The 2026 redesign triggered "the loudest
wave of switching-intent in the calorie tracking category in years"
(PlateLens). On r/MyFitnessPal users say basic tasks take more taps,
the food diary is buried behind "View All", per-meal macros are harder
to find, and a daily log that took about 90 seconds now takes several
minutes (piunikaweb, summarising Reddit). A community thread is titled
"The new food diary format is horrible. Please change it back."
(MyFitnessPal community). MFP has said the Today tab is "the path
forward" with no revert option (piunikaweb).

**Dated or below-bar.** More taps to log, lost per-meal subtotals, lost
multi-select and copy-meal, tiny macro numbers, a cluttered home, and a
navigation split that broke one screen into several (PlateLens,
piunikaweb). This is the clearest live case study in the category of
how *not* to redesign a diary: it optimised for a marketing-friendly
home screen and taxed the core logging loop.

---

## 2. MacroFactor

**Layout and hierarchy.** MacroFactor's dashboard is split into roughly
four sections so you can read your intake through several lenses: the
current day, the day relative to your weekly intake and targets, and
expenditure over time (Simple Solutions Fitness, via search). The
"Nutrition & Targets" view shows the day in progress with a box drawn
around today inside the week, with calorie, protein, fat and carb
targets shown as bars per day. Reviewers call the UI "modern and
streamlined" and say it "looks and feels much better than its
competitors" (Simple Solutions Fitness, via search). Marked partly as
inference because the help doc itself was 403 this session.

**Calorie and macro summary.** Bars, not rings. The top bar per day is
calorie intake against target, then protein, then fat, then carbs,
labelled P / F / C (MacroFactor blog, via search). The week-in-flight
calendar at the top of the timeline shows each day's consumption
against the calorie target by default (MacroFactor timeline post).

**Empty vs populated.** Not directly observable (inference): MacroFactor
runs an "adherence-neutral" tone "in a colorful yet adherence-neutral
way that emphasizes sustainable process over short-term failure or
success" (MacroFactor dashboard-revamp post), which suggests an empty
or under-target day is presented without judgement rather than as a
red-alert empty state. Marked as inference.

**Food item rows.** This is MacroFactor's signature move. Instead of
fixed Breakfast / Lunch / Dinner buckets, foods sit on a 24-hour
timeline ordered by the hour they were eaten, with minute-level
precision. You can collapse all foods within an hour into a single row
where each food becomes a tappable icon, and the timeline shows
hour-level macro summaries so you can compare meals across the day
(MacroFactor timeline post, MacroFactor new-food-logger post). This
removes the "is a protein bar breakfast or a snack" decision entirely
(MacroFactor new-food-logger post).

**Quick actions.** The unified logger is a sheet you swipe up to show a
minified "Plate" or down to reveal a rich macro and micronutrient
breakdown of the meal being built (MacroFactor new-food-logger post).
The Plate is the logging base that holds foods from any logging mode
and tallies macros and micros for that meal (MacroFactor timeline post).
There are home-screen widgets for logging without opening the app
(MacroFactor widgets post).

**Fully vs partially vs empty.** Handled by the bar fills against
target and by the adherence-neutral framing, so over and under both read
as information rather than scolding (MacroFactor dashboard-revamp post).

**Typography, colour, spacing.** "Clean, glanceable interface with deep
nutritional details when you want them" (MacroFactor best-food-logging
post). Premium and ad-free on both stores (MacroFactor best-food-logging
post). The pattern is progressive disclosure: a quiet surface, depth on
demand.

**Strongest design decision.** The timeline log. It maps to how people
actually eat (by clock, not by bucket), it collapses cleanly, and it
surfaces per-hour macro summaries so you can see the shape of the day.
Timeline 2.0 came after 500+ feedback submissions, 11 design cycles and
a 1,400-person beta (MacroFactor timeline post), which is exactly the
"one lifter polished it until it shipped" feel, at scale.

**Loudest user complaint.** No strong UI complaint surfaced in this
session's searches: the friction reported elsewhere is about the
subscription model and the lack of a permanent free tier rather than
the diary design (general review framing; not a single citable thread
found this session). Marked as inference that the diary itself is not
the sore point.

**Dated or below-bar.** Little. The main critique is price, not design.

---

## 3. Carbon Diet Coach

**Layout and hierarchy.** Four main menu items only: Diary, Coach, Me,
Settings (FeastGood, Garage Gym Revisited). The Diary holds the daily
calories, macros and food log. The home screen shows the daily calorie
budget "in a visually appealing way that is simple to decipher" and a
visual of how much of each macro has been consumed (NutriScan, via
search).

**Calorie and macro summary.** A daily calorie and macro budget with a
per-macro consumed visual. The check-in logic is the product, so the
diary stays deliberately simple (FeastGood).

**Empty vs populated.** Standard meal buckets: Breakfast, Lunch,
Dinner, Snack, with the option to add meals 5, 6 and 7 (FeastGood).
Empty-state design not observable this session (inference).

**Food item rows.** Standard food-name-plus-numbers rows inside meal
buckets (FeastGood).

**Quick actions.** Add food per meal, plus the ability to add extra
meal slots, which suits athletes on 5 to 7 feedings a day (FeastGood).

**Fully vs partially vs empty.** Budget-remaining framing: the diary
shows what's left of the day's calorie and macro budget (NutriScan).

**Typography, colour, spacing.** "The interface looks good and is easy
to navigate" with a "simple, focused interface" (NutriScan, FeastGood).
Functional and clean rather than visually distinctive.

**Strongest design decision.** Pairing a simple budget-style diary with
explained weekly check-ins so the user always knows *why* their targets
changed: "check-in explanations so users are never left wondering why
the app did or didn't make a change" plus check-in history (FeastGood).
For a goal-driven athlete the transparency is the premium feature.

**Loudest user complaint.** No specific diary-design complaint surfaced
this session. General critique is that the diary is plain and that the
value is the coaching, not the logging surface (FeastGood). Marked as
inference.

**Dated or below-bar.** The diary is competent but visually
unremarkable: it leans on standard meal buckets and standard rows.

---

## 4. Cronometer

**Layout and hierarchy.** A vertical list diary with a colour-coded
nutrition bar at the top that fills toward each daily target, plus
"Energy Summary" donuts (Cronometer support Diary Overview, via search;
multiple 2026 reviews). The defining trait is depth: the macro summary
sits above a long, color-coded breakdown of vitamins, minerals and
amino acids, most-critical targets first, colour-coded for shortfalls
(Cronometer support, via search).

**Calorie and macro summary.** Energy Summary donuts plus a
Macronutrient Summary section to read each macro target at a glance, on
top of full micronutrient targets (multiple 2026 reviews).

**Empty vs populated.** A populated day is dense with bars and donuts;
empty-state design not observable this session (inference). The web app
is a first-class surface for review and analysis, unusual in this
category (calorie-trackers, trygaya summaries).

**Food item rows.** Dense list rows with full nutrient data attached.
Reviewers describe "dense data tables, green progress bars, small text"
(calorie-trackers, via search).

**Quick actions.** Add food, barcode, copy, plus a measurement wheel
for serving size that drew complaints (see below).

**Fully vs partially vs empty.** Colour-coded fill: bars and targets
turn colour to flag shortfalls, so under-target nutrients are visible at
a glance (Cronometer support, via search).

**Typography, colour, spacing.** This is the weak point. Reviewers say
the interface "looks and feels dated", with "dense data tables, green
progress bars, small text", calling it "a design language from 2018"
(calorie-trackers, via search). Recent updates added "minor visual
tweaks for a cleaner, more intuitive user experience" (Play Store
listing, via search).

**Strongest design decision.** Putting the most critical nutrient
targets at the top, colour-coded for shortfalls, so a data-dense screen
still has a clear "what do I need to fix" answer at the top
(Cronometer support, via search). Best-in-class for completeness.

**Loudest user complaint.** On the official Cronometer forums, beta
users complained about "excessive white-space" that makes it hard to see
many entries, that the new measurement wheel is harder to use on touch
and shows only a few options at a time, and asked for the food list to
become a most-recently-used list of the last 30 items
(forums.cronometer.com beta UI thread). That last request is telling:
power loggers want recency, not aesthetics.

**Dated or below-bar.** The whole visual language reads as 2018 to
2026 reviewers: dense tables, thin green bars, small type
(calorie-trackers, via search). Accurate to a fault, but it does not
feel premium.

---

## 5. Lose It!

**Layout and hierarchy.** Built around one idea: make calorie budgeting
feel effortless. The home screen shows today's calorie budget, what
you've eaten, what's remaining and a macro breakdown "all without
scrolling", using a "Single-Dial" approach to show remaining budget at
a glance (calorie-trackers, via search). Everything else is secondary
to that loop (trygaya, via search).

**Calorie and macro summary.** A single dial for remaining calories
plus a macro breakdown beneath it (calorie-trackers, trygaya summaries).
Budget-remaining framing rather than consumed-so-far.

**Empty vs populated.** Standard Breakfast / Lunch / Dinner / Snacks
slots (Amy Food Journal, via search). Empty-state design not directly
observable this session (inference).

**Food item rows.** Familiar list rows; logging is search, select,
adjust serving, confirm, and is fast enough that first-timers log
within minutes (calorie-trackers, via search).

**Quick actions.** Quick-add food, barcode, a snap-a-photo route
(trygaya, via search). The product leans gamified to drive return
visits (trygaya).

**Fully vs partially vs empty.** The single dial fills toward the
budget, so all three states are the same component at different fills
(calorie-trackers, via search).

**Typography, colour, spacing.** Clean and familiar. The app now
follows WCAG 2.1 AA including high-contrast modes and screen-reader
support (Personify Health / review summaries, via search).

**Strongest design decision.** The single-dial remaining-budget view
with the full picture above the fold: eaten, remaining and macros with
no scroll (calorie-trackers, via search). It is the cleanest expression
in this set of "open it, get your answer".

**Loudest user complaint.** On Trustpilot users complain about frequent
ads "sometimes disguised as gifts", a database full of duplicates and
miscalculated items, and a UI change that moved the calendar from the
top to the bottom and turned a one-click date change into a three-step
flow through dropdowns (Trustpilot loseit.com). Several report being
charged for a year right after the trial, and ads added after paying,
with a $10 charge to remove them (Trustpilot loseit.com).

**Dated or below-bar.** Ads inside a paid experience and a database full
of duplicate and miscalculated entries undercut the clean shell
(Trustpilot loseit.com). The calendar relocation is a textbook case of a
redesign adding taps to a once-instant action.

---

## 6. Yazio

**Layout and hierarchy.** A calorie ring at the top showing calories
eaten and remaining, with macro bars for carbs / protein / fat, then
meal slots, plus water intake, presented as "a clean, at-a-glance
summary of daily progress... without feeling cluttered" (trygaya, via
search; hotelgyms review).

**Calorie and macro summary.** A central calorie ring plus three macro
progress bars (carbs, protein, fat) (trygaya, via search). Strong
glanceability is the main praise.

**Empty vs populated.** Standard meal slots populate beneath the ring.
Empty-state design not directly observable this session (inference).

**Food item rows.** Standard food rows under meal sections (trygaya,
via search).

**Quick actions.** Add per meal, barcode, AI photo logging (the app now
brands itself "AI Calorie Tracker by Yazio") (App Store listing).

**Fully vs partially vs empty.** Ring fill plus macro-bar fill carry the
state.

**Typography, colour, spacing.** Widely praised as well designed: users
say it is "super well designed" and well organised (trygaya, via
search). Generally a clean, friendly, slightly lifestyle-leaning look.

**Strongest design decision.** A genuinely glanceable top summary: ring
for calories, three bars for macros, water beneath, with restraint so it
does not feel cluttered (trygaya, via search).

**Loudest user complaint.** A recent diary UI change drew pushback.
Users say "Everything's perfect, just not the diary UI" and ask for an
option to revert to the old style, and that the new calorie-intake
display in the diary "looks off" (trygaya, summarising user reviews).
Source is a review-site summary of store reviews, not a single linkable
thread this session, so treat the exact wording as reported-not-verified.

**Dated or below-bar.** Mostly strong. The friction is the recent diary
restyle that some users dislike (trygaya, via search).

---

## 7. My Macros+

**Layout and hierarchy.** Built by a former bodybuilder for fitness
people. At the top of the screen, red numerals show how much of each
nutrient (protein, carbs, fat) remains for the rest of the day as you
add saved meals or foods (Daily Burn). The whole product is oriented
around an athlete who already knows their numbers and needs to hit them
(eatthismuch).

**Calorie and macro summary.** Remaining grams per macro shown as plain
numerals (red countdown numbers), not rings or bars (Daily Burn). This
is the most "athlete spreadsheet" presentation in the set, and that is
deliberate.

**Empty vs populated.** Meal-based logging with the ability to set
completely different macro goals per day of the week, which suits
training-day vs rest-day splits (eatthismuch). Empty-state design not
observable this session (inference).

**Food item rows.** Standard rows; the strength is a 5-million-item
database, barcode scanning and an AI estimate for unlisted foods
(MyMacros site, eatthismuch).

**Quick actions.** Saved meals, barcode, AI nutrition estimate, per-day
macro goals (eatthismuch, MyMacros site).

**Fully vs partially vs empty.** Numbers count down toward zero
remaining, so the day reads as a budget burn-down (Daily Burn).

**Typography, colour, spacing.** "Not the flashiest app on this list"
(eatthismuch). Recent updates refreshed the Water Tracker, Macro
Calculator and Weekly Summary screens with "smoother, cleaner layouts"
(MyMacros site / store, via search). Functional, not premium.

**Strongest design decision.** Per-day-of-week macro targets plus a
clean remaining-grams readout: it speaks directly to a physique athlete
running different numbers on training and rest days (eatthismuch).

**Loudest user complaint.** No specific diary-design complaint surfaced
this session. The recurring framing is that it is reliable but not
visually flashy (eatthismuch). Marked as inference that visual polish,
not function, is the gap.

**Dated or below-bar.** Visual finish lags the modern set (MacroFactor,
Yazio, Lifesum). It trades polish for control, which its audience
accepts.

---

## 8. Lifesum

**Layout and hierarchy.** The most aesthetically praised in this set:
"recognized as the best-designed UI of any calorie tracker", warmer and
more lifestyle-oriented than rivals, using illustrations, gradual colour
transitions and a weekly "Life Score" that frames food tracking inside a
broader wellness routine (calorie-trackers, via search).

**Calorie and macro summary.** A distinctive circular "plate" view
shows macro balance as colour-coded slices rather than raw grams
(calorie-trackers, via search). It trades precision for an intuitive,
visual read of balance.

**Empty vs populated.** Recent diary updates add "more insights... more
details, more graphs, more colors" and show your current diet plan
(calorie-trackers, via search). Empty-state design not observable this
session (inference).

**Food item rows.** Standard rows under meals, with photo, voice, text
and barcode logging routes (Lifesum features page, via search).

**Quick actions.** Snap a photo, voice, type, or scan to log (Lifesum
features, via search).

**Fully vs partially vs empty.** The plate fills with colour-coded
slices and the Life Score gamifies diet quality across the week
(calorie-trackers, via search).

**Typography, colour, spacing.** "Genuinely beautiful... clean
typography, soft colors, plate-style food visualizations" (calorie-
trackers, via search). This is the premium-finish benchmark, but it is
tuned for wellness, not physique sport.

**Strongest design decision.** The colour-coded plate: macro balance as
slices is an instant, non-numeric read of how the day is shaped
(calorie-trackers, via search).

**Loudest user complaint.** The freemium model. Lifesum's free tier is
"one of the most restricted among major nutrition tracking apps", with
grayed-out features and constant upgrade prompts. Crucially for an
athlete audience: "Macronutrient breakdowns cannot be viewed without
Premium" and barcode scanning is paywalled (Nutrola free-vs-premium).
Billing complaints are common: cancelling in-app does not always stop
billing, and many users were charged $9.99/month before finding the
annual option (Nutrola, summarising store reviews).

**Dated or below-bar.** Not dated, but mis-aimed for a physique athlete.
The plate trades the exact gram counts a serious lifter needs for a
softer wellness read, and the macros are paywalled (Nutrola).

---

## Cross-domain apps known for premium daily logging

The brief is a diary used by a training-focused physique athlete:
purposeful, goal-driven logging, not casual wellness. These non-nutrition
apps each solve "show me my day at a glance, with depth on demand" well.

### Apple Activity Rings (Apple Fitness / Watch)

Three concentric rings (Move, Exercise, Stand), each a distinct colour
encoding one daily goal, updating in real time so progress reads at a
glance and a "closed" ring is an instant success signal (Competo,
Vertu, Apple developer HIG page; note the Apple HIG page body did not
load for direct quoting this session, so the HIG specifics here are
inference from secondary sources). The lesson for a food diary: one
unmistakable daily-completion signal beats a wall of numbers. A physique
athlete's three rings could be calories-to-target, protein-hit, and
training-day adherence, each with its own fill, closed when the day is
done right.

### Gentler Streak

Apple Watch App of the Year 2022 and an Apple Design Award in 2024
(Sketch blog summary, App Store). It translates raw stats into a daily
status in words: "you can look at the stats, but we also translate those
stats into words: digesting your data and presenting it as your daily
fitness status" (Sketch blog, via search). Its core is a visual timeline
of activity against the body's readiness, with charts that feel warm
rather than cold (Sketch blog summary; the Sketch and Pixso articles
both 403'd for direct quotes, so these specifics are reported-not-fully-
verified). The lesson: pair the numbers with a single plain-English read
of "how today is going", without the encouragement filler. For a lifter
that is "on track for your protein and calorie targets", stated flatly.

### Oura

Oura collapses a complex day of physiological data into a small number
of headline scores (Readiness, Sleep, Activity) so the daily surface is
a few clear scores with depth one tap down (superage Bevel-alternatives
summary). The lesson for a diary: a single composite "did I hit my day"
score on top, with the full macro and food breakdown underneath for
when the athlete wants it.

### Bevel

Bevel pulls sleep, recovery, strain, nutrition and workout data into one
dashboard and is praised for "making complex health data feel
approachable" (superage Bevel-alternatives summary). The lesson: a
goal-driven athlete tracks more than food, so a diary that reads as one
calm dashboard, not a dense table, wins on daily use.

---

## Design patterns worth stealing

1. **Lead with one glanceable goal read, depth on tap.** MacroFactor's
   "clean, glanceable interface with deep nutritional details when you
   want them" is the model (MacroFactor best-food-logging post). Oura
   and Apple Rings do the same with composite scores and ring fills
   (superage; Competo / Vertu).

2. **Bars over a single ring when macros matter.** A physique athlete
   tracks four numbers, not one. MacroFactor's stacked calorie / P / F /
   C bars read all four against target at once (MacroFactor blog, via
   search), where a single calorie ring (Lose It, Yazio) hides macros.

3. **Keep per-meal subtotals visible.** The single biggest 2026
   cautionary tale is MFP demoting per-meal calories and macros behind
   "View All" and getting the loudest backlash in the category
   (piunikaweb; MyFitnessPal community). Show meal subtotals in place.

4. **Protect the core logging loop above all.** MFP turned a ~90-second
   log into "several minutes" and lost trust (piunikaweb). Lose It moved
   the calendar and turned one tap into three (Trustpilot loseit.com).
   Count the taps to log a food and to change the date, and keep them
   low.

5. **Recency beats aesthetics for power loggers.** Cronometer's own beta
   users asked for a most-recently-used list of the last 30 items
   (forums.cronometer.com). A physique athlete eats the same foods often:
   surface them.

6. **Per-day-of-week targets fit training splits.** My Macros+ lets
   athletes set different macro goals per weekday for training vs rest
   days (eatthismuch). A serious diary should treat training and rest
   days as different targets, not one flat number.

7. **Adherence-neutral tone, no cheerleading.** MacroFactor presents the
   day "in a colorful yet adherence-neutral way that emphasizes
   sustainable process over short-term failure or success" (MacroFactor
   dashboard-revamp post). Report the facts, skip the praise. This also
   matches Volyume's own copy rules.

8. **Translate the numbers into one plain status line.** Gentler Streak
   turns stats into a daily status in words (Sketch blog, via search).
   For a lifter, a single flat line such as "protein and calories on
   target, fat over" earns its place where a paragraph of encouragement
   would not.

9. **One clear shortfall signal at the top of a dense screen.**
   Cronometer puts the most critical targets first and colour-codes
   shortfalls, so even a data-heavy screen answers "what do I fix"
   immediately (Cronometer support, via search).

10. **Don't paywall the core read.** Lifesum hides macronutrient
    breakdowns and barcode scanning behind Premium, which is exactly the
    data a physique athlete opens the app for (Nutrola). If macros are
    the point, macros are not a paywall feature.

---

## Sources

- [Introducing the brand new Today tab (MyFitnessPal support)](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab), blocked to direct fetch (403), used via search summary
- [MyFitnessPal's New Today Screen & Progress Tab (MFP blog)](https://blog.myfitnesspal.com/myfitnesspal-today-screen-progress-tab-update/), blocked to direct fetch (403), used via search summary
- [Macros By Meal FAQs (MFP support)](https://support.myfitnesspal.com/hc/en-us/articles/360032625151-Macros-By-Meal-FAQs)
- [MyFitnessPal Alternatives 2026: Why Users Are Switching After the Redesign (PlateLens)](https://platelens.app/blog/myfitnesspal-alternatives-2026), blocked to direct fetch (403), used via search summary
- [MyFitnessPal users complain new Today tab update makes the app harder to use (piunikaweb)](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/), TLS error on direct fetch, used via search summary; summarises r/MyFitnessPal complaints
- [The new food diary format is horrible. Please change it back. (MyFitnessPal community)](https://community.myfitnesspal.com/en/discussion/10941695/the-new-food-diary-format-is-horrible-please-change-it-back), blocked to direct fetch (403), title and theme from search results
- [MacroFactor delivers the next-generation experience / dashboard revamp (MacroFactor)](https://macrofactor.com/dashboard-revamp/)
- [Get to Know Your Dashboard (MacroFactor help)](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard), blocked to direct fetch (403), used via search summary
- [MacroFactor Advances Macro Tracking with its Timeline-Based Food Log (MacroFactor)](https://macrofactor.com/timeline-based-food-logger/)
- [MacroFactor is rolling out the fastest food logger (MacroFactor)](https://macrofactor.com/new-food-logger/)
- [Is MacroFactor Still the Fastest Food Logger (MacroFactor)](https://macrofactorapp.com/best-food-logging-app/)
- [MacroFactor widgets (MacroFactor)](https://macrofactorapp.com/widgets/)
- [MacroFactor review (Outlift)](https://outlift.com/macrofactor-review/), TLS error on direct fetch this session
- [MacroFactor best calorie counter app (Simple Solutions Fitness)](https://www.simplesolutionsfitness.com/macrofactor-best-calorie-counter-app), used via search summary
- [Carbon Diet Coach review (FeastGood)](https://feastgood.com/carbon-diet-coach-review/)
- [Is Carbon Diet Coach Worth It in 2026 (NutriScan)](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07), used via search summary
- [Carbon Diet Coach review (Garage Gym Revisited)](https://garagegymrevisited.com/carbon-diet-coach/)
- [Diary Overview (Cronometer support)](https://support.cronometer.com/hc/en-us/articles/360018171731-Diary-Overview), used via search summary
- [Cronometer Review 2026 (calorie-trackers)](https://calorie-trackers.com/reviews/cronometer/), used via search summary
- [Beta User Interface complaints, suggestions, and feedback (Cronometer forums)](https://forums.cronometer.com/discussion/1906/beta-user-interface-complaints-suggestions-and-feedback)
- [Lose It! Review 2026 (calorie-trackers)](https://calorie-trackers.com/reviews/lose-it/), used via search summary
- [Lose It! Review (trygaya)](https://www.trygaya.com/review/lose-it-review), used via search summary
- [Lose It! reviews (Trustpilot)](https://www.trustpilot.com/review/loseit.com), user complaints, used via search summary
- [Lose It! App Review (Amy Food Journal)](https://www.amyfoodjournal.com/blog/lose-it-app-review)
- [Yazio Review 2026 (trygaya)](https://www.trygaya.com/review/yazio-review), used via search summary, includes summarised store reviews
- [AI Calorie Tracker by Yazio (App Store)](https://apps.apple.com/us/app/ai-calorie-tracker-by-yazio/id946099227)
- [AI Calorie Tracker by Yazio (ScreensDesign)](https://screensdesign.com/showcase/yazio-calorie-counter-diet), blocked to direct fetch (403)
- [5 Great Apps to Track Macros On the Go (Daily Burn)](https://dailyburn.com/life/tech/food-diary-app-tracking-macros/)
- [12 Best Macro Tracking Apps 2026 (Eat This Much)](https://blog.eatthismuch.com/best-macro-tracking-apps/)
- [My Macros+ (official site)](https://getmymacros.com/)
- [Lifesum Review 2026 (calorie-trackers)](https://calorie-trackers.com/reviews/lifesum/), used via search summary
- [Lifesum Free vs Premium 2026 (Nutrola)](https://nutrola.app/en/blog/lifesum-free-vs-premium-what-do-you-actually-get), used via search summary
- [Lifesum features](https://lifesum.com/features/)
- [Activity rings (Apple Developer HIG)](https://developer.apple.com/design/human-interface-guidelines/activity-rings), page body did not load for quoting; specifics taken from secondary sources below (inference)
- [Apple Fitness rings explained (Competo)](https://www.competoapp.com/en/activity-rings-explained)
- [How to Effectively Use Apple Fitness Rings (Vertu)](https://vertu.com/lifestyle/use-apple-fitness-rings-effectively-2025/)
- [How Gentler Streak brings kindness to fitness (Sketch blog)](https://www.sketch.com/blog/gentler-streak/), blocked to direct fetch (403), used via search summary
- [Gentler Streak's Design: The Hidden UX Gems (Pixso)](https://pixso.net/articles/gentler/), blocked to direct fetch (403)
- [Gentler Streak Workout Tracker (App Store)](https://apps.apple.com/us/app/gentler-streak-workout-tracker/id1576857102)
- [5 Best Bevel App Alternatives for Health Tracking 2026 (SuperAge)](https://www.superage.app/en/blog/best-bevel-alternatives/), used via search summary

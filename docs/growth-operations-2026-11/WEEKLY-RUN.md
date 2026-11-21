# The weekly operating run and the monthly wording round

Task: LOC-665. Source: the accepted plan on LOC-583 (revision 7), sections 4, 5, 6 and 8. This is the whole of the company's recurring growth work: one run a week by one builder on the cheaper model, with a longer first run each month. Nothing else recurs.

Read this page top to bottom, do the steps in order, stop at the limits. Do not improvise, research or add checks.

**What this page leans on (delivered by sibling tasks, not repeated here):**

| Piece | Where it is | What the run uses |
| --- | --- | --- |
| Weekly totals and crash counts (LOC-661) | `docs/growth-totals/FIGURES.md` (what each figure means), `SETUP.md`, `sample-totals.json` | The file `latest.json` and `weekly/<date>.json` on branch `weekly-totals` of the private repository `Volyume/volyume-growth-totals`, written every Monday at 06:00 UTC |
| Store pages, phrases, position check, store figures (LOC-662) | `docs/growth-store-2026-11/` (`03-phrases-and-monthly-check.md`, `05-store-figures-and-setup.md`, `phrases.tsv`, `wording/`), `scripts/store-position-check.cjs` | The phrase list, the wording files, the monthly position command, where store installs are read |
| The Apple advert (LOC-664) | `docs/growth-ads-2026-11/01-campaign-definition.md`, `campaign.json` | Only while the advert is running (step 5) |

Those folders reach `main` when the founder adds them. Until then the run reads them from the task branches named on LOC-661, LOC-662 and LOC-664. If a file named here is missing, that is a gap: record it (step 8) and carry on with the rest.

## 1. Fixed limits (read first)

**Budget.** A weekly run is at most **30 tool calls** (the steps below add to 28: 2, 4, 6, 3, 6, 1, 4, 2). The monthly part (section 3) adds at most **30 more**, so the first run of a month is at most **60**. Count every call, including reads. At the cap, stop: write the output with what is done, put "stopped at budget, after step N" in its first line, raise one task to the lead saying so, and close. Do not start the next step "just to finish".

**No research.** No web search, no web page, no article, no competitor reading, no store review reading (reviews belong to the lead's monthly run). The only things read are: this page, the repository files named above, the finished totals, the store figures named in step 3, the position command's output, the one public App Store lookup in step 5, and (while adverts are held or running) Apple's advert report or the founder's exports of it.

**The run must never:**

1. Publish anything (store wording, website, a post) without the independent check on record for the exact text (a `Verified-SHA:` line from the reviewer).
2. Spend money, change a budget, a bid or an end date, add a payment method, or start an advert.
3. Touch `main`: no push, no merge, no force, no workflow dispatch, no build, no migration, no store upload, no deploy. Work is committed on the run's own task branch only.
4. Read anything but finished totals: no database, no database key, no store login typed or asked for, no user data, no crash event, no review text, nothing about safety flags. If a credential is not already provided to the run by the platform, the figure is "not readable" (step 8), never asked for.
5. Put a secret, key, token or personal data in any comment, document, commit or prompt.
6. Make a claim in public wording that the app does not meet today: no price promise, streak, fake member, coach partnership, gym challenge, health claim or AI claim (Volyume is free, is itself the coach, and works by fixed rules). The monthly round swaps phrases only; it adds no new claim.
7. Turn a store rank into an install estimate, or write "phrase X brought N installs" for free search (neither store reports that).
8. Add a signal, a threshold or an action that is not in section 2, or soften one that is.
9. Decide for the lead: anything the run "raises" is raised once as a task with the figures, and the run does not wait on it.

**Where things live (the lead fills these in when creating the routine, and repeats them in the routine description):**

- `LEDGER`: the standing issue whose document `growth-ledger` holds the memory between runs (section 6). Read it in step 1 and write it in step 9.
- Each run's own issue holds that week's output as a document named `weekly-YYYY-MM-DD` (the Monday's date).

## 2. The eight signals and what the run does about each

This table is section 6 of the plan, copied. The left column is the plan's wording; the middle column is its action, unchanged; the right column says only **who does it**. "Run does it" means the run does it in its own run. "Raises" means the run raises one task to the lead (with the figures, never a question) and the lead or the independent reviewer or the founder does the part named, because the run has no access to it or may not do it alone (section 1).

| # | Signal (plan section 6) | Action, without asking (plan section 6) | Run does it | Run raises, for the lead |
| --- | --- | --- | --- | --- |
| S1 | Volyume is still outside the top 25 for a phrase after two rounds | That phrase is dropped and the next takes its place. | Marks the phrase "dropped" in the ledger and in `phrases.tsv`, and picks the next phrase (rule R4 below) in the monthly round. | Any wording text change that results goes to the independent check (section 3), raised as one task. |
| S2 | Volyume ranks for its phrases but installs from store search do not rise | The opening lines of the page and the order of the screenshots are changed, then compared month against month. | Writes the new opening lines and a new screenshot order as a proposal in the monthly round, and records the month's install figure to compare next month. | The proposal goes to the independent check; Android after it, iPhone queued for the next build. The run cannot change screenshots itself. |
| S3 | Fewer than 1 in 5 new accounts log three workouts in 14 days (once there are at least 10 accounts to judge by) | Adverts pause if running. The step where most new users stop becomes a repair at the front of the improvement queue that week. The next release's new users are compared with the last. | Finds the step where most new users stop (rule R3) and records the release comparison (table in step 6). | One task, "repair: <step>", marked first in the queue; and, only if adverts are running, a one-line "pause the adverts now" notice the same day. The company has no write access to Apple's advert account, so the lead or founder presses pause. |
| S4 | A crash or error is hitting users | A repair task the same week, ahead of other work. | Decides it has fired (rule R5). | The repair task, same week, with the version, crash count, people count and the previous week's figures. |
| S5 | A release makes the totals worse than the one before | The change responsible is corrected or removed in the next build. | Decides it has fired (rule R6) and states the two releases and the figures. | One task to correct or remove the responsible change in the next build. The run cannot name the change, because it reads totals only; the lead does. |
| S6 | Active users stop after a few weeks | The last screen people used before leaving, and the reason they chose on leaving, decide that month's improvements. | Copies the last-screen rows and leaving-reason rows into the output every week (step 6), so they are ready. | Nothing weekly. The lead uses them in the monthly improvement round. See gap G6: the plan gives no number for "stop", so the run never calls this signal fired. |
| S7 | Halfway through the advert spend, Apple's report shows an install costing more than £5 | Adverts stop early. | Only while adverts run: reads the report (step 5), checks the rule, records the figures. | If fired: a one-line "stop the adverts now" notice the same day. The run cannot stop them (no write access). |
| S8 | Three rounds (on iPhone, three builds) with no rise in installs from store search | Wording changes stop on that phone, because repeating them would be activity for its own sake. Pages stay accurate, featuring requests and the improvement round continue, and my monthly report says plainly that free search has reached its limit there, with the figures. The only routes left need money, so the report may carry one optional spending offer. Nothing stops while you decide, or if you never do. | Sets "wording stopped" for that phone in the ledger; from then the monthly round skips swaps for that phone and keeps the pages accurate. Records the three rounds' figures. | One task to the lead carrying the figures, for the lead's monthly report. The run never makes a spending offer. |

**Reading rules the plan does not spell out.** The plan gives the actions but, for some signals, not the exact figure that triggers them. The run uses these rules. They are listed as gaps (section 7) so the lead can overrule them; changing one is the lead's decision, not the run's.

- **R1. This week.** The latest week in the file with `complete: true`. Last week is the one before it. A sign-up week whose `first_7_days_over_for_everyone` is false, or whose later-day figures are `null`, is shown as "still counting"; never as zero.
- **R2. A round (one meaning, used by S1 and S8).** On iPhone a round is one **build** that carries the phrase in the live App Store wording, counted at the first monthly position file taken after that build is live. Two monthly files taken after the same build are one round, not two. On Android a round is one monthly check (position is not readable there, so installs only, G2) taken after the Android wording went live. S1 reads iPhone rounds only. S8 counts rounds per phone: three builds on iPhone, three monthly checks on Android. A phrase is "outside the top 25" when its position in the file is 26 or more or "not in top 50". This is a reading of the plan's "rounds" and "three builds" (G12).
- **R3. Where most new users stop.** From `sign_up_steps_by_week`, over the last four complete weeks, add `people` minus `people_completed` for each step (rows in `other` cannot be assigned to a step and are shown only as a count). The step with the largest sum is the answer. Also name the top row of `last_screen_before_leaving`.
- **R4. The next phrase.** The first line of `phrases.tsv` (top to bottom, excluding the brand control "volyume") that is not in the live wording and is not marked dropped. While Apple's advert report exists, the ranked phrase list from its final read (LOC-664 section 7) comes first, in its order. If no line is left, raise one task saying the list is used up; do not invent phrases.
- **R5. A crash or error is hitting users.** `crashes.status` is `ok` and `crashes.total.crashes` is more than 0, or any row of `by_app_version` has `errors_per_visit` more than 0. If a repair task for that version is already open, add the new figures to it as a comment instead of raising another.
- **R6. A release made the totals worse.** Compare the two newest releases that appear as rows in `new_account_outcomes.by_app_version_at_sign_up` (newest = the later `first_seen` in `by_app_version`). Fired when both rows have `judged_14_days` of at least 10 and the newer release's share `three_workouts_in_14_days / judged_14_days` is lower than the older release's. Other shares (day 7, 14, 30 still training) are shown in the table and mentioned "for the lead" if lower, but do not fire the signal. If a release was folded into `other` (fewer than 5 people), say "too few to judge".
- **R8. Extra swaps and "weakest".** Beyond S1 drops, if fewer than 3 phrases were dropped, the run may swap up to the difference to reach 3 swaps in the month, choosing the live phrases with the most rounds outside the top 25 (ties: the one furthest from the top 25, "not in top 50" being furthest). This cap and meaning of "weakest" are mine, not the plan's or LOC-662's (G12). They never limit S1.
- **R7. S2's "ranks".** Volyume is in the top 25 on iPhone for at least one non-brand phrase in the latest position file. "Do not rise": the month's installs from App Store Search plus App Store Browse are not higher than the previous month's, in the same territory (UK), as read in step 3.

## 3. The monthly wording round (the weekly run whose date is the 1st to the 7th)

Do this after the weekly steps 1 to 6, on the one run each month whose Monday date falls on the 1st to the 7th. Total budget for that run: 60 calls.

**M1. Position check (1 call).**

```
node scripts/store-position-check.cjs --out docs/growth-store-2026-11
```

It needs no credential and writes `positions-YYYY-MM-DD.md`. Exit code 1 means a phrase could not be read: say so and do not file a partial month as a clean one. It is an approximation, covers the App Store only, and says nothing about installs (`03-phrases-and-monthly-check.md`).

**M2. Update the ledger counts (no extra call, done in step 9).** Only if a new iPhone build has gone live since the last position file (R2): for every phrase in that build's wording, add one to its "rounds outside the top 25" if it was outside the top 25 in this file, or reset it to 0 if it was inside. With no new build, the counts do not change. A phrase at **2** fires S1.

**M3. Read the stores' installs (up to 6 calls).** As step 3 below. Compare with last month's recorded figure (R7) and decide S2 and S8.

**M4. Swap the weakest phrases (no new research).**

1. **S1 drops are never capped.** Every phrase at 2 rounds outside the top 25 is dropped this month, however many there are (at the start this can be every live phrase). The plan's "dropped and the next takes its place" has no limit and the run adds none.
   Beyond the S1 drops, the run makes no other swap on its own, except the extra swaps allowed by R8.
2. Each drop is replaced by the next phrase by rule R4. A phrase is never left in the wording because the replacements do not fit: if the field limits (30, 80, 100) cannot hold every replacement, the drops still happen, the replacements go in in R4 order until the field is full, and the rest are written in the ledger as "waiting for room" and tried first next month. The run never shortens words, drops the name or breaks a limit to make them fit.
3. If S8 has stopped wording changes on a phone, make no swap for that phone this month.
4. Edit only these files, only to swap phrases, never to add a claim: Android `play-title.txt` (30 characters), `play-short-description.txt` (80); iPhone `apple-subtitle.txt` (30), `apple-keywords.txt` (100). The name "Volyume" never changes. Keep every limit.
5. If S2 fired, also write the proposal for the opening lines (Android short description and the first paragraph of the full description; iPhone subtitle and the first paragraph of the description) and the screenshot order, as a text file `docs/growth-store-2026-11/proposal-YYYY-MM.md` that says what changes and why. No new claim, and the opening lines must stay true of the app today (the proofs are in `02-store-wording.md`).
6. Run the one wording check: `env -u NODE_ENV npx jest scripts/__tests__/storeWording.guard.test.js` (limits, banned words, name unchanged). If it fails, fix the text, not the test.
7. Commit on the run's task branch, with no attribution of any kind in the message (the repository rule).

**M5. Android: prepare for the independent check (2 calls).** Raise one task assigned to the independent reviewer with the commit SHA, the changed files and the proof lines. Label it "Android wording, ready for independent check". The run does not publish. After the reviewer's `Verified-SHA:` for that exact SHA is on the task, the text may go live on Google Play only in a later run, and only if the platform has given the run the limited Play credential (`05-store-figures-and-setup.md`, setup C). If it has not, raise "ready to paste, checked" to the lead, who has it pasted (`05` section D).

**M6. iPhone: queue for the next build (1 call).** Put the checked iPhone text in the ledger under "iPhone queue", with the month. It waits for the founder's next build. It is not sent, uploaded or published by the run. The same line in the ledger notes that Apple featuring text (`04-apple-featuring-request.md`) is also filed with each build by the lead.

**M7. Record the round (ledger, step 9).** Rounds as R2 defines them (Android: one per monthly check with wording live; iPhone: one per live build), the month's install figures, which phrases were dropped and which swapped, and any "waiting for room".

## 4. The weekly steps, in order

**Step 1. Read the ledger and this page's identifiers (2 calls).** Read the document `growth-ledger` on `LEDGER`. It holds: the phrase table (in wording, since which month, rounds outside top 25, dropped), the last month's store installs, the "wording stopped" flags, the iPhone queue, the advert state (not started, running with dates, ended) and open repair tasks by version.

**Step 2. Read the finished totals (up to 4 calls).** From the private repository, branch `weekly-totals`: `latest.json` and the file before it in `weekly/`. For example:

```
gh api "repos/Volyume/volyume-growth-totals/contents/latest.json?ref=weekly-totals" -H "Accept: application/vnd.github.raw"
gh api "repos/Volyume/volyume-growth-totals/contents/weekly?ref=weekly-totals"
```

then the one before it. The first successful run is the check that the company's GitHub access can read this repository (`docs/growth-totals/SETUP.md`). If it cannot, write "totals not readable" in the output, raise one task to the lead and finish the rest of the steps that do not need the totals. Never ask for a key. If `format` is not `volyume-growth-totals/1`, stop and say so.

Check the sections that matter and their `status`:

- `new_account_outcomes.status`: `ok`, or `not_applied` (migration 204 not applied: the one measure, S3 and S5 cannot be read, say so), or `failed`.
- `crashes.status`: `ok`, `not_configured` (no Sentry token yet: S4 cannot be read), or `failed`.
- `complete` and `first_7_days_over_for_everyone` flags (R1).

**Step 3. Read store installs (up to 6 calls; weekly, so the monthly figure is not a surprise).** The totals do not contain store installs. Read them only through what the platform has already given the run, in the order of `05-store-figures-and-setup.md`: App Store Analytics, Acquisition, United Kingdom, source types App Store Search and App Store Browse (first-time downloads); Google Play Console, Store performance, United Kingdom, channels "Google Play search" and "Google Play explore". Write each figure with its date range and one line on how noisy it is (Apple's last 2 to 3 days are unreliable; Play folds small values into "Other"). Until the Apple analytics key and the Play reading access exist, **write "not readable" for each and raise no more than one task per month asking the lead for it**. Do not estimate, do not copy a figure from anywhere else.

**Step 4. Compute (up to 3 calls, no more).** Use only the formulas in section 5. Do the arithmetic once, check it once.

**Step 5. Adverts: the start gates, then the spend check (up to 6 calls).** Read the ledger's advert state. It is "held", "running" or "ended".

**If held (the advert is defined and not started):** report the two gates the weekly run owns (`01-campaign-definition.md` section 1), as one line each in the output, so the lead knows whether the advert may start. Never start it.
- **G1, the corrected iPhone page is live:** one read of `https://itunes.apple.com/lookup?id=6777083702&country=gb`; the `description` equals `docs/growth-store-2026-11/wording/apple-description.txt` once line endings are made `\n` and the ends are trimmed. Report "open" or "shut".
- **G2, the weekly totals work:** the newest `latest.json` exists and `new_account_outcomes.status` is `ok`. `not_applied` means shut.
- G3 (account and card) and G4 (the company can read the report) are the founder's; report them only as "not recorded in the ledger" or the state the ledger holds.

**If running:** read Apple's report as in `01-campaign-definition.md` section 6, from the start date: Spend, Installs (Tap-Through), Taps and Average CPA. Where the report comes from depends on the access the founder gave (gate G4):
- **API read access:** read it directly on the run's day (weekly; G7).
- **Hand exports (no credential):** the founder exports the report on S+7, S+14, S+21, S+28, S+30 and S+40 (S is the start date, in the ledger). The run reads the newest export file the platform has handed it (the lead records where it lands in the ledger) and uses the figures of the latest export date on or before today. Without an export newer than 7 days, write "not readable".
- Record Spend, Installs, and Spend divided by Installs, with the date range read.

1. If Spend is over **£60.00**, raise the task "advert ceiling exceeded" to the lead the same day, as its own message.
2. S7: the first read at which Spend is **£30.00 or more** is the halfway read. Fired when Spend divided by Installs (Tap-Through) is more than **£5.00**, or there are no installs. Check it once, at that read, and record it as done in the ledger. If £30 is never reached, the rule does not come into force (the definition says so).
3. **Day-8 read** (`01-campaign-definition.md` section 5.2): on the first read dated S+7 or later, if Spend to date is under **£4.00**, put that in the output and raise one task to the lead, so the lead can offer the founder the one bid raise. The run never changes a bid.
4. If the advert's end date has passed ("ended" or now past S+29), read the final figures once (section 6, the S+40 read: total Spend, and per keyword New Downloads, Installs, Taps, Impressions) and write the ranked phrase list into the ledger for rule R4, using the definition's ranking.
5. If the report is not readable, write "not readable" and say that S7, the ceiling and the day-8 read could not be made this week. The definition prefers a daily read while adverts run, and a weekly read can let a stop fire up to 7 days late (about £14 more spent). That is the lead's ruling (gap G7); this run reads weekly.
6. If the ledger says no advert exists yet, write "no advert" and nothing else.

**Step 6. Write the output (1 call).** Create the document `weekly-YYYY-MM-DD` on the run's issue with exactly the sections below, in this order, in plain British English.

1. A first line: the date, the file read (`generated_at`), the call count used, and any "stopped at budget".
2. **The table** (section 5). This week, last week, the latest release and the previous release.
3. **Store installs**, per store, as read, or "not readable".
4. **Adverts**: running (with Spend, Installs, cost per install), not running, or ended (final figures).
5. **The eight signals**: one line each, `S1 ... S8`, "fired", "not fired" or "cannot be read: <figure missing>", with the figures that decided it. Never leave one out.
6. **For the lead**: the last-screen rows and leaving-reason rows (S6), the step where most new users stop (R3), and any figure lower for the newer release (R6).
7. **Gaps this week**: any figure from section 5 that was not available.
8. **Raised**: each task raised, with its link.

**Step 7. Raise the tasks (up to 4 calls).** One task per fired signal that has a lead action in section 2 (S1 to S5, S7 stop notice, S8). Title starts "Growth: ", for example "Growth: repair the crash in 3.4.0". The body holds the figures, the plan's action in the plan's words, and what the run did already. Do not ask a question and do not wait. A signal that is already open as a task gets a comment, not a duplicate.

**Step 8. Record what could not be read (no extra call).** Any figure the run could not get goes under "Gaps this week" with the reason. The reasons that exist today are in section 7. A missing figure is never replaced by a guess.

**Step 9. Write the ledger and close (2 calls).** Update the document `growth-ledger`, post the output's link and the list of raised tasks on the run's issue, and set it done.

## 5. The table and its formulas

Percentages are shown to the nearest whole number with the two counts beside them (for example `4 of 6, 67%`). The totals count only people who share usage data (`FIGURES.md`), so every figure is a floor, and a group of under five people is in `other` and not shown.

| Row | Figure | Where in the totals | This week | Last week | Latest release | Previous release |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Active people | `active_people_by_week.weeks[].active_people` | R1 week | the week before | not by release | not by release |
| 2 | New accounts | `sign_ups_by_week.weeks[].new_accounts` | R1 sign-up week | the week before | `by_app_version_at_sign_up` row `new_accounts` | same, older row |
| 3 | First workout within 7 days (of new accounts) | `first_workout_within_7_days` of `new_accounts` | R1 week | the week before | `first_workout_in_14_days` of `new_accounts` (14 days) | same |
| 4 | The one measure: three workouts in 14 days (of judged) | `new_account_outcomes.weeks[]` (`three_workouts_in_14_days` of `judged_14_days`); the whole window from `the_one_measure` | the newest week with `judged_14_days` above 0 | the week before that | the release row's counts | same |
| 5 | Still training after 7 days (of judged) | `new_account_outcomes.weeks[].still_training_after.day_7` | newest week with `judged` above 0 | the week before | the release row | same |
| 6 | Still training after 14 and 30 days | the same, `day_14`, `day_30` | newest week with `judged` above 0 | the week before | the release row | same |
| 7 | People now new, active, slipping, lapsed | `people_by_status_today` | today | the previous file's value | not by release | not by release |
| 8 | Crashes and people hit (last 7 days) | `crashes.total`, `crashes.by_app_version` | the file | the previous file's value | the release row | the release row, or "not in the rows" (no crashes, or under 5 people and folded into `other`) |
| 9 | Errors per visit | `by_app_version[].errors_per_visit` | not by week | not by week | the row | the row |

Fired tests (S3, S4, S5), exactly as stated in section 2:

- **S3** fires when `the_one_measure.judged_14_days` is at least 10 **and** `three_workouts_in_14_days` multiplied by 5 is less than `judged_14_days`. (This is "fewer than 1 in 5, once there are at least 10 accounts to judge by". It matches the figure pinned in `docs/growth-ads-2026-11/campaign.json`.)
- **S4** by R5. **S5** by R6.
- **S7** by step 5.
- **S1, S2, S8** from the ledger and the store readings, in the monthly round only.

## 6. The ledger (the run's memory)

The document `growth-ledger` is the only state between runs. Keep it short, with these headings: Phrases (phrase, live since, rounds outside top 25, dropped); Store installs by month and store; Wording stopped (Android, iPhone; the three rounds' figures); iPhone queue; Adverts (state, dates, last Spend and Installs, ranked list); Open repair tasks by version; Last run (date, calls used). Nothing in it may be a secret or personal data.

## 7. Gaps: figures this page asks for that do not exist yet, or that are not exact

| # | Gap | Effect | Who closes it |
| --- | --- | --- | --- |
| G1 | Installs from store search and browsing are in neither the weekly totals nor any file. Apple's Analytics and Play Console need a login or key that no agent holds, and the exact report or endpoint was not re-opened on screen (`05-store-figures-and-setup.md`). | Step 3 is "not readable" today. S2 and S8 cannot be decided. | The founder's setup (Apple analytics key, Play reading access); then the lead names the exact reading method in the ledger. |
| G2 | Google Play has no public search API, so there is no position per phrase on Android. | S1 reads iPhone positions only; the phrase list is shared, so a dropped phrase is dropped from both stores. | Nobody can close it; it is the store's limit. |
| G3 | Neither store reports free installs per phrase. | No per-phrase install claim, ever. Only Apple's advert report has it, for the bid phrases. | Nobody. |
| G4 | The one measure (and so S3 and S5) needs migration 204 applied. Until then `new_account_outcomes.status` is `not_applied`. | S3 and S5 are "cannot be read". The advert's start gate G2 stays shut. | The founder (`SETUP.md` step 4). |
| G5 | Crash counts need the read-only Sentry token. Until then `crashes.status` is `not_configured`. The file holds the last 7 days only, so "last week" is the previous file's figure. | S4 reads only `errors_per_visit` until the token exists. | The founder (`SETUP.md` step 3). |
| G6 | The plan gives no number for "active users stop after a few weeks". | S6 is never called fired; the rows are copied weekly for the lead. | The lead, if a number is wanted. |
| G7 | LOC-664 asks for a daily advert read while adverts run, which is more than "one run a week". This run reads weekly. | S7 can fire up to 7 days late, with up to about £14 more spent. | The lead rules; the run does not extend itself. |
| G8 | The plan has no figure for "worse" (S5), "rise" (S2, S8) or "ranks" (S2). The run uses R6 and R7. | A small group can swing a share. The run states both counts every time. | The lead, if different rules are wanted. |
| G9 | A release under 5 people is folded into `other`, and a version someone used after updating counts once per version. | "Previous release" can be "too few to judge". | Nobody; it is the privacy rule. |
| G10 | The company's GitHub access has not been shown to read `Volyume/volyume-growth-totals`. Its first read is the check. | Step 2 fails visibly if not. | The founder, if it fails. |
| G11 | The ledger issue and the routine do not exist until the lead creates them, and if the founder exports the advert report by hand the lead must record in the ledger where the files land. | Nothing runs weekly until then; S7 cannot be read from exports until the location is recorded. | The lead (not the founder). |
| G12 | The plan says "rounds" and, for iPhone, "three builds" without defining either, and gives no limit or meaning for "weakest" beyond S1. The run uses R2 (one meaning for S1 and S8) and R8 (at most 3 swaps a month beyond S1 drops; S1 drops are never capped). | If the lead wants a different count or cap, the ledger rules change; the S1 and S8 actions do not. | The lead. |

## 8. A filled-in example

This is one weekly output built from `docs/growth-totals/sample-totals.json` (LOC-661; synthetic data, `generated_at` 2026-11-21T06:44:23Z). Every number below is in that file or is arithmetic on it. The file ends on a Saturday, so the latest week with `complete: true` is the week of 2026-11-09 (R1). It is an example, not a real week: the real ledger and the real previous file are not in the sample, and where a figure needs them it says so.

---

**weekly-2026-11-23** (example). File read: generated 2026-11-21T06:44:23Z. Calls used: 22 of 30.

**The table**

| Figure | This week (2026-11-09) | Last week (2026-11-02) | 3.4.0 (latest release, first seen 2026-10-24) | 3.2.0 (previous release, first seen 2026-09-20) |
| --- | --- | --- | --- | --- |
| Active people | 35 | 32 | n/a | n/a |
| New accounts | 7 | 8 | 28 | 25 |
| First workout within 7 days | 6 of 7, 86% (still counting) | 7 of 8, 88% | 24 of 28, 86% (within 14 days) | 21 of 25, 84% (within 14 days) |
| Three workouts in 14 days (of judged) | none judged yet. Newest judged week 2026-11-02: 4 of 6, 67% | 2026-10-26: 4 of 7, 57% | 9 of 15, 60% | 13 of 25, 52% |
| Whole 8-week window | 24 of 42, 57% | not in the sample (previous file) | n/a | n/a |
| Still training after 7 days (of judged) | 2026-11-09: 3 of 5, 60% | 2026-11-02: 4 of 8, 50% | 14 of 22, 64% | 21 of 25, 84% |
| Still training after 14 days (of judged) | 2026-11-02: 3 of 6, 50% | 2026-10-26: 6 of 7, 86% | 10 of 15, 67% | 18 of 25, 72% |
| Still training after 30 days (of judged) | 2026-10-19: 0 of 3 (30 days not over for the rest) | 2026-10-12: 6 of 8, 75% | none judged yet | 15 of 24, 63% |
| People now: new / active / slipping / lapsed | 7 / 20 / 12 / 25 | not in the sample (previous file) | n/a | n/a |
| Crashes, last 7 days | 33 crashes, 12 people | not in the sample (previous file) | 29 crashes, 11 people | not in the rows (no crashes, or under 5 people and folded into `other`) |
| Errors per visit | n/a | n/a | 0 | 0 |

**Store installs.** App Store Search and Browse: not readable (no Apple analytics key set up; G1). Google Play search and explore: not readable (G1).

**Adverts.** Held, not started. G1 (iPhone page live): shut in this example, because the live App Store description is still the old one until the next build (`docs/growth-store-2026-11/01-live-page-record.md`; a real run does the one public lookup). G2 (totals work): open, `new_account_outcomes.status` is `ok` in the sample. G3 and G4: not recorded in the ledger.

**The eight signals**

- S1 phrase outside the top 25 after two rounds: not fired. Only the baseline position file (2026-11-21, 21 of 21 phrases outside the top 50) exists, and the new wording is not live, so no phrase has had a round. Checked monthly.
- S2 ranks but installs do not rise: cannot be read. No install figure (G1) and no phrase inside the top 25.
- S3 fewer than 1 in 5 log three workouts in 14 days: **not fired**. 24 of 42 judged, 57%; 24 times 5 is 120, which is not less than 42.
- S4 a crash or error is hitting users: **fired**. 33 crashes, 12 people in the last 7 days, 29 crashes and 11 people on 3.4.0.
- S5 a release made the totals worse: not fired. 3.4.0 is 9 of 15 (60%), 3.2.0 is 13 of 25 (52%), both groups at least 10. For the lead: the day-7 still-training share is lower on 3.4.0 (64% against 84%).
- S6 active users stop after a few weeks: not called (G6). Rows are below.
- S7 advert halfway cost: not applicable, adverts held, not started.
- S8 three rounds with no rise: not started. No round yet (ledger).

**For the lead**

- Last screen before leaving (people who lapsed, six months of data): Nutrition 7, ActiveWorkout 5, Today 5, other 8 (3 rows folded).
- Reason chosen on leaving (week 2026-11-16, still running): discarding a workout, "felt off" 14, "no time" 13, "other" 13.
- Where most new users stop (R3, four complete weeks 2026-10-19 to 2026-11-09): the only visible step rows are `full/coaching` step 1 (1 person did not finish in the week of 2026-10-19, 1 in the week of 2026-11-02) and step 3 (1, week of 2026-11-02), so step 1 leads with 2. But 22 people who did not finish a step in those weeks sit in `other` (5, 6, 5 and 6 a week) and cannot be assigned. The answer for the lead is "step 1 of full/coaching on what is visible; not decidable, 22 of the 25 are folded".

**Gaps this week.** Store installs (G1). Previous week's crash and status figures (not in the sample; a real run reads the previous file). Three-workouts share for the newest sign-up weeks (14 days not over).

**Raised.** One task: "Growth: repair the crash in 3.4.0" (S4): 33 crashes, 12 people, 29 and 11 on 3.4.0, previous week's figures to be added from the previous file; plan action "a repair task the same week, ahead of other work". No question asked. No other task. Nothing published, nothing spent, nothing on `main`.

---

## 9. One-time setup needed for the recurrence itself

None from the founder. The lead creates, once, with the platform's routine feature: (a) the standing `LEDGER` issue with an empty `growth-ledger` document, and (b) a weekly routine, Mondays at about 08:00 UK time (after the 06:00 UTC totals), assigned to one builder on the cheaper model, whose description is this page's path and the `LEDGER` issue. The run does not start anything until the founder's setup for LOC-661 (adding the totals program, the private repository, the token) is done, because there is nothing to read before it. The other credentials (Apple analytics key, Play reading access, Apple advert report access, Sentry token, migration 204) are the setup of the pieces that need them, listed on LOC-661, LOC-662 and LOC-664; this page needs none beyond those.

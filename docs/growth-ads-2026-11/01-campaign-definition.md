# The £60 Apple search advert campaign: definition (HELD)

Task: LOC-664. Source: accepted plan on LOC-583 (revision 7), section 4 "Apple search adverts" and section 6 (the two stop rules). Prices: `evidence-2-paid-installs`. Phrases: LOC-662, `docs/growth-store-2026-11/phrases.tsv` at commit `d3e9bd75d5bda28d3a1bd59c0f537cab093e0d74` (verified and tested by the reviewer and tester on that SHA).

**Status: prepared and held. Nothing has been created in any advertising account, nothing has been spent, and no tracker or SDK is added to the app.** The machine-readable copy of every value below is `campaign.json` in this folder. `node scripts/growth/appleAdsEntrySheet.cjs <start date>` prints the sheet for a start date, with the end date worked out.

How to read the labels: **Apple says** means Apple's own help page said it on 21 November 2026 (URLs in section 9). **Evidence** means the LOC-583 evidence documents. **Not verified** means nobody opened it on screen.

## 1. The gates: the day it may start

The campaign is entered and started only when all four are true. The start date is the next day, at 00:00.

| # | Gate | How it is checked | Who |
|---|---|---|---|
| G1 | The corrected iPhone page is live | The public lookup `https://itunes.apple.com/lookup?id=6777083702&country=gb` returns a `description` equal to `docs/growth-store-2026-11/wording/apple-description.txt` (LOC-662), compared after converting line endings to `\n` and trimming whitespace at the start and end of both texts (so a trailing newline in the file cannot fail the gate). The description travels with the build, so this is the proof that the corrected page, not the old one, is what an advert will show. | The weekly operating run, then the lead |
| G2 | The weekly totals work | The newest `latest.json` in the private totals repository (LOC-661) exists and its `new_account_outcomes.status` is `ok`. `not_applied` means migration 204 is not applied and stop rule B below could not be read, so the campaign does not start. | The weekly operating run |
| G3 | The Apple advertising account is open and a card is on it | Section 7, steps 1 and 2 are done. | The founder |
| G4 | The company can read the report | Section 7, step 3 is done (API credential). **Or** the founder has agreed to export the report by hand on the six dates in section 6, **knowing what is lost without the credential**: stop rule A is read only on an export date, so it can fire up to 7 days late and up to about £14 more can be spent before it does; there is no daily read. Stop rule B is not affected (it reads the weekly totals, not Apple). | The founder |

An advert is built from the App Store page as it stands (Apple says: the Maximize Conversions group "will automatically create an ad using your default product page"; this campaign uses the default ad too). Starting before G1 would pay to show the old page.

## 2. The campaign: every value

One campaign. One ad group. Nothing else.

| Field | Value | Source for the choice |
|---|---|---|
| Tool | Apple Ads **Advanced** (not Basic) | Apple says Basic is "Set your monthly budget" with a maximum cost-per-install; daily budget, end date, match types and keyword reports are on the Advanced pages. Evidence-2 §1: Basic has no Platform API. |
| App | Volyume, App Store id 6777083702 | `docs/IOS_GO_LIVE_STEP_BY_STEP.md:32` |
| Country | United Kingdom only | Plan section 4. Apple says "Choose one or more countries or regions", so one is chosen. |
| Placement | App Store **search results** only. Not the Today tab, not the Search tab, not product pages. | Plan: "exact UK searches only". Apple lets the placement be chosen. |
| Bid strategy | **Manage Bids** (not Maximize Conversions) | Apple says Maximize Conversions "You won't be able to turn Search Match off" and "you can't add or manage keyword bids". Both are needed. |
| Search Match | **Off** | Plan. Apple says "For Manage Bids search results campaigns, turn Search Match on or off." |
| Match type | **Exact**, on every keyword | Plan. Apple says new keywords "default to broad match" and "Once they've been added, match type can't be changed". Each keyword is therefore typed with brackets, `[like this]`. |
| Audience | **New users** (people who have not downloaded Volyume). Everything else at its default. | A tap from someone who already has the app is not an install the £60 should pay for. Apple says narrowing "will reduce the number of impressions"; the cost is some reach. |
| Product page | **Default product page.** No custom product page, no ad variation. | Task rule. Custom product pages add no new search words. |
| Campaign name | `volyume-uk-exact-30d-60gbp` | |
| Ad group name | `uk-exact-lifting-phrases` | |
| Daily budget | **£2.00** | Plan |
| Start | The start day, **00:00**, a set future time, never "start immediately". | A part first day would make the day count ambiguous. |
| End | **Start date plus 29 days, 23:59.** That is 30 calendar days, both ends counted. Example: start 2026-12-01, end 2026-12-30. Start plus 30 would be 31 days and allow £62, so do not use it. | Plan: "end by themselves on day 30". The helper script prints the date and refuses if the count is not 30. |
| Ad group dates | The same start and end as the campaign. | Apple says "your end date can't be after" the campaign's. |
| Total ceiling | **£60** (30 × £2) | Section 4 |
| Default max CPT bid (ad group) | **£1.50**, inherited by every keyword (no per-keyword bids) | Section 5 |
| Keywords | The 21 in section 3 | LOC-662 |
| Negative keywords | The 27 in section 3, campaign level | Section 3 |
| Status when entered | Running (it has a future start). | If a gate fails after entry, section 7 step 7 pauses it. |

Not in this campaign: the brand word "volyume" (people who type it already find Volyume at number 1, `docs/growth-store-2026-11/positions-2026-11-21.md`, and paying for them would inflate the install count), competitor names, any weight-loss word, any custom ad text. The advert says only what the App Store page says; the public claims on that page were checked claim by claim against the code by LOC-662 (`docs/growth-store-2026-11/02-store-wording.md`, 25 rows, each with its proof file). This task adds no claim of its own.

## 3. Keywords and negative keywords

**Keywords (21, exact match).** Every row of LOC-662's `phrases.tsv` except the brand control. Paste one per line; the brackets set exact match.

```
[hypertrophy]
[hypertrophy training]
[hypertrophy tracker]
[progressive overload]
[progressive overload workout]
[progressive overload tracker]
[bodybuilding]
[bodybuilding workout]
[bodybuilding planner]
[gym log]
[workout log]
[workout tracker]
[workout tracker free]
[workout planner]
[gym planner]
[weight lifting log]
[weight lifting tracker]
[strength training]
[macro tracker]
[calorie counter free uk]
[muscle building]
```

All 21 go in on purpose. A phrase nobody searches, or that Apple does not match to Volyume, costs nothing; leaving phrases out would only reduce what the report can teach. `bodybuilding planner` had no autocomplete hint on 21 November (`phrases.tsv`) and is a watch phrase.

**Negative keywords (27, campaign level, broad match).** Paste one per line. Apple says "The default setting for negative keywords is exact match"; choose broad in the match-type control (confirm on screen; if the control does not offer it, leave them exact, which loses nothing worth £60).

```
lose weight
weight loss
fat loss
fat burner
burn fat
diet plan
slimming
intermittent fasting
keto
weight watchers
cardio
step counter
steps
running
yoga
pilates
home workout
ai
ai coach
chatgpt
hevy
fitbod
jefit
myfitnesspal
fitnotes
strong app
volyume
```

Why these: weight-loss words (evidence-2 §1.5: "add negatives for irrelevant terms (e.g. weight-loss queries, which Volyume must not chase anyway)"); cardio and step words, because the corrected store wording removes the untrue cardio and step-tracking claims (LOC-662 `01-live-page-record.md`); "ai" words, because Volyume has no AI (`CLAUDE.md` section 2); competitor names (evidence-2 §1.8: allowed by Apple but invites trademark complaints); the brand word, so no money goes on people who already search for Volyume. **Plain limit:** with Search Match off and exact keywords only, the negatives are a second lock, not the main one. Apple's help says what exact match is; it does not say how far it stretches to close variants (not verified), which is what the negatives guard.

No keyword contains a negative phrase (the guard test checks this).

## 4. How the £60 is kept inside Apple's own settings

The ceiling does not rely on anyone looking. It rests on two Apple settings, one of which has to be right at entry.

| # | Setting | What Apple says (quoted) | Effect |
|---|---|---|---|
| 1 | Daily budget £2.00 | "you'll set a daily budget to indicate the average amount you want to spend on your campaign each day over the course of a month." and "On days with opportunities to get more downloads, your spend may exceed your daily budget." | A single day can go over £2; only the total is bounded. |
| 2 | End date = start + 29 days | "If you set an end date, you won't spend more than the total number of days in the campaign times your daily budget." | 30 days × £2 = **£60 is Apple's own limit on total spend.** The campaign stops by itself; nobody has to act on day 30. |
| 3 | No end date (what must not happen) | "your campaign spend will automatically extend to each new month based on your daily budget amount." | Entering without the end date means no ceiling. Section 7 step 6 is a check for exactly this. |
| 4 | Lifetime / campaign budget | Apple says: "All campaigns that used lifetime budget were paused in June 2026." | **Not available.** Settings 1 and 2 are the only ceiling. |
| 5 | Budget orders | Apple says: "Budget orders are available to invoiced Apple Ads Advanced customers only." | **Not available** on a card account. |
| 6 | Ad group dates | "your end date can't be after" the campaign's. | The ad group cannot outlive the campaign. |
| 7 | Max CPT £1.50 below the daily budget | Apple: you "set a maximum cost-per-tap (max CPT) bid for your ad group." | A single tap cannot cost more than the day's budget. |

Further protection that is not Apple's own: the weekly run reads **Spend** on every read in section 6 and the day-41 read confirms the total was £60 or less.

**Limits, said plainly.**
- Apple does not say whether the end-date day counts as one of "the total number of days in the campaign" (not found on the page). The 30 calendar days start at 00:00 on the start day and end at 23:59 on day 30, so whichever way Apple counts them, the campaign covers 30 days or fewer and the limit is £60 or less.
- Apple says a daily-budget edit "will typically take effect the same day" and an end date "can be changed before the end date is reached". Anyone with write access can therefore raise the ceiling. The company is given no write access by default (section 7), so only the founder can.
- Whether Apple adds UK VAT to the spend on the invoice is **not verified** (evidence-2: "ASSUMPTION; not verified per platform"). The £60 is advert spend. If Apple shows a tax line when the business details are entered, the card charge could be up to 20% more than £60. Stop and tell the lead; do not lower the budget to compensate.
- Apple has no published minimum daily budget that was found. If it refuses £2.00, stop and tell the lead; do not change the number.
- A declined card pauses the campaign (Apple says: "we'll pause your campaigns and attempt to charge the payment method again within 24 hours"). That is a stop, not a ceiling, and the end date does not move.

## 5. Bids

**5.1 Starting bid: £1.50 maximum cost per tap, for every keyword.** The published UK figures (evidence-2 §1.3, converted at USD 1 = £0.76, the evidence's own assumption):

| Source | Average cost per tap | In pounds |
|---|---|---|
| Adapty, UK, all categories | $1.31 | £1.00 |
| AppTweak, UK, all categories | $1.35 | £1.03 |
| AppTweak, US Health & Fitness | $1.68 | £1.28 |
| Adapty, Health & Fitness, geography not stated | $1.64 | £1.25 |
| MobileAction, GB, all categories | $2.60 | £1.98 |

£1.50 sits above four of the five, below the highest, and has to win auctions for an app with almost no ratings. It is a judgement, not evidence. It also fits the first stop rule: at the published tap-to-install rates of 50% to 65%, £1.50 a tap is about £2.30 to £3.00 an install; it would take a tap-to-install rate under 30% to pass £5.

**5.2 During the run the bid does not change, with one exception.** On the morning of day 8, if Spend to date is under £4.00 (under a third of what the budget allows), the report says so and the lead's message to the founder offers one raise of the ad group default max CPT to **£2.00** (not above the daily budget). Raising is the founder's tap; nothing else about the campaign changes.

**5.3 What £60 can buy, so the result is read honestly.** Evidence-2 §10: central cost per install £2.58 gives about 23 installs; its low case £1.54 gives about 39; its high case £5.16 gives about 12. Spread over 21 phrases that is roughly 0 to 5 installs a phrase. A phrase with one install is a hint, not proof.

## 6. What is read, when, and by whom

**Who:** the weekly operating run (one of the team's builders on the cheaper model, plan section 5) reads and records. **A deliberate step beyond the plan's "one run a week":** rule A needs a read that can see the moment Spend reaches £30, and Apple allows a day to go over £2, so the crossing cannot be predicted from the date. The credential makes that a short daily read of two numbers for the 30 days of the campaign only (30 reads, no standing job). If the lead wants weekly reads only, rule A can fire up to 7 days late; that is the lead's ruling, not assumed here. **Where:** Apple's report, campaign level and keyword level, date range from the start date to the read date. **Columns Apple's report defines (Apple says):** Impressions, Taps, Spend, Average CPT, Average CPA (Tap-Through), Installs (Tap-Through), New Downloads (Tap-Through), Redownloads (Tap-Through); Search Popularity and Match Source also exist for keywords and search terms. "Installs (Tap-Through): The total number of new downloads and redownloads from users who tapped on your ad within a 30-day window."

How the run reads it (needs section 7 step 3): through the Apple Ads Platform API with the read-only role. The older Campaign Management API v5 "sunsets 26 Jan 2027" (evidence-2 §1.6), so any tooling must target the Platform API, because the campaign runs across that date if it starts in December. Without the API credential, the founder exports the campaign and keyword report (Apple says the ad groups page has "Download Data" in the Actions menu) on the six **export dates** S+7, S+14, S+21, S+28, S+30 and S+40 (mornings), and the run reads the files. That fallback replaces the daily reads with these six, so what is lost is stated at gate G4: rule A can fire up to 7 days late. Reading the figures on screen has been checked against Apple's help pages only; the API endpoint names were **not verified** in this task (the Apple developer pages did not render for the evidence round).

| When | Date (S = start date) | What is read | What follows |
|---|---|---|---|
| **Every morning while running** (with the API credential) | S+1 to S+29 | Spend and Installs (Tap-Through), campaign totals from S | Record. **Stop rule A**: the first read at which Spend is £30.00 or more is the halfway read (section 7). On S+7 also section 5.2. |
| Every Monday while running | Mondays in S..S+29 | Spend, Taps, Installs, Average CPA; the weekly totals file | Record. Stop rule B check (section 7). |
| Provisional end read | S+30 | All columns, campaign and keyword level | First message to the lead |
| **Final read** | S+40 | All columns, campaign and keyword level; total Spend | The result message. Apple says "It may take up to 10 days for all charges to be processed" and installs count for 30 days after a tap, so the day-31 numbers can still rise. |

**What is read at the end (day-41 report).**
1. Total Spend. It must be £60.00 or less. If it is more, that is reported on its own at once.
2. **Installs per phrase:** for each of the 21 keywords, New Downloads (Tap-Through), Installs (Tap-Through), Taps and Impressions. Apple's report cannot say what an installer did afterwards, so nothing after install exists per phrase.
3. **Sign-ups as a weekly total, not per phrase:** from the weekly totals, `sign_ups_by_week.new_accounts`, `active_people_by_week.active_people` and `new_account_outcomes.the_one_measure` for the weeks of the campaign against the four weeks before it. These cannot be split by advert, by platform, or from the corrected iPhone page and any other change in the same weeks, so the message says "rose", "fell" or "did not move", never "the adverts brought".

**Which phrases go into the store pages.**
- A phrase **brought installs** if its keyword row shows at least one New Downloads (Tap-Through) in the final read.
- The phrases that brought installs are ranked by New Downloads, then Installs, then Taps. That ranked list goes into the next monthly wording round (LOC-662 `03-phrases-and-monthly-check.md`) and from there into **both** store pages, **Google Play first** (its changes go live after the independent check; the iPhone wording travels with the next build). The round puts them in rank order and replaces the weakest current phrases.
- Phrases with at least 5 Taps and no install are listed as "taps, no installs"; phrases with no Impressions as "not shown". Neither is added.
- If no phrase brought an install, the message says so with the figures, and the round changes nothing on the strength of the adverts.
- The message to the founder carries these figures, the stop rules that fired or did not, and may offer to repeat the same £60. Silence is not a yes (plan section 4).

## 7. Stop rules, and the one-time setup

### Stop rules (plan section 6, stated as figures that can be read)

**Rule A, halfway through the spend: an install costing more than £5 stops the adverts.**
- **Halfway is spend, not date.** It is the first read at which Spend (campaign total from the start date, Apple's report) is **£30.00 or more**, half of the £60 ceiling, as the plan says: "Halfway through the advert spend". Apple only limits the total ("your spend may exceed your daily budget" on a day), so the date on which £30 is reached is not known in advance and nothing in this document assumes one.
- **Read:** every morning with the API credential (section 6), Spend and Installs (Tap-Through), campaign totals from the start date. The check is made once, on the first read at or above £30.00, with the two figures at that read. With the hand-export fallback it is made on the first export date at or above £30.00.
- **Fires when:** Spend ÷ Installs (Tap-Through) is more than £5.00, or there are no installs (Spend is then at least £30, so an install would already cost more than £5).
- **If £30.00 is never reached** by the end of day 30: the rule does not apply and does not fire. The reason: below £30 the figure would rest on a few taps (two or three taps could stop the campaign on noise), the campaign has already spent less than half the ceiling, and it ends by itself on day 30. The day-31 message states the spend reached and that the rule never came into force. Section 5.2 (the one bid raise) exists to reduce this case.
- **Who reads:** the weekly operating run (daily during the campaign, above). **Then:** the run records the halfway read, fired or not fired, with the two figures. If fired, it sends the lead a one-line stop notice the same day. The cost per install is also recorded at every read, for the final message.

**Rule B: fewer than 1 in 5 new accounts logging three workouts in 14 days (once at least 10 accounts) pauses the adverts.**
- **Read:** the weekly totals file, `new_account_outcomes.the_one_measure` (LOC-661: "`three_workouts_in_14_days` of `judged_14_days` new accounts in the window logged three workouts in their first 14 days. Only accounts whose 14 days are over are judged."), every Monday from the first file after the start.
- **Fires when:** `judged_14_days` is at least 10 **and** `three_workouts_in_14_days` × 5 is less than `judged_14_days`.
- **Who reads:** the weekly operating run, every Monday. **Then:** the run sends the lead a one-line pause notice the same day.
- **What it cannot do:** the figure covers all new accounts, not only those from the adverts (nothing attributes an install to an advert, and no tracker is added), and only people who share usage data. It needs migration 204 applied; without it `new_account_outcomes.status` is `not_applied` and gate G2 fails. At £60 only about 12 to 39 installs arrive, so fewer than 10 accounts may have finished their 14 days before day 30: the rule may never be able to fire in this campaign, which is the plan's "once there are at least 10 accounts".

**Doing the stop.** By default the company has read-only access (step 3), so it **cannot** pause the campaign. The notice to the founder is: open Apple Ads, Campaigns, tick `volyume-uk-exact-30d-60gbp`, choose Pause (menu names: confirm on screen). Until the founder does it, spend continues at about £2 a day (Apple may go over on a single day) and the £60 ceiling still holds. If the founder prefers the company to pause on its own, the alternative in step 3 gives that, and is a founder choice recorded in the lead's setup message.

### One-time setup (founder). Nothing here has been done.

**Step 1. Open the Apple advertising account (about 20 minutes, browser).**
1. Go to `ads.apple.com` and sign in with the Apple Account that runs App Store Connect for Volyume. Apple says: "If you don't link to an App Store Connect account, you won't be able to promote an app with Apple Ads."
2. Choose **Advanced**, not Basic.
3. Account name `Volyume`. Country or region: United Kingdom. Currency: **GBP**. Time zone: **London**. Apple says currency and time zone cannot be changed after they are set, and that billing is based on UTC.
4. Legal entity name, agent status and primary contact, exactly as they appear in the App Store Connect agreements. Apple says: "If you're a sole proprietor, you'll select No." Enter the tax or VAT ID in Business Details only if one exists.
5. If a tax line appears for the business details, read section 4 (VAT) and tell the lead before going on.

**Step 2. Add the founder's card.** A Visa, Mastercard (including Apple Card) or American Express credit or debit card. Apple says pre-paid cards, gift cards, ATM cards and digital wallets are not valid. Apple says it charges "every $500 (U.S.) spent ... or every seven days, whichever comes first"; the pound equivalent was not found, so expect the first charge about a week after the start.

**Step 3. Read access for the company (default: read-only).**
1. In Apple Ads click your name, Account Settings, User Management, Invite User.
2. Invite an email address that Apple can use for an Apple Account and that **you control**. It must not be your own admin login: credentials made under your admin login could change the campaign, the budget and billing.
3. Role: **API Account Read Only** ("View reporting and data across the Apple Ads account with read only permission"). Accept the invitation by signing in with the same email.
4. Create the API credential for that user in Account Settings (menu names for the credential step: **not verified**, confirm on screen). Store it only as a platform secret through the lead's setup message. It is never pasted into a task, a comment or a document. No agent asks for it.
5. If you would rather not create the credential, say so, and do the exports in section 6 on the six export dates S+7, S+14, S+21, S+28, S+30 and S+40 instead (gate G4 says what that loses).
- **Alternative, your choice:** a role of **Limited Access: API Read & Write** on this campaign group instead lets the company pause the campaign on a stop rule by itself; it also lets the company change that campaign. Read-only is the default because the task is to define reading access.

**Step 4. Do nothing else yet.** The campaign is not entered until the gates in section 1 are green.

**Step 5. On the start-eve (all four gates green), enter the campaign (about 15 minutes).** The lead sends the entry sheet printed by `node scripts/growth/appleAdsEntrySheet.cjs <start date>`, or the values in section 2 with the end date worked out. Create campaign: Volyume, United Kingdom, **Search results**, **Manage Bids**; Search Match **off**; Default max CPT **£1.50**; keywords pasted from section 3 with their brackets; negatives pasted at campaign level; **Daily budget £2.00**; start and **end date and time set**.

**Step 6. Check before leaving the screen (this is the ceiling).** The summary must show: end date = start + 29 days (30 days), daily budget £2.00, Search Match off, 21 keywords all exact, status Running or scheduled. If the end date is blank, set it before anything else. Take a screenshot for the lead (no card details in it).

**Step 7. Later: when told to stop.** Pause the one campaign as in "Doing the stop". If a gate turns out to have been wrong after entry (for example the live page was not the corrected one), pause it, and tell the lead.

**Founder time:** about 20 + 5 + 10 + 15 minutes once, then one tap if a stop rule fires and one decision on the repeat offer at the end. The founder's card is charged by Apple only, up to the ceiling in section 4.

## 8. Public wording

No wording is written for this campaign. The advert is generated from the live App Store page (default product page), so every public claim is the page's. LOC-662 verified them claim by claim at the base commit (`942a44e0d3b282c3f25a9073a95e56c95f956e08`), for example "free" at `src/lib/proGate.js:43` (`FULL_ACCESS_FOR_ALL = true`), fixed rules and no AI at `src/screens/WelcomeScreen.js:148`. The campaign adds no price promise, streak, fake member, coach partnership, gym challenge or health claim. Apple Ads policy 1.5 requires claims to be "adequately substantiated" (evidence-2 §8); the advert makes no claim beyond the page.

## 9. Sources opened on 21 November 2026

All `https://ads.apple.com/app-store/` unless stated.
- `help/bids-and-budget/0016-manage-budgets` (daily budget, end date ceiling, lifetime budget paused, editing)
- `help/campaigns/0005-create-campaigns`, `help/ad-groups/0017-understand-and-create-ad-groups` (country, dates, Manage Bids, Search Match, placement, default product page)
- `help/keywords/0059-understand-keyword-match-types`, `help/keywords/0060-use-negative-keywords`, `help/keywords/0014-add-and-manage-keywords`
- `help/ad-groups/0021-modify-audience-settings` (customer types)
- `help/campaigns/0095-maximize-conversions` (what Maximize Conversions removes)
- `help/reporting/0023-reporting-options-and-definitions` (columns, 30-day window)
- `help/billing/0040-understand-the-billing-cycle`, `help/billing/0033-solve-billing-issues`, `help/get-started/0030-set-your-payment-method`, `help/get-started/0004-set-up-an-account`, `help/billing/0031-monthly-invoicing` (budget orders, cards, currency, time zone)
- `help/get-started/0011-invite-users-to-your-account` (roles)
- `basic` and `advanced` (Basic and Advanced)
- On LOC-583: `evidence-2-paid-installs` §1 and §10, `evidence-12-fact-check`, `product-dossier` §5e; the plan, revision 7.
- On LOC-661 (candidate `843570719fa22ec9334033f71235ac7523568383`): `docs/growth-totals/FIGURES.md` for `the_one_measure`.

**Not found or not verified:** whether the end-date day counts; any minimum daily budget; the pound equivalent of Apple's charge threshold; UK VAT on the invoice; the menu path for creating an API credential; the Platform API report endpoints; whether Apple's exact match stretches to close variants; a downloadable search-term CSV. Each is named where it matters above.

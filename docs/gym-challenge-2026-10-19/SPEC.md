# Gym challenge: specification (2026-10-19)

Source of truth for the gym challenge build. Founder brief and answers are in
section 0 verbatim or near-verbatim; every lead ruling (D33) is marked.

## 0. Founder decisions (chat, 2026-10-19)

- Purpose: "get as many people in my gym first, using the app, enjoying it,
  progressing", a prize at the end of a month, more users.
- Winner: **two tiers of draw** (main prize draw at 70 and above, second prize
  draw at 50 and above).
- Food and weight: **included** ("Food and weigh-ins"), with the safeguards
  in section 3.3 approved by the founder's "Go as written".
- Board: "Full names board, but only the top x number ... Maybe top 10?" Lead
  ruling: top 10 named; nobody below the top 10 is listed (a greyed name still
  shows a low score); every entrant sees their own score and draw.
- Wellbeing: "Flag won't be set on entry because they are all new users.
  Users can withdraw themselves from the challenge." Lead ruling: the existing
  migrate_180 gate still applies if a flag or calm mode arises mid-challenge
  (section 3.3).
- Gym: **Volt Gym** first; built to be reusable for any gym and any dates
  ("putting it in place for when ready. I'll also possibly look at other gyms").
- Coaching: "Recommended only, but if they don't give them the ability to
  get above 70 to get into the draw ... Make it clear the coaching allows more
  points."
- Joining: a poster QR code that downloads the app and joins the person to
  the challenge, as simple as possible; after the challenge they carry on as
  normal; the challenge is not visible to people at other gyms.
- Plan: "Go as written".
- Free for life (founder, later the same day): "I'm going to say it's going
  to be free for challenge users indefinitely. So if I ever add any prices to
  it, these users ... are never going to be charged." Lead note given: make
  it a real, recorded entitlement and word it so it does not imply others pay
  today (they do not). Wording: "Volyume is free. Join through the challenge
  and it stays free for you for life, even if we ever introduce paid plans."
  Recorded server side in `free_for_life_grants` on join (migrate_201), kept
  through withdrawal and challenge deletion.

### 0.1 Adversarial review round 1 (2026-10-19): lead rulings (D33)

- B1 Minors: a KNOWN minor (Community profile is_minor, or an onboarding
  date of birth under 18) is refused at join, never listed and never drawn.
  An unknown date of birth (a quick start) rests on the person's own 18+
  answer; the terms require winners to show proof of age before a prize is
  given. (The app's `_community_minor` treats unknown as minor; using it
  here would silently exclude every quick-start entrant.)
- B2 Wellbeing gate by day: the migrate_180 gate is never read once for the
  month. A day counts as withheld when an ED flag covered it
  (ed_pattern_flags history), an hourly reading saw the gate on
  (gym_challenge_gate_days, pg_cron), or it is today and the gate is on
  now. Food logging and weigh-in credit withheld days. The screen always
  follows the gate now, on the server and on the device (either one hides).
- M1 Late joiners: everyone is scored over the whole window, whatever the
  join date (a late joiner has less time, never easier targets). Activity
  before joining inside the window counts.
- M2 A withdrawn entrant's records are not read again; the export lists
  them with no score. Emails are exported only for drawn winners.
- M4 A post the ED withhold hid still counts as taking part.
- M5 The board names the latest draw's winners per tier only, never a
  withdrawn winner.
- M8 The weekly target follows the plan freely for the first 7 days of the
  person's challenge, then may only rise.
- M9 Codes are made by `gym_challenge_create`: a slug plus an 8-character
  random part, so nobody can guess another gym's code.
- M10 Terms are required on every challenge and live outside /c/ (the app
  link captures /c/).
- M13 SPEC 2 step 8 (a "Have a challenge code?" entry in the Community tab)
  is NOT built: the founder's rule that the challenge is not visible to
  people at other gyms wins. The routes in are the poster link (on iPhone,
  scanning again opens the app), the gym invite, and the join screen's own
  code box when a link is not found.
- Closing is refused until 3 days after the end (late syncs) unless forced.
- Board position band (SPEC 4) is replaced by: the top 10, your own score
  and draw, and the counts at each threshold. A Home card (not in the first
  draft) shows an entrant's score and days left.

## 1. What a challenge is

A challenge belongs to one gym (`gym_venues.id`), has a short public code
(e.g. `volt-nov`), a window of at most 31 days (`starts_on` to `ends_on`,
UK dates, inclusive), two prize lines, two thresholds (70 and 50), a terms
URL, and a status: `upcoming`, `active`, `ended` (window over, scores still
settling), `closed` (final scores frozen, draws may run). Challenges are
created by the founder only (service role; see section 6).

Entrants: adults (18+) who joined on purpose through the join screen. An
entrant can withdraw at any time and rejoin while the challenge is open.

## 2. Joining (client)

1. Poster QR → `https://volyume.app/c/<code>`.
2. App installed: the verified app link opens the app on the join screen
   (`ChallengeJoin`, route param `code`).
3. App not installed: `public/c/index.html` (built like `public/g/index.html`)
   shows the challenge (via the anon RPC `gym_challenge_public`), the scoring
   table, the full terms link, and store buttons. The Google Play link carries
   `&referrer=challenge%3D<code>`.
4. First launch on Android: read `Application.getInstallReferrerAsync()`
   (expo-application, already a dependency) once; a `challenge=<code>` value is
   stored as the pending challenge code. iPhone has no equivalent: the landing
   page says "Already have the app? Scan the code again", and the gym invite
   (step 7) and a typed code are the fallbacks.
5. A pending code (from a link before sign-in, or the referrer) survives
   sign-in and the Article 9 consent gate, which is NEVER skipped or reordered.
   After consent, before StartChoice, the join screen opens.
6. Join screen: challenge name, gym, dates, prizes, the scoring table with the
   coaching extras marked "with coaching", the terms link, "I am 18 or over"
   (required), how you appear on the board (your first name and initial,
   typed, prefilled from the account name where known, or your Community
   handle), the consent text (section 5), Join and Not now. Join calls
   `gym_challenge_join`; then sets the person's Community gym to the
   challenge's gym if they have a Community profile and no gym yet (existing
   `setGyms`), and continues to StartChoice, where the coaching card shows
   "For the challenge: coaching adds up to 20 more points."
7. Gym invite: a person whose Community gym is the challenge's gym and who is
   not an entrant sees a "Challenge at your gym" card (Community tab), from
   `gym_challenge_for_my_gym`. Nobody else ever sees a challenge.
8. (Not built, see 0.1 M13.) A code typed into the join screen's own box
   when a link is not found.

## 3. Scoring (server, `_gym_challenge_score`)

Window for everyone: `starts_on` to `ends_on` (0.1 M1). Days `D = ends_on - effective_start + 1`. Blocks: 7-day blocks from
`starts_on`; block `i` has `f_i = days_in_block / 7`. Weekly target
`T` = the entrant's `planned_per_week` (2 to 6; default 3; set at join from
the plan, may only rise during the challenge).

### 3.1 Core, everyone (80)

| Part | Points | Rule |
|---|---|---|
| Train to your plan | 40 | qualifying training days ÷ `max(1, round(T × D / 7))`, capped at 1 |
| Hit your week | 15 | per block, hit when its qualifying days ≥ `max(1, round(T × f_i))`; points = 15 × Σ(f_i × hit_i) ÷ Σ f_i |
| Get stronger | 15 | 3 per exercise beaten, up to 5 (section 3.2) |
| Be part of it | 10 | per block, at least one visible Community post; 10 × Σ(f_i × posted_i) ÷ Σ f_i |

A **qualifying training day** is a UK-local date in the window with at least
one workout that is completed, not deleted, lasts at least 20 minutes
(`duration_minutes`, else `ended_at - started_at`), has at least 6 working
sets (`workout_sets` not deleted, `set_type <> 'warmup'`, `actual_reps > 0`),
and reached the server within 7 days of its start (`created_at <= started_at
+ 7 days`, no backfilling a month at the end). One per day at most.

### 3.2 Get stronger

For each exercise done on at least two qualifying days in the window: the
best effort on its first day versus the best on any later day. Effort is the
Epley estimate `weight × (1 + reps / 30)` for sets with weight > 0 and 1 to
12 reps; for sets without weight, the most reps. Beaten when a later best is
strictly greater. Within the challenge only, because new members have no
history before it.

### 3.3 Coaching extras (20)

| Part | Points | Rule |
|---|---|---|
| Weekly check-in | 10 | distinct check-ins (not deleted, created in the window), capped at `W = max(1, round(D / 7))`; 10 × n ÷ W |
| Food logging | 6 | per block, distinct days with a logged food entry (not deleted), capped at `round(3 × f_i)` (at least 1); 6 × Σ ÷ Σ caps |
| Weekly weigh-in | 4 | blocks with any weigh-in (`body_metrics` or `morning_weights`, not deleted); 4 × hits ÷ blocks |

Safeguards (founder "Go as written"):
- Points are for logging at all. No amount, calorie, deficit, weight or
  weight change is read beyond "a row exists", and none appears anywhere in
  the challenge.
- Logging more often earns nothing: 3 food days and 1 weigh-in per week.
- When `_community_consistency_withheld(user)` is true (open ED flag or calm
  mode, fail closed), food logging and weigh-in score in full, so nothing
  pushes logging; the person is not listed on the board, a withheld viewer
  gets no board, the app sends no challenge prompts; they stay in the draws.
- Entrants can withdraw at any time.

Total = round(sum) out of 100. Without coaching the most is 80, so the main
draw (70) is reachable.

## 4. Board and results

`gym_challenge_board(id)`: entrants only. Top 10 by score (ties by joined_at),
each with the name they chose and their score; withdrawn, withheld and minor
entrants never listed. The caller's own row (score, position band, draw
tier). Counts: entrants, in the main draw (≥ main threshold), in the second
draw (≥ second threshold). Days left. NULL board for a withheld caller (own
score still returned by `gym_challenge_score`).

After `closed`: frozen scores, the winners' display names and tiers once the
draws have run.

## 5. Consent and terms

Join text (Article 9 explicit consent for this purpose, versioned
`challenge_consent_v1`): "To score you, Volyume reads your training, check-ins,
whether you logged food and whether you weighed in during the challenge. It
never reads what you ate or what you weigh. If you are in the top 10, your
name and score are shown to other entrants. If you win, your name and county
are published, and you can object. You can leave the challenge at any time." Then, as its own line: "Joining also keeps Volyume free for you for life, even if we ever introduce paid plans."
Terms page per challenge: promoter name and address, eligibility (18+, the
gym's members), how to enter (free, no purchase), dates, prizes, how scores
work, how winners are drawn (recorded computer draw), how and when winners
are told and announced, withdrawal, and the free-for-life promise (kept after
withdrawal; never implies that anyone else pays today).

## 6. Founder operations (service role only)

- Create: insert into `gym_challenges` (documented SQL in
  `supabase/README` challenge section).
- `gym_challenge_close(id)`: freezes final scores (run 3 or more days after
  `ends_on` so late syncs land).
- `gym_challenge_results(id)`: every entrant with each part and the total.
- `gym_challenge_draw(id, tier, winners)`: a recorded random draw among the
  eligible (main: score ≥ main threshold; second: score ≥ second threshold,
  excluding main winners, lead ruling), storing the eligible list, its hash,
  the random values and the winners in `gym_challenge_draws`.

## 7. Telemetry (after the growth telemetry lands)

challenge_join_viewed {source}, challenge_joined {source, coaching},
challenge_viewed, challenge_withdrawn. Source: link, referrer, gym_invite, code.

## 8. Server test notes (migrate_201)

`sql-test/stub.sql` (stand-ins for auth, the synced tables and the two
Community helpers) and `sql-test/test.sql` (a scripted month) run against a
local Postgres 16: the migration applied twice, then the scenario. Expected
and observed on 2026-10-19: the full entrant scores 76 (train 40, week 15,
stronger 6, community 5, check-in 5, food 2.5, weigh-in 2); a 15-minute
session and a workout synced 17 days late do not count; a warm-up set never
counts as a lift; a withheld entrant scores food 6 and weigh-in 4, is not
listed and gets a NULL board; a minor and a non-adult answer are refused;
the gym invite reaches a same-gym non-entrant; a lower weekly target is
ignored; close freezes scores; the main draw records its eligible list; the
second draw excludes the main winner; `authenticated` cannot run the
results export.

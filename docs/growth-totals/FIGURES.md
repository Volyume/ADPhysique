# The weekly growth totals: what each figure means

Every Monday at 06:00 UTC the workflow `.github/workflows/growth-weekly-totals.yml`
writes one file, `weekly/<date>.json` (and the same file as `latest.json`), to the
`weekly-totals` branch of the private repository `Volyume/volyume-growth-totals`.
Two examples built from synthetic data sit beside this page:
`sample-totals.json` (every source working) and `sample-totals-day-one.json`
(migration 204 not applied, no crash token).

## How to read it

- **Who is counted.** People who share usage data (Settings > Privacy & legal >
  Share usage data), as the app records it in its own database. Anyone who
  switched it off is not in any figure.
- **Weeks** run Monday to Sunday (UTC). `complete: false` means the week was
  still running when the file was made.
- **Small groups.** In any breakdown (a list split by screen, reason, step,
  version and so on), a row covering fewer than 5 people is not shown. Its
  numbers are added into that list's `other`, with `rows_folded` saying how many
  rows went in. A person in two folded rows is counted twice in `other`. Labels
  the app cannot send (typed text, an unknown version) are also counted in
  `other` and never printed. Week-by-week totals are not breakdowns and are
  shown in full.
- **`null`** means "not known yet" or "cannot be worked out exactly", never zero.
- **`rows_not_counted`** is how many source rows were unreadable and left out
  (normally 0).

## The figures

| Section | Figure | Meaning |
|---|---|---|
| `active_people_by_week` | `active_people` | People with at least one recorded app event that week. |
| `sign_ups_by_week` (by sign-up week) | `new_accounts` | New accounts that week. |
| | `first_workout_within_7_days` | Of those, how many finished a workout within 7 days of signing up. Until `first_7_days_over_for_everyone` is true, some still have days left. |
| | `still_using_app_after.day_7/14/30` | How many were still using the app (any visit) on or after day 7, 14 or 30. `null` until every account in that week has reached that day. |
| `people_by_status_today` | `new`, `active`, `slipping`, `lapsed` | Everyone counted, by where they are today. New: signed up in the last 7 days. Otherwise, by the last day they used the app: active, today or up to 6 days ago; slipping, 7 to 13 days ago; lapsed, 14 days or more. |
| `sign_up_steps_by_week` | `people` (reached), `people_completed` | For each setup step (by mode and path): how many reached it and how many finished it. The gap is where people stop. |
| `last_screen_before_leaving` | `people` | For people who have lapsed (14 days or more without using the app), the last screen they opened. Counted over the six months of kept data, not one week. |
| `leaving_reasons_by_week` | `people`, `answers` | The one-tap reason chosen at a moment of leaving (`moment`: discarding a workout, leaving setup, turning reminders off). |
| `help_topics_by_week` | `people`, `opens` | Explanations opened, by topic and screen (`screen` is null when none was recorded). |
| `by_app_version` | `people`, `visits`, `workouts_per_person`, `workout_discard_pct`, `errors_per_visit`, `first_seen` | Per app version over the six months of kept data. Someone who updated appears under each version they used. |
| `new_account_outcomes` | `the_one_measure` | **The plan's one measure.** `three_workouts_in_14_days` of `judged_14_days` new accounts in the window logged three workouts in their first 14 days. Only accounts whose 14 days are over are judged. |
| | `weeks[]` | The same per sign-up week, with `first_workout_in_14_days` and `still_training_after.day_7/14/30` (`judged`: accounts old enough to count; `still_training`: of those, how many finished a workout on or after that day). |
| | `by_app_version_at_sign_up` | The same totals by the app version each account signed up on. |
| | `status` | `ok`; `not_applied` until the founder applies migration 204; `failed` if the read failed. |
| `crashes` | `total.crashes`, `total.people` | Crashes (unhandled errors in Sentry) in the last 7 days, and how many different signed-in people they hit. |
| | `by_app_version` | The same by app version (all builds of a version added together, so a person on two builds counts twice). |
| | `status` | `ok`; `not_configured` when no crash token is set; `failed` (with `http_status`) if Sentry refused. |

## What is never in it

Names, emails, account identifiers, body weight, measurements, photos, food,
check-in answers, anything typed by a user, and anything about safety flags.
The digest's `safety_activity_groups`, the event catalogue, release notes and
every section or field not named above are not read. The filter is
`scripts/growth/totalsFilter.js`; its tests are in `scripts/growth/__tests__/`.

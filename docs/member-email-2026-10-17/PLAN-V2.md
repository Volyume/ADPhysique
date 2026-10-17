# Member email v2: the full system, by module (2026-10-17)

Founder order: "Research what would be in an elite solution ... make it all
encompassing ... And structure it accordingly" and "Don't pause keep working".
Source of the module map: RESEARCH-ELITE-SYSTEM.md (M1 to M14, admin IA,
gap table). Phase 1 (SPEC.md sections 1 to 7, migrate_198, the two
functions, the members page, the app switch) is the base. This file
supersedes SPEC.md section 8 (phase 2) and wins wherever they differ.

## Founder decisions in force (all 2026-10-17)

| Topic | Decision |
|---|---|
| Basis | Opt-out: emailed by default, told at sign-up, off in Settings or from any email; existing members included |
| Hold | Only an open ED flag (`_community_ed_flag_open`, fail closed). Calm mode never holds. App version never gates |
| Storage | Keep Resend; privacy copy says records are kept in the US under standard contract clauses |
| Tracking | Opens and clicks per member |
| Under-18s | Same as adults |
| "Offers" | Dropped everywhere: the emails are news, surveys and summaries |
| Claims gate | Automatic, system side only: the server lints every email against CLAIMS-STANDARDS; plus a send checklist ticked by the founder. No agent or Claude review |
| Survey questions | No limit (founder judges) |
| Activity in email | A weekly training summary email (counts, sessions, streak; never weights, food or body), its own switch |
| Quota | Resend free plan; member email capped at 60 a day so account emails always get through; larger sends spread across days automatically |
| Topics | One switch in the app (all news email) plus topic choices on an email preferences page linked from every email: product news, surveys, weekly summary, Community and events; all on by default. The weekly summary also has its own switch in the app |
| Member view | Last used day, app version, workout counts (7 and 30 days, last workout date); never exercise, weight, food or body detail |
| Exclusions | Founder exclude list in the private page |
| Admin | Private page on volyume.app; sign-in by one-time emailed link |
| Scheduling | Included (pg_cron installed; pg_net enabled in migrate_199) |

## Modules and what each delivers

M1 Audience and contact model. One roster (exists). Each member: email,
joined, last used, version, platform, workout counts, topics, status
(receives, excluded, turned off, paused, unconfirmed), send and event
history. People screen with search, filters and a member page.

M2 Preferences and suppression. Prefs gain topics (product_news, surveys,
weekly_summary, community_events), default on. Public preferences page
(`/email/preferences/?t=`): topics, turn all off, turn back on. Suppression:
opt-out, turned off, founder exclusions, hard bounce, complaint (auto), the
ED hold. Unsubscribe reason (optional).

M3 Segmentation. Saved segments of AND-ed rules on account and usage data:
joined before or after; last used within or over N days; app version below
or at least; platform; workouts in last 30 days at least or at most; last
workout over N days ago; Community member or not; opened or clicked or not a
given email; received or not a given email; topic on. Live count. A campaign
targets everyone or one segment, always minus suppression and the topic.

M4 Content. Block editor (heading, paragraph, image, button, divider,
spacer, survey block); brand kit (logo, colours, fonts fixed to the house
style, light and dark safe); personalisation `{{first_name|there}}`,
`{{app_version}}`, update prompt block shown only to members below the
latest version ("A new version of Volyume is ready"); saved templates;
duplicate; preview phone, desktop, dark; plain-text part generated;
accessibility (alt text required on images, heading order, contrast,
minimum font size); image upload to Storage bucket `member-email-assets`.

M5 Campaigns. Draft, schedule (UK time), send now; topic per campaign;
throttled by the 60-a-day cap with automatic spreading; A/B subject (two
subjects, test share, wait, winner by unique opens then clicks); optional
holdout (a percentage kept back, for measuring app return); cancel a
scheduled send; pause a sending campaign (kill switch); resend to
non-openers (once, after N days, new subject).

M6 Automations. On or off each, all through the same suppression and cap:
welcome series (day 0, day 3, day 7, after email confirmation); win-back
(no app use for 14 or 30 days, once per 90 days); update nudge (version
below latest for 14 days, once per version); weekly summary (Monday
morning, UK time, members with the weekly_summary topic and at least one
workout last week; counts, sessions, streak; ED-safe voice: no shame, no
"you missed", nothing about weight, food or body; never to an open ED
flag); milestone (account anniversary). A per-member frequency cap (default
at most 3 marketing emails a week, summary included) and quiet hours
(21:00 to 08:00 UK).

M7 Surveys. Builder (exists), plus: NPS question type (0 to 10) and rating
scale, one-click answer links in the email for the first question, close
date, anonymous option, results with charts, NPS score, CSV.

M8 Transactional versus marketing. Auth email stays Supabase SMTP via
Resend; member email sends from `news@volyume.app` with its own tag; the 60
cap protects account email.

M9 Deliverability. SPF, DKIM, DMARC alignment checked and shown on the
Settings screen (read through Resend's domain API); RFC 8058 one-click
(exists); bounce and complaint auto-suppression; complaint-rate and
bounce-rate alarms (stop sending above 0.3 percent complaints or 5 percent
bounces on a campaign); sunset policy (no open or click in 180 days: one
re-permission email, then stop sending marketing until they open the app or
turn it back on); seed list for test sends.

M10 Analytics. Per email: sent, delivered, unique opens (Apple Mail
Privacy Protection flagged as inflated), unique clicks, clicks per link,
bounces, complaints, unsubscribes, survey answers, app returns within 7
days (from the last-used check-in, never health data). Per automation the
same over time. Home shows the last 30 days and trends.

M11 Compliance and governance. Pref events (exists); an admin audit log of
every admin action (who, what, when); data retention (send and event rows
kept 24 months, then deleted by the runner); erasure cascades with the
account (exists); a records export for the founder; the privacy pages kept
true by guards.

M12 Safety. ED hold (exists); automatic claims lint on the server (banned
claims and words from CLAIMS-STANDARDS, body and weight framing, outcome
promises, em dash, price or trial mentions) blocks Save to send; the send
checklist (audience number, topic, test sent, links checked); frequency
cap; quiet hours; undo window (a 10-minute delay after Send, with Cancel).

M13 Operations for a solo founder on a phone. Home dashboard; alerts by
email to the founder (a send finished, a send stopped by an alarm, quota
reached); test sends; kill switch; everything usable at large text sizes.

M14 Referral and review asks. An automation template asking for a store
review after a member's 10th workout (never under an ED flag), and a
"share Volyume" block linking the store pages.

## Admin page structure (information architecture)

Home (dashboard, alerts, quota) / Emails (list, editor, schedule, A/B,
stats) / Automations (list, each with its email and stats) / Surveys /
People (search, filters, segments, member page, exclusions) / More:
Insights, Records (audit log, exports), Settings (sender, domain checks,
caps, quiet hours, seed list, kill switch).

## Build waves

- Wave A, server (Opus): `supabase/migrate_199_member_email_v2.sql` and the
  functions: extended admin actions, `member-email-runner` (pg_cron every 5
  minutes through pg_net: schedules, spreading, automations, A/B winners,
  retention, alarms), `member-email-webhook` (Resend, Svix signature),
  public preferences actions, the server claims lint, the weekly summary
  builder.
- Wave B, website (Sonnet): the admin page rebuilt to the structure above,
  the block editor, segments, automations, stats, the preferences page.
- Wave C, app (Sonnet): drop "offers" from copy; the weekly summary switch;
  the check-in (in progress).
- Wave D: hostile review (Opus) of A to C, then founder actions: "run
  against production 198 199", RESEND_API_KEY and RESEND_WEBHOOK_SECRET,
  the webhook URL in Resend, a go to deploy the functions.

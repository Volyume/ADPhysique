# Member email: what an elite system contains (research, 2026-10-17)

Authority: founder order 2026-10-17, verbatim: "Research what would be in an
elite solution for an app for this and make it all encompassing rather than
just a lazy thrown together couple of features. And structure it accordingly."

Status: RESEARCH ONLY. Nothing here is a ruling. Every conflict with a
CLAUDE.md inviolable or a founder decision is stated, never resolved. Where a
fork needs the founder, it is in Part D as a multiple-choice question.

Read first, in full: `CLAUDE.md` sections 2 and 3;
`docs/member-email-2026-10-17/SPEC.md` (phase 1 sections 1 to 7, phase 2
section 8, the founder decision block at lines 17 to 31);
`marketing/hq/CLAIMS-STANDARDS.md`; `docs/EMAIL_AUTH_DELIVERABILITY.md`.

## How to read this file

- **OBSERVED** means read in this repository or on a cited page today.
- **INFERENCE** means a conclusion drawn from what was observed. It is
  labelled every time.
- **SECONDARY** marks a source that is a vendor blog or law-firm commentary
  rather than the regulator, the mailbox provider or the product's own
  documentation.
- Sources not retrieved are said to be not retrieved. In particular, no
  primary material on Whoop, Fitbod or Noom member email was found in this
  pass, so nothing below claims what those apps do.

## Contents

- Part A. The frame: facts about Volyume that shape every module
- Part B. The capability map, fourteen modules
  - M1 Audience and contact model
  - M2 Consent, preferences and suppression
  - M3 Segmentation
  - M4 Content: editor, brand kit, templates, personalisation, rendering
  - M5 Campaigns: broadcasts, scheduling, throttling, experiments
  - M6 Automation and lifecycle journeys
  - M7 Surveys and feedback
  - M8 Transactional and marketing separation
  - M9 Deliverability operations
  - M10 Analytics and attribution
  - M11 Compliance and governance
  - M12 Safety
  - M13 Operations for a solo founder on a phone
  - M14 Referral and review asks
- Part C. Recommended admin page structure (information architecture)
- Part D. Gap table: SPEC phase 1 and 2 against this map
- Part E. Founder decisions needed
- Part F. Source list

---

# Part A. The frame

These facts were checked today. Each one changes what "elite" means for
Volyume specifically, because a feature copied from Klaviyo or Braze without
them would break a Volyume rule.

**A1. Resend stores customer data in the United States.** OBSERVED, Resend's
own GDPR page: customer data "including message content, delivery logs,
webhook payloads, and account records, is stored in the United States", there
is "no setting today that moves stored data to the EU", and choosing
`eu-west-1` "controls where email is routed and sent from", not where data is
stored (https://resend.com/security/gdpr). Every one of the 22 listed
sub-processors, including Svix (webhooks), is listed in the USA
(https://resend.com/legal/subprocessors). Transfers rely on the EU Standard
Contractual Clauses with the UK Addendum, incorporated into a pre-signed
Article 28 DPA. Email and log data is kept 30 days on Free, Pro and Scale.
Set against: CLAUDE.md section 1 "EU data residency is absolute: all user
data stays in Dublin"; `public/privacy.html` line 123 "Cloud-backed account
data ... does not leave the UK or EU"; and lines 162 and 173, which describe
Resend only as "sending from its Ireland region". OBSERVED also:
`docs/EMAIL_AUTH_DELIVERABILITY.md` section 1 shows the auth emails
(sign-up confirmation, password reset) already go through Resend, so this is
an existing exposure that member email enlarges, not a new one. This is
Decision D-1.

**A2. The cloud's ED arm of the wellbeing hold is dormant today.** OBSERVED,
`supabase/migrate_180_community_consistency_server_gate.sql` header: the
withhold reads `ed_pattern_flags` in the cloud, and "NOTHING WRITES THE CLOUD
TABLE TODAY" was the state until migrate_182 added a write path. OBSERVED,
CLAUDE.md status block: 182 is live, and the ED arm arms "the moment a device
on a build carrying the push raises a flag; no such build has shipped yet".
INFERENCE: until members run a build that carries the push, the email
audience's `_community_consistency_withheld(uid)` check withholds members in
calm mode (the calm arm reads the synced `user_prefs` mirror, migrate_180
"FACT (b)") but withholds nobody for an open ED flag. A member who never
updates the app stays invisible to the ED arm indefinitely. CLAUDE.md
section 2: "If a task touches any of this: STOP and ask first." This is
Decision D-3.

**A3. Volyume serves members aged 13 and over.** OBSERVED, `public/privacy.html`
section 11: "Volyume is for users 13 and over". OBSERVED: the cloud carries
`users_profile.date_of_birth` (migrate_012) and `community_profiles.is_minor`
(migrate_160, Community members only). The ICO Children's code treats under
18s as children (SECONDARY, Hunton summary of the final code,
https://www.hunton.com/privacy-and-cybersecurity-law-blog/2020/01/22/ico-publishes-final-version-of-its-age-appropriate-design-code/)
and its profiling standard says non-essential commercial profiling should be
off by default for children
(https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/12-profiling/).
CLAIMS-STANDARDS section 7: "Weight-loss-adjacent advertising must never
target or feature under-18s." The SPEC audience (every confirmed email minus
opt-outs, turned-off, withheld, excluded) contains no age rule. This is
Decision D-4.

**A4. The product is fully free and has no offers in the commercial sense.**
OBSERVED, CLAUDE.md section 2: "No trial, no Free/Pro split, no paywall, no
pricing, no expiry anywhere in the user experience. Never reintroduce a tier
gate, upsell, trial or price without an explicit founder decision."
OBSERVED: the shipped switch label is "News and offers by email" and the
sign-up notice says Volyume "will email you about new features, offers and
the occasional survey" (commit 94afac3db). OBSERVED: CLAIMS-STANDARDS
sections 3 and 4 still carry approved trial wording and Pro prices, which
INFERENCE are stale against D137 and must not feed an email lint. This is
Decision D-5.

**A5. The PECR position of the opt-out model.** OBSERVED, ICO: the products
and services soft opt-in applies to contact details gathered "while selling
or negotiating to sell a product or service"; "A person doesn't need to
actually buy anything", and signing up to a free trial counts, but the person
"must actively express an interest in buying your products or services"; an
opt-out must be offered "when you collect their contact details" and "in
every subsequent message"; and "an opt-out hidden in a privacy policy doesn't
count"
(https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/).
The ICO's email guidance index (updated 28 April 2026) says it is under review
after the Data (Use and Access) Act 2025, whose new soft opt-in is for
charitable purposes only
(https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/).
INFERENCE: with nothing for sale (A4), there is no purchase interest for a
soft opt-in to rest on; and existing members were given no opt-out when their
address was collected (SPEC line 30 to 31: the sign-up screens "carried no
mention of news emails"). The founder decided the opt-out model knowing the
lead's earlier ruling 1 (SPEC lines 35 to 38). This file does not reopen that
decision; it records that every module below must make the opt-out real,
prominent and instant, because that is the only control the model offers.
SECONDARY: commentary reports PECR fines now align with UK GDPR levels after
the Act (https://www.sheppard.com/insights/blogs/the-uks-data-use-and-access-act-2025-key-points-to-note-for-businesses).

**A6. Open tracking is a storage-and-access question under PECR regulation 6.**
OBSERVED, ICO: "regulation 6 applies to this processing" where an email pixel
stores or accesses information on the device
(https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/).
The new statistical exception requires the sole purpose to be statistics to
improve the service, "clear and comprehensive information", "a 'simple and
free' means to object", and "does not allow you to monitor or track
individual visitors"
(https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/).
INFERENCE: per-member open and click history (SPEC 8E "a member view lists
the emails they were sent and what happened") is individual tracking, which
falls outside that exception as the ICO words it. The founder holds this risk
by decision (SPEC line 282 to 283). OBSERVED, a separate truth conflict:
`public/privacy.html` line 117 says "We do not use third-party analytics or
tracking tools". Resend's open pixel and click redirect are third-party
tracking (https://resend.com/docs/dashboard/domains/tracking). This is
Decision D-2.

**A7. Scale.** OBSERVED, SPEC recon: 41 accounts. INFERENCE: statistics that
need hundreds of recipients (A/B winners, holdouts, send-time optimisation,
Postmaster data) will not produce meaningful answers yet. An elite system
still carries them, but it shows the founder when a number is too small to
trust rather than declaring a winner from eight people.

**A8. Health data never leaves the app for marketing.** OBSERVED, SPEC 8B:
segments use "ACCOUNT data only, never health data (Article 9 data is not
used for marketing)". INFERENCE: this one sentence rules out, as currently
specified, every lifecycle feature that the big fitness apps build on
training or food data (weekly training digests, workout milestones, "you
have not logged food" nudges), and it also means no health data may ever be
merged into an email body, because the body is stored by Resend in the
United States (A1).

---

# Part B. The capability map

Each module gives: purpose; the elite feature set (MUST for a credible
system, ADVANCED for best in class); how the best products do it, with
sources; what it means for Volyume; and how it appears on the admin page.

---

## M1. Audience and contact model

**Purpose.** One trustworthy record per member that says who they are (only
as much as email needs), whether they can be emailed, and why not if not.

**Elite feature set.**
- MUST: one contact per account, keyed by account id, with email and
  confirmed status; a computed "sendable" state with a single named reason
  when not sendable (turned off, unsubscribed, bounced, complained,
  excluded, paused, never confirmed).
- MUST: attributes limited to what email uses (first name for greeting,
  join date, platform, last app open day, Community member yes or no).
- MUST: the per-member timeline of emails sent and outcomes (if tracking is
  kept, D-2).
- ADVANCED: custom properties the founder can add (for example "beta
  tester"), event history (app opened, email clicked), a contact score.
- ADVANCED: import and export of contacts; merge of duplicates.

**How the best do it.** Resend's audience model separates Contacts,
Properties, Segments and Topics; a contact marked Unsubscribed globally gets
nothing even if subscribed to topics
(https://resend.com/docs/dashboard/segments/introduction). Loops keeps only
marketing contacts in its Audience and sends transactional mail to any
address without adding it (https://loops.so/docs/types-of-emails). Kit shows
a status per subscriber, including a computed "cold" state
(https://help.kit.com/en/articles/2502651-the-subscriber-profile-page-and-status).

**What it means for Volyume.**
- Data that already exists (OBSERVED): `auth.users` email and confirmation;
  `users_profile.first_name` (migrate_001); `device_push_tokens.platform` and
  `last_seen_at`, "touched every time the client re-registers (app launch)"
  (migrate_053 header); `community_profiles.last_active_at` (migrate_160);
  `marketing_email_optout` (migrate_123); the working-tree migrate_198
  `_member_email_roster()` with states including `excluded` and `paused`.
- Data that does not exist (OBSERVED by search of `supabase/migrate_*.sql`):
  a per-member app-open signal for members without a push token (INFERENCE:
  `device_push_tokens` has no row for a member who never granted
  notifications); a time zone; an app version. SPEC 8B already foresees a
  coarse `last_seen_day` push when no non-health signal exists.
- Article 9 line: no health field, and no field derived from health data
  (training counts, streaks, food logs, weight, check-ins, ED flag, calm mode)
  is ever a contact attribute. The `paused` state is itself health-adjacent
  (it means calm mode or an open ED flag); SPEC section 7 already shows only
  "Paused", never the reason. INFERENCE: it should also never be exportable,
  filterable as a segment, or counted on a dashboard tile beyond the single
  audience number.
- PECR and GDPR: data minimisation means no contact attribute is collected
  for email that the app does not already need.

**Admin page.** People tab: search by email or name; each row shows status
in plain words ("Will get emails", "Turned off", "Unsubscribed", "Bounced",
"Excluded", "Paused"); a member sheet with join date, platform, emails
received and their outcomes, and the actions Exclude and Include.

---

## M2. Consent, preferences and suppression

**Purpose.** Make the opt-out model safe: every way a member can say "stop"
works first time, is recorded, and is honoured everywhere for good.

**Elite feature set.**
- MUST: one-click unsubscribe (RFC 8058 header pair) and a visible body
  link in every marketing email; honoured within two days at most (Gmail)
  and in practice instantly.
- MUST: an event log of every change with the wording version, the source
  (settings, email link, one-click header, admin) and the time.
- MUST: a permanent suppression list that survives account deletion, holding
  only what is needed to keep the person suppressed.
- MUST: replies that say "stop" or "unsubscribe" are treated as an objection
  (the right to object is absolute, any channel).
- MUST: exclusions (test accounts, the founder's own), separate from
  unsubscribes so an Include never overrides a member's own choice.
- ADVANCED: a preference centre with topics (for example product news,
  surveys, Community and events) plus "stop everything"; a pause option
  ("send me nothing for a month"); a frequency choice.
- ADVANCED: re-permission campaigns and an unsubscribe reason question.

**How the best do it.** Customer.io's subscription centre has two dimensions,
topics and channels, each configured opt-in or opt-out, and a person can
still unsubscribe from everything
(https://docs.customer.io/messaging/channels/subscriptions/overview/). Resend
now recommends Topics for unsubscribes and Segments only for internal
organisation; with Topics, a contact chooses which types to stop
(https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments).
Gmail requires `List-Unsubscribe-Post: List-Unsubscribe=One-Click` plus an
HTTPS `List-Unsubscribe` URL for bulk senders, and a clearly visible body
link (https://support.google.com/a/answer/81126). RFC 8058: the header "MUST
contain one HTTPS URI", both headers "MUST be covered by the [DKIM]
signature", the POST "MUST NOT include cookies, HTTP authorization, or any
other context information", and the sender "MUST NOT return an HTTPS
redirect" (https://www.rfc-editor.org/rfc/rfc8058). ICO: the right to object
to direct marketing "is an absolute right and there are no exemptions", and
"in most cases it will be preferable to suppress their details", "retaining
just enough information about them to ensure that their preference not to
receive direct marketing is respected in future"; the right covers profiling
related to direct marketing
(https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-object/).
ICO: add opted-out contacts to a "do not contact" or suppression list and
check it before sending (the PECR rules page cited in A5).

**What it means for Volyume.**
- Exists (OBSERVED): `marketing_email_optout` has no foreign key to
  `auth.users`, and migrate_154 retains it on account deletion deliberately
  ("Deleting a suppression record is the one deletion that harms the person
  it belongs to"). This matches the ICO suppression guidance. Working-tree
  migrate_198 has `member_email_prefs` (subscribed DEFAULT true) and
  `member_email_pref_events`, both ON DELETE CASCADE, and
  `member_email_exclusions`.
- Missing: topics (the founder chose one switch, so topics are Decision
  D-7); reply handling (no mailbox behind `news@volyume.app` is described in
  the SPEC; `MEMBER_EMAIL_REPLY_TO` is optional); a stated path for "stop"
  replies; an unsubscribe receipt page that offers "turn back on" without
  re-subscribing by accident.
- INFERENCE, a small mismatch: a person who unsubscribed, deleted their
  account and signed up again with the same address will see the Settings
  switch on (prefs default true) while the audience still suppresses them by
  email. The switch should show the truth ("You unsubscribed from an email.
  Turn on to hear from us again.").
- INFERENCE, header domain: the SPEC's `List-Unsubscribe` URL is on
  `<ref>.supabase.co`, while body links use `volyume.app`.
  `docs/EMAIL_AUTH_DELIVERABILITY.md` section 2 records a link-domain
  mismatch as the cause of past spam placement for body links. A header URL
  is not shown to readers and RFC 8058 forbids a redirect, and GitHub Pages
  cannot accept a POST, so a `volyume.app` header endpoint would need a
  different host. Recorded as a watch item for M9, not a defect.
- PECR: under the opt-out model this module is the whole of the member's
  control (A5), so it is the module that most needs to be elite.

**Admin page.** People tab (status, Exclude, Include, "exclude an address
before they sign up"). Settings tab: the wording shown at sign-up and in
Settings, with its version, read-only. Home tab: unsubscribes in the last 30
days with reasons (if SPEC 8G is built).

---

## M3. Segmentation

**Purpose.** Send the right email to the right members, using only account
and email data.

**Elite feature set.**
- MUST: saved named segments with a live count; rules joined by all or any;
  the audience rules (turned off, unsubscribed, excluded, paused, suppressed)
  always applied on top and never removable.
- MUST: rules on join date, last app open, platform, Community membership,
  received or not received an email, clicked or not clicked an email.
- ADVANCED: nested segments, exclusion segments, "engaged in the last N
  days" built-in segment, segment growth over time, a preview of ten
  matching members.

**How the best do it.** Kit builds segments from tags, segments and
automations and branches on "Clicked link in email" or "Opened email"
(SECONDARY, https://www.ruzuku.com/learn/tools/kit/segment-audience).
Resend keeps Segments internal and invisible to contacts
(https://resend.com/docs/dashboard/segments/introduction). Klaviyo's practice
is an "unengaged" property used as a campaign exclusion
(https://help.klaviyo.com/hc/en-us/articles/360017518492).

**What it means for Volyume.**
- Exists: SPEC 8B already lists the right rules and the "account data only"
  boundary (A8).
- Missing: an engagement segment that does not depend on opens (Apple Mail
  Privacy Protection, M10); an app-open signal for members with no push
  token (M1).
- Article 9: forbidden rules, stated so the builder can refuse them by
  construction: anything from workouts, sets, food, weight, measurements,
  photos, check-ins, coaching decisions, goals (cut, bulk, maintain), sex,
  ED flag, calm mode. INFERENCE: "goal" is the likeliest temptation (the big
  apps segment by it) and is health-adjacent for Volyume because a cut goal
  ties to weight change.
- Minors: if D-4 is answered with an exclusion, "under 18" is an audience
  rule like "paused", applied on top and never a segment the founder picks.

**Admin page.** Inside Emails, an "Who gets this" step: Everyone or a saved
segment; a segment builder of plain rows ("Joined after", "Opened the app in
the last", "Is in Community", "Got the email", "Clicked in the email"); a
live "N members will receive this" line that already includes every hold.

---

## M4. Content: editor, brand kit, templates, personalisation, rendering

**Purpose.** Let the founder write a good-looking, accessible, on-brand email
on a phone in minutes, and make it render well everywhere.

**Elite feature set.**
- MUST: a block editor (heading, paragraph, image, button, divider, spacer,
  survey block); a brand kit (wordmark, colours, type sizes, footer) applied
  automatically so no email can be off-brand; saved templates and
  duplicate.
- MUST: personalisation with a fallback and a strict allow-list of merge
  fields; the preview line (preheader); a generated plain-text part.
- MUST: previews as phone, desktop and dark; a test send to the admin.
- MUST: accessibility: `lang="en-GB"` on the root, headings in order,
  `role="presentation"` on layout tables, alt text on every image (empty
  alt on decorative ones), 4.5 to 1 contrast, live text rather than text in
  images, a visible link style, a minimum tap size on buttons.
- MUST: dark mode that does not hide the logo (a wordmark with a light
  outline or a dark-mode variant), colours that survive forced inversion.
- ADVANCED: conditional blocks (show to Community members only), reusable
  saved blocks, an image library, a reading-age and length meter.
- NOT: AMP for Email. INFERENCE: AMP needs sender registration with each
  provider, a third format to maintain and dynamic content fetched at open
  time; it adds risk and no value at this scale. The research brief already
  marks it "AMP no".

**How the best do it.** Accessibility guidance: `role="presentation"` on
layout tables, headings in order, `lang` and `dir` on the html element and
the body's direct children, a multipart plain-text version, and 4.5 to 1
contrast so client-forced dark colours stay readable (SECONDARY,
https://scalero.io/company/blog/email-accessibility-2026-lifecycle-checklist;
https://www.litmus.com/blog/7-simple-tricks-to-make-your-email-code-more-accessible;
Resend's own tips https://resend.com/blog/6-tips-for-accessible-emails).
Dark mode: Outlook ignores `prefers-color-scheme`, and a dark logo on a
transparent background disappears when the background inverts (SECONDARY,
Scalero above). Gmail asks that links be "visible and clear" and headers and
content accurate, with no false "Re:" (https://support.google.com/a/answer/81126).

**What it means for Volyume.**
- Exists: SPEC 8A (blocks, images in a public bucket bounded to 2 MB,
  `{{first_name|there}}`, phone, desktop and dark previews, templates,
  duplicate); the existing wordmark URL.
- Missing: the accessibility rules above as enforced checks (alt text
  required before Send unlocks); a dark-mode-safe wordmark asset; a
  merge-field allow-list stated as a rule; a plain-text part generated from
  the blocks (SPEC section 2 renders "HTML + plain text" from phase 1 fields;
  phase 2 blocks need the same).
- No new dependencies (CLAUDE.md section 2): the editor and renderer are hand
  built in plain JavaScript and Deno, no MJML, no editor library. SPEC
  section 3 already requires "No external scripts".
- Article 9: the merge-field allow-list is the guard that no health value
  ever enters a body (A8). First name only, plus system fields (unsubscribe
  link, survey link).
- ED-safety and claims: images must follow CLAIMS-STANDARDS section 5 (no
  before and after, no body imagery as a hook). INFERENCE: an uploaded image
  cannot be checked by a lint, so the send checklist (M12) carries a
  founder tick for it.
- Accessibility: CLAUDE.md requires a maximum text size pass for screens;
  INFERENCE: the email equivalent is a preview at large text, which the
  phone preview can simulate.

**Admin page.** Emails, the editor: a vertical list of blocks with "Add
block", move up, move down, delete; a sticky bar with Preview (phone,
desktop, dark), Send me a test, and a checklist badge showing what still
blocks sending.

---

## M5. Campaigns: broadcasts, scheduling, throttling, experiments

**Purpose.** Send one email to a chosen audience at a chosen time, safely
within provider limits, and learn from it where the numbers allow.

**Elite feature set.**
- MUST: draft, schedule, send now; a confirm step that repeats the exact
  recipient count; cancel a scheduled send; resume a partial send without
  duplicates.
- MUST: throttling to the provider's rate limit and plan quota, with
  headroom kept for account emails (M8).
- MUST: sending in the member's local morning or a fixed UK time.
- ADVANCED: A/B subject test with a minimum sample rule; multivariate;
  send-time optimisation; a global holdout group to measure whether email
  helps at all.

**How the best do it.** Mailchimp send-time optimisation picks a per-person
time within 24 hours, is not available in automations, and needs enough
data or it cannot run (https://mailchimp.com/help/use-send-time-optimization/);
its multivariate tests allow up to 8 variations and send time as a variable
(https://mailchimp.com/help/create-a-multivariate-campaign/). Iterable's
send-time optimisation updates its model weekly and holdouts cannot be
combined with it
(https://support.iterable.com/hc/en-us/articles/360050923471-Send-Time-Optimization-FAQs).
Braze's global control group withholds a share of users from every campaign
so the lift of the whole programme can be measured
(https://braze.com/docs/user_guide/messaging/messaging_fundamentals/know_before_you_send).
Resend: default rate limit "10 requests per second per team", 429 above it
(https://resend.com/docs/api-reference/introduction); Free transactional
plan 3,000 a month capped at 100 a day; Pro has no daily limit; marketing
Broadcasts are priced separately by contacts and do not count against the
transactional quota (https://resend.com/pricing).

**What it means for Volyume.**
- Exists: SPEC 8C (schedule, five-minute pg_cron runner via pg_net, a daily
  and monthly allowance that spreads a large send across days), 8F (A/B
  subject, 20 percent test share, 4-hour wait, winner by unique opens).
- Gap, INFERENCE with high confidence: SPEC 8C's default allowance is "100 a
  day", which is the whole Resend Free daily cap, and
  `docs/EMAIL_AUTH_DELIVERABILITY.md` section 5 lists "Resend free tier
  (100/day)" among the limits that stop auth email. The Supabase SMTP route
  and the member email API share one Resend team (INFERENCE from the same
  doc: one verified domain, one account). A day on which member email uses
  the allowance would leave no sign-up confirmations or password resets.
  This is Decision D-10 (it involves spend).
- Gap: SPEC 8F picks the winner "with more unique opens"; Apple Mail
  Privacy Protection inflates opens (M10), and at 41 accounts a 20 percent
  test share is about 8 people, 4 per arm. INFERENCE: an elite version picks
  on clicks, refuses to declare a winner below a minimum sample (and says
  so), and falls back to subject A.
- Gap: no time-zone data exists (M1). INFERENCE: a fixed UK-local time is
  the honest default; anything per-member needs a new non-health attribute.
- Gap: holdout groups are absent. INFERENCE: at current scale a holdout
  cannot show anything; it belongs in the map as ADVANCED and in the gap
  table as "not yet useful", not as a phase 1 or 2 build.
- Quiet hours: none in the SPEC for email (M12).

**Admin page.** Emails: a list with status chips (Draft, Scheduled, Sending,
Sent, Partly sent); each email's page has "Who gets this", "When"
(now, or a date and time shown in UK time), "Test" (optional A/B with the
sample-size warning), and the Send button behind the checklist (M12).

---

## M6. Automation and lifecycle journeys

**Purpose.** Send the right email at the right moment in a member's life with
Volyume, without the founder having to remember to.

**Elite feature set.**
- MUST: triggered journeys with entry rules, waits, exit rules (stop the
  journey the moment the member does the thing the email asks), and a
  once-per-window rule; every audience hold re-checked at each step, not
  only at entry.
- MUST journeys for a member product: welcome series; onboarding nudges
  tied to non-health app milestones; inactivity win-back with a hard
  frequency limit; sunset (stop emailing members who never engage);
  re-permission before sunset.
- ADVANCED: branching on email engagement; anniversaries; product news
  digest; a visual journey map; per-journey metrics and a stop button.

**How the best do it.** Braze Canvas exit events remove a user as soon as
they act, even mid-delay
(https://www.braze.com/docs/user_guide/engagement_tools/canvas/canvas_components/exit_criteria).
Klaviyo's sunset flow is a final re-engagement attempt after which profiles
are tagged unengaged and suppressed, with a prominent manage-preferences
link; Klaviyo staff describe 60 and 120 days without interaction as
unengaged and highly unengaged
(https://help.klaviyo.com/hc/en-us/articles/360017518492). Kit's cold rule:
no open or click in 90 days (30 days for subscribers newer than 90 days)
(https://help.kit.com/en/articles/2502651-the-subscriber-profile-page-and-status).
Strava's welcome flow, as captured by a third party: welcome at 1 hour, a
feature tip at 1 day, an event announcement at 7 days (SECONDARY,
https://gallery.reteno.com/flows/emails-strava). MyFitnessPal's captured
welcome flow runs eight emails over 14 days, including "Your goal is in
reach! Track your meals to achieve it" at day 2, "A free month of Premium is
waiting" at day 3, a feedback request at day 8 and a celebrity review at day
14 (SECONDARY, https://gallery.reteno.com/flows/emails-myfitnesspal). A
subscription-app analysis advises keeping orientation and selling in
separate sends (SECONDARY,
https://adapty.io/blog/subscription-app-email-sequences).

**What it means for Volyume.**
- Exists: SPEC 8D: a welcome email N hours after confirmation, a win-back
  after N days without opening the app, at most once per 90 days, all
  audience rules applied.
- Missing: a multi-step welcome series; exit rules; re-check of holds at
  each step (INFERENCE: SPEC 8D says "all the audience rules apply" but not
  when; a member who turns on calm mode between entry and send must not
  receive the step); onboarding nudges; sunset and re-permission;
  per-journey reporting and a pause.
- ED-safety, stated as rules this map would carry (lead review needed, and
  the ED-safety lane is founder-gated):
  - No journey is triggered by, or mentions, weight, food, calories, body,
    measurements, check-ins, goals, streaks or missed days.
  - Win-back copy never states the length of an absence ("it has been 23
    days"), never uses loss, guilt or "we miss you" framing (CLAIMS-STANDARDS
    section 8: "no shame, no pressure"). INFERENCE: inactivity can be a sign
    of illness, injury or recovery, which is why the 90-day limit and calm
    tone matter more here than in a retail app.
  - The MyFitnessPal pattern "Your goal is in reach! Track your meals" is
    the clearest example of what Volyume must not send: goal and food
    framing, an exclamation mark (banned, CLAIMS section 9.13), and a
    premium offer (banned, A4).
- Milestone celebrations: the big apps build these from activity data
  (Strava badges, recaps). Under A8 the only milestones Volyume can use
  without a new decision are account milestones (one year a member). Any
  training-count milestone is Decision D-9.
- Digest: a training or nutrition digest would merge health data into an
  email stored in the United States (A1, A8). A product news digest (what
  changed this month) carries no member data and is allowed.
- Sunset: INFERENCE: because opens are unreliable (M10), "engaged" for
  Volyume is best defined as "clicked an email, or opened the app" in the
  window, which uses only non-health signals. A sunset is also the PECR
  friendly path under the opt-out model: members who never engage stop
  getting email.

**Admin page.** Automations tab: one card per journey (Welcome, Getting
started, Come back, Last check before we stop, Anniversary), each with an
on or off switch, its steps as a short list with waits, the exit rule in a
plain sentence, members currently in it, and its 30-day results.

---

## M7. Surveys and feedback

**Purpose.** Ask members what they think, easily, and turn answers into
decisions.

**Elite feature set.**
- MUST: a survey builder (single choice, multiple choice, written answer,
  rating scale), open and close, results with counts and bars, written
  answers, CSV export.
- MUST: an in-email one-click first answer (each option is a link that
  records the answer and opens the rest of the survey with it filled in).
- MUST: NPS (0 to 10) and CSAT templates with standard scoring.
- ADVANCED: anonymous or named per survey; follow-up automation by answer;
  response-rate tracking per email; a "tell us more" follow-up; closing the
  loop (an email to respondents saying what changed).

**How the best do it.** Delighted recommends embedding the NPS question in
the email itself so people answer without leaving the inbox, with a short
intro, the question and one follow-up (https://delighted.com/blog/nps-email).
Buttondown surveys are one question embedded in the email, answered in the
browser, one response per subscriber, and since January 2026 answerable from
the web archive too (https://docs.buttondown.com/surveys;
https://buttondown.com/blog/2026-01-30-survey-responses-on-web). beehiiv
uses survey forms after sign-up, by link, or as an unsubscribe survey
(https://beehiiv.com/analyze/survey-forms).

**What it means for Volyume.**
- Exists: SPEC sections 1 to 3 (builder with single, multi and written
  answers, up to 20 questions, open and close, results with bars, CSV, a
  token binding the answer to the member, anonymous answers allowed, one
  answer per member per survey).
- Missing: rating and NPS question types; the one-click first answer
  (INFERENCE: it fits the existing token design, a link per option with the
  answer in the signed token); a response rate per email; a "survey only"
  mode that is genuinely research.
- PECR: OBSERVED, SECONDARY law-firm summary of the ICO position: genuine
  market research counts as a service message, but "if a service message
  contains a promotional element, then the whole message would amount to
  direct marketing"
  (https://www.dataprotectionreport.com/?p=5750 as summarised in search;
  the ICO small business FAQ says the same of service messages, "it can't
  contain anything promotional",
  https://ico.org.uk/for-organisations/advice-for-small-organisations/frequently-asked-questions/marketing/).
  INFERENCE: under the opt-out model this matters less for who can be asked,
  but it means a survey email must not carry selling, or it is marketing.
- Article 9 and ED-safety: the founder asked to "make any survey". OBSERVED:
  the answers table binds `user_id` when a token is present. INFERENCE: a
  question about weight, eating, body image, injuries or health conditions
  would collect special category data tied to an identified member, outside
  the app's Article 9 consent gate, and could itself be distressing to a
  member with an eating disorder. This is Decision D-8.
- Results privacy: written answers are shown "newest first" (SPEC section
  2). INFERENCE: the results view should not show the respondent's email
  next to a written answer by default; the CSV should carry a pseudonymous
  id unless the founder asks for names.

**Admin page.** Surveys tab: list with status; builder with question cards;
Results with a response rate, bars, NPS score with promoters, passives and
detractors, written answers, Download CSV.

---

## M8. Transactional and marketing separation

**Purpose.** Account emails (sign-up confirmation, password reset, admin
sign-in links) must always arrive, whatever happens to marketing.

**Elite feature set.**
- MUST: a written rule for what is marketing (anything promotional, anything
  a member would be surprised to get) and what is account mail.
- MUST: separate sender identity (address, and ideally subdomain) and
  separate quota headroom so marketing cannot starve or damage account mail.
- MUST: no tracking, no unsubscribe footer and no promotional content in
  account mail.
- ADVANCED: separate provider streams or IP pools; separate reputation
  monitoring.

**How the best do it.** Loops: transactional emails need no audience
membership, carry no unsubscribe link and no open or click tracking, and "if
the user would reasonably be surprised to receive it, or if it contains any
promotional content, send it as marketing"
(https://loops.so/docs/guides/transactional-vs-marketing-email). Resend
recommends a subdomain to contain a damaged reputation
(https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain)
and recommends disabling tracking for sensitive transactional mail
(https://resend.com/docs/dashboard/domains/tracking). SECONDARY: a subdomain
needs consistent volume to build its own reputation, and low-volume
subdomains may be judged by the parent
(https://www.suped.com/knowledge/email-deliverability/sender-reputation/should-transactional-and-marketing-emails-be-sent-from-separate-domains-or-subdomains).

**What it means for Volyume.**
- Exists (OBSERVED): account mail from `support@volyume.app` through Supabase
  SMTP and Resend; the SPEC sends member email from `news@volyume.app`.
- Missing: the written rule; quota headroom (D-10); a decision on a
  marketing subdomain. INFERENCE: Resend's open and click tracking is set per
  domain (https://resend.com/docs/dashboard/domains/tracking), and SPEC 8E
  switches it on "for the domain". If member email and auth email share
  `volyume.app`, turning tracking on would also rewrite links and add a
  pixel to the password reset and sign-up confirmation emails, which
  `docs/EMAIL_AUTH_DELIVERABILITY.md` section 2 shows are sensitive to link
  domains. A separate sending subdomain for member email avoids this. It
  needs DNS records at Namecheap (a founder action) and an Apple relay
  registration (M9).
- The admin sign-in link is account mail and must not be tracked.

**Admin page.** Settings tab, a read-only "How email is sent" panel: sender
addresses, which domain carries tracking, today's quota used by account mail
and by member email.

---

## M9. Deliverability operations

**Purpose.** Land in the inbox, and know quickly when that stops.

**Elite feature set.**
- MUST: SPF, DKIM and DMARC aligned with the From domain; TLS; valid PTR
  (provider side); RFC 5322 formatting; one-click unsubscribe; spam rate
  kept under 0.1 percent and never at 0.3 percent.
- MUST: automatic suppression of hard bounces and complaints; handling of
  delayed deliveries; webhook signature verification.
- MUST: Apple "Hide My Email" relay registration for the sending address.
- MUST: list hygiene: never send to unconfirmed addresses; sunset unengaged
  addresses (M6).
- ADVANCED: DMARC moved from `p=none` to `quarantine` after reports are
  clean; DMARC aggregate report reading; a custom tracking subdomain;
  Google Postmaster Tools and Microsoft SNDS monitoring; a seed list across
  Gmail, Outlook, Yahoo and iCloud; warm-up schedule for a new subdomain.

**How the best do it, and the rules.** Gmail (all senders): SPF or DKIM,
PTR, TLS, spam rate below 0.3 percent, RFC 5322; senders of 5,000 a day or
more: SPF and DKIM and DMARC (policy may be none), From alignment, one-click
unsubscribe; guidance to stay below 0.10 percent
(https://support.google.com/a/answer/81126). Google warned on 3 November 2025
that enforcement "ramps up", with 4.7.x deferrals and 5.7.x rejections for
non-compliant mail (SECONDARY,
https://www.spamresource.com/2025/11/google-warns-sender-requirements.html).
Microsoft Outlook.com, from 5 May 2025, for senders of more than 5,000 a
day: SPF pass, DKIM pass, DMARC at least `p=none` aligned
(https://techcommunity.microsoft.com/blog/outlook/strengthening-email-security-outlook-new-requirements-for-high-volume-senders/4399730).
Yahoo: a `List-Unsubscribe` header is required for bulk senders and the RFC
8058 POST method is recommended (SECONDARY,
https://bird.com/docs/knowledge-base/deliverability/gmail-yahoo-requirements;
Resend's own Yahoo note https://resend.com/docs/knowledge-base/how-do-i-avoid-yahoos-spam-folder).
Resend automatically suppresses hard bounces and complaints across the
region and fires `email.suppressed` when a send is blocked
(https://resend.com/docs/dashboard/emails/email-suppressions); webhook
events include `email.bounced`, `email.complained`, `email.delivery_delayed`,
`email.opened`, `email.clicked`
(https://resend.com/docs/dashboard/webhooks/event-types). Custom tracking
domains share the sending domain's root, for example `links.example.com`
(https://resend.com/docs/dashboard/domains/tracking;
https://resend.com/blog/introducing-custom-tracking-domain). Apple's private
relay rejects mail from unregistered senders; the sending domains or
addresses must be registered under "Sign in with Apple for Email
Communication" (https://developer.apple.com/sign-in-with-apple/get-started;
Braze's guide
https://braze.com/docs/user_guide/channels/email/best_practices/apple_mail/email_private_relay_apple_SSO).
Postmaster Tools moved to v2 in late 2025 with a Compliance Status dashboard
and no reputation labels (SECONDARY,
https://messagegears.com/resources/blog/google-sunsets-v1-postmaster-tools/);
Google publishes no minimum volume, and practitioners report data appearing
from roughly 100 or more Gmail recipients a day (SECONDARY,
https://www.suped.com/knowledge/email-deliverability/tools/what-email-volume-is-required-to-see-data-in-google-postmaster-tools).

**What it means for Volyume.**
- Exists (OBSERVED, `docs/EMAIL_AUTH_DELIVERABILITY.md`): `volyume.app`
  verified in Resend with DKIM and SPF; DMARC `p=none` with
  `rua=mailto:support@volyume.app`; Yahoo still spam-foldering account mail
  in June 2026 for new-domain reputation. SPEC: one-click headers; SPEC 8E:
  bounce and complaint turn the member off; Svix-signed webhooks.
- Missing: Apple relay registration of `news@` (INFERENCE: members who
  signed in with Apple and chose Hide My Email will bounce until this is
  done; whether it is done is the founder's fact, not ours); handling of
  `email.suppressed` and `email.delivery_delayed` outcomes in the stats; a
  custom tracking subdomain if tracking stays (D-2), so tracked links stay on
  `volyume.app` rather than a Resend domain (the same mismatch class as
  `docs/EMAIL_AUTH_DELIVERABILITY.md` section 2); a seed list; a DMARC step
  plan.
- INFERENCE: at 41 accounts Volyume is far below every 5,000 a day bulk
  threshold, so the bulk rules are not yet legally binding on it as a Gmail
  bulk sender; they are still the standard an elite system meets, because
  inbox placement is decided by the same signals. Postmaster Tools will
  likely show no data at this volume; the seed list and Resend's own
  outcomes are the monitoring that works now.
- No new dependency: verifying Svix signatures uses Web Crypto in Deno, not
  the Svix library.

**Admin page.** Home: a "Delivery health" tile (green, amber, red) from the
last 30 days: bounce rate, complaint rate, delayed and suppressed counts.
Settings: a checklist of DNS and provider set-up with a tick per item (SPF,
DKIM, DMARC, one-click, Apple relay, tracking subdomain), each item a fact
the founder confirms, never one the page claims.

---

## M10. Analytics and attribution

**Purpose.** Know which emails help members use Volyume, without measuring
anything about their health.

**Elite feature set.**
- MUST: per email: sent, delivered, bounced, delayed, suppressed,
  complained, unsubscribed, unique clicks, clicks per link, survey answers;
  opens shown with a caveat.
- MUST: per journey: entered, completed, exited by goal, results per step.
- MUST: conversion to app activity using non-health signals only: app opened
  within 7 days of the email, Community joined, survey answered.
- ADVANCED: cohorts by join month; holdout lift; machine-open filtering;
  trend lines; per-link heat list.

**How the best do it.** Apple Mail Privacy Protection caches images on send,
marking emails opened before a human sees them; SendGrid measured a 24.8
percent rise in unique opens after launch, and clicks are unaffected
(https://sendgrid.com/resource/apple-mail-privacy-protection-email-senders-adapt).
Some platforms flag prefetched opens and compute open rate only from
non-prefetched ones (https://bird.com/en-us/docs/knowledge-base/deliverability/apple-mail-privacy).
Customer.io reports topic unsubscribes per campaign and journey
(https://docs.customer.io/journeys/channels/subscriptions/metrics/).

**What it means for Volyume.**
- Exists: SPEC 8E stats and 8H 30-day overview.
- Missing: the open caveat on the page; clicks as the primary engagement
  measure; app-activity conversion (needs the M1 app-open signal); delayed
  and suppressed outcomes; per-journey reporting.
- INFERENCE: Resend's webhook payload, as documented, does not mark a
  prefetched open, so Volyume cannot filter machine opens itself. The
  honest presentation is "opened (includes automatic opens by some mail
  apps)" and decisions taken on clicks.
- Article 9: conversion measures must never include workouts logged, food
  logged, weight logged or coaching changes. App opened is the boundary.
- PECR: per-member open and click records are the individual tracking in A6.
  If D-2 is answered with aggregate-only measurement, per-member timelines
  show sent and delivered only.

**Admin page.** Insights tab: last 30 days tiles; a list of emails with
clicks and unsubscribes; an email's detail page with link clicks and the
small-number warning ("Fewer than 30 people, treat this as a hint, not a
result").

---

## M11. Compliance and governance

**Purpose.** Be able to show, at any time, that every email was lawful, what
was said to whom and on what basis, and that every request was honoured.

**Elite feature set.**
- MUST: proof of the notice each member saw (wording version, place, time),
  and of every subscription change.
- MUST: an audit log of admin actions (sign-in, save, schedule, send, cancel,
  exclude, include, survey open and close, export, settings change), append
  only.
- MUST: retention periods per table; deletion with the account; suppression
  kept on purpose; export of a member's email data on request.
- MUST: a record of processing entry for member email (purpose, lawful
  basis, categories, recipients, transfers, retention).
- MUST: the processor contract and transfer basis on record for every
  component, and a residency statement that is true.
- ADVANCED: a quarterly self-review checklist; a data map page.

**How the best do it.** ICO on suppression and the absolute right to object
(M2 sources). Resend's DPA is pre-signed at sign-up with SCCs and the UK
Addendum, and gives 14 days' notice of new sub-processors
(https://resend.com/security/gdpr).

**What it means for Volyume.**
- Exists: `member_email_pref_events` (working-tree migrate_198), deletion by
  cascade, retained suppression (migrate_154), privacy page sections.
- Missing: an admin audit log (SPEC stores `created_by` on campaigns only);
  retention periods for sends, webhook events and survey answers while an
  account lives (INFERENCE: storage limitation under UK GDPR asks for a
  period, not "until the account is deleted", for event-level tracking
  data); a member export path for email data; a component residency table
  that is true (A1).
- Component residency, as observed today:

  | Component | Where data is stored | Source |
  | --- | --- | --- |
  | Supabase database, edge functions, Storage bucket `member-email-assets` | EU, Dublin (eu-west-1) | CLAUDE.md section 1; `docs/EMAIL_AUTH_DELIVERABILITY.md` section 1 |
  | pg_cron and pg_net jobs | inside the same Supabase project | SPEC 8C |
  | Resend (sending, logs 30 days, tracking events, suppression list) | sends from eu-west-1, stores in the United States | https://resend.com/security/gdpr |
  | Svix (Resend's webhook delivery) | United States | https://resend.com/legal/subprocessors |
  | GitHub Pages (admin page, survey, unsubscribe pages) | static files; INFERENCE: no member data stored, but request logs are GitHub's | not checked in this pass |
  | Apple private relay (for Hide My Email members) | Apple | developer.apple.com page above |

- Outside-party law (CLAUDE.md, GC-D12): every question here is answered
  from ICO text and provider documents, conservatively; nothing waits for a
  solicitor. Truth fields stay honest: where this file says INFERENCE, the
  privacy page must not turn it into a claim.

**Admin page.** More, then "Records": the audit log (newest first, filter by
action); the notice wording history; the residency table; an "Export a
member's email data" action by email address.

---

## M12. Safety

**Purpose.** No member email ever harms a member, and no email breaks the
claims standards.

**Elite feature set (Volyume-specific; the big platforms have no equivalent
of the first three).**
- MUST: the wellbeing hold, fail closed, re-checked immediately before each
  send and each journey step, never only at audience build.
- MUST: a copy lint run server-side before Send unlocks: em dash,
  exclamation mark, emoji, the CLAIMS section 9 banned words and patterns,
  American spellings from a fixed list, weight, body and outcome terms, the
  R2 medical wording list, price and trial terms (A4), superiority terms.
- MUST: frequency caps across all member email (for example at most one
  marketing email a week and two a month per member, journeys included),
  and quiet hours (no sends overnight UK time).
- MUST: a send checklist the founder ticks on the phone, which the server
  records with the send.
- MUST: under-18 handling per D-4.
- ADVANCED: a cross-channel budget with push (an email day suppresses a
  marketing push that day); a "cooling-off" rule after a member turns calm
  mode off.

**How the best do it.** Klaviyo Smart Sending skips a message when the
person had one within a window (email default 16 hours) and does not
reschedule it (https://help.klaviyo.com/hc/en-us/articles/115002779311).
Customer.io message limits cap messages per person per period and mark
capped messages undeliverable unless a retry window is set
(https://docs.customer.io/messaging/send/message-limits/overview/). Iterable
frequency caps skip with a logged reason and exclude transactional mail
(https://support.iterable.com/hc/en-us/articles/28145709731348-Frequency-Optimization).
Braze quiet hours hold messages to the next allowed time in the user's time
zone, independent of caps
(https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/quiet_hours).

**What it means for Volyume.**
- Exists: SPEC ruling 2 (the hold via `_community_consistency_withheld`,
  fail closed); SPEC section 2 lint refusing an em dash; working-tree
  migrate_198 uses `IS NOT DISTINCT FROM false` so an error reads as withheld
  (OBSERVED, line 491).
- Missing:
  - The ED arm is dormant (A2, Decision D-3).
  - The lint covers one rule of the many in CLAIMS sections 5, 8, 9 and 9A.
  - CLAIMS-STANDARDS section 10: "Nothing is marked publish-ready without a
    recorded PASS from the compliance-reviewer agent", and section 1 puts
    "Emails, newsletters" in scope. The SPEC lets the founder send from the
    phone with no recorded PASS. Decision D-6.
  - No frequency cap and no quiet hours for email. OBSERVED,
    `docs/NOTIFICATIONS_LOCKED.md`: push has a global budget and "Quiet hours
    always win". INFERENCE: email should meet at least the same standard.
  - No send checklist beyond the recipient-count confirm.
- The proposed send checklist (each item a tick the server stores with the
  send):
  1. The lint passes (server-side, not only in the page).
  2. The recipient number is right and includes every hold.
  3. A test arrived on my phone and looks right in light and dark.
  4. Every link works and goes to `volyume.app` or a store listing.
  5. Every claim is true of the shipped app today (CLAIMS section 2).
  6. No weight, body, food, calorie or outcome framing; no before and after
     imagery (CLAIMS section 5).
  7. No price, trial, upgrade or offer of paid access (CLAUDE.md D137).
  8. Images have alt text and none shows a body as the point.
  9. It is not inside quiet hours, and nobody gets more than the cap.
  10. The compliance PASS reference, if D-6 requires one.

**Admin page.** The checklist sits on every email's page above the Send
button; Send stays disabled until the lint passes and every tick is set,
with the blocking reason in one line.

---

## M13. Operations for a solo founder on a phone

**Purpose.** Run the whole system one-handed, in a few minutes, with no way
to make an irreversible mistake by a slip of the thumb.

**Elite feature set.**
- MUST: a home dashboard that answers "is anything wrong, what is next, how
  did the last one do".
- MUST: test send to self; a seed list (the founder's own Gmail, Outlook,
  Yahoo and iCloud addresses, excluded from the audience and always sent a
  copy); previews.
- MUST: an undo window: a send starts N minutes after the founder taps Send
  (shown as a countdown with "Stop this send"), and a scheduled send can be
  cancelled up to its start.
- MUST: a kill switch that stops all sending, broadcasts and journeys, at
  once, from the home screen, with a reason; the runner checks it before
  every batch.
- MUST: alerts by email to the admin address when a send finishes, fails,
  pauses for quota, or a complaint or bounce spike crosses a threshold.
- MUST: sign-in that survives a phone browser (the SPEC's one-time link and
  12-hour session), with sign out everywhere.
- ADVANCED: a weekly digest email to the founder; drafts autosaved; offline
  draft editing; a "send as myself" plain-text style option for personal
  notes.

**How the best do it.** INFERENCE from the products surveyed: Gmail's own
"undo send" pattern, Mailchimp's automatic winner notice by email
(https://mailchimp.com/help/create-a-multivariate-campaign/) and Braze's
rate limiting all exist because senders make mistakes at send time. No
primary source describes a phone-first admin for a solo sender, so this
module is reasoned from the founder's constraints in CLAUDE.md section 4
("The founder works from a phone").

**What it means for Volyume.**
- Exists: SPEC test send, preview, the recipient-count confirm, the
  idempotent resume of a partial send, the overview.
- Missing: undo window, kill switch, seed list, alerts, sign out everywhere,
  autosave.
- INFERENCE: a kill switch is a single row in `member_email_config` read by
  the runner and the send action; it needs no new infrastructure.

**Admin page.** Home is the dashboard (Part C).

---

## M14. Referral and review asks

**Purpose.** The founder's "selling the product to them in some way", read
for a free product: members telling friends, and members rating the app.

**Elite feature set.**
- MUST: a share link the member sends themselves (the member chooses who and
  writes their own message); no friend addresses ever collected by Volyume.
- MUST: review asks with no incentive of any kind, never to paused members,
  never right after a hard week (INFERENCE), and at most once per member per
  long window.
- ADVANCED: referral attribution by link (counts only), referral milestones.

**How the best do it.** beehiiv's referral programme gives rewards at
milestones (https://www.beehiiv.com/support/article/13090888705943).
SECONDARY: the ICO's 2023 position, as reported, is that encouraging
referrers is not a breach where the referrer controls how the message is
sent, while a fixed message sent on the business's behalf makes the business
the instigator
(https://www.footanstey.com/our-insights/articles-news/what-do-you-need-to-know-about-the-icos-latest-guidance-on-refer-a-friend-schemes/).
Google Play: incentivised ratings and reviews "have always been against our
policies" (https://android-developers.googleblog.com/2017/06/google-plays-policy-on-incentivized.html).

**What it means for Volyume.**
- Exists: nothing in the SPEC.
- CLAIMS section 5 bans invented testimonials; INFERENCE: a referral email
  must not quote members unless the quote is real, consented and recorded.
- Minors: no referral asks to under-18s if D-4 excludes them.
- Rewards: any reward that is paid access would breach D137; any reward for
  a review breaches Play policy.

**Admin page.** A block type "Share Volyume" (a button to the store listing
the member can forward) and a template "Rate Volyume"; no separate tab.

---

# Part C. Recommended admin page structure

Phone first: a bottom bar of five tabs, a single column, large tap targets,
every destructive action behind a confirm that repeats the consequence in
numbers. Plain JavaScript and the site's own CSS, no external scripts (SPEC
section 3). British English, full words, calm.

**Bottom bar:** Home, Emails, Automations, Surveys, People. A "More" item in
the Home header opens Insights, Records and Settings.

### 1. Home
- Kill switch: "Pause all email" (one tap, then a confirm with a reason;
  when on, a red bar shows on every screen with "Resume").
- Next send: the next scheduled email or journey step, with time and count,
  and "Stop".
- Last send: delivered, clicks, unsubscribes, complaints, with the
  small-number warning.
- Delivery health tile (M9).
- Audience now: one number, "N members will get the next email", with the
  breakdown in plain words (turned off, unsubscribed, excluded, paused,
  under 18 if D-4).
- Alerts list (quota pause, failures, complaint spike).
- Key actions: New email, Pause all email, Open last results.

### 2. Emails
- List: Drafts, Scheduled, Sent, Partly sent; search; Duplicate.
- Email page, in four steps shown as a vertical stepper:
  1. Write: block editor, subject, preview line, template picker.
  2. Who gets this: Everyone or a segment; live count.
  3. When: Now (with the undo countdown) or a UK date and time; quiet-hours
     warning; frequency-cap preview ("3 members will be skipped because they
     had an email this week").
  4. Check and send: preview phone, desktop, dark; Send me a test; Send to
     the seed list; the checklist (M12); Send.
- After sending: live progress, then results.
- Key actions: Save, Preview, Test, Schedule, Send, Stop, Duplicate.

### 3. Automations
- One card per journey with an on or off switch, members in it, last 30 days.
- Journey page: steps with waits, exit rule, the copy for each step (same
  editor), Test this step to me.
- Key actions: Turn on, Turn off, Edit step, Test step.

### 4. Surveys
- List: Draft, Open, Closed; templates (NPS, satisfaction, feature
  interest).
- Builder: question cards, types, required, reorder.
- Results: response rate, bars, NPS, written answers, CSV.
- Key actions: Open, Close, Attach to an email, Download CSV.

### 5. People
- Search; status per member in plain words; member sheet with join date,
  platform, emails received and outcomes (subject to D-2).
- Exclude with a note, Include, Exclude an address in advance.
- Segments: list and builder (from M3).
- Key actions: Exclude, Include, New segment.

### More: Insights, Records, Settings
- Insights: per email, per journey, per link, cohorts by join month.
- Records: audit log; notice wording history; residency table; export a
  member's email data.
- Settings: sender identity panel (read-only facts), daily and monthly
  allowance, frequency cap, quiet hours, set-up checklist (DNS, Apple relay,
  tracking subdomain), admin sessions with "Sign out everywhere".

---

# Part D. Gap table: SPEC phase 1 and 2 against this map

Legend: **SPECIFIED** (in the SPEC as written), **PARTIAL** (in the SPEC
but short of the map), **MISSING** (not in the SPEC), **CONFLICT** (the SPEC
or a founder decision meets a CLAUDE.md inviolable, a governing document or
a published rule; stated, not resolved), **STALE** (the SPEC text is
superseded by the founder decision and not yet rewritten).

| # | Item | SPEC reference | Status | Note |
| --- | --- | --- | --- | --- |
| 1 | Contact per account, sendable state with reason | 7, migrate_198 roster | SPECIFIED | Roster states include excluded and paused (OBSERVED, working tree). |
| 2 | Attributes: first name, join date, platform, Community | 8A, 8B | SPECIFIED | |
| 3 | App-open signal for members without a push token | 8B ("if no non-health signal exists ... pushes a coarse `last_seen_day`") | PARTIAL | `device_push_tokens.last_seen_at` exists only for members with a token (INFERENCE). |
| 4 | Time zone attribute | none | MISSING | |
| 5 | Phase 1 schema names `member_email_consent`, `consented DEFAULT false`, `member_email_set_consent` | 1 | STALE | The founder decision renames these (lines 23 to 26); the working-tree migration follows the decision. |
| 6 | Footer "because you said yes to news from Volyume in the app" | 2 | STALE | False under the opt-out model; the decision says the footer states "why it was sent and how to stop". |
| 7 | Privacy section basis "your consent, given in the app" | 3 | STALE | False under the opt-out model. |
| 8 | Settings switch "Off by default" and the one-time prompt | 4 | STALE | Superseded: on by default, no prompt. |
| 9 | One-click unsubscribe headers and body link | 2 | SPECIFIED | Header host is `supabase.co` (M2 watch item). |
| 10 | Permanent suppression surviving deletion | migrate_123, migrate_154 | SPECIFIED | Pre-existing, deliberate. |
| 11 | Switch shows truth after an email unsubscribe on a re-created account | none | MISSING | M2. |
| 12 | Reply handling and "stop" replies as objections | 2 (`MEMBER_EMAIL_REPLY_TO` optional) | MISSING | |
| 13 | Preference topics | none (one switch by founder answer) | MISSING | Decision D-7. |
| 14 | Unsubscribe reason | 8G | SPECIFIED | |
| 15 | Exclusions | 7 | SPECIFIED | |
| 16 | Opt-out model for marketing under PECR | founder decision, lines 17 to 31 | CONFLICT (with lead ruling 1 and the ICO soft opt-in conditions as read, A5) | Founder decision stands; not a CLAUDE.md inviolable line. Recorded so the opt-out modules are built to the highest standard. |
| 17 | Segments on account data only | 8B | SPECIFIED | |
| 18 | Engagement segment not based on opens | none | MISSING | M3, M10. |
| 19 | Explicit forbidden-rule list (goals, sex, health) | 8B in principle | PARTIAL | Make it a refusal by construction. |
| 20 | Block editor, images, templates, duplicate | 8A | SPECIFIED | |
| 21 | Personalisation with fallback | 8A | SPECIFIED | |
| 22 | Merge-field allow-list as a rule | none | MISSING | Article 9 guard (A8). |
| 23 | Plain-text part for block emails | 2 (phase 1 fields only) | PARTIAL | |
| 24 | Accessibility checks enforced | none | MISSING | M4. |
| 25 | Dark-mode-safe wordmark | 8A (dark preview only) | PARTIAL | |
| 26 | AMP | none | SPECIFIED BY ABSENCE | Correctly not built. |
| 27 | Scheduling, runner, partial resume | 8C, 2 | SPECIFIED | |
| 28 | Daily allowance default 100 | 8C | CONFLICT (operational, with `docs/EMAIL_AUTH_DELIVERABILITY.md` section 5) | Equals the whole Resend Free daily cap shared with auth mail (INFERENCE). Decision D-10. |
| 29 | Cancel a scheduled send, undo window | none | MISSING | M13. |
| 30 | A/B subject, winner by opens | 8F | PARTIAL | Opens unreliable (MPP); no minimum sample. |
| 31 | Multivariate, send-time optimisation | none | MISSING (ADVANCED) | Not useful at 41 accounts. |
| 32 | Holdout group | none | MISSING (ADVANCED) | Not useful at 41 accounts. |
| 33 | Welcome email | 8D | PARTIAL | One email, not a series; no exit rule. |
| 34 | Win-back once per 90 days | 8D | SPECIFIED | ED-safe copy rules not written into the SPEC. |
| 35 | Holds re-checked at each journey step | 8D ("all the audience rules apply") | PARTIAL | When is not stated. |
| 36 | Onboarding nudges, anniversary, product news digest | none | MISSING | |
| 37 | Sunset and re-permission | none | MISSING | M6. |
| 38 | Milestones or digests from training or food data | none | CONFLICT if added (with SPEC 8B, Article 9, A1) | Decision D-9. |
| 39 | Survey builder, results, CSV, token binding | 1 to 3 | SPECIFIED | |
| 40 | NPS, rating, one-click first answer | none | MISSING | |
| 41 | Health questions in "any survey" | founder answer "make any survey" | CONFLICT (with CLAUDE.md GDPR and Article 9 and the ED-safety lane) | Decision D-8. |
| 42 | Written answers shown without identity by default | 2 | MISSING | |
| 43 | Written transactional and marketing rule | none | MISSING | M8. |
| 44 | Tracking switched on "for the domain" shared with auth mail | 8E | CONFLICT (operational, with `docs/EMAIL_AUTH_DELIVERABILITY.md` section 2) | Would add a pixel and rewritten links to password reset and sign-up mail (INFERENCE from Resend's per-domain setting). |
| 45 | Marketing sending subdomain | none | MISSING | Founder DNS action. |
| 46 | SPF, DKIM, DMARC, one-click | existing set-up, 2 | SPECIFIED | DMARC is `p=none`. |
| 47 | Bounce and complaint auto turn-off | 8E | SPECIFIED | |
| 48 | `email.suppressed`, `email.delivery_delayed` in stats | 8E lists delayed | PARTIAL | `email.suppressed` not handled. |
| 49 | Apple Hide My Email relay registration | none | MISSING | Founder action; whether done is the founder's fact. |
| 50 | Custom tracking subdomain | none | MISSING | Needed if D-2 keeps tracking. |
| 51 | Seed list, DMARC step plan | none | MISSING | |
| 52 | Per email stats, overview | 8E, 8H | SPECIFIED | |
| 53 | Open caveat, clicks as primary | none | MISSING | M10. |
| 54 | App-activity conversion | none | MISSING | Needs item 3. |
| 55 | Per-journey reporting | none | MISSING | |
| 56 | Per-member open and click timeline | 8E | CONFLICT (with ICO regulation 6 as read, A6; and with `public/privacy.html` line 117) | Founder decision "Track opens and clicks" stands; the privacy truth conflict is separate. Decision D-2. |
| 57 | Privacy page says opens and clicks are measured | 8I | PARTIAL | Line 117 still says no third-party tracking tools. |
| 58 | Notice wording version and change events | 1, migrate_198 events | SPECIFIED | |
| 59 | Admin audit log | none | MISSING | |
| 60 | Retention periods while the account lives | none | MISSING | |
| 61 | Member export of email data | none | MISSING | |
| 62 | Resend described as "sending from its Ireland region" | 3; `public/privacy.html` lines 162, 173 | CONFLICT (with CLAUDE.md section 1 "EU data residency is absolute" and privacy line 123) | Resend stores in the United States (A1). Founder decision "keep Resend". Decision D-1. |
| 63 | Wellbeing hold, fail closed | ruling 2 | SPECIFIED | |
| 64 | ED arm live for current store builds | none | CONFLICT (with the ED-safety inviolable's intent; A2) | Dormant until a build with the 182 push ships and is installed. Decision D-3. |
| 65 | Under-18 handling | none | CONFLICT (with CLAIMS section 7 and the Children's code as read, A3) | Decision D-4. |
| 66 | "Offers" in switch, notice and SPEC title | 4, commit 94afac3db | CONFLICT (with CLAUDE.md D137 if an offer is a price, trial or upsell) | Decision D-5. |
| 67 | Copy lint beyond em dash | 2 | PARTIAL | CLAIMS sections 5, 8, 9, 9A not covered. |
| 68 | Recorded compliance PASS before sending | none | CONFLICT (with CLAIMS-STANDARDS section 10) | Decision D-6. |
| 69 | Frequency cap and quiet hours for email | none | MISSING | Push already has both. |
| 70 | Send checklist | 3 (count confirm only) | PARTIAL | M12. |
| 71 | Kill switch | none | MISSING | |
| 72 | Alerts to the founder | none | MISSING | |
| 73 | Sign out everywhere, autosave | 2 (12-hour session) | PARTIAL | |
| 74 | Referral share block, review ask template | none | MISSING | M14. |
| 75 | No new dependencies, no external scripts | 3, 8 | SPECIFIED | Svix verification by Web Crypto. |

---

# Part E. Founder decisions needed

Each question has neutral options in no order of preference. Questions that
the lead could rule under D33 are left out; these ten each meet a CLAUDE.md
inviolable, a founder decision already given, a governing document, or
spend.

**D-1. Where member email data is stored.** Resend stores message content,
logs, tracking events and suppression in the United States, under SCCs and
the UK Addendum (A1). CLAUDE.md says EU residency is absolute, and the
privacy page says account data does not leave the UK or EU. Auth emails
already use Resend. Which do you want?
- A. Keep Resend for member email and auth email, and change the residency
  rule and the privacy page to say plainly that emails are sent from Ireland
  and stored by Resend in the United States under the standard contract
  clauses.
- B. Keep Resend for auth email only, and move member email to a sender
  that stores data in the EU (a new provider, which needs your approval).
- C. Move both auth and member email to a sender that stores data in the EU.
- D. Keep Resend and hold member email until Resend offers EU storage.

**D-2. Open and click tracking.** You chose to track opens and clicks. Two
separate facts: the ICO applies regulation 6 to email pixels, and its new
statistics exception does not cover tracking individuals (A6); and the
privacy page says "We do not use third-party analytics or tracking tools"
(line 117). Which do you want?
- A. Track opens and clicks per member, as decided, and rewrite the privacy
  page line and the email footer to say so.
- B. Track opens and clicks for totals only (per email and per link), with
  no per-member history, and rewrite the privacy line to say so.
- C. Track clicks only (no pixel), per member, and rewrite the privacy line.
- D. Track nothing in the email; measure through survey answers and app
  opens only.

**D-3. Sending while the server cannot see ED flags.** The email hold's ED
arm only works for members on a build that pushes the flag, and no such
build has shipped (A2). Calm mode is seen. Which do you want?
- A. Send now, with the calm-mode arm and the ED arm as it stands.
- B. Hold all member email until a build carrying the ED push is live in
  the stores.
- C. Hold until that build is live and a member's own device has synced on
  it (needs a new non-health app version signal), sending only to those
  members.
- D. Send now, but only product news with no food, body or training
  content, until B or C is met.

**D-4. Members aged 13 to 17.** Volyume accepts members from 13 (A3). The
claims standard bars weight-loss-adjacent advertising to under-18s, and the
Children's code asks for commercial profiling to be off by default for
children. Which do you want?
- A. Email them the same as adults.
- B. Do not email under-18s any marketing (an audience rule from the date
  of birth, like "Paused").
- C. Email under-18s product news and surveys only, with no tracking and no
  offers.
- D. Email under-18s only if they turn the switch on themselves (off by
  default for them).

**D-5. The word "offers".** Volyume is fully free (D137), so there is no
price, trial or paid upgrade to offer. The switch says "News and offers by
email" and the sign-up line mentions offers. Which do you want?
- A. Remove "offers" from the switch, the sign-up line and the privacy page,
  and keep news and surveys.
- B. Keep "offers", defined in the register as invitations to features,
  events and challenges, never a price, trial or paid access.
- C. Keep "offers" because a paid offer may return later, with every email
  still barred from price and trial until you decide that separately.

**D-6. The claims gate for emails.** CLAIMS-STANDARDS section 10 requires a
recorded PASS from the compliance reviewer before anything public is
published, and emails are in scope. The SPEC lets you send from your phone
with an em dash check only. Which do you want?
- A. Every email needs a recorded compliance PASS before the Send button
  unlocks.
- B. The server runs a full automatic lint of the claims rules, and you tick
  the send checklist; that counts as the gate for email.
- C. Both: the automatic lint and checklist always, and a recorded PASS for
  any email that names a feature or a number.
- D. Change CLAIMS-STANDARDS so founder-written emails are outside section
  10.

**D-7. One switch or topics.** You chose one Settings switch. Elite
systems let people stop one kind of email and keep another. Which do you
want?
- A. Keep one switch.
- B. One switch plus topics on the email preferences page (product news,
  surveys, Community and events), all on by default.
- C. Topics in the app's Settings and on the email preferences page.

**D-8. Health questions in surveys.** You asked to "make any survey". A
question about weight, eating, body, injury or health, answered by a named
member, would collect special category data outside the app's Article 9
consent, and could upset a member with an eating disorder. Which do you
want?
- A. The builder refuses health, body, food and weight questions.
- B. Such questions are allowed only in anonymous surveys (no member link).
- C. Such questions are allowed with a consent line inside the survey
  before the first question.
- D. No limit; you judge each survey.

**D-9. Training and food data in emails.** The big fitness apps send
workout milestones and weekly digests built from activity data. Volyume's
SPEC uses account data only, and an email body is stored by Resend in the
United States. Which do you want?
- A. No training or food data in any email or rule; account milestones only
  (for example one year a member).
- B. Allow workout-count milestones (no weights, no food, no body), with a
  separate switch the member turns on.
- C. Allow a weekly training summary email, with a separate switch the
  member turns on.

**D-10. Sending quota and account emails.** Resend's free plan allows 100
emails a day for the whole account, which also carries sign-up and password
reset emails. The SPEC's default member allowance is 100 a day. Which do you
want?
- A. Stay on the free plan and cap member email below the daily limit (for
  example 60 a day), leaving the rest for account emails.
- B. Move to Resend Pro (listed at $20 a month for 50,000 emails, no daily
  limit).
- C. Use Resend's separate marketing plan for member email (free up to 1,000
  contacts, without marketing analytics), which does not count against the
  account email quota but stores the member list in Resend.
- D. A separate Resend account and sending subdomain for member email.

Founder actions this research surfaces (not decisions, delivered in chat by
the lead when the build reaches them): register the member email sender with
Apple's private relay; add DNS for a marketing subdomain and a tracking
subdomain if D-2 keeps tracking; confirm a mailbox behind the reply address.

---

# Part F. Source list

Regulators and law
- ICO, PECR email marketing rules: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/
- ICO, email marketing guidance index (DUAA update): https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/
- ICO, guide to electronic mail marketing: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/
- ICO, storage and access technologies, tracking pixels: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/
- ICO, the exceptions (statistical purposes): https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/
- ICO, myth-busting on storage and access, September 2025: https://cy.ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/09/fact-vs-fiction-ico-debunks-myths-on-storage-and-access-technologies
- ICO, small organisations marketing FAQ: https://ico.org.uk/for-organisations/advice-for-small-organisations/frequently-asked-questions/marketing/
- ICO, right to object: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-object/
- ICO, Children's code standard 12, profiling: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/12-profiling/
- SECONDARY, Children's code scope (under 18): https://www.hunton.com/privacy-and-cybersecurity-law-blog/2020/01/22/ico-publishes-final-version-of-its-age-appropriate-design-code/
- SECONDARY, refer a friend: https://www.footanstey.com/our-insights/articles-news/what-do-you-need-to-know-about-the-icos-latest-guidance-on-refer-a-friend-schemes/
- SECONDARY, DUAA fines: https://www.sheppard.com/insights/blogs/the-uks-data-use-and-access-act-2025-key-points-to-note-for-businesses
- SECONDARY, service messages and research: https://www.dataprotectionreport.com/?p=5750

Mailbox providers and standards
- Gmail sender guidelines: https://support.google.com/a/answer/81126
- SECONDARY, Gmail enforcement November 2025: https://www.spamresource.com/2025/11/google-warns-sender-requirements.html
- SECONDARY, Postmaster Tools v2: https://messagegears.com/resources/blog/google-sunsets-v1-postmaster-tools/
- SECONDARY, Postmaster volume: https://www.suped.com/knowledge/email-deliverability/tools/what-email-volume-is-required-to-see-data-in-google-postmaster-tools
- Microsoft Outlook.com high-volume senders: https://techcommunity.microsoft.com/blog/outlook/strengthening-email-security-outlook-new-requirements-for-high-volume-senders/4399730
- SECONDARY, Gmail and Yahoo requirements: https://bird.com/docs/knowledge-base/deliverability/gmail-yahoo-requirements
- RFC 8058: https://www.rfc-editor.org/rfc/rfc8058
- Apple, Sign in with Apple email relay: https://developer.apple.com/sign-in-with-apple/get-started
- Google Play, incentivised reviews: https://android-developers.googleblog.com/2017/06/google-plays-policy-on-incentivized.html

Resend
- GDPR and storage: https://resend.com/security/gdpr
- Sub-processors: https://resend.com/legal/subprocessors
- Pricing: https://resend.com/pricing
- API rate limit: https://resend.com/docs/api-reference/introduction
- Webhook events: https://resend.com/docs/dashboard/webhooks/event-types
- Open and click tracking: https://resend.com/docs/dashboard/domains/tracking
- Custom tracking domain: https://resend.com/blog/introducing-custom-tracking-domain
- Suppressions: https://resend.com/docs/dashboard/emails/email-suppressions
- Segments and Topics: https://resend.com/docs/dashboard/segments/introduction and https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments
- Subdomain advice: https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain
- Yahoo note: https://resend.com/docs/knowledge-base/how-do-i-avoid-yahoos-spam-folder
- Accessible emails: https://resend.com/blog/6-tips-for-accessible-emails

Lifecycle platforms
- Braze frequency capping: https://braze.com/docs/user_guide/engagement_tools/campaigns/testing_and_more/rate-limiting/
- Braze quiet hours: https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/quiet_hours
- Braze global control group: https://braze.com/docs/user_guide/messaging/messaging_fundamentals/know_before_you_send
- Braze exit criteria: https://www.braze.com/docs/user_guide/engagement_tools/canvas/canvas_components/exit_criteria
- Braze Apple relay: https://braze.com/docs/user_guide/channels/email/best_practices/apple_mail/email_private_relay_apple_SSO
- Customer.io message limits: https://docs.customer.io/messaging/send/message-limits/overview/
- Customer.io subscription centre: https://docs.customer.io/messaging/channels/subscriptions/overview/
- Customer.io subscription metrics: https://docs.customer.io/journeys/channels/subscriptions/metrics/
- Iterable send-time optimisation: https://support.iterable.com/hc/en-us/articles/360050923471-Send-Time-Optimization-FAQs
- Iterable frequency optimisation: https://support.iterable.com/hc/en-us/articles/28145709731348-Frequency-Optimization
- Klaviyo sunset flow: https://help.klaviyo.com/hc/en-us/articles/360017518492
- Klaviyo Smart Sending: https://help.klaviyo.com/hc/en-us/articles/115002779311
- Mailchimp send-time optimisation: https://mailchimp.com/help/use-send-time-optimization/
- Mailchimp multivariate: https://mailchimp.com/help/create-a-multivariate-campaign/
- Loops types of email: https://loops.so/docs/types-of-emails
- Loops transactional and marketing: https://loops.so/docs/guides/transactional-vs-marketing-email
- Buttondown surveys: https://docs.buttondown.com/surveys and https://buttondown.com/blog/2026-01-30-survey-responses-on-web
- Kit cold subscribers: https://help.kit.com/en/articles/2502651-the-subscriber-profile-page-and-status
- SECONDARY, Kit segmentation: https://www.ruzuku.com/learn/tools/kit/segment-audience
- beehiiv survey forms: https://beehiiv.com/analyze/survey-forms
- beehiiv referral programme: https://www.beehiiv.com/support/article/13090888705943
- Delighted NPS email: https://delighted.com/blog/nps-email

Measurement and rendering
- Apple Mail Privacy Protection: https://sendgrid.com/resource/apple-mail-privacy-protection-email-senders-adapt
- Prefetched opens: https://bird.com/en-us/docs/knowledge-base/deliverability/apple-mail-privacy
- SECONDARY, accessibility checklist: https://scalero.io/company/blog/email-accessibility-2026-lifecycle-checklist
- Litmus accessibility: https://www.litmus.com/blog/7-simple-tricks-to-make-your-email-code-more-accessible

Fitness apps (all SECONDARY captures; no primary Whoop, Fitbod or Noom
material was found in this pass)
- Strava flow: https://gallery.reteno.com/flows/emails-strava
- MyFitnessPal flow: https://gallery.reteno.com/flows/emails-myfitnesspal
- Subscription app sequences: https://adapty.io/blog/subscription-app-email-sequences

Repository files read
- `CLAUDE.md`; `docs/member-email-2026-10-17/SPEC.md`;
  `marketing/hq/CLAIMS-STANDARDS.md`; `docs/EMAIL_AUTH_DELIVERABILITY.md`;
  `docs/NOTIFICATIONS_LOCKED.md` (quiet hours, push budget, ED suppression);
  `supabase/migrate_053_device_push_tokens.sql` (header);
  `supabase/migrate_123_retention_email_loop.sql` (opt-out table);
  `supabase/migrate_154_workout_notes_conflict_target_and_deletion_completeness.sql`
  (suppression retained); `supabase/migrate_160_community.sql` (`is_minor`,
  `last_active_at`); `supabase/migrate_180_community_consistency_server_gate.sql`
  (header); `supabase/migrate_198_member_email.sql` (working tree, untracked
  when read); `public/privacy.html` (lines 117, 123, 162, 173, section 11);
  commit 94afac3db (switch and sign-up copy).

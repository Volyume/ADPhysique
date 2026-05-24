# Privacy and consent (locked)

What we collect, how we treat it, what users see and agree to, and
what happens when they leave. Locked 2026-05-23.

## Regulatory posture

| Regime | How we comply |
| --- | --- |
| UK GDPR | Lawful basis is Article 6(1)(b) (contract) for core service plus Article 9(2)(a) (explicit consent) for special-category health data. Separate consent screen at onboarding. |
| EU GDPR | Same as UK GDPR. Volyume designates the same Article 9 categories. |
| US HIPAA | Not a covered entity in direct-to-consumer use. No BAA with healthcare providers. |
| US FTC Health Breach Notification Rule | Applies to direct-to-consumer health apps. Volyume notifies users and the FTC within 60 calendar days of breach discovery if affecting 500+ users. |
| California CCPA / CPRA | Honoured. Sale of personal information: never. Sensitive personal information limits: respected. |

## Special-category data Volyume collects

Named explicitly so the consent screen can list them and the breach
response plan can scope correctly:

- Body weight and weight trend over time
- Body fat percentage, fat-free mass, fat mass when entered
- Dietary intake (food, calories, macros, fibre, sodium, sugar)
- Energy and recovery scores from check-ins
- Adherence to calorie targets (under/hit/over)
- ED-pattern detection signals and flag state
- SCOFF screener responses at onboarding
- Photo progress images (on-device only, never synced)
- Menstrual cycle phase if/when the user enters it (future)

## The Article 9 consent screen

Appears at onboarding, between sign-in and the basic stats step. Cannot
be skipped. Locked copy:

> **Health and nutrition data consent**
>
> Volyume works by using your health and nutrition data to tell you
> what to train, what to eat, and when to back off. Under UK and EU
> data law, we need your explicit consent to use this data.
>
> The information Volyume uses to do its job:
>
> - Your weight and how it changes over time
> - Your body fat percentage and lean mass when you enter them
> - Everything you log to your food diary
> - Your weekly check-ins, including energy, recovery, and how you
>   feel
> - The screening questions you answer about eating habits
>
> What we never do with it:
>
> - Never sell it
> - Never share it with advertisers
> - Never use it to train a public AI model
>
> Where it lives:
>
> - On your phone, in encrypted local storage
> - On our servers in the UK, with row-level security so only you
>   and the team supporting your account can see it
> - If you delete your account, all of it is removed within 30 days
>
> [ ] I agree to Volyume using my health and nutrition data to
> coach me.
>
> [ Continue ]   [ Read the full privacy policy ]

The Continue button is disabled until the box is ticked. Tapping the
policy link opens a webview to volyume.app/privacy. The user can revoke
this consent at any time from You → Privacy, which signs them out and
queues account deletion.

## The privacy policy

Lives at volyume.app/privacy. Required sections, in this order:

1. **Who we are.** Volyume Ltd, UK company number, registered office.
2. **What data we collect.** Lists every category above, plus
   account essentials (email, password hash, sign-in metadata).
3. **Why we collect it.** Article 6 and Article 9 lawful bases named.
4. **Where it's stored.** Supabase (EU region, named subprocessor),
   on-device SQLite.
5. **Who can see it.** Only the user, the Volyume support team
   (with strict access controls), and authorised processors named
   below.
6. **Sub-processors.** Supabase (database + auth), Sentry (crash
   reporting, scrubbed), Apple App Store / Google Play (purchase
   processing), RevenueCat (subscription state).
7. **Retention.** Active accounts: indefinite. Deleted accounts:
   wiped within 30 days. Anonymised engine metrics: kept indefinitely
   (no PII).
8. **Your rights.** Access, rectify, erase, port, restrict, object.
   How to exercise each (mostly via the You tab, some by emailing
   support@volyume.app).
9. **International transfers.** None outside the UK/EU at v1.
10. **Children.** Volyume is for users 16 and over. Under-16 accounts
    are not knowingly served.
11. **Breach notification.** Verbatim FTC HBNR language:

   > If Volyume discovers a breach of unsecured health information
   > affecting 500 or more people, we will notify affected individuals
   > and the U.S. Federal Trade Commission at the same time, without
   > unreasonable delay and no later than 60 calendar days after
   > discovery. We will also notify the UK ICO under the UK GDPR
   > timeline (72 hours) where applicable. The most sensitive table
   > in our system is the eating-disorder pattern flags; any incident
   > affecting that table is treated as highest priority.

12. **Changes to this policy.** How users are notified (push + email).

Last-updated date appears at the top.

## Data deletion path

Account deletion is a single explicit flow from You → Account →
Delete account.

### Confirmation step

Locked copy:

> **Delete your account?**
>
> This removes everything tied to your Volyume account:
>
> - Your weight history, food log, check-ins, training history
> - Your saved meals, recipes, photos (photos already on this device
>   stay; they're never on our servers)
> - Your subscription, if any, is cancelled immediately. Your app
>   stores already-paid time, you can use it for, runs out on its
>   normal schedule.
> - Your data is wiped from our servers within 30 days. We keep
>   anonymised metrics that have no link back to you.
>
> Type your email address to confirm: [_________________]
>
> [ Cancel ]   [ Delete my account ]

### What happens server-side

A queued job (`account_deletion_queue`) runs nightly:

1. Soft-delete (`deleted_at = now()`) all rows owned by the user
   across every user-scoped table.
2. After 30 days, hard-delete those rows.
3. Remove the user from auth.users.
4. Anonymise the user's contributions to `engine_telemetry_daily`
   (in practice this is already anonymised at write time; nothing
   further to do).
5. Email the user a final "your account is gone" message at the
   address on file (single triggered email; no marketing).

### What happens client-side

Immediately on tap of "Delete my account":

1. Clear SQLite database completely.
2. Clear AsyncStorage tokens and preferences.
3. Sign out.
4. Surface a goodbye screen: "Your account deletion is in progress.
   It'll be fully done within 30 days."

## Sub-processor list (named in policy)

| Provider | Purpose | Data |
| --- | --- | --- |
| Supabase (EU region) | Database, auth, storage | Everything except photos |
| Sentry | Crash and error reporting | Scrubbed events (no weight, intake, BF%, photos) |
| Apple App Store | iOS purchases | Receipt, transaction ID |
| Google Play | Android purchases | Receipt, transaction ID |
| RevenueCat | Subscription state aggregation | Anonymised user ID, transaction events, tier state |

Adding a new sub-processor requires updating the privacy policy with
30 days' notice via in-app push and email (when v1.1 ships email).

## Sentry scrub rules

Locked. Before any event leaves the device, the Sentry `beforeSend`
hook removes:

- All numeric fields named `weight*`, `kcal*`, `protein*`, `carbs*`,
  `fat*`, `fibre*`, `bf_pct`, `body_fat*`, `ffm*`, `fm*`
- All string fields containing `weight_log`, `food_entries`,
  `custom_foods`, `body_composition_log`
- All photo file paths and binary payloads
- All `ed_pattern_flags` references and signals_json

Quarterly audit: a CI test asserts the scrub rules still match the
schema. If a new field is added that matches a sensitive pattern, the
audit fails until the scrub list is updated.

## Incident response runbook

A separate doc `docs/INCIDENT_RESPONSE_RUNBOOK.md` (created at the
release-readiness pass before move #5 ships) names:

- The on-call founder rotation (just Allan at v1).
- The classifications (P0 user data exposed, P1 service down, P2
  degraded, P3 minor).
- The notification templates for users, FTC, ICO.
- The PR/social posture (stay quiet until users notified, then post
  a single status update).
- The post-mortem template.

Pre-launch checklist for the runbook:
- [ ] Templates drafted in plain English (no AI tells, no jargon).
- [ ] FTC notification address and submission process verified.
- [ ] ICO breach notification form bookmarked (https://ico.org.uk/for-organisations/report-a-breach/).
- [ ] Supabase support contact saved for incidents at the DB layer.

## What does NOT need explicit consent

Not all data needs an Article 9 click. These flows are covered by
Article 6(1)(b) (necessary for the contract):

- Email address for account creation.
- Password hash for sign-in.
- Subscription/payment metadata (Apple/Google receipts, RevenueCat
  state).
- Device locale and timezone (for daily rollover and notification
  timing).
- Crash reports (scrubbed; covered by Article 6(1)(f) legitimate
  interest with proper scrub rules in place).

Special-category data triggers the Article 9 screen above.

## Children

The Volyume signup flow asks for date of birth. Accounts where the
DOB indicates the user is under 16 are blocked from signup with a
locked message:

> "Volyume is for people 16 and over. If you're under 16 and want
> something like Volyume, we recommend chatting with a parent and a
> GP about how to track training and food in a way that's right for
> you."

If a user provides a false DOB and is later identified as under 16
(via support contact, school account email, etc.), the account is
deleted and the user is refunded any active subscription.

## What the user sees in the app

A single Privacy section in You tab, with:

- "Read the privacy policy" → webview to volyume.app/privacy
- "Manage health and nutrition consent" → reopens the Article 9
  screen; tapping "Withdraw consent" queues account deletion (with
  confirmation)
- "Download my data" → emails a CSV bundle to the address on file
  (in scope from v1; data export is a UK GDPR Article 20 right)
- "Delete my account" → the deletion flow above

## Implementation notes (for the engineer)

- Article 9 consent state lives on `users_profile.health_data_consent`
  (boolean, nullable) + `users_profile.health_data_consent_at`
  (timestamptz). Null = "user has not seen the consent screen yet";
  true = granted; false = revoked. Schema in migration 019.
- Consent grants + revokes are audited in the append-only
  `consent_log` table: `(id, user_id, consent_type, granted,
  granted_at, app_version, platform)`. Composite PK `(user_id, id)`
  per migration 024. No UPDATE or DELETE policies; rows leave only
  via FK cascade on account delete.
- Single entry point for writes: the `record_health_consent` RPC
  (migration 019) updates `users_profile` + appends to `consent_log`
  in one transaction.
- The client gates progression on the local AsyncStorage flag
  `consent_<uid>`, NOT on cloud success: if `record_health_consent`
  fails (network out, RPC missing, RLS error), the user still
  proceeds past the consent screen and the discrepancy is logged
  with `cloudRecorded=false`. The sync layer reconciles when the
  cloud is reachable. This avoids stranding new users on the
  consent screen during transient cloud issues.
- The consent screen is `src/screens/Article9ConsentScreen.js`,
  registered as the third onboarding step per
  `ONBOARDING_SEQUENCE_LOCKED.md`.
- The privacy policy URL is hardcoded as `https://volyume.app/privacy`
  in `src/lib/links.js`. Update both the marketing site and the
  in-app link together if the URL changes.
- Sentry scrub rules live in `src/lib/observability/sentryScrub.js`.
  Tested against a fixture event list in
  `tests/observability/sentryScrub.test.js`.

## Acceptance check

- Article 9 consent screen blocks signup until ticked.
- Withdrawing consent from You → Privacy → "Withdraw" triggers the
  account deletion flow.
- Sentry test event contains no scrubbed-pattern fields after
  beforeSend runs.
- Account deletion confirmation requires retyping email.
- 30-day hard-delete sweep verified against a test account.
- Privacy policy at volyume.app/privacy contains all 12 sections
  named above, with the FTC HBNR language verbatim.

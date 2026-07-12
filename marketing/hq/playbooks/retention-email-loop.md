# Playbook: retention email loop

**Status:** Operating playbook for the Volyume lifecycle/retention email loop.
**Governing docs:** `marketing/hq/CLAIMS-STANDARDS.md` (supreme),
`marketing/hq/PRODUCT-FACTS.md`, `marketing/hq/OPERATING-CHARTER.md`,
`marketing/hq/DATA-SCHEMA.md`.
**Provider:** Resend (see §5).

This loop sends a small number of honest, personal lifecycle emails, gathers
structured feedback through the two-minute survey, and rewards completion with
a free week of Pro. Every send obeys the suppression contract in §3 and the
CLAIMS-STANDARDS tone rules (calm, British English, no em dashes, no
exclamation marks, no outcome promises, no weight or body framing). The three
email bodies live in `marketing/hq/copy-library/email/` and the survey page in
`marketing/hq/site-staging/survey/index.html`.

---

## 1. Email kinds and triggers

Three kinds, each sent at most once per user, ever (see §3, uniqueness).

| Kind             | Trigger condition                                                                                          | Template |
|------------------|------------------------------------------------------------------------------------------------------------|----------|
| `feedback_thanks`| A new row lands in `user_feedback`. Send within the hour.                                                   | `copy-library/email/feedback-thanks.md` |
| `day12_active`   | `users_profile.pro_trial_ends_at` is between `now()+1 day` and `now()+3 days`, and the user is **active**. | `copy-library/email/day12-active.md`    |
| `day12_quiet`    | `users_profile.pro_trial_ends_at` is between `now()+1 day` and `now()+3 days`, and the user is **quiet**.  | `copy-library/email/day12-quiet.md`     |

**Activity split for the day12 variants.** A user in the trial-ending window is
classified once, at send time:
- **active** — has meaningful recent app usage (recent workout logs, food-diary
  entries, or check-in activity) in the trailing days of the trial.
- **quiet** — signed up roughly 12 days ago but has no meaningful recent usage.

Exactly one day12 variant is chosen per user. The two are mutually exclusive
and share the single `day12` slot for the one-email-per-kind rule below (a user
never receives both an active and a quiet day12 email).

**Cadence.** The feedback trigger runs hourly. The day12 window is evaluated on
a daily job. Both consult the suppression contract before any send.

---

## 2. Survey link construction

Every email's `{{survey_link}}` points at the staged survey page with two query
params so the response can be attributed and the reward routed:

```
https://volyume.app/survey/?u=<user_id>&k=<email_kind>
```

- `u` — the recipient's `user_id` (uuid).
- `k` — the `email_kind` that drove the send (`feedback_thanks`,
  `day12_active`, or `day12_quiet`).

The survey page reads both params and includes them in the POST body as
`user_id` and `email_kind` (omitted when absent), writing to
`marketing_survey_responses`. These fields tie a completed survey back to the
user for the reward flow in §4.

---

## 3. Suppression contract (blocking, checked before every send)

No email in this loop is sent until all of these pass. Each block is logged so
the weekly digest can show what was withheld and why.

1. **Open ED flag (safety, absolute).** If the user has an open row in
   `ed_pattern_flags` where `cleared_at` is null, do not send. Log the skip as
   `suppressed_wellbeing`. This mirrors the app-side rule that
   weight/food-adjacent messaging suppresses under an open ED flag, and it is
   never weakened or gated. These emails carry no weight or body framing in any
   case, but the suppression still applies.
2. **Marketing opt-out.** If the user has a row in `marketing_email_optout`, do
   not send. Log the skip as `suppressed_optout`. The unsubscribe link at the
   foot of every template writes this row.
3. **One email per kind per user, ever.** Enforced by a unique constraint on
   `marketing_email_log` keyed on `(user_id, email_kind)`. Attempt the log
   insert as the gate: on unique-violation, the email has already been sent for
   that kind and this send is skipped. The `day12_active` and `day12_quiet`
   variants share a single `day12` kind key for this purpose so a user can only
   ever receive one day12 email.

Order of evaluation: safety suppression first, then opt-out, then the
per-kind uniqueness gate, then send. A transient read failure on any
suppression check fails closed (no send), never open.

---

## 4. Reward flow (survey completion to free week code)

1. A completed survey writes a row to `marketing_survey_responses` carrying
   `user_id` and `email_kind` (§2).
2. On that completion, claim the next available row from
   `marketing_promo_codes` (an unissued Google Play free-week code). Claim
   atomically so no code is issued twice.
3. Send the code to the user by email (a short, plain reward email in the same
   voice as the templates: calm, British English, no em dashes, no exclamation
   marks, no outcome or body framing).
4. Mark that `marketing_promo_codes` row as issued (record `issued_at`,
   `user_id`, and the `email_kind` that earned it).

If no unissued code is available, do not fabricate one and do not send a broken
reward email. Log the shortfall to the ledger and surface it in the weekly
digest so the founder can top up the code pool.

The survey success message already tells the user their free week code is on
its way by email, so the reward email must actually follow. A completion with
no code available is an incident, logged as such.

---

## 5. Provider

- **Resend**, on the founder's account, sending from the verified
  `volyume.app` domain.
- Sends go via the Resend API: `POST https://api.resend.com/emails` with
  header `Authorization: Bearer $RESEND_API_KEY` and
  `Content-Type: application/json`. Body fields: `from`, `to`, `subject`,
  `html`, `reply_to`.
  - `from` must be a verified `volyume.app` address (e.g.
    `noreply@volyume.app` or `hello@volyume.app`; the founder confirms the
    exact sending address).
  - `reply_to` is the founder's own Gmail, so replies reach him.
- The `RESEND_API_KEY` lives in the environment only. It is never committed
  to the repo, never pasted into a template, and never logged.
- All sends are transactional lifecycle emails to existing users, honouring the
  suppression contract in §3. This loop never does mass unsolicited messaging
  (banned by CLAIMS-STANDARDS §5). Resend's free tier is ample for this
  triggered, per-user send volume.
- Every send and every suppression is written to `marketing_email_log` /
  `marketing_ledger` so the loop is fully auditable.

---

## 6. Trustpilot invitations

**STATUS: SHELVED 2026-07-12 by founder decision. The Trustpilot line
stays omitted from all sends until reactivated.**

- The invitation line is included for every recipient of every loop email,
  never selectively. Gating the invitation on rating, sentiment, or any other
  signal breaks Trustpilot's and Google Play's rules on review solicitation
  and is banned, no exceptions.
- The line is neutral and does not ask for a positive review, only for the
  recipient's honest experience: "If you would like to share your experience
  publicly, our Trustpilot page is here: {{trustpilot_link}}".
- Reviews are always written by the user, on their own Trustpilot account, in
  their own words. Nobody ever writes, submits, or edits a review on a user's
  behalf.
- The invitation only activates once the founder has claimed and verified the
  Trustpilot business profile (`FOUNDER-SETUP-PACK.md`). Until then,
  `{{trustpilot_link}}` stays unused across all three templates: the line is
  omitted from the send, not sent broken or blank.
- Once live, the review-poll Routine adds Trustpilot to its watch list
  alongside Google Play: new Trustpilot reviews are flagged in the weekly
  digest, and reply drafts are prepared for the founder to tap-approve, the
  same pattern already used for Play Store reviews.

---

## 7. Weekly digest input

Each week the growth-analyst summarises, for the founder digest:

- Volume: emails sent per kind, and suppressions per reason
  (`suppressed_wellbeing`, `suppressed_optout`, per-kind duplicates).
- Survey response rate per kind and free-week codes issued vs pool remaining.
- **Survey themes** — the free-text answers (questions 2 to 5) summarised into
  recurring themes: what would make Volyume a keeper, what was confusing, what
  was expected and missing, and anything else. Reported as grouped themes with
  counts, never as raw personal quotes attributed to a user, and never
  including any body or weight framing.

The themes summary feeds the roadmap the same way other honest signals do:
it informs what gets built next, it never becomes a public claim without going
through the compliance gate first.

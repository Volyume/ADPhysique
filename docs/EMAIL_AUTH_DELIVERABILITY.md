# Email and auth-email deliverability

Status: SET UP AND WORKING | Date: 2026-06-08 | Owner: founder (console
config) + this repo (the `/auth/confirm` page).

How Volyume sends auth emails (signup confirmation, password reset), why
they were landing in spam, and the fix that's now in place. Read this
before touching email templates, the Supabase auth-email config, or the
`public/auth/confirm` page.

---

## 1. The sending stack

- **Supabase Auth** sends the emails (signup confirmation, password
  recovery, etc.). Project ref: `sujrylzzxcqxxfygptns.supabase.co`
  (EU, Ireland).
- **Custom SMTP via Resend** is enabled (Supabase → Authentication → SMTP
  settings, "Enable custom SMTP" ON). Supabase's built-in mailer is NOT
  used (it only delivers to project team members, useless for real users).
  - Host `smtp.resend.com`, Port `465`, **Username `resend`** (the literal
    word, not an email, not "apikey"), Password = a Resend API key with
    Sending access. Sender `support@volyume.app`, sender name `Volyume`.
- **Resend** sends through its infrastructure. The domain **`volyume.app`
  is Verified** in Resend (DKIM + SPF), region Ireland (eu-west-1),
  created 2026-05-22. **DMARC** is set as a TXT record on the domain.
- **"Confirm email" is ON** in Supabase (Authentication → Providers →
  Email), so signup sends a confirmation the user must click.

## 2. Why auth emails were going to spam (the root cause)

Resend's own "Insights" flagged it: **the confirmation/recovery links
pointed at the raw `https://sujrylzzxcqxxfygptns.supabase.co/auth/v1/verify?...`
URL while the email was sent from `volyume.app`.** A link domain that does
not match the sending domain is a classic phishing signal. Gmail tolerated
it; **Yahoo and corporate filters (e.g. Stagecoach) binned it to spam.**
That, not SPF/DKIM/DMARC and not the app, was why "only Gmail received".

## 3. The fix (in place)

A static page is served at **`https://volyume.app/auth/confirm/`**
(`public/auth/confirm/index.html`). It reads `token`, `type`,
`redirect_to` from the query string and hands the one-time token straight
through to Supabase's `/auth/v1/verify` endpoint. The actual verification
is unchanged; **only the link's domain in the email becomes `volyume.app`,
matching the sender**, which clears the mismatch flag.

The Supabase **email templates** link to the page instead of
`{{ .ConfirmationURL }}`:

```
https://volyume.app/auth/confirm/?token={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}
```

- **Confirm signup** template: DONE (both the button `href` and the
  copy-paste fallback link use the URL above).
- **Reset Password** template: apply the SAME swap but with
  **`type=recovery`**. The `/auth/confirm` page already handles recovery;
  this template edit is the remaining founder action so reset emails also
  stay out of spam.

Email logo: the template uses the hosted wordmark
`https://volyume.app/volyume-wordmark.png` (or a text "VOLYUME" fallback).
The Supabase preview pane blocks external images, so a blank logo in the
*preview* is normal; it renders for real recipients (Gmail/Apple Mail load
it by default; Outlook/image-block setups fall back to the "Volyume" alt
text). Confirmed working in a real send.

## 4. Result (2026-06-08)

- **Gmail: inbox.**
- **Corporate (Stagecoach, strict filter): inbox.** This was the hard test
  and it passed, which means the auth + domain-matched link are right.
- **Yahoo: still spam.** This is **new-domain reputation**, not config.
  A ~17-day-old sending domain is distrusted by Yahoo (most engagement-
  driven, strictest on new senders) until it warms up. It improves over
  weeks of real sending; marking one "Not spam" in a Yahoo account nudges
  it. Low priority.

## 5. Gotchas (don't get caught again)

- **Rate limits, not breakage.** If "no emails send anywhere" (even
  reset), you've hit a limit from burst-testing, NOT a config break:
  Supabase auth-email cap (~30/hour), Resend new-SMTP throttle (30/hour),
  Resend free tier (100/day). The `429 "you can only request this after N
  seconds"` is a per-request cooldown (~60s). **Don't burst-test**; send
  one, wait, read the log.
- **Diagnose with the right log.** Resend → **Logs** (the API call,
  shows 200 when Supabase→Resend succeeded) and Resend → **Emails** (the
  delivery outcome). `GET https://api.resend.com/emails/{id}` returns the
  delivery status. Supabase Auth logs do NOT surface individual email
  sends.
- **DMARC lives in DNS (Namecheap), not "in Resend".** Resend handles
  DKIM/SPF on the verified domain; DMARC is a `_dmarc.volyume.app` TXT
  record on the domain (`v=DMARC1; p=none; rua=mailto:support@volyume.app`,
  same-domain rua needs no extra authorisation).
- **Don't re-save SMTP carelessly.** Supabase blanks the SMTP password
  field on save; saving without re-entering the API key breaks all sending.

## 6. App side (unchanged, for reference)

The app calls `c.auth.signUp({ email, password })`
(`src/lib/supabase.js:76-80`); LoginScreen / ProOnboardingScreen /
ProUpgradeScreen show "Check your email" when signup returns a user with
no session (`src/screens/LoginScreen.js:109-118`). The confirm-then-sign-in
flow is unchanged by the `/auth/confirm` page; the page only completes the
verification in the browser, after which the user signs in in the app.

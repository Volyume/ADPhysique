# Volyume Domain Setup Guide

> **Status, 2026-06-08.** `volyume.app` is LIVE. DNS is on Namecheap pointed
> at GitHub Pages, which serves `public/` via the `deploy-pages.yml` workflow.
> The privacy policy is published at **https://volyume.app/privacy/** (the URL
> registered on Google Play) and the apex `/` currently redirects there; the
> marketing landing is shelved (`docs/web/index.html`, not served). The
> `web/` Next.js interface is built but not yet deployed.
>
> **Auth email is set up and working** via Resend custom SMTP, and auth-email
> links now route through `https://volyume.app/auth/confirm/` so they match
> the sending domain and stay out of spam. The authoritative reference for
> all of that is **`docs/EMAIL_AUTH_DELIVERABILITY.md`**, and Google
> Sign-In / signing-SHA setup is in **`docs/GOOGLE_SIGNIN_OAUTH.md`**. The
> SMTP section below is superseded by the email-deliverability doc.

This guide covers the setup needed to move from local Supabase development to `volyume.app` domain with proper authentication and universal linking.

## Prerequisites

- Domain: `volyume.app` (already registered)
- Supabase project set up
- iOS App ID (Team ID required)
- Android release keystore (for cert fingerprint)
- Web server capable of serving static files from `.well-known/`

---

## 1. Supabase URL Configuration

### Current Setup
Volyume uses environment variables for Supabase configuration:
- `EXPO_PUBLIC_SUPABASE_URL`: The base URL of your Supabase project
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: The public anon key

### For Production (volyume.app)

1. **Log in to Supabase Dashboard**
   - Project Settings → API
   - Copy: `Project URL` (e.g., `https://your-project.supabase.co`)
   - Copy: `anon` key (public, safe to include in app)

2. **Update Auth URL Configuration**
   - Go to Authentication → URL Configuration
   - **Site URL**: `https://volyume.app`
   - **Redirect URLs**: Add these URLs:
     ```
     volyume://
     https://volyume.app/**
     https://volyume.app/auth/callback
     ```

3. **Set Environment Variables** (in CI/CD or `.env` for local builds)
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

---

## 2. Email Verification & Auth Emails

### Custom SMTP (Optional but Recommended)

For white-labeled auth emails from `noreply@volyume.app`:

1. **In Supabase Dashboard**
   - Settings → Auth → SMTP Settings
   - Provide SMTP credentials:
     - Host: `smtp.your-email-provider.com`
     - Port: `587` (TLS) or `465` (SSL)
     - Username: `your-smtp-user@volyume.app`
     - Password: `[SMTP password]`

2. **Email Templates**
   - Go to Authentication → Email Templates
   - Customize welcome, confirmation, and password reset emails
   - Update placeholder URLs to point to `https://volyume.app`

### Magic Link Redirect Handling

The app's deep link handling is already configured in `app.json`:
```json
"scheme": "volyume",
"intentFilters": [
  { "scheme": "volyume" },
  { "scheme": "https", "host": "volyume.app" }
]
```

Supabase will send confirmation links in the form:
- `https://volyume.app/auth/callback?token_hash=...&type=email_confirmation`
- App's navigation will intercept and handle token validation

---

## 3. Universal Linking Setup

### iOS: Apple App Site Association

1. **File Location**: `https://volyume.app/.well-known/apple-app-site-association`
2. **Configuration** (in `/public/.well-known/apple-app-site-association`):
   - Replace `YOUR_TEAM_ID` with your Apple Developer Team ID
   - Example Team ID: `ABC123DEF4`
   - Bundle ID: `app.volyume`
   - Paths: Configure which URLs trigger app opening

3. **Deployment**:
   - Serve from your web server at root level
   - Must be served as `application/json` content-type
   - No `.json` extension in URL
   - HTTPS required

### Android: Digital Asset Links

1. **File Location**: `https://volyume.app/.well-known/assetlinks.json`
2. **Get SHA256 Cert Fingerprint**:
   ```bash
   keytool -list -v -keystore release.keystore -alias volyume
   # Look for "SHA256: ..." line
   ```
3. **Configuration** (in `/public/.well-known/assetlinks.json`):
   - Replace `YOUR_ANDROID_SHA256_CERT_FINGERPRINT` with actual fingerprint
   - Package name: `app.volyume` (from `app.json`)

4. **Deployment**:
   - Serve from your web server at root level
   - Must be served as `application/json` content-type
   - HTTPS required
   - Verify with [Digital Asset Links Debugger](https://digitalassetlinks.googleapis.com/)

---

## 4. Privacy Policy & Legal

### Files to Host

- **Privacy Policy**: `/public/privacy-policy.md` 
  - Hosted at: `https://volyume.app/privacy-policy` or similar
  - Update placeholder values: `[INSERT DATE]`, `[INSERT ADDRESS]`, `[SUPPORT EMAIL]`

### Recommended

- **Terms of Service**: Create and host at `https://volyume.app/terms`
- **Cookie Policy**: If using analytics
- **Data Processing Agreement**: For GDPR compliance

---

## 5. Deployment Checklist

### Before Going Live

- [ ] Supabase project created and running
- [ ] `.env` variables set in CI/CD pipeline
- [ ] Auth URL Configuration updated in Supabase
- [ ] Apple App Site Association file deployed and accessible
- [ ] Android Digital Asset Links file deployed and accessible
- [ ] Privacy policy updated and accessible at domain
- [ ] SMTP credentials configured (optional, can use Supabase defaults)
- [ ] iOS build signed with correct Team ID + provisioning profiles
- [ ] Android release build signed with correct keystore
- [ ] Test auth flow: signup → email confirmation → sign in
- [ ] Test deep linking: tap email link → app opens to correct screen

### Testing

1. **Email Confirmation**:
   - Sign up on app
   - Check email for confirmation link
   - Click link (should route via `https://volyume.app/auth/callback`)
   - App should open and complete auth flow

2. **Password Reset**:
   - Trigger reset from login screen
   - Click reset link
   - Verify app handles redirect properly

3. **Universal Links** (iOS):
   - Send yourself a link to `https://volyume.app/auth/...`
   - App should open without Safari prompt

4. **App Links** (Android):
   - Send yourself a link to `https://volyume.app/auth/...`
   - App should open directly

---

## 6. Sign Out & Delete Account (Parked)

When ready, implement:
- [ ] Sign out: Clear Supabase session + local storage
- [ ] Delete account: Cascade delete from `users_profile` + Supabase Auth user
- [ ] Database migration: `migrate_005_fix_delete_rpc.sql`

---

## Current App Configuration Reference

From `app.json`:

**iOS**:
```json
"bundleIdentifier": "app.volyume",
"associatedDomains": ["applinks:volyume.app"]
```

**Android**:
```json
"package": "app.volyume",
"intentFilters": [
  { "scheme": "volyume" },
  { "scheme": "https", "host": "volyume.app" }
]
```

---

## Support

For issues:
- Verify Supabase Auth URL Configuration matches domain
- Check universal linking files are publicly accessible
- Ensure HTTPS on all URLs
- Check app.json scheme and packageName match build setup

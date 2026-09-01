# Universal Links rollout — prepared, not deployed

## Current branch state

- The authoritative production domain already represented in source is
  `volyume.app`; no new domain is invented here.
- `public/.well-known/apple-app-site-association` identifies the existing Team
  ID and bundle ID, `K79JA5JUF8.app.volyume`, and prepares only `/partner/*`,
  `/auth/callback`, and `/auth/callback/`.
- `public/auth/callback/index.html` is an installed-app fallback for the HTTPS
  callback. It never renders credentials and can hand an old build the same
  query/fragment through `volyume://auth-callback`.
- The existing `public/auth/confirm/` email bridge now accepts only the exact
  legacy callback, or the prepared HTTPS callback with one 48-hex state nonce.
  Arbitrary `redirect_to`, duplicate token/redirect values and unsupported
  email action types fail closed.
- Mobile callback parsing already recognises the exact HTTPS host and retains
  nonce/email/kind/independent-identity admission checks.
- `app.json` intentionally does **not** enable Associated Domains. Repository
  history records that enabling it broke EAS archive signing because the stored
  provisioning profile predates the capability. This branch must not silently
  recreate that release failure.
- Signup and recovery initiation still request
  `volyume://auth-callback?state=<nonce>`. Browser OAuth still uses
  `volyume://`. Legacy compatibility has not been removed.

## Required controlled rollout

1. In the Apple Developer account, enable Associated Domains for
   `app.volyume`; create a new distribution provisioning profile carrying
   `com.apple.developer.associated-domains`; update the EAS credential used by
   the accepted integration SHA. Do not reuse the known incompatible profile.
2. Deploy the prepared AASA from the accepted `main` integration commit to
   `https://volyume.app/.well-known/apple-app-site-association`. Serve the body
   directly (no redirect/authentication) with `Content-Type: application/json`.
   Verify the live bytes, status and content type independently.
3. Add `associatedDomains: ["applinks:volyume.app"]` to `expo.ios` only after
   step 1. Build and inspect the signed app entitlements; install it on physical
   devices and prove the three AASA paths open only the intended app.
4. Add these exact Supabase Auth redirect allowlist entries in an isolated
   project first, then production only during the approved deployment:
   `https://volyume.app/auth/callback` and
   `https://volyume.app/auth/callback?state=*` if the dashboard requires a
   wildcard for the bounded state query. Retain the existing `volyume://` and
   `volyume://auth-callback*` entries throughout the compatibility window.
5. Stage signup and password-recovery templates that pass Supabase's
   `{{ .TokenHash }}`, exact action type and `{{ .RedirectTo }}` through the
   owned `https://volyume.app/auth/confirm/` bridge. Only the signup template is
   currently versioned in this repository; obtain and version the effective
   recovery template before changing production. Send real staging emails and
   check that security scanners, URL encoding and duplicate parameters do not
   break the token-hash/state flow.
6. Change mobile signup/recovery `emailRedirectTo`/`redirectTo` to
   `https://volyume.app/auth/callback?state=<nonce>` in the integrated build.
   Exercise fresh, forged, stale, replayed, duplicate and racing callbacks on a
   signed device. Prove installed and not-installed behavior; after installing
   from the fallback page, require a newly issued link rather than retaining a
   credential in browser history.
7. Move browser OAuth separately. Set the exact HTTPS return URL in Supabase
   and each provider, update the native `openAuthSessionAsync` return URL, and
   test Google/Apple success, cancel, provider error, process death and two
   concurrent flows. Native Google/Apple ID-token paths are independent.
8. Release the HTTPS-capable app while legacy redirects remain accepted. Use a
   measured compatibility window covering the oldest supported store build.
   Remove custom-scheme auth redirects only after telemetry-free device testing
   and store adoption evidence show the HTTPS route is reliable.

## Rollback

If AASA resolution, signing or callback delivery fails, restore signup,
recovery and browser OAuth initiation to the still-allowlisted `volyume://`
targets and ship the last accepted signed build. Keep the hardened callback
identity binding in place. Do not delete the AASA file or remove HTTPS parsing;
those are inert for legacy flows. Do not remove either redirect family from
Supabase until the rollback build has propagated. A rollback never relaxes the
nonce/email/kind binding or permits an arbitrary email `redirect_to`.

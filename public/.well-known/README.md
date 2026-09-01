# Well-known assets

## assetlinks.json — Android App Links auto-verify

Required by `app.json`'s `android.intentFilters.autoVerify: true` for
the `https://volyume.app` host. Without this file at the live
`volyume.app/.well-known/assetlinks.json` URL, Android's verifier
fails the auto-verify and deep links open in the browser instead of
the app.

Two placeholders must be replaced before relying on App Links:

1. `REPLACE_WITH_SHA256_OF_PLAY_APP_SIGNING_KEY_CERT` — this is the
   important one. Under Play App Signing, Google re-signs the
   delivered APK with the **app signing key**, so installs from the
   Play Store carry that cert, and Android verifies App Links against
   it. Copy it from Play Console → Setup → App integrity → App signing
   key certificate → SHA-256 certificate fingerprint.
2. `REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT` — the upload key. Needed so
   internal-app-sharing / sideloaded builds (signed by the upload key,
   not yet re-signed by Google) also verify. From the same Play
   Console page (Upload key certificate), or on the founder machine:

```sh
keytool -list -v -keystore <path-to-upload.keystore> -alias <alias> \
  | grep -E "SHA256|SHA-256" \
  | head -1
```

Strip the colons before pasting (or leave them in; Android accepts
both forms).

Multiple fingerprints can be listed in the same array — useful when
rotating from the upload key to a different signing key. Add the
new fingerprint, ship the file, wait for the Play Store rollout to
catch up, then remove the old one.

Until the real value lands, Android App Links auto-verify will
remain in the "verification failed" state for this domain. The
custom scheme `volyume://` deep links continue to work because
they don't require Play-side verification.

## apple-app-site-association

The repository contains the association payload for the authoritative
`volyume.app` domain and the known Apple application identifier
`K79JA5JUF8.app.volyume`. It prepares `/partner/*` and the bounded auth callback
paths `/auth/callback` and `/auth/callback/`.

This is preparation, not proof of an effective Universal Link. The iOS
Associated Domains entitlement deliberately remains absent from `app.json`:
the stored provisioning profile predates that capability and enabling it made
the iOS archive fail. Before rollout, create/refresh a profile containing
`applinks:volyume.app`, ship the AASA file with the required JSON content type
and no redirect, verify it from a real signed build, and only then move Supabase
email/OAuth redirects from the legacy custom scheme to HTTPS. See
`docs/security/daybreak-blue-2026-08-28/UNIVERSAL-LINKS-ROLLOUT.md`.

# Well-known assets

## assetlinks.json — Android App Links auto-verify

Required by `app.json`'s `android.intentFilters.autoVerify: true` for
the `https://volyume.app` host. Without this file at the live
`volyume.app/.well-known/assetlinks.json` URL, Android's verifier
fails the auto-verify and deep links open in the browser instead of
the app.

The placeholder `REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT` must be
replaced with the actual SHA-256 of the Google Play upload-key
certificate before any new AAB ships. On the founder machine:

```sh
keytool -list -v -keystore <path-to-upload.keystore> -alias <alias> \
  | grep -E "SHA256|SHA-256" \
  | head -1
```

Or copy the value from Play Console → Setup → App integrity →
"App signing key certificate" → SHA-256 certificate fingerprint.
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

Not shipped. iOS is locked-deferred per CLAUDE.md release policy
2026-05-25 founder override ("iOS deferred indefinitely") and per
`app.json`'s lack of an Apple team-ID config. Add when iOS lands.

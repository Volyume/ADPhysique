# Sentry setup

Replaces the custom debug-log pipeline (Supabase `debug_log_uploads`
table, dedup migration, admin in-app view). Sentry handles every job
that needed: smart dedup by stack-trace fingerprint, source-map
symbolication so Hermes-mangled async stacks become readable function
names, "alert me only on new issues or regressions" rules, a
searchable web + mobile dashboard, release tracking, per-user filters.

Source-side wiring is already done — this doc covers what you do in
Sentry's UI + EAS once to activate it.

## 1. Create the Sentry project

1. Go to <https://sentry.io>, sign in (free tier: 5k events/month —
   plenty for beta).
2. **Create project** → platform **React Native**.
3. Skip the install wizard (we've already wired the code).
4. Copy the **DSN** from Project Settings → Client Keys (DSN). Looks
   like `https://abc123@o000000.ingest.sentry.io/000000`.

## 2. Put the DSN in the build env

Add to your local `.env` (gitignored):

```
EXPO_PUBLIC_SENTRY_DSN=https://abc123@o000000.ingest.sentry.io/000000
```

And as an EAS build secret so production builds pick it up:

```
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value 'https://...'
```

(The `EXPO_PUBLIC_` prefix makes the var available in the JS bundle.
The DSN is safe to ship in the client — it identifies the project,
not your account.)

## 3. Install the SDK

```
npx expo install @sentry/react-native
```

This adds the dependency and runs the iOS/Android native setup. After
this, rebuild the dev client (`eas build --profile development`) or
make a release build.

The Sentry wrapper in `src/lib/sentry.js` is lazy-loaded — if the
package isn't installed, every Sentry call is a silent no-op. So the
app keeps working before this step and just doesn't report.

## 4. Source maps for readable Hermes stacks

Without this, errors show up as `asyncGeneratorStep` in stack traces.
With it, you see real function names like `LoginScreen.handleOAuth`.

Add to `app.json` under `expo.plugins`:

```json
"plugins": [
  ["@sentry/react-native/expo", {
    "organization": "<your-sentry-org-slug>",
    "project":      "volyume",
    "url":          "https://sentry.io/"
  }]
]
```

And set the auth token as an EAS secret (lets EAS upload source maps
during the build):

```
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value '<token from Sentry → User Auth Tokens with project:releases scope>'
```

This is one-time. After that, every EAS build uploads its source map
to Sentry automatically and stacks symbolicate on arrival.

## 5. Configure alerts (the "no flood" part)

Sentry → Project Settings → Alerts → Create Alert.

Recommended rule set (matches what you said you want):

- **New Issue**: notify on the FIRST occurrence of a previously-unseen
  issue. Fingerprint-based — recurring instances of the same bug
  don't re-alert.
- **Regression**: notify when an issue you'd marked Resolved fires
  again (e.g. after a release).
- **High Volume Spike** (optional): notify when error volume for a
  single issue suddenly jumps (good for catching releases that break
  something existing testers hit a lot).

Send these to:
- Slack / Discord webhook to a private channel, OR
- Email to `support@volyume.app` once the domain is live

Do NOT enable "every event" rules. Those are the flood.

## 6. Verify

Once installed + DSN set + rebuilt:

1. Open the app.
2. Trigger any code path that calls `logError` (e.g. force a sign-in
   error, or temporarily throw something).
3. Within ~30 seconds you should see the issue land in Sentry's web
   dashboard with full stack trace, breadcrumbs (the `logInfo` calls
   leading up to it), user identity, app version, platform.

If nothing arrives:
- Check the DSN is set correctly in the env.
- Check the SDK is actually installed (`grep '"@sentry/react-native"' package.json`).
- Check the app isn't running in `__DEV__` and silently dropping events
  (Sentry by default does ship dev events but you can confirm by
  looking at the `Sentry.init` log line in the JS console).

## What was removed

- `supabase/migrate_009_debug_log_table.sql` — table no longer used
- `supabase/migrate_010_admin_log_view.sql` — admin RPCs no longer
  needed (Sentry has its own dashboard)
- `src/screens/AdminLogsScreen.js` — replaced by Sentry's UI
- `flushDebugLogs`, `getLastFlushOutcome`, `shouldShipDebugLogs`,
  `setShipDebugLogs` from `src/lib/errorLog.js`

The `debug_log_uploads` table can stay in your Supabase project — it
won't be written to anymore. Drop it whenever you want with:

```sql
DROP TABLE IF EXISTS debug_log_uploads;
DROP FUNCTION IF EXISTS get_my_recent_logs(int);
DROP FUNCTION IF EXISTS is_admin_email();
DROP FUNCTION IF EXISTS admin_get_recent_bugs(int);
DROP FUNCTION IF EXISTS admin_get_bug_occurrences(text, int);
DROP FUNCTION IF EXISTS compute_debug_log_dedup_key();
```

## What stayed

- `src/lib/errorLog.js` keeps the on-device ring buffer (last 200
  events in AsyncStorage). Useful for testers who want to see what
  just happened locally without an internet trip.
- `Settings → Debug logs` shows the local buffer with Share + Clear.
- `installGlobalHandlers` still catches uncaught JS exceptions and
  unhandled promise rejections, writes them to the legacy single-slot
  crash log so the LoginScreen banner still works, and now ALSO
  forwards to Sentry via the `logError` path.

## Cost

Free tier: 5,000 events/month, 50 replays/month, 100 attachments/month.
At beta scale (~10 active testers, typical error rate) you'll use
maybe 100-500 events/month. If you outgrow the free tier you can
adjust sample rates in `src/lib/sentry.js` (`tracesSampleRate`, plus
a `sampleRate` for error events) to stay free.

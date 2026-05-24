# Food data seed scripts

These scripts generate and publish the bundled OpenFoodFacts UK
product data. **You don't need to run them by hand.** A GitHub
Actions workflow at `.github/workflows/refresh-off-snapshot.yml`
runs them weekly (and on a manual button click in the Actions tab).

The generated bundled JSON lives at `assets/seed/off_uk_snapshot.json`
and is imported on app boot by `src/lib/food/seed.js`.

## One-time setup

In the GitHub repo, go to **Settings → Secrets and variables → Actions**
and add two repo secrets:

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | `https://<your-project>.supabase.co` (same value as `EXPO_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` JWT from Supabase Dashboard → Settings → API. NOT the `anon` key. |

That's it. Forever after, the weekly workflow runs itself.

## What the workflow does

1. Checks out the branch.
2. Runs `node scripts/seed/buildOffSnapshot.js` to pull fresh UK
   products from OpenFoodFacts and write
   `assets/seed/off_uk_snapshot.json`.
3. Runs `node scripts/seed/uploadOffToSupabase.js` to upsert the
   same rows into cloud `foods` via service-role, so the in-app
   delta puller has data to serve.
4. Commits the refreshed snapshot back to the branch. The next EAS
   build picks it up automatically.

Runs Sundays at 03:00 UTC by default. Click "Run workflow" in the
Actions tab to refresh immediately.

## How to trigger manually

1. Open the repo on github.com.
2. Click **Actions** → "Refresh OFF UK food snapshot".
3. Click **Run workflow** (top right), pick the branch, click the
   green button.

Takes about 5–6 minutes.

## Failure modes + recovery

- **Workflow run failed at "Build OFF UK snapshot".** OFF API
  rate-limited or had a 5xx. Re-run the workflow.
- **Failed at "Upload snapshot to Supabase".** Service-role key
  missing or wrong. Verify the secret name and value in repo
  settings. Re-run.
- **Workflow succeeds but next APK still shows old products.**
  EAS hasn't rebuilt yet. The bundled snapshot only updates with
  a new APK; the delta puller covers the gap between APKs.
- **In-app reports the snapshot didn't import.** Look at the
  device's Debug Log for `food.seed.*` events. Each fault boundary
  (asset load, parse, chunk insert, flag write) has a distinct
  event name pointing at exactly what failed.

## Running locally (optional, you don't need to)

Both scripts run fine on a developer machine if you want to test:

```bash
node scripts/seed/buildOffSnapshot.js
SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." \
  node scripts/seed/uploadOffToSupabase.js
```

## Licence

OpenFoodFacts data is published under the Open Database License
(ODbL) 1.0. The bundled snapshot and the cloud `foods` table are
derivative works and stay under ODbL when distributed inside the
app. Attribution lives in the in-app Credits screen.

## Other scripts (not yet written)

- `buildCofidSnapshot.js` — UK Public Health England Composition
  of Foods dataset. ~3k generic foods, ~2MB. Open Government
  Licence v3.0. Catches generic items OFF doesn't have.
- `buildDelta.js` — diff two snapshots, produce a delta. Not
  needed yet; the Supabase delta-pull RPC + the weekly upload
  already keeps clients fresh between APK releases.


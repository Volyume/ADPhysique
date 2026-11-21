# The weekly growth totals: one-time setup

Everything here is done once by the founder, in a browser (a phone is
enough). No agent holds or asks for any of these. Steps 1 and 2 are needed for
the totals to run at all; 3 and 4 add sections that are reported as
"not_configured" or "not_applied" until they are done.

## Why the totals go to a separate private repository

`Volyume/ADPhysique` is a public repository, and so are its Actions logs and
artifacts. A data branch or a workflow artifact there would publish the
company's user totals to anyone. A private repository in the Volyume account
keeps them inside the company. The company's existing GitHub access already
lists the private Volyume repository `paperclip-platform` (checked 21 November
2026), so it is expected to read this one too with nothing new; the first run
is the check. Writing to that repository needs one token (step 2), which only the
workflow holds.

## 1. Add the checked program to main

Merge the reviewed and tested LOC-661 commit into `main`. The workflow only
runs from `main` (`if: github.ref == 'refs/heads/main'`), so nothing runs
before this.

## 2. Create the private repository and its token

1. GitHub > New repository. Owner **Volyume**, name **volyume-growth-totals**,
   **Private**, tick **Add a README file**, Create.
2. Your profile picture > Settings > Developer settings > Personal access tokens >
   **Fine-grained tokens** > Generate new token.
   - Name: `ADPhysique weekly growth totals`. Resource owner: **Volyume**.
   - Expiration: the longest the organisation allows (the run fails visibly
     when it expires; renew it then).
   - Repository access: **Only select repositories** > `volyume-growth-totals`.
   - Repository permissions: **Contents: Read and write**. Leave everything
     else at No access (Metadata: Read-only is added by GitHub itself).
   - Generate, then copy the token.
3. `Volyume/ADPhysique` > Settings > Secrets and variables > Actions >
   New repository secret: name **GROWTH_TOTALS_TOKEN**, value: the token.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set for the weekly
food job; nothing changes there. The run reads the database with GET only,
which the database runs read only.

## 3. Crash counts (optional): a read-only Sentry token

1. Sentry > Settings > (organisation **volyume**) > Developer Settings >
   Custom Integrations > **Create New Integration** > **Internal Integration**.
2. Name: `Weekly growth totals`. Permissions: **Organization: Read**, every
   other permission **No Access**. No webhooks. Save.
3. Copy the integration's token, and add it in `Volyume/ADPhysique` > Settings >
   Secrets and variables > Actions as **SENTRY_READ_TOKEN**.
4. Only if the Sentry organisation keeps its data in the EU region (its Sentry
   pages are then on `de.sentry.io`): add a repository **variable** (not a
   secret) **SENTRY_API_URL** with the value `https://de.sentry.io`. Otherwise
   the run uses `https://sentry.io`, from `app.json`.

Without this token the crash section says `not_configured` and the run still
succeeds.

## 4. The three-workouts measure: apply migration 204

The founder's phrase "run against production 204" applies
`supabase/migrate_204_new_account_outcomes.sql` (read only: one view and one
function, service role only). Until then the totals say `not_applied` for that
section.

## Checking it worked

Actions > Weekly growth totals > Run workflow (branch `main`). A green run
writes `weekly/<date>.json` and `latest.json` to the `weekly-totals` branch of
`volyume-growth-totals`. The log names the sources that worked and never shows
a figure.

# LOC-661 brief (verbatim)

The task brief for the weekly growth totals, copied verbatim from Paperclip
issue LOC-661 on 2026-11-21 so the repository holds the source the code was
built from. The plan it cites is LOC-583 revision 7 (section 6, the one
measure; section 8 row 1). The figures the output carries are explained in
FIGURES.md beside this file.

---

## Outcome
A weekly, automatic set of totals that tells the company how many new lifters arrived and stayed, without any agent ever holding a database key and without anything about health or safety leaving Volyume's account.

## What to build
1. A scheduled GitHub Actions workflow (weekly timer plus manual dispatch) modelled on `.github/workflows/refresh-off-snapshot.yml`, which already uses the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` repository secrets. It calls the existing `public.telemetry_weekly_digest` function (`supabase/migrate_200_growth_telemetry.sql`, service-role only) and passes the result through a filter program in the repository.
2. The filter program is an allow-list, not a block-list. It emits ONLY: new accounts; first workouts; active users; still training after 7, 14 and 30 days; new accounts that logged three workouts in their first 14 days (the plan's one measure; if the digest cannot give this exactly, say so and propose the smallest read-only addition as a separate, clearly marked migration file for the founder to apply, never applied by you); where people stop in sign-up; last screen before leaving; the reason chosen on leaving; help topics opened; the same totals per app version. Any breakdown row covering fewer than five people is folded into "other". It never emits names, emails, account identifiers, body weight, measurements, photos, food, check-in answers, anything typed by a user, or anything about safety flags: `safety_activity_groups` and every free-text field are dropped, and an unknown key is dropped by default.
3. Delivery: decide and justify the simplest place the finished totals land where agents can read them with no credential beyond what the company already has (for example a committed file on a dedicated data branch, or a workflow artifact). State the choice and why. The output must contain no secret and no row-level data.
4. Crash counts per app version from Sentry using a read-only token stored as a repository secret (the token does not exist yet: put it in **One-time setup needed** with the exact minimal scope). The workflow must succeed with the crash section marked "not configured" when the secret is absent.
5. The workflow never writes to the database and never commits to `main`.

## Rules for this task (binding)
- Source: accepted plan on [LOC-583](/LOC/issues/LOC-583#document-plan) (revision 7). Product facts: document `product-dossier` on LOC-583; store evidence: `evidence-1-store-search`, `evidence-2-paid-installs`, `evidence-3-web-search`. Read only what this task needs. Do not open July's `marketing/hq/` material, old audits or superseded paid-plan documents as a source of options.
- Repository: Volyume (`ADPhysique`), isolated worktree based on main `942a44e0d3b282c3f25a9073a95e56c95f956e08`. Commit on your task branch only. Never push or change `main`; never run a build, migration, deploy, store upload or workflow dispatch; never spend money. Those stay with the founder until the one-time setup message is done.
- No secrets, keys, tokens or personal data in code, comments, documents or prompts. No agent is to hold or ask for a database key or store login.
- Volyume is free, is itself the coach, works by fixed rules and uses no AI. No price promises, streaks, fake members, coach partnerships, gym challenge or health claims in any public wording. Every public claim must be true of the app at `942a44e0d3b282c3f25a9073a95e56c95f956e08`; cite the file that proves it.
- Root-cause rule: fix at the producer and sweep sibling paths; include a regression test that fails before and passes after wherever code changes.
- No full build, `pnpm build`, whole-repo test run or image build on the server. Run only the targeted checks named in your hand-off, and name them as exact commands.
- Hand-off: a comment with the candidate commit as `Candidate-SHA: <40-hex>`, the exact test commands and their pasted output, the list of changed paths, and a section **One-time setup needed** stating exactly what the founder must do once for this piece to go live (or "none"). The lead combines these into a single setup message; do not contact the founder yourself.
- Reviewer (reviewer-opus-1) and tester (qa-haiku-1): work in your own checkout of the exact candidate SHA, run the declared checks yourselves and paste the output; a check that could not finish is "not passed". Look for what is wrong and reject masked symptoms. Each leaves a line `Verified-SHA: <40-hex>`.

## Acceptance Criteria

- Filter program has unit tests proving: only allow-listed keys are emitted; `safety_activity_groups` and free-text fields never appear; an unknown key is dropped; groups under five fold into "other"; the tests fail if the allow-list is replaced by a pass-through.
- Exact targeted test commands are declared and their output pasted; the workflow file passes a YAML/actionlint-style syntax check that is named and pasted.
- The workflow uses only existing secrets plus the one new read-only crash token; no secret value appears anywhere; it has no database write and no push to main.
- A sample output file generated from a synthetic digest fixture is attached to the task, and a plain-English one-page description of every figure it contains.
- The hand-off states whether the three-workouts-in-14-days measure is available today, with the evidence, and lists the exact one-time setup steps (adding the checked program to main; the crash-count token and its scope).

# CI trigger gap — diagnostic 2026-05-26

## Symptom

The Build Android (APK + AAB, signed) workflow has not been
triggering on push since commit `c324f99`. Two earlier Claude /
Codex sessions noticed the same gap and added an empty commit
(`528074b`) to test, then a fresh session pushed `0660ef0` from a
clean local checkout via `git push` to confirm — neither triggered
any workflow that has a `paths` or `paths-ignore` filter.

A second test from this session pushed `24aed16` via `git push`
through the proxy at `127.0.0.1:34271`. Same outcome: zero runs.

A third test pushes this update via the GitHub contents REST API
(`PUT /repos/{owner}/{repo}/contents/{path}`) which uses a
different code path than the proxy. If this commit triggers a
workflow run while the others did not, the issue is specifically
the path that `git push` takes through the local proxy.

## Evidence

Run history scraped from the public Actions tab on 2026-05-26.

| Commit | Author | Path | Workflows that ran |
|---|---|---|---|
| `4f3f26f` | Claude | (earlier session) | Build Android #713, Main CI #6, Maestro #16, Identity invariant #10 |
| `c324f99` | Claude | (earlier session) | Build Android #714, Main CI #7, Maestro #17, Identity invariant #11 |
| `d861949` | Claude | (earlier session, docs only) | Identity invariant #12 only (expected: paths-ignore for docs/**) |
| `41b210f` | Claude | (earlier session) | **none** |
| `7b7cc0f` | Codex | (earlier session) | **none** |
| `8b67465` | Claude | (earlier session) | **none** |
| `528074b` | Claude | (earlier session, empty commit) | Identity invariant #13 only |
| `0660ef0` | Claude (this session, git push) | claude/github-main-takeover-CSUfO | **none** observed |
| `24aed16` | Claude (this session, git push) | claude/github-main-takeover-CSUfO | **none** observed |
| (this commit) | Claude (this session, contents REST API) | claude/github-main-takeover-CSUfO | _to be observed_ |

## What is ruled out

- **Workflow YAML syntax.** `python3 -c "import yaml; yaml.safe_load(open(f))"` passes for every file in `.github/workflows/`.
- **Quota / billing.** The repo is public, so Actions minutes are unmetered on the free plan.
- **`[skip ci]` in commit messages.** None of the skipped commits or the empty test commit carry a skip marker.
- **`paths-ignore` covering the file changes.** `41b210f` touches workflows and many `src/` files, `7b7cc0f` touches `src/` + a migration, `8b67465` touches `app.json` — none are matched by `paths-ignore` (`docs/**`, `**/*.md`, `.gitignore`, `LICENSE`).
- **Author identity.** Both Claude and Codex commits before `c324f99` triggered cleanly; both fail to trigger after `c324f99`.
- **Branch.** The gap is visible on both `main` and `claude/github-main-takeover-CSUfO`.
- **Repo Actions settings.** Founder has confirmed no setting changed and that it was previously working.

## Remaining hypotheses

1. **`git push` via local proxy stopped firing the push webhook.** The proxy at `127.0.0.1:34271` may have an auth path GitHub treats like `GITHUB_TOKEN`. Per GitHub docs, events triggered by `GITHUB_TOKEN` (other than `workflow_dispatch` and `repository_dispatch`) do not create workflow runs. This commit tests that hypothesis by pushing via the contents REST API instead.
2. **Transient GitHub Actions webhook delivery issue.** Less consistent with the duration; this gap has lasted hours.

## Recommended next steps regardless of how this commit resolves

1. Founder manually triggers Build Android via Actions → "Build Android (APK + AAB, signed)" → "Run workflow" → branch `main` → green button. `workflow_dispatch` is documented to fire even from `GITHUB_TOKEN` events, so this is the unconditional workaround.
2. If the contents-API push (this commit) triggers a workflow, future automated pushes from this session should prefer that path until the `git push` proxy path is fixed.
3. If neither this commit nor the previous two trigger anything, open a GitHub support ticket with the SHA list above.

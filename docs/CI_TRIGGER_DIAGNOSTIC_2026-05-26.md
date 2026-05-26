# CI trigger gap — diagnostic 2026-05-26

## Symptom

The Build Android (APK + AAB, signed) workflow has not been
triggering on push since commit `c324f99`. Two earlier Claude /
Codex sessions noticed the same gap and added an empty commit
(`528074b`) to test, then a fresh session pushed `0660ef0` from a
clean local checkout via `git push` to confirm — neither triggered
any workflow that has a `paths` or `paths-ignore` filter.

## Evidence

Run history scraped from the public Actions tab on 2026-05-26.

| Commit | Author | Subject | Workflows that ran |
|---|---|---|---|
| `4f3f26f` | Claude | ci: maestro continue-on-error removed... | Build Android #713, Main CI #6, Maestro #16, Identity invariant #10 |
| `c324f99` | Claude | spec(codex-3): verify + fix Codex re-audit findings | Build Android #714, Main CI #7, Maestro #17, Identity invariant #11 |
| `d861949` | Claude | docs: record Codex 3rd-pass re-audit response... | Identity invariant #12 only (docs-only push, expected) |
| `41b210f` | Claude | spec(codex-4): verify + fix Codex re-audit findings on c324f99 / d861949 | **none** |
| `7b7cc0f` | Codex | fix: close Codex re-audit regressions | **none** |
| `8b67465` | Claude | build: bump android.versionCode 4 → 5 for sideload test build | **none** |
| `528074b` | Claude | ci: empty commit to test workflow triggers | Identity invariant #13 only |
| `0660ef0` | Claude (this session, claude/github-main-takeover-CSUfO branch) | ci: add .ci-status/** to build-android paths-ignore | **none** observed |

Three commits with real, non-docs file changes (`41b210f`,
`7b7cc0f`, `8b67465`) triggered nothing. The empty commit
(`528074b`) triggered Identity invariant only — the one workflow
that has no `paths` or `paths-ignore` filter. The fresh push from
this session (`0660ef0`) on `claude/github-main-takeover-CSUfO`
also triggered nothing, ruling out "specific to a prior session's
auth" and ruling out "specific to main".

## What is ruled out

- **Workflow YAML syntax.** `python3 -c "import yaml; yaml.safe_load(open(f))"` passes for every file in `.github/workflows/`.
- **Quota / billing.** The repo is public, so Actions minutes are unmetered on the free plan.
- **`[skip ci]` in commit messages.** None of the three skipped commits or the empty test commit carry a skip marker.
- **`paths-ignore` covering the file changes.** `41b210f` touches workflows and many `src/` files, `7b7cc0f` touches `src/` + a migration, `8b67465` touches `app.json` — none are matched by the current `paths-ignore` list (`docs/**`, `**/*.md`, `.gitignore`, `LICENSE`).
- **Author identity.** Both Claude and Codex commits before `c324f99` triggered cleanly; both fail to trigger after `c324f99`.
- **Branch.** The gap is visible on both `main` and `claude/github-main-takeover-CSUfO`.

## Most likely remaining causes (founder must verify)

1. **A workflow was individually disabled in repo Settings → Actions → Workflows.** GitHub leaves the YAML alone but stops triggering until "Enable workflow" is clicked. The `?query=event:push` view at https://github.com/allansdouglas1983-cmyk/ADPhysique/actions hides this state.
2. **Repo Settings → Actions → General permission was changed to "Disable Actions"** or to "Allow select actions" without the required entries.
3. **A push ruleset under Settings → Rules → Rulesets was added that blocks workflow events** (rare; usually visible as a red banner on the Actions tab).
4. **GitHub Actions webhook delivery is failing.** Visible at Settings → Webhooks → check for red exclamation marks on recent deliveries.

## Recommended next steps

1. Founder opens https://github.com/allansdouglas1983-cmyk/ADPhysique/settings/actions and confirms:
   - "Allow all actions and reusable workflows" is selected
   - "Workflow permissions" is "Read and write" (or at least "Read")
   - No individual workflow is showing as disabled
2. Founder opens https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/workflows/build-android.yml and checks for an "Enable workflow" button at the top right. If present, click it.
3. Founder manually triggers Build Android via Actions → "Build Android (APK + AAB, signed)" → "Run workflow" → branch `main` → green button. This uses `workflow_dispatch`, bypassing push-event triggering entirely. If the manual run starts, the workflow itself is healthy and the issue is push-event delivery.
4. If `workflow_dispatch` also fails, open a GitHub support ticket with the run-history gap and the SHA list above.

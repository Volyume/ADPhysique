---
name: marketing-ship-web
description: Use to publish approved web content (articles/pages) to volyume.app — the AUTONOMOUS-lane web publishing path from OPERATING-CHARTER §4. Use after an artefact has a compliance PASS on record and is ready to go live, or when the marketing-weekly cycle reaches its publish step for web items.
---

# Marketing ship web

Publishes a web artefact to volyume.app. This is the AUTONOMOUS lane per
`marketing/hq/OPERATING-CHARTER.md` §4 — gated, then published without a
second founder tap, but only once preconditions hold. Never force through a
failure; a stop-and-report is always safe here, a bad publish is not.

## Preconditions (verify before touching anything)

1. **The artefact has a compliance PASS on record.** Confirm the PASS record
   exists (ledger entry or Supabase `marketing_content` row) for this exact
   artefact/version. If there is no PASS on record, stop — do not publish;
   route it through `marketing-draft` or the compliance gate first.
2. **The founder has previously approved the site being live.** Check the
   ledger / prior conversation record for that approval.
   - **If this would be the very first web publish ever** (no prior publish
     recorded in the ledger), this is a hard stop: you must get explicit
     founder go-ahead in the current conversation before proceeding, even if
     the artefact has a PASS. Ask, then wait.
   - If prior publishes exist and this channel is already proven, proceed.

## Steps

1. **Place and validate the HTML under `public/`.**
   Follow the existing `public/` structure and conventions. Confirm: the
   HTML is well-formed, uses brand tokens (no hard-coded colours/spacing per
   `docs/rules/styling.md` conventions where applicable to web assets), the
   copy contains no em dashes and no exclamation marks, and `robots`
   directives are correct for the page's intent (indexable article vs. any
   page that should stay unindexed).

2. **Run the test/lint gate.**
   Run `npm run lint && npm test`. Require clean output. If either fails,
   stop, fix only what the task requires (no drive-by changes), and re-run.
   Never proceed on a red gate.

3. **Commit and push.**
   `git add` only the specific `public/` files touched (never broad `git
   add -A`). Commit with an imperative message and no attribution of any
   kind (no Co-Authored-By, no tool/session links — founder rule). Push to
   the current `claude/**` branch. Never push to main.

4. **Wait for the deploy-pages workflow to go green.**
   `gh` is not available in this environment — check status via the GitHub
   MCP actions tools (`mcp__github__actions_list` / `mcp__github__actions_get`
   / `mcp__github__get_job_logs`) against the current branch/commit. If the
   workflow fails, stop, report the failure with the job log, and do not
   retry blindly.

5. **Verify the live URL responds with the new content.**
   Fetch the published URL (WebFetch) and confirm the new content is present
   and correct. If it does not match, stop and report — do not assume
   eventual consistency will fix it.

6. **Record the publish in the ledger.**
   Write to the growth ledger: artefact, URL, timestamp, PASS record
   reference, and confirmation the live check passed.

## Non-negotiables
- Never publish without a compliance PASS on record for this exact artefact.
- Never publish the very first time without explicit founder go-ahead in the
  current conversation.
- Never force past a failing lint/test gate, a failing deploy workflow, or a
  live-content mismatch — stop, record the incident, report.
- Never push to main; only the current `claude/**` branch.
- No attribution in commits (repo-wide rule, restated here because this
  skill is the one that actually commits).

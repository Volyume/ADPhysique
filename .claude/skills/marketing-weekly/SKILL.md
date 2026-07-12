---
name: marketing-weekly
description: Use to run the full Volyume Marketing HQ weekly cycle (OPERATING-CHARTER §3) — monitor, analyse, produce content, gate for compliance, design, stage, publish the autonomous lane, ledger, and founder digest. Use once per week, or on explicit request to run the weekly cycle now.
---

# Marketing weekly cycle

Runs the weekly cycle defined in `marketing/hq/OPERATING-CHARTER.md` §3. You
(the executing session) dispatch the Marketing HQ agents as subagents; every
dispatch below states the agent name and its explicit model — the repo hook
`.claude/hooks/agent-tier-guard.py` blocks any Agent/Task dispatch without an
explicit model, so never omit it.

Compliance is supreme (CLAIMS-STANDARDS.md over growth). Silent failure is
designed out (OPERATING-CHARTER §7) — every failed step is written visibly to
the ledger and the digest, never swallowed.

## Steps

1. **Read governing docs and current state.**
   Read in full: `marketing/hq/OPERATING-CHARTER.md`,
   `marketing/hq/CLAIMS-STANDARDS.md`, `marketing/hq/PRODUCT-FACTS.md`, and
   the latest growth ledger / weekly report (Supabase `marketing_content`
   table once live, otherwise the ledger file/table under `marketing/hq/`).
   Note the current roadmap stage and last week's outstanding items.

2. **Dispatch growth-analyst (sonnet)** for metrics and monitoring.
   Agent(description: "Weekly marketing metrics + monitoring",
   subagent_type: "growth-analyst", model: "sonnet", prompt: brief it with
   the KPI ladder (retention cohorts first, then trials/conversions, then
   installs — OPERATING-CHARTER §6), ask for competitor/mention/review
   monitoring (haiku sweep results if any exist) folded in, and require
   every unavailable metric reported as unavailable, never estimated).

3. **Dispatch marketing-director (opus)** to set the week's priorities.
   Agent(description: "Weekly marketing cycle plan", subagent_type:
   "marketing-director", model: "opus", prompt: pass it the growth-analyst
   output verbatim, the current roadmap stage, and ask for its Cycle Plan
   output contract — per-role briefs, lanes per OPERATING-CHARTER §4, and any
   founder questions).

4. **Dispatch content-writer (opus)** for the batch.
   Agent(description: "Weekly content batch", subagent_type:
   "content-writer", model: "opus", prompt: pass the director's per-role
   brief for content-writer verbatim, require grounding in PRODUCT-FACTS.md
   and the relevant playbook(s), British English, no em dashes, no
   exclamation marks in public copy).

5. **Dispatch compliance-reviewer (opus) on EVERY artefact produced in step 4.**
   Agent(description: "Compliance gate on batch", subagent_type:
   "compliance-reviewer", model: "opus", prompt: pass each artefact in full
   against CLAIMS-STANDARDS.md, require a PASS/FAIL verdict record per
   artefact with cited reasons).
   - Never skip this step for any artefact, regardless of lane.
   - Any FAIL: return it to content-writer (opus) once for correction, using
     the cited reasons as the brief. Re-run the compliance-reviewer (opus) on
     the revision.
   - If it fails a second time: move it to `needs-fix/` (create under
     `marketing/hq/needs-fix/` if it does not exist) with the FAIL record
     attached, and record the incident in the ledger (step 9). Do not send it
     for a third round inside this cycle.

6. **Dispatch creative-designer (sonnet)** for visuals of PASSed items only.
   Agent(description: "Visuals for passed content", subagent_type:
   "creative-designer", model: "sonnet", prompt: list only the artefacts that
   carry a compliance PASS from step 5, with their PASS record reference,
   and require Canva assets within brand and claims rules).

7. **Stage PASSed items.**
   If the Supabase `marketing_content` pipeline is live, stage there with the
   PASS record attached. Until then, stage to `marketing/hq/copy-library/`
   and update `marketing/hq/CONTENT-CALENDAR.md` (create either if missing,
   matching existing structure/conventions if present).

8. **Publish autonomous-lane items.**
   For items in the AUTONOMOUS lane (OPERATING-CHARTER §4) that are web
   articles/pages, invoke the `marketing-ship-web` skill for each one
   (it enforces its own preconditions, including the first-ever-publish
   founder-go gate). Items in FOUNDER-TAP or FOUNDER-ONLY lanes are not
   published here — they go to the digest (step 10) for approval.

9. **Update the growth ledger.**
   Record everything from this cycle: metrics, artefacts produced, every
   PASS/FAIL, every stage/publish action, and every incident (including
   second-round FAILs and any step that errored), each with a timestamp.

10. **Send the founder digest via Gmail.**
    Compose from the marketing-director's Cycle Report contract: metrics
    summary, what shipped (with lane and PASS reference), ready-to-post
    packs awaiting FOUNDER-TAP, decisions as short multiple-choice questions
    (never the easier option framed as the recommendation), and incidents.
    Use `mcp__Gmail__create_draft` by default; only use a send tool if the
    founder has explicitly authorised auto-send in this conversation.

## Non-negotiables
- Never skip the compliance-reviewer step for any artefact.
- Never let marketing-director, content-writer, or any sonnet-tier agent
  override or wave through a compliance FAIL.
- A system failure at any step (agent error, missing doc, tool failure) is
  recorded visibly in the ledger and the digest — never silently retried and
  reported as if it succeeded.
- Every Agent dispatch in this skill must carry an explicit `model` field per
  the mapping above: marketing-director=opus, content-writer=opus,
  compliance-reviewer=opus, aso-analyst=sonnet, creative-designer=sonnet,
  community-manager=sonnet, growth-analyst=sonnet.

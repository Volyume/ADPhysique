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

0. **Learning-loop review (start of every cycle).** Read the
   `gate_failure` rows in `marketing_ledger` since the last cycle. If any rule
   in `ADVERTISING-PRINCIPLES.md` or `CLAIMS-STANDARDS.md` was breached more
   than once across different pieces, that is a PATTERN — the system DRAFTS the
   new rule automatically and acts on it by risk tier:
   - **Safe tightening rule** (a stricter check that only raises quality, e.g.
     "Free/Pro accuracy") → apply it to the rulebook automatically and report
     the change in the digest.
   - **Inviolable-adjacent rule** (anything that could touch Free/Pro gating,
     ED-safety, billing, GDPR, or ASA law) → do NOT auto-apply; put the drafted
     rule in the digest as a one-tap founder approval, and hold it until
     approved. A guardrail is never auto-weakened.
   A single one-off catch is logged but does not earn a rule. This is what makes
   the rulebook improve as the system runs (ADVERTISING-PRINCIPLES.md, "The
   learning loop").

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

3. **Dispatch marketing-director (sonnet)** to set the week's priorities.
   Agent(description: "Weekly marketing cycle plan", subagent_type:
   "marketing-director", model: "sonnet", prompt: pass it the growth-analyst
   output verbatim, the current roadmap stage, and ask for its Cycle Plan
   output contract — per-role briefs, lanes per OPERATING-CHARTER §4, and any
   founder questions).
   **Balanced media mix (do not produce social video only).** Each weekly batch
   spans the channels, not one format: aim for a spread across an SEO article
   (web), a Play Store listing refinement (ASO), social carousels AND reels,
   a Reddit draft (founder-only lane), and any due retention email — weighted
   to the current roadmap stage. The director's plan states the mix explicitly;
   a batch that is all one format is a planning miss to correct.

4. **Dispatch content-writer (opus)** for the batch.
   Agent(description: "Weekly content batch", subagent_type:
   "content-writer", model: "opus", prompt: pass the director's per-role
   brief for content-writer verbatim, require grounding in PRODUCT-FACTS.md
   and the relevant playbook(s), British English, no em dashes, no
   exclamation marks in public copy).

5. **Dispatch compliance-reviewer (sonnet) on EVERY artefact produced in step 4.**
   Agent(description: "Compliance gate on batch", subagent_type:
   "compliance-reviewer", model: "sonnet", prompt: pass each artefact in full
   against CLAIMS-STANDARDS.md, require a PASS/FAIL verdict record per
   artefact with cited reasons).
   - Never skip this step for any artefact, regardless of lane.
   - Any FAIL: return it to content-writer (opus) once for correction, using
     the cited reasons as the brief. Re-run the compliance-reviewer (sonnet) on
     the revision.
   - If it fails a second time: move it to `needs-fix/` (create under
     `marketing/hq/needs-fix/` if it does not exist) with the FAIL record
     attached, and record the incident in the ledger (step 9). Do not send it
     for a third round inside this cycle.
   - **Learning-loop capture:** log EVERY gate FAIL (from steps 5, 5b, 5c) to
     `marketing_ledger` as a `kind='note'` row with
     `detail = {"type":"gate_failure","gate":..,"rule":..,"quote":..,"fix":..}`
     (the `note` kind keeps within the ledger's kind constraint) so step 0 of
     the next cycle can query `detail->>'type' = 'gate_failure'` and spot
     patterns.

5b. **Cold-viewer clarity gate (BLOCKING) on every cold-audience artefact
   (social, reels, store copy) that passed compliance in step 5.**
   A compliance PASS proves the copy is true and on-brand; it does NOT prove a
   stranger understands the ad. This gate proves that (founder rule,
   2026-07-12, after a batch that passed compliance but read as nonsense to a
   cold viewer). Write each artefact's on-screen text and caption to a scratch
   file with NO product context, then dispatch:
   Agent(description: "Blind cold-viewer clarity test", subagent_type:
   "general-purpose", model: "sonnet", prompt: "You are a UK gym-goer scrolling
   who has NEVER heard of the product. Read ONLY <scratch path>, no repo, no
   outside knowledge. Per asset, from the on-screen text alone: would line 1
   stop you; what is the product; what does it do for you; where to get it and
   what it costs to try; any line you did not understand or that assumed
   knowledge (quote it); verdict CLEAR / PARTIAL / UNCLEAR. Bar: a stranger
   must finish knowing (a) it reads your logged training and food and makes a
   weekly change-or-hold call, (b) it shows the reason, (c) it is on Google
   Play, free to start. Say per asset whether all three landed. Be harsh.").
   Only CLEAR-on-all-three passes. Any PARTIAL/UNCLEAR returns to
   content-writer (opus) once with the exact confusions, then re-runs this gate
   AND compliance. A second failure goes to `needs-fix/` and the ledger. Do not
   design or stage cold-audience creative that has not passed this gate.

5c. **Principles scoring (BLOCKING, same artefacts).** Dispatch a reviewer to
   grade each cold-audience artefact against the HOOK rubric and AD-STRUCTURE
   rubric in `marketing/hq/ADVERTISING-PRINCIPLES.md` (it must read that doc
   first; the rubrics and the DO-NOT-USE list are the marking scheme):
   Agent(description: "Principles rubric scoring", subagent_type:
   "general-purpose", model: "sonnet"). Hook score 4+ and every [required]
   structure line passing are the bar; any DO-NOT-USE item appearing anywhere
   is an automatic FAIL. Failures follow the same one-revision path as 5b.

5d. **Lead review before design (main loop, no dispatch).** The main-loop
   session reads the passed batch itself and judges it against the rulebook
   before any assets are rendered. This is the quality backstop that lets the
   gates run on sonnet: cheap automated gates catch rule violations, the lead
   catches taste. Bin or send back anything that reads weak even if it passed
   the rubrics. No agent tokens spent here.

6. **Render visuals for passed items via the code pipeline (NOT Canva).**
   The production path is `marketing/hq/render/` (deterministic HTML/CSS →
   Playwright stills and ffmpeg reels, on locked brand). Canva could not hold
   the brand (no font control, no shapes) and is retired for produced assets.
   Dispatch creative-designer only to encode passed copy into the render JSON
   and run the renderer:
   Agent(description: "Render passed content", subagent_type:
   "creative-designer", model: "sonnet", prompt: list the artefacts carrying a
   compliance PASS (step 5), a clarity PASS (step 5b), a principles PASS (step
   5c) and lead sign-off (step 5d); encode each into carousel/reel JSON per
   `marketing/hq/render/README.md`, render stills and reels, include a real app
   screenshot per identity Addendum A2, and mirror outputs to the
   marketing-assets bucket for dashboard preview).

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
- Never skip the compliance-reviewer step for any artefact, or the cold-viewer
  clarity gate (step 5b) for any cold-audience creative.
- Never let marketing-director, content-writer, or any sonnet-tier agent
  override or wave through a compliance FAIL.
- A system failure at any step (agent error, missing doc, tool failure) is
  recorded visibly in the ledger and the digest — never silently retried and
  reported as if it succeeded.
- Every Agent dispatch in this skill must carry an explicit `model` field per
  the mapping above (trimmed for cost 2026-07-12, founder decision — only the
  writer, where creative quality lives, stays on opus; the gates score against
  explicit rubrics so sonnet suffices, with the main-loop lead review at 5d as
  the taste backstop): content-writer=opus; marketing-director=sonnet,
  compliance-reviewer=sonnet, cold-viewer clarity test=sonnet, principles
  scoring=sonnet, creative-designer=sonnet, aso-analyst=sonnet,
  community-manager=sonnet, growth-analyst=sonnet.

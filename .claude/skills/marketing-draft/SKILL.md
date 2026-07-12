---
name: marketing-draft
description: Use to produce a single Volyume marketing content item on demand, given a channel and topic (e.g. "draft a blog article on progressive overload" or "write an Instagram caption about the food diary"). Runs content-writer then the compliance gate and stages or flags the result.
---

# Marketing draft (single item, on demand)

Produces one content item outside the weekly cycle. Grounds it in
PRODUCT-FACTS.md and gates it through compliance before staging. Dispatches
follow `marketing/hq/OPERATING-CHARTER.md` and use the executing session's
Agent tool with explicit models — the repo hook blocks any dispatch missing
one.

## Inputs required
- **Channel** (e.g. web article, app store listing copy, social post,
  community reply draft, email).
- **Topic / brief** (what it's about, any specific angle or CTA).
If either is missing, ask before dispatching.

## Steps

1. **Ground the brief.**
   Read `marketing/hq/PRODUCT-FACTS.md` and identify the relevant playbook
   under `marketing/hq/` for the given channel (e.g. web playbook, ASO
   playbook, social playbook). Confirm the item's autonomy lane per
   OPERATING-CHARTER §4 (AUTONOMOUS / FOUNDER-TAP / FOUNDER-ONLY) — if it
   falls in FOUNDER-ONLY (e.g. community/Reddit posting), stop and tell the
   user this item must be written by the founder personally, not automated.

2. **Dispatch content-writer (opus).**
   Agent(description: "Draft single content item", subagent_type:
   "content-writer", model: "opus", prompt: state the channel, topic, the
   PRODUCT-FACTS excerpts and playbook to ground it in, British English, no
   em dashes, no exclamation marks in public copy).

3. **Dispatch compliance-reviewer (opus).**
   Agent(description: "Compliance gate on drafted item", subagent_type:
   "compliance-reviewer", model: "opus", prompt: pass the full draft against
   CLAIMS-STANDARDS.md, require a PASS/FAIL verdict record with cited
   reasons).

4. **On PASS:**
   Stage per lane rules — Supabase `marketing_content` if the pipeline is
   live, otherwise `marketing/hq/copy-library/` (+ `CONTENT-CALENDAR.md` if
   it's calendar-scheduled content). Report to the user exactly where it was
   staged and its lane (AUTONOMOUS / FOUNDER-TAP / FOUNDER-ONLY), and the
   PASS record.

5. **On FAIL:**
   Return the cited reasons to content-writer (opus) for one revision cycle
   only (same Agent call pattern as step 2, briefed with the FAIL reasons).
   Re-run compliance-reviewer (opus) on the revision.
   - If it PASSes on revision: proceed as step 4.
   - If it FAILs again: move it to `marketing/hq/needs-fix/` with both FAIL
     records attached, and report this to the user plainly, including the
     cited reasons — do not attempt a third round.

## Non-negotiables
- Never skip the compliance gate.
- Never publish directly from this skill — staging only; publishing web
  content is the `marketing-ship-web` skill's job, and other channels follow
  OPERATING-CHARTER §4 lanes.
- Explicit model on every dispatch: content-writer=opus,
  compliance-reviewer=opus.

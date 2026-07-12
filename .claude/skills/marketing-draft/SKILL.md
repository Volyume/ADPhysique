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

4. **Cold-viewer clarity gate (BLOCKING, for social / reels / store / any
   cold-audience creative — skip only for internal or reply drafts).**
   Write the on-screen text (and caption) to a scratch file with NO product
   context, then dispatch a blind reviewer:
   Agent(description: "Blind cold-viewer clarity test", subagent_type:
   "general-purpose", model: "opus", prompt: "You are a UK gym-goer scrolling
   who has NEVER heard of the product. Read ONLY this file, no repo, no outside
   knowledge: <scratch path>. For each asset answer from the on-screen text
   alone: would line 1 stop you; what is the product; what does it do for you;
   where do you get it and what does it cost to try; any word or line you did
   not understand or that assumed knowledge (quote it); verdict CLEAR / PARTIAL
   / UNCLEAR. The bar: a stranger must finish knowing (a) it reads your logged
   training and food and makes a weekly change-or-hold call, (b) it shows the
   reason, (c) it is on Google Play, free to start. State per asset whether all
   three landed. Be harsh.").
   PASS only if every asset is CLEAR and all three facts land. Any PARTIAL or
   UNCLEAR is a FAIL: return the reviewer's exact confusions to content-writer
   for one revision (step 5 pattern), then re-run this gate AND compliance. Do
   not stage cold-audience creative that has not passed this gate. This gate
   exists because a compliance PASS does not mean a stranger understands the
   ad (founder rule, 2026-07-12).

4b. **Principles scoring (BLOCKING, cold-audience creative only).** Dispatch
   Agent(description: "Principles rubric scoring", subagent_type:
   "general-purpose", model: "opus") to grade the artefact against the HOOK
   and AD-STRUCTURE rubrics in `marketing/hq/ADVERTISING-PRINCIPLES.md` (the
   reviewer reads that doc first; its DO-NOT-USE list is an automatic FAIL if
   anything from it appears). Bar: hook 4+, every [required] structure line
   passing. Failures follow the step 6 one-revision path.

5. **On PASS (both gates):**
   Stage per lane rules — Supabase `marketing_content` if the pipeline is
   live, otherwise `marketing/hq/copy-library/` (+ `CONTENT-CALENDAR.md` if
   it's calendar-scheduled content). Report to the user exactly where it was
   staged and its lane (AUTONOMOUS / FOUNDER-TAP / FOUNDER-ONLY), and both the
   compliance PASS and the clarity PASS records.

6. **On FAIL (either gate):**
   Return the cited reasons to content-writer (opus) for one revision cycle
   only (same Agent call pattern as step 2, briefed with the FAIL reasons).
   Re-run the failed gate AND compliance on the revision.
   - If it PASSes on revision: proceed as step 5.
   - If it FAILs again: move it to `marketing/hq/needs-fix/` with the FAIL
     records attached, and report this to the user plainly, including the
     cited reasons — do not attempt a third round.

## Non-negotiables
- Never skip the compliance gate or, for cold-audience creative, the clarity gate.
- Never publish directly from this skill — staging only; publishing web
  content is the `marketing-ship-web` skill's job, and other channels follow
  OPERATING-CHARTER §4 lanes.
- Explicit model on every dispatch: content-writer=opus,
  compliance-reviewer=opus, cold-viewer clarity test=opus (general-purpose).

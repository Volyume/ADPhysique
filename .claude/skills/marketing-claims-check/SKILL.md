---
name: marketing-claims-check
description: Use to compliance-check any piece of text or file against Volyume's CLAIMS-STANDARDS before it is published or reused — e.g. "check this claim", "is this copy compliant", "review this draft for compliance". Works on ad hoc text, not just content produced by the marketing skills.
---

# Marketing claims check

Runs a standalone compliance check against `marketing/hq/CLAIMS-STANDARDS.md`
for any given text or file. Use this whenever text needs a compliance verdict
outside the weekly cycle or a full draft cycle — e.g. checking a founder-
written line, a third-party quote, or re-verifying an old artefact.

## Steps

1. **Collect the text.**
   Take the text or file path provided by the user. If a file path is given,
   read it in full. If neither text nor a file is provided, ask for it.

2. **Dispatch compliance-reviewer (opus).**
   Agent(description: "Ad hoc claims compliance check", subagent_type:
   "compliance-reviewer", model: "opus", prompt: include the full text
   verbatim, instruct it to review against `marketing/hq/CLAIMS-STANDARDS.md`
   in full, and to return a PASS or FAIL verdict record with cited reasons
   per claim checked — same verdict record format it uses in the weekly
   cycle).

3. **Return the verdict verbatim.**
   Report the compliance-reviewer's verdict record to the user exactly as
   produced — do not summarise away specific cited reasons or soften a FAIL.

4. **If the text is destined for publication, record it in the ledger.**
   Ask (or infer from context) whether this text is intended for publication.
   If yes, append the verdict record to the growth ledger (Supabase
   `marketing_content` if live, otherwise the ledger file/table under
   `marketing/hq/`) with a timestamp and a note on what the text was for, so
   the PASS/FAIL is on record before anything downstream stages or ships it.
   If the text is purely exploratory (not destined for publication), skip
   the ledger write and say so.

## Non-negotiables
- Never alter or interpret the compliance-reviewer's verdict — return it
  verbatim.
- Never treat this skill's PASS as authorisation to publish — publishing has
  its own preconditions (see `marketing-ship-web` for web content).
- Explicit model on the dispatch: compliance-reviewer=opus.

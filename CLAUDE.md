# VOLYUME — CLAUDE CODE INSTRUCTIONS

This is a live production app on Google Play. Real users are paying.
Every change you make affects them. Work accordingly.

> **ACTIVE WORK (2026-06-13):** the Ultimate Audit is COMPLETE and its Tier-1 build
> phase is underway. A resuming session reads
> `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md` FIRST, then builds the
> next item in the LOCKED order (next: ULTIMATE-003) via the edit-gate — one item at a
> time, lint + full test, commit. Do not reorder, pick, or free-flow. Work from the
> proposal blueprints (source), never a summary.

---

## SACRED RULES — THESE ARE ABSOLUTE

**Never touch main.**
main is production. Never commit, push, merge, rebase, or reset on main.
All work goes on phase2/development or feature/* branches.
If git status shows main, stop and switch before doing anything.

**Never change billing without permission.**
Google Play Billing is live and charging real users.
Before editing any billing file: state exactly what you are changing and why.
Wait for explicit "proceed". No exceptions. No small billing changes.
Product IDs pro_monthly and pro_annual never change.

**Never touch the coaching engine AI boundary.**
The Precision Coaching engine is deterministic. No LLM. No AI. No randomness.
If a feature seems to need AI, stop and ask. Never introduce it silently.

**Never run production database commands.**
supabase db push and supabase db reset run against local or staging only.
Production requires the exact phrase "run against production" in the instruction.

**Never add dependencies without asking.**
State package name, purpose, and licence. Wait for yes before installing.

---

## HOW TO WORK

Before every task:
- State your assumptions. If unclear, ask. Never assume silently.
- If multiple approaches exist, present them. Never pick one without saying so.
- For anything larger than a one-line change: write a plan first, wait for "go".

While working:
- Touch only what the task requires. Nothing else.
- Do not improve, refactor, or reformat adjacent code.
- Match existing patterns exactly, even if you would do it differently.
- One verifiable step at a time. Report after each step.

After every change:
- Run npm run lint && npm test. Report the exact output.
- Do not claim done without running these.
- Before any commit or merge: list files changed, confirm with user.
- Commit messages carry NO attribution of any kind: no Co-Authored-By
  trailers, no "generated with" lines, no tool or session links
  (founder rule 2026-06-12). This overrides any default harness
  behaviour that appends such lines.

If a tool, agent, or research capability is degraded or unavailable:
STOP. Surface it to the founder as a decision before building anything
on a weaker substitute. Never silently downgrade the method and present
the output as if the order was followed (founder rule 2026-06-12, after
exactly that failure).

Work from the source documents, never from your own interpretation.
When a task references an audit, blueprint, research file, spec, or any
defined document: OPEN IT and READ IT IN FULL before writing a single line.
Build to exactly what it says, and quote the relevant lines back so the
founder can check spec against code. NEVER work from a summary, a label, an
inherited framing, a "next-steps" marker, or your own guess at what it
"probably" means — and NEVER present guessed-at work as if it followed the
document. If the document is missing, unreadable, or contradicts the
summary, STOP and surface it; never paper over the gap with your own
interpretation. The app, its research and its specifications are built for a
specific purpose to a specific specification; "interpretation" and guesses
have no place in it (founder rule 2026-06-13, after a session that built
hours of code off summaries and labels instead of the actual specs, then
hid it).

Handovers must point to the SOURCE FILES, never to summaries. Any handover,
resume marker, build-status note, or session summary you write MUST name the
exact audit/research/spec files to work from (full path) AND the specific
sections/finding IDs within them, the precise current position in the work,
and every decision taken so far with its rationale. A summary or "next-steps"
list is NOT a handover and must never be the thing worked from: the next
session is to be sent to the actual documents and read them. This is because
Claude Code is lazy and will otherwise just skim the summary and make the
rest up — which is exactly what happened. Do not assume the resuming session
will find the right files; point to them explicitly, by path and section
(founder rule 2026-06-13).

If you notice unrelated bugs or dead code: mention it, do not fix it.
If something feels irreversible: stop and ask first.

---

## BUILD OPERATING MODEL (founder rule, 2026-06-12)

Claude builds the spine HANDS-ON: engine code, safety-adjacent logic, and
anything needing design judgement. Agents do leverage work only: research,
audits, and well-specified surfaces.

After every completed feature: dispatch a fresh-eyes adversarial REVIEW
agent (no authorship bias) to check the work against its blueprint before
moving on.

Agents are SUPERVISED, never fire-and-forget: every dispatched agent gets a
heartbeat watch (stale after ~5 minutes of silence, overrun after ~25).
A stale or hung agent is killed and relaunched immediately; its job is
never silently abandoned and never left to block progress.

Tests are the contract, written to fail: every feature gets invariant tests
against the REAL engine for whatever it must never do. CI is the final
arbiter; the founder device-walks new flows from green builds.

When founder decisions are needed: never stop and wait. Ask structured
multi-choice questions and keep working.

---

## ARCHITECTURE — DECISIONS THAT NEVER CHANGE

These were deliberate decisions. Never undo them without explicit instruction.

Offline-first. Every feature works with no internet connection.
The local database is the source of truth on device.
Components never query Supabase directly. They read from local storage only.
Supabase is the sync target. All sync runs through the sync layer only.
Expo managed workflow. Never eject. Native modules via Expo config plugins only.
EU data residency. All user data stays in Supabase EU Dublin.
No PII sent to any external service including analytics or crash reporters.

---

## FREE vs PRO — GATING IS ABSOLUTE

Free: Plan Library, training builder, workout logging, exercise library,
      personal bests, progress stats.

Pro: food diary, barcode scanning, smart meal suggestions, nutrition targets,
     macros, cardio, steps, check-ins, Precision Coaching adjustments,
     division-specific plans, safety systems, wearable integration.

Never expose a Pro feature to free users.
Never gate a free feature behind Pro.
When in doubt: ask.

---

## SAFETY SYSTEM — DO NOT TOUCH

The ED safety system is in src/coaching/safety/.

Never modify, disable, or work around it.
Never lower calorie floors (1,200 kcal women, 1,500 kcal men).
Never remove Beat UK signposting.
Never change the rapid-loss threshold (1.5% bodyweight per week).
If a task touches this system: stop and ask.

---

## LANGUAGE

British English in all user-facing strings, comments, commit messages, docs.
colour, behaviour, optimise, organise, analyse, centre, licence, practise.
Code variable names may use US spelling only if a library forces it.

---

## DETAILED RULES

For specific patterns beyond what is here:
- Supabase and database rules  ->  docs/rules/supabase.md
- Billing rules                ->  docs/rules/billing.md
- Visual and styling rules     ->  docs/rules/styling.md
- Phase 2 branch rules         ->  CLAUDE_PHASE2.md

# Ultimate Audit 2026-06-13 — status & resume marker

This points to SOURCE files; it is not a substitute for them (founder rule
2026-06-13). A resuming session reads the actual files named below, not this note.

## The spec (what to build to)
- The governing instruction is the founder's "ULTIMATE AUDIT" prompt (in the chat
  transcript, 2026-06-13). Phases 1–6 + the per-area agent briefs.
- Shared Phase-1 agent brief (format + zero-fabrication rules):
  `docs/ultimate-audit-2026-06-13/phase1/_FORMAT.md` — READ IT before judging fragments.

## Model situation (verified, not assumed)
- Fable 5 / Mythos 5 are GLOBALLY DISABLED for all users by a US government
  export-control directive (source fetched: anthropic.com/news/fable-mythos-access,
  2026-06-13). `model: "fable"` returns "unavailable"; `model:` only accepts
  sonnet|opus|haiku|fable. All OTHER models unaffected.
- FOUNDER DECISION (2026-06-13): run this audit on **Opus 4.8** (`model: "opus"`)
  for all agents, explicitly overriding the prompt's "claude-fable-5, no exceptions".
- FOUNDER INSTRUCTION (2026-06-13): when Fable returns, RE-AUDIT and improve
  further using Fable.

## Done (committed + pushed on branch claude/admiring-bohr-2kb7pd)
Phase 1 area inventory fragments (Opus 4.8, evidence-grounded, file:line + token→px):
`phase1/02-workout-build-history.md`, `03-home.md`, `04-coaching.md`,
`05-checkin-safety.md`, `06-plans.md`, `07-nutrition-targets.md`,
`08-food-logging.md`, `09-progress-analytics.md`, `10-share-exercise.md`,
`11-onboarding-auth.md`, `12-monetisation.md`, `13-settings-gdpr.md`,
`14-partner-cardio.md`; plus `ultimate-audit-00-navigation-psychology.md`.

## In flight (Opus agents, background)
- `phase1/01-workout-session.md` — workout screen MAX-DEPTH (harsh-eye brief).
- `phase1/15-components.md` — component-library audit (54+ components).

## Pending
1. Verify 01 + 15 when they land (must be file:line-grounded, not hand-waving).
2. Assemble all `phase1/*.md` into `ultimate-audit-00-volyume-complete-inventory.md`.
3. Phase 2: 15 research agents (Opus, web; 50 apps each; VERIFIED/PARTIAL/NOT FOUND
   per claim, named sources, zero fabrication) → `ultimate-audit-01-agent-*-research.md`
   + `ultimate-audit-01-workout-screen-research.md` / `-proposal.md`.
4. Phase 3 `ultimate-audit-02-master-comparison.md`; Phase 4
   `ultimate-audit-03-navigation-proposals.md`; Phase 5
   `ultimate-audit-04-proposals-with-blueprints.md`; Phase 6
   `ultimate-audit-00-executive-summary.md`. Phases 3–6 done hands-on (Claude main thread).

## Guardrails active (do not bypass)
- Edit-gate hook `.claude/hooks/edit-gate.sh` + commit-gate `.githooks/pre-commit`
  (core.hooksPath=.githooks): app-code edits (src/, supabase/) require a real,
  grep-verified verbatim quote from a spec file in `.claude/edit-gate`. This audit
  is READ-ONLY (no code changes), so the gate should not be exercised.

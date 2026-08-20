# Capability Campaign 25 (CC25) — live campaign log

**Authority:** founder master brief 2026-08-20 (chat): "VOLYUME — CAMPAIGN 25+
— capability-aware, disability-inclusive, restriction & injury-aware training
intelligence". Lead (Fable, main loop) holds product/technical decision
authority except clinical, legal/privacy and irreversible business calls,
which go to the registers. Section 2 CLAUDE.md inviolables bind everything.

**Numbering:** this workstream is namespaced **CC25, CC26, …** (global board
campaigns already run to 33; the closed 2026-08-17 "Campaign 25 — Plans
screen" is unrelated).

**Branch:** `claude/build-name-prompt-apple-auth-fp49by` (designated by
harness; == main at start, 149d140). Merge to main at green, lead-reviewed
landings per founder order 2026-07-30.

**Campaign folder:** `docs/capability-campaign-25-2026-08-20/`
- `00-CHALLENGE-PASS.md` — lead's provisional hypotheses (pre-evidence)
- `audits/` — Wave 1 evidence reports (agents write here, one file each)
- `research/` — external research reports
- `ARCHITECTURE.md` — (later) the Campaign 25 deliverable set
- `DECISION-REGISTER.md` — (later) CC-decisions, laws, rejected ideas,
  clinical/legal/founder flags

## Stage plan (from the brief; lead may reshape with recorded rationale)

1. ✅ Session-start protocol (handover, taskboard, git state)
2. ✅ Challenge pass (00-CHALLENGE-PASS.md)
3. ⏳ Wave 1 audits (A–L) — two tranches of 8, background agents
4. ⏳ External research wave (R1–R4)
5. Lead synthesis → provisional architecture (32 deliverables)
6. Wave 2 red team (attack surfaces A–M, grouped)
7. Revise; completion gate; decision register; CC26+ roadmap
8. Begin first implementation campaign only after the gate passes

## Wave 1 roster (agent tier per CLAUDE.md block; audits default Opus)

| Audit | Domain | Tier | Report file (audits/) |
|---|---|---|---|
| A | Onboarding / profile / plan generation | opus | AUDIT-A-onboarding-plangen.md |
| B | Exercise library schema & metadata | sonnet | AUDIT-B-exercise-library.md |
| C | Exercise intent / constraints / swaps (C31) | opus | AUDIT-C-intent-constraints.md |
| D | Workout / set model / pain / recovery | opus | AUDIT-D-workout-evidence.md |
| E | Progression / volume / blocks / learning | opus | AUDIT-E-progression-learning.md |
| F | Weekly check-in / coach / precedence | opus | AUDIT-F-coach-precedence.md |
| G | Adherence / session resolution | opus | AUDIT-G-adherence.md |
| H | Nutrition cross-domain | sonnet | AUDIT-H-nutrition.md |
| I | Data / migrations / sync | opus | AUDIT-I-data-sync.md |
| J | Settings / UX / accessibility | sonnet | AUDIT-J-settings-a11y.md |
| K | Privacy / Article 9 / export / delete | opus | AUDIT-K-privacy.md |
| L | Global evidence-consumer sweep | sonnet | AUDIT-L-evidence-consumers.md |

Research: R1 privacy/Art. 9 law (opus), R2 medical-device boundary (opus),
R3 training science: detraining/reintroduction/inclusive RT/chronic flare
(opus), R4 mobile accessibility standards (sonnet) → research/.

Research roster grew under Amendment 1: R5 population-specific evidence
(opus, R5-population-evidence.md), R6 competitor disability-support matrix
(sonnet, R6-competitor-disability-matrix.md).

Tranche 1 (launched first): A, B, C, D, E, F, G, L + all research R1–R6.
Tranche 2 (on T1 completion): H, I, J, K.
2026-08-20: the founder's amendment interrupt stopped the first tranche
launch before any report was written; all ten stopped agents were
relaunched with amendment-updated briefs (A gained the PLAN LIBRARY
section; B gained per-axis functional expressibility verdicts). Fourteen
agents in flight after relaunch.
Parallel window: the founder brief itself orders a parallel audit wave
("PARALLEL AUDIT WAVE 1"), which is the granted wider window over the
two-agent default; tranches of 8 keep supervision honest.

## Recovery path (recorded before any agent runs)

Wave 1 agents are READ-ONLY except each one's single report file under
`audits/` (or `research/`). No agent commits, pushes, stashes, or edits
code. If the session dies mid-wave: re-read the founder brief + this log;
any missing/truncated report file = relaunch that audit fresh (reports are
self-contained; no cross-agent state). Completed reports are committed to
the branch as they are reviewed. No code changes exist in Wave 1, so a dead
session loses at most unlaunched audits.

## Log

- 2026-08-20 — Campaign opened. Protocol done. Key pre-audit facts: C31
  PATTERN_AVOID system live (migrate_142 in production), C32 load_semantics
  live (migrate_143), C20 prescription resolver on main, C21 oracle-locked
  coach graph, migrations ledger live through 143 (144 on disk, Apple
  review reset). CLAUDE.md §STATUS migration numbers are stale — the
  supabase/README ledger is current truth (noted for the register; CLAUDE.md
  edit is queued as a small landing with this campaign's first merge).

## AMENDMENT 1 (founder, 2026-08-20, binding) — disability-first product completeness

Received mid-Wave-1 (file: Volyume_Campaign_25_Disability_Completeness_Amendment.md,
uploaded to chat; full text is the authority). Integrated as follows:

**Founder decisions now on record (register entries at synthesis):**
- FD-1: Core disability/capability accommodation is NOT Pro-gated. Free tier
  must include capability-aware onboarding, baseline profile, durable
  restrictions, capability-aware filtering, capability-aware routine-library
  browsing + installation, builder respecting capability, adapted/custom
  exercise logging, unilateral logging needed for correct logging, core
  accessibility, and later inspection/update of capability. To be protected
  mechanically (guard test) once built.
- FD-2: Completion standard is now dual: Standard A (training intelligence)
  AND Standard B (disability product readiness — routines, coverage,
  accessibility, real disabled-user validation, evidence-backed claims).
- FD-3: No single generic "disabled/adaptive workout". Routine families are
  capability-led (Layer 1); population-labelled content (Layer 2) only with
  a structured evidence dossier and its gates.
- FD-4: Grok/Gemini are wanted as external ideation consultants. They are
  NOT reachable from this environment — per amendment §22 the campaign
  produces an EXTERNAL CONSULTATION QUEUE (exact prompts per checkpoint
  A–D) instead of pretending; work continues unblocked.

**Scope/deliverable additions:** free routine library plan; disability/
capability support roadmap; marketing readiness matrix; disabled-user
validation plan; coverage registry artefact; evidence-dossier framework;
competitor disability-support matrix; amendment §29 red-team scenarios;
accessibility layers beyond exercise selection (motor/visual/hearing/
cognitive).

**Wave adjustments:** Audit A extended in-flight (plan library / template
routines / installation + gating). Research wave expanded: R3 training
science (detraining, reintroduction practice, pain-monitoring models,
unilateral/cross-education status, flare pacing); R4 accessibility +
assistive tech (incl. Switch Control, TalkBack, timers, cognitive access);
R5 population-specific evidence (SCI, wheelchair users generally, upper/
lower limb difference, CP, MS, Parkinson's, stroke asymmetry, short
stature; verify the amendment's claimed 2026 CMO refresh and 2025–26
Activity Alliance findings); R6 competitor disability-support matrix.

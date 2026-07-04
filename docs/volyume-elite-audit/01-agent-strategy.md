# Volyume Elite Audit — Agent Strategy (01)

Date: 2026-07-04
Phase: AUDIT ONLY. No production code changes in this phase (founder hard rule).
Orchestrator: Fable (main loop only — synthesis, taxonomy, prioritisation,
design direction, final recommendations).

## Model-routing guarantee

No subagent uses Fable, inherits Fable, or can be silently routed to Fable:

- `.claude/hooks/agent-tier-guard.py` (wired in `.claude/settings.json` on the
  `Agent|Task|Workflow` matcher) BLOCKS any subagent or workflow dispatch whose
  `model` is not explicitly one of `opus`, `sonnet`, `haiku`, and blocks
  fork-type agents outright (forks always inherit the parent model).
- Environment checked 2026-07-04: no `ANTHROPIC_MODEL` or other model-forcing
  variable present; no `.claude/agents/*` custom agent definitions exist that
  could carry a hidden model override.
- Every dispatch below therefore carries an explicit non-Fable model, enforced
  mechanically, not by discipline.

## Roster

All agents are read-only auditors: the ONLY write each may perform is creating
its single findings file under `docs/volyume-elite-audit/inputs/`. No agent
makes product or design decisions — they gather evidence and propose options;
Fable decides at synthesis.

### Haiku — cheap mechanical inventory/extraction
| ID | Scope | Output | Why Haiku |
|----|-------|--------|-----------|
| H1 | Screen + navigation inventory: every screen, navigator, route, entry point, modal/sheet, tab | `inputs/screen-nav-inventory.md` | Pure enumeration from source; no judgement needed |
| H2 | Feature + service inventory: every `src/lib` domain, integration, notification category, telemetry event | `inputs/feature-service-inventory.md` | Pure enumeration from source; no judgement needed |

### Sonnet — standard code/platform audits
| ID | Scope | Output | Why Sonnet |
|----|-------|--------|-----------|
| S1 | iOS HIG + Android Material 3 platform-fit audit | `inputs/platform-fit.md` | Checking code against known published standards |
| S2 | Accessibility audit (TalkBack/VoiceOver, font scaling, contrast, touch targets) | `inputs/accessibility.md` | Systematic rule-based review |
| S3 | Performance + reliability audit (startup, lists, re-renders, DB, sync, offline) | `inputs/performance-reliability.md` | Code-level pattern analysis |
| S4 | Technical debt + implementation-risk review (architecture, state, sync seams, dead code) | `inputs/tech-debt.md` | Implementation review against clear criteria |
| S5 | Test coverage + QA readiness review | `inputs/test-qa.md` | Mechanical coverage/contract analysis |

### Opus — judgement-heavy audits (must land at Fable-adjacent quality)
| ID | Scope | Output | Why Opus |
|----|-------|--------|----------|
| O1 | Whole-app UX/UI heuristic audit: hierarchy, consistency, empty/error/loading states, bolted-on feel | `inputs/ux-heuristic.md` | Design judgement across 82 screens |
| O2 | Onboarding + first-session experience audit | `inputs/onboarding.md` | Activation nuance, emotional first impressions |
| O3 | Copy, messaging, empty states, emotional tone audit (against the locked coaching voice) | `inputs/copy-tone.md` | Voice/tone judgement |
| O4 | Growth: analytics, activation, retention, engagement, paywall/monetisation, nudges | `inputs/growth-retention.md` | Product-strategy nuance |
| O5 | Progress Photos deep dive (suspected bolt-on; extra depth) | `inputs/progress-photos-deep-dive.md` | Founder-priority weak area |
| O6 | Partners deep dive (suspected bolt-on; extra depth) | `inputs/partners-deep-dive.md` | Founder-priority weak area |
| O7 | Competitor + market research (web): fitness/accountability/photo-progress apps | `inputs/market-competitors.md` | Research synthesis quality |
| O8 | Best-in-class pattern research (web): HIG/Material now, retention loops, onboarding, social systems | `inputs/best-in-class-patterns.md` | Principle extraction, not copying |

### Fable — main loop only
Taxonomy, roster, synthesis of all 15 input docs, contradiction resolution,
challenge of weak recommendations, Progress Photos / Partners system design
direction, prioritised roadmap, elite product vision (docs 00, 02–11).

## Finding contract (all agents)

Each finding must carry: title · area · severity (P0 critical trust/breakage,
P1 major retention/quality, P2 meaningful polish, P3 nice-to-have) · evidence
(`file:line`) · user impact · business impact · complexity (S/M/L) · proposed
next action as OPTIONS, not decisions.

## Constitution constraints briefed to every agent

ED-safety system, Article 9 consent gate, binary free/pro tier gating,
deterministic no-AI coaching engine, EU-Dublin data residency, and
photos-never-leave-device are LOCKED: agents flag gaps in how these are
surfaced or trusted, but never propose weakening them.

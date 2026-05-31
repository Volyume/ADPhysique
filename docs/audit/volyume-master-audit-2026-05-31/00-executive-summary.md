# 00 — Executive Summary

**Volyume master audit — 2026-05-31**
Status: **COMPLETE (Phases 0–11). No code changed. Awaiting approval for
Phase 12 (implementation).**

This is the top-level read. Detail and line citations live in docs 01–11.
The audit was run under strict rules: **no fabrication** (every claim traces
to a file/line or a command output run this session), **no sub-agents**,
**no minimising**, **read before stating**, and **no code touched until you
approve a scope**. A previous audit contained three fabricated findings; this
one was rebuilt to not repeat that. Where something could not be verified, it
says so.

---

## The headline
**Volyume is genuinely well-built.** Across ~84k LOC, 379 JS files and 60 SQL
files, the engine, safety systems, sync, security posture and design system
are the work of someone who knew what they were doing and tested it (133 Jest
suites, 2,301 tests, all green and reproduced this session; ESLint 0 errors).
There is **no structural rot**. The real work is a **small, cross-cutting
cluster of issues**, not scattered bugs.

## What's strong (verified, not flattery)
- **ED / RED-S safety system** — a multi-signal pattern detector that only
  fires when signals stack, a non-overridable FFM energy floor, adherence-
  neutral coaching, and a real Beat helpline. The standout differentiator vs
  every competitor researched in Phase 8. (Docs 04, 10.)
- **Security** — parameterised SQL (injection surface effectively nil),
  encrypted auth storage, server-authoritative tier via Play Billing webhook,
  ~40 RLS tables, triple-layer PII scrubbing. One pre-launch item (Apple
  Sign-In). (Doc 05.)
- **Nutrition & coaching engines** — stacked safety floors, evidence-cited
  (Morton, Katch-McArdle, ACSM), confirm-then-apply (nothing changes until the
  user taps Apply), proposes-never-auto-runs. (Doc 02 batches 3–5.)
- **Design system** — a tokenised theme with documented WCAG ratios, three
  real accessibility modes (contrast, colour-blind, larger text), reduce-motion
  plumbing, tabular numerals, and a CI hex gate enforcing the no-fingerprint
  rule. Fewest, lowest findings of any section. (Doc 09.)
- **Offline-first architecture** — local SQLite is the source of truth, so the
  category's #1 user complaint (lost sets on a bad connection) is designed out.
  (Docs 06, 07, 08.)

## What needs a decision or a fix
**Two items need YOUR call first (values, not engineering defaults):**
1. **Paywall fires on distress signals (A2-063).** The "Try Pro free" badge
   prioritises `extreme_soreness` and `energy_crash` as top conversion
   triggers. Honest copy, guardrails stay free — but it can read as monetising
   distress, and it undercuts the safety posture that is the app's biggest
   strength. Recommend de-prioritising or softening. **(Tier 1-A.)**
2. **Paywall placement vs basic/safety surfaces** — confirm nothing safety-
   relevant or basic-logging sits behind a gate (Phase 8 showed this is the
   loudest category grievance).

**One HIGH product bug (code):**
3. **lbs is label-only (A2-043).** Gym weight, progression jumps, plates and
   bar are all kg-modelled; lbs users get wrong-sized numbers. Low-risk fix —
   the conversion helpers already exist and are just unused. Highest-value
   code fix found. **(Tier 1-B.)**

**One launch blocker (only if iOS ships):**
4. **Apple Sign-In uses browser OAuth, not native (A2-016).** **(Tier 1-C.)**

**Then:** a handful of correctness fixes (e1RM formula above 20 reps, duplicate
sync paths, a11y palette bypass on volume colours, over-broad sign-out clear),
performance wins (a dead RestTimer animation, the fixed 2.5s splash), dead-code
cleanup, and cheap tooling gates (eslint-plugin-react, a copy-lint gate). Full
prioritised plan in **doc 11**.

## By the numbers
- **69 distinct code findings (A2-001…A2-068)** + navigation (N3), design
  (D9), journey (P10) and performance (P6) findings. The large majority are
  **low severity / dead code / trivia**. Only **one HIGH product bug
  (A2-043)**, **one App Store blocker (A2-016)**, and **one values call
  (A2-063)** rise to Tier 1.
- **Static gates green and reproduced:** ESLint 0 err / 1,665 warn (warnings
  dominated by a fixable JSX-unused-vars false positive); Jest 133/133 suites,
  2,301 pass; `npm audit` 32 vulns (18 high are build-chain + a devDep, not
  shipped runtime).
- **No fabricated findings.** Two near-misses were caught and refuted before
  recording (a duplicate-exercise-name collision that doesn't exist; a
  corrupted file read that was discarded and re-read clean).

## Documents
| Doc | Phase |
|---|---|
| 00 (this) | Executive summary |
| 01 | Codebase inventory |
| 02 | Code audit (the core, 69 findings, line-cited) |
| 03 | Navigation flow |
| 04 | Feature catalogue |
| 05 | Security |
| 06 | Performance |
| 07 | Error testing & static analysis |
| 08 | Competitor & user sentiment |
| 09 | Design & UX |
| 10 | User journey & psychology |
| 11 | Master recommendations (the action plan) |

## What happens next
Nothing is changed yet. Review **doc 11**, decide **Tier 1-A** (paywall
values call) and confirm scope, and Phase 12 implementation begins from there
— each fix on the named branch, with tests alongside for runtime-critical
changes, respecting the identity / `user_id` / no-`--no-verify` / no-new-
release locks.

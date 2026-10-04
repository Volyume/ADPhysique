# D219 build: common brief (every build lane reads this first)

Repo: /home/user/ADPhysique (React Native 0.81 + Expo 54, JavaScript, Jest). Branch `claude/plan-builder-science`. Work in this working tree.

AUTHORITY, read in full before you start:
- The design: docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md (revision 2; the sections your lane brief names).
- Register entry D219 at the end of docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, including "Founder answers" (the founder chose A to all six questions: rebuild current plans at the next session; Home keeps a plain change-workout choice with no suggestions or readiness badges; leg clocks 54 h quads and glutes, 60 h hamstrings; the learner extended behind its safety simulation; effort ladder 3, 2, 2, 1, 1, 4; only coachApply.js's two volume functions may change) and "Rulings recorded".
- CLAUDE.md at the repo root (sections 2 and 3: inviolable constraints and conventions).

HARD BOUNDS (inviolable; if your work would cross one, STOP and report, never cross it):
- Deterministic, pure engine: no AI, no randomness, no I/O in engine modules.
- ED-safety: never touch edPatternDetector.js, wellbeing.js, nutritionEngine.js, weeklyCoach.js or coachApply.js unless your lane brief names the exact function; never weaken calorie floors, the FFM floor, the rapid-loss gate, max-safe-loss, Beat UK signposting, calm mode or ED-flag suppression.
- D204: screens describe; they never tell anyone to train more or less (keep the forbidden-words regex tests green).
- No new dependency. No billing, consent or identity change. No cloud migration file unless your brief says so.
- British English in all copy and comments; NO em dash in user-facing copy (lint enforces it); calm, plain voice (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md); conventions in CLAUDE.md section 3 (function components, StyleSheet at the bottom, theme tokens only, logError on failures).

DISCIPLINE:
- Never commit, push, run `git stash`, switch branches, rebase, or touch main. The lead reviews your diff and commits it.
- Touch only the files your lane brief lists (plus their tests). Do-not-touch files are named in your brief; the lead and another agent are editing those.
- Tests are the contract: re-pin a test only where the design changes the behaviour it pins, and say which and why in your report; every new behaviour gets a test that FAILS on today's code (write it first, see it fail, then make it pass). Header comment on each new suite: what it pins and why.
- Run `npm run lint` and the targeted jest suites for every file you touched (`npx jest <paths>`), and report the exact summary lines. The lead runs the full gate.
- STOP and report rather than interpret on any ambiguity, any pinned test that conflicts with the design, or anything the design does not cover.

REPORT (your final message, under 600 words): files changed (with one line each on what changed), tests re-pinned (each with the design section that justifies it), new tests (each with the behaviour it pins), lint and jest summary lines verbatim, a device checklist for a physical Android device (numbered steps, expected result per step), and STOP items.

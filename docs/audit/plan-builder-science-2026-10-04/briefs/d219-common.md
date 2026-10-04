# D219 common brief (every phase-1 lane reads this first)

Repo: /home/user/ADPhysique (React Native 0.81 + Expo 54, JavaScript, Jest). Branch `claude/plan-builder-science`.

AUTHORITY: register entry D219 at the end of docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md (the founder's order, verbatim; read it in full). The founder's goals, in short:
1. Plans are built so recovery and the volume each muscle needs are balanced; the order of sessions means the next session finds its muscles recovered. There are no fixed training days, so the next session should be as close to ready as possible whenever it happens.
2. A maximum number of sets per exercise, grounded in the science (the founder believes beyond 3 or 4 sets on most exercises is mostly fatigue for little gain). They have seen 6 sets on one exercise as a plan progresses.
3. When a check-in adds sets to a muscle (e.g. +3), the sets are spread across that muscle's exercises, and a new exercise is added when needed, with sets redistributed.
4. Session structure and order may change, by the number of days selected, with extra focus on weak areas.
5. The Recovery screen should be able to say, truthfully, "tomorrow is chest and arms, and by tomorrow chest and arms will be recovered".
6. Serious formulas, grounded in evidence, deterministic.

HARD BOUNDS (inviolable; flag anything that would cross one, never propose crossing it):
- The coaching engine is deterministic and pure: no AI, no randomness, no I/O in engine modules.
- ED-safety: never touch or weaken calorie floors (1500 men / 1200 women), the FFM floor, the rapid-loss gate, max-safe-loss, Beat UK signposting, calm mode, ED-flag notification suppression.
- D204: the app describes; it never tells anyone to train more or less.
- No new dependency. No billing, consent or identity change. Cloud migrations are the founder's call.
- British English; no em dash in user-facing copy; calm, plain voice.

YOU ARE READ-ONLY on source code: never edit src/, never commit, push, run `git stash`, switch branches, or touch main. You MAY write exactly one file: your report, at the path your lane brief names. You may run targeted jest suites or write scratch probes ONLY under /tmp/claude-0/-home-user-ADPhysique/786bfebd-8f9e-5cc9-9432-3682cc10db7d/scratchpad/d219/<your-lane>/ (a probe that must import repo modules via jest may sit in the repo temporarily; delete it before finishing and confirm `git status --short` shows only your report).

EVIDENCE RULES (founder law "evidence before assertion"): cite file:line for every code claim; say OBSERVED vs INFERRED; read to the end of a mechanism (the consumer, not the constant); a plausible cause is not a root cause; if something is ambiguous, write it as a STOP item instead of interpreting.

REPORT: structured, evidence-first, no narrative padding. Detail is the deliverable (file:line findings are welcome), but no filler. When done, reply with a short summary (under 300 words) and the report path.

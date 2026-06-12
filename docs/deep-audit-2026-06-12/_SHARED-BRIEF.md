# Deep Audit 2026-06-12 — Shared Brief (read first)

This is the anchor brief for every agent in the 2026-06-12 deep audit. Read it,
then do your assigned slice. Write your report to the path your task names.

## The app
**Volyume** — a live, paying-users production app on Google Play (iOS imminent).
A physique / bodybuilding **training + nutrition coaching** app built around
competition divisions (Men's Physique, Classic, Open, 212, Bikini, Figure,
Women's Physique/Bodybuilding), with a **deterministic coaching engine** (no
LLM, no AI, no randomness), hypertrophy volume landmarks (MEV/MAV/MRV),
autoregulation, mesocycle periodisation, peak-week federation protocols, a
nutrition macro engine, food logging + barcode scanning, progress analytics,
and an eating-disorder (ED) safety system. Offline-first, EU data residency,
Expo managed workflow. 75 screens across 5 tabs. ~223 test suites / 3,400+ tests.

## The strategic mandate for THIS audit (the new lens)
The founder has chosen **true dual-market repositioning**: serve **early /
mass-market gym users** AND **elite physique competitors** as co-equal
audiences. Today the whole product and all prior research skew elite/physique.
The job is to find how to win the broad gym population (the biggest possible
user base) WITHOUT diluting the elite credibility that differentiates us.

Hold BOTH personas in mind for everything:
- **"Besa the Beginner"** — nervous, 0–12 months training, intimidated by gym
  jargon, unsure what to do, easily discouraged, churns fast, needs to feel
  supported, guided, and to see a quick win. The mass-market majority.
- **"Eddie the Elite"** — competitive/advanced, wants precision, control, data
  density, credible methodology, and to be taken seriously. The current core.

Special attention everywhere to: **usability, flow, design, placement** (a great
feature hidden is a failed feature), **coaching voice** (how users like to be
spoken to so they feel supported, encouraged, motivated), **retention** (daily
return, habit loop, D0–D14 activation, long-term stickiness), **word-of-mouth /
virality** (will users tell their friends?), and **the psychology of gym-goers**
(beginner gym anxiety, identity, autonomy, motivation, adherence science).

## THIS IS ADDITIVE — do not re-tread finished work
A 42-agent competitive audit was completed **2026-06-10** and lives in
`docs/competitive-audit-2026-06-10/` (14 research areas `-01-*.md`, 28
blueprints in `implementation/`, comparison matrix `-02`, master proposals
`-03`, final action list `-04`, coverage gaps `-05`). ~27 items (COMP-001…030)
already SHIPPED on this branch. Before researching, skim the relevant prior
files so you BUILD ON them — pressure-test their conclusions, find what they
missed, and push into the dual-market / beginner / retention / virality /
psychology angles they under-covered. Flag where you disagree with a prior
conclusion. Do NOT just restate what's already there.

Useful orientation docs: `APPMAP.md`, `docs/CURRENT_STATUS.md`,
`docs/PRODUCT_UX_MAP.md`, `docs/DESIGN_SYSTEM.md`,
`docs/competitive-audit-2026-06-10/_START-HERE-NEXT-SESSION.md`,
`docs/competitive-audit-2026-06-10/competitive-audit-05-coverage-gaps.md`.

## Hard constraints (NON-NEGOTIABLE — every idea must comply)
- **No AI/LLM/randomness in the coaching engine.** Ever. It is deterministic.
- **ED safety system is untouchable** (`src/coaching/safety/`): never lower the
  1,200 kcal (women) / 1,500 kcal (men) floors, never remove Beat UK
  signposting, never change the −1.5%/wk rapid-loss threshold.
- **Offline-first.** Every core feature works with no internet. Local DB is the
  source of truth on device. No PII to any external service (incl. analytics).
- **EU data residency** (Supabase EU Dublin). Expo managed workflow (never eject).
- **Free vs Pro gating is absolute.** Free: Plan Library, training builder,
  workout logging, exercise library, PBs, progress stats. Pro: food diary,
  barcode, meal suggestions, nutrition targets, macros, cardio, steps, check-ins,
  Precision Coaching adjustments, division plans, safety systems, wearables.
  Never expose Pro to free; never gate a free feature behind Pro.
- **British English** in all user-facing copy.
- **Billing** product IDs `pro_monthly` / `pro_annual` never change.
- This is RESEARCH + BLUEPRINTS only. No code changes, no locked-doc edits.
  Locked-doc tensions are flagged as PROPOSALS for the founder, never applied.

## What makes a useful report
- Be concrete and evidence-led. Name specific apps, specific mechanics, specific
  screens/files. Cite where you can.
- For every idea: say which persona(s) it serves (Beginner / Elite / Both), the
  expected effect (activation / retention / conversion / virality / credibility),
  the rough effort, and any constraint it touches.
- Rank ruthlessly. A short list of high-conviction, well-argued ideas beats a
  long undifferentiated dump.
- Flag placement/flow explicitly: where in the app would this live, and why there.
- Note conflicts with the hard constraints or locked docs as you find them.

## Output
Write your report as markdown to the exact path your task specifies, under
`docs/deep-audit-2026-06-12/`. Then return a TIGHT summary (your top findings +
the file path) to the orchestrator — not the full report.
</content>
</invoke>

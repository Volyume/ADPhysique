# VOLYUME — CLAUDE CODE INSTRUCTIONS

This is a live production app on Google Play. Real users are paying.
Every change you make affects them. Work accordingly.

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
Product IDs volyume_pro_monthly and volyume_pro_annual never change.

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

If you notice unrelated bugs or dead code: mention it, do not fix it.
If something feels irreversible: stop and ask first.

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

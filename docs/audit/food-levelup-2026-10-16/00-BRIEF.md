# Food level-up: the founder's brief (2026-10-16)

Register: D230. Programme folder: this one. Status and lanes: `docs/TASKBOARD.md`.

## The founder's words, verbatim

"After the [video work] I want you to look at our food component. I think that entire gesture could undergo a serious level up in line with the rest of the app as it now seems lagging and a bit of a bolt on. Follow the same ethos of the rest of the app and propose upgrades in look / feel / usability and so on. We're in a position now where this should on every possible way other than data source be better than my fitness pal, Cronometer etc so assess it and propose improvements to elevate above. At the moment I still use mfp as it's better. I want to narrow the gap and make mine better in every way."

Then: "Level up the feature immensely."

## What that binds

- The bar: better than MyFitnessPal and Cronometer in daily use in every way EXCEPT the data source (the food database stays what it is; `docs/FOOD_DATA_STRATEGY_LOCKED.md` stands).
- The ethos: the rest of the app's (the logger's one-screen grammar, the house parts, the tokens, the calm plain British voice, no clipped commands, no jargon, no "AI talk").
- The order is a BUILD ("Level up the feature immensely"), ruled by the lead under D33 on one criterion: the best for the person using it, never effort. Founder forks only where Section 2 of CLAUDE.md demands them (ED-safety, schema rules, new dependencies, billing).
- Untouchable: the ED-safety system in full (calorie floors, FFM floor, rapid-loss and max-safe-loss gates, Beat UK signposting, calm mode, the open-flag suppressions, the eating-habits screening). Every food surface built here keeps every existing gate and adds none that weakens one.
- Fully free: nothing MyFitnessPal or Cronometer charges for is gated here.

## The method

1. `01-INVENTORY.md`: a read lane maps every food surface, flow, target, data path, visual departure from the house, performance smell, copy fault and accessibility gap, with file:line evidence.
2. `02-COMPETITOR-RESEARCH.md`: a research lane records, with citations, what the two apps (and Lose It, MacroFactor, Yazio, Lifesum) do well and badly in daily use, what they charge for, and what users complain about.
3. `03-ASSESSMENT-AND-PLAN.md` (the lead): the gap, the rulings, the specification of each upgrade, and the build lanes.
4. Build lanes (Sonnet for well-specified surfaces, Opus where the quality bar demands, the lead hands-on for the diary's spine and anything safety-adjacent), each lane lead-reviewed hunk by hunk before its commit, a fresh-eyes adversarial review over the whole, the full gate, the merge, the device checklist in chat.

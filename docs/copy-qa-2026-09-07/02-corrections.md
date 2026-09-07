# Training explanation copy: corrections (lead, 2026-09-07)

Authority: founder prompt "Targeted product language / explanation
quality-control pass" (in chat, 2026-09-07). Inventory: `01-inventory.md`
(Sonnet, mechanical). Judgement and edits: lead. Landed f4e9582, merged
to main ee1919c.

## Facts checked before rewording
- The block's effort ladder is a fixed RIR ladder per week (default
  `[3,2,1,0,4]`, `src/lib/database.js:527,5556`), so "the effort target
  moves a step closer to failure each week" is true.
- No code suppresses PR detection in the recovery week; block
  performance does exclude recovery-week sessions from its PR count
  (`blockMetrics.stage3.test.js:239`). The gloss now says "not a week
  for chasing PRs, and any set here does not count towards the block's
  progress" rather than the bare "no PRs".
- First-block seeding: every muscle's weekly sets come from the research
  landmarks until a block has finished; then the ledger seeds the next
  block per muscle (`blockExplain.js` sources `seed_research` vs
  `seed_ledger`).

## Before / after (representative)
| Surface | Before | After | Why the original failed |
|---|---|---|---|
| Today chip, first session | First session of your plan. Nothing to read yet. | First session of your plan. See how this block is shaped. | "Nothing to read" described the chip's own lack of a readiness signal, not what the tap opens; the destination is the block sheet. |
| Your block, first block | Not enough personal history yet, so this block starts from research-based guidance. As blocks finish, each muscle's starting point comes from how it actually responded. | Your weekly sets for each muscle start from research-based guidance, because you have not finished a block yet. From your next block on, each muscle's starting sets come from how it went in the block before. | "Personal history", "starting point" and "responded" had no stated subject; the subject is weekly sets per muscle and the missing evidence is a finished block. |
| Your block, mature user on a template-seeded block | This block starts from research-based guidance for this plan. Your block history picks up again as its blocks finish. | Your weekly sets for this block start from research-based guidance rather than from your earlier blocks. From the next block on, each muscle's starting sets come from how this one goes. | "Block history picks up again" was an internal notion; the person needs to know what this block used and what the next one will. |
| Your block, fixed paragraph | Effort builds a little each week so your body keeps adapting, then the recovery week lets it catch up. When the block finishes, you choose what comes next; nothing starts on its own. How each muscle responds can shape where your next block starts. | Each week the effort target moves a step closer to failure, so the same sets keep asking more of you. The recovery week eases both sets and effort so fatigue clears. When the block finishes, you choose what comes next. Nothing starts on its own. How each muscle goes this block shapes where its sets start in the next one. | "Effort builds", "keeps adapting", "lets it catch up" were metaphors; the mechanism is the RIR ladder and the recovery week's lighter sets and effort. |
| Recovery week gloss (shared: block sheet, Coach tooltip) | A lighter planned week so you recover: lighter loads, full recovery, no PRs. | Recovery week: a planned lighter week at the end of the block. Fewer sets, lighter loads and easier effort targets so fatigue clears. Not a week for chasing PRs, and any set here does not count towards the block's progress. | Rendered as a bare paragraph with no term, "full recovery" was vague, and "no PRs" overstated behaviour. |
| Block shape card, recovery week (shared: block sheet, Workout Summary) | Recovery week. Lighter on purpose. This is where the work pays off, and you lose nothing by easing back. | Recovery week. Lighter on purpose: fewer sets and easier effort, so fatigue clears before the next block. | Motivational filler replaced with what is different and why. |
| Block finished (chip, card) | Block finished. Targets hold at recovery-week volume until you choose what comes next. | Block finished. Sets stay at recovery-week level until you choose what comes next. | "Targets hold at recovery-week volume" is internal phrasing. |
| Today line, block finished | Block complete. Choose what's next. | Block finished. Choose what comes next. | Two words for one state on one screen; aligned. |
| Today chip, adaptive recovery | Training is lighter for now while your recovery catches up. | Training is lighter for now because your recent recovery has been harder. | "Catches up" again; the cause is stated the way the detail sheet already states it. |
| Coach, training next week | This is next week's starting point; each session still fine-tunes as you train. | These are next week's planned sets. Each session can still adjust them on the day. | "Starting point" undefined; the object is the planned sets. |
| Volume why, adapted targets | Targets adjust over time as your body responds to training. | These targets have been adjusted from how your earlier blocks went. | "Your body responds" is pseudo-physiology; the evidence is finished blocks. |

Also: "Nothing outstanding this week" became "Every session done for this
week"; "Your recent sessions point to a recovery week soon" replaces
"Recent training signals point towards easing off soon"; the block
definition's "so your body can absorb the work" became "so fatigue can
clear"; the Workout Summary legend's "adjust to your response" became
"adjust from how those went".

## Counts
- Source files changed: 11 (`readinessSummary.js`, `HomeScreen.js`,
  `BlockShapeCard.js`, `todayLineArbiter.js`, `blockExplain.js`,
  `HomeBlockShapeSheet.js`, `coachGlossary.js`, `recoveryState.js`,
  `CoachOutputScreen.js`, `volumeInsightCopy.js`, `WorkoutSummaryScreen.js`).
- Strings changed: 20.
- Shared components affected: `GLOSSARY.deload` (block sheet and Coach
  tooltip), `BlockShapeCard` (block sheet and Workout Summary),
  `blockExplain` lines (Home block sheet), `recoveryState` review line
  (Coach), `volumeInsightCopy` closing (Workout Summary).
- Tests updated: 13 files; no test weakened, each pin moved to the new
  wording.

## Verification
- Journeys composed from the real functions (first session chip; first
  block, mature and mixed seed lines; block definition; ramp line) and
  read end to end: teaser now names what opens; sheet says what the
  sets are, why, and what happens next.
- `npm run lint` clean. Affected suites 55 / 753 green. Full suite:
  1256 suites, 18676 tests, green.

## Flagged, not changed (outside this pass)
- `todayLineArbiter.js` still carries a dead rank-4.5 branch for the
  retired first-review line (inventory ambiguity 1).
- Two differently worded volume-source explanations remain on Workout
  Summary (shared closing vs inline legend); wording aligned, structure
  left as is (inventory ambiguity 3).

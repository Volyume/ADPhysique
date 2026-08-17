# INJURY / CONSTRAINT LAYER — IMPLEMENTATION SPEC (D107-2, build next week)

Authority: founder 2026-08-17 ("Injury controls ... would be good").
Verified current state (agent evidence, file:line in TRIAGE.md): a real
per-exercise intent system exists (exercise/intent.js + database.js
setExerciseIntent/getExerciseIntents; UI at RoutineDetailScreen long-
press) with two kinds - EXCLUDED (indefinite) and AVOIDED_BLOCK (until
the current block ends). Equipment is already a hard generation filter.
Missing: movement-pattern/joint scope, day-bound expiry, and senior
enforcement.

## Design (build ON the intent system, do not invent a parallel one)

1. **New intent kind: `PATTERN_AVOID`.** Target = a movementFamily key
   (movementFamily.js already names VERTICAL_PULL, HORIZONTAL_LAT, etc.)
   rather than an exercise id. One row constrains the whole pattern -
   "overhead pressing" is one entry, not ten exercises.
2. **Day-bound expiry.** Additive column `expires_at_ms` on the intents
   table (local migration via PRAGMA user_version; cloud additive
   migration if intents sync - verify at build; intent.js reads suggest
   local-only today). Duration choices in UI: 7 / 14 / 30 days, this
   block, indefinite. Expiry is evaluated at read time; expired rows are
   ignored, then lazily cleaned.
3. **Senior enforcement.** Constraints become HARD filters at every
   generation/suggestion point: poolGenerator filterPool, planAutoGen,
   swap candidates (swapEngine + handleConfirmSwap list), and the
   exercise picker's suggestion rails. A movement already IN the active
   plan is never silently rewritten: the logger surfaces a one-line
   "You're avoiding overhead pressing until <date>" row on the affected
   exercise with a Swap shortcut - the athlete decides (matches the
   apply/decline coaching law).
4. **Fail direction (OPEN DECISION for the build lead, recorded here):
   intent.js currently fails OPEN on read error (advisory). For injury
   constraints the harm is inverted - silently suggesting a forbidden
   movement. Proposed: generation proceeds on a read error but the
   affected surfaces show a constraints-unavailable notice; never
   fabricate. Decide at build with the ED-safety lens.**
5. **Not medical.** Copy stays calm and non-clinical ("Avoiding
   overhead pressing until 31 Aug"), no diagnosis vocabulary, no pain
   scales (ED/anxiety-adjacent instrument creep - out).

## Deliberately out of scope (v1)
Per-joint anatomical model; severity grades; automatic substitution
without user action; coach-engine progression changes (constraints
filter WHAT is suggested, they do not alter volume/calorie maths -
keeps the deterministic engine untouched).

## Tests
Engine-pure: a PATTERN_AVOID family never appears in generated pools /
swap candidates; expiry honoured to the millisecond; EXCLUDED/
AVOIDED_BLOCK behaviour unchanged (regression). Source guards: the
hard-filter call sites; the in-plan surface never auto-rewrites.
Device checklist: set "avoid overhead pressing 14 days" from an
exercise long-press, confirm generator/swap/picker all respect it, and
the logger shows the notice with the date.

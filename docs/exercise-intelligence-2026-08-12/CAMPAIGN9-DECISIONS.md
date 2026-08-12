# Campaign 9 decisions

Only the rulings. The map of the existing code is in
`EXERCISE-SELECTION-ARCHITECTURE.md`.

---

## 1. Canonical state shape

Three local tables (migration v73, `src/lib/database.js`), cloud half in
`supabase/migrate_136_exercise_intent.sql` — **written, not applied**.

| Table | Key | Holds |
|---|---|---|
| `exercise_intent` | `UNIQUE(user_id, exercise_id)` | `kind` = `excluded` \| `avoided_block`, `scope_mesocycle_id`, optional `reason` |
| `exercise_swaps` | append-only | `from_exercise_id`, `to_exercise_id`, `routine_id`, `mesocycle_id`, `explicit` |
| `exercise_slot_defaults` | `UNIQUE(user_id, from_exercise_id, routine_id)` | the user-approved replacement |

One exercise carries at most one intent: re-excluding something already
avoided promotes it rather than creating a second row.

All decisions live in `src/lib/exercise/intent.js`. No screen re-derives
exclusion or preference for itself.

---

## 2. Exclusion semantics

- **"Don't suggest this exercise"** — indefinite, until explicitly restored.
- **"Avoid for this block"** — live only while `scope_mesocycle_id` equals the
  current block id. **Ruling: expiry is a block-identity comparison, not a
  duration.** No calendar timer was invented; the avoidance is spent the
  moment the block it was set against stops being current.
- **`reason` is optional and inert.** Offered as light context, never
  required, and never interpreted. Excluding a bench press because of a
  shoulder records *"the user asked Volyume not to suggest this"*, never
  *"this exercise injures this user"*. No diagnosis is stored or inferred.
- **Exclusion never touches history.** It governs future suggestions only.
  The canonical layer imports readers only and cannot reach workouts, sets
  or PRs; pinned by test.
- **Restore is a tombstone, not a delete.** A hard delete would let a stale
  cloud copy of the exclusion arrive later and silently re-suppress what the
  user had just restored.
- **Reads fail OPEN.** A database error yields no intent, which is the
  pre-Campaign-9 behaviour. A transient failure must never invent a
  suppression, and must never invent a preference either.

---

## 3. Swap evidence semantics

- The swap **is** the evidence: recorded on a real user action only, with the
  source exercise and the routine it happened in.
- **Preference is contextual.** Evidence is keyed by *source exercise*, so
  the app can say "usually chosen instead of A here", never "the user
  prefers B".
- Both swap surfaces record: the plan swap (durable, mutates the routine
  row) and the session swap (deliberately does **not** change the plan, but
  is still a deliberate choice).
- The log is **append-only**. A later swap away from B does not erase that B
  was once chosen. Cross-device it applies insert-or-ignore, so a re-pull
  cannot manufacture duplicate evidence.
- **Ranking exposure is not evidence.** Structural, not conventional: the
  canonical layer's import block contains no writer, so ranking something
  first cannot make it look more preferred next time. Pinned by test.

---

## 4. Ranking precedence

Applied *within* the structurally suitable candidates that
`swapEngine.rankSwaps` already produced — the personal layer re-orders, it
can never introduce a candidate:

1. approved default for this context
2. most recent replacement for this source
3. repeatedly chosen replacement
4. personal evidence (trained recently, and evidence sufficient)
5. previously used (the exercise this one replaced)
6. structural score, then the engine's own order (alphabetical inside equal
   scores)

**Ruling: structural suitability is never traded away for familiarity.** A
recently trained but structurally wrong exercise cannot climb, because it
was never a candidate.

An exclusion removes a candidate outright at every tier, including one that
is the approved default — the newer explicit intent beats the older one.

---

## 5. Explicit default semantics

- Offered only after the same deliberate choice **repeats** (`REPEATED_SWAP_MIN
  = 3`), never after one swap, and never applied automatically — the user
  answers "Use it" or "Keep current".
- A routine-specific default beats a plan-wide one: the more specific
  context is the better answer.
- An approved default outranks every inferred preference, and is undoable.

**Recorded threshold question (not invented behavioural science).** No
existing product law supplied a repeated-choice threshold, so the mechanism
is deliberately conservative at three. If the founder wants a different
number, it is one constant. This is recorded rather than presented as
evidence-based.

---

## 6. Builder behaviour

- **New plan generation** may avoid an excluded exercise with no
  confirmation — nothing existing is being replaced. Block-avoided
  exercises are left out of that block.
- The engine's hand-written fallback pool resolves exercises **by name**, so
  generation checks names as well as ids. Without that, a thin exercise
  library reintroduces the excluded move through the back door — and a thin
  library turns out to be the common case, not the rare one.
- **Existing plans are never silently mutated.** Excluding something already
  in the plan records the preference and then *asks*: "Choose replacement"
  or "Keep current plan". Keeping the plan still honours the exclusion for
  future suggestions.
- **No eligible alternative:** generation reports the blocked slots rather
  than thinning the plan or restoring the exercise. When every slot is
  blocked it returns `{ ok: false, error: 'plan_blocked_by_exclusions',
  needsChoice: true, blockedSlots: [...] }` and rolls the programme back
  in-transaction. Nothing is activated and nothing is restored.
- `partial`/`missedCount` were deliberately **not** reused for blocked slots:
  they drive live copy that names equipment, and reusing them would make
  existing screens say something false.

---

## 7. What Volyume deliberately refuses to infer

- **No single score.** No hypertrophy percentage, growth score, quality
  score or "Exercise Fit: 87%". Evidence is separate named dimensions with
  an explicit *"not enough history yet"* state. Ordinary training logs
  cannot support the construct, so the construct does not exist.
- **No exercise-specific tolerance.** Recovery feedback is whole-body and
  per-session; attributing it to one exercise would be manufacturing
  evidence. Reported as `tolerance: 'not_tracked'`.
- **No universal preference claims.** Only contextual ones.
- **No anthropomorphising.** No "we know you love this", no "best for
  growth".

---

## 8. Remaining debt from this campaign

1. **`migrate_136` is unapplied and founder-gated.** It must run against
   production BEFORE any build carrying this push ships (the migrate_129
   precedent). Until then intent is device-local: the app works, nothing is
   lost, it simply does not cross devices.
2. **CLOSED after the red-team pass.** `ManualBuilderScreen` and
   `BuildWorkoutScreen` never select an exercise themselves: both go
   through `ExercisePickerModal`, which now filters on intent, marks a
   set-aside row and offers "Allow again". Fixing the shared picker covered
   all four manual surfaces at once.

2b. **Travel mode was a genuine leak, found by the red-team pass and
   fixed.** `BuildWorkoutScreen.applyTravelMode` builds a session from
   `travelMode.generateTravelPlan` and resolved the engine's exercise NAMES
   against the unfiltered catalogue, so a set-aside exercise came straight
   back. It now filters the library first, and a name that resolves only in
   the unfiltered catalogue drops its slot rather than being rebuilt through
   the unmatched-name placeholder.

2c. **Copying a LIBRARY plan does not filter on intent.** `copyPlanFromLibrary`
   clones the seeded plan's exercises verbatim, so a set-aside exercise can
   enter a plan the user chose by name. Arguably correct — the user picked
   that specific published plan, and Volyume is not suggesting anything —
   but it sits on the line the founder drew between "generation may avoid"
   and "never silently mutate". Left as it is, and flagged: this one needs a
   founder ruling rather than an engineering guess.
3. **The blocked-slot signal has no UI yet.** `blockedSlots` is returned and
   tested; no screen renders it, so today a fully blocked rebuild surfaces
   as the existing calm failure toast.
4. **GDPR, surfaced not actioned.** Account deletion via the Edge Function
   cascades correctly (FKs are `ON DELETE CASCADE`). The older
   `delete_user_data` RPC fallback deletes table-by-table and does not know
   these three tables, so an erasure that fell back to it would leave rows.
   Fixing it means re-creating that RPC's whole body — outside this
   migration, and a founder call.
5. **`CLAUDE.md` migration count is stale** (says 132 files / highest 135;
   it is now 137 / 136).
6. **Dry-run previews still list blocked entries.** `generatePlanDryRun`
   returns the engine's raw plan; the blocked names are still inside it,
   with `blockedSlots` alongside. Stripping them would desynchronise the
   position indices the diff relies on.

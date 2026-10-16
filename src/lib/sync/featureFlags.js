/**
 * Sync-layer feature flags.
 *
 * Three flags: CIRCUIT_SYNC_COLUMNS_ENABLED (below), PLAN_FACTS_PUSH and
 * ENTRY_TYPED_PUSH (end of file). The first gates whether the three
 * EL-9/EL-7 circuit columns (routine_exercises.group_kind,
 * routine_exercises.round_rest_seconds, workout_sets.evidence_class -
 * docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md) are included
 * in the cloud push payload.
 *
 * These columns exist locally (SCHEMA_MIGRATIONS in database.js) but their
 * cloud counterparts (supabase/migrate_158_routine_exercise_groups.sql,
 * supabase/migrate_159_workout_set_evidence_class.sql) are WRITTEN, NOT
 * APPLIED - CLAUDE.md Section 2 forbids Claude ever applying a cloud
 * migration. Pushing the columns against a cloud schema that doesn't have
 * them yet would fail the WHOLE upsert batch for every row in the chunk
 * (Postgres rejects an unknown column for the entire payload), exactly the
 * tolerated failure mode migrate_137's header already describes. Omitting
 * the columns while this flag is off keeps every OTHER field syncing
 * normally; flipping it on was the deliberate two-step alongside the founder
 * running "run against production" on both migrations.
 *
 * Flip this to true ONLY after the founder has run both migrations against
 * production and their presence has been verified (supabase/README status
 * block updated to APPLIED).
 */
export const CIRCUIT_SYNC_COLUMNS_ENABLED = true;

/**
 * PLAN_FACTS_PUSH (D219, lane S1; the EL-9 pattern above): gates whether
 * programmes.plan_facts, the facts a plan built by the new planner carries
 * (docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md section 9),
 * goes in the programmes upsert.
 *
 * The local column exists (SCHEMA_MIGRATIONS in database.js) and its cloud
 * counterpart, supabase/migrate_188_programmes_plan_facts.sql, is APPLIED
 * (2026-10-05 11:14:30 UTC, founder: "run against production: 188"; verified
 * read-only: jsonb, nullable, no default). The programmes upsert is ONE request with no
 * fallback (sync.js _pushProgrammes), so a build that pushed a column the
 * cloud lacks would stop programme sync for every user and block ordinary
 * sign-out (the sign-out push-first safety refuses while a push errors).
 * Omitting the column while this flag is off keeps every other programme
 * field syncing normally. The pull side already reads plan_facts defensively
 * (a missing key is NULL, and a cloud NULL never overwrites a local value).
 *
 * ON since the landing after migrate_188 was applied and verified
 * (supabase/README status block, APPLIED 2026-10-05).
 */
export const PLAN_FACTS_PUSH = true;

/**
 * ENTRY_TYPED_PUSH (D219 learner data path, lane LR2; the EL-9 pattern above):
 * gates whether workout_sets.entry_typed, the fact of whether the person typed
 * or changed a set's weight or reps (true) or kept it exactly as the screen
 * filled it in (false), goes in the workout_sets upsert.
 *
 * The local column exists (SCHEMA_MIGRATIONS in database.js) and its cloud
 * counterpart, supabase/migrate_189_workout_sets_entry_typed.sql, is APPLIED
 * (2026-10-08 10:40 UTC, under the founder's "Deploy all and run all
 * migrations remaining against production"; the founder's exact phrase
 * "run against production: 189" was the gate, CLAUDE.md Section 2). Pushing
 * the column against a cloud schema that lacks it fails the WHOLE upsert
 * chunk in Postgres, and with it the workout's sets (sync.js _upsertSets
 * throws after every chunk so the push watermark holds), which is why the
 * flag shipped OFF until the column was verified present read-only. The pull
 * side reads the field defensively (an absent key is NULL, and a cloud NULL
 * never overwrites a local value).
 *
 * Flipped to true in the landing after the apply, as the migration header
 * required (the supabase/README status block says APPLIED, the header is
 * edited to match, and the guard in
 * src/lib/__tests__/sync.entryTypedPush.test.js is re-pinned here).
 */
export const ENTRY_TYPED_PUSH = true;

/**
 * D228 item 5 (founder, 2026-10-15): the `structure_refused` engine
 * telemetry event. OFF until supabase/migrate_193_structure_refused_telemetry.sql
 * is APPLIED under the founder's exact phrase: the server's
 * record_engine_telemetry allow-list rejects an unlisted event and the
 * transport retries a rejected row on every flush, so emitting before the
 * apply would queue a row that never clears. Flipped to true in the landing
 * after the apply, as the migration header requires. The event's payload is
 * reason codes and request numbers only, never muscle names or body data.
 */
// Turned on 2026-10-15 after migrate_193 was applied to production (the
// server allow-list carries 'structure_refused'); a build before that
// migration would have had its row rejected and retried for ever.
export const STRUCTURE_REFUSED_TELEMETRY = true;

/**
 * CUSTOM_FOOD_PORTIONS_PUSH (D230 R20, lane 4B; the ENTRY_TYPED_PUSH pattern
 * above): gates whether custom_foods.portions_json, the second and third named
 * portions of a custom food ("1 slice", "1 mug"), goes in the custom_foods
 * push.
 *
 * The local column exists (SCHEMA_MIGRATIONS in database.js) and its cloud
 * counterpart, supabase/migrate_195_custom_foods_portions.sql, is WRITTEN,
 * HELD: the founder's exact phrase "run against production" for 195 is the
 * only trigger, and the app never applies it. food_sync_push stores a
 * custom food from named fields, so a payload carrying a key the function does
 * not read is ignored today, but the table has no column to hold it; sending
 * the field before the apply would do nothing useful and would be wrong the
 * moment the function changes. It ships OFF: the food syncs without its extra
 * portions and nothing fails. The pull (applyCustomFoodFromCloud) reads the
 * field ONLY while this flag is on: once 195 is applied, food_sync_pull's
 * to_jsonb(t) returns portions_json on every row, NULL for every food a
 * flag-off build pushed, so a flag-off build that read it would erase its own
 * portions on its own push-then-pull. With the flag off the local portions
 * always stand.
 *
 * Flip to true ONLY after the founder has applied 195 and its presence is
 * verified read-only (the supabase/README status block says APPLIED, the
 * migration header is edited to match, and the guard in
 * src/lib/sync/__tests__/foodDomain.customPortions.test.js is
 * re-pinned in the same landing).
 */
// ON since 2026-10-16: migrate_195 APPLIED to production 21:05:44 UTC under the
// founder's "run against production 194 195", verified read-only
// (custom_foods.portions_json jsonb; food_sync_push reads it, syncs updated and
// deleted custom foods, never revives a deleted one).
export const CUSTOM_FOOD_PORTIONS_PUSH = true;

/**
 * FOOD_ENTRY_NOTE_PUSH (D230 R20; the ENTRY_TYPED_PUSH pattern above): gates
 * whether food_entries.note, the one line a person writes on a diary entry (the
 * name a quick add never had, the line an import writes), goes in the
 * food_entries record of the food_sync_push upsert.
 *
 * The local column exists (SCHEMA_MIGRATIONS in database.js) and its cloud
 * counterpart, supabase/migrate_194_food_entries_note.sql, is WRITTEN, HELD, NOT
 * APPLIED (CLAUDE.md Section 2: nothing is applied without the founder's exact
 * phrase "run against production"). food_sync_push names its columns: it
 * reads each one from the pushed record by name (v_row->>'entry_date' and so
 * on, migrate_118 and migrate_195), so a key the deployed function does not
 * read is ignored, not rejected. Before 194 the function never reads `note`
 * and the table has no column for it, so a note sent then would be dropped
 * silently; this stays FALSE and the push omits the key: the entry still
 * syncs, without its note, and nothing fails. The pull
 * (applyFoodEntryFromCloud) reads the cloud note ONLY while this flag is on:
 * once 194 is applied, food_sync_pull's to_jsonb(t) returns `note` on every
 * row, NULL for every entry a flag-off build pushed, so a flag-off build that
 * read it would erase its own notes on its own push-then-pull. With the flag
 * off the local note always stands.
 *
 * Flip this to true ONLY after migrate_194 is applied and its presence is
 * verified read-only (supabase/README status block says APPLIED, the migration
 * header is edited to match, and the guard in
 * src/lib/food/__tests__/entryNote.test.js is re-pinned in the same landing).
 */
// ON since 2026-10-16: migrate_194 APPLIED to production 21:01:33 UTC under the
// founder's "run against production 194 195", verified read-only
// (food_entries.note text; food_sync_push writes it only when the key is sent).
export const FOOD_ENTRY_NOTE_PUSH = true;

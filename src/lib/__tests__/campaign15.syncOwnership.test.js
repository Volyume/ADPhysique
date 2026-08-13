/**
 * CAMPAIGN 15 job 4 — duplicate generic-vs-dedicated sync ownership.
 *
 * What this suite pins and why:
 *
 * Campaign 14 inverted generic preference sync to a fail-closed allowlist
 * (SYNCED_PREF_PATTERNS in src/lib/sync.js, governing push and pull through
 * the one shouldSyncPref predicate). Two keys were left in that allowlist
 * CONSERVATIVELY, because each also has a dedicated cloud table and the
 * dedicated round-trip could not be proven at the time:
 *
 *   @volyume_nutrition_targets        (dedicated table: nutrition_targets)
 *   @volyume_perday_target_offsets    (dedicated table: perday_target_offsets)
 *
 * A single piece of user state must not have two independent cross-device
 * authorities: two writers for one value means the loser's copy silently
 * wins on whichever ordering the session happens to take. This suite records
 * the behavioural truth found when both keys were traced end to end, so the
 * next person cannot "tidy up" either entry on the architecture argument
 * alone, and cannot regress the properties that make the current split safe.
 *
 * The rulings it pins:
 *
 *  (16) nutrition targets are a SPLIT, not a duplicate. The dedicated table
 *       owns the ENGINE row in SQLite. The AsyncStorage key is a separate
 *       display mirror with its own readers and at least one field the cloud
 *       row has no column for, and generic pref sync is its ONLY restore
 *       path. Both stay; each owns a different store.
 *
 *  (17) per-day offsets: the dedicated table is the designed authority and
 *       does restore on a fresh install, but it is not yet a complete
 *       carrier. Its push is skipped whenever the local write clock is 0, so
 *       offsets saved by a pre-sync build never reach it. The generic key is
 *       the only carrier for those users and therefore stays.
 *
 *  (18) no mechanism can silently overwrite the other's store, and neither
 *       mechanism can reach an engine value or an ED-safety floor. The one
 *       remaining shared-store exposure (the unanchored per-day pattern also
 *       matching the sibling write clock) is pinned as recorded debt so it
 *       cannot be lost, and the reasoning comment is locked at source.
 *
 * Written to FAIL if any of the load-bearing facts above stop being true.
 */

jest.mock('../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const fs = require('fs');
const path = require('path');

const { shouldSyncPref, isGuardedPref } = require('../sync');
const { getRegistryEntry } = require('../sync/registry');

const SRC = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

const SYNC_SRC = SRC('../sync.js');
const DB_SRC = SRC('../database.js');
const NUTRITION_TABLE_SRC = SRC('../sync/tables/nutritionTargets.js');
const PERDAY_TABLE_SRC = SRC('../sync/tables/perDayTargetOffsets.js');
const PERDAY_SRC = SRC('../food/perDayTargets.js');

const NUTRITION_MIRROR_KEY = '@volyume_nutrition_targets';
const PERDAY_KEY = '@volyume_perday_target_offsets';
const PERDAY_CLOCK_KEY = '@volyume_perday_target_offsets_updated_at';

/** The body of a named function in a source file, up to its closing brace. */
function functionBody(src, signature) {
  const start = src.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n}', start);
  return src.slice(start, end === -1 ? undefined : end);
}

// ─── (16) nutrition targets ──────────────────────────────────────────────────

describe('C15-16 nutrition targets: the mirror and the engine row own different stores', () => {
  test('the generic mirror key still syncs, in both directions', () => {
    // Push and pull share this one predicate, so this single assertion is the
    // whole cross-device contract for the mirror.
    expect(shouldSyncPref(NUTRITION_MIRROR_KEY)).toBe(true);
  });

  test('the dedicated table is a real, bidirectional, last-write-wins authority', () => {
    const entry = getRegistryEntry('nutrition_targets');
    expect(entry).not.toBeNull();
    expect(entry.direction).toBe('bidirectional');
    expect(entry.conflictStrategy).toBe('last_write_wins');
    // The engine computes these locally; the cloud copy exists for restore,
    // never for server-side computation.
    expect(entry.serverAuthoritative).toBe(false);
    expect(entry.pk).toBe('user_id');
  });

  test('the dedicated restore writes SQLite and CANNOT repopulate the mirror', () => {
    // This is the single fact that decided the ruling. If
    // insertNutritionTargetsFromCloud ever learns to write the AsyncStorage
    // mirror, the generic allowlist entry becomes removable - and this test
    // is where that is discovered, deliberately.
    const body = functionBody(
      DB_SRC, 'export async function insertNutritionTargetsFromCloud',
    );
    expect(body).toMatch(/nutrition_targets/);
    expect(body).not.toMatch(/AsyncStorage/);
    expect(body).not.toContain(NUTRITION_MIRROR_KEY);
  });

  test('the dedicated pull routes through that applier and nothing else', () => {
    expect(NUTRITION_TABLE_SRC).toMatch(/insertNutritionTargetsFromCloud/);
    // It reads the cloud row and hands it to the local applier. It must never
    // take a second route into AsyncStorage behind the applier's back.
    expect(NUTRITION_TABLE_SRC).not.toMatch(/AsyncStorage/);
    expect(NUTRITION_TABLE_SRC).not.toContain(NUTRITION_MIRROR_KEY);
  });

  test('the mirror has live readers that read ONLY the mirror', () => {
    // Removing the allowlist entry would blank each of these after a
    // reinstall, because nothing else restores the key.
    const readers = [
      '../../screens/HomeScreen.js',            // phase-mismatch banner
      '../../screens/ProSetupCompleteScreen.js', // kcal ring + macro summary
      '../../screens/BodyMetricsScreen.js',      // nutrition card
    ];
    for (const rel of readers) {
      const body = SRC(rel);
      expect(body).toContain(NUTRITION_MIRROR_KEY);
    }
  });

  test('the mirror carries a field the cloud row has no column for', () => {
    // maintenanceKcal is written into the mirror by onboarding and read back
    // by the Body Metrics TDEE estimate. Neither the local nutrition_targets
    // schema nor the push row has a column for it, so the dedicated path
    // cannot carry it at all: the two copies are genuinely not the same state.
    expect(SRC('../../screens/ProOnboardingScreen.js')).toMatch(/maintenanceKcal/);
    expect(SRC('../../screens/BodyMetricsScreen.js')).toMatch(/maintenanceKcal/);

    const schema = DB_SRC.slice(
      DB_SRC.indexOf('CREATE TABLE IF NOT EXISTS nutrition_targets'),
      DB_SRC.indexOf('CREATE TABLE IF NOT EXISTS peak_week_plans'),
    );
    expect(schema.length).toBeGreaterThan(0);
    expect(schema).not.toMatch(/maintenance_kcal/);
    expect(NUTRITION_TABLE_SRC).not.toMatch(/maintenance_kcal/);
  });

  test('the mirror is NOT a guarded pref, and does not pretend to be', () => {
    // Guarding it would imply a conflict rule it does not have. Its conflict
    // rule is the plain generic one (cloud value wins on pull); the engine
    // row keeps the real last-write-wins gate.
    expect(isGuardedPref(NUTRITION_MIRROR_KEY)).toBe(false);
  });
});

// ─── (17) per-day target offsets ─────────────────────────────────────────────

describe('C15-17 per-day offsets: the dedicated table restores, but is not yet a complete carrier', () => {
  test('the generic key still syncs, in both directions', () => {
    expect(shouldSyncPref(PERDAY_KEY)).toBe(true);
  });

  test('the dedicated table is a real, bidirectional, last-write-wins authority', () => {
    const entry = getRegistryEntry('perday_target_offsets');
    expect(entry).not.toBeNull();
    expect(entry.direction).toBe('bidirectional');
    expect(entry.conflictStrategy).toBe('last_write_wins');
    expect(entry.serverAuthoritative).toBe(false);
    expect(entry.pk).toBe('user_id');
    // "Reset all to base target" writes zeros, it never deletes the row.
    expect(entry.softDelete).toBe(false);
  });

  test('the dedicated push is SKIPPED when the local write clock is 0', () => {
    // THE reason the generic key cannot be removed. Offsets last saved by a
    // build older than the sync handler have the payload key but no clock, so
    // loadPerDayOffsetsUpdatedAtMs reads 0 and this early return means their
    // offsets never reach the dedicated table at all. Generic pref sync is
    // their only carrier. If this guard is ever replaced by a clock backfill,
    // the dedicated path becomes complete and the allowlist entry can go.
    expect(PERDAY_TABLE_SRC).toMatch(/if \(!updatedAtMs\) return \{ count: 0, errors: 0 \};/);
  });

  test('the write clock reads 0 when the payload exists but the clock does not', () => {
    // The pre-sync shape, stated behaviourally rather than assumed.
    expect(PERDAY_SRC).toMatch(/const n = raw \? Number\(raw\) : 0;/);
    expect(PERDAY_SRC).toContain(PERDAY_CLOCK_KEY);
  });

  test('the dedicated pull applies through the last-write-wins gate, never around it', () => {
    expect(PERDAY_TABLE_SRC).toMatch(/applyPerDayOffsetsFromCloud/);
    // The handler must not write AsyncStorage itself; the gate lives in the
    // applier and is the only way in. Scoped to the CODE: the module header
    // legitimately discusses the storage layer in prose.
    const code = PERDAY_TABLE_SRC.slice(PERDAY_TABLE_SRC.indexOf('\nimport '));
    expect(code).not.toMatch(/AsyncStorage/);
  });
});

describe('C15-17 the dedicated per-day round trip, behaviourally', () => {
  // Real module, mocked storage only. This is the fresh-install proof.
  let store;
  let applyPerDayOffsetsFromCloud;
  let loadPerDayOffsets;
  let loadPerDayOffsetsUpdatedAtMs;
  let savePerDayOffsets;
  let loadPerDayOffsetsForSync;

  beforeEach(() => {
    jest.resetModules();
    store = {};
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      getItem: jest.fn((k) => Promise.resolve(k in store ? store[k] : null)),
      setItem: jest.fn((k, v) => { store[k] = v; return Promise.resolve(); }),
    }));
    jest.doMock('../sync', () => ({ scheduleSync: jest.fn() }));
    // eslint-disable-next-line global-require
    const mod = require('../food/perDayTargets');
    ({
      applyPerDayOffsetsFromCloud, loadPerDayOffsets,
      loadPerDayOffsetsUpdatedAtMs, savePerDayOffsets, loadPerDayOffsetsForSync,
    } = mod);
  });

  test('a fresh install with no local clock accepts the cloud row', async () => {
    // Nothing in storage: exactly a reinstall before any local edit. The
    // dedicated pull must land the user's offsets.
    const applied = await applyPerDayOffsetsFromCloud(
      { mon: -200, tue: 0, wed: 0, thu: 0, fri: 0, sat: 300, sun: 300 },
      1_700_000_000_000,
    );
    expect(applied).toBe(true);
    await expect(loadPerDayOffsets()).resolves.toMatchObject({ mon: -200, sat: 300, sun: 300 });
    await expect(loadPerDayOffsetsUpdatedAtMs()).resolves.toBe(1_700_000_000_000);
  });

  test('an older cloud row is refused, so the pull cannot walk a device backwards', async () => {
    await savePerDayOffsets({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 500, sun: 0 });
    const localMs = await loadPerDayOffsetsUpdatedAtMs();
    expect(localMs).toBeGreaterThan(0);

    const applied = await applyPerDayOffsetsFromCloud(
      { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }, localMs - 1,
    );
    expect(applied).toBe(false);
    await expect(loadPerDayOffsets()).resolves.toMatchObject({ sat: 500 });
  });

  test('a pre-sync device (payload, no clock) reports clock 0, so its push is skipped', async () => {
    // The exact state that keeps the generic key alive: the payload is there
    // and readable, but the sync clock the dedicated push gates on is absent.
    store[PERDAY_KEY] = JSON.stringify({
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 400, sun: 400,
    });
    const { offsets, updatedAtMs } = await loadPerDayOffsetsForSync();
    expect(offsets).toMatchObject({ sat: 400, sun: 400 });
    expect(updatedAtMs).toBe(0);
  });
});

// ─── (18) no double authority over one store ─────────────────────────────────

describe('C15-18 neither mechanism can silently overwrite the other', () => {
  test('generic pref sync writes AsyncStorage ONLY, never the engine row', () => {
    // The generic pull is an unconditional multiSet for unguarded keys, so
    // the only thing keeping it away from the calorie/macro engine row is
    // that it has no route into SQLite at all. Pin that.
    const body = functionBody(SYNC_SRC, 'async function _pullUserPrefs');
    expect(body).toMatch(/AsyncStorage\.multiSet\(/);
    expect(body).not.toMatch(/nutrition_targets/);
    expect(body).not.toMatch(/insertNutritionTargetsFromCloud/);
    expect(body).not.toMatch(/saveNutritionTargets/);
    expect(body).not.toMatch(/perday_target_offsets'/);
  });

  test('the engine row keeps its own gate and refuses an unprovable cloud stamp', () => {
    // A calorie surface: a cloud row that cannot prove it is newer must not
    // win over a live local row. Generic pref sync has no equivalent gate,
    // which is precisely why it must never own this row.
    const body = functionBody(
      DB_SRC, 'export async function insertNutritionTargetsFromCloud',
    );
    expect(body).toMatch(/if \(!Number\.isFinite\(cloudStampMs\)\) return;/);
    expect(body).toMatch(/if \(\(existing\.updated_at \?\? 0\) >= updatedAt\) return;/);
  });

  test('the per-day offsets never reach the engine, a target value or a floor', () => {
    // ED-safety: this is a display layer. Whatever mechanism carries it, it
    // must not be able to move a stored target or a safety floor.
    expect(PERDAY_SRC).not.toMatch(/saveNutritionTargets/);
    expect(PERDAY_SRC).not.toMatch(/calculateNutritionTargets/);
    const code = PERDAY_TABLE_SRC.slice(PERDAY_TABLE_SRC.indexOf('\nimport '));
    expect(code).not.toMatch(/saveNutritionTargets/);
    // The real risk is a QUERY against the sibling table, not a comment
    // naming it: both files reference nutrition_targets in prose only, to
    // explain which guard pattern they copied.
    expect(code).not.toMatch(/from\(['"]nutrition_targets['"]\)/);
    expect(code).not.toMatch(/INTO nutrition_targets/i);
  });

  test('the per-day WRITE CLOCK is device state and does not sync (lead ruling)', () => {
    // The allowlist pattern used to be unanchored, so it also matched the
    // sibling @volyume_perday_target_offsets_updated_at. That key is THIS
    // device's write provenance - the same class as the
    // @volyume_pref_written_at_ stamps refused below - and it is not a
    // guarded pref, so the pull's unconditional multiSet imported another
    // device's clock straight over the push gate the clock exists to feed.
    // Anchoring cost nothing: there are exactly two keys, neither is
    // per-user, and the payload still rides generic sync.
    expect(shouldSyncPref(PERDAY_CLOCK_KEY)).toBe(false);
    expect(shouldSyncPref(PERDAY_KEY)).toBe(true);
    // Belt and braces: it is ALSO named in the exclusion list, which is
    // evaluated first, so widening the allowlist again cannot re-open it.
    expect(isGuardedPref(PERDAY_CLOCK_KEY)).toBe(false);
    // The write stamps for guarded prefs are refused by the same rule.
    expect(shouldSyncPref('@volyume_pref_written_at_@volyume_landmarks_abc')).toBe(false);
  });

  test('the ownership ruling is recorded at source, beside the allowlist entries', () => {
    // Source-level guard in the repo's existing style: the reasoning is the
    // deliverable, so it must not be silently deleted while the entries stay.
    const start = SYNC_SRC.indexOf('const SYNCED_PREF_PATTERNS = [');
    expect(start).toBeGreaterThan(-1);
    const block = SYNC_SRC.slice(start, SYNC_SRC.indexOf('\n];', start));
    expect(block).toMatch(/C15 job 4/);
    expect(block).toMatch(/SPLIT OWNERSHIP/);
    expect(block).toMatch(/ANCHORED/);
    expect(block).toMatch(/maintenanceKcal/);
    expect(block).toMatch(/pushPerDayTargetOffsets/);
  });
});

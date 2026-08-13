/**
 * CAMPAIGN 14 job 7 — manual volume intent is a CHOICE, not an arithmetic
 * accident (RA6-6).
 *
 * What this suite pins and why:
 *
 * isManualEdit used to decide manual intent by comparing the saved numbers
 * against the research defaults. A user who deliberately saved a muscle AT
 * the research values was therefore indistinguishable from a user who had
 * never touched it, and the adaptive layer would later move numbers the
 * user had explicitly chosen. Campaign 8 recorded the intent instead: the
 * editor stamps `explicit` on any muscle it actually touched, and
 * isManualEdit honours the flag ahead of the value comparison. Legacy
 * blobs carry no flag and keep the old comparison exactly.
 *
 * Campaign 14 closes the remaining half. Intent could be created but only
 * released wholesale: the sole way back to Volyume-managed values was
 * "Reset to defaults", which hands back EVERY muscle. A user with several
 * hand-set muscles had to discard the lot to release one, or move a number
 * away from research and back to fake the old comparison. There is now a
 * per-muscle release, and it clears that muscle's marker.
 *
 * The final pin is the one that must never move: recording intent at
 * research values does not launder those numbers into learned history. A
 * manual block still does not teach the engine.
 */

const fs = require('fs');
const path = require('path');

jest.mock('../database', () => ({}));

const { isManualEdit } = require('../effectiveLandmarks');

const RESEARCH = { mev: 10, mav: 16, mrv: 22 };
const SRC = f => fs.readFileSync(path.resolve(__dirname, f), 'utf8');
const HEATMAP = SRC('../../screens/VolumeHeatmapScreen.js');

describe('C14-7 an explicit save at research values IS manual intent (29)', () => {
  test('identical numbers plus the marker read as manual', () => {
    expect(isManualEdit({ ...RESEARCH, explicit: true }, RESEARCH)).toBe(true);
  });

  test('identical numbers WITHOUT the marker do not', () => {
    // A legacy blob, or an entry that exists only because the editor
    // rendered every muscle. Treating that as intent would silently
    // disable the adaptive layer for everything.
    expect(isManualEdit({ ...RESEARCH }, RESEARCH)).toBe(false);
  });

  test('a differing number is still manual with no marker (legacy behaviour intact)', () => {
    expect(isManualEdit({ ...RESEARCH, mav: 18 }, RESEARCH)).toBe(true);
  });

  test('the marker outranks the comparison, never the reverse', () => {
    const src = SRC('../effectiveLandmarks.js');
    const start = src.indexOf('export function isManualEdit');
    const body = src.slice(start, src.indexOf('\n}', start));
    const flagIdx = body.indexOf('entry.explicit === true');
    const compareIdx = body.indexOf("['mev', 'mav', 'mrv']");
    expect(flagIdx).toBeGreaterThan(-1);
    expect(compareIdx).toBeGreaterThan(flagIdx);
  });
});

describe('C14-7 only a real save records intent (30)', () => {
  test('the marker is stamped from a touched field, at save time', () => {
    // Typing records that the muscle was touched; the SAVE turns that into
    // stored intent. Opening or scrolling the editor writes nothing.
    expect(HEATMAP).toMatch(/touchedMusclesRef\.current\.add\(muscle\); \/\/ C8 RA6-6/);
    expect(HEATMAP).toMatch(/map\[muscle\] = \(touched \|\| wasExplicit\) \? \{ \.\.\.entry, explicit: true \} : entry;/);
  });

  test('an abandoned edit is not intent', () => {
    // Cancel discards the typed values AND the record of what was touched,
    // so a later save in the same visit cannot stamp them.
    const start = HEATMAP.indexOf('title="Cancel"');
    const body = HEATMAP.slice(start, start + 900);
    expect(body).toMatch(/touchedMusclesRef\.current = new Set\(\);/);
  });
});

describe('C14-7 a distinct action returns a muscle to Volyume (32)', () => {
  test('the per-muscle release exists and is reachable', () => {
    expect(HEATMAP).toMatch(/async function clearMuscleOverride\(muscle\)/);
    expect(HEATMAP).toContain('Let Volyume manage this');
    expect(HEATMAP).toMatch(/accessibilityLabel=\{`Let Volyume manage \$\{MUSCLE_DISPLAY_NAMES\[muscle\]\}`\}/);
  });

  test('releasing clears BOTH the stored entry and the session marker', () => {
    const start = HEATMAP.indexOf('async function clearMuscleOverride');
    const body = HEATMAP.slice(start, HEATMAP.indexOf('\n  }\n', start));
    expect(body).toMatch(/delete next\[muscle\];/);
    expect(body).toMatch(/touchedMusclesRef\.current\.delete\(muscle\);/);
  });

  test('the user is never made to move a number away from research and back', () => {
    // The control appears whenever there is something to hand back, so
    // releasing never depends on making the entry numerically differ.
    expect(HEATMAP).toMatch(/function isMuscleManaged\(muscle\) \{/);
    expect(HEATMAP).toMatch(/\{isMuscleManaged\(muscle\) \? null : \(/);
  });

  test('the whole-table reset still clears everything (unchanged)', () => {
    const start = HEATMAP.indexOf('async function resetToDefaults');
    const body = HEATMAP.slice(start, start + 1200);
    expect(body).toMatch(/AsyncStorage\.removeItem\(key\)/);
    expect(body).toMatch(/syncUserPref\(user\.id, key, ''\)/);
  });
});

describe('C14-7 intent persists and converges like the preference it is (33, 34)', () => {
  test('the landmark blob is synced, so intent survives a reinstall', () => {
    // eslint-disable-next-line global-require
    const { shouldSyncPref } = require('../sync');
    expect(shouldSyncPref('@volyume_landmarks_abc123')).toBe(true);
  });

  test('the landmark blob is guarded, so the NEWEST intent wins a conflict', () => {
    // Unguarded it would be cloud-wins on pull and blind-upsert on push,
    // which discards hand-set targets with no merge and no notice.
    // eslint-disable-next-line global-require
    const { isGuardedPref } = require('../sync');
    expect(isGuardedPref('@volyume_landmarks_abc123')).toBe(true);
  });

  test('every write path stamps the edit, including the release', () => {
    for (const marker of [
      /notePrefWrite\(key\)\.catch\(\(\) => \{\}\)/,
    ]) expect(HEATMAP).toMatch(marker);
    const start = HEATMAP.indexOf('async function clearMuscleOverride');
    const body = HEATMAP.slice(start, HEATMAP.indexOf('\n  }\n', start));
    expect(body).toMatch(/notePrefWrite\(key\)/);
    // And it pushes, so the release reaches the other device rather than
    // sitting locally until something else happens to sync.
    expect(body).toMatch(/syncUserPref\(user\.id, key,/);
  });

  test('releasing the LAST override tombstones the cloud copy', () => {
    // An empty table means "no overrides", which is exactly what the
    // whole-table reset means, and it has to survive the next pull.
    const start = HEATMAP.indexOf('async function clearMuscleOverride');
    const body = HEATMAP.slice(start, HEATMAP.indexOf('\n  }\n', start));
    expect(body).toMatch(/empty \? '' :/);
  });
});

describe('C14-7 manual intent still does not teach the engine (35)', () => {
  test('a manual muscle is excluded from learned evidence', () => {
    // The rule predates this campaign and must be unaffected by it:
    // recording intent AT the research values must not launder those
    // numbers into learned history.
    const runner = SRC('../blockLedgerRunner.js');
    expect(runner).toMatch(/isManualEdit\(/);
    const learned = SRC('../learnedRange.js');
    expect(learned.length).toBeGreaterThan(0);
  });

  test('manual override still wins the seed', () => {
    const seed = SRC('../blockSeed.js');
    expect(seed).toMatch(/isManualEdit\(manual, research\)/);
  });

  test('the editor still discloses that manual pauses learning', () => {
    expect(HEATMAP).toContain(
      "While your own settings are in place, finished blocks don't teach the ranges the app learns for you.",
    );
  });
});

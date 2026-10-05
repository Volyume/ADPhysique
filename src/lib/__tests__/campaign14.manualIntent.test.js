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
 *
 * RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): the editor
 * that recorded and released intent is removed, and the stored targets are no
 * longer read or applied. The pure predicate (29) and the preference's sync
 * contract (33, 34) are unchanged and still pinned here. The editor's own
 * source pins (30, 32, the write-path and tombstone pins of 33) went with it,
 * each replaced by the absence of that machinery, and (35) now says what is
 * left of "manual does not teach the engine" with no editor to feed it.
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

// RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): (30) pinned that only a real save recorded
// intent (the stamp from a touched field, an abandoned edit is not intent) and (32) that a distinct action returned
// one muscle to Volyume. Both were pinned from the editor's source; the editor is gone, so none of it can run.
describe('C14-7 the editor that recorded and released intent (30, 32) is gone', () => {
  test('nothing is left that stamps, discards or releases intent in the Volume heatmap screen', () => {
    expect(HEATMAP).not.toMatch(/touchedMusclesRef|explicit: true|cancelEditing|saveLandmarks/);
    expect(HEATMAP).not.toMatch(/clearMuscleOverride|isMuscleManaged|resetToVolyumeTargets/);
    expect(HEATMAP).not.toContain("Back to Volyume's targets");
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

  // RE-PINNED 2026-10-05 (D219): "every write path stamps the edit, including the release" and "releasing the
  // LAST override tombstones the cloud copy" were pinned from the editor's write paths. There is no write path
  // left, and the screen must not grow one back; the sync registry above is what keeps the stored blob.
  test('no write path is left in the Volume heatmap screen: no stamp, no push, no tombstone', () => {
    expect(HEATMAP).not.toMatch(/notePrefWrite|syncUserPref/);
    expect(HEATMAP).not.toContain('volyume_landmarks');
  });
});

describe('C14-7 manual intent does not teach the engine (35)', () => {
  // RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): with the editor gone and the stored targets
  // never read, no new block is judged against a hand-set number. What is left of the rule is the frozen
  // record: ledger entries stored while a person's targets were in force still carry deferredToManual, and
  // the learned-range replay still skips them, so those blocks do not teach the engine either.
  test('the learned-range replay still skips a stored entry that was deferred to manual', () => {
    const learned = SRC('../learnedRange.js');
    expect(learned).toMatch(/if \(raw\.proposal\?\.deferredToManual\) continue;/);
  });

  test('the seed chain keeps its manual step as a pure mechanism, and nothing feeds it: the getter is inert', async () => {
    const seed = SRC('../blockSeed.js');
    expect(seed).toMatch(/isManualEdit\(manual, research\)/);
    // eslint-disable-next-line global-require
    const { getManualLandmarks } = require('../effectiveLandmarks');
    await expect(getManualLandmarks('abc123')).resolves.toBeNull();
  });

  test('the editor no longer discloses that manual pauses learning, because there is no manual to pause it', () => {
    expect(HEATMAP).not.toContain('While your own settings are in place');
    expect(HEATMAP).not.toContain('stops adjusting these ranges');
  });
});

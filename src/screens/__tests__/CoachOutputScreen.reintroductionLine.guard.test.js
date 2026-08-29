/**
 * CC33 D112 R5 (closes audit T2-25's copy half; lead, post-W4) - the
 * durable reintroduction line in the weekly coaching account.
 *
 * The §23 ramp (capability/reintroduction.js) stamps every stepped
 * planned-volume row `source: 'reintroduction'`. Until this wave nothing
 * read the stamp back: the only copy was the one toast at episode end,
 * so the weeks the ramp was actually happening said nothing anywhere.
 * The wiring pinned here: the screen's week-resolution effect reads the
 * CURRENT and NEXT week's planned rows, derives the ramping muscles off
 * the stamp, builds ONE sentence with reintroductionRampLine, and feeds
 * it into buildCoachStory's changes as `reintroductionNote` - where
 * coachStory.whatIsChanging wraps it with its own why (pinned in
 * coachStory.test.js), exactly the volumeNote pattern.
 *
 * Source-level pins per repo convention (no light render harness for
 * this screen; see the neighbouring CoachOutputScreen.*.guard suites).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8');

describe('T2-25: the ramp note is derived from the stamped rows', () => {
  test('current AND next week are both read - the line holds from the boundary run to the last stepped week', () => {
    const site = SRC.indexOf('const { rampMusclesFromPlannedRows, reintroductionRampLine }');
    expect(site).toBeGreaterThan(-1);
    const block = SRC.slice(site, site + 900);
    expect(block).toContain("cur?.id ? getPlannedMuscleVolume(cur.id) : Promise.resolve([])");
    expect(block).toContain("next?.id ? getPlannedMuscleVolume(next.id) : Promise.resolve([])");
    expect(block).toContain('rampMusclesFromPlannedRows(curRows)');
    expect(block).toContain('rampMusclesFromPlannedRows(nextRows)');
    expect(block).toMatch(/reintroductionRampLine\(muscles\.map\(\(m\) => muscleDisplayName\(m\) \?\? m\)\)/);
  });

  test('a failed read clears the note rather than leaving a stale line', () => {
    expect(SRC).toContain('} catch (_e) { setRampNote(null); }');
    // The effect\'s outer catch resets it alongside its sibling states.
    expect(SRC).toMatch(/setCurrentRecoveryState\(null\);\s*\n\s*setRampNote\(null\);/);
  });
});

describe('T2-25: the note reaches the story as a change', () => {
  test('buildCoachStory receives reintroductionNote beside volumeNote', () => {
    const site = SRC.indexOf('const weeklyStory = buildCoachStory({');
    expect(site).toBeGreaterThan(-1);
    const block = SRC.slice(site, SRC.indexOf('});', site) + 3);
    expect(block).toContain('reintroductionNote: rampNote,');
  });
});

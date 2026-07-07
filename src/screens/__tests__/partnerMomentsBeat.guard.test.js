/**
 * C3 wiring guard: the post-workout partner beat consumes the milestone
 * MOMENTS ENGINE. Source-regex guard (repo convention, cf.
 * wellbeingFailClosed.guard.test.js): it pins that WorkoutSummaryScreen.js
 *   - imports getVisibleMoments + markMomentSeen from the moments engine;
 *   - fetches moments for the ACTIVE pair only;
 *   - renders the moment line in place of the generic tick line;
 *   - marks the moment seen on cheer AND on unmount;
 *   - keeps the existing beat gating (readOnly / calmSuppressed / pro / paired)
 *     around the moment path — the beat never widens to unpaired users.
 * It does NOT re-test the engine (that lives in moments.test.js); it locks the
 * wiring so a later edit cannot silently drop the moment surface or its
 * mark-seen calls.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.resolve(__dirname, '../WorkoutSummaryScreen.js'), 'utf8',
);

describe('WorkoutSummaryScreen partner-beat moment wiring', () => {
  test('imports the moments engine', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\bgetVisibleMoments\b[^}]*\bmarkMomentSeen\b[^}]*\}\s*from\s*'\.\.\/lib\/partners\/moments'/,
    );
  });

  test('fetches moments and matches them to the active pair', () => {
    expect(src).toMatch(/getVisibleMoments\(user\.id\)/);
    expect(src).toMatch(/\.pairId\s*===\s*activePairId/);
  });

  test('renders the moment line in place of the generic tick line', () => {
    expect(src).toMatch(/partnerMoment\s*\n?\s*\?\s*partnerMoment\.line/);
  });

  test('marks the moment seen on cheer and on unmount', () => {
    // At least two markMomentSeen call sites (cheer handler + unmount cleanup).
    const calls = src.match(/markMomentSeen\(/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // The unmount cleanup marks the ref'd moment seen.
    expect(src).toMatch(/markMomentSeen\(partnerMomentRef\.current\.id\)/);
  });

  test('post-workout cheer waits for the partner call and reports failures', () => {
    expect(src).toMatch(/async function handlePostWorkoutCheer/);
    expect(src).toMatch(/const result = await partners\.cheer\(partners\.partnership\.id, undefined, !!reciprocal\)/);
    expect(src).toMatch(/result\?\.ok \|\| result\?\.error === 'already_cheered'/);
    expect(src).toMatch(/WorkoutSummaryScreen\.postWorkoutCheer/);
    expect(src).toMatch(/partnerCheerFailureMessage\(result\?\.error\)/);
    expect(src).toContain("error === 'not_active' || error === 'partner_syncing'");
    expect(src).toContain('Volyume is still setting up this partnership on this device.');
    expect(src).toMatch(/variant: result\?\.error === 'partner_syncing' \|\| result\?\.error === 'not_active' \? 'warning' : 'error'/);
    expect(src).toContain('Partner cheers are not available right now. Try again later.');
    expect(src).toContain('Partner cheers need the latest partner update before they can send.');
  });

  test('post-workout cheer cannot double-send while the partner call is in flight', () => {
    expect(src).toContain('const [postWorkoutCheerSending, setPostWorkoutCheerSending] = useState(false);');
    expect(src).toMatch(/if \(!partners\?\.cheerEnabled \|\| postWorkoutCheerSending\) return/);
    expect(src).toMatch(/setPostWorkoutCheerSending\(true\);/);
    expect(src).toMatch(/finally \{\s*setPostWorkoutCheerSending\(false\);/);
    expect(src).toMatch(/disabled=\{!partners\.cheerEnabled \|\| postWorkoutCheerSending\}/);
    expect(src).toContain("postWorkoutCheerSending ? 'Sending' : partners.cheerEnabled ? 'Cheer' : 'Sent'");
  });

  test('the beat keeps its existing gating (no new beat for unpaired users)', () => {
    expect(src).toMatch(/!readOnly\s*&&\s*!calmSuppressed\s*&&\s*tier === 'pro'/);
    expect(src).toMatch(/partners\.rowState === 'active'\s*\|\|\s*partners\.rowState === 'resting'/);
  });

  test('the beat can open a one-card partner win preview without widening sharing', () => {
    expect(src).toMatch(/import\s*\{\s*navigateCrossTab\s*\}\s*from\s*'\.\.\/navigation\/navigateCrossTab'/);
    expect(src).toMatch(/accessibilityLabel="Preview this workout win for a partner"/);
    expect(src).toMatch(/navigateCrossTab\(navigation,\s*'ProgressTab',\s*'Partner'/);
    expect(src).toMatch(/shareWinType:\s*'personal_record'/);
    expect(src).toMatch(/shareWinType:\s*'workout_summary'/);
    expect(src).toMatch(/source:\s*'workout_summary_partner_win'/);
  });
});

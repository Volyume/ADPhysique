/**
 * C3 wiring guard + L06-F4 fix. Prior to the fix, the post-workout partner
 * beat only ever addressed usePartners' single "primary" partnership
 * (partners.partnership / partners.rowState / partners.cheerEnabled), so a Pro
 * user with 2-3 paired partners never saw a cheer affordance for any partner
 * but one. The fix surfaces EVERY currently active/resting paired partner as
 * its own beat row.
 *
 * Source-regex guard (repo convention, cf. wellbeingFailClosed.guard.test.js):
 * it pins that WorkoutSummaryScreen.js
 *   - imports getVisibleMoments + markMomentSeen from the moments engine;
 *   - derives the beat's pair list from partners.pairs (never falls back to
 *     the single-pair partners.partnership/rowState/cheerEnabled convenience
 *     fields usePartners keeps only for legacy single-pair consumers);
 *   - fetches moments ONCE per render and matches each back to its own
 *     pairId, so a pair without a moment still renders its own tick-line
 *     fallback while a sibling pair's moment still shows;
 *   - renders one row per pair via a plain map keyed by pair.id (so 1 pair
 *     renders 1 row and 3 pairs render 3 rows through the same code path,
 *     i.e. single-partner behaviour is not a separate branch that could
 *     drift from the multi-partner path);
 *   - gates the whole beat behind !readOnly && !calmSuppressed &&
 *     tier === 'pro', so free tier, read-only history views and calm/ED
 *     suppression still hide it completely;
 *   - tracks the in-flight cheer send PER PAIR (sendingCheerPairIds keyed by
 *     pairId) so sending to one partner never disables another's button;
 *   - marks every still-shown moment seen on unmount, not just one;
 *   - keeps the existing cheer failure copy register untouched.
 * It does NOT re-test the moments engine (that lives in moments.test.js); it
 * locks the wiring so a later edit cannot silently collapse back to a single
 * partner.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.resolve(__dirname, '../WorkoutSummaryScreen.js'), 'utf8',
);

describe('WorkoutSummaryScreen partner-beat: every paired partner, not just one', () => {
  test('imports the moments engine', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\bgetVisibleMoments\b[^}]*\bmarkMomentSeen\b[^}]*\}\s*from\s*'\.\.\/lib\/partners\/moments'/,
    );
  });

  test('derives the beat pair list from partners.pairs, gated pro/live/non-calm', () => {
    expect(src).toMatch(/const activeBeatPairs = \(!readOnly && !calmSuppressed && tier === 'pro'\)/);
    expect(src).toMatch(
      /\(partners\.pairs \|\| \[\]\)\.filter\(\(pp\) => pp\.rowState === 'active' \|\| pp\.rowState === 'resting'\)/,
    );
    // The old single-pair convenience fields must not resurface as the beat's gate.
    expect(src).not.toMatch(/partners\.partnership/);
    expect(src).not.toMatch(/partners\.rowState/);
    expect(src).not.toMatch(/partners\.cheerEnabled/);
    expect(src).not.toMatch(/partners\.partnerWeek/);
  });

  test('fetches moments once and matches each back to its own pairId', () => {
    expect(src).toMatch(/getVisibleMoments\(user\.id\)/);
    expect(src).toMatch(/const idSet = new Set\(activeBeatPairIds\.split\('\|'\)\)/);
    expect(src).toMatch(/if \(m\?\.pairId && idSet\.has\(m\.pairId\)\) byPair\[m\.pairId\] = m;/);
  });

  test('renders one beat row per active pair through a single shared code path', () => {
    expect(src).toMatch(/\{activeBeatPairs\.map\(\(pair\) => \{/);
    expect(src).toMatch(/<RevealSection key=\{pair\.id\}/);
    // No length-based special case: n=1 (single-partner) is the same map as n>1.
    expect(src).not.toMatch(/activeBeatPairs\.length === 1/);
    expect(src).not.toMatch(/activeBeatPairs\[0\]/);
  });

  test('each row shows its own moment line, or its own resting/tick fallback', () => {
    expect(src).toMatch(/moment\s*\n?\s*\?\s*moment\.line/);
    expect(src).toMatch(/pair\.rowState === 'resting'/);
    expect(src).toMatch(
      /ticksLabel\(\{ done: pair\.partnerWeek\?\.done, planned: pair\.partnerWeek\?\.planned \}\)/,
    );
  });

  test('the cheer send is independent per pair (in-flight guard keyed by pairId)', () => {
    expect(src).toMatch(/const \[sendingCheerPairIds, setSendingCheerPairIds\] = useState\(\{\}\);/);
    expect(src).toMatch(/async function handlePostWorkoutCheer\(pair\)/);
    expect(src).toMatch(/if \(!pair\?\.cheerEnabled \|\| !pairId \|\| sendingCheerPairIds\[pairId\]\)/);
    expect(src).toMatch(/const result = await partners\.cheer\(pairId, undefined, !!reciprocal\)/);
    expect(src).toMatch(/disabled=\{!pair\.cheerEnabled \|\| sending\}/);
  });

  test('marks every still-shown moment seen on unmount, not just one', () => {
    expect(src).toMatch(/for \(const m of Object\.values\(partnerMomentsRef\.current \|\| \{\}\)\)/);
    expect(src).toMatch(/if \(m\?\.id\) markMomentSeen\(m\.id\)\.catch\(\(\) => \{\}\);/);
  });

  test('cheering a pair marks only that pair\'s own moment seen', () => {
    expect(src).toMatch(/const moment = partnerMomentsRef\.current\?\.\[pairId\];/);
    expect(src).toMatch(/markMomentSeen\(moment\.id\)\.catch\(\(\) => \{\}\);/);
  });

  test('post-workout cheer reports failures with the existing copy register', () => {
    expect(src).toMatch(/partnerCheerFailureMessage\(result\?\.error\)/);
    expect(src).toContain("error === 'not_active' || error === 'partner_syncing'");
    expect(src).toContain('This partner link is still being prepared.');
    expect(src).toContain('Partner cheers are not available right now. Try again later.');
    expect(src).toContain('Partner cheers need the latest app update before they can send.');
  });

  test('the beat keeps its existing gating (free tier / read-only / calm never see it)', () => {
    expect(src).toMatch(/!readOnly && !calmSuppressed && tier === 'pro'/);
  });

  test('preview win can target the specific pair its row belongs to', () => {
    expect(src).toMatch(/function handlePreviewPartnerWin\(pairId\)/);
    expect(src).toMatch(/pairId: pairId \|\| undefined/);
    expect(src).toMatch(/onPress=\{\(\) => handlePreviewPartnerWin\(pair\.id\)\}/);
  });

  test('each row has its own accessible cheer and preview-win labels naming its partner', () => {
    expect(src).toMatch(/`Preview this workout win for \$\{partnerName\}`/);
    expect(src).toMatch(/`Send a cheer to \$\{partnerName\}`/);
  });
});

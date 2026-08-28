/**
 * CC33 D112 R6 (injury/disability audit W4, 2026-08-28) - closes audit
 * T1-20: the preference lane (this screen) and the capability lane
 * (How you train) never cross-referenced each other. Adds one quiet,
 * always-visible line pointing to How you train.
 *
 * Source-level guard (fs.readFileSync + regex): this screen has no
 * existing render harness (it reads live capability/db state on focus),
 * so this follows the repo convention used across the other capability
 * cross-reference additions in this same campaign (e.g.
 * HomeScreen.capabilityVisibility.guard.test.js, WorkoutSummaryScreen.
 * constraintEffectLine.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AvoidedMovementsScreen.js'), 'utf8');

describe('T1-20: AvoidedMovementsScreen cross-references How you train', () => {
  test('renders the exact cross-lane line', () => {
    expect(SRC).toContain('Things your body needs training built around live under How you train.');
  });

  test('is tappable through to the HowYouTrain route', () => {
    const site = SRC.indexOf('Things your body needs training built around live under How you train.');
    expect(site).toBeGreaterThan(-1);
    const before = SRC.slice(Math.max(0, site - 400), site);
    expect(before).toMatch(/onPress=\{\(\) => \{ haptics\.selection\(\); navigation\.navigate\('HowYouTrain'\); \}\}/);
    expect(before).toContain('accessibilityRole="button"');
  });

  test('renders unconditionally (above the unavailable/loading/empty/list branches), so it is visible regardless of list state', () => {
    const headerSite = SRC.indexOf('<BackHeader title="Avoided movements"');
    const crossLaneSite = SRC.indexOf('Things your body needs training built around live under How you train.');
    const unavailableSite = SRC.indexOf('{unavailable ? (');
    expect(headerSite).toBeGreaterThan(-1);
    expect(crossLaneSite).toBeGreaterThan(headerSite);
    expect(crossLaneSite).toBeLessThan(unavailableSite);
  });

  test('crossLaneRow/crossLaneText styles exist and use theme tokens (muted, quiet - not a banner)', () => {
    expect(SRC).toMatch(/crossLaneRow: \{[\s\S]*flexDirection: 'row'/);
    expect(SRC).toMatch(/crossLaneText: \{ \.\.\.type\.caption, flex: 1 \}/);
    expect(SRC).toContain('crossLaneText: { color: t.colors.textMuted }');
  });
});

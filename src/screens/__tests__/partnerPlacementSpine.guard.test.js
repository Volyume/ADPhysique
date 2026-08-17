/**
 * Source guard for the Partners placement spine (DESIGN-SPEC B8, C1).
 *
 * Pins the four placement invariants so the calm partner entries cannot drift
 * or regress:
 *   1. Coach home (historical file: YouScreen) carries a lock-aware "Partners"
 *      row that attributes its view and jumps cross-tab to the Partner route.
 *   2. ConsistencyScreen carries NO Partners row (founder device-walk
 *      2026-07-03: three entry points read as duplication; the Consistency
 *      row was the most out-of-place and was removed).
 *   3. AnalyticsScreen carries the Partners tile INSIDE the utilities grid
 *      (Campaign 23, PROGRESS-UX-SPEC.md §27: "Partners tile (top slot) |
 *      DEMOTE to utilities grid; feature KEEP" -- superseding the earlier
 *      promoted full-width row this suite used to pin. §22 R6 lists the
 *      grid order explicitly with Partners last, so it is now AFTER Full
 *      History, not before it).
 *   4. HomeScreen stays free of any partner entry — the one-banner invariant.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const COACH = read('YouScreen.js');
const CONSISTENCY = read('ConsistencyScreen.js');
const ANALYTICS = read('AnalyticsScreen.js');
const HOME = read('HomeScreen.js');

describe('Coach home Partners row', () => {
  test('has a Partners NavRow with the people icon', () => {
    expect(COACH).toMatch(/icon="people-outline"/);
    expect(COACH).toMatch(/label="Partners"/);
  });

  test('is lock-aware for free tier (pro affordance)', () => {
    expect(COACH).toMatch(/pro=\{!isPro\}/);
  });

  test('reuses the shared line derivation, not a duplicated string', () => {
    expect(COACH).toMatch(/partnerRowLine/);
    // The row copy must not be re-implemented inline here.
    expect(COACH).not.toMatch(/resting this week/);
  });

  test('attributes the view and jumps cross-tab with a source param', () => {
    expect(COACH).toMatch(/trackPartnerSurfaceView\('coach_row'\)/);
    expect(COACH).toMatch(/navigateCrossTab\(navigation, 'ProgressTab', 'Partner', \{ source: 'coach_row' \}\)/);
  });
});

describe('ConsistencyScreen carries no Partners row (deduped)', () => {
  // Founder device-walk 2026-07-03: Partners was seeded in three places; the
  // Consistency row was the most out-of-place, so it was removed. Partners
  // keeps the promoted Progress-tab tile and the Coach-tab row.
  test('does not import or render the PartnerRow component', () => {
    expect(CONSISTENCY).not.toMatch(/import PartnerRow from/);
    expect(CONSISTENCY).not.toMatch(/<PartnerRow/);
  });

  test('carries no consistency_row partner attribution', () => {
    expect(CONSISTENCY).not.toMatch(/trackPartnerSurfaceView\('consistency_row'\)/);
  });
});

describe('AnalyticsScreen Partners tile', () => {
  // Campaign 23 (§27/§22 R6): Partners demoted OUT of its promoted full-width
  // row into the utilities grid, ordered last per §22 R6's explicit list
  // ("Body Metrics, Lifts, Consistency, Full History, Recaps..., Year of
  // Lifts..., Partners").
  test('is demoted into the utilities grid, after Full History (no longer a promoted row)', () => {
    const partnersIdx = ANALYTICS.indexOf('label="Partners"');
    const fullHistoryIdx = ANALYTICS.indexOf('label="Full History"');
    expect(partnersIdx).toBeGreaterThan(-1);
    expect(fullHistoryIdx).toBeGreaterThan(-1);
    expect(partnersIdx).toBeGreaterThan(fullHistoryIdx);
  });

  test('keeps the pro lock and attributes the view with a source param', () => {
    expect(ANALYTICS).toMatch(/label="Partners"[\s\S]*?pro=\{tier !== 'pro'\}/);
    expect(ANALYTICS).toMatch(/trackPartnerSurfaceView\('progress_tile'\)/);
    expect(ANALYTICS).toMatch(/navigation\.navigate\('Partner', \{ source: 'progress_tile' \}\)/);
  });

  test('there is exactly one Partners tile (moved, not duplicated)', () => {
    expect(ANALYTICS.match(/label="Partners"/g)?.length).toBe(1);
  });
});

describe('HomeScreen one-banner invariant', () => {
  test('carries no partner entry of any kind', () => {
    expect(HOME).not.toMatch(/[Pp]artner/);
    expect(HOME).not.toMatch(/trackPartnerSurfaceView/);
  });
});

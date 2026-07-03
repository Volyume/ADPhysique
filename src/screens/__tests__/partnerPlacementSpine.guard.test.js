/**
 * Source guard for the Partners placement spine (DESIGN-SPEC B8, C1).
 *
 * Pins the four placement invariants so the calm partner entries cannot drift
 * or regress:
 *   1. YouScreen carries a lock-aware "Partners" row that attributes its view
 *      and jumps cross-tab to the Partner route.
 *   2. ConsistencyScreen renders the shared PartnerRow, attributed.
 *   3. AnalyticsScreen promotes the Partners tile above the Explore grid's
 *      Full History tile (i.e. it is no longer last).
 *   4. HomeScreen stays free of any partner entry — the one-banner invariant.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const YOU = read('YouScreen.js');
const CONSISTENCY = read('ConsistencyScreen.js');
const ANALYTICS = read('AnalyticsScreen.js');
const HOME = read('HomeScreen.js');

describe('YouScreen Partners row', () => {
  test('has a Partners NavRow with the people icon', () => {
    expect(YOU).toMatch(/icon="people-outline"/);
    expect(YOU).toMatch(/label="Partners"/);
  });

  test('is lock-aware for free tier (pro affordance)', () => {
    expect(YOU).toMatch(/pro=\{!isPro\}/);
  });

  test('reuses the shared line derivation, not a duplicated string', () => {
    expect(YOU).toMatch(/partnerRowLine/);
    // The row copy must not be re-implemented inline here.
    expect(YOU).not.toMatch(/resting this week/);
  });

  test('attributes the view and jumps cross-tab with a source param', () => {
    expect(YOU).toMatch(/trackPartnerSurfaceView\('you_row'\)/);
    expect(YOU).toMatch(/navigateCrossTab\(navigation, 'ProgressTab', 'Partner', \{ source: 'you_row' \}\)/);
  });
});

describe('ConsistencyScreen PartnerRow', () => {
  test('imports and renders the shared PartnerRow component', () => {
    expect(CONSISTENCY).toMatch(/import PartnerRow from '\.\.\/components\/PartnerRow'/);
    expect(CONSISTENCY).toMatch(/<PartnerRow/);
  });

  test('wires onOpen with attribution and a cross-tab jump', () => {
    expect(CONSISTENCY).toMatch(/trackPartnerSurfaceView\('consistency_row'\)/);
    expect(CONSISTENCY).toMatch(/navigateCrossTab\(navigation, 'ProgressTab', 'Partner', \{ source: 'consistency_row' \}\)/);
  });

  test('no longer carries the old "deliberately NOT shown" removal note', () => {
    expect(CONSISTENCY).not.toMatch(/deliberately NOT shown/);
  });
});

describe('AnalyticsScreen Partners tile', () => {
  test('is promoted above the Explore grid (Partners appears before Full History)', () => {
    const partnersIdx = ANALYTICS.indexOf('label="Partners"');
    const fullHistoryIdx = ANALYTICS.indexOf('label="Full History"');
    expect(partnersIdx).toBeGreaterThan(-1);
    expect(fullHistoryIdx).toBeGreaterThan(-1);
    expect(partnersIdx).toBeLessThan(fullHistoryIdx);
  });

  test('keeps the pro lock and attributes the view with a source param', () => {
    expect(ANALYTICS).toMatch(/label="Partners"[\s\S]*?pro=\{tier !== 'pro'\}/);
    expect(ANALYTICS).toMatch(/trackPartnerSurfaceView\('progress_tile'\)/);
    expect(ANALYTICS).toMatch(/navigation\.navigate\('Partner', \{ source: 'progress_tile' \}\)/);
  });

  test('the old grid Partner tile is gone (moved, not duplicated)', () => {
    expect(ANALYTICS).not.toMatch(/label="Partner"/);
  });
});

describe('HomeScreen one-banner invariant', () => {
  test('carries no partner entry of any kind', () => {
    expect(HOME).not.toMatch(/[Pp]artner/);
    expect(HOME).not.toMatch(/trackPartnerSurfaceView/);
  });
});

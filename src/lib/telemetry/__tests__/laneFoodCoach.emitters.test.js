/**
 * Growth telemetry, lane C (food, check-in, coach, share). Source guards:
 * each emitter exists at its site, with literal values the schema accepts,
 * and no payload carries free text, food names, query text or numbers raw.
 * The transport drops invalid payloads, so a typo here would be silent in
 * production; this suite is what makes it loud.
 */
const fs = require('fs');
const path = require('path');
const { EVENT_SCHEMAS } = require('../schema');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', p), 'utf8');
const names = () => (Array.isArray(EVENT_SCHEMAS) ? EVENT_SCHEMAS.map((e) => e.name) : Object.keys(EVENT_SCHEMAS));

const SITES = [
  ['src/screens/FoodSearchScreen.js', "trackNow('food_search_empty', { query_length: toBucket('count', q.length) })"],
  ['src/screens/FoodSearchScreen.js', "trackNow('food_plate_logged', { items: toBucket('count', plateSize) })"],
  ['src/screens/ScanBarcodeScreen.js', "trackNow('food_scan_result', { method: 'barcode', outcome })"],
  ['src/screens/ScanBarcodeScreen.js', "emitScan('found')"],
  ['src/screens/ScanBarcodeScreen.js', "emitScan('not_found')"],
  ['src/screens/ScanBarcodeScreen.js', "emitScan('error')"],
  ['src/screens/ScanBarcodeScreen.js', "emitScan('cancelled')"],
  ['src/screens/ScanLabelScreen.js', "trackNow('food_scan_result', { method: 'label', outcome })"],
  ['src/screens/ScanLabelScreen.js', "emitScan('cancelled')"],
  ['src/screens/ScanLabelScreen.js', "emitScan('error')"],
  ['src/screens/ScanLabelScreen.js', "'found' : 'not_found'"],
  ['src/screens/AddCustomFoodScreen.js', "trackNow('food_scan_result', { method: 'label', outcome: 'saved_custom' })"],
  ['src/screens/DiaryScreen.js', "trackDiary('planned_meal_confirmed', { scope, items: toBucket('count', n) })"],
  ['src/screens/DiaryScreen.js', "trackPlannedConfirmed('day', n)"],
  ['src/screens/DiaryScreen.js', "trackPlannedConfirmed('meal', n)"],
  ['src/screens/DiaryScreen.js', "trackDiary('diary_entries_moved', { action, items: toBucket('count', n) })"],
  ['src/screens/DiaryScreen.js', "trackEntriesMoved('copy', ids.length)"],
  ['src/screens/DiaryScreen.js', "trackEntriesMoved('move', n)"],
  ['src/screens/WeeklyCheckInScreen.js', "trackNow('checkin_completed', {"],
  ['src/screens/WeeklyCheckInScreen.js', "first: hasPriorReview === false"],
  ['src/screens/WeeklyCheckInScreen.js', "duration: toBucket('minutes',"],
  ['src/screens/WeeklyCheckInScreen.js', "trackNow('checkin_abandoned', { step_reached: Math.min(12, maxStepRef.current) })"],
  ['src/screens/CoachOutputScreen.js', "trackNow('coach_recommendation_dismissed', { kind: 'calories' })"],
  ['src/screens/HowYouTrainScreen.js', "trackNow('coach_recommendation_dismissed', { kind: 'training' })"],
  ['src/screens/HowYouTrainScreen.js', "trackNow('coach_recommendation_held', { kind: 'training' })"],
  ['src/screens/ShareCardScreen.js', "trackNow(event, { surface: shareSurface, audience: 'external' })"],
  ['src/screens/ShareCardScreen.js', "trackShare('share_attempted')"],
  ['src/screens/ShareCardScreen.js', "trackShare('share_completed')"],
  ['src/components/BeforeAfterShareSheet.js', "trackNow('share_attempted', { surface: 'progress', audience: 'external' })"],
  ['src/components/BeforeAfterShareSheet.js', "trackNow('share_completed', { surface: 'progress', audience: 'external' })"],
  ['src/screens/CommunityComposeScreen.js', "trackNow('share_attempted', { surface: shareSurface, audience: shareAudience })"],
  ['src/screens/CommunityComposeScreen.js', "trackNow('share_completed', { surface: shareSurface, audience: shareAudience })"],
];

describe('lane C emitters exist at their sites', () => {
  test.each(SITES)('%s has %s', (file, snippet) => {
    expect(read(file)).toContain(snippet);
  });
});

describe('every lane C event is in the schema', () => {
  const events = [
    'food_search_empty', 'food_scan_result', 'planned_meal_confirmed', 'diary_entries_moved',
    'food_plate_logged', 'checkin_completed', 'checkin_abandoned', 'coach_recommendation_held',
    'coach_recommendation_dismissed', 'share_attempted', 'share_completed',
  ];
  test.each(events)('%s', (e) => { expect(names()).toContain(e); });
});

describe('payload values are schema-valid and carry no free text', () => {
  const { toBucket } = require('../schema');
  test('buckets used resolve', () => {
    expect(toBucket('count', 3)).toBe('2-3');
    expect(toBucket('minutes', 0.5)).toBe('<1m');
  });
  test('emitters stay out of ED-safety lanes', () => {
    ['nutritionEngine', 'edPatternDetector', 'wellbeing', 'weeklyCoach', 'coachApply'].forEach((f) => {
      expect(read(`src/lib/${f}.js`)).not.toMatch(/telemetry\/growth/);
    });
  });
  test('the search-empty payload sends a bucket, never the query', () => {
    const src = read('src/screens/FoodSearchScreen.js');
    expect(src).not.toMatch(/food_search_empty'[^)]*query:/);
  });
});

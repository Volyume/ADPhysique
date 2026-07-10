/**
 * A7 (Wave 1) regression guards: check-in integrity pack.
 *
 * The fixes live in screen load effects and JSX (CoachOutputScreen,
 * WeeklyCheckInScreen, ProOnboardingScreen), which per the repo convention are
 * exercised on device rather than mounted under jest. These are scoped source
 * guards in the checkinCoachAudit.guard style: each fails if its fix is
 * reverted.
 *
 * Findings covered (audit/02-ux-audit.md unless noted):
 *   NU-1  narration consumes the MAPPED calorie-adherence vocabulary
 *   NU-8  computed weekly confidence is rendered
 *   OB-7  one-day-late check-in override (same review week)
 *   OB-2  reminder prefs persist regardless of the permission outcome
 *   04§4  provenance label on the cardio prefill
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const COACH = read('../../screens/CoachOutputScreen.js');
const CHECKIN = read('../../screens/WeeklyCheckInScreen.js');
const ONBOARD = read('../../screens/ProOnboardingScreen.js');
const COACH_COPY = read('../coachOutput/viewCopy.js');

describe('NU-1: coach narration speaks the engine adherence vocabulary', () => {
  test('the mapped check-in is what goes into screen state', () => {
    expect(COACH).toMatch(/setCheckin\(engineCheckin\)/);
    // The raw row (stored 'yes'/'no') must no longer be set directly.
    expect(COACH).not.toMatch(/setCheckin\(checkin\)/);
  });
  test('setCheckin happens after the vocabulary mapping, not before it', () => {
    const mapIdx = COACH.indexOf('const engineCheckin = checkin');
    const setIdx = COACH.indexOf('setCheckin(engineCheckin)');
    expect(mapIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(mapIdx);
  });
  test("an unmappable 'no' (off target, no food data) still narrates", () => {
    expect(COACH_COPY).toMatch(/calsAdherence === 'no'/);
    expect(COACH_COPY).toMatch(/You were off your calorie target\./);
  });
});

describe('NU-8: weekly data confidence is rendered, not just computed', () => {
  test('confidence is destructured from the output', () => {
    expect(COACH).toMatch(/\n    confidence,\n/);
  });
  // Updated mechanically for D18 (lead ruling, 2026-07-09 resume session;
  // docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md D18;
  // plan-F §4.4 render-time-caption fork, delegated to the lead). The
  // caption site now renders `displayConfidence` -- a RENDER-TIME-ONLY
  // transform of the raw persisted `confidence` via the engine's own
  // `corroborateConfidenceLevel` -- never `confidence` directly, so a
  // stale direct-index pin here would silently pass even if the transform
  // were reverted.
  test('the caption renders the render-time corroborated level, never the raw persisted confidence directly', () => {
    expect(COACH).toMatch(/CONFIDENCE_CAPTIONS\[displayConfidence\]/);
    expect(COACH).not.toMatch(/CONFIDENCE_CAPTIONS\[confidence\]/);
  });
  test('captions exist for every level that reaches the main card', () => {
    for (const level of ['high', 'medium', 'low']) {
      expect(COACH_COPY).toMatch(new RegExp(`${level}: 'Confidence: ${level}`));
    }
  });
});

describe('OB-7: a one-day-late check-in is allowed, same review week', () => {
  test('lateness is exactly one day past the scheduled day', () => {
    expect(CHECKIN).toMatch(/\(todayDay - scheduledDay \+ 7\) % 7 === 1/);
  });
  test('the fail-closed wrong-day return spares the day-late case', () => {
    expect(CHECKIN).toMatch(/todayDay !== scheduledDay && !dayLate/);
  });
  test('every week window anchors to yesterday when a day late', () => {
    expect(CHECKIN).toMatch(/anchorMs = dayLate \? Date\.now\(\) - 86400000 : Date\.now\(\)/);
    expect(CHECKIN).toMatch(/localWeekStartMs\(anchorMs\)/);
    // The render/save week start must use the same anchor.
    expect(CHECKIN).toMatch(/new Date\(localWeekStartMs\(weekAnchorMs\)\)/);
    // No unanchored week start may remain in the screen.
    expect(CHECKIN).not.toMatch(/localWeekStartMs\(\)/);
  });
  test('the override is explicit and framed as less accurate', () => {
    expect(CHECKIN).toMatch(/setGateState\('day_late'\)/);
    expect(CHECKIN).toMatch(/gateState === 'day_late'/);
    expect(CHECKIN).toMatch(/Check in anyway/);
    expect(CHECKIN).toMatch(/slightly less accurate/);
  });
  test('the stricter data gates still win over the day-late notice', () => {
    const needWeights = CHECKIN.indexOf("setGateState('need_weights')");
    const dayLate = CHECKIN.indexOf("setGateState('day_late')");
    expect(needWeights).toBeGreaterThan(-1);
    expect(dayLate).toBeGreaterThan(needWeights);
  });
});

describe('OB-2: reminder prefs persist regardless of the permission outcome', () => {
  test('the prefs blob is written before the permission request', () => {
    const write = ONBOARD.indexOf('AsyncStorage.setItem(NOTIF_PREFS_KEY');
    const ask = ONBOARD.indexOf('await requestNotificationPermissions()');
    expect(write).toBeGreaterThan(-1);
    expect(ask).toBeGreaterThan(-1);
    expect(write).toBeLessThan(ask);
  });
  test('scheduling stays gated on the grant', () => {
    const granted = ONBOARD.indexOf("status === 'granted'");
    const schedule = ONBOARD.indexOf('scheduleMorningWeightNotification(morningHour, 0)');
    expect(granted).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(granted);
  });
});

describe('04 §4: pre-filled answers name their source log', () => {
  test('cardio prefill carries a provenance note like the diary/training ones', () => {
    expect(CHECKIN).toMatch(/From your cardio log:/);
    expect(CHECKIN).toMatch(/setCardioMeta\(\{/);
  });
  test('the calorie and training notes it mirrors are still present', () => {
    expect(CHECKIN).toMatch(/From your diary:/);
    expect(CHECKIN).toMatch(/From your logged sessions:/);
  });
});

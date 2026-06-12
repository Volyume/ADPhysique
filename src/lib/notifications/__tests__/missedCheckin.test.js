/**
 * missedCheckin.test.js — OPP-C03 pure helpers
 *
 * Episode resolution, slot maths and the never-shame copy rule.
 * All dates are explicit (the helpers take `now`), so no fake timers.
 *
 * Calendar used below: June 2026. 2026-06-07 is a Sunday,
 * 2026-06-10 a Wednesday, 2026-06-14 the following Sunday.
 */

const {
  missedCheckinPush,
  missedCheckinFireDates,
  eveningSlotFor,
} = require('../missedCheckin');

const DAY = 86400000;

function d(year, month1, day, hour = 0, minute = 0) {
  return new Date(year, month1 - 1, day, hour, minute, 0, 0);
}

describe('missedCheckinPush copy', () => {
  test('shame copy is banned: no variant of "missed" appears anywhere', () => {
    const all = JSON.stringify(missedCheckinPush(', Allan')) + JSON.stringify(missedCheckinPush());
    expect(all).not.toMatch(/miss/i);
    expect(all).not.toMatch(/forgot/i);
  });

  test('greets by first name when known, reads cleanly when not', () => {
    const named = missedCheckinPush(', Allan');
    expect(named.evening.title).toBe('Your check-in is ready when you are, Allan');
    expect(named.followup.title).toBe('Your weekly trend is ready, Allan');
    const anon = missedCheckinPush();
    expect(anon.evening.title).toBe('Your check-in is ready when you are');
    expect(anon.followup.title).toBe('Your weekly trend is ready');
  });

  test('the two bodies match the locked-addendum copy', () => {
    const { evening, followup } = missedCheckinPush();
    expect(evening.body).toBe('Your check-in data is ready to review. It takes about two minutes.');
    expect(followup.body).toBe('Tap to see how the week compares, whenever suits you.');
  });
});

describe('eveningSlotFor', () => {
  test('an afternoon check-in slot nudges at 20:00 the same day', () => {
    const evening = eveningSlotFor(d(2026, 6, 7, 18, 0));
    expect(evening.getTime()).toBe(d(2026, 6, 7, 20, 0).getTime());
  });

  test('a 19:00+ check-in slot nudges two hours later instead', () => {
    expect(eveningSlotFor(d(2026, 6, 7, 19, 0)).getTime()).toBe(d(2026, 6, 7, 21, 0).getTime());
    expect(eveningSlotFor(d(2026, 6, 7, 21, 0)).getTime()).toBe(d(2026, 6, 7, 23, 0).getTime());
  });
});

describe('missedCheckinFireDates episode resolution', () => {
  const sundaySixPm = { weekday: 0, hour: 18, minute: 0 };

  test('live missed episode: anchors the check-in day just gone', () => {
    // Sunday 19:00, check-in was due at 18:00, never made.
    const r = missedCheckinFireDates({ ...sundaySixPm, now: d(2026, 6, 7, 19, 0), lastCheckinMs: 0 });
    expect(r.occurrence.getTime()).toBe(d(2026, 6, 7, 18, 0).getTime());
    expect(r.evening.getTime()).toBe(d(2026, 6, 7, 20, 0).getTime());
    expect(r.followup.getTime()).toBe(d(2026, 6, 9, 18, 0).getTime()); // exactly +48h
  });

  test('mid-episode re-lay keeps the same fire dates (single-shot per episode)', () => {
    // Monday morning after the missed Sunday: the evening slot is in the
    // past (caller skips it, so a push that fired never repeats) and the
    // +48h follow-up still anchors the SAME occurrence.
    const r = missedCheckinFireDates({ ...sundaySixPm, now: d(2026, 6, 8, 9, 0), lastCheckinMs: 0 });
    expect(r.occurrence.getTime()).toBe(d(2026, 6, 7, 18, 0).getTime());
    expect(r.evening.getTime()).toBe(d(2026, 6, 7, 20, 0).getTime());
    expect(r.followup.getTime()).toBe(d(2026, 6, 9, 18, 0).getTime());
  });

  test('an elapsed episode is never chased: rolls to the next occurrence', () => {
    // Wednesday noon, the +48h window (Tuesday 18:00) has passed.
    const r = missedCheckinFireDates({ ...sundaySixPm, now: d(2026, 6, 10, 12, 0), lastCheckinMs: 0 });
    expect(r.occurrence.getTime()).toBe(d(2026, 6, 14, 18, 0).getTime());
    expect(r.evening.getTime()).toBe(d(2026, 6, 14, 20, 0).getTime());
    expect(r.followup.getTime()).toBe(d(2026, 6, 16, 18, 0).getTime());
  });

  test('a resolved week pre-lays for the next expected occurrence, honouring the 7-day gap', () => {
    // Checked in Sunday 18:30; the next Sunday 18:00 is 30 minutes short of
    // the 7-day minimum gap, so the reminder (and therefore the follow-ups)
    // bump a week, exactly like scheduleCheckinReminder's gap rule.
    const lastCheckinMs = d(2026, 6, 7, 18, 30).getTime();
    const r = missedCheckinFireDates({ ...sundaySixPm, now: d(2026, 6, 7, 19, 0), lastCheckinMs });
    expect(r.occurrence.getTime()).toBe(d(2026, 6, 21, 18, 0).getTime());
  });

  test('a check-in made within the gap window means the day just gone was not expected', () => {
    // Checked in Friday 5 June; Sunday 7 June was inside the 7-day gap, so
    // missing it is NOT an episode. Next expected: Sunday 14 June.
    const lastCheckinMs = d(2026, 6, 5, 18, 0).getTime();
    const r = missedCheckinFireDates({ ...sundaySixPm, now: d(2026, 6, 8, 9, 0), lastCheckinMs });
    expect(r.occurrence.getTime()).toBe(d(2026, 6, 14, 18, 0).getTime());
  });

  test('before the check-in time on the day itself: pre-laid against today', () => {
    // Sunday 10:00, check-in due 18:00 today: the most recent occurrence is
    // LAST Sunday (fully elapsed), so the pair anchors today's occurrence.
    const r = missedCheckinFireDates({ ...sundaySixPm, now: d(2026, 6, 7, 10, 0), lastCheckinMs: 0 });
    expect(r.occurrence.getTime()).toBe(d(2026, 6, 7, 18, 0).getTime());
  });

  test('followup is always exactly 48 hours after the occurrence', () => {
    const r = missedCheckinFireDates({ weekday: 3, hour: 14, minute: 30, now: d(2026, 6, 7, 10, 0), lastCheckinMs: 0 });
    expect(r.followup.getTime() - r.occurrence.getTime()).toBe(2 * DAY);
  });
});

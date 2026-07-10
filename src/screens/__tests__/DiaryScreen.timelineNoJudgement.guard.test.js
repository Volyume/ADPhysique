/**
 * DiaryScreen.timelineNoJudgement.guard.test.js
 *
 * Ultimate-Audit item 15 (D22 15a/15b, timeline food logging) ED-safety
 * non-goal, stated explicitly in item-15-timeline-scoping.md Section 5
 * point 1: "a timeline MUST NOT add any derived copy about how long since
 * the last entry, how early/late a meal is, or a 'fasting window', even as
 * a passive stat." Explicit clock times on a continuous list invite
 * meal-timing scrutiny that named buckets never did; this guard keeps that
 * door shut at the source level across every file the timeline touches.
 *
 * Source-level regex guard (fs.readFileSync), matching the idiom of
 * MealSection.markEaten.test.js's constitution-ban check and
 * DiaryScreen.d12EatDeclutter.guard.test.js's style: cheap, direct, and it
 * fails loudly if a future "helpful" timeline feature tries to narrate
 * gaps, lateness, or fasting windows.
 */
import fs from 'fs';
import path from 'path';

const DIARY_SRC = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');
const TIMELINE_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'food', 'diaryTimeline.js'), 'utf8');
const TIMELINE_ROW_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'food', 'TimelineEntryRow.js'), 'utf8');
const ENTRY_ROW_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'food', 'EntryRow.js'), 'utf8');

// Deliberately excludes the pre-existing, internal "eating window" term
// (mealSlots.js EATING_WINDOW_START_HOUR/END_HOUR, used for the meal-slot
// ladder's time-of-day spread since before item 15): that is established
// source-level terminology, never user-facing copy, and pre-dates this
// build. The bans below target USER-FACING meal-timing judgement, the
// actual ED-safety risk this guard exists to keep out.
const BANNED_TIMING_JUDGEMENT = [
  /fasting window/i,
  /hours? since (your|the) last/i,
  /how long since/i,
  /too (early|late) (to|for) eat/i,
  /late[- ]night eating/i,
];

describe('the flat timeline never narrates meal-timing (ED-safety non-goal)', () => {
  test.each([
    ['DiaryScreen.js', () => DIARY_SRC],
    ['diaryTimeline.js', () => TIMELINE_SRC],
    ['TimelineEntryRow.js', () => TIMELINE_ROW_SRC],
    ['EntryRow.js', () => ENTRY_ROW_SRC],
  ])('%s carries no banned meal-timing-judgement phrase', (_name, getSrc) => {
    const src = getSrc();
    for (const re of BANNED_TIMING_JUDGEMENT) {
      expect(src).not.toMatch(re);
    }
  });

  test('diaryTimeline.js computes no "time since"/"gap" value between entries', () => {
    // The pure timeline builder attaches only hasTime/isFirstOfSlot/
    // isLastOfSlot to each entry item -- no derived duration, no "minutes
    // since", no streak. A future regression adding such a field would
    // need to touch this exact object shape, which this test locks.
    expect(TIMELINE_SRC).not.toMatch(/gapMinutes|timeSince|minutesSince|hoursSince/i);
  });

  test('day-part labels are the only time framing: quiet strings, no colour/judgement words nearby', () => {
    expect(TIMELINE_SRC).toMatch(/'Morning'/);
    expect(TIMELINE_SRC).toMatch(/'Afternoon'/);
    expect(TIMELINE_SRC).toMatch(/'Evening'/);
    expect(TIMELINE_SRC).not.toMatch(/skipped|missed|behind|catch up/i);
  });

  test('DiaryScreen carries no "should eat" / prescriptive meal-timing copy', () => {
    expect(DIARY_SRC).not.toMatch(/should (eat|log) (by|before|after)/i);
    expect(DIARY_SRC).not.toMatch(/you (haven't|have not) eaten (in|for)/i);
  });
});

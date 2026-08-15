/**
 * reEntryCheck.test.js — Campaign 18 long-gap re-entry.
 *
 * TIME MAY QUESTION THE PRESCRIPTION. TIME MAY NOT CHANGE THE NEXT WORKOUT.
 *
 * Cases 11-14 of the amendment's matrix. The queue half is pinned in
 * blockProgression.production.test.js (an outstanding session stays
 * outstanding however long it waits); this pins that the QUESTION is honest
 * and that no answer touches programme order.
 */
import {
  RE_ENTRY_GAP_DAYS, RE_ENTRY_ANSWER, reEntryGapDaysFor,
  reEntryCheckDue, reEntryPrompt, reEntryOutcome,
} from '../reEntryCheck';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 1);
const due = (gapDays, over = {}) => reEntryCheckDue({
  lastWorkoutAtMs: NOW - gapDays * DAY, nowMs: NOW, ...over,
});

describe('CASE 12: the check fires on a real gap and nothing shorter', () => {
  test('below the threshold it says nothing', () => {
    expect(due(1)).toBeNull();
    expect(due(RE_ENTRY_GAP_DAYS - 1)).toBeNull();
  });

  test('at the threshold it asks', () => {
    const check = due(RE_ENTRY_GAP_DAYS);
    expect(check.gapDays).toBe(RE_ENTRY_GAP_DAYS);
    expect(check.thresholdDays).toBe(RE_ENTRY_GAP_DAYS);
  });

  test('a low-frequency programme gets a longer boundary, not a nag', () => {
    // Once a week: a fortnight is two missed sessions, not an absence.
    expect(reEntryGapDaysFor(1)).toBeGreaterThan(RE_ENTRY_GAP_DAYS);
    expect(due(RE_ENTRY_GAP_DAYS, { sessionsPerWeek: 1 })).toBeNull();
    expect(reEntryGapDaysFor(4)).toBe(RE_ENTRY_GAP_DAYS);
    expect(reEntryGapDaysFor(null)).toBe(RE_ENTRY_GAP_DAYS);
  });

  test('A BRAND-NEW ATHLETE IS NOT A RETURNING ONE', () => {
    // No history is an absence, not a gap. Asking someone who has never
    // trained whether they have been training elsewhere is nonsense.
    expect(reEntryCheckDue({ lastWorkoutAtMs: null, nowMs: NOW })).toBeNull();
  });

  test('and it is asked once per return, not once per screen', () => {
    const check = due(20);
    expect(check).toBeTruthy();
    expect(due(20, { answeredFor: check.key })).toBeNull();
    // A LATER, genuinely new absence asks again, because the key moves.
    const later = reEntryCheckDue({
      lastWorkoutAtMs: NOW - 5 * DAY, nowMs: NOW + 30 * DAY, answeredFor: check.key,
    });
    expect(later).toBeTruthy();
  });
});

describe('THE QUESTION CLAIMS NOTHING THE APP CANNOT KNOW', () => {
  const prompt = reEntryPrompt(due(20));

  test('it states uncertainty about the LOG, never a physiological fact', () => {
    expect(prompt.body).toBe("It's been a while since your last logged workout, so we want to check before using the same training targets.");
    expect(prompt.body).not.toMatch(/detrain|lost|nervous system|\bCNS\b|tolerance|adaptation|%/i);
  });

  test('three answers, and no reason is demanded', () => {
    expect(prompt.options.map((o) => o.answer)).toEqual([
      RE_ENTRY_ANSWER.TRAINED_ELSEWHERE,
      RE_ENTRY_ANSWER.DID_NOT_TRAIN,
      RE_ENTRY_ANSWER.CONTINUE,
    ]);
    expect(prompt.options.map((o) => o.label)).toEqual([
      "I've still been training", "I haven't trained", 'Just continue',
    ]);
  });

  test('no guilt and no em dash', () => {
    for (const s of [prompt.title, prompt.body, ...prompt.options.map((o) => o.label)]) {
      expect(s).not.toContain('—');
      expect(s).not.toMatch(/should|excuse|fell off|slacking|back on track/i);
    }
  });
});

describe('CASES 13 and 14: what each answer does, and what it never does', () => {
  test('NO ANSWER CHANGES THE QUEUE', () => {
    for (const a of Object.values(RE_ENTRY_ANSWER)) {
      expect(reEntryOutcome(a).changesQueue).toBe(false);
    }
  });

  test('CASE 13: trained elsewhere fabricates nothing and reduces nothing', () => {
    const out = reEntryOutcome(RE_ENTRY_ANSWER.TRAINED_ELSEWHERE);
    expect(out.easeReturn).toBe(false);
    expect(out.because).toBe('athlete_reports_training_elsewhere');
    expect(out.note).not.toMatch(/detrain|reduced|lower/i);
  });

  test('CASE 14: no training earns a TEMPORARY easier return, not a rewrite', () => {
    const out = reEntryOutcome(RE_ENTRY_ANSWER.DID_NOT_TRAIN);
    expect(out.easeReturn).toBe(true);
    expect(out.changesQueue).toBe(false);
    expect(out.note).toBe('We will start you back a little easier for this session. Your programme is unchanged.');
  });

  test('CONTINUE is respected, and an unknown answer falls to it rather than guessing', () => {
    expect(reEntryOutcome(RE_ENTRY_ANSWER.CONTINUE).easeReturn).toBe(false);
    expect(reEntryOutcome(undefined).answer).toBe(RE_ENTRY_ANSWER.CONTINUE);
    expect(reEntryOutcome('nonsense').easeReturn).toBe(false);
  });
});

describe('NO SILENT REDUCTION, AND NO SECOND TRAINING ENGINE', () => {
  test('this module computes no load, set count or percentage', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../reEntryCheck.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/weight|reps|sets\b|rir|0\.\d|\* 0\./i);
    // And it has no clock of its own: the caller passes nowMs.
    expect(code).not.toMatch(/Date\.now|new Date/);
  });

  test('easeReturn is a REQUEST, never a prescription', () => {
    const out = reEntryOutcome(RE_ENTRY_ANSWER.DID_NOT_TRAIN);
    expect(Object.keys(out).sort()).toEqual(['answer', 'because', 'changesQueue', 'easeReturn', 'note']);
  });
});

/**
 * B4 contest-prep countdown — invariant suite for the seven hard rules in
 * docs/b4-contest-countdown-ed-review-2026-07-02.md (founder-approved
 * 2026-07-02). These tests pin what the module must NEVER do: show under a
 * wellbeing flag, emit urgency or body-target copy, read the clock, or do
 * prep maths. If any of these fails, B4 has broken its greenlight terms.
 */
import fs from 'fs';
import path from 'path';
import { contestCountdown, parseShowDate, PROCESS_CHECKPOINTS } from '../contestCountdown';

const DAY = 86400000;
const NOW = new Date(2026, 5, 22, 8, 0, 0).getTime(); // fixed local clock
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'contestCountdown.js'), 'utf8');

// Every string the module can emit, across the full countdown range.
function allEmittedStrings() {
  const out = [];
  for (const c of PROCESS_CHECKPOINTS) out.push(c.title, c.detail);
  for (let d = 0; d <= 140; d++) {
    const r = contestCountdown({ showDateMs: NOW + d * DAY, nowMs: NOW });
    if (r) out.push(r.line);
  }
  return out;
}

describe('rule 2/5: any truthy wellbeing flag hides the countdown entirely (fail closed)', () => {
  const base = { showDateMs: NOW + 42 * DAY, nowMs: NOW };

  test.each([
    ['edPatternOpen', { edPatternOpen: true }],
    ['calmMode', { calmMode: true }],
    ['scoffPositive', { scoffPositive: true }],
    ['edPatternOpen read failure', { edPatternOpen: 'read_failed' }],
    ['calmMode read failure', { calmMode: 'read_failed' }],
  ])('%s → null', (_label, flags) => {
    expect(contestCountdown({ ...base, ...flags })).toBeNull();
  });

  test('with no flag the same inputs DO show (the guard is the only difference)', () => {
    expect(contestCountdown(base)).not.toBeNull();
  });
});

describe('rule 4: process checkpoints only — no body checkpoint can be emitted', () => {
  const BODY_PATTERNS = [
    /weigh/i, /\bkg\b/i, /\blbs\b/i, /body ?fat/i, /\bscale\b/i,
    /\bleaner\b/i, /condition check/i, /\blose\b/i, /\bdeficit\b/i,
  ];
  test('no emitted string references weight, condition or a body target', () => {
    for (const s of allEmittedStrings()) {
      for (const pat of BODY_PATTERNS) {
        expect(s).not.toMatch(pat);
      }
    }
  });
});

describe('rule 5: urgency vocabulary is banned in every emitted string', () => {
  const URGENCY = [
    /deadline/i, /panic/i, /last chance/i, /\bbehind\b/i, /hurry/i,
    /running out/i, /don'?t miss/i, /\bcrunch\b/i, /only \d+ (day|week)/i,
    /time is/i, /no time/i, /\bpush harder\b/i,
  ];
  test('no urgency words, no em dash, in any emitted string', () => {
    const strings = allEmittedStrings();
    expect(strings.length).toBeGreaterThan(10);
    for (const s of strings) {
      for (const pat of URGENCY) expect(s).not.toMatch(pat);
      expect(s).not.toMatch(/—/); // no em dash in user-facing copy
    }
  });
});

describe('rule 6: no prep maths in this module, ever', () => {
  test('source contains no depletion/water/carb/sodium manipulation terms', () => {
    expect(SOURCE).not.toMatch(/carb|sodium|glycogen|deplet|\bwater\b|diuretic/i);
  });
  test('output carries no numeric prep values, only date arithmetic', () => {
    const r = contestCountdown({ showDateMs: NOW + 30 * DAY, nowMs: NOW });
    expect(Object.keys(r).sort()).toEqual(['checkpoint', 'daysOut', 'isPeakWeek', 'line', 'weeksOut']);
  });
});

describe('purity: date-injected, deterministic, no clock reads', () => {
  test('source never reads the wall clock', () => {
    expect(SOURCE).not.toMatch(/Date\.now\s*\(/);
    expect(SOURCE).not.toMatch(/new Date\s*\(\s*\)/);
  });
  test('identical inputs give deep-equal outputs', () => {
    const args = { showDateMs: NOW + 63 * DAY, nowMs: NOW };
    expect(contestCountdown(args)).toEqual(contestCountdown(args));
  });
});

describe('countdown maths', () => {
  test('a show in the past returns null (no post-show framing)', () => {
    expect(contestCountdown({ showDateMs: NOW - 2 * DAY, nowMs: NOW })).toBeNull();
  });
  test('show day and show week', () => {
    const showDay = contestCountdown({ showDateMs: parseShowDate('2026-06-22'), nowMs: NOW });
    expect(showDay.daysOut).toBe(0);
    expect(showDay.line).toBe('Show day');
    expect(showDay.isPeakWeek).toBe(true);

    const showWeek = contestCountdown({ showDateMs: NOW + 5 * DAY, nowMs: NOW });
    expect(showWeek.line).toBe('Show week');
    expect(showWeek.isPeakWeek).toBe(true);
    expect(showWeek.checkpoint.title).toBe('Peak week');
  });
  test('weeks-out banding maps to the right process checkpoint', () => {
    const at = (days) => contestCountdown({ showDateMs: NOW + days * DAY, nowMs: NOW });
    expect(at(120).checkpoint.title).toBe('Prep admin');        // 18 weeks
    expect(at(90).checkpoint.title).toBe('Posing foundations'); // 13 weeks
    expect(at(60).checkpoint.title).toBe('Posing cadence');     // 9 weeks
    expect(at(40).checkpoint.title).toBe('Kit and stage admin');// 6 weeks
    expect(at(20).checkpoint.title).toBe('Rehearse the day');   // 3 weeks
    expect(at(20).line).toBe('3 weeks to your show');
    expect(at(90).isPeakWeek).toBe(false);
  });
  test('every weeks-out value from 0 to 60 has a checkpoint (rule 7 left no gaps)', () => {
    for (let d = 0; d <= 420; d += 3) {
      const r = contestCountdown({ showDateMs: NOW + d * DAY, nowMs: NOW });
      expect(r.checkpoint).not.toBeNull();
    }
  });
});

describe('parseShowDate', () => {
  test('valid ISO date → local midnight ms', () => {
    const ms = parseShowDate('2026-09-19');
    expect(ms).toBe(new Date(2026, 8, 19).getTime());
  });
  test('garbage, impossible dates and non-strings → null', () => {
    ['2026-02-31', '19/09/2026', '2026-9-1', '', null, undefined, 'soon'].forEach(v => {
      expect(parseShowDate(v)).toBeNull();
    });
  });
});

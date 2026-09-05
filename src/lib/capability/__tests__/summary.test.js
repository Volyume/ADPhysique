/**
 * summary.test.js - the one-line Injuries & limitations status rows carry
 * on the Train and Coach tabs (D134). Pins: the offer when nothing is set
 * up, the person's own words when something is, attention only when a
 * decision or a check-in is waiting, and no diagnosis or "injury" wording
 * anywhere.
 *
 * D152 (finding F-01) additions: the populated baseline line reads
 * "Leaves out ..." where the words exist; the count fallback names
 * limitations and what they are used for, counts RESTRICTION rows only
 * (allowances never count), and the retired "N things you told it" wording
 * can never come back.
 */
import { howYouTrainSummary, HOW_YOU_TRAIN_OFFER } from '../summary';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 3, 12);
const empty = { baseline: [], episodes: [], history: [], unavailable: false };
const rule = (over) => ({ state: 'active', ruleKind: 'demand', ruleValue: 'overhead_position', laterality: null, effectiveChoice: 'applied', adaptationMode: 'propose', startsAt: NOW - 3 * DAY, endsAt: null, ...over });

describe('howYouTrainSummary', () => {
  test('nothing set up is an offer, not a question about the person', () => {
    const s = howYouTrainSummary(empty, { nowMs: NOW });
    expect(s).toEqual({ sub: HOW_YOU_TRAIN_OFFER, attention: false, empty: true });
    expect(HOW_YOU_TRAIN_OFFER).not.toMatch(/disabled\?|are you/i);
  });
  test('unavailable and not-yet-loaded are told, never rendered as empty', () => {
    expect(howYouTrainSummary({ ...empty, unavailable: true }).sub).toBe('Could not check just now.');
    expect(howYouTrainSummary(null).sub).toBe('Checking.');
    expect(howYouTrainSummary(null).empty).toBe(false);
  });
  test('a temporary change names the subject and the date', () => {
    const state = { ...empty, episodes: [{ groupId: 'g', status: 'active', rows: [rule({ endsAt: NOW + 14 * DAY })] }] };
    expect(howYouTrainSummary(state, { nowMs: NOW })).toEqual({ sub: 'Working around overhead work, until about 17 Sep', attention: false, empty: false });
  });
  test('a change past its planned end, or an undecided one, asks for attention', () => {
    const awaiting = { ...empty, episodes: [{ groupId: 'g', status: 'awaiting_confirmation', rows: [rule({ endsAt: NOW - DAY })] }] };
    expect(howYouTrainSummary(awaiting, { nowMs: NOW })).toMatchObject({ sub: 'Working around overhead work, still need it?', attention: true });
    const undecided = { ...empty, episodes: [{ groupId: 'g', status: 'active', rows: [rule({ effectiveChoice: null })] }] };
    expect(howYouTrainSummary(undecided, { nowMs: NOW }).attention).toBe(true);
    const held = { ...empty, episodes: [{ groupId: 'g', status: 'active', rows: [rule({ effectiveChoice: null, adaptationMode: 'hold' })] }] };
    expect(howYouTrainSummary(held, { nowMs: NOW }).attention).toBe(false);
  });
  test('long-term rules name what is left out, in the person\'s own words', () => {
    const state = { ...empty, baseline: [rule({ ruleValue: 'axial_load' })] };
    const s = howYouTrainSummary(state, { nowMs: NOW });
    expect(s.sub).toBe('Leaves out loading your spine');
    // Founder ruling 2026-09-05 retires the old "never injury on a
    // permanent rule" law; diagnosis vocabulary stays banned.
    expect(s.sub).not.toMatch(/diagnos|modif/i);
  });
  test('a mix reads episode first, then a long-term count; extra episodes are counted', () => {
    const state = {
      ...empty,
      baseline: [rule({ ruleValue: 'axial_load' })],
      episodes: [
        { groupId: 'g1', status: 'active', rows: [rule({ endsAt: NOW + 7 * DAY })] },
        { groupId: 'g2', status: 'active', rows: [rule({ ruleValue: 'standing' })] },
      ],
    };
    expect(howYouTrainSummary(state, { nowMs: NOW }).sub).toBe('Working around overhead work, until about 10 Sep · 1 more · 1 long-term limitation saved');
  });
  test('an unnameable subject falls back to a count, never an invented name', () => {
    const state = { ...empty, baseline: [rule({ ruleKind: 'exercise', ruleValue: 'e9' })] };
    expect(howYouTrainSummary(state, { nowMs: NOW }).sub)
      .toBe('1 injury or limitation saved. Used when Volyume picks exercises and builds your plan.');
  });
  test('three distinct rules pass the subject-phrase ceiling and count instead', () => {
    const state = {
      ...empty,
      baseline: [
        rule({ ruleValue: 'axial_load' }),
        rule({ ruleValue: 'overhead_position' }),
        rule({ ruleValue: 'impact' }),
      ],
    };
    expect(howYouTrainSummary(state, { nowMs: NOW }).sub)
      .toBe('3 injuries or limitations saved. Used when Volyume picks exercises and builds your plan.');
  });
  test('allowances are inclusions: they never swell the count and never read as left out', () => {
    const allowance = rule({ ruleKind: 'exercise_allow', ruleValue: 'e9' });
    const mixed = { ...empty, baseline: [rule({ ruleValue: 'axial_load' }), allowance, allowance] };
    expect(howYouTrainSummary(mixed, { nowMs: NOW }).sub).toBe('Leaves out loading your spine');
    const onlyAllowances = { ...empty, baseline: [allowance] };
    expect(howYouTrainSummary(onlyAllowances, { nowMs: NOW }).sub).toBe('Set up. Nothing is left out.');
  });
  test('the retired "things you told it" count can never come back', () => {
    const states = [
      empty,
      { ...empty, baseline: [rule({ ruleValue: 'axial_load' })] },
      { ...empty, baseline: [rule({ ruleKind: 'exercise', ruleValue: 'e9' })] },
      { ...empty, baseline: [rule({ ruleKind: 'exercise_allow', ruleValue: 'e9' })] },
      {
        ...empty,
        baseline: [rule({ ruleValue: 'axial_load' })],
        episodes: [{ groupId: 'g1', status: 'active', rows: [rule({ endsAt: NOW + 7 * DAY })] }],
      },
    ];
    for (const state of states) {
      expect(howYouTrainSummary(state, { nowMs: NOW }).sub).not.toMatch(/thing(s)? you told/i);
    }
  });
});

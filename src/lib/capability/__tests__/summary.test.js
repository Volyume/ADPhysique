/**
 * summary.test.js - the one-line How you train status rows carry on the
 * Train and Coach tabs (D134). Pins: the offer when nothing is set up, the
 * person's own words when something is, attention only when a decision or
 * a check-in is waiting, and no diagnosis or "injury" wording anywhere.
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
  test('permanent rules read as "built around", never as injuries', () => {
    const state = { ...empty, baseline: [rule({ ruleValue: 'axial_load' })] };
    const s = howYouTrainSummary(state, { nowMs: NOW });
    expect(s.sub).toBe('Built around loading your spine');
    expect(s.sub).not.toMatch(/injur|restrict|modif/i);
  });
  test('a mix reads episode first, then a permanent count; extra episodes are counted', () => {
    const state = {
      ...empty,
      baseline: [rule({ ruleValue: 'axial_load' })],
      episodes: [
        { groupId: 'g1', status: 'active', rows: [rule({ endsAt: NOW + 7 * DAY })] },
        { groupId: 'g2', status: 'active', rows: [rule({ ruleValue: 'standing' })] },
      ],
    };
    expect(howYouTrainSummary(state, { nowMs: NOW }).sub).toBe('Working around overhead work, until about 10 Sep · 1 more · 1 permanent');
  });
  test('an unnameable subject falls back to a count, never an invented name', () => {
    const state = { ...empty, baseline: [rule({ ruleKind: 'exercise', ruleValue: 'e9' })] };
    expect(howYouTrainSummary(state, { nowMs: NOW }).sub).toBe('Built around 1 thing you told it');
  });
});

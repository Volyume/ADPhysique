/**
 * cues (D229 addendum 13): the countdown and end cues for a phone propped
 * away from the lifter, and the lens pick.
 *
 * Pinned, each written to fail:
 *   - the light pulses on the final three seconds, on every multiple of five,
 *     and on the countdown's own first second; never at zero (the torch is
 *     off before the first frame); never more than once a second;
 *   - the sound is the rest timer's three pips and the start tone at zero;
 *   - a pulse is 200 ms and the end cue's two beats are 300 ms apart (a
 *     third of the three-flashes-a-second ceiling, well under it);
 *   - the lens pick: "ultra wide" is the wide lens, "Back Camera" (or the
 *     first plain back name) is the normal one, telephoto and depth never.
 */
import { cueFor, lightBeats, pickLenses, PULSE_MS, END_PULSE_GAP_MS, START_SOUND } from '../cues';

describe('lightBeats', () => {
  test('3 s: the final three', () => {
    expect([...lightBeats(3)].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
  test('5 s: the final three and the first second', () => {
    expect([...lightBeats(5)].sort((a, b) => a - b)).toEqual([1, 2, 3, 5]);
  });
  test('10 s: the final three, five, and ten', () => {
    expect([...lightBeats(10)].sort((a, b) => a - b)).toEqual([1, 2, 3, 5, 10]);
  });
  test('20 s: the final three and every five, at most one a second', () => {
    expect([...lightBeats(20)].sort((a, b) => a - b)).toEqual([1, 2, 3, 5, 10, 15, 20]);
  });
  test('never at zero, and nothing for a nonsense countdown', () => {
    expect(lightBeats(20).has(0)).toBe(false);
    expect(lightBeats(undefined).size).toBe(0);
    expect(lightBeats(-4).size).toBe(0);
  });
});

describe('cueFor', () => {
  test('the final three seconds carry the three pips and a pulse', () => {
    expect(cueFor(3, 10)).toEqual({ sound: 'three', light: true });
    expect(cueFor(2, 10)).toEqual({ sound: 'two', light: true });
    expect(cueFor(1, 10)).toEqual({ sound: 'one', light: true });
  });
  test('zero is the start: the longer tone and no light', () => {
    expect(cueFor(0, 10)).toEqual({ sound: START_SOUND, light: false });
    expect(START_SOUND).toBe('go');
  });
  test('a quiet second in a long countdown: no sound, no light', () => {
    expect(cueFor(7, 10)).toEqual({ sound: null, light: false });
    expect(cueFor(4, 5)).toEqual({ sound: null, light: false });
  });
  test('the first second and the fives of a long countdown pulse without a pip', () => {
    expect(cueFor(10, 10)).toEqual({ sound: null, light: true });
    expect(cueFor(5, 10)).toEqual({ sound: null, light: true });
    expect(cueFor(15, 20)).toEqual({ sound: null, light: true });
  });
  test('nonsense is silent and dark', () => {
    expect(cueFor(-1, 10)).toEqual({ sound: null, light: false });
    expect(cueFor(NaN, 10)).toEqual({ sound: null, light: false });
  });
});

describe('the cadence stays far under three flashes a second', () => {
  test('a pulse is 200 ms and the end cue beats are 300 ms apart', () => {
    expect(PULSE_MS).toBe(200);
    expect(END_PULSE_GAP_MS).toBe(300);
    expect(END_PULSE_GAP_MS).toBeGreaterThan(PULSE_MS);
  });
});

describe('pickLenses', () => {
  test('an iPhone with three back lenses: Back Camera is normal, the ultra wide is wide', () => {
    const names = ['Back Camera', 'Back Telephoto Camera', 'Back Ultra Wide Camera', 'Back Dual Camera', 'Back Triple Camera', 'Front Camera', 'Front TrueDepth Camera'];
    expect(pickLenses(names)).toEqual({ normal: 'Back Camera', wide: 'Back Ultra Wide Camera' });
  });
  test('no ultra wide: wide is null, so the control is not shown', () => {
    expect(pickLenses(['Back Camera', 'Front Camera'])).toEqual({ normal: 'Back Camera', wide: null });
  });
  test('without an exact "Back Camera" the first plain back name is normal; telephoto and depth never are', () => {
    expect(pickLenses(['Back Telephoto Camera', 'Back Wide Camera', 'Back Ultra Wide Camera']))
      .toEqual({ normal: 'Back Wide Camera', wide: 'Back Ultra Wide Camera' });
    expect(pickLenses(['Back Telephoto Camera', 'Front TrueDepth Camera']).normal).toBeNull();
  });
  test('matches are case-insensitive and tolerate rubbish', () => {
    expect(pickLenses(['back ultra wide camera', 'back camera'])).toEqual({ normal: 'back camera', wide: 'back ultra wide camera' });
    expect(pickLenses(null)).toEqual({ normal: null, wide: null });
    expect(pickLenses([null, 3, ''])).toEqual({ normal: null, wide: null });
  });
});

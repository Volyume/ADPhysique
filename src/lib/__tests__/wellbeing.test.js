import { isCalm, WELLBEING_KEY, WELLBEING_HELPLINE } from '../wellbeing';

describe('wellbeing helper', () => {
  test('isCalm only true for the calm mode', () => {
    expect(isCalm('calm')).toBe(true);
    expect(isCalm('normal')).toBe(false);
    expect(isCalm('unspecified')).toBe(false);
    expect(isCalm(undefined)).toBe(false);
    expect(isCalm(null)).toBe(false);
  });

  test('storage key is stable', () => {
    expect(WELLBEING_KEY).toBe('@volyume_wellbeing_mode');
  });

  test('helpline copy is UK-specific and confidential', () => {
    expect(WELLBEING_HELPLINE).toMatch(/Beat Eating Disorders UK/);
    expect(WELLBEING_HELPLINE).toMatch(/0808 801 0677/);
    expect(WELLBEING_HELPLINE).toMatch(/confidential/);
  });
});

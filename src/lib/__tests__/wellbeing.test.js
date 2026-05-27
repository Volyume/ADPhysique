import { isCalm, WELLBEING_KEY, WELLBEING_HELPLINE } from '../wellbeing';

describe('isCalm', () => {
  test('returns true for the calm mode', () => {
    expect(isCalm('calm')).toBe(true);
  });

  test('returns false for the normal mode', () => {
    expect(isCalm('normal')).toBe(false);
  });

  test('returns false for the unspecified mode', () => {
    expect(isCalm('unspecified')).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isCalm(undefined)).toBe(false);
  });

  test('returns false for null', () => {
    expect(isCalm(null)).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(isCalm('')).toBe(false);
  });

  test('is case-sensitive, Calm (capitalised) is not calm', () => {
    expect(isCalm('Calm')).toBe(false);
  });
});

describe('WELLBEING_KEY', () => {
  test('storage key is the expected namespaced string', () => {
    expect(WELLBEING_KEY).toBe('@volyume_wellbeing_mode');
  });

  test('key includes the app namespace prefix', () => {
    expect(WELLBEING_KEY).toMatch(/^@volyume_/);
  });
});

describe('WELLBEING_HELPLINE', () => {
  test('helpline copy references Beat Eating Disorders UK', () => {
    expect(WELLBEING_HELPLINE).toMatch(/Beat Eating Disorders UK/);
  });

  test('helpline copy includes the correct freephone number', () => {
    expect(WELLBEING_HELPLINE).toMatch(/0808 801 0677/);
  });

  test('helpline copy describes the service as confidential', () => {
    expect(WELLBEING_HELPLINE).toMatch(/confidential/);
  });

  test('helpline copy describes the service as free', () => {
    expect(WELLBEING_HELPLINE).toMatch(/free/);
  });

  test('is a non-empty string', () => {
    expect(typeof WELLBEING_HELPLINE).toBe('string');
    expect(WELLBEING_HELPLINE.length).toBeGreaterThan(0);
  });
});

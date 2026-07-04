/**
 * partnerAcknowledgements.test.js — the cheer acknowledgement set (D5-B1) is a
 * CLOSED enum, never a free-text path.
 *
 * Pins: exactly the four spec-authored lines, the quiet default, that validation
 * rejects anything outside the set (so no arbitrary string can be sent as an
 * acknowledgement), and that the copy stays in the calm coaching voice (no
 * exclamation marks, no em dash, no shame/ranking words).
 */
import {
  ACKNOWLEDGEMENTS, DEFAULT_ACK_KEY, isValidAckKey, ackLine,
} from '../acknowledgements';

describe('acknowledgement enum', () => {
  test('is exactly the four spec-authored lines, in order', () => {
    expect(ACKNOWLEDGEMENTS.map((a) => a.key)).toEqual([
      'proud', 'good_back', 'strong_both', 'here',
    ]);
    expect(ACKNOWLEDGEMENTS.map((a) => a.line)).toEqual([
      'Proud of your week.',
      'Good to see you back.',
      'Strong week, both of us.',
      'Here with you.',
    ]);
  });

  test('the default is the quiet "here" line', () => {
    expect(DEFAULT_ACK_KEY).toBe('here');
    expect(ackLine(DEFAULT_ACK_KEY)).toBe('Here with you.');
  });

  test('validation is a closed set: free text and unknown keys are rejected', () => {
    expect(isValidAckKey('proud')).toBe(true);
    expect(isValidAckKey('here')).toBe(true);
    // Anything a free-text field could produce is not a valid ack.
    expect(isValidAckKey('you are amazing')).toBe(false);
    expect(isValidAckKey('')).toBe(false);
    expect(isValidAckKey(null)).toBe(false);
    expect(isValidAckKey(undefined)).toBe(false);
    expect(isValidAckKey(42)).toBe(false);
  });

  test('an unknown key resolves to the quiet default line (never arbitrary text)', () => {
    expect(ackLine('made up key')).toBe('Here with you.');
    expect(ackLine(null)).toBe('Here with you.');
  });

  test('copy stays in the calm coaching voice', () => {
    const all = ACKNOWLEDGEMENTS.map((a) => a.line).join(' ');
    expect(all).not.toMatch(/!/); // no exclamation marks
    expect(/[–—]/.test(all)).toBe(false); // no em/en dash
    expect(all).not.toMatch(/\b(must|behind|ahead|beat|win|loser|fail|don't let)\b/i);
  });
});

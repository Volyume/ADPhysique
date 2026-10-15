/**
 * D228 item 5: the `structure_refused` telemetry event. Written to FAIL if
 *  - the emit runs while STRUCTURE_REFUSED_TELEMETRY is off (the server
 *    allow-list would reject it and the transport retries for ever);
 *  - the payload carries anything but reason codes and request numbers
 *    (no muscle names, no body data);
 *  - any of the three refusal seams stops calling the helper.
 */
const fs = require('fs');
const path = require('path');

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));

const flags = { STRUCTURE_REFUSED_TELEMETRY: false };
jest.mock('../sync/featureFlags', () => flags);

const REFUSAL = { reason: 'minimum_unreachable', suggestedDays: 4, suggestedLength: 60, minimumDays: 3, muscles: [{ muscle: 'chest', sets: 4, minimum: 8 }] };
const ARGS = { days: 2, lengthMinutes: 45, goal: 'bodybuilding', equipment: 'full_gym' };

describe('noteStructureRefusal', () => {
  beforeEach(() => { mockTrack.mockClear(); flags.STRUCTURE_REFUSED_TELEMETRY = false; });

  test('off: nothing is emitted', () => {
    const { noteStructureRefusal } = require('../planAutoGen');
    noteStructureRefusal('u1', 'save', REFUSAL, ARGS);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('on: one event with reason codes and request numbers only', () => {
    flags.STRUCTURE_REFUSED_TELEMETRY = true;
    const { noteStructureRefusal } = require('../planAutoGen');
    noteStructureRefusal('u1', 'preview', REFUSAL, ARGS);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    const [uid, event, payload] = mockTrack.mock.calls[0];
    expect(uid).toBe('u1');
    expect(event).toBe('structure_refused');
    expect(payload).toEqual({
      surface: 'preview', reason: 'minimum_unreachable', days: 2, length: 45,
      suggestedDays: 4, suggestedLength: 60, minimumDays: 3,
    });
    expect(JSON.stringify(payload)).not.toMatch(/muscle|chest|goal|equipment/);
  });

  test('on, no user: nothing is emitted; a throwing tracker never escapes', () => {
    flags.STRUCTURE_REFUSED_TELEMETRY = true;
    const { noteStructureRefusal } = require('../planAutoGen');
    noteStructureRefusal(null, 'save', REFUSAL, ARGS);
    expect(mockTrack).not.toHaveBeenCalled();
    mockTrack.mockImplementationOnce(() => { throw new Error('boom'); });
    expect(() => noteStructureRefusal('u1', 'save', REFUSAL, ARGS)).not.toThrow();
  });

  test('the three refusal seams call it, each before returning structure_refused', () => {
    const SRC = fs.readFileSync(path.resolve(__dirname, '../planAutoGen.js'), 'utf8');
    for (const surface of ['save', 'preview', 'rebuild']) {
      const i = SRC.indexOf(`noteStructureRefusal(userId, '${surface}', result.refusal, args);`);
      expect(i).toBeGreaterThan(-1);
      const after = SRC.slice(i, i + 260);
      expect(after).toMatch(/structure_refused/);
    }
  });
});

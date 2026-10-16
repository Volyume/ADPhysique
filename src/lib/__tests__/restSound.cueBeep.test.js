/**
 * restSound (D229 addendum 13, A): the camera's countdown cues are the rest
 * timer's own pips, played past the rest-sounds switch. Pinned, each written
 * to fail:
 *   - playRestBeep is silent when restSoundsEnabled is false (C10C's one
 *     mute point, unchanged);
 *   - playCueBeep plays the same pip whatever that setting says: the camera
 *     has its own "Cues" switch, so the rest timer's setting never gates it;
 *   - both draw on the one preloaded set of four sounds (three, two, one,
 *     go), prepared once;
 *   - an unknown key plays nothing, and a player that fails never throws
 *     into the countdown.
 */
const mockReplay = jest.fn(async () => {});
const mockCreate = jest.fn(async () => ({ sound: { replayAsync: mockReplay, unloadAsync: jest.fn(async () => {}) } }));
const mockSetMode = jest.fn(async () => {});
jest.mock('expo-av', () => ({
  Audio: { Sound: { createAsync: (...a) => mockCreate(...a) }, setAudioModeAsync: (...a) => mockSetMode(...a) },
}));

let mockState = { restSoundsEnabled: true };
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockState },
}));

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

describe('restSound: the rest pips and the camera cues', () => {
  let playRestBeep;
  let playCueBeep;
  let unloadRestBeeps;

  beforeEach(async () => {
    jest.resetModules();
    mockReplay.mockClear();
    mockCreate.mockClear();
    mockState = { restSoundsEnabled: true };
    ({ playRestBeep, playCueBeep, unloadRestBeeps } = require('../restSound'));
    await unloadRestBeeps();
  });

  test('the rest pip plays with sounds on, and is silent with the rest-sounds switch off', async () => {
    playRestBeep('three');
    await flush();
    expect(mockReplay).toHaveBeenCalledTimes(1);
    mockState = { restSoundsEnabled: false };
    playRestBeep('two');
    await flush();
    expect(mockReplay).toHaveBeenCalledTimes(1);
  });

  test('the camera cue plays whatever the rest-sounds switch says: the camera has its own', async () => {
    mockState = { restSoundsEnabled: false };
    playCueBeep('three');
    await flush();
    expect(mockReplay).toHaveBeenCalledTimes(1);
    playCueBeep('go');
    await flush();
    expect(mockReplay).toHaveBeenCalledTimes(2);
  });

  test('both draw on the one set of four pips, prepared once', async () => {
    playCueBeep('one');
    await flush();
    playRestBeep('go');
    await flush();
    expect(mockCreate).toHaveBeenCalledTimes(4);
    const paths = mockCreate.mock.calls.map((c) => c[0].uri);
    for (const key of ['three', 'two', 'one', 'go']) expect(paths.some((p) => p.endsWith(`${key}.wav`))).toBe(true);
    expect(mockReplay).toHaveBeenCalledTimes(2);
  });

  test('an unknown key plays nothing, and a player that fails never throws', async () => {
    playCueBeep('four');
    await flush();
    expect(mockReplay).not.toHaveBeenCalled();
    mockReplay.mockRejectedValueOnce(new Error('AVPlayer busy'));
    expect(() => playCueBeep('three')).not.toThrow();
    await flush();
    expect(mockReplay).toHaveBeenCalledTimes(1);
  });
});

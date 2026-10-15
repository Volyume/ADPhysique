/**
 * ClipCameraScreen (D229 addendum 5 and the founder's additions of 2026-10-15:
 * the camera must work hands-free for a set). expo-camera is mocked; the clip
 * store, haptics and Toast are mocked so the screen's own behaviour is what is
 * pinned:
 *   - camera access is asked for on open; a refusal is the calm warning toast
 *     "Camera access is needed to record a video" and the screen closes, with
 *     no settings link and no second prompt;
 *   - the view is video, muted, 1080p;
 *   - TAP: a countdown (3 / 5 / 10 s, remembered, default 3) with one light tick
 *     per number, then recording for the chosen length (5 / 10 / 15 s,
 *     remembered, default 15) that STOPS BY ITSELF; a tap during recording
 *     stops it early;
 *   - HOLD: records at once with no countdown, stops on release, capped at 15 s,
 *     whatever length is chosen;
 *   - the two small controls each carry a word ("Countdown", "Length"), and the
 *     line "Tap to start with a countdown. Hold to record while you hold." is
 *     always shown;
 *   - the amber line fills over the chosen length;
 *   - a recording under 1 s is discarded silently; closing mid-recording
 *     discards; flip is disabled while recording;
 *   - a save through the store carries the exercise and the set; from the
 *     workout: the house undo toast "Video saved to this workout" then back;
 *     from the summary or the share screen: no toast (the video is about to
 *     be on screen), back there with clipId; a full workout shows the sheet
 *     instead;
 *   - the screen stays awake while open.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockPermission = { granted: true, canAskAgain: true };
const mockRequestPermission = jest.fn(async () => mockPermission);
let mockResolveRecord = null;
let mockStopResolves = true;
const mockRecordAsync = jest.fn(() => new Promise((resolve) => { mockResolveRecord = resolve; }));
const mockStopRecording = jest.fn(() => {
  if (mockStopResolves && mockResolveRecord) {
    const r = mockResolveRecord;
    mockResolveRecord = null;
    r({ uri: 'file:///cache/Camera/take.mp4' });
  }
});
let mockCameraProps = null;

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    CameraView: React.forwardRef(function CameraView(props, ref) {
      mockCameraProps = props;
      React.useImperativeHandle(ref, () => ({
        recordAsync: (...a) => mockRecordAsync(...a),
        stopRecording: (...a) => mockStopRecording(...a),
      }));
      return React.createElement(View, props);
    }),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

let mockStoreState = { user: { id: 'u1' }, accessibility: { reduceMotion: false } };
jest.mock('../../store/useAppStore', () => {
  const store = jest.fn((selector) => selector(mockStoreState));
  store.getState = () => mockStoreState;
  return { __esModule: true, default: store };
});
const mockShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));
jest.mock('../../lib/haptics', () => ({
  clipCountdown: jest.fn(), commit: jest.fn(), selection: jest.fn(),
}));
const mockSaveClip = jest.fn();
const mockDeleteClip = jest.fn(async () => true);
const mockCount = jest.fn();
jest.mock('../../lib/clips/store', () => ({
  saveClip: (...a) => mockSaveClip(...a),
  deleteClip: (...a) => mockDeleteClip(...a),
  countClipsForWorkout: (...a) => mockCount(...a),
  listClipsForWorkout: jest.fn(async () => []),
}));
// The videos sheet is pinned in its own suite; here it only needs to say it opened.
jest.mock('../../components/clips/ClipsSheet', () => {
  const React = require('react');
  return { __esModule: true, default: (props) => React.createElement('ClipsSheetStub', { visible: props.visible, notice: props.notice }) };
});

const haptics = require('../../lib/haptics');
const FileSystem = require('expo-file-system/legacy');
const KeepAwake = require('expo-keep-awake');
const { Linking } = require('react-native');
const ClipCameraScreen = require('../ClipCameraScreen').default;

const DIR = path.join(__dirname, '..', '..');
const SOURCE = fs.readFileSync(path.join(DIR, 'screens', 'ClipCameraScreen.js'), 'utf8');
const PROGRESS = fs.readFileSync(path.join(DIR, 'components', 'clips', 'RecordingProgress.js'), 'utf8');

let navigation;
function route(params = {}) {
  return {
    params: {
      workoutId: 'w1', exerciseId: 'e1', exerciseName: 'Back squat', setNumber: 3, source: 'workout', ...params,
    },
  };
}

async function mount(params) {
  let tree;
  await act(async () => { tree = create(<ClipCameraScreen navigation={navigation} route={route(params)} />); });
  await act(async () => {});
  return tree;
}

// Host nodes only: the Pressable mock renders a wrapper and a host per control.
const hostById = (tree, id) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id)[0];
const press = async (tree, id) => {
  const node = hostById(tree, id);
  expect(node).toBeDefined();
  await act(async () => { node.props.onPress(); });
};
const text = (tree) => JSON.stringify(tree.toJSON());
const advance = async (ms) => { await act(async () => { jest.advanceTimersByTime(ms); }); };
const flush = async () => { await act(async () => {}); };
const styleOf = (node) => Object.assign({}, ...[].concat(node.props.style).flat(Infinity).filter(Boolean));

// Tap the record control, then let the default 3 second countdown run out.
async function startTapRecording(tree, countdownMs = 3000) {
  await press(tree, 'clip-camera-record');
  await flush();
  await advance(countdownMs);
  await flush();
}

// Press and hold the record control (the long press fires after the hold delay).
async function startHold(tree) {
  const node = hostById(tree, 'clip-camera-record');
  await act(async () => { node.props.onLongPress(); });
  await flush();
  return node;
}

const release = async (node) => { await act(async () => { node.props.onPressOut(); }); await flush(); };

beforeEach(async () => {
  jest.useFakeTimers();
  navigation = { goBack: jest.fn(), navigate: jest.fn() };
  mockPermission = { granted: true, canAskAgain: true };
  mockRequestPermission.mockClear();
  mockRecordAsync.mockClear();
  mockStopRecording.mockClear();
  mockResolveRecord = null;
  mockStopResolves = true;
  mockCameraProps = null;
  mockShow.mockClear();
  mockSaveClip.mockReset();
  mockSaveClip.mockImplementation(async (input) => ({
    ok: true,
    clip: { id: 'clip-1', workoutId: input.workoutId, durationMs: input.durationMs, uri: '/doc/clips/clip-1.mp4' },
  }));
  mockDeleteClip.mockClear();
  mockCount.mockReset();
  mockCount.mockResolvedValue(0);
  mockStoreState = { user: { id: 'u1' }, accessibility: { reduceMotion: false } };
  Object.values(haptics).forEach((f) => f.mockClear());
  FileSystem.deleteAsync.mockClear();
  KeepAwake.activateKeepAwakeAsync.mockClear();
  KeepAwake.deactivateKeepAwake.mockClear();
  Linking.openURL.mockClear();
  await AsyncStorage.clear();
  AsyncStorage.setItem.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('camera access', () => {
  test('already granted: the view opens, muted video at 1080p, and nothing is asked', async () => {
    const tree = await mount();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockCameraProps).toMatchObject({ mode: 'video', mute: true, videoQuality: '1080p', facing: 'back' });
    expect(hostById(tree, 'clip-camera-record')).toBeDefined();
  });

  test('asked on open when not granted; a grant opens the view', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    mockRequestPermission.mockResolvedValueOnce({ granted: true });
    await mount();
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockCameraProps).not.toBeNull();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a refusal is one calm warning toast, then the screen closes: no settings link, no second prompt', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    mockRequestPermission.mockResolvedValue({ granted: false });
    await mount();
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith('Camera access is needed to record a video', { variant: 'warning' });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockCameraProps).toBeNull();
  });

  test('no microphone permission is ever asked for, and no settings link exists', () => {
    expect(SOURCE).not.toMatch(/requestMicrophone|useMicrophonePermissions|RECORD_AUDIO|Audio\.requestPermissions/);
    expect(SOURCE).not.toMatch(/openSettings|Linking|app-settings/);
  });
});

describe('what the screen says, in plain words', () => {
  test('one line under the button, always shown: before and during the countdown it says how to start; while recording it says what stops it', async () => {
    const tree = await mount();
    const line = 'Tap to start with a countdown. Hold to record while you hold.';
    expect(text(tree)).toContain(line);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).toContain(line);
    await advance(3000);
    await flush();
    expect(text(tree)).not.toContain(line);
    expect(hostById(tree, 'clip-camera-hint').props.children).toBe('Tap the square to stop.');
  });

  test('each small control carries a word above its value: "Countdown" above 3 s, "Length" above 15 s', async () => {
    const tree = await mount();
    const json = text(tree);
    for (const word of ['Countdown', '3 s', 'Length', '15 s']) expect(json).toContain(`"${word}"`);
    expect(json.indexOf('"Countdown"')).toBeLessThan(json.indexOf('"3 s"'));
    expect(json.indexOf('"Length"')).toBeLessThan(json.indexOf('"15 s"'));
  });

  test('every control has a plain spoken label', async () => {
    const tree = await mount();
    expect(hostById(tree, 'clip-camera-close').props.accessibilityLabel).toBe('Cancel recording');
    expect(hostById(tree, 'clip-camera-flip').props.accessibilityLabel).toBe('Flip camera');
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
    expect(hostById(tree, 'clip-camera-leadin').props.accessibilityLabel).toBe('Countdown before recording, 3 seconds');
    expect(hostById(tree, 'clip-camera-length').props.accessibilityLabel).toBe('Recording length, 15 seconds');
  });

  test('close and flip are 48 dp targets', async () => {
    const tree = await mount();
    expect(styleOf(hostById(tree, 'clip-camera-close'))).toMatchObject({ width: 48, height: 48 });
    expect(styleOf(hostById(tree, 'clip-camera-flip'))).toMatchObject({ width: 48, height: 48 });
  });
});

describe('TAP: the countdown, then it records for the chosen length and stops by itself', () => {
  test('3, 2, 1 with one light tick each, then it records for 15 s with the ruled options', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).toContain('"3"');
    expect(haptics.clipCountdown).toHaveBeenCalledTimes(1);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    await advance(1000);
    expect(text(tree)).toContain('"2"');
    await advance(1000);
    expect(text(tree)).toContain('"1"');
    expect(haptics.clipCountdown).toHaveBeenCalledTimes(3);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    await advance(1000);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 15, codec: 'avc1' });
    expect(haptics.commit).toHaveBeenCalledTimes(1);
  });

  test('the record control cannot start a second countdown, and reads "Stop recording" once recording', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    await press(tree, 'clip-camera-record');
    await advance(3000);
    await flush();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Stop recording');
  });

  test('it stops BY ITSELF at the chosen length: 15 s by default', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(14999);
    expect(mockStopRecording).not.toHaveBeenCalled();
    await advance(1);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(15000);
  });

  test.each([[5, 5000], [10, 10000]])('with the length at %i s it records %i ms and stops by itself', async (seconds, ms) => {
    await AsyncStorage.setItem('@volyume_clip_length', String(seconds));
    const tree = await mount();
    await startTapRecording(tree);
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: seconds, codec: 'avc1' });
    await advance(ms - 1);
    expect(mockStopRecording).not.toHaveBeenCalled();
    await advance(1);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(ms);
  });

  test('a tap during the recording stops it early, with the selection haptic, and saves what was recorded', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(5000);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1', workoutId: 'w1', exerciseId: 'e1', exerciseName: 'Back squat', setNumber: 3,
      cacheUri: 'file:///cache/Camera/take.mp4', durationMs: 5000, source: 'workout',
    }));
  });

  test('the camera ending the video itself at its own limit is saved too, with the stop haptic', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(15000);
    await flush();
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
  });

  test('a stop that arrives before the recorder was running is asked for again every 300 ms until the recorder ends', async () => {
    mockStopResolves = false;
    const tree = await mount();
    await startTapRecording(tree);
    await advance(2000);
    await press(tree, 'clip-camera-record');
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    await advance(300);
    expect(mockStopRecording).toHaveBeenCalledTimes(2);
    await advance(1200);
    expect(mockStopRecording).toHaveBeenCalledTimes(6);
    // The recorder ends: the asking ends with it.
    await act(async () => { mockResolveRecord({ uri: 'file:///cache/Camera/take.mp4' }); });
    await flush();
    await advance(5000);
    expect(mockStopRecording).toHaveBeenCalledTimes(6);
  });
});

describe('the Countdown and Length controls', () => {
  test('Countdown reads 3 s and cycles 3 -> 5 -> 10 -> 3 on tap, remembered', async () => {
    const tree = await mount();
    expect(text(tree)).toContain('"3 s"');
    await press(tree, 'clip-camera-leadin');
    expect(text(tree)).toContain('"5 s"');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '5');
    await press(tree, 'clip-camera-leadin');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '10');
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 10 seconds');
    await press(tree, 'clip-camera-leadin');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '3');
  });

  test('Length reads 15 s and cycles 15 -> 5 -> 10 -> 15 on tap, remembered under its own key', async () => {
    const tree = await mount();
    expect(text(tree)).toContain('"15 s"');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_length', '5');
    expect(hostById(tree, 'clip-camera-length').props.accessibilityLabel).toBe('Recording length, 5 seconds');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_length', '10');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_length', '15');
  });

  test('both are remembered on the next open, and the countdown counts down from the remembered value', async () => {
    await AsyncStorage.setItem('@volyume_clip_leadin', '10');
    await AsyncStorage.setItem('@volyume_clip_length', '5');
    const tree = await mount();
    expect(text(tree)).toContain('"10 s"');
    expect(text(tree)).toContain('"5 s"');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).toContain('"10"');
    await advance(9000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    await advance(1000);
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 5, codec: 'avc1' });
    expect(haptics.clipCountdown).toHaveBeenCalledTimes(10);
  });

  test('a corrupt remembered value falls back to 3 s and 15 s', async () => {
    await AsyncStorage.setItem('@volyume_clip_leadin', 'banana');
    await AsyncStorage.setItem('@volyume_clip_length', '99');
    const tree = await mount();
    expect(text(tree)).toContain('"3 s"');
    expect(text(tree)).toContain('"15 s"');
  });

  test('neither can be changed once the countdown has begun or while recording', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    AsyncStorage.setItem.mockClear();
    await press(tree, 'clip-camera-leadin');
    await press(tree, 'clip-camera-length');
    await advance(3000);
    await flush();
    await press(tree, 'clip-camera-leadin');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('HOLD: records while held, no countdown, stops on release, capped at 15 s', () => {
  test('a long press records at once: no countdown numerals, no tick, the ruled options, the start haptic', async () => {
    const tree = await mount();
    await startHold(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 15, codec: 'avc1' });
    expect(haptics.clipCountdown).not.toHaveBeenCalled();
    expect(haptics.commit).toHaveBeenCalledTimes(1);
    expect(hostById(tree, 'clip-camera-countdown')).toBeUndefined();
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Stop recording');
  });

  test('letting go stops it and saves the video; the stop haptic fires once', async () => {
    const tree = await mount();
    const node = await startHold(tree);
    await advance(6000);
    await release(node);
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(mockSaveClip.mock.calls[0][0]).toMatchObject({ durationMs: 6000, setNumber: 3, source: 'workout' });
  });

  test('the chosen Length does not apply to a hold: it keeps going past 5 s, up to the 15 s cap', async () => {
    await AsyncStorage.setItem('@volyume_clip_length', '5');
    const tree = await mount();
    const node = await startHold(tree);
    await advance(9000);
    expect(mockStopRecording).not.toHaveBeenCalled();
    await release(node);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(9000);
  });

  test('held past 15 s it stops at the cap by itself', async () => {
    const tree = await mount();
    await startHold(tree);
    await advance(15000);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(15000);
  });

  test('a release before one second is discarded silently', async () => {
    const tree = await mount();
    const node = await startHold(tree);
    await advance(600);
    await release(node);
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
  });

  test('letting go while the workout is still being checked starts nothing', async () => {
    let finish;
    mockCount.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const tree = await mount();
    const node = hostById(tree, 'clip-camera-record');
    await act(async () => { node.props.onLongPress(); });
    await act(async () => { node.props.onPressOut(); });
    await act(async () => { finish(0); });
    await flush();
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
  });

  test('a plain tap\'s release does nothing: it is not a hold', async () => {
    const tree = await mount();
    const node = hostById(tree, 'clip-camera-record');
    await act(async () => { node.props.onPressOut(); });
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(mockStopRecording).not.toHaveBeenCalled();
  });

  test('a long press during a tap recording stops it (a press that became a long press reports no tap), and never starts a second recording', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(3000);
    const node = hostById(tree, 'clip-camera-record');
    await act(async () => { node.props.onLongPress(); });
    await flush();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
  });

  test('while a hold records, the hint says letting go stops it', async () => {
    const tree = await mount();
    await startHold(tree);
    await flush();
    expect(hostById(tree, 'clip-camera-hint').props.children).toBe('Let go to stop.');
  });

  test('a hold let go before the recorder has begun keeps asking it to stop until it ends, never a fixed number of times', async () => {
    mockStopResolves = false; // the recorder is slow to begin: a stop now is ignored
    const tree = await mount();
    const node = await startHold(tree);
    await act(async () => { node.props.onPressOut(); });
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    await advance(300);
    expect(mockStopRecording).toHaveBeenCalledTimes(2);
    await advance(1500);
    expect(mockStopRecording).toHaveBeenCalledTimes(7);
    // The recorder finally ends: the asking stops with it.
    await act(async () => { mockResolveRecord({ uri: 'file:///cache/Camera/take.mp4' }); });
    await flush();
    await advance(3000);
    expect(mockStopRecording).toHaveBeenCalledTimes(7);
  });

  test('the record control is a hold target: long press after 400 ms', async () => {
    const tree = await mount();
    const node = hostById(tree, 'clip-camera-record');
    expect(node.props.delayLongPress).toBe(400);
    expect(typeof node.props.onLongPress).toBe('function');
    expect(typeof node.props.onPressOut).toBe('function');
  });

  test('a full workout opens the videos sheet instead of recording', async () => {
    mockCount.mockResolvedValue(3);
    const tree = await mount();
    const node = await startHold(tree);
    await release(node);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(tree.root.findAll((n) => n.type === 'ClipsSheetStub')[0].props.visible).toBe(true);
  });
});

describe('while recording', () => {
  test('the line and the running time show, and flip is disabled', async () => {
    const tree = await mount();
    expect(hostById(tree, 'clip-camera-line')).toBeUndefined();
    await startTapRecording(tree);
    await advance(7000);
    expect(hostById(tree, 'clip-camera-line')).toBeDefined();
    expect(text(tree)).toContain('"0:07"');
    expect(hostById(tree, 'clip-camera-flip').props.disabled).toBe(true);
  });

  test('the line fills over the CHOSEN length: halfway through 10 s it is half full', async () => {
    await AsyncStorage.setItem('@volyume_clip_length', '10');
    const tree = await mount();
    await startTapRecording(tree);
    await advance(5000);
    const fill = hostById(tree, 'clip-camera-line-fill');
    const scale = styleOf(fill).transform[0].scaleX;
    expect(scale).toBeGreaterThan(0.45);
    expect(scale).toBeLessThan(0.55);
  });

  test('the line fills over 15 s for a hold', async () => {
    await AsyncStorage.setItem('@volyume_clip_length', '5');
    const tree = await mount();
    await startHold(tree);
    await advance(7500);
    const scale = styleOf(hostById(tree, 'clip-camera-line-fill')).transform[0].scaleX;
    expect(scale).toBeGreaterThan(0.45);
    expect(scale).toBeLessThan(0.55);
  });

  test('flip switches the camera when idle and is ignored while recording', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-flip');
    expect(mockCameraProps.facing).toBe('front');
    await startTapRecording(tree);
    await press(tree, 'clip-camera-flip');
    expect(mockCameraProps.facing).toBe('front');
  });

  test('a recording under 1 second is discarded silently: no save, no toast, back to ready', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(500);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
  });

  test('exactly 1 second is kept', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(1000);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
  });

  test('closing mid-recording discards it with no confirmation and saves nothing', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(6000);
    await press(tree, 'clip-camera-close');
    await flush();
    expect(mockStopRecording).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
  });

  test('closing during the countdown cancels it: nothing is recorded', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    await press(tree, 'clip-camera-close');
    await advance(5000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('closing while the workout is still being checked starts nothing when the check comes back', async () => {
    let finish;
    mockCount.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await press(tree, 'clip-camera-close');
    await act(async () => { finish(0); });
    await flush();
    await advance(5000);
    expect(text(tree)).not.toContain('"3"');
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('leaving the screen mid-recording (Android back) discards it too', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(4000);
    await act(async () => { tree.unmount(); });
    await flush();
    expect(mockStopRecording).toHaveBeenCalled();
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
  });
});

describe('after a save', () => {
  async function recordFiveSeconds(params) {
    const tree = await mount(params);
    await startTapRecording(tree);
    await advance(5000);
    await press(tree, 'clip-camera-record');
    await flush();
    return tree;
  }

  test('workout: back, with the toast "Video saved to this workout" and an Undo that deletes it', async () => {
    await recordFiveSeconds({ source: 'workout' });
    expect(mockShow).toHaveBeenCalledTimes(1);
    const [message, options] = mockShow.mock.calls[0];
    expect(message).toBe('Video saved to this workout');
    expect(options.variant).toBe('undo');
    expect(options.action.label).toBe('Undo');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockDeleteClip).not.toHaveBeenCalled();
    await act(async () => { options.action.onPress(); });
    expect(mockDeleteClip).toHaveBeenCalledWith('clip-1');
  });

  test('the exercise and the set it was recorded for are kept with the video', async () => {
    await recordFiveSeconds({ source: 'workout', exerciseId: 'e7', exerciseName: 'Bench press', setNumber: 2 });
    expect(mockSaveClip.mock.calls[0][0]).toMatchObject({ exerciseId: 'e7', exerciseName: 'Bench press', setNumber: 2 });
  });

  test('summary: no toast here, back to the summary carrying the id for the share screen', async () => {
    await recordFiveSeconds({ source: 'summary', exerciseId: null, exerciseName: null, setNumber: null });
    expect(mockShow).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith({ name: 'WorkoutSummary', params: { clipId: 'clip-1' }, merge: true });
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(mockSaveClip.mock.calls[0][0]).toMatchObject({ source: 'summary', exerciseId: null, exerciseName: null, setNumber: null });
  });

  test('share: back to the share screen with the id merged in, no toast, saved as a share-screen video (it can be mid-workout, so never "after")', async () => {
    await recordFiveSeconds({ source: 'share', exerciseId: null, exerciseName: null, setNumber: null });
    expect(navigation.navigate).toHaveBeenCalledWith({ name: 'ShareCard', params: { clipId: 'clip-1' }, merge: true });
    expect(mockShow).not.toHaveBeenCalled();
    expect(mockSaveClip.mock.calls[0][0].source).toBe('share');
  });

  test('a failed Undo says so calmly', async () => {
    await recordFiveSeconds({ source: 'workout' });
    mockDeleteClip.mockRejectedValueOnce(new Error('EBUSY'));
    await act(async () => { mockShow.mock.calls[0][1].action.onPress(); });
    await flush();
    expect(mockShow).toHaveBeenLastCalledWith("Couldn't remove that video. Try again.", { variant: 'error' });
  });

  test('a save that fails drops the file, says so calmly and stays on the camera', async () => {
    mockSaveClip.mockResolvedValueOnce({ ok: false, reason: 'move_failed' });
    const tree = await recordFiveSeconds({ source: 'workout' });
    expect(mockShow).toHaveBeenCalledWith("Couldn't save that video. Try again.", { variant: 'error' });
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
  });
});

describe('a workout that already holds three videos', () => {
  test('tapping record opens the videos sheet instead, with the notice: no countdown, no recording', async () => {
    mockCount.mockResolvedValue(3);
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    await advance(5000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    const sheet = tree.root.findAll((n) => n.type === 'ClipsSheetStub')[0];
    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.notice).toBe('This workout already has 3 videos. Delete one to record another.');
  });

  test('if the store says full after a recording (a race), the file is dropped and the sheet opens', async () => {
    mockSaveClip.mockResolvedValueOnce({ ok: false, reason: 'full' });
    const tree = await mount();
    await startTapRecording(tree);
    await advance(4000);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
    expect(tree.root.findAll((n) => n.type === 'ClipsSheetStub')[0].props.visible).toBe(true);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

describe('the screen itself', () => {
  test('stays awake while open, on its own tag, and lets go on leaving', async () => {
    const tree = await mount();
    expect(KeepAwake.activateKeepAwakeAsync).toHaveBeenCalledWith('volyume-clip-camera');
    await act(async () => { tree.unmount(); });
    expect(KeepAwake.deactivateKeepAwake).toHaveBeenCalledWith('volyume-clip-camera');
  });

  test('Reduce Motion: it still records and counts down, and the clock steps', async () => {
    mockStoreState = { user: { id: 'u1' }, accessibility: { reduceMotion: true } };
    const tree = await mount();
    await startTapRecording(tree);
    await advance(3000);
    expect(text(tree)).toContain('"0:03"');
  });

  test('a missing workout closes the screen without a word rather than recording against nothing', async () => {
    await mount({ workoutId: undefined });
    expect(navigation.goBack).toHaveBeenCalled();
    expect(mockCameraProps).toBeNull();
    expect(mockShow).not.toHaveBeenCalled();
  });
});

describe('source rules', () => {
  test('haptics only through the vocabulary: clipCountdown, commit, selection; never restCountdown or expo-haptics', () => {
    expect(SOURCE).toMatch(/haptics\.clipCountdown\(\)/);
    expect(SOURCE).toMatch(/haptics\.commit\(\)/);
    expect(SOURCE).toMatch(/haptics\.selection\(\)/);
    expect(SOURCE).not.toMatch(/restCountdown|from 'expo-haptics'|require\('expo-haptics'\)/);
  });

  test('the top line is the rest timer\'s drain line: 2 dp, primaryFill', () => {
    const rest = fs.readFileSync(path.join(DIR, 'components', 'RestTimer.js'), 'utf8');
    expect(rest).toMatch(/drainFill: \{[^}]*height: 2,[^}]*backgroundColor: colors\.primaryFill/s);
    expect(PROGRESS).toMatch(/lineFill: \{[^}]*height: 2,[^}]*backgroundColor: CAM\.primaryFill/s);
    expect(PROGRESS).toMatch(/lineTrack: \{[^}]*height: 2,/s);
  });

  test('no JS-thread Animated and no linear easing: the frozen motion allowlists are not touched', () => {
    // Code only: the header comments say why Animated is absent.
    const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const src of [SOURCE, PROGRESS]) {
      expect(code(src)).not.toMatch(/\bAnimated\b/);
      expect(code(src)).not.toMatch(/Easing/);
    }
  });

  test('tokens only: no hex or rgb literal, no raw fontSize', () => {
    for (const src of [SOURCE, PROGRESS]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\brgba?\s*\(/);
      expect(src).not.toMatch(/\bfontSize\s*:\s*\d/);
    }
  });
});

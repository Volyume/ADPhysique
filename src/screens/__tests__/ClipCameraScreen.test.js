/**
 * ClipCameraScreen (D229 addendum 5 and the founder's additions of 2026-10-15:
 * the camera must work hands-free for a set). expo-camera is mocked; the clip
 * store, haptics and Toast are mocked so the screen's own behaviour is what is
 * pinned:
 *   - camera access is asked for on open; a refusal is the calm warning toast
 *     "Volyume needs camera access to record a video." and the screen closes, with
 *     no settings link and no second prompt;
 *   - the view is video, muted, 1080p;
 *   - TAP: a countdown (3 / 5 / 10 / 15 / 20 s, remembered, default 3) with
 *     one light tick per number, then recording for the chosen length (60 /
 *     90 s / 2 min, remembered, default 90 s: addendum 13, a real set is
 *     longer than 15 s) that STOPS BY ITSELF; a tap during recording stops
 *     it early;
 *   - HOLD: records at once with no countdown, stops on release, capped at
 *     two minutes, whatever length is chosen;
 *   - the cues (addendum 13, A): the rest timer's pips on 3, 2, 1 and the
 *     start tone at 0, the torch pulsing on the countdown's beats with the
 *     back camera (a white screen pulse with the front), each switchable on
 *     the camera and remembered; the end cue after a recording that reached
 *     its length by itself, never after a stop by hand;
 *   - the View control (addendum 13, E): Normal or Wide, only on an iPhone
 *     whose camera reports an ultra wide lens, never on Android; the torch
 *     is not pulsed while the wide lens is in use;
 *   - the video is 6 Mbps (addendum 13, G) and the front camera's preview is
 *     mirrored;
 *   - the two small controls each carry a word ("Countdown", "Length"), and the
 *     line "Tap the button to start after a countdown, or press and hold it to record for as long as you hold." is
 *     always shown;
 *   - the amber line fills over the chosen length;
 *   - a recording under 1 s is discarded silently; closing mid-recording
 *     discards; flip is disabled while recording;
 *   - a save through the store carries the exercise and the set; from the
 *     workout: the house undo toast saying where the video is (addendum
 *     14, the founder's precision order: "Saved with this workout. Find it
 *     later under the three dots on this exercise, in Your videos, or on
 *     your share when you finish."), with Watch beside Undo, then back;
 *     from the summary or the share screen: no toast (the video is about to
 *     be on screen), back there with clipId; a full workout shows the sheet
 *     instead;
 *   - the screen stays awake while open;
 *   - SHARE-ONLY MODE ({ mode: 'share', returnTo? }, no workout; the share
 *     screen's Film now on a share with no workout, lead ruling 2026-10-16):
 *     records the same way, muted, but never touches the clip store (no
 *     save, no three-video check, no toast, no Undo) and hands the file
 *     back to the share screen as `sharedVideo`; the workout mode is
 *     unchanged.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CAMERA_TIPS } from '../../lib/clips/cameraTips';
import { AppState } from 'react-native';
import { CLIP_STRINGS } from '../../lib/clips/rules';

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
// Addendum 13 (E): what the phone says its lenses are (none by default, as
// Android reports, and as an iPhone with one back lens does).
const mockLenses = jest.fn(async () => []);

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
        getAvailableLensesAsync: (...a) => mockLenses(...a),
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
// Addendum 13 (A): the sound cue is the rest timer's own pips, played past
// the rest-sounds switch (restSound.test.js pins that); here only WHEN it is
// asked for is pinned.
const mockCueBeep = jest.fn();
jest.mock('../../lib/restSound', () => ({ playCueBeep: (...a) => mockCueBeep(...a) }));
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
  mockLenses.mockReset();
  mockLenses.mockResolvedValue([]);
  mockCueBeep.mockClear();
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

  test('the video is 6 Mbps (addendum 13, G), the torch is off, and only the front camera is mirrored', async () => {
    const tree = await mount();
    expect(mockCameraProps).toMatchObject({ videoBitrate: 6000000, enableTorch: false, mirror: false });
    await press(tree, 'clip-camera-flip');
    expect(mockCameraProps).toMatchObject({ facing: 'front', mirror: true });
  });

  test('asked on open when not granted; a grant opens the view', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    mockRequestPermission.mockResolvedValueOnce({ granted: true });
    await mount();
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockCameraProps).not.toBeNull();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a refusal keeps the screen open on a calm card with the same words and a Back button: no toast, no settings link, no second prompt (U8)', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    mockRequestPermission.mockResolvedValue({ granted: false });
    const tree = await mount();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    expect(hostById(tree, 'clip-camera-denied')).toBeDefined();
    expect(text(tree)).toContain("Volyume needs camera access to film a set. You can turn it on for Volyume in your phone's settings.");
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockCameraProps).toBeNull();
    await press(tree, 'clip-camera-denied-back');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a build without the camera module says to update the app, in its own line (still no settings link)', () => {
    expect(SOURCE).toMatch(/if \(!CameraView\) \{ closeOnce\(CLIP_STRINGS\.cameraMissing\); return; \}/);
    expect(CLIP_STRINGS.cameraMissing).toBe('Filming a set needs a newer version of Volyume. Update the app and try again.');
    expect(CLIP_STRINGS.cameraMissing).not.toBe(CLIP_STRINGS.permissionDenied);
  });

  test('no microphone permission is ever asked for, and no settings link exists', () => {
    expect(SOURCE).not.toMatch(/requestMicrophone|useMicrophonePermissions|RECORD_AUDIO|Audio\.requestPermissions/);
    expect(SOURCE).not.toMatch(/openSettings|Linking|app-settings/);
  });
});

describe('what the screen says, in plain words', () => {
  test('one line under the button, always shown: before it says how to start; during the countdown how to cancel; while recording what stops it', async () => {
    const tree = await mount();
    const line = 'Tap the button to start after a countdown, or press and hold it to record for as long as you hold.';
    expect(text(tree)).toContain(line);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).not.toContain(line);
    expect(hostById(tree, 'clip-camera-hint').props.children).toBe('Tap the button again to cancel.');
    await advance(3000);
    await flush();
    expect(text(tree)).not.toContain(line);
    expect(hostById(tree, 'clip-camera-hint').props.children).toBe('Tap the square when you want to stop.');
  });

  test('each small control carries a word above its value: "Countdown" above 3 s, "Length" above 90 s, "Cues" above its state', async () => {
    const tree = await mount();
    const json = text(tree);
    for (const word of ['Countdown', '3 s', 'Length', '90 s', 'Cues', 'Sound and light']) expect(json).toContain(`"${word}"`);
    expect(json.indexOf('"Countdown"')).toBeLessThan(json.indexOf('"3 s"'));
    expect(json.indexOf('"Length"')).toBeLessThan(json.indexOf('"90 s"'));
    expect(json.indexOf('"Cues"')).toBeLessThan(json.indexOf('"Sound and light"'));
  });

  test('every control has a plain spoken label', async () => {
    const tree = await mount();
    expect(hostById(tree, 'clip-camera-close').props.accessibilityLabel).toBe('Close camera');
    expect(hostById(tree, 'clip-camera-flip').props.accessibilityLabel).toBe('Flip camera');
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
    expect(hostById(tree, 'clip-camera-leadin').props.accessibilityLabel).toBe('Countdown before recording, 3 seconds');
    expect(hostById(tree, 'clip-camera-length').props.accessibilityLabel).toBe('Recording length, 90 seconds');
    expect(hostById(tree, 'clip-camera-cues').props.accessibilityLabel).toBe('Countdown cues, sound and light');
  });

  test('close and flip are 48 dp targets', async () => {
    const tree = await mount();
    expect(styleOf(hostById(tree, 'clip-camera-close'))).toMatchObject({ width: 48, height: 48 });
    expect(styleOf(hostById(tree, 'clip-camera-flip'))).toMatchObject({ width: 48, height: 48 });
  });
});

describe('TAP: the countdown, then it records for the chosen length and stops by itself', () => {
  test('3, 2, 1 with one light tick each, then it records for 90 s with the ruled options', async () => {
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
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 90, codec: 'avc1' });
    expect(haptics.commit).toHaveBeenCalledTimes(1);
  });

  test('the record control reads "Cancel the countdown" while it runs, and "Stop recording" once recording; the close glyph reads "Cancel recording" in both', async () => {
    const tree = await mount();
    expect(hostById(tree, 'clip-camera-close').props.accessibilityLabel).toBe('Close camera');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Cancel the countdown');
    expect(hostById(tree, 'clip-camera-close').props.accessibilityLabel).toBe('Cancel recording');
    await advance(3000);
    await flush();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Stop recording');
    expect(hostById(tree, 'clip-camera-close').props.accessibilityLabel).toBe('Cancel recording');
  });

  test('a tap during the countdown CANCELS it: no recording, timers cleared, the light off, ready again; a new tap starts a fresh countdown', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    await advance(1000);
    expect(text(tree)).toContain('"2"');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).not.toContain('clip-camera-countdown');
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
    expect(hostById(tree, 'clip-camera-hint').props.children).toBe('Tap the button to start after a countdown, or press and hold it to record for as long as you hold.');
    expect(mockCameraProps.enableTorch).toBe(false);
    // The old countdown is gone: nothing records, however long we wait.
    await advance(10000);
    await flush();
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    // A fresh tap counts down again from the start, and records once.
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).toContain('"3"');
    await advance(3000);
    await flush();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
  });

  test('it stops BY ITSELF at the chosen length: 90 s by default (addendum 13)', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(89999);
    expect(mockStopRecording).not.toHaveBeenCalled();
    await advance(1);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(90000);
  });

  test.each([[60, 60000], [120, 120000]])('with the length at %i s it records %i ms and stops by itself', async (seconds, ms) => {
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
    await advance(90000);
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

describe('setting the camera up first (addendum 10)', () => {
  const guides = (tree) => hostById(tree, 'clip-camera-guides');
  const setup = (tree) => hostById(tree, 'clip-camera-setup');

  test('the guide lines and the setup line show while the camera waits; the line goes at the countdown, the lines when recording starts', async () => {
    const tree = await mount();
    expect(guides(tree)).toBeDefined();
    // Addendum 12: the line is the exercise's own camera tip (the mount's
    // exercise is "Back squat").
    expect(setup(tree).props.children).toBe(CAMERA_TIPS.squat);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(setup(tree)).toBeUndefined();
    expect(guides(tree)).toBeDefined(); // still there while counting down
    await advance(3000);
    await flush();
    expect(guides(tree)).toBeUndefined(); // recording: the live view is clean
  });

  test('the setup line is the exercise\'s own camera tip, from its name, pattern and equipment; the general line without an exercise (addendum 12)', async () => {
    let tree = await mount({ exerciseName: 'Deadlift', exercisePattern: 'hinge', exerciseEquipment: 'barbell' });
    expect(setup(tree).props.children).toBe(CAMERA_TIPS.hinge);
    // The pattern and equipment settle a name that says nothing.
    tree = await mount({ exerciseName: 'Pendlay', exercisePattern: 'pull', exerciseEquipment: 'barbell' });
    expect(setup(tree).props.children).toBe(CAMERA_TIPS.row);
    tree = await mount({ exerciseName: 'Mystery', exercisePattern: null, exerciseEquipment: 'machine' });
    expect(setup(tree).props.children).toBe(CAMERA_TIPS.machine);
    // From the summary or the share, no exercise: the general line.
    tree = await mount({ exerciseId: null, exerciseName: null, setNumber: null, source: 'summary' });
    expect(setup(tree).props.children).toBe(CAMERA_TIPS.general);
  });

  test('"Guides" reads On and turns Off on tap, remembered on the phone; Off hides the lines', async () => {
    const tree = await mount();
    const control = () => hostById(tree, 'clip-camera-guides-control');
    expect(control().props.accessibilityLabel).toBe('Guide lines, on');
    expect(text(tree)).toContain('"Guides"');
    expect(text(tree)).toContain('"On"');
    await press(tree, 'clip-camera-guides-control');
    expect(control().props.accessibilityLabel).toBe('Guide lines, off');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_guides', 'false');
    expect(guides(tree)).toBeUndefined();
    await press(tree, 'clip-camera-guides-control');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_guides', 'true');
    expect(guides(tree)).toBeDefined();
  });

  test('a phone that turned the guides off opens without them', async () => {
    await AsyncStorage.setItem('@volyume_clip_guides', 'false');
    const tree = await mount();
    expect(guides(tree)).toBeUndefined();
    expect(hostById(tree, 'clip-camera-guides-control').props.accessibilityLabel).toBe('Guide lines, off');
  });

  test('the guides control waits like the other two: not while counting down or recording', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(hostById(tree, 'clip-camera-guides-control').props.accessibilityState).toEqual({ disabled: true });
  });
});

describe('the Countdown and Length controls', () => {
  test('Countdown reads 3 s and cycles 3 -> 5 -> 10 -> 15 -> 20 -> 3 on tap, remembered (addendum 13, D)', async () => {
    const tree = await mount();
    expect(text(tree)).toContain('"3 s"');
    await press(tree, 'clip-camera-leadin');
    expect(text(tree)).toContain('"5 s"');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '5');
    await press(tree, 'clip-camera-leadin');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '10');
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 10 seconds');
    await press(tree, 'clip-camera-leadin');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '15');
    await press(tree, 'clip-camera-leadin');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '20');
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 20 seconds');
    await press(tree, 'clip-camera-leadin');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_leadin', '3');
  });

  test('Length reads 90 s and cycles 90 -> 2 min -> 60 -> 90 on tap, remembered under its own key (addendum 13)', async () => {
    const tree = await mount();
    expect(text(tree)).toContain('"90 s"');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_length', '120');
    expect(text(tree)).toContain('"2 min"');
    expect(hostById(tree, 'clip-camera-length').props.accessibilityLabel).toBe('Recording length, 2 minutes');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_length', '60');
    expect(hostById(tree, 'clip-camera-length').props.accessibilityLabel).toBe('Recording length, 60 seconds');
    await press(tree, 'clip-camera-length');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_length', '90');
  });

  test('both are remembered on the next open, and the countdown counts down from the remembered value', async () => {
    await AsyncStorage.setItem('@volyume_clip_leadin', '10');
    await AsyncStorage.setItem('@volyume_clip_length', '60');
    const tree = await mount();
    expect(text(tree)).toContain('"10 s"');
    expect(text(tree)).toContain('"60 s"');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(text(tree)).toContain('"10"');
    await advance(9000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    await advance(1000);
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 60, codec: 'avc1' });
    expect(haptics.clipCountdown).toHaveBeenCalledTimes(10);
  });

  test('a corrupt remembered value falls back to 3 s and 90 s', async () => {
    await AsyncStorage.setItem('@volyume_clip_leadin', 'banana');
    await AsyncStorage.setItem('@volyume_clip_length', '99');
    const tree = await mount();
    expect(text(tree)).toContain('"3 s"');
    expect(text(tree)).toContain('"90 s"');
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

describe('HOLD: records while held, no countdown, stops on release, capped at two minutes', () => {
  test('a long press records at once: no countdown numerals, no tick, the ruled options, the start haptic', async () => {
    const tree = await mount();
    await startHold(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 120, codec: 'avc1' });
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

  test('the chosen Length does not apply to a hold: it keeps going past 60 s, up to the two minute cap', async () => {
    await AsyncStorage.setItem('@volyume_clip_length', '60');
    const tree = await mount();
    const node = await startHold(tree);
    await advance(70000);
    expect(mockStopRecording).not.toHaveBeenCalled();
    await release(node);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(70000);
  });

  test('held past two minutes it stops at the cap by itself', async () => {
    const tree = await mount();
    await startHold(tree);
    await advance(120000);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockSaveClip.mock.calls[0][0].durationMs).toBe(120000);
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
    expect(hostById(tree, 'clip-camera-hint').props.children).toBe('Let go when you want to stop.');
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

describe('the cues (addendum 13, A): sound and light for a phone propped away from the lifter', () => {
  const torch = () => mockCameraProps.enableTorch;
  const pulse = (tree) => hostById(tree, 'clip-camera-screen-pulse');

  test('Sound and light by default: 3, 2, 1 play the pips and pulse the torch; 0 plays the start tone with no light; the torch never shows in the video', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockCueBeep).toHaveBeenLastCalledWith('three');
    expect(torch()).toBe(true);
    await advance(200);
    expect(torch()).toBe(false); // one 200 ms pulse, then dark
    await advance(800);
    expect(mockCueBeep).toHaveBeenLastCalledWith('two');
    expect(torch()).toBe(true);
    await advance(1000);
    expect(mockCueBeep).toHaveBeenLastCalledWith('one');
    expect(torch()).toBe(true);
    await advance(1000);
    expect(mockCueBeep).toHaveBeenLastCalledWith('go');
    expect(mockCueBeep).toHaveBeenCalledTimes(4);
    expect(torch()).toBe(false); // off before the first frame
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    await advance(5000);
    expect(torch()).toBe(false);
  });

  test('a long countdown pulses the light on its first second and on the fives, with no pip; the pips are the final three', async () => {
    await AsyncStorage.setItem('@volyume_clip_leadin', '10');
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(torch()).toBe(true); // 10
    expect(mockCueBeep).not.toHaveBeenCalled();
    await advance(1000); // 9
    expect(torch()).toBe(false);
    await advance(4000); // 5
    expect(torch()).toBe(true);
    expect(mockCueBeep).not.toHaveBeenCalled();
    await advance(2000); // 3
    expect(mockCueBeep).toHaveBeenLastCalledWith('three');
    await advance(3000); // 0
    expect(mockCueBeep).toHaveBeenLastCalledWith('go');
    expect(mockCueBeep).toHaveBeenCalledTimes(4);
  });

  test('with the front camera the light is a brief white screen pulse, not the torch (phones have no front torch)', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-flip');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(torch()).toBe(false);
    expect(pulse(tree)).toBeDefined();
    expect(pulse(tree).props.pointerEvents).toBe('none');
    await advance(200);
    expect(pulse(tree)).toBeUndefined();
  });

  test('"Cues" cycles Sound and light -> Light only -> Sound only -> Off -> Sound and light, remembered under its own key', async () => {
    const tree = await mount();
    const control = () => hostById(tree, 'clip-camera-cues');
    expect(text(tree)).toContain('"Cues"');
    expect(text(tree)).toContain('"Sound and light"');
    await press(tree, 'clip-camera-cues');
    expect(text(tree)).toContain('"Light only"');
    expect(control().props.accessibilityLabel).toBe('Countdown cues, light only');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_cues', 'light');
    await press(tree, 'clip-camera-cues');
    expect(text(tree)).toContain('"Sound only"');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_cues', 'sound');
    await press(tree, 'clip-camera-cues');
    expect(text(tree)).toContain('"Off"');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_cues', 'off');
    await press(tree, 'clip-camera-cues');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@volyume_clip_cues', 'both');
  });

  test('Light only: the torch pulses and nothing plays; Sound only: the pips play and the torch stays off', async () => {
    await AsyncStorage.setItem('@volyume_clip_cues', 'light');
    let tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(torch()).toBe(true);
    await advance(3000);
    expect(mockCueBeep).not.toHaveBeenCalled();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);

    await act(async () => { tree.unmount(); });
    mockRecordAsync.mockClear();
    await AsyncStorage.setItem('@volyume_clip_cues', 'sound');
    tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(torch()).toBe(false);
    expect(mockCueBeep).toHaveBeenLastCalledWith('three');
    await advance(3000);
    expect(mockCueBeep).toHaveBeenCalledTimes(4);
    expect(torch()).toBe(false);
  });

  test('Off: no pip, no torch, no screen pulse, and the countdown still runs', async () => {
    await AsyncStorage.setItem('@volyume_clip_cues', 'off');
    const tree = await mount();
    expect(hostById(tree, 'clip-camera-cues').props.accessibilityLabel).toBe('Countdown cues, off');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(torch()).toBe(false);
    expect(pulse(tree)).toBeUndefined();
    await advance(3000);
    expect(mockCueBeep).not.toHaveBeenCalled();
    expect(torch()).toBe(false);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
  });

  test('a corrupt remembered value falls back to Sound and light', async () => {
    await AsyncStorage.setItem('@volyume_clip_cues', 'loud');
    const tree = await mount();
    expect(text(tree)).toContain('"Sound and light"');
  });

  test('Cues cannot be changed once the countdown has begun or while recording', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    AsyncStorage.setItem.mockClear();
    expect(hostById(tree, 'clip-camera-cues').props.accessibilityState).toEqual({ disabled: true });
    await press(tree, 'clip-camera-cues');
    await advance(3000);
    await flush();
    await press(tree, 'clip-camera-cues');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(text(tree)).not.toContain('"Light only"');
  });

  test('the end cue (addendum 13, C): a recording that reached its length by itself gets two descending pips 300 ms apart and ONE pulse, after the file is finished', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    mockCueBeep.mockClear();
    await advance(90000);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockCueBeep).toHaveBeenCalledTimes(1);
    expect(mockCueBeep).toHaveBeenLastCalledWith('two');
    expect(torch()).toBe(true);
    await advance(200);
    expect(torch()).toBe(false);
    await advance(100);
    expect(mockCueBeep).toHaveBeenCalledTimes(2);
    expect(mockCueBeep).toHaveBeenLastCalledWith('three');
    // The second beat is sound only: the light never flashes twice in a second.
    expect(torch()).toBe(false);
    await advance(200);
    expect(torch()).toBe(false);
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
  });

  test('the screen waits for the end cue\'s second beat before it leaves, so the person hears both', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(90000);
    await flush();
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).not.toHaveBeenCalled();
    await advance(600);
    await flush();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('leaving during that wait (the OS, a parent) cancels it: no navigation from a screen that is gone', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(90000);
    await flush();
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    await act(async () => { tree.unmount(); });
    await advance(1000);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('no end cue after a stop by hand (a tap, a release, or the close): the person is at the phone', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    mockCueBeep.mockClear();
    await advance(5000);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockCueBeep).not.toHaveBeenCalled();
    expect(torch()).toBe(false);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a hold held to the cap gets no end cue: a finger is on the button, so the person is at the phone', async () => {
    const tree = await mount();
    await startHold(tree);
    mockCueBeep.mockClear();
    await advance(120000);
    await flush();
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(mockCueBeep).not.toHaveBeenCalled();
    expect(torch()).toBe(false);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a stop asked for just before the length is a stop by hand: no end cue even though the length timer also fires', async () => {
    mockStopResolves = false; // the recorder is slow to end, so the length timer fires too
    const tree = await mount();
    await startTapRecording(tree);
    await advance(89900);
    await press(tree, 'clip-camera-record');
    mockCueBeep.mockClear();
    await advance(200);
    await act(async () => { mockResolveRecord({ uri: 'file:///cache/Camera/take.mp4' }); });
    await flush();
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(mockCueBeep).not.toHaveBeenCalled();
  });

  test('no end cue with the cues off; the screen leaves at once', async () => {
    await AsyncStorage.setItem('@volyume_clip_cues', 'off');
    const tree = await mount();
    await startTapRecording(tree);
    await advance(90000);
    await flush();
    expect(mockCueBeep).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('closing during the countdown leaves nothing lit', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(torch()).toBe(true);
    await press(tree, 'clip-camera-close');
    await advance(5000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
  });
});

describe('the View control (addendum 13, E): Normal or Wide, when the phone has an ultra wide lens', () => {
  const { Platform } = require('react-native');
  const ORIGINAL_OS = Platform.OS;
  afterEach(() => { Platform.OS = ORIGINAL_OS; });
  const IPHONE = ['Back Camera', 'Back Telephoto Camera', 'Back Ultra Wide Camera', 'Back Dual Camera', 'Front Camera'];

  test('an iPhone with an ultra wide lens: the control shows, reads Normal, names the plain back lens, and Wide picks the ultra wide', async () => {
    Platform.OS = 'ios';
    mockLenses.mockResolvedValue(IPHONE);
    const tree = await mount();
    await advance(300);
    await flush();
    const control = () => hostById(tree, 'clip-camera-view');
    expect(control()).toBeDefined();
    expect(text(tree)).toContain('"View"');
    expect(text(tree)).toContain('"Normal"');
    expect(control().props.accessibilityLabel).toBe('View: normal.');
    expect(mockCameraProps.selectedLens).toBe('Back Camera');
    await press(tree, 'clip-camera-view');
    expect(text(tree)).toContain('"Wide"');
    expect(control().props.accessibilityLabel).toBe('View: wide. Fits more of the room into the video.');
    expect(mockCameraProps.selectedLens).toBe('Back Ultra Wide Camera');
    await press(tree, 'clip-camera-view');
    expect(mockCameraProps.selectedLens).toBe('Back Camera');
  });

  test('the view is not remembered: the room decides it each time', async () => {
    Platform.OS = 'ios';
    mockLenses.mockResolvedValue(IPHONE);
    const tree = await mount();
    await advance(300);
    AsyncStorage.setItem.mockClear();
    await press(tree, 'clip-camera-view');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('a phone with no ultra wide lens shows no control and names no lens', async () => {
    Platform.OS = 'ios';
    mockLenses.mockResolvedValue(['Back Camera', 'Front Camera']);
    const tree = await mount();
    await advance(300);
    await flush();
    expect(hostById(tree, 'clip-camera-view')).toBeUndefined();
    expect(mockCameraProps.selectedLens).toBeUndefined();
  });

  test('Android: the lenses are never asked for and the control never shows', async () => {
    Platform.OS = 'android';
    mockLenses.mockResolvedValue(IPHONE);
    const tree = await mount();
    await advance(300);
    await flush();
    expect(mockLenses).not.toHaveBeenCalled();
    expect(hostById(tree, 'clip-camera-view')).toBeUndefined();
    expect(mockCameraProps.selectedLens).toBeUndefined();
  });

  test('the front camera has no View control, and flipping back brings it back', async () => {
    Platform.OS = 'ios';
    mockLenses.mockResolvedValue(IPHONE);
    const tree = await mount();
    await advance(300);
    await flush();
    await press(tree, 'clip-camera-flip');
    expect(hostById(tree, 'clip-camera-view')).toBeUndefined();
    expect(mockCameraProps.selectedLens).toBeUndefined();
    await press(tree, 'clip-camera-flip');
    await advance(300);
    await flush();
    expect(hostById(tree, 'clip-camera-view')).toBeDefined();
  });

  test('with the wide lens in use the torch is not pulsed (the camera can freeze with both), the sound still cues', async () => {
    Platform.OS = 'ios';
    mockLenses.mockResolvedValue(IPHONE);
    const tree = await mount();
    await advance(300);
    await flush();
    await press(tree, 'clip-camera-view');
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockCameraProps.enableTorch).toBe(false);
    expect(mockCueBeep).toHaveBeenLastCalledWith('three');
    await advance(3000);
    expect(mockCameraProps.enableTorch).toBe(false);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
  });

  test('View waits like the other controls: not while counting down or recording', async () => {
    Platform.OS = 'ios';
    mockLenses.mockResolvedValue(IPHONE);
    const tree = await mount();
    await advance(300);
    await flush();
    await press(tree, 'clip-camera-record');
    await flush();
    expect(hostById(tree, 'clip-camera-view').props.accessibilityState).toEqual({ disabled: true });
    await press(tree, 'clip-camera-view');
    expect(mockCameraProps.selectedLens).toBe('Back Camera');
  });

  test('a camera that cannot say its lenses is logged, never a crash, and shows no control', async () => {
    Platform.OS = 'ios';
    mockLenses.mockRejectedValue(new Error('no lenses'));
    const tree = await mount();
    await advance(300);
    await flush();
    expect(hostById(tree, 'clip-camera-view')).toBeUndefined();
    expect(require('../../lib/errorLog').logError).toHaveBeenCalledWith('ClipCamera.lenses', expect.any(Error));
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

  test('the line fills over the CHOSEN length: halfway through 60 s it is half full', async () => {
    await AsyncStorage.setItem('@volyume_clip_length', '60');
    const tree = await mount();
    await startTapRecording(tree);
    await advance(30000);
    const fill = hostById(tree, 'clip-camera-line-fill');
    const scale = styleOf(fill).transform[0].scaleX;
    expect(scale).toBeGreaterThan(0.45);
    expect(scale).toBeLessThan(0.55);
  });

  test('the line fills over the two minute cap for a hold, whatever the Length', async () => {
    await AsyncStorage.setItem('@volyume_clip_length', '60');
    const tree = await mount();
    await startHold(tree);
    await advance(60000);
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

  test('workout: back, with the toast that says where the video is (addendum 14) and an Undo that deletes it', async () => {
    await recordFiveSeconds({ source: 'workout' });
    expect(mockShow).toHaveBeenCalledTimes(1);
    const [message, options] = mockShow.mock.calls[0];
    expect(message).toBe(CLIP_STRINGS.saved);
    expect(message).toBe('Saved for 7 days with this workout. Find it under the three dots on this exercise, in Your videos, where tapping Keep keeps it until you delete it. You can change the 7 days in Settings, under Your data.');
    expect(options.variant).toBe('undo');
    expect(options.action.label).toBe('Undo');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockDeleteClip).not.toHaveBeenCalled();
    await act(async () => { options.action.onPress(); });
    expect(mockDeleteClip).toHaveBeenCalledWith('clip-1');
  });

  test('the saved toast says the keep window in the person\'s own setting (addendum 15)', async () => {
    await AsyncStorage.setItem('@volyume_clip_keep_days', '30');
    await recordFiveSeconds({ source: 'workout' });
    expect(mockShow.mock.calls[0][0]).toBe('Saved for 30 days with this workout. Find it under the three dots on this exercise, in Your videos, where tapping Keep keeps it until you delete it. You can change the 30 days in Settings, under Your data.');
    await AsyncStorage.setItem('@volyume_clip_keep_days', '0');
    await recordFiveSeconds({ source: 'workout' });
    expect(mockShow.mock.calls[1][0]).toBe('Saved with this workout until you delete it. Find it under the three dots on this exercise, in Your videos.');
  });

  test('workout: "Watch" beside Undo returns to the logger naming the video, which opens its videos sheet playing it (addendum 13, F)', async () => {
    await recordFiveSeconds({ source: 'workout' });
    const [, options] = mockShow.mock.calls[0];
    expect(options.secondaryAction.label).toBe('Watch');
    await act(async () => { options.secondaryAction.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith({ name: 'ActiveWorkout', params: { watchClipId: 'clip-1' }, merge: true });
    // Watch is a way onwards, never an undo: the video stays.
    expect(mockDeleteClip).not.toHaveBeenCalled();
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
    expect(mockShow).toHaveBeenLastCalledWith("That video could not be deleted. You can try again.", { variant: 'error' });
  });

  test('a save that fails drops the file, says so calmly and stays on the camera', async () => {
    mockSaveClip.mockResolvedValueOnce({ ok: false, reason: 'move_failed' });
    const tree = await recordFiveSeconds({ source: 'workout' });
    expect(mockShow).toHaveBeenCalledWith("That video could not be saved. You can try again.", { variant: 'error' });
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
    expect(sheet.props.notice).toBe('This workout already has 3 videos, the most it can hold. Delete one if you want to record another.');
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
    expect(PROGRESS).toMatch(/const LINE_HEIGHT = 2;/);
    expect(PROGRESS).toMatch(/lineFill: \{[^}]*height: LINE_HEIGHT,[^}]*backgroundColor: CAM\.primaryFill/s);
    expect(PROGRESS).toMatch(/lineTrack: \{[^}]*height: LINE_HEIGHT,/s);
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

// D229 addendum 15: a phone that is nearly full is told so before anything
// is recorded, instead of a failed save after the set.
describe('free space (addendum 15)', () => {
  afterEach(() => { FileSystem.getFreeDiskStorageAsync.mockReset(); FileSystem.getFreeDiskStorageAsync.mockResolvedValue(undefined); });

  test('under 500 MB free: a calm warning and no countdown, for a tap and for a hold', async () => {
    FileSystem.getFreeDiskStorageAsync.mockResolvedValue(200 * 1024 * 1024);
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    await advance(5000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith('There is not enough space on this phone to record a video. Free up some space and try again.', { variant: 'warning' });
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
    mockShow.mockClear();
    const node = await startHold(tree);
    await release(node);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  test('with room to spare it records; a phone that cannot say its free space is allowed to try', async () => {
    FileSystem.getFreeDiskStorageAsync.mockResolvedValue(4 * 1024 * 1024 * 1024);
    let tree = await mount();
    await startTapRecording(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    await act(async () => { tree.unmount(); });
    mockRecordAsync.mockClear();
    FileSystem.getFreeDiskStorageAsync.mockRejectedValue(new Error('unsupported'));
    tree = await mount();
    await startTapRecording(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(mockShow).not.toHaveBeenCalled();
  });
});

describe('share-only mode: the video goes back to the share screen and is never saved', () => {
  const SHARE_ONLY = { mode: 'share', workoutId: undefined, exerciseId: undefined, exerciseName: undefined, setNumber: undefined, source: undefined };
  async function recordFiveSecondsShareOnly(extra = {}) {
    const tree = await mount({ ...SHARE_ONLY, ...extra });
    await startTapRecording(tree);
    await advance(5000);
    await press(tree, 'clip-camera-record');
    await flush();
    return tree;
  }

  test('with no workout it opens, muted, instead of closing', async () => {
    await mount(SHARE_ONLY);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(mockCameraProps).not.toBeNull();
    expect(mockCameraProps.mute).toBe(true);
    expect(mockCameraProps.mode).toBe('video');
  });

  test('a recording goes straight back to the share screen as sharedVideo: no save, no count, no toast, the file kept', async () => {
    await recordFiveSecondsShareOnly();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    const arg = navigation.navigate.mock.calls[0][0];
    expect(arg).toEqual({
      name: 'ShareCard',
      params: { sharedVideo: { uri: 'file:///cache/Camera/take.mp4', durationMs: expect.any(Number), width: null, height: null } },
      merge: true,
    });
    expect(arg.params.sharedVideo.durationMs).toBeGreaterThanOrEqual(1000);
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
    expect(mockDeleteClip).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith('file:///cache/Camera/take.mp4', expect.anything());
  });

  test('with returnTo, it goes back to that very share screen by its route key', async () => {
    await recordFiveSecondsShareOnly({ returnTo: 'ShareCard-abc' });
    expect(navigation.navigate).toHaveBeenCalledWith({
      key: 'ShareCard-abc',
      params: { sharedVideo: expect.objectContaining({ uri: 'file:///cache/Camera/take.mp4' }) },
      merge: true,
    });
  });

  test('no workout means no three-video limit: it records even when a count would say full', async () => {
    mockCount.mockResolvedValue(3);
    const tree = await recordFiveSecondsShareOnly();
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    expect(tree.root.findAll((n) => n.type === 'ClipsSheetStub' && n.props.visible)).toHaveLength(0);
    expect(navigation.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'ShareCard' }));
  });

  test('a hold records too, and its release hands the video back', async () => {
    const tree = await mount(SHARE_ONLY);
    const node = await startHold(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    await advance(4000);
    await release(node);
    await flush();
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'ShareCard', merge: true }));
  });

  test('closing mid-recording discards the file and hands nothing back', async () => {
    const tree = await mount(SHARE_ONLY);
    await startTapRecording(tree);
    await advance(3000);
    await press(tree, 'clip-camera-close');
    await flush();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
  });

  test('a stray tap under a second is dropped and the camera stays ready', async () => {
    const tree = await mount(SHARE_ONLY);
    await startTapRecording(tree);
    await advance(300);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
    expect(hostById(tree, 'clip-camera-record').props.accessibilityLabel).toBe('Start recording in 3 seconds');
  });

  test('the workout mode is untouched: no mode and no workout still closes without a word; with a workout it saves', async () => {
    await mount({ workoutId: undefined });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockShow).not.toHaveBeenCalled();
    navigation.goBack.mockClear();
    const tree = await mount({ source: 'share', exerciseId: null, exerciseName: null, setNumber: null });
    await startTapRecording(tree);
    await advance(5000);
    await press(tree, 'clip-camera-record');
    await flush();
    expect(mockSaveClip).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith({ name: 'ShareCard', params: { clipId: 'clip-1' }, merge: true });
  });

  test('source: the share-only path never reaches the clip store and never shows the saved toast', () => {
    const start = SOURCE.indexOf('const handBackToShare');
    const end = SOURCE.indexOf('const finishRecording');
    expect(start).toBeGreaterThan(-1);
    const block = SOURCE.slice(start, end);
    expect(block).not.toMatch(/saveClip|deleteClip|countClipsForWorkout|savedLine|toast\.show/);
    expect(SOURCE).toMatch(/if \(shareOnly\) \{\s*handBackToShare\(uri, durationMs\);\s*return;\s*\}\s*let result;/);
  });
});


// Audit 2026-10-17 (E3, E9): the camera and the app closing, and a share
// screen that is gone. Written to FAIL against the screen before.
describe('the app closing during the countdown or a recording (E3)', () => {
  const appStateHandler = () => {
    const calls = AppState.addEventListener.mock.calls.filter((c) => c[0] === 'change');
    return calls[calls.length - 1][1];
  };
  const send = async (state) => { await act(async () => { appStateHandler()(state); }); await flush(); };

  test('going to the background during the countdown clears it, readies the camera, records nothing; coming back says one calm line', async () => {
    const tree = await mount();
    await press(tree, 'clip-camera-record');
    await flush();
    await advance(1000);
    await send('background');
    await advance(10000);
    expect(mockRecordAsync).not.toHaveBeenCalled();
    expect(hostById(tree, 'clip-camera-record')).toBeDefined();
    expect(mockShow).not.toHaveBeenCalled();
    await send('active');
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith('Recording stopped because Volyume was closed.', { variant: 'info' });
    await send('active');
    expect(mockShow).toHaveBeenCalledTimes(1);
    // It can be started again.
    await startTapRecording(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
  });

  test('going to the background mid-recording stops it and throws the file away: nothing saved, ready again, one line on return', async () => {
    const tree = await mount();
    await startTapRecording(tree);
    await advance(4000);
    expect(mockRecordAsync).toHaveBeenCalledTimes(1);
    await send('background');
    expect(mockStopRecording).toHaveBeenCalled();
    await flush();
    expect(mockSaveClip).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
    expect(navigation.goBack).not.toHaveBeenCalled();
    await send('active');
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(CLIP_STRINGS.stoppedByClosing, { variant: 'info' });
    expect(CLIP_STRINGS.stoppedByClosing).toBe('Recording stopped because Volyume was closed.');
    // Ready for another take.
    await startTapRecording(tree);
    expect(mockRecordAsync).toHaveBeenCalledTimes(2);
  });

  test('the background with nothing to stop says nothing on return', async () => {
    await mount();
    await send('background');
    await send('active');
    expect(mockShow).not.toHaveBeenCalled();
  });
});

describe('a share screen that is gone (E9)', () => {
  const SHARE_ONLY = { mode: 'share', workoutId: undefined, exerciseId: undefined, exerciseName: undefined, setNumber: undefined, source: undefined };
  async function recordShareOnly(extra) {
    const tree = await mount({ ...SHARE_ONLY, ...extra });
    await startTapRecording(tree);
    await advance(5000);
    await press(tree, 'clip-camera-record');
    await flush();
    return tree;
  }

  test('returnTo missing from the navigation state: the camera goes back and the recording is dropped', async () => {
    navigation.getState = jest.fn(() => ({ routes: [{ key: 'Home-1' }, { key: 'ClipCamera-1' }] }));
    await recordShareOnly({ returnTo: 'ShareCard-gone' });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/Camera/take.mp4', { idempotent: true });
  });

  test('returnTo present in the navigation state: handed back by key as before', async () => {
    navigation.getState = jest.fn(() => ({ routes: [{ key: 'ShareCard-abc' }, { key: 'ClipCamera-1' }] }));
    await recordShareOnly({ returnTo: 'ShareCard-abc' });
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

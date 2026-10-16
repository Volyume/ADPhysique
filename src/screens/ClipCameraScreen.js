/**
 * ClipCameraScreen - the one new screen video shares add (D229 addendum 5; the
 * design page's camera frames, as amended by the founder on 2026-10-15: the
 * camera must work hands-free for a set, the phone propped up while the person
 * walks to the bar).
 *
 * Full screen, portrait, SILENT. A close glyph top-left, a flip glyph
 * top-right, one record control centred low, a small "Countdown" control on
 * one side of it and a small "Length" control on the other, and one short line
 * under the button, always shown: "Tap to start with a countdown. Hold to
 * record while you hold."
 *
 * TWO WAYS TO RECORD (both visible, neither hidden behind a gesture):
 *   TAP the record control: a countdown (3, 5 or 10 seconds, the "Countdown"
 *     control, remembered in `@volyume_clip_leadin`, default 3) with the
 *     numerals large in the centre and one light tick each, then it records for
 *     the chosen length (5, 10 or 15 seconds, the "Length" control, remembered
 *     in `@volyume_clip_length`, default 15) and STOPS BY ITSELF. A tap during
 *     the recording stops it early.
 *   PRESS AND HOLD the record control: it records while held, with no
 *     countdown, and stops on release, capped at 15 seconds.
 * While recording, a 2 dp amber line along the very top edge fills over the
 * chosen length (always 15 for a hold), the rest timer's drain line (same
 * `primaryFill`, same 2 dp), with the running time under it
 * (RecordingProgress). A recording under 1 s is discarded silently; closing
 * during a recording discards it with no confirmation (it is 15 seconds of
 * footage). No review screen: a rest timer may be running, so the camera
 * closes and a toast says "Video saved to this workout" with Undo.
 *
 * Route params: { workoutId, exerciseId?, exerciseName?, setNumber?, source }
 *   source 'workout'  from the exercise More sheet; `setNumber` is the set the
 *                     video is recorded for (the exercise's next pending set)
 *   source 'summary'  from the workout summary row
 *   source 'share'    from the share screen's video source (the lead's work)
 *
 * WHAT HAPPENS AFTER A SAVE (all through the clip store; a fourth is refused,
 * never replaced):
 *   'workout'  go back, toast "Video saved to this workout" with Undo.
 *   'summary'  no toast here: go back to WorkoutSummary with the new clip's id
 *              merged into ITS route params as `clipId`. The summary opens the
 *              share screen with `{ ...its usual share params, clipId }`: it
 *              owns the session data the share screen needs (sessionData,
 *              prData, prList), which this screen does not have. The video is
 *              then on screen, so a toast (and an Undo under it) would be
 *              noise; when the summary has no Share to open it shows the
 *              saved toast itself.
 *   'share'    go back to ShareCard with `clipId` merged into ITS route params,
 *              so the share screen already holds its card data and only needs
 *              to choose that clip as the background. No toast: it is on screen.
 *   `clipId` is a clip id from src/lib/clips/store.js (getClip(userId, clipId)).
 *   The share screen's handling of it is the lead's work. The toast's Undo can
 *   delete the clip after the share screen has opened with it, so the share
 *   screen must treat a clipId that no longer resolves as "no clip".
 *
 * Camera access: asked for on open. A refusal is one calm warning toast
 * ("Camera access is needed to record a video") and the screen closes; there
 * is never a link to settings and never a second prompt. No microphone is asked
 * for (the view is `mute`, and expo-camera does not request audio when muted).
 *
 * The chrome is white on the black viewfinder in EVERY theme (cameraInk.js).
 * Type and sizes follow the live theme (Larger text). Haptics only through
 * src/lib/haptics.js: clipCountdown() per lead-in number, commit() on start,
 * selection() on stop.
 *
 * Not proven here (device checklist): that releasing a held press right after
 * it began stops CameraX cleanly (the stop is asked for again twice, a moment
 * later, in case the first arrived before the recorder was running).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, BackHandler, Platform } from 'react-native';
import Text from '../components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as FileSystem from 'expo-file-system/legacy';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { useToast } from '../components/Toast';
import ClipsSheet from '../components/clips/ClipsSheet';
import RecordingProgress from '../components/clips/RecordingProgress';
import CameraGuides from '../components/clips/CameraGuides';
import { CAM } from '../components/clips/cameraInk';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import { spacing, radius, circle, iconSize, withAlpha, alpha, fontScaleCaps } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import { saveClip, deleteClip, countClipsForWorkout } from '../lib/clips/store';
import {
  CLIP_STRINGS, LEAD_IN_KEY, LENGTH_KEY, GUIDES_KEY, DEFAULT_LEAD_IN_SECONDS, DEFAULT_LENGTH_SECONDS,
  MAX_CLIP_MS, MIN_CLIP_MS, isFull, nextLeadIn, nextLength, parseLeadIn,
  parseLength, parseGuides, leadInLabel, leadInA11yLabel, lengthLabel, lengthA11yLabel, startA11yLabel,
  guidesLabel, guidesA11yLabel,
  CUES_KEY, DEFAULT_CUES, nextCues, parseCues, cuesLabel, cuesA11yLabel, cuesHaveSound, cuesHaveLight,
  MIN_FREE_BYTES,
} from '../lib/clips/rules';
import { cameraTipFor } from '../lib/clips/cameraTips';
import { cueFor, pickLenses, PULSE_MS, END_PULSE_GAP_MS } from '../lib/clips/cues';
import { playCueBeep } from '../lib/restSound';

// expo-camera is a native module (config plugin). Lazy-require at module load
// like ProgressGhostCapture, so a stale or rebuild-pending binary takes the
// calm refusal path instead of a red screen.
let ExpoCamera = null;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  ExpoCamera = require('expo-camera');
} catch (_) {
  ExpoCamera = null;
}
const CameraView = ExpoCamera?.CameraView || null;
function useNoCameraPermissions() {
  // Matches the [permission, requestPermission] shape; "no module" reads as an
  // unavailable camera, which takes the refusal path.
  return [null, async () => null];
}
const useCameraPermissions = ExpoCamera?.useCameraPermissions || useNoCameraPermissions;

// expo-keep-awake tags are a set, not ref-counted. This screen's own tag can
// never release a hold the active workout screen owns.
const KEEP_AWAKE_TAG = 'volyume-clip-camera';

const COUNTDOWN_TICK_MS = 1000;
// Addendum 13: 1080p at about 6 million bits a second, so a 90 second video
// is about 68 MB and two minutes about 90 MB (the research's section 2.3);
// iOS honours it because recordAsync passes a codec.
const VIDEO_BITRATE = 6000000;
// The end cue is two beats; the screen waits this long before it leaves, so
// the second beat is heard and seen.
const END_CUE_TOTAL_MS = END_PULSE_GAP_MS + PULSE_MS + 100;
// A press this long on the record control is a hold (record while held). A
// shorter press is a tap (countdown). Long enough that a slow tap is a tap.
const HOLD_DELAY_MS = 400;
// Once a stop is wanted it is asked for again this often, for as long as the
// recording is still running: a stop that reaches CameraX before it has
// begun is ignored, and the recorder gives no "started" signal, so the ask
// is repeated until recordAsync resolves (never a fixed number of retries).
const STOP_ASK_EVERY_MS = 300;

// One of the two small controls beside the record button: a plain word above
// its value, so nobody has to guess what a bare "3 s" or "15 s" changes.
function ValueControl({
  caption, value, onPress, disabled, accessibilityLabel, testID, captionStyle, valueStyle,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.valueControl, disabled && styles.dimmed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to change"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
    >
      <Text style={captionStyle} maxFontSizeMultiplier={fontScaleCaps.chrome}>{caption}</Text>
      <Text style={valueStyle} maxFontSizeMultiplier={fontScaleCaps.chrome}>{value}</Text>
    </Pressable>
  );
}

export default function ClipCameraScreen({ navigation, route }) {
  const {
    workoutId, exerciseId = null, exerciseName = null, setNumber = null, source = 'workout',
    // Addendum 12: the exercise's movement pattern and equipment, when the
    // opener knows them, so the setup line can be the exercise's own camera
    // tip (the name alone picks most of them; these settle the rest).
    exercisePattern = null, exerciseEquipment = null,
  } = route?.params || {};
  // The camera's setup line for THIS exercise: pure, from the name, pattern
  // and equipment (cameraTips.js). Without an exercise it is the general line.
  const setupLine = useMemo(
    () => cameraTipFor({ name: exerciseName, movementPattern: exercisePattern, equipment: exerciseEquipment }),
    [exerciseName, exercisePattern, exerciseEquipment],
  );
  const userId = useAppStore((s) => s.user?.id);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState('back');
  const [leadIn, setLeadIn] = useState(DEFAULT_LEAD_IN_SECONDS);
  const [lengthSec, setLengthSec] = useState(DEFAULT_LENGTH_SECONDS);
  // Setting up first (addendum 10): the guide lines over the live view,
  // on until turned off, remembered on the phone.
  const [guides, setGuides] = useState(true);
  // Addendum 13 (A): the countdown cues (sound, light, both, off), remembered
  // on the phone; the torch (back camera) and the screen pulse (front camera)
  // that carry the light cue.
  const [cues, setCues] = useState(DEFAULT_CUES);
  const [torchOn, setTorchOn] = useState(false);
  const [screenPulse, setScreenPulse] = useState(false);
  // Addendum 13 (E): the lenses the phone reports (iOS only) and the view.
  const [lenses, setLenses] = useState({ normal: null, wide: null });
  const [wideView, setWideView] = useState(false);
  // ready | starting | countdown | recording | saving
  const [phase, setPhaseState] = useState('ready');
  const [countdownN, setCountdownN] = useState(0);
  const [recording, setRecording] = useState({ startedAtMs: 0, limitMs: MAX_CLIP_MS });
  // 'tap' or 'hold', for the hint while recording.
  const [recordMode, setRecordMode] = useState('tap');
  const [clipsOpen, setClipsOpen] = useState(false);

  const cameraRef = useRef(null);
  // The camera that is mid-recording, kept apart from the view's own ref:
  // React detaches the view ref before an unmount cleanup runs, and a recording
  // left running must still be told to stop.
  const recordingCameraRef = useRef(null);
  const aliveRef = useRef(true);
  const phaseRef = useRef('ready');
  const leadInRef = useRef(DEFAULT_LEAD_IN_SECONDS);
  const lengthRef = useRef(DEFAULT_LENGTH_SECONDS);
  const modeRef = useRef('tap');
  const limitMsRef = useRef(MAX_CLIP_MS);
  const holdActiveRef = useRef(false);
  const cuesRef = useRef(DEFAULT_CUES);
  const facingRef = useRef('back');
  const wideViewRef = useRef(false);
  // The light pulses of the countdown (cleared with the other timers) and of
  // the end cue (cleared only on unmount: they outlive the recording).
  const pulseTimers = useRef([]);
  const endCueTimers = useRef([]);
  const endCueUntilRef = useRef(0);
  // The wait for the end cue's second beat before the screen leaves; cleared
  // on unmount so it never navigates a screen that is already gone.
  const leaveTimer = useRef(null);
  const askedRef = useRef(false);
  const closedRef = useRef(false);
  const discardRef = useRef(false);
  const stopFeltRef = useRef(false);
  // Set by the screen's own length timer, so a recording that ran to its
  // length is told apart from one stopped by hand (both go through
  // stopRecording; only the first gets the end cue).
  const limitStopRef = useRef(false);
  const startedAtRef = useRef(0);
  const countdownTimer = useRef(null);
  const autoStopTimer = useRef(null);
  const stopAskTimer = useRef(null);

  const setPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const clearTimers = useCallback(() => {
    pulseTimers.current.forEach(clearTimeout);
    pulseTimers.current = [];
    // The light goes off with the countdown's pulses, unless the end cue is
    // mid-flight (it runs past the recording's finish and puts its own
    // pulses out).
    if (Date.now() >= endCueUntilRef.current) {
      setTorchOn(false);
      setScreenPulse(false);
    }
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }
    if (stopAskTimer.current) { clearInterval(stopAskTimer.current); stopAskTimer.current = null; }
  }, []);

  const dropCacheFile = useCallback((uri) => {
    if (!uri) return;
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {
      // Best-effort: the OS clears the camera cache on its own.
    });
  }, []);

  // ── Lifetime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    aliveRef.current = true;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
      // Best-effort: the screen may sleep on a phone that refuses the hold.
    });
    return () => {
      aliveRef.current = false;
      holdActiveRef.current = false;
      clearTimers();
      endCueTimers.current.forEach(clearTimeout);
      endCueTimers.current = [];
      if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
      // Leaving mid-recording discards it: the recorder resolves later and the
      // discard flag sends its file to the bin.
      if (phaseRef.current === 'recording') {
        discardRef.current = true;
        try { recordingCameraRef.current?.stopRecording?.(); } catch (e) { logError('ClipCamera.unmountStop', e); }
      }
      Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {
        // Best-effort release.
      });
    };
  }, [clearTimers]);

  // The remembered countdown and length.
  useEffect(() => {
    AsyncStorage.getItem(LEAD_IN_KEY).then((raw) => {
      if (!aliveRef.current || raw == null) return;
      const n = parseLeadIn(raw);
      leadInRef.current = n;
      setLeadIn(n);
    }).catch((e) => { logError('ClipCamera.leadInRead', e); });
    AsyncStorage.getItem(LENGTH_KEY).then((raw) => {
      if (!aliveRef.current || raw == null) return;
      const n = parseLength(raw);
      lengthRef.current = n;
      setLengthSec(n);
    }).catch((e) => { logError('ClipCamera.lengthRead', e); });
    AsyncStorage.getItem(GUIDES_KEY).then((raw) => {
      if (!aliveRef.current || raw == null) return;
      setGuides(parseGuides(raw));
    }).catch((e) => { logError('ClipCamera.guidesRead', e); });
    AsyncStorage.getItem(CUES_KEY).then((raw) => {
      if (!aliveRef.current || raw == null) return;
      const m = parseCues(raw);
      cuesRef.current = m;
      setCues(m);
    }).catch((e) => { logError('ClipCamera.cuesRead', e); });
  }, []);

  // Addendum 13 (E): which lenses this phone has, asked of the camera once it
  // is up (iOS only: Android reports none and cannot reach an ultra-wide).
  // Asked twice, at once and a moment later, because the view's ref lands
  // just after the first render that shows it.
  useEffect(() => {
    if (!ready || Platform.OS !== 'ios' || facing !== 'back') return undefined;
    let cancelled = false;
    const ask = async () => {
      try {
        const names = await cameraRef.current?.getAvailableLensesAsync?.();
        if (!cancelled && aliveRef.current && Array.isArray(names)) setLenses(pickLenses(names));
      } catch (e) {
        logError('ClipCamera.lenses', e);
      }
    };
    ask();
    const later = setTimeout(ask, 300);
    return () => { cancelled = true; clearTimeout(later); };
  }, [ready, facing]);

  // The phone's back button while a finished recording is being saved: the
  // save takes well under a second, and leaving then would throw the video
  // away without a word (the close glyph already waits for it).
  useEffect(() => {
    const sub = BackHandler?.addEventListener?.('hardwareBackPress', () => phaseRef.current === 'saving');
    return () => { sub?.remove?.(); };
  }, []);

  // ── Leaving, and camera access ─────────────────────────────────────────────
  const closeOnce = useCallback((message) => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (message) toast.show(message, { variant: 'warning' });
    navigation.goBack();
  }, [toast, navigation]);

  useEffect(() => {
    // Nothing to record against: close without a word.
    if (!workoutId || !userId) { closeOnce(null); return; }
    if (!CameraView) { closeOnce(CLIP_STRINGS.permissionDenied); return; }
    if (!permission) return; // still reading the current answer
    if (permission.granted) { setReady(true); return; }
    if (askedRef.current) return;
    askedRef.current = true;
    (async () => {
      let result = null;
      try {
        result = await requestPermission();
      } catch (e) {
        logError('ClipCamera.permission', e);
      }
      if (!aliveRef.current) return;
      if (result?.granted) setReady(true); else closeOnce(CLIP_STRINGS.permissionDenied);
    })();
  }, [permission, requestPermission, workoutId, userId, closeOnce]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const showFull = useCallback(() => {
    setPhase('ready');
    setClipsOpen(true);
  }, [setPhase]);

  const afterSave = useCallback((clip) => {
    // The end cue's second beat is still to come: leave after it.
    const leaveAfter = Math.max(0, endCueUntilRef.current - Date.now());
    const leave = (go) => {
      if (leaveAfter <= 0) { go(); return; }
      leaveTimer.current = setTimeout(() => {
        leaveTimer.current = null;
        if (aliveRef.current) go();
      }, leaveAfter);
    };
    const undo = {
      label: CLIP_STRINGS.undo,
      onPress: () => {
        deleteClip(clip.id).catch((e) => {
          logError('ClipCamera.undo', e, { clipId: clip.id });
          toast.show(CLIP_STRINGS.undoFailed, { variant: 'error' });
        });
      },
    };
    if (source === 'share') {
      // Back to the share screen it came from, which keeps its own card data;
      // only the video to use is handed over.
      leave(() => navigation.navigate({ name: 'ShareCard', params: { clipId: clip.id }, merge: true }));
      return;
    }
    if (source === 'summary') {
      // The summary builds the share screen's params and opens it with clipId
      // (and says "saved" itself when it has no Share to open).
      leave(() => navigation.navigate({ name: 'WorkoutSummary', params: { clipId: clip.id }, merge: true }));
      return;
    }
    // The house saved-with-Undo toast ("Quick add saved." uses the same
    // variant): 8 seconds, held open for a screen reader until Undo is heard.
    // Addendum 13 (F): "Watch" beside Undo returns to the logger with the
    // video named, and the logger opens its videos sheet with it playing
    // (the camera is gone by then; the merged param carries the ask).
    const watch = {
      label: CLIP_STRINGS.watch,
      onPress: () => {
        navigation.navigate({ name: 'ActiveWorkout', params: { watchClipId: clip.id }, merge: true });
      },
    };
    toast.show(CLIP_STRINGS.saved, { variant: 'undo', action: undo, secondaryAction: watch });
    leave(() => navigation.goBack());
  }, [navigation, source, toast]);

  const finishRecording = useCallback(async (uri, measuredMs) => {
    clearTimers();
    if (discardRef.current || !aliveRef.current) {
      dropCacheFile(uri);
      return;
    }
    if (!stopFeltRef.current) haptics.selection();
    const durationMs = Math.min(limitMsRef.current, Math.max(0, measuredMs));
    if (!uri || durationMs < MIN_CLIP_MS) {
      // A stray tap: gone without a word, ready to try again.
      dropCacheFile(uri);
      setPhase('ready');
      return;
    }
    setPhase('saving');
    let result;
    try {
      result = await saveClip({
        userId,
        workoutId,
        exerciseId,
        exerciseName,
        setNumber,
        cacheUri: uri,
        durationMs,
        // expo-camera resolves only a uri. The real size is read by the export
        // engine's probe, so none is claimed here.
        width: null,
        height: null,
        // Kept as recorded: a share-screen video can be made mid-workout, so
        // it is not "after the workout" (the sheet names it "Workout").
        source,
      });
    } catch (e) {
      logError('ClipCamera.save', e, { workoutId });
      result = { ok: false, reason: 'write_failed' };
    }
    if (!aliveRef.current) {
      // Left while saving: honour the discard.
      if (result.ok) deleteClip(result.clip.id).catch((e) => { logError('ClipCamera.lateDiscard', e); });
      else dropCacheFile(uri);
      return;
    }
    if (result.ok) {
      afterSave(result.clip);
      return;
    }
    dropCacheFile(uri);
    if (result.reason === 'full') {
      showFull();
      return;
    }
    setPhase('ready');
    toast.show(CLIP_STRINGS.saveFailed, { variant: 'error' });
  }, [
    clearTimers, dropCacheFile, setPhase, userId, workoutId, exerciseId, exerciseName,
    setNumber, source, afterSave, showFull, toast,
  ]);

  // ── Cues (addendum 13) ─────────────────────────────────────────────────────
  // One light pulse: the torch with the back camera, a brief white screen
  // pulse with the front (phones have no front torch), never while the wide
  // lens is in use (an iPhone forum report of the camera freezing with the
  // torch and the ultra-wide lens together; the sound still cues). Timers
  // are kept so a cancel or an unmount leaves nothing lit.
  const pulseLight = useCallback((timers) => {
    if (!aliveRef.current) return;
    const back = facingRef.current === 'back';
    if (back && wideViewRef.current) return;
    const set = back ? setTorchOn : setScreenPulse;
    set(true);
    timers.current.push(setTimeout(() => { set(false); }, PULSE_MS));
  }, []);

  // The countdown's cue at a given second (cues.js decides what, this plays
  // it): the rest timer's own pips, and the light on its beats.
  const fireCue = useCallback((secondsLeft) => {
    const mode = cuesRef.current;
    const cue = cueFor(secondsLeft, leadInRef.current);
    if (cue.sound && cuesHaveSound(mode)) playCueBeep(cue.sound);
    if (cue.light && cuesHaveLight(mode)) pulseLight(pulseTimers);
  }, [pulseLight]);

  // After a recording that ran to its length (never after a stop by hand:
  // the person is at the phone then): two soft descending pips 300 ms apart
  // and ONE light pulse on the first, once the recorder has finished the
  // file so nothing is in the video. One pulse, not two: the light never
  // flashes more than once a second (cues.js; fresh-eyes review 2026-10-16).
  // The screen waits for the second beat before it leaves.
  const endCue = useCallback(() => {
    const mode = cuesRef.current;
    if (!cuesHaveSound(mode) && !cuesHaveLight(mode)) return;
    endCueUntilRef.current = Date.now() + END_CUE_TOTAL_MS;
    if (cuesHaveSound(mode)) playCueBeep('two');
    if (cuesHaveLight(mode)) pulseLight(endCueTimers);
    if (cuesHaveSound(mode)) {
      endCueTimers.current.push(setTimeout(() => { if (aliveRef.current) playCueBeep('three'); }, END_PULSE_GAP_MS));
    }
  }, [pulseLight]);

  // Ask the recorder to stop, and keep asking every STOP_ASK_EVERY_MS until
  // recordAsync resolves (finishRecording clears the timers): a stop that
  // arrives before CameraX has begun is ignored, and a hold let go in that
  // window must still end the recording, never run on to the cap.
  const stopRecording = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    stopFeltRef.current = true;
    haptics.selection();
    const ask = () => {
      try {
        recordingCameraRef.current?.stopRecording?.();
      } catch (e) {
        logError('ClipCamera.stop', e);
      }
    };
    ask();
    if (stopAskTimer.current) clearInterval(stopAskTimer.current);
    stopAskTimer.current = setInterval(() => {
      if (phaseRef.current === 'recording') ask();
      else if (stopAskTimer.current) { clearInterval(stopAskTimer.current); stopAskTimer.current = null; }
    }, STOP_ASK_EVERY_MS);
  }, []);

  const startRecording = useCallback(async (mode) => {
    const camera = cameraRef.current;
    if (!camera?.recordAsync) {
      setPhase('ready');
      return;
    }
    // A tap records for the chosen length; a hold for as long as it is held,
    // up to the two minute cap.
    const limitMs = mode === 'hold' ? MAX_CLIP_MS : lengthRef.current * 1000;
    discardRef.current = false;
    stopFeltRef.current = false;
    limitStopRef.current = false;
    modeRef.current = mode;
    setRecordMode(mode);
    limitMsRef.current = limitMs;
    recordingCameraRef.current = camera;
    startedAtRef.current = Date.now();
    setRecording({ startedAtMs: startedAtRef.current, limitMs });
    setPhase('recording');
    haptics.commit();
    // The recorder's own maxDuration ends the video too; this is the screen's
    // own hand on the same limit, so the length holds even if that is late.
    // It marks the stop as the length's own, unless a hand got there first
    // (a stop asked for just before the limit is still a stop by hand).
    autoStopTimer.current = setTimeout(() => {
      if (!stopFeltRef.current) limitStopRef.current = true;
      stopRecording();
    }, limitMs);
    let result = null;
    try {
      result = await camera.recordAsync({ maxDuration: limitMs / 1000, codec: 'avc1' });
    } catch (e) {
      logError('ClipCamera.record', e, { workoutId });
    }
    recordingCameraRef.current = null;
    // Addendum 13 (C): a tap recording that reached its length on its own,
    // whether the recorder or the screen's timer ended it. Never after a
    // stop by hand, and never for a hold (a finger is on the button, so the
    // person is at the phone).
    const reachedLength = mode === 'tap' && (!stopFeltRef.current || limitStopRef.current);
    if (reachedLength && !discardRef.current && aliveRef.current && result?.uri) endCue();
    await finishRecording(result?.uri ?? null, Date.now() - startedAtRef.current);
  }, [setPhase, stopRecording, finishRecording, workoutId, endCue]);

  const beginCountdown = useCallback(() => {
    let n = leadInRef.current;
    setPhase('countdown');
    setCountdownN(n);
    haptics.clipCountdown();
    fireCue(n);
    countdownTimer.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        // The start: the longer tone, and no light before the first frame.
        fireCue(0);
        startRecording('tap');
        return;
      }
      setCountdownN(n);
      haptics.clipCountdown();
      fireCue(n);
    }, COUNTDOWN_TICK_MS);
  }, [setPhase, startRecording, fireCue]);

  // Is there room for another video? Read fresh: the number on screen may be old.
  const hasRoom = useCallback(async () => {
    let held = 0;
    try {
      held = await countClipsForWorkout(userId, workoutId);
    } catch (e) {
      logError('ClipCamera.count', e, { workoutId });
    }
    return !isFull(held);
  }, [userId, workoutId]);

  // Addendum 15: a phone that is nearly full is told so before anything is
  // recorded, instead of a failed save after the set. A phone that cannot
  // say its free space (an old build, a refused read) is allowed to try.
  const hasSpace = useCallback(async () => {
    try {
      const free = await FileSystem.getFreeDiskStorageAsync?.();
      if (typeof free === 'number' && Number.isFinite(free) && free < MIN_FREE_BYTES) {
        toast.show(CLIP_STRINGS.noSpace, { variant: 'warning' });
        return false;
      }
    } catch (e) {
      logError('ClipCamera.freeSpace', e);
    }
    return true;
  }, [toast]);

  // A TAP: while idle, the countdown; while recording, stop early.
  const handleRecordTap = useCallback(async () => {
    if (phaseRef.current === 'recording') { stopRecording(); return; }
    if (phaseRef.current !== 'ready' || !ready) return;
    // Held back at once so a double tap cannot start two countdowns.
    setPhase('starting');
    const room = await hasRoom();
    if (!aliveRef.current || phaseRef.current !== 'starting') return;
    if (!room) { showFull(); return; }
    if (!(await hasSpace())) { setPhase('ready'); return; }
    if (!aliveRef.current || phaseRef.current !== 'starting') return;
    beginCountdown();
  }, [ready, setPhase, stopRecording, hasRoom, hasSpace, showFull, beginCountdown]);

  // A HOLD: records at once, no countdown, for as long as the press lasts.
  // A long press DURING a tap recording stops it (the tap's release is not
  // reported once the press has become a long press).
  const handleHoldStart = useCallback(async () => {
    if (phaseRef.current === 'recording') { stopRecording(); return; }
    if (phaseRef.current !== 'ready' || !ready) return;
    holdActiveRef.current = true;
    setPhase('starting');
    const room = await hasRoom();
    if (!aliveRef.current || phaseRef.current !== 'starting') return;
    if (!holdActiveRef.current) { setPhase('ready'); return; } // let go while checking
    if (!room) { holdActiveRef.current = false; showFull(); return; }
    if (!(await hasSpace())) { holdActiveRef.current = false; setPhase('ready'); return; }
    if (!aliveRef.current || phaseRef.current !== 'starting') return;
    if (!holdActiveRef.current) { setPhase('ready'); return; }
    startRecording('hold');
  }, [ready, setPhase, hasRoom, hasSpace, showFull, startRecording, stopRecording]);

  // Letting go ends a hold. (A tap's release does nothing here.)
  const handleRelease = useCallback(() => {
    if (!holdActiveRef.current) return;
    holdActiveRef.current = false;
    if (modeRef.current === 'hold' && phaseRef.current === 'recording') stopRecording();
  }, [stopRecording]);

  const handleClose = useCallback(() => {
    if (phaseRef.current === 'saving') return;
    holdActiveRef.current = false;
    clearTimers();
    if (phaseRef.current === 'recording') {
      discardRef.current = true;
      try { recordingCameraRef.current?.stopRecording?.(); } catch (e) { logError('ClipCamera.closeStop', e); }
    } else if (phaseRef.current === 'starting' || phaseRef.current === 'countdown') {
      // Closed while the workout was still being checked, or mid-countdown:
      // nothing may start once the check comes back.
      setPhase('ready');
    }
    closedRef.current = true;
    navigation.goBack();
  }, [clearTimers, navigation, setPhase]);

  const handleFlip = useCallback(() => {
    if (phaseRef.current === 'recording' || phaseRef.current === 'saving') return;
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, []);

  const handleLeadIn = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const next = nextLeadIn(leadInRef.current);
    leadInRef.current = next;
    setLeadIn(next);
    AsyncStorage.setItem(LEAD_IN_KEY, String(next)).catch((e) => {
      logError('ClipCamera.leadInWrite', e);
    });
  }, []);

  const handleGuides = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    setGuides((on) => {
      const next = !on;
      AsyncStorage.setItem(GUIDES_KEY, String(next)).catch((e) => {
        logError('ClipCamera.guidesWrite', e);
      });
      return next;
    });
  }, []);

  const handleCues = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const next = nextCues(cuesRef.current);
    cuesRef.current = next;
    setCues(next);
    AsyncStorage.setItem(CUES_KEY, String(next)).catch((e) => {
      logError('ClipCamera.cuesWrite', e);
    });
  }, []);

  // Addendum 13 (E): Normal or Wide, while the camera waits. Not remembered:
  // the room decides it each time.
  const handleView = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    setWideView((w) => { wideViewRef.current = !w; return !w; });
  }, []);

  const handleLength = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const next = nextLength(lengthRef.current);
    lengthRef.current = next;
    setLengthSec(next);
    AsyncStorage.setItem(LENGTH_KEY, String(next)).catch((e) => {
      logError('ClipCamera.lengthWrite', e);
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const isRecording = phase === 'recording';
  const idle = phase === 'ready';
  facingRef.current = facing;
  // Addendum 13 (E): the View control shows only with a wide lens to offer
  // (iOS, back camera); the chosen lens is named explicitly, since the plain
  // back view on some phones is already the widest lens.
  const showView = Platform.OS === 'ios' && facing === 'back' && !!lenses.wide && !!lenses.normal;
  const selectedLens = showView ? (wideView ? lenses.wide : lenses.normal) : undefined;
  const counting = phase === 'countdown';
  // The record control stays pressable while a hold is being checked, so the
  // release of a hold is never lost; only the countdown and the save grey it.
  const recordDisabled = !ready || counting || phase === 'saving';
  const greyed = !ready || counting || phase === 'saving';
  const ink = greyed ? CAM.textSecondary : CAM.textPrimary;
  const innerColour = greyed ? CAM.textSecondary : CAM.primaryFill;
  const topOffset = insets.top + spacing.xs;

  return (
    <View style={styles.root}>
      {ready && CameraView ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          // Addendum 13 (G): with the front camera the saved video is
          // mirrored, so what the person saw of themselves while setting up
          // is what the video shows. The back camera is untouched.
          mirror={facing === 'front'}
          mode="video"
          mute
          videoQuality="1080p"
          videoBitrate={VIDEO_BITRATE}
          enableTorch={torchOn}
          selectedLens={selectedLens}
        />
      ) : null}

      {/* Setting up first: the thirds grid and the level, over the live view
          until the recording starts (they are not in the video). */}
      <CameraGuides visible={guides && ready && !isRecording && phase !== 'saving'} reduceMotion={!!reduceMotion} />

      {/* The light cue with the front camera: a brief white pulse of the
          screen, which faces the lifter then (addendum 13). */}
      {screenPulse ? <View pointerEvents="none" style={styles.screenPulse} testID="clip-camera-screen-pulse" /> : null}

      {isRecording ? (
        <RecordingProgress
          startedAtMs={recording.startedAtMs}
          limitMs={recording.limitMs}
          reduceMotion={!!reduceMotion}
          topOffset={topOffset}
          clockStyle={live.clock}
        />
      ) : null}

      <View style={[styles.topBar, { top: topOffset }]}>
        <Pressable
          onPress={handleClose}
          style={styles.glyph}
          accessibilityRole="button"
          accessibilityLabel={CLIP_STRINGS.closeA11y}
          testID="clip-camera-close"
        >
          <Ionicons name="close" size={iconSize.lg} color={CAM.textPrimary} style={styles.shadow} />
        </Pressable>
        <View style={styles.topSpacer}>
          <View style={styles.topControls}>
            <ValueControl
              caption={CLIP_STRINGS.guidesCaption}
              value={guidesLabel(guides)}
              onPress={handleGuides}
              disabled={!idle}
              accessibilityLabel={guidesA11yLabel(guides)}
              testID="clip-camera-guides-control"
              captionStyle={live.caption}
              valueStyle={live.value}
            />
            {/* Addendum 13 (A): the cues, on the camera itself, because the
                person is standing at the propped phone. */}
            <ValueControl
              caption={CLIP_STRINGS.cuesCaption}
              value={cuesLabel(cues)}
              onPress={handleCues}
              disabled={!idle}
              accessibilityLabel={cuesA11yLabel(cues)}
              testID="clip-camera-cues"
              captionStyle={live.caption}
              valueStyle={live.value}
            />
            {showView ? (
              <ValueControl
                caption={CLIP_STRINGS.viewCaption}
                value={wideView ? CLIP_STRINGS.viewWide : CLIP_STRINGS.viewNormal}
                onPress={handleView}
                disabled={!idle}
                accessibilityLabel={wideView ? CLIP_STRINGS.viewWideA11y : CLIP_STRINGS.viewNormalA11y}
                testID="clip-camera-view"
                captionStyle={live.caption}
                valueStyle={live.value}
              />
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={handleFlip}
          disabled={isRecording || phase === 'saving'}
          style={[styles.glyph, (isRecording || phase === 'saving') && styles.dimmed]}
          accessibilityRole="button"
          accessibilityLabel={CLIP_STRINGS.flipA11y}
          accessibilityState={{ disabled: isRecording || phase === 'saving' }}
          testID="clip-camera-flip"
        >
          <Ionicons name="camera-reverse-outline" size={iconSize.lg} color={CAM.textPrimary} style={styles.shadow} />
        </Pressable>
      </View>

      {/* The setup line, while the camera waits: what to line up and where
          to stand. It goes once the countdown starts. */}
      {idle && ready ? (
        <View style={[styles.setupRow, { top: topOffset + GLYPH + spacing.sm }]} pointerEvents="none">
          <Text
            style={[styles.hint, live.hint]}
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            testID="clip-camera-setup"
          >
            {setupLine}
          </Text>
        </View>
      ) : null}

      {counting && countdownN > 0 ? (
        <View style={styles.countdownWrap} pointerEvents="none">
          <Text
            style={[styles.countdown, live.countdown]}
            maxFontSizeMultiplier={fontScaleCaps.numeral}
            accessibilityLiveRegion="polite"
            testID="clip-camera-countdown"
          >
            {countdownN}
          </Text>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { bottom: insets.bottom + spacing.lg }]}>
        <View style={styles.controlsRow}>
          <View style={[styles.slot, styles.slotStart]}>
            <ValueControl
              caption={CLIP_STRINGS.countdownCaption}
              value={leadInLabel(leadIn)}
              onPress={handleLeadIn}
              disabled={!idle}
              accessibilityLabel={leadInA11yLabel(leadIn)}
              testID="clip-camera-leadin"
              captionStyle={live.caption}
              valueStyle={live.value}
            />
          </View>
          <Pressable
            onPress={handleRecordTap}
            onLongPress={handleHoldStart}
            delayLongPress={HOLD_DELAY_MS}
            onPressOut={handleRelease}
            disabled={recordDisabled}
            style={[styles.recordRing, { borderColor: ink }]}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? CLIP_STRINGS.stopA11y : startA11yLabel(leadIn)}
            accessibilityState={{ disabled: recordDisabled }}
            testID="clip-camera-record"
          >
            <View style={isRecording ? [styles.stopSquare, { backgroundColor: innerColour }] : [styles.recordDot, { backgroundColor: innerColour }]} />
          </Pressable>
          <View style={[styles.slot, styles.slotEnd]}>
            <ValueControl
              caption={CLIP_STRINGS.lengthCaption}
              value={lengthLabel(lengthSec)}
              onPress={handleLength}
              disabled={!idle}
              accessibilityLabel={lengthA11yLabel(lengthSec)}
              testID="clip-camera-length"
              captionStyle={live.caption}
              valueStyle={live.value}
            />
          </View>
        </View>
        <Text
          style={[styles.hint, live.hint]}
          maxFontSizeMultiplier={fontScaleCaps.chrome}
          testID="clip-camera-hint"
        >
          {isRecording
            ? (recordMode === 'hold' ? CLIP_STRINGS.recordingHintHold : CLIP_STRINGS.recordingHintTap)
            : CLIP_STRINGS.recordHint}
        </Text>
      </View>

      {/* Opens INSTEAD of recording when the workout already holds three
          videos; the person deletes one and can then record. */}
      <ClipsSheet
        visible={clipsOpen}
        onClose={() => setClipsOpen(false)}
        userId={userId}
        workoutId={workoutId}
        notice={CLIP_STRINGS.full}
      />
    </View>
  );
}

const GLYPH = touchTarget.minimum;
const RECORD = 72;
const SHADOW = {
  textShadowColor: withAlpha(CAM.camera, alpha.half),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAM.camera },
  topBar: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topSpacer: { flex: 1, alignItems: 'center' },
  topControls: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap' },
  screenPulse: { ...StyleSheet.absoluteFillObject, backgroundColor: withAlpha(CAM.textPrimary, alpha.half) },
  setupRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  glyph: { width: GLYPH, height: GLYPH, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: alpha.strong },
  shadow: SHADOW,
  countdownWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    color: CAM.textPrimary,
    textAlign: 'center',
    textShadowColor: withAlpha(CAM.camera, alpha.half),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlsRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: { flex: 1 },
  slotStart: { alignItems: 'flex-end', paddingRight: spacing.lg },
  slotEnd: { alignItems: 'flex-start', paddingLeft: spacing.lg },
  recordRing: {
    width: RECORD,
    height: RECORD,
    borderRadius: circle(RECORD),
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDot: { width: RECORD - 20, height: RECORD - 20, borderRadius: circle(RECORD - 20) },
  stopSquare: { width: iconSize.lg, height: iconSize.lg, borderRadius: radius.sm },
  valueControl: { minWidth: GLYPH, minHeight: GLYPH, alignItems: 'center', justifyContent: 'center' },
  hint: { ...SHADOW, color: CAM.textPrimary, textAlign: 'center', paddingHorizontal: spacing.lg },
});

// The type follows the live scale (Larger text); the colours are the
// viewfinder's fixed ink, so only the type roles are mirrored here.
function buildLiveStyles(t) {
  return {
    clock: { ...t.type.num('label') },
    countdown: { ...t.type.num('hero') },
    caption: { ...t.type.caption, color: CAM.textSecondary, ...SHADOW },
    value: { ...t.type.label, color: CAM.textPrimary, ...SHADOW },
    hint: { ...t.type.label },
  };
}

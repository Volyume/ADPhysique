/**
 * ProgressPhotoViewer — the full-size progress-photo viewer that ends the
 * delete-only tap (progress-photos upgrade, B1; spec §3.4/§3.5).
 *
 * A self-contained full-screen viewer the integrator mounts (or routes to)
 * with props. It renders one photo at a time, full size, with pinch-zoom and
 * a horizontal swipe between photos, and it surfaces the per-photo metadata
 * B0 introduced (date taken, pose, optional note, and — only when the shared
 * ED-safety gate allows it — the bodyweight nearest the shot).
 *
 * Safety (PART 2 of the framework, E1 inheritance): the bodyweight line is a
 * high-risk numeric-over-a-body surface, so it is rendered ONLY when
 * usePhotoSuppression() is false. Under calm mode or an open ED-pattern flag
 * (fail-closed) the weight is withheld entirely — never rendered, never on a
 * grid. Viewing the dated photo, editing labels, and delete stay available;
 * this is the calm, date-neutral view of the user's own body.
 *
 * Everything is device-local: the metadata reads/writes go through
 * progressPhotoMeta (never synced), the actions are pure callbacks the
 * integrator wires (delete / compare-from-here / set-reference), and the
 * destructive action re-checks the live tier at execution time so a
 * pro-to-free flip with the confirm already open cannot delete.
 *
 * Motion: pinch/zoom and the swipe settle on the named spring family; Reduce
 * Motion flattens them to an instant set and the Modal opens without a fade.
 *
 * Props:
 *   photos          [{ name, uri, ts }]  the ordered gallery (newest-first, as
 *                                        ProgressPhotosScreen builds it)
 *   initialName     string               the photo to open on (falls back to
 *                                        the first photo)
 *   onClose()                            dismiss the viewer
 *   onDelete(name)                       remove the photo + its meta (the
 *                                        integrator owns the actual delete;
 *                                        called only after confirm + tier check)
 *   deleteModeForPhoto(name)             return 'scan-set' when deleting this
 *                                        photo removes the full saved photo set
 *   onCompareFrom(name)                  open the comparison seeded from here
 *   onSetReference(name)                 mark this the ghost-overlay reference
 *   hideWeight                           withhold exact bodyweight in contexts
 *                                        such as scan trend-only mode
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { appAlert } from './AppAlert';
import Button from './Button';
import Chip from './Chip';
import TextField from './TextField';
import * as haptics from '../lib/haptics';
import useAppStore from '../store/useAppStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { getPhotoMetaMap, upsertPhotoMeta } from '../lib/progressPhotoMeta';
import { formatBodyWeight } from '../lib/units';
import { logError } from '../lib/errorLog';
import PhotoDatePicker from './PhotoDatePicker';
import { colors, spacing, radius, type, motion, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';

const POSES = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];

const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

const MAX_ZOOM = 4;

// The tapped thumbnail cross-fades to the real (gesture-owning) photo over
// this closing slice of the morph, so the cover->contain fit change dissolves
// instead of popping. Pure numeric constant, safe to read inside worklets.
const MORPH_HANDOFF = 0.85;

// Reanimated-driven expo-image for the hero-morph overlay (grid -> viewer).
// createAnimatedComponent keeps expo-image's contentFit/recycling behaviour
// while letting the transform run on the UI thread.
const AnimatedImage = Animated.createAnimatedComponent(Image);

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

// Worklet-safe axis clamp for panning a zoomed image: a translation cannot
// exceed the overflow the current scale produces beyond the resting box size,
// so a zoomed photo can never be dragged past its own edge. Pure arithmetic
// only (CP-10 plan §5.1: worklets never read theme tokens), called from both
// the pinch and pan gesture worklets below.
function clampAxis(value, boxSize, scaleValue) {
  'worklet';
  const max = Math.max(0, (boxSize * (scaleValue - 1)) / 2);
  return Math.min(max, Math.max(-max, value));
}

// Fire-and-forget selection haptic for the double-tap zoom toggle, called via
// runOnJS from the UI-thread doubleTap worklet below. haptics.selection()
// already no-ops under Reduce Motion (src/lib/haptics.js).
function triggerZoomHaptic() { haptics.selection(); }

export default function ProgressPhotoViewer({
  photos = [],
  initialName,
  onClose,
  onDelete,
  deleteModeForPhoto,
  onCompareFrom,
  onSetReference,
  hideWeight = false,
  // Measured rect of the tapped thumbnail (window coords) for the grid ->
  // viewer hero morph (D31). When present and Reduce Motion is off, the photo
  // grows from this rect on open and shrinks back to it on close; the viewer
  // chrome cross-fades. Absent (or under Reduce Motion) the viewer keeps its
  // instant/fade Modal behaviour, byte-identical to before.
  originRect,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const userId = useAppStore((s) => s.user?.id);
  const bodyWeightUnits = useAppStore((s) => s.bodyWeightUnits);
  const suppressed = usePhotoSuppression();
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);

  const startIndex = Math.max(0, photos.findIndex((p) => p.name === initialName));
  const [index, setIndex] = useState(startIndex);
  const [metaMap, setMetaMap] = useState({});
  const [editing, setEditing] = useState(null); // 'note' | null
  const [draftNote, setDraftNote] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const namesKey = photos.map((p) => p.name).join('|');

  // Load metadata for the whole gallery once so swiping is instant. Missing
  // rows resolve to sensible defaults inside getPhotoMetaMap, so this never
  // requires a row to exist.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const map = await getPhotoMetaMap(photos.map((p) => p.name), userId);
        if (alive) setMetaMap(map);
      } catch (e) {
        logError('ProgressPhotoViewer.loadMeta', e, { count: photos.length });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey, userId]);

  const safeIndex = clamp(index, 0, Math.max(0, photos.length - 1));
  const current = photos[safeIndex] || null;
  const currentMeta = current
    ? (metaMap[current.name] || {
      name: current.name, takenAt: current.ts, pose: null, weightKg: null, note: null,
    })
    : null;

  // ── Zoom / pan (UI thread) ────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const resetZoom = useCallback(() => {
    scale.value = 1; savedScale.value = 1;
    tx.value = 0; ty.value = 0; savedTx.value = 0; savedTy.value = 0;
  }, [scale, savedScale, tx, ty, savedTx, savedTy]);

  // Page change via functional setState so it always reads the latest index,
  // and reset the zoom so a new photo opens at rest.
  const lenRef = useRef(photos.length);
  lenRef.current = photos.length;
  const changePage = useCallback((dir) => {
    setIndex((i) => {
      const next = clamp(i + dir, 0, Math.max(0, lenRef.current - 1));
      // Only announce a haptic when the page genuinely changed (not at the
      // first/last photo, where the gesture or a11y action is a no-op).
      if (next !== i) haptics.selection();
      return next;
    });
    resetZoom();
  }, [resetZoom]);

  // Latest-ref so the memoised gesture always calls the CURRENT closure
  // (the VolyumeChart / DiaryScreen day-swipe idiom).
  const navRef = useRef({ change: changePage });
  navRef.current.change = changePage;

  const win = useWindowDimensions();
  const imgW = win.width;
  const imgH = Math.round(win.height * 0.62);

  const composed = useMemo(() => {
    const settle = (target) => (reduceMotion ? target : withSpring(target, motion.springs.settle));
    const goPage = (dir) => navRef.current.change(dir);
    const pageThreshold = win.width * 0.2;

    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        'worklet';
        const next = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
        scale.value = next;
        // Re-clamp the current offset as the scale changes, so zooming out
        // mid-pinch can't leave the image parked past its new, smaller bound.
        tx.value = clampAxis(tx.value, imgW, next);
        ty.value = clampAxis(ty.value, imgH, next);
      })
      .onEnd(() => {
        'worklet';
        savedScale.value = scale.value;
        if (scale.value <= 1) {
          scale.value = settle(1);
          tx.value = settle(0); ty.value = settle(0);
          savedTx.value = 0; savedTy.value = 0;
        } else {
          const boundedTx = clampAxis(tx.value, imgW, scale.value);
          const boundedTy = clampAxis(ty.value, imgH, scale.value);
          tx.value = settle(boundedTx);
          ty.value = settle(boundedTy);
          savedTx.value = boundedTx;
          savedTy.value = boundedTy;
        }
      });

    const pan = Gesture.Pan()
      .onUpdate((e) => {
        'worklet';
        if (scale.value > 1) {
          // Panning a zoomed image: clamp to bounds so the photo can never be
          // dragged past its own edge.
          tx.value = clampAxis(savedTx.value + e.translationX, imgW, scale.value);
          ty.value = clampAxis(savedTy.value + e.translationY, imgH, scale.value);
        } else {
          // At rest: this is a page swipe, not a pan, so zoom wins whenever
          // it's active (the branch above) and paging only drives here.
          tx.value = e.translationX;
        }
      })
      .onEnd((e) => {
        'worklet';
        if (scale.value > 1) {
          savedTx.value = tx.value; savedTy.value = ty.value;
          return;
        }
        if (e.translationX <= -pageThreshold) { runOnJS(goPage)(1); }
        else if (e.translationX >= pageThreshold) { runOnJS(goPage)(-1); }
        tx.value = settle(0);
        savedTx.value = 0;
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        'worklet';
        if (scale.value > 1) {
          scale.value = settle(1); savedScale.value = 1;
          tx.value = settle(0); ty.value = settle(0);
          savedTx.value = 0; savedTy.value = 0;
        } else {
          scale.value = settle(2); savedScale.value = 2;
        }
        runOnJS(triggerZoomHaptic)();
      });

    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [reduceMotion, win.width, imgW, imgH, scale, savedScale, tx, ty, savedTx, savedTy]);

  const imgAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  // ── Hero morph (grid -> viewer, D31) ──────────────────────────────────────
  // Only when a measured origin rect is supplied and Reduce Motion is off.
  // The zoom/pan/paging gesture system above is untouched; the morph owns the
  // open/close transition only, then hands the stage back to the gestures.
  const morphEnabled = !!originRect
    && !reduceMotion
    && Number.isFinite(originRect.width)
    && originRect.width > 0;

  // Origin geometry captured once as plain numbers (safe to close over inside
  // the worklet below — no theme reads, pure arithmetic, CP-10 plan §5.1).
  const oX = originRect?.x ?? 0;
  const oY = originRect?.y ?? 0;
  const oW = originRect?.width ?? 0;
  const oH = originRect?.height ?? 0;

  // morph: 0 = at the tapped thumbnail, 1 = settled full-screen photo.
  const morph = useSharedValue(morphEnabled ? 0 : 1);
  const destX = useSharedValue(0);
  const destY = useSharedValue(0);
  const destW = useSharedValue(0);
  const destH = useSharedValue(0);

  // 'opening' shows the growing overlay; 'done' hands off to the real gesture
  // image; 'closing' shrinks back before the parent unmounts the viewer.
  const [morphPhase, setMorphPhase] = useState(morphEnabled ? 'opening' : 'done');
  const measuredRef = useRef(false);
  const closingRef = useRef(false);
  const stageImageRef = useRef(null);

  // Measure the resting photo rect once the stage lays out, then grow from the
  // thumbnail to it. Runs on the real device (react-test-renderer never lays
  // out, so this is inert in tests — the guard below keeps it crash-free).
  const onStageLayout = useCallback(() => {
    if (!morphEnabled || measuredRef.current) return;
    const node = stageImageRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    measuredRef.current = true;
    node.measureInWindow((x, y, w, h) => {
      destX.value = x; destY.value = y; destW.value = w; destH.value = h;
      morph.value = withTiming(1, { duration: motion.enter }, (finished) => {
        if (finished) runOnJS(setMorphPhase)('done');
      });
    });
  }, [morphEnabled, destX, destY, destW, destH, morph]);

  // Safety net: if the stage never reports a layout / cannot be measured, do
  // not leave the viewer stuck at the origin — settle it open.
  useEffect(() => {
    if (!morphEnabled) return undefined;
    const t = setTimeout(() => {
      if (measuredRef.current) return;
      measuredRef.current = true;
      morph.value = withTiming(1, { duration: motion.enter }, (finished) => {
        if (finished) runOnJS(setMorphPhase)('done');
      });
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morphEnabled]);

  const closeParent = useCallback(() => { onClose?.(); }, [onClose]);

  // Close: shrink the photo back into the thumbnail while the chrome fades
  // out, then hand control to the parent. Without the morph (or under Reduce
  // Motion) this is the plain dismiss the header/back button always had.
  const handleClose = useCallback(() => {
    if (!morphEnabled) { onClose?.(); return; }
    if (closingRef.current) return;
    closingRef.current = true;
    resetZoom();
    setMorphPhase('closing');
    morph.value = withTiming(0, { duration: motion.exit }, (finished) => {
      if (finished) runOnJS(closeParent)();
    });
  }, [morphEnabled, onClose, resetZoom, morph, closeParent]);

  // Overlay transform: a destination-sized box scaled/translated back toward
  // the origin as morph goes 0 -> 1. Pure arithmetic worklet (no theme reads).
  const overlayStyle = useAnimatedStyle(() => {
    const dw = destW.value || oW;
    const dh = destH.value || oH;
    const scaleX = interpolate(morph.value, [0, 1], [oW / dw, 1]);
    const scaleY = interpolate(morph.value, [0, 1], [oH / dh, 1]);
    const destCx = destX.value + dw / 2;
    const destCy = destY.value + dh / 2;
    const originCx = oX + oW / 2;
    const originCy = oY + oH / 2;
    const translateX = interpolate(morph.value, [0, 1], [originCx - destCx, 0]);
    const translateY = interpolate(morph.value, [0, 1], [originCy - destCy, 0]);
    const opacity = interpolate(morph.value, [MORPH_HANDOFF, 1], [1, 0], Extrapolation.CLAMP);
    return {
      left: destX.value,
      top: destY.value,
      width: dw,
      height: dh,
      opacity,
      transform: [{ translateX }, { translateY }, { scaleX }, { scaleY }],
    };
  });

  // The viewer chrome (background, header, metadata) fades in a touch ahead of
  // the photo settling, and fades out on close.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: morphEnabled ? interpolate(morph.value, [0, 0.7], [0, 1], Extrapolation.CLAMP) : 1,
  }));

  // The real gesture-owning photo stays hidden during the morph and cross-fades
  // in over the handoff slice, so the overlay hands off without a visible cut.
  const stageImageStyle = useAnimatedStyle(() => ({
    opacity: morphEnabled ? interpolate(morph.value, [MORPH_HANDOFF, 1], [0, 1], Extrapolation.CLAMP) : 1,
  }));

  // ── Metadata writes ───────────────────────────────────────────────────────
  const applyMeta = useCallback(async (patch) => {
    if (!current) return;
    const name = current.name;
    try {
      const updated = await upsertPhotoMeta(userId, name, patch);
      setMetaMap((m) => ({ ...m, [name]: updated }));
    } catch (e) {
      logError('ProgressPhotoViewer.saveMeta', e, { name });
    }
  }, [current, userId]);

  // Backfill (progress-photos DATING): a photo added before the metadata layer
  // existed has no snapshotted weigh-in. The FIRST time such a photo is opened,
  // lazily create/refresh its row for its current takenAt so the nearest
  // weigh-in is snapshotted and the weight can show. Fires ONCE per name, only
  // when weightKg is missing (never overwrites an existing snapshot), and is
  // best-effort so it never blocks or breaks the viewer.
  const backfilledRef = useRef(new Set());
  useEffect(() => {
    if (!current || !userId) return;
    const name = current.name;
    const meta = metaMap[name];
    if (!meta || meta.weightKg != null) return;
    if (backfilledRef.current.has(name)) return;
    backfilledRef.current.add(name);
    (async () => {
      try {
        const updated = await upsertPhotoMeta(userId, name, { takenAt: meta.takenAt });
        setMetaMap((m) => ({ ...m, [name]: updated }));
      } catch (e) {
        logError('ProgressPhotoViewer.backfillWeight', e, { name });
      }
    })();
  }, [current, userId, metaMap]);

  function onSelectPose(pose) {
    if (!current) return;
    // Re-tapping the active pose clears it; otherwise set it.
    const next = currentMeta?.pose === pose ? null : pose;
    applyMeta({ pose: next });
  }

  function openNoteEditor() {
    setDraftNote(currentMeta?.note || '');
    setEditing('note');
  }

  async function saveNote() {
    const trimmed = (draftNote || '').trim();
    await applyMeta({ note: trimmed.length ? trimmed : null });
    setEditing(null);
  }

  // Date editing now uses the real date picker (past-only, no future). The
  // chosen day keeps the photo's original time-of-day so ordering within a day
  // stays stable; changing takenAt re-snapshots the nearest weigh-in inside
  // upsertPhotoMeta.
  function onPickDate(ms) {
    const chosen = new Date(ms);
    const orig = new Date(currentMeta?.takenAt || Date.now());
    const ts = new Date(
      chosen.getFullYear(), chosen.getMonth(), chosen.getDate(),
      orig.getHours(), orig.getMinutes(), orig.getSeconds(), orig.getMilliseconds(),
    ).getTime();
    // Never allow the future (belt-and-braces beside the picker's maximumDate).
    applyMeta({ takenAt: Math.min(ts, Date.now()) });
  }

  // Screen-reader paging: pinch/swipe are gestures a VoiceOver/TalkBack user
  // typically can't perform through the same touch path as sighted users, so
  // the stage itself exposes standard adjustable increment/decrement actions
  // that drive the same changePage the swipe gesture uses (zoom always resets
  // on either route).
  const onStageAccessibilityAction = useCallback((e) => {
    const name = e?.nativeEvent?.actionName;
    if (name === 'increment') changePage(1);
    else if (name === 'decrement') changePage(-1);
  }, [changePage]);

  function onPressReference() {
    if (!current) return;
    onSetReference?.(current.name);
  }

  function onPressCompare() {
    if (!current) return;
    onCompareFrom?.(current.name);
  }

  function onPressDelete() {
    if (!current) return;
    const name = current.name;
    const deleteMode = deleteModeForPhoto?.(name);
    const deleteCopy = deleteMode === 'scan-set'
      ? {
        buttonTitle: 'Delete set',
        message: 'Delete this full photo set from your device? This removes every photo in the set, plus its saved Volyume Score.',
      }
      : deleteMode === 'photo-set'
        ? {
          buttonTitle: 'Delete all from this date',
          message: 'Delete every photo saved for this date from your device?',
      }
      : {
        buttonTitle: 'Delete',
        message: 'Delete this photo from your device?',
      };
    appAlert(formatProgressPhotoDay(currentMeta.takenAt), deleteCopy.message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: deleteCopy.buttonTitle,
        style: 'destructive',
        onPress: () => {
          // Live-tier re-check: a delete prompt open across a pro-to-free flip
          // must not delete (the ProgressPhotosScreen write-guard class).
          if (useAppStore.getState().tier !== 'pro') return;
          onDelete?.(name);
        },
      },
    ]);
  }

  const showWeight = !suppressed && !hideWeight && currentMeta?.weightKg != null;
  const weightLine = showWeight ? formatBodyWeight(currentMeta.weightKg, bodyWeightUnits) : '';

  return (
    <Modal
      visible
      // With the hero morph we own the whole open/close animation, so the OS
      // fade is off and the Modal is transparent (the underlying grid shows
      // through while the chrome fades in). Without a morph — or under Reduce
      // Motion — this is byte-identical to the original fade/none behaviour.
      animationType={morphEnabled ? 'none' : (reduceMotion ? 'none' : 'fade')}
      transparent={morphEnabled}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, chromeStyle]}>
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerDate, live.headerDate]} numberOfLines={1}>
            {current ? formatProgressPhotoDay(currentMeta.takenAt) : ''}
          </Text>
          <Text style={[styles.counter, live.counter]}>
            {photos.length > 1 ? `${safeIndex + 1} / ${photos.length}` : ''}
          </Text>
        </View>

        <View
          style={[styles.stage, live.stage]}
          accessible={!!current}
          accessibilityRole={photos.length > 1 ? 'adjustable' : 'image'}
          accessibilityLabel={current ? `Photo from ${formatProgressPhotoDay(currentMeta.takenAt)}` : 'No photo to show'}
          accessibilityValue={photos.length > 1 ? { min: 1, max: photos.length, now: safeIndex + 1 } : undefined}
          accessibilityActions={photos.length > 1 ? [
            { name: 'increment', label: 'Next photo' },
            { name: 'decrement', label: 'Previous photo' },
          ] : undefined}
          onAccessibilityAction={onStageAccessibilityAction}
        >
          {current ? (
            <GestureDetector gesture={composed}>
              <Animated.View
                ref={stageImageRef}
                onLayout={onStageLayout}
                style={[styles.stageInner, imgAnimStyle, stageImageStyle]}
              >
                <Image
                  source={{ uri: current.uri }}
                  style={{ width: imgW, height: imgH }}
                  contentFit="contain"
                  // One Image element is reused across the whole gallery as the
                  // user swipes; recyclingKey per photo name plus a transition
                  // gives a calm crossfade between photos instead of a hard cut
                  // or a stale frame lingering from the previous page.
                  recyclingKey={current.name}
                  transition={reduceMotion ? 0 : motion.state}
                  accessible
                  accessibilityLabel={`Photo from ${formatProgressPhotoDay(currentMeta.takenAt)}`}
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <Text style={[styles.emptyText, live.emptyText]}>No photo to show.</Text>
          )}
        </View>

        <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
          {current ? (
            <>
              <View style={styles.metaRow}>
                {currentMeta.pose ? (
                  <View style={[styles.poseTag, live.poseTag]}>
                    <Text style={[styles.poseTagText, live.poseTagText]}>{POSE_LABEL[currentMeta.pose]}</Text>
                  </View>
                ) : null}
                <Text style={[styles.metaDate, live.metaDate]}>{formatProgressPhotoDay(currentMeta.takenAt)}</Text>
              </View>

              {showWeight ? <Text style={[styles.metaWeight, live.metaWeight]}>{weightLine}</Text> : null}
              {currentMeta.note ? <Text style={[styles.metaNote, live.metaNote]}>{currentMeta.note}</Text> : null}

              <View style={[styles.storageNote, live.storageNote]}>
                <Ionicons name="phone-portrait-outline" size={iconSize.sm} color={t.colors.primary} />
                <Text style={[styles.storageNoteText, live.storageNoteText]}>
                  Stored on this device. Export anything you want to keep before uninstalling, clearing app data or changing phones.
                </Text>
              </View>

              <Text style={[styles.sectionLabel, live.sectionLabel]}>Pose</Text>
              <View style={styles.poseSelector}>
                {POSES.map((p) => {
                  const active = currentMeta.pose === p.key;
                  return (
                    <Chip
                      key={p.key}
                      label={p.label}
                      selected={active}
                      onPress={() => onSelectPose(p.key)}
                      style={styles.poseOption}
                      labelStyle={styles.poseOptionText}
                      accessibilityLabel={`Set pose to ${p.label}`}
                    />
                  );
                })}
              </View>

              <View style={styles.actions}>
                <View style={styles.actionRow}>
                  <Button
                    title="Edit date" variant="secondary" size="sm" fullWidth={false}
                    style={styles.actionHalf}
                    icon="calendar-outline" onPress={() => setDatePickerOpen(true)} accessibilityLabel="Edit the date"
                  />
                  <Button
                    title={currentMeta.note ? 'Edit note' : 'Add note'} variant="secondary" size="sm"
                    fullWidth={false} style={styles.actionHalf} icon="create-outline" onPress={openNoteEditor}
                    accessibilityLabel="Add or edit a note"
                  />
                </View>
                <View style={styles.actionRow}>
                  <Button
                    title="Set reference" variant="secondary" size="sm" fullWidth={false}
                    style={styles.actionHalf}
                    icon="pin-outline" onPress={onPressReference} accessibilityLabel="Set as reference photo"
                  />
                  <Button
                    title="Compare" variant="secondary" size="sm" fullWidth={false}
                    style={styles.actionHalf}
                    icon="images-outline" onPress={onPressCompare} accessibilityLabel="Compare from here"
                  />
                </View>
                <View style={[styles.destructiveActionRow, live.destructiveActionRow]}>
                  <Button
                    title={deleteModeForPhoto?.(current.name) === 'scan-set' ? 'Delete set' : deleteModeForPhoto?.(current.name) === 'photo-set' ? 'Delete set' : 'Delete photo'}
                    variant="destructive"
                    size="sm"
                    icon="trash-outline"
                    onPress={onPressDelete}
                    accessibilityLabel={deleteModeForPhoto?.(current.name) === 'scan-set' ? 'Remove this photo set' : deleteModeForPhoto?.(current.name) === 'photo-set' ? 'Remove every photo from this day' : 'Remove this photo'}
                  />
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      </Animated.View>

      {/* Hero-morph overlay (D31): the tapped photo growing into place on open
          and shrinking back on close. Rendered above the fading chrome, and
          only while the morph runs; once settled the real gesture image owns
          the stage. pointerEvents none so the gestures always win. */}
      {morphEnabled && morphPhase !== 'done' && current ? (
        <AnimatedImage
          source={{ uri: current.uri }}
          contentFit="cover"
          pointerEvents="none"
          style={[styles.morphOverlay, overlayStyle]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}

      {/* Note editor */}
      <Modal
        visible={editing === 'note'}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setEditing(null)}
      >
        <View style={[styles.sheetBackdrop, live.sheetBackdrop]}>
          <View style={[styles.sheet, live.sheet]}>
            <Text style={[styles.sheetTitle, live.sheetTitle]}>Note</Text>
            <TextField
              containerStyle={styles.noteFieldContainer}
              fieldStyle={[styles.noteField, live.noteField]}
              inputStyle={styles.noteInput}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="A short note for yourself"
              placeholderTextColor={t.colors.textMuted}
              multiline
              maxLength={280}
              accessibilityLabel="Photo note"
            />
            <View style={styles.sheetActions}>
              <Button title="Cancel" variant="tertiary" size="sm" fullWidth={false} onPress={() => setEditing(null)} accessibilityLabel="Cancel the note" />
              <Button title="Save" size="sm" fullWidth={false} onPress={saveNote} accessibilityLabel="Save the note" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Date editor — the real date picker, past-only (no future). */}
      <PhotoDatePicker
        visible={datePickerOpen}
        valueMs={currentMeta?.takenAt}
        maxMs={Date.now()}
        onChange={onPickDate}
        onClose={() => setDatePickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
  },
  headerDate: { ...type.bodyStrong, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  counter: { ...type.label, color: colors.textMuted, minWidth: 44, textAlign: 'right' },
  stage: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.camera, overflow: 'hidden',
  },
  stageInner: { alignItems: 'center', justifyContent: 'center' },
  // Absolute box for the hero-morph overlay; left/top/width/height + transform
  // are supplied per-frame by overlayStyle (window coords), so no colour or
  // size token belongs here.
  morphOverlay: { position: 'absolute' },
  emptyText: { ...type.body, color: colors.textMuted },
  panel: { maxHeight: 320 },
  panelContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  poseTag: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
  },
  poseTagText: { ...type.label, color: colors.primary },
  metaDate: { ...type.bodyStrong, color: colors.textPrimary },
  metaWeight: { ...type.num('body'), color: colors.textSecondary, marginTop: spacing.xxs },
  metaNote: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.sm },
  storageNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  storageNoteText: { ...type.caption, color: colors.textSecondary, lineHeight: 18, flex: 1 },
  sectionLabel: { ...type.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  poseSelector: {
    flexDirection: 'row', gap: spacing.sm,
  },
  poseOption: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  poseOptionText: { ...type.label, textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionHalf: { flex: 1 },
  destructiveActionRow: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sheetBackdrop: {
    flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: colors.surfaceElevated ?? colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl,
  },
  sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.md },
  noteFieldContainer: { gap: 0 },
  noteField: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    minHeight: 96,
  },
  noteInput: {
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. header/stageInner/morphOverlay/
// panel/panelContent/metaRow/poseSelector/poseOption/poseOptionText/actions/
// actionRow/actionHalf/noteFieldContainer/noteInput/sheetActions have no
// colour tokens. The Reanimated worklets (imgAnimStyle/overlayStyle/
// chromeStyle/stageImageStyle) are untouched -- they are pure-arithmetic,
// no theme reads, per the file's own worklet-safety comments (CP-10 plan
// section 5.1); nothing in this batch changes that.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    headerDate: { color: t.colors.textPrimary },
    counter: { color: t.colors.textMuted },
    stage: { backgroundColor: t.colors.camera },
    emptyText: { color: t.colors.textMuted },
    poseTag: { backgroundColor: t.colors.primaryBg },
    poseTagText: { color: t.colors.primary },
    metaDate: { color: t.colors.textPrimary },
    metaWeight: { color: t.colors.textSecondary },
    metaNote: { color: t.colors.textSecondary },
    storageNote: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    storageNoteText: { color: t.colors.textSecondary },
    sectionLabel: { color: t.colors.textMuted },
    destructiveActionRow: { borderTopColor: t.colors.borderSubtle },
    sheetBackdrop: { backgroundColor: t.colors.scrim },
    sheet: { backgroundColor: t.colors.surfaceElevated ?? t.colors.surface, borderColor: t.colors.border },
    sheetTitle: { color: t.colors.textPrimary },
    noteField: { backgroundColor: t.colors.inputBg },
  };
}

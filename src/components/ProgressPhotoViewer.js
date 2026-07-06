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
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { appAlert } from './AppAlert';
import Button from './Button';
import Chip from './Chip';
import TextField from './TextField';
import useAppStore from '../store/useAppStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { getPhotoMetaMap, upsertPhotoMeta } from '../lib/progressPhotoMeta';
import { formatBodyWeight } from '../lib/units';
import { logError } from '../lib/errorLog';
import PhotoDatePicker from './PhotoDatePicker';
import { colors, spacing, radius, type, motion, iconSize } from '../styles/theme';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';

const POSES = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];

const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

const MAX_ZOOM = 4;

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

export default function ProgressPhotoViewer({
  photos = [],
  initialName,
  onClose,
  onDelete,
  deleteModeForPhoto,
  onCompareFrom,
  onSetReference,
  hideWeight = false,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const userId = useAppStore((s) => s.user?.id);
  const bodyWeightUnits = useAppStore((s) => s.bodyWeightUnits);
  const suppressed = usePhotoSuppression();

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
    setIndex((i) => clamp(i + dir, 0, Math.max(0, lenRef.current - 1)));
    resetZoom();
  }, [resetZoom]);

  // Latest-ref so the memoised gesture always calls the CURRENT closure
  // (the VolyumeChart / DiaryScreen day-swipe idiom).
  const navRef = useRef({ change: changePage });
  navRef.current.change = changePage;

  const win = Dimensions.get('window');
  const imgW = win.width;
  const imgH = Math.round(win.height * 0.62);

  const composed = useMemo(() => {
    const settle = (target) => (reduceMotion ? target : withSpring(target, motion.springs.settle));
    const goPage = (dir) => navRef.current.change(dir);
    const pageThreshold = win.width * 0.2;

    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        'worklet';
        scale.value = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
      })
      .onEnd(() => {
        'worklet';
        savedScale.value = scale.value;
        if (scale.value <= 1) {
          scale.value = settle(1);
          tx.value = settle(0); ty.value = settle(0);
          savedTx.value = 0; savedTy.value = 0;
        }
      });

    const pan = Gesture.Pan()
      .onUpdate((e) => {
        'worklet';
        if (scale.value > 1) {
          tx.value = savedTx.value + e.translationX;
          ty.value = savedTy.value + e.translationY;
        } else {
          // Drag feedback while paging between photos.
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
      });

    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [reduceMotion, win.width, scale, savedScale, tx, ty, savedTx, savedTy]);

  const imgAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
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
        message: 'Delete this photo set from your device? This removes all photos in the set and its saved Physique Score.',
      }
      : {
        buttonTitle: 'Delete',
        message: 'Remove this photo from your device?',
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
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerDate} numberOfLines={1}>
            {current ? formatProgressPhotoDay(currentMeta.takenAt) : ''}
          </Text>
          <Text style={styles.counter}>
            {photos.length > 1 ? `${safeIndex + 1} / ${photos.length}` : ''}
          </Text>
        </View>

        <View style={styles.stage}>
          {current ? (
            <GestureDetector gesture={composed}>
              <Animated.View style={[styles.stageInner, imgAnimStyle]}>
                <Image
                  source={{ uri: current.uri }}
                  style={{ width: imgW, height: imgH }}
                  resizeMode="contain"
                  resizeMethod="resize"
                  accessible
                  accessibilityLabel={`Photo from ${formatProgressPhotoDay(currentMeta.takenAt)}`}
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <Text style={styles.emptyText}>No photo to show.</Text>
          )}
        </View>

        <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
          {current ? (
            <>
              <View style={styles.metaRow}>
                {currentMeta.pose ? (
                  <View style={styles.poseTag}>
                    <Text style={styles.poseTagText}>{POSE_LABEL[currentMeta.pose]}</Text>
                  </View>
                ) : null}
                <Text style={styles.metaDate}>{formatProgressPhotoDay(currentMeta.takenAt)}</Text>
              </View>

              {showWeight ? <Text style={styles.metaWeight}>{weightLine}</Text> : null}
              {currentMeta.note ? <Text style={styles.metaNote}>{currentMeta.note}</Text> : null}

              <View style={styles.storageNote}>
                <Ionicons name="phone-portrait-outline" size={iconSize.sm} color={colors.primary} />
                <Text style={styles.storageNoteText}>
                  Stored on this device. Export anything you want to keep before uninstalling, clearing app data or changing phones.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Pose</Text>
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
                <Button
                  title="Edit date" variant="secondary" size="sm" fullWidth={false}
                  icon="calendar-outline" onPress={() => setDatePickerOpen(true)} accessibilityLabel="Edit the date"
                />
                <Button
                  title={currentMeta.note ? 'Edit note' : 'Add note'} variant="secondary" size="sm"
                  fullWidth={false} icon="create-outline" onPress={openNoteEditor}
                  accessibilityLabel="Add or edit a note"
                />
                <Button
                  title="Set as reference" variant="secondary" size="sm" fullWidth={false}
                  icon="pin-outline" onPress={onPressReference} accessibilityLabel="Set as reference photo"
                />
                <Button
                  title="Compare from here" variant="secondary" size="sm" fullWidth={false}
                  icon="images-outline" onPress={onPressCompare} accessibilityLabel="Compare from here"
                />
                <Button
                  title={deleteModeForPhoto?.(current.name) === 'scan-set' ? 'Delete set' : 'Delete'}
                  variant="destructive"
                  size="sm"
                  fullWidth={false}
                  icon="trash-outline"
                  onPress={onPressDelete}
                  accessibilityLabel={deleteModeForPhoto?.(current.name) === 'scan-set' ? 'Remove this photo set' : 'Remove this photo'}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Note editor */}
      <Modal
        visible={editing === 'note'}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Note</Text>
            <TextField
              containerStyle={styles.noteFieldContainer}
              fieldStyle={styles.noteField}
              inputStyle={styles.noteInput}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="A short note for yourself"
              placeholderTextColor={colors.textMuted}
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
  actions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg,
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

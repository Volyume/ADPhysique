import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { appAlert } from '../components/AppAlert';
import Button from '../components/Button';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import {
  colors, spacing, radius, fontSize, fontWeight, type,
} from '../styles/theme';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import { logError } from '../lib/errorLog';
import {
  listProgressPhotos, saveProgressPhoto, deleteProgressPhoto, markPhotosOwner,
} from '../lib/progressPhotos';
import { getPhotoMetaMap, deletePhotoMeta, upsertPhotoMeta } from '../lib/progressPhotoMeta';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import ProgressPhotoViewer from '../components/ProgressPhotoViewer';
import ProgressPhotoCompare from '../components/ProgressPhotoCompare';
import ProgressGhostCapture from '../components/ProgressGhostCapture';
import BeforeAfterShareSheet from '../components/BeforeAfterShareSheet';
import PhotoDetailsSheet from '../components/PhotoDetailsSheet';

// expo-image-picker is a native module; lazy-require so the screen imports in
// the node test env (mirrors ShareCardScreen).
let ImagePicker;
try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }

const COLS = 3;
const GAP = spacing.xs;

// Pose filter chips. 'all' shows every photo; the others narrow to a pose so
// like compares with like (spec §3.3). Function-neutral labels.
const POSES = [
  { key: 'all', label: 'All' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];
const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

function formatDay(ts) {
  try { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (_) { return ''; }
}

function monthLabel(ts) {
  try { return new Date(ts).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
  catch (_) { return ''; }
}

// Group a newest-first photo list into a flat timeline of month headers and
// rows of up to COLS tiles. Pure, so the screen test can drive it directly.
export function buildTimeline(list) {
  const out = [];
  let curKey = null;
  let bucket = [];
  const flushBucket = () => {
    for (let i = 0; i < bucket.length; i += COLS) {
      const chunk = bucket.slice(i, i + COLS);
      out.push({ type: 'row', key: `row-${chunk[0].name}`, photos: chunk });
    }
    bucket = [];
  };
  for (const p of list) {
    const d = new Date(p.takenAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== curKey) {
      flushBucket();
      curKey = key;
      out.push({ type: 'header', key: `h-${key}`, label: monthLabel(p.takenAt) });
    }
    bucket.push(p);
  }
  flushBucket();
  return out;
}

export default function ProgressPhotosScreen({ navigation }) {
  const toast = useToast();
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  // E10 read-only lapse views (founder decision 2026-07-02, "view yes, log
  // no"): a non-Pro user reaches this screen only through withReadOnlyProGuard
  // (they have photos), and it renders view-only: the timeline and Compare
  // stay; add, delete and the editable viewer are hidden. Derived from the
  // store inside the screen.
  const tier = useAppStore((s) => s.tier);
  const readOnly = tier !== 'pro';
  const userId = useAppStore((s) => s.user?.id);

  // Shared ED-safety gate (spec §3.2, PART 2). Fail-closed calm-OR-open-ED read
  // that withholds the NEW high-risk surfaces (comparison entry, the share
  // card). Additive to, and never a replacement for, the screen's own raw
  // wellbeing read below (which the wellbeingFailClosed guard pins byte-exact).
  const suppressed = usePhotoSuppression(userId);

  // Owner marker (hostile review E10 #2): stamp whose photos these are while
  // a Pro user is on the screen, so the read-only lapse guard can later
  // refuse the gallery to a DIFFERENT account on the same device. Best-effort
  // and idempotent.
  useEffect(() => {
    if (!readOnly && userId) markPhotosOwner(userId);
  }, [readOnly, userId]);

  const [photos, setPhotos] = useState([]);
  const [metaMap, setMetaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [calm, setCalm] = useState(false);
  const [poseFilter, setPoseFilter] = useState('all');

  // Overlay surfaces (all device-local; rendered as Modals over the timeline).
  const [viewerName, setViewerName] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureReference, setCaptureReference] = useState(null);
  const [capturePose, setCapturePose] = useState(null);

  // The "Photo details" step (date + pose) shown after an image is obtained and
  // BEFORE it is finalised. A picked camera/library image carries `pendingUri`
  // (saved on confirm); a guided capture is already saved so it carries
  // `pendingName` instead (confirm only refines its date + pose). `pendingDate`
  // is captured once when the sheet opens so the draft never resets mid-edit.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const [pendingPose, setPendingPose] = useState(null);
  const [pendingDate, setPendingDate] = useState(null);
  // The ghost-overlay reference the viewer's "set as reference" remembers; the
  // next guided capture seeds against it.
  const [referenceName, setReferenceName] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Fail CLOSED: read the raw wellbeing flag rather than getWellbeingMode()
      // (which swallows a storage read error down to 'unspecified'). A genuine
      // read failure must be treated as calm/suppressed.
      const [rows, mode] = await Promise.all([
        listProgressPhotos(),
        AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
      ]);
      setPhotos(rows);
      setCalm(isCalm(mode) || mode === 'read_failed');
      // Load the per-photo metadata (taken_at, pose) for the dated, pose-typed
      // timeline. Missing rows resolve to filename-derived defaults, so this
      // never requires a row to exist.
      try {
        const map = await getPhotoMetaMap(rows.map((r) => r.name));
        setMetaMap(map);
      } catch (e) {
        logError('ProgressPhotos.loadMeta', e, { count: rows.length });
      }
      // A dangling reference must never point at a photo that no longer exists.
      setReferenceName((prev) => (prev && rows.some((r) => r.name === prev) ? prev : null));
    } catch (_) { /* tolerate */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function pickFrom(source) {
    // Live-tier re-check (hostile review E10 #1 class): the add alert can be
    // open when the tier flips pro-to-free; its callback must not save then.
    if (useAppStore.getState().tier !== 'pro') return;
    if (!ImagePicker) { toast.show('Photos need a rebuild on this device.', { variant: 'warning' }); return; }
    setBusy(true);
    try {
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images', quality: 0.7 };
      let perm; let result;
      if (source === 'camera') {
        perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm?.granted) { toast.show('Camera permission is needed to take a photo.', { variant: 'warning' }); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm?.granted) { toast.show('Photo library permission is needed.', { variant: 'warning' }); return; }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (result?.canceled) return;
      const uri = result?.assets?.[0]?.uri;
      if (!uri) return;
      // Don't finalise yet: collect the date (and pose) first, then save on
      // confirm so the weigh-in snapshot lands on the chosen day.
      openDetailsForNew(uri);
    } catch (_) {
      toast.show('Could not add the photo. Try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  // A picked image needs the details step before it is saved (save happens on
  // confirm, dated to the chosen day). Snapshot today as the default date once,
  // so the draft never resets while the sheet is open.
  function openDetailsForNew(uri) {
    setPendingUri(uri);
    setPendingName(null);
    setPendingPose(null);
    setPendingDate(Date.now());
    setDetailsOpen(true);
  }

  // A guided capture has already saved the file (with its pose + today's
  // weigh-in). The details step only refines its date and pose; confirm writes
  // through upsertPhotoMeta, which re-snapshots the weigh-in if the date moved.
  function openDetailsForCaptured(name, pose) {
    setPendingUri(null);
    setPendingName(name);
    setPendingPose(pose ?? null);
    setPendingDate(Date.now());
    setDetailsOpen(true);
  }

  function resetPending() {
    setDetailsOpen(false);
    setPendingUri(null);
    setPendingName(null);
    setPendingPose(null);
    setPendingDate(null);
  }

  async function onDetailsConfirm({ takenAt, pose }) {
    setDetailsOpen(false);
    // Live-tier re-check (the add-alert write-guard class): a pro-to-free flip
    // with the sheet open must not save or write metadata.
    if (useAppStore.getState().tier !== 'pro') { resetPending(); return; }
    const uid = useAppStore.getState().user?.id;
    setBusy(true);
    try {
      let name = pendingName;
      if (pendingUri) {
        const saved = await saveProgressPhoto(pendingUri);
        name = saved?.name || null;
      }
      if (name) {
        // Creates the metadata row and snapshots the weigh-in nearest takenAt
        // (or re-snapshots for a captured photo whose date the user moved).
        await upsertPhotoMeta(uid, name, { takenAt, pose });
      }
    } catch (e) {
      logError('ProgressPhotos.addDetails', e, {});
      toast.show('Could not add the photo. Try again.', { variant: 'error' });
    } finally {
      setBusy(false);
      resetPending();
      await refresh();
    }
  }

  function onDetailsCancel() {
    // A picked image was never saved, so cancel simply discards it. A guided
    // capture is already on disk with sensible defaults, so refresh keeps it.
    resetPending();
    refresh();
  }

  // Enrich each photo with its effective taken_at (meta, else the filename ts)
  // and pose. A missing meta map resolves to the same values as before.
  const enriched = useMemo(() => photos.map((p) => {
    const m = metaMap[p.name];
    const takenAt = m && Number.isFinite(m.takenAt) ? m.takenAt : p.ts;
    return { name: p.name, uri: p.uri, ts: p.ts, takenAt, pose: (m && m.pose) || null };
  }), [photos, metaMap]);

  // The current pose scope, newest-first for a descending timeline.
  const filtered = useMemo(() => {
    const list = poseFilter === 'all' ? enriched : enriched.filter((p) => p.pose === poseFilter);
    return [...list].sort((a, b) => b.takenAt - a.takenAt);
  }, [enriched, poseFilter]);

  const timeline = useMemo(() => buildTimeline(filtered), [filtered]);

  function openGhostCapture() {
    if (useAppStore.getState().tier !== 'pro') return;
    // Seed the overlay against the remembered reference when set, else the
    // latest photo of the pose in view (or the latest overall). Carry that
    // pose onto the new photo's meta row.
    let ref = referenceName ? enriched.find((p) => p.name === referenceName) : null;
    let seedPose = ref ? ref.pose : (poseFilter !== 'all' ? poseFilter : null);
    if (!ref) {
      const pool = seedPose ? enriched.filter((p) => p.pose === seedPose) : enriched;
      ref = [...(pool.length ? pool : enriched)].sort((a, b) => b.takenAt - a.takenAt)[0] || null;
    }
    setCaptureReference(ref ? { uri: ref.uri } : null);
    setCapturePose(seedPose ?? null);
    setCaptureOpen(true);
  }

  function onAdd() {
    appAlert('Add a photo', 'Stored only on this device.', [
      { text: 'Take with guide', onPress: openGhostCapture },
      { text: 'Take photo', onPress: () => pickFrom('camera') },
      { text: 'Choose from library', onPress: () => pickFrom('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Plain, calm guidance on what the feature is and how to use it, so nobody
  // has to guess. No cadence pressure, no streak: "at your own pace" by design.
  function onHowItWorks() {
    appAlert(
      'How progress photos work',
      'Your photos stay on this device. They are never synced or shared unless you choose to.\n\n'
      + 'Tag each one front, side or back, so like lines up with like.\n\n'
      + 'When you add a photo, "Take with guide" faintly shows your last one so you can line the shot up.\n\n'
      + 'Tap a photo to view it full size, add a note, or set the date.\n\n'
      + 'Pick any two to compare them side by side, with a slider, or as an overlay.\n\n'
      + 'When you are ready, make a before and after card to keep or share.\n\n'
      + 'There is no schedule and no streak. Take them at your own pace, and only if they help you.',
      [{ text: 'Got it' }],
    );
  }

  function openViewer(name) {
    setViewerName(name);
    setViewerOpen(true);
  }

  // Real delete wiring: remove the file AND its metadata row, then refresh.
  // Re-checks the live tier (a pro-to-free flip with the confirm open must not
  // delete); the viewer also re-checks before calling this.
  const onViewerDelete = useCallback(async (name) => {
    if (useAppStore.getState().tier !== 'pro') return;
    const item = photos.find((p) => p.name === name);
    try {
      if (item) await deleteProgressPhoto(item.uri);
      await deletePhotoMeta(name);
    } catch (e) {
      logError('ProgressPhotos.delete', e, { name });
    }
    setReferenceName((prev) => (prev === name ? null : prev));
    setViewerOpen(false);
    await refresh();
  }, [photos, refresh]);

  function openCompare() { setCompareOpen(true); }
  function openShare() { setShareOpen(true); }

  const win = Dimensions.get('window');
  const size = (win.width - spacing.lg * 2 - GAP * (COLS - 1)) / COLS;

  // NEW high-risk surfaces are withheld under the shared suppression gate
  // (fail-closed): the comparison entry and the share card. Viewing the dated
  // timeline and delete stay available. Share is additionally Pro-gated.
  const canCompare = !loading && photos.length >= 2 && !suppressed;
  const canShare = !loading && !readOnly && photos.length >= 2 && !suppressed;
  const showActions = canCompare || canShare;

  function renderTile(item) {
    const dateLabel = formatDay(item.takenAt);
    return (
      <TouchableOpacity
        key={item.name}
        // E10 read-only: opening the editable viewer would expose writes
        // (pose/date/note), so a plain tap is inert in the view-only state;
        // Compare (pure viewing) stays available below.
        onPress={readOnly ? undefined : () => openViewer(item.name)}
        disabled={readOnly}
        accessibilityRole={readOnly ? 'image' : 'button'}
        accessibilityLabel={readOnly
          ? `Photo from ${dateLabel}.`
          : `Photo from ${dateLabel}. Tap to open.`}
        style={styles.tile}
      >
        <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: radius.md }} resizeMethod="resize" />
        {item.pose ? (
          <View pointerEvents="none" style={styles.poseBadge}>
            <Text style={styles.poseBadgeText}>{POSE_LABEL[item.pose]}</Text>
          </View>
        ) : null}
        <Text style={styles.tileDate} numberOfLines={1}>{dateLabel}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Standard pushed-screen scaffold (BackHeader), matching Partners and the
          rest of the app. The add action rides the header's right slot; it is a
          write, so it is hidden in the E10 view-only lapse state. */}
      <BackHeader
        title="Progress photos"
        onBack={() => navigation.goBack()}
        right={!readOnly ? (
          <TouchableOpacity onPress={onAdd} disabled={busy} hitSlop={12} accessibilityRole="button" accessibilityLabel="Add a photo">
            {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="add" size={26} color={colors.primary} />}
          </TouchableOpacity>
        ) : null}
      />

      {/* Info box on the shared Card surface (matches Train's boxes) rather
          than bare text, so the feature reads as part of one app. */}
      <Card padding="md" style={styles.infoCard}>
        <Text style={styles.note}>
          {calm
            ? 'Private to this device. We never upload or sync your photos, and nothing is shared unless you choose to. Use these only if they help you, and skip them if they do not.'
            : 'Private to this device. We never upload or sync your photos, and nothing is shared unless you choose to.'}
          {readOnly ? ' View-only on the free plan. Your photos are safe and stay yours.' : ''}
        </Text>
        <TouchableOpacity
          onPress={onHowItWorks}
          style={styles.howRow}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="How progress photos work"
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.howLink}>How it works</Text>
        </TouchableOpacity>
      </Card>

      {!loading && photos.length > 0 && (
        <View style={styles.filterRow} accessibilityLabel="Filter by pose">
          {POSES.map((p) => {
            const active = p.key === poseFilter;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setPoseFilter(p.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={p.label}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showActions && (
        <View style={styles.actionRow}>
          {canCompare && (
            <Button
              title="Compare"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              icon="images-outline"
              onPress={openCompare}
              accessibilityLabel="Compare two photos"
            />
          )}
          {canShare && (
            <Button
              title="Share"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              icon="share-outline"
              onPress={openShare}
              accessibilityLabel="Share progress"
            />
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
      ) : photos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
          {readOnly ? (
            <Text style={styles.emptyText}>No photos on this device.</Text>
          ) : (
            <>
              <Text style={styles.emptyTitle}>See your progress over time</Text>
              <Text style={styles.emptyHint}>
                Add a photo from your camera or library, tag it front, side or back, and line each
                new one up with the guide. Then compare any two over time, or make a before and
                after card. Private to this device, at your own pace.
              </Text>
              <Button
                title="Add a photo"
                icon="add"
                onPress={onAdd}
                fullWidth={false}
                style={styles.emptyAdd}
                accessibilityLabel="Add a photo"
              />
            </>
          )}
        </View>
      ) : timeline.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No photos with this pose yet.</Text>
        </View>
      ) : (
        <FlashList
          data={timeline}
          extraData={{ readOnly }}
          keyExtractor={(item) => item.key}
          getItemType={(item) => item.type}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.monthHeader}>{item.label}</Text>;
            }
            return (
              <View style={styles.row}>
                {item.photos.map(renderTile)}
              </View>
            );
          }}
        />
      )}

      {/* Full-size viewer (pose/date/note, weight gated by suppression). Own
          Modal; only mounted while open. */}
      {viewerOpen ? (
        <ProgressPhotoViewer
          photos={filtered}
          initialName={viewerName}
          onClose={() => setViewerOpen(false)}
          onDelete={onViewerDelete}
          onCompareFrom={() => { setViewerOpen(false); openCompare(); }}
          onSetReference={(name) => setReferenceName(name)}
        />
      ) : null}

      {/* Comparison. Self-contained selection + three modes; self-suppresses
          under calm/ED. The entry above is ALSO gated, a deliberate double
          guard. */}
      <Modal
        visible={compareOpen}
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setCompareOpen(false)}
      >
        <ProgressPhotoCompare photos={photos} onClose={() => setCompareOpen(false)} />
      </Modal>

      {/* Guided (ghost-overlay) capture. Falls back to the existing library
          path when the camera is unavailable or declined. */}
      <Modal
        visible={captureOpen}
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setCaptureOpen(false)}
      >
        <ProgressGhostCapture
          referencePhoto={captureReference}
          pose={capturePose}
          onCaptured={(name) => { setCaptureOpen(false); openDetailsForCaptured(name, capturePose); }}
          onClose={() => setCaptureOpen(false)}
          onFallback={() => { setCaptureOpen(false); pickFrom('library'); }}
        />
      </Modal>

      {/* Before/after share card. Self-gates Pro + suppression; the entry above
          is gated too. */}
      <Modal
        visible={shareOpen}
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setShareOpen(false)}
      >
        <BeforeAfterShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} photos={photos} />
      </Modal>

      {/* Photo details (date + pose) shown after an image is obtained and before
          it is finalised. Its own Modal; only mounted while open. */}
      <PhotoDetailsSheet
        visible={detailsOpen}
        initialDateMs={pendingDate}
        initialPose={pendingPose}
        onConfirm={onDetailsConfirm}
        onCancel={onDetailsCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  infoCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  note: { ...type.bodySm, color: colors.textMuted },
  filterRow: {
    flexDirection: 'row', gap: spacing.xs,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  filterChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  filterChipActive: { backgroundColor: colors.primaryFill },
  filterChipText: { ...type.label, color: colors.textMuted },
  filterChipTextActive: { color: colors.onPrimary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  monthHeader: { ...type.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  tile: { alignItems: 'flex-start' },
  tileDate: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  poseBadge: {
    position: 'absolute', top: spacing.xs, left: spacing.xs,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
  },
  poseBadgeText: { ...type.caption, color: colors.primary },
  // "How it works" affordance under the privacy note, always available so the
  // feature explains itself (compare, guide, poses, before/after card).
  howRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  howLink: { ...type.bodySm, color: colors.primary, fontWeight: fontWeight.semibold },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  emptyTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  emptyHint: { ...type.bodySm, color: colors.textMuted, textAlign: 'center' },
  emptyAdd: { marginTop: spacing.md },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { appAlert } from '../components/AppAlert';
import Button from '../components/Button';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import {
  colors, spacing, radius, fontSize, fontWeight, type, iconSize,
} from '../styles/theme';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { logError } from '../lib/errorLog';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import {
  listProgressPhotos, saveProgressPhoto, deleteProgressPhoto, markPhotosOwner,
} from '../lib/progressPhotos';
import { getPhotoMetaMap, deletePhotoMeta, upsertPhotoMeta } from '../lib/progressPhotoMeta';
import {
  addProgressScanAsset,
  createProgressScanSession,
  deleteProgressScanSession,
  finishProgressScanSession,
  listProgressScans,
} from '../lib/progressScanStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import ProgressPhotoViewer from '../components/ProgressPhotoViewer';
import ProgressPhotoCompare from '../components/ProgressPhotoCompare';
import ProgressGhostCapture from '../components/ProgressGhostCapture';
import BeforeAfterShareSheet from '../components/BeforeAfterShareSheet';
import PhotoDetailsSheet from '../components/PhotoDetailsSheet';
import PhotoDateRangeSheet from '../components/PhotoDateRangeSheet';

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

// Timeline sort. Newest-first is the unchanged default; oldest-first lets
// someone read forwards from their first photo. Neutral temporal wording only,
// never "before/after" or any transformation framing (spec PART 2). buildTimeline
// groups by contiguous month, so it works with either direction unchanged.
const SORTS = [
  { key: 'newest', label: 'Newest', a11y: 'Sort newest first' },
  { key: 'oldest', label: 'Oldest', a11y: 'Sort oldest first' },
];

function formatDay(ts) {
  try { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (_) { return ''; }
}

// Compact date for the range pill (no year, to fit); the sheet shows full dates.
function formatShort(ts) {
  try { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
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

// Compose the pose filter, the date-range filter and the sort order into the
// timeline source list. Pure, so the screen test can drive it directly. The
// date bounds are inclusive epoch-ms day bounds (rangeFrom = start of a day,
// rangeTo = end of a day); either may be null to leave that side open. This is
// neutral navigation of the user's own photos only (spec PART 2): it never
// nudges, ranks or forces a comparison.
export function filterAndSort(list, {
  poseFilter = 'all', sortOrder = 'newest', rangeFrom = null, rangeTo = null,
} = {}) {
  let out = poseFilter === 'all' ? list : list.filter((p) => p.pose === poseFilter);
  if (Number.isFinite(rangeFrom)) out = out.filter((p) => p.takenAt >= rangeFrom);
  if (Number.isFinite(rangeTo)) out = out.filter((p) => p.takenAt <= rangeTo);
  const dir = sortOrder === 'oldest' ? 1 : -1;
  return [...out].sort((a, b) => (a.takenAt - b.takenAt) * dir);
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
  const userSex = useAppStore((s) => s.userProfile?.sex ?? null);

  // Shared ED-safety gate (spec §3.2, PART 2). Fail-closed calm-OR-open-ED read
  // that withholds the NEW high-risk surfaces (comparison entry, the share
  // card). Additive to, and never a replacement for, the screen's own raw
  // wellbeing read below (which the wellbeingFailClosed guard pins byte-exact).
  const photoSuppressed = usePhotoSuppression(userId);

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
  const suppressed = photoSuppressed || calm;
  const [poseFilter, setPoseFilter] = useState('all');
  // Timeline navigation (neutral, spec PART 2): a newest/oldest sort and an
  // optional date-range filter. Both compose with the pose filter; both are
  // pure viewing of the user's own photos and never touch the suppression,
  // compare/share, or weight rules.
  const [sortOrder, setSortOrder] = useState('newest');
  const [rangeFrom, setRangeFrom] = useState(null);
  const [rangeTo, setRangeTo] = useState(null);
  const [rangeOpen, setRangeOpen] = useState(false);

  // Overlay surfaces (all device-local; rendered as Modals over the timeline).
  const [viewerName, setViewerName] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureReference, setCaptureReference] = useState(null);
  const [capturePose, setCapturePose] = useState(null);
  const [scanFlow, setScanFlow] = useState(null);
  const [scans, setScans] = useState([]);

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
      const [rows, scanRows, mode] = await Promise.all([
        listProgressPhotos(userId),
        userId ? listProgressScans(userId, 5).catch(() => []) : Promise.resolve([]),
        AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
      ]);
      setPhotos(rows);
      setScans(scanRows || []);
      setCalm(isCalm(mode) || mode === 'read_failed');
      // Load the per-photo metadata (taken_at, pose) for the dated, pose-typed
      // timeline. Missing rows resolve to filename-derived defaults, so this
      // never requires a row to exist.
      try {
        const map = await getPhotoMetaMap(rows.map((r) => r.name), userId);
        setMetaMap(map);
      } catch (e) {
        logError('ProgressPhotos.loadMeta', e, { count: rows.length });
      }
      // A dangling reference must never point at a photo that no longer exists.
      setReferenceName((prev) => (prev && rows.some((r) => r.name === prev) ? prev : null));
    } catch (_) { /* tolerate */ }
    finally { setLoading(false); }
  }, [userId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function pickFrom(source) {
    // Live-tier re-check (hostile review E10 #1 class): the add alert can be
    // open when the tier flips pro-to-free; its callback must not save then.
    if (useAppStore.getState().tier !== 'pro') return;
    setScanFlow(null);
    setCapturePose(null);
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
        const saved = await saveProgressPhoto(pendingUri, undefined, uid);
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

  // The current scope: pose filter, then date-range filter, then sort. Defaults
  // (all poses, no range, newest-first) reproduce the previous behaviour exactly.
  const filtered = useMemo(
    () => filterAndSort(enriched, {
      poseFilter, sortOrder, rangeFrom, rangeTo,
    }),
    [enriched, poseFilter, sortOrder, rangeFrom, rangeTo],
  );

  const timeline = useMemo(() => buildTimeline(filtered), [filtered]);

  const hasRange = Number.isFinite(rangeFrom) || Number.isFinite(rangeTo);
  // Plain label for the date-range pill; "to" reads calmer than a dash and
  // sidesteps the em-dash lint entirely.
  const rangeLabel = hasRange
    ? `${Number.isFinite(rangeFrom) ? formatShort(rangeFrom) : 'Any'} to ${Number.isFinite(rangeTo) ? formatShort(rangeTo) : 'Any'}`
    : 'Any dates';

  function openGhostCapture() {
    if (useAppStore.getState().tier !== 'pro') return;
    setScanFlow(null);
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

  async function openProgressScan() {
    if (useAppStore.getState().tier !== 'pro' || !userId) return;
    try {
      const session = await createProgressScanSession(userId);
      if (!session?.id) throw new Error('No scan session');
      setScanFlow({ scanId: session.id, pose: 'front' });
      setCaptureReference(null);
      setCapturePose('front');
      setCaptureOpen(true);
    } catch (e) {
      logError('ProgressPhotos.startScan', e, { userId });
      toast.show('Could not start the scan. Please try again.', { variant: 'error' });
    }
  }

  async function finishScan(scanId) {
    if (!userId || !scanId) return;
    try {
      const sex = useAppStore.getState().userProfile?.sex ?? userSex;
      await finishProgressScanSession(userId, scanId, { sex });
      setScans(await listProgressScans(userId, 5));
      await refresh();
    } catch (e) {
      logError('ProgressPhotos.finishScan', e, { userId, scanId });
      toast.show('The scan was saved, but analysis could not finish.', { variant: 'warning' });
    }
  }

  async function discardScanDraft(flow = scanFlow) {
    const scanId = flow?.scanId;
    setScanFlow(null);
    setCapturePose(null);
    if (!userId || !scanId) return;
    try {
      await deleteProgressScanSession(userId, scanId);
      setScans(await listProgressScans(userId, 5));
    } catch (e) {
      logError('ProgressPhotos.discardScan', e, { userId, scanId });
    }
  }

  async function onScanCaptured(name, saved) {
    const flow = scanFlow;
    const pose = capturePose;
    setCaptureOpen(false);
    if (!flow?.scanId || !pose || !saved?.uri) {
      openDetailsForCaptured(name, pose);
      return;
    }
    try {
      await addProgressScanAsset(userId, flow.scanId, {
        pose,
        photoName: name,
        uri: saved.uri,
        takenAt: saved.ts ?? Date.now(),
        qualityScore: 0.86,
      });
      if (pose === 'front') {
        setScanFlow({ scanId: flow.scanId, pose: 'back' });
        setCapturePose('back');
        appAlert('Front saved', 'Turn around for the back photo. Use the timer if you need to step into position.', [
          { text: 'Continue', onPress: () => setCaptureOpen(true) },
        ]);
        return;
      }
      if (pose === 'back') {
        appAlert('Back saved', 'A side photo is optional. It can help line up future scans, but you can finish now.', [
          { text: 'Finish scan', onPress: () => { setScanFlow(null); finishScan(flow.scanId); } },
          { text: 'Take side', onPress: () => { setScanFlow({ scanId: flow.scanId, pose: 'side' }); setCapturePose('side'); setCaptureOpen(true); } },
        ]);
        return;
      }
      setScanFlow(null);
      await finishScan(flow.scanId);
    } catch (e) {
      logError('ProgressPhotos.scanCaptured', e, { userId, pose });
      toast.show('Could not save that scan photo. Please try again.', { variant: 'error' });
    }
  }

  function onAdd() {
    appAlert('Progress Scan', 'Stored only on this device.', [
      { text: 'Start guided scan', onPress: openProgressScan },
      { text: 'Single guided photo', onPress: openGhostCapture },
      { text: 'Take photo', onPress: () => pickFrom('camera') },
      { text: 'Choose from library', onPress: () => pickFrom('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Plain, calm guidance on what the feature is and how to use it, so nobody
  // has to guess. No cadence pressure, no streak: "at your own pace" by design.
  function onHowItWorks() {
    appAlert(
      'How Progress Scan works',
      'Your photos stay on this device. They are never synced or shared unless you choose to.\n\n'
      + 'A guided scan takes front and back photos. A side photo is optional.\n\n'
      + 'Use the camera flip and the 5 or 10 second timer when you need to set the phone down and step into position.\n\n'
      + 'The scan only explains stored, measured signals. If analysis is not reliable, it will say so rather than guess.\n\n'
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
    const uid = useAppStore.getState().user?.id ?? userId;
    const item = photos.find((p) => p.name === name);
    try {
      if (item) await deleteProgressPhoto(item.uri);
      await deletePhotoMeta(uid, name);
    } catch (e) {
      logError('ProgressPhotos.delete', e, { name });
    }
    setReferenceName((prev) => (prev === name ? null : prev));
    setViewerOpen(false);
    await refresh();
  }, [photos, refresh, userId]);

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
  const visibleScans = scans.filter((s) => s?.status !== 'draft' && s?.requiredPosesComplete);
  const latestScan = visibleScans[0] ?? null;

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
        title="Progress Scan"
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
          {suppressed
            ? 'Private to this device. We never upload or sync your photos, and nothing is shared unless you choose to. Guided photos are saved privately and detailed scan estimates are hidden right now. Use these only if they help you, and skip them if they do not.'
            : 'Private to this device. We never upload or sync your photos, and nothing is shared unless you choose to. Progress Scan guides front and back photos, then only explains stored, measured signals.'}
          {readOnly ? ' View-only on the free plan. Your photos are safe and stay yours.' : ''}
        </Text>
        <TouchableOpacity
          onPress={onHowItWorks}
          style={styles.howRow}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="How Progress Scan works"
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.howLink}>How it works</Text>
        </TouchableOpacity>
        {!readOnly ? (
          <Button
            title="Start guided scan"
            icon="scan"
            onPress={openProgressScan}
            fullWidth
            style={styles.scanCta}
            accessibilityLabel="Start guided Progress Scan"
          />
        ) : null}
      </Card>

      {!loading && latestScan ? (
        <Card padding="md" style={styles.scanCard}>
          <View style={styles.scanCardHeader}>
            <Text style={styles.scanTitle}>Latest scan</Text>
            <Text style={styles.scanDate}>{formatDay(latestScan.capturedAt)}</Text>
          </View>
          <Text style={styles.scanBody}>
            {suppressed
              ? 'Scan saved privately. Detailed scan estimates are hidden right now.'
              : latestScan.analysisStatus === 'complete' && latestScan.estimateRangeLow != null
              ? `Estimated range ${latestScan.estimateRangeLow}-${latestScan.estimateRangeHigh}%. ${latestScan.copySummary || 'Use the trend across comparable scans.'}`
              : latestScan.copySummary || 'Saved as a scan. Body-composition estimates are withheld until the analysis is reliable enough.'}
          </Text>
        </Card>
      ) : null}

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

      {/* Neutral timeline navigation: sort order and an optional date range.
          Both are pure viewing controls (spec PART 2): no cadence, no streak,
          no comparison forcing. They compose with the pose filter above and
          read as the same chip family. */}
      {!loading && photos.length > 0 && (
        <View style={styles.controlRow}>
          <View style={styles.sortGroup} accessibilityLabel="Sort order">
            {SORTS.map((s) => {
              const active = s.key === sortOrder;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sortChip, active && styles.filterChipActive]}
                  onPress={() => setSortOrder(s.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={s.a11y}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.datesChip, hasRange && styles.datesChipActive]}
            onPress={() => setRangeOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={hasRange ? `Filter by date, currently ${rangeLabel}. Tap to change.` : 'Filter by date'}
          >
            <Ionicons name="calendar-outline" size={iconSize.sm} color={hasRange ? colors.primary : colors.textMuted} />
            <Text style={[styles.datesChipText, hasRange && styles.datesChipTextActive]} numberOfLines={1}>{rangeLabel}</Text>
            {hasRange ? (
              <TouchableOpacity
                onPress={() => { setRangeFrom(null); setRangeTo(null); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear the date filter"
              >
                <Ionicons name="close-circle" size={iconSize.sm} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
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
          <Text style={styles.emptyText}>
            {poseFilter !== 'all' && hasRange
              ? 'No photos match this pose and date range.'
              : hasRange
                ? 'No photos in this date range.'
                : 'No photos with this pose yet.'}
          </Text>
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
          title={scanFlow ? `${POSE_LABEL[capturePose] || 'Progress'} scan` : undefined}
          subtitle={scanFlow ? 'Set the phone down, step into the frame, and use the timer if needed.' : undefined}
          onCaptured={(name, saved) => {
            if (scanFlow) onScanCaptured(name, saved);
            else { setCaptureOpen(false); openDetailsForCaptured(name, capturePose); }
          }}
          onClose={() => { setCaptureOpen(false); if (scanFlow) discardScanDraft(scanFlow); }}
          onFallback={() => { setCaptureOpen(false); if (scanFlow) discardScanDraft(scanFlow); pickFrom('library'); }}
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

      {/* Date-range filter for the timeline. Neutral navigation only; its own
          Modal, only mounted while open. */}
      <PhotoDateRangeSheet
        visible={rangeOpen}
        fromMs={rangeFrom}
        toMs={rangeTo}
        onApply={({ fromMs, toMs }) => { setRangeFrom(fromMs); setRangeTo(toMs); setRangeOpen(false); }}
        onCancel={() => setRangeOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  infoCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  note: { ...type.bodySm, color: colors.textMuted },
  scanCta: { marginTop: spacing.xs },
  scanCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  scanCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  scanTitle: { ...type.h3, color: colors.textPrimary },
  scanDate: { ...type.caption, color: colors.textMuted },
  scanBody: { ...type.bodySm, color: colors.textMuted },
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
  // Sort + date-range row: same chip family as the pose filter above.
  controlRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  sortGroup: { flexDirection: 'row', gap: spacing.xs, flex: 1 },
  sortChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  datesChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  datesChipActive: { backgroundColor: colors.primaryBg },
  datesChipText: { ...type.label, color: colors.textMuted },
  datesChipTextActive: { color: colors.primary },
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal,
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
  detachProgressScanPhoto,
  deleteProgressScanSession,
  finishProgressScanSession,
  listProgressScanEntries,
} from '../lib/progressScanStore';
import { getUserBodyProfile } from '../lib/database';
import {
  getProgressScanCapturePreferences,
  getProgressScanHideExactPreference,
  setProgressScanHideExactPreference,
} from '../lib/progressScanPreferences';
import {
  analyseProgressScanPhoto,
  assetFieldsFromVisionResult,
  retakeCopyForVisionResult,
} from '../lib/progressScanVision';
import {
  buildScanPhotoNameSet,
  cleanupRetakenScanPose,
  cleanupUnattachedSavedScanPhoto,
  deleteViewerProgressPhoto,
  buildProgressScanFinishPayload,
  buildPhysiqueStudioNextAction,
  enrichProgressPhotos,
  progressCheckInCadenceLabel,
  scanShareItemsFromEntries,
  shouldGateProgressScanStart,
  visibleCompletedScans,
} from '../lib/progressPhotosController';
import {
  buildCheckInTimeline,
  filterAndSort,
} from '../lib/progressPhotoTimeline';
import {
  buildProgressStudioCapturePromptCopy,
  buildProgressStudioHowItWorksCopy,
  buildScanCaptureSubtitle,
} from '../lib/progressCaptureGuide';
import { formatProgressPhotoDay, formatProgressPhotoShortDay } from '../lib/progressPhotoDates';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import ProgressPhotoViewer from '../components/ProgressPhotoViewer';
import ProgressPhotoCompare from '../components/ProgressPhotoCompare';
import ProgressScanCompare from '../components/ProgressScanCompare';
import ProgressScanHistoryCard from '../components/ProgressScanHistoryCard';
import ProgressGhostCapture from '../components/ProgressGhostCapture';
import BeforeAfterShareSheet from '../components/BeforeAfterShareSheet';
import PhotoDetailsSheet from '../components/PhotoDetailsSheet';
import PhotoDateRangeSheet from '../components/PhotoDateRangeSheet';

// expo-image-picker is a native module; lazy-require so the screen imports in
// the node test env (mirrors ShareCardScreen).
let ImagePicker;
try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }

// Pose filter chips. 'all' shows every photo; the others narrow to a pose so
// like compares with like (spec §3.3). Function-neutral labels.
const POSES = [
  { key: 'all', label: 'All' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];
const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };
const CORE_POSES = ['front', 'side', 'back'];
const PROGRESS_SCAN_MIN_INTERVAL_MS = 14 * 86400000;
const PROGRESS_SCAN_LIBRARY_LIMIT = 100;

// Timeline sort. Newest-first is the unchanged default; oldest-first lets
// someone read forwards from their first photo. Neutral temporal wording only,
// never "before/after" or any transformation framing (spec PART 2).
const SORTS = [
  { key: 'newest', label: 'Newest', a11y: 'Sort newest first' },
  { key: 'oldest', label: 'Oldest', a11y: 'Sort oldest first' },
];

export { buildCheckInTimeline, filterAndSort, scanShareItemsFromEntries };

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
  const canWrite = useCallback(() => useAppStore.getState().tier === 'pro', []);

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
  const [scanCompareOpen, setScanCompareOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureReference, setCaptureReference] = useState(null);
  const [capturePose, setCapturePose] = useState(null);
  const [scanFlow, setScanFlow] = useState(null);
  const [scans, setScans] = useState([]);
  const [hideExactScans, setHideExactScans] = useState(false);

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
  const refreshRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    const isCurrentRefresh = () => refreshRequestRef.current === requestId;
    setLoading(true);
    try {
      // Fail CLOSED: read the raw wellbeing flag rather than getWellbeingMode()
      // (which swallows a storage read error down to 'unspecified'). A genuine
      // read failure must be treated as calm/suppressed.
      const [rows, scanRows, mode, hideExact] = await Promise.all([
        listProgressPhotos(userId),
        userId ? listProgressScanEntries(userId, PROGRESS_SCAN_LIBRARY_LIMIT).catch(() => []) : Promise.resolve([]),
        AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
        getProgressScanHideExactPreference(),
      ]);
      // Load the per-photo metadata (taken_at, pose) for the dated, pose-typed
      // timeline. Missing rows resolve to filename-derived defaults, so this
      // never requires a row to exist.
      let map = null;
      try {
        map = await getPhotoMetaMap(rows.map((r) => r.name), userId);
      } catch (e) {
        if (isCurrentRefresh()) logError('ProgressPhotos.loadMeta', e, { count: rows.length });
      }
      if (!isCurrentRefresh()) return;
      setPhotos(rows);
      setScans(scanRows || []);
      setCalm(isCalm(mode) || mode === 'read_failed');
      setHideExactScans(!!hideExact);
      if (map) setMetaMap(map);
      // A dangling reference must never point at a photo that no longer exists.
      setReferenceName((prev) => (prev && rows.some((r) => r.name === prev) ? prev : null));
    } catch (_) { /* tolerate */ }
    finally { if (isCurrentRefresh()) setLoading(false); }
  }, [userId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function pickFrom(source) {
    // Live-tier re-check (hostile review E10 #1 class): the add alert can be
    // open when the tier flips pro-to-free; its callback must not save then.
    if (!canWrite()) return;
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

  async function pickScanPoseFromLibrary(flow = scanFlow, pose = capturePose) {
    if (!canWrite()) return;
    if (!flow?.scanId || !pose) {
      pickFrom('library');
      return;
    }
    if (!ImagePicker) { toast.show('Photos need a rebuild on this device.', { variant: 'warning' }); return; }
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        quality: 0.7,
      });
      if (result?.canceled) return;
      const uri = result?.assets?.[0]?.uri;
      if (!uri) return;
      if (!canWrite()) return;
      const uid = useAppStore.getState().user?.id ?? userId;
      const saved = await saveProgressPhoto(uri, undefined, uid);
      if (!saved?.name || !saved?.uri) throw new Error('progress_scan_library_save_failed');
      if (!canWrite()) {
        await cleanupUnattachedSavedScanPhoto({
          userId: uid,
          name: saved.name,
          saved,
          deleteProgressPhoto,
          deletePhotoMeta,
        });
        return;
      }
      await upsertPhotoMeta(uid, saved.name, { pose });
      if (!canWrite()) {
        await cleanupUnattachedSavedScanPhoto({
          userId: uid,
          name: saved.name,
          saved,
          deleteProgressPhoto,
          deletePhotoMeta,
        });
        return;
      }
      setBusy(false);
      await onScanCaptured(saved.name, saved);
    } catch (e) {
      logError('ProgressPhotos.scanLibraryPose', e, { userId, pose });
      toast.show('Could not add that scan photo. Please try again.', { variant: 'error' });
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
    if (!canWrite()) { resetPending(); return; }
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
  const enriched = useMemo(() => enrichProgressPhotos(photos, metaMap), [photos, metaMap]);

  // The current scope: pose filter, then date-range filter, then sort. Defaults
  // (all poses, no range, newest-first) reproduce the previous behaviour exactly.
  const filtered = useMemo(
    () => filterAndSort(enriched, {
      poseFilter, sortOrder, rangeFrom, rangeTo,
    }),
    [enriched, poseFilter, sortOrder, rangeFrom, rangeTo],
  );

  const timeline = useMemo(() => buildCheckInTimeline(filtered), [filtered]);
  const allCheckIns = useMemo(
    () => buildCheckInTimeline(filterAndSort(enriched, { sortOrder: 'newest' }))
      .filter((item) => item.type === 'checkin'),
    [enriched],
  );

  const hasRange = Number.isFinite(rangeFrom) || Number.isFinite(rangeTo);
  // Plain label for the date-range pill; "to" reads calmer than a dash and
  // sidesteps the em-dash lint entirely.
  const rangeLabel = hasRange
    ? `${Number.isFinite(rangeFrom) ? formatProgressPhotoShortDay(rangeFrom) : 'Any'} to ${Number.isFinite(rangeTo) ? formatProgressPhotoShortDay(rangeTo) : 'Any'}`
    : 'Any dates';

  function openGhostCapture() {
    if (!canWrite()) return;
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
    if (!canWrite() || !userId) return;
    const cadence = shouldGateProgressScanStart(scans, Date.now(), PROGRESS_SCAN_MIN_INTERVAL_MS);
    if (cadence.gated) {
      appAlert('Give the scan time', 'Physique Scan works best when like-for-like scans are at least 2 to 4 weeks apart. You can still capture a normal Check-In today and save the photos without forcing a scan read.', [
        { text: 'Capture Check-In', onPress: openGhostCapture },
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }
    try {
      const capturePrefs = await getProgressScanCapturePreferences();
      if (!canWrite()) return;
      const session = await createProgressScanSession(userId, capturePrefs);
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

  async function toggleHideExactScans() {
    const next = !hideExactScans;
    setHideExactScans(next);
    await setProgressScanHideExactPreference(next);
  }

  async function abandonLapsedScanFlow(flow, name = null, saved = null) {
    const uid = useAppStore.getState().user?.id ?? userId;
    setCaptureOpen(false);
    setCapturePose(null);
    setScanFlow(null);
    await cleanupUnattachedSavedScanPhoto({
      userId: uid,
      name,
      saved,
      deleteProgressPhoto,
      deletePhotoMeta,
    });
    if (uid && flow?.scanId) await deleteProgressScanSession(uid, flow.scanId, { deleteFiles: true }).catch(() => false);
    await refresh();
  }

  async function finishScan(scanId) {
    if (!userId || !scanId) return;
    if (!canWrite()) {
      await abandonLapsedScanFlow({ scanId });
      return;
    }
    try {
      const profile = useAppStore.getState().userProfile || {};
      const bodyProfile = await getUserBodyProfile(userId).catch(() => null);
      if (!canWrite()) {
        await abandonLapsedScanFlow({ scanId });
        return;
      }
      await finishProgressScanSession(userId, scanId, buildProgressScanFinishPayload(profile, bodyProfile, userSex));
      setScans(await listProgressScanEntries(userId, PROGRESS_SCAN_LIBRARY_LIMIT));
      await refresh();
    } catch (e) {
      logError('ProgressPhotos.finishScan', e, { userId, scanId });
      toast.show('The scan was saved, but analysis could not finish.', { variant: 'warning' });
    }
  }

  async function continueScanAfterPose(flow, pose) {
    if (pose === 'front') {
      setScanFlow({ scanId: flow.scanId, pose: 'back' });
      setCapturePose('back');
      appAlert('Front saved', 'Turn around for the back photo. Use the timer if you need to step into position.', [
        { text: 'Continue', onPress: () => { if (!canWrite()) { abandonLapsedScanFlow(flow); return; } setCaptureOpen(true); } },
      ], { cancelable: false });
      return;
    }
    if (pose === 'back') {
      appAlert('Back saved', 'A side photo is optional. It can help line up future scans, but you can finish now.', [
        { text: 'Finish scan', onPress: () => { if (!canWrite()) { abandonLapsedScanFlow(flow); return; } setScanFlow(null); finishScan(flow.scanId); } },
        { text: 'Take side', onPress: () => { if (!canWrite()) { abandonLapsedScanFlow(flow); return; } setScanFlow({ scanId: flow.scanId, pose: 'side' }); setCapturePose('side'); setCaptureOpen(true); } },
      ], { cancelable: false });
      return;
    }
    setScanFlow(null);
    await finishScan(flow.scanId);
  }

  async function saveScanAssetAndContinue(flow, pose, name, saved, vision) {
    if (!canWrite()) {
      await abandonLapsedScanFlow(flow, name, saved);
      return;
    }
    const assetFields = assetFieldsFromVisionResult(vision);
    const inserted = await addProgressScanAsset(userId, flow.scanId, {
      pose,
      photoName: name,
      uri: saved.uri,
      takenAt: saved.ts ?? Date.now(),
      ...assetFields,
    });
    if (!inserted) {
      await cleanupUnattachedSavedScanPhoto({
        userId,
        name,
        saved,
        deleteProgressPhoto,
        deletePhotoMeta,
      });
      throw new Error('progress_scan_asset_save_failed');
    }
    await continueScanAfterPose(flow, pose);
  }

  async function retakeScanPose(flow, pose, name, saved) {
    try {
      if (!canWrite()) {
        await abandonLapsedScanFlow(flow, name, saved);
        return;
      }
      await cleanupRetakenScanPose({
        userId,
        name,
        saved,
        deleteProgressPhoto,
        deletePhotoMeta,
      });
      setScanFlow({ scanId: flow.scanId, pose });
      setCapturePose(pose);
      setCaptureOpen(true);
    } catch (e) {
      logError('ProgressPhotos.scanRetakeDelete', e, { userId, pose });
      toast.show('Could not remove that photo. Please try again.', { variant: 'error' });
    }
  }

  async function discardScanDraft(flow = scanFlow) {
    const scanId = flow?.scanId;
    setCapturePose(null);
    if (!userId || !scanId) {
      setScanFlow(null);
      return;
    }
    try {
      const deleted = await deleteProgressScanSession(userId, scanId, { deleteFiles: true });
      if (!deleted) throw new Error('progress_scan_discard_failed');
      setScanFlow(null);
      setScans(await listProgressScanEntries(userId, PROGRESS_SCAN_LIBRARY_LIMIT));
      await refresh();
    } catch (e) {
      logError('ProgressPhotos.discardScan', e, { userId, scanId });
      setScanFlow(flow);
      toast.show('Could not remove that draft scan. Please try again.', { variant: 'error' });
    }
  }

  async function deleteScanEntry(scan) {
    if (!userId || !scan?.id || readOnly) return;
    appAlert('Delete scan?', 'This removes the scan photos and stored scan analysis from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const deleted = await deleteProgressScanSession(userId, scan.id, { deleteFiles: true });
            if (!deleted) throw new Error('progress_scan_delete_failed');
            await refresh();
          } catch (e) {
            logError('ProgressPhotos.deleteScan', e, { userId, scanId: scan.id });
            toast.show('Could not delete that scan. Please try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  async function onScanCaptured(name, saved) {
    const flow = scanFlow;
    const pose = capturePose;
    setCaptureOpen(false);
    if (!flow?.scanId || !pose || !saved?.uri) {
      openDetailsForCaptured(name, pose);
      return;
    }
    if (!canWrite()) {
      await abandonLapsedScanFlow(flow, name, saved);
      return;
    }
    try {
      setBusy(true);
      const vision = await analyseProgressScanPhoto({ uri: saved.uri, pose });
      setBusy(false);
      if (!canWrite()) {
        await abandonLapsedScanFlow(flow, name, saved);
        return;
      }
      const retakeCopy = retakeCopyForVisionResult(vision);
      if (retakeCopy) {
        appAlert('Retake this photo?', retakeCopy, [
          { text: 'Retake', onPress: () => retakeScanPose(flow, pose, name, saved) },
          {
            text: 'Save without estimate',
            onPress: () => {
              saveScanAssetAndContinue(flow, pose, name, saved, vision).catch((e) => {
                logError('ProgressPhotos.scanSaveAfterRetakePrompt', e, { userId, pose });
                toast.show('Could not save that scan photo. Please try again.', { variant: 'error' });
              });
            },
          },
        ], { cancelable: false });
        return;
      }
      appAlert('Use this photo?', 'Check the pose, framing and lighting. Use it only if it looks like a fair like-for-like scan photo.', [
        { text: 'Retake', onPress: () => retakeScanPose(flow, pose, name, saved) },
        {
          text: 'Use photo',
          onPress: () => {
            saveScanAssetAndContinue(flow, pose, name, saved, vision).catch((e) => {
              logError('ProgressPhotos.scanUsePhoto', e, { userId, pose });
              toast.show('Could not save that scan photo. Please try again.', { variant: 'error' });
            });
          },
        },
      ], { cancelable: false });
    } catch (e) {
      logError('ProgressPhotos.scanCaptured', e, { userId, pose });
      toast.show('Could not save that scan photo. Please try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function onAdd() {
    appAlert('Capture check-in', buildProgressStudioCapturePromptCopy(), [
      { text: 'Start Physique Scan', onPress: openProgressScan },
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
      'How Physique Studio works',
      buildProgressStudioHowItWorksCopy(),
      [{ text: 'Got it' }],
    );
  }

  function openViewer(name) {
    setViewerName(name);
    setViewerOpen(true);
  }

  function openCheckInPoseCapture(item, pose) {
    if (!canWrite() || !item?.cover?.uri || !pose) return;
    setScanFlow(null);
    setCaptureReference({ uri: item.cover.uri });
    setCapturePose(pose);
    setCaptureOpen(true);
  }

  // Real delete wiring: remove the file AND its metadata row, then refresh.
  // Re-checks the live tier (a pro-to-free flip with the confirm open must not
  // delete); the viewer also re-checks before calling this.
  const onViewerDelete = useCallback(async (name) => {
    if (!canWrite()) return;
    const uid = useAppStore.getState().user?.id ?? userId;
    try {
      await deleteViewerProgressPhoto({
        userId: uid,
        name,
        photos,
        detachProgressScanPhoto,
        deletePhotoMeta,
        deleteProgressPhoto,
      });
    } catch (e) {
      logError('ProgressPhotos.delete', e, { name });
      toast.show('Could not delete that photo. Please try again.', { variant: 'error' });
      return;
    }
    setReferenceName((prev) => (prev === name ? null : prev));
    setViewerOpen(false);
    await refresh();
  }, [canWrite, photos, refresh, toast, userId]);

  function openCompare() { setCompareOpen(true); }
  function openScanCompare() { setScanCompareOpen(true); }
  function openShare() { setShareOpen(true); }

  // NEW high-risk surfaces are withheld under the shared suppression gate
  // (fail-closed): the comparison entry and the share card. Viewing the dated
  // timeline and delete stay available. Share is additionally Pro-gated.
  const visibleScans = useMemo(
    () => visibleCompletedScans(scans),
    [scans],
  );
  const scanPhotoNames = useMemo(() => buildScanPhotoNameSet(visibleScans), [visibleScans]);
  const scanShareItems = scanShareItemsFromEntries(visibleScans);
  const viewerPhotos = scanPhotoNames.has(viewerName) ? enriched : filtered;
  const canCompareScans = !loading && visibleScans.length >= 2 && !suppressed;
  const canCompare = !loading && photos.length >= 2 && !suppressed;
  const canShare = !loading && !readOnly && (scanShareItems.length >= 2 || photos.length >= 2) && !suppressed;
  const showShareAction = canShare;
  const latestPhoto = useMemo(() => {
    if (!Array.isArray(enriched) || enriched.length === 0) return null;
    return [...enriched].sort((a, b) => (Number(b.takenAt) || 0) - (Number(a.takenAt) || 0))[0] || null;
  }, [enriched]);
  const latestScan = useMemo(() => {
    if (!Array.isArray(visibleScans) || visibleScans.length === 0) return null;
    return [...visibleScans].sort((a, b) => (Number(b.capturedAt) || Number(b.captured_at) || 0) - (Number(a.capturedAt) || Number(a.captured_at) || 0))[0] || null;
  }, [visibleScans]);
  const latestAssessment = latestScan?.signals?.physiqueAssessment || null;
  const lastCheckInLabel = latestPhoto ? formatProgressPhotoDay(latestPhoto.takenAt) : 'No check-in yet';
  const nextCheckInLabel = progressCheckInCadenceLabel(latestPhoto?.takenAt, Date.now(), PROGRESS_SCAN_MIN_INTERVAL_MS);
  const scanStatusLabel = suppressed
    ? 'Hidden'
    : latestAssessment?.scanConfidenceLabel || latestScan?.qualityLabel || (latestScan ? 'Saved' : 'No scan yet');
  const progressSignalText = suppressed
    ? 'Scan details are hidden right now. Your photos remain private on this device.'
    : latestAssessment?.progressSignalLabel
      ? `${latestAssessment.progressSignalLabel}. This is a visual progress signal, not a body-fat percentage.`
      : latestScan?.copySummary || (latestPhoto
        ? 'Your latest check-in is saved. Use the same setup next time for a cleaner comparison.'
        : 'Build your first visual baseline with a private, repeatable check-in.');
  const confidenceText = suppressed
    ? 'Photos and scan details stay under your control. Nothing is uploaded or shared unless you choose it.'
    : latestScan
      ? 'Best results come from matched pose, full-body framing and repeatable lighting. Photos stay on this device unless you choose to share or export them.'
      : 'Use front, side and back photos under the same lighting. Photos stay on this device unless you choose to share or export them.';
  const nextAction = useMemo(
    () => buildPhysiqueStudioNextAction({
      checkIns: allCheckIns,
      scans: visibleScans,
      suppressed,
      readOnly,
    }),
    [allCheckIns, visibleScans, suppressed, readOnly],
  );

  function onNextActionPress(action = nextAction) {
    if (!action) return;
    if (action.kind === 'complete_pose') {
      openCheckInPoseCapture(action.checkIn, action.pose);
    } else if (action.kind === 'compare_scans') {
      openScanCompare();
    } else if (action.kind === 'compare_checkins') {
      openCompare();
    } else if (action.kind === 'capture') {
      onAdd();
    }
  }

  function renderCheckInCard(item) {
    const dateLabel = item.label || formatProgressPhotoDay(item.takenAt);
    const missingPoses = CORE_POSES.filter((pose) => !item.poses.includes(pose));
    const nextMissingPose = missingPoses[0] || null;
    const poseSummary = missingPoses.length === 0
      ? 'Full set'
      : `${item.poses.length}/${CORE_POSES.length} poses`;
    const weightText = Number.isFinite(item.weightKg) ? `${item.weightKg.toFixed(1)} kg` : null;
    const cover = item.cover || item.photos[0];
    return (
      <TouchableOpacity
        key={item.key}
        // E10 read-only: opening the editable viewer would expose writes
        // (pose/date/note), so a plain tap is inert in the view-only state;
        // Compare (pure viewing) stays available below.
        onPress={readOnly ? undefined : () => openViewer(cover.name)}
        disabled={readOnly}
        accessibilityRole={readOnly ? 'image' : 'button'}
        accessibilityLabel={readOnly
          ? `Check-in from ${dateLabel}.`
          : `Check-in from ${dateLabel}. Tap to open.`}
        style={styles.checkInCard}
      >
        <View style={styles.checkInCover}>
          <Image source={{ uri: cover.uri }} style={styles.checkInCoverImage} resizeMethod="resize" />
          <View pointerEvents="none" style={styles.checkInCoverBadge}>
            <Ionicons name="images-outline" size={13} color={colors.onPrimary} />
            <Text style={styles.checkInCoverBadgeText}>{item.photos.length}</Text>
          </View>
        </View>
        <View style={styles.checkInBody}>
          <View style={styles.checkInTopRow}>
            <View style={styles.checkInTitleBlock}>
              <Text style={styles.checkInDate} numberOfLines={1}>{dateLabel}</Text>
              <Text style={styles.checkInMeta} numberOfLines={1}>
                {poseSummary}{weightText ? ` - ${weightText}` : ''}
              </Text>
            </View>
            {!readOnly ? <Ionicons name="chevron-forward" size={iconSize.md} color={colors.textMuted} /> : null}
          </View>
          <View style={styles.setupQualityRow}>
            <View style={[styles.setupQualityPill, item.setupQuality?.key === 'complete' && styles.setupQualityPillStrong]}>
              <Ionicons
                name={item.setupQuality?.key === 'complete' ? 'checkmark-circle-outline' : 'scan-outline'}
                size={13}
                color={item.setupQuality?.key === 'complete' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.setupQualityText,
                  item.setupQuality?.key === 'complete' && styles.setupQualityTextStrong,
                ]}
              >
                {item.setupQuality?.label || 'Setup saved'}
              </Text>
            </View>
          </View>
          <View style={styles.checkInPoseRow}>
            {CORE_POSES.map((pose) => {
              const complete = item.poses.includes(pose);
              return (
                <View key={pose} style={[styles.checkInPoseChip, complete && styles.checkInPoseChipDone]}>
                  <Text style={[styles.checkInPoseText, complete && styles.checkInPoseTextDone]}>
                    {POSE_LABEL[pose]}
                  </Text>
                </View>
              );
            })}
          </View>
          {item.note ? <Text style={styles.checkInNote} numberOfLines={2}>{item.note}</Text> : null}
          {missingPoses.length > 0 ? (
            <Text style={styles.checkInHint} numberOfLines={2}>
              Add {missingPoses.map((pose) => POSE_LABEL[pose].toLowerCase()).join(', ')} next time for a stronger like-for-like check-in.
            </Text>
          ) : (
            <Text style={styles.checkInHint} numberOfLines={2}>
              Matched front, side and back photos are ready for cleaner comparison.
            </Text>
          )}
          {!readOnly && nextMissingPose ? (
            <TouchableOpacity
              onPress={() => openCheckInPoseCapture(item, nextMissingPose)}
              style={styles.completeCheckInButton}
              accessibilityRole="button"
              accessibilityLabel={`Complete this Check-In with a ${POSE_LABEL[nextMissingPose]} photo`}
            >
              <Ionicons name="camera-outline" size={iconSize.sm} color={colors.primary} />
              <Text style={styles.completeCheckInText}>
                Complete with {POSE_LABEL[nextMissingPose]}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Standard pushed-screen scaffold (BackHeader), matching Partners and the
          rest of the app. The add action rides the header's right slot; it is a
          write, so it is hidden in the E10 view-only lapse state. */}
      <BackHeader
        title="Physique Studio"
        onBack={() => navigation.goBack()}
        right={!readOnly ? (
          <TouchableOpacity onPress={onAdd} disabled={busy} hitSlop={12} accessibilityRole="button" accessibilityLabel="Capture check-in">
            {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="add" size={26} color={colors.primary} />}
          </TouchableOpacity>
        ) : null}
      />

      <Card padding="none" style={styles.studioHero}>
        <View style={styles.heroImageFrame}>
          {latestPhoto ? (
            <Image source={{ uri: latestPhoto.uri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="body-outline" size={38} color={colors.textMuted} />
              <Text style={styles.heroPlaceholderText}>Private check-ins</Text>
            </View>
          )}
          <View style={styles.heroScrim} />
          <View style={styles.heroTopRow}>
            <View style={styles.privacyPill}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.onPrimary} />
              <Text style={styles.privacyPillText}>Private on this device</Text>
            </View>
            <TouchableOpacity
              onPress={onHowItWorks}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="How Physique Studio works"
              style={styles.heroInfoButton}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Physique Studio</Text>
            <Text style={styles.heroTitle}>Capture like-for-like check-ins.</Text>
            <Text style={styles.heroSubtitle}>Same setup. Same poses. Clearer comparisons over time.</Text>
          </View>
        </View>

        <View style={styles.studioPanel}>
          <View style={styles.statStrip}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Last</Text>
              <Text style={styles.statValue} numberOfLines={1}>{lastCheckInLabel}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Next</Text>
              <Text style={styles.statValue} numberOfLines={1}>{nextCheckInLabel}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Scan</Text>
              <Text style={styles.statValue} numberOfLines={1}>{scanStatusLabel}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            {!readOnly ? (
              <Button
                title="Capture Check-In"
                icon="camera-outline"
                onPress={onAdd}
                fullWidth={false}
                style={styles.heroPrimaryAction}
                accessibilityLabel="Capture check-in"
              />
            ) : null}
            {!readOnly ? (
              <Button
                title="Scan"
                icon="scan"
                variant="secondary"
                onPress={openProgressScan}
                fullWidth={false}
                style={styles.heroSecondaryAction}
                accessibilityLabel="Start guided Physique Scan"
              />
            ) : null}
            {(canCompareScans || canCompare) ? (
              <Button
                title="Compare"
                icon="git-compare-outline"
                variant="tertiary"
                onPress={canCompareScans ? openScanCompare : openCompare}
                fullWidth={false}
                style={styles.heroSecondaryAction}
                accessibilityLabel={canCompareScans ? 'Compare two Physique Scan entries' : 'Compare two photos'}
              />
            ) : null}
          </View>

          <View style={styles.signalCard}>
            <Text style={styles.signalTitle}>Current signal</Text>
            <Text style={styles.signalBody}>{progressSignalText}</Text>
            <Text style={styles.signalSupport}>{confidenceText}</Text>
          </View>
          {readOnly ? (
            <Text style={styles.readOnlyNote}>View-only on the free plan. Your photos are safe and stay yours.</Text>
          ) : null}
        </View>
      </Card>

      {!loading && visibleScans.length > 0 ? (
        <ProgressScanHistoryCard
          scans={visibleScans}
          hideExact={hideExactScans}
          suppressed={suppressed}
          readOnly={readOnly}
          onToggleHideExact={toggleHideExactScans}
          onDeleteScan={deleteScanEntry}
          onOpenPhoto={openViewer}
        />
      ) : null}

      {!loading && nextAction ? (
        <Card style={styles.nextActionCard}>
          <View style={styles.nextActionCopy}>
            <Text style={styles.nextActionEyebrow}>Next best action</Text>
            <Text style={styles.nextActionTitle}>{nextAction.title}</Text>
            <Text style={styles.nextActionBody}>{nextAction.body}</Text>
          </View>
          <Button
            title={nextAction.cta}
            icon={nextAction.kind === 'capture' || nextAction.kind === 'complete_pose' ? 'camera-outline' : 'git-compare-outline'}
            variant={nextAction.kind === 'capture' ? 'primary' : 'secondary'}
            fullWidth={false}
            onPress={() => onNextActionPress(nextAction)}
            accessibilityLabel={`Next best action: ${nextAction.cta}`}
          />
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
                hitSlop={8}
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
                  hitSlop={8}
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

      {showShareAction && (
        <View style={styles.actionRow}>
          <Button
            title={scanShareItems.length >= 2 ? 'Share scan' : 'Share photos'}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            icon="share-outline"
            onPress={openShare}
            accessibilityLabel="Share progress"
          />
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
              <Text style={styles.emptyTitle}>Build your visual baseline</Text>
              <Text style={styles.emptyHint}>
                Capture your first private check-in with front, side or back photos.
                Use the same setup next time so comparisons stay fair.
              </Text>
              <Button
                title="Capture Check-In"
                icon="camera-outline"
                onPress={onAdd}
                fullWidth={false}
                style={styles.emptyAdd}
                accessibilityLabel="Capture check-in"
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
            return renderCheckInCard(item);
          }}
        />
      )}

      {/* Full-size viewer (pose/date/note, weight gated by suppression). Own
          Modal; only mounted while open. */}
      {viewerOpen ? (
        <ProgressPhotoViewer
          photos={viewerPhotos}
          initialName={viewerName}
          onClose={() => setViewerOpen(false)}
          onDelete={onViewerDelete}
          onCompareFrom={() => { setViewerOpen(false); openCompare(); }}
          onSetReference={(name) => setReferenceName(name)}
          hideWeight={hideExactScans && scanPhotoNames.has(viewerName)}
        />
      ) : null}

      {/* Scan comparison. This is the Physique Scan specific over-time view:
          dated entries, visual score/band context, measured deltas, and
          pose-matched photos. It self-suppresses through usePhotoSuppression
          too. */}
      <Modal
        visible={scanCompareOpen}
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setScanCompareOpen(false)}
      >
        <ProgressScanCompare
          scans={visibleScans}
          hideExact={hideExactScans}
          onClose={() => setScanCompareOpen(false)}
        />
      </Modal>

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
        onRequestClose={() => { setCaptureOpen(false); if (scanFlow) discardScanDraft(scanFlow); }}
      >
        <ProgressGhostCapture
          referencePhoto={captureReference}
          pose={capturePose}
          title={scanFlow ? `${POSE_LABEL[capturePose] || 'Progress'} scan` : undefined}
          subtitle={scanFlow ? buildScanCaptureSubtitle(capturePose) : undefined}
          onCaptured={(name, saved) => {
            if (scanFlow) onScanCaptured(name, saved);
            else { setCaptureOpen(false); openDetailsForCaptured(name, capturePose); }
          }}
          onClose={() => { setCaptureOpen(false); if (scanFlow) discardScanDraft(scanFlow); }}
          onFallback={() => { setCaptureOpen(false); if (scanFlow) pickScanPoseFromLibrary(scanFlow, capturePose); else pickFrom('library'); }}
        />
      </Modal>

      {/* Before/after share card. Self-gates Pro + suppression; the entry above
          is gated too. */}
      <Modal
        visible={shareOpen}
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setShareOpen(false)}
      >
        <BeforeAfterShareSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          photos={scanShareItems.length >= 2 ? scanShareItems : photos}
          hideScanRange={hideExactScans}
        />
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
  studioHero: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroImageFrame: {
    minHeight: 260,
    backgroundColor: colors.surface2,
  },
  heroImage: {
    width: '100%',
    height: 260,
    backgroundColor: colors.surface2,
  },
  heroPlaceholder: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface2,
  },
  heroPlaceholderText: { ...type.bodySm, color: colors.textMuted },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    opacity: 0.45,
  },
  heroTopRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.scrim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  privacyPillText: { ...type.caption, color: colors.appleBtnText },
  heroInfoButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  heroCopy: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: { ...type.caption, color: colors.appleBtnText, opacity: 0.82 },
  heroTitle: { ...type.h2, color: colors.appleBtnText },
  heroSubtitle: { ...type.bodySm, color: colors.appleBtnText, opacity: 0.88 },
  studioPanel: { padding: spacing.lg, gap: spacing.md },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.xxs,
  },
  statDivider: { width: 1, backgroundColor: colors.border },
  statLabel: { ...type.caption, color: colors.textMuted },
  statValue: { ...type.label, color: colors.textPrimary },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroPrimaryAction: { flexGrow: 1 },
  heroSecondaryAction: { flexGrow: 1 },
  signalCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  signalTitle: { ...type.label, color: colors.textPrimary },
  signalBody: { ...type.bodySm, color: colors.textSecondary },
  signalSupport: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  readOnlyNote: { ...type.caption, color: colors.textMuted },
  nextActionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  nextActionCopy: { gap: spacing.xs },
  nextActionEyebrow: {
    ...type.caption,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  nextActionTitle: { ...type.label, color: colors.textPrimary },
  nextActionBody: { ...type.bodySm, color: colors.textMuted, lineHeight: 20 },
  filterRow: {
    flexDirection: 'row', gap: spacing.xs,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  filterChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 44, paddingVertical: spacing.sm,
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
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 44, paddingVertical: spacing.sm,
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  datesChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1,
    minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  datesChipActive: { backgroundColor: colors.primaryBg },
  datesChipText: { ...type.label, color: colors.textMuted },
  datesChipTextActive: { color: colors.primary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  monthHeader: { ...type.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  checkInCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  checkInCover: {
    width: 104,
    minHeight: 132,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  checkInCoverImage: { width: '100%', height: '100%' },
  checkInCoverBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.scrim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  checkInCoverBadgeText: { ...type.caption, color: colors.onPrimary },
  checkInBody: { flex: 1, gap: spacing.sm, paddingVertical: spacing.xs },
  checkInTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  checkInTitleBlock: { flex: 1 },
  checkInDate: { ...type.label, color: colors.textPrimary },
  checkInMeta: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  setupQualityRow: { flexDirection: 'row', alignItems: 'center' },
  setupQualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  setupQualityPillStrong: { backgroundColor: colors.primaryBg },
  setupQualityText: { ...type.caption, color: colors.textMuted },
  setupQualityTextStrong: { color: colors.primary },
  checkInPoseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  checkInPoseChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.surface2,
  },
  checkInPoseChipDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  checkInPoseText: { ...type.caption, color: colors.textMuted },
  checkInPoseTextDone: { color: colors.primary },
  checkInNote: { ...type.bodySm, color: colors.textSecondary },
  checkInHint: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  completeCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 40,
    paddingVertical: spacing.xs,
  },
  completeCheckInText: { ...type.label, color: colors.primary },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  emptyTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  emptyHint: { ...type.bodySm, color: colors.textMuted, textAlign: 'center' },
  emptyAdd: { marginTop: spacing.md },
});

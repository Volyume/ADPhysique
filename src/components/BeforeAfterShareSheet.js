/**
 * BeforeAfterShareSheet — the founder-approved two-photo progress share card
 * (progress-photos §3.8, S1 execution, S2 single-file mechanism).
 *
 * Picks two progress photos (default earliest vs latest), shows a one-time
 * confirm, then composites BOTH photos + their dates + weights + the elapsed
 * badge + the wordmark into ONE image via the existing Skia `drawShareCard`
 * pipeline and shares it as a SINGLE local file through `expo-sharing`
 * (`MediaLibrary` for save). Every surface and platform produces the same one
 * composited PNG — never a multi-attach, never a raw file (S2 §1).
 *
 * SAFETY (fail-closed, ahead of everything):
 *   - WITHHELD ENTIRELY when usePhotoSuppression() is true (open ED-pattern flag
 *     OR calm mode). The suppression check sits BEFORE compose/encode/share, so
 *     a suppressed user never reaches the two-photo export at all (§3.8, PART 2).
 *     The whole card is withheld, not merely weight-stripped.
 *   - Pro-gated: generation re-checks tier live (a pro-to-free flip mid-flow
 *     must not generate), and the sheet renders nothing for a non-Pro user.
 *   - Weight-on-card is a FOUNDER-APPROVED override of the locked "share cards
 *     never include bodyweight" rule (DECISIONS #2). It is a user toggle
 *     (default on) and is bounded by the suppression withhold above;
 *     name/measurements/private notes stay banned. The integrator records the
 *     decision and updates the locked-rule note + the screen's privacy line.
 *
 * The share is OFFERED, never pushed: no nag, no urgency, no streak, calm voice.
 */
import {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type,
} from '../styles/theme';
import { useToast } from './Toast';
import { appAlert } from './AppAlert';
import useAppStore from '../store/useAppStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { getPhotoMetaMap } from '../lib/progressPhotoMeta';
import { formatBodyWeight } from '../lib/units';
import { logError } from '../lib/errorLog';
import { drawShareCard, cardHeight } from '../lib/shareCard/drawShareCard';

// Optional native modules, guarded so the sheet still mounts (tests, or before a
// rebuild) without them; generation just can't run until a real build provides
// Skia + the sharing packages (mirrors ShareCardScreen).
let FileSystem; let Sharing; let Asset; let Skia; let matchFont; let MediaLibrary;
try { FileSystem = require('expo-file-system/legacy'); } catch (_) { /* optional */ }
try { Sharing = require('expo-sharing'); } catch (_) { /* optional */ }
try { Asset = require('expo-asset').Asset; } catch (_) { /* optional */ }
try { MediaLibrary = require('expo-media-library'); } catch (_) { /* optional */ }
try { const S = require('@shopify/react-native-skia'); Skia = S.Skia; matchFont = S.matchFont; } catch (_) { /* optional */ }

const WORDMARK = require('../../assets/volyume-wordmark.png');
const FONT_FAMILY = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' });
const PREVIEW_RENDER_W = 640; // render crisp, display scaled down
const PREVIEW_DISPLAY_W = 300;
const DAY_MS = 86400000;
// One-time confirm flag: once the user has acknowledged that this makes a
// shareable image of their photos, we don't ask again.
const CONFIRM_KEY = 'progressShareConfirmed';

// ── pure helpers (exported for unit tests) ───────────────────────────────────

/** British short date, e.g. "3 Mar 2026". Empty string for a bad timestamp. */
export function formatCardDate(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n)) return '';
  try {
    return new Date(n).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) { return ''; }
}

/**
 * Neutral elapsed-time label between two timestamps, e.g. "14 weeks", "6 months".
 * Time stated plainly, never framed as a transformation. Empty for bad input.
 */
export function elapsedLabel(fromMs, toMs) {
  const a = Number(fromMs); const b = Number(toMs);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  const days = Math.max(0, Math.round(Math.abs(b - a) / DAY_MS));
  if (days <= 0) return 'Same day';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  // Weeks up to ~6 months (matches how progress is spoken: "14 weeks"), then
  // months, then years.
  if (days < 182) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30.44);
    return months === 1 ? '1 month' : `${months} months`;
  }
  const years = Math.floor(days / 365);
  const remMonths = Math.round((days - years * 365) / 30.44);
  const yStr = years === 1 ? '1 year' : `${years} years`;
  if (remMonths <= 0) return yStr;
  const mStr = remMonths === 1 ? '1 month' : `${remMonths} months`;
  return `${yStr} ${mStr}`;
}

/**
 * Order two photo items (each `{ name, ts }`) as [older, newer] by timestamp,
 * so the card is always older-left / newer-right whatever the tap order was.
 */
export function orderPair(a, b) {
  if (!a) return [b, null];
  if (!b) return [a, null];
  return a.ts <= b.ts ? [a, b] : [b, a];
}

/**
 * Default pair for a photo list: earliest vs latest by timestamp. Returns up to
 * two names; fewer than two photos yields whatever exists.
 */
export function defaultPair(photos) {
  const sorted = (Array.isArray(photos) ? photos : [])
    .filter((p) => p && p.name && Number.isFinite(p.ts))
    .sort((x, y) => x.ts - y.ts);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [sorted[0].name];
  return [sorted[0].name, sorted[sorted.length - 1].name];
}

/**
 * Build the drawShareCard params for the beforeAfter card. Pure: takes resolved
 * takenAt/weight values so it is trivially testable. `weight` is included only
 * when `showWeight` is on AND a weight exists; suppressed callers never reach
 * here (the whole card is withheld), so this is only the user toggle.
 */
export function buildBeforeAfterParams({
  olderTakenAt, newerTakenAt, olderWeightKg, newerWeightKg,
  showWeight, aspect = 'square', bodyWeightUnits = 'kg',
}) {
  const asp = (aspect === 'portrait' || aspect === 'story') ? aspect : 'square';
  const wt = (kg) => (showWeight && kg != null && Number.isFinite(kg)
    ? formatBodyWeight(kg, bodyWeightUnits)
    : '');
  return {
    cardType: 'beforeAfter',
    aspect: asp,
    isSquare: asp !== 'story',
    elapsedLabel: elapsedLabel(olderTakenAt, newerTakenAt),
    before: { date: formatCardDate(olderTakenAt), weight: wt(olderWeightKg) },
    after: { date: formatCardDate(newerTakenAt), weight: wt(newerWeightKg) },
    showWeight: !!showWeight,
  };
}

// Decode one photo file into an SkImage, or null. Bounded: the decoded image is
// only held for the render pass and drawn into the fixed 1080 design space.
async function decodePhoto(uri) {
  if (!Skia || !FileSystem || !uri) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(b64));
    return img || null;
  } catch (e) {
    logError('ProgressCard.decode', e, {});
    return null;
  }
}

// ── component ────────────────────────────────────────────────────────────────

/**
 * @param {boolean}  props.visible  whether the sheet is shown
 * @param {Function} props.onClose  called to dismiss the sheet
 * @param {Array}    props.photos   the device's progress photos, each
 *                                  `{ name, uri, ts }` (as from
 *                                  listProgressPhotos); the sheet defaults the
 *                                  pair to earliest vs latest and lets the user
 *                                  swap either.
 */
export default function BeforeAfterShareSheet({ visible, onClose, photos = [] }) {
  const toast = useToast();
  const suppressed = usePhotoSuppression();
  const tier = useAppStore((s) => s.tier);
  const bodyWeightUnits = useAppStore((s) => s.bodyWeightUnits) || 'kg';

  const sorted = useMemo(
    () => (Array.isArray(photos) ? photos : [])
      .filter((p) => p && p.name && Number.isFinite(p.ts))
      .sort((a, b) => a.ts - b.ts),
    [photos],
  );

  const [selected, setSelected] = useState([]); // photo names, resolved older→newer by ts
  const [aspect, setAspect] = useState('square');
  const [showWeight, setShowWeight] = useState(true);
  const [metaMap, setMetaMap] = useState({});
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [wordmark, setWordmark] = useState(null);
  const [previewB64, setPreviewB64] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);

  const active = visible && !suppressed && tier === 'pro';

  // Default the pair to earliest vs latest each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setSelected(defaultPair(sorted));
  }, [visible, sorted]);

  // The chosen pair, ordered older→newer.
  const items = selected
    .map((name) => sorted.find((p) => p.name === name))
    .filter(Boolean);
  const [older, newer] = items.length === 2
    ? orderPair(items[0], items[1])
    : [items[0] || null, null];
  const pairReady = !!(older && newer);

  // System typefaces for the Skia renderer.
  const typefaces = useMemo(() => {
    if (!Skia || !matchFont) return null;
    try {
      // These 'bold'/'normal' are Skia matchFont() OS-typeface descriptors, not
      // RN style tokens, so the fontWeight-literal design guard does not apply
      // (matches ShareCardScreen's identical typeface lookup).
      // eslint-disable-next-line no-restricted-syntax
      const bold = matchFont({ fontFamily: FONT_FAMILY, fontWeight: 'bold' }).getTypeface();
      // eslint-disable-next-line no-restricted-syntax
      const regular = matchFont({ fontFamily: FONT_FAMILY, fontWeight: 'normal' }).getTypeface();
      return (bold && regular) ? { bold, regular } : null;
    } catch (_) { return null; }
  }, []);

  // Load the wordmark once as an SkImage for the footer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Skia || !Asset || !FileSystem) return;
      try {
        const asset = Asset.fromModule(WORDMARK);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        if (!uri) return;
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(b64));
        if (!cancelled && img) setWordmark(img);
      } catch (_) { /* footer falls back to drawn text */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Batch metadata (takenAt + weight snapshot) for the chosen pair.
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    const names = [older, newer].filter(Boolean).map((p) => p.name);
    if (names.length === 0) { setMetaMap({}); return undefined; }
    getPhotoMetaMap(names).then((m) => { if (alive) setMetaMap(m || {}); }).catch(() => {});
    return () => { alive = false; };
  }, [active, older, newer]);

  // Decode the two chosen photos into SkImages (bounded: one pair at a time).
  useEffect(() => {
    if (!active || !pairReady) { setBeforeImg(null); setAfterImg(null); return undefined; }
    let alive = true;
    (async () => {
      const [bi, ai] = await Promise.all([decodePhoto(older.uri), decodePhoto(newer.uri)]);
      if (!alive) return;
      setBeforeImg(bi);
      setAfterImg(ai);
    })();
    return () => { alive = false; };
  }, [active, pairReady, older, newer]);

  const buildParams = useCallback(() => {
    const om = (older && metaMap[older.name]) || {};
    const nm = (newer && metaMap[newer.name]) || {};
    return buildBeforeAfterParams({
      olderTakenAt: Number.isFinite(om.takenAt) ? om.takenAt : (older && older.ts),
      newerTakenAt: Number.isFinite(nm.takenAt) ? nm.takenAt : (newer && newer.ts),
      olderWeightKg: om.weightKg,
      newerWeightKg: nm.weightKg,
      showWeight,
      aspect,
      bodyWeightUnits,
    });
  }, [older, newer, metaMap, showWeight, aspect, bodyWeightUnits]);

  // ONE renderer for preview + export. Returns a base64 PNG, or null if the
  // card can't be generated (missing Skia/typefaces/images, or a surface fail).
  const renderCardBase64 = useCallback((width) => {
    if (!Skia || !typefaces || !beforeImg || !afterImg) return null;
    const params = buildParams();
    const H = cardHeight(width, params.isSquare, params.aspect);
    const surface = Skia.Surface.MakeOffscreen(width, H);
    if (!surface) return null;
    drawShareCard(surface.getCanvas(), {
      Skia, width, params, typefaces, wordmark, photos: { before: beforeImg, after: afterImg },
    });
    surface.flush();
    const image = surface.makeImageSnapshot();
    return image ? image.encodeToBase64() : null;
  }, [typefaces, wordmark, beforeImg, afterImg, buildParams]);

  // Live preview: re-render whenever anything that changes the card changes.
  useEffect(() => {
    if (!active) { setPreviewB64(null); return; }
    setPreviewB64(renderCardBase64(PREVIEW_RENDER_W));
  }, [active, renderCardBase64]);

  // Render the export-resolution PNG to a cache file; the single-file artefact
  // every share/save uses (S2 single-file contract). Null if it can't generate.
  const renderCardToFile = useCallback(async () => {
    const b64 = renderCardBase64(1080);
    if (!b64) return null;
    const filename = `volyume-progress-${aspect}.png`;
    const uri = (FileSystem.cacheDirectory || '') + filename;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
    return uri;
  }, [renderCardBase64, aspect]);

  // One-time confirm ("You're creating a shareable image of your photos"); runs
  // `next` once acknowledged. Fails safe: an unreadable flag shows the confirm.
  const ensureConfirmed = useCallback(async (next) => {
    let confirmed = false;
    try { confirmed = (await AsyncStorage.getItem(CONFIRM_KEY)) === '1'; } catch (_) { confirmed = false; }
    if (confirmed) { next(); return; }
    appAlert(
      'Create a shareable image',
      "You're creating a shareable image of your photos. It stays on your device until you choose to share or save it.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try { await AsyncStorage.setItem(CONFIRM_KEY, '1'); } catch (_) { /* best-effort */ }
            next();
          },
        },
      ],
    );
  }, []);

  // Guarded generation: re-check tier live, validate BOTH images are present
  // before compositing, and calm-abort (never open the share sheet) otherwise.
  const withGeneratedFile = useCallback(async (consume) => {
    if (useAppStore.getState().tier !== 'pro' || suppressed) return;
    if (!Skia || !FileSystem || !typefaces) {
      toast.show('Sharing needs a rebuild with the Skia and sharing packages', { variant: 'error', duration: 5000 });
      return;
    }
    if (!pairReady) { toast.show('Choose two photos first', { variant: 'info' }); return; }
    if (!beforeImg || !afterImg) {
      // S2 guard 1: a deleted/corrupt/unreadable photo must not composite a
      // blank cell or throw into the share sheet.
      toast.show('That photo could not be opened, try another', { variant: 'error' });
      return;
    }
    let uri = null;
    try {
      uri = await renderCardToFile();
    } catch (e) {
      logError('ProgressCard.export', e, { aspect });
    }
    if (!uri) { toast.show("Couldn't generate the card, try again", { variant: 'error' }); return; }
    await consume(uri);
  }, [suppressed, typefaces, pairReady, beforeImg, afterImg, renderCardToFile, aspect, toast]);

  const onShare = useCallback(() => {
    ensureConfirmed(() => withGeneratedFile(async (uri) => {
      setSharing(true);
      try {
        if (!Sharing) { toast.show('Sharing needs a rebuild with the sharing package', { variant: 'error', duration: 5000 }); return; }
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) { toast.show('Sharing is not available on this device', { variant: 'warning', duration: 5000 }); return; }
        // ONE composited file, never a multi-attach (S2 §1).
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share progress' });
      } catch (_e) {
        toast.show("Couldn't open the share sheet, try again", { variant: 'error' });
      } finally {
        setSharing(false);
      }
    }));
  }, [ensureConfirmed, withGeneratedFile, toast]);

  const onSaveToGallery = useCallback(() => {
    ensureConfirmed(() => withGeneratedFile(async (uri) => {
      if (!MediaLibrary) { toast.show('Saving needs a rebuild with the media-library package', { variant: 'error', duration: 5000 }); return; }
      setSavingToGallery(true);
      try {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) { toast.show('Gallery access is needed to save. You can still use Share.', { variant: 'warning', duration: 5000 }); return; }
        await MediaLibrary.saveToLibraryAsync(uri);
        toast.show('Saved to your gallery', { variant: 'success' });
      } catch (_e) {
        toast.show("Couldn't save the card, try again", { variant: 'error' });
      } finally {
        setSavingToGallery(false);
      }
    }));
  }, [ensureConfirmed, withGeneratedFile, toast]);

  // Selection: tapping a chosen photo unchooses it; with two chosen, a tap on a
  // third replaces the earliest choice (matches the compare view's semantics).
  function toggleSelect(item) {
    setSelected((prev) => {
      if (prev.includes(item.name)) return prev.filter((n) => n !== item.name);
      if (prev.length < 2) return [...prev, item.name];
      return [prev[1], item.name];
    });
  }

  // WITHHELD ENTIRELY under suppression, and rendered only for Pro. The
  // suppression gate sits ahead of every compose/encode/share path above.
  if (!visible || suppressed || tier !== 'pro') return null;

  const isSquare = aspect !== 'story';
  const previewH = cardHeight(PREVIEW_DISPLAY_W, isSquare, aspect);
  const busy = sharing || savingToGallery;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Share progress</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Choose two photos (default earliest and latest). Older reads on the
            left, newer on the right, whatever the tap order was. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
            {sorted.map((item) => {
              const on = selected.includes(item.name);
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => toggleSelect(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Photo from ${formatCardDate(item.ts)}${on ? ', chosen' : ''}`}
                >
                  <Image source={{ uri: item.uri }} style={[styles.thumb, on && styles.thumbOn]} resizeMode="cover" />
                  {on ? (
                    <View pointerEvents="none" style={styles.thumbCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.hint}>
            {pairReady ? 'Two photos chosen.' : 'Choose two photos to compare.'}
          </Text>
        </View>

        {/* Format presets: square 1:1 (default), portrait 4:5, story 9:16. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format</Text>
          <View style={styles.segmentRow}>
            <SegmentBtn label="Square" active={aspect === 'square'} onPress={() => setAspect('square')} icon="square-outline" />
            <SegmentBtn label="Portrait" active={aspect === 'portrait'} onPress={() => setAspect('portrait')} icon="crop-outline" />
            <SegmentBtn label="Story" active={aspect === 'story'} onPress={() => setAspect('story')} icon="phone-portrait-outline" />
          </View>
        </View>

        {/* Preview: the exact image that gets shared, scaled down. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewOuter}>
            {previewB64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${previewB64}` }}
                style={{ width: PREVIEW_DISPLAY_W, height: previewH, borderRadius: radius.lg }}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.previewPlaceholder, { width: PREVIEW_DISPLAY_W, height: previewH }]}>
                {pairReady ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.hint}>Choose two photos</Text>}
              </View>
            )}
          </View>
        </View>

        {/* Weight toggle (founder-approved override; default on, bounded by the
            suppression withhold above). */}
        <View style={styles.section}>
          <View style={styles.togglesCard}>
            <View style={[styles.toggleRow, styles.toggleRowLast]}>
              <Text style={styles.toggleLabel}>Show weight</Text>
              <Switch
                value={showWeight}
                onValueChange={setShowWeight}
                trackColor={{ false: colors.surface2, true: withAlpha(colors.primary, alpha.strong) }}
                thumbColor={showWeight ? colors.primary : colors.textMuted}
              />
            </View>
          </View>
          <Text style={styles.privacyNote}>
            Only the two photos, their dates, weights and elapsed time you chose are included. Your name, measurements and private notes are never included.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (busy || !pairReady) && styles.btnDisabled]}
          onPress={onShare}
          disabled={busy || !pairReady}
          accessibilityRole="button"
          accessibilityLabel="Share progress image"
        >
          {sharing ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryBtnText}>Share</Text>
            </>
          )}
        </TouchableOpacity>

        {MediaLibrary ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, (busy || !pairReady) && styles.btnDisabled]}
            onPress={onSaveToGallery}
            disabled={busy || !pairReady}
            accessibilityRole="button"
            accessibilityLabel="Save progress image to gallery"
          >
            {savingToGallery ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Save to gallery</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentBtn({ label, active, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[styles.segment, active && styles.segmentActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={15} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.textPrimary },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5,
  },
  stripRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  thumb: {
    width: 72, height: 72, borderRadius: radius.md,
    borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.surface,
  },
  thumbOn: { borderColor: colors.primary },
  thumbCheck: {
    position: 'absolute', top: spacing.xxs, right: spacing.xxs,
    backgroundColor: colors.background, borderRadius: radius.full,
  },
  hint: { ...type.bodySm, color: colors.textMuted },
  segmentRow: {
    flexDirection: 'row', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 1, borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface3 },
  segmentText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  segmentTextActive: { color: colors.textPrimary },
  previewOuter: { alignSelf: 'center' },
  previewPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  togglesCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { fontSize: fontSize.sm, color: colors.textPrimary },
  privacyNote: { ...type.captionTight, color: colors.textMuted },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.lg, paddingVertical: spacing.lg,
    borderWidth: 1.5, borderColor: colors.primary, marginTop: spacing.md,
  },
  secondaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  btnDisabled: { opacity: 0.5 },
});

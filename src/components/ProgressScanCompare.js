// S7-7 (progress-tab audit second pass, 2026-09-25, register D200 item 7,
// report §8): the screen passes `scans={scoredScans}` -- the full scan
// history, not the timeline's OWN pose/date-range filter
// (ProgressPhotosScreen.js's `filterAndSort`). This is deliberate, not an
// oversight: comparability chains need the full history to resolve each
// scan's comparison predecessor and count comparable scans correctly
// (progressScanChain.js), so cutting the input to a date range would
// silently corrupt both the pairing and the running count this component
// and its evidence chain rely on. The date range is a timeline VIEW
// filter; this is a library-wide comparison surface. No behaviour change
// here.
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors, spacing, radius, type, fontWeight, motion,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';
import {
  buildProgressScanCompareModel,
  nextScanCompareSelection,
  normaliseScanCompareSelection,
  orderedScanEntries,
} from '../lib/progressScanCompareViewModel';
import { progressScanAssessmentForDisplay } from '../lib/progressScanDisplay';
import { buildScoreTierContract, confidenceChipLabel, resolveConfidenceTier } from '../lib/progressScanResultsContract';
import { formatBodyWeight } from '../lib/units';

export { defaultScanPair, orderedScanEntries } from '../lib/progressScanCompareViewModel';

const POSE_LABEL = { front: 'Front', back: 'Back', side: 'Side' };

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// S7-3 (progress-tab audit second pass, 2026-09-25, register D200 item 7,
// report §8): a Low-tier score used to print outright here at any
// confidence tier, while the timeline holds it behind "Show anyway"
// (buildScoreTierContract) and the Trend view withholds it entirely. This
// now goes through the SAME tier contract, with `revealed` the caller's
// per-scan "Show anyway" state (never persisted -- see the component's own
// revealedIds below). The band stays visible either way
// (tierContract.showBand), matching the tier contract's own semantics; only
// the exact number sits behind the affordance.
export function scanRangeLabel(scan, { hideExact = false, revealed = false } = {}) {
  const assessment = progressScanAssessmentForDisplay(scan);
  if (hideExact) return assessment?.progressSignalLabel || 'Progress signal';
  const tierContract = buildScoreTierContract(scan, { revealed });
  if (tierContract.hasNumericScore) {
    const band = tierContract.bandLabel || 'Scored';
    // Identical wording to the timeline's own score cell (ProgressPhotosScreen.js
    // libraryScanSummary): the exact string 'Show anyway' stands in for the
    // number until this scan is revealed for the session.
    return tierContract.showScore ? `${band} ${tierContract.scoreText}` : `${band} Show anyway`;
  }
  const reasons = new Set([
    ...(Array.isArray(scan?.abstentionReasons) ? scan.abstentionReasons : []),
    ...(Array.isArray(scan?.signals?.abstentionReasons) ? scan.signals.abstentionReasons : []),
  ]);
  if ([...reasons].some((reason) => /model_|source_unavailable|source_unusable/.test(String(reason)))) return 'Analysis unavailable';
  if (assessment?.scanConfidenceTier === 'not_enough') return 'Not enough confidence';
  return scan?.analysisStatus === 'measured' ? 'Measured only' : 'Not scored';
}

// S7-4 (same audit pass): used to return a hard-coded `${kg} kg` regardless
// of the user's chosen body-weight unit. Signature kept EXACTLY as pinned
// (src/screens/__tests__/ProgressPhotosScreen.progressScan.guard.test.js,
// "scan-set weight is withheld under suppression or hideExact on every live
// rendering site") -- the unit preference is read at the point of
// formatting via useAppStore.getState() (a plain imperative read; this is a
// formatter function, not a hook, so it cannot subscribe itself) rather
// than as a new parameter. The component below still subscribes via the
// useAppStore hook (as ProgressPhotosScreen.js does for the same field), so
// the label re-renders correctly if the preference changes while this is
// open.
export function scanWeightLabel(scan, { hideExact = false } = {}) {
  if (hideExact) return null;
  const kg = finiteNumber(scan?.stats?.weightKg);
  if (kg == null) return null;
  return formatBodyWeight(kg, useAppStore.getState().bodyWeightUnits);
}

// Results-ui-and-copy-blueprint.md §1: a score never renders without its
// confidence tier, at equal visual weight (the integer is never more than one
// type step larger than the chip; summaryRange uses type.h3, so the chip here
// uses type.title, the adjacent step down). Only rendered alongside an actual
// numeric score, never for an unscored/measured-only/baseline panel (those
// already say so via scanRangeLabel and carry no tier to show).
function scanConfidenceChipText(scan) {
  const assessment = progressScanAssessmentForDisplay(scan);
  if (assessment?.visualLeannessScore == null) return null;
  return confidenceChipLabel(resolveConfidenceTier(scan));
}

function ScanSummary({ scan, label, hideExact, revealed = false, onRevealLowScore }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const weight = scanWeightLabel(scan, { hideExact });
  const confidenceChip = scanConfidenceChipText(scan);
  const rangeText = scanRangeLabel(scan, { hideExact, revealed });
  // S7-3: the reveal affordance only applies to a real Low-tier score, and
  // never under hideExact (which already withholds every number outright).
  const tierContract = !hideExact ? buildScoreTierContract(scan, { revealed }) : null;
  const showsRevealAffordance = !!tierContract?.requiresRevealAffordance && !tierContract.revealed;
  return (
    <View style={[styles.summaryPanel, live.summaryPanel]}>
      <Text style={[styles.summaryLabel, live.summaryLabel]}>{label}</Text>
      <Text style={[styles.summaryDate, live.summaryDate]}>{formatProgressPhotoDay(scan?.capturedAt)}</Text>
      {showsRevealAffordance ? (
        <TouchableOpacity
          onPress={onRevealLowScore}
          accessibilityRole="button"
          accessibilityLabel={tierContract.accessibilityLabel}
        >
          <Text style={[styles.summaryRange, live.summaryRange]}>{rangeText}</Text>
        </TouchableOpacity>
      ) : (
        <Text
          style={[styles.summaryRange, live.summaryRange]}
          accessibilityLabel={tierContract?.hasNumericScore ? tierContract.accessibilityLabel : undefined}
        >
          {rangeText}
        </Text>
      )}
      {confidenceChip ? <Text style={[styles.summaryConfidence, live.summaryConfidence]}>{confidenceChip}</Text> : null}
      <Text style={[styles.summaryMeta, live.summaryMeta]}>
        {[scan?.qualityLabel || 'saved', weight, `${scan?.assets?.length || 0} photos`].filter(Boolean).join(' | ')}
      </Text>
    </View>
  );
}

function ScanAssetCell({ asset, dateLabel, reduceMotion }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!asset) {
    return (
      <View style={[styles.photoCell, live.photoCell, styles.photoMissing, live.photoMissing]}>
        <Text style={[styles.photoMissingText, live.photoMissingText]}>Not taken</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: asset.uri }}
      style={[styles.photoCell, live.photoCell]}
      contentFit="cover"
      recyclingKey={asset.photoName || String(asset.id)}
      transition={reduceMotion ? 0 : motion.state}
      accessible
      accessibilityLabel={`${POSE_LABEL[asset.pose] || 'Scan'} photo from ${dateLabel}`}
    />
  );
}

export default function ProgressScanCompare({ scans = [], onClose, hideExact = false }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const suppressed = usePhotoSuppression();
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  // S7-4: subscribed here (as ProgressPhotosScreen.js subscribes for the
  // same field) purely so the tree re-renders if the unit preference
  // changes while this stays open; scanWeightLabel itself reads the
  // current value imperatively at format time.
  useAppStore((s) => s.bodyWeightUnits);
  const entries = useMemo(() => orderedScanEntries(scans), [scans]);
  const [selected, setSelected] = useState([]);
  // S7-3: per-scan "Show anyway" reveal, for this session only (never
  // persisted, never affects the engine's own tier decision) -- the same
  // contract and naming as ProgressPhotosScreen.js's revealedLowScoreIds.
  const [revealedIds, setRevealedIds] = useState(() => new Set());

  useEffect(() => {
    setSelected((prev) => normaliseScanCompareSelection(prev, entries));
  }, [entries]);

  function toggleSelect(id) {
    setSelected((prev) => nextScanCompareSelection(prev, id));
  }

  function toggleRevealLowScore(scanId) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId); else next.add(scanId);
      return next;
    });
  }

  const { earlier, later, rows, delta } = useMemo(
    () => buildProgressScanCompareModel(entries, selected),
    [entries, selected],
  );
  const deltaText = hideExact
    ? delta?.trendSummary
    : (delta?.summary || delta?.trendSummary);
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.title, live.title]}>Compare photo sets</Text>
        <Text style={[styles.subtitle, live.subtitle]}>Compare two photo sets by score, confidence and matched poses.</Text>
      </View>
      <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close photo-set comparison">
        <Ionicons name="close" size={26} color={t.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  if (suppressed) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        {renderHeader()}
        <View style={styles.placeholder}>
          <Ionicons name="leaf-outline" size={32} color={t.colors.textMuted} />
          <Text style={[styles.placeholderText, live.placeholderText]}>Score comparison is hidden for now.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {entries.map((scan) => {
            const active = selected.includes(scan.id);
            return (
              <TouchableOpacity
                key={scan.id}
                onPress={() => toggleSelect(scan.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Photo score from ${formatProgressPhotoDay(scan.capturedAt)}${active ? ', chosen' : ''}`}
                style={[styles.scanChip, live.scanChip, active && [styles.scanChipActive, live.scanChipActive]]}
              >
                <Text style={[styles.scanChipDate, live.scanChipDate, active && [styles.scanChipDateActive, live.scanChipDateActive]]}>{formatProgressPhotoDay(scan.capturedAt)}</Text>
                <Text style={[styles.scanChipRange, live.scanChipRange, active && [styles.scanChipRangeActive, live.scanChipRangeActive]]}>{scanRangeLabel(scan, { hideExact, revealed: revealedIds.has(scan.id) })}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!(earlier && later) ? (
          <View style={styles.placeholder}>
            <Ionicons name="scan-outline" size={32} color={t.colors.textMuted} />
            <Text style={[styles.placeholderText, live.placeholderText]}>Two scored photo sets are needed.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <ScanSummary
                scan={earlier}
                label="Earlier"
                hideExact={hideExact}
                revealed={revealedIds.has(earlier.id)}
                onRevealLowScore={() => toggleRevealLowScore(earlier.id)}
              />
              <ScanSummary
                scan={later}
                label="Later"
                hideExact={hideExact}
                revealed={revealedIds.has(later.id)}
                onRevealLowScore={() => toggleRevealLowScore(later.id)}
              />
            </View>

            {deltaText ? (
              <View style={[styles.deltaBox, live.deltaBox]}>
                <Text style={[styles.deltaLabel, live.deltaLabel]}>Why this looks different</Text>
                <Text style={[styles.deltaText, live.deltaText]}>{deltaText}</Text>
              </View>
            ) : null}

            {rows.map((row) => {
              const earlierDate = formatProgressPhotoDay(earlier.capturedAt);
              const laterDate = formatProgressPhotoDay(later.capturedAt);
              return (
                <View key={row.pose} style={styles.poseBlock}>
                  <Text style={[styles.poseTitle, live.poseTitle]}>{POSE_LABEL[row.pose] || row.pose}</Text>
                  <View style={styles.photoPair}>
                    <View style={styles.photoSide}>
                      <ScanAssetCell asset={row.earlier} dateLabel={earlierDate} reduceMotion={reduceMotion} />
                      <Text style={[styles.photoLabel, live.photoLabel]}>Earlier</Text>
                    </View>
                    <View style={styles.photoSide}>
                      <ScanAssetCell asset={row.later} dateLabel={laterDate} reduceMotion={reduceMotion} />
                      <Text style={[styles.photoLabel, live.photoLabel]}>Later</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.textPrimary },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  subtitle: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  strip: { gap: spacing.sm, paddingRight: spacing.lg },
  scanChip: {
    minWidth: 122,
    maxWidth: 184,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    gap: spacing.xxs,
  },
  scanChipActive: { backgroundColor: colors.primaryFill },
  scanChipDate: { ...type.caption, color: colors.textMuted },
  scanChipDateActive: { color: colors.onPrimary },
  scanChipRange: { ...type.bodyStrong, color: colors.textPrimary, lineHeight: 20 },
  scanChipRangeActive: { color: colors.onPrimary },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryPanel: {
    flex: 1,
    minWidth: 142,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  summaryLabel: { ...type.caption, color: colors.textMuted, fontWeight: fontWeight.semibold },
  summaryDate: { ...type.bodyStrong, color: colors.textPrimary, lineHeight: 20 },
  summaryRange: { ...type.h3, color: colors.primary, lineHeight: 25 },
  summaryConfidence: { ...type.title, color: colors.textSecondary },
  summaryMeta: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  deltaBox: {
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  deltaLabel: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  deltaText: { ...type.bodySm, color: colors.textSecondary },
  poseBlock: { gap: spacing.sm },
  poseTitle: { ...type.label, color: colors.textMuted },
  photoPair: { flexDirection: 'row', gap: spacing.sm },
  photoSide: { flex: 1, gap: spacing.xs },
  photoCell: {
    width: '100%',
    aspectRatio: 0.74,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  photoMissing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoMissingText: { ...type.caption, color: colors.textMuted },
  photoLabel: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  placeholder: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm },
  placeholderText: { ...type.bodyStrong, color: colors.textPrimary, textAlign: 'center' },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. header/headerCopy/content/
// strip/summaryRow/poseBlock/photoPair/photoSide have no colour tokens.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    scanChip: { backgroundColor: t.colors.surface2 },
    scanChipActive: { backgroundColor: t.colors.primaryFill },
    scanChipDate: { color: t.colors.textMuted },
    scanChipDateActive: { color: t.colors.onPrimary },
    scanChipRange: { color: t.colors.textPrimary },
    scanChipRangeActive: { color: t.colors.onPrimary },
    summaryPanel: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    summaryLabel: { color: t.colors.textMuted },
    summaryDate: { color: t.colors.textPrimary },
    summaryRange: { color: t.colors.primary },
    summaryConfidence: { color: t.colors.textSecondary },
    summaryMeta: { color: t.colors.textMuted },
    deltaBox: { backgroundColor: t.colors.primaryBg },
    deltaLabel: { color: t.colors.primary },
    deltaText: { color: t.colors.textSecondary },
    poseTitle: { color: t.colors.textMuted },
    photoCell: { backgroundColor: t.colors.surface },
    photoMissing: { borderColor: t.colors.border },
    photoMissingText: { color: t.colors.textMuted },
    photoLabel: { color: t.colors.textMuted },
    placeholderText: { color: t.colors.textPrimary },
  };
}

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from './Card';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';
import {
  colors, spacing, radius, type, iconSize, motion,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import {
  formatVolyumeScore,
  progressScanAssessmentForDisplay,
  progressScanScoreForDisplay,
} from '../lib/progressScanDisplay';

const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };
const MODEL_UNAVAILABLE_REASONS = new Set(['model_unavailable', 'model_source_unavailable', 'model_source_unusable', 'model_load_failed', 'model_run_failed']);
const QUALITY_REASONS = new Set([
  'too_dark',
  'too_blurry',
  'whole_body_not_visible',
  'multiple_people',
  'segmentation_low_confidence',
  'clothing_or_background_uncertain',
  'pose_not_clear',
  'camera_tilted',
  'measured_signals_incomplete',
]);

function assessmentFor(scan) {
  return progressScanAssessmentForDisplay(scan);
}

function scanReasons(scan) {
  return new Set([
    ...(Array.isArray(scan?.abstentionReasons) ? scan.abstentionReasons : []),
    ...(Array.isArray(scan?.qualityWarnings) ? scan.qualityWarnings : []),
    ...(Array.isArray(scan?.signals?.abstentionReasons) ? scan.signals.abstentionReasons : []),
    ...(Array.isArray(scan?.signals?.qualityWarnings) ? scan.signals.qualityWarnings : []),
  ].filter(Boolean));
}

function scanScore(scan) {
  return progressScanScoreForDisplay(scan);
}

function unscoredState(scan) {
  if (scanScore(scan) != null) return null;
  const reasons = scanReasons(scan);
  if ([...reasons].some((reason) => MODEL_UNAVAILABLE_REASONS.has(reason))) return 'analysis_unavailable';
  if ([...reasons].some((reason) => QUALITY_REASONS.has(reason))) return 'retake_needed';
  if (assessmentFor(scan)?.scanConfidenceTier === 'not_enough') return 'not_enough';
  if (scan?.analysisStatus === 'measured') return 'measured_only';
  if (scan?.analysisStatus === 'abstained') return 'not_scored';
  return null;
}

function comparisonLabel(scan) {
  if (scan?.deltaExplanation?.comparisonStatus === 'comparable') return 'Like-for-like';
  if (scan?.deltaExplanation?.comparisonStatus === 'not_comparable') return 'Setup changed';
  return scan?.qualityLabel || 'Saved';
}

function confidenceLabel(scan) {
  const state = unscoredState(scan);
  if (state === 'analysis_unavailable') return 'Analysis unavailable';
  if (state === 'retake_needed') return 'Retake needed';
  if (state === 'not_enough') return 'Not enough confidence';
  if (state === 'measured_only') return 'Measured only';
  if (state === 'not_scored') return 'Not scored';
  const assessment = assessmentFor(scan);
  return assessment?.scanConfidenceLabel || scan?.qualityLabel || 'Saved';
}

function bandLabel(scan) {
  const state = unscoredState(scan);
  if (state === 'measured_only') return 'Measured only';
  if (state) return 'Not scored';
  const assessment = assessmentFor(scan);
  return assessment?.leannessBandLabel || 'Baseline';
}

function signalLabel(scan, { suppressed = false } = {}) {
  if (suppressed) return 'Hidden';
  const state = unscoredState(scan);
  if (state === 'analysis_unavailable') return 'Analysis unavailable';
  if (state === 'retake_needed') return 'Retake needed';
  if (state === 'measured_only') return 'Measured only';
  if (state) return 'Not scored';
  const assessment = assessmentFor(scan);
  return assessment?.progressSignalLabel || scan?.deltaExplanation?.trendSummary || 'Baseline set';
}

function scoreLabel(scan, { suppressed = false, hideExact = false } = {}) {
  const score = scanScore(scan);
  if (suppressed) return 'Hidden';
  if (hideExact) return 'Hidden';
  return score != null ? formatVolyumeScore(score) : 'Not scored';
}

function weightLabel(scan, { suppressed = false, hideExact = false } = {}) {
  if (suppressed || hideExact) return 'Hidden';
  const weightKg = scan?.stats?.weightKg;
  return Number.isFinite(weightKg) ? `${weightKg.toFixed(1)} kg` : 'Not logged';
}

function whyLabel(scan, { suppressed = false, hideExact = false } = {}) {
  if (suppressed) return 'Score details are hidden. Your photos remain private.';
  const state = unscoredState(scan);
  if (state === 'analysis_unavailable') {
    return scan?.copySummary || 'Saved, but Volyume needs front and back photos to score the set.';
  }
  if (state === 'retake_needed') {
    return scan?.copySummary || 'Saved, but the read was not clear enough to score. Retake with your whole body visible, even lighting and a plain background.';
  }
  if (state === 'not_enough' || state === 'not_scored') {
    return scan?.copySummary || 'Saved, but Volyume could not create a score from this set.';
  }
  if (state === 'measured_only') {
    return scan?.copySummary || 'Measured, but Volyume could not create a score from this set.';
  }
  if (hideExact && scan?.deltaExplanation?.trendSummary) return scan.deltaExplanation.trendSummary;
  if (scan?.deltaExplanation?.summary) return scan.deltaExplanation.summary;
  if (scan?.deltaExplanation?.trendSummary) return scan.deltaExplanation.trendSummary;
  if (scan?.copySummary) return scan.copySummary;
  return 'Use the same pose, lighting and framing next time for the cleanest read.';
}

export default function ProgressScanHistoryCard({
  scans = [],
  hideExact = false,
  suppressed = false,
  readOnly = false,
  onDeleteScan,
  onOpenPhoto,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!Array.isArray(scans) || scans.length === 0) return null;
  return (
    <Card padding="md" style={styles.scanCard}>
      <View style={styles.scanCardHeader}>
        <View style={styles.scanHeadingGroup}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.scanTitle, live.scanTitle]}>Photo results</Text>
        </View>
      </View>
      {scans.map((scan) => {
        const dateLabel = formatProgressPhotoDay(scan.capturedAt);
        return (
          <View key={scan.id} style={[styles.scanEntry, live.scanEntry]}>
            <View style={styles.scanEntryHeader}>
              <View style={styles.scanEntryTitleGroup}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanDate, live.scanDate]}>{dateLabel}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanEntryTitle, live.scanEntryTitle]}>{comparisonLabel(scan)}</Text>
              </View>
              <View style={styles.scanEntryActions}>
                <View style={[styles.confidencePill, live.confidencePill]}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.confidencePillText, live.confidencePillText]} numberOfLines={1}>
                    Read quality: {confidenceLabel(scan)}
                  </Text>
                </View>
                {!readOnly ? (
                  <TouchableOpacity
                    onPress={() => onDeleteScan?.(scan)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete photo set from ${dateLabel}`}
                    style={styles.scanDeleteButton}
                  >
                    <Ionicons name="trash-outline" size={iconSize.sm} color={t.colors.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <View style={styles.scanInsightGrid}>
              <View style={[styles.scanInsightCell, live.scanInsightCell]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightLabel, live.scanInsightLabel]}>Leanness</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightValue, live.scanInsightValue]} numberOfLines={1}>{bandLabel(scan)}</Text>
              </View>
              <View style={[styles.scanInsightCell, live.scanInsightCell]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightLabel, live.scanInsightLabel]}>Change</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightValue, live.scanInsightValue]} numberOfLines={2}>{signalLabel(scan, { suppressed })}</Text>
              </View>
              <View style={[styles.scanInsightCell, live.scanInsightCell]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightLabel, live.scanInsightLabel]}>Volyume Score</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightValue, live.scanInsightValue]} numberOfLines={1}>{scoreLabel(scan, { suppressed, hideExact })}</Text>
              </View>
              <View style={[styles.scanInsightCell, live.scanInsightCell]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightLabel, live.scanInsightLabel]}>Weight</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.scanInsightValue, live.scanInsightValue]} numberOfLines={1}>{weightLabel(scan, { suppressed, hideExact })}</Text>
              </View>
            </View>
            <View style={[styles.scanReasonBox, live.scanReasonBox]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.scanBody, live.scanBody]} numberOfLines={3}>{whyLabel(scan, { suppressed, hideExact })}</Text>
            </View>
            {Array.isArray(scan.assets) && scan.assets.length > 0 ? (
              <View style={styles.scanAssetRow}>
                {scan.assets.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    onPress={readOnly ? undefined : () => onOpenPhoto?.(asset.photoName)}
                    disabled={readOnly}
                    accessibilityRole={readOnly ? 'image' : 'button'}
                    accessibilityLabel={`${POSE_LABEL[asset.pose] || 'Progress'} photo from ${formatProgressPhotoDay(asset.takenAt)}.`}
                    style={styles.scanAssetThumb}
                  >
                    <Image
                      source={{ uri: asset.uri }}
                      style={[styles.scanAssetImage, live.scanAssetImage]}
                      contentFit="cover"
                      recyclingKey={asset.photoName || String(asset.id)}
                      transition={reduceMotion ? 0 : motion.state}
                    />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.scanAssetPose, live.scanAssetPose]} numberOfLines={1}>{POSE_LABEL[asset.pose] || asset.pose}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  scanCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  scanHeadingGroup: { flex: 1, minWidth: 0, gap: spacing.xxs },
  scanTitle: { ...type.h3, color: colors.textPrimary },
  scanDate: { ...type.caption, color: colors.textMuted },
  scanBody: { ...type.bodySm, color: colors.textMuted },
  scanEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  scanEntryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    minWidth: 0,
  },
  scanEntryTitleGroup: { flex: 1, minWidth: 0, gap: spacing.xxs },
  scanEntryTitle: { ...type.label, color: colors.textPrimary },
  scanEntryActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1, maxWidth: '58%' },
  confidencePill: {
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: 180,
  },
  confidencePillText: { ...type.caption, color: colors.primary, flexShrink: 1 },
  scanDeleteButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scanInsightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  scanInsightCell: {
    flex: 1,
    minWidth: 96,
    minHeight: 82,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  scanInsightLabel: { ...type.caption, color: colors.textMuted },
  scanInsightValue: { ...type.label, color: colors.textPrimary, lineHeight: 18, flexShrink: 1 },
  scanReasonBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  scanAssetRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  scanAssetThumb: { width: 72, gap: spacing.xxs },
  scanAssetImage: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  scanAssetPose: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. scanCard/scanCardHeader/
// scanHeadingGroup/scanEntryHeader/scanEntryTitleGroup/scanEntryActions/
// scanDeleteButton/scanInsightGrid/scanAssetRow/scanAssetThumb have no
// colour tokens.
function buildLiveStyles(t) {
  return {
    scanTitle: { color: t.colors.textPrimary },
    scanDate: { color: t.colors.textMuted },
    scanBody: { color: t.colors.textMuted },
    scanEntry: { borderTopColor: t.colors.border },
    scanEntryTitle: { color: t.colors.textPrimary },
    confidencePill: { backgroundColor: t.colors.primaryBg },
    confidencePillText: { color: t.colors.primary },
    scanInsightCell: { backgroundColor: t.colors.surface2 },
    scanInsightLabel: { color: t.colors.textMuted },
    scanInsightValue: { color: t.colors.textPrimary },
    scanReasonBox: { borderLeftColor: t.colors.primary, backgroundColor: t.colors.surface2 },
    scanAssetImage: { backgroundColor: t.colors.surface2 },
    scanAssetPose: { color: t.colors.textMuted },
  };
}

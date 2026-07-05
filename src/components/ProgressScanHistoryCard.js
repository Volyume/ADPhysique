import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from './Card';
import { scanReadCopy, scanStatsCopy } from '../lib/progressScanCopy';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';
import {
  colors, spacing, radius, type, fontWeight, iconSize,
} from '../styles/theme';

const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

function assessmentFor(scan) {
  return scan?.signals?.physiqueAssessment || null;
}

function comparisonLabel(scan) {
  if (scan?.deltaExplanation?.comparisonStatus === 'comparable') return 'Like-for-like';
  if (scan?.deltaExplanation?.comparisonStatus === 'not_comparable') return 'Setup changed';
  return scan?.qualityLabel || 'Saved';
}

function confidenceLabel(scan) {
  const assessment = assessmentFor(scan);
  return assessment?.scanConfidenceLabel || scan?.qualityLabel || 'Saved';
}

function bandLabel(scan) {
  const assessment = assessmentFor(scan);
  return assessment?.leannessBandLabel || 'Baseline';
}

function signalLabel(scan, { suppressed = false } = {}) {
  if (suppressed) return 'Hidden';
  const assessment = assessmentFor(scan);
  return assessment?.progressSignalLabel || scan?.deltaExplanation?.trendSummary || 'Baseline scan';
}

function scoreLabel(scan, { suppressed = false, hideExact = false } = {}) {
  const score = assessmentFor(scan)?.visualLeannessScore;
  if (suppressed) return 'Hidden';
  if (hideExact) return 'Hidden';
  return score != null ? `${score}/100` : 'Withheld';
}

function whyLabel(scan, { suppressed = false, hideExact = false } = {}) {
  if (suppressed) return 'Scan detail is hidden right now. Your photos remain private.';
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
  onToggleHideExact,
  onDeleteScan,
  onOpenPhoto,
}) {
  if (!Array.isArray(scans) || scans.length === 0) return null;
  return (
    <Card padding="md" style={styles.scanCard}>
      <View style={styles.scanCardHeader}>
        <View style={styles.scanHeadingGroup}>
          <Text style={styles.scanTitle}>Physique Scan results</Text>
          <Text style={styles.scanSubtitle}>
            Private visual reads. Bands, confidence and trend only.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onToggleHideExact}
          hitSlop={8}
          accessibilityRole="switch"
          accessibilityState={{ checked: hideExact }}
          accessibilityLabel={hideExact ? 'Show scan details' : 'Hide scan details'}
          style={styles.hideExactToggle}
        >
          <Ionicons
            name={hideExact ? 'eye-off-outline' : 'eye-outline'}
            size={iconSize.sm}
            color={colors.primary}
          />
          <Text style={styles.hideExactText}>{hideExact ? 'Trend only' : 'Show details'}</Text>
        </TouchableOpacity>
      </View>
      {scans.map((scan) => {
        const dateLabel = formatProgressPhotoDay(scan.capturedAt);
        return (
          <View key={scan.id} style={styles.scanEntry}>
            <View style={styles.scanEntryHeader}>
              <View style={styles.scanEntryTitleGroup}>
                <Text style={styles.scanDate}>{dateLabel}</Text>
                <Text style={styles.scanEntryTitle}>Visual trend</Text>
              </View>
              <View style={styles.scanEntryActions}>
                <View style={styles.confidencePill}>
                  <Text style={styles.confidencePillText} numberOfLines={1}>
                    Confidence: {confidenceLabel(scan)}
                  </Text>
                </View>
                {!readOnly ? (
                  <TouchableOpacity
                    onPress={() => onDeleteScan?.(scan)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete scan from ${dateLabel}`}
                    style={styles.scanDeleteButton}
                  >
                    <Ionicons name="trash-outline" size={iconSize.sm} color={colors.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <View style={styles.scanInsightGrid}>
              <View style={styles.scanInsightCell}>
                <Text style={styles.scanInsightLabel}>Leanness band</Text>
                <Text style={styles.scanInsightValue} numberOfLines={1}>{bandLabel(scan)}</Text>
              </View>
              <View style={styles.scanInsightCell}>
                <Text style={styles.scanInsightLabel}>Signal</Text>
                <Text style={styles.scanInsightValue} numberOfLines={2}>{signalLabel(scan, { suppressed })}</Text>
              </View>
              <View style={styles.scanInsightCell}>
                <Text style={styles.scanInsightLabel}>Score</Text>
                <Text style={styles.scanInsightValue} numberOfLines={1}>{scoreLabel(scan, { suppressed, hideExact })}</Text>
              </View>
            </View>
            <View style={styles.scanReasonBox}>
              <Text style={styles.scanReasonLabel}>Why this read</Text>
              <Text style={styles.scanBody}>{whyLabel(scan, { suppressed, hideExact })}</Text>
              <Text style={styles.scanStats}>{scanStatsCopy(scan, { suppressed, hideExact })}</Text>
              <Text style={styles.scanLimit}>{scanReadCopy(scan, { suppressed, hideExact })}</Text>
            </View>
            {Array.isArray(scan.assets) && scan.assets.length > 0 ? (
              <View style={styles.scanAssetRow}>
                {scan.assets.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    onPress={readOnly ? undefined : () => onOpenPhoto?.(asset.photoName)}
                    disabled={readOnly}
                    accessibilityRole={readOnly ? 'image' : 'button'}
                    accessibilityLabel={`${POSE_LABEL[asset.pose] || 'Scan'} photo from ${formatProgressPhotoDay(asset.takenAt)}.`}
                    style={styles.scanAssetThumb}
                  >
                    <Image source={{ uri: asset.uri }} style={styles.scanAssetImage} />
                    <Text style={styles.scanAssetPose} numberOfLines={1}>{POSE_LABEL[asset.pose] || asset.pose}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <Text style={styles.scanQuality}>{comparisonLabel(scan)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  scanCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  scanCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  scanHeadingGroup: { flex: 1, gap: spacing.xxs },
  scanTitle: { ...type.h3, color: colors.textPrimary },
  scanSubtitle: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  scanDate: { ...type.caption, color: colors.textMuted },
  scanBody: { ...type.bodySm, color: colors.textMuted },
  hideExactToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  hideExactText: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  scanEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  scanEntryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  scanEntryTitleGroup: { flex: 1, gap: spacing.xxs },
  scanEntryTitle: { ...type.label, color: colors.textPrimary },
  scanEntryActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  confidencePill: {
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: 150,
  },
  confidencePillText: { ...type.caption, color: colors.primary },
  scanDeleteButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scanQuality: { ...type.caption, color: colors.textMuted, textTransform: 'capitalize' },
  scanStats: { ...type.caption, color: colors.textMuted },
  scanLimit: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  scanInsightGrid: { flexDirection: 'row', gap: spacing.xs },
  scanInsightCell: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  scanInsightLabel: { ...type.caption, color: colors.textMuted },
  scanInsightValue: { ...type.label, color: colors.textPrimary },
  scanReasonBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  scanReasonLabel: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  scanAssetRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  scanAssetThumb: { width: 72, gap: spacing.xxs },
  scanAssetImage: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  scanAssetPose: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});

import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors, spacing, radius, type, fontWeight,
} from '../styles/theme';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';
import {
  buildProgressScanCompareModel,
  nextScanCompareSelection,
  normaliseScanCompareSelection,
  orderedScanEntries,
} from '../lib/progressScanCompareViewModel';

export { defaultScanPair, orderedScanEntries } from '../lib/progressScanCompareViewModel';

const POSE_LABEL = { front: 'Front', back: 'Back', side: 'Side' };

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function scanRangeLabel(scan, { hideExact = false } = {}) {
  const assessment = scan?.signals?.physiqueAssessment || null;
  if (hideExact) return assessment?.progressSignalLabel || 'Progress signal';
  if (assessment?.visualLeannessScore != null) {
    return `${assessment.leannessBandLabel || 'Scored'} ${assessment.visualLeannessScore}/100`;
  }
  if (assessment?.scanConfidenceTier === 'not_enough') return 'Not enough confidence';
  return scan?.analysisStatus === 'measured' ? 'Measured only' : 'No score';
}

export function scanWeightLabel(scan, { hideExact = false } = {}) {
  if (hideExact) return null;
  const kg = finiteNumber(scan?.stats?.weightKg);
  return kg == null ? null : `${kg} kg`;
}

function ScanSummary({ scan, label, hideExact }) {
  const weight = scanWeightLabel(scan, { hideExact });
  return (
    <View style={styles.summaryPanel}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryDate}>{formatProgressPhotoDay(scan?.capturedAt)}</Text>
      <Text style={styles.summaryRange}>{scanRangeLabel(scan, { hideExact })}</Text>
      <Text style={styles.summaryMeta}>
        {[scan?.qualityLabel || 'saved', weight, `${scan?.assets?.length || 0} photos`].filter(Boolean).join(' | ')}
      </Text>
    </View>
  );
}

function ScanAssetCell({ asset, dateLabel }) {
  if (!asset) {
    return (
      <View style={[styles.photoCell, styles.photoMissing]}>
        <Text style={styles.photoMissingText}>Not taken</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: asset.uri }}
      style={styles.photoCell}
      resizeMode="cover"
      resizeMethod="resize"
      accessible
      accessibilityLabel={`${POSE_LABEL[asset.pose] || 'Scan'} photo from ${dateLabel}`}
    />
  );
}

export default function ProgressScanCompare({ scans = [], onClose, hideExact = false }) {
  const suppressed = usePhotoSuppression();
  const entries = useMemo(() => orderedScanEntries(scans), [scans]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    setSelected((prev) => normaliseScanCompareSelection(prev, entries));
  }, [entries]);

  function toggleSelect(id) {
    setSelected((prev) => nextScanCompareSelection(prev, id));
  }

  const { earlier, later, rows, delta } = useMemo(
    () => buildProgressScanCompareModel(entries, selected),
    [entries, selected],
  );
  const deltaText = hideExact
    ? delta?.trendSummary
    : (delta?.summary || delta?.trendSummary);

  if (suppressed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Compare scans</Text>
            <Text style={styles.subtitle}>Pose-matched scan entries. Trend, confidence and matched photos, not body-fat.</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close scan compare">
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.placeholder}>
          <Ionicons name="leaf-outline" size={32} color={colors.textMuted} />
          <Text style={styles.placeholderText}>Scan comparison is resting for now.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Compare scans</Text>
          <Text style={styles.subtitle}>Pose-matched scan entries. Trend, confidence and matched photos, not body-fat.</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close scan compare">
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

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
                accessibilityLabel={`Scan from ${formatProgressPhotoDay(scan.capturedAt)}${active ? ', chosen' : ''}`}
                style={[styles.scanChip, active && styles.scanChipActive]}
              >
                <Text style={[styles.scanChipDate, active && styles.scanChipDateActive]}>{formatProgressPhotoDay(scan.capturedAt)}</Text>
                <Text style={[styles.scanChipRange, active && styles.scanChipRangeActive]}>{scanRangeLabel(scan, { hideExact })}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!(earlier && later) ? (
          <View style={styles.placeholder}>
            <Ionicons name="scan-outline" size={32} color={colors.textMuted} />
            <Text style={styles.placeholderText}>Two completed scans are needed.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <ScanSummary scan={earlier} label="Earlier" hideExact={hideExact} />
              <ScanSummary scan={later} label="Later" hideExact={hideExact} />
            </View>

            {deltaText ? (
              <View style={styles.deltaBox}>
                <Text style={styles.deltaLabel}>Why this comparison reads this way</Text>
                <Text style={styles.deltaText}>{deltaText}</Text>
              </View>
            ) : null}

            {rows.map((row) => {
              const earlierDate = formatProgressPhotoDay(earlier.capturedAt);
              const laterDate = formatProgressPhotoDay(later.capturedAt);
              return (
                <View key={row.pose} style={styles.poseBlock}>
                  <Text style={styles.poseTitle}>{POSE_LABEL[row.pose] || row.pose}</Text>
                  <View style={styles.photoPair}>
                    <View style={styles.photoSide}>
                      <ScanAssetCell asset={row.earlier} dateLabel={earlierDate} />
                      <Text style={styles.photoLabel}>Earlier</Text>
                    </View>
                    <View style={styles.photoSide}>
                      <ScanAssetCell asset={row.later} dateLabel={laterDate} />
                      <Text style={styles.photoLabel}>Later</Text>
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
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  summaryLabel: { ...type.caption, color: colors.textMuted, fontWeight: fontWeight.semibold },
  summaryDate: { ...type.bodyStrong, color: colors.textPrimary, lineHeight: 20 },
  summaryRange: { ...type.h3, color: colors.primary, lineHeight: 25 },
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

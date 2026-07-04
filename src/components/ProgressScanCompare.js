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
import { explainMeasuredScanDelta } from '../lib/progressScanAnalysis';

const POSES = ['front', 'back', 'side'];
const POSE_LABEL = { front: 'Front', back: 'Back', side: 'Side' };

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDay(ts) {
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return '';
  }
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

export function orderedScanEntries(scans = []) {
  return (Array.isArray(scans) ? scans : [])
    .filter((scan) => scan?.id && scan?.status !== 'draft' && scan?.requiredPosesComplete && Array.isArray(scan.assets))
    .sort((a, b) => (finiteNumber(a.capturedAt) ?? 0) - (finiteNumber(b.capturedAt) ?? 0));
}

export function defaultScanPair(scans = []) {
  const ordered = orderedScanEntries(scans);
  if (ordered.length === 0) return [];
  if (ordered.length === 1) return [ordered[0].id];
  return [ordered[0].id, ordered[ordered.length - 1].id];
}

function assetForPose(scan, pose) {
  return (scan?.assets || []).find((asset) => asset?.pose === pose && asset?.uri) || null;
}

function poseRowsForPair(earlier, later) {
  return POSES
    .map((pose) => ({ pose, earlier: assetForPose(earlier, pose), later: assetForPose(later, pose) }))
    .filter((row) => row.earlier || row.later);
}

function ScanSummary({ scan, label, hideExact }) {
  const weight = scanWeightLabel(scan, { hideExact });
  return (
    <View style={styles.summaryPanel}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryDate}>{formatDay(scan?.capturedAt)}</Text>
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
    setSelected((prev) => {
      const live = prev.filter((id) => entries.some((scan) => scan.id === id));
      if (live.length === 2) return live;
      return defaultScanPair(entries);
    });
  }, [entries]);

  function toggleSelect(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((current) => current !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id];
    });
  }

  const pair = selected
    .map((id) => entries.find((scan) => scan.id === id))
    .filter(Boolean)
    .sort((a, b) => (finiteNumber(a.capturedAt) ?? 0) - (finiteNumber(b.capturedAt) ?? 0));
  const earlier = pair[0] || null;
  const later = pair[1] || null;
  const rows = earlier && later ? poseRowsForPair(earlier, later) : [];
  const delta = useMemo(
    () => (earlier && later ? explainMeasuredScanDelta({ currentScan: later, previousScan: earlier }) : null),
    [earlier, later],
  );
  const deltaText = hideExact
    ? delta?.trendSummary
    : (delta?.summary || delta?.trendSummary);

  if (suppressed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Compare scans</Text>
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
        <Text style={styles.title}>Compare scans</Text>
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
                accessibilityLabel={`Scan from ${formatDay(scan.capturedAt)}${active ? ', chosen' : ''}`}
                style={[styles.scanChip, active && styles.scanChipActive]}
              >
                <Text style={[styles.scanChipDate, active && styles.scanChipDateActive]}>{formatDay(scan.capturedAt)}</Text>
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
                <Text style={styles.deltaText}>{deltaText}</Text>
              </View>
            ) : null}

            {rows.map((row) => {
              const earlierDate = formatDay(earlier.capturedAt);
              const laterDate = formatDay(later.capturedAt);
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
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.textPrimary },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  strip: { gap: spacing.sm, paddingRight: spacing.lg },
  scanChip: {
    minWidth: 122,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    gap: spacing.xxs,
  },
  scanChipActive: { backgroundColor: colors.primaryFill },
  scanChipDate: { ...type.caption, color: colors.textMuted },
  scanChipDateActive: { color: colors.onPrimary },
  scanChipRange: { ...type.bodyStrong, color: colors.textPrimary },
  scanChipRangeActive: { color: colors.onPrimary },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryPanel: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  summaryLabel: { ...type.caption, color: colors.textMuted, fontWeight: fontWeight.semibold },
  summaryDate: { ...type.bodyStrong, color: colors.textPrimary },
  summaryRange: { ...type.h3, color: colors.primary },
  summaryMeta: { ...type.caption, color: colors.textMuted },
  deltaBox: {
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    padding: spacing.md,
  },
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

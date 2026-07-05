import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from './Card';
import { scanReadCopy, scanStatsCopy } from '../lib/progressScanCopy';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';
import {
  colors, spacing, radius, type, fontWeight, iconSize,
} from '../styles/theme';

const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

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
        <Text style={styles.scanTitle}>Scan history</Text>
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
      {scans.map((scan) => (
        <View key={scan.id} style={styles.scanEntry}>
          <View style={styles.scanEntryHeader}>
            <View style={styles.scanEntryTitleGroup}>
              <Text style={styles.scanDate}>{formatProgressPhotoDay(scan.capturedAt)}</Text>
              <Text style={styles.scanQuality}>
                {scan.deltaExplanation?.comparisonStatus === 'comparable' ? 'like-for-like' : scan.qualityLabel || 'saved'}
              </Text>
            </View>
            {!readOnly ? (
              <TouchableOpacity
                onPress={() => onDeleteScan?.(scan)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete scan from ${formatProgressPhotoDay(scan.capturedAt)}`}
                style={styles.scanDeleteButton}
              >
                <Ionicons name="trash-outline" size={iconSize.sm} color={colors.error} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.scanBody}>{scanReadCopy(scan, { suppressed, hideExact })}</Text>
          {scan.deltaExplanation?.summary && !suppressed && !hideExact ? (
            <Text style={styles.scanDelta}>{scan.deltaExplanation.summary}</Text>
          ) : scan.deltaExplanation?.trendSummary && !suppressed ? (
            <Text style={styles.scanDelta}>{scan.deltaExplanation.trendSummary}</Text>
          ) : null}
          <Text style={styles.scanStats}>{scanStatsCopy(scan, { suppressed, hideExact })}</Text>
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
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  scanCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  scanCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  scanTitle: { ...type.h3, color: colors.textPrimary },
  scanDate: { ...type.caption, color: colors.textMuted },
  scanBody: { ...type.bodySm, color: colors.textMuted },
  hideExactToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  hideExactText: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  scanEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  scanEntryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  scanEntryTitleGroup: { flex: 1, gap: spacing.xxs },
  scanDeleteButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scanQuality: { ...type.caption, color: colors.textMuted, textTransform: 'capitalize' },
  scanDelta: { ...type.bodySm, color: colors.textSecondary },
  scanStats: { ...type.caption, color: colors.textMuted },
  scanAssetRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  scanAssetThumb: { width: 58, gap: spacing.xxs },
  scanAssetImage: { width: 58, height: 58, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  scanAssetPose: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});

// ProgressScanTrend — progress-photos wave 3 (results-ui-and-copy-blueprint.md
// §4). The score-over-time view: comparable scans only, unconnected markers
// for non-comparable scans, confidence encoded by marker SHAPE (never colour
// alone), gaps visible with a tap-through reason, no smoothing/projection/
// goal line. No new chart library (CLAUDE.md dependency rule) and no
// score-over-time chart exists elsewhere to match, so this is a simple
// deterministic rows-and-markers layout built from theme tokens, matching the
// house pattern for progress-photo overlays (ProgressScanCompare: a
// SafeAreaView + ScrollView, not FlashList; the list here is bounded to the
// scan library cap, never long enough to need virtualisation).
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';
import {
  buildTrendPoints,
  trendLadderLabel,
  TREND_EMPTY_STATE_TEXT,
} from '../lib/progressScanTrendViewModel';

function MarkerIcon({ shape }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (shape === 'solid') return <View style={[styles.marker, styles.markerSolid, live.markerSolid]} />;
  if (shape === 'hollow') return <View style={[styles.marker, styles.markerHollow, live.markerHollow]} />;
  return <View style={[styles.marker, styles.markerUnscored, live.markerUnscored]} />;
}

function pointAccessibilityLabel(point, dateLabel) {
  if (point.scoreText) {
    const connection = point.isBaseline
      ? ' Your starting point.'
      : point.comparable ? '' : ' Not connected to the previous set.';
    return `${dateLabel}. Volyume Score ${point.scoreText}, ${point.chipLabel}.${connection}`;
  }
  return `${dateLabel}. ${point.chipLabel}. No score available.`;
}

export default function ProgressScanTrend({ scans = [], onClose }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const suppressed = usePhotoSuppression();
  const { points, comparableCount, totalCount } = useMemo(() => buildTrendPoints(scans), [scans]);
  const [expandedId, setExpandedId] = useState(null);
  const ladderLabel = trendLadderLabel(comparableCount, totalCount);

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Score trend</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.subtitle, live.subtitle]}>
            Comparable photo sets only. Gaps are shown, never smoothed over.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close score trend"
        >
          <Ionicons name="close" size={26} color={t.colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  }

  if (suppressed) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
        {renderHeader()}
        <View style={styles.placeholder}>
          <Ionicons name="leaf-outline" size={32} color={t.colors.textMuted} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.placeholderText, live.placeholderText]}>Trend view is hidden for now.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (points.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
        {renderHeader()}
        <View style={styles.placeholder}>
          <Ionicons name="trending-up-outline" size={32} color={t.colors.textMuted} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.placeholderText, live.placeholderText]}>{TREND_EMPTY_STATE_TEXT}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      {renderHeader()}
      {ladderLabel ? (
        <View style={styles.ladderRow}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.ladderText, live.ladderText]}>{ladderLabel}</Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        {points.map((point, index) => {
          const dateLabel = formatProgressPhotoDay(point.capturedAt);
          const expanded = expandedId === point.scanId;
          const showsGap = !point.isBaseline && !point.comparable;
          const detailText = point.isBaseline
            ? 'Your starting point.'
            : point.comparable
              ? 'Comparable with the previous set.'
              : (point.gapReason || 'Not compared with the previous set.');
          return (
            <View key={point.scanId} style={styles.row}>
              {index > 0 ? (
                <View style={[styles.connector, live.connector, showsGap && [styles.connectorGap, live.connectorGap]]} />
              ) : null}
              <TouchableOpacity
                style={styles.pointRow}
                onPress={() => setExpandedId(expanded ? null : point.scanId)}
                accessibilityRole="button"
                accessibilityLabel={pointAccessibilityLabel(point, dateLabel)}
                accessibilityState={{ expanded }}
              >
                <MarkerIcon shape={point.shape} />
                <View style={styles.pointCopy}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.pointDate, live.pointDate]}>{dateLabel}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.pointValue, live.pointValue]} numberOfLines={1}>
                    {point.scoreText || point.chipLabel}
                  </Text>
                </View>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={iconSize.sm}
                  color={t.colors.textMuted}
                />
              </TouchableOpacity>
              {expanded ? (
                <View style={[styles.pointDetail, live.pointDetail]}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.pointDetailText, live.pointDetailText]}>{detailText}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.textPrimary },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  subtitle: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  ladderRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  ladderText: { ...type.bodyStrong, color: colors.textPrimary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  placeholder: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  placeholderText: { ...type.bodyStrong, color: colors.textPrimary, textAlign: 'center' },
  row: { gap: 0 },
  connector: { width: 2, height: spacing.md, marginLeft: 6 + spacing.lg, backgroundColor: colors.border },
  connectorGap: { backgroundColor: 'transparent', borderLeftWidth: 2, borderLeftColor: colors.border, borderStyle: 'dashed', width: 0 },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  marker: { width: 14, height: 14, borderRadius: 7 },
  markerSolid: { backgroundColor: colors.primary },
  markerHollow: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
  markerUnscored: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  pointCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  pointDate: { ...type.label, color: colors.textPrimary },
  pointValue: { ...type.bodySm, color: colors.textMuted },
  pointDetail: {
    marginLeft: 14 + spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  pointDetailText: { ...type.bodySm, color: colors.textSecondary, lineHeight: 20 },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. header/headerCopy/ladderRow/
// content/placeholder/row/pointRow/marker/pointCopy have no colour tokens.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    ladderText: { color: t.colors.textPrimary },
    placeholderText: { color: t.colors.textPrimary },
    connector: { backgroundColor: t.colors.border },
    connectorGap: { borderLeftColor: t.colors.border },
    markerSolid: { backgroundColor: t.colors.primary },
    markerHollow: { borderColor: t.colors.primary },
    markerUnscored: { borderColor: t.colors.border },
    pointDate: { color: t.colors.textPrimary },
    pointValue: { color: t.colors.textMuted },
    pointDetail: { backgroundColor: t.colors.surface2 },
    pointDetailText: { color: t.colors.textSecondary },
  };
}

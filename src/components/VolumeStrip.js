/**
 * VolumeStrip - this Monday week so far, in logged working sets, over a
 * segmented bar in three named tones (D214, plan 7.1 item 2, line 3 and the
 * strip). Moved out of AnalyticsScreen.js under D231 (app layout rework, batch
 * 2) so Train draws the very same component: the model is pure
 * (src/lib/progress/volumeStrip.js: the count is volumeLogged.js's one
 * definition, the "under" count is the Volume heatmap's first group by
 * construction); this only draws it. The line and bar open the heatmap on
 * "This week"; the legend and its (i) sit outside that touch target so a
 * screen reader reaches each. In a recovery week no verdict is drawn: one
 * neutral shade named "Trained", the recovery sentence under the line.
 *
 * CP-10 batch G (2026-07-11): own useTheme() call; the frozen `styles` block
 * stays byte-identical to the one the Progress screen carried and
 * `buildLiveStyles` mirrors only its colour/type-bearing keys.
 */
import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import LegendRow from './LegendRow';
import InfoTooltip from './InfoTooltip';
// The strip's (i) text lives with its legend words in the pure model
// (STRIP_TOOLTIP, STRIP_RECOVERY_TOOLTIP), so the words the (i) names are the
// words the legend prints.
import { stripToneColors, STRIP_TOOLTIP, STRIP_RECOVERY_TOOLTIP } from '../lib/progress/volumeStrip';

export default function VolumeStrip({ strip, legendItems, onOpen }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const tone = stripToneColors(t.colors);
  return (
    <View testID="volume-strip" style={styles.strip}>
      <TouchableOpacity
        style={styles.stripTouch}
        onPress={() => { haptics.selection(); onOpen?.(); }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={strip.spoken}
        accessibilityHint="Opens the Volume heatmap for this week"
      >
        <View style={styles.stripTop}>
          <View style={styles.stripText}>
            <Text style={[styles.stripLine, live.stripLine]}>{strip.line}</Text>
            {strip.recoveryLine ? (
              <Text style={[styles.stripNote, live.stripNote]}>{strip.recoveryLine}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </View>
        {strip.hasSetsThisWeek ? (
          <View
            style={styles.volStackBar}
            testID="volume-strip-bar"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {strip.segments.map(seg => (
              <View
                key={seg.muscle}
                style={[
                  styles.volStackSegment,
                  { flex: Math.max(seg.sets, 0.5), backgroundColor: strip.recoveryWeek ? tone.neutral : tone[seg.tone] },
                  strip.recoveryWeek ? live.stripNeutralSegment : null,
                ]}
              />
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
      {strip.hasSetsThisWeek ? (
        <LegendRow
          items={legendItems}
          trailing={<InfoTooltip text={strip.recoveryWeek ? STRIP_RECOVERY_TOOLTIP : STRIP_TOOLTIP} />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: spacing.md },
  stripTouch: { gap: spacing.md },
  stripTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stripText: { flex: 1, gap: spacing.xxs },
  // The strip's line is a sentence of numbers, so it wears tabular figures.
  stripLine: { ...type.num('bodySm'), color: colors.textPrimary },
  stripNote: { ...type.bodySm, color: colors.textSecondary },
  volStackBar: { flexDirection: 'row', height: 8, gap: spacing.xxs },
  volStackSegment: { borderRadius: radius.hair },
});

function buildLiveStyles(t) {
  return {
    stripLine: { ...t.type.num('bodySm'), color: t.colors.textPrimary },
    stripNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    // A recovery week's one neutral shade needs a hairline to read on the card.
    stripNeutralSegment: { borderWidth: 1, borderColor: t.colors.border },
  };
}

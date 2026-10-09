import { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from './Text';
import { colors, spacing, type, circle, hitSlop } from '../styles/theme';
import useTheme from '../hooks/useTheme';

/**
 * D219 lane B5 (design section 6): the lines that explain a plan, each with its
 * one-line source on tap.
 *
 * The sentences are computed in `lib/plan/explain.js` from the plan's own facts;
 * this component only shows them. Each line's source (its grade and a one-line
 * source) stays out of the way until the person taps "Source", so a long
 * explanation reads in one pass and the research is there when they want it.
 * With no lines (a plan the new planner did not build) it renders nothing, so
 * the screens that embed it are unchanged for every other plan.
 *
 * @param {object} props
 * @param {Array<{ id: string, text: string,
 *          source: { gradeLabel: string, line: string } }>} props.lines
 */
export default function PlanExplainLines({ lines }) {
  // Live theme (src/hooks/useTheme.js): the frozen `styles` below plus the live
  // override from buildLiveStyles, the same pattern as the other components.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [open, setOpen] = useState({});

  if (!Array.isArray(lines) || lines.length === 0) return null;

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <View style={styles.list}>
      {lines.map((item) => {
        const isOpen = open[item.id] === true;
        return (
          <View key={item.id} style={styles.item}>
            <View style={[styles.bullet, live.bullet]} />
            <View style={styles.body}>
              <Text style={[styles.text, live.text]}>{item.text}</Text>
              <TouchableOpacity
                onPress={() => toggle(item.id)}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={isOpen ? 'Hide the source for this line' : 'Show the source for this line'}
                accessibilityState={{ expanded: isOpen }}
                style={styles.sourceButton}
              >
                <Text style={[styles.sourceToggle, live.sourceToggle]}>{isOpen ? 'Hide source' : 'Source'}</Text>
              </TouchableOpacity>
              {isOpen ? (
                <Text style={[styles.sourceText, live.sourceText]}>
                  {`${item.source?.gradeLabel ?? 'Source'}. ${item.source?.line ?? ''}`}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.primary, marginTop: spacing.xs2 },
  body: { flex: 1, gap: spacing.xs },
  text: { ...type.bodySm, color: colors.textSecondary },
  sourceButton: { alignSelf: 'flex-start' },
  sourceToggle: { ...type.caption, color: colors.primary },
  sourceText: { ...type.caption, color: colors.textMuted },
});

// Live override for the frozen `styles` block above (the same "frozen base +
// live override" pattern as SectionLabel.js and the screens).
function buildLiveStyles(t) {
  return {
    bullet: { backgroundColor: t.colors.primary },
    text: { ...t.type.bodySm, color: t.colors.textSecondary },
    sourceToggle: { ...t.type.caption, color: t.colors.primary },
    sourceText: { ...t.type.caption, color: t.colors.textMuted },
  };
}

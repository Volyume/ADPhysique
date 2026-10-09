/**
 * LegendRow (Progress, recovery heatmap and Consistency elevation, register
 * D214; `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 7.0 rule 3 and 7.5).
 *
 * ONE legend style for every figure on the four screens: the body figure's
 * two palettes, the Progress strip and the training-days grid. Rule 3 of the
 * plan: every colour is named, once, in one style. A flex-wrapped row of
 * 12 dp swatches (`radius.xs`) with a `captionTight` label in
 * `textSecondary`, and an optional trailing node (an InfoTooltip).
 *
 * Items: `[{ key, label, swatch, endLabel?, spokenLabel? }]`. `swatch` is
 *   - `fill`     a colour for the swatch, or omitted for "no fill";
 *   - `outline`  'solid' | 'dashed' | 'none' (default 'none'): a 1 dp hairline
 *                in the `border` token. A swatch that is a state with no fill
 *                (the figure's "No sets", "No session in 14 days") carries its
 *                state in the hairline, so it is never an empty gap;
 *   - `ramp`     an array of fills drawn as a small run of swatches, one item
 *                for a graded scale. An entry is a colour string, or
 *                `{ fill, borderColor }` where the swatch also carries a 1 dp
 *                solid outline in that colour (the recovery ramp's third
 *                step: a faint fill held by a solid outline).
 * A ramp item reads label, swatches, then the optional `endLabel` ("More to
 * recover" [swatches] "less"); every other item reads swatch then label.
 *
 * Accessibility: the entries are ONE accessible group whose label joins them
 * ("Key: Under the range, Just enough, ..."). The trailing node sits OUTSIDE
 * that group, because a screen reader would otherwise swallow an InfoTooltip
 * nested inside an accessible parent (iOS VoiceOver cannot reach a child of an
 * accessible view). An item may carry `spokenLabel` where the printed words
 * ("More to recover ... less") need a sentence to be understood aloud.
 *
 * Live theme (`useTheme`): the frozen block holds only layout, spacing and
 * radius; every colour and type role is read from the live theme, so the row
 * follows dark, light, higher-contrast and colour-blind-safe without a
 * restart. No amber: a legend names a state, it is never the thing to do.
 */

import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';

const SWATCH_SIZE = 12;

function outlineStyle(outline, borderColour) {
  if (outline === 'solid') return { borderWidth: 1, borderColor: borderColour, borderStyle: 'solid' };
  if (outline === 'dashed') return { borderWidth: 1, borderColor: borderColour, borderStyle: 'dashed' };
  return null;
}

function Swatch({ fill, outline, borderColor, t }) {
  return (
    <View
      testID="legend-swatch"
      style={[
        styles.swatch,
        fill ? { backgroundColor: fill } : null,
        borderColor ? { borderWidth: 1, borderColor, borderStyle: 'solid' } : outlineStyle(outline, t.colors.border),
      ]}
    />
  );
}

function Ramp({ ramp, t }) {
  return (
    <View testID="legend-ramp" style={styles.ramp}>
      {ramp.map((step, i) => {
        const spec = typeof step === 'string' ? { fill: step } : (step || {});
        // eslint-disable-next-line react/no-array-index-key -- a fixed, ordered scale, no id of its own
        return <Swatch key={i} fill={spec.fill} borderColor={spec.borderColor} t={t} />;
      })}
    </View>
  );
}

/** The spoken form of one entry: its own sentence, else "label to endLabel", else the label. */
function spokenFor(item) {
  if (typeof item.spokenLabel === 'string' && item.spokenLabel) return item.spokenLabel;
  if (item.endLabel) return `${item.label} to ${item.endLabel}`;
  return item.label;
}

export default function LegendRow({ items, trailing = null, style }) {
  const t = useTheme();
  const entries = Array.isArray(items) ? items.filter((item) => item && item.label) : [];
  if (!entries.length) return null;

  const labelStyle = { ...t.type.captionTight, color: t.colors.textSecondary };
  const spoken = `Key: ${entries.map(spokenFor).join(', ')}`;

  return (
    <View style={[styles.row, style]}>
      <View
        style={styles.items}
        accessible
        accessibilityRole="text"
        accessibilityLabel={spoken}
      >
        {entries.map((item) => {
          const swatch = item.swatch || {};
          const isRamp = Array.isArray(swatch.ramp) && swatch.ramp.length > 0;
          return (
            <View key={item.key ?? item.label} style={styles.item} testID={`legend-item-${item.key ?? item.label}`}>
              {isRamp ? (
                <>
                  <Text style={labelStyle}>{item.label}</Text>
                  <Ramp ramp={swatch.ramp} t={t} />
                  {item.endLabel ? <Text style={labelStyle}>{item.endLabel}</Text> : null}
                </>
              ) : (
                <>
                  <Swatch fill={swatch.fill} outline={swatch.outline} t={t} />
                  <Text style={labelStyle}>{item.label}</Text>
                </>
              )}
            </View>
          );
        })}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  items: {
    flexShrink: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.md,
    rowGap: spacing.xs2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
  },
  ramp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: radius.xs,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});

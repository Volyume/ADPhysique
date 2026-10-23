/**
 * InjuryLines - the always-on Injuries & limitations lines, shown on Train under
 * the Injuries & limitations row (D231, app layout rework, batch 2). They were
 * the quiet rows in the Injuries & limitations group at the foot of Today.
 *
 * Plain text, never a touch target: the Injuries & limitations row directly
 * above is this screen's one door to that screen (spec rule 3, "one door per
 * screen"), so none of the three lines is a second one. The conditions are the
 * ones the Today rows had, unchanged:
 *   - works around an injury: an applied, un-held episode rule AND an active plan;
 *   - reintroduction: this block week's planned rows carry the ramp's stamp;
 *   - could not check: the capability read failed with no last-known state.
 * Meaning is in the text alone (J3); renders nothing when none applies.
 *
 * The lines come from `useInjuryLines` (src/lib/capability/injuryLines.js holds
 * the logic); this component only draws them. Live theme via `useTheme`; the
 * frozen block carries layout only.
 */
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { constraintLineText } from '../lib/homeCoachBrief';
import { COULD_NOT_CHECK_LINE } from '../lib/capability/injuryLines';

/**
 * @param {{ lines: { activeConstraint: boolean, constraintSubject: string|null, rampLine: string|null, checkFailed: boolean }, hasPlan: boolean }} props
 */
export default function InjuryLines({ lines, hasPlan }) {
  const t = useTheme();
  const rows = [];
  if (lines?.activeConstraint && hasPlan) {
    rows.push({ key: 'works-around', text: constraintLineText(lines.constraintSubject) });
  }
  if (lines?.rampLine) rows.push({ key: 'ramp', text: lines.rampLine });
  if (lines?.checkFailed) rows.push({ key: 'check-failed', text: COULD_NOT_CHECK_LINE });
  if (rows.length === 0) return null;
  return (
    <View style={styles.wrap} testID="injury-lines">
      {rows.map(row => (
        <Text
          key={row.key}
          testID={`injury-line-${row.key}`}
          style={[t.type.bodySm, { color: t.colors.textSecondary }]}
        >
          {row.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
});

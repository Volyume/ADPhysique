/**
 * EmptyDiary: the designed empty-state for a day with no food entries.
 *
 * Diary-tab redesign 2026-06-01 (supersedes the locked single-sentence copy in
 * UI_FLOWS_LOCKED.md). Instead of a bare line under six dashed boxes, an empty
 * day shows one calm card: a short factual line and the primary actions, so the
 * body of the screen is inviting rather than a wall of placeholders. The
 * training-day cue is carried by the summary card's day-type chip, so it is not
 * repeated here. Scan stays on the persistent FAB.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type, hitSlop, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import Button from '../Button';
import { touchTarget } from '../../styles/layout';

// D192 (finish spec 2a, 2026-09-18): trimmed to one line, no trailing stop --
// matches the finish spec's own status-line examples ("No sessions yet this
// week"). The glyph that used to sit above it is retired with it.
export const EMPTY_DIARY_COPY = 'Nothing logged yet';

export default function EmptyDiary({
  onAdd,
  onCopyYesterday,
  onPlanDay,
  addLabel = 'Add food',
  addAccessibilityLabel = 'Add food',
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.card, live.card]} accessibilityRole="summary">
      <Text style={[styles.body, live.body]}>{EMPTY_DIARY_COPY}</Text>
      {onPlanDay ? (
        <TouchableOpacity
          style={[styles.planRow, live.planRow]}
          onPress={onPlanDay}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Open meal builder for this day or week"
        >
          <Ionicons name="restaurant-outline" size={iconSize.md} color={t.colors.textSecondary} />
          <View style={styles.planCopy}>
            <Text style={[styles.planTitle, live.planTitle]}>Meal builder</Text>
            {/* D192 (finish spec 2b, 2026-09-18): one line -- the row's
                own chevron+title already say this is a tap-through, so the
                second sentence ("Nothing is logged until you add it") is
                dropped rather than carried. */}
            <Text style={[styles.planText, live.planText]}>Build a day or week from your targets</Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.actions}>
        {onAdd ? (
          <Button
            title={addLabel}
            size="md"
            icon="add"
            // D192 (finish spec 2c/4.6, 2026-09-18): the diary's one
            // committing action -- full width (Button's own default), amber
            // leading glyph via the per-instance iconFg, fill neutral: the
            // same pattern D191 gave Today's "Start workout".
            iconFg={t.colors.primary}
            onPress={onAdd}
            accessibilityLabel={addAccessibilityLabel}
            style={styles.actionButton}
          />
        ) : null}
        {onCopyYesterday ? (
          <Button
            title="Copy yesterday"
            variant="secondary"
            size="sm"
            icon="copy-outline"
            onPress={onCopyYesterday}
            accessibilityLabel="Copy yesterday's entries"
            fullWidth={false}
            style={styles.actionButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // D165 law 2: an empty state, not an object -- no box, a borderSubtle hairline above (D171/D172).
  // D192 (2026-09-18, finish spec 2a/4.8): no glyph, left-aligned -- alignItems
  // drops the centring default so the fact and the row below both read from
  // the left edge instead of as a centred block.
  card: {
    paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  // D192 (2c): "Add food" is now full width (Button's default), so this
  // stacks Copy yesterday underneath it instead of beside it -- a column,
  // not a row, because a row's `alignSelf: 'stretch'` only governs a
  // child's HEIGHT, never its width. Copy yesterday keeps
  // `fullWidth={false}`, so it hugs its own content and left-aligns under
  // the full-width button above it.
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  // Finish spec item 6 (D192): a row (spec 4.3) -- unboxed 20dp glyph at the
  // left, title 16 semibold, one 13 secondary line, chevron, no box round
  // it. Replaces the bordered surface2 box and its boxed icon disc.
  // RE-ANCHORED 2026-09-18 (D192, day zero 2b): 56 dp (was 62) and a
  // hairline above AND below, so the row reads as bounded between the
  // plain fact above it and the actions below it, per spec 4.3's row law.
  planRow: {
    alignSelf: 'stretch',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  planCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  planTitle: { ...type.title, color: colors.textPrimary },
  planText: { ...type.bodySm, color: colors.textSecondary, marginTop: 2, textAlign: 'left' },
  actionButton: { minHeight: touchTarget.minimum },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. actions/planCopy/actionButton
// have no colour tokens.
function buildLiveStyles(t) {
  return {
    // D169: the live half read `t.colors.border` while the frozen half sets
    // `colors.borderSubtle` above. Live is appended after frozen in every
    // style array on this screen, so live won and this drew the bright
    // control-edge grey against its own stated intent. Same defect as
    // LoggedSetRow (D166), EvidencePanel (D167) and the summary stat tiles
    // (D168) -- the pattern the styling rules now forbid for new components.
    card: { borderTopColor: t.colors.borderSubtle },
    body: { color: t.colors.textSecondary },
    planRow: { borderTopColor: t.colors.borderSubtle, borderBottomColor: t.colors.borderSubtle },
    planTitle: { color: t.colors.textPrimary },
    planText: { color: t.colors.textSecondary },
  };
}

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

/**
 * Shared empty-state component used across screens.
 * Adherence-neutral, no shame copy, purely directional ("here's what to do next").
 *
 * Props:
 *   icon       - Ionicons name (default 'information-circle-outline')
 *   title      - short headline
 *   text       - one or two sentence explanation
 *   actionLabel / onAction         - primary CTA (optional)
 *   actionAccessibilityLabel       - overrides the primary CTA's a11y label (defaults to actionLabel, same as Button)
 *   secondaryLabel / onSecondary   - secondary CTA (optional)
 *   secondaryAccessibilityLabel    - overrides the secondary CTA's a11y label (defaults to secondaryLabel)
 *   ghost      - if true, renders faint/dismissible "your data will look like this" style
 *   onDismiss  - if provided with ghost, shows a dismiss control
 *   compact    - tighter padding for inline use
 *   busy       - primary action is mid-attempt (item 3, D141): disables the
 *                primary Button and morphs it to Button's own inline
 *                ActivityIndicator/busy treatment (ADX-B26.1a). The
 *                accessibility label stays the original actionLabel even
 *                while the visual content is the spinner (Button always
 *                sets accessibilityLabel from `title`), and
 *                accessibilityState carries disabled+busy the same way
 *                every other Button in the app does. The secondary action
 *                is left enabled -- ruling: "Browse plans" never conflicts
 *                with an in-flight "Start with a plan" preview.
 */
export default function EmptyState({
  icon = 'information-circle-outline',
  title,
  text,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
  secondaryLabel,
  onSecondary,
  secondaryAccessibilityLabel,
  ghost = false,
  onDismiss,
  compact = false,
  busy = false,
}) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View
      style={[
        styles.card,
        live.card,
        compact && styles.cardCompact,
        ghost && [styles.cardGhost, live.cardGhost],
      ]}
    >
      {ghost && onDismiss && (
        <TouchableOpacity
          style={styles.dismiss}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={16} color={t.colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* D172. This was a 52 dp amber disc with a 1 dp amber edge around a
          stock outline glyph, repeated identically on 87 screens -- the single
          most-repeated object in the product and, in the redesign audit's own
          words, one of the things critics name first.

          Law 6 settles the colour: amber means "now", and an empty state is
          the absence of anything happening. Law 2 settles the disc: a ring
          drawn round a glyph is decoration, not an object. So the glyph stays
          for wayfinding, quietly, and the disc goes. */}
      <Ionicons
        name={icon}
        size={compact ? 24 : 28}
        color={t.colors.textMuted}
        style={styles.icon}
      />

      {!!title && (
        <Text style={[styles.title, live.title, ghost && [styles.titleGhost, live.titleGhost]]}>{title}</Text>
      )}
      {!!text && (
        <Text style={[styles.text, live.text]}>{text}</Text>
      )}

      {/* D1 sweep (f): the CTAs are the shared Button primitive, so empty
          states carry the app's one press model / disabled treatment instead
          of the last two hand-rolled primaryBtn blocks. */}
      {(actionLabel || secondaryLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Button
              title={actionLabel}
              onPress={onAction}
              size="md"
              fullWidth={false}
              accessibilityLabel={actionAccessibilityLabel}
              loading={busy}
            />
          )}
          {secondaryLabel && onSecondary && (
            <Button
              title={secondaryLabel}
              onPress={onSecondary}
              variant="secondary"
              size="md"
              fullWidth={false}
              accessibilityLabel={secondaryAccessibilityLabel}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // D172, law 2: a card means an object you can pick up, and an empty state is
  // the absence of one. A bordered box in the middle of an otherwise blank
  // screen is the "poster" the Community pass named (CR-17/D163) and then
  // fixed at section level; this finishes the same job at screen level. The
  // earlier note about matching Card's radius is left below because it
  // explains why the radius WAS lg, and there is no radius here now.
  card: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  cardCompact: { padding: spacing.lg },
  // The GHOST variant keeps its outline, and that is not an exception to law 2
  // being sloppy. Ghost means "your data will look like this": the dashed edge
  // is doing real work, marking a placeholder as not-yet-real. It now carries
  // its own borderWidth, because the base no longer sets one -- without that
  // the dashed style had nothing to draw and the variant would have gone
  // silently blank.
  cardGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    opacity: 0.75,
  },
  dismiss: { position: 'absolute', top: spacing.md, right: spacing.md, padding: spacing.xxs },
  icon: { marginBottom: spacing.xxs },
  title: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  titleGhost: { color: colors.textMuted },
  text: {
    ...type.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles -- the
// component calls `const t = useTheme(); const live = buildLiveStyles(t);`
// and appends `live.KEY` after `styles.KEY` in each style array. Only
// mirrors the colour-bearing sub-properties of the matching frozen style, at
// identical rest values; cardCompact/iconWrapCompact/dismiss/actions have no
// colour tokens, so there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    cardGhost: { borderColor: t.colors.borderSubtle },
    title: { ...t.type.title, color: t.colors.textPrimary },
    titleGhost: { color: t.colors.textMuted },
    text: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}

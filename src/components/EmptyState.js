import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import { colors, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
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

      <View style={[styles.iconWrap, live.iconWrap, compact && styles.iconWrapCompact, ghost && [styles.iconWrapGhost, live.iconWrapGhost]]}>
        <Ionicons
          name={icon}
          size={compact ? 24 : 28}
          color={ghost ? t.colors.textMuted : t.colors.primary}
        />
      </View>

      {!!title && (
        <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title, ghost && [styles.titleGhost, live.titleGhost]]}>{title}</Text>
      )}
      {!!text && (
        <Text maxFontSizeMultiplier={1.3} style={[styles.text, live.text]}>{text}</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    gap: spacing.md,
  },
  cardCompact: { padding: spacing.lg },
  cardGhost: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    opacity: 0.75,
  },
  dismiss: { position: 'absolute', top: spacing.md, right: spacing.md, padding: spacing.xxs },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  iconWrapCompact: { width: 44, height: 44 },
  iconWrapGhost: {
    backgroundColor: colors.surface2,
    borderColor: colors.borderSubtle,
  },
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
    iconWrap: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    iconWrapGhost: { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle },
    title: { ...t.type.title, color: t.colors.textPrimary },
    titleGhost: { color: t.colors.textMuted },
    text: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}

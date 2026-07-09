import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import { colors, spacing, radius, type, withAlpha, alpha } from '../styles/theme';

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
  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        ghost && styles.cardGhost,
      ]}
    >
      {ghost && onDismiss && (
        <TouchableOpacity
          style={styles.dismiss}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <View style={[styles.iconWrap, compact && styles.iconWrapCompact, ghost && styles.iconWrapGhost]}>
        <Ionicons
          name={icon}
          size={compact ? 24 : 28}
          color={ghost ? colors.textMuted : colors.primary}
        />
      </View>

      {!!title && (
        <Text style={[styles.title, ghost && styles.titleGhost]}>{title}</Text>
      )}
      {!!text && (
        <Text style={styles.text}>{text}</Text>
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

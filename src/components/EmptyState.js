import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

/**
 * Shared empty-state component used across screens.
 * Adherence-neutral, no shame copy, purely directional ("here's what to do next").
 *
 * Props:
 *   icon       - Ionicons name (default 'sparkles-outline')
 *   title      - short headline
 *   text       - one or two sentence explanation
 *   actionLabel / onAction         - primary CTA (optional)
 *   secondaryLabel / onSecondary   - secondary CTA (optional)
 *   ghost      - if true, renders faint/dismissible "your data will look like this" style
 *   onDismiss  - if provided with ghost, shows a dismiss control
 *   compact    - tighter padding for inline use
 */
export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  text,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
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

      <Ionicons
        name={icon}
        size={compact ? 32 : 40}
        color={ghost ? colors.surface3 : colors.primary}
      />

      {!!title && (
        <Text style={[styles.title, ghost && styles.titleGhost]}>{title}</Text>
      )}
      {!!text && (
        <Text style={styles.text}>{text}</Text>
      )}

      {(actionLabel || secondaryLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <TouchableOpacity style={styles.primaryBtn} onPress={onAction} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
          {secondaryLabel && onSecondary && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.md,
  },
  cardCompact: { padding: spacing.lg },
  cardGhost: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: colors.border,
    opacity: 0.75,
  },
  dismiss: { position: 'absolute', top: spacing.md, right: spacing.md, padding: spacing.xxs },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  titleGhost: { color: colors.textMuted },
  text: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
  secondaryBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
});

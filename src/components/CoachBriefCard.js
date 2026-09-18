import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, withAlpha, alpha, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// ── Coach Brief Card ──────────────────────────────────────────────────────────
// Extracted from HomeScreen.js (behaviour-preserving decomposition): the
// pre-workout coaching brief card shown in the hero when buildCoachBrief
// (src/lib/homeCoachBrief.js) has a real signal. Pure presentational
// component; the brief itself is computed by the caller.

const BRIEF_ICON = { go: 'fitness-outline', caution: 'warning-outline', recover: 'leaf-outline' };

// CP-10 stage 3 (theming batch 2): BRIEF_BORDER/BRIEF_ICON_COLOR were
// module-scope consts baked at import time from the static `colors`
// singleton (class 2, CP-10 plan section 1.4) -- frozen until an app
// restart. Now built per-render from the live theme (src/hooks/useTheme.js),
// same pattern as Button.js's buildVariants/buildSizes (CP-10 stage 1).
// buildBriefIconColor is exported (replacing the old static BRIEF_ICON_COLOR
// export) so HomeScreen's own readiness-summary chip (S15#7), which reuses
// the same tone colours, builds it from its OWN live `t.colors` and stays in
// the same theme generation as this card.
function buildBriefBorder(c) {
  return {
    go:      withAlpha(c.primary, alpha.soft),
    caution: withAlpha(c.warning, alpha.soft),
    recover: withAlpha(c.success, alpha.soft),
  };
}
export function buildBriefIconColor(c) {
  return {
    go:      c.primary,
    caution: c.warning,
    recover: c.success,
  };
}

function CoachBriefCard({ brief, onDismiss }) {
  const t = useTheme();
  const BRIEF_BORDER = buildBriefBorder(t.colors);
  const BRIEF_ICON_COLOR = buildBriefIconColor(t.colors);
  const borderColor = BRIEF_BORDER[brief.type] ?? BRIEF_BORDER.go;
  const iconColor   = BRIEF_ICON_COLOR[brief.type] ?? BRIEF_ICON_COLOR.go;
  const iconName    = BRIEF_ICON[brief.type] ?? BRIEF_ICON.go;
  const live = {
    coachBriefCard: { backgroundColor: t.colors.surface },
    coachBriefHeadline: { ...t.type.bodySm, fontWeight: fontWeight.bold, color: t.colors.textPrimary },
    coachBriefBody: { ...t.type.captionTight, color: t.colors.textSecondary },
  };

  return (
    <View style={[styles.coachBriefCard, live.coachBriefCard, { borderColor }]}>
      <Ionicons name={iconName} size={18} color={iconColor} style={{ marginTop: spacing.xxs }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.coachBriefHeadline, live.coachBriefHeadline]}>{brief.headline}</Text>
        <Text style={[styles.coachBriefBody, live.coachBriefBody]}>{brief.body}</Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss coaching brief"
      >
        <Ionicons name="close" size={14} color={t.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(CoachBriefCard);

const styles = StyleSheet.create({
  // Pre-workout coaching brief card
  coachBriefCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  coachBriefHeadline: {
    ...type.bodySm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  coachBriefBody: {
    ...type.captionTight,
    color: colors.textSecondary,
  },
});

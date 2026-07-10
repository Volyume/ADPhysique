import { Text, StyleSheet } from 'react-native';
import { colors, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function SectionLabel({ children, style, tone = 'default', variant = 'overline', ...textProps }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <Text
      {...textProps}
      style={[
        variant === 'title' ? [styles.title, live.title] : [styles.label, live.label],
        tone === 'muted' && [styles.muted, live.muted],
        tone === 'primary' && [styles.primary, live.primary],
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { ...type.overline, color: colors.textSecondary },
  title: { ...type.title, color: colors.textPrimary },
  muted: { color: colors.textMuted },
  primary: { color: colors.primary },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    label: { ...t.type.overline, color: t.colors.textSecondary },
    title: { ...t.type.title, color: t.colors.textPrimary },
    muted: { color: t.colors.textMuted },
    primary: { color: t.colors.primary },
  };
}

// ProgressScanMeaningMoment — progress-photos wave 3 (results-ui-and-copy-
// blueprint.md §1, exact copy). A one-time, one-screen moment shown before a
// user's first-ever Volyume Score render: what the score is and is not. No
// data dependencies, no personalised state; "Understood" is the only action.
// The caller owns the seen/dismiss persistence (progressScanPreferences.js)
// and mounts this only while it should show; it never blocks any other flow.
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import {
  MEANING_MOMENT_BODY,
  MEANING_MOMENT_BUTTON,
  MEANING_MOMENT_TITLE,
} from '../lib/progressScanResultsContract';

export default function ProgressScanMeaningMoment({ onDismiss }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>{MEANING_MOMENT_TITLE}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.body, live.body]}>{MEANING_MOMENT_BODY}</Text>
        <Button
          title={MEANING_MOMENT_BUTTON}
          onPress={onDismiss}
          accessibilityLabel={MEANING_MOMENT_BUTTON}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg },
  title: { ...type.h2, color: colors.textPrimary, textAlign: 'center' },
  body: { ...type.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  button: { marginTop: spacing.md },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. content/button have no colour
// tokens.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { color: t.colors.textPrimary },
    body: { color: t.colors.textSecondary },
  };
}

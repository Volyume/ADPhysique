/**
 * BiometricLockScreen
 *
 * Calm, full-screen "Volyume is locked" state. Rendered as an opaque overlay
 * ON TOP OF the already-mounted MainTabs (see RootNavigator.js's
 * LockedMainTabs) rather than swapping MainTabs out -- an in-progress
 * workout, rest timer, or any other live session state underneath is never
 * unmounted just because the phone was locked and unlocked again; this is
 * purely a visual + input block until authenticateAsync succeeds.
 *
 * Presentational only. All state (whether it's showing, whether an attempt
 * is in flight, whether the last attempt failed) lives in
 * src/lib/biometricLock.js's useAppLockGate hook.
 */
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, fontSize, fontWeight, spacing, circle, type,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from './Button';

export default function BiometricLockScreen({ authenticating = false, lastFailed = false, onRetry }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.overlay, live.overlay]} pointerEvents="auto">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.content}>
          <View style={[styles.iconWrap, live.iconWrap]}>
            <Ionicons name="lock-closed" size={32} color={t.colors.primary} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Volyume is locked</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.body, live.body]}>
            {lastFailed
              ? "That didn't go through. You can try again, or use your device passcode."
              : 'Unlock with Face ID, your fingerprint, or your device passcode to continue.'}
          </Text>
          <Button
            title={authenticating ? 'Waiting...' : 'Unlock'}
            onPress={onRetry}
            loading={authenticating}
            accessibilityLabel="Unlock Volyume"
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 1000,
    elevation: 1000,
  },
  safe: { flex: 1 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: circle(64),
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary, textAlign: 'center',
  },
  body: {
    ...type.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21,
  },
  button: { marginTop: spacing.sm, alignSelf: 'stretch' },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. safe/content/button have no colour
// tokens.
function buildLiveStyles(t) {
  return {
    overlay: { backgroundColor: t.colors.background },
    iconWrap: { backgroundColor: t.colors.primaryBg },
    title: { color: t.colors.textPrimary },
    body: { ...t.type.body, color: t.colors.textSecondary },
  };
}

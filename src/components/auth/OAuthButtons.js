import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

// expo-apple-authentication is iOS-only; require it lazily and only on iOS so
// Android never loads the native module. Falls back to null where absent so the
// component degrades to the styled custom button instead of crashing.
let AppleAuthentication = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    AppleAuthentication = require('expo-apple-authentication');
  } catch (_) {
    AppleAuthentication = null;
  }
}

// The "Continue with Apple / Google" block plus the "or with email" divider.
// Shared by the LoginScreen and the Pro onboarding account step so the two
// auth surfaces stay byte-identical. Presentational only: the screens pass the
// handlers and the disabled state; no auth logic lives here. Apple is iOS-only
// (App Store rule: offering any social sign-in requires Sign in with Apple).
//
// On iOS the official AppleAuthenticationButton is rendered (Guideline 4.8
// requires Apple's own button). If the native component is unavailable (e.g.
// an older build before the module landed), it degrades to a HIG-styled custom
// button so the screen still works.
// dividerLabel defaults to null: the email/password sign-in was removed (email
// verification proved too flaky), so no screen shows an "or with email" section
// any more and the divider would dangle under the OAuth buttons. Pass a label
// only if a future screen reintroduces an alternative below the buttons.
export default function OAuthButtons({ onApple, onGoogle, disabled, dividerLabel = null }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const AppleButton = AppleAuthentication?.AppleAuthenticationButton;
  return (
    <View style={styles.block}>
      {Platform.OS === 'ios' && (
        AppleButton ? (
          <View
            style={[styles.appleNativeWrap, disabled && styles.btnDisabled]}
            pointerEvents={disabled ? 'none' : 'auto'}
          >
            <AppleButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.md}
              style={styles.appleNativeBtn}
              onPress={onApple}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.btnApple, live.btnApple, disabled && styles.btnDisabled]}
            onPress={onApple}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            <Ionicons name="logo-apple" size={18} color={t.colors.appleBtnText} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.btnAppleText, live.btnAppleText]}>Continue with Apple</Text>
          </TouchableOpacity>
        )
      )}
      {/* Google native sign-in needs an iOS OAuth client id that isn't wired
          for iOS; offering it there fails ("failed to determine clientID").
          iOS therefore shows Apple + email only, which still satisfies
          Guideline 4.8 (Apple sign-in present). Android keeps Google. */}
      {Platform.OS !== 'ios' && (
        <TouchableOpacity
          style={[styles.btn, live.btn, disabled && styles.btnDisabled]}
          onPress={onGoogle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Ionicons name="logo-google" size={18} color={t.colors.textPrimary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.btnText, live.btnText]}>Continue with Google</Text>
        </TouchableOpacity>
      )}
      {dividerLabel ? (
        <View style={styles.divider}>
          <View style={[styles.dividerLine, live.dividerLine]} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.dividerText, live.dividerText]}>{dividerLabel}</Text>
          <View style={[styles.dividerLine, live.dividerLine]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm, marginBottom: spacing.lg },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  btnText: { ...type.bodyStrong, color: colors.textPrimary },
  btnApple: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.appleBtnBg,
  },
  btnAppleText: { ...type.bodyStrong, color: colors.appleBtnText },
  // The native AppleAuthenticationButton needs an explicit height; match the
  // custom buttons' tap target so the Apple/Google buttons line up.
  appleNativeWrap: { height: 48 },
  appleNativeBtn: { width: '100%', height: 48 },
  btnDisabled: { opacity: 0.55 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. block/appleNativeWrap/appleNativeBtn/
// btnDisabled/divider have no colour tokens. appleBtnBg/appleBtnText are
// Apple-brand-locked in every palette (styling.md), still routed through
// t.colors so the read stays live like every other token.
function buildLiveStyles(t) {
  return {
    btn: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    btnText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    btnApple: { backgroundColor: t.colors.appleBtnBg },
    btnAppleText: { ...t.type.bodyStrong, color: t.colors.appleBtnText },
    dividerLine: { backgroundColor: t.colors.border },
    dividerText: { color: t.colors.textMuted },
  };
}

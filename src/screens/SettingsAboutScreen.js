import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { colors, fontSize, fontWeight, spacing, radius, type, letterSpacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { useFeedback } from '../components/FeedbackSheet';
import { SettingsPage, SettingRow, settingsStyles, useSettingsStyles } from '../components/SettingsPrimitives';

// Help & about: FAQ, feedback, store rating, credits, and the build footer.
//
// EP-21/P-09 (docs audit 2026-07-12, lead ruling D-EP21): in a production
// build the version row must not advertise DebugLog at all -- the old
// accessibility label literally said "press and hold for debug logs", which
// made the app look like a test build and pointed every screen-reader user
// at sync diagnostics, crash traces and raw log entries. DebugLog stays
// reachable for support, but ONLY via an unadvertised, deliberate gesture:
// 7 taps on the version VALUE within 3 seconds (Android "build number"
// dev-options style -- see handleVersionTap below). The long-press path
// still exists but only in __DEV__, purely as a developer convenience.
const DEBUG_TAP_COUNT = 7;
const DEBUG_TAP_WINDOW_MS = 3000;
// Module-level (not component state/useRef): this is a support gesture, not
// render-affecting UI state, and a plain module variable avoids the
// SettingsFaqScreen.test.js jest.resetModules() + dynamic require() pitfall
// documented in that file (a hook picks up a second, freshly-required React
// copy whose dispatcher was never set, throwing "Cannot read properties of
// null (reading 'useRef')"). Matches the existing module-level mutable
// state precedent in src/lib/sync/runner.js.
let debugTapTimestamps = [];
// Pending debounced share (see the version-row onPress). Module-level for the
// same reason as debugTapTimestamps above.
let debugShareTimer = null;

export default function SettingsAboutScreen({ navigation }) {
  const feedback = useFeedback();
  // CP-10 stage 3: live theme (src/hooks/useTheme.js) so this screen's own
  // footer text/version and the shared section card follow a theme change.
  const t = useTheme();
  const live = useSettingsStyles();

  return (
    <SettingsPage title="About">
      <View style={[settingsStyles.section, live.section]}>
        <SettingRow
          icon="help-circle-outline"
          label="Help & FAQ"
          sub="Common questions, answered offline"
          onPress={() => navigation.navigate('SettingsFaq')}
        />
        <SettingRow
          icon="chatbubble-ellipses-outline"
          label="Send feedback"
          sub="Quick sentiment + optional note"
          onPress={() => feedback?.open({ trigger: 'settings' })}
        />
        <SettingRow
          icon="star-outline"
          label="Rate Volyume"
          sub="A rating helps other lifters find it"
          onPress={() => {
            // Founder 2026-07-09: this row previously tried the in-app review
            // sheet first, but Google's API is allowed to silently decline
            // (quota, eligibility, or any build not installed via the Play
            // Store), which made the row do nothing at all. The in-app sheet
            // is for unprompted organic moments (src/lib/storeReview.js); an
            // explicit "Rate Volyume" tap goes straight to the store page.
            // Platform-specific: iOS must never open a Play URL (it lands on
            // a dead page); send it to the App Store review deep link,
            // falling back to the https App Store URL.
            if (Platform.OS === 'ios') {
              const APPLE_APP_ID = '6777083702';
              const appStore = `apps.apple.com/app/id${APPLE_APP_ID}?action=write-review`;
              Linking.openURL(`itms-apps://${appStore}`).catch(() => Linking.openURL(`https://${appStore}`).catch(() => {}));
              return;
            }
            const pkg = Constants.expoConfig?.android?.package || 'app.volyume';
            const web = `https://play.google.com/store/apps/details?id=${pkg}`;
            Linking.openURL(`market://details?id=${pkg}`).catch(() => Linking.openURL(web).catch(() => {}));
          }}
        />
        <SettingRow
          icon="information-circle-outline"
          label="Credits"
          sub="Open Food Facts, CoFID, USDA attribution"
          onPress={() => navigation.navigate('Credits')}
        />
      </View>

      <View style={styles.about}>
        <View style={styles.appNameRow}>
          <Text style={[styles.appName, { fontSize: t.fontSize.xl, color: t.colors.textPrimary }]}>Volyume</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            // EP-21/P-09: count taps on the version value first. 7 taps
            // inside DEBUG_TAP_WINDOW_MS reaches DebugLog (support-only,
            // never advertised in copy or accessibility). Anything short of
            // that falls through to the normal, advertised action: sharing
            // the build identifier. No expo-clipboard dependency exists in
            // this codebase, so this keeps the pre-existing share action as
            // the production tap affordance rather than a true "copy"
            // (flagged to the founder; see the handover report).
            const now = Date.now();
            const recent = debugTapTimestamps.filter(ts => now - ts < DEBUG_TAP_WINDOW_MS);
            recent.push(now);
            debugTapTimestamps = recent;
            if (recent.length >= DEBUG_TAP_COUNT) {
              debugTapTimestamps = [];
              if (debugShareTimer) { clearTimeout(debugShareTimer); debugShareTimer = null; }
              navigation.navigate('DebugLog');
              return;
            }
            // Defer the share by a beat. Firing it synchronously would open
            // the native share sheet on the FIRST tap, and that modal then
            // swallows taps 2-7 -- making the support gesture unreachable at
            // any normal tapping speed. Debouncing means a rapid 7-tap run
            // keeps cancelling the pending share and only ever navigates,
            // while a lone tap still shares (just a beat later).
            if (debugShareTimer) clearTimeout(debugShareTimer);
            debugShareTimer = setTimeout(() => {
              debugShareTimer = null;
              const v = Constants.expoConfig?.version ?? '1.2.0';
              const code = Platform.OS === 'ios'
                ? Constants.expoConfig?.ios?.buildNumber
                : Constants.expoConfig?.android?.versionCode;
              const env = __DEV__ ? 'dev' : 'release';
              const id = `Volyume v${v} (${Platform.OS} ${code ?? '?'}, ${env})`;
              Share.share({ message: id }).catch(() => {});
            }, 400);
          }}
          onLongPress={__DEV__ ? () => navigation.navigate('DebugLog') : undefined}
          delayLongPress={600}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="App version. Tap to share the build identifier."
        >
          <Text style={[styles.appVersion, { fontSize: t.fontSize.sm, color: t.colors.textMuted }]}>
            v{Constants.expoConfig?.version ?? '1.2.0'}
            {' '}
            ({Platform.OS === 'ios'
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode})
          </Text>
        </TouchableOpacity>
        <Text style={[styles.tagline, { ...t.type.caption, color: t.colors.textMuted }]}>Less thinking. More lifting.</Text>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  appName: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary, letterSpacing: letterSpacing.wordmark },
  appNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  betaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryFill,
  },
  betaBadgeText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.onPrimary,
  },
  appVersion: { fontSize: fontSize.sm, color: colors.textMuted },
  tagline: { ...type.caption, color: colors.textMuted },
});

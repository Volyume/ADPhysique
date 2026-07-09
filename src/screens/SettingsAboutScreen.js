import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { colors, fontSize, fontWeight, spacing, radius, type, letterSpacing } from '../styles/theme';
import { useFeedback } from '../components/FeedbackSheet';
import { SettingsPage, SettingRow, settingsStyles } from '../components/SettingsPrimitives';

// Help & about: feedback, store rating, credits, and the build footer.
// Long-pressing the version opens the on-device debug log.
export default function SettingsAboutScreen({ navigation }) {
  const feedback = useFeedback();

  return (
    <SettingsPage title="About">
      <View style={settingsStyles.section}>
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
          sub="OpenFoodFacts, CoFID, USDA attribution"
          onPress={() => navigation.navigate('Credits')}
        />
      </View>

      <View style={styles.about}>
        <View style={styles.appNameRow}>
          <Text style={styles.appName}>Volyume</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            // Tap to share the build identifier. Useful when someone
            // files a bug: paste this into the report and we know
            // exactly which build they're on.
            const v = Constants.expoConfig?.version ?? '1.1.0';
            const code = Platform.OS === 'ios'
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode;
            const env = __DEV__ ? 'dev' : 'release';
            const id = `Volyume v${v} (${Platform.OS} ${code ?? '?'}, ${env})`;
            Share.share({ message: id }).catch(() => {});
          }}
          onLongPress={() => navigation.navigate('DebugLog')}
          delayLongPress={600}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="App version. Tap to share, press and hold for debug logs."
        >
          <Text style={styles.appVersion}>
            v{Constants.expoConfig?.version ?? '1.1.0'}
            {' '}
            ({Platform.OS === 'ios'
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode})
          </Text>
        </TouchableOpacity>
        <Text style={styles.tagline}>Less thinking. More lifting.</Text>
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

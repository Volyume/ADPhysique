import { View, Linking, Platform } from 'react-native';
import { appAlert } from '../components/AppAlert';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { trialEndsLabel } from '../lib/payments/cascade';
import { SettingsPage, SectionHeader, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';

// Account: identity, plan, upgrade/downgrade, and the two destructive
// account actions (sign out, delete) kept together at the bottom.
export default function SettingsAccountScreen({ navigation }) {
  const { user, tier, userProfile } = useAppStore(
    useShallow(s => ({ user: s.user, tier: s.tier, userProfile: s.userProfile })),
  );
  // FQ-6.2 (D96): the one authoritative trial end date (cascade.trialEndsLabel).
  const trialEnds = trialEndsLabel(userProfile);
  const { signingOut, deletingAccount, handleSignOut, handleDeleteAccount } = useAccountActions();
  // CP-10 stage 3: live theme override, see SettingsPrimitives.js.
  const live = useSettingsStyles();

  return (
    <SettingsPage title="Account">
      <SectionHeader title="Plan" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="person-circle-outline"
          label={user?.email || 'Signed in'}
          sub={tier === 'pro' ? (trialEnds ? `Volyume Pro · free trial runs to ${trialEnds}` : 'Volyume Pro') : 'Free plan'}
          showArrow={false}
        />
        <SettingRow
          icon="card-outline"
          label="Subscription"
          sub="Plan, billing, restore purchases"
          onPress={() => navigation.navigate('Subscription')}
        />
        {tier !== 'pro' && (
          <SettingRow
            icon="barbell-outline"
            label="Go Pro"
            sub="Coach decisions and weekly check-ins"
            onPress={() => navigation.navigate('ProUpgrade', { source: 'settings_account' })}
          />
        )}
        {tier === 'pro' && (
          <SettingRow
            icon="settings-outline"
            label="Manage subscription"
            // FQ-6.4 (D96, founder-approved semantics): the old "Switch to
            // Free" wrote tier='free' LOCALLY and cancelled nothing - the
            // subscription kept renewing and the next cloud tier refresh
            // restored Pro, so the switch was a fiction both ways. The
            // truthful flow is the platform's own subscription surface:
            // cancellation stops renewal through the store, Pro stays until
            // the paid or trial entitlement expires, and the account
            // returns to Free when the authoritative entitlement does. The
            // local tier is never forged; product IDs, pricing and the
            // trial length are untouched.
            onPress={() =>
              appAlert(
                'Manage subscription',
                // C5-P7-04 (D96): names only what the guards actually keep
                // readable. Cancelling stops renewal through your app
                // store; Pro stays active until your current paid or trial
                // period ends, then the account returns to Free.
                'Your plan is managed by your app store. Cancelling there stops the next renewal; Pro stays active until your current period ends, and everything you\'ve logged stays. Past coach decisions, training blocks and PRs remain readable, and your body measurements, photos and food diary stay viewable on Free.',
                [
                  { text: 'Not now', style: 'cancel' },
                  {
                    text: 'Open my app store',
                    onPress: () => {
                      const url = Platform.OS === 'ios'
                        ? 'https://apps.apple.com/account/subscriptions'
                        : 'https://play.google.com/store/account/subscriptions';
                      Linking.openURL(url).catch(() => {});
                    },
                  },
                ],
              )
            }
          />
        )}
      </View>

      {/* Sign out and delete account, isolated below the plan rows so a
          destructive tap is never next to a routine action. */}
      <SectionHeader title="Account access" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="log-out-outline"
          label={signingOut ? 'Signing out...' : 'Sign out'}
          sub="Ends this session after your local data is safe."
          destructive
          onPress={signingOut ? undefined : handleSignOut}
        />
        <SettingRow
          icon="trash-outline"
          label={deletingAccount ? 'Deleting account...' : 'Delete account'}
          sub="Permanently removes your account and app data."
          destructive
          onPress={deletingAccount ? undefined : handleDeleteAccount}
        />
      </View>
    </SettingsPage>
  );
}

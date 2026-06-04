import { View, Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { SettingsPage, SectionHeader, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// Account: identity, plan, upgrade/downgrade, and the two destructive
// account actions (sign out, delete) kept together at the bottom.
export default function SettingsAccountScreen({ navigation }) {
  const { user, tier, setTier } = useAppStore(
    useShallow(s => ({ user: s.user, tier: s.tier, setTier: s.setTier })),
  );
  const { signingOut, deletingAccount, handleSignOut, handleDeleteAccount } = useAccountActions();

  return (
    <SettingsPage>
      <SectionHeader title="Plan" />
      <View style={styles.section}>
        <SettingRow
          icon="person-circle-outline"
          label={user?.email || 'Signed in'}
          sub={tier === 'pro' ? 'Volyume Pro' : 'Free plan'}
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
            icon="sparkles"
            label="Go Pro"
            sub="Precision Coaching and weekly check-ins"
            onPress={() => navigation.navigate('ProUpgrade')}
          />
        )}
        {tier === 'pro' && (
          <SettingRow
            icon="arrow-down-circle-outline"
            label="Switch to Free"
            onPress={() =>
              Alert.alert(
                'Switch to Free?',
                'Everything you\'ve logged stays. Past coach outputs, check-ins, training blocks and PRs remain readable. You just won\'t get new Precision Coaching adjustments until you re-enable Pro.',
                [
                  { text: 'Keep Pro', style: 'cancel' },
                  {
                    text: 'Switch to Free',
                    onPress: async () => { await setTier('free', 'SettingsScreen.switchToFree'); },
                  },
                ],
              )
            }
          />
        )}
      </View>

      {/* Sign out and delete account, isolated below the plan rows so a
          destructive tap is never next to a routine action. */}
      <SectionHeader title="Session" />
      <View style={styles.section}>
        <SettingRow
          icon="log-out-outline"
          label={signingOut ? 'Signing out…' : 'Sign out'}
          destructive
          onPress={signingOut ? undefined : handleSignOut}
        />
        <SettingRow
          icon="trash-outline"
          label={deletingAccount ? 'Deleting account…' : 'Delete account'}
          destructive
          onPress={deletingAccount ? undefined : handleDeleteAccount}
        />
      </View>
    </SettingsPage>
  );
}

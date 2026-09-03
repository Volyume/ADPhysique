import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { SettingsPage, SectionHeader, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';

// Account: identity, and the two destructive account actions (sign out,
// delete) kept together at the bottom. Volyume is fully free (founder
// ruling): no tier, no subscription, no upgrade path, so this screen carries
// no Plan section any more.
export default function SettingsAccountScreen() {
  const { user } = useAppStore(
    useShallow(s => ({ user: s.user })),
  );
  const { signingOut, deletingAccount, handleSignOut, handleDeleteAccount } = useAccountActions();
  // CP-10 stage 3: live theme override, see SettingsPrimitives.js.
  const live = useSettingsStyles();

  return (
    <SettingsPage title="Account">
      <SectionHeader title="Identity" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="person-circle-outline"
          label={user?.email || 'Signed in'}
          showArrow={false}
        />
      </View>

      {/* Sign out and delete account, isolated below identity so a
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

import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import { SettingsPage, SectionHeader, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import { getSignInIdentities, linkSignInMethod, unlinkSignInMethod } from '../lib/supabase';
import { activeMethods, canUnlink, METHOD_KEYS, METHOD_LABELS, LAST_METHOD_MESSAGE } from '../lib/signInMethods';
import { logError } from '../lib/errorLog';

// Account > Sign-in methods: link or unlink Apple, Google and email. The last
// method can never be removed: the row offers no Remove for it, and
// unlinkSignInMethod re-checks against the live identities before it acts.
const ICONS = { apple: 'logo-apple', google: 'logo-google', email: 'mail-outline' };

export default function SettingsSignInMethodsScreen({ navigation }) {
  const toast = useToast();
  const live = useSettingsStyles();
  const [identities, setIdentities] = useState(null);
  const [busy, setBusy] = useState(null);

  const refresh = useCallback(async () => {
    const { identities: list, error } = await getSignInIdentities();
    if (error) {
      logError('SettingsSignInMethods.read', error, {});
      toast.show('Could not load your sign-in methods. Try again in a moment.', { variant: 'error' });
      setIdentities([]);
      return;
    }
    setIdentities(list);
  }, [toast]);

  useEffect(() => { refresh(); }, [refresh]);

  async function add(method) {
    if (busy) return;
    if (method === 'email') {
      navigation.navigate('SetNewPassword');
      return;
    }
    setBusy(method);
    try {
      const res = await linkSignInMethod(method);
      if (res.error) {
        logError('SettingsSignInMethods.link', res.error, { method });
        toast.show(`Could not add ${METHOD_LABELS[method]}. Try again in a moment.`, { variant: 'error' });
      } else if (res.ok) {
        toast.show(`${METHOD_LABELS[method]} added.`, { variant: 'success' });
      }
    } finally {
      setBusy(null);
      refresh();
    }
  }

  function remove(method) {
    if (busy) return;
    if (!canUnlink(identities, method)) {
      toast.show(LAST_METHOD_MESSAGE, { variant: 'info' });
      return;
    }
    appAlert(
      `Remove ${METHOD_LABELS[method]}?`,
      `You will no longer be able to sign in with ${METHOD_LABELS[method]}. Your data stays on your account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(method);
            try {
              const res = await unlinkSignInMethod(method);
              if (res.error) {
                if (res.error.code !== 'last_method') logError('SettingsSignInMethods.unlink', res.error, { method });
                toast.show(res.error.code === 'last_method' ? LAST_METHOD_MESSAGE : `Could not remove ${METHOD_LABELS[method]}. Try again in a moment.`, { variant: 'error' });
              } else {
                toast.show(`${METHOD_LABELS[method]} removed.`, { variant: 'success' });
              }
            } finally {
              setBusy(null);
              refresh();
            }
          },
        },
      ],
    );
  }

  const active = activeMethods(identities);
  return (
    <SettingsPage title="Sign-in methods">
      <SectionHeader title="Ways to sign in" />
      <View style={[styles.section, live.section]}>
        {identities === null ? (
          <SettingRow icon="sync-outline" label="Loading..." showArrow={false} />
        ) : METHOD_KEYS.map((m) => {
          const on = active.includes(m);
          const removable = on && canUnlink(identities, m);
          return (
            <SettingRow
              key={m}
              icon={ICONS[m]}
              label={METHOD_LABELS[m]}
              sub={on ? (removable ? 'On. Tap to remove.' : 'On. This is your only way in, so it cannot be removed.') : 'Off. Tap to add.'}
              showArrow={false}
              destructive={removable}
              onPress={on ? (removable ? () => remove(m) : undefined) : () => add(m)}
            />
          );
        })}
      </View>
    </SettingsPage>
  );
}

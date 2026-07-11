import { useState } from 'react';
import { appAlert } from '../components/AppAlert';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { getSupabaseClient, signOut } from '../lib/supabase';
import { wipeAllUserData } from '../lib/database';
import { logError } from '../lib/errorLog';
import { markAuthDeletionPending } from '../lib/deletionRetry';
import { audit } from '../lib/observability';

// The account-level destructive flows (sign-out, delete account, withdraw
// health-data consent) live here, in one hook, rather than being duplicated
// across the Account and Privacy sub-pages. Withdraw-consent reuses the same
// performDeleteAccount pipeline as Delete account (UK GDPR Article 9: losing
// consent means losing the lawful basis, so it must drive a real deletion),
// so keeping a single definition avoids the two copies drifting apart.
//
// These paths are runtime-critical (identity + data ownership). The logic
// below is moved verbatim from the old single-file SettingsScreen; behaviour
// is unchanged.

// R2-12: the sign-out wipe failure alert must say WHAT failed. The old copy
// blamed "photo and scan data" for every failure class, which sent the
// founder's own debugging down the wrong path; the wipe now tags the failing
// step and this maps it to plain words.
function wipeFailedBody(step) {
  const names = {
    photo_files: 'your photo files',
    photo_meta_legacy: 'photo records',
    snapshots: 'local backup copies',
    progress_photo_meta: 'photo records',
    progress_scan_sessions: 'scan records',
    progress_scan_assets: 'scan records',
  };
  const what = step ? (names[step] ?? `local data (${step})`) : 'local data';
  return `Removing ${what} from this device failed, so sign-out stopped to protect your privacy. Try again in a moment.`;
}

export default function useAccountActions() {
  const { user, clearAuthStateForSignOut, setHealthConsent } = useAppStore(
    useShallow(s => ({
      user: s.user,
      clearAuthStateForSignOut: s.clearAuthStateForSignOut,
      setHealthConsent: s.setHealthConsent,
    })),
  );

  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleSignOut() {
    audit('auth.signout.tap');
    // Block sign-out mid-workout. The workout row stays in SQLite, but the
    // in-memory active state is cleared and the user lands on Login mid-set,
    // which reads as data loss even though nothing is lost.
    const activeWorkout = useAppStore.getState().activeWorkout;
    if (activeWorkout) {
      appAlert(
        'Finish your workout first',
        'You have a session in progress. Finish or discard it before signing out so nothing gets left in a half-state.',
      );
      return;
    }
    appAlert(
      'Sign out?',
      user?.isLocal
        ? "You're signed in locally on this device. Your data stays on this phone. Sign back in any time."
        : 'Your data is safe in the cloud. Sign in again on any device to pick up where you left off.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            // The steps after the local wipe: cloud sign-out (after the wipe so
            // a failed wipe doesn't strand a dead session) then reload the JS
            // bundle (an install-on-top leaves the old bundle running until the
            // process restarts). Best-effort; dev / Expo Go can't reload.
            async function finishCloudSignOut() {
              if (!user?.isLocal) {
                // AUTH-3 (I4): retry once so a transient cloud signOut failure
                // doesn't leave the supabase client holding a live in-memory
                // session (which a later INITIAL_SESSION could re-enter on).
                // The SecureStore tokens were already deleted in
                // clearAuthStateForSignOut, so storage can't revive it either.
                let signedOut = false;
                for (let attempt = 0; attempt < 2 && !signedOut; attempt += 1) {
                  try { await signOut(); signedOut = true; }
                  catch (e) { logError('SettingsScreen.handleSignOut.cloudSignOut', e); }
                }
              }
              try { await Updates.reloadAsync(); }
              catch (_) { /* dev / Expo Go, no-op */ }
            }
            try {
              // Push-first sign-out: wipes local SQLite only after a
              // successful cloud sync, so unsynced edits aren't lost.
              // If the push fails, sign-out is aborted and the user
              // stays signed in (unless they choose "Sign out anyway").
              const result = await clearAuthStateForSignOut();
              if (result?.ok === false) {
                if (result.reason === 'wipe_failed') {
                  appAlert("Couldn't sign out safely", wipeFailedBody(result.step));
                  return;
                }
                // AUTH-5 escape hatch: rather than a dead-end "couldn't sign
                // out", let the user decide. 'skipped'/'error' often means the
                // device is offline or a background sync held the lock; the
                // user may accept losing unsynced changes to sign out anyway.
                appAlert(
                  'Sync incomplete',
                  "We couldn't sync your latest changes (you might be offline). Sign out anyway? Any changes since your last successful sync may be lost.",
                  [
                    { text: 'Stay signed in', style: 'cancel' },
                    {
                      text: 'Sign out anyway',
                      style: 'destructive',
                      onPress: async () => {
                        setSigningOut(true);
                        try {
                          const forced = await clearAuthStateForSignOut({ force: true });
                          if (forced?.ok === false && forced.reason === 'wipe_failed') {
                            appAlert("Couldn't sign out safely", wipeFailedBody(forced.step));
                            return;
                          }
                          await finishCloudSignOut();
                        } finally {
                          setSigningOut(false);
                        }
                      },
                    },
                  ],
                );
                return;
              }
              await finishCloudSignOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    audit('account.delete.tap', { isLocal: !!user?.isLocal });
    // Two-step confirmation so a thumb-tap can't nuke an account.
    appAlert(
      'Delete account?',
      user?.isLocal
        ? 'This permanently deletes your local data on this device. Local accounts have no cloud backup. This cannot be undone.'
        : 'This permanently deletes your account and all your training data across every device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            appAlert(
              'Are you sure?',
              user?.isLocal
                ? "There's no undo. All your workouts, plans, and progress are wiped from this device."
                : "There's no undo. All your workouts, plans, check-ins, and progress are wiped from every device.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: () => {
                    audit('account.delete.confirm', { isLocal: !!user?.isLocal });
                    performDeleteAccount();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function performDeleteAccount(reason = 'user_requested') {
    if (!user?.id) return;
    setDeletingAccount(true);
    const userId = user.id;
    let cloudOk = true;
    // SC-2: true when the data wipe succeeded via the delete_user_data RPC
    // fallback only. The RPC cannot reach auth.users, so the sign-in
    // credentials survive until the Edge Function is reachable again; the
    // user is told honestly and a device-local marker drives an automatic
    // retry on the next launch (src/lib/deletionRetry.js).
    let authRemovalPending = false;
    try {
      if (!user?.isLocal) {
        // Server-side wipe via the delete-account Edge Function. The
        // function wipes public.* rows AND deletes auth.users, the RPC
        // alone can't reach auth.users (different schema, lacks rights),
        // which left zombie auth records that resurrected on next sign-in.
        // Falls back to the RPC if the function isn't deployed, so the
        // client keeps working until the function lands in production.
        const sb = getSupabaseClient();
        if (sb) {
          let invokeErr = null;
          let fnBody = null;
          let fnErrorBody = null;
          try {
            // Pass deletion metadata so the Edge Function can write
            // a rich row to account_deletions_log. reason is 'in_app'
            // by default; the consent-withdrawal flow (when SettingsScreen
            // ships the privacy management section) will pass
            // 'consent_withdrawal' so Panel 8 can compute the
            // withdrawal-to-deletion ratio.
            let appVersion = null;
            try {
              // eslint-disable-next-line global-require
              const Application = require('expo-application');
              appVersion = Application.nativeApplicationVersion ?? null;
            } catch (_) { /* tolerate */ }
            const result = await sb.functions.invoke('delete-account', {
              body: {
                reason,
                app_version: appVersion,
                platform: Platform.OS,
              },
            });
            if (result.error) invokeErr = result.error;
            fnBody = result.data;
          } catch (e) {
            invokeErr = e;
          }
          if (invokeErr) {
            // FunctionsHttpError stores the Response on `.context`. Read its
            // body so we can see which branch of the Edge Function actually
            // failed (missing env var, RPC error, admin deleteUser error).
            try {
              const ctx = invokeErr?.context;
              if (ctx && typeof ctx.text === 'function') {
                fnErrorBody = await ctx.text();
              }
            } catch (_) { /* body already consumed or unreadable */ }
            logError('SettingsScreen.deleteAccount.fnInvoke', invokeErr, {
              userId,
              fnBody: fnBody ? JSON.stringify(fnBody).slice(0, 500) : null,
              fnErrorBody: fnErrorBody ? String(fnErrorBody).slice(0, 500) : null,
              status: invokeErr?.context?.status ?? null,
            });
            // Fall back to the RPC so a missing or un-deployed Edge Function
            // doesn't block the user. RPC v3 (migrate_008) tolerates missing
            // tables; older RPCs may still fail on a missing table.
            const { error: rpcErr } = await sb.rpc('delete_user_data');
            if (rpcErr) {
              cloudOk = false;
              logError('SettingsScreen.deleteAccount.rpc', rpcErr, { userId });
            } else {
              // The RPC wiped the data rows but the auth.users row is
              // still there. Not full success: mark it pending so the
              // Edge Function is retried on the next sign-in.
              authRemovalPending = true;
              // Server backstop (founder decision 2026-07-02): log the
              // fallback deletion so the scheduled sweeper (migration 098)
              // finishes the auth-row removal even if this user never signs
              // in again. The RPC verifies the wipe actually happened
              // before logging, so it cannot be used to enqueue a live
              // account. Best-effort: the client retry path stands anyway.
              try { await sb.rpc('record_rpc_fallback_deletion'); }
              catch (e) { logError('SettingsScreen.deleteAccount.logFallback', e, { userId }); }
            }
          }
        } else {
          cloudOk = false;
          logError('SettingsScreen.deleteAccount.supabaseMissing', new Error('Supabase client unavailable'), { userId });
        }

        // CRITICAL: if the cloud wipe failed, ABORT. Previously we still
        // called signOut() and wipeAllUserData() unconditionally, which
        // left the user logged out locally with their cloud account fully
        // intact, and on next sign-in they were dumped back into the
        // main app because firstRunComplete=true still lived in the cloud
        // profile they thought they deleted. Now we surface the failure
        // and leave the session alone so they can retry or contact us.
        if (!cloudOk) {
          appAlert(
            "Couldn't delete your account",
            'Try again.',
          );
          setDeletingAccount(false);
          return;
        }

        try { await signOut(); }
        catch (e) { logError('SettingsScreen.deleteAccount.signOut', e); }
      }
      // Wipe local SQLite. Reached only when (a) cloud user and cloud
      // wipe succeeded, or (b) local-only user (no cloud to wipe).
      try { await wipeAllUserData(userId); }
      catch (e) {
        logError('SettingsScreen.deleteAccount.wipeLocal', e);
        appAlert(
          "Couldn't finish deletion on this device",
          'Local photo and scan data could not be removed. Try again before uninstalling or sharing this device.',
        );
        setDeletingAccount(false);
        return;
      }
      // Clear in-memory state.
      await clearAuthStateForSignOut();
      // Delete-account is the "truly wipe everything" path, distinct
      // from sign-out, which is session-only by policy. The selective
      // @volyume_ prefix wipe used to miss three keys that don't carry
      // the @ (volyume_review_prompted, volyume_notif_prompt_seen,
      // volyume_sessions_since_install) and any future un-prefixed key.
      // AsyncStorage.clear() is scoped to this app only, so it's the
      // right hammer here. Without this, next launch sees a stale
      // firstRunComplete=true and re-routes into the home flow as a
      // phantom user.
      try {
        await AsyncStorage.clear();
      } catch (e) { logError('SettingsScreen.deleteAccount.wipeAsyncStorage', e); }

      // SC-2: persist the pending-auth-removal marker AFTER the
      // AsyncStorage.clear() above so it survives to the next launch.
      // RootNavigator's auth listener retries the Edge Function once
      // when it sees the marker for this uid. Best-effort.
      if (authRemovalPending) {
        try { await markAuthDeletionPending(userId); }
        catch (e) { logError('SettingsScreen.deleteAccount.markAuthPending', e, { userId }); }
      }

      // Belt-and-braces SecureStore wipe. signOut() above should have
      // cleared the supabase-js auth tokens, but if the network call
      // failed the tokens can persist and restoreSessionFromCloud will
      // happily revive a session for an account that no longer exists.
      // The Supabase storage key is `sb-<projectref>-auth-token`, which
      // we can derive from the public URL. Best-effort: any failure
      // here is a logged warning, not a blocker.
      try {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
        const projectRef = url.replace(/^https?:\/\//, '').split('.')[0];
        if (projectRef) {
          await SecureStore.deleteItemAsync(`sb-${projectRef}-auth-token`).catch(() => {});
        }
        // Older supabase-js versions used this key.
        await SecureStore.deleteItemAsync('supabase.auth.token').catch(() => {});
      } catch (e) { logError('SettingsScreen.deleteAccount.wipeSecureStore', e); }

      // SC-2: honest partial-success message. The data is gone but the
      // sign-in credentials could not be removed yet (Edge Function
      // unreachable); say so plainly instead of reporting full success.
      // The reload waits for the acknowledgement so the alert is read.
      if (authRemovalPending) {
        await new Promise((resolve) => {
          appAlert(
            'Account data deleted',
            'All your data has been deleted. One step is still pending: removing your sign-in details, which we could not reach just now. If you ever sign in again with the same Apple or Google account, we will finish removing them automatically before anything else happens.',
            [{ text: 'OK', onPress: resolve }],
            { cancelable: false },
          );
        });
      }
      // Reload the JS bundle so any installed-but-not-yet-loaded APK
      // update takes effect on the next launch back to Welcome. Without
      // this, an install-on-top of a newer APK keeps the OLD bundle
      // running, the user signs up again, and the old sync code fires
      // against a fresh account, re-producing whatever the new bundle
      // was meant to fix. Best-effort: dev builds and Expo Go don't
      // support reload.
      try { await Updates.reloadAsync(); }
      catch (_) { /* dev / Expo Go, no-op */ }
    } finally {
      setDeletingAccount(false);
    }
  }

  // Health-data consent withdrawal (UK GDPR Article 9).
  // Per PRIVACY_CONSENT_LOCKED.md lines 71-72 and 251: withdrawing
  // Article 9 consent is the legal end of our lawful basis to process
  // the user's special-category data, so it must queue account
  // deletion (not merely flip a flag). The earlier behaviour
  // (record_health_consent(false) + UI gate) left the data on our
  // servers without a lawful basis, which is itself a UK GDPR
  // breach. This flow now records the withdrawal in consent_log
  // (the immutable audit trail) THEN drives the standard delete-
  // account pipeline so SQLite, Supabase rows, and auth.users are
  // all wiped immediately (the delete-account Edge Function deletes
  // them synchronously; backups are purged within 30 days).
  async function handleWithdrawConsent() {
    if (withdrawing || deletingAccount) return;
    appAlert(
      'Withdraw health-data consent?',
      "Withdrawing consent means we lose the legal basis to keep " +
        "your weight, food, body composition, and check-in data. " +
        "Your account will be deleted and your data wiped from our " +
        "servers immediately, with backups purged within 30 days. " +
        "This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            appAlert(
              'Are you sure?',
              "There's no undo. All your workouts, plans, check-ins, " +
                "food log, and progress are wiped from every device and " +
                "our servers immediately, with backups purged within 30 days.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Withdraw and delete',
                  style: 'destructive',
                  onPress: async () => {
                    audit('consent.article9.withdraw.tap');
                    setWithdrawing(true);
                    try {
                      // Record the withdrawal in consent_log before we
                      // tear the account down. The Edge Function's
                      // delete sequence wipes consent_log via FK
                      // cascade, but Panel 8's withdrawal-rate
                      // dashboard reads via the engine_telemetry
                      // event below (account_deletions_log is the
                      // non-cascading audit trail that survives).
                      const sb = getSupabaseClient();
                      if (sb) {
                        const { error: rpcErr } = await sb.rpc('record_health_consent', {
                          _granted: false,
                          _app_version: null,
                          _platform: Platform.OS,
                        });
                        if (rpcErr) {
                          logError('SettingsScreen.withdrawConsent.rpc', rpcErr, { uid: user?.id });
                          // Soft-fail: we still proceed with the
                          // delete. The user's intent is clear and
                          // delaying for a server hiccup would be
                          // worse than a missing audit row.
                        }
                      }
                      setHealthConsent(false, true);
                      try {
                        // eslint-disable-next-line global-require
                        const { track } = require('../lib/engineTelemetry');
                        if (user?.id) {
                          track(user.id, 'article9_consent_withdrawn', {
                            surface: 'settings',
                          }).catch(() => {});
                        }
                      } catch (_) {}
                      // Now drive the standard delete-account flow
                      // with reason='consent_withdrawal' so Panel 8
                      // can compute the withdrawal-to-deletion
                      // ratio against the engine_telemetry event.
                      audit('account.delete.confirm', { isLocal: !!user?.isLocal, source: 'consent_withdrawal' });
                      await performDeleteAccount('consent_withdrawal');
                    } catch (e) {
                      logError('SettingsScreen.withdrawConsent', e, { uid: user?.id });
                      appAlert("Couldn't withdraw", e?.message ?? 'Unknown error.');
                    } finally {
                      setWithdrawing(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  return {
    signingOut,
    deletingAccount,
    withdrawing,
    handleSignOut,
    handleDeleteAccount,
    handleWithdrawConsent,
  };
}

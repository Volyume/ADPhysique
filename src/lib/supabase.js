import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore adapter for Supabase auth session, encrypted on both iOS and Android.
// Falls back silently so the app still launches if SecureStore is unavailable (e.g. emulator).
const secureAuthStorage = {
  getItem: async (key) => {
    try { return await SecureStore.getItemAsync(key); }
    catch (e) {
      // Lazy-require errorLog to avoid any import cycle with this module.
      // eslint-disable-next-line global-require
      try { require('./errorLog').logError('supabase.secureStore.getItem', e); } catch (_) {}
      return null;
    }
  },
  setItem: async (key, value) => {
    try { await SecureStore.setItemAsync(key, value); }
    catch (e) {
      // eslint-disable-next-line global-require
      try { require('./errorLog').logError('supabase.secureStore.setItem', e); } catch (_) {}
    }
  },
  removeItem: async (key) => {
    try { await SecureStore.deleteItemAsync(key); }
    catch (e) {
      // eslint-disable-next-line global-require
      try { require('./errorLog').logError('supabase.secureStore.removeItem', e); } catch (_) {}
    }
  },
};

// Lazy-init: createClient is never called at module load time.
// Returns null when SUPABASE_URL / SUPABASE_ANON_KEY env vars are absent (Stage 1).
let _client = null;
let _initialized = false;

export function getSupabaseClient() {
  if (_initialized) return _client;
  _initialized = true;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const rawClient = createClient(url, key, {
      auth: {
        storage: secureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Wrap the client in the observability proxy so every .from(table)
    // call emits a breadcrumb with the table name, operation, and
    // round-trip duration. The breadcrumb is opaque to the rest of
    // the code, the proxied client forwards every method through.
    try {
      // eslint-disable-next-line global-require
      const { instrumentSupabase } = require('./observability');
      _client = instrumentSupabase(rawClient);
    } catch (_) {
      _client = rawClient;
    }
  } catch (_e) {
    _client = null;
  }
  return _client;
}

// Test seam, mirroring playBilling's injectProvider/_resetForTests pattern.
// getSupabaseClient() is a module-level singleton driven by env vars at first
// call, which makes it hostile to test in a shared jest worker (a sibling
// suite can initialise it first and cache a state no later env-set can undo).
// Tests inject a fake client here instead of fighting the module registry.
export function _setClientForTests(client) {
  _client = client;
  _initialized = true;
}

export function isSupabaseConfigured() {
  return !!(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getCurrentUser() {
  const c = getSupabaseClient();
  if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  return user;
}

export async function signInWithEmail(email, password) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: { message: 'Cloud sign-in is not available right now.' } };
  return c.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: { message: 'Cloud sign-in is not available right now.' } };
  return c.auth.signUp({ email, password });
}

export async function signOut() {
  const c = getSupabaseClient();
  if (!c) return {};
  return c.auth.signOut();
}

export async function resetPassword(email) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: { message: 'Cloud sign-in is not available right now.' } };
  return c.auth.resetPasswordForEmail(email);
}

// ─── OAuth (Google + Apple) ──────────────────────────────────────────────
//
// Flow:
//   1. Call signInWithOAuth, Supabase returns a provider URL.
//   2. Open it in an in-app browser via expo-web-browser.
//   3. User authenticates with Google / Apple in the browser.
//   4. Provider redirects to volyume://?code=..., the OS routes that to
//      the app, where App.js's handleAuthDeepLink exchanges the code for
//      a session.
//   5. RootNavigator's onAuthStateChange listener picks up the new session
//      and routes the user to the right place.
//
// Requires the user to have configured the provider in the Supabase
// dashboard (Authentication → Providers → Google / Apple) AND added
// `volyume://` to the Allowed Redirect URLs list. Without those the call
// returns a clear error from Supabase that we surface to the caller.

const OAUTH_REDIRECT_URL = 'volyume://';

async function _signInWithOAuthProvider(provider) {
  const c = getSupabaseClient();
  if (!c) {
    return { error: { message: 'Cloud sign-in is not available right now. Try again.' } };
  }
  try {
    // 1. Ask Supabase for the provider auth URL. skipBrowserRedirect makes
    //    it return the URL instead of trying to navigate (which doesn't
    //    work in React Native).
    const { data, error } = await c.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: OAUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error };
    if (!data?.url) return { error: { message: 'No auth URL returned from Supabase.' } };

    // 2. Open in an in-app browser. openAuthSessionAsync auto-closes when
    //    the redirect back to volyume:// fires, so the user doesn't have
    //    to manually return to the app.
    // eslint-disable-next-line global-require
    const WebBrowser = require('expo-web-browser');
    const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);

    if (result.type === 'success' && result.url) {
      // 3. The deep link is also captured by App.js's URL listener, but
      //    we exchange the code here too as a belt-and-braces backup.
      const codeMatch = result.url.match(/[?&]code=([^&#]+)/);
      if (codeMatch) {
        try { await c.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1])); }
        catch (_) { /* App.js handler will retry */ }
      }
      return { ok: true };
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { cancelled: true };
    }
    return { error: { message: 'Sign-in flow did not complete.' } };
  } catch (e) {
    return { error: { message: e?.message ?? 'OAuth sign-in failed.' } };
  }
}

// Public Google OAuth Web client ID. Not a secret: it ships in the app binary
// and is the audience Supabase's Google provider is configured with. Native
// Google Sign-In requests an ID token with this as the audience, which Supabase
// verifies via signInWithIdToken.
const GOOGLE_WEB_CLIENT_ID = '520741631478-apaethkp3g55o06lott116jag73l0ves.apps.googleusercontent.com';

// Native Google Sign-In: shows the OS account-picker sheet (no browser, no
// supabase.co URL on screen), returns a Google ID token, and exchanges it with
// Supabase via signInWithIdToken. Same real account + session as the old
// browser OAuth flow, so the locked identity model is unaffected. The native
// module is lazy-required so jest and any non-native env don't try to load it.
//
// Founder setup (one-time): an Android OAuth client in Google Cloud with the
// app's package (app.volyume) and signing SHA-1, plus the Web client above
// configured in Supabase Authentication → Providers → Google.
export async function signInWithGoogle() {
  const c = getSupabaseClient();
  if (!c) {
    return { error: { message: 'Cloud sign-in is not available right now. Try again.' } };
  }
  let GoogleSignin;
  let statusCodes;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    ({ GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin'));
  } catch (_) {
    return { error: { message: 'Google sign-in is unavailable in this build.' } };
  }
  try {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Start from a clean native state. The Google SDK keeps the last
    // account signed in at the native layer, and that cache outlives a
    // Volyume sign-out or account deletion (those clear the Supabase
    // session and local storage, not the Google SDK). A stale cache makes
    // the next signIn() resolve with the old account and no fresh idToken,
    // so the button looked dead after deleting an account. Clearing it
    // first forces the account picker and a fresh token every time.
    try { await GoogleSignin.signOut(); } catch (_) { /* not signed in, fine */ }
    const resp = await GoogleSignin.signIn();
    // v13+ shape: { type: 'success' | 'cancelled', data }. Older: { idToken }.
    if (resp?.type === 'cancelled') return { cancelled: true };
    const idToken = resp?.data?.idToken ?? resp?.idToken ?? null;
    if (!idToken) return { error: { message: 'Google did not return a sign-in token.' } };
    const { error } = await c.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { error };
    return { ok: true };
  } catch (e) {
    const code = e?.code;
    if (statusCodes && (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS)) {
      return { cancelled: true };
    }
    return { error: { message: e?.message ?? 'Google sign-in failed.' } };
  }
}

// Native Sign in with Apple on iOS. App Store Guideline 4.8 requires the
// native flow (not a web view) and Apple's official button whenever any other
// social sign-in is offered, which we do (Google). Uses
// expo-apple-authentication's signInAsync to get an Apple identity token, then
// exchanges it with Supabase via signInWithIdToken — the same real account +
// session model as native Google, so the locked identity model is unaffected.
//
// On any non-iOS platform (Android) or if the native module is unavailable,
// it falls back to the Supabase Apple web-OAuth flow. Android behaviour is
// therefore completely unchanged: it never touches expo-apple-authentication.
//
// Founder setup (one-time): enable Sign in with Apple on the app.volyume App
// ID, and configure the Apple provider in Supabase (Authentication →
// Providers → Apple) with the app's bundle id (app.volyume) as an allowed
// client id so signInWithIdToken accepts the native token.
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    return _signInWithOAuthProvider('apple');
  }
  const c = getSupabaseClient();
  if (!c) {
    return { error: { message: 'Cloud sign-in is not available right now. Try again.' } };
  }
  let AppleAuthentication;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    AppleAuthentication = require('expo-apple-authentication');
  } catch (_) {
    return _signInWithOAuthProvider('apple');
  }
  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return _signInWithOAuthProvider('apple');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const idToken = credential?.identityToken;
    if (!idToken) return { error: { message: 'Apple did not return a sign-in token.' } };
    const { error } = await c.auth.signInWithIdToken({ provider: 'apple', token: idToken });
    if (error) return { error };
    return { ok: true };
  } catch (e) {
    // The native sheet throws a cancellation error code when the user backs out.
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') {
      return { cancelled: true };
    }
    return { error: { message: e?.message ?? 'Apple sign-in failed.' } };
  }
}

export async function upsertUserProfile(userId, profile) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: null };
  return c
    .from('users_profile')
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
}

export async function getUserProfile(userId) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: null };
  return c
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .single();
}

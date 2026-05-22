import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore adapter for Supabase auth session — encrypted on both iOS and Android.
// Falls back silently so the app still launches if SecureStore is unavailable (e.g. emulator).
const secureAuthStorage = {
  getItem: async (key) => {
    try { return await SecureStore.getItemAsync(key); } catch (_) { return null; }
  },
  setItem: async (key, value) => {
    try { await SecureStore.setItemAsync(key, value); } catch (_) {}
  },
  removeItem: async (key) => {
    try { await SecureStore.deleteItemAsync(key); } catch (_) {}
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
    // the code — the proxied client forwards every method through.
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
  if (!c) return { data: null, error: { message: 'Supabase is not configured. Use Continue Locally.' } };
  return c.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: { message: 'Supabase is not configured. Use Continue Locally.' } };
  return c.auth.signUp({ email, password });
}

export async function signOut() {
  const c = getSupabaseClient();
  if (!c) return {};
  return c.auth.signOut();
}

export async function resetPassword(email) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: { message: 'Supabase is not configured. Use Continue Locally.' } };
  return c.auth.resetPasswordForEmail(email);
}

// ─── OAuth (Google + Microsoft) ──────────────────────────────────────────
//
// Flow:
//   1. Call signInWithOAuth — Supabase returns a provider URL.
//   2. Open it in an in-app browser via expo-web-browser.
//   3. User authenticates with Google / Microsoft in the browser.
//   4. Provider redirects to volyume://?code=... — the OS routes that to
//      the app, where App.js's handleAuthDeepLink exchanges the code for
//      a session.
//   5. RootNavigator's onAuthStateChange listener picks up the new session
//      and routes the user to the right place.
//
// Requires the user to have configured the provider in the Supabase
// dashboard (Authentication → Providers → Google / Azure) AND added
// `volyume://` to the Allowed Redirect URLs list. Without those the call
// returns a clear error from Supabase that we surface to the caller.

const OAUTH_REDIRECT_URL = 'volyume://';

async function _signInWithOAuthProvider(provider) {
  const c = getSupabaseClient();
  if (!c) {
    return { error: { message: 'Cloud auth is not available right now. Try email sign-in or Continue Locally.' } };
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

// ─── Native Google Sign-In (Android) ─────────────────────────────────────
//
// Replaces the browser OAuth flow on Android so users get the native
// account chooser sheet instead of a Chrome Custom Tab that shows the
// Supabase project subdomain in the URL bar. Flow:
//
//   1. GoogleSignin.signIn() opens the native account picker.
//   2. We pull the ID token out of the result.
//   3. supabase.auth.signInWithIdToken({ provider: 'google', token })
//      verifies the ID token server-side and creates a session.
//
// Requires:
//   - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID set to the *Web* OAuth client
//     id from the Google Cloud project (same one Supabase Auth uses).
//   - An *Android* OAuth client id registered in the same Google Cloud
//     project, with package name app.volyume and SHA-1 matching the
//     signing key that ships the APK (Play App Signing if using
//     internal testing). No code uses the Android client id directly,
//     but Google enforces its existence for the package + SHA-1 to be
//     trusted.

let _gsi = null;          // GoogleSignin handle, lazy-loaded
let _gsiConfigured = false;

function loadGoogleSignin() {
  if (_gsi !== null) return _gsi;
  try {
    // eslint-disable-next-line global-require
    _gsi = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch (_) {
    _gsi = false; // sentinel: module not present in this build
  }
  return _gsi || null;
}

function configureGoogleSignin() {
  if (_gsiConfigured) return true;
  const gs = loadGoogleSignin();
  if (!gs) return false;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) return false;
  try {
    gs.configure({ webClientId, offlineAccess: false });
    _gsiConfigured = true;
    return true;
  } catch (_) {
    return false;
  }
}

async function _signInWithGoogleNative() {
  const gs = loadGoogleSignin();
  if (!gs) {
    return { error: { message: 'Native Google Sign-In is not bundled in this build.' } };
  }
  if (!configureGoogleSignin()) {
    return { error: { message: 'Google Sign-In is missing its web client id (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).' } };
  }
  const c = getSupabaseClient();
  if (!c) {
    return { error: { message: 'Cloud auth is not available right now. Try email sign-in or Continue Locally.' } };
  }
  try {
    await gs.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await gs.signIn();
    // Handle both return shapes: v12 and earlier returned the
    // userInfo object directly; v13+ wraps it as
    // { type: 'success'|'cancelled', data: { idToken, ... } }.
    if (result?.type === 'cancelled') return { cancelled: true };
    const idToken = result?.idToken ?? result?.data?.idToken ?? null;
    if (!idToken) {
      return { error: { message: 'Google did not return an ID token.' } };
    }
    const { error } = await c.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { error };
    return { ok: true };
  } catch (e) {
    const code = String(e?.code ?? '');
    if (code === '12501' || code === 'SIGN_IN_CANCELLED' || /cancel/i.test(e?.message ?? '')) {
      return { cancelled: true };
    }
    return { error: { message: e?.message ?? 'Google Sign-In failed.' } };
  }
}

export function signInWithGoogle() {
  // Use the native account picker on Android. iOS still uses the
  // browser OAuth flow until a separate iOS OAuth client id is wired
  // through the config plugin's iosUrlScheme.
  if (Platform.OS === 'android') return _signInWithGoogleNative();
  return _signInWithOAuthProvider('google');
}

export function signInWithApple() {
  // Apple Sign-In via the Supabase OAuth browser flow. For a fully-native
  // experience on iOS (Apple's preferred path, and required for App Store
  // approval), a future enhancement should wire expo-apple-authentication's
  // native button. For now the browser-based flow works and the Apple ID
  // session lands back via the volyume:// deep link.
  return _signInWithOAuthProvider('apple');
}

export function signInWithMicrosoft() {
  // Supabase uses 'azure' as the provider key for Microsoft / Azure AD.
  // Kept for future use but no longer surfaced in the UI — the platform
  // primary buttons (Google on Android, Apple on iOS) cover most users.
  return _signInWithOAuthProvider('azure');
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

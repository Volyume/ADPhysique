import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore adapter for Supabase auth session, encrypted on both iOS and Android.
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

export function signInWithGoogle() {
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

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    _client = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
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

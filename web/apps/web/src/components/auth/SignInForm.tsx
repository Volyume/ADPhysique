'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@volyume/supabase/client';
import { Button } from '@volyume/ui';

// Public Google OAuth Web client ID — the same one the mobile app ships in
// its binary (src/lib/supabase.js) and the audience Supabase's Google
// provider verifies. Not a secret.
const GOOGLE_WEB_CLIENT_ID =
  '520741631478-apaethkp3g55o06lott116jag73l0ves.apps.googleusercontent.com';

// Google Identity Services global, loaded from accounts.google.com/gsi/client.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: string;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type Mode = 'signin' | 'signup';

export function SignInForm({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push('/dashboard');
          router.refresh();
        } else {
          setNotice('Check your email to confirm your account.');
        }
      }
    } catch (err) {
      setError(mode === 'signin' ? 'Could not sign in.' : 'Could not create account.');
      void err;
    } finally {
      setBusy(false);
    }
  }

  // Google sign-in replicates the mobile app's proven approach: Google
  // Identity Services returns an ID token in a popup (no redirects, no
  // Supabase URL on screen, no redirect allowlist involved) and Supabase
  // verifies it via signInWithIdToken — the exact server-side path the app
  // already uses with this same client ID. Requires the page's origin to be
  // listed under Authorised JavaScript origins on the Google web client.
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    const supabaseClient = supabase;

    function init() {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        ux_mode: 'popup',
        callback: async (response) => {
          setError(null);
          const { error } = await supabaseClient.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          });
          if (error) {
            setError('Could not sign in with Google.');
            return;
          }
          router.push('/dashboard');
          router.refresh();
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 384,
      });
      setGoogleReady(true);
    }

    if (window.google) {
      init();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
    // The script is a shared global; leave it in place on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function oauth(provider: 'apple') {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError('Could not start sign in.');
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="type-h2 text-textPrimary">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <p className="type-body mt-xs text-textSecondary">Same account as the Volyume app.</p>

      <form onSubmit={onSubmit} className="mt-xl flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="type-label text-textSecondary">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-borderSubtle bg-inputBg px-md py-sm type-body text-textPrimary outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="type-label text-textSecondary">Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-borderSubtle bg-inputBg px-md py-sm type-body text-textPrimary outline-none focus:border-primary"
          />
        </label>

        {error ? <p className="type-label text-error">{error}</p> : null}
        {notice ? <p className="type-label text-textSecondary">{notice}</p> : null}

        <Button type="submit" disabled={busy} className="mt-xs w-full">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <div className="mt-lg flex flex-col gap-sm">
        <div ref={googleButtonRef} className="flex w-full justify-center" />
        {!googleReady ? (
          <p className="type-label text-textSecondary">Loading Google sign-in…</p>
        ) : null}
        <Button variant="secondary" className="w-full" onClick={() => oauth('apple')}>
          Continue with Apple
        </Button>
      </div>

      <button
        type="button"
        className="mt-lg type-body text-primary hover:underline"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError(null);
          setNotice(null);
        }}
      >
        {mode === 'signin' ? 'Create an account' : 'I already have an account'}
      </button>
    </div>
  );
}

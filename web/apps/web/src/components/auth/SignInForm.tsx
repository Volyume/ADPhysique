'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@volyume/supabase/client';
import { Button } from '@volyume/ui';

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

  async function oauth(provider: 'google' | 'apple') {
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
        <Button variant="secondary" className="w-full" onClick={() => oauth('google')}>
          Continue with Google
        </Button>
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

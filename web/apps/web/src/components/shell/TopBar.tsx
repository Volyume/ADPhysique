'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@volyume/supabase/client';

// Top bar: the local UK date and the account menu (sign out). No
// search-everything bar; the user web does not need one yet (6a).
export function TopBar({ email, dateLabel }: { email: string; dateLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = (email.trim()[0] ?? '?').toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-borderSubtle px-xl py-md">
      <span className="type-label tnum text-textSecondary">{dateLabel}</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 items-center justify-center rounded-full bg-surface2 type-label font-semibold text-textPrimary hover:bg-surface3"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
        >
          {initial}
        </button>

        {open ? (
          <div
            className="absolute right-0 z-10 mt-sm w-56 rounded-md border border-borderSubtle bg-surface p-xs shadow-lg"
            role="menu"
          >
            <p className="truncate px-md py-sm type-caption text-textMuted" title={email}>
              {email}
            </p>
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-sm px-md py-sm text-left type-body text-textPrimary hover:bg-surface2"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

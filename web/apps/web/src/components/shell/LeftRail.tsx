'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@volyume/ui';

// Sections of the user web (6a). Items without an href are not built yet, so
// they render inert (no fake "coming soon" copy, just not yet reachable). The
// amber active bar is the affordance; no decorative icons.
const items: { key: string; label: string; href?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'plan', label: 'Plan' },
  { key: 'progress', label: 'Progress', href: '/progress' },
  { key: 'diary', label: 'Diary' },
  { key: 'coaching', label: 'Coaching', href: '/coaching' },
  { key: 'account', label: 'Account' },
];

export function LeftRail() {
  const pathname = usePathname();
  return (
    <nav className="flex w-[220px] shrink-0 flex-col gap-xxs border-r border-borderSubtle bg-background px-sm py-lg">
      <Link href="/dashboard" className="mb-lg px-md type-title font-bold text-textPrimary">
        Volyume
      </Link>
      {items.map((item) => {
        const active = item.href ? pathname.startsWith(item.href) : false;
        const className = cn(
          'rounded-md border-l-2 px-md py-sm type-body transition-colors duration-state ease-standard motion-reduce:transition-none',
          active
            ? 'border-primary bg-primaryBg text-textPrimary'
            : 'border-transparent text-textSecondary',
          item.href ? 'hover:text-textPrimary hover:bg-surface' : 'cursor-default text-textDisabled',
        );
        return item.href ? (
          <Link key={item.key} href={item.href} className={className} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        ) : (
          <span key={item.key} className={className} aria-disabled="true">
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}

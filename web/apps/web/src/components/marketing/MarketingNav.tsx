'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@volyume/ui';

const tabs = [
  { href: '/marketing', label: 'Overview' },
  { href: '/marketing/content', label: 'Pipeline' },
  { href: '/marketing/ledger', label: 'Ledger' },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-xs border-b border-borderSubtle">
      {tabs.map((t) => {
        const active = t.href === '/marketing' ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'border-b-2 px-md py-sm type-label transition-colors duration-state ease-standard motion-reduce:transition-none',
              active
                ? 'border-primary text-textPrimary'
                : 'border-transparent text-textSecondary hover:text-textPrimary',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

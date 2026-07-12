import type { ReactNode } from 'react';
import { MarketingNav } from '@/components/marketing/MarketingNav';

// Marketing HQ: heading, the section tabs (Overview / Pipeline / Ledger), and
// the active view. Without this nav the Pipeline and Ledger screens are
// unreachable from the UI.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="type-h2 text-textPrimary">Marketing HQ</h1>
      <div className="mt-lg">
        <MarketingNav />
      </div>
      <div className="mt-xl">{children}</div>
    </div>
  );
}

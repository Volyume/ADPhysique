import type { ReactNode } from 'react';
import { LeftRail } from './LeftRail';
import { TopBar } from './TopBar';

// The logged-in chrome: collapsible-width left rail, a top bar, and the content
// column. No bottom tab bar (that is mobile).
export function AppShell({
  email,
  dateLabel,
  showMarketing = false,
  children,
}: {
  email: string;
  dateLabel: string;
  showMarketing?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <LeftRail showMarketing={showMarketing} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={email} dateLabel={dateLabel} />
        <main className="flex-1 px-xl py-xl">{children}</main>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import { ukDisplayDate } from '@/lib/dates';
import { isMarketingAdmin } from '@/lib/marketing/auth';

// Every screen in this group requires a signed-in user and renders inside the
// app chrome. requireUser redirects to /sign-in when there is no session.
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const showMarketing = await isMarketingAdmin(user.email);
  return (
    <AppShell email={user.email ?? ''} dateLabel={ukDisplayDate()} showMarketing={showMarketing}>
      {children}
    </AppShell>
  );
}

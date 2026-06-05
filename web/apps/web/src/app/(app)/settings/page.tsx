import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { AccessibilitySettings } from '@/components/settings/AccessibilitySettings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/account" className="type-caption text-textMuted hover:text-textSecondary">
        Account
      </Link>
      <h1 className="mt-xs type-h2 text-textPrimary">Settings</h1>

      <section className="mt-xl">
        <h2 className="type-label uppercase tracking-label text-textSecondary">Display</h2>
        <div className="mt-sm">
          <AccessibilitySettings />
        </div>
      </section>

      <section className="mt-xl">
        <h2 className="type-label uppercase tracking-label text-textSecondary">Privacy</h2>
        <nav className="mt-sm flex flex-col gap-sm">
          <Link href="/privacy" className="type-body text-primary hover:underline">
            Privacy policy
          </Link>
          <Link href="/terms" className="type-body text-primary hover:underline">
            Terms
          </Link>
        </nav>
      </section>

      <p className="mt-xl type-caption text-textMuted">
        Notification and health-data settings are on the app.
      </p>
    </div>
  );
}

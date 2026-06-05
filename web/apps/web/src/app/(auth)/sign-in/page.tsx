import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { SignInForm } from '@/components/auth/SignInForm';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  // Already signed in: skip the form.
  const user = await getUser();
  if (user) redirect('/dashboard');

  const mode = searchParams.mode === 'signup' ? 'signup' : 'signin';

  return (
    <main className="flex min-h-screen flex-col px-lg">
      <header className="py-xl">
        <Link href="/" className="type-title font-bold text-textPrimary">
          Volyume
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center pb-xxxl">
        <SignInForm initialMode={mode} />
      </div>
    </main>
  );
}

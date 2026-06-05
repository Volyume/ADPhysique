import Link from 'next/link';

// Logged-out landing. The one marketing-leaning surface, still the instrument:
// dark, amber only on the CTA, no hero gradient, no carousel, no checkmark
// walls. One restrained hero, one primary action, three honest capability lines.
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-lg">
      <header className="flex items-center justify-between py-xl">
        <span className="type-title font-bold text-textPrimary">Volyume</span>
        <Link href="/sign-in" className="type-body text-primary hover:underline">
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-xxxl">
        <h1 className="type-display max-w-xl text-textPrimary">Less thinking. More lifting.</h1>
        <p className="type-h3 mt-lg max-w-xl font-normal text-textSecondary">
          Precision training and nutrition coaching that adapts to you, week by week. Private by
          design.
        </p>
        <div className="mt-xl flex items-center gap-lg">
          <Link
            href="/sign-in?mode=signup"
            className="inline-flex items-center justify-center rounded-md bg-primaryFill px-xl py-md type-title text-background transition-colors duration-state ease-standard hover:bg-primary motion-reduce:transition-none"
          >
            Create account
          </Link>
          <Link href="/sign-in" className="type-body text-textSecondary hover:text-textPrimary">
            Already have an account?
          </Link>
        </div>
      </section>

      <section className="grid gap-lg border-t border-borderSubtle py-xl sm:grid-cols-3">
        <div>
          <h2 className="type-title text-textPrimary">Precision Coaching</h2>
          <p className="type-body mt-xs text-textSecondary">
            A weekly review that changes your plan and explains why.
          </p>
        </div>
        <div>
          <h2 className="type-title text-textPrimary">Progress in depth</h2>
          <p className="type-body mt-xs text-textSecondary">
            Lifts, volume and body trends, read at full size on the web.
          </p>
        </div>
        <div>
          <h2 className="type-title text-textPrimary">Private by design</h2>
          <p className="type-body mt-xs text-textSecondary">
            Your data stays yours. Built on published training science.
          </p>
        </div>
      </section>

      <footer className="flex flex-wrap gap-lg border-t border-borderSubtle py-lg type-caption text-textMuted">
        <span>Volyume</span>
        <Link href="/privacy" className="hover:text-textSecondary">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-textSecondary">
          Terms
        </Link>
      </footer>
    </main>
  );
}

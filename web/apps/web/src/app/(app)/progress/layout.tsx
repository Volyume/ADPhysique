import type { ReactNode } from 'react';
import { ProgressNav } from '@/components/progress/ProgressNav';

// The analysis cockpit: a heading, the sub-view tabs, and the active view. This
// is the depth the phone cannot show (the reason the web app exists).
export default function ProgressLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="type-h2 text-textPrimary">Progress</h1>
      <div className="mt-lg">
        <ProgressNav />
      </div>
      <div className="mt-xl">{children}</div>
    </div>
  );
}

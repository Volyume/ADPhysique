import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Volyume',
  description: 'Precision training and nutrition coaching. Less thinking. More lifting.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="type-body">{children}</body>
    </html>
  );
}

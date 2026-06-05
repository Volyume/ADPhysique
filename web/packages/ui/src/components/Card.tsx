import * as React from 'react';
import { cn } from '../cn';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  // `elevated` uses the next rung of the elevation ladder for nested cards.
  elevated?: boolean;
};

// Surface container. Border + tiered radius, no shadow-as-decoration. Matches
// the mobile Card: a flat charcoal surface separated from the background by a
// hairline, depth read from the elevation ladder, not glow.
export function Card({ elevated, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-borderSubtle p-lg',
        elevated ? 'bg-surfaceElevated' : 'bg-surface',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-md flex items-baseline justify-between gap-md', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-sm font-medium uppercase tracking-label text-textSecondary',
        className,
      )}
      {...rest}
    />
  );
}

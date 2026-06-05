import * as React from 'react';
import { cn } from '../cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';

const base =
  'inline-flex items-center justify-center gap-sm rounded-md font-semibold transition-colors duration-state ease-standard ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 ' +
  'motion-reduce:transition-none';

// Amber is the single affordance. primaryFill is the deepened amber for large
// fills (the bright tone vibrates on dark). Mirrors the mobile Button variants.
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primaryFill text-background hover:bg-primary px-lg py-sm text-md',
  secondary:
    'bg-surface2 text-textPrimary hover:bg-surface3 border border-borderSubtle px-lg py-sm text-md',
  ghost: 'bg-transparent text-textPrimary hover:bg-surface2 px-lg py-sm text-md',
  destructive: 'bg-transparent text-error hover:bg-errorBg border border-error px-lg py-sm text-md',
  link: 'bg-transparent text-primary hover:underline px-0 py-0 text-md',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cn(base, variants[variant], className)} {...rest} />;
}

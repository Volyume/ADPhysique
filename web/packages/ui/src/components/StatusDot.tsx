import * as React from 'react';
import { cn } from '../cn';

type Tone = 'on' | 'off' | 'neutral';

const toneClass: Record<Tone, string> = {
  on: 'bg-success',
  off: 'bg-error',
  neutral: 'bg-textMuted',
};

// A single small dot to read on/off-target at a glance. Used sparingly: the
// amber affordance carries the brand, this only flags status next to a figure.
export function StatusDot({ tone = 'neutral', className }: { tone?: Tone; className?: string }) {
  return <span className={cn('inline-block size-2 rounded-full', toneClass[tone], className)} aria-hidden="true" />;
}

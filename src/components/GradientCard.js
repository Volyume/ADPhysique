/**
 * GradientCard — compatibility shim.
 *
 * The component audit (design premium 2026-05-30, F4) found this was
 * identical to `Card` with a `tone` accent border: there is no gradient (the
 * locked rule is a flat background, no gradients/orbs/glows). To stop two
 * card components drifting, the real implementation now lives in `Card`, and
 * this forwards to it so existing call sites keep working unchanged.
 *
 * Prefer `<Card tone="primary">` directly in new code. `tint` maps to a
 * custom accent; the old `intensity` prop was always ignored and still is.
 */

import Card from './Card';
import { withAlpha } from '../styles/theme';

export default function GradientCard({
  tone = 'primary',
  tint,
  intensity: _intensity, // accepted but unused (was always ignored)
  style,
  children,
  borderless = false,
  accessibilityLabel,
}) {
  // If a caller passed an explicit tint hex, honour it as the accent border;
  // otherwise let Card resolve the tone. withAlpha keeps the 0.33 border read.
  const tintStyle = tint && !borderless ? { borderColor: withAlpha(tint, 0.33) } : null;
  return (
    <Card
      tone={tint ? undefined : tone}
      borderless={borderless}
      style={[tintStyle, style]}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Card>
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampPct(value: number): number {
  return clamp(value, 0, 100);
}

export function nullableClampPct(value: number | null | undefined): number | null {
  return value == null ? null : clampPct(value);
}

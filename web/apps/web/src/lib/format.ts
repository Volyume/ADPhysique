// UK-formatted display helpers. Numbers the user reads as data use tabular
// figures (the .tnum class) at the call site; these just format the value.
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}

export function fmtKg(n: number, dp = 1): string {
  return `${n.toFixed(dp)} kg`;
}

// Signed weekly rate, e.g. "+0.25" or "-0.40". No unit (caller adds it).
export function fmtSignedRate(n: number, dp = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(dp)}`;
}

// Turn a stored token like "build_muscle" into "Build muscle" for display.
export function humanise(s: string | null | undefined): string {
  if (!s) return 'Not set';
  const spaced = String(s).replace(/[_-]+/g, ' ').trim();
  if (!spaced) return 'Not set';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

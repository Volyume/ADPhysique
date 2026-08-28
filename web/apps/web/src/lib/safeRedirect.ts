/** Allow only short same-origin absolute paths after an auth exchange. */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const parsed = new URL(value, 'https://volyume.invalid');
    if (parsed.origin !== 'https://volyume.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return fallback;
  }
}

/** Allow only short same-origin absolute paths after an auth exchange. */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    // Check repeated decoding as a defensive normalisation step. Browsers,
    // proxies and frameworks do not always normalise at the same layer; a
    // separator/control that becomes dangerous after one or two decodes is not
    // a legitimate post-auth destination.
    let decoded = value;
    for (let i = 0; i < 3; i += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')
        || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    }
    const parsed = new URL(value, 'https://volyume.invalid');
    if (parsed.origin !== 'https://volyume.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return fallback;
  }
}

function finiteTimestamp(ts) {
  const n = Number(ts);
  return Number.isFinite(n) ? n : null;
}

function formatDate(ts, options) {
  const n = finiteTimestamp(ts);
  if (n == null) return '';
  try { return new Date(n).toLocaleDateString('en-GB', options); }
  catch (_) { return ''; }
}

export function formatProgressPhotoDay(ts) {
  return formatDate(ts, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatProgressPhotoShortDay(ts) {
  return formatDate(ts, { day: 'numeric', month: 'short' });
}

export function formatProgressPhotoMonth(ts) {
  return formatDate(ts, { month: 'long', year: 'numeric' });
}

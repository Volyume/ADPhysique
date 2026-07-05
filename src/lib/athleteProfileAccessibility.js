export function profileRowStatusLabel(status) {
  if (status === 'attention') return 'Update';
  if (status === 'soon') return 'Soon';
  if (status === 'fresh') return 'Fresh';
  return null;
}

export function buildProfileRowAccessibility({ label, sub, status, pro } = {}) {
  const statusLabel = profileRowStatusLabel(status);
  const hintParts = [];

  if (statusLabel) hintParts.push(`Status: ${statusLabel}.`);
  if (sub) hintParts.push(sub);
  if (pro) hintParts.push('Pro plan may be required.');

  return {
    accessibilityLabel: label,
    accessibilityHint: hintParts.length ? hintParts.join(' ') : undefined,
  };
}

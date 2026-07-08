const CALIBRATION_EXPORT_EMAILS = new Set([
  'allansdouglas1983@gmail.com',
  'allansdoug1983@gmail.com',
  'allanhendy69@gmail.com',
]);

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isProgressScanCalibrationExportAllowed(user = null) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return CALIBRATION_EXPORT_EMAILS.has(normaliseEmail(user?.email));
}


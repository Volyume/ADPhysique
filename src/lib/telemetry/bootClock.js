/**
 * The moment the JavaScript bundle started, for the start-up time measure
 * (telemetry brief 2026-10-19). Imported first in index.js so it runs before
 * any other module.
 */
if (typeof global !== 'undefined' && !Number.isFinite(global.__VOLYUME_BOOT_AT)) {
  global.__VOLYUME_BOOT_AT = Date.now();
}

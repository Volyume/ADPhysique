/**
 * setup_stage_stalled emitter (growth brief 2026-10-19, lane D). Report
 * only: called by the existing setup and boot watchdogs when a stage is
 * still unsettled after its window. Carries the stage name and nothing else;
 * a preConsent performance event, so a stall before consent is still seen.
 */
const STAGES = ['fit', 'fit_full', 'reminder_prefs', 'build', 'notification_permission', 'reminder_lay',
  'boot_splash', 'boot_first_run', 'boot_tier', 'boot_auth', 'boot_consent'];

const BOOT_WAITS = {
  splash: 'boot_splash', first_run: 'boot_first_run', tier: 'boot_tier', auth: 'boot_auth', consent: 'boot_consent',
};

/** The schema stage for a watchdog's stage or a boot wait name ('other' if unknown). */
export function stalledStage(name) {
  if (STAGES.includes(name)) return name;
  return BOOT_WAITS[name] || 'other';
}

/** Send one setup_stage_stalled for `name`. Never throws. */
export function emitSetupStageStalled(name) {
  try {
    // eslint-disable-next-line global-require
    const { trackNow } = require('./growth');
    trackNow('setup_stage_stalled', { stage: stalledStage(name) });
  } catch (_) { /* telemetry never blocks setup */ }
}

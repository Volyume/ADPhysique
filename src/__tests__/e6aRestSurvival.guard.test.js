/**
 * E6A rest-timer survival, source guards (founder-approved 2026-07-02:
 * exact alarms + shortService FGS, per
 * docs/rest-timer-android-survival-DRAFT.md paths a + c).
 *
 * What these pins lock, and why:
 *   1. The native service NEVER uses the health FGS type again — that path
 *     crashes with SecurityException on Android 14+ without a health runtime
 *     permission and drags a Play Console health declaration with it. Only
 *     SHORT_SERVICE (declaration-exempt) is allowed, and manifest + Kotlin
 *     must agree (a mismatch throws at startForeground).
 *   2. The shortService timeout discipline exists: onTimeout() is
 *     implemented (missing it ANRs the app) and a self-stop is scheduled
 *     inside the window.
 *   3. SCHEDULE_EXACT_ALARM is declared, and the RESTRICTED USE_EXACT_ALARM
 *     (Play: alarm-clock/calendar apps only) never creeps in.
 *   4. The JS gate keeps rests longer than the window off the service.
 *   5. RestTimer never posts two rest notifications at once (the sticky is
 *     dropped while the chronometer host owns the shade).
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

const MANIFEST = read('modules/rest-timer-live/android/src/main/AndroidManifest.xml');
const SERVICE = read('modules/rest-timer-live/android/src/main/java/expo/modules/resttimerlive/WorkoutForegroundService.kt');
const MODULE = read('modules/rest-timer-live/android/src/main/java/expo/modules/resttimerlive/RestTimerLiveModule.kt');
const APP_JSON = JSON.parse(read('app.json'));

describe('E6A: shortService foreground type, never health', () => {
  test('the manifest declares the service as shortService, uncommented', () => {
    const active = MANIFEST.replace(/<!--[\s\S]*?-->/g, '');
    expect(active).toMatch(/android:name="\.WorkoutForegroundService"/);
    expect(active).toMatch(/android:foregroundServiceType="shortService"/);
    expect(active).toMatch(/android:exported="false"/);
    expect(active).not.toMatch(/health/i);
    expect(active).not.toMatch(/FOREGROUND_SERVICE_HEALTH/);
  });

  test('the Kotlin service starts with SHORT_SERVICE and health is gone', () => {
    expect(SERVICE).toMatch(/FOREGROUND_SERVICE_TYPE_SHORT_SERVICE/);
    expect(SERVICE).not.toMatch(/FOREGROUND_SERVICE_TYPE_HEALTH/);
  });

  test('the timeout discipline exists: onTimeout override + a capped self-stop', () => {
    expect(SERVICE).toMatch(/override fun onTimeout\(startId: Int\)/);
    expect(SERVICE).toMatch(/override fun onTimeout\(startId: Int, fgsType: Int\)/);
    expect(SERVICE).toMatch(/MAX_WINDOW_MS = 170_000L/);
    expect(SERVICE).toMatch(/stopHandler\.postDelayed\(stopRunnable, windowMs\)/);
    // E6A review: the OS deadline is fixed at startForeground; re-anchored
    // self-stops must be capped against THAT instant, not against now.
    expect(SERVICE).toMatch(/foregroundedAtMs \+ MAX_WINDOW_MS\) - now/);
    expect(SERVICE).toMatch(/if \(windowMs <= 0L\)/);
  });

  test('startForeground is called at most once per service lifetime (updates use notify)', () => {
    expect(SERVICE).toMatch(/if \(!foregrounded\) \{/);
    expect(SERVICE).toMatch(/manager\.notify\(NOTIF_ID, notification\)/);
  });
});

describe('E6A: exact alarms', () => {
  test('SCHEDULE_EXACT_ALARM is declared; restricted USE_EXACT_ALARM is not', () => {
    const perms = APP_JSON.expo.android.permissions;
    expect(perms).toContain('android.permission.SCHEDULE_EXACT_ALARM');
    expect(perms).not.toContain('android.permission.USE_EXACT_ALARM');
  });

  test('the native module exposes the grant check + the system grant screen', () => {
    expect(MODULE).toMatch(/AsyncFunction\("canScheduleExactAlarms"\)/);
    expect(MODULE).toMatch(/alarmManager\.canScheduleExactAlarms\(\)/);
    expect(MODULE).toMatch(/ACTION_REQUEST_SCHEDULE_EXACT_ALARM/);
  });
});

describe('E6A: the JS orchestration posture', () => {
  test('the window gate keeps long rests off the service', () => {
    const src = read('src/lib/notifications/restForeground.js');
    expect(src).toMatch(/REST_FOREGROUND_MAX_MS = 170_000/);
    expect(src).toMatch(/endsAtMs - nowMs > REST_FOREGROUND_MAX_MS\) return false;/);
  });

  test('RestTimer shows exactly one rest notification, and the sticky resumes past the host window', () => {
    const src = read('src/components/RestTimer.js');
    // Suppression is deadline-aware: past the fixed OS window the host is
    // gone, so the sticky must take the shade back (E6A review).
    expect(src).toMatch(/if \(Date\.now\(\) < fgsDeadlineRef\.current\) return;/);
    expect(src).toMatch(/fgsDeadlineRef\.current = Date\.now\(\) \+ REST_FOREGROUND_MAX_MS;/);
  });

  test('host stops are unconditional and each re-anchor gets a fresh service instance (E6A review)', () => {
    const src = read('src/components/RestTimer.js');
    // Teardown and window-exit stop WITHOUT consulting the ref (an in-flight
    // start has not flipped it yet), and a stale in-flight success re-checks
    // the live store before claiming the shade.
    const stops = src.match(/fgsActiveRef\.current = false;\s*\n\s*stopRestForeground\(\)\.catch/g) || [];
    expect(stops.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/if \(fgsActiveRef\.current\) await stopRestForeground\(\);/);
    expect(src).toMatch(/!now\.restTimerActive \|\| now\.restTimerEndsAt !== anchor/);
    expect(src).toMatch(/AppState\.currentState !== 'active'/);
  });

  test('the one-time exact-alarm ask respects the rest-alert off switch', () => {
    const src = read('src/components/RestTimer.js');
    expect(src).toMatch(/if \(!useAppStore\.getState\(\)\.restEndAlertEnabled\) return;/);
    expect(src).toMatch(/@volyume_exact_alarm_prompted/);
  });
});

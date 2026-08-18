/**
 * Rest cues must survive the app being minimised (founder order 2026-08-18:
 * "I want them on and active even if the app is minimised").
 *
 * Two independent things were stopping that, and both are pinned here:
 *
 *   1. expo-av was configured with staysActiveInBackground FALSE, so the
 *      beeps were foreground-only BY CONFIGURATION whatever the timer did.
 *      Android now sets it true. iOS deliberately does NOT - that flag needs
 *      the `audio` UIBackgroundMode, which this app does not declare, and
 *      setting it regardless makes setAudioModeAsync throw and takes every
 *      beep down with it.
 *   2. The pips are JS timers, and Android freezes a backgrounded process.
 *      The cue times are now handed to AlarmManager (native RestCueReceiver
 *      plays the same cached WAV), scheduled when the app leaves and
 *      cancelled when it returns - so a cue is never heard twice.
 */
import fs from 'fs';
import path from 'path';

const read = (...p) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');
const SOUND = read('..', '..', 'restSound.js');
const TIMER = read('..', '..', '..', 'components', 'RestTimer.js');
const FOREGROUND = read('..', 'restForeground.js');
const RECEIVER = read(
  '..', '..', '..', '..', 'modules', 'rest-timer-live', 'android', 'src', 'main',
  'java', 'expo', 'modules', 'resttimerlive', 'RestCueReceiver.kt',
);
const MANIFEST = read(
  '..', '..', '..', '..', 'modules', 'rest-timer-live', 'android', 'src', 'main',
  'AndroidManifest.xml',
);

describe('background rest cues', () => {
  test('Android keeps audio alive in the background; iOS deliberately does not', () => {
    expect(SOUND).toMatch(/staysActiveInBackground: Platform\.OS === 'android'/);
    expect(SOUND).not.toMatch(/staysActiveInBackground: false/);
  });

  test('leaving the app schedules OS cues, returning cancels them', () => {
    expect(TIMER).toMatch(/if \(nextState !== 'active'\) \{[\s\S]{0,400}scheduleBackgroundRestCues/);
    expect(TIMER).toMatch(/cancelBackgroundRestCues\(\)\.catch/);
  });

  test('the go tone is not replayed on return when the OS already played it', () => {
    // Returning to a finished rest keeps the haptic and the visual, but must
    // not fire a second go tone on top of the one heard in the pocket.
    const block = TIMER.slice(TIMER.indexOf('const elapsedWhileAway'));
    expect(block.slice(0, 700)).not.toMatch(/playRestBeep\('go'\)/);
  });

  test('muted users schedule nothing at all', () => {
    expect(FOREGROUND).toMatch(/restSoundsEnabled === false/);
  });

  test('the receiver is registered, unexported, and only plays known cues', () => {
    expect(MANIFEST).toMatch(/<receiver[\s\S]*android:name="\.RestCueReceiver"[\s\S]*android:exported="false"/);
    expect(RECEIVER).toMatch(/setOf\("three", "two", "one", "go"\)/);
    // A receiver that throws would crash the app; every path is caught.
    expect(RECEIVER).toMatch(/catch \(_: Throwable\)/);
  });
});

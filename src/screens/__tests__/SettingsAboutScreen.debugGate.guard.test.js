/**
 * EP-21 / P-09 (docs audit 2026-07-12, lead ruling D-EP21): the About
 * version row used to advertise DebugLog to every user -- long-press
 * navigated straight there, and the accessibility label literally said
 * "press and hold for debug logs". DebugLog shows sync diagnostics, the
 * most recent fatal crash, and raw exception messages/stacks, so this made
 * the app look like a test build and handed every screen-reader user a
 * pointer at internal tooling.
 *
 * Ruling: production must advertise nothing beyond the existing
 * "tap to share the build identifier" affordance (no expo-clipboard
 * dependency exists in this codebase, so a true "copy" tap was not
 * implemented -- see the handover report). DebugLog stays reachable for
 * support only via an unadvertised 7-tap-in-3-seconds gesture on the
 * version value, Android build-number-style. The long-press path is kept
 * only for __DEV__ developer convenience.
 *
 * SettingsAboutScreen is a simple functional screen but pulls in
 * FeedbackSheet/SettingsPrimitives/useTheme context providers this suite
 * doesn't want to stand up, so (matching this repo's convention for
 * hard-to-mount screens -- see DiaryScreen's own guard suites) this pins
 * the source text directly.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'SettingsAboutScreen.js'), 'utf8');

// Source comments (this suite's own header included) legitimately discuss
// "debug"/"7 taps" as implementation narrative -- that's fine, it's never
// shown to a user. What must never carry that wording is anything actually
// rendered or exposed to accessibility services: JSX prop values. Strip
// `//` line comments before asserting on those.
const CODE_ONLY = SRC
  .split('\n')
  .filter(line => !line.trim().startsWith('//'))
  .join('\n');

describe('SettingsAboutScreen: production version row never advertises DebugLog', () => {
  test('the accessibility label mentions only sharing, never debug/log/hold', () => {
    const match = SRC.match(/accessibilityLabel="([^"]*)"\s*>/);
    expect(match).toBeTruthy();
    const label = match[1];
    expect(label).not.toMatch(/debug/i);
    expect(label).not.toMatch(/\blog/i);
    expect(label).not.toMatch(/hold/i);
    expect(label).toMatch(/share/i);
  });

  test('no accessibilityHint or other prop on the row references debug/log/hold either', () => {
    const rowStart = CODE_ONLY.indexOf('<TouchableOpacity');
    const rowEnd = CODE_ONLY.indexOf('>', CODE_ONLY.indexOf('accessibilityLabel', rowStart)) + 1;
    const rowProps = CODE_ONLY.slice(rowStart, rowEnd);
    // Prop VALUES only -- the onPress body legitimately calls
    // navigation.navigate('DebugLog') and references DEBUG_TAP_* constants;
    // that's the hidden gesture's wiring, not user-facing advertisement.
    const propLines = rowProps
      .split('\n')
      .filter(l => /^\s*(accessibilityLabel|accessibilityHint|accessibilityRole)=/.test(l));
    expect(propLines.join('\n')).not.toMatch(/debug/i);
    expect(propLines.join('\n')).not.toMatch(/press and hold/i);
  });
});

describe('SettingsAboutScreen: the 7-tap-in-3-seconds gesture reaches DebugLog', () => {
  test('the tap-count and time-window constants are pinned at 7 taps / 3000ms', () => {
    expect(SRC).toMatch(/const DEBUG_TAP_COUNT = 7;/);
    expect(SRC).toMatch(/const DEBUG_TAP_WINDOW_MS = 3000;/);
  });

  test('the onPress handler counts taps within the window and navigates to DebugLog once the threshold is reached', () => {
    expect(SRC).toMatch(
      /const recent = debugTapTimestamps\.filter\(ts => now - ts < DEBUG_TAP_WINDOW_MS\);/,
    );
    expect(SRC).toMatch(/if \(recent\.length >= DEBUG_TAP_COUNT\) \{/);
    expect(SRC).toMatch(/navigation\.navigate\('DebugLog'\);/);
  });

  test('the tap counter is module-level state, not a React hook (avoids the resetModules/useRef dispatcher pitfall documented in SettingsFaqScreen.test.js)', () => {
    expect(SRC).toMatch(/^let debugTapTimestamps = \[\];/m);
    expect(SRC).not.toMatch(/from 'react';/);
  });

  test('the gesture is not advertised: no JSX prop value (label/hint/rendered text) mentions "7 tap" or "seven tap"', () => {
    const propLines = CODE_ONLY
      .split('\n')
      .filter(l => /^\s*(accessibilityLabel|accessibilityHint|accessibilityRole)=/.test(l))
      .join('\n');
    expect(propLines).not.toMatch(/7 tap/i);
    expect(propLines).not.toMatch(/seven tap/i);
  });
});

describe('SettingsAboutScreen: long-press-to-DebugLog is a __DEV__-only developer path', () => {
  test('onLongPress only wires the DebugLog navigation when __DEV__ is true, and is undefined otherwise', () => {
    expect(SRC).toMatch(
      /onLongPress=\{__DEV__ \? \(\) => navigation\.navigate\('DebugLog'\) : undefined\}/,
    );
  });

  test('there is exactly one onLongPress prop in the file (no unguarded duplicate path)', () => {
    const matches = SRC.match(/onLongPress=/g) || [];
    expect(matches.length).toBe(1);
  });
});

/**
 * ClipCameraScreen legibility guard (founder report 2026-10-19: while
 * recording a set video the display was hard to read and unclear). Source-level
 * pins, written to fail if the fix is undone:
 *   - no grey (textSecondary) ink on camera text, anywhere on the video;
 *   - the gradient scrims exist (top and bottom), inert and hidden from a
 *     screen reader;
 *   - every text group sits on the dark glass pill;
 *   - the countdown numeral uses a REAL large role (theme `hero`, 120 px),
 *     not a missing one that falls back to body;
 *   - the REC pill with its record-red dot and the bold clock;
 *   - the record button is at least 80 dp and morphs record red to a square;
 *   - the hint copy, one action per line.
 */
const fs = require('fs');
const path = require('path');
const { resolveTheme } = require('../../styles/theme');
const { CAM } = require('../../components/clips/cameraInk');
const { CLIP_STRINGS, autoStopLine } = require('../../lib/clips/rules');

const SRC = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const SCREEN = read('screens', 'ClipCameraScreen.js');
const PROGRESS = read('components', 'clips', 'RecordingProgress.js');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('legibility system', () => {
  test('no textSecondary (grey) ink on any camera text', () => {
    expect(code(SCREEN)).not.toMatch(/textSecondary/);
    expect(code(PROGRESS)).not.toMatch(/textSecondary/);
  });

  test('the scrims exist: top and bottom gradients, inert, hidden from accessibility', () => {
    expect(SCREEN).toMatch(/from 'expo-linear-gradient'/);
    expect(SCREEN).toMatch(/testID="clip-camera-scrim-top"/);
    expect(SCREEN).toMatch(/testID="clip-camera-scrim-bottom"/);
    expect(SCREEN).toMatch(/SCRIM_TOP_HEIGHT = '18%'/);
    expect(SCREEN).toMatch(/SCRIM_BOTTOM_HEIGHT = '30%'/);
    const grads = SCREEN.match(/<LinearGradient[\s\S]*?\/>/g) || [];
    expect(grads).toHaveLength(2);
    for (const g of grads) {
      expect(g).toMatch(/pointerEvents="none"/);
      expect(g).toMatch(/importantForAccessibility="no-hide-descendants"/);
    }
  });

  test('camera ink carries the scrim, pill and a record red, each commented', () => {
    const ink = read('components', 'clips', 'cameraInk.js');
    for (const k of ['scrim', 'pill', 'record']) expect(Object.keys(CAM)).toContain(k);
    expect(CAM.record).toBe('#FF3B30');
    expect(ink).toMatch(/\/\/ .*\n\s*scrim:/);
    expect(ink).toMatch(/\/\/ .*\n\s*pill:/);
  });

  test('pills sit behind the chips, the tip, the hints and the countdown caption', () => {
    expect(SCREEN).toMatch(/pill: \{[^}]*backgroundColor: CAM\.pill/s);
    expect(SCREEN).toMatch(/valueControl: \{[^}]*minHeight: GLYPH[^}]*backgroundColor: CAM\.pill/s);
    for (const id of ['clip-camera-setup', 'clip-camera-hint', 'clip-camera-countdown-caption']) {
      const at = SCREEN.indexOf(`testID="${id}"`);
      const pillAt = SCREEN.lastIndexOf('<View style={styles.pill}', at);
      expect({ id, pillBefore: pillAt > 0 && at - pillAt < 700 }).toEqual({ id, pillBefore: true });
    }
  });

  test('the setup tip is in normal flow in the top stack, not at an absolute offset', () => {
    expect(SCREEN).not.toMatch(/setupRow/);
    expect(SCREEN).toMatch(/topStack: \{ position: 'absolute'/);
    expect(SCREEN.indexOf('testID="clip-camera-setup"')).toBeGreaterThan(SCREEN.indexOf('style={styles.topStack'));
  });

  test('type minimums: captions 13, hints 15 or more, clock 17 bold, all white', () => {
    const t = resolveTheme({ theme: 'dark' });
    expect(t.type.label.fontSize).toBeGreaterThanOrEqual(13);
    expect(t.type.bodyStrong.fontSize).toBeGreaterThanOrEqual(15);
    expect(t.type.title.fontSize).toBe(17);
    expect(SCREEN).toMatch(/clock: \{ \.\.\.t\.type\.w\(t\.type\.num\('title'\), 'bold'\) \}/);
    expect(SCREEN).toMatch(/caption: \{ \.\.\.t\.type\.label, color: CAM\.textPrimary/);
    expect(SCREEN).toMatch(/hint: \{ \.\.\.t\.type\.w\('bodyStrong'/);
  });
});

describe('countdown', () => {
  test('the numeral uses a real large role: theme hero, 120 px', () => {
    const t = resolveTheme({ theme: 'dark' });
    expect(SCREEN).toMatch(/countdown: \{ \.\.\.t\.type\.num\('hero'\) \}/);
    expect(t.type.num('hero').fontSize).toBe(120);
    expect(t.type.num('hero').fontSize).toBeGreaterThan(t.type.body.fontSize * 4);
  });

  test('a dark 40% disc sits behind it and "Get into position" is under it', () => {
    expect(SCREEN).toMatch(/countdownDisc: \{[^}]*backgroundColor: CAM\.disc/s);
    expect(CLIP_STRINGS.getIntoPosition).toBe('Get into position');
    expect(SCREEN).toMatch(/accessibilityLiveRegion="polite"/);
  });
});

describe('recording state', () => {
  test('a REC pill with a record-red dot, the word REC and a bold white clock', () => {
    expect(PROGRESS).toMatch(/testID="clip-camera-rec-pill"/);
    expect(PROGRESS).toMatch(/recDot: \{[^}]*backgroundColor: CAM\.record/s);
    expect(PROGRESS).toMatch(/>REC<\/Text>/);
    expect(PROGRESS).toMatch(/clock: \{\s*color: CAM\.textPrimary/);
    expect(PROGRESS).toMatch(/!reduceMotion && elapsed % 1000 >= 500/);
  });

  test('the progress line is 3 to 4 dp', () => {
    const n = Number(PROGRESS.match(/const LINE_HEIGHT = (\d+);/)[1]);
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(4);
  });

  test('the record button is at least 80 dp, a white ring with a record-red centre', () => {
    expect(Number(SCREEN.match(/const RECORD_SIZE = (\d+);/)[1])).toBeGreaterThanOrEqual(80);
    expect(SCREEN).toMatch(/innerColour = greyed \? dimmedInk : CAM\.record/);
    expect(SCREEN).toMatch(/borderColor: ink/);
  });

  test('the setting chips are hidden while recording', () => {
    expect(SCREEN).toMatch(/\{!isRecording \? \(\s*<View style=\{styles\.topControls\}>/);
  });
});

describe('hint copy: one action per line', () => {
  test('idle, countdown, recording, saving', () => {
    expect(CLIP_STRINGS.recordHint).toBe('Tap to start, or press and hold to film.');
    expect(autoStopLine(90)).toBe('Stops by itself at 90 s');
    expect(autoStopLine(120)).toBe('Stops by itself at 2 min');
    expect(CLIP_STRINGS.countdownHint).toBe('Tap to cancel.');
    expect(CLIP_STRINGS.recordingHintTap).toBe('Tap to stop.');
    expect(CLIP_STRINGS.recordingHintHold).toBe('Let go to stop.');
    expect(CLIP_STRINGS.savingHint).toBe('Saving your video');
  });
});

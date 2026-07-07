/**
 * coachOutputApplyMorph.guard.test.js — source guards for the Wave 6 M4
 * Apply-row state morph on CoachOutputScreen (audit 03b §3.3b; the NU-3
 * "held at your safe minimum" settle).
 *
 * What this suite pins and why:
 *  - THE SAFETY CONTRACT: an ED-floor hold must never look or feel like a
 *    success. The hold branches (compute returned null) set the NU-3 notice
 *    and return BEFORE the write, so they can never reach the success-beat
 *    marker; and the screen fires no haptics of its own, so the only haptic
 *    a coach apply can produce is the Button primitive's commit beat on a
 *    real success (03b §3.3f: a safety hold is calm information, never an
 *    error buzz, never a success buzz).
 *  - THE DATA-FIRST ORDER (fit rule 5): the presentational success marker is
 *    set only after markApplied's setOutput lands. The write is never gated
 *    on animation; the beat is bookkeeping on top of committed state.
 *  - THE MORPH WIRING: every apply surface rides the Button primitive with
 *    a state prop (no TouchableOpacity apply pills left), the hero row is
 *    the only amber fill (A1 one-amber rule as a variant mapping), and the
 *    row keeps the button mounted through 'success' so the checkmark beat
 *    is visible before the Applied chip replaces it.
 */
import fs from 'fs';
import path from 'path';

const SCREEN = fs.readFileSync(
  path.resolve(__dirname, '../screens/CoachOutputScreen.js'),
  'utf8',
);

// The seven apply keys with a committing button on this screen.
const APPLY_KEYS = [
  'calories', 'training', 'cardio',
  'deload', 'dietBreak', 'macroCycle', 'refeed',
];

describe('M4 safety contract: a floor hold never becomes a success', () => {
  test('the screen fires no haptics of its own (holds stay silent by construction)', () => {
    // The commit beat lives in Button's success phase only. If this screen
    // ever imports the vocabulary (or raw expo-haptics, separately banned by
    // motionFitRules.guard), a hold path could buzz — re-review the whole
    // apply flow before allowing it.
    expect(SCREEN).not.toMatch(/lib\/haptics/);
    expect(SCREEN).not.toMatch(/haptics\.\w+\(/);
  });

  test('every hold branch sets the NU-3 notice and never the success marker', () => {
    // Each compute-null branch must speak (setApplyNotice) and must not
    // mark a success beat. Anchored per handler on its notice key.
    for (const key of ['calories', 'dietBreak', 'macroCycle', 'refeed']) {
      const at = SCREEN.indexOf(`${key}: check.kind === 'floor_hold'`) !== -1
        ? SCREEN.indexOf(`${key}: check.kind === 'floor_hold'`)
        : SCREEN.indexOf(`${key}:`, SCREEN.indexOf('setApplyNotice'));
      expect(at).toBeGreaterThan(-1);
    }
    // Structural pin: within each `if (!computed/!split/!target)` block the
    // notice is set and the block returns before any settling marker.
    const holdBlocks = SCREEN.match(/if \(!(computed|split|target)\) \{[\s\S]*?\n {6}\}/g) || [];
    expect(holdBlocks.length).toBeGreaterThanOrEqual(4);
    for (const block of holdBlocks) {
      expect(block).toMatch(/setApplyNotice/);
      expect(block).toMatch(/return;/);
      expect(block).not.toMatch(/setApplySettling/);
    }
  });

  test('the calorie hold names the floor via floorHoldLine (NU-3 wording, pinned in coachApplyView.test)', () => {
    expect(SCREEN).toMatch(/floorHoldLine\(check\.floorKcal, energyUnit\)/);
  });
});

describe('M4 data-first order (fit rule 5)', () => {
  test('every success marker lands after its setOutput(updated)', () => {
    // One marker per apply key, each within 220 chars AFTER a
    // setOutput(updated) call — the write commits, then the beat plays.
    for (const key of APPLY_KEYS) {
      const marker = `setApplySettling(s => ({ ...s, ${key}: true }))`;
      const at = SCREEN.indexOf(marker);
      expect(`${key}:${at > -1}`).toBe(`${key}:true`);
      const before = SCREEN.slice(Math.max(0, at - 220), at);
      expect(before).toMatch(/setOutput\(updated\);/);
    }
  });

  test('the double-apply guards read persisted state, not animation state', () => {
    // isApplied(output, key) stays the gate in every handler; the morph
    // never becomes the thing standing between a double tap and a write.
    const gates = SCREEN.match(/if \(isApplied\(output, '/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(7);
  });
});

describe('M4 morph wiring', () => {
  test('no TouchableOpacity apply pill survives; apply CTAs ride the Button primitive', () => {
    expect(SCREEN).not.toMatch(/applyBtnQuiet|applyBtnBusy|applyBtnText/);
    // Every apply Button carries the morph state.
    const stateProps = SCREEN.match(/state=\{applyState/g) || [];
    const stateForProps = SCREEN.match(/applyState=\{applyStateFor\(/g) || [];
    expect(stateProps.length + stateForProps.length).toBeGreaterThanOrEqual(4);
  });

  test('A1 one-amber rule survives as the variant mapping', () => {
    expect(SCREEN).toMatch(/variant=\{emphasis \? 'primary' : 'outline'\}/);
    expect(SCREEN).toMatch(/variant=\{hero \? 'primary' : 'outline'\}/);
  });

  test('the row keeps the button mounted through the success beat', () => {
    expect(SCREEN).toMatch(/const settling = applyState === 'success';/);
    expect(SCREEN).toMatch(/\(!!onApply && !applied && !holdNote\) \|\| settling/);
    // And the Applied chip waits for the beat to finish.
    expect(SCREEN).toMatch(/applied && !settling && \(/);
  });

  test('the settle wrappers self-gate on reduce motion (fit rule 0)', () => {
    for (const decl of ['function ApplyExit', 'function HoldEnter']) {
      const at = SCREEN.indexOf(decl);
      expect(at).toBeGreaterThan(-1);
      const body = SCREEN.slice(at, at + 700);
      expect(body).toMatch(/accessibility\?\.reduceMotion/);
    }
    // Durations come from the motion tokens, not numeric literals.
    expect(SCREEN).toMatch(/FadeOut\.duration\(motion\.exit\)/);
    expect(SCREEN).toMatch(/FadeIn\.duration\(motion\.enter\)/);
    expect(SCREEN).not.toMatch(/\.duration\(\d/);
  });

  test('a pre-tap hold renders static: only tap-time holds animate in', () => {
    // HoldEnter without `live` is a plain View; the calorie row derives
    // live-ness from the tap-time notice, never the pre-tap classification.
    expect(SCREEN).toMatch(/holdArrived=\{!!calorieNotice\}/);
    expect(SCREEN).toMatch(/holdArrived=\{!!applyNotice\.macroCycle\}/);
    expect(SCREEN).toMatch(/if \(reduceMotion \|\| !live\) return <View>\{children\}<\/View>;/);
  });
});

/**
 * CC33 W3 (D112 R5, closes audit findings T2-20/T1-24).
 *
 * T2-20 (S2-T2-LIVE-TRACE.md): "carvedForOneSide (ActiveWorkoutScreen.js:
 * 768-776) suppresses the per-side logging prompt (:1450) and says
 * nothing. section 16 says explanations name the side. The one-limb user
 * is never told why."
 * T1-24 (S2-T1-GENERATION-TRACE.md): "Side-carving never named outside the
 * logger (isSideCarvedAvailable sole caller ActiveWorkoutScreen.js:772);
 * one-arm users seeded bilateral-capable movements with no note; section 16
 * explanations absent at A/C."
 *
 * This suite pins:
 *  1. The note renders exactly when the EXISTING carvedForOneSide
 *     derivation is true - no new state, no re-derivation of the carve
 *     itself (only ActiveWorkoutScreen may call isSideCarvedAvailable per
 *     T1-24's own citation: "sole caller").
 *  2. The generic line ships (never a side-specific "left/right" line),
 *     because isSideCarvedAvailable, read to the end, returns a plain
 *     boolean from a `.some()` - the matching restriction row's laterality
 *     is never threaded back to the caller. This suite pins BOTH halves of
 *     that evidence: the mechanism's real shape in resolve.js, and the
 *     screen's honest choice not to invent a side it cannot honestly know.
 *  3. Always visible (plain quiet Text), not folded into the StatusStrip's
 *     tap-to-expand chip mechanism - there is no action to take on this
 *     note, so it must not require a tap to discover.
 *  4. Positioned near the same strip area the constraint notices use.
 *
 * ActiveWorkoutScreen.js is a huge screen with a live dependency surface;
 * matching this file's own existing convention
 * (ActiveWorkoutScreen.nextExerciseButton.guard.test.js), these are byte-
 * level checks against the real source, cross-checked against the real
 * resolve.js mechanism (not mocked/assumed).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
const RESOLVE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'capability', 'resolve.js'),
  'utf8',
);

describe('isSideCarvedAvailable, read to the end, exposes ONLY a boolean (the evidence for shipping the generic line)', () => {
  const start = RESOLVE.indexOf('export function isSideCarvedAvailable(state, exercise) {');
  const end = RESOLVE.indexOf('\n}\n', start) + 2;
  const FN = RESOLVE.slice(start, end);

  test('the function was actually located', () => {
    expect(start).toBeGreaterThan(-1);
    expect(FN.length).toBeGreaterThan(0);
  });

  test('returns the result of .some(...) - a boolean, never the matched row', () => {
    expect(FN).toMatch(/return \(state\.restrictions \?\? \[\]\)\.some\(\(r\) => \(/);
    // No branch anywhere returns `r` or `r.laterality` - only true/false.
    expect(FN).not.toMatch(/return r(\.|\s|;)/);
    expect(FN).not.toContain('.laterality;');
  });

  test('the matching rule\'s laterality is read only inside the predicate, never surfaced to the caller', () => {
    expect(FN).toContain('r.laterality');
    // It gates the match (truthy check), it is not part of what comes back.
    expect(FN).toMatch(/&& r\.laterality\s*\n\s*&& SIDE_CARVEABLE\.has/);
  });
});

describe('carvedForOneSide stays the ONLY consumer of isSideCarvedAvailable (T1-24: "sole caller")', () => {
  test('exactly one call site in this screen, feeding carvedForOneSide', () => {
    const calls = SRC.match(/isSideCarvedAvailable\(/g) ?? [];
    expect(calls.length).toBe(1);
    expect(SRC).toContain('return isSideCarvedAvailable(intentState.capability, exercise);');
  });

  test('no other file gains a new caller (this screen\'s own lane cannot re-derive the side independently)', () => {
    const otherCallers = fs.readFileSync(path.join(__dirname, '..', 'RoutineDetailScreen.js'), 'utf8');
    expect(otherCallers).not.toContain('isSideCarvedAvailable');
  });
});

describe('the rendered note: generic line, always visible, positioned near the constraint-notice strip (T2-20/T1-24)', () => {
  const stripEnd = SRC.indexOf('return <StatusStrip items={items} />;\n          })()}');
  const noteIdx = SRC.indexOf('{carvedForOneSide ? (', stripEnd);
  const noteEnd = SRC.indexOf(') : null}', noteIdx) + ') : null}'.length;
  const noteBlock = (noteIdx >= 0 && noteEnd > noteIdx) ? SRC.slice(noteIdx, noteEnd) : '';

  test('the note sits after the StatusStrip render, before the continuous set sequence', () => {
    expect(stripEnd).toBeGreaterThan(-1);
    expect(noteIdx).toBeGreaterThan(stripEnd);
    const setSequenceIdx = SRC.indexOf('ONE continuous set sequence (phase 2B)', noteEnd);
    expect(setSequenceIdx).toBeGreaterThan(noteEnd);
  });

  test('gated on the existing carvedForOneSide derivation, no new state introduced for the gate itself', () => {
    expect(noteBlock).toContain('{carvedForOneSide ? (');
    expect(noteBlock).not.toMatch(/useState|useEffect/);
  });

  test('exact generic copy - never a left/right-specific line', () => {
    expect(noteBlock).toContain('Volyume counts this one side at a time, matching how you train.');
    // Never "your left/right side", and never a template interpolation
    // (${...}) naming a side inside the copy string itself.
    expect(noteBlock.toLowerCase()).not.toMatch(/\byour left side\b|\byour right side\b/);
    expect(noteBlock).not.toMatch(/\$\{[^}]*side[^}]*\}/i);
  });

  test('plain <Text>, not routed through the StatusStrip items array (always visible, no tap required)', () => {
    expect(noteBlock).toContain('<Text style={[styles.sideCarveNote, live.sideCarveNote]}>');
    expect(noteBlock).not.toContain('items.push');
  });
});

describe('style: quiet caption + textMuted (swapNote\'s register), never a banner', () => {
  test('sideCarveNote carries no background/border - it is text, not a chip or a banner', () => {
    expect(SRC).toContain(
      "sideCarveNote: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxs },",
    );
    expect(SRC).toContain('sideCarveNote: { ...t.type.caption, color: t.colors.textMuted },');
    const styleLine = SRC.split('\n').find((l) => l.trim().startsWith('sideCarveNote: { ...type.caption'));
    expect(styleLine).not.toMatch(/backgroundColor|borderColor|borderWidth/);
  });
});

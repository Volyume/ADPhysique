/**
 * campaign16.plainEnglish.test.js — the founder's copy law, enforced.
 *
 * FOUNDER LAW (2026-08-13): "Volyume's intelligence must be expressed in
 * plain, everyday language. The engine may remain technical internally, but
 * the user experience must not be."
 *
 * Banned from DEFAULT UI copy: MEV, MRV, volume landmarks, mesocycle,
 * programme epoch, movement family, structural coverage, capacity envelope,
 * autoregulation, SFR, systemic fatigue, hypertrophy volume, full target
 * fit, time-constrained prescription.
 *
 * "Translate the concept, do not simply rename it." The everyday-gym-user
 * test: someone who trains, understands sets and reps and has never read a
 * training paper should understand every line without a glossary.
 *
 * SCOPE (the founder's own): the Campaign-16 surfaces - the ones this
 * campaign created or touched. It is deliberately NOT a repo-wide sweep;
 * pretending to police copy this campaign never wrote would be a guard
 * nobody could keep true.
 *
 * WHY A LEAKAGE TEST AT ALL: the vocabulary is real and correct inside the
 * engine, so it is one careless template literal away from a screen. This
 * suite calls every copy producer on those surfaces with every code they
 * accept and reads what comes out.
 */

const {
  explainSelection, explainReason, receiptHeadline, buildChangeReceipt,
} = require('../planRationale');
const {
  verdictCopy, recoveryHeadsUp, blockReadyNotificationBody,
  PROGRAMME_VERDICT, SLOT_REASON,
} = require('../blockReview');
const {
  PLAN_FIT, fitCopy, alternativeCopy, keepChoiceCopy, durationLabel,
} = require('../planFit');
const { SELECTION_REASON } = require('../planEngine');
const { SLOT_OUTCOME } = require('../exercise/continuity');

/** The banned vocabulary, as written in the order. */
const BANNED = [
  'MEV', 'MRV', 'volume landmark', 'mesocycle', 'programme epoch',
  'movement family', 'structural coverage', 'capacity envelope',
  'autoregulation', 'autoregulated', 'SFR', 'stimulus-to-fatigue',
  'systemic fatigue', 'hypertrophy volume', 'full target fit',
  'time-constrained prescription', 'prescription', 'landmark',
];

/**
 * Everything a user could read from the Campaign-16 copy producers, with
 * every code each one accepts. Codes are enumerated from the real
 * vocabularies, so a new reason cannot be added without its copy being
 * swept too.
 */
function everyUserFacingString() {
  const out = [];
  const push = (...xs) => { for (const x of xs) if (typeof x === 'string' && x) out.push(x); };

  // Why an exercise is in the plan.
  for (const code of Object.values(SELECTION_REASON)) push(explainSelection(code));
  // Why a slot stayed or changed.
  for (const code of Object.values(SLOT_REASON)) push(explainReason(code));

  // The change receipt.
  push(receiptHeadline(0, 0), receiptHeadline(3, 0), receiptHeadline(0, 1), receiptHeadline(6, 2));
  const receipt = buildChangeReceipt([
    { outcome: SLOT_OUTCOME.RETAINED, exerciseName: 'Barbell Bench Press', reason: SLOT_REASON.STILL_PRODUCTIVE },
    { outcome: SLOT_OUTCOME.REPLACED, exerciseName: 'Pec Deck', previousExerciseName: 'Cable Fly', reason: SLOT_REASON.PLATEAU },
  ]);
  push(receipt.headline, ...[...receipt.stays, ...receipt.changes, ...receipt.added].map(l => l.why));

  // The block review.
  for (const v of Object.values(PROGRAMME_VERDICT)) {
    for (const changedCount of [0, 1, 4]) {
      const c = verdictCopy(v, { changedCount });
      push(c.title, c.body);
    }
  }
  push(recoveryHeadsUp({ epochBlocks: 0 }).body, recoveryHeadsUp({ epochBlocks: 9 }).body);
  push(blockReadyNotificationBody(null), blockReadyNotificationBody({ changedCount: 1 }),
    blockReadyNotificationBody({ changedCount: 3 }));

  // Schedule fit.
  for (const state of Object.values(PLAN_FIT)) {
    for (const alternatives of [[], [{ kind: 'longer_sessions', daysPerWeek: 4, sessionLengthMinutes: 75 }]]) {
      const c = fitCopy(state, {
        daysPerWeek: 4, sessionLengthMinutes: 60, typicalSessionMinutes: 64, alternatives,
      });
      push(c.title, c.body);
    }
    const k = keepChoiceCopy({
      daysPerWeek: 4, sessionLengthMinutes: 60, state, longestSessionMinutes: 73,
    });
    push(k.label, k.detail, durationLabel(state));
  }
  for (const kind of ['longer_sessions', 'more_sessions']) {
    const a = alternativeCopy({ kind, daysPerWeek: 5, sessionLengthMinutes: 75 });
    push(a.label, a.detail);
  }
  return out;
}

describe('C16 PLAIN ENGLISH: the engine is technical, the app is not', () => {
  test('the sweep actually reaches the copy (guard against an empty sweep)', () => {
    // A leakage test that silently stopped collecting strings would pass
    // forever. This is the canary.
    const all = everyUserFacingString();
    expect(all.length).toBeGreaterThan(50);
    expect(all).toContain('Covers a movement your week needs.');
    expect(all).toContain('Great fit');
  });

  test('no banned term reaches any default-UI string', () => {
    for (const s of everyUserFacingString()) {
      for (const term of BANNED) {
        if (s.toLowerCase().includes(term.toLowerCase())) {
          throw new Error(`Banned term "${term}" in user copy: "${s}"`);
        }
      }
    }
  });

  test('no internal code name is rendered as if it were English', () => {
    // The reason codes and verdicts are SCREAMING_SNAKE internally. Leaking
    // one is the classic failure: it reads as a bug to the user even when
    // the logic behind it is right.
    for (const s of everyUserFacingString()) {
      expect(s).not.toMatch(/[A-Z]{3,}_[A-Z_]{3,}/);
      expect(s).not.toMatch(/\b[a-z]+_[a-z_]+\b/);
    }
  });

  test('no em dash anywhere in user-facing copy (lint rule, restated here)', () => {
    for (const s of everyUserFacingString()) expect(s).not.toMatch(/—/);
  });

  test('British English, and no shame or command voice', () => {
    for (const s of everyUserFacingString()) {
      expect(s).not.toMatch(/\bcolor\b|\bbehavior\b|\boptimize/i);
      // COACHING_VOICE_SYNTHESIS_LOCKED: no guilt, no clipped orders.
      expect(s).not.toMatch(/\byou failed\b|\byou must\b|\bshould have\b|\bexcuse/i);
    }
  });

  test('depth is available, but never the default line', () => {
    // "Deeper reasoning may exist behind an optional 'Why?' expansion."
    // The copy producers hand back one plain sentence each; none of them
    // opens with a technical caveat the user has to read past.
    for (const s of everyUserFacingString()) {
      expect(s.split(/(?<=\.)\s/)[0].length).toBeLessThan(220);
    }
  });
});

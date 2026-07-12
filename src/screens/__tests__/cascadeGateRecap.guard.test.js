/**
 * CascadeGate trial-end recap guard (C5 / D72,
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md;
 * built from docs/marketing-2026-07-11/C5-day14-recap-decision-memo.md).
 *
 * WHAT THIS PINS AND WHY:
 *  1. buildTrialRecapLine is a pure factual line: correct plurals/singulars,
 *     the personal-bests segment is omitted at zero, and it returns null below
 *     the founder-set floor (RECAP_MIN_SESSIONS = 3) so the gate never shows a
 *     thin "1 workout" recap.
 *  2. ED guardrails hold BY CONSTRUCTION (CLAUDE.md Section 2). The recap is
 *     training-mechanics only: no body-change/outcome language anywhere in the
 *     copy (no weight/fat/size/"progress"/"result"/"transformation"), nothing
 *     weight- or food-adjacent is read or shown, so the block is identical for
 *     every user and needs no flag read. Source pins lock the floor, the
 *     [proTrialEndsAt - TRIAL_MS, proTrialEndsAt) window, the trial-end-only
 *     render, the best-effort load (any failure renders nothing), the banned
 *     language ban, and that only training identifiers are used.
 *
 * These are the contract. They are written to FAIL if a future edit lowers the
 * floor, adds outcome language, or reads weight/food on this surface.
 */
jest.mock('expo-sqlite');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-constants');
jest.mock('expo-application');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    })),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: () => {}, setContext: () => {}, setUser: () => {} })),
}));

// The native IAP bridge is never invoked here; stub it so importing the screen
// can't reach react-native-iap in the node test env.
jest.mock('../../lib/payments/playBilling', () => ({
  purchasePackage: jest.fn(async () => ({ transactionId: 'txn_test' })),
}));

import fs from 'fs';
import path from 'path';
import { buildTrialRecapLine } from '../CascadeGateScreen';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'CascadeGateScreen.js'), 'utf8');

describe('buildTrialRecapLine — pure factual line', () => {
  test('normal plurals', () => {
    expect(buildTrialRecapLine({ totalSessions: 12, totalSets: 96, uniqueExercises: 9, prCount: 4 }))
      .toBe('12 workouts · 96 sets · 9 exercises · 4 personal bests');
  });

  test('singulars', () => {
    expect(buildTrialRecapLine({ totalSessions: 1, totalSets: 1, uniqueExercises: 1, prCount: 1 }))
      // sessions < floor -> null even with singular data
      .toBe(null);
    // Exactly at the floor with single set/exercise/PR to exercise the singulars.
    expect(buildTrialRecapLine({ totalSessions: 3, totalSets: 1, uniqueExercises: 1, prCount: 1 }))
      .toBe('3 workouts · 1 set · 1 exercise · 1 personal best');
  });

  test('personal-bests segment omitted at zero or nullish', () => {
    expect(buildTrialRecapLine({ totalSessions: 5, totalSets: 40, uniqueExercises: 6, prCount: 0 }))
      .toBe('5 workouts · 40 sets · 6 exercises');
    expect(buildTrialRecapLine({ totalSessions: 5, totalSets: 40, uniqueExercises: 6, prCount: null }))
      .toBe('5 workouts · 40 sets · 6 exercises');
    expect(buildTrialRecapLine({ totalSessions: 5, totalSets: 40, uniqueExercises: 6 }))
      .toBe('5 workouts · 40 sets · 6 exercises');
  });

  test('returns null below the floor, renders at the floor', () => {
    expect(buildTrialRecapLine({ totalSessions: 2, totalSets: 20, uniqueExercises: 4, prCount: 2 }))
      .toBe(null);
    expect(buildTrialRecapLine({ totalSessions: 3, totalSets: 24, uniqueExercises: 5, prCount: 2 }))
      .toBe('3 workouts · 24 sets · 5 exercises · 2 personal bests');
  });

  test('no banned outcome/body-change language in any produced line', () => {
    const banned = /weight|kg|lbs|fat|lean|lost|gained|slimmer|body|transformation|progress|result/i;
    const lines = [
      buildTrialRecapLine({ totalSessions: 3, totalSets: 1, uniqueExercises: 1, prCount: 1 }),
      buildTrialRecapLine({ totalSessions: 12, totalSets: 96, uniqueExercises: 9, prCount: 4 }),
      buildTrialRecapLine({ totalSessions: 5, totalSets: 40, uniqueExercises: 6, prCount: 0 }),
    ].filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toMatch(banned);
  });
});

describe('CascadeGateScreen source pins (C5 / D72 + ED guardrails)', () => {
  test('RECAP_MIN_SESSIONS = 3 exists and gates the line', () => {
    expect(SRC).toMatch(/const\s+RECAP_MIN_SESSIONS\s*=\s*3\s*;/);
    expect(SRC).toMatch(/sessions\s*<\s*RECAP_MIN_SESSIONS/);
  });

  test('window derives from proTrialEndsAt and TRIAL_MS', () => {
    expect(SRC).toMatch(/const\s+TRIAL_MS\s*=\s*14\s*\*\s*86400000\s*;/);
    expect(SRC).toMatch(/proTrialEndsAt/);
    expect(SRC).toMatch(/startMs\s*=\s*endsAt\s*-\s*TRIAL_MS/);
  });

  test('block renders only for the trial-end surface', () => {
    // Effect only loads for the trial-end surface...
    expect(SRC).toMatch(/content\?\.surface\s*!==\s*'cascade_trial_end_gate'/);
    // ...and the render is likewise gated to that surface.
    expect(SRC).toMatch(/recapLine\s*&&\s*content\.surface\s*===\s*'cascade_trial_end_gate'/);
  });

  test('the recap load is best-effort (a failure renders nothing)', () => {
    expect(SRC).toMatch(/\}\)\(\)\.catch\(\(\)\s*=>\s*\{[^}]*\}\)/);
  });

  test('training-only identifiers: no weight/food reads or imports', () => {
    expect(SRC).not.toMatch(/getMorningWeights/);
    expect(SRC).not.toMatch(/food\/db/);
    expect(SRC).not.toMatch(/lib\/food/);
    // The facts come from the training recap + PR helpers only.
    expect(SRC).toMatch(/getRecapData/);
    expect(SRC).toMatch(/getWeeklyPRCount/);
  });

  test('no banned outcome language in the recap copy region, no em dash added', () => {
    // Isolate the added recap region: the pure helper plus the rendered block,
    // avoiding unrelated source (e.g. purchaseResult) that legitimately
    // contains substrings like "result".
    const helperStart = SRC.indexOf('export function buildTrialRecapLine');
    const helperEnd = SRC.indexOf('function _variantContent');
    const helperRegion = SRC.slice(helperStart, helperEnd);
    const renderStart = SRC.indexOf('During your trial');
    const renderRegion = SRC.slice(renderStart - 400, renderStart + 400);
    const region = helperRegion + '\n' + renderRegion;

    const banned = /weight|kg|lbs|fat|lean|lost|gained|slimmer|body|transformation|progress|result/i;
    expect(region).not.toMatch(banned);
    // No em dash anywhere in the added recap region (user copy + surrounding).
    expect(region).not.toMatch(/—/);
    // The caption title is present.
    expect(SRC).toContain('During your trial');
  });
});

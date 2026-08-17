/**
 * firstReviewLine — pins HOME-TODAY-UX-SPEC.md §9 / FOUNDER-RULINGS-PHASE2.md
 * ruling R2: Pro + pre-first-review ONLY, actionable only, REAL unclamped
 * evidence requirements (never Math.min-clamped), self-retiring, and silent
 * under an open ED flag (weight-adjacent suppression, fail closed).
 */
import { resolveFirstReviewLine } from '../firstReviewLine';
import { MIN_WEIGH_INS, FIRST_CHECKIN_MIN_DAYS } from '../../trialActivation';

const NOW = Date.UTC(2026, 7, 17);
const CHECKIN_DAY = 3; // arbitrary; firstReviewUnlockDate always finds a match within 14 days

describe('firstReviewLine: tier and first-review gating', () => {
  test('free tier never renders the line, however far from either gate', () => {
    expect(resolveFirstReviewLine({ tier: 'free', weighIns7d: 0 })).toBeNull();
  });

  test('self-retires for good once a completed first review exists', () => {
    expect(resolveFirstReviewLine({
      tier: 'pro', hasCompletedFirstReview: true, weighIns7d: 0, firstWeightAt: null,
    })).toBeNull();
  });

  test('no facts at all (brand-new Pro user): actionable weigh-in ask', () => {
    const item = resolveFirstReviewLine({ tier: 'pro', weighIns7d: 0, firstWeightAt: null });
    expect(item).not.toBeNull();
    expect(item.text).toBe(`First review: ${MIN_WEIGH_INS} more morning weigh-ins.`);
  });
});

describe('firstReviewLine: real UNCLAMPED evidence requirements', () => {
  test('the remaining count is a genuine countdown, never a clamped "of N" display', () => {
    const one = resolveFirstReviewLine({ tier: 'pro', weighIns7d: MIN_WEIGH_INS - 1, firstWeightAt: null });
    expect(one.text).toBe('First review: 1 more morning weigh-in.');
    const two = resolveFirstReviewLine({ tier: 'pro', weighIns7d: MIN_WEIGH_INS - 2, firstWeightAt: null });
    expect(two.text).toBe('First review: 2 more morning weigh-ins.');
    // The published defect this line must never reproduce: no "N of N"
    // fraction display of any kind, clamped or otherwise.
    expect(one.text).not.toMatch(/of \d/);
    expect(two.text).not.toMatch(/of \d/);
  });

  test('once the weigh-in gate is met the line switches to the honest ready-date pattern, never a stale weigh-in ask', () => {
    const firstWeightAt = NOW - (FIRST_CHECKIN_MIN_DAYS - 1) * 86400000; // days gate NOT yet met
    const item = resolveFirstReviewLine({
      tier: 'pro',
      weighIns7d: MIN_WEIGH_INS + 4, // far over the gate -- must never render "of 3"-style plumbing
      firstWeightAt,
      checkinDay: CHECKIN_DAY,
      now: NOW,
    });
    expect(item).not.toBeNull();
    expect(item.text).toMatch(/^First review ready /);
    expect(item.text).not.toMatch(/of \d/);
  });
});

describe('firstReviewLine: actionable only (self-retires once nothing is missing)', () => {
  test('both gates satisfied: renders nothing (the Today-line check-in occupant owns that day)', () => {
    const firstWeightAt = NOW - (FIRST_CHECKIN_MIN_DAYS + 2) * 86400000;
    const item = resolveFirstReviewLine({
      tier: 'pro',
      weighIns7d: MIN_WEIGH_INS,
      firstWeightAt,
      checkinDay: CHECKIN_DAY,
      now: NOW,
    });
    expect(item).toBeNull();
  });
});

describe('firstReviewLine: ED-safety (weight-adjacent, fail closed)', () => {
  test('an open ED flag silences the line entirely, even with a real countdown available', () => {
    expect(resolveFirstReviewLine({
      tier: 'pro', weighIns7d: 0, firstWeightAt: null, edFlagOpen: true,
    })).toBeNull();
  });

  // Lead amendment (Campaign 22 Phase 2 Stage 2 review): the caller must
  // suppress in EVERY state where the You tab's identical ledger read goes
  // neutral, not just on the raw ED flag -- elevated SCOFF, calm mode and a
  // failed wellbeing read all count (YouScreen.js `edSuppressed`).
  // HomeScreen cannot be mounted in this Jest environment, so the parity is
  // pinned at source level, per this screen's established guard convention.
  test('source-level: HomeScreen feeds the line the full You-tab suppression formula, not the raw flag alone', () => {
    const fs = require('fs');
    const path = require('path');
    const home = fs.readFileSync(path.resolve(__dirname, '../../../screens/HomeScreen.js'), 'utf8');
    const loader = home.slice(
      home.indexOf('async function loadFirstReviewFacts()'),
      home.indexOf('async function loadFreeCoachLine()'),
    );
    expect(loader).toMatch(/const edSuppressed = !!edFlag/);
    expect(loader).toMatch(/scoffScore\) && userProfile\.scoffScore >= 2/);
    expect(loader).toMatch(/wellbeing === 'read_failed'/);
    expect(loader).toMatch(/isCalm\(wellbeing\)/);
    expect(loader).toMatch(/edFlagOpen: edSuppressed/);
  });
});

describe('firstReviewLine: single-sentence contract', () => {
  test('every rendered item carries exactly one text string and a matching a11y label', () => {
    const item = resolveFirstReviewLine({ tier: 'pro', weighIns7d: 0, firstWeightAt: null });
    expect(typeof item.text).toBe('string');
    expect(item.accessibilityLabel).toContain(item.text);
  });
});

/**
 * trainingRecency.js — Task 2 (recovery/freshness UI factual-language
 * amendment). Pins that this module states ONLY what a timestamp
 * establishes and never a biological verdict.
 */
import { trainingRecency } from '../trainingRecency';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);

describe('trainingRecency — factual bands', () => {
  test('trained within the last 24h', () => {
    expect(trainingRecency(NOW - 1000, NOW)).toEqual({ known: true, daysAgo: 0, label: 'Trained within 24h' });
    expect(trainingRecency(NOW - 23 * 60 * 60 * 1000, NOW).label).toBe('Trained within 24h');
  });

  test('trained exactly 1 day ago', () => {
    expect(trainingRecency(NOW - DAY, NOW)).toEqual({ known: true, daysAgo: 1, label: 'Trained 1 day ago' });
  });

  test('trained N days ago (plural wording, exact day count)', () => {
    expect(trainingRecency(NOW - 5 * DAY, NOW)).toEqual({ known: true, daysAgo: 5, label: 'Trained 5 days ago' });
    expect(trainingRecency(NOW - 30 * DAY, NOW).label).toBe('Trained 30 days ago');
  });

  test('trained "now" exactly (0ms elapsed) counts as within 24h, not a negative day', () => {
    expect(trainingRecency(NOW, NOW)).toEqual({ known: true, daysAgo: 0, label: 'Trained within 24h' });
  });
});

describe('trainingRecency — missing/malformed/future evidence stays unknown', () => {
  test('no evidence at all (null/undefined)', () => {
    expect(trainingRecency(null, NOW)).toEqual({ known: false, daysAgo: null, label: 'Not logged' });
    expect(trainingRecency(undefined, NOW)).toEqual({ known: false, daysAgo: null, label: 'Not logged' });
  });

  test('non-finite / non-numeric input', () => {
    expect(trainingRecency(NaN, NOW).known).toBe(false);
    expect(trainingRecency('not a date', NOW).known).toBe(false);
    expect(trainingRecency(Infinity, NOW).known).toBe(false);
    expect(trainingRecency({}, NOW).known).toBe(false);
  });

  test('zero or negative epoch (malformed row) reads as unknown, not "trained in 1970"', () => {
    expect(trainingRecency(0, NOW).known).toBe(false);
    expect(trainingRecency(-1, NOW).known).toBe(false);
  });

  test('a FUTURE timestamp (clock skew / bad data) reads as unknown, never a negative-day claim', () => {
    const future = trainingRecency(NOW + DAY, NOW);
    expect(future.known).toBe(false);
    expect(future.daysAgo).toBeNull();
    expect(future.label).toBe('Not logged');
  });

  test('missing evidence NEVER reads as a positive state (the ReadinessCards defect this replaces)', () => {
    // The bug this amendment fixes: `!lastTrainedAt` used to mean "Ready".
    // It must now mean exactly the same thing as any other absence of proof.
    const noEvidence = trainingRecency(null, NOW);
    const malformed = trainingRecency(NaN, NOW);
    const future = trainingRecency(NOW + DAY, NOW);
    expect(noEvidence).toEqual(malformed);
    expect(noEvidence).toEqual(future);
  });
});

describe('trainingRecency — output never contains a biological verdict', () => {
  const FORBIDDEN = /ready|fresh|recover|fatigued|nearly/i;

  test('across a wide sweep of elapsed times and bad inputs, the label is always purely factual', () => {
    const samples = [
      null, undefined, NaN, 0, -5, NOW + DAY, NOW, NOW - 1, NOW - DAY,
      NOW - 2 * DAY, NOW - 6 * DAY, NOW - 45 * DAY, NOW - 400 * DAY,
    ];
    for (const s of samples) {
      const { label } = trainingRecency(s, NOW);
      expect(label).not.toMatch(FORBIDDEN);
    }
  });
});

describe('trainingRecency — determinism', () => {
  test('pure: same inputs give the same output, no clock/randomness reads', () => {
    expect(trainingRecency(NOW - 3 * DAY, NOW)).toEqual(trainingRecency(NOW - 3 * DAY, NOW));
  });

  test('defaults nowMs only when omitted (still callable with an explicit now)', () => {
    expect(() => trainingRecency(NOW - DAY, NOW)).not.toThrow();
  });
});

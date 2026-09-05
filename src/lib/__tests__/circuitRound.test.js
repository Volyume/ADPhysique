/**
 * Contract for the circuit round derivations (src/lib/circuitRound.js).
 *
 * Authority: `docs/final-certification-2026-09-05/07-FINDINGS.md` F-13 (e)
 * and F-17 (h); evidence A8 ("Round n of m desynchronises silently across
 * stations") and A10 ("the plan preview never mentions circuits or rounds")
 * in `04-TRAINING-STYLES.md`.
 *
 * What this pins, and why:
 *  - the round shown at a station is the CIRCUIT's round, so two stations of
 *    the same circuit can never show different rounds at the same moment
 *    (the A8 defect);
 *  - one round of lag is the ordinary mid-round state and must NOT be
 *    reported as a miss, because every station after the current one in the
 *    rotation is exactly one round behind while a round is under way. Only a
 *    station further behind than that has actually skipped a round;
 *  - the round is never numbered past the target;
 *  - the plan-preview summary counts stations, reads rounds from the group's
 *    first station (EL-9 keeps them equal) and leaves out what it does not
 *    know rather than guessing.
 */
import {
  circuitRoundState,
  summariseCircuitGroups,
  formatCircuitPreviewLine,
  formatRoundRestWords,
  CIRCUIT_MISSED_ROUND_LINE,
} from '../circuitRound';

describe('circuitRoundState — the round belongs to the circuit, not the station', () => {
  test('nothing logged anywhere: every station is on round 1', () => {
    expect(circuitRoundState({ stationLogged: 0, groupLogged: [0, 0, 0], targetRounds: 3 }))
      .toEqual({ roundsStarted: 0, round: 1, targetRounds: 3, missedRound: false });
  });

  test('A logged 3, B logged 2: at B the round is the circuit\'s round 3, not B\'s own round 3', () => {
    const at = circuitRoundState({ stationLogged: 2, groupLogged: [3, 2], targetRounds: 3 });
    expect(at.round).toBe(3);
    expect(at.roundsStarted).toBe(3);
  });

  test('one round of lag mid-round is NOT a missed round (A is ahead because the rotation put it first)', () => {
    expect(circuitRoundState({ stationLogged: 2, groupLogged: [3, 2], targetRounds: 3 }).missedRound)
      .toBe(false);
  });

  test('a station two rounds behind HAS missed one, and still reads the circuit\'s round', () => {
    const at = circuitRoundState({ stationLogged: 1, groupLogged: [3, 1], targetRounds: 3 });
    expect(at.missedRound).toBe(true);
    expect(at.round).toBe(3);
  });

  test('all stations equal: the athlete is starting the next round', () => {
    expect(circuitRoundState({ stationLogged: 2, groupLogged: [2, 2, 2], targetRounds: 4 }).round)
      .toBe(3);
  });

  test('all rounds complete: the round holds at the target, never m + 1', () => {
    expect(circuitRoundState({ stationLogged: 3, groupLogged: [3, 3, 3], targetRounds: 3 }).round)
      .toBe(3);
  });

  test('no target (a freeform group): the round still counts up from 1', () => {
    expect(circuitRoundState({ stationLogged: 2, groupLogged: [2, 2] }))
      .toEqual({ roundsStarted: 2, round: 3, targetRounds: null, missedRound: false });
  });

  test('rubbish in (undefined, negatives, no arguments) never produces NaN or round 0', () => {
    expect(circuitRoundState().round).toBe(1);
    expect(circuitRoundState({ stationLogged: -2, groupLogged: [null, undefined, -1], targetRounds: -3 }))
      .toEqual({ roundsStarted: 0, round: 1, targetRounds: null, missedRound: false });
  });

  test('the missed-round line is one short, calm sentence', () => {
    expect(CIRCUIT_MISSED_ROUND_LINE).toBe('This station missed a round.');
  });
});

describe('formatRoundRestWords — plain words for sentence copy', () => {
  test('under a minute reads in seconds', () => {
    expect(formatRoundRestWords(45)).toBe('45 seconds');
    expect(formatRoundRestWords(1)).toBe('1 second');
  });
  test('whole minutes read in minutes', () => {
    expect(formatRoundRestWords(120)).toBe('2 minutes');
    expect(formatRoundRestWords(60)).toBe('1 minute');
  });
  test('a mixed value reads as both', () => {
    expect(formatRoundRestWords(90)).toBe('1 minute 30 seconds');
  });
  test('nothing known reads as nothing at all', () => {
    expect(formatRoundRestWords(0)).toBe('');
    expect(formatRoundRestWords(undefined)).toBe('');
  });
});

describe('summariseCircuitGroups / formatCircuitPreviewLine — the plan preview (F-17 h)', () => {
  const rows = [
    { supersetGroupId: null, groupKind: null, recommendedSets: 3 },
    { supersetGroupId: 'g1', groupKind: 'circuit', recommendedSets: 3, roundRestSeconds: 90 },
    { supersetGroupId: 'g1', groupKind: 'circuit', recommendedSets: 3, roundRestSeconds: 90 },
    { supersetGroupId: 'g1', groupKind: 'circuit', recommendedSets: 3, roundRestSeconds: 90 },
  ];

  test('a circuit group is counted by stations, in first-appearance order', () => {
    expect(summariseCircuitGroups(rows)).toEqual([
      { groupId: 'g1', stations: 3, rounds: 3, roundRestSeconds: 90 },
    ]);
  });

  test('an ordinary superset group is not a circuit and is never summarised', () => {
    expect(summariseCircuitGroups([
      { supersetGroupId: 'g2', groupKind: null, recommendedSets: 3 },
      { supersetGroupId: 'g2', groupKind: null, recommendedSets: 3 },
    ])).toEqual([]);
  });

  test('the preview line reads "Circuit · N stations · N rounds · Ns between rounds"', () => {
    expect(formatCircuitPreviewLine(summariseCircuitGroups(rows)[0]))
      .toBe('Circuit · 3 stations · 3 rounds · 90s between rounds');
  });

  test('a single station and a single round read in the singular', () => {
    expect(formatCircuitPreviewLine({ stations: 1, rounds: 1, roundRestSeconds: 60 }))
      .toBe('Circuit · 1 station · 1 round · 60s between rounds');
  });

  test('unknown rounds or round rest are LEFT OUT, never guessed at', () => {
    expect(formatCircuitPreviewLine({ stations: 2, rounds: null, roundRestSeconds: null }))
      .toBe('Circuit · 2 stations');
  });

  test('no rows, or rows with no group id, summarise to nothing', () => {
    expect(summariseCircuitGroups(undefined)).toEqual([]);
    expect(summariseCircuitGroups([{ groupKind: 'circuit', recommendedSets: 3 }])).toEqual([]);
    expect(formatCircuitPreviewLine(null)).toBe('');
  });
});

/**
 * weekSignalScoff.guard.test.js — source-level guard (founder 2026-07-03,
 * ED-adjacent, explicit GO). The outbound week-signal writer already treats
 * SCOFF >= 2 as a freeze lever (weekSignalWriter.computeCurrentWeekState), but
 * a lever is inert unless the CALL SITES feed it the sender's SCOFF score.
 *
 * This pins that BOTH writeOwnWeekSignals call sites pass a scoffScore argument,
 * so a sender with SCOFF >= 2 and no open ED flag freezes outbound exactly like
 * the open-flag path (state 'resting', completed_block/hit_pb forced false). A
 * later edit that drops the argument at either site — silently resuming live
 * ticks under a high SCOFF hold — fails loudly and must be a reviewed change.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Allows one level of nested parens (e.g. useAppStore.getState()) before the
// scoffScore reference inside the call's argument list.
const CALL_WITH_SCOFF = /writeOwnWeekSignals\((?:[^()]|\([^()]*\))*scoffScore/;

const CALL_SITES = [
  path.join('src', 'hooks', 'usePartners.js'),
  path.join('src', 'screens', 'ActiveWorkoutScreen.js'),
];

describe('outbound SCOFF freeze is wired at every week-signal call site', () => {
  for (const rel of CALL_SITES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');

    test(`${rel} calls writeOwnWeekSignals`, () => {
      expect(src).toMatch(/writeOwnWeekSignals\(/);
    });

    test(`${rel} passes the sender's scoffScore to writeOwnWeekSignals`, () => {
      expect(src).toMatch(CALL_WITH_SCOFF);
    });
  }
});

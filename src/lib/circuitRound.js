/**
 * Circuit round derivations — pure, no I/O.
 *
 * Authority: `docs/final-certification-2026-09-05/07-FINDINGS.md` F-13 (e)
 * and F-17 (h), evidence A8/A10 in `04-TRAINING-STYLES.md`.
 *
 * A circuit rotates A -> B -> C -> A. Each station logs ONE working set per
 * round, so a station's own logged-set count is its own round count — but
 * the ROUND the athlete is in belongs to the circuit, not to one station.
 * Reading each station's own count (the defect A8 records) let station A
 * show "Round 3 of 3" while station B showed "Round 2 of 3" at the same
 * moment, with nothing to say why.
 *
 * These helpers are the single source of that arithmetic so the chip, the
 * orientation row, the logged rows and the lock-screen text can never
 * disagree. No I/O, no store, no dates: inputs in, values out.
 */

/**
 * Where the CIRCUIT is, seen from one station.
 *
 * @param {object} args
 * @param {number} args.stationLogged  working sets logged at THIS station.
 * @param {number[]} args.groupLogged  working sets logged at every station
 *   of the circuit, this one included, in session order.
 * @param {number} [args.targetRounds] the circuit's round target (the
 *   stored `recommended_sets`). Falsy means unknown.
 * @returns {{roundsStarted: number, round: number, targetRounds: number|null,
 *   missedRound: boolean}}
 *   `roundsStarted` — the furthest round any station has completed, i.e. how
 *     many rounds the circuit has under way.
 *   `round` — the round to SHOW at this station: the round in progress when
 *     this station still owes it, otherwise the next one (never past the
 *     target).
 *   `missedRound` — this station is more than one round behind the circuit,
 *     which only happens when a round was skipped here.
 */
export function circuitRoundState({ stationLogged = 0, groupLogged = [], targetRounds = null } = {}) {
  const counts = (Array.isArray(groupLogged) ? groupLogged : [])
    .map(n => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0));
  const own = Number.isFinite(stationLogged) && stationLogged > 0 ? Math.floor(stationLogged) : 0;
  const roundsStarted = counts.length ? Math.max(...counts, own) : own;
  const target = Number.isFinite(targetRounds) && targetRounds > 0 ? Math.floor(targetRounds) : null;
  // Still owes the round the circuit is on -> show that round; otherwise the
  // athlete is starting the next one. Never numbered past the target.
  const raw = own < roundsStarted ? roundsStarted : roundsStarted + 1;
  const round = target ? Math.min(Math.max(raw, 1), target) : Math.max(raw, 1);
  // One round of lag is the ORDINARY mid-round state (the stations ahead of
  // this one in the rotation have already logged the round in progress), so
  // only a station further behind than that has actually missed one.
  const missedRound = own < roundsStarted - 1;
  return { roundsStarted, round, targetRounds: target, missedRound };
}

/** The one line shown under the chip when a station has skipped a round. */
export const CIRCUIT_MISSED_ROUND_LINE = 'This station missed a round.';

/**
 * Round rest in plain words, for sentence copy ("rest 90 seconds between
 * rounds"). The "90s" shorthand stays where it is already house style (the
 * builder header, the routine row, the plan preview).
 *
 * @param {number} seconds
 * @returns {string} e.g. "90 seconds", "2 minutes", "1 minute 30 seconds".
 */
export function formatRoundRestWords(seconds) {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  if (!s) return '';
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const mins = `${m} minute${m === 1 ? '' : 's'}`;
  return rem === 0 ? mins : `${mins} ${rem} second${rem === 1 ? '' : 's'}`;
}

/**
 * Every circuit group in a routine, in the order its first station appears.
 *
 * Rounds are read from the group's FIRST station: EL-9 keeps rounds equal
 * within a circuit (the builder and the routine edit sheet both write the
 * whole group), and the first station is the one the builder itself shows
 * the group header on.
 *
 * @param {Array<{supersetGroupId?: string|null, groupKind?: string|null,
 *   recommendedSets?: number|null, roundRestSeconds?: number|null}>} rows
 *   routine-exercise rows in routine order.
 * @returns {Array<{groupId: string, stations: number, rounds: number|null,
 *   roundRestSeconds: number|null}>}
 */
export function summariseCircuitGroups(rows) {
  const order = [];
  const byGroup = new Map();
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const gid = row?.supersetGroupId ?? null;
    if (!gid || row?.groupKind !== 'circuit') continue;
    if (!byGroup.has(gid)) {
      order.push(gid);
      byGroup.set(gid, {
        groupId: gid,
        stations: 0,
        rounds: Number.isFinite(row?.recommendedSets) && row.recommendedSets > 0
          ? Math.floor(row.recommendedSets) : null,
        roundRestSeconds: Number.isFinite(row?.roundRestSeconds) && row.roundRestSeconds > 0
          ? Math.floor(row.roundRestSeconds) : null,
      });
    }
    byGroup.get(gid).stations += 1;
  }
  return order.map(gid => byGroup.get(gid));
}

/**
 * The plan-preview line for one circuit group:
 * "Circuit · 3 stations · 3 rounds · 90s between rounds".
 * Unknown rounds or round rest are left out rather than guessed.
 */
export function formatCircuitPreviewLine(summary) {
  if (!summary || !summary.stations) return '';
  const parts = ['Circuit', `${summary.stations} station${summary.stations === 1 ? '' : 's'}`];
  if (summary.rounds) parts.push(`${summary.rounds} round${summary.rounds === 1 ? '' : 's'}`);
  if (summary.roundRestSeconds) parts.push(`${summary.roundRestSeconds}s between rounds`);
  return parts.join(' · ');
}

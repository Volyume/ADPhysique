import type { CardioRow } from '../db/database';
import { parseNapDetail } from '../metrics/naps';
import { formatDistance } from '../sensors/location';
import { formatDuration } from '../util/time';

export function activitySummary(c: CardioRow): string {
  if (c.source === 'nap') {
    const nap = parseNapDetail(c.notes);
    if (nap) {
      return [
        `${formatDuration(nap.asleepMin)} asleep`,
        `${nap.efficiency}% efficiency`,
        nap.autoDetected ? 'auto' : 'timer',
      ].join(' - ');
    }
    return `${formatDuration(durationMin(c))} nap`;
  }

  const parts = [formatDuration(durationMin(c))];
  if (c.distanceM != null) parts.push(formatDistance(c.distanceM));
  if (c.steps != null) parts.push(`${c.steps.toLocaleString()} steps`);
  if (c.avgHr != null) parts.push(`${c.avgHr} bpm avg`);
  if (c.strain != null) parts.push(`strain ${c.strain.toFixed(1)}`);
  return parts.join(' - ');
}

function durationMin(c: Pick<CardioRow, 'startTs' | 'endTs'>): number {
  return Math.round((c.endTs - c.startTs) / 60000);
}

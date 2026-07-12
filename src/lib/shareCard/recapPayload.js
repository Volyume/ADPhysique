import { formatNumber } from '../format';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_MS = 86400000;

function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// P-15 (ux-copy-polish audit 2026-07-12): aligned to the shared en-GB
// formatter (src/lib/format.js) so this recap, Workout Summary and Workout
// History all group numbers the same way. `value`/`label` are drawn as two
// separate canvas text nodes at different sizes (see drawShareCard.js
// drawStatBoxes) rather than concatenated into one string, so no unit
// nbsp-join is needed here.
function formatCount(value) {
  return formatNumber(value || 0);
}

function recapStats(data) {
  const stats = [];
  if (data.tonnage > 0) stats.push({ value: formatNumber(data.tonnage), label: 'kg lifted' });
  if (data.totalSets > 0) stats.push({ value: formatNumber(data.totalSets), label: 'sets' });
  if (data.topPRs?.length > 0) {
    stats.push({
      value: formatNumber(data.topPRs.length),
      label: data.topPRs.length === 1 ? 'PR' : 'PRs',
    });
  }
  return stats;
}

export function buildRecapMilestoneData(data, {
  variant = 'year',
  monthLabel,
  weekLabel,
  blockName,
} = {}) {
  if (!data) return null;

  if (variant === 'month') {
    return {
      eyebrow: 'MONTHLY RECAP',
      title: monthLabel || 'Monthly recap',
      heroValue: formatCount(data.totalSessions),
      heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption: `${fmtDate(data.startMs)} to ${fmtDate(data.endMs - DAY_MS)}`,
      stats: recapStats(data),
    };
  }

  if (variant === 'week') {
    return {
      eyebrow: 'WEEKLY RECAP',
      title: weekLabel || 'Your week',
      heroValue: formatCount(data.totalSessions),
      heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption: `${fmtDate(data.startMs)} to ${fmtDate(data.endMs - DAY_MS)}`,
      stats: recapStats(data),
    };
  }

  if (variant === 'block') {
    const stats = [];
    if (data.tonnage > 0) stats.push({ value: formatNumber(data.tonnage), label: 'kg lifted' });
    if (data.totalSets > 0) stats.push({ value: formatNumber(data.totalSets), label: 'sets' });
    if (data.meso?.plannedWeeks) {
      stats.push({
        value: String(data.meso.plannedWeeks),
        label: data.meso.plannedWeeks === 1 ? 'week' : 'weeks',
      });
    }
    return {
      eyebrow: 'BLOCK COMPLETE',
      title: data.meso?.name || blockName || 'Training block',
      heroValue: formatCount(data.totalSessions),
      heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption: '',
      stats,
    };
  }

  const stats = [];
  if (data.tonnage > 0) stats.push({ value: formatNumber(data.tonnage), label: 'kg lifted' });
  if (data.totalSets > 0) stats.push({ value: formatNumber(data.totalSets), label: 'sets' });
  if (data.uniqueExercises > 0) {
    stats.push({ value: formatNumber(data.uniqueExercises), label: 'exercises' });
  }
  return {
    title: 'My year of lifts',
    eyebrow: '',
    heroValue: formatCount(data.totalSessions),
    heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
    caption: `${fmtDate(data.yearStart)} to ${fmtDate(data.yearEnd)}`,
    stats,
  };
}

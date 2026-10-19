/**
 * Gym challenge display lines (SPEC sections 3 and 4): pure functions that turn
 * the server's score, board and challenge rows into the sentences the
 * Challenge screen, the Home card and the Community entries print. No I/O.
 *
 * Safety (SPEC 3.3): `partRows` leaves the food and weigh-in rows out for a
 * withheld caller, and `detail.food_days` / `detail.weighin_weeks` (null from
 * the server in that case) are read ONLY inside the non-withheld branch.
 */
import { CORE_SCORING, COACHING_SCORING } from './copy';

const CORE_KEYS = ['train', 'week', 'stronger', 'community'];
const COACHING_KEYS = ['checkin', 'food', 'weighin'];
const LABELS = {
  train: CORE_SCORING[0].label,
  week: CORE_SCORING[1].label,
  stronger: CORE_SCORING[2].label,
  community: CORE_SCORING[3].label,
  checkin: COACHING_SCORING[0].label,
  food: COACHING_SCORING[1].label,
  weighin: COACHING_SCORING[2].label,
};

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const plural = (count, one, many) => (count === 1 ? one : many);

/** 12.5 -> "12.5", 9 -> "9", 9.04 -> "9". */
export function pointsText(v) {
  return String(Number(n(v).toFixed(1)));
}

/** "9 of 12 training days": the plain line under a part. */
function detailLine(key, d) {
  switch (key) {
    case 'train':
      return `${n(d.training_days)} of ${n(d.target_days)} training ${plural(n(d.target_days), 'day', 'days')}`;
    case 'week':
      return `${n(d.weeks_hit)} of ${n(d.weeks)} ${plural(n(d.weeks), 'week', 'weeks')} hit`;
    case 'stronger':
      return `${n(d.lifts_beaten)} of 5 exercises beaten`;
    case 'community':
      return `${n(d.posts_weeks)} of ${n(d.weeks)} ${plural(n(d.weeks), 'week', 'weeks')} with a post`;
    case 'checkin':
      return `${n(d.checkins)} of ${n(d.checkins_target)} ${plural(n(d.checkins_target), 'check-in', 'check-ins')}`;
    case 'food':
      return `${n(d.food_days)} of ${n(d.food_cap)} days logged`;
    case 'weighin':
      return `${n(d.weighin_weeks)} of ${n(d.weeks)} ${plural(n(d.weeks), 'week', 'weeks')} weighed in`;
    default:
      return '';
  }
}

function row(key, score) {
  return {
    key,
    label: LABELS[key],
    points: n(score.parts?.[key]),
    max: n(score.max?.[key]),
    detail: detailLine(key, score.detail || {}),
  };
}

/**
 * The breakdown rows. `core` always; `coaching` is the "With coaching" list
 * (empty when the person has not set coaching up, when the card is shown
 * instead; food and weigh-in never appear for a withheld caller).
 */
export function partRows(score, { coachingSetUp }) {
  if (!score) return { core: [], coaching: [] };
  const withheld = score.withheld !== false; // anything but a clear false fails closed
  const core = CORE_KEYS.map((k) => row(k, score));
  let coachingKeys = [];
  if (coachingSetUp) coachingKeys = withheld ? ['checkin'] : COACHING_KEYS;
  return { core, coaching: coachingKeys.map((k) => row(k, score)) };
}

/** The coaching card is shown when coaching is not set up and the caller is not withheld. */
export function showCoachingCard(score, coachingSetUp) {
  return !!score && score.withheld === false && !coachingSetUp;
}

export function daysLeftLine(c) {
  if (!c) return '';
  switch (c.status) {
    case 'upcoming': return 'This challenge has not started yet.';
    case 'active': {
      const d = n(c.days_left);
      return d === 1 ? '1 day left' : `${d} days left`;
    }
    case 'ended': return 'The challenge has ended. Final scores are being confirmed.';
    case 'closed': return 'The challenge is over.';
    default: return '';
  }
}

const morePoints = (k) => `${k} more ${plural(k, 'point', 'points')}`;

/** Which draw you are in, and the gap to the next one. */
export function drawLines(score, c) {
  if (!score) return [];
  const tier = score.tier ?? null;
  if (c?.status === 'closed') {
    if (tier === 'main') return ['You finished in the main draw.'];
    if (tier === 'second') return ['You finished in the second draw.'];
    return [];
  }
  if (tier === 'main') return ['You are in the main draw.'];
  if (tier === 'second') return ['You are in the second draw.', `${morePoints(n(score.to_main))} for the main draw.`];
  return [`${morePoints(n(score.to_second))} for the second draw, ${n(score.to_main)} for the main draw.`];
}

export function thresholdsLine(c) {
  if (!c) return '';
  return `The main draw is for ${n(c.main_threshold)} points and above, the second draw for ${n(c.second_threshold)} and above.`;
}

// The server counts everyone at or above each line, so the second count
// includes the main-draw members; the sentence says so by naming the scores.
export function countsLine(counts, challenge) {
  if (!counts || !challenge) return '';
  const main = n(counts.main);
  const second = n(counts.second);
  return `${main} ${plural(main, 'member has', 'members have')} reached ${n(challenge.main_threshold)} points, and ${second} ${plural(second, 'has', 'have')} reached ${n(challenge.second_threshold)}.`;
}

export function tierLabel(tier) {
  return tier === 'main' ? 'Main draw' : 'Second draw';
}

/** "Your score" line on the Home card and the Community row. */
export function scoreLine(c) {
  return `Your score: ${n(c?.total)} of 100`;
}

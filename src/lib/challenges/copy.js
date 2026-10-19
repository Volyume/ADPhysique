/**
 * Gym challenge copy shared by the join screen and its tests (SPEC section 5
 * and section 3). The consent text is the founder-approved wording and is
 * versioned: change the words, change the version.
 */
export const CHALLENGE_CONSENT_VERSION = 'challenge_consent_v1';

export const CHALLENGE_CONSENT_TEXT = 'To score you, Volyume reads your training, check-ins, '
  + 'whether you logged food and whether you weighed in during the challenge. '
  + 'It never reads what you ate or what you weigh. If you are in the top 10, '
  + 'your name and score are shown to other entrants. If you win, your name and '
  + 'county are published, and you can object. You can leave the challenge at any time.';

/** The scoring table (SPEC 3.1 and 3.3). */
export const CORE_SCORING = Object.freeze([
  { label: 'Train to your plan', points: 40 },
  { label: 'Hit your week', points: 15 },
  { label: 'Get stronger', points: 15 },
  { label: 'Be part of it', points: 10 },
]);

export const COACHING_SCORING = Object.freeze([
  { label: 'Weekly check-in', points: 10 },
  { label: 'Food logging', points: 6 },
  { label: 'Weekly weigh-in', points: 4 },
]);

export const COACHING_NOTE = 'For the challenge: coaching adds up to 20 more points.';

// Founder decision 2026-10-19 (SPEC sections 0 and 5). Worded so that nobody
// else is said to pay today.
export const FREE_FOR_LIFE_JOIN_LINE = 'Joining also keeps Volyume free for you for life, even if we ever introduce paid plans.';
export const FREE_FOR_LIFE_LANDING_LINE = 'Volyume is free. Join through the challenge and it stays free for you for life, even if we ever introduce paid plans.';

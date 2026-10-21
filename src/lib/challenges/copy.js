/**
 * Gym challenge copy shared by the join screen and its tests (SPEC section 5
 * and section 3). The consent text is the founder-approved wording and is
 * versioned: change the words, change the version.
 */
export const CHALLENGE_CONSENT_VERSION = 'challenge_consent_v2';

export const CHALLENGE_CONSENT_TEXT = 'To score you, the challenge reads your training, your check-ins '
  + 'and Community posts, whether you logged food, whether you weighed in, and '
  + 'whether calm mode is on, so it never asks you to log food or weigh in at '
  + 'those times. It never reads what you ate or what you weigh. If you are in '
  + 'the top 10, your name and score are shown to other entrants. If you win, '
  + 'your name and county are published, and you can object. You can leave the '
  + 'challenge at any time.';

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

// Shown in place of the join and scoring surfaces once a challenge is over.
export const CHALLENGE_FINISHED_LINE = 'This challenge has finished. Thank you to everyone who took part.';

export const COACHING_NOTE = 'In the challenge, coaching adds up to 20 more points.';

// Founder decision 2026-10-20 (supersedes 2026-10-19: joining no longer
// grants it). Free for life is earned by finishing with a final score of 50
// or more; leaving before the end ends the chance. Says nothing about the
// rest of the app staying free.
export const FREE_FOR_LIFE_JOIN_LINE = 'Completing a challenge with a final score of 50 or more earns free for life.';
// The web landing page (public/c/index.html) carries the same line, word for
// word, and nothing else about price (owner 2026-10-21, site rebuild). It used
// to open with "Volyume is free." as a separate constant; only the web page
// used that, so the constant is gone and the page repeats this one.

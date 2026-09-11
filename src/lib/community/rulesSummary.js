/**
 * The four-line rules summary shown wherever a profile is about to be
 * created: the Join screen, and now the onboarding "Your gym" step
 * (communities revamp 2026-09-10, `docs/communities-revamp-2026-09-10/
 * 25-ONBOARDING-COMMUNITY-SPEC.md` section 4.3 item 5). Moved out of
 * `CommunityJoinScreen.js` (it was a local `const RULES` there) so the
 * onboarding step can show the identical four lines rather than a second
 * copy that could drift from the Join screen's own.
 *
 * PURE data, no I/O. The full text lives at
 * `docs/community-safety/COMMUNITY-RULES.md` and on `CommunityRulesScreen`;
 * this is the short summary card only.
 */
export const COMMUNITY_RULES_SUMMARY = [
  'Training talk only.',
  'Be decent to people.',
  'No body-shaming, no diet or calorie talk.',
  'Report what breaks this.',
];

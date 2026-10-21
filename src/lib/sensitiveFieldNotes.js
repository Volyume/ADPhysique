// The one "who can see this" line under each sensitive field in setup,
// Profile and Nutrition Targets (owner answer, item 4: helper lines only,
// each written from what the app really does with the value).
//
// Where each value really goes (file:line proof is in the proposal write-up):
//  - sex, age (as a date of birth) and height: user_body_profile
//    (sync.js _pushUserBodyProfile) and, for sex, profiles.sex
//    (sync/tables/profiles.js); the profile blob also travels with the
//    preference sync (sync.js SYNCED_PREF_PATTERNS).
//  - body weight and body fat %: body_metrics (sync/tables/bodyComposition.js).
//  - every one of those tables has an own-row security policy, and the
//    Community refusal list (community/validation.js) bars weight, body fat,
//    height and age from ever crossing to another person.
// Nutrition Targets reads sex, age and height to calculate and never writes
// them back, so its lines say so.
//
// British English, no em dash, plain words. Static copy: it never reads
// safety state and is the same under calm mode and an open ED flag.

const SEEN_BY = 'No other Volyume user can see it.';

export const SENSITIVE_NOTES = Object.freeze({
  sex: `Saved to your Volyume account so it comes back if you change phone. ${SEEN_BY}`,
  age: `Saved to your account as a date of birth worked out from your age, so it comes back if you change phone. ${SEEN_BY}`,
  height: `Saved to your Volyume account so it comes back if you change phone. ${SEEN_BY}`,
  weight: `Saved with your weight history in your Volyume account. ${SEEN_BY}`,
  bodyFat: `Saved with your weigh-ins in your Volyume account. ${SEEN_BY}`,
});

// Nutrition Targets (the screen only calculates from these three).
export const CALCULATION_ONLY_NOTES = Object.freeze({
  sex: `Used only to work out these targets. This screen does not save it to your Profile. ${SEEN_BY}`,
  age: `Used only to work out these targets. This screen does not save it to your Profile. ${SEEN_BY}`,
  height: `Used only to work out these targets. This screen does not save it to your Profile. ${SEEN_BY}`,
  weight: `If you have not weighed in today, this is saved as today's weight in your Volyume account. ${SEEN_BY}`,
  bodyFat: `Saved with today's weight when that is saved, in your Volyume account. ${SEEN_BY}`,
});

/**
 * mealReminderOffer.test — Item 9(c) (D141).
 *
 * Covers every one of the five eligibility conditions individually (each
 * test below flips exactly one fact away from an otherwise-eligible
 * baseline and pins that it alone is sufficient to suppress the offer):
 *  (i)   account + nutrition targets
 *  (ii)  at least 2 of the last 7 days (incl. today) show no logged food
 *  (iii) meal reminders not already enabled
 *  (iv)  NOT calm mode and NOT an open ED-pattern flag (ED-safety, fails closed)
 *  (v)   not previously dismissed
 */
import { resolveMealReminderOfferEligible, MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR } from '../mealReminderOffer';

const ELIGIBLE_BASE = {
  hasAccount: true,
  hasNutritionTargets: true,
  daysLoggedLast7: 4, // 3 of 7 missing -- above the 2-day threshold
  mealRemindersEnabled: false,
  calmMode: false,
  edFlagOpen: false,
  dismissed: false,
};

describe('MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR', () => {
  test('namespaces by user id, matching the repo convention', () => {
    expect(MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR('u1')).toBe('@volyume_meal_reminder_offer_dismissed_u1');
    expect(MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR(undefined)).toBe('@volyume_meal_reminder_offer_dismissed_anon');
  });
});

describe('resolveMealReminderOfferEligible: the otherwise-eligible baseline is eligible', () => {
  test('baseline is true', () => {
    expect(resolveMealReminderOfferEligible(ELIGIBLE_BASE)).toBe(true);
  });
});

describe('(i) account + nutrition targets', () => {
  test('no account: not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, hasAccount: false })).toBe(false);
  });
  test('no nutrition targets: not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, hasNutritionTargets: false })).toBe(false);
  });
});

describe('(ii) at least 2 of the last 7 days (incl. today) show no logged food', () => {
  test('exactly 5 days logged (2 missing): still eligible, the threshold is inclusive', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: 5 })).toBe(true);
  });
  test('6 days logged (only 1 missing): not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: 6 })).toBe(false);
  });
  test('every day logged (0 missing): not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: 7 })).toBe(false);
  });
  test('nobody who has not logged at all is offered a nudge (lead review: no first-day noise)', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: 0 })).toBe(false);
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: 1 })).toBe(true);
  });

  test('a failed/missing summary reads as 0 days logged: not eligible, never a guess', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: null })).toBe(false);
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, daysLoggedLast7: undefined })).toBe(false);
  });
});

describe('(iii) meal reminders not already enabled', () => {
  test('a meal reminder is already on: not eligible, nothing to offer', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, mealRemindersEnabled: true })).toBe(false);
  });
});

describe('(iv) ED-safety: never a food-adjacent nudge under calm mode or an open ED flag', () => {
  test('calm mode: not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, calmMode: true })).toBe(false);
  });
  test('open ED flag: not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, edFlagOpen: true })).toBe(false);
  });
  test('both: not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, calmMode: true, edFlagOpen: true })).toBe(false);
  });
});

describe('(v) not previously dismissed', () => {
  test('already dismissed: not eligible', () => {
    expect(resolveMealReminderOfferEligible({ ...ELIGIBLE_BASE, dismissed: true })).toBe(false);
  });
});

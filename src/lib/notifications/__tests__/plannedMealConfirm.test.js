/**
 * F3 — plannedMealConfirm pure helpers: copy (warm British, no shame) + the
 * 20:00 local slot.
 */
import { plannedMealConfirmPush, plannedConfirmSlot, PLANNED_CONFIRM_HOUR } from '../plannedMealConfirm';

describe('plannedMealConfirmPush', () => {
  test('reads naturally with and without a name; never shames', () => {
    const withName = plannedMealConfirmPush(', Sam');
    expect(withName.title).toBe('Did your day go to plan, Sam?');
    const noName = plannedMealConfirmPush();
    expect(noName.title).toBe('Did your day go to plan?');
    expect(noName.body).toMatch(/confirm/i);
    // Shame copy is banned.
    expect(`${noName.title} ${noName.body}`).not.toMatch(/forgot|missed|failed/i);
    // No em dashes (voice rule).
    expect(`${noName.title} ${noName.body}`).not.toMatch(/—/);
  });
});

describe('plannedConfirmSlot', () => {
  test('returns today at 20:00 local', () => {
    const now = new Date(2026, 5, 16, 9, 30, 0); // 09:30
    const slot = plannedConfirmSlot(now);
    expect(slot.getHours()).toBe(PLANNED_CONFIRM_HOUR);
    expect(slot.getMinutes()).toBe(0);
    expect(slot.getDate()).toBe(16);
  });
});

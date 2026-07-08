/**
 * Source guard: MicronutrientPanel (MN-1, audit §15 item 2) must never reach
 * a free user.
 *
 * WHY A SOURCE GUARD, NOT A FULL RENDER: DiaryScreen pulls in the whole food
 * domain (SQLite db.js, the sync layer, the coaching engine, the ED-safety
 * reads) purely to mount; a full render here would mean re-stubbing that
 * entire graph just to assert one conditional, which is exactly the
 * proScreenGating.guard.test.js / lazyScreens.guard.test.js idiom this suite
 * follows (fs.readFileSync + regex against the real source, no rendering).
 *
 * DiaryScreen itself is Pro-gated at the route level, but it ALSO renders for
 * a lapsed Pro user in a read-only view (E10, "view yes, log no") -- so
 * `readOnly` on this screen means "not currently Pro" for both the never-Pro
 * and the lapsed-Pro case, and is the exact same tier read every other
 * write/Pro-only affordance on the screen already uses (see the `readOnly`
 * derivation and its "E10 read-only lapse views" comment in DiaryScreen.js).
 * MicronutrientPanel reuses that mechanism rather than inventing a second one.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');

describe('MicronutrientPanel Pro gate (DiaryScreen.js): source guard', () => {
  test('DiaryScreen imports MicronutrientPanel and renders it exactly once', () => {
    expect(SRC).toMatch(/import MicronutrientPanel from '\.\.\/components\/food\/MicronutrientPanel';/);
    const matches = SRC.match(/<MicronutrientPanel\b/g) || [];
    expect(matches).toHaveLength(1);
  });

  test('DiaryScreen derives readOnly from the live store tier (the mechanism every Pro affordance on this screen reuses)', () => {
    expect(SRC).toMatch(/const readOnly = tier !== 'pro';/);
  });

  test('the MicronutrientPanel render is gated behind !readOnly, with a null (never a lock/teaser) free-tier branch', () => {
    const idx = SRC.indexOf('<MicronutrientPanel');
    expect(idx).toBeGreaterThan(-1);
    const before = SRC.slice(Math.max(0, idx - 400), idx);
    expect(before).toMatch(/\{!readOnly\s*\?\s*\(/);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/<\/View>\s*\)\s*:\s*null\s*\}/);
  });

  test('MicronutrientPanel is passed the day entries and userId, not re-deriving its own tier', () => {
    const idx = SRC.indexOf('<MicronutrientPanel');
    const tag = SRC.slice(idx, SRC.indexOf('/>', idx) + 2);
    expect(tag).toContain('entries={viewEntries}');
    expect(tag).toContain('userId={userId}');
    expect(tag).not.toContain('tier');
  });
});

/**
 * Founder ask (2026-07-09, verbatim): "We need a tooltip or something or a
 * notification in some elegant way after a user has added meals from the
 * meal builder to the diary to say to select and Mark eaten when they have
 * 1 meal or all of them at the end of the day. So they know."
 *
 * Source-level guard in the same fs.readFileSync + regex idiom as
 * DiaryScreen.d12EatDeclutter.guard.test.js and
 * DiaryScreen.holdHints.guard.test.js (DiaryScreen mounts a large dependency
 * graph, so a full render harness is not the contract worth pinning here --
 * the source wiring is).
 *
 * This is a SEPARATE one-time hint from D12's showMarkEatenHint (which fires
 * on any first sighting of planned meals). This one fires only once ever, at
 * the moment meals from the meal builder / meal plan (MealPlanScreen's "Add
 * this day" / "Add this week") actually land in the diary, via the
 * `justAddedPlan` nav param MealPlanScreen sets on its post-add navigate.
 * The two hints never render at once (see
 * DiaryScreen.d12EatDeclutter.guard.test.js's updated D12 item 3 gating
 * test).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');
const PLAN_SRC = fs.readFileSync(path.join(__dirname, '..', 'MealPlanScreen.js'), 'utf8');

describe('MealPlanScreen: flags a fresh add so the diary can teach once', () => {
  test('adding a single day passes justAddedPlan on the post-add navigate', () => {
    expect(PLAN_SRC).toMatch(
      /if \(n > 0\) navigation\.navigate\('Diary', \{ justAddedPlan: true \}\);/,
    );
  });

  test('adding a week passes justAddedPlan on the post-add navigate', () => {
    expect(PLAN_SRC).toMatch(
      /navigation\.navigate\('Diary', \{ justAddedPlan: true \}\);/,
    );
    // Both call sites (day + week) use the identical literal, so this one
    // regex covers the week path only in combination with the day-path test
    // above pinning the same literal inside writeLogDay specifically.
    const matches = PLAN_SRC.match(/navigation\.navigate\('Diary', \{ justAddedPlan: true \}\);/g) || [];
    expect(matches.length).toBe(2);
  });
});

describe('DiaryScreen: one-time plan-added teach', () => {
  test('the hint flag follows the existing @volyume_seen_* once-ever convention, distinct from D12\'s key', () => {
    expect(SRC).toMatch(/const DIARY_PLANADDED_HINT_KEY = '@volyume_seen_diary_planadded_hint';/);
  });

  test('the hint only arms when the justAddedPlan param is actually present, and the param is consumed (cleared) immediately', () => {
    expect(SRC).toMatch(
      /if \(!route\?\.params\?\.justAddedPlan\) return;\s*navigation\.setParams\(\{ justAddedPlan: undefined \}\);/,
    );
  });

  test('arming still respects the once-ever stored flag', () => {
    expect(SRC).toMatch(
      /AsyncStorage\.getItem\(DIARY_PLANADDED_HINT_KEY\)\.then\(\(v\) => \{\s*if \(active && v !== 'true'\) setShowPlanAddedHint\(true\);\s*\}\)/,
    );
  });

  test('dismissing the hint persists the flag so it never returns', () => {
    expect(SRC).toMatch(
      /const dismissPlanAddedHint = useCallback\(\(\) => \{\s*setShowPlanAddedHint\(false\);\s*AsyncStorage\.setItem\(DIARY_PLANADDED_HINT_KEY, 'true'\)\.catch\(\(\) => \{\}\);\s*\}, \[\]\);/,
    );
  });

  test('the hint is gated on planned meals actually being present, read-write, and not mid-selection', () => {
    expect(SRC).toMatch(
      /\{plannedCount > 0 && !selectionMode && !readOnly && showPlanAddedHint \? \(\s*<HintCaption/,
    );
  });

  test('the copy is calm, states both the per-meal and end-of-day paths, matches the founder-approved wording exactly, and has no em dash', () => {
    const match = SRC.match(/text="Your meals are in the diary\. Mark each one eaten as you go, or mark them all at the end of the day\."/);
    expect(match).toBeTruthy();
    expect(match[0]).not.toMatch(/—/);
    // ED-safety: no calorie or weight reference anywhere in this specific line.
    expect(match[0]).not.toMatch(/calorie|kcal|weight|kg|lb/i);
  });

  test('marking a planned meal as eaten (bulk or per-meal) counts as discovery and dismisses this hint too, reusing the same signal as D12', () => {
    expect(SRC).toMatch(/if \(n > 0\) dismissPlanAddedHint\(\); \/\/ same discovery, plan-added teach's signal/);
    expect(SRC).toMatch(/dismissPlanAddedHint\(\); \/\/ same discovery, plan-added teach's signal/g);
  });
});

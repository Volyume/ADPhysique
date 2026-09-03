import fs from 'fs';
import path from 'path';

const PRO_GATE = fs.readFileSync(path.join(__dirname, '..', 'ProGate.js'), 'utf8');
const ROOT_NAVIGATOR = fs.readFileSync(path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'), 'utf8');

describe('Pro gate feature copy', () => {
  // D137 (fully-free product): every withProGuard/withReadOnlyProGuard call
  // site in RootNavigator.js was removed, so the feature-key strings those
  // calls used to pass (e.g. 'Coaching decision', 'Adjust training') no
  // longer appear in RootNavigator.js at all -- they only survive inside
  // ProGate.js's FEATURE_COPY dictionary, which stays on disk DORMANT and
  // unimported in case a future deliberate monetisation decision revives
  // the guard. The pin therefore moves entirely onto the dormant module:
  // its retained copy must still use the CURRENT (not retired) names.
  test('uses current coaching and progress-photo labels instead of retired feature names', () => {
    expect(PRO_GATE).toContain("'Progress photos and Volyume Score'");
    expect(PRO_GATE).toContain("'Coaching decision'");
    expect(PRO_GATE).toContain("'Adjust training'");

    expect(PRO_GATE).not.toContain("'Progress photos and Physique Scan'");
    expect(PRO_GATE).not.toContain("'Update training'");

    // RootNavigator no longer guards anything, so none of these feature-key
    // strings (current or retired) should appear there any more.
    expect(ROOT_NAVIGATOR).not.toContain("'Progress photos and Volyume Score'");
    expect(ROOT_NAVIGATOR).not.toContain("'Coaching decision'");
    expect(ROOT_NAVIGATOR).not.toContain("'Adjust training'");
    // 'Your week' was retired as the coach-output gate label, then later
    // legitimately reused as the Weekly Story gate label (§15 item 1,
    // formerly GatedWeeklyStory in RootNavigator, now plain
    // WeeklyStoryScreen). The positive assertions above pin the dormant
    // ProGate.js copy, so a blanket ban on the string is not needed here.
  });

  test('meal and plan labels use human create/adjust wording', () => {
    expect(PRO_GATE).toContain("'Meal plan': 'Create a day of food");
    expect(PRO_GATE).not.toContain("'Meal plan': 'Build a day of food");
    // D137: PlanUpdate is a plain, ungated registration now (no Gated*
    // wrapper, no feature-key string in RootNavigator any more).
    expect(ROOT_NAVIGATOR).not.toContain('GatedPlanUpdate');
    expect(ROOT_NAVIGATOR).toMatch(/<Stack\.Screen name="PlanUpdate" component=\{PlanUpdateScreen\}/);
    expect(ROOT_NAVIGATOR).not.toContain("'Adjust training'");
  });

  test('restore purchase action is contained chrome, not an underlined text link', () => {
    // CP-10 theming batch (2026-07-10): pin extended, mechanical only. The
    // icon now reads the live theme (t.colors.textSecondary) instead of the
    // frozen colors singleton, same token, live instead of import-time-baked
    // (see BottomSheet.js's buildLiveStyles header comment for the pattern).
    // The frozen `lockedRestore`/`lockedRestoreText` StyleSheet entries this
    // test also pins are untouched (byte-identical), so those two
    // assertions are unchanged.
    expect(PRO_GATE).toContain('Ionicons name="refresh-outline" size={14} color={t.colors.textSecondary}');
    expect(PRO_GATE).toMatch(/lockedRestore: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(PRO_GATE).toContain('lockedRestoreText: { ...type.caption, color: colors.textSecondary }');
    expect(PRO_GATE).not.toContain("textDecorationLine: 'underline'");
    expect(PRO_GATE).not.toContain('Restoringâ');
  });
});

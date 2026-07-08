import fs from 'fs';
import path from 'path';

const PRO_GATE = fs.readFileSync(path.join(__dirname, '..', 'ProGate.js'), 'utf8');
const ROOT_NAVIGATOR = fs.readFileSync(path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'), 'utf8');

describe('Pro gate feature copy', () => {
  test('uses current coaching and progress-photo labels instead of retired feature names', () => {
    expect(ROOT_NAVIGATOR).toContain("'Progress photos and Volyume Score'");
    expect(ROOT_NAVIGATOR).toContain("'Coaching decision'");
    expect(ROOT_NAVIGATOR).toContain("'Adjust training'");
    expect(PRO_GATE).toContain("'Progress photos and Volyume Score'");
    expect(PRO_GATE).toContain("'Coaching decision'");
    expect(PRO_GATE).toContain("'Adjust training'");

    expect(ROOT_NAVIGATOR).not.toContain("'Progress photos and Physique Scan'");
    expect(ROOT_NAVIGATOR).not.toContain("'Update training'");
    expect(ROOT_NAVIGATOR).not.toContain("'Your week'");
    expect(PRO_GATE).not.toContain("'Progress photos and Physique Scan'");
    expect(PRO_GATE).not.toContain("'Update training'");
    expect(PRO_GATE).not.toContain("'Your week'");
  });

  test('meal and plan labels use human create/adjust wording', () => {
    expect(PRO_GATE).toContain("'Meal plan': 'Create a day of food");
    expect(PRO_GATE).not.toContain("'Meal plan': 'Build a day of food");
    expect(ROOT_NAVIGATOR).toContain('GatedPlanUpdate');
    expect(ROOT_NAVIGATOR).toContain("'Adjust training'");
  });

  test('restore purchase action is contained chrome, not an underlined text link', () => {
    expect(PRO_GATE).toContain('Ionicons name="refresh-outline" size={14} color={colors.textSecondary}');
    expect(PRO_GATE).toMatch(/lockedRestore: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(PRO_GATE).toContain('lockedRestoreText: { ...type.caption, color: colors.textSecondary }');
    expect(PRO_GATE).not.toContain("textDecorationLine: 'underline'");
    expect(PRO_GATE).not.toContain('Restoringâ');
  });
});

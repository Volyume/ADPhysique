// D36a (item 17 modal tails, lead-ruled under D33, 2026-07-10). The quiz
// modal was a hand-rolled bottom-anchored RN Modal with a GENUINE inset bug
// (quizSheet used a fixed paddingBottom token, no safe-area inset). This
// suite pins the migration onto the shared BottomSheet chrome
// (src/components/BottomSheet.js): the old Modal/Pressable backdrop/handle
// scaffolding is gone, BottomSheet owns insets and reduce-motion itself, and
// all three quiz steps (question, result, no-result) stay reachable inside
// the migrated sheet.
import fs from 'fs';
import path from 'path';

const PLAN_LIBRARY = fs.readFileSync(
  path.join(__dirname, '..', 'PlanLibraryScreen.js'),
  'utf8',
);

describe('PlanLibraryScreen quiz sheet (D36a)', () => {
  test('the quiz modal is built on the shared BottomSheet, not a hand-rolled Modal', () => {
    expect(PLAN_LIBRARY).toContain("import BottomSheet from '../components/BottomSheet';");
    const quizWindow = PLAN_LIBRARY.match(/\{\/\* Quiz modal\.[\s\S]*?\n {6}<\/BottomSheet>/)?.[0] ?? '';
    expect(quizWindow).toContain('<BottomSheet');
    expect(quizWindow).toContain('visible={quizVisible}');
    expect(quizWindow).toContain('onClose={dismissQuiz}');
    expect(quizWindow).not.toContain('<Pressable');
    expect(quizWindow).not.toContain('styles.backdrop');
    expect(quizWindow).not.toContain('styles.quizSheet');
    expect(quizWindow).not.toContain('styles.sheetHandle');
  });

  test('all three quiz steps stay reachable inside the migrated sheet', () => {
    const quizWindow = PLAN_LIBRARY.match(/\{\/\* Quiz modal\.[\s\S]*?\n {6}<\/BottomSheet>/)?.[0] ?? '';
    // Question step
    expect(quizWindow).toContain('styles.quizProgress');
    expect(quizWindow).toContain('QUIZ_STEPS[quizStep].question');
    expect(quizWindow).toContain('Skip and browse all plans');
    // Result step
    expect(quizWindow).toContain("Here's our suggestion");
    expect(quizWindow).toContain('accessibilityLabel={`Add ${quizResult.name}`}');
    // No-result step
    expect(quizWindow).toContain('No exact match found');
    expect(quizWindow).toContain('Browse all plans');
  });
});

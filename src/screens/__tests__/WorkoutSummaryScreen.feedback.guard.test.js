import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('WorkoutSummaryScreen feedback controls', () => {
  test('uses stable rating values and wrap-safe rows after workout completion', () => {
    expect(SOURCE).toContain("const values = field === 'jointDiscomfort'");
    expect(SOURCE).toContain('? [0, 1, 2, 3]');
    expect(SOURCE).toContain(': Array.from({ length: max }, (_, i) => i + 1);');
    expect(SOURCE).toContain('hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}');
    expect(SOURCE).toMatch(/ratingBtns: \{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing\.xs, minHeight: 44 \}/);
    expect(SOURCE).toMatch(/ratingBtn: \{\s*width: 44, height: 44, minWidth: 44,/);
  });

  test('keeps completed-workout footer compact and stable', () => {
    expect(SOURCE).toMatch(/stickyFooter: \{[\s\S]*paddingTop: spacing\.sm,[\s\S]*minHeight: 68/);
    expect(SOURCE).toContain('<View style={[styles.stickyFooter, { paddingBottom: spacing.md }]}>');
    expect(SOURCE).toMatch(/doneBtn: \{[\s\S]*paddingVertical: spacing\.md/);
    expect(SOURCE).toMatch(/shareFooterBtn: \{[\s\S]*paddingVertical: spacing\.md/);
    expect(SOURCE).toMatch(/doneBtnText: \{\s*\.\.\.type\.label,/);
    expect(SOURCE).toMatch(/shareFooterBtnText: \{\s*\.\.\.type\.label,/);
  });

  test('keeps optional post-workout ratings collapsed until the user opens them', () => {
    expect(SOURCE).toContain('const [feedbackExpanded, setFeedbackExpanded] = useState(false);');
    expect(SOURCE).toContain('Rate this session');
    expect(SOURCE).not.toContain('const [feedbackExpanded, setFeedbackExpanded] = useState(!readOnly);');
    expect(SOURCE).not.toContain('Add session feedback');
  });

  test('does not delay completed workout controls behind reveal animations', () => {
    const revealSource = SOURCE.slice(
      SOURCE.indexOf('function RevealSection'),
      SOURCE.indexOf('// StatBox renders'),
    );
    expect(SOURCE).toContain('function RevealSection({ children })');
    expect(SOURCE).toContain('return <View>{children}</View>;');
    expect(revealSource).not.toContain('Animated.timing');
  });
});

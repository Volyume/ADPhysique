import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('WorkoutSummaryScreen feedback controls', () => {
  test('uses stable rating values and wrap-safe rows after workout completion', () => {
    expect(SOURCE).toContain("const values = field === 'jointDiscomfort'");
    expect(SOURCE).toContain('? [0, 1, 2, 3]');
    expect(SOURCE).toContain(': Array.from({ length: max }, (_, i) => i + 1);');
    expect(SOURCE).toContain('hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}');
    expect(SOURCE).toMatch(/ratingBtns: \{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing\.xs, minHeight: 44 \}/);
    expect(SOURCE).toMatch(/ratingBtn: \{\s*width: 44, height: 44, minWidth: 44,/);
  });

  test('keeps completed-workout footer compact and stable', () => {
    // old -> new (design-usability-audit-2026-07-09 Batch 2 wave B, Button
    // adoption): Close/Share were hand-rolled TouchableOpacity elements; they
    // now render through the shared Button primitive (variant="secondary" /
    // "tertiary"), passing the SAME doneBtn/shareFooterBtn/*Text style
    // objects via Button's style/textStyle props, so the pinned literal
    // style assertions below are unchanged. The "Saving"/"Close" text swap
    // and the share icon are now Button props (title/icon), not raw JSX, so
    // those two assertions are re-pointed at the Button call sites.
    expect(SOURCE).toMatch(/stickyFooter: \{[\s\S]*paddingTop: spacing\.sm,[\s\S]*minHeight: 68/);
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): WorkoutSummaryScreen
    // now reads a live theme (src/hooks/useTheme.js); stickyFooter gained a
    // live.stickyFooter override ahead of the inline paddingBottom object.
    // The frozen `styles.stickyFooter` definition (asserted above) is
    // byte-identical -- mechanical only.
    expect(SOURCE).toContain('<View style={[styles.stickyFooter, live.stickyFooter, { paddingBottom: spacing.lg }]}>');
    expect(SOURCE).toContain('<TouchableOpacity');
    expect(SOURCE).toContain("title={saving ? 'Saving' : 'Close'}");
    expect(SOURCE).toMatch(/title="Share"[\s\S]*?icon="share-social-outline"[\s\S]*?variant="tertiary"[\s\S]*?size="sm"/);
    expect(SOURCE).toMatch(/doneBtn: \{[\s\S]*paddingVertical: spacing\.md/);
    expect(SOURCE).toMatch(/shareFooterBtn: \{[\s\S]*paddingVertical: spacing\.md/);
    expect(SOURCE).toMatch(/doneBtn: \{[\s\S]*flex: 1/);
    expect(SOURCE).toMatch(/doneBtn: \{[\s\S]*minHeight: 44/);
    expect(SOURCE).toMatch(/shareFooterBtn: \{[\s\S]*flexShrink: 0,[\s\S]*minWidth: 108,[\s\S]*minHeight: 44/);
    expect(SOURCE).not.toMatch(/shareFooterBtn: \{\s*flex: 1,/);
    expect(SOURCE).toMatch(/doneBtnText: \{\s*\.\.\.type\.label,/);
    expect(SOURCE).toMatch(/shareFooterBtnText: \{\s*\.\.\.type\.label,/);
  });

  test('save-template modal follows the same compact completion styling', () => {
    expect(SOURCE).toContain('templateModalTitle: {');
    expect(SOURCE).toContain('...type.title, color: colors.textPrimary');
    expect(SOURCE).toContain('templateModalCancelText: { ...type.label, color: colors.textSecondary }');
    expect(SOURCE).toMatch(/templateModalSave: \{[\s\S]*backgroundColor: colors\.primaryFill/);
    expect(SOURCE).not.toContain('templateModalSave: {\n    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,\n    borderRadius: radius.md, backgroundColor: colors.primary,');
  });

  test('keeps optional post-workout ratings collapsed until the user opens them', () => {
    // old -> new (design-usability-audit-2026-07-09 lane-07 SAFE sweep, L01-B39):
    // "Session feedback" / "Rate this session" reworded to "Workout feedback" /
    // "Rate this workout" so the completed unit reads as "workout" throughout,
    // matching the "Workout complete" header on this screen.
    expect(SOURCE).toContain('const [feedbackExpanded, setFeedbackExpanded] = useState(false);');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): sectionTitle gained a
    // live.sectionTitle override (source: useTheme.js); frozen style
    // byte-identical.
    expect(SOURCE).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.sectionTitle, live.sectionTitle]}>Workout feedback</Text>');
    expect(SOURCE).toContain('Rate this workout');
    expect(SOURCE).toContain('placeholder="Anything notable from this session"');
    expect(SOURCE).toContain('placeholder="Anything to remember for next session? e.g. try 85kg, wider grip, reduce volume"');
    expect(SOURCE).not.toContain('Tell your coach');
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

  test('keeps optional explanation and calm recap actions neutral, not cheap amber links', () => {
    const whyToggleStyle = SOURCE.match(/volumeWhyToggle: \{[\s\S]*?\n  \},/)?.[0] || '';
    const whyToggleTextStyle = SOURCE.match(/volumeWhyToggleText: \{[\s\S]*?\n  \},/)?.[0] || '';
    const recapStyle = SOURCE.match(/blockRecapRow: \{[\s\S]*?\n  \},/)?.[0] || '';
    expect(SOURCE).toMatch(/volumeWhyToggle: \{[\s\S]*minHeight: 40,[\s\S]*backgroundColor: colors\.surface2,[\s\S]*borderColor: colors\.border/);
    expect(SOURCE).toContain('volumeWhyToggleText: {');
    expect(SOURCE).toContain('...type.caption, color: colors.textSecondary');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): inline colour prop
    // moved from the frozen `colors.*` singleton to `t.colors.*`.
    expect(SOURCE).toContain('name="film-outline" size={16} color={t.colors.textSecondary}');
    expect(SOURCE).toMatch(/blockRecapRow: \{[\s\S]*backgroundColor: colors\.surface2,[\s\S]*borderColor: colors\.border/);
    expect(SOURCE).toContain('blockRecapText: { flex: 1, ...type.label, color: colors.textPrimary }');
    expect(whyToggleStyle).not.toContain('colors.primary');
    expect(whyToggleTextStyle).not.toContain('colors.primary');
    expect(recapStyle).not.toContain('colors.primaryBg');
  });
});

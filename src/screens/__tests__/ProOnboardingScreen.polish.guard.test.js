import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'ProOnboardingScreen.js'),
  'utf8',
);

describe('ProOnboardingScreen premium polish guards', () => {
  test('final setup copy stays plain, British and rule-based', () => {
    expect(SOURCE).toContain('rule-based coaching system');
    expect(SOURCE).toContain('Recovery affects your plan volume. Reminders keep coaching consistent.');
  });

  test('optional body composition points users towards Volyume Score, not body fat guessing', () => {
    expect(SOURCE).toContain('Volyume Score for progress');
    expect(SOURCE).toContain('without asking you to estimate exact body fat');
  });

  test('header outcome chips and dense rows are shrink-safe on phones', () => {
    expect(SOURCE).toMatch(/<Text style=\{styles\.outcomeChipText\} numberOfLines=\{1\}>/);
    expect(SOURCE).toMatch(/outcomeChipText: \{[^}]*flexShrink: 1/);
    expect(SOURCE).toMatch(/heightImperialRow: \{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing\.md \}/);
    expect(SOURCE).toMatch(/inputHalf: \{ flex: 1, minWidth: 140 \}/);
    expect(SOURCE).toMatch(/notifCopy: \{ flex: 1, minWidth: 0 \}/);
    expect(SOURCE).toMatch(/hourChip: \{\s*minHeight: 48/);
    expect(SOURCE).toContain('hitSlop={hitSlop}');
  });

  test('final step title is clean and the missing-recovery gate is visible', () => {
    expect(SOURCE).toContain('title="Recovery and reminders"');
    expect(SOURCE).toContain('Choose your recovery rating to finish setup.');
  });

  test('final submit never builds targets from fallback body data', () => {
    expect(SOURCE).toContain('Volyume will not build targets from fallback body data.');
    expect(SOURCE).toContain('const safeWeightKg = bwKg;');
    expect(SOURCE).toContain('const safeAge = ageNum;');
    expect(SOURCE).not.toContain('const safeWeightKg = (!isNaN(bwKg) && bwKg > 0) ? bwKg : 80;');
    expect(SOURCE).not.toContain('const safeAge = ageNum || 28;');
  });
});

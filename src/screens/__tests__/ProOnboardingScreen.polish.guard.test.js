import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'ProOnboardingScreen.js'),
  'utf8',
);

describe('ProOnboardingScreen premium polish guards', () => {
  test('final setup copy stays plain, British and rule-based', () => {
    expect(SOURCE).toContain('Volyume uses your morning weigh-ins and weekly check-in to shape coaching.');
    expect(SOURCE).toContain('Recovery affects your plan volume. Reminders keep coaching consistent.');
  });

  test('optional body composition can seed the first plan while staying honest about certainty', () => {
    expect(SOURCE).toContain('Your best current estimate helps the first plan.');
    expect(SOURCE).toContain('Enter your best current estimate or a measured value.');
    expect(SOURCE).toContain('const BODY_FAT_SOURCE_OPTIONS = [');
    expect(SOURCE).toContain("{ label: 'Best estimate', value: 'visual' }");
    expect(SOURCE).not.toContain("{ label: 'Visual', value: 'visual' }");
    expect(SOURCE).not.toContain('Do not guess it.');
  });

  test('step chrome components stay outside the screen render so Android inputs keep focus', () => {
    expect(SOURCE).toContain('function ProOnboardingHeader({ step, title, sub, onBack })');
    expect(SOURCE).toContain('function QuestionGroup({ icon, title, sub, children })');

    const screenBody = SOURCE.slice(SOURCE.indexOf('export default function ProOnboardingScreen'));
    expect(screenBody).not.toContain('function Header(');
    expect(screenBody).not.toContain('function QuestionGroup(');
    expect(screenBody).not.toContain('function ProgressBar(');
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

  test('plan-generation failure copy points to the current Today flow', () => {
    expect(SOURCE).toContain('Open Today and choose "Start with a plan" to retry.');
    expect(SOURCE).not.toContain('Open Home and tap "Build my plan" to retry.');
  });

  test('coaching reminders are required timing choices, not break-the-loop toggles', () => {
    expect(SOURCE).toContain('Pick a morning time and weekly check-in day.');
    expect(SOURCE).toContain('your coaching reminder settings');
    expect(SOURCE).not.toContain('Settings &gt; Coaching reminders');
    expect(SOURCE).toContain('morningEnabled: true');
    expect(SOURCE).toContain('checkinEnabled: true');
    expect(SOURCE).toContain('styles.requiredPill');
    // FR-4/D7: pill copy softened to "Part of your coaching"; the reminder
    // itself stays non-optional (morningEnabled/checkinEnabled true, no
    // toggle handlers below) - tone only, gate assertions unchanged.
    expect(SOURCE).toContain('<Text style={styles.requiredPillText}>Part of your coaching</Text>');
    expect(SOURCE).toContain('accessibilityRole="radiogroup" accessibilityLabel="Morning weight reminder time"');
    expect(SOURCE).toContain('accessibilityRole="radiogroup" accessibilityLabel="Weekly check-in day"');
    expect(SOURCE).toContain('accessibilityState={{ checked: morningHour === h }}');
    expect(SOURCE).toContain('accessibilityState={{ checked: checkinDay === i }}');
    expect(SOURCE).not.toContain('setMorningEnabled(v => !v)');
    expect(SOURCE).not.toContain('setCheckinEnabled(v => !v)');
    expect(SOURCE).not.toContain('accessibilityLabel="Morning weight reminder"');
    expect(SOURCE).not.toContain('accessibilityLabel="Weekly check-in reminder"');
  });

  test('final submit never builds targets from fallback body data', () => {
    expect(SOURCE).toContain('Volyume will not build targets from fallback body data.');
    expect(SOURCE).toContain('const safeWeightKg = bwKg;');
    expect(SOURCE).toContain('const safeAge = ageNum;');
    expect(SOURCE).not.toContain('const safeWeightKg = (!isNaN(bwKg) && bwKg > 0) ? bwKg : 80;');
    expect(SOURCE).not.toContain('const safeAge = ageNum || 28;');
  });
});

import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'ProOnboardingScreen.js'),
  'utf8',
);

describe('ProOnboardingScreen premium polish guards', () => {
  test('final setup copy states the coach is deterministic, not chat-based', () => {
    expect(SOURCE).toContain('deterministic, explainable coaching system, not a chat coach');
  });

  test('optional body composition points users towards Physique Score, not body fat guessing', () => {
    expect(SOURCE).toContain('Volyume Physique Score for visual progress');
    expect(SOURCE).toContain('without asking you to guess exact body fat');
  });

  test('header outcome chips and dense rows are shrink-safe on phones', () => {
    expect(SOURCE).toMatch(/<Text style=\{styles\.outcomeChipText\} numberOfLines=\{1\}>/);
    expect(SOURCE).toMatch(/outcomeChipText: \{[^}]*flexShrink: 1/);
    expect(SOURCE).toMatch(/inputHalf: \{ flex: 1, minWidth: 0 \}/);
    expect(SOURCE).toMatch(/notifCopy: \{ flex: 1, minWidth: 0 \}/);
  });

  test('final step title is clean and the missing-recovery gate is visible', () => {
    expect(SOURCE).toContain('title="Recovery and reminders"');
    expect(SOURCE).toContain('Choose your recovery rating to finish setup.');
  });
});

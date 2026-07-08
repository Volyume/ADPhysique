const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(repoRoot, ...parts), 'utf8');
}

describe('privacy, consent, export and store-copy truth', () => {
  test('Article 9 consent names Volyume Score data and its limits', () => {
    const source = readRepoFile('src', 'screens', 'Article9ConsentScreen.js');

    expect(source).toContain("const CONSENT_VERSION = '2026-07-04'");
    expect(source).toContain('photo quality, confidence, leanness band, Volyume Score and progress signal');
    expect(source).toContain('not a medical assessment, DEXA scan, diagnosis, or medical advice');
    expect(source).toContain('Progress photo image files stay on this device');
    expect(source).toContain('Never use your photos or health data for advertising or third-party model training');
  });

  test('in-app privacy policy and data tools describe the real export/delete surface', () => {
    const privacy = readRepoFile('src', 'screens', 'PrivacyPolicyScreen.js');
    const data = readRepoFile('src', 'screens', 'SettingsDataScreen.js');

    expect(privacy).toContain("LAST_UPDATED = '4 July 2026'");
    expect(privacy).toMatch(/Volyume Score is a visual\s+progress feature/);
    expect(privacy).toContain('not a DEXA scan, diagnosis, medical assessment, or medical advice');
    expect(privacy).toContain('progress photo metadata and Volyume Score analysis metadata');
    expect(privacy).toContain('private photo image files');
    expect(data).toContain('Back up app data (JSON)');
    expect(data).toContain('photo image files stay on this device');
    expect(data).toContain('Workout sets only');
  });

  test('public privacy/support copy has no stale export, food or billing claims', () => {
    const publicFiles = [
      readRepoFile('public', 'privacy.html'),
      readRepoFile('public', 'privacy', 'index.html'),
      readRepoFile('public', 'privacy-policy.md'),
      readRepoFile('public', 'support', 'index.html'),
      readRepoFile('public', 'app-map', 'index.html'),
    ].join('\n');

    expect(publicFiles).toContain('not an exact body-fat percentage');
    expect(publicFiles).toContain('Settings &rarr; Your data');
    expect(publicFiles).toContain('Volyume Score analysis metadata');
    expect(publicFiles).not.toMatch(/Physique Scan metadata/i);
    expect(publicFiles).not.toMatch(/Download my data/i);
    expect(publicFiles).not.toMatch(/we don't track meals/i);
    expect(publicFiles).not.toMatch(/not a diet tracker/i);
    expect(publicFiles).not.toMatch(/visible only to you/i);
    expect(publicFiles).not.toMatch(/RevenueCat/i);
  });

  test('store listing drafts include current Progress Scan, nutrition and diagnostic disclosures', () => {
    const appStore = readRepoFile('docs', 'APP_STORE_CONNECT_LISTING.md');
    const playStore = readRepoFile('docs', 'PLAY_STORE_LISTING.md');
    const combined = `${appStore}\n${playStore}`;

    expect(combined).toContain('Physique Scan');
    expect(combined).toContain('Progress photo metadata');
    expect(combined).toContain('Nutrition / food logs');
    expect(combined).toContain('Crash Data and Performance Data');
    expect(combined).not.toContain('Crash data or performance data sent off-device');
  });
});

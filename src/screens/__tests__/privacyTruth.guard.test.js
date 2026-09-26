const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(repoRoot, ...parts), 'utf8');
}

describe('privacy, consent, export and store-copy truth', () => {
  test('Article 9 consent names Volyume Score data and its limits', () => {
    const source = readRepoFile('src', 'screens', 'Article9ConsentScreen.js');

    // FQ-5 item 2 (D96, founder-approved): the shipped screen became the
    // canonical consent record and the version stamp moved to the
    // reconciliation date. The pin still holds the stamp to the exact
    // value PRIVACY_CONSENT_LOCKED.md prints.
    expect(source).toContain("const CONSENT_VERSION = '2026-08-10'");
    expect(source).toContain('photo quality, result confidence, leanness band, Volyume Score and progress change');
    expect(source).toContain('not a medical measure, DEXA scan, diagnosis, or medical advice');
    expect(source).toContain('Progress photo image files stay on this device');
    expect(source).toContain('Never use your photos or health data for advertising or third-party model training');
  });

  test('in-app privacy policy and data tools describe the real export/delete surface', () => {
    const privacy = readRepoFile('src', 'screens', 'PrivacyPolicyScreen.js');
    const data = readRepoFile('src', 'screens', 'SettingsDataScreen.js');

    // RE-ANCHORED 2026-09-26 (founder order: "It is on for all users by
    // default. New and existing they can turn it off if they want after.
    // We need that in the privacy policy also"; register D194 addendum 2):
    // the Community section was added, so the date moved with it.
    expect(privacy).toContain("LAST_UPDATED = '26 September 2026'");
    expect(privacy).toMatch(/Volyume Score is a simple\s+progress read/);
    expect(privacy).toContain('not a DEXA scan, diagnosis, medical assessment, or medical advice');
    expect(privacy).toContain('progress photo metadata and Volyume Score analysis metadata');
    expect(privacy).toContain('private photo image files');
    expect(data).toContain('Back up app data (JSON)');
    expect(data).toContain('photo image files stay on this device');
    expect(data).toContain('Workout sets only');
  });

  // P-08 (Codex end-user-polish audit): the in-app privacy policy exposed the
  // founder's personal Gmail address rather than the branded support address
  // the public policy and the app's other hard-coded support-address sites
  // (App.js crash boundary, CreditsScreen.js) already use. src/lib/links.js
  // was deleted (Campaign 4, coherence-cleanup-2026-08-10): it claimed to be
  // the single source of truth for this address but nothing ever imported
  // it -- every real site hard-codes 'support@volyume.app' independently.
  test('in-app privacy policy uses the branded support address, not a personal Gmail', () => {
    const privacy = readRepoFile('src', 'screens', 'PrivacyPolicyScreen.js');

    expect(privacy).not.toMatch(/allansdouglas1983@gmail\.com/);
    const supportMentions = privacy.match(/support@volyume\.app/g) || [];
    expect(supportMentions.length).toBeGreaterThanOrEqual(2);
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

  // Founder order 2026-09-26 (register D194 addendum 2): workouts are shared
  // to Community by default, for new and existing members, and the privacy
  // policy must say so. Every copy (in-app, the two hosted pages, the
  // Markdown source and the docs/web mirror) carries the disclosure, the
  // way to turn it off, the under-18 audience and the public-link reach,
  // and none may claim again that Volyume has no community.
  test('every privacy policy copy discloses default-on Community sharing', () => {
    const copies = {
      inApp: readRepoFile('src', 'screens', 'PrivacyPolicyScreen.js'),
      html: readRepoFile('public', 'privacy.html'),
      htmlIndex: readRepoFile('public', 'privacy', 'index.html'),
      markdown: readRepoFile('public', 'privacy-policy.md'),
      docsWeb: readRepoFile('docs', 'web', 'privacy.html'),
    };
    for (const [name, text] of Object.entries(copies)) {
      const flat = text.replace(/\s+/g, ' ');
      expect({ name, ok: /Your workouts are shared by default\./.test(flat) }).toEqual({ name, ok: true });
      expect({ name, ok: /Share what I did/.test(flat) }).toEqual({ name, ok: true });
      expect({ name, ok: /if you are under 18 only your followers can/.test(flat) }).toEqual({ name, ok: true });
      expect({ name, ok: /opened from a link by people who do not use Volyume/.test(flat) }).toEqual({ name, ok: true });
      expect({ name, ok: /It never includes your body weight, measurements, food diary, photos or check-ins\./.test(flat) }).toEqual({ name, ok: true });
      expect({ name, bad: /no community/i.test(flat) }).toEqual({ name, bad: false });
    }
    // The three hosted HTML copies are the same file.
    expect(copies.htmlIndex).toBe(copies.html);
    expect(copies.docsWeb).toBe(copies.html);
  });

  // Both policy copies promise an in-app notice of a material change. The
  // 2.3.0 What's new sheet carries it, first, to everyone who updates.
  test('the policy change is announced in the app, as the policy promises', () => {
    const sheet = readRepoFile('src', 'components', 'WhatsNewSheet.js');
    const entry = sheet.slice(sheet.indexOf("'2.3.0': ["), sheet.indexOf('],', sheet.indexOf("'2.3.0': [")));
    const first = (entry.match(/text: '([^']*)'/) || [])[1] || '';
    expect(first).toMatch(/^Our privacy policy now covers Community/);
    expect(first).toContain('how to turn sharing off');
    expect(first).toContain('Settings, under Privacy and legal');
  });

  test('store listing drafts include current progress photo, nutrition and diagnostic disclosures', () => {
    const appStore = readRepoFile('docs', 'APP_STORE_CONNECT_LISTING.md');
    const playStore = readRepoFile('docs', 'PLAY_STORE_LISTING.md');
    const combined = `${appStore}\n${playStore}`;

    expect(combined).toContain('Volyume Score');
    expect(combined).toContain('Progress photo metadata');
    expect(combined).toContain('Nutrition / food logs');
    expect(combined).toContain('Crash Data and Performance Data');
    expect(combined).not.toContain('Crash data or performance data sent off-device');
  });
});

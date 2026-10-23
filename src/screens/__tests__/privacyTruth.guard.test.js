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
    // RE-ANCHORED 2026-10-15 (register D229, video shares): the policy gained
    // its workout-video line (device-only, never uploaded, deleted with the
    // workout), so the date moved with it.
    // RE-ANCHORED 2026-10-17 (member email, founder decision the same day):
    // the policy gained its News emails section, so the date moved with it.
    expect(privacy).toContain("LAST_UPDATED = '17 October 2026'");
    expect(privacy).toMatch(/Volyume Score is a simple\s+progress read/);
    expect(privacy).toContain('not a DEXA scan, diagnosis, medical assessment, or medical advice');
    expect(privacy).toContain('progress photo metadata and Volyume Score analysis metadata');
    expect(privacy).toContain('private photo image files');
    expect(data).toContain('Back up app data (JSON)');
    expect(data).toContain('photo image files stay on this device');
    expect(data).toContain('Workout sets only');
  });

  // Member email (founder decision 2026-10-17): members get news, short surveys and
  // the occasional survey by email unless they turn it off, in Settings or
  // from any email. The in-app policy says so, and the Settings switch and the
  // sign-up notice carry the same promise.
  test('the in-app policy has a News emails section saying members can turn it off', () => {
    const flat = readRepoFile('src', 'screens', 'PrivacyPolicyScreen.js').replace(/\s+/g, ' ');
    expect(flat).toContain('<Section title="News emails">');
    expect(flat).toContain('Volyume emails members about new features, short surveys and a weekly summary.');
    expect(flat).toContain('You get these emails unless you turn them off');
    expect(flat).toContain('in Settings, under Privacy and legal, or with the unsubscribe link in any email');
    expect(flat).toContain("No news emails are sent while Volyume's safety check has paused your calorie changes");
    // Founder order 2026-10-17: the team's member list shows the last day the
    // app was opened, its version and workout counts (never their content).
    expect(flat).toContain('To choose who to email, the team can see the last day you opened the app, your app version and how many workouts you logged recently, never what was in them.');
    const settings = readRepoFile('src', 'screens', 'SettingsPrivacyScreen.js');
    expect(settings).toContain('MEMBER_EMAIL_SWITCH_LABEL');
    expect(settings).toContain('<SectionHeader title="Email" />');
    const sheet = readRepoFile('src', 'components', 'auth', 'AuthSheet.js');
    expect(sheet).toContain('MEMBER_EMAIL_SIGNUP_NOTICE');
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
  // What's new sheet carries it, first, in every version since 2.8.0 (the
  // sheet shows only the running version's notes, so a person updating
  // straight from 2.5.0 to the running version sees only that entry).
  // 2.8.0 leads with it; 2.9.0 (trimmed to two entries on the founder's
  // word), 2.10.0, 2.11.0, 2.12.0, 2.13.0, 2.14.0, 2.15.0 and 2.16.0 carry it inside the Community line.
  test.each(['2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0', '2.15.0', '2.16.0'])('the policy change is announced in the app in %s, as the policy promises', (version) => {
    const sheet = readRepoFile('src', 'components', 'WhatsNewSheet.js');
    const start = sheet.indexOf(`'${version}': [`);
    expect(start).toBeGreaterThan(-1);
    const entry = sheet.slice(start, sheet.indexOf('],', start));
    expect(entry).toContain('Our privacy policy now covers Community');
    expect(entry).toContain('how to turn sharing off');
    expect(entry).toContain('Settings, under Privacy and legal');
  });
  // Register D229 (2026-10-15): workout videos are a new kind of data the
  // policy must name, with the three promises every copy makes about them
  // (device only, never uploaded, deleted with the workout), and the 2.16.0
  // notes announce the change in the app as the policy promises.
  test('every privacy policy copy discloses workout videos as device-only, never uploaded, deleted with the workout', () => {
    const copies = {
      inApp: readRepoFile('src', 'screens', 'PrivacyPolicyScreen.js'),
      html: readRepoFile('public', 'privacy.html'),
      htmlIndex: readRepoFile('public', 'privacy', 'index.html'),
      markdown: readRepoFile('public', 'privacy-policy.md'),
      docsWeb: readRepoFile('docs', 'web', 'privacy.html'),
      locked: readRepoFile('docs', 'PRIVACY_CONSENT_LOCKED.md'),
    };
    for (const [name, text] of Object.entries(copies)) {
      const flat = text.replace(/\s+/g, ' ');
      expect({ name, ok: /video/i.test(flat) }).toEqual({ name, ok: true });
      expect({ name, ok: /never uploaded/.test(flat) }).toEqual({ name, ok: true });
      expect({ name, ok: /deleted (when you delete (that|the)|with the) workout/.test(flat) }).toEqual({ name, ok: true });
      expect({ name, bad: /\bclips?\b/i.test(flat) }).toEqual({ name, bad: false });
    }
    const sheet = readRepoFile('src', 'components', 'WhatsNewSheet.js');
    const start = sheet.indexOf("'2.16.0': [");
    const entry = sheet.slice(start, sheet.indexOf('],', start));
    expect(entry).toContain('Videos stay on your phone, are never uploaded, and are deleted with the workout.');
    expect(entry).toContain('Our privacy policy now covers Community and your workout videos');
    // 2.17.0 (D229 addenda 15 and 17): one videos line carries recording,
    // sharing on a session or a PR, the keep window with how to keep a video
    // and where to change the days, and the privacy line.
    const start17 = sheet.indexOf("'2.17.0': [");
    const entry17 = sheet.slice(start17, sheet.indexOf('],', start17));
    expect(entry17).toContain('A video is kept for 7 days unless you tap Keep on it, and you can change that in Settings, under Your data.');
    expect(entry17).toContain('share it the way you share an image: on your session or on a PR');
    expect(entry17).toContain('Videos stay on your phone and are never uploaded');
    expect(entry17).toContain('Settings, under Privacy and legal');
    // 2.18.0 (D229 addenda 17 and 18): the videos line carries the share
    // screen's video, play and trim, the keep window and the privacy line.
    const start18 = sheet.indexOf("'2.18.0': [");
    expect(start18).toBeGreaterThan(-1);
    const entry18 = sheet.slice(start18, sheet.indexOf('],', start18));
    expect(entry18).toContain('share it the way you share an image');
    expect(entry18).toContain('A video is kept for 7 days unless you tap Keep on it, and you can change that in Settings, under Your data.');
    expect(entry18).toContain('Videos stay on your phone and are never uploaded');
    expect(entry18).toContain('Settings, under Privacy and legal');
    expect(entry18).toContain('Food has been rebuilt.');
    expect({ bad: /\bclips?\b/i.test(entry18) }).toEqual({ bad: false });
    // 2.19.0 (food audit 2026-10-16): the same videos line with its privacy
    // line, and the food line naming notes, portions, the history import and
    // a recipe's cooked weight.
    const start19 = sheet.indexOf("'2.19.0': [");
    expect(start19).toBeGreaterThan(-1);
    const entry19 = sheet.slice(start19, sheet.indexOf('],', start19));
    expect(entry19).toContain('share it the way you share an image');
    expect(entry19).toContain('A video is kept for 7 days unless you tap Keep on it, and you can change that in Settings, under Your data.');
    expect(entry19).toContain('Videos stay on your phone and are never uploaded');
    expect(entry19).toContain('Settings, under Privacy and legal');
    expect(entry19).toContain('Food has been rebuilt.');
    expect(entry19).toContain('add a note to any food');
    expect(entry19).toContain('import your food history');
    expect(entry19).toContain("add a recipe\\'s cooked weight to log it in grams");
    expect({ bad: /\bclips?\b/i.test(entry19) }).toEqual({ bad: false });
    // 2.20.0 (founder order 2026-10-17, high level): the logger, the videos
    // line with its privacy line, and Community.
    const start20 = sheet.indexOf("'2.20.0': [");
    expect(start20).toBeGreaterThan(-1);
    const entry20 = sheet.slice(start20, sheet.indexOf('],', start20));
    expect(entry20).toContain('The workout logger has been completely revamped.');
    expect(entry20).toContain('Record videos of your sets and share them');
    expect(entry20).toContain('Videos stay on your phone and are never uploaded');
    expect(entry20).toContain('Settings, under Privacy and legal');
    expect(entry20).toContain('Community has been improved');
    expect({ bad: /\bclips?\b/i.test(entry20) }).toEqual({ bad: false });
    // 3.2.0: founder, "Keep the same sheet and details": the logger, videos and Community.
    const start32 = sheet.indexOf("'3.2.0': [");
    expect(start32).toBeGreaterThan(-1);
    const entry32 = sheet.slice(start32, sheet.indexOf('],', start32));
    expect(entry32).toContain('The workout logger has been completely revamped.');
    expect(entry32).toContain('Record videos of your sets and share them on social media with your workout stats on top: your best lifts, PRs, total weight lifted and more. Add a filter, a quote or your own words, and trim it to the best part. Your videos stay private on your device unless you choose to share them.');
    // Founder 2026-10-20: plain British English, no technical terms ("PR is
    // fine, technical terms is not"). Users do not know our internal names.
    expect(entry32).not.toMatch(/share card/i);
    expect(entry32).toContain('Community has been improved');
    // Founder 2026-10-20: private on the device unless shared; "never
    // uploaded" is untrue once the person shares a video, and no
    // privacy-policy wording.
    expect(entry32).not.toMatch(/never uploaded|privacy policy|Privacy and legal/i);
    expect({ bad: /\bclips?\b|email|plan again/i.test(entry32) }).toEqual({ bad: false });
    // 3.4.0 (2026-10-21): 3.3.0 build 94 was rejected by App Store Connect,
    // so the same four lines ship as 3.4.0.
    const start34 = sheet.indexOf("'3.4.0': [");
    expect(start34).toBeGreaterThan(-1);
    const entry34 = sheet.slice(start34, sheet.indexOf('],', start34));
    // D231 (owner 2026-10-23, "3.4.0 plus a What's new line"): the layout line
    // leads 3.4.0 and is not on 3.3.0.
    expect(entry34).toContain("{ icon: 'grid-outline', text: 'Progress now sits inside Coach, and Today shows only what needs you.' }");
    expect(entry34.indexOf('Progress now sits inside Coach')).toBeLessThan(entry34.indexOf('More ways to sign in'));
    expect(entry34).toContain('More ways to sign in');
    expect(entry34).toContain('oily fish meals a week');
    expect(entry34).toContain('Settings are grouped more clearly');
    expect(entry34).not.toMatch(/privacy policy|Privacy and legal|OAuth|identity|OTA|over the air|\u2014/i);
    // 3.3.0 (2026-10-21): new user-facing features only, plain words, no
    // technical terms and no privacy-policy wording (founder 2026-10-20).
    const start33 = sheet.indexOf("'3.3.0': [");
    expect(start33).toBeGreaterThan(-1);
    const entry33 = sheet.slice(start33, sheet.indexOf('],', start33));
    expect(entry33).toContain('More ways to sign in');
    expect(entry33).toContain('oily fish meals a week');
    expect(entry33).toContain('Settings are grouped more clearly');
    expect(entry33).not.toContain('Progress now sits inside Coach');
    expect(entry33).not.toMatch(/privacy policy|Privacy and legal|OAuth|identity|OTA|over the air|\u2014/i);
    expect({ bad: /\bclips?\b|email address|plan again/i.test(entry33) }).toEqual({ bad: false });
    // 3.1.0: the Android setup fix, with the same three founder lines.
    const start31 = sheet.indexOf("'3.1.0': [");
    expect(start31).toBeGreaterThan(-1);
    const entry31 = sheet.slice(start31, sheet.indexOf('],', start31));
    expect(entry31).toContain('The workout logger has been completely revamped.');
    expect(entry31).toContain('Videos stay on your phone and are never uploaded');
    expect(entry31).toContain('Settings, under Privacy and legal');
    expect(entry31).toContain('Community has been improved');
    expect({ bad: /\bclips?\b|email|plan again/i.test(entry31) }).toEqual({ bad: false });
    // 3.0.0: the same three founder lines.
    const start22 = sheet.indexOf("'3.0.0': [");
    expect(start22).toBeGreaterThan(-1);
    const entry22 = sheet.slice(start22, sheet.indexOf('],', start22));
    expect(entry22).toContain('The workout logger has been completely revamped.');
    expect(entry22).toContain('Videos stay on your phone and are never uploaded');
    expect(entry22).toContain('Community has been improved');
    expect({ bad: /\bclips?\b|email|plan again/i.test(entry22) }).toEqual({ bad: false });
    // 2.21.0 (founder order 2026-10-17): exactly the three founder lines.
    const start21 = sheet.indexOf("'2.21.0': [");
    expect(start21).toBeGreaterThan(-1);
    const entry21 = sheet.slice(start21, sheet.indexOf('],', start21));
    expect(entry21).toContain('The workout logger has been completely revamped.');
    expect(entry21).toContain('Record videos of your sets and share them');
    expect(entry21).toContain('Videos stay on your phone and are never uploaded');
    expect(entry21).toContain('Settings, under Privacy and legal');
    expect(entry21).toContain('Community has been improved');
    expect({ bad: /\bclips?\b|email|plan again/i.test(entry21) }).toEqual({ bad: false });
  });
  test('the running version has a What\'s new entry', () => {
    const app = JSON.parse(readRepoFile('app.json'));
    const sheet = readRepoFile('src', 'components', 'WhatsNewSheet.js');
    expect(sheet).toContain(`'${app.expo.version}': [`);
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

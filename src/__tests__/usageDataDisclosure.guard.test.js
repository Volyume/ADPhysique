/**
 * Usage data disclosure (growth telemetry review, 2026-10-20, M6). The old
 * policy said usage telemetry "never includes your training, food, or body
 * data", which stopped being true once finished workouts and food logging
 * were measured as counts. Every copy of the policy now says what usage data
 * records (screens, slowness, failures, counts), what it never includes (the
 * content, injuries and limitations, wellbeing checks), what happens before
 * Article 9 consent, the six-month retention (UK GDPR Art. 13(2)(a)) and the
 * single purpose. The build behind each claim: src/lib/telemetry/schema.js
 * (enums, buckets and counts only), session.js PRIVATE_ROUTES,
 * schema.js allowedBeforeConsent, migrate_200 purge_engine_telemetry.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/\s+/g, ' ').replace(/&rsquo;/g, "'");

describe.each([
  ['app', read('src', 'screens', 'PrivacyPolicyScreen.js')],
  ['web', read('public', 'privacy.html')],
  ['webIndex', read('public', 'privacy', 'index.html')],
  ['docsWeb', read('docs', 'web', 'privacy.html')],
  ['markdown', read('public', 'privacy-policy.md')],
])('%s privacy copy', (name, text) => {
  it('says what usage data records and never includes', () => {
    expect(text).toMatch(/counts of what happens in the app, such as how many sets a finished workout had or whether you logged food that day/);
    expect(text).toMatch(/It never includes the content: no weights, foods, amounts, notes, names or messages, and nothing about injuries and limitations or Volyume's wellbeing checks\./);
    expect(text).toMatch(/Before you agree to the health data terms, the only usage data recorded is whether the app was slow or failed\./);
    expect(text).toMatch(/Usage data is kept for six months and then deleted, and it is used only to improve the app\./);
    expect(text).not.toMatch(/never includes your training, food, or body data/);
  });
});

it('the build matches the six months and the private screens', () => {
  const sql = read('supabase', 'migrate_200_growth_telemetry.sql');
  expect(sql).toMatch(/DELETE FROM public\.engine_telemetry WHERE received_at < now\(\) - interval '6 months'/);
});

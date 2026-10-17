/**
 * Member email, website half (docs/member-email-2026-10-17/SPEC.md section 3).
 *
 * Pins, as source-level guards over the static pages in public/:
 *  - the private members page, the survey page and the unsubscribe page load
 *    no external script (the members page may load only its own members.js);
 *  - they call only the two edge functions (member-email-admin from the
 *    members page; member-email-public from the survey and unsubscribe pages)
 *    plus, for the legacy paths that must keep working, the existing REST
 *    endpoints marketing_survey_responses and marketing_email_optout;
 *  - the members page is noindex, keeps its session in sessionStorage only,
 *    renders server text with textContent, and previews in a sandboxed
 *    iframe without allow-scripts;
 *  - the visible copy has no em dash and no contractions (founder voice
 *    rules);
 *  - the legacy five-question survey still posts q_overall .. q_more (the
 *    fix in 49b918192 must not regress);
 *  - the privacy pages carry the news-email section and the three hosted
 *    HTML copies stay byte-identical (privacyTruth.guard.test.js relies on it).
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const membersHtml = read('public', 'members', 'index.html');
const membersJs = read('public', 'members', 'members.js');
const surveyHtml = read('public', 'survey', 'index.html');
const unsubHtml = read('public', 'email', 'unsubscribe', 'index.html');

const REF = 'sujrylzzxcqxxfygptns';
const FN = `https://${REF}.supabase.co/functions/v1/`;
const ADMIN_URL = `${FN}member-email-admin`;
const PUBLIC_URL = `${FN}member-email-public`;
const SURVEY_REST = `https://${REF}.supabase.co/rest/v1/marketing_survey_responses`;
const OPTOUT_REST = `https://${REF}.supabase.co/rest/v1/marketing_email_optout`;

const stripBlocks = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const visibleText = (html) =>
  stripBlocks(html).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
const inlineScript = (html) => (html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n');
const stringLiterals = (code) => (code.match(/"((?:[^"\\\n]|\\.)*)"/g) || []).map((s) => s.slice(1, -1));
const scriptSrcs = (html) => [...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]);
const urlsIn = (code) => code.match(/https?:\/\/[a-z0-9][^\s"'`)<>\\]*/gi) || [];

const CONTRACTION = /\b(?:\w+n't|\w+'(?:re|ve|ll|d|m)|(?:it|that|there|here|what|let|who|he|she)'s)\b/i;

const PAGES = {
  members: { html: membersHtml, code: membersJs + '\n' + inlineScript(membersHtml) },
  survey: { html: surveyHtml, code: inlineScript(surveyHtml) },
  unsubscribe: { html: unsubHtml, code: inlineScript(unsubHtml) },
};

describe('member email website pages', () => {
  test('no page loads an external script', () => {
    expect(scriptSrcs(membersHtml)).toEqual(['members.js']);
    expect(scriptSrcs(surveyHtml)).toEqual([]);
    expect(scriptSrcs(unsubHtml)).toEqual([]);
    for (const { html } of Object.values(PAGES)) {
      expect(html).not.toMatch(/<script[^>]*\bsrc=["'](?:https?:)?\/\//i);
      expect(html).not.toMatch(/<link[^>]*rel=["']stylesheet["']/i);
      expect(html).not.toMatch(/cdn|googleapis|jsdelivr|unpkg/i);
    }
    expect(membersJs).not.toMatch(/\bimport\s*\(|\bimportScripts\b|\beval\s*\(|new Function\(/);
  });

  test('the members page calls only member-email-admin', () => {
    const urls = urlsIn(membersJs);
    const backend = urls.filter((u) => u.includes('supabase.co'));
    expect(new Set(backend)).toEqual(new Set([ADMIN_URL]));
    expect((membersJs.match(/\bfetch\(/g) || []).length).toBe(1);
    expect(membersJs).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket/);
    expect(membersJs).not.toMatch(/\/rest\/v1\/|\/auth\/v1\//);
    expect(inlineScript(membersHtml).trim()).toBe('');
    expect(membersJs).not.toMatch(/apikey|anon/i);
  });

  test('the members page sends only the actions the spec names', () => {
    const spec = [
      'request_login', 'exchange', 'overview', 'save_campaign', 'delete_campaign', 'preview',
      'send_test', 'send_campaign', 'save_survey', 'set_survey_status', 'survey_results',
      'export_survey', 'list_members', 'exclude', 'include', 'list_exclusions',
    ];
    const used = [...membersJs.matchAll(/\bcall\("([a-z_]+)"/g)].map((m) => m[1]);
    for (const a of used) expect(spec).toContain(a);
    for (const a of spec) expect(used).toContain(a);
    expect(membersJs).toMatch(/expected_recipients: live/);
    expect(membersJs).toMatch(/body\.session = state\.session/);
  });

  test('the members page is noindex and keeps its session in sessionStorage only', () => {
    expect(membersHtml).toMatch(/<meta name="robots" content="[^"]*noindex/i);
    expect(membersJs).toMatch(/sessionStorage/);
    expect(membersJs).not.toMatch(/localStorage|document\.cookie|indexedDB/);
    expect(membersJs).toMatch(/replaceState/);
    expect(read('public', 'index.html')).not.toMatch(/\/members/);
  });

  test('server text is written as text, and the preview is a sandboxed iframe', () => {
    expect(membersJs).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    expect(membersJs).toMatch(/srcdoc/);
    expect(membersJs).toMatch(/sandbox: ""/);
    expect(membersJs).not.toMatch(/allow-scripts|allow-same-origin/);
  });

  test('send repeats the live number and passes it to the server', () => {
    expect(membersJs).toMatch(/"Send to " \+ plural\(n, "member", "members"\)/);
    expect(membersJs).toMatch(/title: "Send to " \+ plural\(live, "member", "members"\)/);
    expect(membersJs).toMatch(/expected_recipients: live/);
    // Copy check mirrors the server (em dash) and explains why Send is off.
    expect(membersJs).toMatch(/EM_DASH = new RegExp\(String\.fromCharCode\(8212\)\)/);
    expect(membersJs).toMatch(/has an em dash\. Use a comma/);
    expect(membersJs).toMatch(/Send is switched off for now/);
  });

  test('the People section has its pager, statuses, wellbeing line and exclusion controls', () => {
    expect(membersJs).toMatch(/PAGE_SIZE = 50/);
    for (const label of ['Receives emails', 'Excluded by you', 'Turned off', 'Paused', 'Email not confirmed']) {
      expect(membersJs).toContain(`"${label}"`);
    }
    expect(membersJs).toContain('Volyume holds emails for this person for now.');
    expect(membersJs).toContain('Exclude an email address');
    expect(membersJs).toContain('"Excluded"');
    expect(membersJs).toContain('will receive this');
    // A paused person shows the word and the one line, nothing more.
    expect(membersJs).not.toMatch(/ED flag|eating|calm mode is on for/i);
  });

  test('the survey and unsubscribe pages call only member-email-public plus their legacy REST endpoint', () => {
    const surveyBackend = urlsIn(PAGES.survey.code).filter((u) => u.includes('supabase.co'));
    expect(new Set(surveyBackend)).toEqual(new Set([PUBLIC_URL, SURVEY_REST]));
    const unsubBackend = urlsIn(PAGES.unsubscribe.code).filter((u) => u.includes('supabase.co'));
    expect(new Set(unsubBackend)).toEqual(new Set([PUBLIC_URL, OPTOUT_REST]));
    expect(PAGES.survey.code).not.toContain('member-email-admin');
    expect(PAGES.unsubscribe.code).not.toContain('member-email-admin');
    for (const code of [PAGES.survey.code, PAGES.unsubscribe.code]) {
      expect(code).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket|eval\(/);
    }
  });

  test('every URL in page code is on the allowed list', () => {
    const allowed = [
      /^https:\/\/sujrylzzxcqxxfygptns\.supabase\.co\//,
      /^https:\/\/volyume\.app\//,
      /^https:\/\/play\.google\.com\//,
      /^https:\/\/example\.com/,
    ];
    for (const [name, { code }] of Object.entries(PAGES)) {
      for (const u of urlsIn(code)) {
        expect({ name, u, ok: allowed.some((re) => re.test(u)) }).toEqual({ name, u, ok: true });
      }
    }
  });

  test('the legacy survey still posts q_overall to q_more and still works with no id', () => {
    for (const col of ['q_overall', 'q_keeper', 'q_confusing', 'q_missing', 'q_more']) {
      expect(surveyHtml).toMatch(new RegExp(`\\b${col}:`));
    }
    expect(surveyHtml).toContain(SURVEY_REST);
    expect(surveyHtml).toMatch(/"Prefer": "return=minimal"/);
    expect(surveyHtml).toContain('id="survey-form"');
    expect(surveyHtml).toMatch(/if \(surveyId\) \{[\s\S]*?\.add\("hidden"\)/);
    // The legacy form is visible by default (no hidden class on it).
    expect(surveyHtml).toMatch(/<div id="legacy">/);
    expect(surveyHtml).toMatch(/<div id="generic" class="hidden">/);
    // The generic renderer: get_survey then submit_survey, closed copy.
    expect(surveyHtml).toContain('action=get_survey&id=');
    expect(surveyHtml).toContain('action: "submit_survey"');
    expect(surveyHtml).toContain('This survey is closed. Thank you for looking.');
  });

  test('the unsubscribe page keeps its legacy path and says the new sentence', () => {
    expect(unsubHtml).toContain(OPTOUT_REST);
    expect(unsubHtml).toContain('param("u")');
    expect(unsubHtml).toContain('action: "unsubscribe"');
    expect(unsubHtml).toContain('You will not get news emails from Volyume any more. You can turn them back on in the app, in Settings.');
  });

  test('no em dash and no contractions in any page copy', () => {
    const files = { membersHtml, membersJs, surveyHtml, unsubHtml };
    for (const [name, text] of Object.entries(files)) {
      expect({ name, dash: /\u2014|&mdash;|&#8212;/.test(text) }).toEqual({ name, dash: false });
    }
    for (const [name, { html, code }] of Object.entries(PAGES)) {
      const copy = [visibleText(html), ...stringLiterals(code)].join('\n');
      const hit = copy.match(CONTRACTION);
      expect({ name, contraction: hit ? hit[0] : null }).toEqual({ name, contraction: null });
    }
  });

  test('copy is British English and says what it means', () => {
    const copy = [visibleText(membersHtml), ...stringLiterals(membersJs)].join('\n');
    expect(copy).not.toMatch(/\b(color|behavior|optimize|organization|center)\b/i);
    expect(copy).toContain('That link has expired. Ask for a new one.');
    expect(copy).toContain('Check your email');
  });

  test('each People row shows last used, the app version and the workout counts, as information only', () => {
    expect(membersJs).toContain('"Last used "');
    expect(membersJs).toContain('"Not seen yet"');
    expect(membersJs).toContain('"App version "');
    expect(membersJs).toContain('" this week, "');
    expect(membersJs).toContain('" in 30 days"');
    expect(membersJs).toContain('", last on "');
    expect(membersJs).toContain('"Workouts: none logged yet"');
    // The rows are displayed only: nothing on the page sends these fields back
    // to the server or filters the audience by them.
    expect(membersJs).not.toMatch(/[{,]\s*["']?(last_seen_day|app_version|workouts_7d|workouts_30d|last_workout_at)["']?\s*:/);
  });

  test('the news-email section is in every privacy copy, with the founder-ruled basis', () => {
    const html = read('public', 'privacy.html');
    const md = read('public', 'privacy-policy.md');
    expect(read('public', 'privacy', 'index.html')).toBe(html);
    expect(read('docs', 'web', 'privacy.html')).toBe(html);
    for (const text of [html.replace(/\s+/g, ' '), md.replace(/\s+/g, ' ')]) {
      expect(text).toMatch(/News emails/);
      expect(text).toMatch(/When you create an account you are told that Volyume will email you about new features, offers and the occasional short survey/);
      expect(text).toMatch(/News and offers by email/);
      expect(text).toMatch(/Unsubscribe link in every email/);
      expect(text).toMatch(/Resend sends these emails for us from Ireland and keeps its email records in the United States/);
      expect(text).toMatch(/Deleting your account deletes all of this/);
      expect(text).toContain('To choose who to email, the team can see the last day you opened the app, your app version and how many workouts you logged recently, never what was in them.');
      expect(text).toMatch(/consent history|record of each time you turned them on or off/);
      expect(/\u2014/.test(text)).toBe(false);
    }
  });
});

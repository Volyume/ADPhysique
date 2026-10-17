// Deno tests for member email v2 in ./memberEmail.ts (PLAN-V2, migrate_199):
// the prefs token, block validation, the block renderer (escaping, https
// only, merge fields inside text only, the update prompt only below the
// latest version, the footer always), the claims lint against
// CLAIMS-STANDARDS, the weekly summary voice, Svix signatures, segment rules,
// UK quiet hours, the A/B winner, image sniffing and survey scales. Each case
// is written to fail if the rule it pins is broken.

import {
  abWinner,
  applyTokens,
  type Block,
  buildWeeklySummary,
  claimsLint,
  cleanFirstName,
  decodeBase64Bounded,
  inQuietHours,
  makePrefsToken,
  makeUnsubscribeToken,
  npsScore,
  renderBlocksEmail,
  sniffImageType,
  type SurveyQuestion,
  surveyResults,
  validateAnswers,
  validateBlocks,
  validateChecklist,
  validateQuestions,
  validateSegmentRules,
  verifySvixSignature,
  verifyToken,
  webhookEventType,
} from "./memberEmail.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const SECRET = "c".repeat(64);
const USER = "2f1c5a7e-3b4d-4c8e-9f10-1a2b3c4d5e6f";
const SURVEY = "7d9e1f20-4a5b-4c6d-8e7f-901a2b3c4d5e";
const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const LINKS = {
  unsubscribeUrl: "https://volyume.app/email/unsubscribe/?t=u",
  preferencesUrl: "https://volyume.app/email/preferences/?t=p",
};

// ─── Tokens ───────────────────────────────────────────────────────────

Deno.test("the prefs token round trips and is never an unsubscribe or admin token", async () => {
  const prefs = await makePrefsToken(USER, SECRET, NOW);
  assert((await verifyToken(prefs, SECRET, "prefs", NOW))?.u === USER, "prefs token must round trip");
  assert(await verifyToken(prefs, SECRET, "unsub", NOW) === null, "a prefs token must not unsubscribe");
  assert(await verifyToken(prefs, SECRET, "admin", NOW) === null, "a prefs token is not an admin session");
  const unsub = await makeUnsubscribeToken(USER, SECRET, NOW);
  assert(await verifyToken(unsub, SECRET, "prefs", NOW) === null, "an unsub token is not a prefs token");
});

// ─── Blocks ───────────────────────────────────────────────────────────

const GOOD: unknown[] = [
  { type: "heading", level: 1, text: "What is new" },
  { type: "paragraph", text: "Hi {{first_name|there}}, the **food diary** has a [new view](https://volyume.app/news)." },
  { type: "image", url: "https://volyume.app/a.png", alt: "The new view on a phone", width: 400 },
  { type: "button", label: "Read more", url: "https://volyume.app/news" },
  { type: "divider" },
  { type: "spacer", size: "medium" },
  { type: "update_prompt" },
  { type: "share" },
];

Deno.test("valid blocks pass and are normalised", () => {
  const v = validateBlocks(GOOD);
  assert(v.ok && v.value.length === GOOD.length, "the house blocks must validate");
});

Deno.test("blocks refuse missing alt text, unsafe links, unknown keys and types, and two surveys", () => {
  const cases: [unknown, string][] = [
    [[{ type: "image", url: "https://volyume.app/a.png", alt: "" }], "image_alt_required"],
    [[{ type: "image", url: "https://volyume.app/a.png" }], "image_alt_required"],
    [[{ type: "image", url: "http://volyume.app/a.png", alt: "x" }], "image_url_not_https"],
    [[{ type: "button", label: "Go", url: "javascript:alert(1)" }], "link_not_https"],
    [[{ type: "paragraph", text: "[x](http://evil.test)" }], "link_not_https"],
    [[{ type: "paragraph", text: "x", onclick: "y" }], "bad_block_key"],
    [[{ type: "script", text: "x" }], "bad_block_type"],
    [[{ type: "heading", level: 3, text: "x" }], "bad_heading_level"],
    [[{ type: "survey", survey_id: SURVEY }, { type: "survey", survey_id: SURVEY }], "one_survey_per_email"],
    [[], "bad_block_count"],
    [Array.from({ length: 61 }, () => ({ type: "divider" })), "bad_block_count"],
  ];
  for (const [raw, error] of cases) {
    const v = validateBlocks(raw);
    assert(!v.ok && v.error === error, `expected ${error}, got ${v.ok ? "ok" : v.error}`);
  }
});

// ─── Rendering ────────────────────────────────────────────────────────

function render(blocks: unknown[], ctx = {}, links: Record<string, unknown> = LINKS) {
  const v = validateBlocks(blocks);
  assert(v.ok, `blocks must validate: ${v.ok ? "" : v.error}`);
  return renderBlocksEmail({ subject: "Hello {{first_name|there}}", preheader: "Short", blocks: v.value }, ctx, links as typeof LINKS);
}

Deno.test("the renderer escapes everything and merges names inside text only", () => {
  const out = render([{ type: "paragraph", text: "Hi {{first_name|there}} <script>alert(1)</script>" }],
    { firstName: "Sam" });
  assert(out.html.includes("Hi Sam &lt;script&gt;"), "markup must be escaped and the name merged");
  assert(!out.html.includes("<script>"), "no script tag may survive");
  assert(out.subject === "Hello Sam", "the subject takes the name");
  const injected = render([{ type: "paragraph", text: "Hi {{first_name|there}}" }], { firstName: "[x](https://evil.test)" });
  assert(!injected.html.includes("evil.test"), "a name that looks like a link is refused, never rendered");
  assert(injected.html.includes("Hi there"), "a refused name falls back");
  const fallback = render([{ type: "paragraph", text: "Hi {{first_name|there}}" }], { firstName: "   " });
  assert(fallback.html.includes("Hi there"), "an empty name uses the fallback");
  assert(cleanFirstName("a@b.c") === null && cleanFirstName("Jo") === "Jo", "names with addresses are refused");
  assert(applyTokens("{{years|a year}}", { years: 3 }) === "3 years", "years merge");
  assert(applyTokens("{{years|a year}}", {}) === "a year", "years fall back");
});

Deno.test("the footer, dark mode, language and the plain-text part are always there", () => {
  const out = render(GOOD, { belowLatest: false });
  assert(out.html.includes('<html lang="en-GB" dir="ltr">'), "the root carries en-GB");
  assert(out.html.includes('name="color-scheme" content="light dark"'), "dark-mode meta present");
  assert(out.html.includes("prefers-color-scheme: dark"), "dark-mode styles present");
  assert(out.html.includes('role="presentation"'), "layout tables are presentational");
  assert(out.html.includes("unsubscribe here") && out.html.includes(LINKS.unsubscribeUrl), "unsubscribe link present");
  assert(out.html.includes("Choose which emails you get") && out.html.includes(LINKS.preferencesUrl), "preferences link present");
  assert(out.text.includes(LINKS.unsubscribeUrl) && out.text.includes(LINKS.preferencesUrl), "plain text carries both links");
  assert(out.text.includes("new view (https://volyume.app/news)"), "plain text spells links out");
  assert(out.html.includes('alt="The new view on a phone"'), "alt text rendered");
  assert(!/font-size:1[0-3]px/.test(out.html), "no text below 14px");
  let threw = false;
  try { render(GOOD, {}, { unsubscribeUrl: "", preferencesUrl: LINKS.preferencesUrl }); } catch (_) { threw = true; }
  assert(threw, "no email renders without an unsubscribe link");
});

Deno.test("the update prompt shows only to members below the latest version", () => {
  const blocks = [{ type: "paragraph", text: "News." }, { type: "update_prompt" }];
  assert(!render(blocks, { belowLatest: false }).html.includes("A new version of Volyume is ready"), "hidden at the latest");
  const below = render(blocks, { belowLatest: true, platform: "ios" });
  assert(below.html.includes("A new version of Volyume is ready"), "shown below the latest");
  assert(below.html.includes("apps.apple.com") && !below.html.includes("play.google.com"), "iOS gets the App Store");
  const unknown = render(blocks, { belowLatest: true, platform: null });
  assert(unknown.html.includes("apps.apple.com") && unknown.html.includes("play.google.com"), "unknown platform gets both");
});

Deno.test("a survey block gives one-click answer links for a scale question", () => {
  const first: SurveyQuestion = { id: "q1", type: "nps", prompt: "How likely are you to recommend Volyume?", required: true };
  const out = render([{ type: "paragraph", text: "A quick question." }, { type: "survey", survey_id: SURVEY }], {},
    { ...LINKS, survey: { id: SURVEY, url: `https://volyume.app/survey/?id=${SURVEY}&t=tok`, first } });
  for (const v of ["0", "5", "10"]) assert(out.html.includes(`&amp;q1=${v}"`), `answer link ${v}`);
  const none = render([{ type: "paragraph", text: "x" }, { type: "survey", survey_id: SURVEY }], {});
  assert(!none.html.includes("/survey/"), "no survey link without a survey");
});

// ─── Claims lint ──────────────────────────────────────────────────────

function lintText(text: string, subject = "News from Volyume") {
  const v = validateBlocks([{ type: "paragraph", text }]);
  assert(v.ok, "fixture must validate");
  return claimsLint({ subject, preheader: "A short note", blocks: v.value });
}

Deno.test("clean, calm copy passes with no errors", () => {
  const l = lintText("Hi {{first_name|there}}, the training plan screen now shows each week in full. You can open it from the home tab.");
  assert(l.errors.length === 0, `expected no errors, got ${l.errors.map((e) => e.code).join(",")}`);
  assert(l.manual_checks.length >= 4, "the checks no lint can do are returned for the checklist");
});

Deno.test("every CLAIMS-STANDARDS rule the lint carries blocks its wording", () => {
  const cases: [string, string][] = [
    ["Volyume is calm \u2014 and quiet.", "em_dash"],
    ["Start today!", "exclamation"],
    ["Big news \u{1F4AA}", "emoji"],
    ["A seamless way to log.", "hype_word"],
    ["Unlock your plan.", "hype_word"],
    ["Pick your favorite colour.", "american_spelling"],
    ["We optimized it.", "american_spelling"],
    ["Great for weight loss.", "body_weight"],
    ["Weigh in every morning.", "body_weight"],
    ["Get a beach body.", "body_weight"],
    ["Guaranteed gains in a month.", "outcome_promise"],
    ["See the transformation.", "outcome_promise"],
    ["Before and after photos.", "before_after"],
    ["It helps rehab your knee.", "medical_term"],
    ["Built for wheelchair users.", "population_claim"],
    ["The best app for lifters.", "superiority"],
    ["Join 10,000 lifters.", "unverified_number"],
    ["It replaces your personal trainer.", "coach_replacement"],
    ["It learns you over time.", "ai_framing"],
    ["Only £1.99 a month.", "price_or_trial"],
    ["Start your free trial.", "price_or_trial"],
    ["A special offer for members.", "price_or_trial"],
    ["Try Pro today.", "pro_tier"],
    ["Act now, it ends soon.", "urgency"],
    ["We miss you.", "shame"],
    ["You missed a session.", "shame"],
    ["Your streak broken? Start again.", "shame"],
    ["It has been 23 days.", "shame"],
    ["Whether you are new or experienced, it works.", "audience_sweep"],
    ["It is not just a diary, it is a coach.", "negation_pivot"],
    ["Let's face it, planning is hard.", "scene_setting"],
    ["At the end of the day, it works.", "summary_signoff"],
    ["Your data, forever.", "dramatic_fragment"],
    ["Your data is completely private.", "privacy_absolute"],
    ["Hi {{name|there}}.", "unknown_merge_field"],
    ["Hi {{first_name}}.", "merge_field_fallback"],
  ];
  for (const [text, code] of cases) {
    const l = lintText(text);
    assert(l.errors.some((e) => e.code === code), `"${text}" must raise ${code}; got ${l.errors.map((e) => e.code).join(",")}`);
  }
});

Deno.test("an honest disclaimer is not a medical claim, and warnings stay warnings", () => {
  assert(lintText("Volyume is not medical advice.").errors.length === 0, "a not-medical disclaimer passes");
  const w = lintText("Log your weight training and your calories.");
  assert(w.errors.length === 0, "food words and 'weight training' are not errors");
  assert(w.warnings.some((x) => x.code === "food_word"), "food wording is flagged as a warning");
  const s = claimsLint({ subject: "Hi!", preheader: "x", blocks: [{ type: "paragraph", text: "x" }] });
  assert(s.errors.some((e) => e.code === "exclamation" && e.field === "subject"), "the subject is linted too");
  const link = claimsLint({ subject: "x", preheader: "x", blocks: [{ type: "button", label: "Go", url: "https://elsewhere.test/a" }, { type: "paragraph", text: "x" }] });
  assert(link.warnings.some((x) => x.code === "outside_link"), "a link outside volyume.app and the stores is flagged");
});

Deno.test("phase 1 bodies are linted with the same rules", () => {
  const l = claimsLint({ subject: "News", preheader: "x", body: "A seamless update!" });
  assert(l.errors.some((e) => e.code === "hype_word") && l.errors.some((e) => e.code === "exclamation"), "body rules apply");
  assert(claimsLint({ subject: "News", body: "" }).errors.some((e) => e.code === "required"), "an empty body is refused");
});

// ─── Weekly summary ───────────────────────────────────────────────────

Deno.test("the weekly summary is counts only, calm, and passes the lint for every shape", () => {
  const banned = /miss|weight|kcal|calorie|food|body|streak broken|great job|amazing|!|\u2014/i;
  for (const sessions of [1, 2, 7]) {
    for (const four of [sessions, sessions + 5]) {
      for (const streak of [0, 1, 2, 9]) {
        const s = buildWeeklySummary({ sessions_last_week: sessions, sessions_4w: four, streak_weeks: streak });
        const all = [s.subject, s.preheader ?? "", ...s.blocks.map((b) => ("text" in b ? b.text : ""))].join(" ");
        assert(!banned.test(all), `summary copy must stay calm and health-free: ${all}`);
        const l = claimsLint(s);
        assert(l.errors.length === 0, `summary must pass the lint: ${l.errors.map((e) => e.code).join(",")}`);
        assert(all.includes(`${sessions} session`), "it states the count");
        assert((streak >= 2) === all.includes("each of the last"), "the streak line appears only for two weeks or more");
        assert((four > sessions) === all.includes("four weeks"), "the four-week line appears only when it adds a number");
      }
    }
  }
  const one = buildWeeklySummary({ sessions_last_week: 1, sessions_4w: 1, streak_weeks: 1 });
  assert(one.subject === "Your week in Volyume: 1 session", "singular for one");
  const junk = buildWeeklySummary({ sessions_last_week: -4, sessions_4w: NaN, streak_weeks: 999 } as never);
  assert(!/-|NaN|999/.test(junk.blocks.map((b) => ("text" in b ? b.text : "")).join(" ")), "bad numbers are clamped");
});

// ─── Svix ─────────────────────────────────────────────────────────────

async function svixSign(secretB64: string, id: string, ts: string, body: string): Promise<string> {
  const raw = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return btoa(String.fromCharCode(...sig));
}

Deno.test("Svix signatures: valid passes; tampered, stale, wrong version or wrong secret fail", async () => {
  const secretB64 = btoa("0123456789abcdef0123456789abcdef");
  const secret = `whsec_${secretB64}`;
  const id = "msg_2abc";
  const ts = String(Math.floor(NOW / 1000));
  const body = '{"type":"email.opened","data":{"email_id":"e1"}}';
  const sig = await svixSign(secretB64, id, ts, body);
  assert(await verifySvixSignature(secret, id, ts, `v1,${sig}`, body, NOW), "a valid signature passes");
  assert(await verifySvixSignature(secret, id, ts, `v1,AAAA v1,${sig}`, body, NOW), "any one valid signature passes");
  assert(!await verifySvixSignature(secret, id, ts, `v1,${sig}`, body.replace("opened", "clicked"), NOW), "a changed body fails");
  assert(!await verifySvixSignature(secret, "msg_other", ts, `v1,${sig}`, body, NOW), "a changed id fails");
  assert(!await verifySvixSignature(secret, id, ts, `v1,${sig}`, body, NOW + 6 * 60 * 1000), "a stale timestamp fails");
  assert(!await verifySvixSignature(secret, id, ts, `v2,${sig}`, body, NOW), "an unknown version fails");
  assert(!await verifySvixSignature(`whsec_${btoa("another-secret-another-secret!!")}`, id, ts, `v1,${sig}`, body, NOW), "another secret fails");
  assert(!await verifySvixSignature(secret, null, ts, `v1,${sig}`, body, NOW), "missing headers fail");
  assert(webhookEventType("email.bounced") === "bounced" && webhookEventType("email.received") === null, "event types map");
});

// ─── Segments, checklist, time, A/B, images, surveys ──────────────────

Deno.test("segment rules: the allowed shapes pass, anything else is refused", () => {
  const ok = validateSegmentRules([
    { field: "joined", op: "after", value: "2026-01-01" },
    { field: "last_used", op: "within", value: 30 },
    { field: "app_version", op: "below", value: "1.40.0" },
    { field: "platform", op: "is", value: "ios" },
    { field: "workouts_30d", op: "at_least", value: 4 },
    { field: "community", op: "is" },
    { field: "email_opened", op: "no", value: SURVEY.toUpperCase() },
    { field: "topic", op: "on", value: "surveys" },
  ]);
  assert(ok.ok && ok.value[6].value === SURVEY, "valid rules pass and ids are lower-cased");
  for (const bad of [
    [{ field: "weight", op: "below", value: 80 }], [{ field: "goal", op: "is", value: "cut" }],
    [{ field: "last_used", op: "within", value: 0 }], [{ field: "platform", op: "is", value: "web" }],
    [{ field: "topic", op: "on", value: "offers" }], [{ field: "joined", op: "after", value: "yesterday" }],
    [{ field: "community", op: "is", value: true }], [{ field: "joined", op: "after", value: "2026-01-01", x: 1 }],
    "not an array", Array.from({ length: 21 }, () => ({ field: "community", op: "is" })),
  ]) {
    assert(!validateSegmentRules(bad).ok, `must refuse ${JSON.stringify(bad).slice(0, 60)}`);
  }
});

Deno.test("the send checklist needs every tick", () => {
  assert(validateChecklist({ audience_confirmed: true, topic_confirmed: true, test_sent: true, links_checked: true }).ok, "all ticks pass");
  assert(!validateChecklist({ audience_confirmed: true, topic_confirmed: true, test_sent: true }).ok, "a missing tick fails");
  assert(!validateChecklist({ audience_confirmed: "yes", topic_confirmed: true, test_sent: true, links_checked: true }).ok, "only true counts");
});

Deno.test("quiet hours are UK time across the clock change", () => {
  assert(!inQuietHours(Date.UTC(2026, 9, 17, 12, 0), "21:00", "08:00"), "13:00 BST is not quiet");
  assert(inQuietHours(Date.UTC(2026, 9, 17, 20, 30), "21:00", "08:00"), "21:30 BST is quiet");
  assert(inQuietHours(Date.UTC(2026, 11, 1, 7, 30), "21:00", "08:00"), "07:30 GMT is quiet");
  assert(!inQuietHours(Date.UTC(2026, 11, 1, 8, 0), "21:00", "08:00"), "08:00 GMT is not quiet");
  assert(inQuietHours(Date.UTC(2026, 5, 1, 6, 59), "21:00", "08:00"), "07:59 BST is quiet");
  assert(inQuietHours(NOW, "bad", "08:00"), "a broken setting counts as quiet (fail closed)");
});

Deno.test("the A/B winner: opens, then clicks, then subject A", () => {
  assert(abWinner({ opened: 3, clicked: 0 }, { opened: 5, clicked: 0 }).winner === "b", "more opens wins");
  const clicks = abWinner({ opened: 4, clicked: 2 }, { opened: 4, clicked: 1 });
  assert(clicks.winner === "a" && clicks.reason === "clicks", "clicks break a tie");
  const tie = abWinner({ opened: 1, clicked: 1 }, { opened: 1, clicked: 1 });
  assert(tie.winner === "a" && tie.reason === "tie", "a full tie keeps subject A");
});

Deno.test("images are typed from their bytes and bounded", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  assert(sniffImageType(png) === "image/png", "PNG");
  assert(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])) === "image/jpeg", "JPEG");
  assert(sniffImageType(new TextEncoder().encode("GIF89a....")) === "image/gif", "GIF");
  assert(sniffImageType(new TextEncoder().encode("RIFF....WEBPVP8 ")) === "image/webp", "WebP");
  assert(sniffImageType(new TextEncoder().encode("<svg onload=x>")) === null, "SVG and anything else is refused");
  assert(decodeBase64Bounded(btoa("abc"), 10)?.length === 3, "small base64 decodes");
  assert(decodeBase64Bounded(btoa("x".repeat(20)), 10) === null, "over the bound is refused");
  assert(decodeBase64Bounded("not base64!", 10) === null, "junk is refused");
});

Deno.test("NPS and rating questions validate, store digits and score", () => {
  const qs = validateQuestions([
    { id: "q1", type: "nps", prompt: "How likely?", required: true },
    { id: "q2", type: "rating", prompt: "How useful?", required: false },
  ]);
  assert(qs.ok, "nps and rating validate");
  const a = validateAnswers(qs.value, { q1: 9, q2: "4" });
  assert(a.ok && a.value.q1 === "9" && a.value.q2 === "4", "numbers are stored as digits");
  assert(!validateAnswers(qs.value, { q1: "11" }).ok, "out of scale is refused");
  assert(!validateAnswers(qs.value, { q1: "6", q2: "0" }).ok, "rating is 1 to 5");
  assert(!validateQuestions([{ id: "q1", type: "nps", prompt: "x", required: true, options: ["a"] }]).ok, "nps carries no options");
  const rows = ["10", "9", "8", "3"].map((v) => ({ created_at: "2026-10-17T00:00:00Z", user_id: null, answers: { q1: v } }));
  const r = surveyResults(qs.value, rows).questions[0] as { nps?: { score: number | null } };
  assert(r.nps?.score === 25, `NPS is promoters minus detractors: got ${r.nps?.score}`);
  assert(npsScore({}).score === null, "no answers, no score");
});

Deno.test("block types are typed for the renderer", () => {
  const b: Block[] = [{ type: "preferences" }, { type: "paragraph", text: "x" }];
  const out = renderBlocksEmail({ subject: "x", blocks: b }, {}, LINKS);
  assert(out.html.split(LINKS.preferencesUrl).length - 1 >= 2, "the preferences block links to the page");
});

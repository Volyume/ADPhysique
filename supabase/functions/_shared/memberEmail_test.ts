import {
  csvCell,
  FOOTER_LINK_TEXT,
  lintCampaign,
  makeAdminSession,
  makeSurveyToken,
  makeUnsubscribeToken,
  readBoundedText,
  renderEmail,
  safeHttpsUrl,
  signToken,
  type SurveyQuestion,
  surveyCsv,
  surveyResults,
  validateAnswers,
  validateQuestions,
  validateSurveyMeta,
  verifyToken,
} from "./memberEmail.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const SECRET = "a".repeat(64);
const OTHER_SECRET = "b".repeat(64);
const USER = "2f1c5a7e-3b4d-4c8e-9f10-1a2b3c4d5e6f";
const SURVEY = "7d9e1f20-4a5b-4c6d-8e7f-901a2b3c4d5e";
const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);

// ─── Tokens ───────────────────────────────────────────────────────────

Deno.test("tokens round trip for each purpose", async () => {
  const { session, expires_at } = await makeAdminSession("founder@example.com", SECRET, NOW);
  const admin = await verifyToken(session, SECRET, "admin", NOW);
  assert(admin?.e === "founder@example.com", "admin session must round trip");
  assert(Date.parse(expires_at) === NOW + 12 * 3600 * 1000, "admin session lasts 12 hours");

  const unsub = await verifyToken(await makeUnsubscribeToken(USER, SECRET, NOW), SECRET, "unsub", NOW);
  assert(unsub?.u === USER, "unsubscribe token must round trip");

  const survey = await verifyToken(await makeSurveyToken(USER, SURVEY, SECRET, NOW), SECRET, "survey", NOW);
  assert(survey?.u === USER && survey?.s === SURVEY, "survey token must round trip");
});

Deno.test("a tampered payload or signature is refused", async () => {
  const token = await makeUnsubscribeToken(USER, SECRET, NOW);
  const [body, sig] = token.split(".");
  const forged = btoa(JSON.stringify({ p: "unsub", u: "00000000-0000-4000-8000-000000000000", x: 9999999999 }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert(await verifyToken(`${forged}.${sig}`, SECRET, "unsub", NOW) === null, "swapped payload must fail");
  const flipped = sig.slice(0, -2) + (sig.endsWith("AA") ? "BB" : "AA");
  assert(await verifyToken(`${body}.${flipped}`, SECRET, "unsub", NOW) === null, "altered signature must fail");
  assert(await verifyToken(token, OTHER_SECRET, "unsub", NOW) === null, "another secret must fail");
  for (const junk of ["", "abc", `${body}.${sig}.x`, `${body}`, 42, null, "x".repeat(5000)]) {
    assert(await verifyToken(junk, SECRET, "unsub", NOW) === null, `junk token must fail: ${String(junk).slice(0, 10)}`);
  }
});

Deno.test("a token is never accepted for another purpose", async () => {
  const unsub = await makeUnsubscribeToken(USER, SECRET, NOW);
  const survey = await makeSurveyToken(USER, SURVEY, SECRET, NOW);
  const { session } = await makeAdminSession("founder@example.com", SECRET, NOW);
  assert(await verifyToken(unsub, SECRET, "admin", NOW) === null, "unsub is not an admin session");
  assert(await verifyToken(unsub, SECRET, "survey", NOW) === null, "unsub is not a survey token");
  assert(await verifyToken(survey, SECRET, "unsub", NOW) === null, "survey is not an unsub token");
  assert(await verifyToken(session, SECRET, "unsub", NOW) === null, "admin is not an unsub token");
  // A correctly signed token with the right purpose but a missing field.
  const bare = await signToken({ p: "admin", x: Math.floor(NOW / 1000) + 60 }, SECRET);
  assert(await verifyToken(bare, SECRET, "admin", NOW) === null, "admin session without an email must fail");
});

Deno.test("an expired token is refused", async () => {
  const { session } = await makeAdminSession("founder@example.com", SECRET, NOW);
  assert(await verifyToken(session, SECRET, "admin", NOW + 12 * 3600 * 1000 - 1000) !== null, "valid just before expiry");
  assert(await verifyToken(session, SECRET, "admin", NOW + 12 * 3600 * 1000) === null, "refused at expiry");
  const survey = await makeSurveyToken(USER, SURVEY, SECRET, NOW);
  assert(await verifyToken(survey, SECRET, "survey", NOW + 91 * 24 * 3600 * 1000) === null, "survey link expires");
});

// ─── Rendering ────────────────────────────────────────────────────────

const LINKS = { unsubscribeUrl: "https://volyume.app/email/unsubscribe/?t=abc", surveyUrl: null };

Deno.test("render escapes script tags and attribute injection", () => {
  const { html, text } = renderEmail({
    subject: "<script>alert(1)</script>",
    preheader: "\"><img src=x onerror=alert(1)>",
    body: "Hello <script>alert(1)</script>\n\n**<b>bold</b>** and [x\" onmouseover=\"alert(1)](https://volyume.app/a)",
    button_label: "<i>Go</i>",
    button_url: "https://volyume.app/?q=\"><script>",
  }, LINKS);
  assert(!html.includes("<script>"), "no raw script tag");
  assert(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "script text escaped");
  assert(!html.includes("<img src=x"), "no injected image");
  assert(!html.includes("\" onmouseover=\""), "no attribute injection from a link label");
  assert(html.includes("<strong>&lt;b&gt;bold&lt;/b&gt;</strong>"), "bold inner text escaped");
  assert(!html.includes("<i>Go</i>"), "button label escaped");
  // The button url has a quote and angle brackets: it is not a safe link.
  assert(!html.includes("q=\"><script>"), "unsafe button url never rendered");
  assert(text.includes("Hello <script>alert(1)</script>"), "plain text keeps the words");
});

Deno.test("render refuses javascript: and every non-https link", () => {
  const body = [
    "[a](javascript:alert(1))",
    "[b](http://volyume.app)",
    "[c](data:text/html,hi)",
    "[d](//evil.example)",
    "[e](https://volyume.app/ok)",
  ].join("\n\n");
  const { html } = renderEmail({ subject: "Hi", body, button_label: "Go", button_url: "javascript:alert(1)" }, LINKS);
  assert(!/href="javascript:/i.test(html), "no javascript: href");
  assert(!/href="http:/i.test(html), "no http: href");
  assert(!/href="data:/i.test(html), "no data: href");
  assert(!/href="\/\//.test(html), "no protocol-relative href");
  assert(html.includes('href="https://volyume.app/ok"'), "the https link is a link");
  assert(html.includes("[a](javascript:alert(1))"), "a refused link stays as visible text");
  assert(!html.includes(">Go<"), "a button with an unsafe url is not drawn");
  for (const u of ["javascript:alert(1)", "http://a.b", "https://", "https://user:pw@a.b", "https://a.b/\"x", " https://a.b"]) {
    assert(safeHttpsUrl(u) === null, `refused: ${u}`);
  }
  assert(safeHttpsUrl("https://volyume.app/x?y=1") === "https://volyume.app/x?y=1", "a plain https link passes");
});

Deno.test("render carries the paragraphs, the survey button and the footer", () => {
  const { html, text } = renderEmail({
    subject: "News",
    body: "First line\nsecond line\n\nSecond paragraph",
    survey_id: SURVEY,
  }, { unsubscribeUrl: LINKS.unsubscribeUrl, surveyUrl: `https://volyume.app/survey/?id=${SURVEY}&t=tok` });
  assert((html.match(/font-size:16px;line-height:24px/g) ?? []).length === 2, "two paragraphs");
  assert(html.includes("First line<br>second line"), "single newline is a line break");
  assert(html.includes(`https://volyume.app/survey/?id=${SURVEY}&amp;t=tok`), "survey button present");
  assert(html.includes("You are getting this because you have a Volyume account."), "footer present");
  assert(html.includes(`href="https://volyume.app/email/unsubscribe/?t=abc"`), "footer unsubscribe link");
  assert(html.includes(`>${FOOTER_LINK_TEXT}</a>`), "the words unsubscribe here are the link");
  assert(html.includes("https://volyume.app/volyume-wordmark.png"), "wordmark");
  assert(text.includes("unsubscribe here: https://volyume.app/email/unsubscribe/?t=abc"), "plain text footer");
});

// ─── Copy lint ────────────────────────────────────────────────────────

Deno.test("copy lint refuses an em dash in every field", () => {
  for (const field of ["subject", "preheader", "body", "button_label"]) {
    const c: Record<string, string> = { subject: "Hi", body: "Hello", button_label: "Go", button_url: "https://volyume.app" };
    c[field] = "Before \u2014 after";
    const problems = lintCampaign(c);
    assert(problems.some((p) => p.field === field && p.code === "em_dash"), `em dash refused in ${field}`);
  }
  assert(lintCampaign({ subject: "Hi", body: "Hello" }).length === 0, "clean copy passes");
});

Deno.test("copy lint refuses empty, overlong, non-https and half buttons", () => {
  const codes = (c: Record<string, unknown>) => lintCampaign(c).map((p) => `${p.field}:${p.code}`);
  assert(codes({ subject: "", body: "x" }).includes("subject:required"), "empty subject");
  assert(codes({ subject: "x".repeat(151), body: "x" }).includes("subject:too_long"), "long subject");
  assert(codes({ subject: "Hi", body: "[a](http://x.y)" }).includes("body:link_not_https"), "http body link");
  assert(codes({ subject: "Hi", body: "x", button_label: "Go", button_url: "http://x.y" }).includes("button_url:link_not_https"), "http button");
  assert(codes({ subject: "Hi", body: "x", button_label: "Go" }).includes("button_label:button_incomplete"), "label without link");
  assert(codes({ subject: "Hi\nBcc: x", body: "x" }).includes("subject:line_break"), "line break in subject");
});

// ─── Surveys ──────────────────────────────────────────────────────────

const QUESTIONS: SurveyQuestion[] = [
  { id: "q1", type: "single", prompt: "How is it?", options: ["Good", "Fine", "Poor"], required: true },
  { id: "q2", type: "multi", prompt: "What do you use?", options: ["Plans", "Food", "Community"], required: false },
  { id: "q3", type: "text", prompt: "Anything else?", required: false },
];

Deno.test("question validation accepts the house shape and refuses the rest", () => {
  assert(validateQuestions(QUESTIONS).ok, "valid questions pass");
  const bad: [unknown, string][] = [
    [[], "bad_question_count"],
    // Founder decision 2026-10-17: no policy limit; 200 is the technical bound.
    [Array.from({ length: 201 }, (_, i) => ({ id: `q${i + 1}`, type: "text", prompt: "p", required: false })), "bad_question_count"],
    [[{ id: "x1", type: "text", prompt: "p", required: false }], "bad_question_id"],
    [[{ id: "q1", type: "text", prompt: "p", required: false }, { id: "q1", type: "text", prompt: "p", required: false }], "duplicate_question_id"],
    [[{ id: "q1", type: "scale", prompt: "p", required: false }], "bad_question_type"],
    [[{ id: "q1", type: "text", prompt: "", required: false }], "bad_prompt"],
    [[{ id: "q1", type: "text", prompt: "x".repeat(301), required: false }], "bad_prompt"],
    [[{ id: "q1", type: "text", prompt: "p", required: "yes" }], "bad_required"],
    [[{ id: "q1", type: "single", prompt: "p", options: [], required: false }], "bad_option_count"],
    [[{ id: "q1", type: "single", prompt: "p", options: Array.from({ length: 11 }, (_, i) => `o${i}`), required: false }], "bad_option_count"],
    [[{ id: "q1", type: "single", prompt: "p", options: ["x".repeat(121)], required: false }], "bad_option"],
    [[{ id: "q1", type: "single", prompt: "p", options: ["a", "a"], required: false }], "duplicate_option"],
    [[{ id: "q1", type: "text", prompt: "p", options: ["a"], required: false }], "text_question_has_options"],
    [[{ id: "q1", type: "text", prompt: "Before \u2014 after", required: false }], "em_dash"],
  ];
  for (const [input, error] of bad) {
    const r = validateQuestions(input);
    assert(!r.ok && r.error === error, `expected ${error}, got ${r.ok ? "ok" : r.error}`);
  }
  assert(!validateSurveyMeta("", null).ok, "empty title refused");
  assert(!validateSurveyMeta("Title \u2014 x", null).ok, "em dash in title refused");
  assert(validateSurveyMeta("Title", "Intro").ok, "title and intro pass");
});

Deno.test("answer validation refuses unknown ids, bad options, overlong text and a missing required answer", () => {
  const ok = validateAnswers(QUESTIONS, { q1: "Good", q2: ["Food", "Plans"], q3: "  Thanks  " });
  assert(ok.ok && ok.value.q3 === "Thanks" && (ok.value.q2 as string[]).length === 2, "valid answers pass, text trimmed");
  const minimal = validateAnswers(QUESTIONS, { q1: "Fine", q2: [], q3: "" });
  assert(minimal.ok && !("q2" in minimal.value) && !("q3" in minimal.value), "empty optional answers are left out");
  const cases: [unknown, string][] = [
    [{ q1: "Good", q9: "x" }, "unknown_question"],
    [{ q1: "Great" }, "bad_option"],
    [{ q1: "Good", q2: ["Food", "Gym"] }, "bad_option"],
    [{ q1: "Good", q2: ["Food", "Food"] }, "duplicate_option"],
    [{ q1: ["Good"] }, "bad_type"],
    [{ q1: "Good", q2: "Food" }, "bad_type"],
    [{ q1: "Good", q3: "x".repeat(2001) }, "text_too_long"],
    [{ q2: ["Food"] }, "required_missing"],
    [{ q1: "" }, "required_missing"],
    [[], "bad_answers"],
    ["q1", "bad_answers"],
  ];
  for (const [input, error] of cases) {
    const r = validateAnswers(QUESTIONS, input);
    assert(!r.ok && r.error === error, `expected ${error}, got ${r.ok ? "ok" : r.error}`);
  }
  assert(validateAnswers(QUESTIONS, { q1: "Good", q3: "x".repeat(2000) }).ok, "2,000 characters is allowed");
});

Deno.test("results tally choices and list written answers newest first; CSV neutralises formulas", () => {
  const rows = [
    { created_at: "2026-10-17T10:00:00Z", user_id: USER, answers: { q1: "Good", q2: ["Food"], q3: "older" } },
    { created_at: "2026-10-17T11:00:00Z", user_id: null, answers: { q1: "Good", q2: ["Food", "Plans"], q3: "=HYPERLINK(1)" } },
  ];
  const r = surveyResults(QUESTIONS, rows);
  assert(r.total === 2, "two responses");
  const q1 = r.questions[0] as { counts: Record<string, number> };
  assert(q1.counts.Good === 2 && q1.counts.Poor === 0, "single choice counts");
  const q2 = r.questions[1] as { counts: Record<string, number> };
  assert(q2.counts.Food === 2 && q2.counts.Plans === 1, "multi choice counts");
  const q3 = r.questions[2] as { answers: { text: string }[] };
  assert(q3.answers[0].text === "=HYPERLINK(1)" && q3.answers[1].text === "older", "text newest first");
  const csv = surveyCsv(QUESTIONS, rows);
  assert(csv.includes(csvCell("'=HYPERLINK(1)")) || csv.includes("\"'=HYPERLINK(1)\""), "formula neutralised");
  assert(!csv.includes(USER), "the CSV never carries a user id");
  assert(csv.split("\r\n")[1].includes("\"No\""), "the newest row is the anonymous one");
});

Deno.test("readBoundedText caps the one-click body", async () => {
  const small = await readBoundedText(new Request("https://isolated.invalid", { method: "POST", body: "List-Unsubscribe=One-Click" }), 1024);
  assert(small === "List-Unsubscribe=One-Click", "small body read");
  const big = await readBoundedText(new Request("https://isolated.invalid", { method: "POST", body: "x".repeat(2000) }), 1024);
  assert(big === null, "oversized body refused");
});

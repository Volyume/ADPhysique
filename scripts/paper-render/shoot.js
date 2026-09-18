/**
 * scripts/paper-render/shoot.js
 *
 * Second half of the paper-render pipeline (run via run.sh, after the Jest
 * driver has written report-data.json + one HTML file per screen under
 * <scratch>/paper-render-work/html/). This step:
 *   1. screenshots every mounted screen's HTML with the known-good headless
 *      Chromium invocation the brief specifies, at 412 CSS px wide,
 *      --force-device-scale-factor=2, full page height;
 *   2. writes each PNG into the deliverable directory (<scratch>/paper-renders/)
 *      as soon as it exists, printing one progress line per screen;
 *   3. builds the two other deliverables that belong alongside the PNGs:
 *      index.html (a contact sheet) and report.md (the structured report).
 *
 * Height: the converter (treeToHtml.js) already estimates each page's full
 * height into report-data.json's pageHeightPx (best-effort -- see that
 * file's own header on the estimator's limits). Rather than the brief's
 * literal two-pass "shoot at 3000, reshoot taller if the converter reports
 * more", this shoots ONCE at max(3000, estimate + margin): the estimate is
 * already in hand before Chromium ever runs, so a second pass would only
 * repeat the first at a taller height for no reason. Same outcome (every
 * screen's window is at least as tall as the converter thinks the page is,
 * 3000 as the floor for a short screen), one render instead of two.
 * Chromium's headless --screenshot is a fixed-viewport capture, not a
 * full-page auto-grow one, so under-sizing --window-size WOULD crop real
 * content -- this is why the estimate-driven height matters and isn't just
 * cosmetic.
 *
 * Node built-ins only (child_process, fs, path) -- no new npm packages,
 * per the brief. The PNG dimensions reported in report.md are read back
 * from each file's own IHDR chunk (a fixed 8-byte signature then a 4-byte
 * length + 4-byte "IHDR" + 4-byte width + 4-byte height, all it takes; no
 * png-reading library needed for that).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRATCH = process.env.PAPER_RENDER_SCRATCH
  || '/tmp/claude-0/-home-user-ADPhysique/d71ddd7a-c7b0-5d8f-8ef8-fbac54ce6084/scratchpad';
const WORK_DIR = path.join(SCRATCH, 'paper-render-work');
const REPORT_JSON = path.join(WORK_DIR, 'report-data.json');
const OUT_DIR = process.env.PAPER_RENDER_OUT_DIR || path.join(SCRATCH, 'paper-renders');
const CHROME = process.env.PAPER_RENDER_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIN_HEIGHT = 3000;
const MAX_HEIGHT = 12000; // sanity cap; report.md flags anything that hits it
const HEIGHT_MARGIN = 300; // px of slack beyond the converter's own estimate
const SHOOT_TIMEOUT_MS = 30000;

function readPngSize(filePath) {
  // PNG signature (8 bytes) + IHDR chunk: 4-byte length, 4-byte type
  // "IHDR", then width (4 bytes) and height (4 bytes), both big-endian.
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

function targetHeight(pageHeightPx) {
  const estimate = Number.isFinite(pageHeightPx) ? pageHeightPx : 0;
  const h = Math.max(MIN_HEIGHT, Math.ceil(estimate + HEIGHT_MARGIN));
  return Math.min(MAX_HEIGHT, h);
}

function shootOne(htmlPath, pngPath, cssHeight) {
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=2',
    `--window-size=412,${cssHeight}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ];
  const res = spawnSync(CHROME, args, { timeout: SHOOT_TIMEOUT_MS, encoding: 'utf8' });
  if (res.error) return { ok: false, reason: res.error.message };
  if (!fs.existsSync(pngPath)) {
    const stderrTail = (res.stderr || '').split('\n').filter(Boolean).slice(-5).join(' | ');
    return { ok: false, reason: `chromium exit ${res.status}: no PNG written${stderrTail ? ` -- ${stderrTail}` : ''}` };
  }
  return { ok: true };
}

function main() {
  if (!fs.existsSync(REPORT_JSON)) {
    console.error(`[paper-render:shoot] ${REPORT_JSON} does not exist -- run the Jest driver first (run.sh does this for you).`);
    process.exitCode = 1;
    return;
  }
  const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));

  // Clean start every run (brief: "will be re-run many times") -- a screen
  // that mounted last run but fails to mount this run must never leave a
  // stale, now-inaccurate PNG sitting there looking current.
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const shots = [];
  for (const entry of report.screens) {
    const label = `${entry.n}-${entry.name}${entry.theme === 'light' ? '-light' : ''}`;
    // pngHint already carries the right suffix (including '-day0'); label
    // above is only used in log lines when pngHint is unavailable.
    const pngName = entry.pngHint || `${label}.png`;
    const pngPath = path.join(OUT_DIR, pngName);

    if (!entry.mounted || !entry.htmlPath || !fs.existsSync(entry.htmlPath)) {
      console.log(`[paper-render:shoot] SKIP ${pngName} -- screen did not mount, nothing to shoot`);
      shots.push({ ...entry, pngName, pngPath: null, shot: false, shotReason: 'not mounted', actualWidth: null, actualHeight: null, cssHeight: null });
      continue;
    }

    const cssHeight = targetHeight(entry.pageHeightPx);
    const result = shootOne(entry.htmlPath, pngPath, cssHeight);
    if (!result.ok) {
      console.log(`[paper-render:shoot] FAIL ${pngName} -- ${result.reason}`);
      shots.push({ ...entry, pngName, pngPath: null, shot: false, shotReason: result.reason, actualWidth: null, actualHeight: null, cssHeight });
      continue;
    }
    const dims = readPngSize(pngPath);
    console.log(`[paper-render:shoot] OK   ${pngName}  (${cssHeight}css -> ${dims ? `${dims.width}x${dims.height}px` : '?'})`);
    shots.push({
      ...entry, pngName, pngPath, shot: true, shotReason: null, cssHeight,
      actualWidth: dims ? dims.width : null, actualHeight: dims ? dims.height : null,
      hitHeightCap: cssHeight >= MAX_HEIGHT,
    });
  }

  fs.writeFileSync(path.join(WORK_DIR, 'shoot-data.json'), JSON.stringify({ ...report, screens: shots }, null, 2), 'utf8');

  buildIndexHtml(report, shots);
  buildReportMd(report, shots);

  const failed = shots.filter((s) => !s.shot);
  console.log(`[paper-render:shoot] done: ${shots.length - failed.length}/${shots.length} PNGs written to ${OUT_DIR}`);
  if (failed.length) {
    console.log(`[paper-render:shoot] not shot: ${failed.map((s) => s.pngName).join(', ')}`);
  }
}

// ── index.html: a dark, static contact sheet grouping the shots the same
// way the brief orders them (persona dark pass, day-zero, light theme).
function buildIndexHtml(report, shots) {
  function group(pred, title) {
    const items = shots.filter(pred);
    if (!items.length) return '';
    const cards = items.map((s) => {
      const dims = s.actualWidth ? `${s.actualWidth}&times;${s.actualHeight}px` : 'not shot';
      const body = s.shot
        ? `<img src="${escapeHtml(s.pngName)}" alt="${escapeHtml(s.pngName)}" loading="lazy">`
        : `<div class="missing">${escapeHtml(s.mounted ? (s.shotReason || 'not shot') : (s.error || 'did not mount').split('\n')[0])}</div>`;
      return `<a class="card" href="${s.shot ? escapeHtml(s.pngName) : '#'}">
        <div class="thumbwrap">${body}</div>
        <div class="meta"><span class="n">${escapeHtml(s.n)}</span> ${escapeHtml(s.name)}${s.theme === 'light' ? ' <em>light</em>' : ''}${(s.pngHint || '').includes('day0') ? ' <em>day 0</em>' : ''}</div>
        <div class="dims">${dims}</div>
      </a>`;
    }).join('\n');
    return `<section><h2>${escapeHtml(title)}</h2><div class="grid">${cards}</div></section>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paper render contact sheet</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #111110; color: #F2EFE7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  header { padding: 20px 24px; border-bottom: 1px solid #2a2926; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header p { margin: 0; color: #9c968a; font-size: 13px; }
  section { padding: 16px 24px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #9c968a; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
  .card { display: block; background: #1c1b19; border: 1px solid #2a2926; border-radius: 10px; overflow: hidden; text-decoration: none; color: inherit; }
  .thumbwrap { background: #000; height: 220px; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; }
  .thumbwrap img { width: 100%; height: auto; display: block; }
  .missing { color: #d97b7b; font-size: 12px; padding: 12px; line-height: 1.4; }
  .meta { padding: 8px 10px 2px; font-size: 13px; }
  .meta .n { color: #9c968a; font-variant-numeric: tabular-nums; margin-right: 4px; }
  .meta em { color: #d9a441; font-style: normal; font-size: 11px; }
  .dims { padding: 0 10px 10px; font-size: 11px; color: #6b6a64; font-variant-numeric: tabular-nums; }
  footer { padding: 24px; color: #6b6a64; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>Volyume paper render</h1>
  <p>Persona "Alex", fixed clock ${escapeHtml(new Date(report.nowMs).toString())}. Generated by scripts/paper-render/run.sh. Click any PNG to open it full size.</p>
</header>
${group((s) => s.theme === 'dark' && !(s.pngHint || '').includes('day0'), 'Persona, dark theme')}
${group((s) => (s.pngHint || '').includes('day0'), 'Day zero (fresh account)')}
${group((s) => s.theme === 'light', 'Light theme')}
<footer>report.md in this same folder has the per-screen detail and converter-fallback counts.</footer>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── report.md ──────────────────────────────────────────────────────────
function buildReportMd(report, shots) {
  const lines = [];
  lines.push('# Paper render report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}. Fixed render clock: ${new Date(report.nowMs).toString()}.`);
  lines.push('');

  lines.push('## 1. Data-layer approach and bypasses');
  lines.push('');
  lines.push(`- **Approach:** ${report.dataLayerNote || 'unknown'}. Schema + migrations run for real (\`src/lib/database.js\`'s own \`initDatabase()\`) against a real SQLite file, via a Node \`node:sqlite\`-backed shim standing in for \`expo-sqlite\` (\`expoSqliteShim.js\`). \`src/lib/dbCrypto.js\`'s SQLCipher migrate-in-place dance is bypassed with a plaintext pass-through (\`dbCryptoPassthrough.js\`) -- unreachable under plain SQLite and unobservable in a screenshot either way.`);
  lines.push(`- Persona ("Alex") and every screen's data were seeded through the app's OWN write functions (\`database.js\`, \`food/db.js\`, \`seedExercises.js\`) -- see \`seedPersona.js\`. A second, brand-new user (\`seedDayZeroPersona()\`) provides the day-zero renders.`);
  lines.push('- **Disclosed bypasses (no local write function exists for these; all client-side/cache-only state, never a database INSERT):**');
  for (const b of (report.bypassedWrites || [])) lines.push(`  - ${b.replace(/\n/g, ' ')}`);
  lines.push('- **Mount-fidelity fixes beyond the data layer** (found by opening real renders, not assumed -- see `mockPreamble.js` and `treeToHtml.js`\'s own header comments for the full why on each):');
  lines.push('  - `useFocusEffect` actually runs its callback (screen-mount\'s own mock never does), needed for every screen whose data load lives on focus rather than on mount.');
  lines.push('  - `react-native-gesture-handler`\'s `Gesture` builder covers `Race`/`Fling`/`Simultaneous`/`Exclusive`, and its `/Swipeable` deep-import subpath is mocked, both needed only by DiaryScreen.');
  lines.push('  - `@supabase/supabase-js`\'s `auth.getSession()` returns a live token and the store carries `healthConsent: true`, both needed only by CommunityHubScreen\'s own transport gate (`assertCommunityGates`) -- without them every Community render was an unconditional "Could not load Community", regardless of seeded data.');
  lines.push('  - **The one converter bug found this way, and the most consequential:** every inline `style="..."` the converter wrote broke at its own embedded `font-family:"Name"` (a literal `"` closing the HTML attribute early), silently dropping font-family itself plus every CSS property after it -- for Text, that included the numberOfLines line-clamp; for icons, size/colour/line-height/display too. Every screen was rendering Inter-Regular at every weight and showing no icon glyphs at all until this was fixed (`treeToHtml.js`, single-quoted CSS strings instead of double-quoted). Caught by opening 01-HomeScreen with the Read tool before building the rest of the pipeline, not assumed fixed from the diff alone.');
  lines.push('- **Mount-order note:** CoachOutputScreen recomputes its decision live via the real `runWeeklyCoach()` engine on mount and re-persists it (by design -- this is the actual coaching engine, untouched). It mounts after HomeScreen/AnalyticsScreen in the dark pass, so those two show the seed\'s hand-authored decision text where they read it first, while CoachOutputScreen itself and the later light-theme pass (which reopens the same database) show the engine\'s own recomputed decision. Both are real writes through `saveCoachOutput`; neither is fabricated for display.');
  lines.push('');

  lines.push('## 2. Per screen');
  lines.push('');
  lines.push('| # | Screen | Variant | Mounted | PNG | CSS h (shot) | Actual px | Empty reads / notes |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const s of shots) {
    const variant = s.theme === 'light' ? 'light' : ((s.pngHint || '').includes('day0') ? 'day0' : 'dark');
    const mountedCell = s.mounted ? 'yes' : `NO -- ${(s.error || '').split('\n')[0]}`;
    const pngCell = s.shot ? `[${s.pngName}](${s.pngName})` : (s.shotReason ? `not shot (${s.shotReason})` : 'not shot');
    const dims = s.actualWidth ? `${s.actualWidth}x${s.actualHeight}` : '-';
    const notes = [];
    if (s.treeFallback) notes.push('tree walked manually (toJSON() fallback)');
    if (s.renderErrors && s.renderErrors.length) notes.push(`console.error x${s.renderErrors.length}`);
    if (s.hitHeightCap) notes.push(`hit the ${MAX_HEIGHT}px height cap -- check for clipping`);
    notes.push(EMPTY_READ_NOTES[`${s.n}${variant === 'day0' ? '-day0' : ''}`] || (variant === 'day0' ? 'fresh account: no plan/session/food/weight by design' : ''));
    lines.push(`| ${s.n} | ${s.name} | ${variant} | ${mountedCell} | ${pngCell} | ${s.cssHeight ?? '-'} | ${dims} | ${notes.filter(Boolean).join('; ') || '-'} |`);
  }
  lines.push('');

  lines.push('## 3. Converter fallbacks');
  lines.push('');
  const unknown = report.converterStats?.unknownTypes || {};
  const fallbacks = report.converterStats?.converterFallbacks || {};
  if (Object.keys(unknown).length === 0 && Object.keys(fallbacks).length === 0) {
    lines.push('None -- every host node type across all 23 renders matched a known converter rule.');
  } else {
    lines.push('Unknown host-component types (rendered as a small grey type-label box; content inside still renders, per the brief\'s own converter rule):');
    lines.push('');
    for (const [k, v] of Object.entries(unknown)) {
      lines.push(`- \`${k}\` x${v}${UNKNOWN_TYPE_NOTES[k] ? ` -- ${UNKNOWN_TYPE_NOTES[k]}` : ''}`);
    }
    if (Object.keys(fallbacks).length) {
      lines.push('');
      lines.push('Other converter fallbacks:');
      for (const [k, v] of Object.entries(fallbacks)) lines.push(`- \`${k}\` x${v}`);
    }
  }
  lines.push('');
  lines.push('`ContextMenu*` types (ActiveWorkoutScreen\'s long-press "Edit set"/"Delete set" menu, `zeego/context-menu`, mocked at the shared repo-root `__mocks__/zeego/context-menu.js`) are deliberately hidden by the converter rather than shown as an unknown type: that shared mock renders `Root`/`Content` as an always-visible passthrough with no open/closed state (real screen-mount tests never needed it to model one), so left unhandled, each closed menu\'s items rendered inline on the row -- and, since both the item and its title were unknown types, one\'s debug label sat directly on top of the other\'s real text at the same top-left origin. A real device shows none of this until a long-press. Fixed in `treeToHtml.js` (a named `HIDDEN_TYPES` set), not in the shared mock, which is outside this harness\'s files.');
  lines.push('');

  lines.push('## 4. Re-run');
  lines.push('');
  lines.push('```');
  lines.push('bash scripts/paper-render/run.sh');
  lines.push('```');
  lines.push('');
  lines.push(`CI cannot see this suite: \`npx jest --listTests | grep -c paper-render\` prints \`0\` (\`paper-render.test.js\` lives directly under \`scripts/\`, outside package.json's \`jest.testMatch\` -- \`**/__tests__/**\` and \`**/tests/**\` only).`);
  lines.push('');

  lines.push('## 5. Files');
  lines.push('');
  lines.push('- `scripts/paper-render/run.sh` -- the one command.');
  lines.push('- `scripts/paper-render/paper-render.test.js` -- Jest driver: seeds the persona + day-zero account, mounts all screens/variants, converts each to HTML.');
  lines.push('- `scripts/paper-render/seedPersona.js` -- realistic data through the app\'s own write functions.');
  lines.push('- `scripts/paper-render/mockPreamble.js` -- the mock wall (screen-mount\'s own, plus this harness\'s own departures, each called out at its own `jest.mock()` site).');
  lines.push('- `scripts/paper-render/expoSqliteShim.js`, `dbCryptoPassthrough.js` -- the real-SQLite data layer.');
  lines.push('- `scripts/paper-render/treeToHtml.js` -- the React Native tree -> HTML converter.');
  lines.push('- `scripts/paper-render/shoot.js` -- this file: screenshots the HTML, builds `index.html` and `report.md`.');
  lines.push(`- \`${OUT_DIR}/\` -- the deliverable: one PNG per screen/variant, \`index.html\` (contact sheet), \`report.md\` (this file).`);
  lines.push(`- \`${WORK_DIR}/\` -- intermediate working files (HTML per screen, \`report-data.json\`, \`shoot-data.json\`, the working SQLite file); safe to delete between runs, and \`run.sh\`/\`shoot.js\` do not depend on anything surviving from a previous run.`);
  lines.push('');

  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), lines.join('\n'), 'utf8');
}

// Per-screen empty-read / notable-state annotations for report.md section 2,
// keyed by screen number (day-zero variants keyed "NN-day0"). Grounded in
// what was actually read back from each rendered HTML file, not assumed.
const EMPTY_READ_NOTES = {
  '01': 'shows the undismissed "avoided movements" onboarding nudge above the session card -- real behaviour for a persona that has not dismissed it, not a harness artefact.',
  '02': 'the long-press "Edit set"/"Delete set" menu on each logged set is hidden by the converter (see section 3) -- matches a real device\'s closed state.',
  '05': 'CoachOutputScreen recomputes live via runWeeklyCoach() on mount and persists over the seed\'s authored decision -- see section 1\'s mount-order note.',
  '06': 'three meals logged, 1,625 of 2,650 kcal, matches the seed exactly.',
  '11': 'empty until useFocusEffect was made to actually fire (mockPreamble.js) -- was a bare header before that fix.',
  '12': 'opens (gateState "open"), not the wrong-day gate -- needed seeding @volyume_notification_prefs.checkinDay to today.',
  '13': 'no Community profile seeded server-side (Supabase is mocked), so this renders the real "create your profile" empty state rather than post content -- not an error state.',
  '01-day0': 'fresh account welcome card, no session/food/weight -- by design.',
  '04-day0': 'training/body/photos all show "nothing logged yet" empty states -- by design.',
  '06-day0': '"Nothing logged for this day yet." -- by design.',
  '07-day0': '"No active plan yet" -- by design.',
};

const UNKNOWN_TYPE_NOTES = {
  Canvas: '@shopify/react-native-skia chart canvases (mocked to a bare string host type) -- no HTML equivalent exists for a Skia-drawn chart; the surrounding card labels/values are real text.',
};

main();

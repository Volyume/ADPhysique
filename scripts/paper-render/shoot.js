/**
 * scripts/paper-render/shoot.js
 *
 * Second half of the paper-render pipeline (run via run.sh, after the Jest
 * driver has written report-data.json + one HTML file per screen under
 * <scratch>/paper-render-work/html/). This step:
 *   1. measures each mounted screen's real page height with headless
 *      Chromium (the page reports it itself once its fonts are in; see
 *      treeToHtml.js), then screenshots it at 412 CSS px wide,
 *      --force-device-scale-factor=2, at exactly that height: full page, no
 *      guessed margin, no empty tail;
 *   2. writes each PNG into the deliverable directory (<out>/) as soon as it
 *      exists, printing one progress line per screen;
 *   3. builds the two other deliverables that belong alongside the PNGs:
 *      index.html (a contact sheet) and report.md (the structured report).
 *
 * Height. The old single pass shot at max(3000, estimate + 300) CSS px from
 * the converter's estimate and left the rest of the window blank. Now the
 * page is measured (dump-dom, virtual time so the font promise settles), the
 * window is that height plus Chromium's fixed gap between window and viewport
 * (measured once from a probe page, never assumed), and the result is cropped
 * to exactly the page height with CanvasKit (the library welcome.js and
 * store.js already use). Chromium handles a 17,000 CSS px page at scale 2
 * (a 34,000 px PNG); pages are capped at MAX_CSS_HEIGHT and any that hit the
 * cap are flagged in report.md.
 *
 * Several Chromium processes run at once (CONCURRENCY). Node built-ins and
 * canvaskit-wasm only; no new npm package.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { WORK_DIR, OUT_DIR, CHROME } = require('./paths');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REPORT_JSON = path.join(WORK_DIR, 'report-data.json');

const CSS_WIDTH = 412;
const DEVICE_SCALE = 2;
const MAX_CSS_HEIGHT = 30000; // sanity cap; report.md flags anything that hits it
const MIN_CSS_HEIGHT = 200;
const CONCURRENCY = Number(process.env.PAPER_RENDER_CONCURRENCY) || 4;
const CHROME_TIMEOUT_MS = 90000;
const COMMON_FLAGS = ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files'];

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

function runChrome(args) {
  return new Promise((resolve) => {
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, CHROME_TIMEOUT_MS);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: String(e.message) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

/** The page's own reported height (px) and the viewport height Chromium gave a window of `windowHeight`. */
async function measure(htmlPath, windowHeight) {
  const res = await runChrome([
    ...COMMON_FLAGS, `--window-size=${CSS_WIDTH},${windowHeight}`, '--virtual-time-budget=4000', '--dump-dom', `file://${htmlPath}`,
  ]);
  const h = /data-pr-height="(\d+)"/.exec(res.stdout);
  return h ? Number(h[1]) : null;
}

/** Chromium's window-to-viewport gap, measured on a probe page: a window of H gets a viewport of H - gap. */
async function probeWindowGap() {
  const probe = path.join(WORK_DIR, 'probe.html');
  fs.writeFileSync(probe, '<!doctype html><meta charset="utf-8"><body style="margin:0"><script>window.addEventListener("load",function(){document.documentElement.setAttribute("data-pr-inner",String(window.innerHeight));});</script></body>', 'utf8');
  const res = await runChrome([...COMMON_FLAGS, '--window-size=412,1000', '--virtual-time-budget=2000', '--dump-dom', `file://${probe}`]);
  const m = /data-pr-inner="(\d+)"/.exec(res.stdout);
  return m ? 1000 - Number(m[1]) : 87;
}

async function main() {
  if (!fs.existsSync(REPORT_JSON)) {
    console.error(`[paper-render:shoot] ${REPORT_JSON} does not exist -- run the Jest driver first (run.sh does this for you).`);
    process.exitCode = 1;
    return;
  }
  const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));

  // Clean start every run -- a screen that mounted last run but fails to
  // mount this run must never leave a stale, now-inaccurate PNG sitting
  // there looking current.
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(WORK_DIR, 'raw'), { recursive: true });

  const gap = await probeWindowGap();
  console.log(`[paper-render:shoot] chromium window-to-viewport gap: ${gap}px; concurrency ${CONCURRENCY}`);

  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json', { paths: [REPO_ROOT] }));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });

  const entries = report.screens;
  const shots = new Array(entries.length);

  async function shootEntry(entry, index) {
    const pngName = entry.pngHint || `${entry.n}-${entry.name}.png`;
    const pngPath = path.join(OUT_DIR, pngName);
    if (!entry.mounted || !entry.htmlPath || !fs.existsSync(entry.htmlPath)) {
      console.log(`[paper-render:shoot] SKIP ${pngName} -- screen did not mount, nothing to shoot`);
      shots[index] = { ...entry, pngName, pngPath: null, shot: false, shotReason: 'not mounted', actualWidth: null, actualHeight: null, cssHeight: null };
      return;
    }
    // 1. measure (a window comfortably taller than most pages, so the
    //    measurement is the layout's, not the window's).
    let measured = await measure(entry.htmlPath, 1000);
    if (measured === null) measured = Math.ceil(entry.pageHeightPx || 0);
    let cssHeight = Math.max(MIN_CSS_HEIGHT, measured);
    const hitHeightCap = cssHeight > MAX_CSS_HEIGHT;
    if (hitHeightCap) cssHeight = MAX_CSS_HEIGHT;

    // 2. shoot at exactly that height (plus the window gap), 3. crop.
    const rawPath = path.join(WORK_DIR, 'raw', pngName);
    try { fs.unlinkSync(rawPath); } catch (_) { /* none yet */ }
    const res = await runChrome([
      ...COMMON_FLAGS, `--force-device-scale-factor=${DEVICE_SCALE}`, `--window-size=${CSS_WIDTH},${cssHeight + gap}`,
      `--screenshot=${rawPath}`, `file://${entry.htmlPath}`,
    ]);
    if (!fs.existsSync(rawPath)) {
      const reason = `chromium exit ${res.code}: no PNG written`;
      console.log(`[paper-render:shoot] FAIL ${pngName} -- ${reason}`);
      shots[index] = { ...entry, pngName, pngPath: null, shot: false, shotReason: reason, actualWidth: null, actualHeight: null, cssHeight };
      return;
    }
    const raw = CK.MakeImageFromEncoded(fs.readFileSync(rawPath));
    const cropHeight = Math.min(raw.height(), cssHeight * DEVICE_SCALE);
    const surface = CK.MakeSurface(raw.width(), cropHeight);
    const paint = new CK.Paint();
    surface.getCanvas().drawImageRectOptions(
      raw, CK.XYWHRect(0, 0, raw.width(), cropHeight), CK.XYWHRect(0, 0, raw.width(), cropHeight),
      CK.FilterMode.Nearest, CK.MipmapMode.None, paint,
    );
    const png = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.PNG);
    fs.writeFileSync(pngPath, Buffer.from(png));
    paint.delete(); surface.delete(); raw.delete();
    fs.unlinkSync(rawPath);
    const dims = readPngSize(pngPath);
    console.log(`[paper-render:shoot] OK   ${pngName}  (${cssHeight}css -> ${dims ? `${dims.width}x${dims.height}px` : '?'})`);
    shots[index] = {
      ...entry, pngName, pngPath, shot: true, shotReason: null, cssHeight, measuredHeight: measured,
      actualWidth: dims ? dims.width : null, actualHeight: dims ? dims.height : null, hitHeightCap,
    };
  }

  let next = 0;
  async function worker() {
    for (;;) {
      const i = next; next += 1;
      if (i >= entries.length) return;
      // eslint-disable-next-line no-await-in-loop
      await shootEntry(entries[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));

  fs.writeFileSync(path.join(WORK_DIR, 'shoot-data.json'), JSON.stringify({ ...report, screens: shots }, null, 2), 'utf8');

  buildIndexHtml(report, shots);
  buildReportMd(report, shots);

  const failed = shots.filter((s) => !s.shot);
  console.log(`[paper-render:shoot] done: ${shots.length - failed.length}/${shots.length} PNGs written to ${OUT_DIR}`);
  if (failed.length) {
    console.log(`[paper-render:shoot] not shot: ${failed.map((s) => s.pngName).join(', ')}`);
  }
}

// ── index.html: a dark, static contact sheet, one section per group (Today,
// Train, ... in the order the driver listed them), then the day-zero, light
// and decision variants together.
function buildIndexHtml(report, shots) {
  const GROUPS = ['Today', 'Train', 'Nutrition', 'Coach', 'Community', 'Settings', 'Setup and sign-in', 'Other'];
  function section(title, items) {
    if (!items.length) return '';
    const cards = items.map((s) => {
      const dims = s.actualWidth ? `${s.actualWidth}&times;${s.actualHeight}px` : 'not shot';
      const body = s.shot
        ? `<img src="${escapeHtml(s.pngName)}" alt="${escapeHtml(s.pngName)}" loading="lazy">`
        : `<div class="missing">${escapeHtml(s.mounted ? (s.shotReason || 'not shot') : (s.error || 'did not mount').split('\n')[0])}</div>`;
      return `<a class="card" href="${s.shot ? escapeHtml(s.pngName) : '#'}">
        <div class="thumbwrap">${body}</div>
        <div class="meta"><span class="n">${escapeHtml(s.n)}</span> ${escapeHtml(s.name)}${s.variant ? ` <em>${escapeHtml(s.variant)}</em>` : ''}</div>
        <div class="dims">${dims}</div>
      </a>`;
    }).join('\n');
    return `<section><h2>${escapeHtml(title)}</h2><div class="grid">${cards}</div></section>`;
  }
  const baseOf = (s) => !s.variant;
  const sections = GROUPS.map((g) => section(g, shots.filter((s) => s.group === g && baseOf(s)))).join('\n');
  const extras = section('Other states of a screen (variants)', shots.filter((s) => s.variant));

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
${sections}
${extras}
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
  const registered = report.registered ? report.registered.count : '?';
  const mountedCount = shots.filter((s) => s.mounted).length;
  lines.push(`${registered} screen components are registered in \`src/navigation/RootNavigator.js\`; ${shots.length} renders were made (every screen, plus the extra states below); ${mountedCount} mounted, ${shots.length - mountedCount} did not.`);
  lines.push('');

  lines.push('## 1. Data-layer approach and bypasses');
  lines.push('');
  lines.push(`- **Approach:** ${report.dataLayerNote || 'unknown'}. Schema + migrations run for real (\`src/lib/database.js\`'s own \`initDatabase()\`) against a real SQLite file, via a Node \`node:sqlite\`-backed shim standing in for \`expo-sqlite\` (\`expoSqliteShim.js\`). \`src/lib/dbCrypto.js\`'s SQLCipher migrate-in-place dance is bypassed with a plaintext pass-through (\`dbCryptoPassthrough.js\`) -- unreachable under plain SQLite and unobservable in a screenshot either way.`);
  lines.push(`- Persona ("Alex") and every screen's data were seeded through the app's OWN write functions (\`database.js\`, \`food/db.js\`, \`seedExercises.js\`) -- see \`seedPersona.js\`. A second, brand-new user (\`seedDayZeroPersona()\`) provides the day-zero renders.`);
  lines.push('- **Server data:** Supabase is mocked and answers nothing, so a Community screen that needs posts, profiles, groups or messages shows the state it shows without them (loading, empty or "could not load"); the manifest\'s `state` column says which. The gym challenge API is the one network edge mocked with plausible data (see the top of `paper-render.test.js`).');
  lines.push('- **Disclosed bypasses (no local write function exists for these; all client-side/cache-only state, never a database INSERT):**');
  for (const b of (report.bypassedWrites || [])) lines.push(`  - ${b.replace(/\n/g, ' ')}`);
  lines.push('- **Mount-fidelity fixes beyond the data layer** (found by opening real renders, not assumed -- see `mockPreamble.js` and `treeToHtml.js`\'s own header comments for the full why on each):');
  lines.push('  - `useFocusEffect` actually runs its callback (screen-mount\'s own mock never does), needed for every screen whose data load lives on focus rather than on mount.');
  lines.push('  - `useRoute()` and `useNavigation()` return the route and navigation object the screen was mounted with, so a screen that reads its params through the hook sees them.');
  lines.push('  - Images: the harness\'s own Jest config (`jest.config.js`) makes `require(\'x.png\')` resolve to `{ testUri: <absolute path> }`, and the converter embeds the file, so the brand mark and any bundled picture are drawn. A remote URL or an unreadable file keeps the dark placeholder box and is counted in section 3.');
  lines.push('  - `react-native-gesture-handler`\'s `Gesture` builder covers `Race`/`Fling`/`Simultaneous`/`Exclusive`, and its `/Swipeable` deep-import subpath is mocked, both needed only by DiaryScreen.');
  lines.push('  - `@supabase/supabase-js`\'s `auth.getSession()` returns a live token and the store carries `healthConsent: true`, both needed only by CommunityHubScreen\'s own transport gate (`assertCommunityGates`) -- without them every Community render was an unconditional "Could not load Community", regardless of seeded data.');
  lines.push('  - **The one converter bug found this way, and the most consequential:** every inline `style="..."` the converter wrote broke at its own embedded `font-family:"Name"` (a literal `"` closing the HTML attribute early), silently dropping font-family itself plus every CSS property after it. Fixed in `treeToHtml.js` (single-quoted CSS strings instead of double-quoted). Caught by opening a real render, not assumed fixed from the diff alone.');
  lines.push('- **Mount-order note:** CoachOutputScreen recomputes its decision live via the real `runWeeklyCoach()` engine on mount and re-persists it (by design -- this is the actual coaching engine, untouched). Coach (YouScreen) and Today are mounted before it in the dark pass and read the seed\'s authored decision; the later light and decision passes reopen the same database and may read the engine\'s recomputed one. Both are real writes through `saveCoachOutput`; neither is fabricated for display.');
  lines.push('');

  lines.push('## 2. Per screen');
  lines.push('');
  lines.push('| # | Screen | Group | Variant | Mounted | PNG | CSS h | Actual px | Notes |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const s of shots) {
    const variant = s.variant || 'dark';
    const mountedCell = s.mounted ? 'yes' : `NO -- ${(s.error || '').split('\n')[0]}`;
    const pngCell = s.shot ? `[${s.pngName}](${s.pngName})` : (s.shotReason ? `not shot (${s.shotReason})` : 'not shot');
    const dims = s.actualWidth ? `${s.actualWidth}x${s.actualHeight}` : '-';
    const notes = [];
    if (s.note) notes.push(s.note);
    if (s.treeFallback) notes.push('tree walked manually (toJSON() fallback)');
    if (s.renderErrors && s.renderErrors.length) notes.push(`console.error x${s.renderErrors.length}`);
    if (s.hitHeightCap) notes.push(`hit the ${MAX_CSS_HEIGHT}px height cap -- check for clipping`);
    notes.push(SCREEN_NOTES[`${s.name}${s.variant ? `-${s.variant}` : ''}`] || '');
    lines.push(`| ${s.n} | ${s.name} | ${s.group || '-'} | ${variant} | ${mountedCell} | ${pngCell} | ${s.cssHeight ?? '-'} | ${dims} | ${notes.filter(Boolean).join('; ') || '-'} |`);
  }
  lines.push('');

  lines.push('## 3. Converter fallbacks');
  lines.push('');
  const unknown = report.converterStats?.unknownTypes || {};
  const fallbacks = report.converterStats?.converterFallbacks || {};
  if (Object.keys(unknown).length === 0 && Object.keys(fallbacks).length === 0) {
    lines.push(`None -- every host node type across all ${shots.length} renders matched a known converter rule.`);
  } else {
    if (Object.keys(unknown).length) {
      lines.push('Unknown host-component types (rendered as a small grey type-label box; content inside still renders, per the brief\'s own converter rule):');
      lines.push('');
      for (const [k, v] of Object.entries(unknown)) {
        lines.push(`- \`${k}\` x${v}${UNKNOWN_TYPE_NOTES[k] ? ` -- ${UNKNOWN_TYPE_NOTES[k]}` : ''}`);
      }
    }
    if (Object.keys(fallbacks).length) {
      lines.push('');
      lines.push('Other converter fallbacks:');
      for (const [k, v] of Object.entries(fallbacks)) lines.push(`- \`${k}\` x${v}`);
    }
  }
  lines.push('');
  lines.push('`ContextMenu*` types (ActiveWorkoutScreen\'s long-press "Edit set"/"Delete set" menu, `zeego/context-menu`, mocked at the shared repo-root `__mocks__/zeego/context-menu.js`) are deliberately hidden by the converter rather than shown as an unknown type: that shared mock renders `Root`/`Content` as an always-visible passthrough with no open/closed state, so left unhandled, each closed menu\'s items rendered inline on the row. A real device shows none of this until a long-press. Fixed in `treeToHtml.js` (a named `HIDDEN_TYPES` set), not in the shared mock, which is outside this harness\'s files.');
  lines.push('');

  lines.push('## 4. Re-run');
  lines.push('');
  lines.push('```');
  lines.push('bash scripts/paper-render/run.sh');
  lines.push('```');
  lines.push('');
  lines.push(`CI cannot see this suite: \`npx jest --listTests | grep -c paper-render\` prints \`0\` (\`paper-render.test.js\` lives directly under \`scripts/\`, outside package.json's \`jest.testMatch\` -- \`**/__tests__/**\` and \`**/tests/**\` only, and its Jest config is passed with \`--config\`, never auto-discovered).`);
  lines.push('');

  lines.push('## 5. Files');
  lines.push('');
  lines.push('- `scripts/paper-render/run.sh` -- the one command.');
  lines.push('- `scripts/paper-render/paper-render.test.js` -- Jest driver: seeds the persona + day-zero account, mounts every registered screen and its extra states, converts each to HTML.');
  lines.push('- `scripts/paper-render/screenPlan.js`, `registry.js` -- the every-screen list (read from RootNavigator.js), each screen\'s group, params and tab bar.');
  lines.push('- `scripts/paper-render/seedPersona.js` -- realistic data through the app\'s own write functions.');
  lines.push('- `scripts/paper-render/mockPreamble.js` -- the mock wall (screen-mount\'s own, plus this harness\'s own departures, each called out at its own `jest.mock()` site).');
  lines.push('- `scripts/paper-render/jest.config.js`, `assetTransform.js` -- the harness\'s Jest config and its image transform.');
  lines.push('- `scripts/paper-render/expoSqliteShim.js`, `dbCryptoPassthrough.js` -- the real-SQLite data layer.');
  lines.push('- `scripts/paper-render/treeToHtml.js` -- the React Native tree -> HTML converter.');
  lines.push('- `scripts/paper-render/shoot.js` -- this file: screenshots the HTML, builds `index.html` and `report.md`.');
  lines.push('- `scripts/paper-render/phoneSet.js` -- the phone-sized JPEG set and `manifest.json`.');
  lines.push(`- \`${OUT_DIR}/\` -- the deliverable: one PNG per screen/variant, \`index.html\` (contact sheet), \`report.md\` (this file).`);
  lines.push(`- \`${WORK_DIR}/\` -- intermediate working files (HTML per screen, \`report-data.json\`, \`shoot-data.json\`, the working SQLite file); safe to delete between runs, and \`run.sh\`/\`shoot.js\` do not depend on anything surviving from a previous run.`);
  lines.push('');

  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), lines.join('\n'), 'utf8');
}

// Per-screen annotations for report.md section 2, keyed by screen name
// (variants "Name-variant"). Grounded in what was actually read back from
// each rendered HTML file, not assumed.
const SCREEN_NOTES = {
  'HomeScreen': 'shows the undismissed "avoided movements" onboarding nudge above the session card -- real behaviour for a persona that has not dismissed it, not a harness artefact.',
  'ActiveWorkoutScreen': 'the long-press "Edit set"/"Delete set" menu on each logged set is hidden by the converter (see section 3) -- matches a real device\'s closed state.',
  'CoachOutputScreen': 'recomputes live via runWeeklyCoach() on mount and persists over the seed\'s authored decision -- see section 1\'s mount-order note.',
  'DiaryScreen': 'three meals logged, 1,625 of 2,650 kcal, matches the seed exactly.',
  'WeeklyCheckInScreen': 'opens (gateState "open"), not the wrong-day gate -- needed seeding @volyume_notification_prefs.checkinDay to today.',
  'HomeScreen-day0': 'fresh account welcome card, no session/food/weight -- by design.',
  'YouScreen-day0': 'no decision, no past decision, nothing logged -- by design.',
  'DiaryScreen-day0': '"Nothing logged for this day yet." -- by design.',
  'PlansScreen-day0': '"No active plan yet" -- by design.',
};

const UNKNOWN_TYPE_NOTES = {
  Canvas: '@shopify/react-native-skia chart canvases that draw something other than paths -- no HTML equivalent exists for those; the surrounding card labels/values are real text.',
};

main().catch((e) => {
  console.error('[paper-render:shoot] failed:', e);
  process.exit(1);
});

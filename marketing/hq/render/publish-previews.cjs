#!/usr/bin/env node
/*
 * publish-previews.cjs — the render -> dashboard wire.
 *
 * The final mechanical step of a social content item's journey through the
 * engine. After render-carousel.cjs / render-reel.cjs have produced the PNG
 * slides and the MP4 reel, this copies them into the dashboard's own served
 * directory (web/apps/web/public/marketing-previews/<slug>/) and prints the
 * exact SQL that writes the preview_assets manifest, caption and hashtags
 * onto the item's marketing_content row (compliance_record jsonb, merged, so
 * the compliance PASS record is preserved).
 *
 * The content pipeline (marketing-weekly / marketing-executor) runs this and
 * then executes the printed SQL against Supabase through the MCP layer. That
 * is the whole point: content reaches the dashboard through a codified step
 * the engine runs, never through a human hand-writing SQL. The dashboard
 * content page reads compliance_record.preview_assets and renders a playable,
 * downloadable, copyable pack.
 *
 * Usage:
 *   node publish-previews.cjs \
 *     --id <content_row_uuid> \
 *     --slug <slug e.g. week2-p1> \
 *     --carousel <dir of rendered slide-*.png> \
 *     --reel <path to rendered .mp4> \
 *     --caption-file <path to a UTF-8 file holding the caption> \
 *     --hashtags "#one #two #three"
 *
 * --carousel and --reel are each optional (an item may be reel-only or
 * carousel-only), but at least one asset must be present. --caption-file and
 * --hashtags are optional. Nothing is written to the database by this script;
 * it only moves files and prints SQL, so it is safe to re-run (idempotent
 * copy; the SQL is a jsonb merge that overwrites only the keys it sets).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PUBLIC_PREVIEWS = path.join(
  REPO_ROOT,
  'web',
  'apps',
  'web',
  'public',
  'marketing-previews',
);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : 'true';
      args[key] = val;
    }
  }
  return args;
}

// Postgres single-quote escape for a string literal embedded in the SQL.
function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function fail(msg) {
  process.stderr.write(`publish-previews: ${msg}\n`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.id) fail('missing --id <content_row_uuid>');
  if (!args.slug) fail('missing --slug <slug>');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args.slug)) fail('--slug must be kebab-case (a-z, 0-9, -)');

  const destDir = path.join(PUBLIC_PREVIEWS, args.slug);
  fs.mkdirSync(destDir, { recursive: true });

  // Manifest order: reel first, then slides in numeric order. Paths are the
  // public URL paths the dashboard serves (leading /marketing-previews/...).
  const assets = [];
  const publicBase = `/marketing-previews/${args.slug}`;

  if (args.reel && args.reel !== 'true') {
    const src = path.resolve(args.reel);
    if (!fs.existsSync(src)) fail(`--reel not found: ${src}`);
    const name = `reel-${args.slug}.mp4`;
    fs.copyFileSync(src, path.join(destDir, name));
    assets.push({ path: `${publicBase}/${name}`, kind: 'video', label: 'Reel (9:16)' });
  }

  if (args.carousel && args.carousel !== 'true') {
    const dir = path.resolve(args.carousel);
    if (!fs.existsSync(dir)) fail(`--carousel dir not found: ${dir}`);
    const slides = fs
      .readdirSync(dir)
      .filter((f) => /^slide-\d+\.png$/i.test(f))
      .sort();
    if (slides.length === 0) fail(`no slide-*.png in ${dir}`);
    slides.forEach((f, i) => {
      fs.copyFileSync(path.join(dir, f), path.join(destDir, f));
      assets.push({ path: `${publicBase}/${f}`, kind: 'image', label: `Slide ${i + 1}` });
    });
  }

  if (assets.length === 0) fail('no assets: pass --reel and/or --carousel');

  const record = { preview_assets: assets };
  if (args['caption-file'] && args['caption-file'] !== 'true') {
    const cf = path.resolve(args['caption-file']);
    if (!fs.existsSync(cf)) fail(`--caption-file not found: ${cf}`);
    record.caption = fs.readFileSync(cf, 'utf8').trim();
  }
  if (args.hashtags && args.hashtags !== 'true') {
    record.hashtags = String(args.hashtags).trim();
  }

  const sql =
    `update marketing_content\n` +
    `set compliance_record = coalesce(compliance_record, '{}'::jsonb) || ${sqlStr(
      JSON.stringify(record),
    )}::jsonb,\n` +
    `    updated_at = now()\n` +
    `where id = ${sqlStr(args.id)};`;

  // Files are staged; the caller runs the SQL through the Supabase MCP.
  process.stderr.write(
    `publish-previews: staged ${assets.length} asset(s) into ${path.relative(REPO_ROOT, destDir)}\n`,
  );
  process.stdout.write(`${sql}\n`);
}

main();

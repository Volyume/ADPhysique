/**
 * Clips are private device data and never leave the phone (D229 addendum 5,
 * ruling 5 of D229: "never synced, never in a Community post").
 *
 * Source-level guards (fs + regex, the repo's convention for locking a founder
 * rule), written to fail the moment any of these lines is crossed:
 *   - `workout_clips` appears NOWHERE in the sync layer (`src/lib/sync/`,
 *     `src/lib/sync.js`) and is not a cloud table in `supabase/`;
 *   - no sync, Supabase, telemetry or Community module is imported by the clip
 *     store, the rules, the sheets, the recorder hook or the camera screen;
 *   - no Community file (lib, components, screens, navigation) mentions a clip
 *     at all, so the Community payload allow-list cannot grow to carry one;
 *   - the local JSON backup does not list the table (its rows would name
 *     files the backup does not carry).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(js|sql|md)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

const SYNC_FILES = [...walk(path.join(SRC, 'lib', 'sync')), path.join(SRC, 'lib', 'sync.js')];
const COMMUNITY_FILES = [
  ...walk(path.join(SRC, 'lib', 'community')),
  ...walk(path.join(SRC, 'components', 'community')),
  ...fs.readdirSync(path.join(SRC, 'screens')).filter((f) => /^Community.*\.js$/.test(f)).map((f) => path.join(SRC, 'screens', f)),
  path.join(SRC, 'navigation', 'navigateCommunity.js'),
].filter((p) => fs.existsSync(p));
const CLIP_FILES = [
  ...walk(path.join(SRC, 'lib', 'clips')),
  ...walk(path.join(SRC, 'components', 'clips')),
  path.join(SRC, 'screens', 'ClipCameraScreen.js'),
];

describe('the scans see real files (a broken scan must not pass as a clean one)', () => {
  test('the sync layer, Community and the clip files are all found', () => {
    expect(SYNC_FILES.length).toBeGreaterThan(5);
    expect(COMMUNITY_FILES.length).toBeGreaterThan(20);
    expect(CLIP_FILES.length).toBeGreaterThan(8);
    expect(SYNC_FILES.every((p) => fs.existsSync(p))).toBe(true);
  });
});

describe('workout_clips is never registered with the sync layer', () => {
  test.each(SYNC_FILES.map((p) => [rel(p), p]))('%s does not mention workout_clips or the clips module', (_name, p) => {
    const text = read(p);
    expect(text).not.toMatch(/workout_clips|workoutClips/i);
    expect(text).not.toMatch(/lib\/clips|\.\/clips\b|\.\.\/clips\b/);
  });

  test('no Supabase migration, schema file or script creates or names a workout_clips table', () => {
    const offenders = walk(path.join(ROOT, 'supabase'))
      .filter((p) => /workout_clips/i.test(read(p)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('the local JSON backup does not carry the table', () => {
    const db = read(path.join(SRC, 'lib', 'database.js'));
    const start = db.indexOf('export const BACKUP_TABLES = [');
    expect(start).toBeGreaterThan(-1);
    const block = db.slice(start, db.indexOf('];', start));
    expect(block).not.toContain('workout_clips');
  });
});

describe('the clip files reach no network, sync or Community module', () => {
  const FORBIDDEN_IMPORT = /(?:from\s+|require\()\s*['"][^'"]*(?:\/sync|\/syncQueue|supabase|\/telemetry|\/community|\/observability|sentry)[^'"]*['"]/i;

  test.each(CLIP_FILES.filter((p) => !p.includes('__tests__')).map((p) => [rel(p), p]))('%s', (_name, p) => {
    expect(read(p)).not.toMatch(FORBIDDEN_IMPORT);
  });
});

describe('no Community file can carry a clip', () => {
  test.each(COMMUNITY_FILES.map((p) => [rel(p), p]))('%s never mentions a clip', (_name, p) => {
    const text = read(p);
    expect(text).not.toMatch(/\bclips?\b|workout_clips|clipId|ClipCamera|useClipRecorder/i);
  });
});

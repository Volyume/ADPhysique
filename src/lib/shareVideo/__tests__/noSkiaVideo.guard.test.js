/**
 * Skia's video object is banned from the app (lead ruling 2026-10-16, after
 * Sentry VOLYUME-3M, a native crash in RNSkia; the reasons are in the header
 * of src/lib/shareVideo/videoFrame.js). Read against the installed
 * @shopify/react-native-skia 2.2.12: on iOS its still frame is always empty
 * (the pixel buffer is asked for before the item has loaded); on Android each
 * one starts a playing MediaPlayer, leaks a hardware decoder (the destructor
 * never releases it) and its seek never ends at the end of the stream,
 * freezing the JS thread for good. Frames come from the app's own native
 * module instead (engine.extractFrames).
 *
 * Pinned over every non-test .js file under src/, with comments stripped by a
 * real parse (so a comment may explain the ban): no `Skia.Video`, no call of
 * any `.Video(`, no `['Video']` access, and no `useVideo` anywhere (Skia's
 * hook over the same object), imported or referenced. The guard is shown to
 * catch each form on purpose-built samples.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const SRC = path.join(__dirname, '..', '..', '..');

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '__mocks__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** The source with every comment blanked out, located by a real parse. */
function codeOnly(source) {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  const chars = source.split('');
  for (const c of ast.comments || []) {
    for (let i = c.start; i < c.end; i += 1) if (chars[i] !== '\n') chars[i] = ' ';
  }
  return chars.join('');
}

const BANNED = [
  ['Skia.Video', /\bSkia\s*\??\.\s*Video\b/],
  ['a .Video( call', /\.\s*Video\s*(?:\?\.\s*)?\(/],
  ["a ['Video'] access", /\[\s*['"`]Video['"`]\s*\]/],
  ['useVideo', /\buseVideo\b/],
];

function offences(source) {
  const code = codeOnly(source);
  return BANNED.filter(([, re]) => re.test(code)).map(([name]) => name);
}

describe('no Skia video object anywhere in src/', () => {
  const files = sourceFiles(SRC);

  test('the walk covers the app (and the files that once used it)', () => {
    expect(files.length).toBeGreaterThan(100);
    const rel = files.map((f) => path.relative(SRC, f).split(path.sep).join('/'));
    expect(rel).toContain('lib/shareVideo/videoFrame.js');
    expect(rel).toContain('components/share/VideoTrimBar.js');
    expect(rel).toContain('screens/ShareCardScreen.js');
  });

  test('no file uses it', () => {
    const found = files
      .map((f) => [path.relative(SRC, f), offences(fs.readFileSync(f, 'utf8'))])
      .filter(([, list]) => list.length);
    expect(found).toEqual([]);
  });

  test('the guard catches each form, and a comment explaining the ban passes', () => {
    expect(offences('const v = Skia.Video(uri);')).toEqual(['Skia.Video', 'a .Video( call']);
    expect(offences('const v = Skia?.Video?.(uri);')).toEqual(['Skia.Video', 'a .Video( call']);
    expect(offences('const v = S.Video(uri);')).toEqual(['a .Video( call']);
    expect(offences("const v = Skia['Video'](uri);")).toEqual(["a ['Video'] access"]);
    expect(offences("import { useVideo } from '@shopify/react-native-skia';")).toEqual(['useVideo']);
    expect(offences("const { useVideo: v } = require('@shopify/react-native-skia');")).toEqual(['useVideo']);
    expect(offences('// Skia.Video and useVideo are banned\n/* never S.Video(x) */\nconst a = 1;')).toEqual([]);
    expect(offences('const s = <Video source={x} />;')).toEqual([]);
  });
});

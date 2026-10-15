/**
 * The words a person reads on the share screen and on the share image
 * (founder, 2026-10-15): "British English, user-friendly, no AI talk, no
 * slang, no jargon", so no "render", "encode", "export", "compositor",
 * "HDR" or "codec" in anything a person reads. "Generate" joins them as the
 * machine's word for making something (the image is made, not generated).
 * Founder rule, the same day: "it needs to be very understandable for even
 * the least technical people", so a person reads "video", never "clip"
 * (code names may keep "clip"; only the words a person reads are held).
 *
 * A guard over every string a person can read in ShareCardScreen.js, the
 * renderer drawShareCard.js and the live photo preview SharePhotoFramer.js:
 * every string literal, template text and JSX text, single words included,
 * so a one-word label such as "Export" is caught as surely as a sentence.
 * Left out, because no person reads them: comments, import and require
 * paths, the tags and messages handed to logError and to new Error (logs,
 * never shown), and code keys (a lowercase word with no space, such as
 * 'story', 'semibold' or 'image/png'). Parsed with @babel/parser, as the
 * engine lane's copy guard does (src/lib/shareVideo/__tests__
 * /exportCopy.test.js), so an apostrophe in JSX text can never derail it.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const FILES = {
  'screens/ShareCardScreen.js': path.join(__dirname, '..', 'ShareCardScreen.js'),
  'lib/shareCard/drawShareCard.js': path.join(__dirname, '..', '..', 'lib', 'shareCard', 'drawShareCard.js'),
  'components/SharePhotoFramer.js': path.join(__dirname, '..', '..', 'components', 'SharePhotoFramer.js'),
};

const AI_WORD = /\bAI\b/; // case-sensitive, as a word: "again" and "said" are fine
const JARGON = /\b(?:render\w*|encod\w*|export\w*|compositors?|HDR|codecs?|generat\w*|clips?)\b/i;
const hasBannedWord = (s) => AI_WORD.test(s) || JARGON.test(s);

// A code key, not words: a lowercase start and no space ('story',
// 'displayHeavy', 'image/png', 'rgba(0,0,0,0)', 'ShareCard.x' tags are
// caught by the logError rule below).
const isCodeKey = (s) => /^[a-z#@./(][^\s]*$/.test(s) || /^[^\s]*\.[^\s]*$/.test(s) || !/[A-Za-z]/.test(s);

function readableStrings(source) {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const found = [];
  const skipCall = (node) => {
    if (node.type === 'CallExpression') {
      const c = node.callee;
      if (c.type === 'Identifier' && (c.name === 'logError' || c.name === 'logWarn' || c.name === 'logInfo' || c.name === 'require')) return true;
      if (c.type === 'MemberExpression' && c.property && c.property.name === 'requireActual') return true;
    }
    if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Error') return true;
    return node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' && node.source;
  };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type && skipCall(node)) return;
    if (node.type === 'StringLiteral') found.push(node.value);
    if (node.type === 'TemplateElement') found.push(node.value.cooked || '');
    if (node.type === 'JSXText') found.push(node.value);
    Object.keys(node).forEach((key) => {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') return;
      walk(node[key]);
    });
  };
  walk(ast.program);
  return found.map((s) => s.trim()).filter((s) => s && !isCodeKey(s));
}

describe('no jargon or machine talk in anything a person reads on the share screen or image', () => {
  test.each(Object.keys(FILES))('%s', (name) => {
    const strings = readableStrings(fs.readFileSync(FILES[name], 'utf8'));
    // The scan really reads the file's words.
    expect(strings.length).toBeGreaterThan(5);
    expect(strings.filter(hasBannedWord)).toEqual([]);
    expect(strings.filter((s) => /—/.test(s))).toEqual([]);
  });

  test('the screen\'s own words are what the scan reads', () => {
    const strings = readableStrings(fs.readFileSync(FILES['screens/ShareCardScreen.js'], 'utf8'));
    ['Gallery', 'Photo', 'None', 'Full screen', 'Feed', 'Share image', 'Save to gallery', 'Set as wallpaper', 'Save it, then set it from Photos.']
      .forEach((w) => expect(strings).toContain(w));
  });

  test('the guard catches what it is meant to catch, single words included', () => {
    ['Export', 'Rendering your image', 'Encoding', 'The compositor failed', 'This clip is HDR', 'No codec',
      "Couldn't generate the image", 'Made with AI', 'Clip', 'Record a clip'].forEach((s) => expect(hasBannedWord(s)).toBe(true));
    ['Share image', 'Save it, then set it from Photos.', 'Try again', 'again', 'said', 'Video', 'Eclipse'].forEach((s) => expect(hasBannedWord(s)).toBe(false));
    // A single capitalised word is read, not passed over as a code key.
    expect(isCodeKey('Export')).toBe(false);
    expect(isCodeKey('story')).toBe(true);
  });
});

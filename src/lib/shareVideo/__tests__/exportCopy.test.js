/**
 * The words a person reads when a share video cannot be made (founder,
 * 2026-10-15): British English, user-friendly, no jargon or technical words.
 *
 * Pins:
 *   1. the founder's seven lines for the research report's classes A to G
 *      (section 5.4), verbatim, one per error code;
 *   2. no line for a cancel the person chose, or for a second tap while a
 *      video is already being made;
 *   3. a guard over every prose string literal (any literal with a space in
 *      it) in src/lib/shareVideo: none says AI, HDR, codec, decoder, encoder,
 *      render, export or compositor, and none carries an em dash. Internal
 *      detail strings are held to the same words, so nothing technical can
 *      reach a screen by accident.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import { EXPORT_ERROR, lineForExportError } from '../engine';

jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('absent in tests'); }),
}));

const FOUNDER_LINES = {
  E_DECODE: 'This phone cannot open that video. Some videos filmed at very high quality are too much for older phones. You could record a video in Volyume instead, or choose a different one.',
  E_ENCODE: 'The video could not be made on this phone this time. You can try again, or choose None under Background to share the card as an image.',
  E_FRAME: 'That video was too big for this phone to prepare. A shorter video, or one filmed at a lower quality, should work.',
  E_SOURCE: 'That video could not be opened. It may have been moved or deleted.',
  E_SPACE: 'There is not enough space on your phone to make the video. Once some space is free you can try again.',
  E_ICLOUD: 'That video is still downloading from iCloud. Try again once it has finished.',
  E_BACKGROUND: 'The video stops if Volyume is closed while it is being made. Keep Volyume open and try again.',
};

const AI_WORD = /\bAI\b/; // case-sensitive, as a word: "again" and "said" are fine
const TECHNICAL = /\b(?:HDR|codecs?|decoders?|encoders?|render\w*|export\w*|compositors?)\b/i;

function hasBannedWord(text) {
  return AI_WORD.test(text) || TECHNICAL.test(text);
}

describe('the founder\'s lines', () => {
  test.each(Object.entries(FOUNDER_LINES))('%s reads exactly as the founder wrote it', (code, line) => {
    expect(lineForExportError(code)).toBe(line);
  });

  test('every class A to G code has its line', () => {
    const codes = [EXPORT_ERROR.DECODE, EXPORT_ERROR.ENCODE, EXPORT_ERROR.FRAME, EXPORT_ERROR.SOURCE,
      EXPORT_ERROR.SPACE, EXPORT_ERROR.ICLOUD, EXPORT_ERROR.BACKGROUND];
    expect(codes.sort()).toEqual(Object.keys(FOUNDER_LINES).sort());
  });

  test('every line says "video", never "clip", and claims no restart of its own (addendum 8)', () => {
    for (const line of Object.values(FOUNDER_LINES)) {
      expect(line).not.toMatch(/\bclips?\b/i);
      expect(line).not.toMatch(/start again/);
    }
  });

  test('nothing is said for a chosen cancel or a second tap', () => {
    expect(lineForExportError(EXPORT_ERROR.CANCELLED)).toBeNull();
    expect(lineForExportError(EXPORT_ERROR.BUSY)).toBeNull();
  });

  test('invalid options and unknown codes read as "could not be made this time"', () => {
    expect(lineForExportError(EXPORT_ERROR.INVALID)).toBe(FOUNDER_LINES.E_ENCODE);
    expect(lineForExportError('E_SOMETHING_NEW')).toBe(FOUNDER_LINES.E_ENCODE);
    expect(lineForExportError(undefined)).toBe(FOUNDER_LINES.E_ENCODE);
  });

  test('a video filmed in Volyume gets the in-app forms of the two quality-advice lines; the gallery forms are unchanged', () => {
    expect(lineForExportError('E_DECODE', { fromGallery: false })).toBe('That video could not be read. Try filming it again.');
    expect(lineForExportError('E_FRAME', { fromGallery: false })).toBe('That video could not be drawn. Try filming it again.');
    expect(lineForExportError('E_DECODE', { fromGallery: true })).toBe(FOUNDER_LINES.E_DECODE);
    expect(lineForExportError('E_FRAME')).toBe(FOUNDER_LINES.E_FRAME);
    // Every other code reads the same either way.
    expect(lineForExportError('E_SPACE', { fromGallery: false })).toBe(FOUNDER_LINES.E_SPACE);
    expect(lineForExportError(EXPORT_ERROR.CANCELLED, { fromGallery: false })).toBeNull();
  });

  test('every line a person can see is plain: no technical word, no em dash, no "we"', () => {
    const lines = Object.values(EXPORT_ERROR).map(lineForExportError).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const line of lines) {
      expect(hasBannedWord(line)).toBe(false);
      expect(line).not.toMatch(/\u2014/);
      expect(line).not.toMatch(/\bwe\b/i);
      expect(line).toMatch(/\.$/);
    }
  });
});

describe('no technical words in any prose string in src/lib/shareVideo', () => {
  const DIR = path.join(__dirname, '..');
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));

  function proseLiterals(source) {
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
    const found = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === 'StringLiteral' && /\s/.test(node.value)) found.push(node.value);
      if (node.type === 'TemplateElement' && /\s/.test(node.value.cooked || '')) found.push(node.value.cooked);
      if (node.type === 'JSXText' && node.value.trim()) found.push(node.value.trim());
      for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
        walk(node[key]);
      }
    };
    walk(ast.program);
    return found;
  }

  test('the folder holds the engine', () => {
    expect(files).toContain('engine.js');
  });

  test.each(files)('%s', (file) => {
    const literals = proseLiterals(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const offending = literals.filter(hasBannedWord);
    expect(offending).toEqual([]);
    expect(literals.filter((s) => /\u2014/.test(s))).toEqual([]);
  });

  test('the guard catches what it is meant to catch', () => {
    expect(hasBannedWord('Exporting your video')).toBe(true);
    expect(hasBannedWord('Rendering')).toBe(true);
    expect(hasBannedWord('This clip is HDR')).toBe(true);
    expect(hasBannedWord('No decoder found')).toBe(true);
    expect(hasBannedWord('Made with AI')).toBe(true);
    expect(hasBannedWord('Try again once it has finished.')).toBe(false);
  });
});

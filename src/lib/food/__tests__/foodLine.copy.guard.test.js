/**
 * Source guard for the typed food line (D230 R13, lane 3C; R15 and the
 * founder's No-AI rule). The new files say what they do in plain words: no
 * "parse", "recognise", "detect", "smart", "AI" or "magic" in any string,
 * comment or name, and no model, camera or microphone is reached. The one
 * permitted exception is the function name `parseFoodLine`, the name the
 * lane's brief fixes; it is removed before the scan so a second use of the
 * word anywhere else still fails. Also pins that the files hold no em dash.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const FILES = [
  'src/lib/food/foodLine.js',
  'src/components/food/FoodLineReviewSheet.js',
];

const BANNED = [
  [/pars(e|ed|er|es|ing)\b/i, 'parse'],
  [/recogni[sz]/i, 'recognise'],
  [/detect/i, 'detect'],
  [/smart/i, 'smart'],
  [/\bAI\b/, 'AI'],
  [/magic/i, 'magic'],
  [/\b(llm|gpt|openai|anthropic|claude|camera|microphone|voice|speech)\b/i, 'model, camera or voice'],
];

describe('typed food line files stay plain', () => {
  for (const rel of FILES) {
    test(`${rel} uses none of the banned words`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/parseFoodLine/g, 'PERMITTED_NAME');
      for (const [re, word] of BANNED) {
        expect({ file: rel, word, found: re.test(src) }).toEqual({ file: rel, word, found: false });
      }
      expect(src).not.toMatch(/—/);
    });
  }

  test('the screen offers the line with the plain wording and no banned word near it', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/screens/FoodSearchScreen.js'), 'utf8');
    const start = src.indexOf('D230 R13: several foods in one typed line');
    const end = src.indexOf('Quick add: log calories');
    const block = src.slice(start, end).replace(/parseFoodLine/g, 'PERMITTED_NAME');
    expect(block.length).toBeGreaterThan(500);
    for (const [re, word] of BANNED) {
      expect({ word, found: re.test(block) }).toEqual({ word, found: false });
    }
    expect(src).toContain('Add these ${lineParts.length} as separate foods');
  });
});

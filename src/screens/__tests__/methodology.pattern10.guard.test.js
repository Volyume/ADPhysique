/**
 * Source guard for MethodologyScreen against the locked voice rules
 * (COACHING_VOICE_SYNTHESIS_LOCKED.md Pattern 10: plain-mechanism language —
 * substitute "FFM"/"fat-free mass" with "lean mass" or "muscle" in anything
 * a user reads). Wave A B2 fixed three violations; this pins the rule.
 */
import fs from 'fs';
import path from 'path';

const RAW = fs.readFileSync(
  path.join(__dirname, '..', 'MethodologyScreen.js'),
  'utf8',
);
// Strip line + block comments so code commentary (which may name the old
// term when citing the locked doc) never trips the user-facing check.
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('MethodologyScreen honours locked Pattern 10', () => {
  test('no user-facing "fat-free mass" or bare FFM', () => {
    expect(CODE).not.toMatch(/fat-free/i);
    expect(CODE).not.toMatch(/\bFFM\b/);
  });

  test('the lean-mass energy floor keeps its published number', () => {
    expect(CODE).toMatch(/30 calories per kilogram of lean\s*'?\s*\+?\s*'?\s*mass/);
  });

  test('entry-point deep-linking maps sources onto sections', () => {
    expect(RAW).toMatch(/SOURCE_SECTION/);
    expect(RAW).toMatch(/held_decisions:\s*'holds'/);
    expect(RAW).toMatch(/route\?\.params\?\.source/);
  });
});

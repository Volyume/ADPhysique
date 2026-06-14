/**
 * themeTokens.guard.test.js — phantom theme-token guard.
 *
 * Found on a founder device-walk (2026-06-12): PartnerSection, PlanPreview
 * and Quiz styled text with `colors.text`, which does not exist in the theme.
 * `color: undefined` falls back to React Native's default near-black, which
 * is invisible on the dark background — a whole sheet rendered black-on-black
 * and nothing failed. This guard makes any reference to a non-existent
 * colours/fontWeight/fontSize/spacing/radius token a TEST FAILURE, app-wide.
 */
import fs from 'fs';
import path from 'path';
import { colors, fontWeight, fontSize, spacing, radius } from '../styles/theme';

const SRC = path.resolve(__dirname, '..');

function listJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listJsFiles(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const FAMILIES = [
  ['colors', colors],
  ['fontWeight', fontWeight],
  ['fontSize', fontSize],
  ['spacing', spacing],
  ['radius', radius],
];

describe('theme token guard: no component references a token that does not exist', () => {
  const files = listJsFiles(SRC);

  test.each(FAMILIES)('%s.* references all resolve', (family, table) => {
    const known = new Set(Object.keys(table || {}));
    const re = new RegExp(`\\b${family}\\.([a-zA-Z0-9_]+)`, 'g');
    const offences = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      let m;
      while ((m = re.exec(text)) !== null) {
        const key = m[1];
        if (!known.has(key)) {
          offences.push(`${path.relative(SRC, file)}: ${family}.${key}`);
        }
      }
    }
    expect(offences).toEqual([]);
  });
});

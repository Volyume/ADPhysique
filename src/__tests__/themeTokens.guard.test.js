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
import { colors, fontWeight, fontSize, spacing, radius, type } from '../styles/theme';

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

// Comments are stripped before every scan below. Without this, PROSE that
// names a removed token fails the build -- which is exactly what happened on
// 2026-09-15: a comment explaining why `colors.gold` had been deleted, written
// at the site where it was deleted, tripped this guard. A guard that punishes
// you for documenting a removal teaches people not to document removals.
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('theme token guard: no component spreads a type role that does not exist', () => {
  // The same failure as the colours case above, one family later: PlansScreen
  // spread `type.labelSm`, which buildTypeRoles never defined. Spreading
  // undefined is silent -- the style object keeps only its own keys, so the
  // block-review verdict title rendered with a colour and NO fontFamily,
  // fontSize or lineHeight, falling back to React Native's bare default while
  // every test passed. The FAMILIES table above cannot catch it because `type`
  // is built from getters, not a flat token map.
  //
  // `t.type.X` is always the theme (the useTheme() convention). A bare
  // `type.X` is only the theme in a file that imports `type` from the theme,
  // so a file with its own local `type` variable is not flagged.
  const files = listJsFiles(SRC);
  const known = new Set(Object.keys(type));

  test('every type.* role resolves', () => {
    const offences = [];
    for (const file of files) {
      const text = code(fs.readFileSync(file, 'utf8'));
      const importsType = /^import\s*\{[^}]*\btype\b[^}]*\}\s*from\s*'[^']*styles\/theme'/m.test(text);
      const re = /\b(t\.)?type\.([a-zA-Z0-9_]+)/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const viaHook = Boolean(m[1]);
        if (!viaHook && !importsType) continue;
        if (!known.has(m[2])) offences.push(`${path.relative(SRC, file)}: ${m[0]}`);
      }
    }
    expect(offences).toEqual([]);
  });
});

// KNOWN LIMIT, recorded 2026-09-15 rather than left for someone to trip over.
// These scans are anchored on the literal family name (`colors.`, `spacing.`),
// so a file that ALIASES the palette hides from them. `LiftProgressScreen.js`
// does exactly that (`buildLevelColor(c)` then `c.gold`), which is how a
// reference to a token deleted in D173 survived this guard, the amber lane
// guards and a full sweep -- and rendered an Elite lifter's badge in a
// Beginner's grey, because the lookup resolved undefined and fell through a
// `||` default.
//
// A generic fix is not available here: this guard cannot know which local
// identifiers are palettes. The specific hole is closed by
// `src/lib/__tests__/rewardProps.guard.test.js`, which bans the PROPERTY
// (`.gold` / `.silver` / `.bronze` on anything at all) rather than the object,
// because those three words are only ever the deleted medal roles. If another
// token is ever deleted, it needs the same property-level ban; this scan alone
// will not catch an aliased read of it.
describe('theme token guard: no component references a token that does not exist', () => {
  const files = listJsFiles(SRC);

  test.each(FAMILIES)('%s.* references all resolve', (family, table) => {
    const known = new Set(Object.keys(table || {}));
    const re = new RegExp(`\\b${family}\\.([a-zA-Z0-9_]+)`, 'g');
    const offences = [];
    for (const file of files) {
      const text = code(fs.readFileSync(file, 'utf8'));
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

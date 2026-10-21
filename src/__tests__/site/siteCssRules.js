/**
 * The per-declaration CSS rules behind the volyume.app design guard, kept
 * apart from the test so site.selftest.test.js can feed them CSS that must be
 * caught and CSS that must pass. Authority: docs/site-rebuild-2026-10/BRIEF.md
 * ("Design") and src/styles/theme.js.
 */
'use strict';

const selectorsOf = (rule) => rule.selector.split(',').map((s) => s.trim()).filter(Boolean);
const allowed = (rule, list) => selectorsOf(rule).every((sel) => list.some((re) => re.test(sel)));

/**
 * Problems with one declaration, as [{cat, msg}].
 * ctx: { radiusPx: Set of allowed px radii, roundOk: [RegExp], nowrapOk: [RegExp], isTokens: boolean }
 */
function declProblems(decl, rule, ctx) {
  const out = [];
  const { prop, value } = decl;
  const add = (cat, msg) => out.push({ cat, msg });

  // 1. Clipped text
  if (prop === 'text-overflow' && /ellipsis/i.test(value)) add('clip', 'text-overflow: ellipsis');
  if (/line-clamp/.test(prop) || /line-clamp/i.test(value)) add('clip', 'line-clamp');
  if (prop === 'white-space' && /nowrap|\bpre\b/i.test(value) && !allowed(rule, ctx.nowrapOk)) add('nowrap', 'text must wrap');
  if (/^overflow(-x)?$/.test(prop) && /hidden|clip/i.test(value) && selectorsOf(rule).some((s) => /^(html|body|:root)$/i.test(s))) {
    add('overflow', 'hides a horizontal overflow instead of fixing it');
  }

  // 2. Pills
  if (/radius/.test(prop) && !prop.startsWith('--') && !allowed(rule, ctx.roundOk)) {
    if (/var\(\s*--[\w-]*(full|pill|circle|round)/i.test(value) || /infinity|vmax|vmin/i.test(value)) add('radius', 'a pill radius');
    for (const m of value.matchAll(/(-?\d*\.?\d+)\s*(px|rem|em|%)?/g)) {
      const n = Number(m[1]);
      const unit = m[2] || '';
      if (unit === '%' && n > 0) { add('radius', 'a percentage radius makes a circle or a pill'); continue; }
      const px = unit === 'rem' || unit === 'em' ? n * 16 : n;
      if (px >= 999) add('radius', 'a pill radius');
      else if (px !== 0 && !ctx.radiusPx.has(px)) add('radius', `${px}px is not a theme radius (${[...ctx.radiusPx].join(', ')})`);
    }
  }
  if (prop.startsWith('--')) {
    if (/(radius|corner|shape).*(full|pill|circle|round)|^--(full|pill|round)\b/i.test(prop)) add('radius-var', `custom property ${prop}`);
    if (/radius|corner/.test(prop) && parseFloat(value) >= 999) add('radius-var', `${prop}: ${value}`);
  }

  // 3. Gradient text, glow, glass, motion that never stops
  if (/background-clip$/.test(prop) && /\btext\b/i.test(value)) add('gradient-text', 'background-clip: text');
  if (/text-fill-color$/.test(prop) && /transparent/i.test(value)) add('gradient-text', 'transparent text fill');
  if (prop === 'text-shadow' && !/^none$/i.test(value)) add('glow', 'text-shadow');
  if (/backdrop-filter$/.test(prop) && !/^none$/i.test(value)) add('glass', 'backdrop-filter');
  if (/^(-webkit-)?filter$/.test(prop) && /blur\(/i.test(value)) add('glow', 'filter: blur');
  if (/^animation(-iteration-count)?$/.test(prop) && /infinite/i.test(value)) add('motion', 'animation runs forever');

  // 5. The site follows the app
  if (!ctx.isTokens) {
    const bare = value.replace(/url\([^)]*\)/gi, '');
    const hex = bare.match(/#[0-9a-fA-F]{3,8}\b/);
    const fn = bare.match(/\b(rgba?|hsla?)\(\s*[^)]*\)/i);
    const neutral = fn && /^rgba?\(\s*(0\s*[, ]\s*0\s*[, ]\s*0|255\s*[, ]\s*255\s*[, ]\s*255)\b/i.test(fn[0]);
    if (hex || (fn && !neutral)) add('colour', 'a colour written outside tokens.css');
    if (prop === 'font-size' && /\d\s*px\b/i.test(value)) add('size-px', 'font-size in px');
    if (prop === 'font' && /\d\s*px\b/i.test(value)) add('size-px', 'font shorthand in px');
  }
  if (prop === 'font-size') {
    const px = value.match(/^(\d*\.?\d+)\s*px$/);
    const rem = value.match(/^(\d*\.?\d+)\s*r?em$/);
    const size = px ? Number(px[1]) : rem ? Number(rem[1]) * 16 : null;
    if (size !== null && size < 11) add('size-min', `${size}px is smaller than 11px`);
  }
  return out;
}

module.exports = { declProblems, selectorsOf, allowed };

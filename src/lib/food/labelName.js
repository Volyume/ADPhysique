/**
 * food/labelName.js
 *
 * Pick a product name from the OCR of a front-of-pack photo. Pure and
 * deterministic so it's unit-testable against either MLKit block output
 * (text + frame geometry) or plain text.
 *
 * The name on a front of pack is the most prominent text near the top, so
 * with block geometry we score by font size (frame height) and prefer
 * blocks higher up. Without geometry we take the first sensible line. Either
 * way we drop the things that are never the name: pack sizes (500g, 6x330ml),
 * nutrition-table rows (Energy 1465kJ, Protein 20g), and legal / URL / store
 * lines. Crucially a name that merely contains a macro word ("High Protein
 * Granola") is kept; only a bare macro row ("Protein 20g") is dropped.
 *
 * Returns a trimmed name string (max 50 chars) or null when nothing usable
 * is found, in which case the user just types it as before.
 */

const MAX_LEN = 50;

// Strong table / legal / packaging words. A line carrying any of these is
// never a product name. Deliberately does NOT include protein / fat / carbs
// on their own, because those appear in real product names.
// Leading boundary only (no trailing \b) so these match as stems:
// "nutrition" hits "Nutritional", "ingredient" hits "Ingredients".
const STRONG = /\b(energy|kcal|kj|saturat|carbohydrate|of which|reference intake|nutrition|ingredient|allerg|best before|use by|store|keep refrigerated|recycl|barcode|www\.|http|\.com|\.co\.uk)/i;

// A bare macro / energy word left on its own after the number is stripped is a
// table row, not a name.
const BARE_MACRO = /^(protein|fat|carbs?|carbohydrate|sugars?|salt|fibre|fiber|energy|calories?|saturates?)$/i;

// Pack-size tokens: "500g", "1 kg", "330ml", "6 x 330ml", "1.5L". Stripped
// from a candidate before it is judged, so "Granola 500g" becomes "Granola".
function _stripPackSize(s) {
  return String(s || '')
    .replace(/\b\d+\s*[x×]\s*\d+(\.\d+)?\s*(g|kg|mg|ml|cl|l|oz|lb)\b/gi, '')
    .replace(/\b\d+(\.\d+)?\s*(g|kg|mg|ml|cl|l|oz|lb|litre|litres)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _clean(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•·|>*]+|[\s\-–—•·|>*]+$/g, '')
    .trim();
}

// Turn one raw line / block into a name candidate, or null if it can't be one.
function _candidate(raw) {
  const cleaned = _clean(raw);
  if (!cleaned) return null;
  if (STRONG.test(cleaned)) return null;
  const stripped = _stripPackSize(cleaned);
  if (!/[a-z]{2,}/i.test(stripped)) return null;   // needs a real word, not "99p" / a code
  if (stripped.length < 2) return null;
  if (BARE_MACRO.test(stripped)) return null;      // "Protein" left from "Protein 20g"
  if (/^\d+\s*%$/.test(cleaned)) return null;      // a lone percentage
  return stripped.slice(0, MAX_LEN);
}

// Geometry path: score each block by font size (frame height), break ties by
// how high up it sits. Degrades to first-acceptable order when frames are
// absent (every height 0).
function _fromBlocks(blocks) {
  const scored = [];
  for (const b of blocks) {
    const text = _candidate(b?.text);
    if (!text) continue;
    const f = b?.frame || b?.boundingBox || {};
    const height = Number(f.height) || (Number(f.bottom) - Number(f.top)) || 0;
    const top = Number(f.top != null ? f.top : f.y) || 0;
    scored.push({ text, height, top });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => (b.height - a.height) || (a.top - b.top));
  return scored[0].text;
}

// Flat-text path: first line that survives the candidate filter.
function _fromLines(lines) {
  for (const line of lines) {
    const text = _candidate(line);
    if (text) return text;
  }
  return null;
}

/**
 * @param input  An OCR result ({ text, blocks:[{text, frame}] }) or a plain
 *               string. Blocks are preferred (font-size aware); the text
 *               field is the fallback.
 * @returns {string|null} the product name, or null.
 */
export function pickProductName(input) {
  if (!input) return null;
  if (typeof input === 'string') return _fromLines(input.split(/\r?\n/));
  if (Array.isArray(input.blocks) && input.blocks.length) {
    const fromBlocks = _fromBlocks(input.blocks);
    if (fromBlocks) return fromBlocks;
  }
  if (typeof input.text === 'string') return _fromLines(input.text.split(/\r?\n/));
  return null;
}

/**
 * OCR text -> macro extraction.
 *
 * Parses raw OCR output from a nutrition label into a structured
 * macro set ({ kcal100g, protein100g, carbs100g, fat100g, fibre100g,
 * servingG }). Deterministic + regex-based; works the same against
 * MLKit output, cloud Vision output, or hand-typed text in tests.
 *
 * Locked in MOVE_1_5_BARCODE_AND_OCR.md. Confidence is reported
 * alongside each field so the UI can flag unsure values; the user
 * always confirms in AddCustomFood before save.
 */

// Normalise common OCR artefacts: kerning between digits + units,
// commas used as decimals, dash variants, whitespace collapse.
// An earlier draft also substituted I/i/l -> 1 to fix the classic
// OCR confusion ("I00g" -> "100g"), but it ate the space between
// "kcal" and the next number ("kcal 105" -> "kca1105"), causing
// more damage than it fixed. Leave OCR-engine confusions to the
// engine.
function _normalise(raw) {
  return String(raw || '')
    .replace(/(\d)\s*[,]\s*(\d)/g, (_, a, b) => `${a}.${b}`)
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "per 100g" / "per 100 g" / "per 100ml" anchoring. Many labels also
// carry a "per serving" column right next to it; if both are present
// we prefer per-100g (Volyume stores per-100g internally).
const PER_100_PATTERNS = [
  /per\s*100\s*g/i,
  /per\s*100\s*ml/i,
  /\b100\s*g\b/i,
  /\b100\s*ml\b/i,
];

function _hasPer100Anchor(text) {
  return PER_100_PATTERNS.some(p => p.test(text));
}

// Match "<keyword> ... <number> [unit]". Number captured raw; unit
// is informational. The keyword can have an internal space (e.g.
// "saturated fat" vs "fat") -- exact match avoided by leading word
// boundary + non-greedy gap of at most 30 non-digit chars.
function _matchValue(text, keyword) {
  const re = new RegExp(
    `\\b${keyword}\\b[^0-9\\n\\r]{0,30}(\\d{1,4}(?:\\.\\d{1,2})?)\\s*(kcal|kj|g|mg)?`,
    'i'
  );
  const m = text.match(re);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  return { value, unit: (m[2] || '').toLowerCase() || null };
}

// kcal is special: many labels write it as "<NUM> kcal" rather than
// "kcal <NUM>". Match the unit-trailing form first, then fall back
// to keyword-leading via _matchValue.
function _matchKcal(text) {
  // "350 kcal" with optional decimal. Anchored on the unit so "10g"
  // (a protein figure) doesn't get picked up.
  const m = text.match(/(\d{1,4}(?:\.\d{1,2})?)\s*kcal\b/i);
  if (m) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v)) return { value: v, unit: 'kcal' };
  }
  return _matchValue(text, 'calories');
}

function _matchKj(text) {
  // "1465 kJ" or "energy 1465 kJ". Returns kJ raw; caller converts.
  const m = text.match(/(\d{2,5}(?:\.\d{1,2})?)\s*kj\b/i);
  if (m) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v)) return { value: v, unit: 'kj' };
  }
  return null;
}

function _kcalFromKj(kj) {
  return Math.round(kj / 4.184);
}

/**
 * Parse OCR text into a macros candidate. Returns
 * { fields: { kcal100g, protein100g, carbs100g, fat100g, fibre100g,
 *             servingG },
 *   confidence: { kcal100g, protein100g, ... } each 'high' | 'low' }.
 *
 * `kcal100g` is high-confidence only when a "per 100g" anchor is
 * present in the source. Without an anchor we still extract values
 * (so the user has something to edit) but mark them low-confidence
 * so the UI can flag them.
 */
/**
 * Should a scanned macro field be flagged for the user to double-check?
 * True only while the field still holds the low-confidence value the OCR
 * prefilled, so the moment the user edits it (the input string stops matching
 * the prefill) the flag clears. Pure; AddCustomFood uses it to mark a field
 * amber.
 *
 * @param level         the field's confidence ('high'|'low'|'missing')
 * @param prefillValue  the raw number the parser returned for the field
 * @param current       the current string in the input
 */
export function fieldNeedsCheck(level, prefillValue, current) {
  if (level !== 'low') return false;
  if (current == null || current === '') return false;
  const prefillStr = (prefillValue == null || !Number.isFinite(prefillValue)) ? '' : String(prefillValue);
  return current === prefillStr;
}

export function parseNutritionLabel(rawText) {
  const text = _normalise(rawText);
  const hasAnchor = _hasPer100Anchor(text);

  const protein = _matchValue(text, 'protein');
  const carbs = _matchValue(text, 'carbohydrate') || _matchValue(text, 'carbs');
  const fat = _matchValue(text, 'fat');
  const fibre = _matchValue(text, 'fibre') || _matchValue(text, 'fiber');

  // Energy: prefer kcal, fall back to kJ -> kcal conversion. kcal
  // gets its own unit-trailing matcher because "<num> kcal" is the
  // dominant form on UK + EU labels.
  let kcal = _matchKcal(text);
  if (!kcal) {
    const kj = _matchKj(text);
    if (kj) kcal = { value: _kcalFromKj(kj.value), unit: 'kcal' };
  }

  // Serving size: "Serving size 30g" / "Serving 250 ml" / "Portion 40g".
  // Deliberately does NOT match "per 100g" -- that's the per-100g
  // anchor, not a serving statement. The "per" branch is reserved
  // for labels that use "Per portion: 50g" wording.
  let serving = null;
  const sm = text.match(/(?:serving|portion)\s*(?:size)?\s*[:\s]*(\d{1,4})\s*(g|ml)\b/i)
    || text.match(/per\s+(?:portion|serving)[:\s]*(\d{1,4})\s*(g|ml)\b/i);
  if (sm) serving = { value: parseFloat(sm[1]), unit: sm[2].toLowerCase() };

  const conf = (v) => (v && hasAnchor ? 'high' : v ? 'low' : 'missing');

  return {
    fields: {
      kcal100g: kcal?.value ?? null,
      protein100g: protein?.value ?? null,
      carbs100g: carbs?.value ?? null,
      fat100g: fat?.value ?? null,
      fibre100g: fibre?.value ?? null,
      servingG: serving?.unit === 'g' ? serving.value : null,
    },
    confidence: {
      kcal100g: conf(kcal),
      protein100g: conf(protein),
      carbs100g: conf(carbs),
      fat100g: conf(fat),
      fibre100g: conf(fibre),
      servingG: serving ? 'high' : 'missing',
    },
    hasAnchor,
  };
}

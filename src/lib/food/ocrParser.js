/**
 * OCR text -> macro extraction.
 *
 * Parses raw OCR output from a nutrition label into a structured
 * macro set ({ kcal100g, protein100g, carbs100g, fat100g, fibre100g,
 * servingG, servingMl, servingUnit }). Deterministic + regex-based;
 * works the same against MLKit output, cloud Vision output, or
 * hand-typed text in tests.
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
    // A comma between digits is EITHER a decimal ("12,5" g) OR a thousands
    // separator ("2,000" kJ). Treating every comma as a decimal turned kJ-only
    // labels' energy into ~3x under-reads ("2,000 kJ" -> "2.000" -> 2 kJ, audit
    // 2026-07-01). Disambiguate by the digit count AFTER the comma: exactly 3
    // (and no more) is a thousands group -> join; 1-2 is a decimal -> dot.
    .replace(/(\d)\s*,\s*(\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d)\s*,\s*(\d{1,2})(?!\d)/g, '$1.$2')
    // A thousands group split by a space ("1 046 kJ", the SI style many EU
    // labels print, food data-layer audit 2026-10-16 item 8): read as 46 kJ
    // it became 11 kcal. Joined ONLY before an energy unit, and only when the
    // first group is a whole 1 or 2 digit number (not the tail of a decimal),
    // so two figures in two columns ("Fat 9.0g 15g") are never merged.
    .replace(/(^|[^\d.])(\d{1,2}) (\d{3})(?=\s*(?:kj|kcal)\b)/gi, '$1$2$3')
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

// Food data-layer audit 2026-10-16, item 8.
//
// Where the table starts: an ingredients list printed before the table
// ("milk protein 12%") fed the protein figure. When the text names the table
// ("Typical values", "Nutrition"), matching starts there.
const TABLE_START_RE = /\btypical\s+values\b|\bnutrition(?:al)?\b/i;
function _tableText(text) {
  const m = TABLE_START_RE.exec(text);
  return m ? text.slice(m.index) : text;
}

// The column headers. A per-serving column ("per serving", "per bar", "per
// portion") printed BEFORE "per 100 g" means each nutrient's SECOND figure is
// the per-100 g one. Both headers present settles the order; anything else
// leaves it uncertain.
const PER_SERVING_HEADER_RE = /\bper\s+(?:serving|bar|portion)\b/i;
const PER_100_HEADER_RE = /\bper\s*100\s*(?:g|ml)\b/i;
function _columnOrder(table) {
  const serving = PER_SERVING_HEADER_RE.exec(table);
  const per100 = PER_100_HEADER_RE.exec(table);
  if (serving && per100) return { certain: true, servingFirst: serving.index < per100.index };
  return { certain: false, servingFirst: false };
}

// Match "<keyword> ... <number> [unit]". Number captured raw; unit
// is informational. The keyword can have an internal space (e.g.
// "saturated fat" vs "fat") -- exact match avoided by leading word
// boundary + non-greedy gap of at most 30 non-digit chars.
//
// `column` (0 or 1): which of two side-by-side figures to take when the
// nutrient prints two ("Fat 9.0g 15g"). The second figure counts only when it
// follows the first directly with the same unit (or both have none, and it is
// not a percentage), so a nutrient printed once never borrows the next
// nutrient's figure. `pair` reports whether two figures were seen.
function _matchValue(text, keyword, column = 0) {
  const re = new RegExp(
    `\\b${keyword}\\b([^0-9\\n\\r]{0,30})(\\d{1,4}(?:\\.\\d{1,2})?)\\s*(kcal|kj|g|mg)?`,
    'i'
  );
  const m = text.match(re);
  if (!m) return null;
  let value = parseFloat(m[2]);
  let unit = (m[3] || '').toLowerCase() || null;
  const after = text.slice(m.index + m[0].length);
  // A second figure straight after the first, in the same unit (or both with
  // none, and not a percentage): the nutrient's other column.
  const second = after.match(/^\s+(\d{1,4}(?:\.\d{1,2})?)\s*(kcal|kj|g|mg)?(?![\d.]|\s*%)/i);
  const pair = !!second && ((second[2] || '').toLowerCase() || null) === unit;
  if (pair && column === 1) {
    const v2 = parseFloat(second[1]);
    if (Number.isFinite(v2)) value = v2;
  }
  // D-M4: if the gap between the keyword and its first number explicitly names
  // a per-serving/per-portion column (e.g. "Protein per serving 3g ... 10g"),
  // that first number is the per-serving figure. Volyume stores per-100g, so
  // skip to the next number (the per-100g column). UK labels normally print the
  // per-100g column first, in which case the gap has no such qualifier and the
  // first number is taken as-is.
  if (/per\s*serving|per\s*portion|\bserving\b|\bportion\b/i.test(m[1] || '')) {
    const nm = after.match(/(\d{1,4}(?:\.\d{1,2})?)\s*(kcal|kj|g|mg)?/i);
    if (nm) {
      const v2 = parseFloat(nm[1]);
      if (Number.isFinite(v2)) { value = v2; unit = (nm[2] || '').toLowerCase() || null; }
    }
  }
  if (!Number.isFinite(value)) return null;
  return { value, unit, pair };
}

// kcal is special: many labels write it as "<NUM> kcal" rather than
// "kcal <NUM>". Match the unit-trailing form first, then fall back
// to keyword-leading via _matchValue.
// With two columns, the energy figures run "1050kJ 250kcal 1750kJ 417kcal",
// so `column` 1 takes the second kcal (or kJ) figure in the table.
function _matchKcal(text, column = 0) {
  // "350 kcal" with optional decimal. Anchored on the unit so "10g"
  // (a protein figure) doesn't get picked up.
  const all = [...text.matchAll(/(\d{1,4}(?:\.\d{1,2})?)\s*kcal\b/gi)];
  if (all.length > 0) {
    const pick = column === 1 && all.length > 1 ? all[1] : all[0];
    const v = parseFloat(pick[1]);
    if (Number.isFinite(v)) return { value: v, unit: 'kcal', pair: all.length > 1 };
  }
  return _matchValue(text, 'calories', column);
}

function _matchKj(text, column = 0) {
  // "1465 kJ" or "energy 1465 kJ". Returns kJ raw; caller converts.
  const all = [...text.matchAll(/(\d{2,5}(?:\.\d{1,2})?)\s*kj\b/gi)];
  if (all.length > 0) {
    const pick = column === 1 && all.length > 1 ? all[1] : all[0];
    const v = parseFloat(pick[1]);
    if (Number.isFinite(v)) return { value: v, unit: 'kj', pair: all.length > 1 };
  }
  return null;
}

function _kcalFromKj(kj) {
  return Math.round(kj / 4.184);
}

/**
 * Parse OCR text into a macros candidate. Returns
 * { fields: { kcal100g, protein100g, carbs100g, fat100g, fibre100g,
 *             servingG, servingMl, servingUnit },
 *   confidence: { kcal100g, protein100g, ..., servingG } each 'high' | 'low' | 'missing' }.
 *
 * `kcal100g` is high-confidence only when a "per 100g" anchor is
 * present in the source. Without an anchor we still extract values
 * (so the user has something to edit) but mark them low-confidence
 * so the UI can flag them.
 *
 * Serving size: a drink label prints its serving in ml ("Serving size
 * 330 ml"), not g. This used to be dropped to null on an ml match (the
 * scanned serving was silently lost for every drink); it's now kept as
 * `servingMl` alongside a `servingUnit` tag ('g' | 'ml' | null) so a
 * caller can tell which unit was read, additive next to the existing
 * `servingG` field -- callers that only ever read `servingG` (a gram
 * serving) see no change.
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
  // The nutrients are read from the table (after "Typical values" or
  // "Nutrition" when the text names it), in the column the headers say is
  // per 100 g. The serving size is still read from the whole text: it is
  // often printed above the table.
  const table = _tableText(text);
  const order = _columnOrder(table);
  const column = order.certain && order.servingFirst ? 1 : 0;

  const protein = _matchValue(table, 'protein', column);
  const carbs = _matchValue(table, 'carbohydrate', column) || _matchValue(table, 'carbs', column);
  const fat = _matchValue(table, 'fat', column);
  const fibre = _matchValue(table, 'fibre', column) || _matchValue(table, 'fiber', column);

  // Energy: prefer kcal, fall back to kJ -> kcal conversion. kcal
  // gets its own unit-trailing matcher because "<num> kcal" is the
  // dominant form on UK + EU labels.
  let kcal = _matchKcal(table, column);
  if (!kcal) {
    const kj = _matchKj(table, column);
    if (kj) kcal = { value: _kcalFromKj(kj.value), unit: 'kcal', pair: kj.pair };
  }
  // Two columns side by side whose order the headers do not settle: every
  // figure is low confidence, so the person checks it before saving.
  const twoColumns = [protein, carbs, fat, fibre, kcal].some((v) => v?.pair);
  const orderUncertain = twoColumns && !order.certain;

  // Serving size: "Serving size 30g" / "Serving 250 ml" / "Portion 40g".
  // Deliberately does NOT match "per 100g" -- that's the per-100g
  // anchor, not a serving statement. The "per" branch is reserved
  // for labels that use "Per portion: 50g" wording.
  let serving = null;
  const sm = text.match(/(?:serving|portion)\s*(?:size)?\s*[:\s]*(\d{1,4})\s*(g|ml)\b/i)
    || text.match(/per\s+(?:portion|serving)[:\s]*(\d{1,4})\s*(g|ml)\b/i);
  if (sm) serving = { value: parseFloat(sm[1]), unit: sm[2].toLowerCase() };

  const conf = (v) => {
    if (!v) return 'missing';
    return hasAnchor && !orderUncertain ? 'high' : 'low';
  };

  return {
    fields: {
      kcal100g: kcal?.value ?? null,
      protein100g: protein?.value ?? null,
      carbs100g: carbs?.value ?? null,
      fat100g: fat?.value ?? null,
      fibre100g: fibre?.value ?? null,
      servingG: serving?.unit === 'g' ? serving.value : null,
      servingMl: serving?.unit === 'ml' ? serving.value : null,
      servingUnit: serving?.unit ?? null,
    },
    confidence: {
      kcal100g: conf(kcal),
      protein100g: conf(protein),
      carbs100g: conf(carbs),
      fat100g: conf(fat),
      fibre100g: conf(fibre),
      servingG: serving?.unit === 'g' ? 'high' : 'missing',
      servingMl: serving?.unit === 'ml' ? 'high' : 'missing',
    },
    hasAnchor,
  };
}

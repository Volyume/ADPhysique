#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/naming.mjs — report 3 (naming.json).
 *
 * Checks every canonical name against the EL-2 naming convention
 * (`[Implement] [Position or Angle] [Movement] ([Modifier])`, Title Case,
 * British English, no em dash) and general hygiene: capitalisation, US
 * spellings, abbreviations, brand names, em dashes, trailing/leading/double
 * spaces.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { writeJson } from './lib.mjs';

const rows = loadSeedRows();

// ── whitespace / punctuation hygiene ──────────────────────────────────────
const trailingOrLeadingSpace = rows.filter((r) => r.name !== r.name.trim());
const doubleSpace = rows.filter((r) => /\s{2,}/.test(r.name));
const emDash = rows.filter((r) => r.name.includes('—'));
const enDashInsteadOfHyphen = rows.filter((r) => r.name.includes('–'));

// ── capitalisation: Title Case check ──────────────────────────────────────
// Small words that stay lower-case mid-title in standard Title Case
// (matches the corpus's own convention, e.g. "Face Pull (Upper Back)",
// "Step-Up (Weighted)", "Cable Fly (Low to High)").
const LOWER_MIDWORDS = new Set(['a', 'an', 'the', 'to', 'of', 'on', 'and', 'or', 'in', 'at', 'vs']);
function checkTitleCase(name) {
  const words = name.split(/([\s()/-])/).filter((w) => w.length);
  const issues = [];
  let wordIndex = 0;
  for (const w of words) {
    if (/^[a-zA-Z]/.test(w) === false) continue;
    const isFirstOrLast = wordIndex === 0;
    wordIndex++;
    const lower = w.toLowerCase();
    if (LOWER_MIDWORDS.has(lower) && !isFirstOrLast) {
      if (w !== lower) issues.push(`"${w}" should be lower-case mid-title`);
      continue;
    }
    // Expect first letter capitalised (allow all-caps acronyms: EZ, RDL, SSB, JM, GHD, YTW, TRX, V, T, W, L).
    if (/^[a-z]/.test(w)) issues.push(`"${w}" is not capitalised`);
  }
  return issues;
}
const capitalisationIssues = [];
for (const r of rows) {
  const issues = checkTitleCase(r.name);
  if (issues.length) capitalisationIssues.push({ name: r.name, issues });
}

// ── US spellings ───────────────────────────────────────────────────────────
// Exercise names rarely carry prose spelling, but check the handful of words
// that do have US/UK variants and could plausibly appear (colour, fiber,
// center, gray, program, maneuver, cancelled-style doubling n/a for names).
const US_SPELLING_RE = /\b(fiber|center|gray|maneuver|program|plow|barbel{1}\b)\b/i;
const usSpellings = rows.filter((r) => US_SPELLING_RE.test(r.name));

// ── abbreviations ──────────────────────────────────────────────────────────
// EL-2 explicitly allows DB/BB as ALIASES, not as canonical names; RDL, EZ,
// JM, SSB, GHD, TRX are established coaching/industry shorthand already used
// as canonical names elsewhere in this corpus (EZ Bar, RDL is NOT used
// canonically — check both ways).
const ABBREV_RE = /\b(db|bb|kb)\b/i;
const abbreviationsInName = rows.filter((r) => ABBREV_RE.test(r.name));

// ── brand names ────────────────────────────────────────────────────────────
// EL-2: "brand names with identical mechanics (Hammer Strength vs
// 'plate-loaded') ... become ALIASES", i.e. should not be the sole/canonical
// form when a generic equivalent exists. "Smith Machine" is excluded from
// the actionable list: it is the corpus's own generic equipment-category
// name (exerciseMetadata.js equipmentCategory 'smith'), a genericised term
// like "escalator", not a proprietary alternative competing with a generic
// form — every Smith Machine row already uses it as the ONLY name for that
// apparatus, so there is no generic form to prefer it over.
const GENERICISED_RE = /\bsmith\b/i;
const BRAND_RE = /\b(hammer strength|trx|bosu|swiss ball)\b/i;
const brandNames = rows
  .filter((r) => BRAND_RE.test(r.name) || GENERICISED_RE.test(r.name))
  .map((r) => {
    const actionable = BRAND_RE.test(r.name);
    const term = actionable ? r.name.match(BRAND_RE)[0] : r.name.match(GENERICISED_RE)[0];
    return {
      name: r.name,
      brandTerm: term,
      actionable,
      note: actionable
        ? 'Proprietary brand term with a generic equivalent (plate-loaded/iso-lateral machine, suspension trainer, stability ball) — EL-2 candidate for alias, canonical name unchanged unless the lead rules otherwise.'
        : '"Smith" is this corpus\'s own generic equipmentCategory name for the guided-bar apparatus, not a proprietary alternative — not actionable.',
    };
  });

// ── convention shape check ─────────────────────────────────────────────────
// `[Implement] [Position or Angle] [Movement] ([Modifier])`. Cannot be
// checked with certainty per-row without a movement-word dictionary, so this
// checks the weak necessary condition: the name should not START with a
// modifier-only word (an, the), should not contain a trailing dangling
// comma-style old form ("Bench Press, Barbell" — EL-2 explicitly bans this
// structure), and should not contain unmatched parens.
const OLD_COMMA_FORM_RE = /,\s*(barbell|dumbbell|cable|machine|kettlebell|smith|band|ez bar)\s*$/i;
const commaForm = rows.filter((r) => OLD_COMMA_FORM_RE.test(r.name));
const unmatchedParens = rows.filter((r) => {
  const opens = (r.name.match(/\(/g) || []).length;
  const closes = (r.name.match(/\)/g) || []).length;
  return opens !== closes;
});
const startsWithArticle = rows.filter((r) => /^(a|an|the)\s/i.test(r.name));

const out = {
  totalRows: rows.length,
  trailingOrLeadingSpaceCount: trailingOrLeadingSpace.length,
  trailingOrLeadingSpace: trailingOrLeadingSpace.map((r) => r.name),
  doubleSpaceCount: doubleSpace.length,
  doubleSpace: doubleSpace.map((r) => r.name),
  emDashCount: emDash.length,
  emDash: emDash.map((r) => r.name),
  enDashInsteadOfHyphenCount: enDashInsteadOfHyphen.length,
  enDashInsteadOfHyphen: enDashInsteadOfHyphen.map((r) => r.name),
  capitalisationIssueCount: capitalisationIssues.length,
  capitalisationIssues,
  usSpellingCount: usSpellings.length,
  usSpellings: usSpellings.map((r) => r.name),
  abbreviationsInNameCount: abbreviationsInName.length,
  abbreviationsInName: abbreviationsInName.map((r) => r.name),
  brandNameCount: brandNames.length,
  brandNames,
  oldCommaFormCount: commaForm.length,
  oldCommaForm: commaForm.map((r) => r.name),
  unmatchedParensCount: unmatchedParens.length,
  unmatchedParens: unmatchedParens.map((r) => r.name),
  startsWithArticleCount: startsWithArticle.length,
  startsWithArticle: startsWithArticle.map((r) => r.name),
};

const path = writeJson('naming.json', out);
console.log(`naming.json written: ${path}`);
console.log(`trailing/leading space: ${trailingOrLeadingSpace.length}, double space: ${doubleSpace.length}, em dash: ${emDash.length}, en dash: ${enDashInsteadOfHyphen.length}`);
console.log(`capitalisation issues: ${capitalisationIssues.length}, US spellings: ${usSpellings.length}, abbreviations in name: ${abbreviationsInName.length}, brand names: ${brandNames.length}`);
console.log(`old comma form: ${commaForm.length}, unmatched parens: ${unmatchedParens.length}, starts with article: ${startsWithArticle.length}`);

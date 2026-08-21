/**
 * r2Wording.js - THE R2 medical-device-boundary wording list (CC32;
 * research/R2-medical-device-boundary.md sections 5.2-5.3), shared so
 * the library sweep, the marketing claims guard and any future surface
 * read ONE list instead of drifting copies.
 *
 * Word-boundary regexes; case-insensitive. 'health' is deliberately NOT
 * here (not on any R2 list; 'heal/healing/heals' are).
 */
export const R2_BLACKLIST = [
  /\brehabilitat\w*\b/i, /\brehab\b/i, /\bprehab\b/i,
  /\binjury management\b/i, /\bflare(-| )?ups?\b/i, /\bflare\b/i,
  /\bphysio(therap\w*)?\b/i,
  /\btreat(s|ment|ing)?\b/i, /\btherap(y|eutic|ies)\b/i,
  /\bdiagnos\w+\b/i, /\bscreening\b/i, /\btriage\b/i, /\bsymptom\w*\b/i,
  /\bheal(s|ing|ed)?\b/i, /\bcures?\b/i, /\bcounteracts?\b/i,
  /\breduce[sd]? pain\b/i, /\bpain[- ]free\b/i,
  /\bsafe for\b/i, /\bprotects? against\b/i, /\bprevents? injur\w*\b/i,
  /\bclinically proven\b/i, /\bclinical trials?\b/i, /\bmedical\w*\b/i,
  // Named conditions (the specific-injury link, R2 section 5.3 last row).
  /\bspinal cord\b/i, /\bmultiple sclerosis\b/i, /\barthritis\b/i,
  /\bfrozen shoulder\b/i, /\bsciatica\b/i, /\bhypermobil\w*\b/i,
  /\bscoliosis\b/i, /\btendinitis\b/i, /\btendinopathy\b/i, /\bimpingement\b/i,
];

/**
 * Population/support-claim terms for MARKETING surfaces only (in-app
 * copy is governed by the calm-voice and CAP laws, not this list): a
 * direct "built for / supports <population>" claim needs its matrix row
 * MARKETING READY = YES (MARKETING-READINESS-MATRIX.md). While every
 * row is NO, these terms are banned in promotional copy outright.
 */
export const POPULATION_CLAIM_TERMS = [
  /\bwheelchair\b/i, /\bdisabilit\w*\b/i, /\bdisabled\b/i,
  /\badaptive (athlete|training|lifter)s?\b/i,
  /\bamputees?\b/i, /\bparaplegi\w*\b/i, /\bquadriplegi\w*\b/i,
  /\bone[- ]arm(ed)?\b/i, /\bone[- ]leg(ged)?\b/i,
];

/**
 * Lines a marketing scan must SKIP before matching: platform metadata
 * vocabulary and honest negation disclaimers are not claims.
 *  - Apple's age-rating category "Medical/Treatment Information" and
 *    the privacy-label "Diagnostics" category;
 *  - "not medical advice" disclaimers (the opposite of a claim);
 *  - markdown table rows (platform metadata declarations);
 *  - technical configuration and code snippets (lines with backticks).
 */
export function isExemptMarketingLine(line) {
  const t = String(line ?? '');
  if (/not medical|no medical|never medical|isn'?t medical|not a medical/i.test(t)) return true;
  if (/Medical\/Treatment Information/i.test(t)) return true;
  if (/^\s*\|.*\|\s*$/.test(t)) return true; // metadata tables
  if (/^\s*>/.test(t)) return true; // reviewer notes/quotes
  if (/`/.test(t)) return true; // code/configuration snippets
  return false;
}

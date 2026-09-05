/**
 * instructionContract.js — the shared content-quality contract for every
 * built-in exercise's instructions (D151, founder brief 2026-09-05:
 * "1,000+ exercises must not end up with wildly inconsistent
 * instructions").
 *
 * Pure, no React Native imports: the validator script
 * (scripts/exercise-library/validate-corpus.mjs), its Jest mirror
 * (__tests__/corpus.guard.test.js) and the corpus index all read the ONE
 * definition here, so the rule can never drift between the three.
 *
 * The shape every live corpus entry carries:
 *
 *   setup:      required. One or two sentences: where you are, what you
 *               hold, how you are set before the first rep.
 *   execution:  required. One or two sentences: the movement itself, both
 *               directions where they differ.
 *   watch:      optional. ONE sentence naming the fault that most changes
 *               the lift, written so the reader knows what it costs or what
 *               to do instead. Never a generic reminder, never a formulaic
 *               "... is the common fault" tail, and omitted when nothing
 *               specific earns the line.
 *
 * Voice (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md + CLAUDE.md): plain
 * British English a first-time gym goer follows while standing at the
 * rack; imperative and concrete; no exclamation marks, no em or en dash,
 * no diagnosis or safety-claim words, no set or rep counts (the
 * prescription line carries those), no filler that reads as generated
 * text. Every field starts with a capital letter and ends with a full stop.
 */

export const INSTRUCTION_LIMITS = Object.freeze({
  setup: { min: 25, max: 160, maxSentences: 2 },
  execution: { min: 25, max: 160, maxSentences: 2 },
  watch: { min: 20, max: 120, maxSentences: 1 },
});

// Word-boundary matched, so "safety pins" does not trip "safe".
export const INSTRUCTION_BANNED_WORDS = Object.freeze([
  'safe', 'safely', 'injury', 'injure', 'rehab', 'arthritis', 'pain',
  'doctor', 'physio', 'therapy', 'medical', 'condition', 'hurt',
]);

// Common American spellings an author might reach for. Not exhaustive
// (locale-aware spellchecking is out of scope) but covers the words most
// likely to appear in short setup/execution prose.
export const AMERICAN_SPELLINGS = Object.freeze([
  'color', 'favorite', 'favorable', 'center', 'centered',
  'fiber', 'gray', 'defense', 'offense', 'behavior', 'neighbor', 'honor',
  'organize', 'organized', 'organizing', 'stabilize', 'stabilized',
  'stabilizing', 'maximize', 'maximizing', 'minimize', 'minimizing',
  'utilize', 'utilizing', 'realize', 'specialize', 'analyze', 'analyzing',
  'recognize', 'summarize', 'emphasize', 'optimize', 'normalize',
  'customize', 'apologize',
]);

// Filler and framing that reads as generated text rather than a coach at
// the rack. Matched case-insensitively as phrases.
export const AI_STYLE_PHRASES = Object.freeze([
  'it is important', "it's important", 'remember to', 'make sure to',
  'be sure to', 'in order to', 'this exercise', 'this movement',
  'this variation', 'great for', 'perfect for', 'essential', 'crucial',
  'engage your core', 'ensure that', 'effectively', 'optimal',
  'proper form', 'good form', 'correct form',
]);

// A watch line that ends by merely labelling the fault ("... is the common
// fault.", "... is common.") tells the reader nothing they can act on.
export const WATCH_FORMULAIC_TAIL_RE = /\b(is|are) (the |a )?(very |most )?(common|usual|typical|frequent)( fault| mistake| error| problem)?\.$/i;

const AMERICAN_SPELLING_RE = new RegExp(`\\b(${AMERICAN_SPELLINGS.join('|')})\\b`, 'i');
const SET_REP_COUNT_RE = /\b\d+\s*(sets?|reps?|repetitions?)\b/i;

export function splitInstructionSentences(text) {
  return String(text ?? '')
    .trim()
    .split(/(?<=\.)\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function checkField(field, text, ctx, fail) {
  const limits = INSTRUCTION_LIMITS[field];
  const t = String(text);
  if (t.length < limits.min || t.length > limits.max) fail(`${ctx}: ${field} length ${t.length} outside ${limits.min}-${limits.max}`);
  const sentences = splitInstructionSentences(t);
  if (sentences.length > limits.maxSentences) fail(`${ctx}: ${field} has ${sentences.length} sentences (max ${limits.maxSentences})`);
  if (!/^[A-Z]/.test(t)) fail(`${ctx}: ${field} does not start with a capital letter`);
  if (!/\.$/.test(t)) fail(`${ctx}: ${field} does not end with a full stop`);
  if (/[—–]/.test(t)) fail(`${ctx}: ${field} contains an em or en dash`);
  if (/[!?]/.test(t)) fail(`${ctx}: ${field} contains an exclamation or question mark`);
  const lower = t.toLowerCase();
  for (const word of INSTRUCTION_BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) fail(`${ctx}: ${field} contains banned word "${word}"`);
  }
  const americanHit = t.match(AMERICAN_SPELLING_RE);
  if (americanHit) fail(`${ctx}: ${field} contains a likely American spelling "${americanHit[0]}" (use British spelling)`);
  for (const phrase of AI_STYLE_PHRASES) {
    if (lower.includes(phrase)) fail(`${ctx}: ${field} contains filler "${phrase}"`);
  }
  if (SET_REP_COUNT_RE.test(t)) fail(`${ctx}: ${field} prescribes sets or reps (the prescription line carries those)`);
  if (field === 'watch' && WATCH_FORMULAIC_TAIL_RE.test(t)) fail(`${ctx}: watch ends with a formulaic "is the common fault" tail (say what it costs or what to do instead)`);
}

/**
 * Validate one live corpus entry's instruction fields. Returns the list of
 * violations (empty when the entry passes). `ctx` prefixes each message.
 */
export function validateInstructions(entry, ctx = entry?.name ?? '?') {
  const violations = [];
  const fail = (msg) => violations.push(msg);
  if (entry.cue !== undefined) fail(`${ctx}: carries a legacy "cue" literal; write setup/execution/watch instead`);
  if (typeof entry.setup !== 'string' || !entry.setup.trim()) fail(`${ctx}: setup is missing`);
  else checkField('setup', entry.setup, ctx, fail);
  if (typeof entry.execution !== 'string' || !entry.execution.trim()) fail(`${ctx}: execution is missing`);
  else checkField('execution', entry.execution, ctx, fail);
  if (entry.watch !== undefined && entry.watch !== null && entry.watch !== '') {
    if (typeof entry.watch !== 'string') fail(`${ctx}: watch is not a string`);
    else checkField('watch', entry.watch, ctx, fail);
  }
  return violations;
}

/**
 * The one plain-text form of an entry's instructions, for the `cue`
 * column and any surface that shows a single paragraph (the exercise
 * detail screen's legacy readers, the coach's plain-text fallbacks).
 */
export function joinInstructions(entry) {
  return [entry?.setup, entry?.execution, entry?.watch]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

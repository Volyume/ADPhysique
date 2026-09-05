#!/usr/bin/env node
/**
 * scripts/certification/copy-scan.mjs
 *
 * Final whole-product adversarial certification (docs/final-certification-
 * 2026-09-05), Part 3: mechanical copy scan (03-COPY-SCAN.md) covering
 * Parts 16 (British English), 17 (no AI tells), 26 (no commercial residue),
 * 28 (placeholders) and 31 (raw errors, partially -- see category 5).
 *
 * READ-ONLY. Does not touch src/. Parses each in-scope file with
 * @babel/parser (already present in node_modules as a transitive dependency
 * of the project's existing eslint/babel toolchain -- nothing new added to
 * package.json) and walks the AST with @babel/traverse to find
 * user-facing string/template literals and JSX text, the same way the
 * repo's existing eslint copy rules do it (see "ALREADY ENFORCED BY LINT"
 * below), but across the whole in-scope surface rather than just
 * src/screens + src/components, and for a wider rule set.
 *
 * Usage:
 *   node scripts/certification/copy-scan.mjs
 * Exit code is always 0 (this is a discovery scan, not a gate). Prints a
 * grouped report to stdout and writes the full structured result to
 * docs/final-certification-2026-09-05/data/copy-scan.json.
 *
 * ---------------------------------------------------------------------
 * SCOPE (what is scanned, and why) -- see also "03-COPY-SCAN.md" section
 * "Scope" for the human-readable version of this list.
 *
 * Brief-mandated (verbatim from the founder brief):
 *   src/screens, src/components, src/lib/**\/copy*, src/lib/capability,
 *   src/lib/weeklyCoach.js, src/lib/coachApply.js, src/lib/notifications,
 *   src/lib/food
 *
 * Plus directories inspected and included whole because every file in them
 * is a dedicated copy/UI-text surface:
 *   src/lib/coachOutput   -- view-layer copy for coach output cards
 *   src/lib/onboarding    -- quiz/free-starter copy
 *   src/lib/partners      -- partner-feature UI copy (moments, invites,
 *                            share wins) -- partners/telemetry.js is
 *                            excluded file-by-file below (log strings)
 *   src/lib/shareCard     -- share-card text (recap/great-week copy)
 *   src/lib/progress      -- progress "pillars" copy
 *   src/lib/widgets       -- home-screen widget text
 *
 * Plus individual src/lib files inspected one by one and included because
 * they clearly produce narrative/explanatory copy rendered in the UI (each
 * was grepped for real string-literal content, not just comments, before
 * being added -- see the discovery notes in 03-COPY-SCAN.md "Scope"):
 *   authErrorCopy.js, volumeInsightCopy.js, coachGlossary.js, coachStory.js,
 *   weeklyStory.js, coachResponse.js, coachRegister.js, coachLedger.js,
 *   coachReport.js, coachDecline.js, coachIntervention.js,
 *   coachPrecedence.js, coachContext.js, coachOutcome.js, coachDecision.js,
 *   coachApplySafety.js, coachApplyView.js, coachOutputZones.js,
 *   blockExplain.js, blockAdvisor.js, blockReview.js, blockProgression.js,
 *   planRationale.js, planDisplay.js, planFit.js, planSwitch.js,
 *   planDiff.js, planAutoGen.js, whyThisTemplates.js, homeCoachBrief.js,
 *   syncStatusLabel.js, coachingGoals.js, progressCaptureGuide.js,
 *   progressScanAnalysis.js, progressScanResultsContract.js,
 *   progressScanCoachResolver.js, progressScanCheckInEvidence.js,
 *   progressScanVision.js, progressScanTrendViewModel.js,
 *   progressPhotosController.js, progressPhotoTimeline.js, mesocycle.js,
 *   recoveryState.js, profileFreshness.js, milestones.js,
 *   contestCountdown.js, readinessSummary.js, health.js,
 *   femaleNutritionAwareness.js, weightTrend.js, nutritionEngine.js,
 *   activationNudge.js, recompReframe.js, reEntryCheck.js,
 *   reEntryEaseState.js, nextBlockPreview.js, interBlock.js,
 *   workoutRecordLine.js, insightsEngine.js, plateauSurfacing.js,
 *   tonnageMilestone.js, warmupRamp.js, restSuggest.js, formTips.js,
 *   strengthStandards.js, algorithms.js, storeName.js, storeReview.js,
 *   trainingRecency.js, liftProgress.js, streakState.js, streak.js,
 *   wellbeing.js (Beat UK signposting -- ED-safety voice), edPatternDetector.js,
 *   workoutHelpers.js, trialActivation.js, sessionAdjustments.js,
 *   bodyMetricValidate.js, biometricLock.js, division/profile.js,
 *   exercise/adaptedSetup.js (equipment-substitution guidance copy)
 *
 * Explicitly EXCLUDED from src/lib (inspected, no or negligible real
 * copy signal, or out of scope for a different reason -- see
 * 03-COPY-SCAN.md "Scope" for the full reasoning):
 *   - Catalogue/seed/data (exercise & routine NAMES, not narrative copy;
 *     huge volume, a separate campaign concern): seedExercises.js,
 *     seedRoutines.js, exerciseCorpus/**, exerciseMetadata.js,
 *     exerciseDisplay.js, exerciseFuzzySearch.js, exercisePickerSections.js,
 *     planEngine.js, travelMode.js, exercise/{canonicalId,continuity,
 *     generation,movementConstraints,prescription,stylePools,swapScope,
 *     intent,loadSemantics,movementFamily,volumeAudit}.js
 *   - Schema/technical/sync internals (SQL, not copy): database.js,
 *     src/lib/database/**, sync.js, syncQueue.js, src/lib/sync/**,
 *     dbCrypto.js, dbSnapshot.js, sqliteBoundary.js, sheetA11yIsolation.js
 *   - Telemetry/logging/observability (excluded per brief): errorLog.js,
 *     engineTelemetry.js, sentry.js, observability.js, src/lib/observability/**,
 *     src/lib/telemetry/**, src/lib/partners/telemetry.js
 *   - Dormant billing (excluded from ALL main-scope counts; scanned
 *     separately in its own bucket so the lead can confirm unregistered):
 *     src/lib/payments/**, proGate.js (the flag module itself, not copy),
 *     plus the CLAUDE.md-named dormant screens/component (see
 *     DORMANT_FILES below) AND four components/modules NOT named in
 *     CLAUDE.md but traced (grep, importer-by-importer) to have no
 *     consumer other than those dormant surfaces: CancelReasonSheet.js,
 *     TierComparisonStrip.js, PostLapseSheet.js, food/TodaysPlateTeaser.js,
 *     src/lib/differentialPaywall.js -- see DORMANT_FILES for the full
 *     trace per file. (notifications/scheduler.js's cascade-gate copy is
 *     SIMILARLY dead -- its only caller is the dormant payments/cascade.js
 *     -- but the file as a whole is very much live, so it stays in the
 *     main scan with the three findings individually annotated instead of
 *     the whole file being excluded.)
 *   - GDPR consent logic (0 real-copy hits on inspection; the actual
 *     consent-screen text lives in src/screens, already in scope):
 *     src/lib/consent/**
 *   - Everything else in src/lib not named above: inspected with a grep
 *     heuristic (>=3 sentence-shaped literals) and found to be pure
 *     engine/validation/utility code with no or negligible real copy.
 * ---------------------------------------------------------------------
 *
 * ALREADY ENFORCED BY LINT (see eslint.config.js) -- this script still
 * scans these files/rules for a complete cross-check, but expects them to
 * already be clean there:
 *   - em dash (—) in Literal/JSXText -- src/screens/**, src/components/**
 *     (eslint.config.js ~L247-254, repeated ~L328-334 for HomeScreen.js and
 *     ~L359-364 for ShareCardScreen.js)
 *   - delve/leverage/utilise/utilize/facilitate/seamless(ly)/streamline(s/d/ing)/
 *     robust/comprehensive -- same files (~L256-262, ~L336-342, ~L367-373)
 *   - ", always"/", ever"/", forever" clipped-drama tail -- same files
 *     (~L268-275, ~L379-386)
 * None of this is duplicated as a *new* rule below; the AI-tells category
 * still includes em dash / seamless / delve so the JSON gives one full
 * count across the whole scan surface (lib files are NOT covered by lint).
 *
 * No new dependencies. Deterministic: same input tree -> same output.
 */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_JSON = path.join(ROOT, 'docs', 'final-certification-2026-09-05', 'data', 'copy-scan.json');

// ---------------------------------------------------------------------
// 1. FILE COLLECTION
// ---------------------------------------------------------------------

const SKIP_DIRS = new Set(['__tests__', '__mocks__']);

function walkDir(absDir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(absDir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

// Whole directories, per the SCOPE block in the file header.
const SCOPE_DIRS = [
  'src/screens',
  'src/components',
  'src/lib/food',
  'src/lib/notifications',
  'src/lib/capability',
  'src/lib/coachOutput',
  'src/lib/onboarding',
  'src/lib/partners',
  'src/lib/shareCard',
  'src/lib/progress',
  'src/lib/widgets',
];

// Individually-inspected files (see header comment for the reasoning per
// group). Paths are relative to src/lib/ unless already qualified.
const SCOPE_FILES = [
  'weeklyCoach.js', 'coachApply.js',
  'authErrorCopy.js', 'volumeInsightCopy.js', 'coachGlossary.js', 'coachStory.js',
  'weeklyStory.js', 'coachResponse.js', 'coachRegister.js', 'coachLedger.js',
  'coachReport.js', 'coachDecline.js', 'coachIntervention.js', 'coachPrecedence.js',
  'coachContext.js', 'coachOutcome.js', 'coachDecision.js', 'coachApplySafety.js',
  'coachApplyView.js', 'coachOutputZones.js',
  'blockExplain.js', 'blockAdvisor.js', 'blockReview.js', 'blockProgression.js',
  'planRationale.js', 'planDisplay.js', 'planFit.js', 'planSwitch.js', 'planDiff.js',
  'planAutoGen.js',
  'whyThisTemplates.js', 'homeCoachBrief.js', 'syncStatusLabel.js',
  'coachingGoals.js', 'progressCaptureGuide.js',
  'progressScanAnalysis.js', 'progressScanResultsContract.js',
  'progressScanCoachResolver.js', 'progressScanCheckInEvidence.js',
  'progressScanVision.js', 'progressScanTrendViewModel.js',
  'progressPhotosController.js', 'progressPhotoTimeline.js',
  'mesocycle.js', 'recoveryState.js', 'profileFreshness.js', 'milestones.js',
  'contestCountdown.js', 'readinessSummary.js',
  'health.js', 'femaleNutritionAwareness.js',
  'weightTrend.js', 'nutritionEngine.js',
  'activationNudge.js', 'recompReframe.js', 'reEntryCheck.js', 'reEntryEaseState.js',
  'nextBlockPreview.js', 'interBlock.js', 'workoutRecordLine.js', 'insightsEngine.js',
  'plateauSurfacing.js', 'tonnageMilestone.js', 'warmupRamp.js', 'restSuggest.js',
  'formTips.js', 'strengthStandards.js', 'algorithms.js',
  'storeName.js', 'storeReview.js',
  'trainingRecency.js', 'liftProgress.js', 'streakState.js', 'streak.js',
  'wellbeing.js', 'edPatternDetector.js', 'workoutHelpers.js', 'trialActivation.js',
  'sessionAdjustments.js', 'bodyMetricValidate.js', 'biometricLock.js',
  'division/profile.js', 'exercise/adaptedSetup.js',
];

// Dormant billing: scanned SEPARATELY (own bucket in the JSON/report),
// excluded from the main category-3 counts per the brief.
const DORMANT_FILES = [
  // Named in CLAUDE.md directly.
  'src/screens/ProUpgradeScreen.js',
  'src/screens/CascadeGateScreen.js',
  'src/screens/SubscriptionScreen.js',
  'src/screens/SubscriptionPolicyScreen.js',
  'src/screens/paywallExcerpts.js',
  'src/components/ProGate.js',
  // NOT named in CLAUDE.md, but traced (grep across all of src/ for each
  // component name, importer-by-importer) to have NO consumer other than
  // the dormant screens/component above -- so they are transitively
  // dormant too and belong in the same bucket, not the main scan:
  //   CancelReasonSheet, TierComparisonStrip -> only used by
  //     SubscriptionScreen.js / ProUpgradeScreen.js (both dormant, above)
  //   TodaysPlateTeaser -> only used by ProGate.js (dormant, above)
  //   PostLapseSheet -> renders from shouldShowPostLapseSheet()
  //     (src/lib/payments/winbackState.js, itself dormant) and has no
  //     caller anywhere in src/screens or App.js
  'src/components/CancelReasonSheet.js',
  'src/components/TierComparisonStrip.js',
  'src/components/PostLapseSheet.js',
  'src/components/food/TodaysPlateTeaser.js',
  //   differentialPaywall.js -> its ONLY caller (weeklyCoach.js) reads
  //   `const differential_output = FULL_ACCESS_FOR_ALL ? { shown: false }
  //   : detectDifferentialTrigger(...)` -- FULL_ACCESS_FOR_ALL is the
  //   compile-time-true flag (src/lib/proGate.js), so
  //   detectDifferentialTrigger() never actually runs. Not on CLAUDE.md's
  //   named list (it lives outside src/lib/payments/), but functionally
  //   identical to it: dead code gated by the same flag.
  'src/lib/differentialPaywall.js',
];
// scheduler.js as a WHOLE FILE is very much live (it is THE app-wide
// notification scheduler), so it is not in DORMANT_FILES -- but its
// CASCADE_19_COPY/CASCADE_21_COPY constants and
// schedule/cancelCascadeGateNotifications functions are dead code: their
// only caller is src/lib/payments/cascade.js (dormant), confirmed by
// `grep -rn scheduleCascadeGateNotifications src` finding no other call
// site. Function-level exclusion isn't worth the complexity for three
// lines, so these three findings stay in the main JSON, individually
// annotated as dead-code in 03-COPY-SCAN.md rather than silently dropped.
const DORMANT_DIRS = ['src/lib/payments'];

function collectScope() {
  const files = new Set();
  for (const d of SCOPE_DIRS) walkDir(path.join(ROOT, d)).forEach((f) => files.add(f));
  for (const f of SCOPE_FILES) {
    const abs = path.join(ROOT, 'src', 'lib', f);
    if (fs.existsSync(abs)) files.add(abs);
    else console.warn(`[copy-scan] WARNING: configured scope file missing on disk: src/lib/${f}`);
  }
  // The main scope set must not double-count files that also happen to
  // live under a scope dir (not possible here, kept for safety) and must
  // exclude the dormant bucket (dormant screens live inside src/screens,
  // which IS in SCOPE_DIRS above).
  const dormant = new Set();
  for (const f of DORMANT_FILES) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) dormant.add(abs);
  }
  for (const d of DORMANT_DIRS) walkDir(path.join(ROOT, d)).forEach((f) => dormant.add(f));
  for (const d of dormant) files.delete(d);
  return { files: [...files].sort(), dormant: [...dormant].sort() };
}

// ---------------------------------------------------------------------
// 2. AST WALK -- collect candidate user-facing strings
// ---------------------------------------------------------------------

const COPY_PROP_NAMES = new Set([
  'title', 'subtitle', 'label', 'text', 'message', 'body', 'description',
  'accessibilityLabel', 'accessibilityHint', 'placeholder', 'hint',
]);

const LOG_CALL_RE = /^(logError|logWarn|logInfo|track[A-Z]\w*)$/;
// Broad, content-based SQL detector (not just "starts with SELECT"): the
// food/database layer's queries commonly open with a CTE ("WITH x AS (")
// or "INSERT OR REPLACE/IGNORE INTO", not a bare "INSERT INTO", so this
// matches the tell-tale keywords ANYWHERE in the string rather than only
// at position 0. Per the brief, SQL is out of scope for every category
// regardless of which in-scope file it lives in (src/lib/food/db.js is a
// copy-bearing file overall, but its embedded SQL text is not copy).
const SQL_RE = /\b(SELECT\s+[\w*]|INSERT\s+(?:OR\s+\w+\s+)?INTO\b|UPDATE\s+\w+\s+SET\b|DELETE\s+FROM\b|CREATE\s+(?:TABLE|INDEX)\b|ALTER\s+TABLE\b|PRAGMA\s+\w+|DROP\s+(?:TABLE|INDEX)\b|WITH\s+\w+\s+AS\s*\(|VALUES\s*\(|FROM\s+\w+\s+WHERE\b)/i;

function calleeName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return null;
}

function isImportOrRequireSource(path) {
  const p = path.parentPath;
  if (!p) return false;
  if (p.node.type === 'ImportDeclaration' && p.node.source === path.node) return true;
  if (p.node.type === 'ExportNamedDeclaration' && p.node.source === path.node) return true;
  if (p.node.type === 'ExportAllDeclaration' && p.node.source === path.node) return true;
  if (p.node.type === 'CallExpression') {
    const name = calleeName(p.node.callee);
    if (name === 'require' && p.node.arguments[0] === path.node) return true;
  }
  return false;
}

function isObjectKeyPosition(path) {
  const p = path.parentPath;
  if (!p) return false;
  const t = p.node.type;
  if ((t === 'ObjectProperty' || t === 'Property') && p.node.key === path.node && !p.node.computed) return true;
  return false;
}

function isLogOrTelemetryFirstArg(path) {
  const p = path.parentPath;
  if (!p || p.node.type !== 'CallExpression') return false;
  const name = calleeName(p.node.callee);
  if (!name || !LOG_CALL_RE.test(name)) return false;
  return p.node.arguments[0] === path.node;
}

function isSentryCall(path) {
  let p = path.parentPath;
  while (p && p.node.type !== 'CallExpression') p = p.parentPath;
  if (!p) return false;
  const src = (() => {
    let n = p.node.callee;
    // Walk MemberExpression chain looking for a `Sentry` identifier root.
    while (n && n.type === 'MemberExpression') n = n.object;
    return n && n.type === 'Identifier' ? n.name : null;
  })();
  return src === 'Sentry';
}

const ERROR_CTOR_RE = /^(Error|TypeError|RangeError|SyntaxError|ReferenceError)$/;

/**
 * Is this literal an argument to `new Error(...)` (or TypeError/RangeError/
 * etc)? These are developer/diagnostic strings -- never rendered to the
 * user directly (Part 31 "raw errors" is a separate certification concern
 * from this copy scan). The ONE way an Error's text reaches the user is via
 * `.message` read back out and interpolated into real copy later, which is
 * caught separately (see ERROR_MESSAGE_IDENT_RE / "raw error.message
 * interpolated into copy").
 */
function isErrorConstructorArg(path) {
  const p = path.parentPath;
  if (!p || p.node.type !== 'NewExpression') return false;
  if (p.node.callee.type !== 'Identifier' || !ERROR_CTOR_RE.test(p.node.callee.name)) return false;
  return p.node.arguments[0] === path.node;
}

/** JSXAttribute name this literal is the value of, if any. */
function jsxAttrName(path) {
  const p = path.parentPath;
  if (p && p.node.type === 'JSXAttribute' && p.node.name && p.node.name.type === 'JSXIdentifier') {
    return p.node.name.name;
  }
  return null;
}

/** ObjectProperty/Property key name this literal is the VALUE of, if any. */
function objectValueKeyName(path) {
  const p = path.parentPath;
  if (!p) return null;
  const t = p.node.type;
  if ((t === 'ObjectProperty' || t === 'Property') && p.node.value === path.node) {
    const k = p.node.key;
    if (k.type === 'Identifier') return k.name;
    if (k.type === 'StringLiteral') return k.value;
  }
  return null;
}

const SENTENCE_RE = /^[A-Z][a-zA-Z]*\s[a-zA-Z]/; // starts with a capital word then a space

/**
 * Decide whether a literal string counts as "user-facing" per the brief's
 * heuristic, and return the matched reason (for debugging/traceability).
 */
function isUserFacing(value, propName) {
  if (propName && COPY_PROP_NAMES.has(propName)) return 'prop';
  if (SENTENCE_RE.test(value)) return 'sentence-shape';
  return null;
}

const ACTION_PROP_NAMES = ['onPress', 'onNavigate', 'onSubmit', 'onDismiss', 'onConfirm', 'onCancel', 'onClose', 'onChange'];

/**
 * For a title/accessibilityLabel JSXAttribute, find the enclosing JSX
 * element's action handler (onPress etc.) and return a raw-source
 * signature for it. Used to tell "same label, same action, rendered in two
 * conditional branches" (not a bug) apart from "same label, different
 * action" (category 7's actual target) without full semantic evaluation.
 */
function actionSignature(attrPath, src) {
  let p = attrPath.parentPath; // JSXOpeningElement
  while (p && p.node.type !== 'JSXOpeningElement') p = p.parentPath;
  if (!p) return null;
  for (const attr of p.node.attributes) {
    if (attr.type !== 'JSXAttribute' || !attr.name || attr.name.type !== 'JSXIdentifier') continue;
    if (!ACTION_PROP_NAMES.includes(attr.name.name)) continue;
    const val = attr.value;
    if (!val) continue;
    const exprNode = val.type === 'JSXExpressionContainer' ? val.expression : val;
    if (exprNode.start == null || exprNode.end == null) continue;
    return src.slice(exprNode.start, exprNode.end).replace(/\s+/g, ' ').trim();
  }
  return null;
}

/**
 * Walk one file's AST, returning an array of candidate records:
 *   { line, value, kind: 'jsx-text'|'string'|'template', templateExprs }
 */
function collectCandidates(ast, relFile, src) {
  const out = [];
  traverse(ast, {
    JSXText(path) {
      const raw = path.node.value;
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      if (!trimmed) return;
      out.push({ line: path.node.loc?.start.line ?? 0, value: trimmed, kind: 'jsx-text' });
    },
    StringLiteral(path) {
      if (isImportOrRequireSource(path)) return;
      if (isObjectKeyPosition(path)) return;
      if (isLogOrTelemetryFirstArg(path)) return;
      if (isSentryCall(path)) return;
      if (isErrorConstructorArg(path)) return;
      const value = path.node.value;
      if (SQL_RE.test(value)) return;
      const attrName = jsxAttrName(path);
      const propName = attrName || objectValueKeyName(path);
      const reason = isUserFacing(value, propName);
      if (!reason) return;
      const actionSig = attrName === 'accessibilityLabel' || attrName === 'title'
        ? actionSignature(path, src) : undefined;
      out.push({
        line: path.node.loc?.start.line ?? 0, value, kind: 'string', propName, reason, actionSig,
      });
    },
    TemplateLiteral(path) {
      // Skip tagged templates used for SQL (sql`...`) or similarly tagged;
      // plain template literals only.
      if (path.parentPath && path.parentPath.node.type === 'TaggedTemplateExpression') return;
      if (isLogOrTelemetryFirstArg(path)) return;
      if (isSentryCall(path)) return;
      if (isErrorConstructorArg(path)) return;
      const cooked = path.node.quasis.map((q) => q.value.cooked).join('‹EXPR›');
      if (SQL_RE.test(cooked)) return;
      const propName = jsxAttrName(path) || objectValueKeyName(path);
      const reason = isUserFacing(cooked.replace(/‹EXPR›/g, ' X '), propName);
      if (!reason) return;
      // Collect interpolated expression descriptors for category-5 checks.
      const exprs = path.node.expressions.map((e) => describeExpr(e));
      out.push({
        line: path.node.loc?.start.line ?? 0, value: cooked, kind: 'template', propName, reason, exprs,
      });
    },
  });
  return out;
}

function describeExpr(node) {
  if (node.type === 'Identifier') return { kind: 'ident', name: node.name };
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const objName = node.object.type === 'Identifier' ? node.object.name : null;
    return { kind: 'member', objName, propName: node.property.name };
  }
  return { kind: 'other' };
}

// ---------------------------------------------------------------------
// 3. CATEGORY 1 -- US SPELLING
// ---------------------------------------------------------------------

// Each entry: [reportName, regex, ukNote]. Word-boundary, checked against
// the raw (non-lowercased) value so we do not need case juggling; British
// alternatives (behaviour, favourite, colour, ...) never match these
// US-only spellings because of the differing letters, so no allowlist is
// needed for the plain cases. A few entries are deliberately narrow (see
// inline notes) to keep the false-positive rate down, as instructed.
const US_SPELLING_RULES = [
  ['behavior', /\bbehaviors?\b/g, 'UK: behaviour(s)'],
  ['favorite', /\bfavorites?\b/g, 'UK: favourite(s)'],
  ['center', /\bcenters?\b/g, 'UK: centre(s)'],
  ['organize/organizing', /\borganiz(?:e|es|ed|ing|ation|ations|er|ers)\b/g, 'UK: organise/organising (z-spelling is the US tell)'],
  ['optimize', /\boptimiz(?:e|es|ed|ing|ation)\b/g, 'UK: optimise/optimising'],
  ['color', /\bcolors?\b/g, 'UK: colour(s) -- copy only, not style keys (those are excluded by scope already)'],
  ['analyze', /\banalyz(?:e|es|ed|ing)\b/g, 'UK: analyse/analysing'],
  ['canceled', /\bcancel(?:ed|ing)\b/g, 'UK: cancelled/cancelling (double L)'],
  ['catalog', /\bcatalog(?:s|ed|ing)?\b/g, 'UK: catalogue(s)'],
  ['fulfill', /\bfulfill(?:s|ed|ing|ment)?\b/g, 'UK: fulfil(s)/fulfilled/fulfilling/fulfilment (single L)'],
  ['gray', /\bgray\b/g, 'UK: grey'],
  ['license (noun)', /\blicense\b/g, 'UK noun is "licence"; "license" is the UK verb too, so this is LEAD-JUDGED per word, not an automatic fail'],
  ['practice (verb)', /\bpracticing\b|\bpracticed\b/g, 'UK verb is practise/practising/practised; bare "practice" (noun) is correctly unflagged'],
  ['program(s) for training programme', /\bprogram(?:s)?\b/g, 'LEAD-JUDGED: "program" is correct in both dialects for software; only the training-noun sense wants "programme" in UK copy'],
  ['math', /\bmath\b/g, 'UK: maths'],
  ['toward', /\btoward\b/g, 'UK usually: towards'],
  ['enroll', /\benroll(?:s|ed|ing|ment)?\b/g, 'UK: enrol(s)/enrolled/enrolling/enrolment (single L)'],
  ['skillful', /\bskillful\b/g, 'UK: skilful'],
  ['traveled', /\btravel(?:ed|ing|er|ers)\b/g, 'UK: travelled/travelling/traveller(s) (double L)'],
  ['jewelry', /\bjewelry\b/g, 'UK: jewellery'],
  ['mold', /\bmolds?\b|\bmolded\b|\bmolding\b/g, 'UK: mould(s)/moulded/moulding'],
  ['plow', /\bplows?\b|\bplowed\b|\bplowing\b/g, 'UK: plough(s)/ploughed/ploughing'],
  ['tire (noun)', /\btires?\b/g, 'UK: tyre(s) -- "tired"/"tiring" (the verb) are unaffected by this word-boundary regex'],
  ['curb', /\bcurbs?\b|\bcurbed\b|\bcurbing\b/g, 'UK: kerb (pavement edge); "curb" as a restraining verb is standard British English too, so this entry is noise-prone -- kept because the brief names it explicitly'],
  ['ax', /\bax\b/g, 'UK: axe ("axes" is skipped, too ambiguous with the plural of axis)'],
  ['defense', /\bdefense\b/g, 'UK: defence'],
  ['offense', /\boffense\b/g, 'UK: offence'],
  ['pretense', /\bpretense\b/g, 'UK: pretence'],
  ['meter (length unit)', /\bmeters?\b/g, 'UK: metre(s) for length; a measuring device is correctly "meter" in both dialects, so LEAD-JUDGED'],
  ['liter', /\bliters?\b/g, 'UK: litre(s)'],
  ['fiber', /\bfibers?\b/g, 'UK: fibre(s) -- likely relevant given this is a nutrition app'],
  ['theater', /\btheaters?\b/g, 'UK: theatre(s)'],
  ['aluminum', /\baluminum\b/g, 'UK: aluminium'],
  ['esthetic', /\besthetic(?:s|ally)?\b/g, 'UK: aesthetic(s)/aesthetically -- likely relevant given this is a physique app'],
  ['appall', /\bappall(?:s|ed|ing)?\b/g, 'UK: appal(s)/appalled/appalling (single L)'],
  ['judgment', /\bjudgment\b/g, 'UK also widely accepts "judgment" (esp. legal use); brief names it explicitly so it is flagged, LEAD-JUDGED'],
];
// Deliberately NOT flagged, per the brief: "check" (cheque sense, too rare
// and too noisy against the verb "check" to detect reliably), "learnt"/
// "learned" (brief: both UK ok), "whilst" (brief: fine).

// ---------------------------------------------------------------------
// 4. CATEGORY 2 -- AI TELLS
// ---------------------------------------------------------------------

const AI_TELL_WORD_RULES = [
  ['em dash', /—/g, null],
  ['journey', /\bjourney\b/gi, null],
  ['unlock', /\bunlock\w*\b/gi, 'also listed under commercial residue -- lead to judge which framing applies per hit'],
  ['smart', /\bsmart(?:ly)?\b/gi, 'report, lead judges'],
  ['intelligent/intelligently', /\bintelligent(?:ly)?\b/gi, 'report, lead judges'],
  ['seamless/seamlessly', /\bseamless(?:ly)?\b/gi, 'report, lead judges (also lint-enforced in src/screens+components)'],
  ['empower', /\bempower(?:s|ed|ing|ment)?\b/gi, 'report, lead judges'],
  ['elevate', /\belevat(?:e|es|ed|ing|ion)\b/gi, 'report, lead judges'],
  ['supercharge', /\bsupercharg(?:e|es|ed|ing)\b/gi, 'report, lead judges'],
  ['effortless', /\beffortless(?:ly)?\b/gi, 'report, lead judges'],
  ['tailored', /\btailored\b/gi, 'report, lead judges'],
  ['personalized/personalised', /\bpersonali[sz]ed\b/gi, 'report, lead judges'],
  ['crush', /\bcrush(?:es|ed|ing)?\b/gi, null],
  ['level up', /\blevel[\s-]?up\b/gi, null],
  ['game-changer', /\bgame[\s-]?changer\b/gi, null],
  ['delve', /\bdelve[sd]?\b/gi, 'also lint-enforced in src/screens+components'],
];

const AI_TELL_PHRASE_RULES = [
  ['based on your data', /based on your data/i],
  ['things you told', /things you told/i],
  ['we’ve got you / we\'ve got you', /we[’']ve got you/i],
  ['you’ve got this / you\'ve got this', /you[’']ve got this/i],
];

// A first pass matched "your" twice with a comma anywhere within 40 chars,
// which fired on almost every ordinary explanatory sentence with two
// possessives in it (e.g. "the better Volyume understands how your body
// responds, so it can suggest your next..." -- 48 hits, zero genuine).
// The actual AI tell this targets is a short rhetorical TAGLINE that IS
// (near enough) the whole sentence -- "Your plan, your pace." / "Your
// body, your rules" -- so this only matches when the "your X, your Y"
// shape spans virtually the entire sentence, not just some clause buried
// inside a longer one.
const YOUR_X_YOUR_Y_RE = /^your\b[\w\s'-]{0,25},\s*your\b[\w\s'-]{0,25}$/i;
const LETS_DIVE_RE = /let[’']s\b/i;
// A first pass covered the arrows (U+2190-21FF) and Dingbats (U+2600-27BF)
// blocks wholesale, which caught the plain "→" breadcrumb arrow ("Profile
// → Settings") and the plain "✓" tick used as a UI glyph -- neither is an
// emoji in the AI-slop sense the brief means. Narrowed to the genuine
// pictograph/emoji ranges plus a few explicitly emoji-coded symbols
// (star/heart/check-mark-BUTTON, which unlike bare U+2713 IS emoji-coded),
// so a plain arrow or tick glyph used as UI chrome is not a false hit.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2B50}\u{2764}\u{2705}\u{274C}]/u;

// ---------------------------------------------------------------------
// 5. CATEGORY 3 -- COMMERCIAL RESIDUE
// ---------------------------------------------------------------------

const COMMERCIAL_WORD_RULES = [
  ['Pro', /\bPro\b/g, null],
  ['Premium', /\bPremium\b/g, null],
  ['upgrade', /\bupgrad(?:e|es|ed|ing)\b/gi, null],
  ['trial', /\btrials?\b/gi, null],
  ['subscription', /\bsubscriptions?\b/gi, null],
  ['subscribe', /\bsubscrib(?:e|es|ed|ing)\b/gi, null],
  ['paywall', /\bpaywalls?\b/gi, null],
  ['price', /\bprice[sd]?\b|\bpricing\b/gi, null],
  ['£', /£/g, null],
  ['lifetime', /\blifetime\b/gi, null],
];
const COMMERCIAL_PHRASE_RULES = [
  ['free plan', /free plan/i],
  ['free tier', /free tier/i],
  ['go Pro', /\bgo pro\b/i],
];

// ---------------------------------------------------------------------
// 6. CATEGORY 4 -- PLACEHOLDERS / UNFINISHED
// ---------------------------------------------------------------------

const PLACEHOLDER_RULES = [
  ['TODO', /\bTODO\b/g],
  ['FIXME', /\bFIXME\b/g],
  ['XXX', /\bXXX\b/g],
  ['coming soon', /coming soon/i],
  ['lorem', /\blorem\b/i],
  ['placeholder', /\bplaceholder\b/i],
  ['TBD', /\bTBD\b/g],
  ['WIP', /\bWIP\b/g],
];

// ---------------------------------------------------------------------
// 7. CATEGORY 5 -- INTERNAL-TERM LEAKS
// ---------------------------------------------------------------------

const INTERNAL_TERM_RULES = [
  ['MEV/MRV/MAV/RIR', /\b(?:MEV|MRV|MAV|RIR)\b/g, 'report, lead judges whether explained in context'],
  ['evidence_class', /evidence_class/gi, null],
  ['watermark', /\bwatermark\b/gi, null],
  ['sync queue', /sync queue/i, null],
  ['RPC', /\bRPC\b/g, null],
  ['SQLite', /\bSQLite\b/gi, null],
  ['Supabase', /\bSupabase\b/gi, null],
  ['null', /\bnull\b/g, null],
  ['undefined', /\bundefined\b/g, null],
  ['NaN', /\bNaN\b/g, null],
  ['[object Object]', /\[object Object\]/g, null],
];
const SNAKE_CASE_TOKEN_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const UPPER_SNAKE_RE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
// A first pass flagged every UPPER_SNAKE constant interpolated into a
// template literal, which turned out to be almost entirely module-level
// constants holding a NUMBER (a threshold/count) or a pre-written English
// SENTENCE fragment being composed into a longer sentence -- both totally
// normal, not a leak. Narrowed to skip names ending in a suffix that
// reliably signals "this holds a number or a sentence, not a raw
// enum/status tag", so only genuine enum-shaped interpolations remain.
const SAFE_UPPER_SNAKE_SUFFIX_RE = /_(SENTENCE|TEXT|COPY|LABEL|MESSAGE|WEEKS?|DAYS?|MINS?|MAX|COUNT|THRESHOLD|GATE|LIMIT|INS)$/i;
const ERROR_MESSAGE_IDENT_RE = /^(e|err|error)$/i;

// ---------------------------------------------------------------------
// 8. CATEGORY 6 -- UNCLEAR COUNTS
// ---------------------------------------------------------------------

const UNCLEAR_COUNT_RULES = [
  ['things', /\bthings\b/gi, null],
  ['items', /\bitems\b/gi, null],
  ['stuff', /\bstuff\b/gi, null],
  ['information saved', /information saved/i, null],
  ['data saved', /data saved/i, null],
];

// ---------------------------------------------------------------------
// 9. CATEGORY 7 -- DUPLICATE LABELS (cross-record pass, done after scan)
// ---------------------------------------------------------------------

// Generic, legitimately-repeatable single-word labels excluded from
// duplicate detection (closing a modal, saving a form, etc. are the same
// action semantically every time they appear).
const DUPLICATE_ALLOWLIST = new Set([
  'close', 'back', 'cancel', 'save', 'done', 'ok', 'continue', 'skip',
  'delete', 'edit', 'add', 'next', 'yes', 'no', 'retry', 'dismiss',
]);

// ---------------------------------------------------------------------
// SCAN DRIVER
// ---------------------------------------------------------------------

function runWordRules(value, rules, sourceLabel) {
  const hits = [];
  for (const [name, re, note] of rules) {
    re.lastIndex = 0;
    if (re.test(value)) hits.push({ rule: name, note });
  }
  return hits;
}

function runPhraseRules(value, rules) {
  const hits = [];
  for (const [name, re] of rules) if (re.test(value)) hits.push({ rule: name });
  return hits;
}

function scanRecord(rec, relFile, isDormant, findings) {
  const { line, value, kind, exprs } = rec;
  const trunc = value.length > 220 ? `${value.slice(0, 217)}...` : value;
  const push = (category, hits, extra) => {
    for (const h of hits) {
      findings[category].push({
        file: relFile, line, rule: h.rule, note: h.note, value: trunc, kind, dormant: isDormant, ...extra,
      });
    }
  };

  push('usSpelling', runWordRules(value, US_SPELLING_RULES));

  const aiHits = runWordRules(value, AI_TELL_WORD_RULES).concat(runPhraseRules(value, AI_TELL_PHRASE_RULES));
  if (value.split(/(?<=[.!?])\s+/).some((sentence) => YOUR_X_YOUR_Y_RE.test(sentence.trim()))) {
    aiHits.push({ rule: 'your X, your Y pattern', note: null });
  }
  if (LETS_DIVE_RE.test(value) && /\bdive\b/i.test(value)) aiHits.push({ rule: "Let's ... dive", note: null });
  if (/!/.test(value)) aiHits.push({ rule: 'exclamation mark in copy', note: null });
  if (EMOJI_RE.test(value)) aiHits.push({ rule: 'emoji in copy', note: null });
  push('aiTells', aiHits);

  push('commercialResidue', runWordRules(value, COMMERCIAL_WORD_RULES).concat(runPhraseRules(value, COMMERCIAL_PHRASE_RULES)));

  push('placeholders', runWordRules(value, PLACEHOLDER_RULES));

  const internalHits = runWordRules(value, INTERNAL_TERM_RULES);
  SNAKE_CASE_TOKEN_RE.lastIndex = 0;
  let m;
  const snakeTokens = new Set();
  while ((m = SNAKE_CASE_TOKEN_RE.exec(value))) snakeTokens.add(m[0]);
  for (const tok of snakeTokens) internalHits.push({ rule: 'snake_case token in sentence', note: tok });
  if (kind === 'template' && Array.isArray(exprs)) {
    for (const e of exprs) {
      if (e.kind === 'ident' && UPPER_SNAKE_RE.test(e.name) && !SAFE_UPPER_SNAKE_SUFFIX_RE.test(e.name)) {
        internalHits.push({ rule: 'UPPER_SNAKE value interpolated into copy', note: `\${${e.name}}` });
      }
      if (e.kind === 'member' && UPPER_SNAKE_RE.test(e.propName) && !SAFE_UPPER_SNAKE_SUFFIX_RE.test(e.propName)) {
        internalHits.push({ rule: 'UPPER_SNAKE value interpolated into copy', note: `\${${e.objName || '?'}.${e.propName}}` });
      }
      if (e.kind === 'member' && /^message$/i.test(e.propName) && e.objName && ERROR_MESSAGE_IDENT_RE.test(e.objName)) {
        internalHits.push({ rule: 'raw error.message interpolated into copy', note: `\${${e.objName}.${e.propName}}` });
      }
    }
  }
  push('internalTermLeaks', internalHits);

  push('unclearCounts', runWordRules(value, UNCLEAR_COUNT_RULES));
}

function scanFile(absFile, isDormant, findings, dupIndex) {
  const relFile = path.relative(ROOT, absFile);
  const src = fs.readFileSync(absFile, 'utf8');
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      plugins: ['jsx'],
      errorRecovery: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowSuperOutsideMethod: true,
    });
  } catch (e) {
    findings.parseErrors.push({ file: relFile, error: e.message });
    return;
  }
  const candidates = collectCandidates(ast, relFile, src);
  for (const rec of candidates) {
    scanRecord(rec, relFile, isDormant, findings);
    // Category 7 bookkeeping: only static string literals on
    // accessibilityLabel/title JSX attributes, not templates (dynamic).
    if (rec.kind === 'string' && (rec.propName === 'accessibilityLabel' || rec.propName === 'title')) {
      const key = `${relFile}${rec.propName}${rec.value}`;
      if (!dupIndex.has(key)) {
        dupIndex.set(key, {
          file: relFile, propName: rec.propName, value: rec.value, lines: [], actionSigs: [],
        });
      }
      const entry = dupIndex.get(key);
      entry.lines.push(rec.line);
      entry.actionSigs.push(rec.actionSig ?? null);
    }
  }
}

function computeDuplicates(dupIndex) {
  const out = [];
  for (const rec of dupIndex.values()) {
    const words = rec.value.trim().split(/\s+/).length;
    if (words < 3) continue; // generic short labels are excluded, see DUPLICATE_ALLOWLIST intent
    if (DUPLICATE_ALLOWLIST.has(rec.value.trim().toLowerCase())) continue;
    if (rec.lines.length < 2) continue;
    const uniqueLines = [...new Set(rec.lines)];
    if (uniqueLines.length < 2) continue;
    // Same label, same onPress/onNavigate/... source text at every
    // occurrence (or no handler found at all) reads as the SAME action
    // rendered in more than one conditional branch -- e.g. a "View block
    // summary" button repeated per mesocycle card, or a "Type it in
    // instead" fallback button repeated per permission-denied branch.
    // That is not a duplicate-label bug, so only keep cases where at
    // least two DISTINCT non-null handler signatures were seen.
    const distinctSigs = new Set(rec.actionSigs.filter((s) => s != null));
    if (distinctSigs.size < 2) continue;
    out.push({
      file: rec.file, propName: rec.propName, value: rec.value, lines: uniqueLines,
    });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.value.localeCompare(b.value));
}

function newFindings() {
  return {
    usSpelling: [], aiTells: [], commercialResidue: [], placeholders: [],
    internalTermLeaks: [], unclearCounts: [], duplicateLabels: [], parseErrors: [],
  };
}

function main() {
  const { files, dormant } = collectScope();

  const findings = newFindings();
  const dupIndex = new Map();
  for (const f of files) scanFile(f, false, findings, dupIndex);
  findings.duplicateLabels = computeDuplicates(dupIndex);

  const dormantFindings = newFindings();
  const dormantDupIndex = new Map();
  for (const f of dormant) scanFile(f, true, dormantFindings, dormantDupIndex);
  dormantFindings.duplicateLabels = computeDuplicates(dormantDupIndex);

  const counts = Object.fromEntries(
    Object.entries(findings).map(([k, v]) => [k, v.length]),
  );
  const dormantCounts = Object.fromEntries(
    Object.entries(dormantFindings).map(([k, v]) => [k, v.length]),
  );

  const result = {
    generatedAt: new Date().toISOString(),
    scope: {
      dirs: SCOPE_DIRS,
      files: SCOPE_FILES.map((f) => `src/lib/${f}`),
      fileCount: files.length,
      dormantFileCount: dormant.length,
      dormantBucket: [...DORMANT_FILES, ...DORMANT_DIRS.map((d) => `${d}/**`)],
    },
    counts,
    dormantCounts,
    findings,
    dormantFindings,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  // ---- stdout report -------------------------------------------------
  console.log('=== Volyume copy scan (final certification, Part 3) ===');
  console.log(`Files scanned (main scope): ${files.length}`);
  console.log(`Files scanned (dormant billing bucket): ${dormant.length}`);
  if (findings.parseErrors.length) {
    console.log(`\nPARSE ERRORS (${findings.parseErrors.length}) -- these files were SKIPPED:`);
    for (const e of findings.parseErrors) console.log(`  ${e.file}: ${e.error}`);
  }
  console.log('\n--- Counts (main scope) ---');
  for (const [k, v] of Object.entries(counts)) if (k !== 'parseErrors') console.log(`  ${k}: ${v}`);
  console.log('\n--- Counts (dormant billing bucket, informational) ---');
  for (const [k, v] of Object.entries(dormantCounts)) if (k !== 'parseErrors') console.log(`  ${k}: ${v}`);

  const printGroup = (label, arr, limit = 40) => {
    console.log(`\n--- ${label} (${arr.length}) ---`);
    for (const f of arr.slice(0, limit)) {
      const note = f.note ? ` [${f.note}]` : '';
      console.log(`  ${f.file}:${f.line}  ${f.rule}${note}  ${JSON.stringify(f.value)}`);
    }
    if (arr.length > limit) console.log(`  ... ${arr.length - limit} more, see JSON`);
  };

  printGroup('Commercial residue', findings.commercialResidue);
  printGroup('Placeholders/unfinished', findings.placeholders);
  printGroup('Internal-term leaks', findings.internalTermLeaks);
  printGroup('Unclear counts', findings.unclearCounts);
  printGroup('Duplicate labels', findings.duplicateLabels.map((d) => ({
    file: d.file, line: d.lines.join(','), rule: d.propName, note: null, value: d.value,
  })));
  printGroup('AI tells', findings.aiTells, 60);
  printGroup('US spelling', findings.usSpelling, 60);

  console.log(`\nFull JSON written to ${path.relative(ROOT, OUT_JSON)}`);
}

main();
process.exit(0);

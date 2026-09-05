/**
 * PlanUpdateScreen.styleLock.guard.test.js — final certification 2026-09-05,
 * F-16 REVISED point 3 (which absorbs F-15), from
 * docs/final-certification-2026-09-05/07-FINDINGS.md on evidence A3.
 *
 * What this suite pins and why.
 *
 * 1. STYLE LOCK. Generation builds from six equipment profiles and emits no
 *    grouping. The F-16 investigation (04-TRAINING-STYLES.md) measured that
 *    it cannot rebuild a kettlebell, circuit or band plan as the same kind of
 *    plan, so "Adjust training" on a library style plan must not offer the
 *    regenerate path at all: it says plainly why, and routes to the same
 *    style in the Plan Library.
 *
 * 2. CIRCUIT FLATTEN (F-15, evidence A3). No generation path emits
 *    `groupKind` or `roundRestSeconds` and `assignSupersets` was deliberately
 *    deleted, so any plan carrying a circuit group comes back from a rebuild
 *    as ungrouped straight sets. That was silent. It must now be said before
 *    anything changes.
 *
 * Source-level guard (the fs.readFileSync + regex pattern this repo already
 * uses for founder-locked rules) rather than a mount: this screen pulls the
 * whole SQLite/sync import graph, and what needs pinning is textual and
 * structural.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'PlanUpdateScreen.js'), 'utf8');
const planAutoGenSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'planAutoGen.js'), 'utf8',
);

// Both screens in this lane pull the whole SQLite/native import graph, so the
// copy is read out of the source exactly as the C1 pin next door reads
// REBUILD_FAILED_MESSAGE, rather than by importing the module.
const styleLockSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'exercise', 'styleLock.js'), 'utf8',
);
const styleLockTemplate = (styleLockSource.match(/return `(This is a[^`]+)`;/) || [])[1];
const CIRCUIT_FLATTEN_NOTICE = (planAutoGenSource.match(/const CIRCUIT_FLATTEN_NOTICE = '([^']+)';/) || [])[1];
const styleLockNotice = (label) => String(styleLockTemplate).replace(/\$\{label\}/g, label);

describe('F-16 REVISED point 3: a library style plan is never regenerated', () => {
  test('the active plan is read and its style tag resolved on entry', () => {
    expect(source).toMatch(/styleLockFromTags\(active\?\.tags\)/);
    expect(source).toMatch(/getActivePlan\(user\.id\)/);
  });

  test('the lock rule lives in ONE shared module, imported by both rebuild screens', () => {
    const goalSource = fs.readFileSync(path.join(__dirname, '..', 'ProGoalSetupScreen.js'), 'utf8');
    for (const src of [source, goalSource]) {
      expect(src).toMatch(/from '\.\.\/lib\/exercise\/styleLock'/);
      // Neither screen re-derives the rule for itself.
      expect(src).not.toMatch(/function styleLockFromTags/);
      expect(src).not.toMatch(/startsWith\('kettlebell'\)/);
    }
  });

  test('all three style families lock: kettlebell, circuit and band', () => {
    const fn = styleLockSource.slice(styleLockSource.indexOf('function styleLockFromTags'));
    expect(fn).toMatch(/startsWith\('kettlebell'\)/);
    expect(fn).toMatch(/startsWith\('circuit'\)/);
    expect(fn).toMatch(/key === 'band'/);
  });

  test('the notice names the style, the library it came from, and what Volyume can build', () => {
    for (const label of ['kettlebell', 'circuit', 'band']) {
      const notice = styleLockNotice(label);
      expect(notice).toBe(
        `This is a ${label} plan from the Plan Library. Volyume builds adjusted plans from gym, dumbbell, home and bodyweight kit, so to change it choose another ${label} plan.`,
      );
      // British English, no em dash in user-facing copy.
      expect(notice).not.toContain('—');
    }
  });

  test('the rebuild button is not rendered for a style plan, and the handler refuses anyway', () => {
    // The whole form, including "Review my plan changes", sits inside the
    // !styleLock branch.
    expect(source).toMatch(/\{kindChecked && !styleLock \? \(/);
    expect(source).toMatch(/if \(styleLock\) return;/);
  });

  test('it routes to the Plan Library filtered to the same style', () => {
    expect(source).toMatch(/navigation\.navigate\('PlanLibrary', \{ initialCollection: styleLock\.collection \}\)/);
  });

  test('an unreadable plan falls back to the ordinary rebuild rather than blocking it', () => {
    expect(source).toMatch(/logWarn\('PlanUpdateScreen\.readPlanKind'/);
  });
});

describe('F-15: circuit rounds are not flattened silently', () => {
  test('the disclosure says the rounds go and what replaces them', () => {
    expect(CIRCUIT_FLATTEN_NOTICE).toBe(
      'Circuit rounds are not kept. Volyume will build straight sets from the same kind of exercises.',
    );
    expect(CIRCUIT_FLATTEN_NOTICE).not.toContain('—');
  });

  test('the screen reads whether the active plan actually has circuit groups', () => {
    expect(source).toMatch(/activePlanHasCircuitGroups/);
  });

  test('it is shown on the screen before the preview is ever opened', () => {
    expect(source).toMatch(/\{hasCircuitGroups \? \(\s*<Text[^>]*>\{CIRCUIT_FLATTEN_NOTICE\}<\/Text>/);
  });

  test('and answered explicitly before anything is written', () => {
    const confirm = source.slice(source.indexOf('async function handleConfirmRebuild'));
    const disclosureAt = confirm.indexOf('CIRCUIT_FLATTEN_NOTICE');
    const writeAt = confirm.indexOf('generateAndSavePlan(');
    expect(disclosureAt).toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(-1);
    // Disclosed, and answered, before the commit.
    expect(disclosureAt).toBeLessThan(writeAt);
    expect(confirm).toMatch(/if \(!acceptsFlatten\) \{ setSaving\(false\); return; \}/);
  });
});

describe('the Plan Library understands the param it is sent', () => {
  const librarySource = fs.readFileSync(
    path.join(__dirname, '..', 'PlanLibraryScreen.js'), 'utf8',
  );

  test('initialCollection is read from the route and validated against the real chips', () => {
    expect(librarySource).toMatch(/export default function PlanLibraryScreen\(\{ navigation, route \}\)/);
    expect(librarySource).toMatch(/COLLECTION_KEYS\.has\(route\?\.params\?\.initialCollection\)/);
    expect(librarySource).toMatch(/useState\(initialCollection\)/);
  });

  test('the three style collections it can be sent all exist as chips', () => {
    for (const key of ['kettlebell', 'circuit', 'band']) {
      expect(librarySource).toMatch(new RegExp(`key: '${key}',\\s*label:`));
    }
  });

  test('an unrecognised param falls back to the ordinary browse', () => {
    expect(librarySource).toMatch(/: 'all';/);
  });
});

/**
 * A6 (Wave A first-week trust): wire the existing GLOSSARY.volume gloss onto
 * the onboarding jargon sites that say "volume" with no explanation, matching
 * the InfoTooltip pattern already used for bodyFatMethod (:1128), phase
 * (:1292), division (:1311) and proteinTier (:1357).
 *
 * Three copy sites mention "volume":
 *   - step 3 "Training experience" Dropdown hint
 *   - step 5 "Recovery & reminders" Header sub
 *   - step 5 "How's your recovery?" Dropdown hint
 * The Header sub carries no field label of its own to anchor a tooltip to
 * (Header takes title/sub/onBack only), so it shares the ONE tooltip wired
 * onto the Recovery Dropdown immediately below it — the nearest label, per
 * the founder's own fallback rule for a hint with no anchor. These are
 * source-level regression guards (same style as
 * navigationTargets.guard.test.js / proOnboarding.sexGate.test.js): they pin
 * the wiring so a future edit cannot quietly drop it.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');
}

describe('ProOnboarding: GLOSSARY.volume wired onto the "volume" jargon sites (A6)', () => {
  const src = read('src/screens/ProOnboardingScreen.js');

  test('the Header component itself carries no tip/InfoTooltip support (confirms the shared-anchor design)', () => {
    const start = src.indexOf('function Header(');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('\n  }', start);
    const body = src.slice(start, end === -1 ? start + 600 : end);
    expect(body).not.toMatch(/InfoTooltip/);
  });

  test('step 3 "Training experience" Dropdown carries the volume tooltip', () => {
    const site = src.indexOf('label="Training experience"');
    expect(site).toBeGreaterThan(-1);
    const window = src.slice(site, site + 300);
    expect(window).toMatch(/hint="This sets your starting volume and how complex the exercises are\."/);
    expect(window).toMatch(/tip=\{GLOSSARY\.volume\}/);
  });

  test('step 5 "How\'s your recovery?" Dropdown carries the volume tooltip (also covers the Header sub above it)', () => {
    const site = src.indexOf("label=\"How's your recovery?\"");
    expect(site).toBeGreaterThan(-1);
    const window = src.slice(site, site + 300);
    expect(window).toMatch(/hint="Be honest here\. This sets how much volume your plan includes, so it can protect your recovery\."/);
    expect(window).toMatch(/tip=\{GLOSSARY\.volume\}/);
    // The Header sub this tooltip stands in for.
    const subSite = src.indexOf('sub="Recovery affects your plan volume');
    expect(subSite).toBeGreaterThan(-1);
    expect(subSite).toBeLessThan(site); // the Header renders above the Dropdown
  });

  test('Dropdown itself renders the tip as an InfoTooltip beside the label (the shared primitive both sites rely on)', () => {
    const dropdown = read('src/components/Dropdown.js');
    expect(dropdown).toMatch(/tip \?[\s\S]{0,240}<InfoTooltip text=\{tip\}/);
  });
});

// A6 second half: the surplus/deficit prose in coachingGoals.js's
// TRAINING_PHASES (lines ~251/262/271) renders as each option's `sub` inside
// the "What are you focused on right now?" Dropdown, which ALREADY carries
// tip={GLOSSARY.phase} (line ~1292). GLOSSARY has no dedicated surplus/
// deficit entry (checked 2026-07-03) and glossary content is founder-approved
// copy — not added here per the task brief ("if no entry exists, add NOTHING
// to the glossary and report instead").
describe('ProOnboarding: phase-language (surplus/deficit) tooltip — reported, not authored', () => {
  test('the phase Dropdown (which renders the surplus/deficit detail text) already carries a tooltip', () => {
    const src = read('src/screens/ProOnboardingScreen.js');
    const site = src.indexOf('label="What are you focused on right now?"');
    expect(site).toBeGreaterThan(-1);
    const window = src.slice(site, site + 200);
    expect(window).toMatch(/tip=\{GLOSSARY\.phase\}/);
  });

  test('no surplus/deficit GLOSSARY entry exists (confirms nothing was added here)', () => {
    const glossary = read('src/lib/coachGlossary.js');
    expect(glossary).not.toMatch(/^\s*surplus\s*:/m);
    expect(glossary).not.toMatch(/^\s*deficit\s*:/m);
  });
});

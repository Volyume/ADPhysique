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
 * (ProOnboardingHeader takes title/sub/onBack only), so it shares the ONE tooltip wired
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

  test('the header component itself carries no tip/InfoTooltip support (confirms the shared-anchor design)', () => {
    const start = src.indexOf('function ProOnboardingHeader(');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, start + 1400);
    expect(body).not.toMatch(/InfoTooltip/);
    expect(src).not.toContain('function Header(');
  });

  test('step 3 "Training experience" Dropdown carries the volume tooltip', () => {
    const site = src.indexOf('label="Training experience"');
    expect(site).toBeGreaterThan(-1);
    const window = src.slice(site, site + 300);
    expect(window).toMatch(/hint="This sets your starting volume and how complex the exercises are\."/);
    expect(window).toMatch(/tip=\{GLOSSARY\.volume\}/);
  });

  // Same-meaning re-anchor (C5-P36-02, D96). The A6 design had ONE tooltip
  // standing in for two "volume" sites, because the Header sub said "volume"
  // with no field label to anchor a tooltip to. D96 ruled that shared anchor
  // was the symptom of the duplication it was papering over, so the Header
  // sub's volume clause is deleted and the field hint is the only "volume"
  // site on the step. The property this suite pins is unchanged and in fact
  // stronger: no "volume" reaches the user without its gloss attached.
  test('step 5 "How\'s your recovery?" Dropdown carries the volume tooltip, and is now the step\'s only "volume" site', () => {
    const site = src.indexOf("label=\"How's your recovery?\"");
    expect(site).toBeGreaterThan(-1);
    const window = src.slice(site, site + 300);
    expect(window).toMatch(/hint="Be honest here\. This sets how much volume your plan includes, so it can protect your recovery\."/);
    expect(window).toMatch(/tip=\{GLOSSARY\.volume\}/);
    // The unanchored Header sub that used to borrow this tooltip is gone.
    expect(src).not.toContain('sub="Recovery affects your plan volume');
    // Every remaining user-facing "volume" string on this screen sits on a
    // field that carries the gloss itself (this one and step 4's experience
    // Dropdown, asserted above).
    const volumeStrings = (src.match(/(hint|sub|label)="[^"\n]*volume[^"\n]*"/g) ?? []);
    expect(volumeStrings).toHaveLength(2);
    for (const s of volumeStrings) expect(s.startsWith('hint="')).toBe(true);
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

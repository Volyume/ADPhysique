/**
 * Directory schema suite (gap-closure Phase B; GC-D1/D2/D4).
 *
 * Pins, against the REAL validators and the REAL seed library:
 *  1. The schema refuses what the laws forbid: uncited profiles, unknown
 *     demand ids / family keys, missing neverInfer, function/benefit
 *     wording (R2_FUNCTION_TERMS) and em dashes in user-facing strings,
 *     over-long quotes, education without a cited source, injury
 *     profiles with no questions (a profile that cannot ask is a ban
 *     machine, which order section 7 forbids).
 *  2. DIRECTORY_FAMILY_KEYS is honest: every key resolves to at least
 *     one real seed exercise via the live movementFamily machinery, so
 *     profile questions can never bind to a family no exercise carries.
 *  3. Every SHIPPED profile in conditions.js / injuries.js validates
 *     clean, and profile ids are unique across both directories.
 *  4. The search accessor is deterministic, alias-aware, and ALWAYS ends
 *     with the OTHER / NOT LISTED path (order section 4).
 */

const {
  validateConditionProfile, validateInjuryProfile,
  DIRECTORY_FAMILY_KEYS, directoryWordingViolation,
  PROFILE_KIND, CONDITION_CATEGORY, INJURY_REGION, QUESTION_KIND,
} = require('../schema');
const { CONDITION_PROFILES } = require('../conditions');
const { INJURY_PROFILES } = require('../injuries');
const { searchProfiles, profileById, OTHER_PROFILE } = require('../index');
const { movementFamily } = require('../../../exercise/movementFamily');

const fs = require('fs');
const path = require('path');

function seedRows() {
  const seedSrc = fs.readFileSync(path.resolve(__dirname, '../../../seedExercises.js'), 'utf8');
  const start = seedSrc.indexOf('const RAW = [');
  const body = seedSrc.slice(start, seedSrc.indexOf('\n];', start));
  const rows = [];
  const re = /\[\s*'([^']+)',\s*'([a-z_]+)',/g;
  let m;
  while ((m = re.exec(body)) !== null) rows.push({ name: m[1], muscle: m[2] });
  const mapStart = seedSrc.indexOf('const SUBREGION_MAP = {');
  const mapBody = seedSrc.slice(mapStart, seedSrc.indexOf('\n};', mapStart));
  const sub = new Map();
  const subRe = /'((?:[^'\\]|\\.)+)':\s*'([a-z_]+)'/g;
  while ((m = subRe.exec(mapBody)) !== null) sub.set(m[1].replace(/\\'/g, "'"), m[2]);
  return rows.map(r => ({ ...r, subregion: sub.get(r.name) ?? null }));
}

const validCondition = () => ({
  id: 'test_condition',
  kind: PROFILE_KIND.CONDITION,
  canonicalName: 'Test condition',
  aliases: ['test'],
  category: CONDITION_CATEGORY.MUSCULOSKELETAL,
  affects: { programming: true, appAccessibility: false },
  variability: 'People differ a great deal in what works for them.',
  functionalQuestions: [
    { id: 'q1', kind: QUESTION_KIND.DEMAND, demandId: 'overhead_position', wording: 'Do overhead positions work for you at the moment?', whyAsked: 'Many people with this condition choose to build around overhead work.' },
  ],
  setupConsiderations: ['A bench with a back support can make pressing steadier.'],
  accessibilityConsiderations: [],
  fatigueNote: null,
  lateralityNote: null,
  generalisable: ['Strength training is recommended for adults in UK guidance.'],
  individual: ['Which movements feel right varies person to person.'],
  neverInfer: ['Never assume any movement is unavailable from the name alone.'],
  clinicianConfirm: [],
  familyRelevance: ['Seated Full Body'],
  professionalNote: 'Anything a professional has told you comes first; Volyume builds around it.',
  claimRisks: ['Never claim benefit for the condition.'],
  evidence: [{ source: 'UK Chief Medical Officers', year: 2019, url: 'https://www.gov.uk/example', tier: 'T1', quote: 'strengthening activities on at least two days a week' }],
  knownGaps: [],
  reviewedAt: '2026-08-21',
  version: 1,
});

const validInjury = () => ({
  id: 'test_injury',
  kind: PROFILE_KIND.INJURY,
  canonicalName: 'Test shoulder problem',
  aliases: ['shoulder'],
  region: INJURY_REGION.SHOULDER,
  movementQuestions: [
    { id: 'q1', kind: QUESTION_KIND.FAMILY, familyKeys: ['flat', 'incline'], wording: 'Which pressing movements have you been told to avoid, if any?', whyAsked: 'People with this issue differ; your answer sets what Volyume builds around.' },
  ],
  education: [{ text: 'People with this issue often keep training everything unaffected.', evidenceIndex: 0 }],
  professionalNote: 'If something serious has happened, a professional needs to see it.',
  clinicianBoundary: null,
  reintroductionNote: null,
  neverInfer: ['Never exclude a movement the user has not named.'],
  clinicianConfirm: ['Any instruction from a professional overrides suggestions.'],
  claimRisks: ['No recovery language.'],
  evidence: [{ source: 'Example body', year: 2024, url: 'https://example.org/guide', tier: 'T2', quote: 'individual assessment guides return to activity' }],
  reviewedAt: '2026-08-21',
  version: 1,
});

describe('directory schema validators refuse what the laws forbid', () => {
  test('a fully valid condition and injury profile validate clean', () => {
    expect(validateConditionProfile(validCondition())).toEqual([]);
    expect(validateInjuryProfile(validInjury())).toEqual([]);
  });

  test('missing evidence is refused: no uncited profile can ship', () => {
    const p = validCondition();
    p.evidence = [];
    expect(validateConditionProfile(p).join(' ')).toMatch(/at least one cited source/);
  });

  test('an unknown demand id is refused', () => {
    const p = validCondition();
    p.functionalQuestions[0].demandId = 'deep_knee_flexion';
    expect(validateConditionProfile(p).join(' ')).toMatch(/not a demand rule id/);
  });

  test('an unknown family key is refused', () => {
    const p = validInjury();
    p.movementQuestions[0].familyKeys = ['bench_press'];
    expect(validateInjuryProfile(p).join(' ')).toMatch(/not a directory family key/);
  });

  test('function/benefit wording is refused in user-facing strings (GC-D4)', () => {
    const p = validInjury();
    p.education[0].text = 'This programme treats shoulder problems.';
    expect(validateInjuryProfile(p).join(' ')).toMatch(/banned wording/);
  });

  test('an em dash in a user-facing string is refused', () => {
    const p = validCondition();
    p.variability = 'People differ — a great deal.';
    expect(validateConditionProfile(p).join(' ')).toMatch(/em_dash/);
  });

  test('quotes over 30 words are refused (verbatim, not essays)', () => {
    const p = validCondition();
    p.evidence[0].quote = Array.from({ length: 31 }, (_, i) => `w${i}`).join(' ');
    expect(validateConditionProfile(p).join(' ')).toMatch(/over 30 words/);
  });

  test('education must reference a cited evidence entry', () => {
    const p = validInjury();
    p.education[0].evidenceIndex = 4;
    expect(validateInjuryProfile(p).join(' ')).toMatch(/evidenceIndex/);
  });

  test('an injury profile with no questions is refused (order section 7)', () => {
    const p = validInjury();
    p.movementQuestions = [];
    expect(validateInjuryProfile(p).join(' ')).toMatch(/selects? questions|exists to select/i);
  });

  test('neverInfer is mandatory on every profile', () => {
    const p = validCondition();
    p.neverInfer = [];
    expect(validateConditionProfile(p).join(' ')).toMatch(/never assume|neverInfer/);
  });

  test('post-operative profiles must state the clinician-directed boundary', () => {
    const p = validInjury();
    p.region = INJURY_REGION.POST_OPERATIVE;
    p.clinicianBoundary = null;
    expect(validateInjuryProfile(p).join(' ')).toMatch(/clinicianBoundary/);
  });

  test('condition names are permitted in directory copy while function terms stay banned', () => {
    expect(directoryWordingViolation('Living with arthritis, people train in many ways.')).toBeNull();
    expect(directoryWordingViolation('Strength work treats arthritis.')).not.toBeNull();
  });
});

describe('DIRECTORY_FAMILY_KEYS is honest against the live seed', () => {
  test('every directory family key resolves to at least one real seed exercise', () => {
    const rows = seedRows();
    expect(rows.length).toBeGreaterThan(500);
    const present = new Set();
    for (const r of rows) {
      const fam = movementFamily(r.name, r.muscle, r.subregion);
      if (fam) present.add(fam);
    }
    const missing = DIRECTORY_FAMILY_KEYS.filter(k => !present.has(k));
    expect(missing).toEqual([]);
  });
});

describe('every shipped profile validates clean and ids are unique', () => {
  test('conditions validate', () => {
    for (const p of CONDITION_PROFILES) {
      expect({ id: p.id, errors: validateConditionProfile(p) }).toEqual({ id: p.id, errors: [] });
    }
  });
  test('injuries validate', () => {
    for (const p of INJURY_PROFILES) {
      expect({ id: p.id, errors: validateInjuryProfile(p) }).toEqual({ id: p.id, errors: [] });
    }
  });
  test('ids unique across both directories', () => {
    const ids = [...CONDITION_PROFILES, ...INJURY_PROFILES].map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('search is deterministic, alias-aware, and never dead-ends', () => {
  test('empty query lists everything alphabetically with OTHER last', () => {
    const res = searchProfiles('');
    expect(res[res.length - 1]).toBe(OTHER_PROFILE);
  });
  test('no-match query still returns the OTHER path', () => {
    const res = searchProfiles('zzz definitely not a profile');
    expect(res).toEqual([OTHER_PROFILE]);
  });
  test('profileById resolves the OTHER path', () => {
    expect(profileById('other_not_listed')).toBe(OTHER_PROFILE);
  });
});

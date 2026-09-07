// GD-20 Companies House corroboration tightening fixtures: postcode unit
// alone must no longer be enough (the "golf club corroborates a yoga
// studio" defect from the first pipeline run) — name similarity now gates
// it too.
const { foldCompanyName, companyNameMatchesVenue } = require('../lib/chMatch');

describe('foldCompanyName', () => {
  it('strips legal suffixes and generic gym-domain tokens', () => {
    expect(foldCompanyName('VOLT FITNESS UK LIMITED')).toEqual(['volt']);
    expect(foldCompanyName('Riverside Gym Ltd')).toEqual(['riverside']);
  });
});

describe('companyNameMatchesVenue', () => {
  it('matches when the distinctive tokens overlap (Volt Fitness UK Ltd vs Volt Gym)', () => {
    const r = companyNameMatchesVenue('VOLT FITNESS UK LIMITED', 'Volt Gym');
    expect(r.matches).toBe(true);
  });

  it('does NOT match a golf club corroborating a yoga studio at the same postcode unit', () => {
    const r = companyNameMatchesVenue('SWORDFISH GOLF CLUB LIMITED', 'Zen Yoga Studio');
    expect(r.matches).toBe(false);
  });

  it('matches on two shared distinctive tokens even below 0.5 Jaccard', () => {
    const r = companyNameMatchesVenue('Riverside Strength And Conditioning Limited', 'Riverside Strength Gym');
    expect(r.sharedTokenCount).toBeGreaterThanOrEqual(2);
    expect(r.matches).toBe(true);
  });

  it('does not match when no distinctive token is shared at all', () => {
    const r = companyNameMatchesVenue('Acme Holdings Limited', 'Riverside Gym');
    expect(r.matches).toBe(false);
  });

  it('matches a single distinctive word shared exactly (Jaccard 1.0)', () => {
    const r = companyNameMatchesVenue('Acme Holdings Limited', 'Acme Gym');
    expect(r.matches).toBe(true);
  });
});

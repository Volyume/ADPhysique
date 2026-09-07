// GD-26 point 3 fixtures: "an operator whose manifest shows a complete
// acquisition (failures at most 3 and found > 0), every canonical venue
// carrying that brand with no member from that operator's feed gets
// verification_status = 'operator_unconfirmed' and needs_review_reason =
// 'not_in_operator_feed'." Pure logic only — no filesystem, no I/O.
const { isCompleteAcquisition, markOperatorUnconfirmed } = require('../lib/operatorCoverage');

describe('isCompleteAcquisition', () => {
  it('is complete when found > 0 and failures at most 3', () => {
    expect(isCompleteAcquisition({ branch_urls_found: 25, failures: [] })).toBe(true);
    expect(isCompleteAcquisition({ branch_urls_found: 110, failures: [1, 2, 3] })).toBe(true);
  });

  it('is not complete when found is 0 (Parkwood Leisure/Ultimate Fitness, not enumerable)', () => {
    expect(isCompleteAcquisition({ branch_urls_found: 0, failures: [] })).toBe(false);
  });

  it('is not complete with more than 3 failures', () => {
    expect(isCompleteAcquisition({ branch_urls_found: 100, failures: [1, 2, 3, 4] })).toBe(false);
  });

  it('handles a missing/malformed manifest', () => {
    expect(isCompleteAcquisition(null)).toBe(false);
    expect(isCompleteAcquisition(undefined)).toBe(false);
    expect(isCompleteAcquisition({})).toBe(false);
  });
});

describe('markOperatorUnconfirmed', () => {
  it('flags a venue carrying a complete operator brand with no member from that feed', () => {
    const venues = [
      {
        id: 'v1',
        brand_key: 'fitness-first',
        verification_status: 'single_source',
        member_keys: ['overture:abc123'],
      },
    ];
    const map = new Map([['fitness-first', 'fitness-first']]);
    const { total, bySlug } = markOperatorUnconfirmed(venues, map);
    expect(total).toBe(1);
    expect(bySlug).toEqual({ 'fitness-first': 1 });
    expect(venues[0].verification_status).toBe('operator_unconfirmed');
    expect(venues[0].needs_review_reason).toBe('not_in_operator_feed');
  });

  it('leaves a venue alone when it DOES carry a member from the operator feed', () => {
    const venues = [
      {
        id: 'v2',
        brand_key: 'puregym',
        verification_status: 'multi_source',
        member_keys: ['overture:xyz', 'operator:puregym:https://www.puregym.com/gyms/motherwell/'],
      },
    ];
    const map = new Map([['puregym', 'puregym']]);
    const { total, bySlug } = markOperatorUnconfirmed(venues, map);
    expect(total).toBe(0);
    expect(bySlug).toEqual({});
    expect(venues[0].verification_status).toBe('multi_source');
    expect(venues[0].needs_review_reason).toBeNull();
  });

  it('leaves status untouched, only overwrites verification_status', () => {
    const venues = [
      { id: 'v3', brand_key: 'fitness-first', status: 'open', verification_status: 'single_source', member_keys: [] },
    ];
    const map = new Map([['fitness-first', 'fitness-first']]);
    markOperatorUnconfirmed(venues, map);
    expect(venues[0].status).toBe('open');
    expect(venues[0].verification_status).toBe('operator_unconfirmed');
  });

  it('ignores a brand whose operator is not in the complete map (e.g. Parkwood Leisure, found = 0)', () => {
    const venues = [
      { id: 'v4', brand_key: 'parkwood-leisure', verification_status: 'single_source', member_keys: [] },
    ];
    const { total } = markOperatorUnconfirmed(venues, new Map());
    expect(total).toBe(0);
    expect(venues[0].verification_status).toBe('single_source');
    expect(venues[0].needs_review_reason).toBeNull();
  });

  it('ignores a venue with no brand at all (independent gym)', () => {
    const venues = [{ id: 'v5', brand_key: null, verification_status: 'single_source', member_keys: [] }];
    const map = new Map([['fitness-first', 'fitness-first']]);
    const { total } = markOperatorUnconfirmed(venues, map);
    expect(total).toBe(0);
    expect(venues[0].needs_review_reason).toBeNull();
  });

  it('sets needs_review_reason to null (not undefined) on every unflagged venue, so the field is always present', () => {
    const venues = [{ id: 'v6', brand_key: null, verification_status: 'single_source', member_keys: [] }];
    markOperatorUnconfirmed(venues, new Map());
    expect(Object.prototype.hasOwnProperty.call(venues[0], 'needs_review_reason')).toBe(true);
    expect(venues[0].needs_review_reason).toBeNull();
  });

  it('a member key from a DIFFERENT operator slug does not count as coverage (only the exact operator:<slug>: prefix matches)', () => {
    const venues = [
      {
        id: 'v7',
        brand_key: 'better',
        verification_status: 'single_source',
        member_keys: ['operator:better-gll-old:https://example.com/'],
      },
    ];
    const map = new Map([['better', 'better-gll']]);
    const { total } = markOperatorUnconfirmed(venues, map);
    expect(total).toBe(1);
    expect(venues[0].verification_status).toBe('operator_unconfirmed');
  });
});

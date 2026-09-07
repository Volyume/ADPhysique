// GD-05 brand matching over the blueprint's own "Tests and records" human
// inputs, plus the Wikidata enrichment loader (best-effort, degrades to an
// empty Map when the source file is absent).
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { matchBrand, aliasTokenSetsFor, seedBrandsTable, loadWikidataEnrichment } = require('../lib/brands');

describe('matchBrand — human inputs from the blueprint', () => {
  const cases = [
    ['PureGym Motherwell', 'puregym'],
    ['Puregym', 'puregym'],
    ['Pure Gym', 'puregym'],
    ['Motherwell PureGym', 'puregym'],
    ['the gym motherwell', 'the-gym-group'],
    ['JD', 'jd-gyms'],
    ['J D Gyms', 'jd-gyms'],
    ['Bannatyne Hamilton', 'bannatyne'],
    ['David Lloyd Glasgow', 'david-lloyd'],
  ];

  it.each(cases)('%s -> %s', (input, expectedKey) => {
    expect(matchBrand(input)?.key).toBe(expectedKey);
  });

  it('"Motherwell gym" (no brand present) does not match a brand', () => {
    expect(matchBrand('Motherwell gym')).toBeNull();
  });

  it('"Xercise4Less" folds into JD Gyms (retired brand, per docs/03)', () => {
    expect(matchBrand('Xercise4Less Wakefield')?.key).toBe('jd-gyms');
  });

  it('does not false-positive on an unrelated name', () => {
    expect(matchBrand('Volt Gym Burscough')).toBeNull();
  });
});

describe('aliasTokenSetsFor', () => {
  it('returns the folded alias token sets for a known brand', () => {
    const sets = aliasTokenSetsFor('puregym');
    expect(sets).toEqual(expect.arrayContaining([['puregym'], ['pure', 'gym']]));
  });

  it('returns [] for an unknown key', () => {
    expect(aliasTokenSetsFor('not-a-brand')).toEqual([]);
  });
});

describe('seedBrandsTable', () => {
  it('includes every seed brand with no enrichment', () => {
    const table = seedBrandsTable();
    expect(table.length).toBeGreaterThan(20);
    const puregym = table.find((b) => b.key === 'puregym');
    expect(puregym.wikidata_qid).toBeNull();
  });

  it('attaches qid/website when an enrichment map is supplied', () => {
    const enrichment = new Map([['puregym', { qid: 'Q12345', website: 'https://www.puregym.com/' }]]);
    const table = seedBrandsTable(enrichment);
    const puregym = table.find((b) => b.key === 'puregym');
    expect(puregym.wikidata_qid).toBe('Q12345');
    expect(puregym.website).toBe('https://www.puregym.com/');
  });
});

describe('loadWikidataEnrichment', () => {
  it('returns an empty Map and logs when the source file is absent', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gyms-brands-'));
    const messages = [];
    const result = loadWikidataEnrichment(tmp, (m) => messages.push(m));
    expect(result.size).toBe(0);
    expect(messages.some((m) => m.includes('source not present'))).toBe(true);
  });

  it('matches a confident label and attaches qid/website', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gyms-brands-'));
    fs.mkdirSync(path.join(tmp, 'brands'));
    fs.writeFileSync(
      path.join(tmp, 'brands', 'wikidata_by_label_raw.json'),
      JSON.stringify({
        results: {
          bindings: [
            {
              searchLabel: { value: 'JD Gyms' },
              item: { value: 'http://www.wikidata.org/entity/Q112947108' },
              itemLabel: { value: 'JD Gyms' },
              website: { value: 'https://www.jdgyms.co.uk/' },
            },
          ],
        },
      }),
    );
    const result = loadWikidataEnrichment(tmp);
    expect(result.get('jd-gyms')).toEqual({ qid: 'Q112947108', website: 'https://www.jdgyms.co.uk/' });
  });
});

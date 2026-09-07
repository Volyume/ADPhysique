// Pins fold.js's text-normalisation behaviour, which every other pipeline
// module (classify, dedupe, brands) depends on for consistent comparisons.
const { foldText, tokenize, stripBrandFromTokens, tokenJaccard } = require('../lib/fold');

describe('foldText', () => {
  it('lowercases, strips accents and punctuation, collapses whitespace', () => {
    expect(foldText('  PureGym   Motherwell!  ')).toBe('puregym motherwell');
    expect(foldText('énergie Fitness')).toBe('energie fitness');
    expect(foldText("David Lloyd's Club (Cardiff)")).toBe('david lloyd s club cardiff');
  });

  it('handles null/undefined/empty', () => {
    expect(foldText(null)).toBe('');
    expect(foldText(undefined)).toBe('');
    expect(foldText('')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits folded text into tokens', () => {
    expect(tokenize('The Gym Group - Cardiff')).toEqual(['the', 'gym', 'group', 'cardiff']);
  });

  it('returns [] for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('stripBrandFromTokens', () => {
  it('removes a matching alias run from the token list', () => {
    const tokens = tokenize('PureGym Motherwell');
    const result = stripBrandFromTokens(tokens, [['puregym']]);
    expect(result).toEqual(['motherwell']);
  });

  it('prefers the longest matching alias', () => {
    const tokens = tokenize('the gym group cardiff');
    const result = stripBrandFromTokens(tokens, [['the', 'gym'], ['the', 'gym', 'group']]);
    expect(result).toEqual(['cardiff']);
  });

  it('leaves tokens unchanged when no alias matches', () => {
    const tokens = tokenize('volt gym burscough');
    expect(stripBrandFromTokens(tokens, [['puregym']])).toEqual(tokens);
  });
});

describe('tokenJaccard', () => {
  it('is 1 for identical sets and 0 for disjoint sets', () => {
    expect(tokenJaccard(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(tokenJaccard(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('computes intersection-over-union for partial overlap', () => {
    expect(tokenJaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5);
  });
});

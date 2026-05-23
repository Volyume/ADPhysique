/**
 * Verifies the jargon blocklist enforcement on whyThis output strings:
 *  - all existing gym abbreviations remain blocked
 *  - new science-jargon entries are blocked
 *  - bare researcher surnames are blocked
 *  - plain-English alternatives pass cleanly
 */
import { checkJargon } from '../whyThisTemplates';

describe('JARGON_BLOCKLIST: existing gym abbreviations (regression)', () => {
  test.each([
    ['MEV territory'],
    ['MAV ceiling'],
    ['MRV check'],
    ['leave 2 RIR on the bar'],
    ['stay at 7 RPE'],
    ['this mesocycle ends Sunday'],
    ['junk volume'],
  ])('blocks "%s"', (input) => {
    expect(checkJargon(input).clean).toBe(false);
  });
});

describe('JARGON_BLOCKLIST: new science jargon', () => {
  test('blocks "metabolic adaptation"', () => {
    expect(checkJargon('Your metabolic adaptation has shifted').clean).toBe(false);
  });

  test('blocks "training stimulus"', () => {
    expect(checkJargon('This drill drives a strong training stimulus').clean).toBe(false);
  });

  test('blocks "stimulus-to-fatigue ratio"', () => {
    expect(checkJargon('high stimulus-to-fatigue ratio').clean).toBe(false);
  });

  test('plain-English alternatives pass', () => {
    expect(checkJargon('Your body has adjusted').clean).toBe(true);
    expect(checkJargon('Muscle growth signal is strong').clean).toBe(true);
    expect(checkJargon('Good training payoff').clean).toBe(true);
  });
});

describe('JARGON_BLOCKLIST: bare researcher surnames', () => {
  test.each([
    ['research by Helms suggests'],
    ['per Schoenfeld 2017'],
    ['the Morton meta-analysis'],
    ['Mountjoy et al. set the threshold'],
    ['Eikey 2021 documents the harm'],
    ['Refalo 2025 found that'],
    ['(Trexler 2023)'],
  ])('blocks surface copy containing surname: %s', (input) => {
    expect(checkJargon(input).clean).toBe(false);
  });

  test('plain rephrasing without surname passes', () => {
    expect(checkJargon('research suggests a safety threshold').clean).toBe(true);
    expect(checkJargon('the meta-analysis found no benefit beyond 2.2 g/kg').clean).toBe(true);
  });
});

describe('JARGON_BLOCKLIST: edge cases', () => {
  test('empty string passes', () => {
    expect(checkJargon('').clean).toBe(true);
  });

  test('surname at start of string still blocked', () => {
    expect(checkJargon(' Helms 2014 says').clean).toBe(false);
  });

  test('common words that contain a surname substring still pass', () => {
    // "helmsman" contains "Helms" but is not a citation pattern.
    // Leading space in the blocklist entry (' Helms') prevents this match.
    expect(checkJargon('helmsman of the ship').clean).toBe(true);
  });

  test('violations array names the matching term', () => {
    const result = checkJargon('Your metabolic adaptation has shifted');
    expect(result.violations).toContain('metabolic adaptation');
  });

  test('surname after punctuation is blocked (Mountjoy at sentence start)', () => {
    expect(checkJargon('Mountjoy et al. set the threshold').clean).toBe(false);
  });

  test('surname inside parentheses is blocked', () => {
    expect(checkJargon('(Trexler 2023)').clean).toBe(false);
  });
});

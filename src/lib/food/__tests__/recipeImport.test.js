/**
 * extractRecipeJsonLd: pull a schema.org/Recipe out of a page's
 * JSON-LD. Pure, so tested directly against HTML strings covering the
 * shapes real recipe sites publish (bare object, @graph, string vs
 * array ingredients, messy recipeYield) plus the failure modes
 * (malformed block, no recipe at all).
 */
import { extractRecipeJsonLd } from '../recipeImport';

function ldScript(json) {
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

describe('extractRecipeJsonLd', () => {
  test('basic schema.org Recipe in a ld+json block', () => {
    const html = `<html><head>${ldScript({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Sunday chilli',
      recipeIngredient: ['500g beef mince', '1 onion'],
      recipeYield: '4 servings',
    })}</head><body></body></html>`;
    expect(extractRecipeJsonLd(html)).toEqual({
      name: 'Sunday chilli',
      ingredients: ['500g beef mince', '1 onion'],
      servings: 4,
    });
  });

  test('@graph form with the Recipe nested among other nodes', () => {
    const html = ldScript({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'A food blog' },
        { '@type': 'Person', name: 'The cook' },
        {
          '@type': 'Recipe',
          name: 'Lentil soup',
          recipeIngredient: ['200g lentils'],
          recipeYield: 6,
        },
      ],
    });
    expect(extractRecipeJsonLd(html)).toEqual({
      name: 'Lentil soup',
      ingredients: ['200g lentils'],
      servings: 6,
    });
  });

  test('@type as an array including Recipe is recognised', () => {
    const html = ldScript({
      '@type': ['Recipe', 'NewsArticle'],
      name: 'Hybrid',
      recipeIngredient: ['1 thing'],
      recipeYield: '2',
    });
    expect(extractRecipeJsonLd(html)).toEqual({
      name: 'Hybrid',
      ingredients: ['1 thing'],
      servings: 2,
    });
  });

  test('recipeIngredient as a single string is normalised to an array', () => {
    const html = ldScript({
      '@type': 'Recipe',
      name: 'One liner',
      recipeIngredient: '1 egg',
      recipeYield: '1',
    });
    expect(extractRecipeJsonLd(html).ingredients).toEqual(['1 egg']);
  });

  test('recipeIngredient as an array is kept, blanks and non-strings dropped', () => {
    const html = ldScript({
      '@type': 'Recipe',
      name: 'Mixed',
      recipeIngredient: ['100g flour', '', '  ', 42, null, '2 eggs'],
      recipeYield: '8',
    });
    expect(extractRecipeJsonLd(html).ingredients).toEqual(['100g flour', '2 eggs']);
  });

  test('recipeYield parsing: number, plain string, array, and missing', () => {
    const yields = [
      [4, 4],
      ['Serves 12', 12],
      [['10 servings', '10'], 10],
      [undefined, null],
      ['no number here', null],
    ];
    for (const [recipeYield, expected] of yields) {
      const html = ldScript({
        '@type': 'Recipe', name: 'Y', recipeIngredient: ['x'], recipeYield,
      });
      expect(extractRecipeJsonLd(html).servings).toBe(expected);
    }
  });

  test('multiple ld+json blocks: only the Recipe one is picked', () => {
    const html = [
      ldScript({ '@type': 'BreadcrumbList', itemListElement: [] }),
      ldScript({ '@type': 'Organization', name: 'Brand' }),
      ldScript({
        '@type': 'Recipe',
        name: 'Found it',
        recipeIngredient: ['1 carrot'],
        recipeYield: '3',
      }),
    ].join('\n');
    expect(extractRecipeJsonLd(html)).toEqual({
      name: 'Found it',
      ingredients: ['1 carrot'],
      servings: 3,
    });
  });

  test('a malformed JSON block is skipped, not thrown, and a later valid Recipe wins', () => {
    const html = [
      '<script type="application/ld+json">{ this is not valid json ]</script>',
      ldScript({
        '@type': 'Recipe',
        name: 'Survivor',
        recipeIngredient: ['1 potato'],
        recipeYield: '2',
      }),
    ].join('\n');
    expect(() => extractRecipeJsonLd(html)).not.toThrow();
    expect(extractRecipeJsonLd(html).name).toBe('Survivor');
  });

  test('no Recipe present returns null', () => {
    const html = ldScript({ '@type': 'Article', name: 'Just an article' });
    expect(extractRecipeJsonLd(html)).toBeNull();
  });

  test('no ld+json at all returns null', () => {
    expect(extractRecipeJsonLd('<html><body>nothing here</body></html>')).toBeNull();
  });

  test('malformed input never throws', () => {
    expect(extractRecipeJsonLd(null)).toBeNull();
    expect(extractRecipeJsonLd(undefined)).toBeNull();
    expect(extractRecipeJsonLd('')).toBeNull();
    expect(extractRecipeJsonLd(12345)).toBeNull();
  });
});

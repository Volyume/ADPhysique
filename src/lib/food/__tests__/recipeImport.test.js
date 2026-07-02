/**
 * extractRecipeJsonLd: pull a schema.org/Recipe out of a page's
 * JSON-LD. Pure, so tested directly against HTML strings covering the
 * shapes real recipe sites publish (bare object, @graph, string vs
 * array ingredients, messy recipeYield) plus the failure modes
 * (malformed block, no recipe at all).
 */
import { extractRecipeJsonLd, isAllowedRecipeUrl, importRecipeFromUrl } from '../recipeImport';

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

// SC-8: the import URL is user-supplied, so the importer must never
// follow anything but https. These tests fail if the scheme gate is
// removed or loosened: a non-https URL must yield the same calm null
// (the screen's existing "couldn't read a recipe" toast) WITHOUT any
// fetch being issued.
describe('SC-8: https-only scheme gate', () => {
  const rejected = [
    'http://example.com/recipe',
    'file:///etc/passwd',
    'content://com.android.providers/media/1',
    'javascript:alert(1)',
    'ftp://example.com/recipe',
    'HTTP://EXAMPLE.COM/recipe',
    'https//missing-colon.com',
    '//example.com/protocol-relative',
    'example.com/no-scheme',
    '',
    '   ',
  ];

  test.each(rejected)('rejects %s', (url) => {
    expect(isAllowedRecipeUrl(url)).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(isAllowedRecipeUrl(null)).toBe(false);
    expect(isAllowedRecipeUrl(undefined)).toBe(false);
    expect(isAllowedRecipeUrl(42)).toBe(false);
  });

  test('accepts https (any case, surrounding whitespace tolerated)', () => {
    expect(isAllowedRecipeUrl('https://example.com/recipe')).toBe(true);
    expect(isAllowedRecipeUrl('HTTPS://example.com/recipe')).toBe(true);
    expect(isAllowedRecipeUrl('  https://example.com/recipe  ')).toBe(true);
  });

  describe('importRecipeFromUrl honours the gate', () => {
    const realFetch = global.fetch;
    afterEach(() => { global.fetch = realFetch; });

    test('a non-https URL returns null and never fetches', async () => {
      global.fetch = jest.fn();
      await expect(importRecipeFromUrl('http://example.com/recipe')).resolves.toBeNull();
      await expect(importRecipeFromUrl('file:///etc/passwd')).resolves.toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('an https URL is fetched and parsed', async () => {
      const html = `<script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe',
        name: 'Gate pass',
        recipeIngredient: ['1 egg'],
        recipeYield: '1',
      })}</script>`;
      global.fetch = jest.fn(async () => ({ text: async () => html }));
      const parsed = await importRecipeFromUrl(' https://example.com/recipe ');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/recipe');
      expect(parsed?.name).toBe('Gate pass');
    });
  });
});

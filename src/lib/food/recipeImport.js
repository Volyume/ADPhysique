/**
 * Recipe import from a web URL.
 *
 * Pulls a schema.org/Recipe object out of a page's JSON-LD and
 * normalises the three fields the recipe builder needs: name,
 * ingredient strings, and servings. Best-effort: most recipe sites
 * publish ld+json, and the user reviews everything we extract.
 *
 * No new dependency, no AI. Just fetch + JSON.parse + a regex to
 * pull the ld+json script blocks. The extractor is pure and never
 * throws, so a malformed page yields null rather than crashing the
 * builder.
 */

/**
 * Coerce recipeIngredient (string | string[] | other) to a clean
 * string[]. Non-string entries are dropped; blanks are trimmed out.
 */
function normaliseIngredients(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const s = item.trim();
    if (s) out.push(s);
  }
  return out;
}

/**
 * Parse servings from recipeYield (string | number | array). Takes
 * the first integer found, e.g. '4 servings' -> 4, ['4 servings',
 * '4'] -> 4. Returns null when no integer is present.
 */
function parseServings(raw) {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return Math.trunc(candidate);
  }
  if (typeof candidate === 'string') {
    const m = candidate.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

/**
 * Does this object's @type mark it as a Recipe? @type may be a
 * string or an array of strings.
 */
function isRecipe(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj['@type'];
  if (typeof t === 'string') return t === 'Recipe';
  if (Array.isArray(t)) return t.includes('Recipe');
  return false;
}

/**
 * Walk a parsed JSON-LD value (object, array, or @graph container)
 * and return the first Recipe object found, or null.
 */
function findRecipe(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (isRecipe(node)) return node;
  if (Array.isArray(node['@graph'])) {
    return findRecipe(node['@graph']);
  }
  return null;
}

/**
 * PURE. Extract a schema.org Recipe from a page's HTML.
 *
 * Finds every <script type="application/ld+json"> block, JSON.parses
 * each (tolerating per-block parse errors), and locates a Recipe
 * object (bare, in an array, or under @graph).
 *
 * @param {string} html
 * @returns {{ name: any, ingredients: string[], servings: number|null }|null}
 */
export function extractRecipeJsonLd(html) {
  if (typeof html !== 'string' || !html) return null;

  // Match each ld+json script block and capture its inner text. The
  // type attribute may carry other attributes around it and any
  // amount of whitespace, so we keep the matching loose.
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = re.exec(html)) !== null) {
    const block = match[1];
    if (!block) continue;
    let parsed;
    try {
      parsed = JSON.parse(block.trim());
    } catch (_e) {
      // Malformed block: skip it, keep scanning the others.
      continue;
    }
    const recipe = findRecipe(parsed);
    if (recipe) {
      return {
        name: typeof recipe.name === 'string' ? recipe.name : null,
        ingredients: normaliseIngredients(recipe.recipeIngredient),
        servings: parseServings(recipe.recipeYield),
      };
    }
  }
  return null;
}

/**
 * PURE. Only https URLs may be fetched (audit SC-8). The URL is
 * user-supplied, so without this the importer would happily follow
 * http:, file:, content:, javascript: or any other scheme fetch
 * understands. Scheme check only; the host stays the user's choice.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isAllowedRecipeUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}

/**
 * Fetch a page and extract its Recipe. Returns the parsed object or
 * null on any network or parse failure (the caller shows the same calm
 * "couldn't read a recipe" toast either way). https only. Not
 * unit-tested beyond the pure extractor and the scheme gate.
 *
 * @param {string} url
 * @returns {Promise<{ name: any, ingredients: string[], servings: number|null }|null>}
 */
export async function importRecipeFromUrl(url) {
  if (!isAllowedRecipeUrl(url)) return null;
  try {
    const response = await fetch(url.trim());
    const html = await response.text();
    return extractRecipeJsonLd(html);
  } catch (_e) {
    return null;
  }
}

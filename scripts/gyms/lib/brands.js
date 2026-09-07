// Seed brand/alias table (GD-05) for the UK gym directory. Pure matching
// logic lives here with no I/O; loadWikidataEnrichment() is the one
// exception (reads a JSON file already fetched to raw/brands/) and is kept
// separate so matchBrand() itself stays unit-testable without a filesystem.

const { foldText, tokenize } = require('./fold');

// key: stable slug used as gym_brands.key. name: canonical display name.
// aliases: every spelling/variant we know of, INCLUDING the canonical name
// (folded at match time, so case/spacing/punctuation don't matter here).
// kind: GD-03 "operator brand type" classification hint -> venue_type.
// wikidataSearchLabel: the label used when this brand was searched against
// Wikidata (raw/brands/wikidata_by_label_raw.json), for enrichment.
const SEED_BRANDS = [
  {
    key: 'puregym',
    name: 'PureGym',
    aliases: ['puregym', 'pure gym', 'pure gym uk'],
    kind: 'commercial_gym',
    wikidataSearchLabel: null,
  },
  {
    key: 'the-gym-group',
    name: 'The Gym Group',
    aliases: ['the gym group', 'the gym', 'gym group'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'The Gym Group',
  },
  {
    key: 'jd-gyms',
    name: 'JD Gyms',
    aliases: ['jd gyms', 'jd gym', 'j d gyms', 'jd', 'xercise4less', 'xercise 4 less'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'JD Gyms',
  },
  {
    key: 'nuffield-health',
    name: 'Nuffield Health',
    aliases: ['nuffield health', 'nuffield', 'nuffield health fitness wellbeing centre'],
    kind: 'health_club',
    wikidataSearchLabel: 'Nuffield Health',
  },
  {
    key: 'david-lloyd',
    name: 'David Lloyd',
    aliases: ['david lloyd', 'david lloyd leisure', 'david lloyd clubs'],
    kind: 'health_club',
    wikidataSearchLabel: 'David Lloyd Leisure',
  },
  {
    key: 'better',
    name: 'Better',
    aliases: ['better', 'better leisure', 'better gll', 'gll', 'greenwich leisure limited', 'greenwich leisure'],
    kind: 'leisure_centre',
    wikidataSearchLabel: 'Greenwich Leisure Limited',
  },
  {
    key: 'everyone-active',
    name: 'Everyone Active',
    aliases: ['everyone active', 'slm', 'sports and leisure management'],
    kind: 'leisure_centre',
    wikidataSearchLabel: 'Everyone Active',
  },
  {
    key: 'fitness-first',
    name: 'Fitness First',
    aliases: ['fitness first', 'dw fitness first', 'dw sports fitness first'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Fitness First',
  },
  {
    key: 'virgin-active',
    name: 'Virgin Active',
    aliases: ['virgin active'],
    kind: 'health_club',
    wikidataSearchLabel: 'Virgin Active',
  },
  {
    key: 'bannatyne',
    name: 'Bannatyne',
    aliases: ['bannatyne', 'bannatynes', 'bannatyne health club', 'bannatyne spa'],
    kind: 'health_club',
    wikidataSearchLabel: null,
  },
  {
    key: 'energie',
    name: 'énergie Fitness',
    aliases: ['energie', 'energie fitness', 'nrg energie'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'énergie Fitness',
  },
  {
    key: 'snap-fitness',
    name: 'Snap Fitness',
    aliases: ['snap fitness'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Snap Fitness',
  },
  {
    key: 'anytime-fitness',
    name: 'Anytime Fitness',
    aliases: ['anytime fitness'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Anytime Fitness',
  },
  {
    key: 'village-gym',
    name: 'Village Gym',
    aliases: ['village gym', 'village gyms', 'village hotels', 'village hotel'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Village Hotels',
  },
  {
    key: 'total-fitness',
    name: 'Total Fitness',
    aliases: ['total fitness'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Total Fitness',
  },
  {
    key: 'gymbox',
    name: 'Gymbox',
    aliases: ['gymbox'],
    kind: 'boutique_studio',
    wikidataSearchLabel: 'Gymbox',
  },
  {
    key: 'third-space',
    name: 'Third Space',
    aliases: ['third space'],
    kind: 'boutique_studio',
    wikidataSearchLabel: 'Third Space',
  },
  {
    key: '1rebel',
    name: '1Rebel',
    aliases: ['1rebel', 'one rebel'],
    kind: 'boutique_studio',
    wikidataSearchLabel: null,
  },
  {
    key: 'f45',
    name: 'F45',
    aliases: ['f45', 'f45 training'],
    kind: 'crossfit_functional',
    wikidataSearchLabel: 'F45 Training',
  },
  {
    key: 'crossfit',
    name: 'CrossFit',
    aliases: ['crossfit'],
    kind: 'crossfit_functional',
    wikidataSearchLabel: 'CrossFit',
  },
  {
    key: 'places-leisure',
    name: 'Places Leisure',
    aliases: ['places leisure'],
    kind: 'leisure_centre',
    wikidataSearchLabel: 'Places Leisure',
  },
  {
    key: 'freedom-leisure',
    name: 'Freedom Leisure',
    aliases: ['freedom leisure'],
    kind: 'leisure_centre',
    wikidataSearchLabel: null,
  },
  {
    key: 'parkwood-leisure',
    name: 'Parkwood Leisure',
    aliases: ['parkwood leisure', 'parkwood'],
    kind: 'leisure_centre',
    wikidataSearchLabel: null,
  },
  {
    key: 'serco-leisure',
    name: 'Serco Leisure',
    aliases: ['serco leisure', 'serco'],
    kind: 'leisure_centre',
    wikidataSearchLabel: null,
  },
  {
    key: 'everlast',
    name: 'Everlast Gyms',
    aliases: ['everlast', 'everlast gyms', 'sports direct fitness'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Everlast Gyms',
  },
  {
    key: 'ultimate-fitness',
    name: 'Ultimate Fitness',
    aliases: ['ultimate fitness', 'ultimate fitness group'],
    kind: 'commercial_gym',
    wikidataSearchLabel: 'Ultimate Fitness',
  },
  {
    key: '247-fitness',
    name: '24/7 Fitness',
    aliases: ['24 7 fitness', '247 fitness', '24 hour fitness'],
    kind: 'commercial_gym',
    wikidataSearchLabel: '24/7 Fitness',
  },
  {
    key: 'simply-gym',
    name: 'Simply Gym',
    aliases: ['simply gym'],
    kind: 'commercial_gym',
    wikidataSearchLabel: null,
  },
  {
    key: 'trainmore',
    name: 'Trainmore',
    aliases: ['trainmore', 'train more'],
    kind: 'commercial_gym',
    wikidataSearchLabel: null,
  },
];

// Pre-fold every alias once so matching is cheap and consistent.
const FOLDED_BRANDS = SEED_BRANDS.map((brand) => ({
  ...brand,
  foldedAliases: brand.aliases.map((a) => foldText(a)).filter(Boolean),
  aliasTokenSets: brand.aliases.map((a) => tokenize(a)).filter((t) => t.length > 0),
}));

// Sort so longer (more specific) aliases are tried first — otherwise a
// short alias like "jd" could pre-empt a more specific but coincidentally-
// overlapping one.
const BRANDS_BY_ALIAS_LENGTH = FOLDED_BRANDS.slice().sort((a, b) => {
  const maxA = Math.max(...a.foldedAliases.map((s) => s.length));
  const maxB = Math.max(...b.foldedAliases.map((s) => s.length));
  return maxB - maxA;
});

/**
 * Match a raw venue/company name against the seed brand table.
 * Whole-word alias match: the alias's tokens must appear as a contiguous
 * run within the name's tokens (so "PureGym Motherwell" matches "puregym",
 * but "Total Fitness First Aid Room" does not spuriously match "Fitness
 * First").
 * @param {string} rawName
 * @returns {{ key: string, name: string, kind: string }|null}
 */
function matchBrand(rawName) {
  const tokens = tokenize(rawName);
  if (tokens.length === 0) return null;

  for (const brand of BRANDS_BY_ALIAS_LENGTH) {
    for (const aliasTokens of brand.aliasTokenSets) {
      if (containsSubsequence(tokens, aliasTokens)) {
        return { key: brand.key, name: brand.name, kind: brand.kind };
      }
    }
  }
  return null;
}

function containsSubsequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * All folded alias token-sets for a brand key, for use with
 * fold.stripBrandFromTokens() during dedupe name comparison.
 */
function aliasTokenSetsFor(brandKey) {
  const brand = FOLDED_BRANDS.find((b) => b.key === brandKey);
  return brand ? brand.aliasTokenSets : [];
}

/**
 * A plain object copy of the seed table (for build.mjs to write
 * data/gyms/brands.v1.json), optionally enriched with Wikidata QID/website
 * when a matching enrichment map is supplied (see loadWikidataEnrichment).
 * @param {Map<string,{qid:string, website:string|null}>} [enrichment]
 */
function seedBrandsTable(enrichment) {
  return SEED_BRANDS.map((brand) => {
    const extra = enrichment && enrichment.get(brand.key);
    return {
      key: brand.key,
      name: brand.name,
      aliases: brand.aliases,
      kind: brand.kind,
      wikidata_qid: extra ? extra.qid : null,
      website: extra ? extra.website || null : null,
    };
  });
}

/**
 * Best-effort Wikidata enrichment: reads
 * raw/brands/wikidata_by_label_raw.json (a SPARQL query result keyed by the
 * search label used for each brand) and returns a Map<brandKey, {qid,
 * website}> for brands where the returned item's own label folds equal to
 * the search label (a confident, non-ambiguous match). Returns an empty Map
 * (logging why) when the file is absent — this is the one I/O function in
 * this module, kept separate from matchBrand() so the matcher stays pure.
 * @param {string} rawDir
 * @param {(msg: string) => void} [log]
 */
function loadWikidataEnrichment(rawDir, log = () => {}) {
  const fs = require('node:fs');
  const path = require('node:path');
  const file = path.join(rawDir, 'brands', 'wikidata_by_label_raw.json');
  const enrichment = new Map();

  if (!fs.existsSync(file)) {
    log(`brands: source not present (${file}) - Wikidata enrichment skipped`);
    return enrichment;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    log(`brands: could not parse ${file} (${e.message}) - Wikidata enrichment skipped`);
    return enrichment;
  }

  const bindings = parsed?.results?.bindings || [];
  const bySearchLabel = new Map();
  for (const binding of bindings) {
    const label = binding.searchLabel?.value;
    if (!label) continue;
    if (!bySearchLabel.has(label)) bySearchLabel.set(label, []);
    bySearchLabel.get(label).push(binding);
  }

  for (const brand of SEED_BRANDS) {
    if (!brand.wikidataSearchLabel) continue;
    const candidates = bySearchLabel.get(brand.wikidataSearchLabel);
    if (!candidates || candidates.length === 0) continue;

    const foldedSearch = foldText(brand.wikidataSearchLabel);
    const confident = candidates.find((c) => foldText(c.itemLabel?.value || '') === foldedSearch);
    const chosen = confident || candidates[0];
    const qidUrl = chosen.item?.value || '';
    const qid = qidUrl.split('/').pop() || null;
    if (qid) {
      enrichment.set(brand.key, { qid, website: chosen.website?.value || null });
    }
  }

  log(`brands: Wikidata enrichment matched ${enrichment.size}/${SEED_BRANDS.length} seed brands`);
  return enrichment;
}

module.exports = {
  SEED_BRANDS,
  matchBrand,
  aliasTokenSetsFor,
  seedBrandsTable,
  loadWikidataEnrichment,
};

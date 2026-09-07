#!/usr/bin/env node
// build.mjs — applies dedupe.mjs's merge decisions to the classified
// records and writes the canonical pipeline outputs:
//   data/gyms/uk-gyms.v1.jsonl.gz — one row per canonical venue (GD-04)
//   data/gyms/brands.v1.json     — the seed brand table, Wikidata-enriched
//   data/gyms/ATTRIBUTION.md     — mandatory attribution strings
// Also runs the Companies House candidate-signal corroboration pass
// (GD-02): a candidate whose registered-address postcode unit matches an
// existing venue adds a corroborating source record to it; a
// premises-like candidate with no match goes to the review queue as a
// possible independent gym; anything else is dropped.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readJsonl, readJsonlGz, writeJsonlGz } = require('./lib/jsonl.js');
const { uuidv5 } = require('./lib/uuid.js');
const { tokenize } = require('./lib/fold.js');
const { outwardCode } = require('./lib/postcode.js');
const { seedBrandsTable, loadWikidataEnrichment, aliasTokenSetsFor, matchBrand } = require('./lib/brands.js');
const { sectorCode } = require('./lib/postcode.js');
const { gridCellKey } = require('./lib/geo.js');
const { composeBrandBranch } = require('./lib/names.js');
const { companyNameMatchesVenue } = require('./lib/chMatch.js');
const { isCompleteAcquisition, markOperatorUnconfirmed } = require('./lib/operatorCoverage.js');

const DEFAULT_RAW_DIR =
  '/tmp/claude-0/-home-user-ADPhysique/8a1da388-bf6f-50f3-8ac9-99853301c7d5/scratchpad/gyms/raw';
const RAW_DIR = process.env.RAW_DIR || process.argv[2] || DEFAULT_RAW_DIR;
const WORK_DIR = path.join(__dirname, '../../data/gyms/_work');
const DATA_DIR = path.join(__dirname, '../../data/gyms');

const CLASSIFIED_FILE = path.join(WORK_DIR, 'classified.v1.jsonl');
const MERGE_DECISIONS_FILE = path.join(DATA_DIR, 'merge-decisions.v1.jsonl.gz');
const PARENT_LINKS_FILE = path.join(WORK_DIR, 'parent-links.v1.jsonl');
const OUT_VENUES = path.join(DATA_DIR, 'uk-gyms.v1.jsonl.gz');
const OUT_VENUES_LEGACY_UNCOMPRESSED = path.join(DATA_DIR, 'uk-gyms.v1.jsonl');
const OUT_BRANDS = path.join(DATA_DIR, 'brands.v1.json');
const OUT_ATTRIBUTION = path.join(DATA_DIR, 'ATTRIBUTION.md');
const REVIEW_LIKELY_FILE = path.join(DATA_DIR, 'review-queue.v1.jsonl.gz');

// Source authority order for picking the "best" member of a cluster (its
// address/postcode become the venue's canonical fields, and its key seeds
// the venue's deterministic id). Lower = more authoritative. NOT used for
// display_name or brand_key any more — see DISPLAY_NAME_PRIORITY (GD-18)
// and BRAND_SOURCE_PRIORITY (GD-19) below, which deliberately rank Overture
// above Active Places for those two fields (mixed-case name, fresher brand
// signal) while this order still governs address/postcode/etc.
const SOURCE_PRIORITY = (source) => {
  if (source.startsWith('operator:')) return 0;
  if (source === 'active_places') return 1;
  if (source === 'active_places_ni') return 2;
  if (source === 'datamap_wales') return 3;
  if (source === 'overture') return 4;
  return 9;
};

// GD-18: "the display name prefers the freshest mixed-case source
// (operator feed, then Overture, then Active Places)" — Active Places (and
// NI/Wales, both similarly all-caps-prone government exports) rank behind
// Overture here specifically because Overture's names arrive already
// mixed-case, whereas SOURCE_PRIORITY above (used for address/postcode
// authority) ranks Active Places ahead of Overture for other reasons.
const DISPLAY_NAME_PRIORITY = (source) => {
  if (source.startsWith('operator:')) return 0;
  if (source === 'overture') return 1;
  if (source === 'active_places') return 2;
  if (source === 'active_places_ni') return 3;
  if (source === 'datamap_wales') return 4;
  return 9;
};

// GD-19: "The freshest brand-bearing source wins: operator feed, then
// Overture, then Active Places `operatorname`." Only these three sources
// are considered brand-bearing for this ranking (NI/Wales carry no brand
// signal of their own; Companies House is a candidate signal, never a
// brand source, per GD-02).
const BRAND_SOURCE_PRIORITY = (source) => {
  if (source.startsWith('operator:')) return 0;
  if (source === 'overture') return 1;
  if (source === 'active_places') return 2;
  return 9;
};

/**
 * GD-19 brand attribution: freshest brand-bearing source wins, with the
 * TruGym case handled explicitly — "A venue whose only brand signal is
 * Active Places `operatorname` and whose fresher source name carries a
 * different known brand or no brand drops the stale brand."
 * @param {object[]} members - cluster members, source-priority order irrelevant here
 * @returns {{key:string,name:string,kind:string}|null}
 */
function pickBrandForCluster(members) {
  const brandBearing = members.filter((m) => m.brand);
  if (brandBearing.length === 0) return null;

  const sorted = brandBearing.slice().sort((a, b) => BRAND_SOURCE_PRIORITY(a.source) - BRAND_SOURCE_PRIORITY(b.source));
  const chosen = sorted[0];

  const onlyApBrand = brandBearing.length === 1 && brandBearing[0].source === 'active_places';
  if (onlyApBrand) {
    const fresherMembers = members.filter((m) => BRAND_SOURCE_PRIORITY(m.source) < BRAND_SOURCE_PRIORITY('active_places') && m.name);
    for (const fm of fresherMembers) {
      const fmBrand = matchBrand(fm.name);
      if (!fmBrand || fmBrand.key !== chosen.brand.key) {
        return null; // stale Active Places operatorname dropped (the TruGym case)
      }
    }
  }
  return chosen.brand;
}

const OVERTURE_LICENCE_NOTE = {
  Overture: 'CDLA-Permissive-2.0',
  meta: 'CDLA-Permissive-2.0',
  Microsoft: 'CDLA-Permissive-2.0',
  Foursquare: 'Apache-2.0',
};

function log(msg) {
  console.log(`[build] ${msg}`);
}

function keyOf(rec) {
  return `${rec.source}:${rec.source_record_id}`;
}

function firstNonNull(members, field) {
  for (const m of members) {
    if (m[field] !== null && m[field] !== undefined && m[field] !== '') return m[field];
  }
  return null;
}

function pickCoord(members) {
  const bySource = members.find((m) => m.coord_source === 'source' && Number.isFinite(m.lat));
  if (bySource) return { lat: bySource.lat, lng: bySource.lng, coord_source: 'source' };
  const bySector = members.find((m) => m.coord_source === 'postcode_sector' && Number.isFinite(m.lat));
  if (bySector) return { lat: bySector.lat, lng: bySector.lng, coord_source: 'postcode_sector' };
  return { lat: null, lng: null, coord_source: 'none' };
}

function sourceRecordsFor(member) {
  // Overture rows can themselves conflate several upstream datasets
  // (Overture/meta/Foursquare/Microsoft), each with its own licence — GD-02
  // traceability: expand into one provenance entry per upstream dataset.
  if (member.source === 'overture' && Array.isArray(member.payload?.overture_sources) && member.payload.overture_sources.length > 0) {
    return member.payload.overture_sources.map((s) => ({
      source: 'overture',
      source_dataset: s.dataset,
      source_record_id: s.record_id || member.source_record_id,
      source_url: member.source_url,
      source_name: `Overture Maps Foundation — Places (via ${s.dataset || 'unknown'})`,
      licence: s.licence,
      source_status: member.source_status,
      retrieved_at: member.retrieved_at,
    }));
  }
  return [
    {
      source: member.source,
      source_dataset: null,
      source_record_id: member.source_record_id,
      source_url: member.source_url,
      source_name: member.source_name,
      licence: null,
      source_status: member.source_status,
      retrieved_at: member.retrieved_at,
    },
  ];
}

function buildVenueFromCluster(memberKeys, recordsByKey) {
  const members = memberKeys.map((k) => recordsByKey.get(k)).filter(Boolean);
  const sorted = members.slice().sort((a, b) => SOURCE_PRIORITY(a.source) - SOURCE_PRIORITY(b.source));
  const best = sorted[0];

  const brand = pickBrandForCluster(members); // GD-19
  const town = firstNonNull(sorted, 'town');
  const postcode = firstNonNull(sorted, 'postcode');
  const addressLine = firstNonNull(sorted, 'address_line');
  const coord = pickCoord(sorted);
  const facilityCount = sorted.reduce((max, m) => {
    const n = Number(m.facility_count);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  const distinctSources = new Set(members.map((m) => m.source));
  // Status is taken from the most status-authoritative member, NOT "any
  // member says open wins": Overture (and Companies House, and NI, which
  // track no closure signal) always report status='open' by construction,
  // so a naive "any open" rule would silently reopen a venue that Active
  // Places or an operator's own site explicitly reports closed (found in
  // a first pipeline run: 464 sites literally named "... (CLOSED)" in
  // Active Places, with an accurate facstatus-derived status='closed',
  // came out status='open' after merging with an Overture row). `sorted`
  // is already source-priority order, so the first member is authoritative
  // for status precisely when that source actually tracks closures.
  // active_places_ni is deliberately excluded: its adapter has no per-row
  // closure signal to draw on (Active Places NI carries no status column)
  // and hardcodes status='open', so it is no more authoritative than
  // Overture here.
  const STATUS_TRACKING_SOURCES = new Set(['active_places', 'datamap_wales']);
  const statusAuthority = sorted.find((m) => m.source.startsWith('operator:') || STATUS_TRACKING_SOURCES.has(m.source));
  const status = statusAuthority ? statusAuthority.status : sorted[0].status;

  // GD-18: display name prefers the freshest mixed-case source (operator
  // feed, then Overture, then Active Places); a branded venue is composed
  // as brand + branch when that source's own name is bare. Falls back to
  // brand + town (the original composition) when no member in
  // DISPLAY_NAME_PRIORITY order has a usable name at all.
  //
  // GD-25: a member's own name can itself already be a normalise.mjs
  // brand+town fallback (name_source === 'fallback', its real source name
  // having been rejected as insane) — the display name skips that member
  // whenever a saner, non-fallback name exists ANYWHERE in the cluster,
  // even one that DISPLAY_NAME_PRIORITY would otherwise rank behind it,
  // and only uses the fallback name when it's genuinely all the cluster
  // has.
  const namedMembers = members.filter((m) => m.name);
  const nonFallbackNamedMembers = namedMembers.filter((m) => m.name_source !== 'fallback');
  const nameSourceMember = (nonFallbackNamedMembers.length > 0 ? nonFallbackNamedMembers : namedMembers).sort(
    (a, b) => DISPLAY_NAME_PRIORITY(a.source) - DISPLAY_NAME_PRIORITY(b.source),
  )[0];
  const nameSourceName = nameSourceMember ? nameSourceMember.name : null;
  const brandAliasTokenSets = brand ? aliasTokenSetsFor(brand.key) : [];
  // GD-26: a BARE brand name (nameSourceName folds exactly equal to the
  // brand or one of its aliases, e.g. Active Places/Overture naming a
  // venue just "Fitness First") is composed as brand + town, not left
  // bare — composeBrandBranch's own bare-name check does this; `town` is
  // passed through for that case only.
  const displayName = brand
    ? composeBrandBranch(nameSourceName || town, brand.name, brandAliasTokenSets, town)
    : nameSourceName || best.name;

  const nameTokens = tokenize(displayName);
  const brandAliasTokens = brandAliasTokenSets.flat();
  const sector = firstNonNull(sorted, 'sector') || (postcode ? sectorCode(postcode) : null);
  const areaSource = postcode ? 'postcode' : firstNonNull(sorted, 'area_source');
  const outward = postcode ? outwardCode(postcode) : sector ? sector.split(' ')[0] : null;
  const tokens = Array.from(new Set([...nameTokens, ...brandAliasTokens, ...(outward ? [tokenize(outward)].flat() : [])]));

  const id = uuidv5(keyOf(best));

  const sourceRecords = [];
  for (const m of sorted) sourceRecords.push(...sourceRecordsFor(m));

  return {
    id,
    display_name: displayName,
    name: best.name,
    brand_key: brand ? brand.key : null,
    brand_name: brand ? brand.name : null,
    venue_type: best.venue_type,
    status,
    address_line: addressLine,
    town,
    town_key: town ? tokenize(town).join('_') : null,
    local_authority_code: firstNonNull(sorted, 'local_authority_code'),
    local_authority_name: firstNonNull(sorted, 'local_authority_name'),
    region_code: firstNonNull(sorted, 'region_code'),
    region_name: firstNonNull(sorted, 'region_name'),
    country: firstNonNull(sorted, 'country'),
    postcode,
    outward,
    sector,
    area_source: areaSource, // GD-21: 'postcode' | 'nearest_sector' | null
    lat: coord.lat,
    lng: coord.lng,
    coord_source: coord.coord_source,
    geocell: Number.isFinite(coord.lat) && Number.isFinite(coord.lng) ? gridCellKey(coord.lat, coord.lng) : null,
    website: firstNonNull(sorted, 'website'),
    phone: firstNonNull(sorted, 'phone'),
    facility_count: facilityCount || null,
    parent_venue_id: null,
    succeeded_by: null,
    verification_status: distinctSources.size > 1 ? 'multi_source' : 'single_source',
    // GD-26: overwritten to 'operator_unconfirmed' below, after the
    // Companies House pass, for a venue whose brand's operator feed was
    // acquired complete but which has no member from that feed.
    needs_review_reason: null,
    source_count: distinctSources.size,
    low_confidence: members.some((m) => m.low_confidence === true),
    tokens,
    member_keys: memberKeys,
    source_records: sourceRecords,
    first_seen: new Date().toISOString(),
    last_verified: new Date().toISOString(),
    closed_at: status === 'closed' ? new Date().toISOString() : null,
  };
}

// GD-20: "Attach a company only when the postcode unit matches AND the
// folded company name ... shares at least two tokens or reaches Jaccard
// 0.5 with the venue name. Otherwise nothing is attached and the row stays
// single_source." Tightened from postcode-unit-alone, which let a golf
// club "corroborate" a yoga studio at the same postcode unit in the first
// pipeline run (inflating multi_source without any real evidence).
function corroborateWithCompaniesHouse(venues, chRecords) {
  const byPostcodeUnit = new Map();
  for (const v of venues) {
    if (!v.postcode) continue;
    if (!byPostcodeUnit.has(v.postcode)) byPostcodeUnit.set(v.postcode, []);
    byPostcodeUnit.get(v.postcode).push(v);
  }

  let corroborated = 0;
  let reviewAdded = 0;
  let dropped = 0;
  let rejectedNameMismatch = 0;
  const reviewEntries = [];

  for (const ch of chRecords) {
    const postcodeCandidates = ch.postcode ? byPostcodeUnit.get(ch.postcode) : null;
    const matches = (postcodeCandidates || []).filter(
      (v) => companyNameMatchesVenue(ch.name, v.name || v.display_name || '').matches,
    );

    if (matches.length > 0) {
      for (const v of matches) {
        v.source_records.push({
          source: 'companies_house',
          source_dataset: null,
          source_record_id: ch.source_record_id,
          source_url: ch.source_url,
          source_name: `Companies House (corroborating: ${ch.name})`,
          licence: null,
          source_status: 'open',
          retrieved_at: ch.retrieved_at,
        });
        v.source_count = new Set(v.source_records.map((s) => s.source)).size;
        v.verification_status = v.source_count > 1 ? 'multi_source' : 'single_source';
      }
      corroborated += 1;
      continue;
    }

    if (postcodeCandidates && postcodeCandidates.length > 0) {
      // Postcode unit matched but no candidate's name was similar enough
      // (the golf-club-vs-yoga-studio case) — GD-20: nothing is attached.
      rejectedNameMismatch += 1;
    }

    if (ch.premises_like) {
      reviewAdded += 1;
      reviewEntries.push({
        kind: 'possible_independent_gym',
        company_name: ch.name,
        company_number: ch.payload?.company_number || null,
        address_line: ch.address_line,
        town: ch.town,
        postcode: ch.postcode,
        source_url: ch.source_url,
        reason: 'companies_house_premises_like_no_venue_match',
      });
    } else {
      dropped += 1;
    }
  }

  return { corroborated, reviewAdded, dropped, rejectedNameMismatch, reviewEntries };
}

// GD-26 point 3: read every operators/<slug>/manifest.json under the raw
// dir (each records found/fetched/failures — docs/gym-database-2026-09-06/
// 08-acquisition-operators.md) and resolve the complete ones (found > 0,
// at most 3 failures) to a seed brand key, the same slug->brand resolution
// transforms.js's transformOperatorBranch and audit.mjs's operator
// comparison already use. The pure completeness/marking logic lives in
// lib/operatorCoverage.js; this is the one piece of I/O it needs.
function loadCompleteOperatorSlugByBrand(rawDir, log) {
  const map = new Map();
  const opsDir = path.join(rawDir, 'operators');
  if (!fs.existsSync(opsDir)) return map;
  const slugs = fs
    .readdirSync(opsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const slug of slugs) {
    const manifestPath = path.join(opsDir, slug, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      log(`GD-26: could not parse ${manifestPath} (${e.message}) - skipped for operator-feed coverage`);
      continue;
    }
    if (!isCompleteAcquisition(manifest)) continue;
    const resolvedBrand = matchBrand(slug.replace(/-/g, ' '));
    if (!resolvedBrand) {
      log(`GD-26: operator manifest ${slug} has no matching seed brand - skipped for operator-feed coverage`);
      continue;
    }
    map.set(resolvedBrand.key, slug);
  }
  return map;
}

async function loadCompaniesHouseRecords() {
  const mod = await import('./sources/companies-house.mjs');
  const out = [];
  for await (const rec of mod.readRecords(RAW_DIR, log)) out.push(rec);
  return out;
}

async function run() {
  const classified = readJsonl(CLASSIFIED_FILE);
  const recordsByKey = new Map(classified.map((r) => [keyOf(r), r]));
  const clusters = readJsonlGz(MERGE_DECISIONS_FILE);
  const parentLinks = readJsonl(PARENT_LINKS_FILE);

  const venues = clusters.map((c) => buildVenueFromCluster(c.member_keys, recordsByKey));
  log(`built ${venues.length} canonical venues from ${clusters.length} clusters`);

  // Resolve parent/child links (different-brand, identical-address pairs).
  const venueByMemberKey = new Map();
  for (const v of venues) for (const k of v.member_keys) venueByMemberKey.set(k, v);

  let parentLinksApplied = 0;
  for (const link of parentLinks) {
    const parent = venueByMemberKey.get(link.parent_key);
    const child = venueByMemberKey.get(link.child_key);
    if (parent && child && parent.id !== child.id && !child.parent_venue_id) {
      child.parent_venue_id = parent.id;
      parentLinksApplied += 1;
    }
  }
  log(`${parentLinksApplied}/${parentLinks.length} parent/child links applied`);

  // GD-20: multi_source count before AND after the (now tightened)
  // Companies House corroboration pass, so the effect of the tightening is
  // directly visible in the log.
  const multiSourceBefore = venues.filter((v) => v.source_count > 1).length;

  // Companies House corroboration pass (GD-02 candidate signal).
  const chRecords = await loadCompaniesHouseRecords();
  const { corroborated, reviewAdded, dropped, rejectedNameMismatch, reviewEntries } = corroborateWithCompaniesHouse(
    venues,
    chRecords,
  );
  const multiSourceAfter = venues.filter((v) => v.source_count > 1).length;
  log(
    `companies-house corroboration: ${chRecords.length} candidates -> ${corroborated} corroborated an existing venue, ` +
      `${rejectedNameMismatch} rejected (postcode unit matched but name similarity did not, GD-20), ` +
      `${reviewAdded} premises-like added to review queue, ${dropped} dropped (registered-office-only, no match)`,
  );
  log(`GD-20 multi_source count: ${multiSourceBefore} before corroboration -> ${multiSourceAfter} after`);

  // GD-26 point 3: a venue carrying a brand whose operator feed was
  // acquired complete but which has no member from that operator's own
  // feed is marked operator_unconfirmed (overwriting multi_source/
  // single_source) with needs_review_reason = 'not_in_operator_feed'.
  // Runs against `venues` (still carries member_keys) before the GD-21
  // filter below, which only ever drops rows, not mutates them.
  const completeOperatorSlugByBrand = loadCompleteOperatorSlugByBrand(RAW_DIR, log);
  const { total: operatorUnconfirmedTotal, bySlug: operatorUnconfirmedBySlug } = markOperatorUnconfirmed(
    venues,
    completeOperatorSlugByBrand,
  );
  log(
    `GD-26: ${completeOperatorSlugByBrand.size} operator(s) with a complete feed acquisition; ` +
      `${operatorUnconfirmedTotal} venue(s) marked operator_unconfirmed (not in operator feed) -> ${JSON.stringify(operatorUnconfirmedBySlug)}`,
  );

  // Idempotent: this pass fully regenerates its own review-queue entries
  // each run, so drop any it previously added before appending fresh ones
  // (kind: 'possible_independent_gym') rather than accumulating duplicates
  // on every re-run — dedupe.mjs's 'possible_duplicate' entries (GD-23
  // 'likely' tier, same file) are untouched.
  {
    const existing = readJsonlGz(REVIEW_LIKELY_FILE).filter((r) => r.kind !== 'possible_independent_gym');
    writeJsonlGz(REVIEW_LIKELY_FILE, [...existing, ...reviewEntries]);
    log(
      `review queue (likely): kept ${existing.length} non-companies-house entries, added ${reviewEntries.length} ` +
        `companies-house entries -> ${REVIEW_LIKELY_FILE}`,
    );
  }

  // GD-21: "A row with neither coordinates nor postcode is dropped unless
  // multi-source, in which case it is kept `low_confidence`." Applied here
  // at the canonical-venue (post-dedupe) level, after the Companies House
  // pass (which can only ever add a postcode-bearing source, so ordering
  // doesn't affect which venues qualify).
  let droppedNoLocation = 0;
  let keptLowConfidenceNoLocation = 0;
  const locatedVenues = venues.filter((v) => {
    const hasLocation = Number.isFinite(v.lat) && Number.isFinite(v.lng) || Boolean(v.postcode) || Boolean(v.sector);
    if (hasLocation) return true;
    if (v.source_count > 1) {
      v.low_confidence = true;
      keptLowConfidenceNoLocation += 1;
      return true;
    }
    droppedNoLocation += 1;
    return false;
  });
  log(
    `GD-21: ${droppedNoLocation} single-source rows with neither coordinates nor postcode/sector dropped, ` +
      `${keptLowConfidenceNoLocation} multi-source rows in the same state kept as low_confidence`,
  );

  // Strip internal bookkeeping field before writing the canonical file.
  const finalVenues = locatedVenues.map(({ member_keys, ...rest }) => rest);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeJsonlGz(OUT_VENUES, finalVenues);
  if (fs.existsSync(OUT_VENUES_LEGACY_UNCOMPRESSED)) fs.rmSync(OUT_VENUES_LEGACY_UNCOMPRESSED); // GD-24: gzip only
  log(`wrote ${finalVenues.length} venues -> ${OUT_VENUES}`);

  // Brands table, Wikidata-enriched when raw/brands/wikidata_by_label_raw.json is present.
  const enrichment = loadWikidataEnrichment(RAW_DIR, log);
  const brandsTable = seedBrandsTable(enrichment);
  fs.writeFileSync(OUT_BRANDS, `${JSON.stringify(brandsTable, null, 2)}\n`);
  log(`wrote ${brandsTable.length} brands -> ${OUT_BRANDS}`);

  // Attribution.
  const attribution = `# Gym directory — attribution

Generated by \`scripts/gyms/build.mjs\`. This file lists the mandatory
attribution strings for every source carried into \`uk-gyms.v1.jsonl.gz\`.

## Sport England — Active Places Power
Licence: CC BY 4.0.
Attribution (mandatory): **Contains Data © Sport England**

## Sport Northern Ireland — Active Places NI
Licence: Open Government Licence v3.0.
Attribution: Sport Northern Ireland, under the OGL
(https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

## Welsh Government — DataMapWales (Leisure Centres)
Licence: Open Government Licence v3.0.
Attribution: Welsh Government / DataMapWales, under the OGL
(https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

## ONS Postcode Directory (ONSPD)
Licence: Open Government Licence.
Attribution: Contains OS data © Crown copyright and database right;
Contains Royal Mail data © Royal Mail copyright and database right;
Contains National Statistics data © Crown copyright and database right.
[PLACEHOLDER — confirm exact ONSPD attribution wording against the release
in use once the founder-facing cloud migration is prepared.]

## Companies House
Free Company Data Product. Companies House: "We impose no rules or
requirements on how the information on the public register is used."
General gov.uk terms: Open Government Licence v3.0, © Crown copyright.
Used as a candidate signal only (GD-02) — never as a canonical venue on
its own.

## Overture Maps Foundation — Places
Licence: CDLA-Permissive-2.0 (Overture, meta- and Microsoft-sourced rows),
Apache-2.0 (Foursquare-sourced rows conflated into the same place). Each
canonical venue's \`source_records\` carries the licence for every
upstream dataset it drew from.

## VOA rating list — NOT USED (GD-16)
The VOA compiled rating list is excluded on licence grounds: its download
terms state "An open government licence does not apply" and confine use
to non-domestic rating purposes. No VOA field appears anywhere in this
pipeline or its output.

## Wikidata
Licence: CC0. Used only to enrich \`brands.v1.json\` with a QID/website
when a confident label match exists in
\`raw/brands/wikidata_by_label_raw.json\`.

## Google Places
Runtime only — never stored, never part of this file's data.

## Not yet acquired (stub adapters, no-op)
Foursquare Open Source Places (direct extract) — \`raw/foursquare/\` is
empty; wire \`sources/foursquare.mjs\` in once it lands.
`;
  fs.writeFileSync(OUT_ATTRIBUTION, attribution);
  log(`wrote ${OUT_ATTRIBUTION}`);
}

run().catch((e) => {
  console.error('[build] FATAL', e);
  process.exit(1);
});

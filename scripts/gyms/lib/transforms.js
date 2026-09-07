// Pure "one source row -> one common record (or null)" transforms, kept
// separate from each source adapter's file-reading/streaming/joining code
// so they are directly unit-testable under Jest (which cannot dynamic-
// import real ESM .mjs modules in this repo's config). Each adapter in
// scripts/gyms/sources/*.mjs is a thin I/O wrapper that calls the matching
// function here per row/line.

const { matchBrand } = require('./brands');
const { foldText } = require('./fold');
const { cleanDisplayName, composeBrandBranch, buildExceptionsMap, brandCasingExceptions } = require('./names');
const { SEED_BRANDS } = require('./brands');

// Built once: brand-casing exceptions (PureGym, not Puregym) layered over
// GD-18's fixed exceptions list (YMCA, JD, DW, LA, F45, UK, PT).
const NAME_EXCEPTIONS_MAP = buildExceptionsMap(brandCasingExceptions(SEED_BRANDS));

function safeText(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

// --- England: Active Places (site + health-and-fitness facility join) --
function transformActivePlacesSite(site, facilities) {
  if (!facilities || facilities.length === 0) return null;

  const anyOperational = facilities.some((f) => (f.facstatus || '').toLowerCase() === 'operational');
  const maxStations = facilities.reduce((max, f) => {
    const n = Number(f.stations);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const operatorName = safeText(site.operatorname) || safeText(facilities.find((f) => f.operatorname)?.operatorname);
  const telephone = safeText(site.telnumber);
  const addressParts = [site.subbuildingname, site.buildingname, site.buildingnumber, site.thoroughfarename]
    .map(safeText)
    .filter(Boolean);
  const addressLine = addressParts.length ? addressParts.join(', ') : null;

  return {
    source: 'active_places',
    source_record_id: String(site.siteid),
    source_url: null,
    source_name: 'Sport England Active Places Power',
    source_status: anyOperational ? 'open' : 'closed',
    source_updated_at: Number.isFinite(site.reclastchkddate) ? site.reclastchkddate : null,
    retrieved_at: new Date().toISOString(),
    name: safeText(site.sitename) || safeText(site.sitealias),
    brand_guess: operatorName,
    address_line: addressLine,
    town: safeText(site.posttown),
    postcode: safeText(site.postcode),
    lat: Number.isFinite(site.lat) ? site.lat : null,
    lng: Number.isFinite(site.long) ? site.long : null,
    coord_source: Number.isFinite(site.lat) && Number.isFinite(site.long) ? 'source' : 'none',
    phone: telephone && telephone !== '00000000000' ? telephone : null,
    website: safeText(site.website),
    facility_count: facilities.length,
    status: anyOperational ? 'open' : 'closed',
    hasAddress: Boolean(addressLine || safeText(site.postcode)),
    activePlaces: {
      facilitytype: facilities[0]?.facilitytype || null,
      accessibilitytypestr: facilities[0]?.accessibilitytypestr || null,
      accessibilitygroupstr: facilities[0]?.accessibilitygroupstr || null,
      managementtypestr: site.managementtypestr || facilities[0]?.managementtypestr || null,
      managementgroupstr: site.managementgroupstr || facilities[0]?.managementgroupstr || null,
      ownertypestr: site.ownertypestr || null,
      educationphase: site.educationphase ?? null,
      operatorname: operatorName,
      stations: maxStations || null,
    },
    payload: {
      siteid: site.siteid,
      localauthorityname: site.localauthorityname,
      localauthoritycode: site.localauthoritycode,
      regionname: site.regionname,
      regioncode: site.regioncode,
      facility_ids: facilities.map((f) => f.facilityid),
    },
  };
}

// --- Northern Ireland: Active Places NI ---------------------------------
function truthyYes(v) {
  return (v || '').trim().toLowerCase() === 'yes';
}

function transformNiRow(row) {
  if (!truthyYes(row.FITNESS)) return null;

  const name = safeText(row.VENUE_NAME);
  const postcode = safeText(row.POST_CODE);
  const recordId = `${foldText(name || '')}|${postcode || foldText(row.ADDRESS_LINE_1 || '')}`;

  return {
    source: 'active_places_ni',
    source_record_id: recordId,
    source_url: null,
    source_name: 'Active Places NI (Sport NI)',
    source_status: 'open',
    source_updated_at: null,
    retrieved_at: new Date().toISOString(),
    name,
    brand_guess: null,
    address_line: safeText(row.ADDRESS_LINE_1),
    town: safeText(row.POST_TOWN),
    postcode,
    lat: null, // filled by the .mjs adapter (Irish Grid conversion needs easting/northing)
    lng: null,
    coord_source: 'none',
    phone: safeText(row.TELEPHONE),
    website: null,
    facility_count: null,
    status: 'open',
    hasAddress: Boolean(safeText(row.ADDRESS_LINE_1) || postcode),
    ni: {
      ownershipType: safeText(row.OWNERSHIP_TYPE),
      fitnessFlag: true,
      boxingFlag: truthyYes(row.BOXING),
    },
    payload: { county: row.COUNTY, district: row.NEW_DISTRICT_COUNCIL, easting: row.EASTING, northing: row.NORTHING },
  };
}

// --- Wales: DataMapWales -------------------------------------------------
function transformWalesFeature(feature) {
  const props = feature.properties || {};
  const name = safeText(props.name);
  if (!name) return null;
  const postcode = safeText(props.postcode);

  return {
    source: 'datamap_wales',
    source_record_id: props.uprn !== undefined && props.uprn !== null ? String(props.uprn) : feature.id,
    source_url: null,
    source_name: 'DataMapWales — Leisure Centres',
    source_status: safeText(props.status) === 'Closed' ? 'closed' : 'open',
    source_updated_at: null,
    retrieved_at: new Date().toISOString(),
    name,
    brand_guess: safeText(props.org),
    address_line: safeText(props.street),
    town: safeText(props.town),
    postcode,
    lat: null, // filled by the .mjs adapter (OSGB36 conversion needs easting/northing)
    lng: null,
    coord_source: 'none',
    phone: null,
    website: null,
    facility_count: safeText(props.no_units) ? Number(props.no_units) || null : null,
    status: safeText(props.status) === 'Closed' ? 'closed' : 'open',
    hasAddress: Boolean(safeText(props.street) || postcode),
    wales: {
      type: safeText(props.type),
      subtype: safeText(props.subtype),
      access: safeText(props.access),
      org: safeText(props.org),
      status: safeText(props.status),
    },
    payload: { uprn: props.uprn, built: props.built },
  };
}

// --- Operator branch pages ----------------------------------------------
// GD-22: "Operator branch names are composed brand plus branch at
// normalisation" — an operator branch page's own name is often bare (just
// the town, or town + a generic word like "Gym") with no brand mention at
// all, so it is cleaned (GD-18: entities/status-suffix/all-caps/bracket)
// and then composed with the resolved brand right here, before the record
// ever reaches dedupe/build — this is what lets e.g. PureGym's operator
// feed name-match an Overture row that already carries "PureGym".
function transformOperatorBranch(branch, slug, idx) {
  const rawName = safeText(branch.name);
  if (!rawName) return null;

  const brand = matchBrand(rawName) || matchBrand(slug.replace(/-/g, ' '));
  const { name: cleaned } = cleanDisplayName(rawName, { exceptionsMap: NAME_EXCEPTIONS_MAP });
  const name = brand ? composeBrandBranch(cleaned, brand.name) : cleaned;
  const status = branch.status === 'coming_soon' ? 'pending' : branch.status === 'closed' ? 'closed' : 'open';

  return {
    source: `operator:${slug}`,
    source_record_id: branch.source_url || `${slug}:${idx}`,
    source_url: branch.source_url || null,
    source_name: `Operator branch page (${slug})`,
    source_status: status,
    source_updated_at: null,
    retrieved_at: branch.retrieved_at || new Date().toISOString(),
    name,
    brand_guess: brand ? brand.name : slug,
    brand,
    address_line: safeText(branch.street_address),
    town: safeText(branch.town),
    postcode: safeText(branch.postcode),
    lat: branch.coords && Number.isFinite(branch.coords.lat) ? branch.coords.lat : null,
    lng: branch.coords && Number.isFinite(branch.coords.lng) ? branch.coords.lng : null,
    coord_source: branch.coords ? 'source' : 'none',
    phone: safeText(branch.phone),
    website: branch.source_url || null,
    facility_count: null,
    status,
    hasAddress: Boolean(safeText(branch.street_address) || safeText(branch.postcode)),
    payload: { operator: slug, hours_24: Boolean(branch.hours_24) },
  };
}

// --- Overture -------------------------------------------------------------
const CATEGORY_VENUE_TYPE_HINT = {
  gym: null,
  martial_arts_club: 'martial_arts',
  boxing_gym: 'martial_arts',
  boxing_class: 'martial_arts',
  kickboxing_club: 'martial_arts',
  chinese_martial_arts_club: 'martial_arts',
  yoga_studio: 'other_fitness',
  pilates_studio: 'other_fitness',
  gymnastics_center: 'other_fitness',
  gymnastics_club: 'other_fitness',
  rock_climbing_gym: 'other_fitness',
  aerial_fitness_center: 'other_fitness',
  fitness_trainer: 'excluded',
  fitness_exercise_equipment: 'excluded',
  fitness_equipment_wholesaler: 'excluded',
};

const OVERTURE_LICENCE_BY_DATASET = {
  Overture: 'CDLA-Permissive-2.0',
  meta: 'CDLA-Permissive-2.0',
  Microsoft: 'CDLA-Permissive-2.0',
  Foursquare: 'Apache-2.0',
};

// @returns {object|null|'excluded_country'|'excluded_category'} — the
// adapter distinguishes these for its own counters; tests just check shape.
function transformOvertureRow(row, isInGb) {
  if (!isInGb) return null;

  const category = row.categories?.primary || null;
  const hint = Object.prototype.hasOwnProperty.call(CATEGORY_VENUE_TYPE_HINT, category)
    ? CATEGORY_VENUE_TYPE_HINT[category]
    : null;
  if (hint === 'excluded') return null;

  const name = safeText(row.name_primary);
  if (!name) return null;

  let brandNameGuess = safeText(row.brand?.names?.primary);
  if (brandNameGuess && foldText(brandNameGuess).includes('puregym')) {
    brandNameGuess = 'PureGym';
  }

  const address = Array.isArray(row.addresses) && row.addresses.length > 0 ? row.addresses[0] : null;
  const confidence = typeof row.confidence === 'number' ? row.confidence : null;
  const overtureSources = Array.isArray(row.sources)
    ? row.sources.map((s) => ({
        dataset: s.dataset || null,
        record_id: s.record_id || null,
        licence: OVERTURE_LICENCE_BY_DATASET[s.dataset] || null,
      }))
    : [];

  return {
    source: 'overture',
    source_record_id: row.id,
    source_url: Array.isArray(row.websites) && row.websites.length > 0 ? row.websites[0] : null,
    source_name: 'Overture Maps Foundation — Places',
    source_status: 'open',
    source_updated_at: null,
    retrieved_at: new Date().toISOString(),
    name,
    brand_guess: brandNameGuess,
    venue_type_hint: hint,
    address_line: safeText(address?.freeform),
    town: safeText(address?.locality),
    postcode: safeText(address?.postcode),
    lat: Number.isFinite(row.lat) ? row.lat : null,
    lng: Number.isFinite(row.lng) ? row.lng : null,
    coord_source: Number.isFinite(row.lat) && Number.isFinite(row.lng) ? 'source' : 'none',
    phone: Array.isArray(row.phones) && row.phones.length > 0 ? row.phones[0] : null,
    website: Array.isArray(row.websites) && row.websites.length > 0 ? row.websites[0] : null,
    facility_count: null,
    status: 'open',
    hasAddress: Boolean(safeText(address?.freeform) || safeText(address?.postcode) || safeText(address?.locality)),
    low_confidence: confidence !== null && confidence < 0.3,
    payload: {
      overture_category: category,
      overture_alternate_categories: row.categories?.alternate || null,
      overture_wikidata: row.brand?.wikidata || null,
      confidence,
      overture_sources: overtureSources,
    },
  };
}

// --- Companies House (candidate signal only) ----------------------------
const PREMISES_LIKE_RE = /\b(GYM|FITNESS|LEISURE|UNIT|INDUSTRIAL|ESTATE|RETAIL|BUSINESS PARK)\b/i;

function transformCompaniesHouseRow(row) {
  if (safeText(row.CompanyStatus)?.toLowerCase() !== 'active') return null;

  const addressLine1 = safeText(row['RegAddress.AddressLine1']);
  const addressLine2 = safeText(row['RegAddress.AddressLine2']);
  const careOf = safeText(row['RegAddress.CareOf']);
  const haystack = [careOf, addressLine1, addressLine2].filter(Boolean).join(' ').toUpperCase();
  const premisesLikeFlag = PREMISES_LIKE_RE.test(haystack);

  return {
    source: 'companies_house',
    source_record_id: safeText(row.CompanyNumber),
    source_url: row.CompanyNumber
      ? `https://find-and-update.company-information.service.gov.uk/company/${row.CompanyNumber}`
      : null,
    source_name: 'Companies House Free Company Data Product',
    source_status: 'open',
    source_updated_at: null,
    retrieved_at: new Date().toISOString(),
    name: safeText(row.CompanyName),
    brand_guess: null,
    venue_type_hint: 'candidate',
    address_line: [addressLine1, addressLine2].filter(Boolean).join(', ') || null,
    town: safeText(row['RegAddress.PostTown']),
    postcode: safeText(row['RegAddress.PostCode']),
    lat: null,
    lng: null,
    coord_source: 'none',
    phone: null,
    website: null,
    facility_count: null,
    status: 'open',
    hasAddress: Boolean(addressLine1 || safeText(row['RegAddress.PostCode'])),
    premises_like: premisesLikeFlag,
    payload: {
      company_number: row.CompanyNumber,
      incorporation_date: row.IncorporationDate,
      sic_codes: [
        row['SICCode.SicText_1'],
        row['SICCode.SicText_2'],
        row['SICCode.SicText_3'],
        row['SICCode.SicText_4'],
      ].filter(Boolean),
    },
  };
}

module.exports = {
  transformActivePlacesSite,
  transformNiRow,
  transformWalesFeature,
  transformOperatorBranch,
  transformOvertureRow,
  transformCompaniesHouseRow,
  CATEGORY_VENUE_TYPE_HINT,
  PREMISES_LIKE_RE,
};

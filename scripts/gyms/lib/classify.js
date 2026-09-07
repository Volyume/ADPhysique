// GD-03 classification rule: venue_type is assigned by source evidence in
// priority order — operator brand type > VOA description (EXCLUDED, see
// below) > Active Places facility/ownership > NI ownership/flags > name
// tokens (last resort). Pure, no I/O.
//
// GD-16 (2026-09-07): the VOA rating list is excluded from this pipeline on
// licence grounds and its extract was deleted; no VOA field ever reaches
// this function. The VOA priority slot in GD-03's stated order is therefore
// permanently unreachable here — kept only as a documented no-op so a
// future VOA-shaped input can never silently be wired back in without
// updating this comment and GD-16 first.

const { tokenize } = require('./fold');

const VENUE_TYPES = [
  'commercial_gym',
  'independent_gym',
  'health_club',
  'leisure_centre',
  'strength_gym',
  'crossfit_functional',
  'womens_gym',
  'boutique_studio',
  'university_gym',
  'hotel_gym',
  'martial_arts',
  'other_fitness',
  'excluded',
];

function lower(v) {
  return (v || '').toString().trim().toLowerCase();
}

function includesAny(haystack, needles) {
  const h = lower(haystack);
  return needles.some((n) => h.includes(n));
}

/**
 * @param {object} record
 * @param {string} record.name - raw venue/company name
 * @param {{key:string,name:string,kind:string}|null} [record.brand] - resolved brand, if any
 * @param {boolean} [record.hasAddress] - false for records with no usable address (GD-03 excluded)
 * @param {string} record.source - 'active_places' | 'active_places_ni' | 'datamap_wales' | 'companies_house' | 'operator:<slug>'
 * @param {object} [record.activePlaces] - { facilitytype, accessibilitytypestr, accessibilitygroupstr, managementtypestr, managementgroupstr, ownertypestr, educationphase, operatorname }
 * @param {object} [record.ni] - { ownershipType, fitnessFlag, boxingFlag }
 * @param {object} [record.wales] - { type, subtype, access, org, status }
 * @returns {{ venue_type: string, reason: string }}
 */
function classify(record) {
  const name = record?.name || '';
  const tokens = tokenize(name);

  if (record?.hasAddress === false) {
    return { venue_type: 'excluded', reason: 'no_address' };
  }

  // 1. Operator brand type (chain table) — highest priority.
  if (record?.brand?.kind && VENUE_TYPES.includes(record.brand.kind)) {
    return { venue_type: record.brand.kind, reason: `brand:${record.brand.key}` };
  }

  // 2. VOA description or special category — EXCLUDED by GD-16, never reached.

  // 3. Active Places facility and ownership.
  if (record?.source === 'active_places' && record.activePlaces) {
    const ap = record.activePlaces;
    // NOTE: `educationphase` is NOT used here. It looked like a plausible
    // "is this a school" signal (every site carries a numeric 1-9 value),
    // but checking it against the actual raw data disproved that: of the
    // England HF sites in this run, 6,748/10,592 carry educationphase=8,
    // while only 2,682 are flagged as education by ownertypestr/
    // managementgroupstr text, and just 571 rows satisfy both — i.e.
    // educationphase=8 (the single most common value) does not correlate
    // with genuinely education-owned sites. No coded-value domain for this
    // field was found in docs/gym-database-2026-09-06/01 either. Treating
    // it as an education flag would have wrongly excluded ~78% of England's
    // health-and-fitness sites (a first pipeline run did exactly this).
    // ownertypestr/managementgroupstr are plain text and say "Education"
    // directly when it's true, so only those are used.
    const isEducation =
      includesAny(ap.ownertypestr, ['education', 'school']) || includesAny(ap.managementgroupstr, ['education']);
    if (isEducation) {
      return { venue_type: 'excluded', reason: 'active_places_school_site' };
    }

    if (includesAny(ap.managementgroupstr, ['commercial'])) {
      return { venue_type: 'commercial_gym', reason: 'active_places_commercial_management' };
    }

    const isPublicAccess = includesAny(ap.accessibilitygroupstr, ['public access']);
    const isPublicManagement = includesAny(ap.managementgroupstr, [
      'local authority',
      'council',
      'trust',
      'community',
      'others',
    ]);
    if (isPublicAccess && isPublicManagement) {
      return { venue_type: 'leisure_centre', reason: 'active_places_public_leisure' };
    }

    if (includesAny(ap.ownertypestr, ['sports club', 'club'])) {
      return { venue_type: 'independent_gym', reason: 'active_places_sports_club' };
    }

    // Fall through to name tokens rather than guessing.
  }

  // 4. NI ownership and flags.
  if (record?.source === 'active_places_ni' && record.ni) {
    const ni = record.ni;
    if (lower(ni.ownershipType) === 'education') {
      return { venue_type: 'excluded', reason: 'ni_school_site' };
    }
    if (ni.boxingFlag === true && ni.fitnessFlag !== true) {
      return { venue_type: 'martial_arts', reason: 'ni_boxing_flag' };
    }
    if (ni.fitnessFlag === true) {
      const ownership = lower(ni.ownershipType);
      if (ownership === 'district council' || ownership === 'community') {
        return { venue_type: 'leisure_centre', reason: 'ni_public_ownership' };
      }
      if (ownership === 'private' || ownership === 'club') {
        return { venue_type: 'independent_gym', reason: 'ni_private_or_club_ownership' };
      }
      // Fall through to name tokens for "Other" / blank ownership.
    } else {
      return { venue_type: 'excluded', reason: 'ni_no_fitness_flag' };
    }
  }

  // 5. Wales (DataMapWales) — a distinct category not enumerated in GD-03's
  // priority list, so it slots in here as its own source-evidence step,
  // ahead of the last-resort name-token fallback.
  if (record?.source === 'datamap_wales' && record.wales) {
    if (lower(record.wales.status) === 'closed') {
      // Still classify it (status is tracked separately as GD-07 history);
      // DataMapWales leisure centres are public facilities by construction.
    }
    if (includesAny(record.wales.type, ['health and fitness'])) {
      return { venue_type: 'leisure_centre', reason: 'wales_leisure_centre' };
    }
  }

  // 6. Companies House is a candidate signal only (GD-02): it carries no
  // facility evidence, so it always falls through to name tokens.

  // 7. Name tokens — last resort.
  const tokenSet = new Set(tokens);
  const has = (...words) => words.some((w) => tokenSet.has(w));

  if (has('crossfit')) return { venue_type: 'crossfit_functional', reason: 'name_token:crossfit' };
  if (has('boxing', 'martial', 'karate', 'judo', 'muay', 'mma', 'bjj', 'kickboxing', 'taekwondo'))
    return { venue_type: 'martial_arts', reason: 'name_token:combat_sport' };
  if (has('university', 'uni')) return { venue_type: 'university_gym', reason: 'name_token:university' };
  if (has('hotel')) return { venue_type: 'hotel_gym', reason: 'name_token:hotel' };
  if (has('womens', 'women', 'ladies')) return { venue_type: 'womens_gym', reason: 'name_token:womens' };
  if (has('strength', 'powerlifting', 'barbell', 'strongman'))
    return { venue_type: 'strength_gym', reason: 'name_token:strength' };
  if (has('pilates', 'yoga', 'barre') || (has('studio') && !has('gym')))
    return { venue_type: 'boutique_studio', reason: 'name_token:studio' };
  if (has('leisure') && has('centre', 'center'))
    return { venue_type: 'leisure_centre', reason: 'name_token:leisure_centre' };
  if (has('gym', 'fitness', 'health') ) return { venue_type: 'independent_gym', reason: 'name_token:gym_or_fitness' };

  return { venue_type: 'other_fitness', reason: 'unclassified_default' };
}

module.exports = { classify, VENUE_TYPES };

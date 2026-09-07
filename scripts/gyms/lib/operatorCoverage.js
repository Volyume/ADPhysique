// GD-26 point 3, pure, no I/O: "When an operator feed was acquired with
// zero or near-zero failures (the manifest records it), a venue carrying
// that brand from another source alone and not matched to any feed row
// keeps `status` but gets `verification_status = 'operator_unconfirmed'`
// and a `needs_review` reason `not_in_operator_feed`." "Complete
// acquisition" per the task brief: a manifest with `found > 0` and at most
// 3 failures.
//
// Wired from build.mjs, which does the one piece of I/O this needs
// (reading every operators/<slug>/manifest.json under the raw dir and
// resolving each slug to a seed brand key via lib/brands.js's matchBrand,
// the same slug->brand resolution transforms.js's transformOperatorBranch
// and audit.mjs's operator comparison already use) and passes the result
// in as a plain Map<brandKey, operatorSlug>.

/**
 * @param {{branch_urls_found?: number, failures?: any[]}|null|undefined} manifest
 * @returns {boolean}
 */
function isCompleteAcquisition(manifest) {
  if (!manifest || typeof manifest !== 'object') return false;
  const found = Number(manifest.branch_urls_found) || 0;
  const failures = Array.isArray(manifest.failures) ? manifest.failures.length : 0;
  return found > 0 && failures <= 3;
}

/**
 * Mark every canonical venue whose brand's operator feed is complete but
 * which carries no member from that operator's own feed
 * (`operator:<slug>:...` member key) as `operator_unconfirmed`. Mutates
 * each venue in place — `verification_status` is overwritten (GD-26: "gets
 * verification_status = 'operator_unconfirmed'", replacing whatever
 * single_source/multi_source value it had) and `needs_review_reason` is
 * set to `'not_in_operator_feed'`; `status` is left untouched. Every venue
 * gets a `needs_review_reason` field (null when not flagged) so the field
 * is present on the whole output, not only on flagged rows.
 * @param {{brand_key: string|null, member_keys?: string[], verification_status?: string, needs_review_reason?: string|null}[]} venues
 * @param {Map<string,string>} completeOperatorSlugByBrand - brand key -> operator folder slug, complete acquisitions only
 * @returns {{ total: number, bySlug: Record<string, number> }}
 */
function markOperatorUnconfirmed(venues, completeOperatorSlugByBrand) {
  let total = 0;
  const bySlug = {};
  for (const v of venues) {
    v.needs_review_reason = null;
    if (!v.brand_key) continue;
    const slug = completeOperatorSlugByBrand.get(v.brand_key);
    if (!slug) continue;
    const memberKeys = v.member_keys || [];
    const hasOperatorMember = memberKeys.some((k) => k.startsWith(`operator:${slug}:`));
    if (hasOperatorMember) continue;
    v.verification_status = 'operator_unconfirmed';
    v.needs_review_reason = 'not_in_operator_feed';
    total += 1;
    bySlug[slug] = (bySlug[slug] || 0) + 1;
  }
  return { total, bySlug };
}

module.exports = { isCompleteAcquisition, markOperatorUnconfirmed };

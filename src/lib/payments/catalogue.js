/**
 * The consumer SKU catalogue.
 *
 * Founder override 2026-06-06: flat pricing replaces the old escalating
 * launch/founders/standard windows. One tier (Pro), two billing periods:
 *   - Monthly  £4.99/month
 *   - Annual   £29.99/year   (about 50% off the monthly rate)
 *
 * SKU IDs are the source of truth in code. User-facing prices always come from
 * Play Billing, never from hardcoded values. SKU IDs must match the products
 * created in Google Play Console. The 7-day intro free-trial offer is configured
 * per product in Play Console, not here; the billing provider reads whichever
 * offer the user is eligible for at purchase time.
 *
 * UK prices are the reference in Play Console; other regions map via Play
 * Console's automatic price tiers.
 *
 * PLAY-002: the `priceText` / `priceNumber` values below are a reference and
 * the input to annualSavingsPct(). They are NOT a user-facing display price.
 * Every paywall renders Google Play's own localised price via usePlayPrices,
 * and shows a price-free loading state until it arrives. Do not wire priceText
 * back into a screen as a fallback: it would show the wrong currency and amount
 * to a non-UK user and could diverge from what Google actually charges.
 *
 * Coach SKUs (phase 2) remain a separate set, purchased via the coach web
 * dashboard, not IAP.
 */

export const BILLING_PERIODS = Object.freeze(['monthly', 'annual']);
export const TIERS = Object.freeze(['pro']);

export const SKU_CATALOGUE = Object.freeze({
  pro: Object.freeze({
    monthly: Object.freeze({
      id: 'pro_monthly',
      tier: 'pro',
      period: 'monthly',
      priceText: '£4.99/month',
      priceNumber: 4.99,
    }),
    annual: Object.freeze({
      id: 'pro_annual',
      tier: 'pro',
      period: 'annual',
      priceText: '£29.99/year',
      priceNumber: 29.99,
    }),
  }),
});

/**
 * Return the SKU record for (tier, billingPeriod). Only 'pro' is sold.
 * The period defaults to 'monthly', and any value other than 'annual'
 * resolves to monthly, so a render path never gets null for a Pro
 * request (legacy callers that passed a pricing-window string still get
 * the monthly SKU). Non-Pro tiers return null.
 *
 * @param {string} tier
 * @param {string} [period]  'monthly' | 'annual'
 */
export function skuFor(tier, period = 'monthly') {
  if (tier !== 'pro') return null;
  const key = period === 'annual' ? 'annual' : 'monthly';
  return SKU_CATALOGUE.pro[key] ?? null;
}

/**
 * Reference price string for (tier, period). NOT for user-facing display
 * (PLAY-002): paywalls show Google Play's localised price via usePlayPrices.
 * Kept for tests and any internal reference that needs the UK figure.
 */
export function priceTextFor(tier, period = 'monthly') {
  return skuFor(tier, period)?.priceText ?? null;
}

/**
 * Look up a SKU by its Play product id. Used to correlate an incoming
 * Play Billing purchase / RTDN notification back to a known SKU.
 */
export function skuById(id) {
  for (const period of BILLING_PERIODS) {
    const sku = SKU_CATALOGUE.pro[period];
    if (sku.id === id) return sku;
  }
  return null;
}

/**
 * Every SKU id the app knows about. Used by the Play Billing init step
 * to declare the products to query.
 */
export function allSkuIds() {
  return BILLING_PERIODS.map(period => SKU_CATALOGUE.pro[period].id);
}

/**
 * Whole-pound saving and percentage of choosing annual over 12 months of
 * monthly. Used for the "Save X%" badge on the annual option. Rounded.
 */
export function annualSavingsPct() {
  const monthlyYear = SKU_CATALOGUE.pro.monthly.priceNumber * 12;
  const annual = SKU_CATALOGUE.pro.annual.priceNumber;
  if (monthlyYear <= 0) return 0;
  return Math.round((1 - annual / monthlyYear) * 100);
}

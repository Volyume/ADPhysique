/**
 * The three consumer SKUs locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md
 * lines 71-77 (re-locked 2026-05-25 to the 2-tier model). One tier
 * (Pro), three pricing windows. Coach SKUs (phase 2) live separately
 * — purchased via the coach web dashboard, not IAP.
 *
 * SKU IDs match what gets created in Google Play Console at Phase B
 * pre-launch.
 *
 * UK prices are the source of truth here. Other-region prices are
 * configured per-SKU in Play Console with Google's automatic
 * price-tier mapping.
 *
 * Price strings already follow voice rules (no jargon, plain numbers).
 */

export const PRICING_WINDOWS = Object.freeze(['open_beta', 'founders', 'standard']);
export const TIERS = Object.freeze(['pro']);

export const SKU_CATALOGUE = Object.freeze({
  pro: Object.freeze({
    open_beta: Object.freeze({
      id: 'pro_monthly_open_beta',
      tier: 'pro',
      pricingWindow: 'open_beta',
      priceText: '£0.99/month',
      priceNumber: 0.99,
    }),
    founders: Object.freeze({
      id: 'pro_monthly_founders',
      tier: 'pro',
      pricingWindow: 'founders',
      priceText: '£1.99/month',
      priceNumber: 1.99,
    }),
    standard: Object.freeze({
      id: 'pro_monthly_standard',
      tier: 'pro',
      pricingWindow: 'standard',
      priceText: '£3.99/month',
      priceNumber: 3.99,
    }),
  }),
});

/**
 * Return the SKU record for (tier, pricingWindow). Returns null on
 * unknown combinations rather than throwing — call sites are render
 * paths where a missing SKU shouldn't crash the UI.
 *
 * Tier argument retained for API compatibility with the 3-tier era;
 * any value other than 'pro' returns null.
 */
export function skuFor(tier, pricingWindow) {
  if (tier !== 'pro') return null;
  return SKU_CATALOGUE.pro?.[pricingWindow] ?? null;
}

/**
 * Helper for paywall surfaces that show "£X/month" in a button.
 */
export function priceTextFor(tier, pricingWindow) {
  return skuFor(tier, pricingWindow)?.priceText ?? null;
}

/**
 * Look up SKU by its ID. Useful when correlating an incoming Play
 * Billing RTDN notification back to a known SKU.
 */
export function skuById(id) {
  for (const win of PRICING_WINDOWS) {
    const sku = SKU_CATALOGUE.pro[win];
    if (sku.id === id) return sku;
  }
  return null;
}

/**
 * Flat list of all three SKU IDs. Used by the Play Billing init
 * step to declare every product the app knows about.
 */
export function allSkuIds() {
  return PRICING_WINDOWS.map(win => SKU_CATALOGUE.pro[win].id);
}

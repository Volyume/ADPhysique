/**
 * The six consumer SKUs locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md
 * lines 57-67. Three pricing windows × two tiers.
 *
 * SKU IDs match what gets created in App Store Connect and Google
 * Play Console at Phase B pre-launch. Coach SKUs (phase 2) are NOT
 * included; they live separately because they're purchased via the
 * coach web dashboard (Stripe), not IAP.
 *
 * UK prices are the source of truth here. Other-region prices are
 * configured per-SKU in App Store Connect / Play Console with
 * Apple/Google's automatic price-tier mapping. We don't store them
 * in the app.
 *
 * Price strings already follow voice rules (no jargon, plain numbers).
 */

export const PRICING_WINDOWS = Object.freeze(['open_beta', 'founders', 'standard']);
export const TIERS = Object.freeze(['pro', 'complete']);

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
      priceText: '£1.49/month',
      priceNumber: 1.49,
    }),
    standard: Object.freeze({
      id: 'pro_monthly_standard',
      tier: 'pro',
      pricingWindow: 'standard',
      priceText: '£2.99/month',
      priceNumber: 2.99,
    }),
  }),
  complete: Object.freeze({
    open_beta: Object.freeze({
      id: 'complete_monthly_open_beta',
      tier: 'complete',
      pricingWindow: 'open_beta',
      priceText: '£1.99/month',
      priceNumber: 1.99,
    }),
    founders: Object.freeze({
      id: 'complete_monthly_founders',
      tier: 'complete',
      pricingWindow: 'founders',
      priceText: '£3.49/month',
      priceNumber: 3.49,
    }),
    standard: Object.freeze({
      id: 'complete_monthly_standard',
      tier: 'complete',
      pricingWindow: 'standard',
      priceText: '£6.99/month',
      priceNumber: 6.99,
    }),
  }),
});

/**
 * Return the SKU record for (tier, pricingWindow). Returns null on
 * unknown combinations rather than throwing — call sites are render
 * paths where a missing SKU shouldn't crash the UI.
 */
export function skuFor(tier, pricingWindow) {
  return SKU_CATALOGUE[tier]?.[pricingWindow] ?? null;
}

/**
 * Helper for paywall surfaces that show "£X/month" in a button. Same
 * lookup as skuFor; returns the priceText string or null.
 */
export function priceTextFor(tier, pricingWindow) {
  return skuFor(tier, pricingWindow)?.priceText ?? null;
}

/**
 * Look up SKU by its ID (the string that App Store / Play Console
 * uses). Useful in the Play Billing RTDN webhook handler when
 * correlating incoming notifications back to a known SKU.
 */
export function skuById(id) {
  for (const tier of TIERS) {
    for (const win of PRICING_WINDOWS) {
      const sku = SKU_CATALOGUE[tier][win];
      if (sku.id === id) return sku;
    }
  }
  return null;
}

/**
 * Flat list of all six SKU IDs. Used by the Play Billing init step
 * to declare every product the app knows about.
 */
export function allSkuIds() {
  const ids = [];
  for (const tier of TIERS) {
    for (const win of PRICING_WINDOWS) {
      ids.push(SKU_CATALOGUE[tier][win].id);
    }
  }
  return ids;
}

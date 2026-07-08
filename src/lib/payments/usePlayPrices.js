import { useState, useEffect } from 'react';
import { ensureDisplayPrices, getDisplayPrices } from './playBilling';
import { skuFor } from './catalogue';

/**
 * C-2: paywall surfaces must show the store's localised price (Apple + Google
 * policy), not a hardcoded one. This hook fetches the prices from the active
 * store and returns a `priceFor(tier, period)` resolver.
 *
 * PLAY-002: the resolver returns `null` until the store has responded. It
 * does NOT fall back to a hardcoded catalogue price. A hardcoded "£2.99" would
 * show the wrong currency and amount to a non-UK user, and could diverge from
 * what Apple or Google actually charges, both of which break the store's
 * localised-price requirement. Callers render a price-free "Subscribe" or a
 * short loading state until a real price arrives. Once loaded the price is
 * cached at module level, so returning to a paywall in the same session shows
 * it immediately with no flash.
 *
 * Usage:
 *   const priceFor = usePlayPrices();
 *   const price = priceFor('pro', period);          // "£2.99" / "$4.99" / null
 *   <Text>{price ?? 'Subscribe'}</Text>
 */
export function usePlayPrices() {
  const [prices, setPrices] = useState(() => getDisplayPrices());
  useEffect(() => {
    let alive = true;
    ensureDisplayPrices()
      .then((p) => { if (alive) setPrices(p); })
      .catch(() => { /* leave prices empty; callers show the loading state */ });
    return () => { alive = false; };
  }, []);
  return function priceFor(tier, period = 'monthly') {
    const sku = skuFor(tier, period);
    return (sku && prices[sku.id]) || null;
  };
}

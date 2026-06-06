import { useState, useEffect } from 'react';
import { ensureDisplayPrices, getDisplayPrices } from './playBilling';
import { skuFor, priceTextFor } from './catalogue';

/**
 * C-2: paywall surfaces must show the store's localised price (Apple + Google
 * policy), not a hardcoded one. This hook ensures the prices are fetched from
 * Play and returns a `priceFor(tier, period)` resolver. Before the store
 * responds (or in the stub/dev env) it falls back to the catalogue text, so a
 * UK user always sees something sensible and a non-UK user sees their real
 * localised price once it loads.
 *
 * Usage:
 *   const priceFor = usePlayPrices();
 *   <Text>{priceFor('pro', period)}</Text>   // "£4.99" / "$6.99" / "8,99 €"
 */
export function usePlayPrices() {
  const [prices, setPrices] = useState(() => getDisplayPrices());
  useEffect(() => {
    let alive = true;
    ensureDisplayPrices()
      .then((p) => { if (alive) setPrices(p); })
      .catch(() => { /* keep the catalogue fallback */ });
    return () => { alive = false; };
  }, []);
  return function priceFor(tier, period = 'monthly') {
    const sku = skuFor(tier, period);
    return (sku && prices[sku.id]) || priceTextFor(tier, period);
  };
}

/**
 * PLAY-002 regression guard.
 *
 * usePlayPrices must return Google Play's localised price, or null until the
 * store responds. It must NOT fall back to the hardcoded UK catalogue price:
 * that would show the wrong currency and amount to a non-UK user and could
 * diverge from what Google actually charges. The screens render a price-free
 * loading state on null.
 */
import React from 'react';
import { create, act } from 'react-test-renderer';

let mockDisplayPrices = {};
jest.mock('../playBilling', () => ({
  getDisplayPrices: jest.fn(() => ({ ...mockDisplayPrices })),
  ensureDisplayPrices: jest.fn(async () => ({ ...mockDisplayPrices })),
}));

// Imported after the mock so the hook binds to the mocked provider.
// eslint-disable-next-line import/first
const { usePlayPrices } = require('../usePlayPrices');

// Probe that surfaces the resolver's results so the test can read them.
function Probe({ onResolve }) {
  const priceFor = usePlayPrices();
  onResolve({
    monthly: priceFor('pro', 'monthly'),
    annual: priceFor('pro', 'annual'),
    nonPro: priceFor('complete', 'monthly'),
  });
  return null;
}

async function render() {
  let last = null;
  await act(async () => {
    create(React.createElement(Probe, { onResolve: (v) => { last = v; } }));
  });
  return last;
}

describe('usePlayPrices (PLAY-002)', () => {
  afterEach(() => { mockDisplayPrices = {}; });

  test('returns null, not a hardcoded price, before the store responds', async () => {
    mockDisplayPrices = {};
    const r = await render();
    expect(r.monthly).toBeNull();
    expect(r.annual).toBeNull();
    // The smell we are guarding against: never the catalogue text.
    expect(r.monthly).not.toBe('£4.99/month');
    expect(r.annual).not.toBe('£29.99/year');
  });

  test('returns the store localised price once loaded', async () => {
    mockDisplayPrices = { pro_monthly: '$6.99', pro_annual: '$49.99' };
    const r = await render();
    expect(r.monthly).toBe('$6.99');
    expect(r.annual).toBe('$49.99');
  });

  test('returns null for a non-Pro tier', async () => {
    mockDisplayPrices = { pro_monthly: '£4.99' };
    const r = await render();
    expect(r.nonPro).toBeNull();
  });
});

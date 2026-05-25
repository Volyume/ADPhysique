/**
 * Public surface of the payments module.
 *
 * Internal call sites should import from this index, not from the
 * individual files, so the implementation can move without breaking
 * callers. The Supabase Edge Function (play-billing-rtdn) lives in
 * supabase/functions/play-billing-rtdn/ and is NOT re-exported here
 * because it doesn't ship in the client bundle.
 */

export * as catalogue from './catalogue';
export * as cascade from './cascade';
export * as playBilling from './playBilling';
export { restorePurchases } from './restore';

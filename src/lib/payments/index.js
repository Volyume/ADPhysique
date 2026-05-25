/**
 * Public surface of the payments module.
 *
 * Internal call sites should import from this index, not from the
 * individual files, so the implementation can move without breaking
 * callers. The Supabase Edge Function (revenuecat-webhook) lives in
 * supabase/functions/revenuecat-webhook/ and is NOT re-exported here
 * because it doesn't ship in the client bundle.
 */

export * as catalogue from './catalogue';
export * as cascade from './cascade';
export * as revenuecat from './revenuecat';
export { restorePurchases } from './restore';

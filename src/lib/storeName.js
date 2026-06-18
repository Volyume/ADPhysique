import { Platform } from 'react-native';

/**
 * The user-facing name of the platform's app store, for subscription copy.
 * Hardcoding "Google Play" everywhere read wrong (and is an App Store review
 * risk) once iOS shipped. On iOS StoreKit applies the eligible introductory
 * offer automatically (see playBilling.js), so the same trial wording holds —
 * only the store name differs.
 */
export function storeName() {
  return Platform.OS === 'ios' ? 'the App Store' : 'Google Play';
}

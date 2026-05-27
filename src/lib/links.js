/**
 * Single source of truth for outbound URLs the app links to.
 * Locked in PRIVACY_CONSENT_LOCKED.md line 280: the privacy policy
 * URL is hardcoded here so the marketing site and the in-app link
 * are updated together if the URL ever changes.
 *
 * Keep this file short. New entries only when an existing URL gets
 * referenced from more than one place.
 */

export const LINKS = {
  // Privacy policy. Hosted at volyume.app/privacy in production;
  // GitHub Pages serves public/privacy/index.html at /privacy/
  // (and auto-redirects /privacy -> /privacy/), so the extension-
  // less URL works as long as `.nojekyll` is present in public/.
  // The temporary fallback at allansdouglas1983-cmyk.github.io/ADPhysique/privacy/
  // works the same way until DNS for volyume.app points at the
  // Pages site (founder action, tracked in CURRENT_STATUS.md).
  privacyPolicy: 'https://volyume.app/privacy',

  // Marketing landing page.
  marketing: 'https://volyume.app',

  // Support email. Use mailto: prefix at call sites.
  supportEmail: 'support@volyume.app',
};

/**
 * Community share links (blueprint sections 5.6, 8; SD-16).
 *
 * PURE. Two forms of the same three addresses:
 *   - the WEB form, a static page under `public/` that fetches the
 *     `community-public` edge function, so a link works for someone who
 *     does not have the app;
 *   - the APP form on the `volyume://` scheme, used by the "Open in
 *     Volyume" button on those pages.
 *
 * The query form (`/u/?h=`) rather than a path (`/u/<handle>`) is not a
 * style choice: the site is static GitHub Pages with no path rewriting,
 * and the partner page already uses this shape.
 *
 * Parsing follows the house rule from `src/lib/authDeepLink.js`
 * (`isVolyumeLink`): the host is compared EXACTLY, never with
 * `startsWith`, so `volyume.app.example.com` is not our link.
 */

export const WEB_ORIGIN = 'https://volyume.app';
export const APP_SCHEME = 'volyume://';

// 'p' (programme) links are retired along with Community programme-sharing
// (`docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2): the path
// still parses below so an old link never dead-ends, but it now opens the
// Community Hub, and no URL is minted for it any more.
const PATHS = Object.freeze({ profile: 'u', programme: 'p', story: 's', group: 'g' });

function encode(v) {
  return encodeURIComponent(String(v ?? ''));
}

/** `https://volyume.app/u/?h=<handle>` */
export function profileUrl(handle) {
  return `${WEB_ORIGIN}/${PATHS.profile}/?h=${encode(handle)}`;
}

/** `https://volyume.app/s/?id=<id>` */
export function storyUrl(id) {
  return `${WEB_ORIGIN}/${PATHS.story}/?id=${encode(id)}`;
}

/** `volyume://u/?h=<handle>` */
export function appProfileUrl(handle) {
  return `${APP_SCHEME}${PATHS.profile}/?h=${encode(handle)}`;
}

/** `volyume://s/?id=<id>` */
export function appStoryUrl(id) {
  return `${APP_SCHEME}${PATHS.story}/?id=${encode(id)}`;
}

/** `https://volyume.app/g/?id=<groupId>` (community product audit 60 §3) */
export function groupUrl(id) {
  return `${WEB_ORIGIN}/${PATHS.group}/?id=${encode(id)}`;
}

/** `volyume://g/?id=<groupId>` */
export function appGroupUrl(id) {
  return `${APP_SCHEME}${PATHS.group}/?id=${encode(id)}`;
}

function readQuery(blob) {
  const out = {};
  for (const pair of String(blob || '').split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    if (!rawKey) continue;
    let key = rawKey;
    let value = rawValue;
    try { key = decodeURIComponent(rawKey); } catch (_e) { /* keep the raw key */ }
    try { value = decodeURIComponent(rawValue.replace(/\+/g, ' ')); } catch (_e) { /* keep the raw value */ }
    if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = value;
  }
  return out;
}

/**
 * Parse one Community link, web or app form.
 *
 * @param {string} url
 * @returns {{kind: 'profile', handle: string}
 *   | {kind: 'hub'}
 *   | {kind: 'story', id: string}
 *   | null} null for anything that is not one of our addresses.
 */
export function parseCommunityLink(url) {
  const s = String(url ?? '').trim();
  if (!s) return null;

  let rest = null;
  const app = /^volyume:\/\/(.*)$/i.exec(s);
  if (app) {
    rest = app[1];
  } else {
    const web = /^https:\/\/([^/?#]+)(.*)$/i.exec(s);
    // Exact host match, never startsWith: a prefix test would accept
    // volyume.app.attacker.example.
    if (!web || web[1].toLowerCase() !== 'volyume.app') return null;
    rest = web[2] ?? '';
    if (rest.startsWith('/')) rest = rest.slice(1);
  }

  const hash = rest.indexOf('#');
  const withoutHash = hash === -1 ? rest : rest.slice(0, hash);
  const q = withoutHash.indexOf('?');
  const pathPart = (q === -1 ? withoutHash : withoutHash.slice(0, q)).replace(/\/+$/, '');
  const params = readQuery(q === -1 ? '' : withoutHash.slice(q + 1));

  if (pathPart === PATHS.profile) {
    const handle = String(params.h ?? '').trim().toLowerCase();
    return handle ? { kind: 'profile', handle } : null;
  }
  // A 'p' (programme) link now opens the Community Hub rather than a
  // programme page, which no longer exists.
  if (pathPart === PATHS.programme) return { kind: 'hub' };
  if (pathPart === PATHS.story) {
    const id = String(params.id ?? '').trim();
    return id ? { kind: 'story', id } : null;
  }
  if (pathPart === PATHS.group) {
    const id = String(params.id ?? '').trim();
    return id ? { kind: 'group', id } : null;
  }
  return null;
}

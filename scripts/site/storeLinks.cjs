#!/usr/bin/env node
/**
 * The one marking scheme for every store link on volyume.app (LOC-663).
 *
 * Why: installs that start on the website are counted in each store's own
 * figures only when the link says where it came from. Apple reads a campaign
 * link (`pt` provider token + `ct` campaign name); Google Play reads the
 * `referrer` parameter (UTM values), shown in Play Console under UTM source
 * and UTM campaign. Nothing is added to the pages to do this: it is the link
 * itself, with no script, cookie, pixel or analytics tag. The scheme is
 * written up in docs/website-store-link-marking.md.
 *
 * Scheme (the campaign name is the page that carries the link, CAMPAIGNS
 * below, 40 characters or fewer because Apple allows no more):
 *   App Store  https://apps.apple.com/gb/app/volyume/id6777083702?pt=<token>&ct=<campaign>&mt=8
 *   Google Play https://play.google.com/store/apps/details?id=app.volyume&referrer=
 *               utm_source%3Dvolyume.app%26utm_medium%3Dwebsite%26utm_campaign%3D<campaign>
 * `pt` is left out until APPLE_PROVIDER_TOKEN is set (one-time setup: the
 * token is shown in App Store Connect when the first campaign link is made,
 * and cannot be derived). Setting it and running `--apply` adds it to every
 * link, and `--check` then demands it.
 *
 * Usage:  node scripts/site/storeLinks.cjs --check   (exit 1 on any unmarked or
 *                                                     mis-marked store link)
 *         node scripts/site/storeLinks.cjs --apply   (rewrite every store link
 *                                                     in public/ and docs/web/ to the scheme)
 */
const fs = require('fs');
const path = require('path');

const APPLE_PROVIDER_TOKEN = ''; // one-time setup: paste the App Store Connect provider token here
// The published tree and its mirror (docs/web mirrors the home page and the
// privacy page; a test holds the privacy copies equal), both held to the scheme.
const MIRRORS = ['public', 'docs/web'];
const APPLE_BASE = 'https://apps.apple.com/gb/app/volyume/id6777083702';
const PLAY_BASE = 'https://play.google.com/store/apps/details?id=app.volyume';
const UTM_SOURCE = 'volyume.app';
const UTM_MEDIUM = 'website';

// File (relative to public/) to campaign name. A page with a store link that
// is not listed here fails the check, so a new page cannot ship unmarked.
const CAMPAIGNS = {
  'index.html': 'home',
  'get/index.html': 'get',
  'support/index.html': 'support',
  'survey/index.html': 'survey',
  'privacy.html': 'privacy',
  'privacy/index.html': 'privacy',
  'articles/index.html': 'articles',
  'articles/why-explainable-coaching-beats-black-box/index.html': 'article-explainable-coaching',
  'articles/training-volume-when-to-add-sets/index.html': 'article-training-volume',
  'articles/when-to-change-your-calories/index.html': 'article-change-calories',
  'challenge-terms/index.html': 'challenge-terms',
  'c/index.html': 'challenge',
  'u/index.html': 'community-profile',
  'g/index.html': 'community-group',
  's/index.html': 'community-story',
  'p/index.html': 'community-programme',
  'partner/index.html': 'partner',
  'email/preferences/index.html': 'email-preferences',
  'email/unsubscribe/index.html': 'email-unsubscribe',
};

const appleLink = (campaign) =>
  `${APPLE_BASE}?${APPLE_PROVIDER_TOKEN ? `pt=${APPLE_PROVIDER_TOKEN}&` : ''}ct=${campaign}&mt=8`;
const playLink = (campaign) =>
  `${PLAY_BASE}&referrer=${encodeURIComponent(
    `utm_source=${UTM_SOURCE}&utm_medium=${UTM_MEDIUM}&utm_campaign=${campaign}`,
  )}`;

// Any link to either store, whatever its shape: apps.apple.com or
// itunes.apple.com, a Play store page, a market:// or itms-apps:// link. The
// Play badge image (play.google.com/intl/.../badges/...) is not a link.
const STORE_URL =
  /(?:https?:)?\/\/(?:apps|itunes)\.apple\.com[^"'\s<)]*|https?:\/\/play\.google\.com\/store[^"'\s<)]*|(?:market|itms-apps):\/\/[^"'\s<)]*/g;

function expectedFor(url, campaign) {
  if (/apple\.com/.test(url)) return appleLink(campaign);
  if (/play\.google\.com/.test(url)) return playLink(campaign);
  return null;
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else if (/\.(html|js|md|json)$/.test(entry.name)) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

// A challenge page adds its code to the Play referrer at run time, after the
// marked link: the literal in the file is still the marked link.
function checkTree(publicDir) {
  const problems = [];
  let links = 0;
  for (const rel of listFiles(publicDir)) {
    const text = fs.readFileSync(path.join(publicDir, rel), 'utf8');
    const found = text.match(STORE_URL) || [];
    if (!found.length) continue;
    const campaign = CAMPAIGNS[rel];
    if (!campaign) {
      problems.push(`${rel}: has a store link but no campaign name in CAMPAIGNS`);
      continue;
    }
    if (campaign.length > 40) problems.push(`${rel}: campaign "${campaign}" is over Apple's 40 characters`);
    for (const url of found) {
      links += 1;
      const want = expectedFor(url, campaign);
      if (url !== want) problems.push(`${rel}: ${url}  should be  ${want}`);
    }
  }
  return { problems, links };
}

function applyTree(publicDir) {
  const changed = [];
  for (const rel of listFiles(publicDir)) {
    const campaign = CAMPAIGNS[rel];
    if (!campaign) continue;
    const file = path.join(publicDir, rel);
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(STORE_URL, (url) => expectedFor(url, campaign) || url);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed.push(rel);
    }
  }
  return changed;
}

module.exports = { MIRRORS, APPLE_PROVIDER_TOKEN, CAMPAIGNS, STORE_URL, appleLink, playLink, checkTree, applyTree, listFiles };

if (require.main === module) {
  const dirs = MIRRORS.map((d) => path.join(__dirname, '..', '..', d));
  const mode = process.argv[2];
  if (mode === '--apply') {
    const changed = dirs.flatMap((d, i) => applyTree(d).map((f) => `${MIRRORS[i]}/${f}`));
    console.log(changed.length ? `Marked store links in: ${changed.join(', ')}` : 'Nothing to change.');
  } else if (mode === '--check') {
    const results = dirs.map((d, i) => {
      const r = checkTree(d);
      return { links: r.links, problems: r.problems.map((m) => `${MIRRORS[i]}/${m}`) };
    });
    const problems = results.flatMap((r) => r.problems);
    const links = results.reduce((n, r) => n + r.links, 0);
    if (problems.length) {
      console.error(problems.join('\n'));
      console.error(`FAIL: ${problems.length} store link problem(s) in ${links} link(s).`);
      process.exit(1);
    }
    console.log(`OK: all ${links} store links under public/ and docs/web/ carry the marking.`);
  } else {
    console.error('Usage: node scripts/site/storeLinks.cjs --check | --apply');
    process.exit(2);
  }
}

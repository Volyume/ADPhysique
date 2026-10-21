/**
 * volyume.app isolation guard: no third-party code, trackers, cookies or
 * remote resources.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("No third-party scripts,
 * analytics, cookies or fonts; fonts and images served from the site") and
 * CLAUDE.md section 2 (GDPR: data minimisation, nothing to an outside party
 * the privacy policy does not name).
 *
 * What this pins, over every HTML page under public/ (members excluded) and
 * the page scripts beside them:
 *  1. Every <script src> is on the site's own origin.
 *  2. Nothing is LOADED from another origin: no image, source, video, audio,
 *     track, iframe, embed, object, stylesheet, preload, preconnect, icon or
 *     form action. Links a person chooses to follow (<a href>) are not loads;
 *     they must be https.
 *  3. No analytics, advertising, tag-manager, error-tracking, chat, font or
 *     CDN signature anywhere in a page, its script or its style.
 *  4. No cookie, no beacon, no socket, no event stream.
 *  5. The only hosts an inline script names are the site, its own Supabase
 *     project (the working pages call it), the two stores and the XML
 *     namespace address, so a page cannot quietly start talking to someone new.
 *
 * Why: the old pages were clean on all five, and the privacy policy says "We
 * do not use third-party analytics or tracking tools". A rebuild with a build
 * step and a new design is exactly when a font link, a badge image or a
 * snippet gets pasted in. This fails on the old home page (the Google Play
 * badge is loaded from play.google.com) and passes once it is served locally.
 */
'use strict';

const S = require('./siteScan');

const PAGES = S.htmlFiles();
const SCRIPT_FILES = S.allPublicFiles().filter((f) => /\.js$/i.test(f) && !S.isMembers(f));

// Hosts an inline script may name.
const SCRIPT_HOSTS = new Set([
  'volyume.app', 'www.volyume.app', S.SUPABASE_HOST, 'play.google.com', 'apps.apple.com',
  'www.w3.org', // XML namespace identifiers, not network calls
]);

const TRACKERS = [
  ['Google analytics or tag manager', /google-analytics|googletagmanager|gtag\s*\(|\bga\s*\(\s*['"]|analytics\.js|\/ga\.js/i],
  ['Meta pixel', /facebook\.net|connect\.facebook|fbq\s*\(|fbevents/i],
  ['product analytics or session replay', /hotjar|mixpanel|segment\.(com|io)|amplitude\.com|posthog|plausible\.io|matomo|piwik|fullstory|clarity\.ms|mouseflow|crazyegg|logrocket/i],
  ['advertising', /doubleclick|googlesyndication|adsbygoogle|adservice|criteo|taboola|outbrain|snaptr|twq\s*\(|linkedin\.com\/px|licdn|ads-twitter|tiktok/i],
  ['host analytics', /_vercel\/insights|va\.vercel-scripts|cloudflareinsights|static\.cloudflare/i],
  ['error tracking', /sentry\.io|browser\.sentry|bugsnag|datadog|newrelic|\brollbar\b/i],
  ['chat or marketing widget', /intercom\.io|intercomSettings|hubspot|drift\.com|crisp\.chat|zendesk|tawk\.to/i],
  ['font or script CDN', /fonts\.googleapis|fonts\.gstatic|use\.typekit|fonts\.adobe|cdnjs\.cloudflare|cdn\.jsdelivr|unpkg\.com|ajax\.googleapis|code\.jquery|bootstrapcdn|maxcdn|polyfill\.io|kit\.fontawesome|cdn\.tailwindcss/i],
  ['captcha', /recaptcha|hcaptcha|cf-turnstile|challenges\.cloudflare\.com/i],
];
const STORAGE_AND_BEACONS = [
  ['cookie', /document\s*\.\s*cookie|set-cookie/i],
  ['beacon', /sendBeacon/],
  ['socket or event stream', /new\s+WebSocket\s*\(|new\s+EventSource\s*\(/],
];

// Loaded resources: [element, attribute]. <a href> is a link, not a load.
const LOADS = [
  ['img', 'src'], ['img', 'srcset'], ['source', 'src'], ['source', 'srcset'], ['video', 'src'], ['video', 'poster'],
  ['audio', 'src'], ['track', 'src'], ['iframe', 'src'], ['frame', 'src'], ['embed', 'src'], ['object', 'data'],
  ['input', 'src'], ['script', 'src'], ['form', 'action'],
];
// <link rel> values that name a document rather than load one.
const LINK_ONLY = /^(canonical|alternate|author|license|me|next|prev|help|search|bookmark|sitemap)$/i;

const srcsetUrls = (v) => v.split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);

describe('scripts', () => {
  test('every script is on the site\'s own origin', () => {
    const out = [];
    PAGES.forEach((rel) => S.readPage(rel).elements.filter((e) => e.name === 'script' && e.attrs.src).forEach((e) => {
      const r = S.resolveRef(e.attrs.src, rel);
      if (r.kind !== 'local') out.push(`${rel}: <script src="${e.attrs.src}">`);
    }));
    expect(out).toEqual([]);
  });

  test('no inline script imports code from another origin', () => {
    const out = [];
    PAGES.forEach((rel) => S.readPage(rel).scripts.forEach((s) => {
      if (/\bimport\s*\(\s*['"`]https?:|\bimport\s+[^;]*\bfrom\s*['"`]https?:|importScripts\s*\(/.test(s.code)) out.push(rel);
    }));
    expect(out).toEqual([]);
  });

  test('an inline script names only the hosts the site really talks to', () => {
    const out = [];
    const check = (label, code) => {
      for (const m of code.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        if (!SCRIPT_HOSTS.has(m[1].toLowerCase())) out.push(`${label}: ${m[1]}`);
      }
    };
    PAGES.forEach((rel) => S.readPage(rel).scripts.forEach((s) => check(rel, s.code)));
    SCRIPT_FILES.forEach((rel) => check(rel, S.readPublic(rel)));
    expect(out).toEqual([]);
  });
});

describe('nothing is loaded from another origin', () => {
  test('no image, media, frame, embed, stylesheet, preload, icon or form action points off the site', () => {
    const out = [];
    PAGES.forEach((rel) => {
      S.readPage(rel).elements.forEach((e) => {
        LOADS.filter(([name]) => name === e.name).forEach(([, attr]) => {
          if (e.attrs[attr] === undefined) return;
          const urls = attr === 'srcset' ? srcsetUrls(e.attrs[attr]) : [e.attrs[attr]];
          urls.forEach((u) => {
            const r = S.resolveRef(u, rel);
            if (r.kind === 'external' || r.kind === 'broken-url') out.push(`${rel}: <${e.name} ${attr}="${u.slice(0, 80)}">`);
          });
        });
        if (e.name === 'link' && e.attrs.href && !LINK_ONLY.test((e.attrs.rel || '').trim().split(/\s+/)[0] || '')) {
          const r = S.resolveRef(e.attrs.href, rel);
          if (r.kind === 'external') out.push(`${rel}: <link rel="${e.attrs.rel}" href="${e.attrs.href.slice(0, 80)}">`);
        }
        if (e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || '')) {
          const target = (e.attrs.content || '').match(/url\s*=\s*['"]?([^'"]+)/i);
          if (target && S.resolveRef(target[1], rel).kind === 'external') out.push(`${rel}: meta refresh to ${target[1]}`);
        }
      });
    });
    expect(out).toEqual([]);
  });

  test('no iframe, frame, embed or object points at another origin', () => {
    const out = [];
    PAGES.forEach((rel) => S.readPage(rel).elements.filter((e) => /^(iframe|frame|embed|object)$/.test(e.name)).forEach((e) => {
      const u = e.attrs.src || e.attrs.data || '';
      if (S.resolveRef(u, rel).kind !== 'local') out.push(`${rel}: <${e.name} ${u}>`);
    }));
    expect(out).toEqual([]);
  });

  test('every link a person can follow is https', () => {
    const out = [];
    PAGES.forEach((rel) => S.readPage(rel).elements.filter((e) => e.name === 'a' && e.attrs.href).forEach((e) => {
      if (/^http:\/\//i.test(e.attrs.href.trim())) out.push(`${rel}: ${e.attrs.href}`);
    }));
    expect(out).toEqual([]);
  });
});

describe('no trackers, cookies or beacons', () => {
  const sources = () => [
    ...PAGES.map((rel) => ({ label: rel, text: S.readPage(rel).html.replace(/<!--[\s\S]*?-->/g, '') })),
    ...SCRIPT_FILES.map((rel) => ({ label: rel, text: S.readPublic(rel) })),
    ...S.cssFiles().map((rel) => ({ label: rel, text: S.readPublic(rel) })),
  ];

  test.each(TRACKERS.map(([name, re]) => [name, re]))('no %s', (name, re) => {
    const out = sources().filter((s) => re.test(s.text)).map((s) => s.label);
    expect(out).toEqual([]);
  });

  test.each(STORAGE_AND_BEACONS.map(([name, re]) => [name, re]))('no %s', (name, re) => {
    const out = sources().filter((s) => re.test(s.text)).map((s) => s.label);
    expect(out).toEqual([]);
  });

  test('no page sets a cookie through a meta tag', () => {
    const out = PAGES.filter((rel) => S.readPage(rel).elements.some((e) => e.name === 'meta' && /set-cookie/i.test(e.attrs['http-equiv'] || '')));
    expect(out).toEqual([]);
  });

  test('the trackers list would catch what it names', () => {
    const sample = '<script src="https://www.googletagmanager.com/gtag/js"></script> fbq("init") hotjar doubleclick sentry.io intercom.io fonts.googleapis.com recaptcha /_vercel/insights/script.js';
    expect(TRACKERS.filter(([, re]) => !re.test(sample)).map(([name]) => name)).toEqual([]);
    // And it leaves ordinary words alone: a plausible explanation, a scrollbar, an amplitude.
    const prose = 'a plausible explanation, a scrollbar, the amplitude of a lift, a turnstile at the gym';
    expect(TRACKERS.filter(([, re]) => re.test(prose)).map(([name]) => name)).toEqual([]);
  });
});

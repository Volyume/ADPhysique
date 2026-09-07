# Operator websites — verification/gap-fill acquisition (2026-09-06/07)

Read-only research/acquisition run. No data imported into the app. Posture:
operator sites are a VERIFICATION and gap-fill source (branch existence, name,
address, postcode, status), branch-page URL as provenance; polite sequential
fetching at most 1 req/sec, `User-Agent: VolyumeGymDirectory/0.1
(+https://volyume.app)`, robots.txt respected, stop on 403/429/challenge,
facts only, never redistributed as an operator list. Raw files under
scratchpad only (not in repo):
`/tmp/claude-0/-home-user-ADPhysique/8a1da388-bf6f-50f3-8ac9-99853301c7d5/scratchpad/gyms/raw/operators/<operator>/`
— `branches.jsonl` (one record per branch, `source_url`/`retrieved_at`
provenance) + `manifest.json` (robots stance, counts, failures) per operator.

JD Gyms was completed by the prior (API-limit-truncated) session; this run
resumed with the remaining 16 named operators plus Places Leisure (misnamed
in the brief — see below).

## Per-operator results

| Operator | robots.txt stance | enumeration method | branches found | fetched | failures | fields captured |
|---|---|---|---:|---:|---:|---|
| JD Gyms | `Allow: /`, only `/api/`+`/faq/search` blocked | sitemap.xml (`/gym/<slug>/`) | 114 | 113 | 1 http-error | name, address, postcode, phone, 24h, JSON-LD 105/113 |
| The Gym Group | sitemap open bar 2 named test pages | sitemap.xml (`/find-a-gym/<city>-gyms/<slug>/`) | 276 | 276 | 0 | name, address, postcode, coords, phone, JSON-LD 274/276 |
| PureGym | `Disallow: /cdn-cgi/, /_server-islands/` only | `/gyms/` locator index page (static links; sitemap has no per-branch URLs) | 496 | 496 | 0 | name, address, postcode, coords, phone, 24h, JSON-LD 496/496 |
| David Lloyd | blocks `/*.json`,`/*.pdf`,`/typo3/` only | sitemap-index → sitemap-0.xml (`/clubs/<slug>/`) | 121 | 119 | 2 SSL/network | name, address, postcode, phone, JSON-LD 111/119 |
| Nuffield Health | names+blocks SemrushBot/AlphaSeoBot/MJ12bot/Screaming Frog by UA; `*` only blocks `/_preview*`,`/search?*` | sitemap_index → sitemap_gyms.xml (`/gyms/<slug>`) | 133 | 133 | 0 | name, postcode, phone (address/coords rarely in JSON-LD, 20/133) |
| Bannatyne | `Disallow:` blank (allow all) | sitemap.xml `/health-club/<slug>` minus 24 known non-branch slugs (add-ons, classes, myzone, shop, etc.) | 65 | 65 | 0 | name, postcode, phone (no JSON-LD on any page) |
| Village Hotels (Village Gym) | blocks `/fonts/`,`/ppc-free-pass/`, query params only | `/locations/` index page links (no sitemap coverage) | 35 | 35 | 0 | name, address, postcode, coords, phone, 24h, JSON-LD 35/35 |
| Total Fitness | blocks CMS/system paths + full NinjaBot block | sitemap.xml `/clubs/<slug>/` | 16 | 16 | 0 | name, postcode, phone (no JSON-LD) |
| Better (GLL) | `Allow: /`, blocks activity-finder/search/timetable params only | sitemap/leisure-centres.xml, 2-segment `/leisure-centre/<region>/<slug>` | 194 | 193 | 1 http-error | name, postcode, phone, JSON-LD 157/193 |
| Places Leisure | brief's domain `places-leisure.org` does not resolve (agent-proxy `connect_rejected`, DNS); real domain is **`placesleisure.org`** (no hyphen) — corrected mid-run. Its robots.txt blocks only named coronavirus/offers/faq/error sub-pages | sitemap.xml → `/centres/<slug>/` | 90 | 90 | 0 | name, postcode, phone (no JSON-LD) |
| Freedom Leisure | blocks `/cdn-cgi/` only | google-sitemap.xml, root `/centres/<slug>/` pages only (sub-pages excluded) | 130 | 129 | 1 http-error | name, address, postcode, phone, JSON-LD 125/129 |
| Parkwood Leisure | `Disallow: /wp-admin/,/wp-content/` only | **not enumerable** — corporate/management-company site only (About Us, Case Studies, Clients and Partners); no facility locator on its own domain, facilities run on separately branded trust sites (legacyleisure.org.uk, lexleisure.org.uk, core.leisurecentre.com) | 0 | 0 | n/a | none — see manifest `not_enumerable_reason` |
| Snap Fitness UK | `Disallow: /global-settings` only | sitemap.xml → `/uk/api/sitemap` → `/uk/gyms/<slug>` | 110 | 107 | 3 timeout | name, address, postcode, phone, 24h, JSON-LD 107/107 |
| Fitness First | blocks `/umbraco/`, parameterised URLs, `/search*` | xml-sitemap `/find-a-gym/<slug>` (excl. `gyms-in-london` hub) | 25 | 25 | 0 | name, address, postcode, coords, phone, 24h, JSON-LD 24/25 |
| Virgin Active | blocks `/sitefinity/` only | sitemap.xml `/clubs/<slug>` | 42 | 42 | 0 | name, postcode, phone (no JSON-LD) |
| 24/7 Fitness | IETF Content-Signal format, `Allow: /`, search/ai-input/ai-train=yes for `*` | sitemap.xml `/gyms/<slug>` | 9 | 9 | 0 | name, address, postcode, coords, phone, 24h, JSON-LD 8/9 |
| Third Space | blocks `/wp-admin/` only | clubs-sitemap.xml `/clubs/<slug>/` | 17 | 17 | 0 | name, postcode, phone, status incl. 3 coming_soon (no JSON-LD) |
| Ultimate Fitness | robots.txt looks normal (`Allow: /`) but the domain itself is dead | n/a | 0 | 0 | 1 (403) | **not a live operator** — `ultimatefitness.co.uk` redirects to a GoDaddy "domain for sale" parking page (`forsale.godaddy.com`), confirming the source doc's note that "Ultimate Fitness" did not resolve to a distinct UK chain |

Totals across the 18 rows above: **1,865 branch records** captured
(113 JD Gyms + 1,752 from this session's 16 live operators), against
2 operators returning zero (Parkwood Leisure — not enumerable from its own
domain; Ultimate Fitness — dead/parked domain).

## Notes on extraction quality
JSON-LD (`LocalBusiness`/`Gym`/etc.) was preferred where present and gives
clean address/postcode/coordinates. Where absent (Bannatyne, Total Fitness,
Better/GLL — partial, Places Leisure, Virgin Active, Nuffield — partial,
Third Space), the fallback regex still reliably captures postcode and name
but the phone-number regex occasionally matches non-phone digit strings on
pages with no JSON-LD (observed on a small number of Virgin Active/Third
Space records) — flag for a follow-up tightening pass before this data
is merged into the canonical database, not blocking for this acquisition
pass (facts-only capture, not yet a merge).

## Explicit terms/access clauses encountered
No operator's robots.txt or fetched page carried an explicit scraping
prohibition beyond the standard `Disallow` path rules already tabulated
above. The one directly quotable clause was 24/7 Fitness's IETF
Content-Signal block: `Content-Signal: search=yes, ai-input=yes,
ai-train=yes` under `User-agent: *`, plus its file's framing that
"ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790" — not a
restriction in this case (all three signals are `yes`), but the clearest
formal terms-adjacent text seen this pass. No operator's robots.txt returned
a full-site `Disallow: /` for a generic user agent.

## Access-layer findings (not site behaviour)
Everyone Active, Anytime Fitness, énergie Fitness and Gymbox were NOT
attempted per `03-sources-operators-industry.md`'s standing block list.
Places Leisure's brief-given domain (`places-leisure.org`) is not a real
domain — DNS/proxy-level `connect_rejected`, not a site block; the correct
live domain is `placesleisure.org`, used instead once identified.

## Files written (scratchpad only, per operator directory)
`robots.txt`, one or more `sitemap*.xml`/index HTML pages (enumeration
evidence), `branches.jsonl`, `manifest.json`, `run.log`. Parkwood Leisure and
Ultimate Fitness hold only `manifest.json` (+ `robots.txt`/evidence pages)
recording why no branches exist to fetch.

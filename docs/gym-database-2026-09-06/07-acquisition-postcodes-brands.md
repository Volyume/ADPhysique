# Acquisition Report: ONSPD Postcodes & Wikidata Brands (2026-09-06/07)

Location: `/tmp/claude-0/.../scratchpad/gyms/raw/{postcodes,brands}/` (raw
inputs) and `.../scratchpad/gyms/{postcodes,brands}/` (final outputs).
Continuation of a prior session cut off by an API limit; reused its ONSPD
extraction and re-ran the brand lookup to match spec exactly.

---

## 1. ONS Postcode Directory (ONSPD)

### Release
- **Release found:** ONSPD August 2026 (`ONSPD_AUG_2026_UK.csv`, ArcGIS Hub
  item `9e5a92a3cfb14dc7ad43d6ea7a7b8c7f`, "ONS Postcode Directory (August
  2026)", modified 2026-01 per item metadata, size 253,925,483 bytes as
  listed on the Hub).
- Source discovery: `https://www.arcgis.com/sharing/rest/search?q=ONSPD...`
  and item metadata endpoint `.../content/items/<id>?f=json`.

### Files written (`postcodes/`)
- `onspd-slim.csv` — 2,729,090 data rows (+ header), 179 MB. Columns: pcds,
  lat, long, ctry, rgn, oslaua, bua.
- `district-centroids.csv` — 3,126 outward-code districts (mean lat/long,
  count, modal ctry/rgn/oslaua).
- `sector-centroids.csv` — 12,508 postcode sectors (outward + first inward
  digit; mean lat/long, count).
- `lookups/ctry-lookup.csv` (7 rows), `lookups/rgn-lookup.csv` (9 rows),
  `lookups/lad-lookup.csv` (361 rows), `lookups/bua-lookup.csv` (7,776 rows)
  — extracted from the ONSPD Documents/lookup registers.

### Cleanup
Source zip (~254 MB) and the full unsliced ONSPD CSV were both deleted
after extraction in the prior session; only the four output files above
remain on disk (179.6 MB total). No zip or full CSV found on re-check.

### Licence & attribution (quoted from https://www.ons.gov.uk/methodology/geography/licences)
> Under the terms of the Open Government Licence and UK Government
> Licensing Framework ... if you wish to use or re-use ONS material,
> whether commercially or privately, you may do so freely ... subject to
> the conditions of the Open Government Licence and the Framework.

> Our postcode products (derived from Code-Point® Open) are subject to the
> Open Government Licence. If you also use the Northern Ireland data
> (postcodes starting with "BT"), you need a separate licence for
> commercial use direct from Land and Property Services.

> Source: Office for National Statistics licensed under the Open
> Government Licence v.3.0
> Contains OS data © Crown copyright and database right [year]
> Contains Royal Mail data © Royal Mail copyright and database right [year]

Item-level `licenseInfo` on the Hub points to the same page;
`accessInformation`: "Office for National Statistics".

---

## 2. Brands via Wikidata (CC0)

Endpoint `https://query.wikidata.org/sparql`, UA
`VolyumeGymDirectory/0.1 (+https://volyume.app)`, one combined VALUES query
by label (`rdfs:label`/`skos:altLabel`, `en`) against the 32 spec brand
names (33 rows counting the GLL/Better split), followed by individual
`wbsearchentities` lookups for names not matched, each with 3–30 s backoff
on 429. Output: `brands/wikidata-brands.json`.

### Found (24/33 rows)
PureGym (Q18345898), The Gym Group (Q48815022), JD Gyms (Q112947108),
Nuffield Health (Q7068711), David Lloyd Leisure (Q5236716), Greenwich
Leisure Limited / Better (Q5604859 — corrected from an initial false match
on Q531429, a disambiguation page), Everyone Active (Q113562737), Fitness
First (Q127120), Virgin Active (Q4013942), Bannatyne Group → Wikidata
label "Bannatyne's" (Q24993691), énergie Fitness (Q109855553), Snap
Fitness (Q7547254), Anytime Fitness (Q4778364 — corrected from an initial
false match on Q114544401, a TV episode), Village Hotels (Q16963550),
Total Fitness (Q7828019), Gymbox (Q18125924), Third Space (Q112671088),
F45 Training (Q64390973), CrossFit (Q2072840), Places Leisure
(Q130223830), Everlast Gyms (Q112947134), UFC Gym (Q122511683), 24/7
Fitness (Q112671987 — flagged: Wikidata describes this as a Hong Kong
chain, not confirmed UK), Trainmore (Q138297498 — flagged: Wikidata
describes this as a Netherlands chain, not confirmed UK). Each record
carries QID, label, aliases, official website (P856), parent organisation
(P749) where present.

### Missing (9/33) — no Wikidata item found after multiple label variants
1Rebel, Parkwood Leisure, Freedom Leisure, Serco Leisure, Active Nation,
Fusion Lifestyle, Simply Gym (UK chain — only unrelated French venues of
the same name exist), Ultimate Fitness (the only literal-label match,
Q58239434, is Urijah Faber's unrelated US MMA gym — excluded as a
homonym), Sports Direct Fitness. Each carries a `note` in the JSON stating
the search terms tried and why it was excluded.

---

## Data quality flags
- Two initial matches were homonym false positives and were corrected by
  re-search: "Better" (Q531429, disambiguation page) → Greenwich Leisure
  Limited (Q5604859); "Anytime Fitness" (Q114544401, *Undercover Boss*
  episode) → the actual franchise (Q4778364).
- 24/7 Fitness and Trainmore matched real gym-chain entities but Wikidata
  describes both as operating outside the UK (Hong Kong; Netherlands) —
  flagged, not excluded, since the exact brand name matched.

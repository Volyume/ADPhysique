# UK gym directory — coverage report

Generated 2026-09-07T02:45:15.998Z.

## Headline
- **46817** canonical venues built (801.4% of ukactive's cited 5,842 UK health & fitness clubs, 2026 report — a report estimate/extrapolation, not a census; see docs/gym-database-2026-09-06/03 §4).
- Review queue (GD-23): **3967** likely ({"possible_duplicate":1265,"possible_independent_gym":2702}), **10743** weak/proximity-only ({"possible_duplicate":10743}).

## By nation
- England: 40075
- null: 366
- Northern Ireland: 1353
- Wales: 1854
- Scotland: 3169

## By venue_type
- commercial_gym: 5262
- health_club: 401
- leisure_centre: 2583
- other_fitness: 7808
- boutique_studio: 1002
- independent_gym: 16759
- womens_gym: 214
- hotel_gym: 19
- crossfit_functional: 508
- martial_arts: 11863
- strength_gym: 343
- university_gym: 55

## Source count (single- vs multi-source corroborated)
- 1 source(s): 41147
- 2+ source(s): 5670

## Coordinate source
- source: 46685
- postcode_sector: 82
- none: 50

## Area source (GD-21: postcode vs nearest-sector fallback)
- postcode: 42520
- nearest_sector: 4037
- null: 260

## Local authority — top 10 / bottom 10 (of those with >=1 venue)
Top: Birmingham (571), Leeds (554), Cornwall (490), Buckinghamshire (460), North Yorkshire (458), Somerset (429), Glasgow City (423), Wiltshire (409), Bristol, City of (397), Westminster (389)
Bottom: Isles of Scilly (1), Shetland Islands (6), Orkney Islands (6), Na h-Eileanan Siar (11), Clackmannanshire (27), East Renfrewshire (28), Blaenau Gwent (28), Merthyr Tydfil (31), Ceredigion (33), Boston (34)

## Postcode area — top 10 / bottom 10
Top: BT (1358), B (1137), SW (926), S (848), NE (836), M (832), BS (810), NG (805), BN (779), G (762)
Bottom: NPT (1), Z (1), U (1), JE (1), BF (1), C (2), F (2), ZE (6), HS (11), KW (14)

## Operator branch counts — own feed vs any source (GD-19) vs docs/03 research
- jd-gyms: own feed 103, any source 134, researched 114, operator_unconfirmed 31
- the-gym-group: own feed 267, any source 379, researched 264, operator_unconfirmed 112
- total-fitness: own feed 2, any source 56, researched 15, operator_unconfirmed 54
- third-space: own feed 15, any source 15, researched 15, operator_unconfirmed 1
- fitness-first: own feed 21, any source 194, researched 39, operator_unconfirmed 173
- 247-fitness: own feed 1, any source 12, researched not established, operator_unconfirmed 11
- nuffield-health: own feed 108, any source 130, researched not established, operator_unconfirmed 22
- puregym: own feed 480, any source 501, researched not established, operator_unconfirmed 22
- david-lloyd: own feed 107, any source 128, researched not established, operator_unconfirmed 21
- freedom-leisure: own feed 115, any source 123, researched not established, operator_unconfirmed 8
- snap-fitness: own feed 107, any source 120, researched not established, operator_unconfirmed 13
- better-gll (brand: better): own feed 164, any source 252, researched not established, operator_unconfirmed 89
- village-gym: own feed 34, any source 40, researched not established, operator_unconfirmed 6
- places-leisure: own feed 86, any source 96, researched not established, operator_unconfirmed 10
- bannatyne: own feed 65, any source 76, researched not established, operator_unconfirmed 11
- virgin-active: own feed 27, any source 74, researched not established, operator_unconfirmed 47
- ultimate-fitness: own feed 0, any source 16, researched not established, operator_unconfirmed 0
- anytime-fitness: own feed 0, any source 243, researched not established, operator_unconfirmed 0
- everyone-active: own feed 0, any source 166, researched not established, operator_unconfirmed 0
- energie: own feed 0, any source 127, researched not established, operator_unconfirmed 0
- everlast: own feed 0, any source 77, researched not established, operator_unconfirmed 0
- parkwood-leisure: own feed 0, any source 13, researched not established, operator_unconfirmed 0
- simply-gym: own feed 0, any source 21, researched not established, operator_unconfirmed 0
- crossfit: own feed 0, any source 474, researched not established, operator_unconfirmed 0
- gymbox: own feed 0, any source 12, researched not established, operator_unconfirmed 0
- serco-leisure: own feed 0, any source 4, researched not established, operator_unconfirmed 0
- f45: own feed 0, any source 62, researched not established, operator_unconfirmed 0
- 1rebel: own feed 0, any source 11, researched not established, operator_unconfirmed 0

## Operator feed absence (GD-26 point 3)
A venue carrying a brand whose operator feed was acquired complete
(manifest `found > 0`, at most 3 failures) but with no member from that
operator's own feed gets `verification_status = 'operator_unconfirmed'`
and `needs_review_reason = 'not_in_operator_feed'`. Total: **631**.
- jd-gyms: 31
- the-gym-group: 112
- total-fitness: 54
- third-space: 1
- fitness-first: 173
- 247-fitness: 11
- nuffield-health: 22
- puregym: 22
- david-lloyd: 21
- freedom-leisure: 8
- snap-fitness: 13
- better-gll: 89
- village-gym: 6
- places-leisure: 10
- bannatyne: 11
- virgin-active: 47

## Name sanity (GD-25)
Raw operator feed rejections — raw `branch.name` over 80 characters or 8 tokens, before any pipeline fix (a persistent signal of which operator's feed still carries bad source data; the pipeline fixes the display name from these regardless, via the URL slug):
- 247-fitness: 0/9 raw names rejected (9 branches total)
- bannatyne: 0/65 raw names rejected (65 branches total)
- better-gll: 12/192 raw names rejected (193 branches total)
- david-lloyd: 0/119 raw names rejected (119 branches total)
- fitness-first: 0/25 raw names rejected (25 branches total)
- freedom-leisure: 0/129 raw names rejected (129 branches total)
- jd-gyms: 0/113 raw names rejected (113 branches total)
- nuffield-health: 4/133 raw names rejected (133 branches total)
- parkwood-leisure: 0/0 raw names rejected (0 branches total)
- places-leisure: 0/90 raw names rejected (90 branches total)
- puregym: 0/496 raw names rejected (496 branches total)
- snap-fitness: 7/107 raw names rejected (107 branches total)
- the-gym-group: 0/276 raw names rejected (276 branches total)
- third-space: 4/17 raw names rejected (17 branches total)
- total-fitness: 0/16 raw names rejected (16 branches total)
- ultimate-fitness: 0/0 raw names rejected (0 branches total)
- village-gym: 0/35 raw names rejected (35 branches total)
- virgin-active: 0/31 raw names rejected (42 branches total)

Pipeline name-sanity fallbacks applied at normalisation (brand + town used in place of a rejected name): **309** total.
- active_places: 44
- operator:freedom-leisure: 1
- overture: 264

Canonical display names still over 80 characters: **0** (must be 0).

## Named lookups (founder test cases)
- **"Volt Gym" Burscough**: PRESENT — [{"id":"54603096-b9d2-5291-ba8f-727927feed0f","display_name":"Volt Gym","town":"Burscough","postcode":"L40 8TG","source_count":1}]
- **"PureGym Motherwell"**: PRESENT — [{"id":"a9e6d071-0b56-52eb-b1a7-74616113dbc7","display_name":"PureGym Motherwell","town":"Motherwell","postcode":"ML1 1LX","source_count":2}]

# Community product audit (2026-09-07, founder prompt 2)

Founder brief (in chat, 2026-09-07): exhaustive implementation +
competitive product audit of Community, after the visual refinement
(97a1296). Not a redesign. Establish with evidence whether Community is
best-in-class; distinguish missing from underpowered; judge; then
implement only the justified improvements on the existing architecture.

Token rule from the brief: lower-cost agents do every inventory and all
evidence collection; Fable reads to judge only.

Document map (filled as the audit runs):
- `01-client-inventory.md`        Screens, routes, entry points, per-screen actions and states, reachability
- `02-backend-inventory.md`       Cloud tables, RPCs, RLS, functions, rate rails, deletion, applied-vs-written status
- `03-discovery-search-gyms.md`   Search, filters, ranking, suggestion signals, location, gym picker, add-gym, gym intelligence
- `04-graph-messaging-privacy.md` Relationship states, requests, messaging, notifications, deep links, privacy UX, moderation, block propagation
- `05-programmes-stories-feed.md` Programme lifecycle, stories, feed composition, reactions/comments, media, external sharing
- `06-gym-database-coverage.md`   Venue counts by nation/chain/type, sources, licence, identifiers, dedupe, missing-venue methodology
- `07-competitors.md`             Mechanism-level competitor evidence (supplementing docs/social-discovery-2026-09-06/10-14)
- `08-tests-flags.md`             Test and feature-flag inventory for Community
- `09-gym-journey-tests.md`       Founder addition (gym onboarding): search/postcode/town/branch/radius/duplicate tests run against the real dataset and ranker
- `10-gym-finder-ux-research.md`  Founder addition: radius defaults, multi-gym prevalence, venue-picker patterns, evidence for the onboarding UX
- `20-JUDGEMENT.md`               Lead synthesis: capability map, weaknesses, missing vs underpowered, opportunities, priorities
- `30-IMPLEMENTATION.md`          What was built after the judgement, what was rejected, what remains, verification

Founder addition (in chat, 2026-09-07): Community onboarding must ask
"Where do you train?" and resolve to a canonical gym_id; offer "Use my
location" (never required) with progressive radius broadening; search by
name, brand, branch, town, city, postcode with fuzzy matching; branch
identity in results; "Can't find your gym? Add a gym" into the canonical
submission path; main gym plus other gyms investigated; selected vs
declared vs historical vs inferred vs live location kept distinct; no
exact coordinates, current location or person distance exposed; nine
named journeys tested for real. Lanes 09 and 10 gather its evidence.

Agent window: all phase-A agents are READ-ONLY (they write only their
own numbered file here). Recovery path: re-dispatch the same brief.
Tier (founder reaffirmed in chat 2026-09-07: lowest tier that does the job well): Sonnet for mechanism inventories and competitor evidence collection (the lead synthesises),
Haiku for the test/flag inventory (founder order 2026-09-06 on lowest
adequate tier).

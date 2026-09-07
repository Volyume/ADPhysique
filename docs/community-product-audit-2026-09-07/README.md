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
- `20-JUDGEMENT.md`               Lead synthesis: capability map, weaknesses, missing vs underpowered, opportunities, priorities
- `30-IMPLEMENTATION.md`          What was built after the judgement, what was rejected, what remains, verification

Agent window: all phase-A agents are READ-ONLY (they write only their
own numbered file here). Recovery path: re-dispatch the same brief.
Tier: Sonnet for mechanism inventories, Opus for competitor evidence,
Haiku for the test/flag inventory (founder order 2026-09-06 on lowest
adequate tier).

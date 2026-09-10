# 11 -- Research: safety, data-protection and platform-policy deltas

Authority: `README.md` and `20-BLUEPRINT.md` §§3-8 (rulings R1-R6 under
test). Extends `docs/community-safety/CHILDRENS-ACCESS-ASSESSMENT.md`,
`ILLEGAL-CONTENT-RISK-ASSESSMENT.md`, `DSA-SIZE-SELF-ASSESSMENT.md`,
`MODERATION-RUNBOOK.md` §4, `docs/social-discovery-2026-09-06/13-research-
policy-safety-coldstart.md` §§3,4,7 and `docs/community-product-audit-
2026-09-07/50-research-progress-and-rankings.md` §8. Sonnet, read-only.

**Tool note.** WebSearch returned "unavailable" all session after one early
success (confirmed dead with an unrelated control query): a session-level
outage, not a per-topic block. WebFetch worked for most non-government
domains, but ico.org.uk, ofcom.org.uk and eur-lex.europa.eu all 403'd or
returned empty content (Ofcom's 403 already on record in `ILLEGAL-CONTENT-
RISK-ASSESSMENT.md` §4). Claims carry a fresh URL (2026-09-10), a repo
doc's prior verified fetch, or "recalled, unverified" (§11).

## 1. Verdict table

| Ruling | Verdict | Why (one sentence) | Authority |
|---|---|---|---|
| R1 Discipline cohorts incl. physique divisions | **TIGHTEN**: standing signpost on the six physique-division pages, not only reactive calm-mode/ED-flag withhold | Peer-reviewed ED prevalence in physique/bodybuilding populations (28-72% across three studies) leaves the un-flagged majority of an elevated-risk group with no support signal | Mathisen & Sundgot-Borgen 2019; Moro et al. 2026; PMC8759685 (§2) |
| R2 Age-band cohorts | **HOLDS** | A band is a coarser derivation of data already collected, gated by the same `is_minor` mechanism the children's access assessment relies on | `CHILDRENS-ACCESS-ASSESSMENT.md` §5 (§3) |
| R3 Ambient sharing | **TIGHTEN**: enable-moment copy must state the sharing is automatic with no per-workout review, and name the audience; note text must pass the keyword filter | Training data is Article 9 data on the repo's own reading, needing an express, informed act, not a toggle flip; automatic-by-default also revives the "trained more to keep the roster looking good" pressure the cited research names | `13-research...` §4; `50-research...` §8 (§4) |
| R4 Encouragement (Respect) | **TIGHTEN**: the bulk "Respect everyone" RPC must exclude blocked/muted pairs server-side, stated as a build requirement | Peloton's High Five harassment happened because no block existed for the feature; a fan-out RPC is exactly the code shape where a per-item block check gets missed | Peloton High Five case, 2021; Google Play UGC policy (§5) |
| R5 Groups | **TIGHTEN**: state explicitly that invite-only groups get identical moderation coverage to public content | OSA/DSA treat a closed group as user-to-user content, not exempt interpersonal communication | `DSA-SIZE-SELF-ASSESSMENT.md` §6, extended (§6) |
| R6 No ranking by weight/bodyweight/volume | **HOLDS**, confirmed | Every new surface keys on sessions, consistency or streaks, never tonnage or bodyweight | `50-research...` §§8-9; `60-DESIGN...` §2 (§7) |

No STOP. Every ruling holds, or is tightened by a bounded, statable change.

## 2. R1: discipline cohorts, including physique-competition divisions

**Two separate questions.** (a) GDPR: a self-declared tag ("Powerlifting",
"Bikini") is not health data on its face; the ICO inference test
("sensitive attributes inferred with a reasonable degree of certainty",
via `13-research...` §4, 2026-09-06, not re-verified, ico.org.uk 403'd)
reads closer to a hobby than a health marker, so a tag alone does not need
Article 9-grade consent. (b) Product ED-safety is separate, and strong:

Mathisen & Sundgot-Borgen (2019), *Sports* 7(11):236, pmc.ncbi.nlm.nih.gov/
articles/PMC6915661/ (2026-09-10): 28% of physique athletes reported a
previous eating-disorder history versus 11% reference; "self-control
deteriorated post-competition." Moro et al. (2026), *J. Functional
Morphology and Kinesiology*, pmc.ncbi.nlm.nih.gov/articles/PMC13301592/
(2026-09-10): n=60 bodybuilders, 72% reported binge-eating episodes
post-competition; prep behaviour "closely resemble[s] behavioral patterns
observed in eating disorders." "Weight loss practices... female physique
athletes", PMC8759685 (2026-09-10; authors not captured): 37% at risk,
42.4% used two pathogenic weight-control methods, coaches (89%) the
largest influence. Beat UK and NEDA topic pages were unreachable (homepages
loaded, deep pages 403/404), the identical gap already in `13-research...`
§7; substitutes stand: Alliance for Eating Disorders and First Steps ED,
recognised bodies in Beat's category.

**Verdict basis.** The mitigations (facts only; keyword filter narrow to
slurs, self-harm and pro-ED terms; reactive withhold under calm mode/open
ED flag) are sound but reactive only. Given prevalence this high, the six
physique-division pages (blueprint §8) should also carry the standing
Beat UK signpost used elsewhere (CLAUDE.md §2), not gated behind an
already-tripped flag: the evidence behind the lead's own Q1b (blueprint
§12), not a new question. No change to keyword scope recommended.

## 3. R2: age-band cohorts

Server-derived from date of birth already collected at onboarding;
reciprocal; never a minor.

- **ICO data minimisation**: a band is coarser than the date of birth
  already stored; showing it is minimisation, not new collection
  (`13-research...` §4, 2026-09-06; not re-verified, ico.org.uk 403'd).
- **Ofcom age assurance**: attaches to primary-priority content or a duty
  to reliably exclude children from a higher-risk feature, not a
  same-age-band roster of sessions; the exclusion mechanism is the one
  already accepted for every adult-only Community surface
  (`CHILDRENS-ACCESS-ASSESSMENT.md` §5). Recalled, unverified (§11); the
  truth field is unchanged either way, a band does not verify age (§9).

No tighten: reciprocal, never-a-minor, server-derived is conservative already.

## 4. R3: ambient sharing (the log becomes the feed)

**Is workout data health data?** The repo's own prior research already
reads conservatively: "training metrics" are Article 9 data (`13-
research...` §4, 2026-09-06); GDPR recital 35 ("or from other means such
as a medical device or an app") is the standard hook, recalled,
foundational, not re-fetched this session (§11). Holding Volyume to its
own bar, the session payload (`validation.js:89-92`) is treated the same
as the existing "Share my consistency" toggle. Against the ICO consent
standard (specific, informed, unambiguous, withdrawable, via
`13-research...` §4): specific and withdrawable (off stops new items,
offers removal) are met (blueprint §4); unambiguous (an explicit flip) is
met; **informed has a gap**, the copy must state sharing is automatic,
with no per-workout review, and to whom, not just what fields (§10).

**Comparison-harm check.** "Athletes reported running more miles than
intended, and not posting certain runs... a hidden non-participation
pattern" (`50-research...` §8): automation removes the under-reporting a
manual post allows (the founder's intent), but the same finding means
pressure to train more to keep the roster looking active is a designed-for
risk, mitigated by full reversibility and removal on withdrawal. Recommend
adding "toggle disabled shortly after enabling" to the review triggers in
`ILLEGAL-CONTENT-RISK-ASSESSMENT.md` §6.

**Note text** ("Add a note") is free text and must pass the existing
keyword filter and `hasForbiddenKeys` (`validation.js:174-183`) exactly as
a manual post; the blueprint implies this (§4) but should say it. OSA/DSA
posture is otherwise unchanged: no new content type, only volume, since
the structured fields are never free text (`ILLEGAL-CONTENT-RISK-
ASSESSMENT.md` §4 already rates `session`/`pr` kinds).

## 5. R4: encouragement (Respect)

**Peloton High Five, verified in full this session.** InsideHook via Yahoo
Lifestyle, 2021-11-18, yahoo.com/lifestyle/high-five-creeps-peloton-
stopped-102700958.html (2026-09-10). One user received "at least 15-20"
high fives in a 45-minute class from a man following roughly 400 women.
**No block function existed**; a harasser who obtained a user's home
address was told: *"You have in your location line that you were
celebrating today. So really, that's your fault."* The harm was not the
tap; it was the total absence of a way to stop it from one person.

**Why Volyume differs, if built as specified.** Global block already
exists (`ILLEGAL-CONTENT-RISK-ASSESSMENT.md` §3, §5) and the blueprint
states "block and mute stand" for Respect (§5). Google Play's blocking
requirement is drawn around "1:1 user interaction with specific users (for
example, direct messaging, tagging, mentioning, etc.)" (support.google.com/
googleplay/android-developer/answer/9876937, 2026-09-10, verbatim; also
`13-research...` §2); a Respect tap, aimed at one named person and visible
to them, is the nearest analogue to "tagging" here, so the guarantee is
required, not advisory.

**Tighten, say how.** `community_respect_all` (blueprint §7) is a fan-out
write touching every roster row at once, unlike any single-target RPC.
State as a build requirement: it must exclude, server-side, any pair where
either party has blocked or muted the other, before sending a Respect.
Notification harm is already sourced (`10-research-best-communities.md`
item 20, Prosocial Design Network; Courier), matched by the blueprint's
daily-digest batching (§5). Ofcom's "contact feature" duty is recalled,
unverified (ofcom.org.uk 403'd; §11): a Respect tap sits inside the
harassment/stalking category, already rated low-medium and mitigated by
block, report and moderator review (`ILLEGAL-CONTENT-RISK-ASSESSMENT.md`
§4 cat. 4), one more interaction inside an assessed category.

## 6. R5: groups (Together this week, group audiences)

**No-shame/ED-safety**: "Together this week" sums members' sessions against
summed planned sessions; non-sharers are excluded, never counted as zero
(blueprint §6), matching the validated "sum of individual outcomes"
pattern (`10-research-best-communities.md` item 6, Chess.com Club Matches)
and the safest row in the metrics table (`50-research...` §9).

**Does invite-only change OSA/DSA duties?** Not re-verified against
primary text (403s, WebSearch outage; §11); reasoned by extension from the
repo's own DSA test (`DSA-SIZE-SELF-ASSESSMENT.md` §6): strict 1:1
messaging is the narrow case that may sit outside "dissemination to the
public" scope, since the recipient is chosen per message. A group does not
fit: membership is an ongoing list, not a per-post choice, so group
content sits inside the same scope as public posts, matching how groups
are already built (`target_kind='group'` already accepted, `60-DESIGN-
PROGRESS-COMMUNITY.md` §3). **Tighten, say how**: state explicitly, so it
cannot drift with a future "it's private, go easy" assumption, that
invite-only groups get identical moderation coverage.

## 7. R6: no ranking by weight, bodyweight or volume (confirmed)

Cohort rosters (R1, R2) rank only by the existing week/month/consistency
windows, never tonnage (`60-DESIGN-PROGRESS-COMMUNITY.md` §2); PR moments
(R3) are never a table ("No lift is ever ranked", blueprint §4), matching
the validated Untappd-style reaction pattern, not the excluded "Best
lift/1RM, total volume/tonnage" row (`50-research...` §9, rated N);
Together this week (R5) sums, never ranks; Respect (R4) carries no metric,
no reintroduction found.

## 8. Apple 1.2 / Google Play UGC compliance checklist

| Requirement | Already in place | New obligation from the revamp |
|---|---|---|
| Filter objectionable content before posting | Shared keyword filter, client + SQL (`keywordFilter.js`; `ILLEGAL-CONTENT-RISK-ASSESSMENT.md` §5) | Confirm it runs on group names and the ambient item's note (R3) |
| In-app report, timely response | Fixed-reason report, 3-report auto-hide, 24h target, moderator queue (`DSA-SIZE-SELF-ASSESSMENT.md` §3) | Extend `target_kind` to auto `session`/`pr` items and group posts; state it |
| Block abusive users | Two-way invisible block (`ILLEGAL-CONTENT-RISK-ASSESSMENT.md` §3, §5) | Must provably cover Respect and the new bulk RPC server-side (R4) |
| Published contact information | support@volyume.app (`DSA-SIZE-SELF-ASSESSMENT.md` §7) | None |
| No objectification/hot-or-not/bullying pattern | No image upload anywhere in Community (`ILLEGAL-CONTENT-RISK-ASSESSMENT.md` §3) | Cohort/group pages stay facts-only (blueprint §8); no photo or rating mechanic |
| Terms accepted before UGC | Community Rules accepted at Join (`DSA-SIZE-SELF-ASSESSMENT.md` §5) | Rules text rewritten for cohorts/ambient/groups/Respect, re-accepted (blueprint §8) |
| Blocking for 1:1-style interaction (tag/mention-shaped) | Messaging block (`ILLEGAL-CONTENT-RISK-ASSESSMENT.md` §3) | Respect is the nearest analogue; same guarantee required (R4) |
| Health-data disclosure, no third-party ad use (Apple 5.1.3) | No PII to Sentry/analytics, EU-Dublin residency (CLAUDE.md §1) | Ambient data now discloses to other users, not only Volyume; name it in consent copy (§10) |

## 9. Truth fields

**REAL-DISABLED-USER-VALIDATED.** Unrelated to this campaign; stays **NO**
as recorded in `docs/capability-campaign-25-2026-08-20/CAPABILITY-
COVERAGE-REGISTRY.md`. No cohort, ambient-sharing, group or Respect
mechanism here has been used or validated by real disabled users; this
research is not such validation and converts only through CC-F5.

**Clinical review.** Per founder law (no outside-party dependencies,
GC-D12), the ED-safety reasoning here (§2, §4) is resolved internally from
peer-reviewed research and recognised charities, never a clinician's
sign-off, and none was sought. **No clinical review** of R1-R6 exists or
is pending: the permanent shape of this question, never "outstanding."

**Children's access.** Unchanged. Volyume remains **likely accessed by
children**, `REAL-USER-AGE-VERIFICATION = NO`: age is self-declared, never
checked externally. R2's age bands display already-collected data behind
the same `is_minor` gate that already excludes minors elsewhere; this does
not verify age and must never be described as strengthening assurance.

## 10. Consent wording

**At Join.** The Rules text rewrite the blueprint already specifies (§8) is
required: the existing accepted text still frames Community as it stood
before this revamp. No further Join-screen gate is needed; the two toggles
below are a separate, later consent moment (training profile).

**The two toggles**, in house voice (`CommunityTrainingProfileScreen.js:
97-102`), close the informed-consent gap at §4, both naming that data
goes to other people, the second naming the automatic mechanism plainly:

- **Share my consistency**: "Shows your training days, sessions and
  streaks to people who can see your profile. Never your weight, food or
  photos."
- **Share what I did**: "Turns each finished workout into an activity item
  for the audience you choose, automatically, with nothing to post
  yourself. Off by default. Turn it off any time and remove what you've
  already shared."

## 11. Unverified items (recalled, not fresh-verified this session)

- ICO text on inferred special category data, the consent standard,
  Article 9 wording, Ofcom's age-assurance/contact-feature guidance, GDPR
  recital 35 and DSA recital 14: ico.org.uk and ofcom.org.uk both 403'd,
  WebSearch dead on every retry. Drawn from `13-research...` §4
  (2026-09-06) plus recalled, foundational GDPR/OSA/DSA text (§2-§6); the
  DSA point extends `DSA-SIZE-SELF-ASSESSMENT.md` §6's own verified test.
- Beat UK and NEDA topic pages on exercise/competition: homepages loaded,
  deeper pages 403/404, the gap already in `13-research...` §7; substituted
  with peer-reviewed sources and the already-verified Alliance for Eating
  Disorders / First Steps ED (§2). Also untested: whether Apple's UGC
  age-rating questionnaire raises Volyume's store age band once this
  ships, an existing flag, `13-research...` §1.

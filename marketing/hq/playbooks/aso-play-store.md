# Playbook: ASO — Google Play

**Owner agent:** aso-analyst (sonnet), with content-writer (opus) for listing
copy and community-manager (sonnet) for review reply drafts. Gated by
compliance-reviewer. Escalations per OPERATING-CHARTER §4 and §8.

---

## Purpose

Google Play is Volyume's only live storefront (PRODUCT-FACTS §A: iOS is
TestFlight-only, never advertised as available). ASO is the highest-leverage
channel available today because it converts intent that already exists — the
job is to be found, be trusted, and not lose visibility, not to create demand.

## How this channel works for Volyume specifically

- Package `app.volyume`, zero users, zero reviews at build date. Store
  visibility for a new listing is driven by relevance (keywords in
  title/short/long description) and by rating once reviews exist.
- The verified research finding: a 4.0+ average rating functions as a
  visibility gate for Play Store algorithmic placement, not just a trust
  signal to browsers. This makes review handling (below) a Tier-1 ASO
  activity, not a side task. Cite the verified research report in
  `reports/` when this claim is used internally; do not restate the figure
  in any public copy unless it is separately verified and added to
  PRODUCT-FACTS.
- Every claim in listing copy must trace to PRODUCT-FACTS (CLAIMS-STANDARDS
  §2). In particular: 551 exercises, 31 plans, "over 29,000 UK foods" (never
  the exact figure — PRODUCT-FACTS §D notes the dataset refreshes weekly),
  free-tier scope (§B), and trial wording exactly as CLAIMS-STANDARDS §3
  states it if the trial is mentioned in listing copy at all.

## What the agents do, step by step

1. **Keyword strategy (aso-analyst).** Starting hypotheses to iterate against
   real Play Console data, not truths to lock in: "workout tracker", "gym
   log", "macro tracker", "weekly check-in", "physique coaching". Track
   which of these actually appear in Play Console search-term data once that
   data exists; drop or promote terms based on evidence, not the initial
   hypothesis list.
2. **Listing iteration process.** The current live title/short/long
   description is founder-approved and stays as the control. aso-analyst
   proposes changes as discrete, labelled experiments (one variable at a
   time: title, short description, or long description — never all three in
   one change) with a stated hypothesis and success metric. content-writer
   drafts the variant copy against PRODUCT-FACTS. compliance-reviewer gates
   it. Any listing copy change is FOUNDER-TAP at minimum (it is public
   copy representing the product) — treat as founder-only until Play
   Console experiment tooling is confirmed available, since a live listing
   change without A/B infrastructure is an irreversible swap, not a
   controlled test.
3. **Screenshots: FROZEN.** The current screenshot set is not touched,
   proposed against, or drafted around until organic traffic volume exists
   to justify a controlled experiment (with a baseline conversion rate to
   test against). creative-designer does not produce alternate screenshot
   sets speculatively. When traffic justifies it, a screenshot experiment is
   proposed as a founder decision before any asset is built.
4. **Reviews and ratings (community-manager drafts, founder or automated
   reply per lane).**
   - Poll reviews at least weekly, without exception — the Play API only
     exposes the last 7 days, so a missed week is unrecoverable data loss,
     not just a delay (OPERATING-CHARTER §3).
   - Reply to every review once Play API access is granted. Replies are
     capped at 350 characters — draft tight, calm, specific replies, no
     generic template dumps.
   - Routine replies (feature questions, general praise, minor bugs) are
     AUTONOMOUS once the Play API is connected (OPERATING-CHARTER §4).
   - Sensitive replies — anything touching health, safety, refunds, or
     visible distress in the review text — are FOUNDER-TAP, always, no
     exception, regardless of how routine the rest of the queue is.
   - No review reply may promise a fix, a refund, or a feature. No reply
     may contain an unverified claim (CLAIMS-STANDARDS §2).
5. **Rank tracking.** Held until an ASO rank-tracking tool is approved and
   purchased by the founder (~£25–30/mo, within the Stage 1 budget envelope
   noted in OPERATING-CHARTER §5). aso-analyst proposes the specific tool as
   a founder decision (name, cost, what it measures) before any spend.
6. **Measurement.** Impressions → listing visits → installs, but only once
   the Play Console data grant exists (OPERATING-CHARTER §6 — installs are
   reported as unavailable, never estimated, until the grant is real).

## Cadence

- Review poll: at least weekly, tighter once volume warrants (§3 of the
  charter).
- Listing experiment proposals: at most one active experiment at a time; a
  new one is not proposed until the last is resolved (win, loss, or
  abandoned) and logged.
- Keyword hypothesis review: monthly, against whatever search-term data
  exists.

## Success / failure — measurable

- **Success:** rating holds at or above 4.0 as review volume grows;
  listing-visit-to-install conversion improves release over release once
  install data exists; every review answered within the 7-day window with
  zero missed-window incidents.
- **Failure:** any 7-day review-poll window missed (logged as a visible
  incident per OPERATING-CHARTER §7); rating drifting below 4.0; a listing
  experiment shipped without a compliance PASS or without founder-tap
  approval; screenshots changed before traffic justifies it.

## Founder actions required

- Grant Play Console data access (installs, search terms, experiment
  tooling).
- Approve/pay for the ASO rank-tracking tool.
- Approve each listing copy experiment (founder-tap) until Play Console
  experiment infrastructure allows a genuine controlled A/B, at which point
  this may be revisited as a delegation question.
- Tap-approve every sensitive review reply.

## Hard boundaries

- Never restate the live listing copy as a "draft" and change it without
  founder-tap sign-off.
- Screenshots frozen — no exceptions, no "quick tweak."
- Never merge trial mechanisms in listing copy (CLAIMS-STANDARDS §3.3).
- Never claim a rating, review count, or user count that isn't real
  (CLAIMS-STANDARDS §5 — invented ratings/counts are prohibited absolutely).
- Never let a review go unanswered past the 7-day API window.
- No spend without founder approval (OPERATING-CHARTER §5).

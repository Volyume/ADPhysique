> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Three May 2026 adjudication questions, resolved at the time; historical. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Open questions resolved

Three open questions left over from Claude's third-pass adjudication
(`BRIEF_C_CLAUDE_ADJUDICATION.md`, Section E). Resolved 2026-05-23.

> **Update 2026-05-25:** the Complete tier and Peak Week module
> referenced below have since been removed under founder override
> 2026-05-25 (2-tier consolidation: Free + Pro only; Peak Week needs
> a human eye, not numbers). The Q&A below remains as the historical
> record of the resolution from 2026-05-23; the active behaviour is
> the 2-tier model documented in `CURRENT_STATUS.md` and `HANDOFF.md`
> section 2.

## Q1: ED-pattern false-positive override path

**Context.** Move #2 introduces an ED-pattern detection state
machine that holds further deficit when multiple risk signals
co-occur. The risk: a user on an aggressive but well-supervised cut
(physique competitor, for example) gets flagged. The lockout reads as
wrong to that user and creates churn in the exact segment the
Advanced protein tier was built for.

**Resolution.** Self-attested goal lock at onboarding, layered above
the existing SCOFF screener.

The mechanism:

- During the goal-selection step of onboarding, users who select
  "physique competition" or "advanced recomp" see an additional
  consent screen: "This goal involves aggressive cuts. By selecting
  it you confirm you are working with a coach or have prior
  experience managing this safely. You can change this at any time."
- Selecting "yes" sets a `goal_lock_advanced = true` flag on the user
  record.
- When `goal_lock_advanced = true`, the ED-pattern detector requires
  **three concurrent signals** instead of two before firing. Threshold
  is raised, not removed.
- The FFM floor (30 kcal/kg FFM/day, Mountjoy 2014/2023) is **never**
  overridden. It fires for everyone regardless of goal lock.
- If the flag does fire under goal-lock conditions, the held-decision
  card includes specific signal text: "We've held your calorie cut
  because you've reported low energy for three weeks alongside rapid
  weight loss. Even on an aggressive cut, sustained low energy is a
  safety signal." User can acknowledge and the engine logs that
  acknowledgement, but the hold remains until signals clear.
- Goal lock can be cleared at any time from the You tab. Clearing
  returns the detector to standard sensitivity within the next weekly
  run.

What this rules out:

- Coach attestation (deferred to phase 2 B2B; phase 1 has no coach
  account model).
- Holding the flag and asking a moderator to review (operational
  load, latency, scope creep).
- Disabling the detector entirely for any goal (creates the harm
  pattern Eikey 2021 documents).

Telemetry: log `goal_lock_advanced` state at every weekly run.
Aggregate flag-firing rate by goal-lock status. Alert if goal-locked
users hit the flag at a rate more than 2x non-locked users, because
that suggests the raised threshold is still too sensitive.

## Q2: Data retention and deletion for ED-pattern flag data

**Context.** UK GDPR Article 17 gives a right to erasure. The
ED-pattern flag is special-category data under Article 9. The FTC
Health Breach Notification Rule (effective 29 July 2024) requires
notification within 60 days for breaches affecting 500+ users on
direct-to-consumer health apps.

**Resolution.** Three-layer policy.

### Layer 1: per-user flag history

- Stored in `ed_pattern_flags(user_id, flag_state, reason, raised_at,
  cleared_at, signals_json)`. RLS scopes reads to `auth.uid()` and
  server-role functions only.
- Deleted with account deletion. The account deletion flow already
  wipes SQLite and Supabase; this table joins that flow.
- 30-day soft-delete tombstone matches the rest of the deletion model
  recorded in `PRODUCTION_READINESS_LOCKED.md`.
- Not exposed in any user-facing UI surface other than the held
  decision card itself. Users cannot manually "clear" a flag; flags
  fade when signals clear over the weekly engine runs.

### Layer 2: aggregate flag-rate metrics

- Stored in a separate `engine_telemetry_daily` table with no
  `user_id` column. Columns: `date`, `active_users`,
  `flag_firing_count`, `flag_firing_rate`, `false_positive_count`
  (manual triage marking), goal-lock-status breakdown.
- Retained indefinitely. Anonymised at write time. No PII, no
  re-identification risk.
- Used for the engine dashboards in `PRODUCTION_READINESS_LOCKED.md`.

### Layer 3: privacy policy and breach notification

- Privacy policy gains an explicit Article 9 consent screen at
  signup, named "Health and nutrition data consent." Separate from
  the ToS click-through. Lists the categories: weight, body
  composition, dietary intake, energy and recovery scores, ED-pattern
  detection signals.
- Privacy policy includes the FTC HBNR notification language: for
  breaches affecting 500+ users, Volyume notifies users and the FTC
  simultaneously, without unreasonable delay, no later than 60
  calendar days after discovery.
- The `ed_pattern_flags` table is named in the privacy policy as the
  most sensitive table and the one that triggers the highest-priority
  incident response if it leaks.
- Quarterly access audit: which service roles have read access to
  `ed_pattern_flags`? Confirmed against the principle of least
  privilege.

Operational requirement before move #2 ships: incident-response
runbook covering an `ed_pattern_flags` breach scenario, with named
escalation contacts and notification templates ready to send.

## Q3: Complete-tier pricing differential justification

**Context.** Complete is priced at £3.49 founders / £6.99 standard
versus Pro's £1.49 founders / £2.99 standard. With the open beta
window now locked at Pro £0.99 / Complete £1.99, the spread above Pro
needs explicit feature backing in surface copy.

**Resolution.** The differential is now backed by six named
Complete-only features (already locked in
`COMPLETE_TIER_SCOPE_LOCKED.md`):

1. Unlimited history (Pro: 90 days, Free: 30 days).
2. Peak Week module.
3. Block planning beyond current block.
4. Photo progress timeline.
5. Body composition charts plus export.
6. Coach link (B2B, phase two).
7. Share-pack PDF for coach handover (in addition to CSV).
8. Priority support.

### Surface copy

The Complete upgrade card uses one of two locked variants depending
on context. Both under 25 words. Neither uses jargon-blocklist terms.

**Variant A: feature-led (default for upgrade modals).**

"Complete keeps everything Pro does, then adds a year of memory,
Peak Week planning, body composition charts, photos, and your coach
in the loop."

**Variant B: outcome-led (default for cascade hold gates).**

"Complete is for when you're serious. Deeper planning, longer
history, photos, body composition tracking, and a share pack for
your coach."

### Pricing comparison strip

When Pro and Complete appear side by side, the comparison strip
under the prices shows three differences only (not the full list,
because list length kills conversion):

- "Unlimited history" vs "90 days"
- "Peak Week and block planning" vs "Current block only"
- "Photos and coach handover" vs "CSV export"

Full feature comparison sits one tap deeper, behind a "See all
differences" link.

### Founder-facing pricing justification

This is the internal narrative, never on surface:

- Pro is the engine, free of the guesswork that comes from training
  without food data.
- Complete is the engine plus what a coach would want to see: a year
  of memory, planning beyond the current block, body composition
  tracking, photos, and a clean handover pack.
- The £3.49 to £6.99 spread above Pro reflects three things the
  serious user pays for: longer memory, deeper planning surfaces, and
  the coach-handoff workflow.

## What this unblocks

- Move #2 (ED-pattern detection) is now fully scoped. Q1 answers the
  override path, Q2 answers the retention policy.
- Move #5 (three-tier infrastructure) can start work on the Complete
  surfaces now that pricing copy is locked.
- The privacy policy revision can land alongside move #1, not after.

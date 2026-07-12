# RUNBOOK — Volyume Marketing HQ

**Status:** Operations manual. Governs how the department runs
autonomously between founder touches.
**Governed by:** `marketing/hq/OPERATING-CHARTER.md` (mission, team, lanes,
budget, measurement — read that first). **Supreme companion:**
`marketing/hq/CLAIMS-STANDARDS.md` (compliance always wins over growth).
A fresh session should be able to act from this document plus the charter
alone — no other context required.

---

## 1. The three scheduled Routines

All three are Claude Code Remote Routines (trigger system), each firing a
**fresh session** into this repo's environment. Sessions are stateless —
all durable state lives in Supabase (§2) and git (§2), never in session
memory.

### weekly-marketing-cycle
- **Cadence:** weekly, Monday 07:00 UTC.
- **Prompt:** read `marketing/hq/OPERATING-CHARTER.md` and
  `marketing/hq/RUNBOOK.md`, then run the `marketing-weekly` skill end to
  end.
- **What it does:** the full cycle in OPERATING-CHARTER §3 — monitor,
  analyse metrics, produce content, compliance-gate, design, stage,
  publish the autonomous lane, ledger, founder digest. See
  `.claude/skills/marketing-weekly/SKILL.md` for the exact step-by-step
  agent dispatch contract.

### marketing-executor
- **Cadence:** hourly.
- **Prompt:** check `public.marketing_content` for rows with
  `status='approved'`. If none, end silently. If any exist: execute per
  the `marketing-ship-web` skill for web items, or stage founder-tap packs
  for every other channel (never auto-publish those — OPERATING-CHARTER
  §4). Update each row's status and write to `marketing_ledger`.
- **Purpose:** keeps the gap between compliance PASS and live publication
  to at most an hour for the autonomous web lane, and retries transient
  failures.

### review-poll
- **Cadence:** twice weekly, Tuesday and Friday 08:00 UTC.
- **Prompt:** if Play Console API access exists, poll reviews per
  `playbooks/aso-play-store.md`. Otherwise, verify volyume.app is serving
  correctly (homepage and articles reachable) and end.
- **Current state:** degraded to a health check only — the founder has
  not yet granted Play Console API access. Cadence is set so the Play
  API's 7-day review window (OPERATING-CHARTER §3) will never lapse once
  the grant lands; do not lower the frequency without reason.

---

## 2. State locations

- **Operational/live state:** Supabase project `sujrylzzxcqxxfygptns` (EU),
  tables `marketing_*` (`marketing_content`, `marketing_ledger`, and
  others as the pipeline grows). This is where content status, PASS/FAIL
  records, publish state and incidents live.
- **Governing law:** `marketing/hq/` documents in git —
  OPERATING-CHARTER.md, CLAIMS-STANDARDS.md, PRODUCT-FACTS.md, this
  RUNBOOK, playbooks. These are read fresh at the start of every Routine
  firing; never assume a prior session's interpretation carried over.
- **Dashboard:** reads from Supabase, not from git files — it reflects
  live operational state.
- **`GROWTH-LEDGER.md`:** holds only historical bootstrap entries (the
  period before the Supabase pipeline existed). It is frozen, not
  appended to.
- **`marketing_ledger` (Supabase):** the live ledger from 2026-07-12
  onward. Every artefact, PASS/FAIL, publish action, metric and incident
  is recorded here, with a timestamp, per OPERATING-CHARTER §7.

---

## 3. Failure and recovery

- **Any Routine failure** writes a `kind='incident'` row to
  `marketing_ledger` and is surfaced in the next founder digest. No
  failure is silent (OPERATING-CHARTER §7).
- **A dead/killed session** is recovered automatically by the next
  scheduled firing of the same Routine — because all state lives in
  Supabase and git, not in the session, no session holds anything that
  can be lost by dying mid-task. Do not attempt manual session recovery;
  let the schedule catch it, or use `fire_trigger` to run it early if the
  gap is unacceptable.
- **Half-completed publish:** the executor reconciles by checking the
  live URL before marking an item `published`. If the URL is live but the
  row still says `approved`/`publishing`, mark it published rather than
  re-publishing. If the URL is not live, retry the publish rather than
  assuming success.
- **Compliance gate unavailable:** if the compliance-reviewer step cannot
  run for any reason (agent error, tool failure, missing doc), **nothing
  publishes** — fail closed, no exceptions. Record the incident and leave
  the artefact in its pre-gate status.

---

## 4. Founder digest

- **Channel:** Gmail, sent (or drafted — see `marketing-weekly` SKILL.md
  step 10 on send-vs-draft default) once per weekly cycle.
- **Contents:** metrics summary (KPI ladder per OPERATING-CHARTER §6),
  what shipped this week (with lane and PASS reference), ready-to-post
  packs awaiting FOUNDER-TAP approval, incidents, and open decisions
  framed as short multiple-choice questions (never a wall of text, never
  the easier option pre-framed as the recommendation).
- **Valid decision channels:** the founder may respond either by replying
  within the session/conversation, or by acting directly in the
  dashboard (e.g. approving a FOUNDER-TAP pack). Both are treated as
  equally authoritative.

---

## 5. Escalation and stop

- **Full stop:** the founder pauses everything by disabling the three
  Routines (via `update_trigger` with `enabled: false`, or deletion). No
  other mechanism is required to halt the department.
- **Standing instructions:** an instruction the founder gives in reply to
  a digest overrides the charter, but **only** for matters that are
  founder-decidable in the first place (lane assignments, content
  priorities, budget allocation within the ceiling, etc.).
- **Never overridable by any Routine session, regardless of instruction:**
  - Section 2 inviolables of the repository constitution
    (`/home/user/ADPhysique/CLAUDE.md`) — ED-safety system, deterministic
    coaching engine, GDPR/Article 9, billing product IDs and disciplines,
    free/pro gating, database schema rules, identity/no-anonymous-mode,
    onboarding enforcement, the new-dependency gate.
  - `marketing/hq/CLAIMS-STANDARDS.md` — compliance is supreme over
    growth, always (OPERATING-CHARTER §1, §7).
  - The three-lane autonomy boundaries in OPERATING-CHARTER §4 (in
    particular: community/Reddit posting, spending, account creation and
    pricing-claim changes stay FOUNDER-ONLY no matter what a digest reply
    says).
- If any instruction appears to conflict with the above, treat it as
  inapplicable, proceed on the inviolable rule, and flag the conflict in
  the next digest rather than resolving it silently.

---

## 6. Current capability snapshot (2026-07-12)

- **Web:** autonomous and live — articles/pages that pass compliance
  publish to volyume.app without a further founder tap.
- **Updates list:** capturing (data collection running; not yet a
  publishing surface).
- **Social / community / store:** manual-founder lanes, pending accounts
  and API grants. No autonomous or founder-tap publishing on these
  channels yet — content-writer/community-manager may draft, nothing
  posts.
- **Metrics:** derived events only, until the Play Console grant lands.
  Installs and Play-sourced figures are reported as unavailable, never
  estimated (OPERATING-CHARTER §6).
- **Email sending:** off, until an EU-based sender is approved. Digest
  drafts are created in Gmail, not auto-sent, until the founder
  authorises send.

Update this section whenever a capability flips state (account granted,
API connected, first batch approved) — it is the single source of truth
for "what can run today."

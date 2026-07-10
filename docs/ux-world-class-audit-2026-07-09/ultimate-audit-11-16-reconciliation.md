# Ultimate-Audit items 11-16: gate reconciliation (2026-07-10)

Extraction (Haiku agent, verbatim from the pass3/pass4 sources) reconciled
against every later decision register. Headline: ALL SIX items already
carry rendered founder decisions in
`docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md` — the
"blocked on a structured founder decision" status in CLAUDE.md refers to
STARTING the builds, not to the content questions, which are answered.

| # | Item | Decided (pass3-v2, verbatim line) | Remaining before build |
|---|------|-----------------------------------|------------------------|
| 11 | Named autonomy modes (Coached/Collaborative/Manual) | NA-coaching-10: "Coached never auto-applies while a safety hold / ED-flag / suppression is active — the decision is shown for the user to confirm; auto-apply resumes only when clear." (:186-187) | Founder go to start. Safety-adjacent build; escalate if it touches the safety modules. |
| 12 | Raw/cooked weight toggle | NA-nutrition-1: "store basis, no conversion." (:75) — no sourced conversion factor needed; the entry records which basis the grams are in. | Founder go to start. |
| 13 | Mid-session swap volume clause | NA-wr-3: "Mid-session swap credits the actual swapped-in exercise's muscle toward weekly volume." (:192) | Founder go; SMALL build, wording confirmed at implementation. |
| 14 | Core-Haptics waveforms (iOS) | NA-cux-19: "Approved in principle — add a managed-Expo Core-Haptics lib (graceful fallback). CLAUDE.md gate: exact package name + licence to be stated for final yes before install." (:188-189). Later D-register kept this gate open (haptics rollout used no new dep). | Package research (name/purpose/licence) then founder final yes. |
| 15 | Timeline food logging | NA-cux-15: "Timeline replaces the meal buckets for everyone." (:67,:190). NA-cux-13 (does food_entries carry time-of-day?) is a code verification, not a decision. | Founder go; LARGE/careful build; verify time-of-day column first. |
| 16 | Micronutrients/NRV (MN-1) | Build "founder-approved full build 2026-07-08" per migrate_109's own header; schema authority resolved (migrations canonical). PARTIALLY BUILT: local v58 micronutrient columns + cloud migrate_109 exist. D12 (2026-07-09) REMOVED the diary micros panel — display lives elsewhere (per-food detail). | Founder go on completing the remainder (seed micro data, per-food display, NRV targets surface). Needs a scoping read of what v58/109 left unfinished. |

Sources: pass4-blueprints-coaching-progress.md:191-360,
pass4-blueprints-nutrition.md:20-28, pass4-blueprints-cardio-ux.md:171-287,
pass4-blueprints-micronutrients.md:1-11, pass4-needs-answer-register.md,
pass3-v2-founder-decisions.md:67,75,79,186-192,
supabase/migrate_109_micronutrient_columns.sql header,
ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md (D12, haptics row).

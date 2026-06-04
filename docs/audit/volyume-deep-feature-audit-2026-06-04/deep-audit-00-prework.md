# Deep Feature Audit — Pre-work Context Summary

**Document:** deep-audit-00-prework.md
**Date:** 2026-06-04
**Status:** PRE-WORK COMPLETE — master inventory presented, awaiting scope confirmation
**Repo:** `main` @ `b5752ba` (clean working tree, 0/0 with origin at pre-work time)

---

## 0. Directive on prior audits (founder, 2026-06-04)

**This is a fresh audit. Prior audit documents are NOT to be considered.**
The earlier audit corpus under `/docs/audit/` (master audit 2026-05-31,
onboarding, Diary tab, Progress tab, Coach/plan, Cardio integration + QA,
plan-engine rebuild) does **not** constrain this work, is **not** treated as
locked prior decisions, and items it covered are **not** exempt from a fresh
clean-sheet audit. Every screen, feature, component, and facility is audited
from scratch against the current best in the world, regardless of any past
assessment. The only inputs to this audit are (a) the live code as it stands
today and (b) fresh live-web competitor and user-sentiment research performed
per item.

(The locked engineering and voice rules in `CLAUDE.md`, and the locked product
constraints — `#0D0D0D` background, amber-only accent, no gradients,
adherence-neutral colour, no AI-fingerprint copy, no anonymous mode, kg-only
weights — still hold, because those are product/engineering law, not audit
opinions. They bound what a proposal may recommend; they do not pre-judge any
item.)

---

## 1. Rules acknowledged and how they are honoured

| Rule | How it is honoured here |
|------|------------------------|
| NO AGENTS | Every step done directly by me. No sub-agents, no delegation. (Confirmed: the parallel-agent audit used earlier in this session is **not** used for this task.) |
| READ EVERYTHING FIRST | Navigation tree read in full; entire code surface enumerated and structurally mapped; per-item line-by-line reads happen at each item's Step A (the audit process itself mandates re-reading every file relevant to the item). See §4 for the honest read-depth statement. |
| NO FABRICATION | Every code finding cites a file/line read this session. Every research finding will cite a real URL fetched live. Web access is **confirmed working** (test query returned real sources). Where a thing is uncertain it is marked uncertain. |
| NO MINIMISING | Each item audited individually; nothing summarised as "similar applies elsewhere". Full content written to per-item files. |
| ONE BY ONE APPROVAL | After this inventory is confirmed, items are worked sequentially: full audit → full research → full proposal → STOP and present → await explicit approval before the next item. |
| NO CODE UNTIL APPROVED | No app code written, changed, or deleted until a specific proposal is approved. Only after approval is that one item implemented before the next proposal. |

## 2. Environment reality (stated honestly up front)

- **Web research: available.** A live `WebSearch` returned real, citable
  sources (Hevy reviews on justuseapp, Product Hunt, dr-muscle), so the
  mandatory deep competitor/sentiment research is achievable. App Store /
  Reddit / forum content is reachable via `WebSearch` + `WebFetch`.
- **No device / emulator / store / analytics access.** I cannot run the app,
  measure real performance, run VoiceOver/TalkBack on a device, or read
  Volyume's own store reviews (the app is in closed testing, not public). So
  *Volyume-side* findings come from code; *competitor* findings come from
  live web. Any claim I cannot ground, I will mark as such rather than invent.
- **Multi-session.** This audit spans many sessions. Every per-item doc is
  self-contained. At each session start I will read
  `deep-audit-01-master-inventory.md` and `deep-audit-00-approved-proposals.md`
  to know exactly which item is next. No approved item is ever re-audited; no
  item is skipped.

## 3. The product, as read from code

- **Stack:** React Native / Expo (managed), React Navigation (bottom tabs +
  stacks), Zustand store (`src/store/useAppStore.js`), local SQLite
  (`expo-sqlite`) with an append-only `PRAGMA user_version` migration system,
  Supabase (auth in SecureStore, Postgres + RLS, RPCs, Edge Functions),
  Google Play Billing for subscriptions, Sentry + a local telemetry pipeline.
- **Shape:** five-tab app — **Train** (HomeTab), **Plans**, **Diary**,
  **Progress**, **You** (ProfileTab) — gated behind a Welcome → sign-in →
  (Article 9 health consent) → onboarding (Free quick / Pro 5-step) flow.
- **Positioning:** a physique/hypertrophy training app with a generative
  coach (volume-landmark model), an opt-in user-led food + cardio log, an
  adaptive nutrition engine, and an ED/RED-S safety layer. Free vs Pro tiers
  (`PRO_BETA_ACTIVE = true` currently forces every signed-in user to Pro).
- **Design law:** locked dark theme — `background #0D0D0D`, `surface #191917`,
  single accent `primary #F5A623` (amber), no gradients, tiered radii,
  adherence-neutral colour (no green-for-good / red-for-over), WCAG-checked
  contrast tokens (`src/styles/theme.js`).
- **Scale:** 727 tracked files; ~60 screen files, ~60 components (incl.
  `auth/` and `food/`), 264 `src/lib` files across 18 subsystems, 174 Jest
  suites / 2820 tests green at pre-work time.

## 4. Read-depth statement (honest)

For pre-work I read **in full**: `src/navigation/RootNavigator.js` (the
authoritative screen/tab/flow/gating registry), `src/styles/theme.js`
(design tokens), `docs/CURRENT_STATUS.md` §0, and the executive summaries of
the existing sub-audits (read only to understand product history — **not** as
binding decisions, per §0). I **enumerated** the complete code surface (every
screen, component, lib module, by name and directory) to build the inventory.

I did **not** read all 727 files line-by-line in pre-work — that is neither
physically possible in one pass nor how the process is designed. The
exhaustive line-by-line read of every file relevant to an item happens in that
item's **Step A (Current State Audit)**, immediately before its proposal, so
the reading is deepest exactly where it is about to be used. The master
inventory below is complete at the level it needs to be (every auditable item
enumerated); depth comes per item.

## 5. What was read in pre-work (file-level)

- `src/navigation/RootNavigator.js` (1111 lines) — full.
- `src/styles/theme.js` — tokens.
- `docs/CURRENT_STATUS.md` — §0 session log (history/context only).
- Executive summaries: master-audit `00`, onboarding `00`, diary `00`,
  progress `00`, coach-plan `00`, cardio-integration `00`, cardio-qa `00`
  (history/context only; not binding per §0).
- Directory enumeration of `src/screens` (60), `src/components` (+`auth`,
  `food`), `src/lib` (top-level 57 + `cardio`, `food`, `food/sources`,
  `food/normalisers`, `notifications`, `payments`, `telemetry`,
  `observability`, `sync`, `sync/tables`), `src/hooks`, `src/store`,
  `src/styles`.

## 6. Method per item (recap of the agreed process)

Step A current-state audit (read every relevant file; document what exists,
design, UX, flow, integration) → Step B competitor research (live web; the
strongest general competitors plus item-specific leaders; real user sentiment
with quotes + cited sources; platform/standards research) → Step C comparison
(lead / lag / critical gaps / sentiment gaps) → Step D proposal (specific
changes with file refs + evidence, copy changes, design changes, UX/flow
changes, what to keep, impact + effort) → PRESENT → await approval.

---

*Next document: `deep-audit-01-master-inventory.md` — the complete scope.*

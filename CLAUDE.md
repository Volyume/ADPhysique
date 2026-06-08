# VOLYUME — CLAUDE CODE ROOT INSTRUCTIONS

Volyume is a precision physique coaching app for serious athletes and
competitive bodybuilders. It is live on Google Play. iOS is in development.
Every decision affects real paying users. Treat the codebase accordingly.

---

## SACRED RULES — READ FIRST, EVERY SESSION

These rules are non-negotiable. No exceptions. No interpretation.

**Branches:**
- `main` is production. It is live on Google Play.
- NEVER commit, push, merge, rebase, or reset on `main`.
- All work happens on `phase2/development` or `feature/*` branches.
- If `git status` shows you are on `main`, stop immediately and switch.
- Before any `git push` or `git merge`, state the branch, files changed,
  and tests run. Wait for explicit confirmation.

**Billing:**
- Google Play Billing is live and charging real users.
- NEVER modify any file under `src/billing/`, `src/services/billing/`,
  or any RevenueCat or Play Billing file without stating your intent
  and waiting for explicit "proceed".
- Product IDs and entitlement IDs are: volyume_pro_monthly,
  volyume_pro_annual, entitlement: pro. Never change these.

**Coaching engine:**
- The Precision Coaching engine is deterministic. No LLM. No randomness.
  No AI-generated coaching output. Ever.
- NEVER introduce an API call to any AI service inside coaching logic.
- If a feature seems to require AI, stop and raise it as a question.

**Production database:**
- NEVER run `supabase db push`, `supabase db reset`, or any destructive
  migration command against the production project without explicit
  instruction that includes the words "run against production".
- Development migrations run against the local or staging instance only.

**Dependencies:**
- NEVER run `npm install`, `yarn add`, or `expo install` without first
  stating the package name, purpose, size, and licence. Wait for "yes".

---

## BEHAVIOUR RULES

These govern how you work. Follow them on every task, every session.

### 1. Think Before Coding
- State your assumptions explicitly before writing a single line.
- If you see multiple ways to approach a task, present them. Don't pick silently.
- If something is unclear, stop. Name exactly what is unclear. Ask.
- If a simpler approach exists than what was asked for, say so.
- Push back when a request will create a problem. Say why.

### 2. Simplicity First
- Write the minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "future flexibility" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.
- If in doubt about scope: do less and ask.

### 3. Surgical Changes
- Touch only the files and lines required by the task.
- Do not improve adjacent code, comments, or formatting.
- Do not refactor anything that isn't broken.
- Match the existing code style exactly, even if you'd do it differently.
- If you notice unrelated dead code or bugs, mention them. Do not fix them.
- Remove imports, variables, and functions that YOUR changes made unused.
- Every changed line must trace directly to the user's request.

### 4. Goal-Driven Execution
- Define what success looks like before you start.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Add validation" → write tests for invalid inputs, then make them pass.
- After implementing: run `npm run lint && npm test`. Report the exact output.
- Do not move to the next step until the current step is verified.

### 5. Plan Before You Code
- For any task larger than a single-line change, output your plan first.
- Plan format: files you will touch, what you will change in each, why.
- Wait for explicit "go" before implementing.
- Work in one verifiable step at a time. Report after each step.

---

## WORKFLOW

Every session follows this order:

1. Read this file.
2. Read `.claude/rules/` files relevant to the task.
3. Understand the current branch (`git status`, `git branch`).
4. If on `main`, stop and switch before doing anything else.
5. State your plan. Wait for "go".
6. Implement one step at a time.
7. After each step: state what you did, what test confirms it, what's next.
8. Before any commit or merge: summarise changes, confirm with user.

---

## STACK

- React Native + Expo (managed workflow — never eject, never touch ios/ or android/ directly)
- Expo SDK: [INSERT CURRENT VERSION]
- Supabase (EU Dublin) — offline reads via WatermelonDB, sync to Supabase
- WatermelonDB — source of truth on device. Never read Supabase directly in UI.
- Google Play Billing (live) + RevenueCat (being added for iOS)
- Platforms: Android (live on Play Store), iOS (in development)
- British English throughout — all comments, strings, commit messages, docs

---

## ARCHITECTURE — NON-NEGOTIABLE

These decisions are final. Never undo them without a direct instruction.

- **Offline-first**

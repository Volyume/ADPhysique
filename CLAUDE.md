# VOLYUME — CLAUDE CODE ROOT INSTRUCTIONS

Volyume is a precision physique coaching app for serious athletes and
competitive bodybuilders. Live on Google Play. iOS in development.
Every decision affects real paying users. Treat the codebase accordingly.

---

## SACRED RULES — READ FIRST, EVERY SESSION

**Branches:**
- `main` is production. It is live on Google Play.
- NEVER commit, push, merge, rebase, or reset on `main`.
- All work happens on `phase2/development` or `feature/*` branches.
- If `git status` shows `main`, stop immediately and switch.
- Before any `git push` or `git merge`: state branch, files changed,
  tests run. Wait for explicit confirmation before proceeding.

**Billing:**
- Google Play Billing is live and charging real users.
- NEVER modify any file under `src/billing/`, `src/services/billing/`,
  or any RevenueCat or Play Billing file without stating intent
  and waiting for explicit "proceed".
- Product IDs: `volyume_pro_monthly`, `volyume_pro_annual`
- Entitlement: `pro`
- Never change these identifiers.

**Coaching engine:**
- The Precision Coaching engine is deterministic. No LLM. No AI.
- NEVER introduce any AI API call inside coaching logic.
- If a feature seems to require AI, stop and raise it as a question.

**Production database:**
- NEVER run `supabase db push`, `supabase db reset`, or any destructive
  migration against production without explicit instruction containing
  the exact words "run against production".
- All migrations run against local or staging only by default.

**Dependencies:**
- NEVER run `npm install`, `yarn add`, or `expo install` without first
  stating: package name, purpose, bundle size, licence. Wait for "yes".

---

## BEHAVIOUR RULES

### 1. Think Before Coding
- State assumptions explicitly before writing a single line.
- If multiple approaches exist, present them. Never pick silently.
- If something is unclear, stop. Name what is unclear. Ask.
- If a simpler approach exists than what was asked, say so.
- Push back when a request will create a problem. Say why.

### 2. Simplicity First
- Write the minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No future flexibility that was not requested.
- If you write 200 lines and it could be 50, rewrite it.
- When in doubt about scope: do less and ask.

### 3. Surgical Changes
- Touch only the files and lines required by the task.
- Do not improve adjacent code, comments, or formatting.
- Do not refactor anything that is not broken.
- Match existing code style exactly, even if you would do it differently.
- If you notice unrelated bugs or dead code, mention them. Do not fix them.
- Remove imports, variables, and functions YOUR changes made unused.
- Every changed line must trace directly to the user's request.

### 4. Goal-Driven Execution
- Define what success looks like before starting.
- "Fix the bug" means: write a test that reproduces it, then make it pass.
- "Add validation" means: write tests for invalid inputs, then pass them.
- After implementing: run `npm run lint && npm test`. Report exact output.
- Do not move to the next step until the current step is verified.

### 5. Plan Before You Code
- For any task larger than a single-line change: output your plan first.
- Plan format: files you will touch, what you will change in each, why.
- Wait for explicit "go" before implementing.
- Work one verifiable step at a time. Report after each step.

---

## WORKFLOW — EVERY SESSION

1. Read this file.
2. Read `.claude/rules/` files relevant to the task.
3. Check current branch via `git status` and `git branch`.
4. If on `main`, stop and switch before doing anything else.
5. State your plan. Wait for "go".
6. Implement one step at a time.
7. After each step: state what you did, what confirms it works, what is next.
8. Before any commit or merge: summarise changes, wait for confirmation.

---

## STACK

- React Native + Expo managed workflow
- Expo SDK: [INSERT CURRENT VERSION]
- Supabase EU Dublin — RLS enforced, GDPR compliant
- WatermelonDB — offline-first, source of truth on device
- Google Play Billing (live) + RevenueCat (iOS, in progress)
- Platforms: Android live, iOS in development
- Language: British English throughout — all strings, comments, docs

---

## ARCHITECTURE — NON-NEGOTIABLE

These decisions are final. Never undo without explicit instruction.

- Offline-first: every feature works with no internet. Design offline path first.
- WatermelonDB is the UI data source. Components read via observers only.
  Never query Supabase directly from a component.
- Supabase is the cloud sync target. Sync runs via `src/sync/` only.
- Deterministic coaching engine. No probabilistic logic, no AI, no randomness.
- Expo managed workflow only. Never eject. Never touch `ios/` or `android/`.
- EU data residency. No PII outside Supabase EU Dublin without approval.

---

## FREE vs PRO GATING

Free: Plan Library, training builder, workout logging, exercise library,
      personal bests, progress stats.

Pro (must be gated): food diary, barcode scanning, smart meal suggestions,
      nutrition targets, macros, cardio, steps, weekly check-ins,
      Precision Coaching adjustments, division-specific plans,
      all safety systems, wearable integration.

NEVER expose a Pro feature to free users.
NEVER gate a free feature behind Pro.
When in doubt which tier: ask.

---

## QUICK RULES — ALWAYS ACTIVE

**Supabase** (full patterns in `.claude/rules/supabase.md`):
- Every new table: enable RLS + SELECT + write policies
- Every new view: WITH (security_invoker = true) — mandatory
- Use auth.uid() for RLS. Never hardcode user IDs.

**WatermelonDB** (full patterns in `.claude/rules/watermelon.md`):
- Mutations only inside database.write(async () => { }) blocks
- New tables require schema change AND migration file
- Never bump schema version without a migration

**Billing** (full patterns in `.claude/rules/billing.md`):
- Any billing file change: state intent, wait for "proceed"
- Always check entitlement by customerInfo.entitlements.active['pro']
- Never check by product ID

**Expo / React Native:**
- Never modify `ios/` or `android/` directly
- Never suggest expo eject or expo prebuild
- New libraries via expo install only. Confirm SDK compatibility first.
- Lists over 10 items: FlatList not ScrollView
- Images: expo-image with cachePolicy="memory-disk"
- Animations: react-native-reanimated worklets only
- All touch targets minimum 48dp x 48dp

**Visual** (full patterns in `.claude/rules/styling.md`):
- Background: #0D0D0D screens, #1A1A1A cards
- Accent: #F59E0B amber — interactive elements only
- No white backgrounds visible against #0D0D0D
- Card border radius: 12dp. Buttons minimum 48dp height.

**Language:**
- British English in all strings, comments, commits, docs
- colour, behaviour, optimise, organise, analyse, centre, licence
- Variable names may use US spelling if the library requires it

---

## BUILD COMMANDS

npm run start
npm run android
npm run lint
npm run test
npm run typecheck
eas build --platform android --profile preview
eas build --platform ios --profile preview

After any change: run lint and test. Report output. Do not claim done without it.

---

## SAFETY SYSTEMS — DO NOT TOUCH

The ED safety system lives in `src/coaching/safety/`.

NEVER modify, disable, or work around it.
NEVER lower the calorie floor (1,200 kcal women / 1,500 kcal men).
NEVER remove Beat UK signposting.
NEVER change the rapid-loss intervention threshold (1.5% bodyweight/week).
If a task requires touching this system: stop and ask.

---

## ALWAYS ASK BEFORE

- Adding any new dependency
- Changing any architecture decision in this file
- Modifying billing, auth, or sync code
- Creating a new Supabase table or edge function
- Merging anything to `main` or `phase2/development`
- Changing trial structure or Pro gating
- Any change affecting more than 3 files simultaneously
- Anything that feels irreversible

When in doubt: ask. Asking is never wrong. Assuming is almost always wrong.

---

## POINTERS

- Supabase patterns       -> .claude/rules/supabase.md
- WatermelonDB patterns   -> .claude/rules/watermelon.md
- Billing patterns        -> .claude/rules/billing.md
- Visual/styling          -> .claude/rules/styling.md
- Phase 2 rules           -> CLAUDE_PHASE2.md (active on phase2/* branches)
- Architecture reference  -> docs/ARCHITECTURE.md

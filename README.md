# VOLYUME — CLAUDE CODE CONFIG FILES

Drop these files into your Volyume project and Claude Code will
follow precise rules for every session automatically.

---

## FILE STRUCTURE

After installation your project should have:

  volyume/
  CLAUDE.md
  docs/
    rules/
      supabase.md
      watermelon.md
      billing.md
      styling.md
    hooks/
      branch-guard.sh
      billing-guard.sh

---

## INSTALLATION STEPS

1. Copy CLAUDE.md to the root of your Volyume project
   (same level as package.json)

2. Copy the docs/rules/ folder into your existing docs/ folder

3. Copy the docs/hooks/ folder into your existing docs/ folder

4. Open CLAUDE.md and replace this line:
     Expo SDK: [INSERT CURRENT VERSION]
   with your actual Expo SDK version (check package.json)

5. Open Claude Code, navigate to your Volyume project

6. Run /memory to confirm Claude loaded CLAUDE.md

---

## ABOUT THE HOOKS

The two shell scripts in docs/hooks/ are protection scripts.

branch-guard.sh
  Blocks Claude from committing, pushing, or merging on the main branch.
  Prevents accidental production deployments.

billing-guard.sh
  Blocks Claude from editing billing files without stating intent first.
  Prevents accidental changes to live payment code.

To activate the hooks, Claude Code needs them wired into settings.
Ask Claude Code to do this by pasting:

  "Read docs/hooks/branch-guard.sh and docs/hooks/billing-guard.sh.
   Wire both as PreToolUse hooks in the Claude Code settings so they
   run automatically. Make the scripts executable first."

---

## WHAT EACH FILE DOES

CLAUDE.md
  The main instruction file Claude reads every session.
  Contains sacred rules, behaviour rules, stack, architecture,
  workflow, safety system protection, and pointers to rules files.

docs/rules/supabase.md
  RLS patterns, view security, auth patterns, migration rules,
  edge function patterns. Read when working with Supabase files.

docs/rules/watermelon.md
  Write transaction patterns, schema and migration rules,
  query API, observer patterns, offline behaviour.
  Read when working with database files.

docs/rules/billing.md
  Product IDs, entitlement checks, trial logic, restore purchases,
  paywall copy differences, testing procedures.
  Read when working with billing files.

docs/rules/styling.md
  Colour palette, typography, spacing, component specifications,
  dark mode rules. Read when working with screens and components.

docs/hooks/branch-guard.sh
  Blocks dangerous git operations on main branch.

docs/hooks/billing-guard.sh
  Blocks edits to billing files without prior confirmation.

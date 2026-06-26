# VOLYUME — CLAUDE CODE CONFIG

## INSTALL

Copy into your Volyume project:

  CLAUDE.md                    ->  CLAUDE.md
  docs/rules/supabase.md       ->  docs/rules/supabase.md
  docs/rules/billing.md        ->  docs/rules/billing.md
  docs/rules/styling.md        ->  docs/rules/styling.md
  docs/hooks/branch-guard.sh   ->  docs/hooks/branch-guard.sh
  docs/hooks/billing-guard.sh  ->  docs/hooks/billing-guard.sh

## AFTER COPYING

Paste this into Claude Code:

  "Make the hook scripts executable and wire them as PreToolUse hooks
   in Claude Code settings. branch-guard.sh runs on Bash commands.
   billing-guard.sh runs on file write and edit operations."

Then run /memory in Claude Code to confirm CLAUDE.md loaded.

## FILES

CLAUDE.md             Main instructions. Behaviour rules, sacred rules,
                      architecture decisions, free/pro gating, safety system.

docs/rules/           Detailed patterns loaded when working in specific areas.
  supabase.md         RLS, views, auth, migrations, edge functions, sync layer.
  billing.md          Product IDs, trial structure, pricing, paywall copy, testing.
  styling.md          Colours, typography, spacing, components, dark mode rules.

docs/hooks/           Protection scripts that enforce rules automatically.
  branch-guard.sh     Blocks git operations on main branch.
  billing-guard.sh    Blocks billing file edits without prior confirmation.

## PROJECT REFERENCE DOCS

This README only covers the Claude Code config. For the app itself:

  INFRASTRUCTURE.md       Runtime config, schema, billing, security, build/CI.
  ARCHITECTURE.md         Deep technical map (data model, business logic, screens).
  APPMAP.md               Navigation tree + screen inventory (5 tabs, 77 screens).
  VOLYUME_DEEPMAP.md      Feature inventory.
  docs/CURRENT_STATUS.md  Current build/feature status.

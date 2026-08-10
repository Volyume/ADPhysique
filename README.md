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

This README only covers the Claude Code config. For the app itself, the
live authorities are (corrected 2026-08-10, Campaign 4):

  CLAUDE.md                Project constitution: architecture facts,
                           inviolable constraints, conventions, workflow.
  docs/TASKBOARD.md        The single live task source.
  docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md
                           Current campaign position and history.
  supabase/README.md       Migration tracker and cloud-schema authority.

The old root reference docs (INFRASTRUCTURE.md, ARCHITECTURE.md,
APPMAP.md, VOLYUME_DEEPMAP.md, docs/CURRENT_STATUS.md) are point-in-time
snapshots that each now carry a SUPERSEDED banner - useful history, not
current truth.

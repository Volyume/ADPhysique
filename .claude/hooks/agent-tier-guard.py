#!/usr/bin/env python3
"""Agent tier guard (founder rule 2026-07-02).

Blocks any subagent or workflow dispatch that would run at the session
(Fable) tier. Background: agents launched without an explicit `model`
INHERIT the main-loop model, so an 18-agent review fleet once ran at Fable
tier against an explicit founder instruction and burned a large share of a
weekly token allowance. This hook makes that mistake mechanically
impossible rather than a matter of assistant discipline:

  - Agent/Task calls must carry model "sonnet" or "haiku" (and must not be
    forks, which always inherit the parent model).
  - Workflow scripts must set model: 'sonnet' | 'haiku' on EVERY agent()
    call inside them.

Fable runs ONLY in the main loop, hands-on. To lift or loosen this, the
founder edits this file or removes the matcher from .claude/settings.json.
Exit code 2 blocks the call; stderr is shown to the model so it can comply.
"""
import json
import re
import sys

ALLOWED = {"sonnet", "haiku"}

def deny(reason):
    sys.stderr.write(
        f"BLOCKED by .claude/hooks/agent-tier-guard.py (founder rule 2026-07-02): {reason} "
        "Fable runs only in the main loop. Re-issue the call with model 'sonnet' or 'haiku'."
    )
    sys.exit(2)

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # unparseable input: do not break unrelated tooling
    tool = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {}) or {}

    if tool in ("Agent", "Task"):
        if tool_input.get("subagent_type") == "fork":
            deny("fork agents always inherit the parent (Fable) model.")
        model = tool_input.get("model")
        if model not in ALLOWED:
            deny(
                f"Agent dispatched with model={model!r}; omitting model inherits the Fable session tier."
            )

    if tool == "Workflow":
        script = tool_input.get("script") or ""
        script_path = tool_input.get("scriptPath")
        if script_path and not script:
            try:
                with open(script_path, "r", encoding="utf-8") as fh:
                    script = fh.read()
            except Exception:
                deny("workflow script could not be read to verify agent tiers.")
        # Every agent( call must carry an approved model within its options.
        for m in re.finditer(r"\bagent\(", script):
            window = script[m.start(): m.start() + 800]
            model_match = re.search(r"model:\s*['\"](\w+)['\"]", window)
            if not model_match or model_match.group(1) not in ALLOWED:
                deny(
                    "a workflow agent() call has no sonnet/haiku model override, "
                    "so it would inherit the Fable session tier."
                )

    sys.exit(0)

if __name__ == "__main__":
    main()

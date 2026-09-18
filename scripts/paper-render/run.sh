#!/usr/bin/env bash
# scripts/paper-render/run.sh
#
# The one command: bash scripts/paper-render/run.sh
#
# Runs the full paper-render pipeline end to end:
#   1. proves this harness is still invisible to the real test suite / CI
#      (the whole point of living under scripts/, not __tests__/ or tests/);
#   2. clears last run's working state, so a "re-run many times" harness
#      never accumulates seeded users/rows in the working SQLite file or
#      leaves a stale HTML/PNG behind for a screen that no longer mounts;
#   3. runs the Jest driver (seeds the persona + day-zero account, mounts
#      every screen/variant, converts each to HTML);
#   4. screenshots every HTML file with headless Chromium and builds the
#      contact sheet (index.html) and report (report.md).
#
# Safe to re-run any number of times. Never commits, pushes, or touches git
# state -- it only reads the repo and writes into the scratch directories
# below.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

SCRATCH="${PAPER_RENDER_SCRATCH:-/tmp/claude-0/-home-user-ADPhysique/d71ddd7a-c7b0-5d8f-8ef8-fbac54ce6084/scratchpad}"
WORK_DIR="${SCRATCH}/paper-render-work"
OUT_DIR="${PAPER_RENDER_OUT_DIR:-${SCRATCH}/paper-renders}"

echo "[paper-render] repo root: ${REPO_ROOT}"
echo "[paper-render] scratch:   ${SCRATCH}"

echo "[paper-render] checking this harness stays invisible to npm test / CI..."
LEAK_COUNT="$(npx jest --listTests 2>/dev/null | grep -c paper-render || true)"
if [ "${LEAK_COUNT}" != "0" ]; then
  echo "[paper-render] REFUSING TO RUN: npm test's own discovery sees ${LEAK_COUNT} paper-render file(s)." >&2
  echo "[paper-render] This harness must never be picked up by npm test / CI (package.json's jest.testMatch, or this folder's location, has changed)." >&2
  exit 1
fi
echo "[paper-render] confirmed: npx jest --listTests | grep -c paper-render -> 0"

echo "[paper-render] clearing last run's working state (${WORK_DIR})..."
rm -rf "${WORK_DIR}"
mkdir -p "${WORK_DIR}"

echo "[paper-render] seeding + mounting + converting every screen (Jest)..."
npx jest --rootDir "${REPO_ROOT}" --testMatch '**/scripts/paper-render/*.test.js' scripts/paper-render

echo "[paper-render] screenshotting..."
node "${SCRIPT_DIR}/shoot.js"

echo "[paper-render] done. Deliverables in ${OUT_DIR}/ (index.html, report.md, one PNG per screen)."

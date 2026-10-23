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
#   3. runs the Jest driver with the harness's own config (seeds the persona
#      + day-zero account, mounts every screen RootNavigator registers and its
#      extra states, converts each to HTML);
#   4. screenshots every HTML file with headless Chromium at its full height
#      and builds the contact sheet (index.html) and report (report.md);
#   5. the Welcome captures and the store listing screenshots;
#   6. the phone set: 540 px JPEGs and manifest.json.
#
# Where things go (all optional, see paths.js): PAPER_RENDER_SCRATCH (working
# root), PAPER_RENDER_OUT_DIR (PNGs, index.html, report.md),
# PAPER_RENDER_PHONE_DIR (jpg/ and manifest.json). PAPER_RENDER_ONLY runs the
# Jest stage for a few named screens only (no later stages).
#
# Safe to re-run any number of times. Never commits, pushes, or touches git
# state -- it only reads the repo and writes into the scratch directories
# below.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

SCRATCH="${PAPER_RENDER_SCRATCH:-${TMPDIR:-/tmp}/paper-render}"
WORK_DIR="${SCRATCH}/paper-render-work"
OUT_DIR="${PAPER_RENDER_OUT_DIR:-${SCRATCH}/paper-renders}"
PHONE_DIR="${PAPER_RENDER_PHONE_DIR:-${SCRATCH}/phone}"
export PAPER_RENDER_SCRATCH="${SCRATCH}" PAPER_RENDER_OUT_DIR="${OUT_DIR}" PAPER_RENDER_PHONE_DIR="${PHONE_DIR}"

echo "[paper-render] repo root: ${REPO_ROOT}"
echo "[paper-render] scratch:   ${SCRATCH}"
echo "[paper-render] png out:   ${OUT_DIR}"
echo "[paper-render] phone out: ${PHONE_DIR}"

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
npx jest --config "${SCRIPT_DIR}/jest.config.js" scripts/paper-render

if [ -n "${PAPER_RENDER_ONLY:-}" ]; then
  echo "[paper-render] PAPER_RENDER_ONLY is set: HTML written to ${WORK_DIR}/html, later stages skipped."
  exit 0
fi

echo "[paper-render] screenshotting..."
node "${SCRIPT_DIR}/shoot.js"

echo "[paper-render] the Welcome screen's captures..."
node "${SCRIPT_DIR}/welcome.js"

echo "[paper-render] the store listing screenshots..."
node "${SCRIPT_DIR}/store.js"

echo "[paper-render] the phone set (540 px JPEGs + manifest.json)..."
node "${SCRIPT_DIR}/phoneSet.js"

echo "[paper-render] done. Deliverables: ${OUT_DIR}/ (index.html, report.md, one full-height PNG per screen), ${PHONE_DIR}/jpg/ and ${PHONE_DIR}/manifest.json."

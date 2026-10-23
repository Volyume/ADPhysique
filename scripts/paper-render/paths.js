/**
 * scripts/paper-render/paths.js
 *
 * The one place the harness decides where it reads and writes. Every stage
 * (the Jest driver, shoot.js, welcome.js, store.js, phoneSet.js) takes its
 * directories from here, so a run can never write into another session's
 * folder by default.
 *
 *   PAPER_RENDER_SCRATCH     working root (default: <os tmpdir>/paper-render)
 *   PAPER_RENDER_OUT_DIR     where shoot.js writes the full-height PNGs,
 *                            index.html and report.md
 *                            (default: <scratch>/paper-renders)
 *   PAPER_RENDER_PHONE_DIR   where phoneSet.js writes jpg/ and manifest.json
 *                            (default: <scratch>/phone)
 *   PAPER_RENDER_CHROME      the Chromium binary
 *   PAPER_RENDER_ONLY        comma-separated screen names (e.g.
 *                            "HomeScreen,CoachOutputScreen"): the every-screen
 *                            pass renders only these, for a quick look at one
 *                            fix. Unset renders everything.
 *   PAPER_RENDER_NO_FOLD=1   leave the dashed "fold" marker out of the pages
 *
 * Plain Node, no Jest: safe to require from anywhere.
 */
'use strict';

const os = require('node:os');
const path = require('node:path');

const SCRATCH = process.env.PAPER_RENDER_SCRATCH || path.join(os.tmpdir(), 'paper-render');

module.exports = {
  SCRATCH,
  WORK_DIR: path.join(SCRATCH, 'paper-render-work'),
  OUT_DIR: process.env.PAPER_RENDER_OUT_DIR || path.join(SCRATCH, 'paper-renders'),
  PHONE_DIR: process.env.PAPER_RENDER_PHONE_DIR || path.join(SCRATCH, 'phone'),
  CHROME: process.env.PAPER_RENDER_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
};

// sportscotland Spatial Hub credential guard. Pure, no I/O, no network.
// Factored out of sources/sportscotland.mjs for the same reason every other
// adapter's per-row transform lives in lib/transforms.js: Jest in this repo
// cannot dynamic-import a real ESM .mjs adapter (no --experimental-vm-modules),
// so the one piece of sportscotland.mjs's fetch step that needs a unit test
// (GD-27's Access ruling: refuse without SPF_AUTHKEY, before any network
// call) is pulled into this requirable CJS module instead.

/**
 * GD-27 Access: "The Spatial Hub key is a credential: read from the
 * environment (SPF_AUTHKEY) by the adapter at run time, never written to
 * the repo, never logged." Throws with no key; never accepts one as an
 * argument other than via the environment object passed in, and never
 * echoes the key value itself into the thrown message.
 * @param {NodeJS.ProcessEnv} env - process.env, or a fake for testing
 * @returns {string} the authkey
 */
function requireSpfAuthkey(env) {
  const authkey = env && env.SPF_AUTHKEY;
  if (!authkey) {
    throw new Error(
      'sportscotland: SPF_AUTHKEY is not set. A free Spatial Hub account/authkey is required ' +
        '(docs/gym-database-2026-09-06/02-sources-scotland-wales-ni.md Section 1) - refusing to fetch.',
    );
  }
  return authkey;
}

module.exports = { requireSpfAuthkey };

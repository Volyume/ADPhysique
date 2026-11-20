// Passes app.json through unchanged, except for the trial build
// (APP_VARIANT=trial), which installs beside the store app under its own id.
// See scripts/ci/trial-identity.cjs for exactly what changes and why.
const { applyTrialIdentity } = require('./scripts/ci/trial-identity.cjs');

module.exports = ({ config }) => applyTrialIdentity(config, process.env);

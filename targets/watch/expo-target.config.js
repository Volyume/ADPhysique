/**
 * COMP-020 — Apple Watch companion target (@bacons/apple-targets).
 *
 * "Watch App (with companion iOS App)". SwiftUI source lives in this folder;
 * EAS Build handles codesigning. NOTE (blueprint §9): expo-apple-targets issue
 * #175 mis-wires the watch embed/dependency on prebuild — the patch-package
 * workaround in patches/ fixes it; re-verify on each SDK bump.
 *
 * The watch is a thin remote: it renders phone-composed strings and durably
 * queues set events back to the phone over WatchConnectivity. No targets/engine
 * maths ever runs on the wrist.
 */
module.exports = {
  type: 'watch',
  name: 'VolyumeWatch',
  deploymentTarget: '10.0',
};

/**
 * COMP-019 Stage 2 — iOS WidgetKit target (@bacons/apple-targets).
 *
 * Generates a real WidgetKit extension at prebuild/EAS-build time from the Swift
 * in this folder. Shares an App Group with the app so the widget can read the
 * snapshot the JS writer persists (src/lib/widgets/storage.js ->
 * ExtensionStorage). Signing is handled by EAS Build; the App-Group +
 * app.volyume.widget App ID must exist in the EAS credentials (the existing
 * modules/live-activity/ios/widget/README.md documents this provisioning path).
 */
module.exports = {
  type: 'widget',
  name: 'VolyumeWidget',
  entitlements: {
    'com.apple.security.application-groups': ['group.app.volyume.widget'],
  },
};

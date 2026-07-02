/**
 * withVolyumeWidget — Expo config plugin creating the Live Activity widget
 * extension target (E6B, approved 2026-07-02; plan in
 * docs/live-activity-viability-2026-07-02.md §2-3 and docs/LIVE_ACTIVITY_IOS.md).
 *
 * ios/ is gitignored (managed workflow), so the extension target MUST be
 * created at prebuild time. Two mods:
 *   1. a dangerous mod copies the widget Swift sources (from
 *      modules/live-activity/widget/ + the shared attributes from
 *      modules/live-activity/ios/) and a generated Info.plist into
 *      ios/VolyumeWidget/;
 *   2. an Xcode mod registers the VolyumeWidget app-extension target,
 *      compiles those sources, embeds the .appex into the app, and adds the
 *      target dependency.
 *
 * Idempotent on re-prebuild (bails when the target already exists). Uses
 * expo/config-plugins only — no new dependency. Cannot be compile-verified
 * on Linux: the first EAS iOS build is the verification gate, and the
 * founder must FIRST provision the App ID app.volyume.widget with the Live
 * Activities capability plus a distribution profile in EAS credentials, or
 * that build fails at signing (LIVE_ACTIVITY_IOS.md §4-5).
 */
const { withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_NAME = 'VolyumeWidget';
const WIDGET_BUNDLE_ID = 'app.volyume.widget';
const DEPLOYMENT_TARGET = '16.1';

// Swift sources compiled into the EXTENSION target. The shared attributes
// file is compiled into both the app pod (via the LiveActivity podspec) and
// the extension — the standard ActivityKit pattern, since both sides need
// the same ActivityAttributes type.
const WIDGET_SOURCES = [
  { from: 'modules/live-activity/widget/VolyumeWidgetBundle.swift', to: 'VolyumeWidgetBundle.swift' },
  { from: 'modules/live-activity/widget/VolyumeRestTimerLiveActivity.swift', to: 'VolyumeRestTimerLiveActivity.swift' },
  { from: 'modules/live-activity/ios/VolyumeRestTimerAttributes.swift', to: 'VolyumeRestTimerAttributes.swift' },
];

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Volyume</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSSupportsLiveActivities</key>
  <true/>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;

function copyWidgetFiles(projectRoot, iosRoot) {
  const dest = path.join(iosRoot, WIDGET_NAME);
  fs.mkdirSync(dest, { recursive: true });
  for (const { from, to } of WIDGET_SOURCES) {
    fs.copyFileSync(path.join(projectRoot, from), path.join(dest, to));
  }
  fs.writeFileSync(path.join(dest, 'Info.plist'), INFO_PLIST);
}

function addWidgetTarget(proj, appVersion) {
  // Idempotent: a re-run of prebuild over an existing project must not
  // duplicate the target.
  if (proj.pbxTargetByName(WIDGET_NAME)) return proj;

  // Known xcode-lib quirk: addTarget throws when these sections are absent
  // from a template project.
  const objects = proj.hash.project.objects;
  objects.PBXTargetDependency = objects.PBXTargetDependency || {};
  objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};

  const target = proj.addTarget(WIDGET_NAME, 'app_extension', WIDGET_NAME, WIDGET_BUNDLE_ID);

  // Group with the copied files, attached to the project's main group so
  // the references resolve relative to ios/VolyumeWidget/.
  const files = WIDGET_SOURCES.map((s) => s.to).concat(['Info.plist']);
  const group = proj.addPbxGroup(files, WIDGET_NAME, WIDGET_NAME);
  const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
  proj.addToPbxGroup(group.uuid, mainGroupId);

  // Build phases: compile the three Swift files; empty frameworks/resources
  // phases keep Xcode happy (WidgetKit/SwiftUI link via import).
  const swiftFiles = WIDGET_SOURCES.map((s) => s.to);
  proj.addBuildPhase(swiftFiles, 'PBXSourcesBuildPhase', 'Sources', target.uuid);
  proj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
  proj.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

  // Embed the .appex into the app and make the app build depend on it.
  const appTarget = proj.getFirstTarget();
  proj.addBuildPhase(
    [`${WIDGET_NAME}.appex`],
    'PBXCopyFilesBuildPhase',
    'Embed Foundation Extensions',
    appTarget.uuid,
    'app_extension'
  );
  proj.addTargetDependency(appTarget.uuid, [target.uuid]);

  // Build settings for the extension's configurations only (matched by the
  // product name addTarget stamped on them).
  const configurations = proj.pbxXCBuildConfigurationSection();
  for (const key of Object.keys(configurations)) {
    const entry = configurations[key];
    if (!entry || typeof entry !== 'object' || !entry.buildSettings) continue;
    const bs = entry.buildSettings;
    if (String(bs.PRODUCT_NAME ?? '').replace(/"/g, '') !== WIDGET_NAME) continue;
    bs.INFOPLIST_FILE = `${WIDGET_NAME}/Info.plist`;
    bs.GENERATE_INFOPLIST_FILE = 'NO';
    bs.PRODUCT_BUNDLE_IDENTIFIER = WIDGET_BUNDLE_ID;
    bs.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
    bs.SWIFT_VERSION = '5.0';
    bs.TARGETED_DEVICE_FAMILY = '"1,2"';
    bs.MARKETING_VERSION = appVersion || '1.0.0';
    bs.CURRENT_PROJECT_VERSION = '1';
    bs.SKIP_INSTALL = 'YES';
  }
  return proj;
}

module.exports = function withVolyumeWidget(config) {
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      copyWidgetFiles(cfg.modRequest.projectRoot, cfg.modRequest.platformProjectRoot);
      return cfg;
    },
  ]);
  config = withXcodeProject(config, (cfg) => {
    cfg.modResults = addWidgetTarget(cfg.modResults, cfg.version);
    return cfg;
  });
  return config;
};

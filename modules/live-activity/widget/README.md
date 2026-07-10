# Volyume Widget Extension — setup steps

> **Status update (E6B/CP-2):** the manual "Adding the target in Xcode" and
> "EAS build integration" sections below describe the ORIGINAL plan before
> `plugins/withVolyumeWidget.js` existed. That config plugin now creates the
> `VolyumeWidget` extension target automatically at every `expo prebuild`
> (including inside an EAS build), copies these Swift files in, and sets
> `NSSupportsLiveActivities` + the App Group entitlement on both targets. No
> manual Xcode steps are needed for a normal build. The two sections are kept
> below for historical reference and as a manual fallback if the plugin ever
> needs debugging. The **"Provisioning"** section further down is still
> accurate and still a required, one-time, founder-side manual step.

The Live Activity Swift files in this directory (plus the shared attributes
file in `../ios/`) are compiled into a Widget Extension target. The main app
target alone cannot host a Live Activity — Apple requires extensions for any
system-managed widget.

## What goes where

| File | Target |
|---|---|
| `VolyumeRestTimerAttributes.swift` | **Both** — main app + widget extension |
| `VolyumeRestTimerLiveActivity.swift` | Widget extension **only** |
| `VolyumeWidgetBundle.swift` | Widget extension **only** |
| `../LiveActivityModule.swift` | Main app target (already wired via Expo's local module loader) |

The shared `Attributes` file must compile into both targets because the JS
bridge constructs the attributes from the main app side and the widget
renders them from the extension side. The other two widget files run only
inside the extension process.

## Adding the target in Xcode

1. Run `npx expo prebuild --platform ios --clean` to materialise the iOS
   project under `ios/`.
2. Open `ios/Volyume.xcworkspace` in Xcode.
3. File → New → Target → **Widget Extension**.
   - Product Name: `VolyumeWidget`
   - Bundle Identifier: `app.volyume.widget`
   - Include Live Activity: **on**
   - Include Configuration Intent: **off**
4. When prompted "Activate `VolyumeWidget` scheme?" choose **Activate**.
5. Delete the auto-generated `VolyumeWidget.swift` and
   `VolyumeWidgetBundle.swift` Xcode created — we ship our own.
6. Right-click the `VolyumeWidget` group → Add Files to "Volyume"…
   - Select the three Swift files from `modules/live-activity/ios/widget/`:
     `VolyumeRestTimerAttributes.swift`,
     `VolyumeRestTimerLiveActivity.swift`,
     `VolyumeWidgetBundle.swift`.
   - **Copy items if needed**: OFF (they live in the module folder).
   - **Add to targets**:
     - `VolyumeRestTimerAttributes.swift` → both `Volyume` AND `VolyumeWidget`
     - `VolyumeRestTimerLiveActivity.swift` → `VolyumeWidget` only
     - `VolyumeWidgetBundle.swift` → `VolyumeWidget` only
7. Select the `VolyumeWidget` target → General → Info → add
   `NSSupportsLiveActivities = YES` (a Boolean key).
8. Select the main `Volyume` target → Info → ensure
   `NSSupportsLiveActivities = YES` is present too. (app.json's
   `expo.ios.infoPlist.NSSupportsLiveActivities` covers this on each
   prebuild — see the entry that ships in the repo.)
9. Build & run the `Volyume` scheme — the extension is bundled
   automatically with the main app. Lock the phone or background
   the app while a rest timer is running and the Live Activity
   should appear.

## EAS build integration

After step 8, commit the modified Xcode project (`ios/`) to the repo OR
add a config plugin that recreates the target during prebuild. The
former is simpler if you're not iterating on the prebuild flow; the
latter is cleaner if you re-run `expo prebuild` regularly. A
`config-plugins/add-widget-target.js` plugin is the standard approach
— there are examples at https://github.com/bacons/apple-targets.

## Provisioning

The widget extension needs its own App ID + provisioning profile:

1. App Store Connect → Identifiers → New → App IDs → bundle id
   `app.volyume.widget` with the **Live Activities** capability checked.
2. Generate a development + distribution provisioning profile that
   matches.
3. In your EAS credentials, add the widget's distribution profile so
   `eas build --profile production` signs it correctly.

## What doesn't work yet

- **Home-screen widgets** — done (CP-2, design-usability-audit-2026-07-09):
  `VolyumeHomeWidgets.swift` (`VolyumeNextSessionWidget`,
  `VolyumeConsistencyWidget`) is registered in `VolyumeWidgetBundle.swift`
  alongside the Live Activity and reads its data from the App Group snapshot
  `src/lib/widgets/storage.js` writes via `LiveActivityModule.
  writeWidgetSnapshot`.
- **Interactive Live Activities** (iOS 17 buttons inside the Live
  Activity) — would need an App Intent target on top of the widget
  extension. Worth a follow-up if you want a "Finish rest now" button
  on the lock screen.

import SwiftUI
import WidgetKit

/**
 * VolyumeWidgetBundle
 *
 * Entry point for the Widget Extension target. Lists every Widget
 * the extension provides: the rest-timer Live Activity, plus (CP-2,
 * design-usability-audit-2026-07-09) the home/lock-screen widgets in
 * VolyumeHomeWidgets.swift — mirroring Android's NextSessionWidget and
 * WeeklyConsistencyWidget (src/widgets/widgets.js).
 *
 * Marked @main so the extension knows what to launch. ONLY include
 * this file in the Widget Extension target, never the main app
 * target.
 */
@main
struct VolyumeWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.1, *) {
      VolyumeRestTimerLiveActivity()
    }
    VolyumeNextSessionWidget()
    VolyumeConsistencyWidget()
  }
}

import SwiftUI
import WidgetKit

/**
 * VolyumeWidgetBundle
 *
 * Entry point for the Widget Extension target. Lists every Widget
 * the extension provides. Right now it's just the rest-timer Live
 * Activity; home-screen widgets (next workout, weekly volume, etc.)
 * can be added to this bundle later without touching the main app
 * target.
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
  }
}

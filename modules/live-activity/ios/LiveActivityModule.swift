import ExpoModulesCore
import ActivityKit
import WidgetKit

/**
 * LiveActivityModule
 *
 * Bridges the JS API in index.ts to ActivityKit. Manages a single
 * rest-timer Activity per workout; callers can update or end it as
 * the user adjusts or finishes their rest.
 *
 * Activity content is defined in widget/VolyumeRestTimerAttributes.swift
 * and rendered by widget/VolyumeRestTimerLiveActivity.swift. Those
 * files live in a separate Widget Extension target — see
 * ios/widget/README.md for the build steps. Until that target is
 * added to the Xcode project, Activity.request() will throw at
 * runtime and the JS layer treats every call as a no-op.
 *
 * Availability gates:
 *   - iOS 16.1+ for ActivityKit (we ship-target iOS 15+, so guard
 *     every call with @available)
 *   - ActivityAuthorizationInfo().areActivitiesEnabled — user can
 *     disable Live Activities per-app in Settings
 *
 * Concurrency: ActivityKit APIs are async; all Promises resolve on
 * the main actor so Expo can hand them back to JS safely.
 *
 * CP-2 (design-usability-audit-2026-07-09, coverage-06-competitive-hps.md):
 * this module is also the bridge for the home/lock-screen WidgetKit widgets
 * (widget/VolyumeHomeWidgets.swift, registered in VolyumeWidgetBundle.swift
 * alongside the Live Activity). Those widgets are a *separate process* from
 * the app, so — unlike the Live Activity's ContentState, which ActivityKit
 * itself carries across the process boundary — they can only read data the
 * app writes into the shared App Group container. Reusing this module (not
 * a second native module) avoids a second Expo-module registration for one
 * more small bridge function.
 */
public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivityModule")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.1, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (options: [String: Any]) -> String? in
      if #available(iOS 16.1, *) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }
        let exerciseName = options["exerciseName"] as? String ?? "Rest timer"
        let workoutName = options["workoutName"] as? String
        let setNumber = options["setNumber"] as? Int
        let totalSets = options["totalSets"] as? Int
        guard let endMs = (options["endTimeMs"] as? NSNumber)?.doubleValue else { return nil }
        // Reject a non-finite or already-past end time (audit 2026-07-01):
        // seeding a ContentState whose endTime <= now makes the widget build a
        // Date()...endTime range with lowerBound > upperBound, which traps
        // (EXC_BREAKPOINT, Sentry VOLYUME-1K). Mirror the Android guard.
        guard endMs.isFinite, endMs > 0 else { return nil }
        let endDate = Date(timeIntervalSince1970: endMs / 1000.0)
        guard endDate > Date() else { return nil }

        let attributes = VolyumeRestTimerAttributes(
          exerciseName: exerciseName,
          workoutName: workoutName
        )
        let state = VolyumeRestTimerAttributes.ContentState(
          endTime: endDate,
          setNumber: setNumber,
          totalSets: totalSets
        )
        do {
          let activity = try Activity.request(
            attributes: attributes,
            contentState: state,
            pushType: nil
          )
          return activity.id
        } catch {
          return nil
        }
      }
      return nil
    }

    AsyncFunction("update") { (activityId: String, options: [String: Any]) -> Bool in
      if #available(iOS 16.1, *) {
        guard let endMs = (options["endTimeMs"] as? NSNumber)?.doubleValue else { return false }
        let endDate = Date(timeIntervalSince1970: endMs / 1000.0)
        for activity in Activity<VolyumeRestTimerAttributes>.activities where activity.id == activityId {
          let nextState = VolyumeRestTimerAttributes.ContentState(
            endTime: endDate,
            setNumber: activity.contentState.setNumber,
            totalSets: activity.contentState.totalSets
          )
          await activity.update(using: nextState)
          return true
        }
      }
      return false
    }

    AsyncFunction("end") { (activityId: String) -> Void in
      if #available(iOS 16.1, *) {
        for activity in Activity<VolyumeRestTimerAttributes>.activities where activity.id == activityId {
          await activity.end(dismissalPolicy: .immediate)
          return
        }
      }
    }

    AsyncFunction("endAll") { () -> Void in
      if #available(iOS 16.1, *) {
        for activity in Activity<VolyumeRestTimerAttributes>.activities {
          await activity.end(dismissalPolicy: .immediate)
        }
      }
    }

    // CP-2: publish the already-built widget snapshot (src/lib/widgets/
    // snapshot.js, JSON string) to the shared App Group UserDefaults the
    // WidgetKit home/lock-screen widgets read (widget/VolyumeHomeWidgets.swift),
    // then ask WidgetKit to redraw every placed Volyume widget. Independent
    // of ActivityKit/areActivitiesEnabled — a user who disabled Live
    // Activities can still have the home-screen widget. The App Group
    // ("group.app.volyume.widget") must match the entitlement the config
    // plugin writes for both the app target (app.json ios.entitlements) and
    // the extension target (plugins/withVolyumeWidget.js) — a founder
    // provisioning step (App Groups capability on both App IDs), the same
    // shape as the Live Activities capability step already documented in
    // docs/LIVE_ACTIVITY_IOS.md.
    AsyncFunction("writeWidgetSnapshot") { (json: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: "group.app.volyume.widget") else { return false }
      defaults.set(json, forKey: "widget_snapshot_v1")
      WidgetCenter.shared.reloadAllTimelines()
      return true
    }
  }
}

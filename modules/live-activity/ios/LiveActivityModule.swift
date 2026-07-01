import ExpoModulesCore
import ActivityKit

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
  }
}

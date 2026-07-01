import ActivityKit
import SwiftUI
import WidgetKit

// A rest-timer range that can never trap. SwiftUI's ClosedRange traps at runtime
// (EXC_BREAKPOINT — Sentry VOLYUME-1K) when lowerBound > upperBound, which is
// exactly what `Date()...endTime` produces once the timer has expired
// (endTime <= now). Clamp so lower <= upper; an already-expired timer then
// renders a static 0:00 instead of crashing the Live Activity / widget process.
private func volyumeSafeRestRange(_ endTime: Date) -> ClosedRange<Date> {
  let now = Date()
  return min(now, endTime)...max(now, endTime)
}

/**
 * VolyumeRestTimerLiveActivity
 *
 * Three presentations:
 *   - Lock-screen / banner (top of the file): a tall card with the
 *     exercise name, the live countdown (Text(timerInterval:)), and
 *     the set context. This is what appears on the lock screen and
 *     in the notification banner area on devices without a Dynamic
 *     Island.
 *   - Dynamic Island expanded (DynamicIslandExpandedRegion): same
 *     information, laid out across the four expanded regions.
 *   - Dynamic Island compact + minimal: the bare countdown so the
 *     user can glance at the time while another app is foregrounded.
 *
 * Volyume's amber accent is used everywhere a status colour is
 * required, mirroring the in-app theme.
 *
 * Text(timerInterval:countsDown:) is the magic: the system renders
 * the countdown text and updates it every second WITHOUT waking the
 * app or the widget process. Battery cost is effectively zero.
 *
 * IMPORTANT: this file must be part of the Widget Extension target,
 * NOT the main app target. The shared attributes file should be in
 * BOTH targets. See ios/widget/README.md for the Xcode setup.
 */
@available(iOS 16.1, *)
public struct VolyumeRestTimerLiveActivity: Widget {
  public init() {}

  public var body: some WidgetConfiguration {
    ActivityConfiguration(for: VolyumeRestTimerAttributes.self) { context in
      // Lock-screen / banner presentation
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text(context.attributes.exerciseName)
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
          Spacer()
          if let workout = context.attributes.workoutName {
            Text(workout)
              .font(.caption)
              .foregroundColor(.white.opacity(0.6))
              .lineLimit(1)
          }
        }

        Text(timerInterval: volyumeSafeRestRange(context.state.endTime), countsDown: true)
          .font(.system(size: 44, weight: .bold, design: .rounded))
          .foregroundColor(Color(red: 245/255, green: 158/255, blue: 11/255)) // Volyume amber
          .monospacedDigit()

        if let setNumber = context.state.setNumber {
          let totalText = context.state.totalSets.map { "of \($0)" } ?? ""
          Text("Set \(setNumber) \(totalText)")
            .font(.caption)
            .foregroundColor(.white.opacity(0.65))
        } else {
          Text("Rest in progress")
            .font(.caption)
            .foregroundColor(.white.opacity(0.65))
        }
      }
      .padding()
      .activityBackgroundTint(Color.black)
      .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded — the four regions are leading, trailing, center,
        // bottom. We put the exercise + countdown in the prominent
        // leading + trailing slots, the set context in the bottom.
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.exerciseName)
              .font(.caption)
              .foregroundColor(.white)
              .lineLimit(1)
            if let workout = context.attributes.workoutName {
              Text(workout)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.55))
                .lineLimit(1)
            }
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: volyumeSafeRestRange(context.state.endTime), countsDown: true)
            .font(.system(size: 32, weight: .bold, design: .rounded))
            .foregroundColor(Color(red: 245/255, green: 158/255, blue: 11/255))
            .monospacedDigit()
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let setNumber = context.state.setNumber {
            let totalText = context.state.totalSets.map { "of \($0)" } ?? ""
            Text("Set \(setNumber) \(totalText)")
              .font(.caption)
              .foregroundColor(.white.opacity(0.65))
          }
        }
      } compactLeading: {
        // Compact left slot — a small dumbbell glyph in the amber
        // accent so the user knows at a glance this is Volyume.
        Image(systemName: "dumbbell.fill")
          .foregroundColor(Color(red: 245/255, green: 158/255, blue: 11/255))
      } compactTrailing: {
        // Compact right slot — the live countdown.
        Text(timerInterval: volyumeSafeRestRange(context.state.endTime), countsDown: true)
          .font(.caption2.monospacedDigit())
          .foregroundColor(Color(red: 245/255, green: 158/255, blue: 11/255))
          .frame(maxWidth: 56)
      } minimal: {
        // Minimal — when multiple Activities are stacked the system
        // shows just this. Use the amber dot so Volyume's Activity
        // is recognisable next to other apps' Activities.
        Image(systemName: "dumbbell.fill")
          .foregroundColor(Color(red: 245/255, green: 158/255, blue: 11/255))
      }
      .keylineTint(Color(red: 245/255, green: 158/255, blue: 11/255))
    }
  }
}

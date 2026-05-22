import ActivityKit
import Foundation

/**
 * VolyumeRestTimerAttributes
 *
 * Shared Activity definition used by both the main app target (to
 * start / update / end the Activity) and the Widget Extension target
 * (to render it). Both targets must compile this file — once the
 * Widget Extension is added to the Xcode project, include this Swift
 * source in BOTH targets' "Compile Sources" build phase so the type
 * resolves on both sides.
 *
 * Content split:
 *   - Static `Attributes` — values that don't change for the life of
 *     the Activity (workout name, exercise name)
 *   - `ContentState` — values that update as the rest progresses
 *     (the end timestamp the system Timer view counts down to, the
 *     current set context)
 */
@available(iOS 16.1, *)
public struct VolyumeRestTimerAttributes: ActivityAttributes {
  public typealias VolyumeRestTimerStatus = ContentState

  public struct ContentState: Codable, Hashable {
    public var endTime: Date
    public var setNumber: Int?
    public var totalSets: Int?

    public init(endTime: Date, setNumber: Int?, totalSets: Int?) {
      self.endTime = endTime
      self.setNumber = setNumber
      self.totalSets = totalSets
    }
  }

  public var exerciseName: String
  public var workoutName: String?

  public init(exerciseName: String, workoutName: String?) {
    self.exerciseName = exerciseName
    self.workoutName = workoutName
  }
}

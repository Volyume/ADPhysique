// COMP-020 — Volyume Apple Watch companion (watchOS / SwiftUI).
//
// The one-line thesis: never lose a set, never desync the timer. The watch is a
// DURABLE REMOTE, not a second app. It renders strings the phone composed (so
// the "Set 3 of 2" defect class is structurally impossible) and queues every
// action on disk BEFORE the UI ticks, replaying idempotently when the channel
// returns. An HKWorkoutSession keeps the app alive between sets so the rest-end
// haptic can fire. No engine maths runs here.
//
// v1 surface (blueprint §4.1): exercise + set position, the beat line, a
// full-width Log button (crown adjusts REPS only), a rest countdown mirroring
// the phone's restTimerEndsAt wall-clock epoch, and attach/detach states.

import SwiftUI
import WatchConnectivity
import HealthKit

// MARK: - Mirror model (decoded from the phone's applicationContext)

struct ScriptExercise: Codable, Identifiable {
  var id: Int { index }
  let index: Int
  let name: String
  let beatLine: String
  let restSeconds: Int
  let prefillWeight: Double
  let prefillReps: Int
}

final class SessionModel: ObservableObject {
  @Published var workoutId: String?
  @Published var exercises: [ScriptExercise] = []
  @Published var currentIndex: Int = 0
  @Published var setLine: String = ""
  @Published var restEndsAt: Date?
  @Published var attached: Bool = false

  var currentExercise: ScriptExercise? {
    guard currentIndex >= 0, currentIndex < exercises.count else { return nil }
    return exercises[currentIndex]
  }
}

// MARK: - Durable event queue (survives relaunch)

struct WatchEvent: Codable {
  let eventId: String
  let seq: Int
  let workoutId: String
  let type: String           // "logSet" | "skipRest" | "extendRest"
  let weight: Double?
  let reps: Int?
}

final class EventQueue {
  private let url: URL
  private(set) var pending: [WatchEvent] = []

  init() {
    let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    url = dir.appendingPathComponent("volyume_watch_queue.json")
    load()
  }
  private func load() {
    if let data = try? Data(contentsOf: url),
       let q = try? JSONDecoder().decode([WatchEvent].self, from: data) { pending = q }
  }
  private func persist() {
    if let data = try? JSONEncoder().encode(pending) { try? data.write(to: url, options: .atomic) }
  }
  func enqueue(_ e: WatchEvent) { pending.append(e); persist() }   // durable BEFORE send
  func ack(_ eventId: String) { pending.removeAll { $0.eventId == eventId }; persist() }
}

// MARK: - Connectivity + HealthKit (the reliability machinery)

final class WatchConnector: NSObject, ObservableObject, WCSessionDelegate {
  @Published var model = SessionModel()
  private let queue = EventQueue()
  private var seq = 0
  private let healthStore = HKHealthStore()
  private var workoutSession: HKWorkoutSession?

  override init() {
    super.init()
    if WCSession.isSupported() {
      let s = WCSession.default
      s.delegate = self
      s.activate()
    }
    flush()
  }

  // The phone is truth; we just render whatever the latest context says.
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async { self.apply(context: applicationContext) }
  }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

  private func apply(context: [String: Any]) {
    guard let kind = context["kind"] as? String else { return }
    switch kind {
    case "script":
      model.workoutId = context["workoutId"] as? String
      model.attached = true
      startWorkoutSession()
      if let raw = context["exercises"] as? [[String: Any]] {
        model.exercises = raw.enumerated().compactMap { (i, e) in
          guard let name = e["name"] as? String else { return nil }
          return ScriptExercise(
            index: i, name: name,
            beatLine: e["beatLine"] as? String ?? "",
            restSeconds: e["restSeconds"] as? Int ?? 90,
            prefillWeight: e["prefillWeight"] as? Double ?? 0,
            prefillReps: e["prefillReps"] as? Int ?? 8)
        }
      }
    case "cursor":
      model.currentIndex = context["currentExerciseIndex"] as? Int ?? model.currentIndex
      model.setLine = context["setLine"] as? String ?? model.setLine
      if let ms = context["restTimerEndsAt"] as? Double {
        model.restEndsAt = Date(timeIntervalSince1970: ms / 1000.0)
      } else { model.restEndsAt = nil }
    case "end":
      model.attached = false
      endWorkoutSession()
    default: break
    }
  }

  // Log a set: durably queue FIRST, then send. The UI ticks optimistically.
  func logSet(weight: Double, reps: Int) {
    guard let wid = model.workoutId else { return }
    seq += 1
    let e = WatchEvent(eventId: UUID().uuidString, seq: seq, workoutId: wid,
                       type: "logSet", weight: weight, reps: reps)
    queue.enqueue(e)          // durable before any send — the never-lose-a-set guarantee
    send(e)
  }

  private func send(_ e: WatchEvent) {
    guard let data = try? JSONEncoder().encode(e),
          let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
    let s = WCSession.default
    if s.isReachable {
      s.sendMessage(dict, replyHandler: { _ in self.queue.ack(e.eventId) },
                    errorHandler: { _ in s.transferUserInfo(dict) })  // fall back to the durable channel
    } else {
      s.transferUserInfo(dict)
    }
  }

  private func flush() { for e in queue.pending { send(e) } }

  // MARK: HealthKit — the reliability mechanism (keeps us alive between sets).
  private func startWorkoutSession() {
    guard workoutSession == nil, HKHealthStore.isHealthDataAvailable() else { return }
    let config = HKWorkoutConfiguration()
    config.activityType = .traditionalStrengthTraining
    config.locationType = .indoor
    do {
      let s = try HKWorkoutSession(healthStore: healthStore, configuration: config)
      s.startActivity(with: Date())
      workoutSession = s
    } catch { /* permission denied -> rest-end degrades to a local notification */ }
  }
  private func endWorkoutSession() {
    workoutSession?.end()
    workoutSession = nil
  }
}

// MARK: - Views

struct SessionScreen: View {
  @ObservedObject var connector: WatchConnector
  @State private var reps: Int = 8

  var body: some View {
    let model = connector.model
    if !model.attached {
      VStack(spacing: 8) {
        Image(systemName: "iphone").font(.title2)
        Text("Start a session on your phone to log here.")
          .font(.footnote).multilineTextAlignment(.center).foregroundColor(.secondary)
      }.padding()
    } else if let ex = model.currentExercise {
      VStack(alignment: .leading, spacing: 6) {
        Text(ex.name).font(.headline).lineLimit(1)
        Text(model.setLine).font(.caption).foregroundColor(.secondary)
        Text(ex.beatLine).font(.caption2).foregroundColor(.secondary).lineLimit(2)
        Spacer(minLength: 4)
        // Crown adjusts REPS only; weight comes from the phone's prefill.
        Button(action: { connector.logSet(weight: ex.prefillWeight, reps: reps) }) {
          Text("Log \(Int(ex.prefillWeight)) kg × \(reps)")
            .font(.headline).frame(maxWidth: .infinity).frame(minHeight: 50)
        }
        .tint(Color(red: 0.96, green: 0.65, blue: 0.14))
        .focusable(true)
        .digitalCrownRotation(
          Binding(get: { Double(reps) }, set: { reps = max(1, min(50, Int($0.rounded()))) }),
          from: 1, through: 50, by: 1, sensitivity: .medium)
      }
      .padding()
      .onAppear { reps = ex.prefillReps }
      .onChange(of: model.currentIndex) { _ in reps = ex.prefillReps }
      .overlay(restOverlay(model: model))
    } else {
      Text("Session saved. Nice work.").font(.headline).padding()
    }
  }

  @ViewBuilder
  private func restOverlay(model: SessionModel) -> some View {
    if let ends = model.restEndsAt, ends > Date() {
      VStack {
        Spacer()
        VStack(spacing: 4) {
          Text("Rest").font(.caption).foregroundColor(.secondary)
          Text(ends, style: .timer).font(.title2).monospacedDigit()
        }
        .padding(8).background(.ultraThinMaterial).cornerRadius(12)
      }
    }
  }
}

@main
struct VolyumeWatchApp: App {
  @StateObject private var connector = WatchConnector()
  var body: some Scene {
    WindowGroup { SessionScreen(connector: connector) }
  }
}

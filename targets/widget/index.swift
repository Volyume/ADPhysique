// COMP-019 Stage 2 — Volyume iOS home-screen widgets (WidgetKit / SwiftUI).
//
// Dumb renderers of the JSON snapshot the JS writer persists into the shared App
// Group (src/lib/widgets/storage.js). All content logic lives in JS and ships
// OTA; this binary only renders a decoded snapshot. Free tier; never weight,
// calories or body data — the home screen is semi-public.
//
// Two widgets:
//   - Next session (small + medium): routine name, planned day, week-in-block.
//   - Weekly consistency (small): "N of M sessions this week" + streak; under an
//     open ED flag the snapshot's consistency is null and we fall back to the
//     neutral next-session content (the COMP-018 suppression rule, enforced in JS).

import WidgetKit
import SwiftUI

private let appGroup = "group.app.volyume.widget"
private let snapshotKey = "widget_snapshot_v1"

// Amber matches theme.js primary #F59E0B (note the pairing both sides).
private let amber = Color(red: 0.96, green: 0.65, blue: 0.14)
private let surface = Color(red: 0.098, green: 0.098, blue: 0.090)
private let muted = Color(red: 0.62, green: 0.62, blue: 0.62)

// MARK: - Snapshot model (mirrors src/lib/widgets/snapshot.js)

struct NextSession: Codable {
  let name: String
  let dayLabel: String?
  let weekLabel: String?
}

struct Consistency: Codable {
  let completed: Int
  let planned: Int
  let streakWeeks: Int
  let label: String?
}

struct WidgetSnapshot: Codable {
  let v: Int
  let nextSession: NextSession?
  let consistency: Consistency?
  let computedAt: Double?

  static let empty = WidgetSnapshot(v: 1, nextSession: nil, consistency: nil, computedAt: nil)

  static func load() -> WidgetSnapshot {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let json = defaults.string(forKey: snapshotKey),
      let data = json.data(using: .utf8),
      let decoded = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    else { return .empty }
    return decoded
  }
}

// MARK: - Timeline

struct SnapshotEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(date: Date(), snapshot: .empty)
  }
  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    completion(SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    let entry = SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load())
    // The app reloads timelines on data change; refresh in ~30 min as a backstop.
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - Views

struct NextSessionView: View {
  let snapshot: WidgetSnapshot
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("NEXT SESSION").font(.system(size: 11, weight: .semibold)).foregroundColor(muted).tracking(1)
      Spacer(minLength: 2)
      if let ns = snapshot.nextSession {
        Text(ns.name).font(.system(size: 20, weight: .bold)).foregroundColor(.white).lineLimit(2)
        if let day = ns.dayLabel { Text(day).font(.system(size: 14)).foregroundColor(amber) }
        if let week = ns.weekLabel { Text(week).font(.system(size: 12)).foregroundColor(muted) }
      } else {
        Text("No plan scheduled.\nBuild one in Plans.").font(.system(size: 14)).foregroundColor(muted)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(14)
    .containerBackground(for: .widget) { surface }
  }
}

struct WeeklyConsistencyView: View {
  let snapshot: WidgetSnapshot
  var body: some View {
    if let c = snapshot.consistency {
      VStack(alignment: .leading, spacing: 4) {
        Text("THIS WEEK").font(.system(size: 11, weight: .semibold)).foregroundColor(muted).tracking(1)
        Spacer(minLength: 2)
        Text("\(c.completed) of \(c.planned)").font(.system(size: 28, weight: .bold)).foregroundColor(.white)
        if c.streakWeeks > 0 {
          Text("\(c.streakWeeks) week streak").font(.system(size: 12)).foregroundColor(amber)
        } else {
          Text("sessions").font(.system(size: 12)).foregroundColor(muted)
        }
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .padding(14)
      .containerBackground(for: .widget) { surface }
    } else {
      // Suppressed (ED flag) or no data -> neutral next-session content.
      NextSessionView(snapshot: snapshot)
    }
  }
}

// MARK: - Widgets

struct NextSessionWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "NextSession", provider: Provider()) { entry in
      NextSessionView(snapshot: entry.snapshot)
    }
    .configurationDisplayName("Next session")
    .description("Your next training session at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct WeeklyConsistencyWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "WeeklyConsistency", provider: Provider()) { entry in
      WeeklyConsistencyView(snapshot: entry.snapshot)
    }
    .configurationDisplayName("Weekly consistency")
    .description("Sessions done this week and your streak.")
    .supportedFamilies([.systemSmall])
  }
}

@main
struct VolyumeWidgetBundle: WidgetBundle {
  var body: some Widget {
    NextSessionWidget()
    WeeklyConsistencyWidget()
  }
}

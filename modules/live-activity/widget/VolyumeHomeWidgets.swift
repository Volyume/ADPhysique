import SwiftUI
import WidgetKit

/**
 * VolyumeHomeWidgets
 *
 * CP-2 (design-usability-audit-2026-07-09, coverage-06-competitive-hps.md,
 * founder-approved D7): the iOS home/lock-screen counterpart to Android's
 * two `react-native-android-widget` widgets (src/widgets/widgets.js —
 * NextSessionWidget, WeeklyConsistencyWidget). Lives in the SAME WidgetKit
 * extension as the rest-timer Live Activity (registered alongside it in
 * VolyumeWidgetBundle.swift), not a new extension target.
 *
 * Data pipeline (mirrors the Android path exactly — same snapshot, same
 * privacy rule):
 *   JS builds a versioned JSON snapshot (src/lib/widgets/snapshot.js) ->
 *   src/lib/widgets/writer.js persists it -> src/lib/widgets/storage.js's
 *   iOS branch calls the `live-activity` native module's
 *   writeWidgetSnapshot(json) -> LiveActivityModule.swift writes it into
 *   UserDefaults(suiteName: "group.app.volyume.widget") and calls
 *   WidgetCenter.shared.reloadAllTimelines() -> this file reads that same
 *   UserDefaults key and renders it.
 *
 * Privacy (binding, same rule as snapshot.js): the snapshot NEVER carries
 * weight, calories, macros or body data — only a routine name, a day label,
 * a week-in-block chip, and session counts. This file must never read or
 * render anything else.
 *
 * Dumb renderer, same as widgets.js: all shaping/suppression logic (the
 * COMP-018 ED-flag fallback to neutral next-session content) already
 * happened in snapshot.js before the JSON reached here — this file only
 * decides "does a consistency block exist in the JSON, yes/no."
 */

// MARK: - Snapshot model (mirrors src/lib/widgets/snapshot.js's JSON shape)

private struct VolyumeNextSessionData: Decodable {
  let name: String
  let dayLabel: String?
  let weekLabel: String?
}

private struct VolyumeConsistencyData: Decodable {
  let completed: Int
  let planned: Int
  let streakWeeks: Int
  let label: String
}

private struct VolyumeWidgetSnapshotData: Decodable {
  let v: Int
  let nextSession: VolyumeNextSessionData?
  let consistency: VolyumeConsistencyData?
  let computedAt: Double
}

// Must match the literals src/lib/widgets/storage.js and
// LiveActivityModule.swift's writeWidgetSnapshot use.
private let APP_GROUP = "group.app.volyume.widget"
private let SNAPSHOT_KEY = "widget_snapshot_v1"

private func loadVolyumeWidgetSnapshot() -> VolyumeWidgetSnapshotData? {
  guard
    let defaults = UserDefaults(suiteName: APP_GROUP),
    let json = defaults.string(forKey: SNAPSHOT_KEY),
    let data = json.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(VolyumeWidgetSnapshotData.self, from: data)
}

// MARK: - Timeline

private struct VolyumeWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: VolyumeWidgetSnapshotData?
}

// A single, shared, dumb provider: it only reads the already-shaped JSON the
// app wrote (COMP-019 pipeline) — no computation here. The app pushes an
// immediate reload on every meaningful change (workout finish, plan/schedule
// change, foreground<->background — see writer.js's header comment); the
// 30-minute policy below is only the safety-net refresh for a widget left
// untouched for a while (e.g. crossing into a new day/week).
private struct VolyumeSnapshotProvider: TimelineProvider {
  func placeholder(in context: Context) -> VolyumeWidgetEntry {
    VolyumeWidgetEntry(date: Date(), snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (VolyumeWidgetEntry) -> Void) {
    completion(VolyumeWidgetEntry(date: Date(), snapshot: loadVolyumeWidgetSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<VolyumeWidgetEntry>) -> Void) {
    let entry = VolyumeWidgetEntry(date: Date(), snapshot: loadVolyumeWidgetSnapshot())
    let nextRefresh = Date().addingTimeInterval(30 * 60)
    completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
  }
}

// MARK: - Shared visual language
//
// Widgets render outside the app's theme pipeline, same rule as the Android
// RemoteViews widgets in src/widgets/widgets.js — these are literal copies of
// theme.js's dark-palette tokens, kept in step manually across all three
// files (theme.js, src/widgets/widgets.js, this file) if the palette changes.

private let AMBER = Color(red: 0xF5 / 255, green: 0xA6 / 255, blue: 0x23 / 255)   // theme.js primary
private let SURFACE = Color(red: 0x19 / 255, green: 0x19 / 255, blue: 0x17 / 255) // theme.js surface
private let RAISED = Color(red: 0x22 / 255, green: 0x22 / 255, blue: 0x20 / 255)  // theme.js surfaceElevated
private let CHIP = Color(red: 0x2A / 255, green: 0x2A / 255, blue: 0x27 / 255)    // theme.js surface2
private let HAIRLINE = Color(red: 0x2E / 255, green: 0x2E / 255, blue: 0x2C / 255) // theme.js borderSubtle
private let TEXT = Color.white
private let MUTED = Color(white: 0.62) // ~#9E9E9E

private struct Eyebrow: View {
  let text: String
  var body: some View {
    HStack(spacing: 6) {
      Circle().fill(AMBER).frame(width: 6, height: 6)
      Text(text)
        .font(.system(size: 11))
        .foregroundColor(MUTED)
        .tracking(1)
    }
  }
}

// Neutral session dots: completed in amber, remaining as raised-tier rings —
// a count made visible, never a judgement colour (adherence-neutral rule,
// same as SessionDots in src/widgets/widgets.js).
private struct SessionDots: View {
  let completed: Int
  let planned: Int
  var body: some View {
    let total = max(0, min(planned, 7))
    let done = max(0, min(completed, total))
    HStack(spacing: 5) {
      ForEach(0..<total, id: \.self) { i in
        Circle()
          .fill(i < done ? AMBER : RAISED)
          .overlay(Circle().stroke(i < done ? AMBER : HAIRLINE, lineWidth: 1))
          .frame(width: 8, height: 8)
      }
    }
  }
}

// MARK: - Next-session content (home screen: systemSmall / systemMedium)

private struct NextSessionHomeContent: View {
  let nextSession: VolyumeNextSessionData?

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Eyebrow(text: "NEXT SESSION")
      if let ns = nextSession {
        Text(ns.name)
          .font(.system(size: 20, weight: .bold))
          .foregroundColor(TEXT)
          .lineLimit(1)
        if let dayLabel = ns.dayLabel, !dayLabel.isEmpty {
          Text(dayLabel)
            .font(.system(size: 13))
            .foregroundColor(AMBER)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(CHIP)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        if let weekLabel = ns.weekLabel, !weekLabel.isEmpty {
          Text(weekLabel)
            .font(.system(size: 12))
            .foregroundColor(MUTED)
        }
      } else {
        Text("No plan scheduled. Build one in Plans.")
          .font(.system(size: 14))
          .foregroundColor(MUTED)
      }
      Spacer(minLength: 0)
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(SURFACE)
  }
}

private struct VolyumeNextSessionEntryView: View {
  let entry: VolyumeWidgetEntry
  var body: some View {
    NextSessionHomeContent(nextSession: entry.snapshot?.nextSession)
  }
}

struct VolyumeNextSessionWidget: Widget {
  let kind: String = "VolyumeNextSessionWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: VolyumeSnapshotProvider()) { entry in
      VolyumeNextSessionEntryView(entry: entry)
    }
    .configurationDisplayName("Next session")
    .description("Your next training session, right on your home screen.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Weekly-consistency content (home screen + lock screen)

private struct ConsistencyHomeContent: View {
  let snapshot: VolyumeWidgetSnapshotData?

  var body: some View {
    // Suppressed under an open ED/wellbeing flag, or simply no data yet: the
    // consistency block is absent from the JSON entirely (snapshot.js's
    // buildWidgetSnapshot already applied the COMP-018 rule before this ever
    // reached the widget) -> fall back to the neutral next-session content,
    // exactly mirroring WeeklyConsistencyWidget in src/widgets/widgets.js.
    if let c = snapshot?.consistency {
      VStack(alignment: .leading, spacing: 6) {
        Eyebrow(text: "THIS WEEK")
        Text("\(c.completed) of \(c.planned)")
          .font(.system(size: 26, weight: .bold))
          .foregroundColor(TEXT)
        SessionDots(completed: c.completed, planned: c.planned)
        if c.streakWeeks > 0 {
          Text("\(c.streakWeeks) \(c.streakWeeks == 1 ? "week" : "weeks") running")
            .font(.system(size: 12))
            .foregroundColor(AMBER)
        } else {
          Text("sessions")
            .font(.system(size: 12))
            .foregroundColor(MUTED)
        }
        Spacer(minLength: 0)
      }
      .padding(14)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(SURFACE)
    } else {
      NextSessionHomeContent(nextSession: snapshot?.nextSession)
    }
  }
}

// Apple renders accessory-family widgets (lock screen) in its own
// vibrant/monochrome mode — custom background colours are ignored there by
// design, so this stays text-only and uses widgetAccentable() for the one
// value that should pick up the system accent tint.
private struct ConsistencyAccessoryContent: View {
  let snapshot: VolyumeWidgetSnapshotData?

  var body: some View {
    if let c = snapshot?.consistency {
      VStack(alignment: .leading, spacing: 2) {
        Text("This week").font(.caption2)
        Text("\(c.completed) of \(c.planned) sessions")
          .font(.system(size: 15, weight: .semibold))
          .widgetAccentable()
          .lineLimit(1)
      }
    } else if let ns = snapshot?.nextSession {
      VStack(alignment: .leading, spacing: 2) {
        Text("Next session").font(.caption2)
        Text(ns.name)
          .font(.system(size: 15, weight: .semibold))
          .widgetAccentable()
          .lineLimit(1)
      }
    } else {
      Text("Volyume").font(.system(size: 15, weight: .semibold))
    }
  }
}

private struct VolyumeConsistencyEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: VolyumeWidgetEntry

  var body: some View {
    if family == .accessoryRectangular {
      ConsistencyAccessoryContent(snapshot: entry.snapshot)
    } else {
      ConsistencyHomeContent(snapshot: entry.snapshot)
    }
  }
}

struct VolyumeConsistencyWidget: Widget {
  let kind: String = "VolyumeConsistencyWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: VolyumeSnapshotProvider()) { entry in
      VolyumeConsistencyEntryView(entry: entry)
    }
    .configurationDisplayName("Weekly consistency")
    .description("Sessions done this week and your streak — home screen and Lock Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}

import AVFoundation
import CoreGraphics
import CoreMedia
import Foundation
import UIKit

/// extractFrames options, already validated. Every number is checked for
/// finiteness and range BEFORE it is converted: Swift's Int(Double) traps on
/// NaN, infinity and out-of-range values (adversarial audit 2026-08-26).
struct FrameRequest {
  let url: URL
  let timesMs: [Double]
  let maxEdge: Int

  static let maxTimes = 64

  static func parse(url: URL, timesMs: [Double], maxEdge: Double) -> FrameRequest? {
    guard !timesMs.isEmpty, timesMs.count <= maxTimes else { return nil }
    for t in timesMs {
      guard t.isFinite, t >= 0, t <= 86_400_000 else { return nil }
    }
    guard maxEdge.isFinite, maxEdge >= 16, maxEdge <= 4096 else { return nil }
    return FrameRequest(url: url, timesMs: timesMs, maxEdge: Int(maxEdge.rounded()))
  }
}

/// extractFrames (lead ruling 2026-10-16, after Sentry VOLYUME-3M): still
/// frames of a video for the share screen, written as JPEG files. Skia's video
/// object is never used for this: on iOS it asks AVPlayerItemVideoOutput for a
/// pixel buffer before the item has loaded and gets nothing back.
///
/// AVAssetImageGenerator with appliesPreferredTrackTransform gives the frame
/// upright, and maximumSize as a square box keeps its longer edge within
/// maxEdge whichever way it turns (it never enlarges). The exact frame is
/// asked for first; a time that cannot be decoded exactly is tried again with
/// a quarter of a second's tolerance, then left as a null slot. The async
/// image(at:) is iOS 16, the podspec's deployment target.
enum FrameExtractor {
  static let outputDirectoryName = "share-frames"

  private static let looseTolerance = CMTime(value: 1, timescale: 4)
  private static let jpegQuality: CGFloat = 0.85

  static func extract(_ request: FrameRequest) async -> Result<[Any], ExportFailure> {
    let url = request.url
    guard FileManager.default.fileExists(atPath: url.path) else {
      return .failure(ExportFailure(code: ExportCode.source, message: "The video file is missing."))
    }
    let asset = AVURLAsset(url: url)
    let track: AVAssetTrack
    let duration: CMTime
    do {
      guard let first = try await asset.loadTracks(withMediaType: .video).first else {
        return .failure(ExportFailure(code: ExportCode.source, message: "The file has no video track."))
      }
      track = first
      duration = try await asset.load(.duration)
    } catch {
      let mapped = ExportJob.failure(for: error)
      // Opening a video is reading, never writing: an unclassified failure is a decode one.
      if mapped.code == ExportCode.encode {
        return .failure(ExportFailure(code: ExportCode.decode, message: mapped.message))
      }
      return .failure(mapped)
    }

    // Times are kept inside [0, duration - one frame].
    let nominal = Double((try? await track.load(.nominalFrameRate)) ?? 0)
    let frameSeconds = nominal.isFinite && nominal > 0 ? 1 / nominal : 1.0 / 30.0
    let durationSeconds = duration.seconds
    let lastSeconds: Double? = durationSeconds.isFinite && durationSeconds > 0
      ? max(0, durationSeconds - frameSeconds)
      : nil

    let box = CGSize(width: request.maxEdge, height: request.maxEdge)
    let exact = AVAssetImageGenerator(asset: asset)
    exact.appliesPreferredTrackTransform = true
    exact.maximumSize = box
    exact.requestedTimeToleranceBefore = .zero
    exact.requestedTimeToleranceAfter = .zero
    let loose = AVAssetImageGenerator(asset: asset)
    loose.appliesPreferredTrackTransform = true
    loose.maximumSize = box
    loose.requestedTimeToleranceBefore = looseTolerance
    loose.requestedTimeToleranceAfter = looseTolerance

    var results: [Any] = []
    for ms in request.timesMs {
      var seconds = max(0, ms / 1000)
      if let last = lastSeconds { seconds = min(seconds, last) }
      let time = CMTime(seconds: seconds, preferredTimescale: 600)
      var frame: [String: Any]? = nil
      if let image = await grab(exact: exact, loose: loose, at: time) {
        // No autoreleasepool here: the closure form is avoided in an async
        // function; the JPEG data is released when write(_:timeMs:) returns.
        frame = write(image, timeMs: seconds * 1000)
      }
      if let frame = frame {
        results.append(frame)
      } else {
        results.append(NSNull())
      }
    }
    return .success(results)
  }

  /// Removes every frame file. Best effort; never throws.
  static func deleteAll() {
    guard let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else { return }
    try? FileManager.default.removeItem(at: caches.appendingPathComponent(outputDirectoryName, isDirectory: true))
  }

  private static func grab(exact: AVAssetImageGenerator, loose: AVAssetImageGenerator, at time: CMTime) async -> CGImage? {
    // image(at:) is the async form of generateCGImageAsynchronously(for:),
    // both iOS 16; it returns (image, actualTime), destructured by position.
    do {
      let (image, _) = try await exact.image(at: time)
      return image
    } catch {
      // Not decodable at exactly this time; try with the tolerance below.
    }
    do {
      let (image, _) = try await loose.image(at: time)
      return image
    } catch {
      return nil
    }
  }

  private static func write(_ image: CGImage, timeMs: Double) -> [String: Any]? {
    guard let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else { return nil }
    let directory = caches.appendingPathComponent(outputDirectoryName, isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    } catch {
      return nil
    }
    guard let data = UIImage(cgImage: image).jpegData(compressionQuality: jpegQuality) else { return nil }
    let destination = directory.appendingPathComponent("\(UUID().uuidString).jpg")
    do {
      try data.write(to: destination, options: .atomic)
    } catch {
      return nil
    }
    return [
      "uri": destination.absoluteString,
      "width": image.width,
      "height": image.height,
      "timeMs": timeMs,
    ]
  }
}

import AVFoundation
import CoreMedia
import Foundation

/// probeVideo (research report section 5.1): the upright facts about a clip
/// that framing needs, because expo-camera resolves with a URI only. Returns
/// nil when the file cannot be read as a video; never throws.
enum VideoProbe {
  static func read(uri: String) async -> [String: Any]? {
    guard let url = SourceURL.parse(uri), FileManager.default.fileExists(atPath: url.path) else { return nil }
    let asset = AVURLAsset(url: url)
    do {
      guard let track = try await asset.loadTracks(withMediaType: .video).first else { return nil }
      let (naturalSize, transform) = try await track.load(.naturalSize, .preferredTransform)
      let duration = try await asset.load(.duration)
      let nominalFrameRate = (try? await track.load(.nominalFrameRate)) ?? 0
      let descriptions = (try? await track.load(.formatDescriptions)) ?? []
      let characteristics = (try? await track.load(.mediaCharacteristics)) ?? []
      let audioTracks = (try? await asset.loadTracks(withMediaType: .audio)) ?? []

      // Upright size: the natural size through the preferred transform.
      let upright = CGRect(origin: .zero, size: naturalSize).applying(transform)
      let w = abs(upright.width)
      let h = abs(upright.height)
      let seconds = duration.seconds
      guard w.isFinite, h.isFinite, w > 0, h > 0, w < 100_000, h < 100_000,
            seconds.isFinite, seconds >= 0 else { return nil }

      var result: [String: Any] = [
        "width": Int(w.rounded()),
        "height": Int(h.rounded()),
        "rotation": rotationDegrees(transform),
        "durationMs": (seconds * 1000).rounded(),
        // HDR, Dolby Vision included (iOS 14+, research report section 3.6).
        "hdr": characteristics.contains(.containsHDRVideo),
        "hasAudio": !audioTracks.isEmpty,
      ]
      // nominalFrameRate can read 30 for a high-frame-rate clip copied out of
      // Photos (section 5.1); it is a hint, null when unknown.
      let fps = Double(nominalFrameRate)
      if fps.isFinite, fps > 0 {
        result["fps"] = fps
      } else {
        result["fps"] = NSNull()
      }
      if let description = descriptions.first {
        result["codec"] = codecName(CMFormatDescriptionGetMediaSubType(description))
      } else {
        result["codec"] = NSNull()
      }
      // A size, not a timestamp: no required-reason API (section 3.6).
      if let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize {
        result["fileSizeBytes"] = Double(size)
      } else {
        result["fileSizeBytes"] = NSNull()
      }
      return result
    } catch {
      return nil
    }
  }

  private static func rotationDegrees(_ t: CGAffineTransform) -> Int {
    let radians = atan2(Double(t.b), Double(t.a))
    guard radians.isFinite else { return 0 }
    let degrees = radians * 180 / Double.pi
    let quarter = Int((degrees / 90).rounded())
    return ((quarter % 4) + 4) % 4 * 90
  }

  /// Short codec names shared with Android: h264, hevc, dolby-vision, av1, vp9, else the four-character code.
  private static func codecName(_ subType: FourCharCode) -> String {
    let bytes = [24, 16, 8, 0].map { UInt8((subType >> UInt32($0)) & 0xff) }
    let fourCC = String(bytes: bytes, encoding: .ascii)?.trimmingCharacters(in: .whitespaces) ?? ""
    switch fourCC {
    case "avc1", "avc3": return "h264"
    case "hvc1", "hev1": return "hevc"
    case "dvh1", "dvhe", "dva1", "dvav": return "dolby-vision"
    case "av01": return "av1"
    case "vp09": return "vp9"
    default: return fourCC
    }
  }
}

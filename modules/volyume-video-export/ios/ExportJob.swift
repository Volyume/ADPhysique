import AVFoundation
import CoreImage
import CoreMedia
import CoreVideo
import Foundation
import UIKit

/// Rejection codes shared with Android and src/lib/shareVideo/engine.js
/// (research report section 5.4, classes A to G).
enum ExportCode {
  static let decode = "E_DECODE"          // A: the phone cannot decode the clip
  static let encode = "E_ENCODE"          // B: the phone cannot make the H.264, or another failure
  static let frame = "E_FRAME"            // C: frame processing failed, often memory
  static let source = "E_SOURCE"          // D: the clip cannot be read
  static let space = "E_SPACE"            // E: storage full
  static let icloud = "E_ICLOUD"          // F: the original is still in iCloud
  static let background = "E_BACKGROUND"  // G: the app left the foreground mid-export
  static let cancelled = "E_CANCELLED"
  static let busy = "E_BUSY"
  static let unavailable = "E_UNAVAILABLE"
  static let invalid = "E_INVALID"
  static let unsupported = "E_UNSUPPORTED"
}

struct ExportFailure: Error {
  let code: String
  let message: String
}

/// `file://` URLs (what expo-file-system, expo-camera and expo-image-picker
/// hand over) or bare absolute paths. Anything else is refused.
enum SourceURL {
  static func parse(_ value: String?) -> URL? {
    guard let text = value?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return nil }
    if text.hasPrefix("/") { return URL(fileURLWithPath: text) }
    guard text.hasPrefix("file://") else { return nil }
    if let url = URL(string: text), url.isFileURL { return url }
    let path = String(text.dropFirst("file://".count))
    return URL(fileURLWithPath: path.removingPercentEncoding ?? path)
  }
}

/// One export, already validated. `matrix` is lookMatrix(key, strength) (20
/// numbers, strength already applied); `rect` is photoCoverRect's output in
/// output pixels, top-left origin. Native holds no copy of the framing maths.
struct ExportSpec {
  let sourceURL: URL
  let startMs: Int64
  let durationMs: Int64
  let matrix: [CGFloat]?
  let rect: CGRect
  let overlayURL: URL
  let outWidth: Int
  let outHeight: Int
  let bitrate: Int

  static let maxDurationMs = 15_000.0

  /// Every number is checked for finiteness and range BEFORE it is converted:
  /// Swift's Int(Double) traps on NaN, infinity and out-of-range values
  /// (adversarial audit 2026-08-26, VOLYUME-1K).
  static func parse(_ o: [String: Any]) -> ExportSpec? {
    guard let sourceURL = SourceURL.parse(o["sourceUri"] as? String),
          let overlayURL = SourceURL.parse(o["overlayPngUri"] as? String),
          let start = number(o["startMs"]), start >= 0, start <= 86_400_000,
          let duration = number(o["durationMs"]), duration > 0, duration <= maxDurationMs,
          let outWidth = evenSize(o["outWidth"]),
          let outHeight = evenSize(o["outHeight"]),
          let rectDict = o["rect"] as? [String: Any],
          let x = number(rectDict["x"]), abs(x) <= 1_000_000,
          let y = number(rectDict["y"]), abs(y) <= 1_000_000,
          let w = number(rectDict["w"]), w > 0, w <= 1_000_000,
          let h = number(rectDict["h"]), h > 0, h <= 1_000_000
    else { return nil }

    var bitrate = 8_000_000.0
    if let raw = o["bitrate"], !(raw is NSNull) {
      guard let b = number(raw), b >= 1_000_000, b <= 20_000_000 else { return nil }
      bitrate = b
    }

    var matrix: [CGFloat]? = nil
    if let raw = o["matrix"], !(raw is NSNull) {
      guard let list = raw as? [Any], list.count == 20 else { return nil }
      var values: [CGFloat] = []
      for item in list {
        guard let v = number(item) else { return nil }
        values.append(CGFloat(v))
      }
      matrix = values
    }

    return ExportSpec(
      sourceURL: sourceURL,
      startMs: Int64(start.rounded()),
      durationMs: Int64(duration.rounded()),
      matrix: matrix,
      rect: CGRect(x: x, y: y, width: w, height: h),
      overlayURL: overlayURL,
      outWidth: outWidth,
      outHeight: outHeight,
      bitrate: Int(bitrate.rounded())
    )
  }

  static func number(_ value: Any?) -> Double? {
    if let n = value as? NSNumber {
      let d = n.doubleValue
      return d.isFinite ? d : nil
    }
    if let d = value as? Double { return d.isFinite ? d : nil }
    return nil
  }

  /// H.264 4:2:0 needs even sides; 16 to 4096 covers every card fit.
  private static func evenSize(_ value: Any?) -> Int? {
    guard let d = number(value), d >= 16, d <= 4096, d == d.rounded(.down) else { return nil }
    let n = Int(d)
    return n % 2 == 0 ? n : nil
  }
}

/// CIColorMatrix parameters from Skia's row-major 4x5 matrix (research report
/// section 3.4): s.r = dot(s, R) and so on, then s + bias, in the context's
/// working space. With colour management off that is the encoded values, the
/// domain Skia uses for the photo.
func colorMatrixParameters(_ m: [CGFloat]) -> [String: Any] {
  return [
    "inputRVector": CIVector(x: m[0], y: m[1], z: m[2], w: m[3]),
    "inputGVector": CIVector(x: m[5], y: m[6], z: m[7], w: m[8]),
    "inputBVector": CIVector(x: m[10], y: m[11], z: m[12], w: m[13]),
    "inputAVector": CIVector(x: m[15], y: m[16], z: m[17], w: m[18]),
    "inputBiasVector": CIVector(x: m[4], y: m[9], z: m[14], w: m[19]),
  ]
}

/// Draws one output frame: the clip placed at `rect`, the look, the card on
/// top. The card is completely still on the video, exactly as on a photo:
/// its PNG carries the outline, the scrim and the data (founder correction,
/// 2026-10-15: no outline draw-on). Nothing here is created per frame except
/// the CIImage recipe; the CIContext and the card image are built once.
final class FrameRenderer {
  private let context: CIContext
  private let card: CIImage
  private let ground: CIImage
  private let lookParameters: [String: Any]?
  private let rect: CGRect
  private let width: CGFloat
  private let height: CGFloat

  init(spec: ExportSpec) throws {
    width = CGFloat(spec.outWidth)
    height = CGFloat(spec.outHeight)
    rect = spec.rect
    // Colour management off: "Core Image perform[s] no color management"
    // (research report section 3.4), so the look is applied to encoded values
    // as Skia applies it to the photo, and the card blends in the same domain.
    context = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
    guard let loaded = CIImage(contentsOf: spec.overlayURL, options: [.colorSpace: NSNull()]) else {
      throw ExportFailure(code: ExportCode.encode, message: "The card image could not be read.")
    }
    var image = loaded.transformed(by: CGAffineTransform(translationX: -loaded.extent.minX, y: -loaded.extent.minY))
    let extent = image.extent
    if abs(extent.width - width) > 0.5 || abs(extent.height - height) > 0.5, extent.width > 0, extent.height > 0 {
      image = image.transformed(by: CGAffineTransform(scaleX: width / extent.width, y: height / extent.height))
    }
    card = image
    // The card's ground (#0D0D0D, DARK_PALETTE.bg0) under the clip. A clip
    // always covers the card (D229 addendum 5, ruling 12), so this only shows
    // through a sub-pixel edge.
    ground = CIImage(color: CIColor(red: 13.0 / 255.0, green: 13.0 / 255.0, blue: 13.0 / 255.0))
      .cropped(to: CGRect(x: 0, y: 0, width: width, height: height))
    lookParameters = spec.matrix.map(colorMatrixParameters)
  }

  func render(_ request: AVAsynchronousCIImageFilteringRequest) {
    let source = request.sourceImage
    let extent = source.extent
    guard extent.width.isFinite, extent.height.isFinite, extent.width > 0, extent.height > 0 else {
      request.finish(with: ExportFailure(code: ExportCode.frame, message: "Empty source frame."))
      return
    }
    // The source arrives upright (renderSize respects preferredTransform,
    // research report section 3.2) and at source resolution.
    let origin = source.transformed(by: CGAffineTransform(translationX: -extent.minX, y: -extent.minY))
    let sx = rect.width / extent.width
    let sy = rect.height / extent.height
    var placed: CIImage
    if min(sx, sy) < 0.5 {
      // A plain affine downscale below half aliases (section 3.6).
      placed = origin.applyingFilter("CILanczosScaleTransform", parameters: [
        kCIInputScaleKey: sy,
        kCIInputAspectRatioKey: sx / sy,
      ])
    } else {
      placed = origin.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    }
    // Core Image's origin is bottom-left: the top-left rect lands at
    // y = H - rect.minY - rect.height.
    let placedExtent = placed.extent
    placed = placed.transformed(by: CGAffineTransform(
      translationX: rect.minX - placedExtent.minX,
      y: height - rect.minY - rect.height - placedExtent.minY
    ))
    if let parameters = lookParameters {
      // Clamp after the look, as Skia does when it draws the photo, so a
      // bright pixel pushed past 1 blends under the card exactly as it does there.
      placed = placed.applyingFilter("CIColorMatrix", parameters: parameters).applyingFilter("CIColorClamp")
    }
    let frame = card
      .composited(over: placed.composited(over: ground))
      .cropped(to: CGRect(x: 0, y: 0, width: width, height: height))
    request.finish(with: frame, context: context)
  }
}

/// The iOS share video export (research report sections 3.2 to 3.6): an
/// AVMutableComposition of the video track only (audio dropped) over the
/// chosen window, a Core Image video composition at the output size and
/// 30 fps with HDR converted to SDR, read by AVAssetReaderVideoCompositionOutput
/// and written by AVAssetWriter as H.264 High at the requested bitrate.
///
/// State lives on `queue`; every transition happens there, so a cancel, the
/// background notification and the writer's own callbacks cannot race.
final class ExportJob {
  typealias Completion = (Result<[String: Any], ExportFailure>) -> Void

  static let outputDirectoryName = "share-video"

  private let spec: ExportSpec
  private let queue = DispatchQueue(label: "app.volyume.share-video-export")
  private var finished = false
  private var finishingWrite = false
  private var pendingCancelCode: String?
  private var reader: AVAssetReader?
  private var writer: AVAssetWriter?
  private var outputURL: URL?
  private var completion: Completion?
  private var progress: ((Double) -> Void)?
  private var backgroundObserver: NSObjectProtocol?
  private var lastProgressAt: TimeInterval = 0

  init(spec: ExportSpec) {
    self.spec = spec
  }

  func start(progress: @escaping (Double) -> Void, completion: @escaping Completion) {
    queue.async {
      self.progress = progress
      self.completion = completion
      // Foreground only (D229 addendum 5, ruling 16; section 3.6): the GPU is
      // not available to a backgrounded app, so leaving ends the export.
      self.backgroundObserver = NotificationCenter.default.addObserver(
        forName: UIApplication.didEnterBackgroundNotification,
        object: nil,
        queue: nil
      ) { [weak self] _ in
        self?.cancel(code: ExportCode.background)
      }
      Task { await self.prepareAndRun() }
    }
  }

  /// Ends the export with `code`, cancels reading and writing and deletes the partial file.
  func cancel(code: String) {
    queue.async {
      guard !self.finished else { return }
      if self.finishingWrite {
        // cancelWriting is not allowed once finishWriting has begun; the
        // finish callback sees this and deletes the file instead.
        self.pendingCancelCode = code
        return
      }
      self.abort(code: code, message: code == ExportCode.background ? "The app left the foreground." : "Cancelled.")
    }
  }

  // MARK: - Preparation

  private struct Prepared {
    let composition: AVMutableComposition
    let track: AVMutableCompositionTrack
    let videoComposition: AVMutableVideoComposition
    let duration: CMTime
  }

  private func prepareAndRun() async {
    do {
      let prepared = try await prepare()
      queue.async { self.run(prepared) }
    } catch {
      let failure = ExportJob.failure(for: error)
      queue.async { self.finish(.failure(failure)) }
    }
  }

  private func prepare() async throws -> Prepared {
    let url = spec.sourceURL
    guard FileManager.default.fileExists(atPath: url.path) else {
      throw ExportFailure(code: ExportCode.source, message: "The clip file is missing.")
    }
    if let values = try? url.resourceValues(forKeys: [.isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey]),
       values.isUbiquitousItem == true,
       values.ubiquitousItemDownloadingStatus != .current {
      throw ExportFailure(code: ExportCode.icloud, message: "The clip is still downloading from iCloud.")
    }

    let asset = AVURLAsset(url: url)
    guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
      throw ExportFailure(code: ExportCode.source, message: "The file has no video track.")
    }
    let assetDuration = try await asset.load(.duration)
    let transform = try await videoTrack.load(.preferredTransform)

    let start = CMTime(value: spec.startMs, timescale: 1000)
    var duration = CMTime(value: spec.durationMs, timescale: 1000)
    if CMTimeAdd(start, duration) > assetDuration {
      duration = CMTimeSubtract(assetDuration, start)
    }
    guard duration.isValid, duration.seconds.isFinite, duration.seconds > 0 else {
      throw ExportFailure(code: ExportCode.invalid, message: "The window is outside the clip.")
    }

    // 1. Trim, with the video track only: the audio track is never added,
    //    which is how sound is dropped (section 3.2).
    let composition = AVMutableComposition()
    guard let track = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
      throw ExportFailure(code: ExportCode.encode, message: "No composition track.")
    }
    try track.insertTimeRange(CMTimeRange(start: start, duration: duration), of: videoTrack, at: .zero)
    track.preferredTransform = transform

    // 2. The Core Image composition (iOS 16 class method), one renderer per job.
    let renderer = try FrameRenderer(spec: spec)
    let videoComposition = try await AVMutableVideoComposition.videoComposition(
      with: composition,
      applyingCIFiltersWithHandler: { request in renderer.render(request) }
    )
    videoComposition.renderSize = CGSize(width: spec.outWidth, height: spec.outHeight)
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30) // 60 fps sources drop to 30
    // HDR sources are converted to SDR before the handler (WWDC20 10009, section 3.6).
    videoComposition.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
    videoComposition.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
    videoComposition.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2

    return Prepared(composition: composition, track: track, videoComposition: videoComposition, duration: duration)
  }

  // MARK: - Reading and writing (on `queue`)

  private func run(_ prepared: Prepared) {
    guard !finished else { return }
    do {
      let directory = try ExportJob.outputDirectory()
      let stamp = Int64((Date().timeIntervalSince1970 * 1000).rounded())
      let destination = directory.appendingPathComponent("volyume-share-\(stamp).mp4")
      try? FileManager.default.removeItem(at: destination)
      outputURL = destination

      let reader = try AVAssetReader(asset: prepared.composition)
      let output = AVAssetReaderVideoCompositionOutput(
        videoTracks: [prepared.track],
        videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
      )
      output.videoComposition = prepared.videoComposition
      output.alwaysCopiesSampleData = false
      guard reader.canAdd(output) else {
        throw ExportFailure(code: ExportCode.encode, message: "The reader refused the composition output.")
      }
      reader.add(output)

      let writer = try AVAssetWriter(outputURL: destination, fileType: .mp4)
      let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: spec.outWidth,
        AVVideoHeightKey: spec.outHeight,
        AVVideoColorPropertiesKey: [
          AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
          AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
          AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
        ],
        AVVideoCompressionPropertiesKey: [
          AVVideoAverageBitRateKey: spec.bitrate,
          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
          AVVideoExpectedSourceFrameRateKey: 30,
          AVVideoMaxKeyFrameIntervalKey: 30,
        ],
      ])
      input.expectsMediaDataInRealTime = false
      guard writer.canAdd(input) else {
        throw ExportFailure(code: ExportCode.encode, message: "The writer refused the video input.")
      }
      writer.add(input)

      self.reader = reader
      self.writer = writer
      guard reader.startReading() else {
        throw reader.error ?? ExportFailure(code: ExportCode.decode, message: "Reading did not start.")
      }
      guard writer.startWriting() else {
        throw writer.error ?? ExportFailure(code: ExportCode.encode, message: "Writing did not start.")
      }
      writer.startSession(atSourceTime: .zero)
      input.requestMediaDataWhenReady(on: queue) { [weak self] in
        self?.pump(input: input, output: output, duration: prepared.duration)
      }
    } catch {
      abort(failure: ExportJob.failure(for: error))
    }
  }

  private func pump(input: AVAssetWriterInput, output: AVAssetReaderOutput, duration: CMTime) {
    while input.isReadyForMoreMediaData {
      guard !finished, !finishingWrite else { return }
      guard let sample = output.copyNextSampleBuffer() else {
        if let reader = reader, reader.status == .failed {
          abort(failure: ExportJob.failure(for: reader.error ?? ExportFailure(code: ExportCode.decode, message: "Reading failed.")))
          return
        }
        input.markAsFinished()
        finishWriting(duration: duration)
        return
      }
      reportProgress(CMSampleBufferGetPresentationTimeStamp(sample), duration: duration)
      if !input.append(sample) {
        abort(failure: ExportJob.failure(for: writer?.error ?? ExportFailure(code: ExportCode.encode, message: "Append failed.")))
        return
      }
    }
  }

  private func finishWriting(duration: CMTime) {
    guard let writer = writer else { return }
    finishingWrite = true
    writer.finishWriting { [weak self] in
      guard let self = self else { return }
      self.queue.async {
        self.finishingWrite = false
        guard !self.finished else { return }
        if let code = self.pendingCancelCode {
          self.finish(.failure(ExportFailure(code: code, message: "Cancelled.")))
          return
        }
        guard writer.status == .completed, let url = self.outputURL else {
          self.finish(.failure(ExportJob.failure(for: writer.error ?? ExportFailure(code: ExportCode.encode, message: "Writing failed."))))
          return
        }
        self.progress?(1)
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        let seconds = duration.seconds
        self.finish(.success([
          "uri": url.absoluteString,
          "width": self.spec.outWidth,
          "height": self.spec.outHeight,
          "durationMs": seconds.isFinite ? (seconds * 1000).rounded() : Double(self.spec.durationMs),
          "fileSizeBytes": size,
        ]))
      }
    }
  }

  private func reportProgress(_ time: CMTime, duration: CMTime) {
    let total = duration.seconds
    let now = time.seconds
    guard total.isFinite, total > 0, now.isFinite else { return }
    let uptime = ProcessInfo.processInfo.systemUptime
    guard uptime - lastProgressAt >= 0.25 else { return }
    lastProgressAt = uptime
    progress?(min(1, max(0, now / total)))
  }

  // MARK: - Ending (on `queue`)

  private func abort(code: String, message: String) {
    abort(failure: ExportFailure(code: code, message: message))
  }

  private func abort(failure: ExportFailure) {
    guard !finished else { return }
    reader?.cancelReading()
    if let writer = writer, writer.status == .writing {
      writer.cancelWriting()
    }
    finish(.failure(failure))
  }

  private func finish(_ result: Result<[String: Any], ExportFailure>) {
    guard !finished else { return }
    finished = true
    if case .failure = result, let url = outputURL {
      try? FileManager.default.removeItem(at: url)
    }
    if let observer = backgroundObserver {
      NotificationCenter.default.removeObserver(observer)
      backgroundObserver = nil
    }
    reader = nil
    writer = nil
    let done = completion
    completion = nil
    progress = nil
    done?(result)
  }

  // MARK: - Helpers

  static func outputDirectory() throws -> URL {
    guard let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      throw ExportFailure(code: ExportCode.space, message: "No caches directory.")
    }
    let directory = caches.appendingPathComponent(outputDirectoryName, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  /// AVFoundation and Foundation errors to the shared classes (section 5.4).
  static func failure(for error: Error) -> ExportFailure {
    if let failure = error as? ExportFailure { return failure }
    let ns = error as NSError
    return ExportFailure(code: code(for: ns, depth: 0) ?? ExportCode.encode, message: ns.localizedDescription)
  }

  private static func code(for ns: NSError, depth: Int) -> String? {
    if ns.domain == NSPOSIXErrorDomain, ns.code == Int(ENOSPC) { return ExportCode.space }
    if ns.domain == NSCocoaErrorDomain {
      switch ns.code {
      case NSFileWriteOutOfSpaceError:
        return ExportCode.space
      case NSUbiquitousFileUnavailableError, NSUbiquitousFileNotUploadedDueToQuotaError, NSUbiquitousFileUbiquityServerNotAvailable:
        return ExportCode.icloud
      case NSFileNoSuchFileError, NSFileReadNoSuchFileError, NSFileReadNoPermissionError:
        return ExportCode.source
      default:
        break
      }
    }
    if ns.domain == AVFoundationErrorDomain, let avCode = AVError.Code(rawValue: ns.code) {
      switch avCode {
      case .diskFull:
        return ExportCode.space
      case .decoderNotFound, .fileFormatNotRecognized, .operationNotSupportedForAsset,
           .decodeFailed, .decoderTemporarilyUnavailable, .undecodableMediaData, .fileFailedToParse:
        return ExportCode.decode
      case .outOfMemory, .videoCompositorFailed:
        return ExportCode.frame
      case .encoderNotFound, .encoderTemporarilyUnavailable, .exportFailed, .mediaServicesWereReset:
        return ExportCode.encode
      default:
        break
      }
    }
    if depth < 4, let underlying = ns.userInfo[NSUnderlyingErrorKey] as? NSError {
      return code(for: underlying, depth: depth + 1)
    }
    return nil
  }
}

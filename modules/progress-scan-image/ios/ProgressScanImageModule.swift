import ExpoModulesCore
import Foundation
import ImageIO
import UIKit
import Vision

public class ProgressScanImageModule: Module {
  private let bundledModelMinimumBytes = 100_000

  private struct PreparedImage {
    let image: UIImage
    let originalWidth: Int
    let originalHeight: Int
    let contentRect: CGRect
  }

  public func definition() -> ModuleDefinition {
    Name("ProgressScanImage")

    AsyncFunction("resolveBundledModel") { (fileName: String) -> String? in
      let safeName = URL(fileURLWithPath: fileName).lastPathComponent
      guard !safeName.isEmpty else { return nil }
      let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
      guard let targetDir = caches?.appendingPathComponent("progress_scan_models", isDirectory: true) else { return nil }
      try? FileManager.default.createDirectory(at: targetDir, withIntermediateDirectories: true)
      let target = targetDir.appendingPathComponent(safeName)
      if FileManager.default.fileExists(atPath: target.path),
         ((try? target.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) >= bundledModelMinimumBytes {
        return target.absoluteString
      }
      guard let source = bundledModelUrl(safeName: safeName) else { return nil }
      try? FileManager.default.removeItem(at: target)
      do {
        try FileManager.default.copyItem(at: source, to: target)
        let size = (try? target.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        return size >= bundledModelMinimumBytes ? target.absoluteString : nil
      } catch {
        return nil
      }
    }

    AsyncFunction("diagnoseBundledModel") { (fileName: String) -> [String: Any]? in
      let safeName = URL(fileURLWithPath: fileName).lastPathComponent
      guard !safeName.isEmpty else { return ["errorCode": "blank_file_name"] }
      let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
      let target = caches?
        .appendingPathComponent("progress_scan_models", isDirectory: true)
        .appendingPathComponent(safeName)
      let targetBytes = target.flatMap { try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize } ?? 0
      let source = bundledModelUrl(safeName: safeName)
      return [
        "safeName": safeName,
        "targetExists": target.map { FileManager.default.fileExists(atPath: $0.path) } ?? false,
        "targetBytes": targetBytes,
        "candidateCount": 5,
        "discoveredCount": Bundle.main.urls(forResourcesWithExtension: nil, subdirectory: nil)?.count ?? 0,
        "firstOpenableCandidate": source?.lastPathComponent as Any,
        "firstOpenableBytes": source.flatMap { try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize } as Any,
      ]
    }

    AsyncFunction("extractRgb") { (uri: String, width: Int, height: Int) -> [String: Any]? in
      guard width > 0, height > 0 else { return nil }
      guard let url = imageUrl(from: uri) else { return nil }
      guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
      let originalWidth = properties?[kCGImagePropertyPixelWidth] as? Int ?? 0
      let originalHeight = properties?[kCGImagePropertyPixelHeight] as? Int ?? 0
      let thumbOptions: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: max(width, height) * 2
      ]
      guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions as CFDictionary) else { return nil }
      let image = UIImage(cgImage: thumbnail)

      let rgbaCount = width * height * 4
      var rgba = [UInt8](repeating: 0, count: rgbaCount)
      let colourSpace = CGColorSpaceCreateDeviceRGB()
      let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
      let size = CGSize(width: width, height: height)
      let imageWidth = max(1.0, image.size.width)
      let imageHeight = max(1.0, image.size.height)
      let scale = min(CGFloat(width) / imageWidth, CGFloat(height) / imageHeight)
      let contentWidth = max(1.0, imageWidth * scale)
      let contentHeight = max(1.0, imageHeight * scale)
      let contentX = (CGFloat(width) - contentWidth) / 2.0
      let contentY = (CGFloat(height) - contentHeight) / 2.0
      let contentRect = CGRect(x: contentX, y: contentY, width: contentWidth, height: contentHeight)

      rgba.withUnsafeMutableBytes { ptr in
        guard let base = ptr.baseAddress else { return }
        guard let context = CGContext(
          data: base,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: width * 4,
          space: colourSpace,
          bitmapInfo: bitmapInfo
        ) else { return }
        context.setFillColor(UIColor.black.cgColor)
        context.fill(CGRect(origin: .zero, size: size))
        UIGraphicsPushContext(context)
        image.draw(in: contentRect)
        UIGraphicsPopContext()
      }

      var rgb = [UInt8](repeating: 0, count: width * height * 3)
      var luminanceSum = 0.0
      var luminanceCount = 0
      let rectMinX = max(0, Int(contentRect.minX.rounded()))
      let rectMinY = max(0, Int(contentRect.minY.rounded()))
      let rectMaxX = min(width, Int(contentRect.maxX.rounded()))
      let rectMaxY = min(height, Int(contentRect.maxY.rounded()))
      for i in 0..<(width * height) {
        let r = rgba[i * 4]
        let g = rgba[i * 4 + 1]
        let b = rgba[i * 4 + 2]
        rgb[i * 3] = r
        rgb[i * 3 + 1] = g
        rgb[i * 3 + 2] = b
        let x = i % width
        let y = i / width
        if x >= rectMinX && x < rectMaxX && y >= rectMinY && y < rectMaxY {
          luminanceSum += 0.2126 * Double(r) + 0.7152 * Double(g) + 0.0722 * Double(b)
          luminanceCount += 1
        }
      }

      let meanLum = luminanceSum / Double(max(1, luminanceCount))
      let lightingScore = min(1.0, max(0.0, 1.2 - (abs(meanLum - 128.0) / 96.0)))

      return [
        "width": width,
        "height": height,
        "originalWidth": originalWidth > 0 ? originalWidth : thumbnail.width,
        "originalHeight": originalHeight > 0 ? originalHeight : thumbnail.height,
        "orientedWidth": Int(imageWidth.rounded()),
        "orientedHeight": Int(imageHeight.rounded()),
        "contentRect": [
          "x": rectMinX,
          "y": rectMinY,
          "width": max(1, rectMaxX - rectMinX),
          "height": max(1, rectMaxY - rectMinY),
        ],
        "rgbBase64": Data(rgb).base64EncodedString(),
        "lightingScore": lightingScore,
      ]
    }

    AsyncFunction("segmentPersonMask") { (uri: String, width: Int, height: Int) -> [String: Any]? in
      guard width > 0, height > 0 else {
        return ["engine": "vision_person_segmentation", "errorCode": "invalid_target_size"]
      }
      guard let prepared = preparedImage(from: uri, width: width, height: height) else {
        return ["engine": "vision_person_segmentation", "errorCode": "image_decode_failed"]
      }
      guard let cgImage = prepared.image.cgImage else {
        return ["engine": "vision_person_segmentation", "errorCode": "cgimage_unavailable"]
      }

      let request = VNGeneratePersonSegmentationRequest()
      request.qualityLevel = .balanced
      request.outputPixelFormat = kCVPixelFormatType_OneComponent8

      do {
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
        try handler.perform([request])
      } catch {
        return ["engine": "vision_person_segmentation", "errorCode": "vision_segmentation_failed"]
      }

      guard let pixelBuffer = request.results?.first?.pixelBuffer else {
        return ["engine": "vision_person_segmentation", "errorCode": "vision_mask_unavailable"]
      }
      guard let encodedMask = maskBase64(from: pixelBuffer) else {
        return ["engine": "vision_person_segmentation", "errorCode": "vision_mask_encode_failed"]
      }

      let maskWidth = CVPixelBufferGetWidth(pixelBuffer)
      let maskHeight = CVPixelBufferGetHeight(pixelBuffer)
      let scaleX = Double(maskWidth) / Double(max(1, width))
      let scaleY = Double(maskHeight) / Double(max(1, height))
      let contentLeft = max(0, Int((prepared.contentRect.minX * scaleX).rounded()))
      let contentTop = max(0, Int((prepared.contentRect.minY * scaleY).rounded()))
      let contentRight = min(maskWidth, Int((prepared.contentRect.maxX * scaleX).rounded()))
      let contentBottom = min(maskHeight, Int((prepared.contentRect.maxY * scaleY).rounded()))

      return [
        "width": maskWidth,
        "height": maskHeight,
        "originalWidth": prepared.originalWidth,
        "originalHeight": prepared.originalHeight,
        "contentRect": [
          "x": contentLeft,
          "y": contentTop,
          "width": max(1, contentRight - contentLeft),
          "height": max(1, contentBottom - contentTop),
        ],
        "maskBase64": encodedMask,
        "engine": "vision_person_segmentation",
      ]
    }
  }

  private func preparedImage(from uri: String, width: Int, height: Int) -> PreparedImage? {
    guard let url = imageUrl(from: uri) else { return nil }
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    let originalWidth = properties?[kCGImagePropertyPixelWidth] as? Int ?? 0
    let originalHeight = properties?[kCGImagePropertyPixelHeight] as? Int ?? 0
    let thumbOptions: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: max(width, height) * 2
    ]
    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions as CFDictionary) else { return nil }
    let sourceImage = UIImage(cgImage: thumbnail)
    let imageWidth = max(1.0, sourceImage.size.width)
    let imageHeight = max(1.0, sourceImage.size.height)
    let scale = min(CGFloat(width) / imageWidth, CGFloat(height) / imageHeight)
    let contentWidth = max(1.0, imageWidth * scale)
    let contentHeight = max(1.0, imageHeight * scale)
    let contentRect = CGRect(
      x: (CGFloat(width) - contentWidth) / 2.0,
      y: (CGFloat(height) - contentHeight) / 2.0,
      width: contentWidth,
      height: contentHeight
    )
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format)
    let rendered = renderer.image { context in
      UIColor.black.setFill()
      context.cgContext.fill(CGRect(x: 0, y: 0, width: width, height: height))
      sourceImage.draw(in: contentRect)
    }
    return PreparedImage(
      image: rendered,
      originalWidth: originalWidth > 0 ? originalWidth : thumbnail.width,
      originalHeight: originalHeight > 0 ? originalHeight : thumbnail.height,
      contentRect: contentRect
    )
  }

  private func maskBase64(from pixelBuffer: CVPixelBuffer) -> String? {
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
    guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else { return nil }
    let width = CVPixelBufferGetWidth(pixelBuffer)
    let height = CVPixelBufferGetHeight(pixelBuffer)
    let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
    var data = Data(capacity: max(0, width * height * 4))
    for y in 0..<height {
      let row = baseAddress.advanced(by: y * bytesPerRow).assumingMemoryBound(to: UInt8.self)
      for x in 0..<width {
        var bits = (Float(row[x]) / 255.0).bitPattern.littleEndian
        withUnsafeBytes(of: &bits) { data.append(contentsOf: $0) }
      }
    }
    return data.base64EncodedString()
  }

  private func imageUrl(from uri: String) -> URL? {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    if uri.hasPrefix("file://") {
      return URL(fileURLWithPath: String(uri.dropFirst("file://".count)))
    }
    return URL(fileURLWithPath: uri)
  }

  private func bundledModelUrl(safeName: String) -> URL? {
    let url = URL(fileURLWithPath: safeName)
    let base = url.deletingPathExtension().lastPathComponent
    let ext = url.pathExtension.isEmpty ? "tflite" : url.pathExtension
    let candidates = [
      (base, ext),
      ("assets_ml_\(base)", ""),
      ("assets_ml_\(base)", ext),
      ("assets_ml_\(base)_\(ext)", ""),
      ("assets_ml_\(base)_\(ext)", ext),
    ]
    for candidate in candidates {
      if let found = Bundle.main.url(
        forResource: candidate.0,
        withExtension: candidate.1.isEmpty ? nil : candidate.1
      ) {
        return found
      }
    }
    let allResources = Bundle.main.urls(forResourcesWithExtension: nil, subdirectory: nil) ?? []
    let normalisedNeedle = base.replacingOccurrences(of: ".", with: "_")
    return allResources.first { url in
      let name = url.lastPathComponent
      let normalised = name.replacingOccurrences(of: ".", with: "_")
      return normalised.contains(normalisedNeedle) && (name.hasSuffix(".tflite") || normalised.hasSuffix("_tflite"))
    }
  }
}

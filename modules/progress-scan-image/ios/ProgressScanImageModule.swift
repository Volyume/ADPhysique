import ExpoModulesCore
import Foundation
import ImageIO
import UIKit

public class ProgressScanImageModule: Module {
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
         ((try? target.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) > 0 {
        return target.absoluteString
      }
      guard let source = bundledModelUrl(safeName: safeName) else { return nil }
      try? FileManager.default.removeItem(at: target)
      do {
        try FileManager.default.copyItem(at: source, to: target)
        let size = (try? target.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        return size > 0 ? target.absoluteString : nil
      } catch {
        return nil
      }
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
    ]
    for candidate in candidates {
      if let found = Bundle.main.url(
        forResource: candidate.0,
        withExtension: candidate.1.isEmpty ? nil : candidate.1
      ) {
        return found
      }
    }
    return nil
  }
}

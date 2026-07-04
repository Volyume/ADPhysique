import ExpoModulesCore
import Foundation
import UIKit

public class ProgressScanImageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ProgressScanImage")

    AsyncFunction("extractRgb") { (uri: String, width: Int, height: Int) -> [String: Any]? in
      guard width > 0, height > 0 else { return nil }
      guard let url = imageUrl(from: uri) else { return nil }
      guard let image = UIImage(contentsOfFile: url.path) else { return nil }
      guard let cgImage = image.cgImage else { return nil }

      let rgbaCount = width * height * 4
      var rgba = [UInt8](repeating: 0, count: rgbaCount)
      let colourSpace = CGColorSpaceCreateDeviceRGB()
      let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
      let size = CGSize(width: width, height: height)

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
        UIGraphicsPushContext(context)
        image.draw(in: CGRect(origin: .zero, size: size))
        UIGraphicsPopContext()
      }

      var rgb = [UInt8](repeating: 0, count: width * height * 3)
      var luminanceSum = 0.0
      for i in 0..<(width * height) {
        let r = rgba[i * 4]
        let g = rgba[i * 4 + 1]
        let b = rgba[i * 4 + 2]
        rgb[i * 3] = r
        rgb[i * 3 + 1] = g
        rgb[i * 3 + 2] = b
        luminanceSum += 0.2126 * Double(r) + 0.7152 * Double(g) + 0.0722 * Double(b)
      }

      let meanLum = luminanceSum / Double(max(1, width * height))
      let lightingScore = min(1.0, max(0.0, 1.2 - (abs(meanLum - 128.0) / 96.0)))

      return [
        "width": width,
        "height": height,
        "originalWidth": cgImage.width,
        "originalHeight": cgImage.height,
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
}

package expo.modules.progressscanimage

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class ProgressScanImageModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ProgressScanImage")

    AsyncFunction("extractRgb") { uri: String, width: Int, height: Int, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null || width <= 0 || height <= 0) {
          promise.resolve(null)
          return@AsyncFunction
        }

        val decoded = decodeBitmap(context, uri)
        if (decoded == null) {
          promise.resolve(null)
          return@AsyncFunction
        }

        val oriented = orientBitmap(context, uri, decoded)
        val scaled = Bitmap.createScaledBitmap(oriented, width, height, true)
        val pixels = IntArray(width * height)
        scaled.getPixels(pixels, 0, width, 0, 0, width, height)

        val rgb = ByteArray(width * height * 3)
        var luminanceSum = 0.0
        for (i in pixels.indices) {
          val colour = pixels[i]
          val r = (colour shr 16) and 0xff
          val g = (colour shr 8) and 0xff
          val b = colour and 0xff
          val j = i * 3
          rgb[j] = r.toByte()
          rgb[j + 1] = g.toByte()
          rgb[j + 2] = b.toByte()
          luminanceSum += 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        val meanLum = luminanceSum / max(1, pixels.size)
        val lightingScore = clamp01(1.2 - (abs(meanLum - 128.0) / 96.0))

        promise.resolve(mapOf(
          "width" to width,
          "height" to height,
          "originalWidth" to decoded.width,
          "originalHeight" to decoded.height,
          "rgbBase64" to Base64.encodeToString(rgb, Base64.NO_WRAP),
          "lightingScore" to lightingScore,
        ))
      } catch (e: Throwable) {
        promise.reject("ERR_PROGRESS_SCAN_IMAGE", e.message ?: "Could not preprocess progress scan image", e)
      }
    }
  }

  private fun decodeBitmap(context: Context, uriString: String): Bitmap? {
    return openInputStream(context, uriString)?.use { BitmapFactory.decodeStream(it) }
  }

  private fun orientBitmap(context: Context, uriString: String, bitmap: Bitmap): Bitmap {
    val orientation = try {
      openInputStream(context, uriString)?.use {
        ExifInterface(it).getAttributeInt(
          ExifInterface.TAG_ORIENTATION,
          ExifInterface.ORIENTATION_NORMAL,
        )
      } ?: ExifInterface.ORIENTATION_NORMAL
    } catch (_: Throwable) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.postScale(-1f, 1f)
        matrix.postRotate(90f)
      }
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.postScale(-1f, 1f)
        matrix.postRotate(270f)
      }
    }
    if (matrix.isIdentity) return bitmap
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  private fun openInputStream(context: Context, uriString: String): InputStream? {
    val uri = Uri.parse(uriString)
    return when (uri.scheme) {
      "content" -> context.contentResolver.openInputStream(uri)
      "file" -> FileInputStream(File(uri.path ?: return null))
      null -> FileInputStream(File(uriString))
      else -> null
    }
  }

  private fun clamp01(value: Double): Double {
    return min(1.0, max(0.0, value))
  }
}

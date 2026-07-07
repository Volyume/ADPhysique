package expo.modules.progressscanimage

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.Segmentation
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class ProgressScanImageModule : Module() {
  private val bundledModelMinimumBytes = 100_000L

  private data class DecodedBitmap(
    val bitmap: Bitmap,
    val originalWidth: Int,
    val originalHeight: Int,
  )

  private data class PreparedBitmap(
    val bitmap: Bitmap,
    val originalWidth: Int,
    val originalHeight: Int,
    val contentLeft: Int,
    val contentTop: Int,
    val contentRight: Int,
    val contentBottom: Int,
  )

  private val selfieSegmenter by lazy {
    val options = SelfieSegmenterOptions.Builder()
      .setDetectorMode(SelfieSegmenterOptions.SINGLE_IMAGE_MODE)
      .enableRawSizeMask()
      .build()
    Segmentation.getClient(options)
  }

  override fun definition() = ModuleDefinition {
    Name("ProgressScanImage")

    AsyncFunction("resolveBundledModel") { fileName: String, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(null)
          return@AsyncFunction
        }
        val safeName = File(fileName).name
        if (safeName.isBlank()) {
          promise.resolve(null)
          return@AsyncFunction
        }
        val targetDir = File(context.cacheDir, "progress_scan_models")
        if (!targetDir.exists()) targetDir.mkdirs()
        val target = File(targetDir, safeName)
        if (!target.exists() || target.length() < bundledModelMinimumBytes) {
          try { target.delete() } catch (_: Throwable) { /* recopy below */ }
          if (!copyFirstBundledModelAsset(context, safeName, target)) {
            promise.resolve(null)
            return@AsyncFunction
          }
        }
        promise.resolve(if (target.exists() && target.length() >= bundledModelMinimumBytes) Uri.fromFile(target).toString() else null)
      } catch (_: Throwable) {
        promise.resolve(null)
      }
    }

    AsyncFunction("diagnoseBundledModel") { fileName: String, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(mapOf("errorCode" to "context_unavailable"))
          return@AsyncFunction
        }
        val safeName = File(fileName).name
        if (safeName.isBlank()) {
          promise.resolve(mapOf("errorCode" to "blank_file_name"))
          return@AsyncFunction
        }
        val target = File(File(context.cacheDir, "progress_scan_models"), safeName)
        val declaredCandidates = bundledModelAssetCandidates(safeName)
        val discoveredCandidates = discoveredBundledModelAssetCandidates(context, safeName)
        var firstOpenable: String? = null
        var firstOpenableBytes: Int? = null
        for (candidate in (declaredCandidates + discoveredCandidates).distinct()) {
          try {
            context.assets.open(candidate).use { input ->
              firstOpenable = candidate
              firstOpenableBytes = input.available()
            }
            break
          } catch (_: Throwable) {
            // keep looking
          }
        }
        promise.resolve(
          mapOf(
            "safeName" to safeName,
            "targetExists" to target.exists(),
            "targetBytes" to if (target.exists()) target.length() else 0L,
            "candidateCount" to (declaredCandidates + discoveredCandidates).distinct().size,
            "discoveredCount" to discoveredCandidates.size,
            "firstOpenableCandidate" to firstOpenable,
            "firstOpenableBytes" to firstOpenableBytes,
          ),
        )
      } catch (_: Throwable) {
        promise.resolve(mapOf("errorCode" to "diagnostic_failed"))
      }
    }

    AsyncFunction("extractRgb") { uri: String, width: Int, height: Int, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null || width <= 0 || height <= 0) {
          promise.resolve(null)
          return@AsyncFunction
        }

        val decodedInfo = decodeBitmap(context, uri, width, height)
        if (decodedInfo == null) {
          promise.resolve(null)
          return@AsyncFunction
        }

        val decoded = decodedInfo.bitmap
        val oriented = orientBitmap(context, uri, decoded)
        val orientedWidth = oriented.width
        val orientedHeight = oriented.height
        val target = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val scale = min(width.toFloat() / oriented.width.toFloat(), height.toFloat() / oriented.height.toFloat())
        val scaledWidth = max(1, (oriented.width * scale).roundToInt())
        val scaledHeight = max(1, (oriented.height * scale).roundToInt())
        val left = ((width - scaledWidth) / 2.0f)
        val top = ((height - scaledHeight) / 2.0f)
        val contentRect = RectF(left, top, left + scaledWidth, top + scaledHeight)
        val canvas = Canvas(target)
        canvas.drawColor(Color.BLACK)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        canvas.drawBitmap(oriented, null, contentRect, paint)
        val pixels = IntArray(width * height)
        target.getPixels(pixels, 0, width, 0, 0, width, height)

        val rgb = ByteArray(width * height * 3)
        var luminanceSum = 0.0
        var luminanceCount = 0
        val contentLeft = max(0, left.roundToInt())
        val contentTop = max(0, top.roundToInt())
        val contentRight = min(width, (left + scaledWidth).roundToInt())
        val contentBottom = min(height, (top + scaledHeight).roundToInt())
        for (i in pixels.indices) {
          val colour = pixels[i]
          val r = (colour shr 16) and 0xff
          val g = (colour shr 8) and 0xff
          val b = colour and 0xff
          val j = i * 3
          rgb[j] = r.toByte()
          rgb[j + 1] = g.toByte()
          rgb[j + 2] = b.toByte()
          val x = i % width
          val y = i / width
          if (x >= contentLeft && x < contentRight && y >= contentTop && y < contentBottom) {
            luminanceSum += 0.2126 * r + 0.7152 * g + 0.0722 * b
            luminanceCount += 1
          }
        }

        val meanLum = luminanceSum / max(1, luminanceCount)
        val lightingScore = clamp01(1.2 - (abs(meanLum - 128.0) / 96.0))

        val result = mapOf(
          "width" to width,
          "height" to height,
          "originalWidth" to decodedInfo.originalWidth,
          "originalHeight" to decodedInfo.originalHeight,
          "orientedWidth" to orientedWidth,
          "orientedHeight" to orientedHeight,
          "contentRect" to mapOf(
            "x" to contentLeft,
            "y" to contentTop,
            "width" to max(1, contentRight - contentLeft),
            "height" to max(1, contentBottom - contentTop),
          ),
          "rgbBase64" to Base64.encodeToString(rgb, Base64.NO_WRAP),
          "lightingScore" to lightingScore,
        )

        target.recycle()
        if (oriented !== decoded) oriented.recycle()
        decoded.recycle()
        promise.resolve(result)
      } catch (e: Throwable) {
        promise.reject("ERR_PROGRESS_SCAN_IMAGE", e.message ?: "Could not preprocess progress scan image", e)
      }
    }

    AsyncFunction("segmentPersonMask") { uri: String, width: Int, height: Int, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null || width <= 0 || height <= 0) {
          promise.resolve(null)
          return@AsyncFunction
        }

        val prepared = prepareBitmap(context, uri, width, height)
        if (prepared == null) {
          promise.resolve(null)
          return@AsyncFunction
        }

        val image = InputImage.fromBitmap(prepared.bitmap, 0)
        selfieSegmenter.process(image)
          .addOnSuccessListener { segmentationMask ->
            try {
              val maskBuffer = segmentationMask.buffer
              maskBuffer.rewind()
              val maskWidth = segmentationMask.width
              val maskHeight = segmentationMask.height
              val maskCount = max(0, maskWidth * maskHeight)
              val scaleX = maskWidth.toFloat() / max(1, prepared.bitmap.width).toFloat()
              val scaleY = maskHeight.toFloat() / max(1, prepared.bitmap.height).toFloat()
              val contentLeft = max(0, (prepared.contentLeft * scaleX).roundToInt())
              val contentTop = max(0, (prepared.contentTop * scaleY).roundToInt())
              val contentRight = min(maskWidth, (prepared.contentRight * scaleX).roundToInt())
              val contentBottom = min(maskHeight, (prepared.contentBottom * scaleY).roundToInt())
              val out = ByteBuffer.allocate(maskCount * 4).order(ByteOrder.LITTLE_ENDIAN)
              for (i in 0 until maskCount) {
                if (maskBuffer.remaining() < 4) break
                val p = maskBuffer.getFloat().coerceIn(0.0f, 1.0f)
                out.putFloat(p)
              }
              promise.resolve(
                mapOf(
                  "width" to maskWidth,
                  "height" to maskHeight,
                  "originalWidth" to prepared.originalWidth,
                  "originalHeight" to prepared.originalHeight,
                  "contentRect" to mapOf(
                    "x" to contentLeft,
                    "y" to contentTop,
                    "width" to max(1, contentRight - contentLeft),
                    "height" to max(1, contentBottom - contentTop),
                  ),
                  "maskBase64" to Base64.encodeToString(out.array(), Base64.NO_WRAP),
                  "engine" to "mlkit_selfie_segmentation",
                ),
              )
            } catch (_: Throwable) {
              promise.resolve(null)
            } finally {
              prepared.bitmap.recycle()
            }
          }
          .addOnFailureListener {
            prepared.bitmap.recycle()
            promise.resolve(
              mapOf(
                "engine" to "mlkit_selfie_segmentation",
                "errorCode" to "mlkit_segmentation_failed",
              ),
            )
          }
      } catch (_: Throwable) {
        promise.resolve(
          mapOf(
            "engine" to "mlkit_selfie_segmentation",
            "errorCode" to "mlkit_segmentation_exception",
          ),
        )
      }
    }
  }

  private fun prepareBitmap(context: Context, uriString: String, width: Int, height: Int): PreparedBitmap? {
    val decodedInfo = decodeBitmap(context, uriString, width, height) ?: return null
    val decoded = decodedInfo.bitmap
    val oriented = orientBitmap(context, uriString, decoded)
    val target = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val scale = min(width.toFloat() / oriented.width.toFloat(), height.toFloat() / oriented.height.toFloat())
    val scaledWidth = max(1, (oriented.width * scale).roundToInt())
    val scaledHeight = max(1, (oriented.height * scale).roundToInt())
    val left = ((width - scaledWidth) / 2.0f)
    val top = ((height - scaledHeight) / 2.0f)
    val contentRect = RectF(left, top, left + scaledWidth, top + scaledHeight)
    val canvas = Canvas(target)
    canvas.drawColor(Color.BLACK)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    canvas.drawBitmap(oriented, null, contentRect, paint)
    if (oriented !== decoded) oriented.recycle()
    decoded.recycle()
    val contentLeft = max(0, left.roundToInt())
    val contentTop = max(0, top.roundToInt())
    val contentRight = min(width, (left + scaledWidth).roundToInt())
    val contentBottom = min(height, (top + scaledHeight).roundToInt())
    return PreparedBitmap(
      bitmap = target,
      originalWidth = decodedInfo.originalWidth,
      originalHeight = decodedInfo.originalHeight,
      contentLeft = contentLeft,
      contentTop = contentTop,
      contentRight = contentRight,
      contentBottom = contentBottom,
    )
  }

  private fun decodeBitmap(context: Context, uriString: String, targetWidth: Int, targetHeight: Int): DecodedBitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    openInputStream(context, uriString)?.use {
      BitmapFactory.decodeStream(it, null, bounds)
    }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    val maxTarget = max(targetWidth, targetHeight) * 2
    val options = BitmapFactory.Options().apply {
      inPreferredConfig = Bitmap.Config.ARGB_8888
      inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, maxTarget, maxTarget)
    }
    val bitmap = openInputStream(context, uriString)?.use {
      BitmapFactory.decodeStream(it, null, options)
    } ?: return null
    return DecodedBitmap(bitmap, bounds.outWidth, bounds.outHeight)
  }

  private fun sampleSizeFor(width: Int, height: Int, reqWidth: Int, reqHeight: Int): Int {
    var sample = 1
    var halfWidth = width / 2
    var halfHeight = height / 2
    while (halfWidth / sample >= reqWidth && halfHeight / sample >= reqHeight) {
      sample *= 2
    }
    return max(1, sample)
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

  private fun bundledModelAssetCandidates(safeName: String): List<String> {
    val base = safeName.substringBeforeLast('.', safeName)
    val expoAssetKey = "assets_ml_$base"
    return listOf(
      safeName,
      "ml/$safeName",
      "assets/ml/$safeName",
      expoAssetKey,
      "$expoAssetKey.tflite",
      "${expoAssetKey}_tflite",
      "${expoAssetKey}_tflite.tflite",
    ).distinct()
  }

  private fun discoveredBundledModelAssetCandidates(context: Context, safeName: String): List<String> {
    val base = safeName.substringBeforeLast('.', safeName)
    val matches = linkedSetOf<String>()
    fun maybeAdd(path: String) {
      val leaf = path.substringAfterLast('/')
      val normalisedPath = path.replace("/", "_").replace(".", "_")
      val normalisedLeaf = leaf.replace(".", "_")
      val hasModelName = leaf == safeName ||
        leaf == base ||
        leaf == "$base.tflite" ||
        normalisedLeaf == "${base}_tflite" ||
        normalisedPath.endsWith("assets_ml_${base}_tflite") ||
        normalisedPath.endsWith("assets_ml_$base")
      if (hasModelName || (leaf.contains(base) && (leaf.endsWith(".tflite") || !leaf.contains(".")))) {
        matches.add(path)
      }
    }
    fun walk(path: String, depth: Int) {
      if (depth > 5) return
      val entries = try { context.assets.list(path) ?: emptyArray() } catch (_: Throwable) { emptyArray() }
      for (entry in entries) {
        val child = if (path.isBlank()) entry else "$path/$entry"
        maybeAdd(child)
        walk(child, depth + 1)
      }
    }
    walk("", 0)
    return matches.toList()
  }

  private fun copyFirstBundledModelAsset(context: Context, safeName: String, target: File): Boolean {
    val candidates = (bundledModelAssetCandidates(safeName) + discoveredBundledModelAssetCandidates(context, safeName)).distinct()
    for (candidate in candidates) {
      try {
        context.assets.open(candidate).use { input ->
          FileOutputStream(target).use { output ->
            input.copyTo(output)
          }
        }
        if (target.exists() && target.length() >= bundledModelMinimumBytes) return true
      } catch (_: Throwable) {
        try { target.delete() } catch (_: Throwable) { /* keep looking */ }
      }
    }
    return false
  }

  private fun clamp01(value: Double): Double {
    return min(1.0, max(0.0, value))
  }
}

package expo.modules.volyumevideoexport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.Promise
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

/** A frame failure that rejects the whole call (a bad source); a single time that fails is a null slot instead. */
internal class FrameFailure(val code: String, message: String) : Exception(message)

/** extractFrames options, already validated: every number checked for finiteness and range before conversion. */
internal class FrameRequest(
  val uri: Uri,
  val timesMs: DoubleArray,
  val maxEdge: Int,
  val exact: Boolean,
)

/**
 * extractFrames (lead ruling 2026-10-16, after Sentry VOLYUME-3M): still frames
 * of a video for the share screen, written as JPEG files, off the JS thread.
 * Skia's video object is never used for this: on Android it starts a playing
 * MediaPlayer and leaks a hardware decoder per call, and its seek never ends at
 * the end of the stream. MediaMetadataRetriever decodes one frame per call,
 * owns no player, and is always released in finally.
 *
 * Rotation. The public docs for getFrameAtTime and getScaledFrameAtTime do not
 * state it, so this relies on the framework source, read for this change:
 * android_media_MediaMetadataRetriever.cpp (getBitmapFromVideoFrame, present
 * from Android 8.0, the module's minSdk 26, through Android 14) creates the
 * bitmap with width and height swapped for 90 and 270 and copies the pixels
 * through rotate0/90/180/270 by the track's rotation angle. So a frame arrives
 * upright, and its scaling keeps the upright aspect ratio ("scaling it so that
 * it fits into the desired size of dst_width by dst_height", which can scale
 * UP, so the box is capped at the video's own longer side).
 *
 * Never double-rotated: the only correction here is for a device whose
 * retriever skipped that step for 90 or 270, detected by comparing the
 * bitmap's orientation with the metadata's upright orientation. A 180 degree
 * frame cannot be told apart by its size, so it is left as the framework gave it.
 */
internal object FrameExtractor {
  const val OUTPUT_DIR = "share-frames"
  private const val MAX_TIMES = 64
  private const val MIN_EDGE = 16.0
  private const val MAX_EDGE = 4096.0
  private const val MAX_TIME_MS = 24.0 * 60 * 60 * 1000
  private const val JPEG_QUALITY = 85
  private const val FALLBACK_FRAME_MS = 1000.0 / 30.0

  fun parse(uri: String, timesMs: List<Double>, maxEdge: Double, exact: Boolean): FrameRequest? {
    val parsed = SourceUris.parse(uri) ?: return null
    if (timesMs.isEmpty() || timesMs.size > MAX_TIMES) return null
    val times = DoubleArray(timesMs.size)
    for (i in timesMs.indices) {
      val t = timesMs[i]
      if (!t.isFinite() || t < 0.0 || t > MAX_TIME_MS) return null
      times[i] = t
    }
    if (!maxEdge.isFinite() || maxEdge < MIN_EDGE || maxEdge > MAX_EDGE) return null
    return FrameRequest(parsed, times, Math.round(maxEdge).toInt(), exact)
  }

  /** Runs on the module's frame thread and settles [promise] exactly once. */
  fun extract(context: Context, request: FrameRequest, promise: Promise) {
    val frames = try {
      read(context, request)
    } catch (e: FrameFailure) {
      promise.reject(e.code, e.message, null)
      return
    } catch (_: OutOfMemoryError) {
      promise.reject(ExportCodes.FRAME, "Out of memory reading the video.", null)
      return
    } catch (e: Throwable) {
      promise.reject(ExportCodes.DECODE, e.message ?: "The video could not be read.", null)
      return
    }
    promise.resolve(frames)
  }

  /** Removes every frame file. Best effort; never throws. */
  fun deleteAll(context: Context) {
    try {
      File(context.cacheDir, OUTPUT_DIR).deleteRecursively()
    } catch (_: Throwable) {
      // Best effort: the cache directory is the system's to clear as well.
    }
  }

  private fun read(context: Context, request: FrameRequest): ArrayList<Any?> {
    val retriever = MediaMetadataRetriever()
    try {
      try {
        retriever.setDataSource(context, request.uri)
      } catch (_: Throwable) {
        throw FrameFailure(ExportCodes.SOURCE, "The video could not be opened.")
      }
      if (retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) != "yes") {
        throw FrameFailure(ExportCodes.SOURCE, "The file has no video track.")
      }
      val rawWidth = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
        ?.takeIf { it > 0 }
      val rawHeight = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()
        ?.takeIf { it > 0 }
      val rotation = Probe.normaliseRotation(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0,
      )
      val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
        ?.takeIf { it > 0 }
      val lastMs = if (durationMs == null) null else max(0.0, durationMs - frameMs(retriever, durationMs))

      // The upright orientation the metadata promises (null when unknown or square).
      val sideways = rotation % 180 != 0
      val uprightLandscape: Boolean? = if (rawWidth == null || rawHeight == null || rawWidth == rawHeight) {
        null
      } else if (sideways) {
        rawHeight > rawWidth
      } else {
        rawWidth > rawHeight
      }
      // Square box: the longer upright edge fits whichever way the frame turns.
      // Capped at the video's own longer side, because the scaled path can enlarge.
      val box = if (rawWidth != null && rawHeight != null) min(request.maxEdge, max(rawWidth, rawHeight)) else request.maxEdge

      val dir = File(context.cacheDir, OUTPUT_DIR)
      val out = ArrayList<Any?>(request.timesMs.size)
      for (requested in request.timesMs) {
        val atMs = if (lastMs == null) max(0.0, requested) else min(max(0.0, requested), lastMs)
        val frame = try {
          frameAt(retriever, atMs, box, request.maxEdge, request.exact, rotation, uprightLandscape, dir)
        } catch (_: Throwable) {
          // One time that fails (memory included) is a null slot; the rest still come back.
          null
        }
        out.add(frame)
      }
      return out
    } finally {
      try {
        retriever.release()
      } catch (_: Throwable) {
        // release() declares IOException from API 29; nothing to recover.
      }
    }
  }

  /** One frame's length: from the frame count on API 28+, else 30 fps. */
  private fun frameMs(retriever: MediaMetadataRetriever, durationMs: Long): Double {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val count = try {
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)?.toLongOrNull()
      } catch (_: Throwable) {
        null
      }
      if (count != null && count > 0) {
        val ms = durationMs.toDouble() / count.toDouble()
        if (ms.isFinite() && ms > 0.0) return ms
      }
    }
    return FALLBACK_FRAME_MS
  }

  private fun frameAt(
    retriever: MediaMetadataRetriever,
    atMs: Double,
    box: Int,
    maxEdge: Int,
    exact: Boolean,
    rotation: Int,
    uprightLandscape: Boolean?,
    dir: File,
  ): Map<String, Any?>? {
    val us = Math.round(atMs * 1000.0)
    val grabbed = grab(retriever, us, box, exact) ?: return null
    var bitmap: Bitmap = grabbed
    try {
      bitmap = upright(bitmap, rotation, uprightLandscape)
      bitmap = fit(bitmap, maxEdge)
      dir.mkdirs()
      val file = File(dir, "${UUID.randomUUID()}.jpg")
      val written = FileOutputStream(file).use { stream ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
      }
      if (!written) {
        file.delete()
        return null
      }
      return mapOf(
        // Uri.fromFile gives file:///..., which a plain React Native Image reads.
        "uri" to Uri.fromFile(file).toString(),
        "width" to bitmap.width,
        "height" to bitmap.height,
        "timeMs" to atMs,
      )
    } finally {
      if (bitmap !== grabbed && !grabbed.isRecycled) grabbed.recycle()
      if (!bitmap.isRecycled) bitmap.recycle()
    }
  }

  /**
   * [exact] (the preview still): the exact frame first, so the still is the
   * frame the export starts on (lead ruling 2026-10-16; iOS asks for zero
   * tolerance too), then the nearest sync frame when a decoder cannot give
   * the exact one. Otherwise (a thumbnail, the trim strip, the tone): the
   * nearest sync frame first, which needs no decoding forward from it, then
   * the exact one.
   */
  private fun grab(retriever: MediaMetadataRetriever, us: Long, box: Int, exact: Boolean): Bitmap? {
    val first = if (exact) MediaMetadataRetriever.OPTION_CLOSEST else MediaMetadataRetriever.OPTION_CLOSEST_SYNC
    val second = if (exact) MediaMetadataRetriever.OPTION_CLOSEST_SYNC else MediaMetadataRetriever.OPTION_CLOSEST
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      return retriever.getScaledFrameAtTime(us, first, box, box)
        ?: retriever.getScaledFrameAtTime(us, second, box, box)
    }
    // API 26: no scaled call; the full frame is scaled down by fit().
    return retriever.getFrameAtTime(us, first)
      ?: retriever.getFrameAtTime(us, second)
  }

  /** Turns the frame only when a 90 or 270 degree video came back with the wrong orientation (see the header). */
  private fun upright(bitmap: Bitmap, rotation: Int, uprightLandscape: Boolean?): Bitmap {
    if (rotation != 90 && rotation != 270) return bitmap
    if (uprightLandscape == null || bitmap.width == bitmap.height) return bitmap
    if ((bitmap.width > bitmap.height) == uprightLandscape) return bitmap
    val matrix = Matrix()
    matrix.postRotate(rotation.toFloat())
    val turned = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (turned !== bitmap) bitmap.recycle()
    return turned
  }

  /** Scales down so the longer edge is at most [maxEdge]; never enlarges. */
  private fun fit(bitmap: Bitmap, maxEdge: Int): Bitmap {
    val longer = max(bitmap.width, bitmap.height)
    if (longer <= maxEdge) return bitmap
    val scale = maxEdge.toDouble() / longer.toDouble()
    val w = min(maxEdge, max(1, Math.round(bitmap.width * scale).toInt()))
    val h = min(maxEdge, max(1, Math.round(bitmap.height * scale).toInt()))
    val scaled = Bitmap.createScaledBitmap(bitmap, w, h, true)
    if (scaled !== bitmap) bitmap.recycle()
    return scaled
  }
}

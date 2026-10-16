package expo.modules.volyumevideoexport

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

/**
 * The URIs this module accepts: `file://` (what expo-file-system, expo-camera
 * and expo-image-picker hand over), `content://`, or a bare absolute path.
 * Anything else is refused rather than guessed at.
 */
internal object SourceUris {
  fun parse(value: String?): Uri? {
    val text = value?.trim().orEmpty()
    if (text.isEmpty()) return null
    if (text.startsWith("/")) return Uri.fromFile(File(text))
    val uri = Uri.parse(text)
    return when (uri.scheme) {
      "file" -> if (uri.path.isNullOrEmpty()) null else uri
      "content" -> uri
      else -> null
    }
  }

  fun open(context: Context, uri: Uri): InputStream? =
    if (uri.scheme == "file") {
      uri.path?.let { path -> File(path).takeIf { it.isFile }?.let { FileInputStream(it) } }
    } else {
      context.contentResolver.openInputStream(uri)
    }

  fun sizeBytes(context: Context, uri: Uri): Long? {
    return try {
      if (uri.scheme == "file") {
        uri.path?.let { File(it) }?.takeIf { it.isFile }?.length()
      } else {
        context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { afd ->
          afd.length.takeIf { it >= 0 }
        }
      }
    } catch (_: Throwable) {
      null
    }
  }
}

/**
 * probeVideo (01-NATIVE-RESEARCH.md section 5.1): the upright facts about a
 * clip that framing needs, because expo-camera resolves with a URI only.
 * Returns null when the file cannot be read as a video; never throws.
 */
internal object Probe {
  private const val COLOR_TRANSFER_ST2084 = 6 // MediaFormat.COLOR_TRANSFER_ST2084 (PQ)
  private const val COLOR_TRANSFER_HLG = 7 // MediaFormat.COLOR_TRANSFER_HLG

  private data class TrackFacts(val mime: String?, val fps: Double?, val hdr: Boolean, val hasAudio: Boolean)

  fun read(context: Context, uriString: String): Map<String, Any?>? {
    val uri = SourceUris.parse(uriString) ?: return null
    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(context, uri)
      val rawWidth = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
      val rawHeight = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()
      val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
      if (rawWidth == null || rawHeight == null || rawWidth <= 0 || rawHeight <= 0) return null
      if (durationMs == null || durationMs < 0) return null
      val rotation = normaliseRotation(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0,
      )
      // Upright size: a 90 or 270 degree clip swaps width and height, as
      // expo-image-picker does on Android (research report section 5.1).
      val sideways = rotation % 180 != 0
      val width = if (sideways) rawHeight else rawWidth
      val height = if (sideways) rawWidth else rawHeight

      val facts = readTrackFacts(context, uri)
      val frameCountFps = if (facts.fps == null && Build.VERSION.SDK_INT >= 28 && durationMs > 0) {
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)
          ?.toLongOrNull()
          ?.takeIf { it > 0 }
          ?.let { it * 1000.0 / durationMs }
      } else {
        null
      }
      val hasAudioMeta = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes"

      return mapOf(
        "width" to width,
        "height" to height,
        "rotation" to rotation,
        "durationMs" to durationMs.toDouble(),
        "fps" to (facts.fps ?: frameCountFps),
        "codec" to codecName(facts.mime),
        "hdr" to facts.hdr,
        "hasAudio" to (facts.hasAudio || hasAudioMeta),
        "fileSizeBytes" to SourceUris.sizeBytes(context, uri)?.toDouble(),
      )
    } catch (_: Throwable) {
      return null
    } finally {
      try {
        retriever.release()
      } catch (_: Throwable) {
        // release() declares IOException from API 29; nothing to recover.
      }
    }
  }

  private fun readTrackFacts(context: Context, uri: Uri): TrackFacts {
    val extractor = MediaExtractor()
    try {
      extractor.setDataSource(context, uri, null)
      var mime: String? = null
      var fps: Double? = null
      var hdr = false
      var hasAudio = false
      for (i in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(i)
        val trackMime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (trackMime.startsWith("audio/")) {
          hasAudio = true
          continue
        }
        if (!trackMime.startsWith("video/") || mime != null) continue
        mime = trackMime
        // KEY_FRAME_RATE is optional and may be stored as an int or a float;
        // an absent key is unknown, never 0 (research report section 2.1).
        fps = numberOrNull(format, MediaFormat.KEY_FRAME_RATE)?.takeIf { it > 0 }
        val transfer = numberOrNull(format, MediaFormat.KEY_COLOR_TRANSFER)?.toInt()
        hdr = transfer == COLOR_TRANSFER_ST2084 ||
          transfer == COLOR_TRANSFER_HLG ||
          trackMime == MediaFormat.MIMETYPE_VIDEO_DOLBY_VISION
      }
      return TrackFacts(mime, fps, hdr, hasAudio)
    } catch (_: Throwable) {
      return TrackFacts(null, null, false, false)
    } finally {
      try {
        extractor.release()
      } catch (_: Throwable) {
        // Best effort.
      }
    }
  }

  private fun numberOrNull(format: MediaFormat, key: String): Double? {
    if (!format.containsKey(key)) return null
    val value = try {
      format.getInteger(key).toDouble()
    } catch (_: ClassCastException) {
      try {
        format.getFloat(key).toDouble()
      } catch (_: Throwable) {
        null
      }
    } catch (_: Throwable) {
      null
    }
    return value?.takeIf { it.isFinite() }
  }

  /** Any degrees to 0, 90, 180 or 270 (shared with FrameExtractor). */
  internal fun normaliseRotation(degrees: Int): Int {
    val r = ((degrees % 360) + 360) % 360
    return ((r + 45) / 90 * 90) % 360
  }

  /** Short codec names shared with iOS: h264, hevc, dolby-vision, av1, vp9, else the MIME subtype. */
  private fun codecName(mime: String?): String? = when (mime) {
    null -> null
    MediaFormat.MIMETYPE_VIDEO_AVC -> "h264"
    MediaFormat.MIMETYPE_VIDEO_HEVC -> "hevc"
    MediaFormat.MIMETYPE_VIDEO_DOLBY_VISION -> "dolby-vision"
    MediaFormat.MIMETYPE_VIDEO_AV1 -> "av1"
    MediaFormat.MIMETYPE_VIDEO_VP9 -> "vp9"
    else -> mime.removePrefix("video/")
  }
}

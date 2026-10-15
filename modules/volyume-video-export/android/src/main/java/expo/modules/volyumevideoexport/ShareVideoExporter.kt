package expo.modules.volyumevideoexport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.system.ErrnoException
import android.system.OsConstants
import androidx.annotation.OptIn
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.Crop
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbMatrix
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import java.io.File
import kotlin.math.max
import kotlin.math.min

/** Rejection codes shared with iOS and src/lib/shareVideo/engine.js (research report section 5.4, classes A to G). */
internal object ExportCodes {
  const val DECODE = "E_DECODE" // A: the phone cannot decode the clip
  const val ENCODE = "E_ENCODE" // B: the phone cannot make the H.264, or another failure
  const val FRAME = "E_FRAME" // C: frame processing failed, often memory
  const val SOURCE = "E_SOURCE" // D: the clip cannot be read
  const val SPACE = "E_SPACE" // E: storage full
  const val BACKGROUND = "E_BACKGROUND" // G: the app left the foreground mid-export (D229 addendum 5, ruling 16)
  const val CANCELLED = "E_CANCELLED"
  const val BUSY = "E_BUSY"
  const val UNAVAILABLE = "E_UNAVAILABLE"
  const val INVALID = "E_INVALID"
  const val UNSUPPORTED = "E_UNSUPPORTED"
  const val WALLPAPER = "E_WALLPAPER"
}

/**
 * One export, already validated. `matrix` is lookMatrix(key, strength) (20
 * numbers, strength already applied); the rect is photoCoverRect's output in
 * output pixels, top-left origin. Native holds no copy of the framing maths.
 */
internal class ExportSpec(
  val sourceUri: Uri,
  val startMs: Long,
  val durationMs: Long,
  val matrix: FloatArray?,
  val rectX: Float,
  val rectY: Float,
  val rectW: Float,
  val rectH: Float,
  val overlayPngUri: Uri,
  val outWidth: Int,
  val outHeight: Int,
  val bitrate: Int,
)

/**
 * Skia's row-major 4x5 colour matrix (R' = m0 R + m1 G + m2 B + m3 A + m4, and
 * so on, bias in 0..1) as Media3's column-major 4x4 RgbMatrix. Media3 applies
 * it as uRgbMatrix * vec4(rgb, 1) on gamma-encoded values in the default
 * working colour space, so the fourth column is a per-channel bias and the
 * look matches the photo path (research report section 1.3). The clip is
 * opaque (A = 1), so the alpha-to-colour terms fold into the bias; every
 * current look has them at 0, pinned in lookMatrixContract.test.js.
 */
internal fun skiaToRgbMatrix(m: FloatArray): FloatArray = floatArrayOf(
  m[0], m[5], m[10], 0f,
  m[1], m[6], m[11], 0f,
  m[2], m[7], m[12], 0f,
  m[4] + m[3], m[9] + m[8], m[14] + m[13], 1f,
)

/**
 * The Android share video export (research report section 1, route A, D229
 * addendum 2): Media3 Transformer trims the clip, drops its audio, caps it at
 * 30 fps, places it with Crop and Presentation (one GPU pass), applies the look
 * with RgbMatrix, then draws the card with OverlayEffect, and writes H.264
 * SDR (HDR is tone-mapped with OpenGL). The card is completely still on the
 * video, exactly as on a photo: its PNG carries the outline, the scrim and
 * the data (founder correction, 2026-10-15: no outline draw-on).
 *
 * Threading: every method runs on the main looper (the module pins its
 * functions to Queues.MAIN), which is the Transformer's looper. One export at
 * a time: Transformer forbids concurrent exports on one instance.
 */
@OptIn(UnstableApi::class)
internal class ShareVideoExporter(private val context: Context) {
  interface Callbacks {
    fun onProgress(progress: Double)
    fun onSuccess(result: Map<String, Any?>)
    fun onFailure(code: String, message: String)
  }

  private val main = Handler(Looper.getMainLooper())
  private var transformer: Transformer? = null
  private var outFile: File? = null
  private var ticker: Runnable? = null
  private var callbacks: Callbacks? = null
  private var running: ExportSpec? = null

  val isRunning: Boolean
    get() = callbacks != null

  fun start(spec: ExportSpec, cb: Callbacks) {
    if (callbacks != null) {
      cb.onFailure(ExportCodes.BUSY, "An export is already running.")
      return
    }
    callbacks = cb
    running = spec
    try {
      val dir = File(context.cacheDir, OUTPUT_DIR).apply { mkdirs() }
      // Storage preflight: the file is bitrate x seconds / 8 with under 1 per
      // cent of MP4 overhead (research report section 8.1); ask for half as
      // much again plus room for the encoder's own buffers.
      val estimate = spec.bitrate.toLong() * spec.durationMs / 8000L
      if (dir.usableSpace < estimate * 3L / 2L + SPACE_MARGIN_BYTES) {
        fail(ExportCodes.SPACE, "Not enough free storage for the export.")
        return
      }
      val overlay = decodeOverlay(spec)
      if (overlay == null) {
        fail(ExportCodes.ENCODE, "The card image could not be read.")
        return
      }
      val out = File(dir, "volyume-share-${System.currentTimeMillis()}.mp4")
      outFile = out

      val item = MediaItem.Builder()
        .setUri(spec.sourceUri)
        .setClippingConfiguration(
          MediaItem.ClippingConfiguration.Builder()
            .setStartPositionMs(spec.startMs)
            .setEndPositionMs(spec.startMs + spec.durationMs)
            .build(),
        )
        .build()
      val edited = EditedMediaItem.Builder(item)
        .setRemoveAudio(true)
        .setFrameRate(30) // a maximum: 60 fps sources drop to 30, slower sources are untouched
        .setEffects(Effects(emptyList(), buildEffects(spec, overlay)))
        .build()
      val composition = Composition.Builder(EditedMediaItemSequence.Builder(edited).build())
        // Mandatory for H.264 SDR output: the default KEEP_HDR falls back to
        // HEVC for HDR sources (research report section 1.6). API 29+; below
        // that an HDR clip fails to decode and maps to E_DECODE.
        .setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL)
        .build()

      val t = Transformer.Builder(context)
        .setVideoMimeType(MimeTypes.VIDEO_H264)
        .setEncoderFactory(
          DefaultEncoderFactory.Builder(context)
            .setRequestedVideoEncoderSettings(
              VideoEncoderSettings.Builder().setBitrate(spec.bitrate).build(),
            )
            .setEnableFallback(true)
            .build(),
        )
        .addListener(listener)
        .build()
      transformer = t
      t.start(composition, out.absolutePath)
      startTicker(t)
    } catch (_: OutOfMemoryError) {
      fail(ExportCodes.FRAME, "Out of memory preparing the export.")
    } catch (e: Throwable) {
      fail(codeForThrowable(e), e.message ?: "The export could not start.")
    }
  }

  /** Cancels a running export, rejects it with [code] and deletes the partial file. False when nothing runs. */
  fun cancel(code: String): Boolean {
    if (callbacks == null) return false
    try {
      // cancel() calls no listener and does not delete the output file
      // (research report section 1.2), so both happen here.
      transformer?.cancel()
    } catch (_: Throwable) {
      // Already released; the file is still deleted below.
    }
    fail(code, if (code == ExportCodes.BACKGROUND) "The app left the foreground." else "Cancelled.")
    return true
  }

  private val listener = object : Transformer.Listener {
    override fun onCompleted(composition: Composition, exportResult: ExportResult) {
      val cb = callbacks ?: return
      val spec = running
      val file = outFile
      stopTicker()
      transformer = null
      outFile = null
      running = null
      callbacks = null
      cb.onProgress(1.0)
      if (spec == null || file == null || !file.isFile) {
        cb.onFailure(ExportCodes.ENCODE, "The export finished without a file.")
        return
      }
      // Report the real output size: encoder fallback can change it (research
      // report section 1.8). The probe reads the upright size, so a portrait
      // export stored landscape with a rotation flag reads as portrait.
      Thread {
        val probe = Probe.read(context, Uri.fromFile(file).toString())
        cb.onSuccess(
          mapOf(
            // Uri.fromFile gives file:///..., which MediaLibrary needs (section 6.4).
            "uri" to Uri.fromFile(file).toString(),
            "width" to ((probe?.get("width") as? Int) ?: spec.outWidth),
            "height" to ((probe?.get("height") as? Int) ?: spec.outHeight),
            "durationMs" to ((probe?.get("durationMs") as? Double) ?: spec.durationMs.toDouble()),
            "fileSizeBytes" to file.length().toDouble(),
          ),
        )
      }.start()
    }

    override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
      if (callbacks == null) return
      fail(codeForExportException(exportException), "${exportException.errorCodeName}: ${exportException.message ?: ""}")
    }
  }

  private fun fail(code: String, message: String) {
    val cb = callbacks ?: return
    stopTicker()
    transformer = null
    running = null
    callbacks = null
    deleteOutput()
    cb.onFailure(code, message)
  }

  private fun deleteOutput() {
    val file = outFile ?: return
    outFile = null
    try {
      file.delete()
    } catch (_: Throwable) {
      // Best effort; the retry below covers a muxer still closing.
    }
    // A second pass in case a released muxer was still closing the file.
    main.postDelayed({ if (file.exists()) file.delete() }, PARTIAL_FILE_RETRY_MS)
  }

  private fun startTicker(t: Transformer) {
    val holder = ProgressHolder()
    var last = -1
    val tick = object : Runnable {
      override fun run() {
        val cb = callbacks ?: return
        if (t.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE && holder.progress != last) {
          last = holder.progress
          cb.onProgress(min(1.0, max(0.0, holder.progress / 100.0)))
        }
        main.postDelayed(this, PROGRESS_INTERVAL_MS)
      }
    }
    ticker = tick
    main.post(tick)
  }

  private fun stopTicker() {
    ticker?.let { main.removeCallbacks(it) }
    ticker = null
  }

  private fun buildEffects(spec: ExportSpec, overlay: Bitmap): List<Effect> {
    // The visible window of the source as fractions of its upright size
    // (top-left origin), then in Media3's NDC with y up (research report
    // section 1.4). Values beyond -1 and 1 are allowed by Crop.
    val outW = spec.outWidth.toFloat()
    val outH = spec.outHeight.toFloat()
    val u0 = -spec.rectX / spec.rectW
    val u1 = (outW - spec.rectX) / spec.rectW
    val v0 = -spec.rectY / spec.rectH
    val v1 = (outH - spec.rectY) / spec.rectH
    val effects = mutableListOf<Effect>(
      Crop(2f * u0 - 1f, 2f * u1 - 1f, 1f - 2f * v1, 1f - 2f * v0),
      Presentation.createForWidthAndHeight(spec.outWidth, spec.outHeight, Presentation.LAYOUT_STRETCH_TO_FIT),
    )
    spec.matrix?.let { m ->
      val rgb = skiaToRgbMatrix(m)
      effects += RgbMatrix { _, _ -> rgb }
    }
    // After the matrix effects, so the look reaches the clip and never the
    // card (research report section 1.5).
    effects += OverlayEffect(listOf(BitmapOverlay.createStaticBitmapOverlay(overlay)))
    return effects
  }

  private fun decodeOverlay(spec: ExportSpec): Bitmap? {
    val options = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
    val decoded = SourceUris.open(context, spec.overlayPngUri)?.use { BitmapFactory.decodeStream(it, null, options) }
      ?: return null
    if (decoded.width == spec.outWidth && decoded.height == spec.outHeight) return decoded
    // OverlayEffect draws a bitmap at its own pixel size; a card rendered at
    // another size is scaled to the frame so it still lines up.
    val scaled = Bitmap.createScaledBitmap(decoded, spec.outWidth, spec.outHeight, true)
    if (scaled !== decoded) decoded.recycle()
    return scaled
  }

  companion object {
    const val OUTPUT_DIR = "share-video"
    private const val PROGRESS_INTERVAL_MS = 500L
    private const val PARTIAL_FILE_RETRY_MS = 1000L
    private const val SPACE_MARGIN_BYTES = 16L * 1024L * 1024L

    /** ExportException.errorCode ranges to the shared classes (research report section 5.4). */
    fun codeForExportException(e: ExportException): String {
      if (isOutOfSpace(e)) return ExportCodes.SPACE
      return when (e.errorCode) {
        in 2000..2999 -> ExportCodes.SOURCE // IO_*: file not found, no permission, unreadable
        in 3000..3999 -> ExportCodes.DECODE // DECODER_INIT_FAILED, DECODING_FAILED, DECODING_FORMAT_UNSUPPORTED
        in 4000..4999 -> ExportCodes.ENCODE // ENCODER_INIT_FAILED, ENCODING_FAILED, ENCODING_FORMAT_UNSUPPORTED
        in 5000..5999 -> ExportCodes.FRAME // VIDEO_FRAME_PROCESSING_FAILED
        else -> ExportCodes.ENCODE // MUXING_*, UNSPECIFIED, FAILED_RUNTIME_CHECK
      }
    }

    fun codeForThrowable(e: Throwable): String = when {
      isOutOfSpace(e) -> ExportCodes.SPACE
      e is OutOfMemoryError -> ExportCodes.FRAME
      e is SecurityException || e is java.io.FileNotFoundException -> ExportCodes.SOURCE
      else -> ExportCodes.ENCODE
    }

    private fun isOutOfSpace(e: Throwable): Boolean {
      var cause: Throwable? = e
      var depth = 0
      while (cause != null && depth < 8) {
        if (cause is ErrnoException && cause.errno == OsConstants.ENOSPC) return true
        val message = cause.message.orEmpty()
        if (message.contains("ENOSPC") || message.contains("No space left", ignoreCase = true)) return true
        cause = cause.cause
        depth += 1
      }
      return false
    }
  }
}

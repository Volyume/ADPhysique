package expo.modules.volyumevideoexport

import android.app.WallpaperManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * VolyumeVideoExport (D229, research report sections 1 and 6): probe a clip,
 * export the share video, cancel it, set the lock screen wallpaper, and
 * extract still frames as JPEG files for the share screen (extractFrames,
 * deleteFrames; FrameExtractor.kt).
 *
 * The JS side is src/lib/shareVideo/engine.js. Every number from JS is checked
 * for finiteness and range BEFORE it is converted (adversarial audit
 * 2026-08-26: Kotlin's Double.toLong() saturates NaN to 0 and infinity to
 * Long.MAX_VALUE rather than failing).
 */
class VolyumeVideoExportModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var exporter: ShareVideoExporter? = null

  private fun exporterFor(context: Context): ShareVideoExporter =
    exporter ?: ShareVideoExporter(context.applicationContext).also { exporter = it }

  // Frame extraction runs on its own single thread, never the JS thread and
  // never Expo's shared AsyncFunction queue (one HandlerThread for every
  // module's async functions in expo-modules-core 3.0), so a slow decode
  // cannot hold up anything else. One thread also means one retriever at a
  // time, and deleteFrames queues behind any extraction still writing.
  private val frameLock = Any()
  private var frameExecutor: ExecutorService? = null

  private fun frameThread(): ExecutorService = synchronized(frameLock) {
    frameExecutor ?: Executors.newSingleThreadExecutor().also { frameExecutor = it }
  }

  override fun definition() = ModuleDefinition {
    Name("VolyumeVideoExport")

    Events("onExportProgress")

    AsyncFunction("probeVideo") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      try {
        promise.resolve(Probe.read(context, uri))
      } catch (_: Throwable) {
        promise.resolve(null)
      }
    }

    // Still frames as JPEG files (lead ruling 2026-10-16: Skia's video object
    // is never used). Resolves one slot per time, null where that time failed;
    // rejects only for bad options or a source that cannot be opened. `exact`
    // is true for the preview's still only; a thumbnail, the trim strip and
    // the tone take the nearest sync frame first (FrameExtractor.grab).
    AsyncFunction("extractFrames") { uri: String, timesMs: List<Double>, maxEdge: Double, exact: Boolean, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(ExportCodes.UNAVAILABLE, "No React context.", null)
        return@AsyncFunction
      }
      if (SourceUris.parse(uri) == null) {
        promise.reject(ExportCodes.SOURCE, "Not a file or content URI.", null)
        return@AsyncFunction
      }
      val request = FrameExtractor.parse(uri, timesMs, maxEdge, exact)
      if (request == null) {
        promise.reject(ExportCodes.INVALID, "Frame options failed validation.", null)
        return@AsyncFunction
      }
      val appCtx = context.applicationContext
      try {
        frameThread().execute { FrameExtractor.extract(appCtx, request, promise) }
      } catch (e: Throwable) {
        promise.reject(ExportCodes.UNAVAILABLE, e.message ?: "Frames are unavailable.", null)
      }
    }

    // Removes every frame file. Best effort: always resolves.
    AsyncFunction("deleteFrames") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val appCtx = context.applicationContext
      try {
        frameThread().execute {
          FrameExtractor.deleteAll(appCtx)
          promise.resolve(null)
        }
      } catch (_: Throwable) {
        promise.resolve(null)
      }
    }

    // Main queue: Transformer's start, getProgress and cancel must run on its
    // looper (research report section 1.2).
    AsyncFunction("exportShareVideo") { options: Map<String, Any?>, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(ExportCodes.UNAVAILABLE, "No React context.", null)
        return@AsyncFunction
      }
      val spec = ExportOptions.parse(options)
      if (spec == null) {
        promise.reject(ExportCodes.INVALID, "Export options failed validation.", null)
        return@AsyncFunction
      }
      exporterFor(context).start(
        spec,
        object : ShareVideoExporter.Callbacks {
          override fun onProgress(progress: Double) {
            try {
              sendEvent("onExportProgress", mapOf("progress" to progress))
            } catch (_: Throwable) {
              // The JS context may be going away; the export carries on.
            }
          }

          override fun onSuccess(result: Map<String, Any?>) {
            promise.resolve(result)
          }

          override fun onFailure(code: String, message: String) {
            promise.reject(code, message, null)
          }
        },
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("cancelExport") { promise: Promise ->
      exporter?.cancel(ExportCodes.CANCELLED)
      promise.resolve(null)
    }.runOnQueue(Queues.MAIN)

    // D229 addendum 6, level-up 2: "Set as wallpaper" on the Full screen fit
    // sets the lock screen. SET_WALLPAPER is a normal permission.
    AsyncFunction("setLockScreenWallpaper") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(ExportCodes.UNAVAILABLE, "No React context.", null)
        return@AsyncFunction
      }
      val parsed = SourceUris.parse(uri)
      if (parsed == null) {
        promise.reject(ExportCodes.SOURCE, "Not a file or content URI.", null)
        return@AsyncFunction
      }
      try {
        val manager = WallpaperManager.getInstance(context)
        if (!manager.isWallpaperSupported || !manager.isSetWallpaperAllowed) {
          promise.reject(ExportCodes.UNSUPPORTED, "Wallpaper changes are not allowed on this device.", null)
          return@AsyncFunction
        }
        val stream = SourceUris.open(context, parsed)
        if (stream == null) {
          promise.reject(ExportCodes.SOURCE, "The picture could not be opened.", null)
          return@AsyncFunction
        }
        val id = stream.use { manager.setStream(it, null, true, WallpaperManager.FLAG_LOCK) }
        if (id == 0) {
          promise.reject(ExportCodes.WALLPAPER, "The system did not set the wallpaper.", null)
        } else {
          promise.resolve(true)
        }
      } catch (_: SecurityException) {
        promise.reject(ExportCodes.UNSUPPORTED, "Wallpaper changes are not allowed on this device.", null)
      } catch (e: IOException) {
        promise.reject(ExportCodes.WALLPAPER, e.message ?: "The wallpaper could not be set.", null)
      } catch (e: Throwable) {
        promise.reject(ExportCodes.WALLPAPER, e.message ?: "The wallpaper could not be set.", null)
      }
    }

    // D229 addendum 5, ruling 16: the export runs in the foreground only, on
    // both platforms. Leaving the app ends it with E_BACKGROUND (the calm
    // "start again" line) and deletes the partial file.
    OnActivityEntersBackground {
      main.post { exporter?.cancel(ExportCodes.BACKGROUND) }
    }

    OnDestroy {
      main.post { exporter?.cancel(ExportCodes.CANCELLED) }
      // Queued extractions still run to the end and settle their promises.
      synchronized(frameLock) {
        frameExecutor?.shutdown()
        frameExecutor = null
      }
    }
  }
}

/** Validates the JS options (engine.js sends exactly these keys) into an [ExportSpec], or null. */
internal object ExportOptions {
  const val MAX_DURATION_MS = 15_000.0
  private const val MAX_START_MS = 24.0 * 60 * 60 * 1000
  private const val MAX_COORD = 1_000_000.0

  fun parse(o: Map<String, Any?>): ExportSpec? {
    val sourceUri = SourceUris.parse(o["sourceUri"] as? String) ?: return null
    val overlayUri = SourceUris.parse(o["overlayPngUri"] as? String) ?: return null
    val startMs = finite(o["startMs"])?.takeIf { it >= 0.0 && it <= MAX_START_MS } ?: return null
    val durationMs = finite(o["durationMs"])?.takeIf { it > 0.0 && it <= MAX_DURATION_MS } ?: return null
    val outWidth = evenSize(o["outWidth"]) ?: return null
    val outHeight = evenSize(o["outHeight"]) ?: return null
    val bitrate = if (o["bitrate"] == null) {
      DEFAULT_BITRATE
    } else {
      finite(o["bitrate"])?.takeIf { it >= MIN_BITRATE && it <= MAX_BITRATE } ?: return null
    }
    val rect = o["rect"] as? Map<*, *> ?: return null
    val x = finite(rect["x"])?.takeIf { kotlin.math.abs(it) <= MAX_COORD } ?: return null
    val y = finite(rect["y"])?.takeIf { kotlin.math.abs(it) <= MAX_COORD } ?: return null
    val w = finite(rect["w"])?.takeIf { it > 0.0 && it <= MAX_COORD } ?: return null
    val h = finite(rect["h"])?.takeIf { it > 0.0 && it <= MAX_COORD } ?: return null
    val matrix = when (val raw = o["matrix"]) {
      null -> null
      is List<*> -> {
        if (raw.size != 20) return null
        val values = FloatArray(20)
        for (i in 0 until 20) values[i] = finite(raw[i])?.toFloat() ?: return null
        values
      }
      else -> return null
    }
    return ExportSpec(
      sourceUri = sourceUri,
      startMs = Math.round(startMs),
      durationMs = Math.round(durationMs),
      matrix = matrix,
      rectX = x.toFloat(),
      rectY = y.toFloat(),
      rectW = w.toFloat(),
      rectH = h.toFloat(),
      overlayPngUri = overlayUri,
      outWidth = outWidth,
      outHeight = outHeight,
      bitrate = Math.round(bitrate).toInt(),
    )
  }

  private const val DEFAULT_BITRATE = 8_000_000.0
  private const val MIN_BITRATE = 1_000_000.0
  private const val MAX_BITRATE = 20_000_000.0

  private fun finite(value: Any?): Double? = (value as? Number)?.toDouble()?.takeIf { it.isFinite() }

  // H.264 4:2:0 needs even sides; 16 to 4096 covers every card fit.
  private fun evenSize(value: Any?): Int? {
    val d = finite(value) ?: return null
    if (d < 16.0 || d > 4096.0 || d != Math.floor(d)) return null
    val n = d.toInt()
    return if (n % 2 == 0) n else null
  }
}

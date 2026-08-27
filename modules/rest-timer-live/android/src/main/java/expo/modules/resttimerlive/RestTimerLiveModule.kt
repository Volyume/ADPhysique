package expo.modules.resttimerlive

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Posts an ongoing, sticky notification whose timestamp ticks down live using
 * Android's built-in chronometer. The notification appears on the lock screen
 * and in the notification shade and updates every second without the app
 * having to wake.
 *
 * The combination that makes this work is:
 *   .setUsesChronometer(true)        // show timestamp as a counter
 *   .setChronometerCountDown(true)   // count down rather than up
 *   .setWhen(endTimeMs)              // anchor to the future end time
 *   .setShowWhen(true)               // actually display the value
 *
 * Posting via a single fixed NOTIF_ID means this notification replaces the
 * static "Rest ends at HH:MM" notification posted by expo-notifications
 * rather than appearing alongside it.
 */
class RestTimerLiveModule : Module() {

  private val NOTIF_ID = 71001
  private val DEFAULT_CHANNEL_ID = "rest-timer"
  private val VOLYUME_AMBER = 0xFFF59E0B.toInt()

  // Cue key -> offset from the rest END, matching the in-app ladder in
  // src/components/RestTimer.js (three/two/one at T-3/-2/-1, go at T-0).
  private val REST_CUES = listOf(
    "three" to -3000L,
    "two" to -2000L,
    "one" to -1000L,
    "go" to 0L,
  )
  private val REST_CUE_REQUEST_BASE = 72001

  // A rest end time arrives from JS as a plain number, and all three entry
  // points below fed it straight into `.toLong()`. Kotlin's Double.toLong()
  // SATURATES rather than throwing, so NaN became 0 while both Infinity and
  // any huge finite double became Long.MAX_VALUE - which then sailed past the
  // `endTimeMs <= now` guard, because Long.MAX_VALUE is not in the past. Every
  // resulting state was sticky and un-dismissable by the user: an ongoing
  // chronometer counting down to the year 292278994, a foreground service that
  // never reaches its own stop time, and exact alarms parked for eternity.
  //
  // The horizon is deliberately far wider than any real rest (JS caps at one
  // hour) because this is defence in depth, not the product rule: it exists to
  // refuse the impossible, never to police the unusual.
  private val MAX_REST_HORIZON_MS = 24L * 60L * 60L * 1000L

  /**
   * Reads options["endTimeMs"] as a usable future timestamp, or null.
   *
   * Null means "do not start" for every caller. None of them may substitute a
   * default: a rest timer anchored to a made-up end time is worse than no rest
   * timer, because the user sees a countdown that is confidently wrong.
   */
  private fun readEndTimeMs(options: Map<String, Any?>): Long? {
    val raw = (options["endTimeMs"] as? Number)?.toDouble() ?: return null
    // Explicit, and first: with NaN both comparisons below are false, so an
    // ordering check alone lets it through. That is the whole defect class.
    if (raw.isNaN() || raw.isInfinite()) return null
    val now = System.currentTimeMillis()
    // Compared as Double BEFORE the conversion. Doing it after is exactly what
    // the saturating .toLong() defeats.
    if (raw <= now.toDouble()) return null
    if (raw > (now + MAX_REST_HORIZON_MS).toDouble()) return null
    return raw.toLong()
  }

  private fun restCuePendingIntent(context: Context, cue: String, index: Int): PendingIntent? {
    val intent = Intent(context, RestCueReceiver::class.java).apply {
      action = RestCueReceiver.ACTION_CUE
      putExtra(RestCueReceiver.EXTRA_CUE, cue)
    }
    return PendingIntent.getBroadcast(
      context,
      REST_CUE_REQUEST_BASE + index,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun cancelRestCueAlarms(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    REST_CUES.forEachIndexed { index, (cue, _) ->
      restCuePendingIntent(context, cue, index)?.let {
        try { alarmManager.cancel(it) } catch (_: Throwable) { }
        try { it.cancel() } catch (_: Throwable) { }
      }
    }
  }

  companion object {
    // D34: Service→module→JS bridge. WorkoutForegroundService lives in a
    // separate process-side class and cannot call sendEvent directly, so the
    // live module registers a lightweight emitter here (set in OnCreate,
    // cleared in OnDestroy). A notification-action tap calls emitRestAction,
    // which forwards to JS when the module is alive and is a safe no-op
    // otherwise (module torn down / app process gone).
    @Volatile
    private var actionEmitter: ((String) -> Unit)? = null

    fun setActionEmitter(emitter: ((String) -> Unit)?) {
      actionEmitter = emitter
    }

    fun emitRestAction(actionId: String) {
      try {
        actionEmitter?.invoke(actionId)
      } catch (_: Throwable) {
        // The JS bridge may be gone; never let a notification tap crash.
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("RestTimerLive")

    // D34: the single event this module emits — a rest-timer notification
    // action tap (the "+15s" / "Skip rest" chronometer buttons). The payload
    // carries the REST_TIMER_ACTION id so JS routes it through the SAME
    // handleRestTimerAction seam the expo sticky path uses.
    Events("onRestTimerAction")

    OnCreate {
      RestTimerLiveModule.setActionEmitter { actionId ->
        try {
          sendEvent("onRestTimerAction", mapOf("actionId" to actionId))
        } catch (_: Throwable) {
          // sendEvent can throw if the JS context is not ready; the native
          // notification update path is independent and still runs.
        }
      }
    }

    OnDestroy {
      RestTimerLiveModule.setActionEmitter(null)
    }

    AsyncFunction("start") { options: Map<String, Any?>, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(false)
          return@AsyncFunction
        }

        val endTimeMs = readEndTimeMs(options)
        if (endTimeMs == null) {
          promise.resolve(false)
          return@AsyncFunction
        }

        val exerciseName = (options["exerciseName"] as? String)?.takeIf { it.isNotBlank() } ?: "Rest timer"
        val channelId = (options["channelId"] as? String)?.takeIf { it.isNotBlank() } ?: DEFAULT_CHANNEL_ID
        val deepLink = options["deepLink"] as? String

        ensureChannel(context, channelId)

        val builder = NotificationCompat.Builder(context, channelId)
          .setSmallIcon(resolveNotificationIcon(context))
          .setColor(VOLYUME_AMBER)
          .setContentTitle(exerciseName)
          .setContentText("Rest in progress")
          .setOnlyAlertOnce(true)
          .setOngoing(true)
          .setShowWhen(true)
          .setWhen(endTimeMs)
          .setUsesChronometer(true)
          .setChronometerCountDown(true)
          .setPriority(NotificationCompat.PRIORITY_LOW)
          .setCategory(NotificationCompat.CATEGORY_PROGRESS)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        if (deepLink != null) {
          builder.setContentIntent(buildContentIntent(context, deepLink))
        }

        try {
          NotificationManagerCompat.from(context).notify(NOTIF_ID, builder.build())
          promise.resolve(true)
        } catch (e: SecurityException) {
          // Android 13+ POST_NOTIFICATIONS denied — caller already gated on permission,
          // but be defensive in case the user revoked it between checks.
          promise.resolve(false)
        }
      } catch (e: Throwable) {
        promise.reject("ERR_REST_TIMER_LIVE_START", e.message ?: "Failed to start live notification", e)
      }
    }

    AsyncFunction("cancel") { promise: Promise ->
      try {
        appContext.reactContext?.let {
          NotificationManagerCompat.from(it).cancel(NOTIF_ID)
        }
        promise.resolve(null)
      } catch (_: Throwable) {
        // Best-effort cancellation
        promise.resolve(null)
      }
    }

    // Foreground-service-backed "active workout" notification. Uses
    // WorkoutForegroundService so the notification survives an app
    // force-close — sticky NotificationManager notifications don't.
    AsyncFunction("startWorkoutForeground") { options: Map<String, Any?>, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val title = (options["title"] as? String) ?: "Volyume · Workout in progress"
        val body = (options["body"] as? String) ?: ""
        val channelId = (options["channelId"] as? String) ?: "volyume_active_workout"
        val deepLink = options["deepLink"] as? String

        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
          action = WorkoutForegroundService.ACTION_START
          putExtra(WorkoutForegroundService.EXTRA_TITLE, title)
          putExtra(WorkoutForegroundService.EXTRA_BODY, body)
          putExtra(WorkoutForegroundService.EXTRA_CHANNEL_ID, channelId)
          if (deepLink != null) putExtra(WorkoutForegroundService.EXTRA_DEEP_LINK, deepLink)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        promise.resolve(true)
      } catch (e: Throwable) {
        promise.reject("ERR_WORKOUT_FOREGROUND_START", e.message ?: "Failed to start workout foreground service", e)
      }
    }

    AsyncFunction("stopWorkoutForeground") { promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(null)
          return@AsyncFunction
        }
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
          action = WorkoutForegroundService.ACTION_STOP
        }
        // ACTION_STOP makes the service tear itself down via stopSelf;
        // startService is the cleanest way to deliver the intent.
        context.startService(intent)
        promise.resolve(null)
      } catch (_: Throwable) {
        promise.resolve(null)
      }
    }

    // E6A: shortService rest-window host. Starts (or updates) the foreground
    // service carrying the native chronometer countdown for the current rest.
    // The JS side gates on the ~170 s window (see notifications/restForeground);
    // the service self-stops at the rest end and on the OS shortService
    // timeout, so a missed JS stop can never ANR.
    AsyncFunction("startRestForeground") { options: Map<String, Any?>, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val endTimeMs = readEndTimeMs(options)
        if (endTimeMs == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
          action = WorkoutForegroundService.ACTION_START_REST
          putExtra(WorkoutForegroundService.EXTRA_END_TIME_MS, endTimeMs)
          putExtra(WorkoutForegroundService.EXTRA_TITLE,
            (options["exerciseName"] as? String)?.takeIf { it.isNotBlank() } ?: "Rest timer")
          putExtra(WorkoutForegroundService.EXTRA_CHANNEL_ID,
            (options["channelId"] as? String)?.takeIf { it.isNotBlank() } ?: DEFAULT_CHANNEL_ID)
          (options["deepLink"] as? String)?.let {
            putExtra(WorkoutForegroundService.EXTRA_DEEP_LINK, it)
          }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        promise.resolve(true)
      } catch (e: Throwable) {
        promise.reject("ERR_REST_FOREGROUND_START", e.message ?: "Failed to start rest foreground service", e)
      }
    }

    AsyncFunction("stopRestForeground") { promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(null)
          return@AsyncFunction
        }
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
          action = WorkoutForegroundService.ACTION_STOP
        }
        context.startService(intent)
        promise.resolve(null)
      } catch (_: Throwable) {
        promise.resolve(null)
      }
    }

    // ── Rest cues while the app is suspended (founder order 2026-08-18) ──
    //
    // The 3-2-1 pips and the go tone are JS timers, so they stop the moment
    // Android freezes a backgrounded process - which is every rest longer
    // than the ~170s shortService window, and any rest at all once the phone
    // is pocketed and the process is cached. These two functions hand the
    // cue times to AlarmManager instead, and RestCueReceiver plays the SAME
    // cached WAV the in-app path uses. No service, no wake lock held between
    // cues, no Play Console declaration (SCHEDULE_EXACT_ALARM is already
    // declared at app level).
    //
    // JS schedules these ONLY while backgrounded and cancels them on return
    // to the foreground, so a cue is never heard twice.
    AsyncFunction("scheduleRestCues") { options: Map<String, Any?>, promise: Promise ->
      try {
        val context = appContext.reactContext
        val endTimeMs = readEndTimeMs(options)
        if (context == null || endTimeMs == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        cancelRestCueAlarms(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
          alarmManager.canScheduleExactAlarms()
        var scheduled = 0
        REST_CUES.forEachIndexed { index, (cue, offsetMs) ->
          val at = endTimeMs + offsetMs
          // A cue already in the past (a short rest, or one re-anchored down)
          // is skipped rather than fired instantly as a stray beep.
          if (at <= System.currentTimeMillis() + 250L) return@forEachIndexed
          val pending = restCuePendingIntent(context, cue, index) ?: return@forEachIndexed
          if (exactAllowed) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
          } else {
            // Without the special access the cue can drift a little; a
            // slightly late pip is still better than silence.
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
          }
          scheduled += 1
        }
        promise.resolve(scheduled > 0)
      } catch (_: Throwable) {
        promise.resolve(false)
      }
    }

    AsyncFunction("cancelRestCues") { promise: Promise ->
      try {
        appContext.reactContext?.let { cancelRestCueAlarms(it) }
        promise.resolve(null)
      } catch (_: Throwable) {
        promise.resolve(null)
      }
    }

    // E6A: exact-alarm special app access (Android 12+). expo-notifications
    // auto-upgrades the end-of-rest alarm to setExactAndAllowWhileIdle the
    // moment this returns true; below Android 12 alarms are always exact.
    AsyncFunction("canScheduleExactAlarms") { promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
          promise.resolve(true)
          return@AsyncFunction
        }
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        promise.resolve(alarmManager.canScheduleExactAlarms())
      } catch (_: Throwable) {
        promise.resolve(true) // never block a schedule on a read failure
      }
    }

    // Opens the system grant screen for SCHEDULE_EXACT_ALARM (the user grants
    // it there; there is no in-app dialog for special app accesses). Resolves
    // true if the screen was opened.
    AsyncFunction("requestExactAlarmAccess") { promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
          promise.resolve(false)
          return@AsyncFunction
        }
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${context.packageName}")
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
        promise.resolve(true)
      } catch (_: Throwable) {
        promise.resolve(false)
      }
    }
  }

  /**
   * Create the rest-timer notification channel on Android 8+ if it doesn't exist.
   * Uses the same channel id as the existing expo-notifications channel so the
   * two notifications share the user's "show / hide" preference.
   */
  private fun ensureChannel(context: Context, channelId: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(channelId) != null) return

    val channel = NotificationChannel(
      channelId,
      "Rest timer",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Live countdown shown on the lock screen while the rest timer is running"
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildContentIntent(context: Context, deepLink: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      `package` = context.packageName
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getActivity(context, 0, intent, flags)
  }

  /**
   * Prefer a dedicated monochrome notification icon if the app ships one
   * (expo-notifications config plugin generates `notification_icon`). Fall
   * back to the launcher icon to avoid crashing if absent.
   */
  private fun resolveNotificationIcon(context: Context): Int {
    val resId = context.resources.getIdentifier(
      "notification_icon",
      "drawable",
      context.packageName,
    )
    return if (resId != 0) resId else context.applicationInfo.icon
  }
}

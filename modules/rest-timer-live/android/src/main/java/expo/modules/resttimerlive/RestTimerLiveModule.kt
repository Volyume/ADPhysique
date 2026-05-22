package expo.modules.resttimerlive

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
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

  override fun definition() = ModuleDefinition {
    Name("RestTimerLive")

    AsyncFunction("start") { options: Map<String, Any?>, promise: Promise ->
      try {
        val context = appContext.reactContext
        if (context == null) {
          promise.resolve(false)
          return@AsyncFunction
        }

        val exerciseName = (options["exerciseName"] as? String)?.takeIf { it.isNotBlank() } ?: "Rest timer"
        val endTimeMs = (options["endTimeMs"] as? Number)?.toLong() ?: 0L
        val channelId = (options["channelId"] as? String)?.takeIf { it.isNotBlank() } ?: DEFAULT_CHANNEL_ID
        val deepLink = options["deepLink"] as? String

        if (endTimeMs <= System.currentTimeMillis()) {
          promise.resolve(false)
          return@AsyncFunction
        }

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

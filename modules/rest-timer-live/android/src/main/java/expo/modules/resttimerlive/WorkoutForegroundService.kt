package expo.modules.resttimerlive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * WorkoutForegroundService
 *
 * Foreground service that hosts the persistent "active workout"
 * notification so it survives an app force-close. A normal sticky
 * notification posted via NotificationManager is cleared when the
 * Android system reaps the app's process; a notification owned by a
 * foreground service is tied to the service lifecycle and persists.
 *
 * Android 14 (SDK 34) requires every new foreground service to
 * declare a foregroundServiceType. "health" is the correct fit for a
 * workout tracker (added in API 34) — it covers session-tracking
 * apps like Strava, Whoop, Apple Fitness.
 *
 * Start the service with an Intent that carries the latest body
 * content; calling startService again with new extras updates the
 * notification body without restarting the service. stopForeground
 * + stopSelf removes both notification and service.
 */
class WorkoutForegroundService : Service() {

  companion object {
    const val ACTION_START = "expo.modules.resttimerlive.workout.START"
    const val ACTION_STOP = "expo.modules.resttimerlive.workout.STOP"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_CHANNEL_ID = "channelId"
    const val EXTRA_DEEP_LINK = "deepLink"
    private const val NOTIF_ID = 71002
    private const val DEFAULT_CHANNEL_ID = "volyume_active_workout"
    private const val VOLYUME_AMBER = 0xFFF59E0B.toInt()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopForegroundCompat()
      stopSelf()
      return START_NOT_STICKY
    }

    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Volyume · Workout in progress"
    val body = intent?.getStringExtra(EXTRA_BODY) ?: ""
    val channelId = intent?.getStringExtra(EXTRA_CHANNEL_ID) ?: DEFAULT_CHANNEL_ID
    val deepLink = intent?.getStringExtra(EXTRA_DEEP_LINK)

    ensureChannel(channelId)
    val notification = buildNotification(channelId, title, body, deepLink)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      // Android 14+: type is mandatory. "health" covers workout
      // tracking. If the manifest entry's serviceType disagrees with
      // the call here, the system throws.
      startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
    } else {
      startForeground(NOTIF_ID, notification)
    }

    // START_STICKY would auto-restart on memory pressure with a null
    // intent; START_NOT_STICKY means the service is gone for good if
    // killed. We pick NOT_STICKY because the JS layer should be the
    // source of truth for "is a workout active". The JS bootstrap
    // already restores in-progress workouts from SQLite.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    stopForegroundCompat()
    super.onDestroy()
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  private fun ensureChannel(channelId: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(channelId) != null) return
    val channel = NotificationChannel(
      channelId,
      "Active workout",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Shown on the lock screen and notification shade while a workout is in progress."
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(
    channelId: String,
    title: String,
    body: String,
    deepLink: String?,
  ): Notification {
    val builder = NotificationCompat.Builder(this, channelId)
      .setSmallIcon(resolveNotificationIcon())
      .setColor(VOLYUME_AMBER)
      .setContentTitle(title)
      .setContentText(body)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

    if (deepLink != null) {
      builder.setContentIntent(buildContentIntent(deepLink))
    }
    return builder.build()
  }

  private fun buildContentIntent(deepLink: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      `package` = packageName
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getActivity(this, 0, intent, flags)
  }

  private fun resolveNotificationIcon(): Int {
    val resId = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (resId != 0) resId else applicationInfo.icon
  }
}

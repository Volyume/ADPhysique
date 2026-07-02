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
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

/**
 * WorkoutForegroundService — shortService rest-window host (E6A, approved
 * 2026-07-02).
 *
 * Hosts the live rest-timer chronometer notification inside a foreground
 * service for the rest window, so while a rest is running:
 *   - the countdown ticks natively on the lock screen (no frozen JS sticky),
 *   - the app process is protected from OS reap for the window,
 *   - JS keeps executing while backgrounded, so the 3-2-1 end cues fire.
 *
 * FGS type is SHORT_SERVICE (Android 14+): runs ~3 minutes from
 * startForeground(), needs NO type-specific permission and NO Play Console
 * FGS declaration (policy-exempt), unlike the old FOREGROUND_SERVICE_TYPE_
 * HEALTH path which crashed with SecurityException without a health runtime
 * permission (see the git history of this file). The service is therefore
 * only ever started for rests that FIT the window (the JS side gates at
 * ~170 s) and must stop itself on time:
 *   - a Handler stop is scheduled for the rest end (capped inside the
 *     shortService window),
 *   - onTimeout() — the OS's ~3-minute deadline — stops immediately; missing
 *     it would ANR the app.
 * The end-of-rest ALERT does not live here: that is the separately scheduled
 * exact/inexact alarm in restEnd.js, which survives process death.
 *
 * Re-delivering ACTION_START_REST with a new end time (the ±15 s adjust path)
 * updates the notification and re-schedules the self-stop; startForeground()
 * itself is only called once per service lifetime.
 */
class WorkoutForegroundService : Service() {

  companion object {
    const val ACTION_START = "expo.modules.resttimerlive.workout.START"
    const val ACTION_START_REST = "expo.modules.resttimerlive.rest.START"
    const val ACTION_STOP = "expo.modules.resttimerlive.workout.STOP"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_CHANNEL_ID = "channelId"
    const val EXTRA_DEEP_LINK = "deepLink"
    const val EXTRA_END_TIME_MS = "endTimeMs"
    private const val NOTIF_ID = 71002
    private const val DEFAULT_CHANNEL_ID = "volyume_active_workout"
    private const val REST_CHANNEL_ID = "rest-timer"
    private const val VOLYUME_AMBER = 0xFFF59E0B.toInt()
    // Hard ceiling for the self-stop, safely inside the OS's ~180 s
    // shortService deadline so our own stop always wins the race with
    // onTimeout().
    private const val MAX_WINDOW_MS = 170_000L
  }

  private val stopHandler = Handler(Looper.getMainLooper())
  private val stopRunnable = Runnable {
    stopForegroundCompat()
    stopSelf()
  }
  private var foregrounded = false
  // When this instance first called startForeground(). The OS shortService
  // deadline (~180 s) is anchored HERE and notify() never extends it, so
  // every re-scheduled self-stop must also be capped against this anchor —
  // outliving the deadline means onTimeout and a lost notification.
  private var foregroundedAtMs = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopHandler.removeCallbacks(stopRunnable)
      stopForegroundCompat()
      stopSelf()
      return START_NOT_STICKY
    }

    val channelId = intent?.getStringExtra(EXTRA_CHANNEL_ID)
      ?: if (intent?.action == ACTION_START_REST) REST_CHANNEL_ID else DEFAULT_CHANNEL_ID
    val deepLink = intent?.getStringExtra(EXTRA_DEEP_LINK)

    val notification = if (intent?.action == ACTION_START_REST) {
      val endTimeMs = intent.getLongExtra(EXTRA_END_TIME_MS, 0L)
      if (endTimeMs <= System.currentTimeMillis()) {
        // Nothing left to count down; never start a foreground for it.
        stopHandler.removeCallbacks(stopRunnable)
        if (foregrounded) stopForegroundCompat()
        stopSelf()
        return START_NOT_STICKY
      }
      ensureChannel(channelId, "Rest timer",
        "Live countdown shown on the lock screen while the rest timer is running")
      // Self-stop at rest end, capped inside the shortService window. An
      // adjusted end time re-schedules (this runs on every delivery). The
      // cap is anchored at THIS INSTANCE's startForeground time, not at now:
      // repeated re-anchors into a still-running instance must never
      // schedule a stop beyond the fixed OS deadline (E6A review).
      stopHandler.removeCallbacks(stopRunnable)
      val now = System.currentTimeMillis()
      val instanceCapMs = if (foregrounded) (foregroundedAtMs + MAX_WINDOW_MS) - now else MAX_WINDOW_MS
      val windowMs = minOf(endTimeMs - now, MAX_WINDOW_MS, instanceCapMs)
      if (windowMs <= 0L) {
        stopForegroundCompat()
        stopSelf()
        return START_NOT_STICKY
      }
      stopHandler.postDelayed(stopRunnable, windowMs)
      buildRestNotification(channelId, intent.getStringExtra(EXTRA_TITLE) ?: "Rest timer", endTimeMs, deepLink)
    } else {
      val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Volyume · Workout in progress"
      val body = intent?.getStringExtra(EXTRA_BODY) ?: ""
      ensureChannel(channelId, "Active workout",
        "Shown on the lock screen and notification shade while a workout is in progress.")
      buildNotification(channelId, title, body, deepLink)
    }

    if (!foregrounded) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        // Android 14+: type is mandatory. shortService needs no
        // type-specific permission and no Play FGS declaration; the manifest
        // entry declares the same type (a mismatch throws).
        startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE)
      } else {
        startForeground(NOTIF_ID, notification)
      }
      foregrounded = true
      foregroundedAtMs = System.currentTimeMillis()
    } else {
      // Already foregrounded: this delivery is an update (±15 s adjust or a
      // new rest in the same window). Never re-call startForeground — that
      // is what would need a fresh from-background FGS grant.
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.notify(NOTIF_ID, notification)
    }

    // START_STICKY would auto-restart on memory pressure with a null
    // intent; START_NOT_STICKY means the service is gone for good if
    // killed. We pick NOT_STICKY because the JS layer should be the
    // source of truth for "is a rest running". The end-of-rest alarm and
    // the session snapshot cover a killed process.
    return START_NOT_STICKY
  }

  // Android 14 shortService deadline (~3 min). Stopping promptly here is
  // mandatory — missing the timeout ANRs the app. The Handler stop above
  // normally fires first; this is the backstop.
  override fun onTimeout(startId: Int) {
    stopHandler.removeCallbacks(stopRunnable)
    stopForegroundCompat()
    stopSelf()
  }

  // Android 15 variant (adds the fgsType parameter).
  override fun onTimeout(startId: Int, fgsType: Int) {
    onTimeout(startId)
  }

  override fun onDestroy() {
    stopHandler.removeCallbacks(stopRunnable)
    stopForegroundCompat()
    foregrounded = false
    super.onDestroy()
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    foregrounded = false
  }

  private fun ensureChannel(channelId: String, name: String, desc: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(channelId) != null) return
    val channel = NotificationChannel(
      channelId,
      name,
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = desc
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  /**
   * The rest-window notification: Android's built-in chronometer counts down
   * to the end time natively, so the number on the lock screen stays live
   * without any JS tick (the fix for the frozen backgrounded countdown).
   */
  private fun buildRestNotification(
    channelId: String,
    title: String,
    endTimeMs: Long,
    deepLink: String?,
  ): Notification {
    val builder = NotificationCompat.Builder(this, channelId)
      .setSmallIcon(resolveNotificationIcon())
      .setColor(VOLYUME_AMBER)
      .setContentTitle(title)
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
      builder.setContentIntent(buildContentIntent(deepLink))
    }
    return builder.build()
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

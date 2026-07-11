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
    // D34 (2026-07-10): the two rest-window chronometer action buttons. Their
    // PendingIntents route BACK into this service (getService, never
    // getActivity), so a tap never foregrounds the app — mirroring the JS
    // sticky's opensAppToForeground:false design. The service emits the tap to
    // JS via RestTimerLiveModule so the store guards run, and (for the
    // backgrounded case, where JS cannot start a fresh FGS) updates its own
    // notification natively so the chronometer stays coherent.
    const val ACTION_REST_PLUS_15 = "expo.modules.resttimerlive.rest.PLUS_15"
    const val ACTION_REST_SKIP = "expo.modules.resttimerlive.rest.SKIP"
    // The REST_TIMER_ACTION ids (categories.js) carried to JS on a tap — one
    // vocabulary shared by both transports (expo sticky + native chronometer).
    private const val REST_ACTION_ID_PLUS_15 = "rest_plus_15"
    private const val REST_ACTION_ID_SKIP = "rest_skip"
    // Distinct PendingIntent request codes so the two action intents never
    // collide under FLAG_UPDATE_CURRENT.
    private const val REQ_PLUS_15 = 4101
    private const val REQ_SKIP = 4102
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_CHANNEL_ID = "channelId"
    const val EXTRA_DEEP_LINK = "deepLink"
    const val EXTRA_END_TIME_MS = "endTimeMs"
    private const val NOTIF_ID = 71002
    private const val DEFAULT_CHANNEL_ID = "volyume_active_workout"
    private const val REST_CHANNEL_ID = "rest-timer"
    private const val VOLYUME_AMBER = 0xFFF59E0B.toInt()
    // The +15 s step, matching REST_STEP in restTimerActions.js.
    private const val REST_STEP_MS = 15_000L
    // Hard ceiling for the self-stop, safely inside the OS's ~180 s
    // shortService deadline so our own stop always wins the race with
    // onTimeout().
    private const val MAX_WINDOW_MS = 170_000L
  }

  private val stopHandler = Handler(Looper.getMainLooper())
  // R2-8b (founder crash, build 2692): the newest delivered startId. Every
  // self-stop except onTimeout uses stopSelf(lastStartId) so a START_REST
  // command that Android has ALREADY ACCEPTED (creating a startForeground
  // obligation) but not yet run is never dropped by a bare stopSelf() - the
  // service stays alive, the queued command runs, and the obligation is met.
  // A dropped queued start was the surviving crash path: rapid chained
  // per-side rests interleave stop-then-start, and killing the service with
  // a start still queued left its obligation unmet -> the OS executes the
  // app (ForegroundServiceDidNotStartInTimeException).
  private var lastStartId = -1
  private val stopRunnable = Runnable {
    stopForegroundCompat()
    stopSelf(lastStartId)
  }
  private var foregrounded = false
  // When this instance first called startForeground(). The OS shortService
  // deadline (~180 s) is anchored HERE and notify() never extends it, so
  // every re-scheduled self-stop must also be capped against this anchor —
  // outliving the deadline means onTimeout and a lost notification.
  private var foregroundedAtMs = 0L
  // D34: the live rest's current parameters, remembered so a "+15s"
  // notification-action tap (which arrives with only its own intent) can
  // rebuild the chronometer natively without JS. Set on every
  // ACTION_START_REST delivery; only meaningful while foregrounded.
  private var currentEndTimeMs = 0L
  private var currentTitle = "Rest timer"
  private var currentChannelId = REST_CHANNEL_ID
  private var currentDeepLink: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    lastStartId = startId
    if (intent?.action == ACTION_STOP) {
      stopHandler.removeCallbacks(stopRunnable)
      stopForegroundCompat()
      // R2-8b: startId form - never drop a queued later START_REST.
      stopSelf(startId)
      return START_NOT_STICKY
    }

    // D34: "Skip rest" tapped on the chronometer notification. Emit to JS
    // (the store's stopRestTimer runs there, gated by the stale-tap guard),
    // then tear the service + notification down — mirroring the FGS teardown
    // stopRestTimer already triggers on the in-app path.
    if (intent?.action == ACTION_REST_SKIP) {
      RestTimerLiveModule.emitRestAction(REST_ACTION_ID_SKIP)
      stopHandler.removeCallbacks(stopRunnable)
      stopForegroundCompat()
      // R2-8b: startId form - never drop a queued later START_REST.
      stopSelf(startId)
      return START_NOT_STICKY
    }

    // D34: "+15s" tapped on the chronometer notification. Emit to JS first
    // (store.addRestTime via clampRestDelta + the stale-tap guard), then, when
    // a rest is genuinely live on THIS instance, extend the native chronometer
    // in place. The JS re-anchor path is background-blocked ("no FGS starts
    // from the background"), so this native update is what keeps the shade
    // coherent while the app is backgrounded; when foregrounded it converges
    // with the store-driven re-anchor to the same +15 s end time (never +30).
    if (intent?.action == ACTION_REST_PLUS_15) {
      RestTimerLiveModule.emitRestAction(REST_ACTION_ID_PLUS_15)
      val now = System.currentTimeMillis()
      if (foregrounded && currentEndTimeMs > now) {
        val newEnd = currentEndTimeMs + REST_STEP_MS
        // Re-cap the self-stop against the fixed OS deadline (same rule as an
        // ACTION_START_REST re-anchor): the chronometer may show a little past
        // the instance deadline, but our stop always wins the onTimeout race.
        val instanceCapMs = (foregroundedAtMs + MAX_WINDOW_MS) - now
        val windowMs = minOf(newEnd - now, instanceCapMs)
        if (windowMs > 0L) {
          currentEndTimeMs = newEnd
          stopHandler.removeCallbacks(stopRunnable)
          stopHandler.postDelayed(stopRunnable, windowMs)
          val notification = buildRestNotification(currentChannelId, currentTitle, newEnd, currentDeepLink)
          val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
          manager.notify(NOTIF_ID, notification)
        }
      } else if (!foregrounded) {
        // Delivered to a service with no live rest (e.g. a lingering PendingIntent
        // fired after teardown): emit only, then stop without ever going
        // foreground. The JS-side guard turns the emit into a no-op too.
        // R2-8b: startId form - never drop a queued later START_REST.
        stopSelf(startId)
      }
      return START_NOT_STICKY
    }

    val channelId = intent?.getStringExtra(EXTRA_CHANNEL_ID)
      ?: if (intent?.action == ACTION_START_REST) REST_CHANNEL_ID else DEFAULT_CHANNEL_ID
    val deepLink = intent?.getStringExtra(EXTRA_DEEP_LINK)

    val notification = if (intent?.action == ACTION_START_REST) {
      val endTimeMs = intent.getLongExtra(EXTRA_END_TIME_MS, 0L)
      val startTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Rest timer"
      ensureChannel(channelId, "Rest timer",
        "Live countdown shown on the lock screen while the rest timer is running")
      // Founder crash, production 2026-07-11 (Sentry fatal,
      // ForegroundServiceDidNotStartInTimeException): ACTION_START_REST is
      // delivered via startForegroundService(), which OBLIGES a
      // startForeground() call on this instance no matter what - but an
      // already-expired rest returned via stopSelf() below without ever going
      // foreground, and Android executes the whole app for that. The
      // unilateral per-side flow hits it routinely: its halved, chained rests
      // can lapse between the JS-side expiry check and this delivery. So on a
      // cold instance the obligation is discharged FIRST, then the expiry
      // decision runs; the expired path now tears down a properly-
      // foregrounded service, which is legal and instant (the silent LOW
      // channel means at most a one-frame shade flash).
      if (!foregrounded) {
        goForeground(buildRestNotification(
          channelId, startTitle,
          maxOf(endTimeMs, System.currentTimeMillis() + 1_000L), deepLink,
        ))
      }
      if (endTimeMs <= System.currentTimeMillis()) {
        // Nothing left to count down; tear the (now-foregrounded) host down.
        stopHandler.removeCallbacks(stopRunnable)
        stopForegroundCompat()
        // R2-8b: startId form - never drop a queued later START_REST.
        stopSelf(startId)
        return START_NOT_STICKY
      }
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
        // R2-8b: startId form - never drop a queued later START_REST.
        stopSelf(startId)
        return START_NOT_STICKY
      }
      stopHandler.postDelayed(stopRunnable, windowMs)
      // D34: remember the live rest so a "+15s" action tap can rebuild the
      // chronometer natively (the tap intent carries only its own action).
      currentEndTimeMs = endTimeMs
      currentTitle = startTitle
      currentChannelId = channelId
      currentDeepLink = deepLink
      buildRestNotification(channelId, currentTitle, endTimeMs, deepLink)
    } else {
      val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Volyume · Workout in progress"
      val body = intent?.getStringExtra(EXTRA_BODY) ?: ""
      ensureChannel(channelId, "Active workout",
        "Shown on the lock screen and notification shade while a workout is in progress.")
      buildNotification(channelId, title, body, deepLink)
    }

    if (!foregrounded) {
      goForeground(notification)
    } else {
      // Already foregrounded: this delivery is an update (±15 s adjust, a
      // new rest in the same window, or the final notification after the
      // obligation-first startForeground above). Never re-call
      // startForeground — that is what would need a fresh from-background
      // FGS grant.
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
    // Deliberately the unconditional form: the OS deadline has fired and the
    // service MUST stop promptly (missing it ANRs). The theoretical race with
    // a just-queued start is accepted here - the JS churn fix makes fresh
    // starts near the 180 s deadline vanishingly rare.
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

  // The one startForeground seam. Every path that can be reached by a
  // startForegroundService() delivery MUST route through here before any
  // early return (see the ACTION_START_REST obligation-first block) - a cold
  // delivery that returns without it is the fatal
  // ForegroundServiceDidNotStartInTimeException (production crash 2026-07-11).
  private fun goForeground(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      // Android 14+: type is mandatory. shortService needs no type-specific
      // permission and no Play FGS declaration; the manifest entry declares
      // the same type (a mismatch throws).
      startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE)
    } else {
      startForeground(NOTIF_ID, notification)
    }
    foregrounded = true
    foregroundedAtMs = System.currentTimeMillis()
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
    // D34: the two calm timer controls. British-English titles matching the JS
    // sticky's REST_TIMER_ACTIONS ("+15s" / "Skip rest"). Icon 0 => title-only
    // (Android renders the label without a glyph); the intents route back into
    // this service, so a tap never opens the app.
    builder.addAction(0, "+15s", buildActionIntent(ACTION_REST_PLUS_15, REQ_PLUS_15))
    builder.addAction(0, "Skip rest", buildActionIntent(ACTION_REST_SKIP, REQ_SKIP))
    return builder.build()
  }

  /**
   * A PendingIntent that re-enters THIS service with the given action.
   * getService (never getActivity) is what keeps a tap silent: the app is
   * never foregrounded, mirroring opensAppToForeground:false on the JS sticky.
   */
  private fun buildActionIntent(action: String, requestCode: Int): PendingIntent {
    val intent = Intent(this, WorkoutForegroundService::class.java).apply {
      this.action = action
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getService(this, requestCode, intent, flags)
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

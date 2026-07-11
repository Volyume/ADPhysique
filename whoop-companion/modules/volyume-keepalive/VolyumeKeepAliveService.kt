package __PACKAGE__.keepalive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

class VolyumeKeepAliveService : Service() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      startInForeground()
      running = true
      return START_STICKY
    } catch (_: SecurityException) {
      running = false
      stopSelf()
      return START_NOT_STICKY
    }
  }

  override fun onDestroy() {
    running = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startInForeground() {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "WHOOP sync", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Keeps the WHOOP Bluetooth connection available"
          setShowBadge(false)
        },
      )
    }

    val notification = Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
      .setContentTitle("VOLYUME Pulse")
      .setContentText("Keeping WHOOP sync connected")
      .setCategory(Notification.CATEGORY_SERVICE)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  companion object {
    private const val CHANNEL_ID = "whoop-sync"
    private const val NOTIFICATION_ID = 4101

    @Volatile
    private var running = false

    fun isRunning(): Boolean = running
  }
}

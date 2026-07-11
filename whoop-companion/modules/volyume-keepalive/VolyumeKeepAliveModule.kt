package __PACKAGE__.keepalive

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VolyumeKeepAliveModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "VolyumeKeepAlive"

  @ReactMethod
  fun start(promise: Promise) {
    if (!hasConnectedDevicePrerequisite()) {
      promise.resolve(false)
      return
    }
    try {
      val intent = Intent(context, VolyumeKeepAliveService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      promise.resolve(true)
    } catch (_: SecurityException) {
      // Missing/invalid foreground-service permissions must not crash the app.
      promise.resolve(false)
    } catch (_: IllegalStateException) {
      // Android rejects a background start; callers can retry from the foreground.
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      promise.resolve(context.stopService(Intent(context, VolyumeKeepAliveService::class.java)))
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun isRunning(promise: Promise) {
    promise.resolve(VolyumeKeepAliveService.isRunning())
  }

  private fun hasConnectedDevicePrerequisite(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val hasServicePermission = context.checkSelfPermission(Manifest.permission.FOREGROUND_SERVICE) == PackageManager.PERMISSION_GRANTED
      val hasConnectedDeviceServicePermission = context.checkSelfPermission(Manifest.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE) == PackageManager.PERMISSION_GRANTED
      if (!hasServicePermission || !hasConnectedDeviceServicePermission) return false
    }
    val canConnect = context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    val canScan = context.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    return canConnect || canScan
  }
}

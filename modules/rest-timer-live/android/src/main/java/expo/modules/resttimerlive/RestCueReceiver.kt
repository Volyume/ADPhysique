package expo.modules.resttimerlive

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import java.io.File

/**
 * Plays ONE rest-timer cue, fired by AlarmManager (see
 * RestTimerLiveModule.scheduleRestCues).
 *
 * Why this exists (founder order 2026-08-18: "I want them on and active even
 * if the app is minimised"): the 3-2-1 pips and the go tone are JS timers, so
 * they only fire while JavaScript is running. Android freezes a backgrounded
 * process once nothing holds it awake, and this app deliberately runs NO
 * long-lived foreground service (the rest shortService covers ~170s only, and
 * the `health` service type was rejected earlier - see AndroidManifest.xml -
 * because it needs a runtime permission and a Play declaration with a demo
 * video). So on a longer rest with the phone pocketed, nothing could make a
 * sound. An exact alarm per cue moves that job to the OS: no service, no
 * battery cost between cues, and it works with the app fully suspended.
 *
 * It plays the SAME audio the in-app cues use - src/lib/restSound.js writes
 * the generated WAVs into the app cache (volyume-beeps/<key>.wav) - so a
 * pocketed phone and a phone in the hand make identical sounds. A missing
 * file (cache cleared, beeps never preloaded) is simply silent: this must
 * never crash, it is a nicety riding on top of the timer, and the rest-end
 * notification alert remains the guaranteed signal.
 */
class RestCueReceiver : BroadcastReceiver() {

  companion object {
    const val ACTION_CUE = "app.volyume.REST_CUE"
    const val EXTRA_CUE = "cue"
    private const val BEEP_DIR = "volyume-beeps"
  }

  override fun onReceive(context: Context, intent: Intent) {
    try {
      val cue = intent.getStringExtra(EXTRA_CUE) ?: return
      // Only the four known keys, so a stray broadcast can never make this
      // read an arbitrary path out of the cache directory.
      if (cue !in setOf("three", "two", "one", "go")) return
      val file = File(File(context.cacheDir, BEEP_DIR), "$cue.wav")
      if (!file.exists()) return

      val player = MediaPlayer()
      player.setAudioAttributes(
        AudioAttributes.Builder()
          // ALARM so the cue is audible through a silenced ringer, the same
          // intent as playsInSilentModeIOS on the in-app path.
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      player.setDataSource(file.absolutePath)
      player.setOnCompletionListener {
        try { it.release() } catch (_: Throwable) { }
      }
      player.setOnErrorListener { mp, _, _ ->
        try { mp.release() } catch (_: Throwable) { }
        true
      }
      player.prepare()
      player.start()
    } catch (_: Throwable) {
      // A cue that cannot play is silence, never a crash in a receiver.
    }
  }
}

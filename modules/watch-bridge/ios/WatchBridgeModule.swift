import ExpoModulesCore
import WatchConnectivity

/**
 * WatchBridgeModule (COMP-020)
 *
 * Bridges the JS WatchConnectivity API to the phone side of WCSession. The phone
 * is the source of truth; the watch is a durable remote.
 *
 *   - sendContext(payload): publishes the latest state via
 *     updateApplicationContext (latest-state-only — the right semantics for a
 *     mirror; the system coalesces, so no per-second messaging exists anywhere).
 *   - didReceiveMessage / didReceiveUserInfo: the watch's durable queue delivers
 *     each action; we emit `onWatchEvent` to JS, which applies it idempotently
 *     (applyRemoteSetEvent) and acks. Receiving a message wakes the iOS app in
 *     the background, so a set is applied even with the phone pocketed.
 *
 * Off a paired/installed watch every call is a benign no-op. JS treats the whole
 * module as fire-and-forget.
 */
public class WatchBridgeModule: Module, WCSessionDelegate {
  private var session: WCSession?

  public func definition() -> ModuleDefinition {
    Name("WatchBridgeModule")

    Events("onWatchEvent")

    OnCreate {
      if WCSession.isSupported() {
        let s = WCSession.default
        s.delegate = self
        s.activate()
        self.session = s
      }
    }

    Function("isSupported") { () -> Bool in
      guard WCSession.isSupported() else { return false }
      let s = WCSession.default
      return s.isPaired && s.isWatchAppInstalled
    }

    AsyncFunction("sendContext") { (payload: [String: Any]) -> Void in
      guard let s = self.session, s.activationState == .activated else { return }
      // updateApplicationContext throws if called with an identical context or
      // before activation — tolerate, the next cursor supersedes it.
      try? s.updateApplicationContext(payload)
    }

    AsyncFunction("ackEvent") { (eventId: String) -> Void in
      // The watch removes an event from its durable queue when its sendMessage
      // reply handler fires; this is a belt-and-braces no-op hook for future
      // out-of-band acks (transferUserInfo path).
      _ = eventId
    }
  }

  // MARK: - WCSessionDelegate

  public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
  public func sessionDidBecomeInactive(_ session: WCSession) {}
  public func sessionDidDeactivate(_ session: WCSession) { session.activate() }

  // Reachable path: the watch expects an ack reply (which lets it drop the event
  // from its durable queue). Emitting wakes the app if backgrounded.
  public func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                      replyHandler: @escaping ([String: Any]) -> Void) {
    self.sendEvent("onWatchEvent", message)
    replyHandler(["ok": true, "eventId": message["eventId"] as? String ?? ""])
  }

  // Durable path: transferUserInfo survives app restarts and poor connections.
  public func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    self.sendEvent("onWatchEvent", userInfo)
  }
}

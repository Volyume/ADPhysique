import ExpoModulesCore
import Foundation

/// VolyumeVideoExport (D229, research report sections 3 and 6): probe a clip,
/// export the share video, cancel it. The JS side is
/// src/lib/shareVideo/engine.js. iOS has no app API for the lock screen, so
/// setLockScreenWallpaper rejects E_UNSUPPORTED ("Save, then set from Photos",
/// D229 addendum 6, level-up 2).
public class VolyumeVideoExportModule: Module {
  private let jobLock = NSLock()
  private var job: ExportJob?

  public func definition() -> ModuleDefinition {
    Name("VolyumeVideoExport")

    Events("onExportProgress")

    AsyncFunction("probeVideo") { (uri: String) async -> [String: Any]? in
      return await VideoProbe.read(uri: uri)
    }

    AsyncFunction("exportShareVideo") { (options: [String: Any], promise: Promise) in
      guard let spec = ExportSpec.parse(options) else {
        promise.reject(ExportCode.invalid, "Export options failed validation.")
        return
      }
      let newJob = ExportJob(spec: spec)
      // One export at a time: the job holds one reader and one writer.
      self.jobLock.lock()
      if self.job != nil {
        self.jobLock.unlock()
        promise.reject(ExportCode.busy, "An export is already running.")
        return
      }
      self.job = newJob
      self.jobLock.unlock()

      newJob.start(
        progress: { [weak self] value in
          self?.sendEvent("onExportProgress", ["progress": value])
        },
        completion: { [weak self] result in
          self?.clearJob(newJob)
          switch result {
          case .success(let payload):
            promise.resolve(payload)
          case .failure(let failure):
            promise.reject(failure.code, failure.message)
          }
        }
      )
    }

    AsyncFunction("cancelExport") { () -> Void in
      self.currentJob()?.cancel(code: ExportCode.cancelled)
    }

    AsyncFunction("setLockScreenWallpaper") { (_: String, promise: Promise) in
      promise.reject(ExportCode.unsupported, "iOS has no app API for the lock screen wallpaper.")
    }

    OnDestroy {
      self.currentJob()?.cancel(code: ExportCode.cancelled)
    }
  }

  private func currentJob() -> ExportJob? {
    jobLock.lock()
    defer { jobLock.unlock() }
    return job
  }

  private func clearJob(_ finished: ExportJob) {
    jobLock.lock()
    if job === finished { job = nil }
    jobLock.unlock()
  }
}

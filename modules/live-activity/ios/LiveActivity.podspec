require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# E6B (approved 2026-07-02): without a podspec, Expo iOS autolinking never
# discovers this local module, CocoaPods never compiles the bridge, and
# requireNativeModule('LiveActivityModule') throws on every build — the
# viability audit's finding 1.3. Source files are ONLY the app-side bridge
# and the shared ActivityAttributes; the @main widget bundle lives in
# ../widget/ (outside this pod) so autolinking can never pull a second
# @main into the app target. The widget extension target is created by
# plugins/withVolyumeWidget.js at prebuild.
Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = package['version'] || '1.0.0'
  s.summary        = 'Volyume rest-timer Live Activity bridge (ActivityKit)'
  s.description    = 'Starts, updates and ends the rest-timer Live Activity from JS. iOS 16.1+ at runtime; safe no-op below.'
  s.author         = 'Volyume'
  s.homepage       = 'https://volyume.app'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '*.swift'
end

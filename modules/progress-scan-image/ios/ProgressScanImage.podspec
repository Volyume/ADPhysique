require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ProgressScanImage'
  s.version        = package['version'] || '1.0.0'
  s.summary        = 'Volyume Progress Scan still-image preprocessing'
  s.description    = 'Decodes a local image file into the fixed RGB tensor used by the on-device Progress Scan TFLite pipeline.'
  s.author         = 'Volyume'
  s.homepage       = 'https://volyume.app'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '*.swift'
end

require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'live-activity'
  s.version        = package['version']
  s.summary        = 'Expo module for iOS Live Activities'
  s.homepage       = 'https://github.com/example'
  s.license        = 'MIT'
  s.author         = 'author'
  s.source         = { git: '' }

  s.platform       = :ios, '15.1'
  s.swift_version  = '5.0'

  s.source_files   = 'ios/**/*.swift'

  s.dependency 'ExpoModulesCore'
  s.dependency 'live-activity-shared'
end

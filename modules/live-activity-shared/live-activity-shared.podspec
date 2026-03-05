Pod::Spec.new do |s|
  s.name           = 'live-activity-shared'
  s.version        = '1.0.0'
  s.summary        = 'Shared LiveActivityAttributes type for app and widget'
  s.homepage       = 'https://github.com/example'
  s.license        = 'MIT'
  s.author         = 'author'
  s.source         = { git: '' }

  s.platform       = :ios, '15.1'
  s.swift_version  = '5.0'

  s.source_files   = 'ios/**/*.swift'
end

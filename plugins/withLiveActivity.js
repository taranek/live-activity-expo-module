const { withInfoPlist, withXcodeProject } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const WIDGET_NAME = "LiveActivityWidget";
const WIDGET_BUNDLE_ID_SUFFIX = ".LiveActivityWidget";

// ── Widget source file contents ──

const ATTRIBUTES_SWIFT = `import ActivityKit

struct LiveActivityAttributes: ActivityAttributes {
    var title: String

    struct ContentState: Codable, Hashable {
        var value: String
        var progress: Double
    }
}
`;

const WIDGET_SWIFT = `import WidgetKit
import SwiftUI

@main
struct LiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        LiveActivityWidget()
    }
}

struct LiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                Text(context.attributes.title)
                    .font(.headline)
                Text(context.state.value)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                ProgressView(value: context.state.progress)
                    .tint(.blue)
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.title)
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.value)
                        .font(.caption)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: context.state.progress)
                        .tint(.blue)
                }
            } compactLeading: {
                Text(context.attributes.title)
                    .font(.caption2)
            } compactTrailing: {
                Text(context.state.value)
                    .font(.caption2)
            } minimal: {
                Text(context.state.value)
                    .font(.caption2)
            }
        }
    }
}
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>LiveActivityWidget</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0.0</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.widgetkit-extension</string>
\t</dict>
</dict>
</plist>
`;

// ── Config plugin ──

const withLiveActivityInfoPlist = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });
};

const withLiveActivityExtension = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const bundleId = config.ios?.bundleIdentifier;
    const widgetBundleId = `${bundleId}${WIDGET_BUNDLE_ID_SUFFIX}`;

    // Write widget source files to ios/LiveActivityWidget/
    const widgetDir = path.join(platformProjectRoot, WIDGET_NAME);
    fs.mkdirSync(widgetDir, { recursive: true });
    fs.writeFileSync(path.join(widgetDir, "LiveActivityAttributes.swift"), ATTRIBUTES_SWIFT);
    fs.writeFileSync(path.join(widgetDir, "LiveActivityWidget.swift"), WIDGET_SWIFT);
    fs.writeFileSync(path.join(widgetDir, "Info.plist"), INFO_PLIST);

    // Check if target already exists
    const existingTarget = xcodeProject.pbxTargetByName(WIDGET_NAME);
    if (existingTarget) {
      return config;
    }

    // 1. Add the app extension target (handles embedding + dependency automatically)
    const target = xcodeProject.addTarget(
      WIDGET_NAME,
      "app_extension",
      WIDGET_NAME,
      widgetBundleId
    );

    // 2. Add source files to the target via a Sources build phase
    const widgetSourceFiles = [
      "LiveActivityWidget.swift",
      "LiveActivityAttributes.swift",
    ];

    xcodeProject.addBuildPhase(
      widgetSourceFiles.map((f) => path.join(WIDGET_NAME, f)),
      "PBXSourcesBuildPhase",
      "Sources",
      target.uuid
    );

    // 3. Add a PBXGroup for the widget extension and nest it under the main group
    const widgetGroup = xcodeProject.addPbxGroup(
      widgetSourceFiles,
      WIDGET_NAME,
      WIDGET_NAME
    );

    const mainGroupId =
      xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroupId);

    // 4. Add Frameworks build phase
    xcodeProject.addBuildPhase(
      [],
      "PBXFrameworksBuildPhase",
      "Frameworks",
      target.uuid
    );

    // 5. Override build settings for the widget target
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (
        typeof buildConfig !== "string" &&
        buildConfig?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER ===
          `"${widgetBundleId}"`
      ) {
        buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "16.1";
        buildConfig.buildSettings.SWIFT_VERSION = "5.0";
        buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
        buildConfig.buildSettings.GENERATE_INFOPLIST_FILE = "NO";
        buildConfig.buildSettings.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
        buildConfig.buildSettings.CURRENT_PROJECT_VERSION = "1";
        buildConfig.buildSettings.MARKETING_VERSION = "1.0.0";
        buildConfig.buildSettings.CODE_SIGN_STYLE = "Automatic";
        buildConfig.buildSettings.SWIFT_EMIT_LOC_STRINGS = "YES";
        buildConfig.buildSettings.LD_RUNPATH_SEARCH_PATHS =
          '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        buildConfig.buildSettings.SKIP_INSTALL = "YES";

        // Copy development team from the main app target
        for (const mainKey in configurations) {
          const mainConfig = configurations[mainKey];
          if (
            typeof mainConfig !== "string" &&
            mainConfig?.buildSettings?.DEVELOPMENT_TEAM
          ) {
            buildConfig.buildSettings.DEVELOPMENT_TEAM =
              mainConfig.buildSettings.DEVELOPMENT_TEAM;
            break;
          }
        }
      }
    }

    return config;
  });
};

const withLiveActivity = (config) => {
  config = withLiveActivityInfoPlist(config);
  config = withLiveActivityExtension(config);
  return config;
};

module.exports = withLiveActivity;

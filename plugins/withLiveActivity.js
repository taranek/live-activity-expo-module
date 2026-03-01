const { withInfoPlist, withXcodeProject, withEntitlementsPlist } = require("@expo/config-plugins");
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

const WIDGET_SWIFT = (bundleId) => `import WidgetKit
import SwiftUI
import AppIntents
import ActivityKit

let appGroupId = "group.${bundleId}"
let darwinNotificationName = "${bundleId}.activityAction" as CFString

struct AdvanceOrderIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Advance Order"
    static var description: IntentDescription = "Move the order to the next step"

    init() {}

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set("advance", forKey: "pendingAction")
        defaults?.synchronize()

        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(darwinNotificationName),
            nil, nil, true
        )
        return .result()
    }
}

struct EndOrderIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "End Order"
    static var description: IntentDescription = "Cancel or dismiss the order"

    init() {}

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set("end", forKey: "pendingAction")
        defaults?.synchronize()

        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(darwinNotificationName),
            nil, nil, true
        )
        return .result()
    }
}

@main
struct LiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        LiveActivityWidget()
    }
}

struct LiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivityAttributes.self) { context in
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(context.attributes.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    Text(context.state.value)
                        .font(.title2)
                        .fontWeight(.bold)

                    ProgressView(value: context.state.progress)
                        .tint(context.state.progress >= 1.0 ? .green : .orange)
                }

                Spacer()

                if context.state.progress < 1.0 {
                    VStack(spacing: 8) {
                        Button(intent: AdvanceOrderIntent()) {
                            Text("Next")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .frame(width: 64, height: 32)
                                .background(.orange, in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)

                        Button(intent: EndOrderIntent()) {
                            Text("Cancel")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundStyle(.red)
                                .frame(width: 64, height: 28)
                                .background(.red.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                } else {
                    Button(intent: EndOrderIntent()) {
                        Text("Done")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .frame(width: 64, height: 32)
                            .background(.green, in: RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.title)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(context.state.value)
                            .font(.subheadline)
                            .fontWeight(.bold)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.progress < 1.0 {
                        Button(intent: AdvanceOrderIntent()) {
                            Text("Next")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(.orange, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: context.state.progress)
                        .tint(context.state.progress >= 1.0 ? .green : .orange)
                }
            } compactLeading: {
                Text(context.attributes.title)
                    .font(.caption2)
                    .fontWeight(.semibold)
            } compactTrailing: {
                Text(context.state.value)
                    .font(.caption2)
            } minimal: {
                Image(systemName: "shippingbox.fill")
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

const WIDGET_ENTITLEMENTS = (bundleId) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>group.${bundleId}</string>
\t</array>
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

const withLiveActivityAppGroup = (config) => {
  return withEntitlementsPlist(config, (config) => {
    const bundleId = config.ios?.bundleIdentifier;
    const groupId = `group.${bundleId}`;
    const groups = config.modResults["com.apple.security.application-groups"] || [];
    if (!groups.includes(groupId)) {
      groups.push(groupId);
    }
    config.modResults["com.apple.security.application-groups"] = groups;
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
    fs.writeFileSync(path.join(widgetDir, "LiveActivityWidget.swift"), WIDGET_SWIFT(bundleId));
    fs.writeFileSync(path.join(widgetDir, "Info.plist"), INFO_PLIST);
    fs.writeFileSync(
      path.join(widgetDir, `${WIDGET_NAME}.entitlements`),
      WIDGET_ENTITLEMENTS(bundleId)
    );

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
        buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "17.0";
        buildConfig.buildSettings.SWIFT_VERSION = "5.0";
        buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
        buildConfig.buildSettings.GENERATE_INFOPLIST_FILE = "NO";
        buildConfig.buildSettings.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
        buildConfig.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${WIDGET_NAME}/${WIDGET_NAME}.entitlements"`;
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
  config = withLiveActivityAppGroup(config);
  config = withLiveActivityExtension(config);
  return config;
};

module.exports = withLiveActivity;

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
        var subtitle: String?
        var actionLabel: String?
        var cancelLabel: String?
        var doneLabel: String?
        var tintColor: String?
        var icon: String?
    }
}
`;

const WIDGET_SWIFT = (bundleId) => `import WidgetKit
import SwiftUI
import AppIntents
import ActivityKit

let appGroupId = "group.${bundleId}"
let darwinNotificationName = "${bundleId}.activityAction" as CFString

// MARK: - Shared helpers for reading step data from UserDefaults

private func readSteps() -> [[String: Any]]? {
    let defaults = UserDefaults(suiteName: appGroupId)
    guard let data = defaults?.data(forKey: "steps"),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return nil
    }
    return arr
}

private func contentStateFromStep(_ step: [String: Any]) -> LiveActivityAttributes.ContentState {
    LiveActivityAttributes.ContentState(
        value: step["value"] as? String ?? "",
        progress: step["progress"] as? Double ?? 0.0,
        subtitle: step["subtitle"] as? String,
        actionLabel: step["actionLabel"] as? String,
        cancelLabel: step["cancelLabel"] as? String,
        doneLabel: step["doneLabel"] as? String,
        tintColor: step["tintColor"] as? String,
        icon: step["icon"] as? String
    )
}

private func notifyApp(action: String) {
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set(action, forKey: "pendingAction")
    defaults?.synchronize()

    CFNotificationCenterPostNotification(
        CFNotificationCenterGetDarwinNotifyCenter(),
        CFNotificationName(darwinNotificationName),
        nil, nil, true
    )
}

// MARK: - Intents (update activity directly + IPC to sync React state)

struct AdvanceOrderIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Advance Order"
    static var description: IntentDescription = "Move the order to the next step"

    init() {}

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: appGroupId)
        let steps = readSteps() ?? []
        let currentIndex = defaults?.integer(forKey: "currentStepIndex") ?? 0
        let nextIndex = min(currentIndex + 1, steps.count - 1)

        if nextIndex < steps.count,
           let activity = Activity<LiveActivityAttributes>.activities.first {
            let state = contentStateFromStep(steps[nextIndex])
            if nextIndex == steps.count - 1 {
                await activity.end(
                    ActivityContent(state: state, staleDate: nil),
                    dismissalPolicy: .after(.now + 4)
                )
            } else {
                await activity.update(ActivityContent(state: state, staleDate: nil))
            }
        }

        defaults?.set(nextIndex, forKey: "currentStepIndex")
        defaults?.synchronize()

        notifyApp(action: "advance")

        return .result()
    }
}

struct EndOrderIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "End Order"
    static var description: IntentDescription = "Cancel or dismiss the order"

    init() {}

    func perform() async throws -> some IntentResult {
        if let activity = Activity<LiveActivityAttributes>.activities.first {
            await activity.end(nil, dismissalPolicy: .immediate)
        }

        notifyApp(action: "end")

        return .result()
    }
}

// MARK: - Helpers

extension Color {
    init?(hex: String?) {
        guard let hex = hex?.trimmingCharacters(in: .init(charactersIn: "#")) else { return nil }
        guard hex.count == 6, let int = UInt64(hex, radix: 16) else { return nil }
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Widget bundle

@main
struct LiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        LiveActivityWidget()
    }
}

// MARK: - Widget (dumb template — content driven by TS via ContentState)

struct LiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivityAttributes.self) { context in
            let tint = Color(hex: context.state.tintColor) ?? .orange
            let isComplete = context.state.progress >= 1.0
            let actionLabel = context.state.actionLabel ?? "Next"
            let cancelLabel = context.state.cancelLabel ?? "Cancel"
            let doneLabel = context.state.doneLabel ?? "Done"

            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    if let subtitle = context.state.subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        if let icon = context.state.icon {
                            Image(systemName: icon)
                                .font(.title3)
                                .foregroundStyle(tint)
                        }
                        Text(context.state.value)
                            .font(.title2)
                            .fontWeight(.bold)
                    }

                    ProgressView(value: context.state.progress)
                        .tint(isComplete ? .green : tint)
                }

                if !isComplete {
                    HStack(spacing: 8) {
                        Button(intent: AdvanceOrderIntent()) {
                            Text(actionLabel)
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 32)
                                .background(tint, in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)

                        Button(intent: EndOrderIntent()) {
                            Text(cancelLabel)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(.red)
                                .frame(width: 72, height: 32)
                                .background(.red.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                } else {
                    Button(intent: EndOrderIntent()) {
                        Text(doneLabel)
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 32)
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
                        if let subtitle = context.state.subtitle {
                            Text(subtitle)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Text(context.state.value)
                            .font(.subheadline)
                            .fontWeight(.bold)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.progress < 1.0 {
                        Button(intent: AdvanceOrderIntent()) {
                            Text(context.state.actionLabel ?? "Next")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color(hex: context.state.tintColor) ?? .orange, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: context.state.progress)
                        .tint(context.state.progress >= 1.0 ? .green : (Color(hex: context.state.tintColor) ?? .orange))
                }
            } compactLeading: {
                if let icon = context.state.icon {
                    Image(systemName: icon)
                        .font(.caption2)
                        .foregroundStyle(Color(hex: context.state.tintColor) ?? .orange)
                } else {
                    Text(context.attributes.title)
                        .font(.caption2)
                        .fontWeight(.semibold)
                }
            } compactTrailing: {
                Text(context.state.value)
                    .font(.caption2)
            } minimal: {
                if let icon = context.state.icon {
                    Image(systemName: icon)
                        .font(.caption2)
                } else {
                    Image(systemName: "shippingbox.fill")
                        .font(.caption2)
                }
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

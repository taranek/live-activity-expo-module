import ExpoModulesCore
import ActivityKit

private let appGroupId = "group.com.taranek.liveactivityexpo"
private let darwinNotificationName = "com.taranek.liveactivityexpo.activityAction" as CFString

public class LiveActivityModule: Module {
    private static weak var current: LiveActivityModule?
    private var observationTask: Task<Void, Never>?

    private static let darwinCallback: CFNotificationCallback = { _, _, _, _, _ in
        LiveActivityModule.current?.handleWidgetAction()
    }

    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

        Events("onActivityStateChange", "onWidgetAction")

        OnStartObserving {
            LiveActivityModule.current = self
            self.registerDarwinObserver()

            // Re-attach content observer for existing activity
            if #available(iOS 16.2, *) {
                if let activity = Activity<LiveActivityAttributes>.activities.first {
                    self.observeContentUpdates(for: activity)
                }
            }
        }

        OnStopObserving {
            self.observationTask?.cancel()
            self.observationTask = nil
            CFNotificationCenterRemoveEveryObserver(
                CFNotificationCenterGetDarwinNotifyCenter(),
                nil
            )
        }

        AsyncFunction("startActivity") { (params: [String: Any]) -> String in
            if #available(iOS 16.2, *) {
                guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                    throw LiveActivityError.activitiesNotEnabled
                }

                let title = params["title"] as? String ?? ""
                let value = params["value"] as? String ?? ""
                let progress = params["progress"] as? Double ?? 0.0

                let attributes = LiveActivityAttributes(title: title)
                let contentState = LiveActivityAttributes.ContentState(
                    value: value,
                    progress: progress
                )

                let content = ActivityContent(state: contentState, staleDate: nil)
                let activity = try Activity<LiveActivityAttributes>.request(
                    attributes: attributes,
                    content: content
                )

                self.observeContentUpdates(for: activity)

                return activity.id
            } else {
                throw LiveActivityError.unsupportedOS
            }
        }

        AsyncFunction("updateActivity") { (activityId: String, params: [String: Any]) in
            if #available(iOS 16.2, *) {
                let value = params["value"] as? String ?? ""
                let progress = params["progress"] as? Double ?? 0.0

                let contentState = LiveActivityAttributes.ContentState(
                    value: value,
                    progress: progress
                )

                guard let activity = Activity<LiveActivityAttributes>.activities.first(where: {
                    $0.id == activityId
                }) else {
                    throw LiveActivityError.activityNotFound
                }

                await activity.update(
                    ActivityContent(state: contentState, staleDate: nil)
                )
            } else {
                throw LiveActivityError.unsupportedOS
            }
        }

        AsyncFunction("endActivity") { (activityId: String, options: [String: Any]?) in
            if #available(iOS 16.2, *) {
                self.observationTask?.cancel()
                self.observationTask = nil

                guard let activity = Activity<LiveActivityAttributes>.activities.first(where: {
                    $0.id == activityId
                }) else {
                    throw LiveActivityError.activityNotFound
                }

                let finalContent: ActivityContent<LiveActivityAttributes.ContentState>?
                if let opts = options,
                   let value = opts["value"] as? String,
                   let progress = opts["progress"] as? Double {
                    let state = LiveActivityAttributes.ContentState(value: value, progress: progress)
                    finalContent = ActivityContent(state: state, staleDate: nil)
                } else {
                    finalContent = nil
                }

                let dismissDelay = (options?["dismissAfterSeconds"] as? Double) ?? 0
                let policy: ActivityUIDismissalPolicy = dismissDelay > 0
                    ? .after(.now + dismissDelay)
                    : .immediate

                await activity.end(finalContent, dismissalPolicy: policy)
            } else {
                throw LiveActivityError.unsupportedOS
            }
        }

        Function("getActivityState") { () -> [String: Any]? in
            if #available(iOS 16.2, *) {
                guard let activity = Activity<LiveActivityAttributes>.activities.first else {
                    return nil
                }

                return [
                    "id": activity.id,
                    "title": activity.attributes.title,
                    "value": activity.content.state.value,
                    "progress": activity.content.state.progress,
                ]
            } else {
                return nil
            }
        }
    }

    // MARK: - Darwin notification (widget → app IPC)

    private func registerDarwinObserver() {
        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            nil,
            LiveActivityModule.darwinCallback,
            darwinNotificationName,
            nil,
            .deliverImmediately
        )
    }

    private func handleWidgetAction() {
        let defaults = UserDefaults(suiteName: appGroupId)
        guard let action = defaults?.string(forKey: "pendingAction") else { return }
        defaults?.removeObject(forKey: "pendingAction")

        self.sendEvent("onWidgetAction", ["action": action])
    }

    // MARK: - Content updates observation (activity → React events)

    @available(iOS 16.2, *)
    private func observeContentUpdates(for activity: Activity<LiveActivityAttributes>) {
        observationTask?.cancel()
        observationTask = Task {
            for await content in activity.contentUpdates {
                self.sendEvent("onActivityStateChange", [
                    "id": activity.id,
                    "value": content.state.value,
                    "progress": content.state.progress,
                ])
            }
        }
    }
}

enum LiveActivityError: Error, LocalizedError {
    case unsupportedOS
    case activitiesNotEnabled
    case activityNotFound

    var errorDescription: String? {
        switch self {
        case .unsupportedOS:
            return "Live Activities require iOS 16.2 or later"
        case .activitiesNotEnabled:
            return "Live Activities are not enabled on this device"
        case .activityNotFound:
            return "No active Live Activity found with the given ID"
        }
    }
}

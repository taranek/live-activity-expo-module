import ExpoModulesCore
import ActivityKit

public class LiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

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

        AsyncFunction("endActivity") { (activityId: String) in
            if #available(iOS 16.2, *) {
                guard let activity = Activity<LiveActivityAttributes>.activities.first(where: {
                    $0.id == activityId
                }) else {
                    throw LiveActivityError.activityNotFound
                }

                await activity.end(nil, dismissalPolicy: .immediate)
            } else {
                throw LiveActivityError.unsupportedOS
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

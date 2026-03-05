import ActivityKit

public struct LiveActivityAttributes: ActivityAttributes {
    public var title: String

    public struct ContentState: Codable, Hashable {
        public var value: String
        public var progress: Double
        public var subtitle: String?
        public var actionLabel: String?
        public var cancelLabel: String?
        public var doneLabel: String?
        public var tintColor: String?
        public var icon: String?

        public init(
            value: String,
            progress: Double,
            subtitle: String? = nil,
            actionLabel: String? = nil,
            cancelLabel: String? = nil,
            doneLabel: String? = nil,
            tintColor: String? = nil,
            icon: String? = nil
        ) {
            self.value = value
            self.progress = progress
            self.subtitle = subtitle
            self.actionLabel = actionLabel
            self.cancelLabel = cancelLabel
            self.doneLabel = doneLabel
            self.tintColor = tintColor
            self.icon = icon
        }
    }

    public init(title: String) {
        self.title = title
    }
}

import ActivityKit

struct LiveActivityAttributes: ActivityAttributes {
    var title: String

    struct ContentState: Codable, Hashable {
        var value: String
        var progress: Double
    }
}

import Foundation

enum LimaFormat {
    static func greeting(name: String) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = AppConfig.timeZone
        let hour = calendar.component(.hour, from: Date())
        let saludo: String
        if hour < 12 {
            saludo = "Buenos días"
        } else if hour < 19 {
            saludo = "Buenas tardes"
        } else {
            saludo = "Buenas noches"
        }
        return "\(saludo), \(name)"
    }

    static func longDate(_ ymd: String) -> String {
        guard let date = parse(ymd) else { return ymd }
        let formatter = makeFormatter()
        formatter.dateFormat = "EEEE d 'de' MMMM"
        return formatter.string(from: date)
    }

    static func shortDate(_ ymd: String) -> String {
        guard let date = parse(ymd) else { return ymd }
        let formatter = makeFormatter()
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }

    static func listDate(_ ymd: String) -> String {
        guard let date = parse(ymd) else { return ymd }
        let formatter = makeFormatter()
        formatter.dateFormat = "d MMM yyyy"
        return formatter.string(from: date)
    }

    static func weekdayDate(_ ymd: String) -> String {
        guard let date = parse(ymd) else { return ymd }
        let formatter = makeFormatter()
        formatter.dateFormat = "EEEE d 'de' MMMM"
        let text = formatter.string(from: date)
        guard let first = text.first else { return text }
        return first.uppercased() + text.dropFirst()
    }

    static func shortDateTime(_ iso: String?) -> String {
        guard let iso, !iso.isEmpty else { return "" }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        guard let date = withFraction.date(from: iso) ?? plain.date(from: iso) else { return iso }
        let formatter = makeFormatter()
        formatter.dateFormat = "d MMM, HH:mm"
        return formatter.string(from: date)
    }

    /// Mes visible en Lima, desplazado `offset` meses desde hoy.
    static func monthWindow(offset: Int) -> (desde: String, hasta: String, label: String) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = AppConfig.timeZone
        let shifted = calendar.date(byAdding: .month, value: offset, to: Date()) ?? Date()
        let parts = calendar.dateComponents([.year, .month], from: shifted)
        guard
            let start = calendar.date(from: parts),
            let dayCount = calendar.range(of: .day, in: .month, for: start)?.count,
            let end = calendar.date(byAdding: .day, value: dayCount - 1, to: start)
        else {
            return ("", "", "")
        }
        let ymd = makeFormatter()
        ymd.dateFormat = "yyyy-MM-dd"
        let label = makeFormatter()
        label.dateFormat = "LLLL yyyy"
        let title = label.string(from: start)
        let capitalized = title.prefix(1).uppercased() + title.dropFirst()
        return (ymd.string(from: start), ymd.string(from: end), capitalized)
    }

    private static func parse(_ ymd: String) -> Date? {
        let formatter = makeFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: ymd)
    }

    private static func makeFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "es_PE")
        formatter.timeZone = AppConfig.timeZone
        return formatter
    }
}

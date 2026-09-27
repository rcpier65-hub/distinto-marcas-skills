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

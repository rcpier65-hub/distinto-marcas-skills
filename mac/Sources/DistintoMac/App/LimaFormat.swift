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
        guard let date = parseISO(iso) else { return iso ?? "" }
        let formatter = makeFormatter()
        formatter.dateFormat = "d MMM, HH:mm"
        return formatter.string(from: date)
    }

    /// Hora en Lima, 12 h, como el home de Notas.
    static func clock(_ iso: String?) -> String {
        guard let date = parseISO(iso) else { return "" }
        let formatter = makeFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    /// Día del mes en Lima (para la columna de Próximas).
    static func dayNumber(_ iso: String?) -> String {
        guard let date = parseISO(iso) else { return "" }
        let formatter = makeFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }

    static func monthWeekday(_ iso: String?) -> String {
        guard let date = parseISO(iso) else { return "" }
        let formatter = makeFormatter()
        formatter.dateFormat = "MMMM EEE"
        return formatter.string(from: date)
    }

    /// Encabezado de grupo: Hoy, Ayer, o «27 de septiembre».
    static func dayHeading(iso: String?, hoy: String) -> String {
        guard let date = parseISO(iso) else { return "Sin fecha" }
        let ymdFormatter = makeFormatter()
        ymdFormatter.dateFormat = "yyyy-MM-dd"
        let key = ymdFormatter.string(from: date)
        if key == hoy { return "Hoy" }
        if key == addDays(hoy, -1) { return "Ayer" }
        let label = makeFormatter()
        label.dateFormat = "d 'de' MMMM"
        return label.string(from: date)
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

    private static func parseISO(_ iso: String?) -> Date? {
        guard let iso, !iso.isEmpty else { return nil }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let date = withFraction.date(from: iso) ?? plain.date(from: iso) {
            return date
        }
        let lima = makeFormatter()
        lima.dateFormat = "yyyy-MM-dd'T'HH:mm:ssXXXXX"
        return lima.date(from: iso)
    }

    private static func addDays(_ ymd: String, _ days: Int) -> String {
        guard let date = parse(ymd) else { return "" }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = AppConfig.timeZone
        guard let shifted = calendar.date(byAdding: .day, value: days, to: date) else { return "" }
        let formatter = makeFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: shifted)
    }

    private static func makeFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "es_PE")
        formatter.timeZone = AppConfig.timeZone
        return formatter
    }
}

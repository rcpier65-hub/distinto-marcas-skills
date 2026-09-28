import Foundation

struct ReportesResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let conDatos: Int
    let marcas: [MarcaReporteItem]
}

struct MarcaReporteItem: Codable, Equatable, Identifiable {
    let slug: String
    let nombre: String
    let emoji: String?
    let color: String
    let tieneDatos: Bool
    let meses: Int
    let ultimoMes: String?
    let ultimoMesLabel: String?
    let leads: Double?
    let ventasTotales: Double?
    let ingresoDirecto: Double?
    let roasDirecto: Double?
    let link: String

    var id: String { slug }
}

enum ReporteFormato {
    static func soles(_ value: Double) -> String {
        "S/ \(entero(value))"
    }

    static func entero(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "es_PE")
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? String(Int(value.rounded()))
    }

    static func roas(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "es_PE")
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        let text = formatter.string(from: NSNumber(value: value)) ?? String(format: "%.2f", value)
        return "\(text)×"
    }
}

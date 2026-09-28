import SwiftUI

struct CalendarioResponse: Codable, Equatable {
    let ok: Bool
    let desde: String
    let hasta: String
    let hoy: String
    let total: Int
    let eventos: [EventoAgenda]
}

struct EventoAgenda: Codable, Equatable, Identifiable {
    let id: String
    let tipo: String
    let fecha: String
    let hora: String?
    let hora12: String?
    let titulo: String
    let estado: String
    let notas: String?
    let videosGrabados: Int?
    let marca: MarcaRef?
    let link: String

    var esGrabacion: Bool { tipo == "grabacion" }
    var esReunion: Bool { tipo == "reunion" }

    var tipoLabel: String {
        switch tipo {
        case "grabacion": return "Grabación"
        case "reunion": return "Reunión"
        default: return tipo.capitalized
        }
    }

    var tipoSymbol: String {
        switch tipo {
        case "grabacion": return "video"
        case "reunion": return "person.2"
        default: return "calendar"
        }
    }

    var horaVisible: String {
        if let hora12, !hora12.isEmpty { return hora12 }
        if let hora, !hora.isEmpty { return hora }
        return "Todo el día"
    }

    var cancelado: Bool {
        let value = estado.lowercased()
        return value == "cancelada" || value == "cancelado"
    }

    var estadoChip: (label: String, color: Color, background: Color) {
        switch estado.lowercased() {
        case "planeada":
            return ("Planeada", Color(hex: 0x4F46E5), Color(hex: 0xEEF2FF))
        case "cumplida":
            return ("Cumplida", Color(hex: 0x15803D), Color(hex: 0xDCFCE7))
        case "cancelada", "cancelado":
            return ("Cancelada", Color(hex: 0x6B7280), Color(hex: 0xF3F4F6))
        case "agendada":
            return ("Agendada", Color(hex: 0x5B21B6), Color(hex: 0xEDE9FE))
        case "realizada":
            return ("Realizada", Color(hex: 0x15803D), Color(hex: 0xDCFCE7))
        default:
            let label = estado.replacingOccurrences(of: "_", with: " ").capitalized
            return (label, DistintoTokens.ColorToken.textSecondary, DistintoTokens.ColorToken.bgHover)
        }
    }
}

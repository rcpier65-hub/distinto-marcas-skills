import SwiftUI

struct NotasResponse: Codable, Equatable {
    let ok: Bool
    let hoy: String
    let veTodo: Bool
    let total: Int
    let proximas: [ProximaReunion]
    let notas: [NotaReunionItem]
}

struct ProximaReunion: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let startsAt: String
    let endsAt: String?
    let fuente: String
    let link: String

    var fuenteLabel: String {
        switch fuente {
        case "marca_reuniones": return "Reunión"
        case "google_calendar": return "Calendar"
        case "nota": return "Nota"
        default: return "Evento"
        }
    }

    var horario: String {
        let inicio = LimaFormat.clock(startsAt)
        guard let endsAt, !endsAt.isEmpty else { return inicio }
        let fin = LimaFormat.clock(endsAt)
        if fin.isEmpty { return inicio }
        return "\(inicio) – \(fin)"
    }
}

struct NotaReunionItem: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let preview: String?
    let estado: String
    let autorNombre: String
    let esMio: Bool
    let createdAt: String?
    let updatedAt: String?
    let link: String

    var cuando: String? { updatedAt ?? createdAt }

    var estadoLabel: String? {
        switch estado {
        case "en_curso": return "En curso"
        case "finalizada": return "Finalizada"
        case "borrador": return nil
        default: return nil
        }
    }

    var estadoColor: Color {
        switch estado {
        case "en_curso": return Color(hex: 0xD97706)
        case "finalizada": return Color(hex: 0x16A34A)
        default: return DistintoTokens.ColorToken.textTertiary
        }
    }
}

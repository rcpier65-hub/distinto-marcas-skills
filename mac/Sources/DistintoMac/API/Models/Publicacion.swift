import SwiftUI

struct PublicacionesResponse: Codable, Equatable {
    let ok: Bool
    let desde: String
    let hasta: String
    let hoy: String
    let total: Int
    let publicaciones: [PublicacionItem]
}

struct MarcaRef: Codable, Equatable {
    let slug: String
    let nombre: String
    let color: String?
    let emoji: String?

    var colorValue: Color {
        Color(hexString: color) ?? DistintoTokens.ColorToken.accent
    }

    var nombreCorto: String {
        MarcaCatalog.all.first { $0.slug == slug }?.nombreCorto ?? nombre
    }
}

struct PublicacionItem: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let fecha: String
    let hora: String?
    let estado: String
    let tipo: String
    let plataformas: [String]
    let editor: String?
    let marca: MarcaRef?
    let link: String

    /// Chips de /publicaciones (`ESTADO_PUB_CONFIG`).
    var estadoChip: EstadoChip {
        switch estado {
        case "pendiente":
            return EstadoChip(label: "Pendiente", color: Color(hex: 0x5EEAD4))
        case "publicando":
            return EstadoChip(label: "Publicando", color: Color(hex: 0xFBBF24))
        case "publicado":
            return EstadoChip(label: "Publicado", color: Color(hex: 0x4CB782))
        case "error":
            return EstadoChip(label: "Error", color: Color(hex: 0xEB5757))
        case "borrador":
            return EstadoChip(label: "Borrador", color: Color(hex: 0x737373))
        default:
            return EstadoChip(label: estado.replacingOccurrences(of: "_", with: " ").capitalized, color: Color(hex: 0x737373))
        }
    }

    var tipoLabel: String {
        switch tipo {
        case "reel": return "Reel"
        case "post": return "Post"
        case "carrusel": return "Carrusel"
        case "story": return "Story"
        case "video": return "Video"
        default: return tipo.capitalized
        }
    }

    struct EstadoChip {
        let label: String
        let color: Color
    }
}

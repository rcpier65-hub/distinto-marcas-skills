import SwiftUI

struct SoporteResponse: Codable, Equatable {
    let ok: Bool
    let esAdmin: Bool
    let total: Int
    let reportes: [ReporteSoporte]
}

struct ReporteSoporte: Codable, Equatable, Identifiable {
    let id: String
    let autorNombre: String
    let esMio: Bool
    let tipo: String
    let descripcion: String
    let estado: String
    let notaResolucion: String?
    let imagenes: Int
    let createdAt: String?
    let resueltoAt: String?
    let resueltoPor: String?
    let link: String

    var tipoMeta: TipoMeta {
        switch tipo {
        case "falla":
            return TipoMeta(label: "Falla", symbol: "ladybug", color: Color(hex: 0xDC2626), background: Color(hex: 0xFEF2F2))
        case "pedido":
            return TipoMeta(label: "Pedido", symbol: "lightbulb", color: Color(hex: 0xD97706), background: Color(hex: 0xFFFBEB))
        case "consulta":
            return TipoMeta(label: "Consulta", symbol: "questionmark.circle", color: Color(hex: 0x2563EB), background: Color(hex: 0xEFF6FF))
        default:
            return TipoMeta(label: "Consulta", symbol: "questionmark.circle", color: Color(hex: 0x2563EB), background: Color(hex: 0xEFF6FF))
        }
    }

    var estadoMeta: EstadoMeta {
        switch estado {
        case "resuelto":
            return EstadoMeta(label: "Resuelto", color: Color(hex: 0x16A34A), background: Color(hex: 0xF0FDF4))
        case "en_proceso":
            return EstadoMeta(label: "En proceso", color: Color(hex: 0x2563EB), background: Color(hex: 0xEFF6FF))
        default:
            return EstadoMeta(label: "Pendiente", color: Color(hex: 0xD97706), background: Color(hex: 0xFFFBEB))
        }
    }

    struct TipoMeta {
        let label: String
        let symbol: String
        let color: Color
        let background: Color
    }

    struct EstadoMeta {
        let label: String
        let color: Color
        let background: Color
    }
}

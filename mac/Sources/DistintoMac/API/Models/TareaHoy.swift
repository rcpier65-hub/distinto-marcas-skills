import Foundation

struct TareasHoyResponse: Codable, Equatable {
    let ok: Bool
    let fecha: String
    let total: Int
    let tareas: [TareaHoy]
    /// "Tu trabajo de hoy" de /inicio. Vacío si el JSON no trae el bloque.
    let trabajoHoy: [TrabajoHoyItem]
    /// Pendientes rápidos de /inicio.
    let pendientes: [PendienteRapido]

    enum CodingKeys: String, CodingKey {
        case ok, fecha, total, tareas, pendientes
        case trabajoHoy = "trabajo_hoy"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ok = try container.decode(Bool.self, forKey: .ok)
        fecha = try container.decode(String.self, forKey: .fecha)
        total = try container.decode(Int.self, forKey: .total)
        tareas = try container.decodeIfPresent([TareaHoy].self, forKey: .tareas) ?? []
        trabajoHoy = (try? container.decode([TrabajoHoyItem].self, forKey: .trabajoHoy)) ?? []
        pendientes = (try? container.decode([PendienteRapido].self, forKey: .pendientes)) ?? []
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(ok, forKey: .ok)
        try container.encode(fecha, forKey: .fecha)
        try container.encode(total, forKey: .total)
        try container.encode(tareas, forKey: .tareas)
        try container.encode(trabajoHoy, forKey: .trabajoHoy)
        try container.encode(pendientes, forKey: .pendientes)
    }
}

struct TrabajoHoyItem: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
    let marca: String
    let marcaColor: String
    let meta: String
    let marcadaHoy: Bool
    let modulo: String
    let link: String

    var moduloLabel: String {
        switch modulo {
        case "editor": return "Editor"
        case "diseno": return "Diseño"
        case "comentarios": return "Comentarios"
        default: return modulo.capitalized
        }
    }
}

struct PendienteRapido: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let descripcion: String?
    let categoria: String
    let prioridad: Int
    let link: String
}

struct TareaHoy: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let due: String?
    let status: String
    let prioridad: Int?
    let proyecto: String?
    let marca: String?
    let link: String
    let fuente: String

    var isInbox: Bool { due == nil }
    var isRapida: Bool { fuente == "pendientes_rapidos" }

    /// Column / chip name. Web board groups by categoría; the API sends that as `proyecto`.
    var columna: String {
        if let proyecto, !proyecto.isEmpty { return proyecto }
        if let marca, !marca.isEmpty { return marca }
        return due == nil ? "Inbox" : "General"
    }

    var statusLabel: String {
        switch status {
        case "pendiente": return "Pendiente"
        case "en_proceso": return "En proceso"
        case "completada": return "Completada"
        default: return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

enum APIError: LocalizedError {
    case unauthorized
    case http(Int, String)
    case decoding
    case notSignedIn

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Sesión inválida o expirada"
        case .http(let code, let msg):
            return msg.isEmpty ? "Error \(code)" : msg
        case .decoding: return "No se pudo leer la respuesta"
        case .notSignedIn: return "Inicia sesión primero"
        }
    }
}

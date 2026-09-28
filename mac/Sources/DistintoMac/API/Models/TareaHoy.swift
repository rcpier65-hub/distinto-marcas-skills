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
    /// Frase del día de /inicio. Vacía si el JSON no la trae.
    let frase: FraseDia?

    enum CodingKeys: String, CodingKey {
        case ok, fecha, total, tareas, pendientes, frase
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
        frase = try container.decodeIfPresent(FraseDia.self, forKey: .frase)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(ok, forKey: .ok)
        try container.encode(fecha, forKey: .fecha)
        try container.encode(total, forKey: .total)
        try container.encode(tareas, forKey: .tareas)
        try container.encode(trabajoHoy, forKey: .trabajoHoy)
        try container.encode(pendientes, forKey: .pendientes)
        try container.encodeIfPresent(frase, forKey: .frase)
    }
}

struct FraseDia: Codable, Equatable {
    let texto: String
    let autor: String
    let contexto: String?
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

struct TareasTableroResponse: Codable, Equatable {
    let ok: Bool
    let vista: String
    let esDueno: Bool
    let meId: String?
    let total: Int
    let tareas: [TareaTablero]
    let archivo: [TareaTablero]
    let equipo: [PersonaTablero]
    let marcas: [MarcaTablero]
}

struct TareaTablero: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let categoria: String
    let color: String
    let estado: String
    let fechaEntrega: String?
    let fechaInicio: String?
    let completadaAt: String?
    let marca: String?
    let marcaSlug: String?
    let asignado: String?
    let asignadoId: String?
    let link: String

    var estadoLabel: String {
        switch estado {
        case "en_proceso": return "En proceso"
        case "archivado": return "Archivo"
        default: return "Pendiente"
        }
    }
}

struct PersonaTablero: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
}

struct MarcaTablero: Codable, Equatable, Identifiable {
    let slug: String
    let nombre: String
    var id: String { slug }
}

struct TareaCreadaResponse: Codable, Equatable {
    let ok: Bool
    let id: String
    let titulo: String
    let categoria: String
    let color: String
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

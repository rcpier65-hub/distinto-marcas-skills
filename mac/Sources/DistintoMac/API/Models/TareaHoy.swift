import Foundation

struct TareasHoyResponse: Codable, Equatable {
    let ok: Bool
    let fecha: String
    let total: Int
    let tareas: [TareaHoy]
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

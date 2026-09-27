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
        case .http(let code, let msg): return "HTTP \(code): \(msg)"
        case .decoding: return "No se pudo leer la respuesta"
        case .notSignedIn: return "Iniciá sesión primero"
        }
    }
}

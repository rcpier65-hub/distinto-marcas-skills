import Foundation

struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date?
    var email: String
    var userId: String
}

enum AuthError: LocalizedError {
    case invalidCredentials
    case server(String)
    case decoding
    case keychain(OSStatus)
    case notSignedIn

    var errorDescription: String? {
        switch self {
        case .invalidCredentials: return "Email o contraseña incorrectos"
        case .server(let m): return m
        case .decoding: return "Respuesta de auth inválida"
        case .keychain(let s): return "Keychain error (\(s))"
        case .notSignedIn: return "No hay sesión"
        }
    }
}

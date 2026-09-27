import Foundation

struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date?
    var email: String
    var userId: String

    var isPedro: Bool {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == AppConfig.pedroEmail
    }

    /// Local-part of the email, first letter uppercased. Used until we load team profile.
    var displayName: String {
        let local = email.split(separator: "@").first.map(String.init) ?? email
        guard let first = local.first else { return local }
        return first.uppercased() + local.dropFirst()
    }

    var initial: String {
        String(displayName.prefix(1)).uppercased()
    }
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

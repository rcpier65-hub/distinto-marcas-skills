import Foundation

struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date?
    var email: String
    var userId: String
    /// Nombre de team_members, cuando /api/v1/perfil ya respondió.
    var nombre: String? = nil

    var isPedro: Bool {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == AppConfig.pedroEmail
    }

    /// Nombre del equipo, o la parte local del email hasta que cargue el perfil.
    var displayName: String {
        if let nombre {
            let trimmed = nombre.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty { return trimmed }
        }
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

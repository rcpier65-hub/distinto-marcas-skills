import Foundation

struct PerfilResponse: Codable, Equatable {
    let ok: Bool
    let perfil: PerfilUsuario
}

struct PerfilUsuario: Codable, Equatable {
    let userId: String
    let email: String?
    let nombre: String?
    let rol: String?
    let rolBase: String?
    let cargo: String?
    let esEquipo: Bool
    let activo: Bool
    let esDirector: Bool

    var nombreVisible: String {
        if let nombre, !nombre.isEmpty { return nombre }
        if let email, let local = email.split(separator: "@").first {
            return String(local)
        }
        return "Tu cuenta"
    }

    var rolVisible: String? {
        if let rol, !rol.isEmpty { return rol }
        if esDirector, !esEquipo { return "Administrador" }
        return nil
    }
}

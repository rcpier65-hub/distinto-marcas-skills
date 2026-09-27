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
    let modulos: ModulosAcceso?
    let marcasNav: [MarcaNavDTO]?

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

struct ModulosAcceso: Codable, Equatable {
    let publicaciones: Bool
    let editor: Bool
    let diseno: Bool
    let historias: Bool
    let metricas: Bool
    let marcas: Bool
    let grilla: Bool
    let equipo: Bool
    let settings: Bool
    let esPedro: Bool
    let esCeo: Bool
    let puedeGestionarMarcas: Bool
    let influencers: Bool
}

struct MarcaNavDTO: Codable, Equatable, Identifiable {
    let slug: String
    let nombre: String
    let nombreCorto: String
    let emoji: String?
    let color: String?
    let influencersActivo: Bool
    var id: String { slug }
}

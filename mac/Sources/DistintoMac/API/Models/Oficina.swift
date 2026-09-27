import Foundation

struct OficinaResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let escritorios: [EscritorioOficina]
    let sinPuesto: [PersonaOficina]
    let zonas: [ZonaOficina]
    let accesos: [AccesoOficina]
}

struct EscritorioOficina: Codable, Equatable, Identifiable {
    let id: String
    let etiqueta: String
    let zona: String
    let libre: Bool
    let esMio: Bool
    let ocupante: OcupanteOficina?
    let link: String

    var detalle: String {
        if esMio { return "Tuyo" }
        if let nombre = ocupante?.nombre, !nombre.isEmpty { return nombre }
        if libre { return "Libre" }
        return "Ocupado"
    }
}

struct OcupanteOficina: Codable, Equatable {
    let userId: String
    let nombre: String?
    let ultimaVisita: String?
}

struct PersonaOficina: Codable, Equatable, Identifiable {
    let userId: String
    let nombre: String?
    let ultimaVisita: String?
    let link: String

    var id: String { userId }

    var titulo: String {
        let trimmed = nombre?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "Alguien" : trimmed
    }
}

struct ZonaOficina: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
    let emoji: String
    let color: String
    let link: String
}

struct AccesoOficina: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let icono: String
    let link: String
}

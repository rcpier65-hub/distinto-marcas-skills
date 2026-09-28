import Foundation

struct MarcaChip: Codable, Equatable {
    let slug: String
    let nombre: String
    let emoji: String?
    let color: String?
}

struct EditorResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let conteos: EditorConteos
    let piezas: [EditorPieza]
}

struct EditorConteos: Codable, Equatable {
    let editar: Int
    let aprobar: Int
    let programar: Int
    let publicar: Int
    let publicado: Int
    let borrador: Int
}

struct EditorPieza: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
    let estado: String
    let fecha: String?
    let editorNombre: String?
    let plataformas: [String]
    let marca: MarcaChip?
    let link: String
}

struct DisenoResponse: Codable, Equatable {
    let ok: Bool
    let migracionPendiente: Bool
    let total: Int
    let piezas: [DisenoPieza]
}

struct DisenoPieza: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
    let estado: String
    let fecha: String?
    let marca: MarcaChip?
    let link: String
}

struct HistoriasResponse: Codable, Equatable {
    let ok: Bool
    let hoy: String
    let migracionPendiente: Bool
    let total: Int
    let historias: [HistoriaFila]
}

struct HistoriaFila: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let fecha: String?
    let hora: String?
    let estado: String
    let plataformas: [String]
    let nota: String?
    let marca: MarcaChip?
    let link: String
}

struct InfluencersResponse: Codable, Equatable {
    let ok: Bool
    let marcas: [InfluencerMarca]
    let marca: InfluencerMarca?
    let total: Int
    let pedidos: [InfluencerPedido]
}

struct InfluencerMarca: Codable, Equatable, Identifiable {
    let slug: String
    let nombre: String
    let emoji: String?
    let activo: Bool
    var id: String { slug }
}

struct InfluencerPedido: Codable, Equatable, Identifiable {
    let id: String
    let usuarioIg: String
    let nombre: String?
    let estado: String
    let estadoLabel: String
    let telefono: String?
    let productos: [String]
    let videoUrl: String?
    let notas: String?
    let link: String
}

struct PlanesResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let reglas: [String]
    let planes: [PlanFila]
}

struct PlanFila: Codable, Equatable, Identifiable {
    let id: String
    let categoria: String
    let nombre: String
    let precioLabel: String
    let periodo: String
    let minimo: String?
    let aplica: String?
    let incluye: [String]
    let noIncluye: [String]
    let destacado: Bool
    let link: String
}

struct DashboardResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let activas: Int
    let marcas: [DashboardMarca]
    let linkNueva: String
}

struct DashboardMarca: Codable, Equatable, Identifiable {
    let slug: String
    let nombre: String
    let emoji: String?
    let color: String?
    let activa: Bool
    let tareasAbiertas: Int
    let link: String
    var id: String { slug }
}

struct GrillaResponse: Codable, Equatable {
    let ok: Bool
    let vista: String
    let desde: String
    let hasta: String
    let hoy: String
    let total: Int
    let marca: GrillaMarca
    let piezas: [GrillaPieza]
    let link: String
}

struct GrillaMarca: Codable, Equatable {
    let slug: String
    let nombre: String
    let emoji: String?
    let color: String?
    let activa: Bool
}

struct GrillaPieza: Codable, Equatable, Identifiable {
    let id: String
    let titulo: String
    let fecha: String
    let estado: String?
    let plataformas: [String]
    let tipos: [String]
    let link: String
}

struct HabitosResponse: Codable, Equatable {
    let ok: Bool
    let today: String
    let total: Int
    let completados: Int
    let habitos: [HabitoFila]
}

struct HabitoFila: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
    let icono: String
    let color: String
    let aplicaHoy: Bool
    let completadoHoy: Bool
    let hechosSemana: Int
    let link: String
}

struct ActividadResponse: Codable, Equatable {
    let ok: Bool
    let fecha: String
    let esAdmin: Bool
    let persona: String?
    let total: Int
    let actividad: [ActividadFila]
    let habitos: [ActividadHabito]
    let link: String
}

struct ActividadFila: Codable, Equatable, Identifiable {
    let actorNombre: String
    let rol: String?
    let accion: String
    let detalle: String?
    let marcaSlug: String?
    let createdAt: String
    var id: String { "\(actorNombre)-\(createdAt)-\(accion)" }
}

struct ActividadHabito: Codable, Equatable, Identifiable {
    let persona: String
    let nombre: String
    let icono: String
    var id: String { "\(persona)-\(nombre)" }
}

struct HistorialResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let grillas: [HistorialGrilla]
}

struct HistorialGrilla: Codable, Equatable, Identifiable {
    let id: String
    let semanaInicio: String?
    let semanaFin: String?
    let estado: String
    let pedidaAt: String?
    let enviadaAt: String?
    let marca: MarcaChip?
    let link: String
}

struct EquipoResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let activos: Int
    let miembros: [EquipoMiembro]
}

struct EquipoMiembro: Codable, Equatable, Identifiable {
    let id: String
    let nombre: String
    let email: String?
    let rol: String?
    let rolBase: String?
    let cargo: String?
    let activo: Bool
    let marcas: Int?
    let enEdicion: Int
    let link: String
}

struct SettingsResponse: Codable, Equatable {
    let ok: Bool
    let cuenta: SettingsCuenta
    let integraciones: SettingsIntegraciones
    let total: Int
    let marcas: [SettingsMarca]
    let link: String
}

struct SettingsCuenta: Codable, Equatable {
    let email: String?
    let nombre: String?
    let rol: String?
}

struct SettingsIntegraciones: Codable, Equatable {
    let metricoolConfigurado: Bool
    let openaiConfigurado: Bool
    let anthropicConfigurado: Bool
}

struct SettingsMarca: Codable, Equatable, Identifiable {
    let slug: String
    let nombre: String
    let emoji: String?
    let activa: Bool
    let tieneLogo: Bool
    let whatsappGrupo: String?
    let envioReal: Bool
    let decisor: String?
    let correos: Int
    var id: String { slug }
}

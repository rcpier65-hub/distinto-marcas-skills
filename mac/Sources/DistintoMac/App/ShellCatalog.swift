import SwiftUI

enum AppRoute: Hashable {
    case inicio
    case planes
    case tareas
    case publicaciones
    case editor
    case diseno
    case historias
    case calendario
    case ideas
    case oficina
    case notas
    case soporte
    case reportes
    case influencers
    case verMarcas
    case marca(String)
    case nuevaMarca
    case habitos
    case actividad
    case historial
    case equipo
    case settings
    case perfil

    var title: String {
        switch self {
        case .inicio: return "Inicio"
        case .planes: return "Planes"
        case .tareas: return "Tareas"
        case .publicaciones: return "Publicaciones"
        case .editor: return "Editor"
        case .diseno: return "Diseño"
        case .historias: return "Historias"
        case .calendario: return "Calendario"
        case .ideas: return "Creación de Ideas"
        case .oficina: return "Oficina"
        case .notas: return "Notas y reuniones"
        case .soporte: return "Soporte"
        case .reportes: return "Reportes"
        case .influencers: return "Influencers"
        case .verMarcas: return "Ver todas"
        case .marca(let slug):
            return MarcaCatalog.all.first { $0.slug == slug }?.nombreCorto ?? slug
        case .nuevaMarca: return "Agregar marca"
        case .habitos: return "Hábitos"
        case .actividad: return "Reporte del día"
        case .historial: return "Historial"
        case .equipo: return "Mi equipo"
        case .settings: return "Settings"
        case .perfil: return "Perfil"
        }
    }

    var systemImage: String {
        switch self {
        case .inicio: return "house"
        case .planes: return "square.stack.3d.up"
        case .tareas: return "checklist"
        case .publicaciones: return "calendar"
        case .editor: return "pencil"
        case .diseno: return "paintbrush"
        case .historias: return "circle.dashed"
        case .calendario: return "video"
        case .ideas: return "sparkles"
        case .oficina: return "building.2"
        case .notas: return "note.text"
        case .soporte: return "lifepreserver"
        case .reportes: return "chart.bar"
        case .influencers: return "person.crop.rectangle"
        case .verMarcas: return "square.grid.2x2"
        case .marca: return "tag"
        case .nuevaMarca: return "plus"
        case .habitos: return "checkmark.circle"
        case .actividad: return "doc.text"
        case .historial: return "clock"
        case .equipo: return "person.3"
        case .settings: return "gearshape"
        case .perfil: return "person.crop.circle"
        }
    }

    var webPath: String {
        switch self {
        case .inicio: return "/inicio"
        case .planes: return "/planes"
        case .tareas: return "/tareas"
        case .publicaciones: return "/publicaciones"
        case .editor: return "/editor"
        case .diseno: return "/diseno"
        case .historias: return "/historias"
        case .calendario: return "/grabaciones/calendario"
        case .ideas: return "/creacion-de-ideas"
        case .oficina: return "/oficina"
        case .notas: return "/notas-reuniones"
        case .soporte: return "/soporte"
        case .reportes: return "/reportes"
        case .influencers: return "/influencers"
        case .verMarcas: return "/dashboard"
        case .marca(let slug): return "/grilla/\(slug)"
        case .nuevaMarca: return "/dashboard?nueva=1"
        case .habitos: return "/habitos"
        case .actividad: return "/actividad"
        case .historial: return "/historial"
        case .equipo: return "/equipo"
        case .settings: return "/settings"
        case .perfil: return "/perfil"
        }
    }
}

enum ShellSection: String, CaseIterable, Identifiable {
    case workspace = "Workspace"
    case marcas = "Marcas"
    case personal = "Personal"

    var id: String { rawValue }
}

struct ShellItem: Identifiable, Hashable {
    let id: String
    let route: AppRoute
    let section: ShellSection
    let shortcut: String?
    let indent: Bool
    let pedroOnly: Bool
    let emoji: String?
    /// “Agregar marca” uses the brand purple plus, matching the web sidebar.
    let brandIcon: Bool
    let titleOverride: String?

    var label: String { titleOverride ?? route.title }
    var systemImage: String { route.systemImage }

    static func == (lhs: ShellItem, rhs: ShellItem) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct MarcaNavItem: Identifiable, Hashable {
    let slug: String
    let nombre: String
    let nombreCorto: String
    let emoji: String
    let colorHex: UInt32
    var id: String { slug }
    var color: Color { Color(hex: colorHex) }

    static func from(dto: MarcaNavDTO) -> MarcaNavItem {
        MarcaNavItem(
            slug: dto.slug,
            nombre: dto.nombre,
            nombreCorto: dto.nombreCorto.isEmpty ? dto.nombre : dto.nombreCorto,
            emoji: dto.emoji.flatMap { $0.isEmpty ? nil : $0 } ?? "•",
            colorHex: Self.hex(dto.color)
        )
    }

    private static func hex(_ raw: String?) -> UInt32 {
        guard var text = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return 0x7170FF
        }
        if text.hasPrefix("#") { text.removeFirst() }
        return UInt32(text, radix: 16) ?? 0x7170FF
    }
}

/// Same order as `MARCAS_NAV` in `app/lib/mock-marcas.ts`. Fallback titles only.
enum MarcaCatalog {
    static let all: [MarcaNavItem] = [
        .init(slug: "manrique", nombre: "Centro Psicológico Manrique", nombreCorto: "Manrique", emoji: "🧠", colorHex: 0x6FB8D8),
        .init(slug: "lozano", nombre: "Muebles Lozano SAC", nombreCorto: "Lozano", emoji: "🪵", colorHex: 0xB8895E),
        .init(slug: "kintu", nombre: "KintuOils", nombreCorto: "Kintu", emoji: "🌿", colorHex: 0x82A474),
        .init(slug: "novalamps", nombre: "Novalamps Perú", nombreCorto: "Novalamps", emoji: "💡", colorHex: 0xFFB547),
        .init(slug: "la-victoria", nombre: "La Victoria Maderera", nombreCorto: "La Victoria", emoji: "🪚", colorHex: 0x8B6F47),
        .init(slug: "distribuidora-fitness", nombre: "Distribuidora Fitness", nombreCorto: "Distri Fitness", emoji: "💪", colorHex: 0xFF5252),
        .init(slug: "little-joe", nombre: "TypHouse", nombreCorto: "TypHouse", emoji: "💙", colorHex: 0xFF8FAB),
        .init(slug: "warrior-supps", nombre: "Warrior Supps", nombreCorto: "Warrior", emoji: "⚡", colorHex: 0xC9882A)
    ]
}

/// Visibility matches `Sidebar.tsx`. Gated modules stay hidden until `/api/v1/perfil` answers.
struct SidebarAccess: Equatable {
    var esPedro: Bool
    var esCeo: Bool
    var puedeGestionarMarcas: Bool
    var publicaciones: Bool
    var editor: Bool
    var diseno: Bool
    var historias: Bool
    var metricas: Bool
    var marcas: Bool
    var influencers: Bool
    var equipo: Bool
    var settings: Bool
    var marcasNav: [MarcaNavItem]

    static func pending(isPedro: Bool) -> SidebarAccess {
        SidebarAccess(
            esPedro: isPedro,
            esCeo: isPedro,
            puedeGestionarMarcas: isPedro,
            publicaciones: false,
            editor: false,
            diseno: false,
            historias: false,
            metricas: false,
            marcas: false,
            influencers: false,
            equipo: false,
            settings: false,
            marcasNav: []
        )
    }
}

enum ShellCatalog {
    static func items(access: SidebarAccess) -> [ShellItem] {
        var workspace: [ShellItem] = [
            item("inicio", .inicio, .workspace, shortcut: "1")
        ]
        if access.esPedro {
            workspace.append(item("planes", .planes, .workspace, shortcut: "P", pedroOnly: true))
        }
        workspace.append(item("tareas", .tareas, .workspace, shortcut: "T"))
        if access.publicaciones {
            workspace.append(item("publicaciones", .publicaciones, .workspace, shortcut: "3"))
        }
        if access.editor {
            workspace.append(item("editor", .editor, .workspace, indent: access.publicaciones))
        }
        if access.diseno {
            workspace.append(item("diseno", .diseno, .workspace, indent: access.publicaciones))
        }
        if access.historias {
            workspace.append(item("historias", .historias, .workspace, indent: access.publicaciones || access.diseno))
        }
        if access.publicaciones {
            workspace.append(item("calendario", .calendario, .workspace, shortcut: "4"))
        }
        workspace.append(contentsOf: [
            item("ideas", .ideas, .workspace),
            item("oficina", .oficina, .workspace, shortcut: "O"),
            item("notas", .notas, .workspace),
            item("soporte", .soporte, .workspace)
        ])
        if access.metricas {
            workspace.append(item("reportes", .reportes, .workspace))
        }
        if access.influencers {
            workspace.append(item("influencers", .influencers, .workspace))
        }

        var marcas: [ShellItem] = []
        if access.marcas && !access.marcasNav.isEmpty {
            if access.puedeGestionarMarcas {
                marcas.append(item("ver-marcas", .verMarcas, .marcas))
            }
            marcas += access.marcasNav.map { marca in
                ShellItem(
                    id: "marca:\(marca.slug)",
                    route: .marca(marca.slug),
                    section: .marcas,
                    shortcut: nil,
                    indent: false,
                    pedroOnly: false,
                    emoji: marca.emoji,
                    brandIcon: false,
                    titleOverride: marca.nombreCorto
                )
            }
            if access.puedeGestionarMarcas {
                marcas.append(
                    ShellItem(
                        id: "nueva-marca",
                        route: .nuevaMarca,
                        section: .marcas,
                        shortcut: nil,
                        indent: false,
                        pedroOnly: false,
                        emoji: nil,
                        brandIcon: true,
                        titleOverride: nil
                    )
                )
            }
        }

        var personal: [ShellItem] = [
            item("habitos", .habitos, .personal),
            item("actividad", .actividad, .personal)
        ]
        if access.esCeo {
            personal.append(item("historial", .historial, .personal))
        }
        if access.equipo {
            personal.append(item("equipo", .equipo, .personal))
        }
        if access.settings {
            personal.append(item("settings", .settings, .personal))
        }

        return workspace + marcas + personal
    }

    private static func item(
        _ id: String,
        _ route: AppRoute,
        _ section: ShellSection,
        shortcut: String? = nil,
        indent: Bool = false,
        pedroOnly: Bool = false
    ) -> ShellItem {
        ShellItem(
            id: id,
            route: route,
            section: section,
            shortcut: shortcut,
            indent: indent,
            pedroOnly: pedroOnly,
            emoji: nil,
            brandIcon: false,
            titleOverride: nil
        )
    }
}

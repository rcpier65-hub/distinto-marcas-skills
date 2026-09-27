import SwiftUI

enum AppRoute: Hashable {
    case inicio
    case planes
    case tareas
    case publicaciones
    case editor
    case diseno
    case calendario
    case ideas
    case oficina
    case notas
    case soporte
    case reportes
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
        case .calendario: return "Calendario"
        case .ideas: return "Creación de Ideas"
        case .oficina: return "Oficina"
        case .notas: return "Notas y reuniones"
        case .soporte: return "Soporte"
        case .reportes: return "Reportes"
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
        case .calendario: return "video"
        case .ideas: return "sparkles"
        case .oficina: return "building.2"
        case .notas: return "note.text"
        case .soporte: return "lifepreserver"
        case .reportes: return "chart.bar"
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
        case .calendario: return "/grabaciones/calendario"
        case .ideas: return "/creacion-de-ideas"
        case .oficina: return "/oficina"
        case .notas: return "/notas-reuniones"
        case .soporte: return "/soporte"
        case .reportes: return "/reportes"
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

    /// Native working surfaces. Everything else opens as a branded placeholder
    /// with a link to the same route on the web.
    var isNative: Bool {
        switch self {
        case .inicio, .tareas: return true
        case .planes, .publicaciones, .editor, .diseno, .calendario, .ideas,
             .oficina, .notas, .soporte, .reportes, .verMarcas, .marca, .nuevaMarca,
             .habitos, .actividad, .historial, .equipo, .settings, .perfil:
            return false
        }
    }

    var placeholderDetail: String {
        switch self {
        case .inicio, .tareas:
            return ""
        case .planes:
            return "Los planes de contenido de cada marca."
        case .publicaciones:
            return "Calendario de publicaciones."
        case .editor:
            return "Piezas que están en edición."
        case .diseno:
            return "Piezas que están en diseño."
        case .calendario:
            return "Grabaciones y calendario del equipo."
        case .ideas:
            return "Banco de ideas de contenido."
        case .oficina:
            return "La oficina del equipo."
        case .notas:
            return "Notas y reuniones."
        case .soporte:
            return "Pedidos de soporte."
        case .reportes:
            return "Métricas y reportes."
        case .verMarcas:
            return "Todas las marcas de la agencia."
        case .marca:
            return "La grilla de esta marca vive en la web."
        case .nuevaMarca:
            return "Sumar una marca nueva desde el dashboard."
        case .habitos:
            return "Hábitos del día."
        case .actividad:
            return "El reporte del día."
        case .historial:
            return "Historial de actividad."
        case .equipo:
            return "Personas del equipo y permisos."
        case .settings:
            return "Ajustes de Distinto."
        case .perfil:
            return "Tu cuenta de equipo."
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

    var label: String { route.title }
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
}

/// Same order as `MARCAS_NAV` in `app/lib/mock-marcas.ts`.
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

enum ShellCatalog {
    /// Same visibility as `Sidebar.tsx` when `permisos` is null: every module is shown.
    /// Planes stays Pedro-only. Influencers stays off until a brand has `influencersActivo`.
    static func items(isPedro: Bool) -> [ShellItem] {
        let workspace: [ShellItem] = [
            item("inicio", .inicio, .workspace, shortcut: "1"),
            item("planes", .planes, .workspace, shortcut: "P", pedroOnly: true),
            item("tareas", .tareas, .workspace, shortcut: "T"),
            item("publicaciones", .publicaciones, .workspace, shortcut: "3"),
            item("editor", .editor, .workspace, indent: true),
            item("diseno", .diseno, .workspace, indent: true),
            item("calendario", .calendario, .workspace, shortcut: "4"),
            item("ideas", .ideas, .workspace),
            item("oficina", .oficina, .workspace, shortcut: "O"),
            item("notas", .notas, .workspace),
            item("soporte", .soporte, .workspace),
            item("reportes", .reportes, .workspace)
        ]

        var marcas: [ShellItem] = [
            item("ver-marcas", .verMarcas, .marcas)
        ]
        marcas += MarcaCatalog.all.map { marca in
            ShellItem(
                id: "marca:\(marca.slug)",
                route: .marca(marca.slug),
                section: .marcas,
                shortcut: nil,
                indent: false,
                pedroOnly: false,
                emoji: marca.emoji,
                brandIcon: false
            )
        }
        marcas.append(
            ShellItem(
                id: "nueva-marca",
                route: .nuevaMarca,
                section: .marcas,
                shortcut: nil,
                indent: false,
                pedroOnly: false,
                emoji: nil,
                brandIcon: true
            )
        )

        let personal: [ShellItem] = [
            item("habitos", .habitos, .personal),
            item("actividad", .actividad, .personal),
            item("historial", .historial, .personal),
            item("equipo", .equipo, .personal),
            item("settings", .settings, .personal)
        ]

        return (workspace + marcas + personal).filter { isPedro || !$0.pedroOnly }
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
            brandIcon: false
        )
    }
}

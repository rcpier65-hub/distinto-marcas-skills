import SwiftUI

struct HabitosListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: HabitosResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Hábitos",
            subtitle: subtitle,
            webPath: "/habitos",
            webLabel: "Marcar en la web",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando hábitos…",
            onRefresh: reload
        ) {
            if let response {
                if response.habitos.isEmpty {
                    ModuleEmptyState(title: "Sin hábitos", message: "Todavía no tienes hábitos activos. Puedes crearlos en la web.")
                } else {
                    ForEach(response.habitos) { habito in
                        ModuleRowButton(
                            title: habito.nombre,
                            detail: habito.aplicaHoy
                                ? "\(habito.hechosSemana)/7 esta semana"
                                : "No aplica hoy · \(habito.hechosSemana)/7 esta semana",
                            emoji: habito.icono,
                            chip: habito.completadoHoy ? "Hecho" : (habito.aplicaHoy ? "Pendiente" : "Otro día"),
                            chipColor: habito.completadoHoy ? Color(hex: 0x16A34A) : DistintoTokens.ColorToken.textTertiary
                        ) {
                            WebLink.open(habito.link, fallback: "/habitos", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Tus hábitos de hoy" }
        return "\(response.completados)/\(response.total) hoy · \(LimaFormat.longDate(response.today))"
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchHabitos(accessToken: $0)
        }
    }
}

struct ActividadListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: ActividadResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Reporte del día",
            subtitle: subtitle,
            webPath: "/actividad",
            webLabel: "Abrir reporte",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando actividad…",
            onRefresh: reload
        ) {
            if let response {
                if !response.habitos.isEmpty {
                    Text("Hábitos · \(response.habitos.map { "\($0.icono) \($0.nombre)" }.joined(separator: "  "))")
                        .font(.system(size: DistintoTokens.Typography.xs))
                        .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                }
                if response.actividad.isEmpty {
                    ModuleEmptyState(title: "Sin actividad", message: "No hay tareas cerradas ni videos editados en este día.")
                } else {
                    ForEach(Array(response.actividad.enumerated()), id: \.offset) { _, fila in
                        ModuleRowButton(
                            title: fila.detalle?.isEmpty == false ? (fila.detalle ?? fila.accion) : fila.accion,
                            detail: [fila.actorNombre, fila.marcaSlug].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "),
                            trailing: hora(fila.createdAt),
                            chip: fila.accion,
                            chipColor: DistintoTokens.ColorToken.accent
                        ) {
                            WebLink.open(response.link, fallback: "/actividad", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Lo que se cerró hoy" }
        let quien = response.esAdmin ? "equipo" : (response.persona ?? "ti")
        return "\(LimaFormat.longDate(response.fecha)) · \(quien) · \(response.total)"
    }

    private func hora(_ iso: String) -> String {
        if iso.count >= 16, iso.contains("T") {
            return String(iso.dropFirst(11).prefix(5))
        }
        return ""
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchActividad(accessToken: $0, fecha: nil)
        }
    }
}

struct HistorialListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: HistorialResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Historial",
            subtitle: subtitle,
            webPath: "/historial",
            webLabel: "Abrir historial",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando historial…",
            onRefresh: reload
        ) {
            if let response {
                if response.grillas.isEmpty {
                    ModuleEmptyState(title: "Sin grillas", message: "Todavía no hay grillas pedidas.")
                } else {
                    ForEach(response.grillas) { grilla in
                        let chip = StaffChip.estado(grilla.estado)
                        ModuleRowButton(
                            title: grilla.marca?.nombre ?? "Marca",
                            detail: semana(grilla),
                            emoji: grilla.marca?.emoji,
                            chip: chip.0 == grilla.estado.replacingOccurrences(of: "_", with: " ") ? grilla.estado : chip.0,
                            chipColor: chip.1
                        ) {
                            WebLink.open(grilla.link, fallback: "/historial", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Grillas pedidas" }
        return "\(response.total) grillas"
    }

    private func semana(_ grilla: HistorialGrilla) -> String {
        let inicio = grilla.semanaInicio.map { LimaFormat.shortDate($0) } ?? "—"
        let fin = grilla.semanaFin.map { LimaFormat.shortDate($0) } ?? "—"
        return "\(inicio) → \(fin)"
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchHistorial(accessToken: $0)
        }
    }
}

struct EquipoListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: EquipoResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Mi equipo",
            subtitle: subtitle,
            webPath: "/equipo",
            webLabel: "Gestionar en la web",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando equipo…",
            onRefresh: reload
        ) {
            if let response {
                if response.miembros.isEmpty {
                    ModuleEmptyState(title: "Sin miembros", message: "Todavía no hay personas en el equipo.")
                } else {
                    ForEach(response.miembros) { miembro in
                        ModuleRowButton(
                            title: miembro.nombre,
                            detail: detalle(miembro),
                            chip: miembro.activo ? (miembro.rol ?? "Activo") : "Inactivo",
                            chipColor: miembro.activo ? DistintoTokens.ColorToken.accent : DistintoTokens.ColorToken.textTertiary
                        ) {
                            WebLink.open(miembro.link, fallback: "/equipo", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Personas y roles" }
        return "\(response.activos) activos · \(response.total) en total"
    }

    private func detalle(_ miembro: EquipoMiembro) -> String {
        var parts: [String] = []
        if let email = miembro.email { parts.append(email) }
        if let cargo = miembro.cargo { parts.append(cargo) }
        if let marcas = miembro.marcas {
            parts.append(marcas == 1 ? "1 marca" : "\(marcas) marcas")
        } else {
            parts.append("Todas las marcas")
        }
        if miembro.enEdicion > 0 { parts.append("\(miembro.enEdicion) en edición") }
        return parts.joined(separator: " · ")
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchEquipo(accessToken: $0)
        }
    }
}

struct SettingsListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: SettingsResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Settings",
            subtitle: "Cuenta, integraciones y marcas",
            webPath: "/settings",
            webLabel: "Editar en la web",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando ajustes…",
            onRefresh: reload
        ) {
            if let response {
                VStack(alignment: .leading, spacing: 8) {
                    Text(response.cuenta.nombre ?? response.cuenta.email ?? "Cuenta")
                        .font(.system(size: DistintoTokens.Typography.base, weight: .semibold))
                    if let email = response.cuenta.email {
                        Text(email)
                            .font(.system(size: DistintoTokens.Typography.sm))
                            .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                    }
                    if let rol = response.cuenta.rol {
                        Text(rol)
                            .font(.system(size: DistintoTokens.Typography.xs))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .distintoCard(radius: 12)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Integraciones")
                        .font(.system(size: DistintoTokens.Typography.xs, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .textCase(.uppercase)
                    flag("Metricool", on: response.integraciones.metricoolConfigurado)
                    flag("OpenAI", on: response.integraciones.openaiConfigurado)
                    flag("Claude", on: response.integraciones.anthropicConfigurado)
                    Text("Las claves no salen de la web.")
                        .font(.system(size: DistintoTokens.Typography.xs))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .distintoCard(radius: 12)

                ForEach(response.marcas) { marca in
                    ModuleRowButton(
                        title: marca.nombre,
                        detail: detalle(marca),
                        emoji: marca.emoji,
                        chip: marca.activa ? "Activa" : "Inactiva",
                        chipColor: marca.activa ? Color(hex: 0x16A34A) : DistintoTokens.ColorToken.textTertiary
                    ) {
                        WebLink.open(response.link, fallback: "/settings", using: openURL)
                    }
                }
            }
        }
        .task { await load() }
    }

    private func flag(_ name: String, on: Bool) -> some View {
        HStack {
            Text(name)
                .font(.system(size: DistintoTokens.Typography.sm))
            Spacer()
            Text(on ? "Configurado" : "Sin configurar")
                .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
                .foregroundStyle(on ? Color(hex: 0x16A34A) : DistintoTokens.ColorToken.textTertiary)
        }
    }

    private func detalle(_ marca: SettingsMarca) -> String {
        var parts: [String] = []
        parts.append(marca.tieneLogo ? "Logo" : "Sin logo")
        if let grupo = marca.whatsappGrupo { parts.append(grupo) }
        parts.append(marca.envioReal ? "WhatsApp real" : "WhatsApp en prueba")
        if let decisor = marca.decisor { parts.append(decisor) }
        if marca.correos > 0 { parts.append("\(marca.correos) correos") }
        return parts.joined(separator: " · ")
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchSettings(accessToken: $0)
        }
    }
}

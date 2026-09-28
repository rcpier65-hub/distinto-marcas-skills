import SwiftUI

struct HabitosListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: HabitosResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

    var body: some View {
        ModuleScreen(
            title: "Hábitos",
            subtitle: subtitle,
            webPath: "/habitos",
            webLabel: "Crear en la web",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando hábitos…",
            maxWidth: 980,
            onRefresh: reload
        ) {
            if let response {
                if response.habitos.isEmpty {
                    ModuleEmptyState(title: "Sin hábitos", message: "Todavía no tienes hábitos activos. Puedes crearlos en la web.")
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
                        ForEach(response.habitos) { habito in
                            habitoCard(habito)
                        }
                    }
                }
            }
        }
        .sheet(item: $detail, onDismiss: { Task { await load(force: true) } }) { item in
            NativeDetailView(detail: item)
        }
        .task { await load() }
    }

    private func habitoCard(_ habito: HabitoFila) -> some View {
        let color = Color(hexString: habito.color) ?? DistintoTokens.ColorToken.accent
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(habito.icono)
                    .font(.system(size: 22))
                    .frame(width: 40, height: 40)
                    .background(color.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                Spacer()
                Button {
                    Task { await toggle(habito) }
                } label: {
                    Image(systemName: habito.completadoHoy ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 22))
                        .foregroundStyle(habito.completadoHoy ? DistintoTokens.ColorToken.success : DistintoTokens.ColorToken.textQuaternary)
                }
                .buttonStyle(.plain)
                .disabled(!habito.aplicaHoy)
            }
            Button {
                detail = habitoDetail(habito)
            } label: {
                Text(habito.nombre)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            Text(habito.aplicaHoy ? "\(habito.hechosSemana)/7 esta semana" : "No aplica hoy · \(habito.hechosSemana)/7")
                .font(.system(size: 12))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            ProgressView(value: Double(habito.hechosSemana), total: 7)
                .tint(color)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .distintoCard(radius: 16)
        .opacity(habito.aplicaHoy ? 1 : 0.55)
    }

    private func toggle(_ habito: HabitoFila) async {
        guard habito.aplicaHoy, let token = appState.accessToken else { return }
        do {
            let result = try await appState.api.toggleHabito(accessToken: token, id: habito.id)
            if var current = response, let index = current.habitos.firstIndex(where: { $0.id == habito.id }) {
                let item = current.habitos[index]
                let delta = result.completado == item.completadoHoy ? 0 : (result.completado ? 1 : -1)
                current = HabitosResponse(
                    ok: current.ok,
                    today: current.today,
                    total: current.total,
                    completados: max(0, current.completados + delta),
                    habitos: current.habitos.enumerated().map { offset, row in
                        guard offset == index else { return row }
                        return HabitoFila(
                            id: row.id,
                            nombre: row.nombre,
                            icono: row.icono,
                            color: row.color,
                            aplicaHoy: row.aplicaHoy,
                            completadoHoy: result.completado,
                            hechosSemana: max(0, row.hechosSemana + delta),
                            link: row.link
                        )
                    }
                )
                response = current
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func habitoDetail(_ habito: HabitoFila) -> NativeDetail {
        NativeDetail(
            id: habito.id,
            title: habito.nombre,
            eyebrow: "Hábito",
            fields: DetailRows.make([
                ("Hoy", habito.completadoHoy ? "Hecho" : (habito.aplicaHoy ? "Pendiente" : "No aplica hoy")),
                ("Esta semana", "\(habito.hechosSemana)/7")
            ]),
            webPath: "/habitos",
            primaryTitle: habito.aplicaHoy ? (habito.completadoHoy ? "Desmarcar hoy" : "Marcar hecho hoy") : nil,
            onPrimary: habito.aplicaHoy ? {
                guard let token = self.appState.accessToken else { throw APIError.notSignedIn }
                _ = try await self.appState.api.toggleHabito(accessToken: token, id: habito.id)
            } : nil
        )
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
    @State private var response: ActividadResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

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
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(response.actividad.enumerated()), id: \.offset) { _, fila in
                            HStack(alignment: .top, spacing: 12) {
                                VStack(spacing: 0) {
                                    Circle().fill(DistintoTokens.ColorToken.accent).frame(width: 8, height: 8).padding(.top, 6)
                                    Rectangle().fill(DistintoTokens.ColorToken.borderSubtle).frame(width: 1)
                                }
                                .frame(width: 12)
                                Button {
                                    detail = NativeDetail(
                                        id: fila.id,
                                        title: fila.detalle?.isEmpty == false ? (fila.detalle ?? fila.accion) : fila.accion,
                                        eyebrow: "Reporte del día",
                                        fields: DetailRows.make([
                                            ("Acción", fila.accion),
                                            ("Persona", fila.actorNombre),
                                            ("Rol", fila.rol),
                                            ("Marca", fila.marcaSlug),
                                            ("Detalle", fila.detalle),
                                            ("Hora", hora(fila.createdAt))
                                        ]),
                                        webPath: "/actividad"
                                    )
                                } label: {
                                    VStack(alignment: .leading, spacing: 3) {
                                        HStack {
                                            Text(fila.actorNombre)
                                                .font(.system(size: 13, weight: .semibold))
                                            Spacer()
                                            Text(hora(fila.createdAt))
                                                .font(.system(size: 11, design: .monospaced))
                                                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                        }
                                        Text(fila.detalle?.isEmpty == false ? (fila.detalle ?? fila.accion) : fila.accion)
                                            .font(.system(size: 13))
                                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                                            .multilineTextAlignment(.leading)
                                        Text(fila.accion)
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundStyle(DistintoTokens.ColorToken.accent)
                                    }
                                    .padding(10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .distintoCard(radius: 12)
                                }
                                .buttonStyle(.plain)
                                .padding(.bottom, 8)
                            }
                        }
                    }
                }
            }
        }
        .nativeDetail($detail)
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
    @State private var response: HistorialResponse?
    @State private var detail: NativeDetail?
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
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(response.grillas) { grilla in
                            let chip = StaffChip.estado(grilla.estado)
                            HStack(alignment: .top, spacing: 12) {
                                VStack(spacing: 0) {
                                    Circle().fill(chip.1).frame(width: 10, height: 10)
                                    Rectangle().fill(DistintoTokens.ColorToken.borderSubtle).frame(width: 1)
                                }
                                .frame(width: 12)
                                Button {
                                    detail = NativeDetail(
                                        id: grilla.id,
                                        title: grilla.marca?.nombre ?? "Marca",
                                        eyebrow: "Historial",
                                        fields: DetailRows.make([
                                            ("Estado", chip.0),
                                            ("Semana", semana(grilla)),
                                            ("Pedida", grilla.pedidaAt),
                                            ("Enviada", grilla.enviadaAt)
                                        ]),
                                        webPath: "/historial"
                                    )
                                } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text("\(grilla.marca?.emoji ?? "") \(grilla.marca?.nombre ?? "Marca")")
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundStyle(DistintoTokens.ColorToken.ink)
                                            Spacer()
                                            StatusChip(label: chip.0, color: chip.1)
                                        }
                                        Text(semana(grilla))
                                            .font(.system(size: 12))
                                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                    }
                                    .padding(12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .distintoCard(radius: 12)
                                }
                                .buttonStyle(.plain)
                                .padding(.bottom, 10)
                            }
                        }
                    }
                }
            }
        }
        .nativeDetail($detail)
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
    @State private var response: EquipoResponse?
    @State private var detail: NativeDetail?
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
            maxWidth: 1000,
            onRefresh: reload
        ) {
            if let response {
                if response.miembros.isEmpty {
                    ModuleEmptyState(title: "Sin miembros", message: "Todavía no hay personas en el equipo.")
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 240), spacing: 12)], spacing: 12) {
                        ForEach(response.miembros) { miembro in
                            Button {
                                detail = NativeDetail(
                                    id: miembro.id,
                                    title: miembro.nombre,
                                    eyebrow: "Mi equipo",
                                    fields: DetailRows.make([
                                        ("Email", miembro.email),
                                        ("Rol", miembro.rol),
                                        ("Rol base", miembro.rolBase),
                                        ("Cargo", miembro.cargo),
                                        ("Estado", miembro.activo ? "Activo" : "Inactivo"),
                                        ("Marcas", miembro.marcas.map { "\($0)" } ?? "Todas"),
                                        ("En edición", "\(miembro.enEdicion)")
                                    ]),
                                    webPath: "/equipo"
                                )
                            } label: {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack(spacing: 10) {
                                        UserAvatar(initial: String(miembro.nombre.prefix(1)), size: 36)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(miembro.nombre)
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundStyle(DistintoTokens.ColorToken.ink)
                                            Text(miembro.rol ?? (miembro.activo ? "Activo" : "Inactivo"))
                                                .font(.system(size: 11))
                                                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                        }
                                        Spacer(minLength: 0)
                                    }
                                    Text(detalle(miembro))
                                        .font(.system(size: 12))
                                        .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                                        .lineLimit(3)
                                        .multilineTextAlignment(.leading)
                                }
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .distintoCard(radius: 16)
                                .opacity(miembro.activo ? 1 : 0.55)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .nativeDetail($detail)
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
    @State private var response: SettingsResponse?
    @State private var detail: NativeDetail?
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

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 240), spacing: 12)], spacing: 12) {
                    ForEach(response.marcas) { marca in
                        Button {
                            detail = NativeDetail(
                                id: marca.slug,
                                title: marca.nombre,
                                eyebrow: "Settings",
                                fields: DetailRows.make([
                                    ("Estado", marca.activa ? "Activa" : "Inactiva"),
                                    ("Logo", marca.tieneLogo ? "Sí" : "No"),
                                    ("WhatsApp", marca.whatsappGrupo),
                                    ("Envío real", marca.envioReal ? "Sí" : "No"),
                                    ("Decisor", marca.decisor),
                                    ("Correos", "\(marca.correos)")
                                ]),
                                webPath: "/settings"
                            )
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(marca.emoji ?? "🏷️")
                                    Text(marca.nombre)
                                        .font(.system(size: 14, weight: .semibold))
                                        .lineLimit(1)
                                    Spacer()
                                    StatusChip(
                                        label: marca.activa ? "Activa" : "Inactiva",
                                        color: marca.activa ? Color(hex: 0x16A34A) : DistintoTokens.ColorToken.textTertiary
                                    )
                                }
                                Text(detalle(marca))
                                    .font(.system(size: 12))
                                    .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                                    .lineLimit(3)
                                    .multilineTextAlignment(.leading)
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .distintoCard(radius: 14)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .nativeDetail($detail)
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

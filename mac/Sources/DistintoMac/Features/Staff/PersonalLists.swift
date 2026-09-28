import SwiftUI

struct HabitosListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: HabitosResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Hábitos",
            subtitle: subtitle,
            webPath: "/habitos",
            webLabel: "Nuevo hábito",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando hábitos…",
            maxWidth: 980,
            showWebTool: true,
            onRefresh: reload
        ) {
            if let response {
                if response.habitos.isEmpty {
                    ModuleEmptyState(title: "Sin hábitos", message: "Todavía no tienes hábitos activos.")
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
                        ForEach(response.habitos) { habito in
                            habitoCard(habito)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private func habitoCard(_ habito: HabitoFila) -> some View {
        let color = Color(hexString: habito.color) ?? Color(hex: 0xBA41F7)
        let hoy = response?.today ?? LimaFormat.todayYMD()
        let dias = (0..<7).map { LimaFormat.shift(hoy, days: $0 - 6) }
        let hechos = Set(habito.dias ?? [])
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Text(habito.icono)
                    .font(.system(size: 22))
                    .frame(width: 40, height: 40)
                    .background(color.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(habito.nombre)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.ink)
                        .lineLimit(2)
                    Text(habito.aplicaHoy ? "\(habito.hechosSemana)/7 esta semana" : "Hoy no aplica")
                        .font(.system(size: 12))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                Spacer(minLength: 8)
                HabitoDonut(hechos: habito.hechosSemana, tint: color)
            }
            HStack(spacing: 6) {
                ForEach(dias, id: \.self) { dia in
                    let hecho = hechos.contains(dia)
                    VStack(spacing: 4) {
                        Text(String(LimaFormat.weekdayShort(dia).prefix(1)))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        Circle()
                            .fill(hecho ? color : Color(hex: 0xE5E7EB))
                            .frame(width: 16, height: 16)
                            .overlay {
                                if dia == hoy {
                                    Circle().stroke(color, lineWidth: 1.5).padding(-2)
                                }
                            }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            Button {
                Task { await toggle(habito) }
            } label: {
                Text(habito.completadoHoy ? "Hecho" : "¡Hecho!")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(habito.completadoHoy ? color : .white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 32)
                    .background(habito.completadoHoy ? color.opacity(0.12) : color)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!habito.aplicaHoy)
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
                            dias: diasActualizados(row.dias, hoy: result.today, hecho: result.completado),
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

    private func diasActualizados(_ dias: [String]?, hoy: String, hecho: Bool) -> [String] {
        var set = Set(dias ?? [])
        if hecho { set.insert(hoy) } else { set.remove(hoy) }
        return set.sorted()
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

private struct HabitoDonut: View {
    let hechos: Int
    let tint: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(hex: 0xEDE9FE), lineWidth: 5)
            Circle()
                .trim(from: 0, to: CGFloat(min(hechos, 7)) / 7)
                .stroke(tint, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(hechos)")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(tint)
        }
        .frame(width: 36, height: 36)
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
            webLabel: "Alta de miembro",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando equipo…",
            maxWidth: 1000,
            showWebTool: true,
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
            webLabel: "Conectar",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando ajustes…",
            showWebTool: true,
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

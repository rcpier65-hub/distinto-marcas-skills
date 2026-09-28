import SwiftUI

struct EditorListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: EditorResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

    var body: some View {
        ModuleScreen(
            title: "Editor",
            subtitle: subtitle,
            webPath: "/editor",
            webLabel: "Abrir editor",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando cola de edición…",
            maxWidth: 1200,
            onRefresh: reload
        ) {
            if let response {
                conteos(response.conteos)
                if response.piezas.isEmpty {
                    ModuleEmptyState(title: "Cola vacía", message: "No hay piezas en edición, aprobación o programación.")
                } else {
                    editorBoard(response.piezas)
                }
            }
        }
        .nativeDetail($detail)
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Piezas en la cola de edición" }
        return "\(response.total) en cola"
    }

    private func editorBoard(_ piezas: [EditorPieza]) -> some View {
        let order = ["editar", "aprobar", "programar", "publicar", "borrador"]
        let grouped = Dictionary(grouping: piezas, by: \.estado)
        let keys = order.filter { grouped[$0] != nil } + grouped.keys.filter { !order.contains($0) }.sorted()
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 10) {
                ForEach(keys, id: \.self) { key in
                    let chip = StaffChip.estado(key)
                    let items = grouped[key] ?? []
                    KanbanLane(title: chip.0, tint: chip.1, count: items.count) {
                        ForEach(items) { pieza in
                            Button {
                                detail = NativeDetail(
                                    id: pieza.id,
                                    title: pieza.nombre,
                                    eyebrow: "Editor",
                                    fields: DetailRows.make([
                                        ("Estado", chip.0),
                                        ("Marca", pieza.marca?.nombre),
                                        ("Editor", pieza.editorNombre),
                                        ("Fecha", pieza.fecha.map { LimaFormat.shortDate($0) }),
                                        ("Plataformas", pieza.plataformas.joined(separator: ", "))
                                    ]),
                                    webPath: "/editor"
                                )
                            } label: {
                                PiezaMiniCard(
                                    title: pieza.nombre,
                                    subtitle: detalle(pieza),
                                    emoji: pieza.marca?.emoji,
                                    tint: chip.1
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private func detalle(_ pieza: EditorPieza) -> String {
        [pieza.marca?.nombre, pieza.editorNombre, pieza.plataformas.joined(separator: " · ")]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }

    private func conteos(_ conteos: EditorConteos) -> some View {
        HStack(spacing: 8) {
            conteo("Editar", conteos.editar, Color(hex: 0x7C3AED))
            conteo("Aprobar", conteos.aprobar, Color(hex: 0xD97706))
            conteo("Programar", conteos.programar, Color(hex: 0x2563EB))
        }
    }

    private func conteo(_ label: String, _ value: Int, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(value)")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: DistintoTokens.Typography.xs))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .distintoCard(radius: 12)
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchEditor(accessToken: $0)
        }
    }
}

struct DisenoListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: DisenoResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

    var body: some View {
        ModuleScreen(
            title: "Diseño",
            subtitle: subtitle,
            webPath: "/diseno",
            webLabel: "Abrir diseño",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando tablero de diseño…",
            maxWidth: 1200,
            onRefresh: reload
        ) {
            if let response {
                if response.migracionPendiente {
                    Text("Falta la marca de tareas de diseño en la base.")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(Color(hex: 0xB45309))
                }
                if response.piezas.isEmpty {
                    ModuleEmptyState(title: "Sin tareas", message: "No hay piezas marcadas para diseño.")
                } else {
                    disenoBoard(response.piezas)
                }
            }
        }
        .nativeDetail($detail)
        .task { await load() }
    }

    private func disenoBoard(_ piezas: [DisenoPieza]) -> some View {
        let order = ["sin_empezar", "en_progreso", "pausada", "listo", "enviado", "archivado"]
        let grouped = Dictionary(grouping: piezas, by: \.estado)
        let keys = order.filter { grouped[$0] != nil } + grouped.keys.filter { !order.contains($0) }.sorted()
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 10) {
                ForEach(keys, id: \.self) { key in
                    let chip = StaffChip.estado(key)
                    let items = grouped[key] ?? []
                    KanbanLane(title: chip.0, tint: chip.1, count: items.count) {
                        ForEach(items) { pieza in
                            Button {
                                detail = NativeDetail(
                                    id: pieza.id,
                                    title: pieza.nombre,
                                    eyebrow: "Diseño",
                                    fields: DetailRows.make([
                                        ("Estado", chip.0),
                                        ("Marca", pieza.marca?.nombre),
                                        ("Fecha", pieza.fecha.map { LimaFormat.shortDate($0) })
                                    ]),
                                    webPath: NativeDetail.path(from: pieza.link, fallback: "/diseno/\(pieza.id)")
                                )
                            } label: {
                                PiezaMiniCard(
                                    title: pieza.nombre,
                                    subtitle: [pieza.marca?.emoji, pieza.marca?.nombre, pieza.fecha.map { LimaFormat.shortDate($0) }]
                                        .compactMap { $0 }
                                        .joined(separator: " · "),
                                    emoji: pieza.marca?.emoji,
                                    tint: chip.1
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var subtitle: String {
        guard let response else { return "Tareas marcadas para diseño" }
        return "\(response.total) tareas"
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchDiseno(accessToken: $0)
        }
    }
}

struct HistoriasListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: HistoriasResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

    var body: some View {
        ModuleScreen(
            title: "Historias",
            subtitle: subtitle,
            webPath: "/historias",
            webLabel: "Abrir planificador",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando historias…",
            maxWidth: 1200,
            onRefresh: reload
        ) {
            if let response {
                if response.historias.isEmpty {
                    ModuleEmptyState(
                        title: "Sin historias",
                        message: response.migracionPendiente
                            ? "La tabla de historias todavía no está en la base."
                            : "No hay historias planificadas."
                    )
                } else {
                    historiasBoard(response.historias)
                }
            }
        }
        .nativeDetail($detail)
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Planificador de historias" }
        return "\(response.total) historias · \(LimaFormat.longDate(response.hoy))"
    }

    private func historiasBoard(_ items: [HistoriaFila]) -> some View {
        let fechas = Array(Set(items.map { $0.fecha ?? "sin-fecha" })).sorted()
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 10) {
                ForEach(fechas, id: \.self) { fecha in
                    let dayItems = items.filter { ($0.fecha ?? "sin-fecha") == fecha }
                    KanbanLane(
                        title: fecha == "sin-fecha" ? "Sin fecha" : LimaFormat.weekdayShort(fecha) + " " + LimaFormat.dayOfMonth(fecha),
                        tint: DistintoTokens.ColorToken.accent,
                        count: dayItems.count
                    ) {
                        ForEach(dayItems) { historia in
                            let chip = StaffChip.estado(historia.estado)
                            Button {
                                detail = NativeDetail(
                                    id: historia.id,
                                    title: historia.titulo,
                                    eyebrow: "Historias",
                                    fields: DetailRows.make([
                                        ("Estado", chip.0),
                                        ("Marca", historia.marca?.nombre),
                                        ("Fecha", historia.fecha.map { LimaFormat.shortDate($0) }),
                                        ("Hora", historia.hora),
                                        ("Plataformas", historia.plataformas.joined(separator: ", ")),
                                        ("Nota", historia.nota)
                                    ]),
                                    webPath: "/historias"
                                )
                            } label: {
                                PiezaMiniCard(
                                    title: historia.titulo,
                                    subtitle: detalle(historia),
                                    emoji: historia.marca?.emoji,
                                    tint: chip.1
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private func detalle(_ historia: HistoriaFila) -> String {
        var parts = [historia.marca?.nombre, historia.hora].compactMap { $0 }
        if !historia.plataformas.isEmpty { parts.append(historia.plataformas.joined(separator: " · ")) }
        return parts.joined(separator: " · ")
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchHistorias(accessToken: $0)
        }
    }
}

struct InfluencersListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: InfluencersResponse?
    @State private var marca: String?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

    var body: some View {
        ModuleScreen(
            title: "Influencers",
            subtitle: subtitle,
            webPath: webPath,
            webLabel: "Abrir kanban",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando influencers…",
            maxWidth: 1200,
            onRefresh: reload
        ) {
            if let response {
                if response.marcas.count > 1 {
                    marcaPicker(response.marcas)
                }
                if response.pedidos.isEmpty {
                    ModuleEmptyState(
                        title: "Sin pedidos",
                        message: response.marca == nil
                            ? "Ninguna de tus marcas tiene Influencers activo."
                            : "Esta marca todavía no tiene pedidos."
                    )
                } else {
                    influencersBoard(response.pedidos)
                }
            }
        }
        .nativeDetail($detail)
        .task { await load() }
    }

    private var webPath: String {
        if let slug = response?.marca?.slug { return "/influencers?marca=\(slug)" }
        return "/influencers"
    }

    private var subtitle: String {
        guard let response else { return "Pedidos por marca" }
        let nombre = response.marca?.nombre ?? "Sin marca activa"
        return "\(nombre) · \(response.total) pedidos"
    }

    private func influencersBoard(_ pedidos: [InfluencerPedido]) -> some View {
        let grouped = Dictionary(grouping: pedidos, by: \.estado)
        let keys = grouped.keys.sorted()
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 10) {
                ForEach(keys, id: \.self) { key in
                    let chip = StaffChip.estado(key)
                    let items = grouped[key] ?? []
                    KanbanLane(title: chip.0, tint: chip.1, count: items.count) {
                        ForEach(items) { pedido in
                            Button {
                                detail = NativeDetail(
                                    id: pedido.id,
                                    title: pedido.nombre.flatMap { $0.isEmpty ? nil : $0 } ?? "@\(pedido.usuarioIg)",
                                    eyebrow: "Influencers",
                                    fields: DetailRows.make([
                                        ("Usuario", "@\(pedido.usuarioIg)"),
                                        ("Estado", chip.0),
                                        ("Teléfono", pedido.telefono),
                                        ("Productos", pedido.productos.joined(separator: ", ")),
                                        ("Video", pedido.videoUrl),
                                        ("Notas", pedido.notas)
                                    ]),
                                    webPath: webPath
                                )
                            } label: {
                                PiezaMiniCard(
                                    title: pedido.nombre.flatMap { $0.isEmpty ? nil : $0 } ?? "@\(pedido.usuarioIg)",
                                    subtitle: detalle(pedido),
                                    emoji: nil,
                                    tint: chip.1
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private func detalle(_ pedido: InfluencerPedido) -> String {
        var parts = ["@\(pedido.usuarioIg)"]
        if let telefono = pedido.telefono, !telefono.isEmpty { parts.append(telefono) }
        if !pedido.productos.isEmpty { parts.append(pedido.productos.joined(separator: ", ")) }
        return parts.joined(separator: " · ")
    }

    private func marcaPicker(_ marcas: [InfluencerMarca]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(marcas) { item in
                    let active = item.slug == response?.marca?.slug
                    Button {
                        marca = item.slug
                        Task { await load(force: true) }
                    } label: {
                        Text("\(item.emoji ?? "") \(item.nombre)")
                            .font(.system(size: DistintoTokens.Typography.xs, weight: active ? .semibold : .regular))
                            .foregroundStyle(active ? Color.white : DistintoTokens.ColorToken.textSecondary)
                            .padding(.horizontal, 10)
                            .frame(height: 28)
                            .background(active ? DistintoTokens.ColorToken.textPrimary : Color.white)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: active ? 0 : 1))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) { token in
            response = try await appState.api.fetchInfluencers(accessToken: token, marca: marca)
            if marca == nil { marca = response?.marca?.slug }
        }
    }
}

struct PlanesListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: PlanesResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

    var body: some View {
        ModuleScreen(
            title: "Planes",
            subtitle: "Catálogo comercial",
            webPath: "/planes",
            webLabel: "Abrir en la web",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando planes…",
            maxWidth: 1100,
            onRefresh: reload
        ) {
            if let response {
                if !response.reglas.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Reglas")
                            .font(.system(size: DistintoTokens.Typography.xs, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            .textCase(.uppercase)
                        ForEach(response.reglas, id: \.self) { regla in
                            Text("· \(regla)")
                                .font(.system(size: DistintoTokens.Typography.xs))
                                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                        }
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .distintoCard(radius: 12)
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 240), spacing: 12)], spacing: 12) {
                    ForEach(response.planes) { plan in
                        Button {
                            detail = NativeDetail(
                                id: plan.id,
                                title: plan.nombre,
                                eyebrow: categoria(plan.categoria),
                                fields: DetailRows.make([
                                    ("Precio", plan.precioLabel),
                                    ("Periodo", plan.periodo),
                                    ("Mínimo", plan.minimo),
                                    ("Aplica", plan.aplica),
                                    ("Incluye", plan.incluye.joined(separator: "\n")),
                                    ("No incluye", plan.noIncluye.joined(separator: "\n"))
                                ]),
                                webPath: "/planes"
                            )
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(categoria(plan.categoria).uppercased())
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(DistintoTokens.ColorToken.accent)
                                Text(plan.nombre)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                                    .multilineTextAlignment(.leading)
                                Text(plan.precioLabel)
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                                Text(plan.periodo)
                                    .font(.system(size: 12))
                                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                if !plan.incluye.isEmpty {
                                    Text(plan.incluye.prefix(3).joined(separator: " · "))
                                        .font(.system(size: 12))
                                        .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                                        .lineLimit(3)
                                        .multilineTextAlignment(.leading)
                                }
                            }
                            .padding(14)
                            .frame(maxWidth: .infinity, minHeight: 180, alignment: .topLeading)
                            .background(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(plan.destacado ? DistintoTokens.ColorToken.accent : DistintoTokens.ColorToken.cardBorder, lineWidth: plan.destacado ? 2 : 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .nativeDetail($detail)
        .task { await load() }
    }

    private func categoria(_ value: String) -> String {
        switch value {
        case "social": return "Social"
        case "web": return "Web"
        case "adicional": return "Adicional"
        default: return value
        }
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchPlanes(accessToken: $0)
        }
    }
}

private struct PiezaMiniCard: View {
    let title: String
    let subtitle: String
    let emoji: String?
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 6) {
                if let emoji {
                    Text(emoji)
                }
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .multilineTextAlignment(.leading)
                    .lineLimit(3)
            }
            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .overlay(alignment: .leading) {
            Rectangle().fill(tint).frame(width: 3)
        }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(DistintoTokens.ColorToken.cardBorder, lineWidth: 1)
        )
    }
}

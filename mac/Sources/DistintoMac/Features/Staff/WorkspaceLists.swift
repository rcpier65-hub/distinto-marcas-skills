import SwiftUI

struct EditorListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: EditorResponse?
    @State private var loading = false
    @State private var error: String?

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
            onRefresh: reload
        ) {
            if let response {
                conteos(response.conteos)
                if response.piezas.isEmpty {
                    ModuleEmptyState(title: "Cola vacía", message: "No hay piezas en edición, aprobación o programación.")
                } else {
                    ForEach(response.piezas) { pieza in
                        let chip = StaffChip.estado(pieza.estado)
                        ModuleRowButton(
                            title: pieza.nombre,
                            detail: detalle(pieza),
                            trailing: pieza.fecha.map { LimaFormat.shortDate($0) },
                            emoji: pieza.marca?.emoji,
                            chip: chip.0,
                            chipColor: chip.1
                        ) {
                            WebLink.open(pieza.link, fallback: "/editor", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Piezas en la cola de edición" }
        return "\(response.total) en cola · el detalle abre la web"
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
    @Environment(\.openURL) private var openURL
    @State private var response: DisenoResponse?
    @State private var loading = false
    @State private var error: String?

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
                    ForEach(response.piezas) { pieza in
                        let chip = StaffChip.estado(pieza.estado)
                        ModuleRowButton(
                            title: pieza.nombre,
                            detail: pieza.marca?.nombre,
                            trailing: pieza.fecha.map { LimaFormat.shortDate($0) },
                            emoji: pieza.marca?.emoji,
                            chip: chip.0,
                            chipColor: chip.1
                        ) {
                            WebLink.open(pieza.link, fallback: "/diseno", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Tareas marcadas para diseño" }
        return "\(response.total) tareas · el detalle abre la web"
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
    @Environment(\.openURL) private var openURL
    @State private var response: HistoriasResponse?
    @State private var loading = false
    @State private var error: String?

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
                    ForEach(response.historias) { historia in
                        let chip = StaffChip.estado(historia.estado)
                        ModuleRowButton(
                            title: historia.titulo,
                            detail: detalle(historia),
                            trailing: historia.fecha.map { LimaFormat.shortDate($0) },
                            emoji: historia.marca?.emoji,
                            chip: chip.0,
                            chipColor: chip.1
                        ) {
                            WebLink.open(historia.link, fallback: "/historias", using: openURL)
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Planificador de historias" }
        return "\(response.total) historias · \(LimaFormat.longDate(response.hoy))"
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
    @Environment(\.openURL) private var openURL
    @State private var response: InfluencersResponse?
    @State private var marca: String?
    @State private var loading = false
    @State private var error: String?

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
                    ForEach(response.pedidos) { pedido in
                        let chip = StaffChip.estado(pedido.estado)
                        ModuleRowButton(
                            title: pedido.nombre.flatMap { $0.isEmpty ? nil : $0 } ?? "@\(pedido.usuarioIg)",
                            detail: detalle(pedido),
                            chip: chip.0,
                            chipColor: chip.1
                        ) {
                            WebLink.open(pedido.link, fallback: webPath, using: openURL)
                        }
                    }
                }
            }
        }
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
    @Environment(\.openURL) private var openURL
    @State private var response: PlanesResponse?
    @State private var loading = false
    @State private var error: String?

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
                ForEach(response.planes) { plan in
                    ModuleRowButton(
                        title: plan.nombre,
                        detail: [plan.aplica, plan.minimo].compactMap { $0 }.joined(separator: " · "),
                        trailing: plan.precioLabel,
                        chip: categoria(plan.categoria),
                        chipColor: DistintoTokens.ColorToken.accent
                    ) {
                        WebLink.open(plan.link, fallback: "/planes", using: openURL)
                    }
                }
            }
        }
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

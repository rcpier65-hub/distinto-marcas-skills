import SwiftUI

struct MarcasDashboardView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: DashboardResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Ver todas",
            subtitle: subtitle,
            webPath: "/dashboard",
            webLabel: "Abrir dashboard",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando marcas…",
            onRefresh: reload
        ) {
            if let response {
                if response.marcas.isEmpty {
                    ModuleEmptyState(title: "Sin marcas", message: "Todavía no hay marcas en la agencia.")
                } else {
                    ForEach(response.marcas) { marca in
                        ModuleRowButton(
                            title: marca.nombre,
                            detail: marca.activa ? "Activa" : "Inactiva",
                            trailing: marca.tareasAbiertas == 1 ? "1 tarea" : "\(marca.tareasAbiertas) tareas",
                            emoji: marca.emoji,
                            chip: marca.activa ? "Activa" : "Inactiva",
                            chipColor: marca.activa ? Color(hex: 0x16A34A) : DistintoTokens.ColorToken.textTertiary
                        ) {
                            appState.select(.marca(marca.slug))
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private var subtitle: String {
        guard let response else { return "Marcas de la agencia" }
        return "\(response.activas) activas · \(response.total) en total"
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchDashboard(accessToken: $0)
        }
    }
}

struct NuevaMarcaView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: DashboardResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: "Agregar marca",
            subtitle: "El alta sigue en el dashboard web",
            webPath: "/dashboard?nueva=1",
            webLabel: "Crear en la web",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando marcas…",
            onRefresh: reload
        ) {
            Text("Nombre, emoji y color se cargan en Distinto web. Acá ves las marcas que ya existen.")
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            if let response {
                ForEach(response.marcas) { marca in
                    ModuleRowButton(
                        title: marca.nombre,
                        detail: marca.slug,
                        emoji: marca.emoji,
                        chip: marca.activa ? "Activa" : "Inactiva",
                        chipColor: marca.activa ? Color(hex: 0x16A34A) : DistintoTokens.ColorToken.textTertiary
                    ) {
                        WebLink.open(response.linkNueva, fallback: "/dashboard?nueva=1", using: openURL)
                    }
                }
            }
        }
        .task { await load() }
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) {
            response = try await appState.api.fetchDashboard(accessToken: $0)
        }
    }
}

struct GrillaListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    let slug: String
    @State private var vista = "semana"
    @State private var response: GrillaResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ModuleScreen(
            title: response?.marca.nombre ?? slug,
            subtitle: subtitle,
            webPath: "/grilla/\(slug)",
            webLabel: "Editar grilla",
            loading: loading,
            error: error,
            loaded: response != nil,
            loadingMessage: "Cargando grilla…",
            onRefresh: reload
        ) {
            if let response {
                HStack(spacing: 4) {
                    vistaButton("Semana", id: "semana")
                    vistaButton("Mes", id: "mes")
                }
                Text("\(LimaFormat.listDate(response.desde)) – \(LimaFormat.listDate(response.hasta))")
                    .font(.system(size: DistintoTokens.Typography.xs))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                if response.piezas.isEmpty {
                    ModuleEmptyState(title: "Sin piezas", message: "No hay publicaciones en este rango.")
                } else {
                    ForEach(response.piezas) { pieza in
                        ModuleRowButton(
                            title: pieza.titulo,
                            detail: (pieza.plataformas + pieza.tipos).joined(separator: " · "),
                            trailing: LimaFormat.shortDate(pieza.fecha),
                            emoji: response.marca.emoji,
                            chip: pieza.estado,
                            chipColor: DistintoTokens.ColorToken.textSecondary
                        ) {
                            WebLink.open(pieza.link, fallback: "/grilla/\(slug)", using: openURL)
                        }
                    }
                }
            }
        }
        .task(id: slug) { await load(force: true) }
    }

    private var subtitle: String {
        guard let response else { return "Resumen de la grilla" }
        let noun = response.total == 1 ? "pieza" : "piezas"
        return "\(response.total) \(noun) · \(response.vista == "mes" ? "este mes" : "esta semana")"
    }

    private func vistaButton(_ title: String, id: String) -> some View {
        let active = vista == id
        return Button {
            vista = id
            Task { await load(force: true) }
        } label: {
            Text(title)
                .font(.system(size: DistintoTokens.Typography.xs, weight: active ? .semibold : .regular))
                .foregroundStyle(active ? DistintoTokens.ColorToken.textPrimary : DistintoTokens.ColorToken.textTertiary)
                .padding(.horizontal, 10)
                .frame(height: 26)
                .background(active ? Color.white : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func reload() { Task { await load(force: true) } }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(appState: appState, loading: $loading, error: $error, loaded: response != nil, force: force) { token in
            response = try await appState.api.fetchGrilla(accessToken: token, slug: slug, vista: vista)
        }
    }
}

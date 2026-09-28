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
            maxWidth: 1100,
            onRefresh: reload
        ) {
            if let response {
                if response.marcas.isEmpty {
                    ModuleEmptyState(title: "Sin marcas", message: "Todavía no hay marcas en la agencia.")
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 200), spacing: 12)], spacing: 12) {
                        ForEach(response.marcas) { marca in
                            Button {
                                appState.select(.marca(marca.slug))
                            } label: {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack {
                                        Text(marca.emoji ?? "🏷️")
                                            .font(.system(size: 20))
                                        Spacer()
                                        Circle()
                                            .fill(Color(hexString: marca.color) ?? DistintoTokens.ColorToken.accent)
                                            .frame(width: 10, height: 10)
                                    }
                                    Text(marca.nombre)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(DistintoTokens.ColorToken.ink)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                    Text(marca.tareasAbiertas == 1 ? "1 tarea abierta" : "\(marca.tareasAbiertas) tareas abiertas")
                                        .font(.system(size: 12))
                                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                }
                                .padding(14)
                                .frame(maxWidth: .infinity, minHeight: 132, alignment: .topLeading)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(Color(hexString: marca.color)?.opacity(0.45) ?? DistintoTokens.ColorToken.cardBorder, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .opacity(marca.activa ? 1 : 0.5)
                            }
                            .buttonStyle(.plain)
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
    @State private var response: DashboardResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var detail: NativeDetail?

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
                        detail = NativeDetail(
                            id: marca.slug,
                            title: marca.nombre,
                            eyebrow: "Marca",
                            fields: DetailRows.make([
                                ("Slug", marca.slug),
                                ("Estado", marca.activa ? "Activa" : "Inactiva"),
                                ("Tareas abiertas", "\(marca.tareasAbiertas)")
                            ]),
                            webPath: NativeDetail.path(from: marca.link, fallback: "/grilla/\(marca.slug)")
                        )
                    }
                }
            }
        }
        .nativeDetail($detail)
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
    let slug: String
    @State private var detail: NativeDetail?
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
            maxWidth: 1200,
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
                } else if response.vista == "mes" {
                    grillaMes(response)
                } else {
                    grillaSemana(response)
                }
            }
        }
        .nativeDetail($detail)
        .task(id: slug) { await load(force: true) }
    }

    private func grillaSemana(_ response: GrillaResponse) -> some View {
        let days = fechas(from: response.desde, to: response.hasta)
        let tint = Color(hexString: response.marca.color) ?? DistintoTokens.ColorToken.accent
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 8) {
                ForEach(days, id: \.self) { day in
                    let items = response.piezas.filter { $0.fecha == day }
                    KanbanLane(
                        title: LimaFormat.weekdayShort(day) + " " + LimaFormat.dayOfMonth(day),
                        tint: tint,
                        count: items.count
                    ) {
                        ForEach(items) { pieza in
                            grillaButton(pieza, marca: response.marca.nombre, tint: tint)
                        }
                    }
                }
            }
        }
    }

    private func grillaMes(_ response: GrillaResponse) -> some View {
        let tint = Color(hexString: response.marca.color) ?? DistintoTokens.ColorToken.accent
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(fechas(from: response.desde, to: response.hasta), id: \.self) { day in
                let items = response.piezas.filter { $0.fecha == day }
                if !items.isEmpty {
                    Text(LimaFormat.weekdayDate(day))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    ForEach(items) { pieza in
                        grillaButton(pieza, marca: response.marca.nombre, tint: tint)
                    }
                }
            }
        }
    }

    private func grillaButton(_ pieza: GrillaPieza, marca: String, tint: Color) -> some View {
        Button {
            detail = NativeDetail(
                id: pieza.id,
                title: pieza.titulo,
                eyebrow: marca,
                fields: DetailRows.make([
                    ("Fecha", LimaFormat.shortDate(pieza.fecha)),
                    ("Estado", pieza.estado),
                    ("Plataformas", pieza.plataformas.joined(separator: ", ")),
                    ("Tipos", pieza.tipos.joined(separator: ", "))
                ]),
                webPath: NativeDetail.path(from: pieza.link, fallback: "/grilla/\(slug)")
            )
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(pieza.titulo)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                Text((pieza.plataformas + pieza.tipos).joined(separator: " · "))
                    .font(.system(size: 10))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .lineLimit(1)
            }
            .padding(8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(tint.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func fechas(from start: String, to end: String) -> [String] {
        var days: [String] = []
        var cursor = start
        var guardrail = 0
        while !cursor.isEmpty, cursor <= end, guardrail < 40 {
            days.append(cursor)
            let next = LimaFormat.shift(cursor, days: 1)
            if next.isEmpty || next == cursor { break }
            cursor = next
            guardrail += 1
        }
        return days
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

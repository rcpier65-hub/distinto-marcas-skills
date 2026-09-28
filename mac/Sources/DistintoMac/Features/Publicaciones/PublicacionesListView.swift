import SwiftUI

/// Lista de publicaciones próximas y recientes. La fila abre el detalle nativo.
struct PublicacionesListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: PublicacionesResponse?
    @State private var detail: NativeDetail?
    @State private var loading = false
    @State private var error: String?
    @State private var filtro: Filtro = .proximas
    @State private var vista = "Listado"
    @State private var monthOffset = 0

    private enum Filtro: String, CaseIterable, Identifiable {
        case proximas
        case recientes
        case todas

        var id: String { rawValue }

        var title: String {
            switch self {
            case .proximas: return "Próximas"
            case .recientes: return "Recientes"
            case .todas: return "Todas"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if response != nil {
                    filtros
                }
                if let error, response != nil {
                    ModuleErrorBanner(message: error, onRetry: reload)
                }
                bodyContent
            }
            .frame(maxWidth: 1120, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
        }
        .background(DistintoTokens.ColorToken.bgBase)
        .nativeDetail($detail)
        .task { await load() }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Publicaciones")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text(subtitle)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            ViewModeBar(titles: ["Listado", "Calendario"], selection: vista) { vista = $0 }
            WebHandoffButton(title: "Abrir en la web", path: "/publicaciones")
            ModuleRefreshButton(loading: loading, action: reload)
        }
    }

    private var subtitle: String {
        guard let response else { return "Próximas y recientes" }
        let noun = response.total == 1 ? "publicación" : "publicaciones"
        return "\(response.total) \(noun) · \(LimaFormat.shortDate(response.desde)) – \(LimaFormat.shortDate(response.hasta))"
    }

    private var filtros: some View {
        if vista == "Calendario" {
            return AnyView(monthNav)
        }
        return AnyView(listFilters)
    }

    private var monthNav: some View {
        HStack(spacing: 8) {
            navButton("chevron.left") { monthOffset -= 1 }
            Text(LimaFormat.monthGrid(offset: monthOffset).label)
                .font(.system(size: 13, weight: .semibold))
                .frame(minWidth: 140)
            navButton("chevron.right") { monthOffset += 1 }
            if monthOffset != 0 {
                Button("Hoy") { monthOffset = 0 }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.accent)
            }
            Spacer()
        }
    }

    private func navButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .semibold))
                .frame(width: 26, height: 26)
                .background(Color.white)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var listFilters: some View {
        HStack(spacing: 4) {
            ForEach(Filtro.allCases) { item in
                let active = filtro == item
                Button {
                    filtro = item
                } label: {
                    Text(item.title)
                        .font(.system(size: DistintoTokens.Typography.xs, weight: active ? .medium : .regular))
                        .foregroundStyle(active ? DistintoTokens.ColorToken.textPrimary : DistintoTokens.ColorToken.textTertiary)
                        .padding(.horizontal, 10)
                        .frame(height: 26)
                        .background(active ? Color.white : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(DistintoTokens.ColorToken.bgElevated)
        .overlay(
            RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous)
                .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous))
    }

    @ViewBuilder
    private var bodyContent: some View {
        if response == nil {
            if let error, !loading {
                ModuleErrorBanner(message: error, onRetry: reload)
            } else {
                ModuleLoadingBlock(message: "Cargando publicaciones…")
            }
        } else if vista == "Calendario" {
            calendario
        } else if days.isEmpty {
            ModuleEmptyState(
                title: "Sin publicaciones",
                message: "No hay piezas en este rango. Prueba otro filtro o abre el calendario."
            )
        } else {
            VStack(spacing: 0) {
                tableHeader
                ForEach(visible) { item in
                    PublicacionRow(item: item) { open(item) }
                    Divider().overlay(DistintoTokens.ColorToken.borderSubtle)
                }
            }
            .distintoCard(radius: 12)
        }
    }

    private var tableHeader: some View {
        HStack(spacing: 12) {
            Text("Fecha").frame(width: 108, alignment: .leading)
            Text("Marca").frame(width: 120, alignment: .leading)
            Text("Pieza").frame(maxWidth: .infinity, alignment: .leading)
            Text("Tipo").frame(width: 64, alignment: .leading)
            Text("Estado").frame(width: 96, alignment: .leading)
        }
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
        .textCase(.uppercase)
        .padding(.horizontal, 12)
        .frame(height: 32)
        .background(Color(hex: 0xF8F8FA))
    }

    private var calendario: some View {
        let grid = LimaFormat.monthGrid(offset: monthOffset)
        let outside = (response?.publicaciones ?? []).filter { item in
            !grid.weeks.flatMap { $0 }.contains { $0.ymd == item.fecha && $0.inMonth }
        }.count
        return VStack(alignment: .leading, spacing: 8) {
            DistintoMonthGrid(weeks: grid.weeks, hoy: response?.hoy ?? LimaFormat.todayYMD()) { day in
                VStack(alignment: .leading, spacing: 3) {
                    DayNumberLabel(day: day, hoy: response?.hoy ?? "")
                    ForEach(pubs(on: day.ymd).prefix(3)) { item in
                        Button {
                            open(item)
                        } label: {
                            Text(item.titulo)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(item.marca?.colorValue ?? DistintoTokens.ColorToken.ink)
                                .lineLimit(1)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background((item.marca?.colorValue ?? DistintoTokens.ColorToken.accent).opacity(0.14))
                                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                    if pubs(on: day.ymd).count > 3 {
                        Text("+\(pubs(on: day.ymd).count - 3)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    }
                }
                .padding(6)
            }
            if outside > 0 {
                Text("\(outside) fuera de este mes. Están en Listado.")
                    .font(.system(size: 12))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
        }
    }

    private func pubs(on ymd: String) -> [PublicacionItem] {
        (response?.publicaciones ?? []).filter { $0.fecha == ymd }
    }

    private func open(_ item: PublicacionItem) {
        detail = NativeDetail(
            id: item.id,
            title: item.titulo,
            eyebrow: item.marca?.nombre ?? "Publicación",
            fields: DetailRows.make([
                ("Fecha", LimaFormat.weekdayDate(item.fecha)),
                ("Hora", item.hora),
                ("Estado", item.estadoChip.label),
                ("Tipo", item.tipoLabel),
                ("Plataformas", item.plataformas.joined(separator: ", ")),
                ("Editor", item.editor)
            ]),
            webPath: NativeDetail.path(from: item.link, fallback: "/publicaciones/\(item.id)")
        )
    }

    private var days: [(fecha: String, items: [PublicacionItem])] {
        let items = visible
        var order: [String] = []
        var grouped: [String: [PublicacionItem]] = [:]
        for item in items {
            if grouped[item.fecha] == nil { order.append(item.fecha) }
            grouped[item.fecha, default: []].append(item)
        }
        return order.map { fecha in
            let rows = (grouped[fecha] ?? []).sorted { ($0.hora ?? "99:99") < ($1.hora ?? "99:99") }
            return (fecha, rows)
        }
    }

    private var visible: [PublicacionItem] {
        guard let response else { return [] }
        switch filtro {
        case .todas:
            return response.publicaciones
        case .proximas:
            return response.publicaciones.filter { $0.fecha >= response.hoy }
        case .recientes:
            return Array(response.publicaciones.filter { $0.fecha < response.hoy }.reversed())
        }
    }

    private func reload() {
        Task { await load(force: true) }
    }

    private func load(force: Bool = false) async {
        if loading { return }
        if response != nil && !force { return }
        guard let token = appState.accessToken else {
            error = APIError.notSignedIn.localizedDescription
            return
        }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let next = try await appState.api.fetchPublicaciones(accessToken: token)
            guard !Task.isCancelled, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct PublicacionRow: View {
    let item: PublicacionItem
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(LimaFormat.listDate(item.fecha))
                        .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                    Text(item.hora ?? "—")
                        .font(.system(size: DistintoTokens.Typography.xs, design: .monospaced))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                .frame(width: 108, alignment: .leading)

                HStack(spacing: 8) {
                    Circle()
                        .fill(item.marca?.colorValue ?? DistintoTokens.ColorToken.textQuaternary)
                        .frame(width: 8, height: 8)
                        .shadow(color: (item.marca?.colorValue ?? .clear).opacity(0.7), radius: 3)
                    Text(item.marca?.nombreCorto ?? "Marca")
                        .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        .lineLimit(1)
                }
                .frame(width: 120, alignment: .leading)

                Text(item.titulo)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(item.tipoLabel)
                    .font(.system(size: DistintoTokens.Typography.xs))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .frame(width: 64, alignment: .leading)

                StatusChip(label: item.estadoChip.label, color: item.estadoChip.color, uppercase: true)

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .help("Abrir en la web")
    }
}

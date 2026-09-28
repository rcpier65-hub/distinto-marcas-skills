import SwiftUI

/// Mes de grabaciones y reuniones. Google Calendar sigue en la web.
struct CalendarioListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: CalendarioResponse?
    @State private var detail: NativeDetail?
    @State private var loading = false
    @State private var error: String?
    @State private var monthOffset = 0
    @State private var filtro: Filtro = .todos

    private enum Filtro: String, CaseIterable, Identifiable {
        case todos
        case grabacion
        case reunion

        var id: String { rawValue }

        var title: String {
            switch self {
            case .todos: return "Todo"
            case .grabacion: return "Grabaciones"
            case .reunion: return "Reuniones"
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
                    ModuleErrorBanner(message: error, onRetry: { Task { await load() } })
                }
                bodyContent
            }
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
        }
        .background(DistintoTokens.ColorToken.bgBase)
        .nativeDetail($detail)
        .task(id: monthOffset) { await load() }
    }

    private var window: (desde: String, hasta: String, label: String) {
        LimaFormat.monthWindow(offset: monthOffset)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Calendario")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text("Grabaciones y reuniones · Lima")
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            monthNav
            WebHandoffButton(title: "Abrir en la web", path: "/grabaciones/calendario")
            ModuleRefreshButton(loading: loading) { Task { await load() } }
        }
    }

    private var monthNav: some View {
        HStack(spacing: 6) {
            navButton("chevron.left", help: "Mes anterior") { monthOffset -= 1 }
            Text(window.label)
                .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                .frame(minWidth: 148)
            navButton("chevron.right", help: "Mes siguiente") { monthOffset += 1 }
            if monthOffset != 0 {
                Button("Hoy") { monthOffset = 0 }
                    .buttonStyle(.plain)
                    .font(.system(size: DistintoTokens.Typography.xs, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.accent)
            }
        }
    }

    private func navButton(_ symbol: String, help: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                .frame(width: 26, height: 26)
                .background(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .help(help)
    }

    private var filtros: some View {
        HStack(spacing: 6) {
            ForEach(Filtro.allCases) { item in
                let active = filtro == item
                Button {
                    filtro = item
                } label: {
                    Text(item.title)
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(active ? Color(hex: 0x4F46E5) : DistintoTokens.ColorToken.textTertiary)
                        .padding(.horizontal, 12)
                        .frame(height: 30)
                        .background(active ? DistintoTokens.ColorToken.accent.opacity(0.10) : Color.white.opacity(0.4))
                        .overlay(
                            Capsule().stroke(
                                active ? DistintoTokens.ColorToken.accent.opacity(0.4) : DistintoTokens.ColorToken.borderSubtle,
                                lineWidth: 1
                            )
                        )
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private var bodyContent: some View {
        if response == nil {
            if let error, !loading {
                ModuleErrorBanner(message: error) { Task { await load() } }
            } else {
                ModuleLoadingBlock(message: "Cargando calendario…")
            }
        } else if days.isEmpty {
            ModuleEmptyState(
                title: "Mes vacío",
                message: "No hay grabaciones ni reuniones en \(window.label). Los eventos de Google Calendar siguen en la web."
            )
        } else {
            LazyVStack(alignment: .leading, spacing: 14) {
                ForEach(days, id: \.fecha) { day in
                    daySection(day.fecha, items: day.items)
                }
            }
        }
    }

    private func daySection(_ fecha: String, items: [EventoAgenda]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(LimaFormat.weekdayDate(fecha))
                    .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                if fecha == response?.hoy {
                    Text("Hoy")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(DistintoTokens.ColorToken.accent)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(DistintoTokens.ColorToken.accentBg)
                        .clipShape(Capsule())
                }
            }
            ForEach(items) { evento in
                EventoRow(evento: evento) {
                    detail = NativeDetail(
                        id: evento.id,
                        title: evento.titulo,
                        eyebrow: evento.tipoLabel,
                        fields: DetailRows.make([
                            ("Fecha", LimaFormat.weekdayDate(evento.fecha)),
                            ("Hora", evento.horaVisible),
                            ("Estado", evento.estado),
                            ("Marca", evento.marca?.nombre),
                            ("Notas", evento.notas),
                            ("Videos", evento.videosGrabados.map { "\($0)" })
                        ]),
                        webPath: NativeDetail.path(from: evento.link, fallback: "/grabaciones/calendario")
                    )
                }
            }
        }
    }

    private var days: [(fecha: String, items: [EventoAgenda])] {
        guard let response else { return [] }
        var items: [EventoAgenda]
        switch filtro {
        case .todos:
            items = response.eventos
        case .grabacion:
            items = response.eventos.filter(\.esGrabacion)
        case .reunion:
            items = response.eventos.filter(\.esReunion)
        }
        var order: [String] = []
        var grouped: [String: [EventoAgenda]] = [:]
        for item in items {
            if grouped[item.fecha] == nil { order.append(item.fecha) }
            grouped[item.fecha, default: []].append(item)
        }
        return order.map { ($0, grouped[$0] ?? []) }
    }

    private func load() async {
        let offset = monthOffset
        let bounds = LimaFormat.monthWindow(offset: offset)
        guard !bounds.desde.isEmpty else { return }
        guard let token = appState.accessToken else {
            error = APIError.notSignedIn.localizedDescription
            return
        }
        loading = true
        error = nil
        response = nil
        defer { loading = false }
        do {
            let next = try await appState.api.fetchCalendario(
                accessToken: token,
                desde: bounds.desde,
                hasta: bounds.hasta
            )
            guard !Task.isCancelled, offset == monthOffset, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard offset == monthOffset, appState.accessToken == token else { return }
            response = nil
            self.error = error.localizedDescription
        }
    }
}

private struct EventoRow: View {
    let evento: EventoAgenda
    let onOpen: () -> Void

    var body: some View {
        let chip = evento.estadoChip
        Button(action: onOpen) {
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(evento.marca?.colorValue ?? DistintoTokens.ColorToken.accent)
                    .frame(width: 4)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Image(systemName: evento.tipoSymbol)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(evento.esReunion ? Color(hex: 0x5B21B6) : DistintoTokens.ColorToken.textSecondary)
                        Text(evento.horaVisible)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                        Text(evento.tipoLabel)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        Spacer(minLength: 4)
                        Text(chip.label)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(chip.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(chip.background)
                            .clipShape(Capsule())
                    }
                    Text(evento.titulo)
                        .font(.system(size: DistintoTokens.Typography.base, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        .strikethrough(evento.cancelado)
                        .multilineTextAlignment(.leading)
                    HStack(spacing: 8) {
                        if let marca = evento.marca {
                            Circle().fill(marca.colorValue).frame(width: 8, height: 8)
                            Text([marca.emoji, marca.nombre].compactMap { $0 }.joined(separator: " "))
                                .font(.system(size: 12))
                                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                                .lineLimit(1)
                        }
                        if let videos = evento.videosGrabados {
                            Text("\(videos) videos")
                                .font(.system(size: 12))
                                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        }
                    }
                    if let notas = evento.notas, !notas.isEmpty {
                        Text(notas)
                            .font(.system(size: 12.5))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                }
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
                    .padding(.top, 4)
            }
            .padding(12)
            .background(evento.esReunion ? Color(hex: 0xEDE9FE).opacity(0.45) : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.black.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .help("Abrir el día en la web")
    }
}

import SwiftUI

/// Semana, mes y lista de grabaciones y reuniones. Agendar usa el mismo POST que la web.
struct CalendarioListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: CalendarioResponse?
    @State private var detail: NativeDetail?
    @State private var loading = false
    @State private var error: String?
    @State private var monthOffset = 0
    @State private var weekOffset = 0
    @State private var vista = "Semana"
    @State private var filtro: Filtro = .todos
    @State private var agendando = false

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
            .frame(maxWidth: vista == "Lista" ? 860 : 1180, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
        }
        .background(DistintoTokens.ColorToken.bgBase)
        .nativeDetail($detail)
        .sheet(isPresented: $agendando) {
            AgendarSheet(fechaInicial: response?.hoy ?? LimaFormat.todayYMD()) {
                Task { await load() }
            }
        }
        .task(id: loadKey) { await load() }
    }

    private var loadKey: String {
        vista == "Semana" ? "s\(weekOffset)" : "m\(monthOffset)"
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
            ViewModeBar(titles: ["Semana", "Mes", "Lista"], selection: vista) { vista = $0 }
            rangeNav
            if appState.perfil?.perfil.esDirector == true {
                Button {
                    agendando = true
                } label: {
                    Label("Agendar", systemImage: "plus")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .frame(height: 28)
                        .background(DistintoTokens.ColorToken.ink)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            ModuleRefreshButton(loading: loading) { Task { await load() } }
        }
    }

    private var rangeNav: some View {
        HStack(spacing: 6) {
            navButton("chevron.left") { step(-1) }
            Text(rangeLabel)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                .frame(minWidth: 128)
            navButton("chevron.right") { step(1) }
            if weekOffset != 0 || monthOffset != 0 {
                Button("Hoy") {
                    weekOffset = 0
                    monthOffset = 0
                }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.accent)
            }
        }
    }

    private var rangeLabel: String {
        if vista == "Semana" { return LimaFormat.weekRange(offset: weekOffset).label }
        return LimaFormat.monthWindow(offset: monthOffset).label
    }

    private func step(_ delta: Int) {
        if vista == "Semana" {
            weekOffset += delta
        } else {
            monthOffset += delta
        }
    }

    private func navButton(_ symbol: String, action: @escaping () -> Void) -> some View {
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
        } else if filtered.isEmpty && vista == "Lista" {
            ModuleEmptyState(
                title: "Mes vacío",
                message: "No hay grabaciones ni reuniones en este rango."
            )
        } else if vista == "Semana" {
            semana
        } else if vista == "Mes" {
            mes
        } else {
            LazyVStack(alignment: .leading, spacing: 14) {
                ForEach(days, id: \.fecha) { day in
                    daySection(day.fecha, items: day.items)
                }
            }
        }
    }

    private var semana: some View {
        DistintoWeekBoard(days: LimaFormat.weekRange(offset: weekOffset).days, hoy: response?.hoy ?? "") { day in
            VStack(alignment: .leading, spacing: 6) {
                ForEach(eventos(on: day)) { evento in
                    eventoChip(evento)
                }
            }
        }
    }

    private var mes: some View {
        DistintoMonthGrid(weeks: LimaFormat.monthGrid(offset: monthOffset).weeks, hoy: response?.hoy ?? "") { day in
            VStack(alignment: .leading, spacing: 3) {
                DayNumberLabel(day: day, hoy: response?.hoy ?? "")
                ForEach(eventos(on: day.ymd).prefix(3)) { evento in
                    eventoChip(evento)
                }
                if eventos(on: day.ymd).count > 3 {
                    Text("+\(eventos(on: day.ymd).count - 3)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .padding(.leading, 4)
                }
            }
            .padding(6)
        }
    }

    private func eventoChip(_ evento: EventoAgenda) -> some View {
        let color = evento.marca?.colorValue ?? (evento.esReunion ? Color(hex: 0x5B21B6) : Color(hex: 0x4F46E5))
        return Button {
            open(evento)
        } label: {
            VStack(alignment: .leading, spacing: 1) {
                Text(evento.horaVisible)
                    .font(.system(size: 9, weight: .bold))
                Text(evento.titulo)
                    .font(.system(size: 11, weight: .semibold))
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(color.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            .opacity(evento.cancelado ? 0.45 : 1)
        }
        .buttonStyle(.plain)
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
                EventoRow(evento: evento) { open(evento) }
            }
        }
    }

    private func open(_ evento: EventoAgenda) {
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

    private var filtered: [EventoAgenda] {
        guard let response else { return [] }
        switch filtro {
        case .todos: return response.eventos
        case .grabacion: return response.eventos.filter(\.esGrabacion)
        case .reunion: return response.eventos.filter(\.esReunion)
        }
    }

    private func eventos(on fecha: String) -> [EventoAgenda] {
        filtered.filter { $0.fecha == fecha }.sorted { $0.horaVisible < $1.horaVisible }
    }

    private var days: [(fecha: String, items: [EventoAgenda])] {
        var order: [String] = []
        var grouped: [String: [EventoAgenda]] = [:]
        for item in filtered {
            if grouped[item.fecha] == nil { order.append(item.fecha) }
            grouped[item.fecha, default: []].append(item)
        }
        return order.map { ($0, grouped[$0] ?? []) }
    }

    private func load() async {
        let key = loadKey
        let bounds: (desde: String, hasta: String)
        if vista == "Semana" {
            let week = LimaFormat.weekRange(offset: weekOffset)
            guard let desde = week.days.first, let hasta = week.days.last else { return }
            bounds = (desde, hasta)
        } else {
            let month = LimaFormat.monthWindow(offset: monthOffset)
            bounds = (month.desde, month.hasta)
        }
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
            guard !Task.isCancelled, key == loadKey, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard key == loadKey, appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct AgendarSheet: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    let fechaInicial: String
    let onCreated: () -> Void

    @State private var tipo = "reunion"
    @State private var marca = ""
    @State private var fecha = ""
    @State private var hora = "10:00"
    @State private var duracion = "60"
    @State private var titulo = ""
    @State private var sending = false
    @State private var error: String?
    @State private var meetLink: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Agendar")
                .font(.system(size: 18, weight: .semibold))
            Text("Misma acción que el asistente de la web. Solo directores.")
                .font(.system(size: 12))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            ViewModeBar(titles: ["Reunión", "Grabación"], selection: tipo == "reunion" ? "Reunión" : "Grabación") { title in
                tipo = title == "Grabación" ? "grabacion" : "reunion"
            }
            if marcas.isEmpty {
                field("Marca (slug)", text: $marca)
            } else {
                Picker("Marca", selection: $marca) {
                    Text("Elegir marca").tag("")
                    ForEach(marcas) { item in
                        Text("\(item.emoji ?? "") \(item.nombreCorto)").tag(item.slug)
                    }
                }
                .pickerStyle(.menu)
            }
            HStack {
                field("Fecha", text: $fecha)
                field("Hora", text: $hora)
                field("Minutos", text: $duracion)
            }
            field("Título", text: $titulo)
            if let error {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundStyle(DistintoTokens.ColorToken.danger)
            }
            if let meetLink, let url = URL(string: meetLink) {
                Link("Abrir Meet", destination: url)
                    .font(.system(size: 13, weight: .semibold))
            }
            HStack {
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                Spacer()
                Button(sending ? "Agendando…" : "Agendar") {
                    Task { await enviar() }
                }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .frame(height: 32)
                .background(DistintoTokens.ColorToken.ink)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .disabled(sending)
            }
        }
        .padding(20)
        .frame(width: 460)
        .onAppear {
            if fecha.isEmpty { fecha = fechaInicial }
            if marca.isEmpty { marca = marcas.first?.slug ?? "" }
        }
    }

    private var marcas: [MarcaNavItem] {
        appState.perfil?.perfil.marcasNav?.map(MarcaNavItem.from(dto:)) ?? []
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            TextField(label, text: text)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func enviar() async {
        guard let token = appState.accessToken else {
            error = APIError.notSignedIn.localizedDescription
            return
        }
        let slug = marca.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !slug.isEmpty else {
            error = "Elige una marca."
            return
        }
        guard fecha.count == 10 else {
            error = "La fecha tiene que ser YYYY-MM-DD."
            return
        }
        sending = true
        error = nil
        defer { sending = false }
        do {
            let created = try await appState.api.agendar(
                accessToken: token,
                tipo: tipo,
                marcaSlug: slug,
                fecha: fecha,
                hora: hora.trimmingCharacters(in: .whitespaces),
                durationMin: Int(duracion) ?? 60,
                titulo: titulo
            )
            meetLink = created.meetLink
            onCreated()
            if created.meetLink == nil { dismiss() }
        } catch {
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
    }
}

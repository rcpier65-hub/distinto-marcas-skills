import SwiftUI

/// Hoy / Inicio. Tasks from `GET /api/v1/tareas?due=hoy&include_overdue=1`,
/// grouped like the pendientes list on the web home.
struct InicioView: View {
    @EnvironmentObject private var appState: AppState
    @State private var filtro: Filtro = .todas
    @State private var habitos: HabitosResponse?
    @State private var habitosError: String?
    @State private var togglingHabito: String?

    private enum Filtro: String, CaseIterable, Identifiable {
        case todas
        case atrasadas
        case hoy
        case sinFecha

        var id: String { rawValue }

        var title: String {
            switch self {
            case .todas: return "Todas"
            case .atrasadas: return "Atrasadas"
            case .hoy: return "Hoy"
            case .sinFecha: return "Sin fecha"
            }
        }

        var bucket: TareaBucket? {
            switch self {
            case .todas: return nil
            case .atrasadas: return .atrasadas
            case .hoy: return .hoy
            case .sinFecha: return .sinFecha
            }
        }
    }

    var body: some View {
        ScrollView {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: 28) {
                    mainColumn
                        .frame(maxWidth: 720, alignment: .leading)
                    if showsRail {
                        rail
                            .frame(width: 300)
                    }
                }
                VStack(alignment: .leading, spacing: 28) {
                    mainColumn
                    if showsRail { rail }
                }
            }
            .frame(maxWidth: 1080, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 32)
            .padding(.vertical, 28)
        }
        .background(DistintoTokens.ColorToken.bgBase)
        .task { await loadHabitos() }
    }

    private var mainColumn: some View {
        VStack(alignment: .leading, spacing: 22) {
            header
            if let error = appState.tareasError, appState.tareasHoy != nil {
                TareasErrorBanner(message: error)
            }
            bodyContent
        }
    }

    private var showsRail: Bool {
        let trabajo = appState.tareasHoy?.trabajoHoy.isEmpty == false
        let pendientes = appState.tareasHoy?.pendientes.isEmpty == false
        let habits = habitos?.habitos.isEmpty == false
        return trabajo || pendientes || habits || habitosError != nil
    }

    private var rail: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let items = appState.tareasHoy?.trabajoHoy, !items.isEmpty {
                railCard(title: "Tu trabajo", count: items.count) {
                    ForEach(items) { item in
                        trabajoRow(item)
                    }
                }
            }
            if let items = appState.tareasHoy?.pendientes, !items.isEmpty {
                railCard(title: "Pendientes rápidos", count: items.count) {
                    ForEach(items) { item in
                        pendienteRow(item)
                    }
                }
            }
            if let habitos {
                railCard(title: "Hábitos de hoy", count: habitos.completados) {
                    if habitos.habitos.isEmpty {
                        Text("Sin hábitos activos.")
                            .font(.system(size: 12))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    } else {
                        ForEach(habitos.habitos) { habito in
                            habitoRow(habito)
                        }
                    }
                }
            }
            if let habitosError {
                Text(habitosError)
                    .font(.system(size: 12))
                    .foregroundStyle(DistintoTokens.ColorToken.danger)
            }
        }
    }

    private func railCard<Content: View>(title: String, count: Int, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                Spacer()
                Text("\(count)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .distintoCard(radius: 16)
    }

    private func trabajoRow(_ item: TrabajoHoyItem) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(Color(hexString: item.marcaColor) ?? DistintoTokens.ColorToken.accent)
                .frame(width: 8, height: 8)
                .padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.nombre)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(2)
                Text("\(item.marca) · \(item.meta)")
                    .font(.system(size: 11))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            Text(item.moduloLabel)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(DistintoTokens.ColorToken.accent)
        }
    }

    private func pendienteRow(_ item: PendienteRapido) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(TareaPalette.priorityColor(item.prioridad))
                .frame(width: 8, height: 8)
                .padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.titulo)
                    .font(.system(size: 13))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(2)
                Text(item.categoria)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(TareaPalette.chip(for: item.categoria).foreground)
            }
            Spacer(minLength: 0)
        }
    }

    private func habitoRow(_ habito: HabitoFila) -> some View {
        Button {
            Task { await toggle(habito) }
        } label: {
            HStack(spacing: 8) {
                Text(habito.icono)
                    .frame(width: 22)
                Text(habito.nombre)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if togglingHabito == habito.id {
                    ProgressView().controlSize(.small)
                } else {
                    Image(systemName: habito.completadoHoy ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(habito.completadoHoy ? DistintoTokens.ColorToken.success : DistintoTokens.ColorToken.textQuaternary)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!habito.aplicaHoy || togglingHabito != nil)
        .opacity(habito.aplicaHoy ? 1 : 0.45)
    }

    private func loadHabitos() async {
        guard let token = appState.accessToken else { return }
        do {
            habitos = try await appState.api.fetchHabitos(accessToken: token)
            habitosError = nil
        } catch {
            if ModuleLoad.isCancellation(error) { return }
            habitosError = error.localizedDescription
        }
    }

    private func toggle(_ habito: HabitoFila) async {
        guard habito.aplicaHoy, let token = appState.accessToken else { return }
        togglingHabito = habito.id
        defer { togglingHabito = nil }
        do {
            _ = try await appState.api.toggleHabito(accessToken: token, id: habito.id)
            habitos = try await appState.api.fetchHabitos(accessToken: token)
            habitosError = nil
        } catch {
            habitosError = error.localizedDescription
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(LimaFormat.greeting(name: appState.session?.displayName ?? ""))
                        .font(.system(size: DistintoTokens.Typography.xxl, weight: .semibold))
                        .tracking(-0.4)
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                    Text(subtitle)
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                Spacer(minLength: 12)
                RefreshButton()
            }
            if appState.tareasHoy != nil {
                filtros
            }
        }
    }

    private var subtitle: String {
        if let fecha = appState.tareasHoy?.fecha {
            return "\(LimaFormat.longDate(fecha)) · Lima"
        }
        return "Tu trabajo de hoy · Lima"
    }

    private var filtros: some View {
        HStack(spacing: 8) {
            ForEach(Filtro.allCases) { filtro in
                let count = count(for: filtro)
                FilterChip(
                    title: filtro.title,
                    count: count,
                    selected: self.filtro == filtro
                ) {
                    self.filtro = filtro
                }
            }
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private var bodyContent: some View {
        if appState.tareasHoy == nil {
            TareasPlaceholder(loading: appState.tareasLoading, error: appState.tareasError)
        } else if visibleSections.isEmpty {
            TareasEmptyState(
                title: emptyTitle,
                message: filtro == .todas
                    ? "Cuando entren tareas o pendientes rápidos, aparecen acá."
                    : "No hay tareas en este grupo."
            )
        } else {
            ForEach(visibleSections) { section in
                bucketBlock(section)
            }
        }
    }

    private var visibleSections: [TareaBucketSection] {
        let all = TareaOrganizer.sections(from: tareas, fecha: fecha)
        guard let bucket = filtro.bucket else { return all }
        return all.filter { $0.bucket == bucket }
    }

    private var tareas: [TareaHoy] { appState.tareasHoy?.tareas ?? [] }
    private var fecha: String { appState.tareasHoy?.fecha ?? "" }

    private var emptyTitle: String {
        switch filtro {
        case .todas: return "Nada pendiente para hoy"
        case .atrasadas: return "Nada atrasado"
        case .hoy: return "Nada con fecha de hoy"
        case .sinFecha: return "Nada sin fecha"
        }
    }

    private func count(for filtro: Filtro) -> Int {
        let all = TareaOrganizer.sections(from: tareas, fecha: fecha)
        guard let bucket = filtro.bucket else { return tareas.count }
        return all.first { $0.bucket == bucket }?.count ?? 0
    }

    private func bucketBlock(_ section: TareaBucketSection) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Text(section.bucket.title)
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(0.7)
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                Text("·")
                    .foregroundStyle(Color(hex: 0xD1D5DB))
                Text("\(section.count)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(section.bucket == .atrasadas ? DistintoTokens.ColorToken.danger : DistintoTokens.ColorToken.accent)
            }
            VStack(alignment: .leading, spacing: 4) {
                ForEach(section.groups) { group in
                    categoryBlock(group)
                }
            }
            .padding(.vertical, 6)
            .distintoCard()
        }
    }

    private func categoryBlock(_ group: TareaCategoryGroup) -> some View {
        let chip = TareaPalette.chip(for: group.name)
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text(group.name)
                    .font(.system(size: 10, weight: .bold))
                    .textCase(.uppercase)
                    .tracking(0.6)
                    .foregroundStyle(chip.foreground)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(chip.background)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .stroke(chip.border, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                Text("\(group.items.count)")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(hex: 0x9CA3AF))
            }
            .padding(.horizontal, 10)
            .padding(.top, 6)
            .padding(.bottom, 2)

            ForEach(group.items) { tarea in
                TareaListRow(tarea: tarea, fecha: fecha)
            }
        }
    }
}

private struct FilterChip: View {
    let title: String
    let count: Int
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                Text("\(count)")
                    .monospacedDigit()
                    .opacity(selected ? 0.85 : 0.7)
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(selected ? Color.white : DistintoTokens.ColorToken.textSecondary)
            .padding(.horizontal, 12)
            .frame(height: 30)
            .background(selected ? DistintoTokens.ColorToken.ink : Color.white)
            .overlay(
                Capsule()
                    .stroke(selected ? Color.clear : Color(hex: 0xE5E7EB), lineWidth: 1)
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct TareaListRow: View {
    let tarea: TareaHoy
    let fecha: String
    @EnvironmentObject private var appState: AppState
    @State private var hover = false
    @State private var detail: NativeDetail?

    var body: some View {
        Button {
            detail = TareaDetail.make(tarea, fecha: fecha) {
                guard let token = appState.accessToken else { throw APIError.notSignedIn }
                try await appState.api.completarTarea(accessToken: token, id: tarea.id)
                await appState.reloadTareas()
            }
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: mark.systemImage)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(mark.tint)
                    .frame(width: 18, height: 18)
                    .padding(.top, 1)

                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        if let prioridad = tarea.prioridad {
                            Circle()
                                .fill(TareaPalette.priorityColor(prioridad))
                                .frame(width: 6, height: 6)
                        }
                        Text(tarea.titulo)
                            .font(.system(size: 13.5, weight: .regular))
                            .foregroundStyle(DistintoTokens.ColorToken.ink)
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    Text(meta)
                        .font(.system(size: 11.5))
                        .foregroundStyle(overdue ? DistintoTokens.ColorToken.danger : Color(hex: 0x9CA3AF))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if hover {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .padding(.top, 3)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(hover ? Color(hex: 0xFAFAFA) : Color.clear)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .help("Ver detalle")
        .nativeDetail($detail)
        .padding(.horizontal, 6)
    }

    private var mark: TareaStatusMark { TareaStatusMark(status: tarea.status) }
    private var overdue: Bool { TareaOrganizer.isOverdue(tarea, fecha: fecha) }

    private var meta: String {
        var parts = [tarea.statusLabel, TareaOrganizer.dueText(tarea, fecha: fecha)]
        if let marca = tarea.marca, marca.caseInsensitiveCompare(tarea.columna) != .orderedSame {
            parts.append(marca)
        }
        if tarea.isRapida { parts.append("Rápida") }
        return parts.joined(separator: " · ")
    }
}

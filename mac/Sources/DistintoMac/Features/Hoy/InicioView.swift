import SwiftUI

/// Hoy / Inicio. Tasks from `GET /api/v1/tareas?due=hoy&include_overdue=1`,
/// grouped like the pendientes list on the web home.
struct InicioView: View {
    @EnvironmentObject private var appState: AppState
    @State private var filtro: Filtro = .todas

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
            VStack(alignment: .leading, spacing: 22) {
                header
                if let error = appState.tareasError, appState.tareasHoy != nil {
                    TareasErrorBanner(message: error)
                }
                bodyContent
            }
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 32)
            .padding(.vertical, 28)
        }
        .background(DistintoTokens.ColorToken.bgBase)
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
    @Environment(\.openURL) private var openURL
    @State private var hover = false

    var body: some View {
        Button {
            if let url = URL(string: tarea.link) {
                openURL(url)
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
                    Image(systemName: "arrow.up.right")
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
        .help("Abrir en Distinto")
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

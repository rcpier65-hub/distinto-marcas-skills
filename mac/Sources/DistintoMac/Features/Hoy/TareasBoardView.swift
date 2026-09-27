import SwiftUI

/// Colored columns, same language as the web tareas board (`CardArrastrable`).
struct TareasBoardView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if let error = appState.tareasError, appState.tareasHoy != nil {
                TareasErrorBanner(message: error)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
            }
            content
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(DistintoTokens.ColorToken.bgBase)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            Image(systemName: "sparkles")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.accent)
                .frame(width: 30, height: 30)
                .background(DistintoTokens.ColorToken.accentBg)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text("Tareas")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                Text(subtitle)
                    .font(.system(size: 11.5))
                    .foregroundStyle(Color(hex: 0x6B7280))
            }
            Spacer(minLength: 8)
            Text("Tablero")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .frame(height: 30)
                .background(DistintoTokens.ColorToken.ink)
                .clipShape(Capsule())
            RefreshButton()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
    }

    private var subtitle: String {
        let count = appState.tareasHoy?.tareas.count
        if let count {
            let noun = count == 1 ? "activa" : "activas"
            return "\(count) \(noun) · hoy y atrasadas"
        }
        return "Hoy y atrasadas"
    }

    @ViewBuilder
    private var content: some View {
        if appState.tareasHoy == nil {
            TareasPlaceholder(loading: appState.tareasLoading, error: appState.tareasError)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if columns.isEmpty {
            TareasEmptyState(
                title: "El tablero está vacío",
                message: "No hay tareas abiertas para hoy. Las que entren en Distinto aparecen acá, por categoría."
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView([.horizontal, .vertical]) {
                HStack(alignment: .top, spacing: 8) {
                    ForEach(columns) { column in
                        TareaColumnView(column: column, fecha: fecha)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
        }
    }

    private var columns: [TareaColumn] {
        TareaOrganizer.columns(from: appState.tareasHoy?.tareas ?? [])
    }

    private var fecha: String { appState.tareasHoy?.fecha ?? "" }
}

private struct TareaColumnView: View {
    let column: TareaColumn
    let fecha: String

    private var color: Color { TareaPalette.solid(for: column.name) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Circle()
                    .fill(color)
                    .frame(width: 7, height: 7)
                Text(column.name)
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text("\(column.items.count)")
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x9CA3AF))
            }
            .padding(.leading, 7)
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 3)
            }
            .padding(.bottom, 2)

            ForEach(column.items) { tarea in
                TareaBoardCard(tarea: tarea, color: color, fecha: fecha)
            }
        }
        .frame(width: 184, alignment: .topLeading)
    }
}

private struct TareaBoardCard: View {
    let tarea: TareaHoy
    let color: Color
    let fecha: String
    @Environment(\.openURL) private var openURL
    @State private var hover = false

    var body: some View {
        Button {
            if let url = URL(string: tarea.link) {
                openURL(url)
            }
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Text(tarea.titulo)
                    .font(.system(size: 11.5))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: 4) {
                    pill(tarea.statusLabel)
                    pill(TareaOrganizer.dueText(tarea, fecha: fecha), emphasize: TareaOrganizer.isOverdue(tarea, fecha: fecha))
                    Spacer(minLength: 0)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(color.opacity(hover ? 0.92 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .shadow(color: Color.black.opacity(hover ? 0.16 : 0), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .help("Abrir en Distinto")
    }

    private func pill(_ text: String, emphasize: Bool = false) -> some View {
        Text(text)
            .font(.system(size: 8.5, weight: .bold))
            .foregroundStyle(.white)
            .lineLimit(1)
            .padding(.horizontal, 6)
            .padding(.vertical, 1)
            .background(emphasize ? DistintoTokens.ColorToken.ink.opacity(0.55) : Color.white.opacity(0.22))
            .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
    }
}

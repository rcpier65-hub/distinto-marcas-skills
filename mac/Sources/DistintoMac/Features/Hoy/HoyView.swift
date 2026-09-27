import SwiftUI

struct HoyView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: TareasHoyResponse?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider().overlay(DistintoTokens.ColorToken.borderSubtle)
            content
        }
        .task { await load() }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Hoy")
                    .font(.system(size: DistintoTokens.Typography.xl, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                if let fecha = response?.fecha {
                    Text(fecha + " · America/Lima")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                } else {
                    Text("Tareas del día + inbox")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
            }
            Spacer()
            Button {
                Task { await load() }
            } label: {
                Label("Actualizar", systemImage: "arrow.clockwise")
                    .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(DistintoTokens.ColorToken.bgElevated)
                    .overlay(
                        RoundedRectangle(cornerRadius: DistintoTokens.Radius.md)
                            .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md))
            }
            .buttonStyle(.plain)
            .disabled(isLoading)
        }
        .padding(.horizontal, DistintoTokens.Spacing.s6)
        .frame(height: DistintoTokens.Layout.headerHeight + 12)
    }

    @ViewBuilder
    private var content: some View {
        if isLoading && response == nil {
            ProgressView("Cargando tareas…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage {
            VStack(spacing: 12) {
                Text(errorMessage)
                    .foregroundStyle(DistintoTokens.ColorToken.danger)
                    .font(.system(size: DistintoTokens.Typography.sm))
                Button("Reintentar") { Task { await load() } }
                    .buttonStyle(.borderedProminent)
                    .tint(DistintoTokens.ColorToken.accent)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let response, response.tareas.isEmpty {
            Text("Nada pendiente para hoy ✨")
                .font(.system(size: DistintoTokens.Typography.base))
                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let response {
            List {
                ForEach(response.tareas) { tarea in
                    TareaHoyRow(tarea: tarea)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
    }

    private func load() async {
        guard let token = appState.accessToken else {
            errorMessage = APIError.notSignedIn.localizedDescription
            return
        }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            response = try await appState.api.fetchTareasHoy(accessToken: token, includeOverdue: true)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct TareaHoyRow: View {
    let tarea: TareaHoy

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .strokeBorder(DistintoTokens.ColorToken.borderStrong, lineWidth: 1.5)
                .frame(width: 16, height: 16)
                .padding(.top, 3)

            VStack(alignment: .leading, spacing: 4) {
                Text(tarea.titulo)
                    .font(.system(size: DistintoTokens.Typography.base, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                HStack(spacing: 8) {
                    chip(tarea.statusLabel, tint: DistintoTokens.ColorToken.accent)
                    if let due = tarea.due {
                        chip(due, tint: DistintoTokens.ColorToken.info)
                    } else {
                        chip("Inbox", tint: DistintoTokens.ColorToken.textTertiary)
                    }
                    if let proyecto = tarea.proyecto {
                        chip(proyecto, tint: DistintoTokens.ColorToken.textSecondary)
                    }
                    if let prioridad = tarea.prioridad {
                        chip("P\(prioridad)", tint: DistintoTokens.ColorToken.warning)
                    }
                    chip(tarea.fuente == "pendientes_rapidos" ? "Rápido" : "Tarea",
                         tint: DistintoTokens.ColorToken.textTertiary)
                }
            }
            Spacer(minLength: 0)
            if let url = URL(string: tarea.link) {
                Link(destination: url) {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
            }
        }
        .padding(12)
        .background(DistintoTokens.ColorToken.bgElevated)
        .overlay(
            RoundedRectangle(cornerRadius: DistintoTokens.Radius.lg)
                .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.lg))
    }

    private func chip(_ text: String, tint: Color) -> some View {
        Text(text)
            .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
            .foregroundStyle(tint)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(tint.opacity(0.10))
            .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm))
    }
}

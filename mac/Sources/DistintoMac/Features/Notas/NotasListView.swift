import SwiftUI

/// Próximas y notas recientes. Crear y editar abre la web.
struct NotasListView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var response: NotasResponse?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                if let error, response != nil {
                    ModuleErrorBanner(message: error, onRetry: reload)
                }
                bodyContent
            }
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
        }
        .background(DistintoTokens.ColorToken.bgBase)
        .task { await load() }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Notas y reuniones")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text(subtitle)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            WebHandoffButton(title: "Nueva nota", path: "/notas-reuniones/nueva")
            ModuleRefreshButton(loading: loading, action: reload)
        }
    }

    private var subtitle: String {
        guard let response else { return "Transcribe, anota y pregunta" }
        if response.veTodo { return "Notas del equipo · toca una para abrirla" }
        return "Tus notas · toca una para abrirla"
    }

    @ViewBuilder
    private var bodyContent: some View {
        if response == nil {
            if let error, !loading {
                ModuleErrorBanner(message: error, onRetry: reload)
            } else {
                ModuleLoadingBlock(message: "Cargando notas…")
            }
        } else if let response {
            proximas(response.proximas)
            recientes(response)
        }
    }

    private func proximas(_ items: [ProximaReunion]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Próximas")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
            if items.isEmpty {
                Text("No hay eventos en esta ventana.")
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        VStack(spacing: 0) {
                            Button {
                                WebLink.open(item.link, fallback: "/notas-reuniones", using: openURL)
                            } label: {
                                HStack(alignment: .center, spacing: 14) {
                                    VStack(alignment: .leading, spacing: 0) {
                                        Text(LimaFormat.dayNumber(item.startsAt))
                                            .font(.system(size: 20, weight: .semibold))
                                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                                        Text(LimaFormat.monthWeekday(item.startsAt))
                                            .font(.system(size: 11))
                                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                            .lineLimit(1)
                                    }
                                    .frame(width: 88, alignment: .leading)
                                    Rectangle()
                                        .fill(DistintoTokens.ColorToken.borderSubtle)
                                        .frame(width: 1, height: 36)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(item.titulo)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                                            .lineLimit(1)
                                        Text("\(item.horario) · \(item.fuenteLabel)")
                                            .font(.system(size: 12))
                                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                            .lineLimit(1)
                                    }
                                    Spacer(minLength: 0)
                                }
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            if index < items.count - 1 {
                                Divider().overlay(DistintoTokens.ColorToken.borderSubtle)
                            }
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .distintoCard(radius: 18)
    }

    private func recientes(_ response: NotasResponse) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            if response.notas.isEmpty {
                ModuleEmptyState(
                    title: "Sin notas",
                    message: "Aún no hay notas. Crea una con «Nueva nota»."
                )
            } else {
                ForEach(grupos(response)) { grupo in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(grupo.label)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
                            .textCase(.uppercase)
                            .tracking(0.6)
                        ForEach(grupo.notas) { nota in
                            NotaRow(nota: nota) {
                                WebLink.open(nota.link, fallback: "/notas-reuniones", using: openURL)
                            }
                        }
                    }
                }
            }
        }
    }

    private func grupos(_ response: NotasResponse) -> [GrupoNotas] {
        var order: [String] = []
        var buckets: [String: [NotaReunionItem]] = [:]
        for nota in response.notas {
            let label = LimaFormat.dayHeading(iso: nota.cuando, hoy: response.hoy)
            if buckets[label] == nil {
                order.append(label)
                buckets[label] = []
            }
            buckets[label, default: []].append(nota)
        }
        return order.map { GrupoNotas(label: $0, notas: buckets[$0] ?? []) }
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
            let next = try await appState.api.fetchNotas(accessToken: token)
            guard !Task.isCancelled, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct GrupoNotas: Identifiable {
    let label: String
    let notas: [NotaReunionItem]
    var id: String { label }
}

private struct NotaRow: View {
    let nota: NotaReunionItem
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            HStack(alignment: .center, spacing: 12) {
                Image(systemName: "doc.text")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
                    .frame(width: 22)
                VStack(alignment: .leading, spacing: 2) {
                    Text(nota.titulo.isEmpty ? "Sin título" : nota.titulo)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        .lineLimit(1)
                    HStack(spacing: 4) {
                        Text(nota.autorNombre)
                        if let estado = nota.estadoLabel {
                            Text("·")
                            Text(estado)
                                .foregroundStyle(nota.estadoColor)
                        }
                    }
                    .font(.system(size: 12))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .lineLimit(1)
                }
                Spacer(minLength: 8)
                Text(LimaFormat.clock(nota.cuando))
                    .font(.system(size: 12))
                    .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 10)
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

import SwiftUI

/// Banco de Creación de Ideas. Guardar una idea o armar el guion abre la web.
struct IdeasListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: IdeasResponse?
    @State private var detail: NativeDetail?
    @State private var loading = false
    @State private var error: String?
    @State private var nicho = "Todos"
    @State private var busqueda = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if response != nil {
                    filtros
                    buscador
                }
                if let error, response != nil {
                    ModuleErrorBanner(message: error, onRetry: reload)
                }
                bodyContent
            }
            .frame(maxWidth: 980, alignment: .leading)
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
                Text("Creación de Ideas")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text(subtitle)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            ModuleRefreshButton(loading: loading, action: reload)
        }
    }

    private var subtitle: String {
        guard let response else { return "Banco de ideas para guiones" }
        let noun = response.total == 1 ? "idea" : "ideas"
        return "\(response.total) \(noun) en el banco"
    }

    private var filtros: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                chip("Todos")
                ForEach(response?.nichos ?? [], id: \.self) { item in
                    chip(item)
                }
            }
        }
    }

    private func chip(_ item: String) -> some View {
        let active = nicho == item
        return Button {
            nicho = item
        } label: {
            Text(item)
                .font(.system(size: 12, weight: active ? .semibold : .medium))
                .foregroundStyle(active ? .white : DistintoTokens.ColorToken.textSecondary)
                .padding(.horizontal, 10)
                .frame(height: 28)
                .background(active ? DistintoTokens.ColorToken.accent : Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 999, style: .continuous)
                        .stroke(active ? Color.clear : DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var buscador: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            TextField("Buscar en el banco…", text: $busqueda)
                .textFieldStyle(.plain)
                .font(.system(size: DistintoTokens.Typography.sm))
        }
        .padding(.horizontal, 12)
        .frame(height: 36)
        .background(Color.white)
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var visibles: [IdeaBancoItem] {
        let base = response?.ideas ?? []
        let porNicho = nicho == "Todos" ? base : base.filter { $0.nicho == nicho }
        let query = busqueda.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return porNicho }
        return porNicho.filter {
            $0.idea.localizedStandardContains(query)
                || $0.gancho.localizedStandardContains(query)
                || $0.nicho.localizedStandardContains(query)
        }
    }

    @ViewBuilder
    private var bodyContent: some View {
        if response == nil {
            if let error, !loading {
                ModuleErrorBanner(message: error, onRetry: reload)
            } else {
                ModuleLoadingBlock(message: "Cargando ideas…")
            }
        } else if visibles.isEmpty {
            ModuleEmptyState(
                title: "Nada en este filtro",
                message: "Prueba otro nicho o borra la búsqueda."
            )
        } else {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 260), spacing: 12)], spacing: 12) {
                ForEach(visibles) { idea in
                    IdeaCard(idea: idea) {
                        detail = NativeDetail(
                            id: idea.id,
                            title: idea.idea,
                            eyebrow: idea.nicho,
                            fields: DetailRows.make([
                                ("Gancho", idea.gancho),
                                ("Nicho", idea.nicho)
                            ]),
                            webPath: "/creacion-de-ideas",
                            showsWebLink: true,
                            webLinkTitle: "Armar guion"
                        )
                    }
                }
            }
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
            let next = try await appState.api.fetchIdeas(accessToken: token)
            guard !Task.isCancelled, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct IdeaCard: View {
    let idea: IdeaBancoItem
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 8) {
                Text(idea.nicho)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(DistintoTokens.ColorToken.accent)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(DistintoTokens.ColorToken.accentBg)
                    .clipShape(Capsule())
                Text(idea.idea)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Text("“\(idea.gancho)”")
                    .font(.system(size: 12.5))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 8)
                Text("Abrir en la web")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.accent)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 168, alignment: .topLeading)
            .distintoCard(radius: 16)
            .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

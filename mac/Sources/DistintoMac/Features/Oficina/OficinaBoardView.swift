import SwiftUI

/// Escritorios, salas y atajos de la oficina. Caminar y reclamar sigue en la web.
struct OficinaBoardView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: OficinaResponse?
    @State private var detail: NativeDetail?
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
            .frame(maxWidth: 860, alignment: .leading)
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
                Text("Oficina")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text("Escritorios del equipo. Entrar a caminar sigue en la web.")
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            WebHandoffButton(title: "Entrar a la oficina", path: "/oficina")
            ModuleRefreshButton(loading: loading, action: reload)
        }
    }

    @ViewBuilder
    private var bodyContent: some View {
        if response == nil {
            if let error, !loading {
                ModuleErrorBanner(message: error, onRetry: reload)
            } else {
                ModuleLoadingBlock(message: "Cargando la oficina…")
            }
        } else if let response {
            escritorios(response.escritorios)
            if !response.sinPuesto.isEmpty {
                sinPuesto(response.sinPuesto)
            }
            zonas(response.zonas)
            if !response.accesos.isEmpty {
                accesos(response.accesos)
            }
        }
    }

    private func escritorios(_ puestos: [EscritorioOficina]) -> some View {
        let zonas = ordenZonas(puestos)
        return VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Escritorios")
            if puestos.isEmpty {
                ModuleEmptyState(
                    title: "Sin escritorios",
                    message: "El mapa de la oficina todavía no tiene puestos con nombre."
                )
            } else {
                ForEach(zonas, id: \.self) { zona in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(zona)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 10)], spacing: 10) {
                            ForEach(puestos.filter { $0.zona == zona }) { puesto in
                                EscritorioCard(puesto: puesto) {
                                    detail = NativeDetail(
                                        id: puesto.id,
                                        title: puesto.etiqueta,
                                        eyebrow: puesto.zona,
                                        fields: DetailRows.make([
                                            ("Estado", puesto.detalle),
                                            ("Ocupante", puesto.ocupante?.nombre),
                                            ("Última visita", puesto.ocupante?.ultimaVisita)
                                        ]),
                                        webPath: "/oficina"
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func sinPuesto(_ personas: [PersonaOficina]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle("Sin escritorio")
            ForEach(personas) { persona in
                Button {
                    detail = NativeDetail(
                        id: persona.id,
                        title: persona.titulo,
                        eyebrow: "Sin escritorio",
                        fields: DetailRows.make([
                            ("Última visita", persona.ultimaVisita)
                        ]),
                        webPath: "/oficina"
                    )
                } label: {
                    HStack(spacing: 10) {
                        Text(String(persona.titulo.prefix(1)).uppercased())
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(DistintoTokens.ColorToken.accent)
                            .clipShape(Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(persona.titulo)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                            Text(visita(persona.ultimaVisita))
                                .font(.system(size: 11))
                                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        }
                        Spacer()
                    }
                    .padding(10)
                    .distintoCard(radius: 12)
                    .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func zonas(_ salas: [ZonaOficina]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle("Salas")
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 10)], spacing: 10) {
                ForEach(salas) { sala in
                    Button {
                        detail = NativeDetail(
                            id: sala.id,
                            title: sala.nombre,
                            eyebrow: "Sala",
                            fields: DetailRows.make([
                                ("Zona", sala.nombre)
                            ]),
                            webPath: "/oficina"
                        )
                    } label: {
                        HStack(spacing: 8) {
                            Text(sala.emoji)
                            Text(sala.nombre)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                                .lineLimit(1)
                            Spacer(minLength: 0)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(hexString: sala.color)?.opacity(0.12) ?? DistintoTokens.ColorToken.bgElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke((Color(hexString: sala.color) ?? DistintoTokens.ColorToken.borderSubtle).opacity(0.35), lineWidth: 1)
                        )
                        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func accesos(_ items: [AccesoOficina]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle("Atajos del mapa")
            ForEach(items) { acceso in
                Button {
                    detail = NativeDetail(
                        id: acceso.id,
                        title: acceso.titulo,
                        eyebrow: "Atajo",
                        fields: DetailRows.make([
                            ("Destino", NativeDetail.path(from: acceso.link, fallback: "/oficina"))
                        ]),
                        webPath: NativeDetail.path(from: acceso.link, fallback: "/oficina")
                    )
                } label: {
                    HStack(spacing: 10) {
                        Text(acceso.icono)
                        Text(acceso.titulo)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .distintoCard(radius: 12)
                    .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DistintoTokens.Typography.xs, weight: .bold))
            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            .textCase(.uppercase)
            .tracking(0.6)
    }

    private func ordenZonas(_ puestos: [EscritorioOficina]) -> [String] {
        var seen: [String] = []
        for puesto in puestos where !seen.contains(puesto.zona) {
            seen.append(puesto.zona)
        }
        return seen
    }

    private func visita(_ iso: String?) -> String {
        let texto = LimaFormat.shortDateTime(iso)
        return texto.isEmpty ? "Sin visita reciente" : "Última visita \(texto)"
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
            let next = try await appState.api.fetchOficina(accessToken: token)
            guard !Task.isCancelled, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct EscritorioCard: View {
    let puesto: EscritorioOficina
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(puesto.etiqueta)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(puesto.esMio ? .white : DistintoTokens.ColorToken.textPrimary)
                    Spacer()
                    if puesto.libre {
                        Text("Libre")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Color(hex: 0x15803D))
                    }
                }
                Text(puesto.esMio ? "Tuyo" : puesto.detalle)
                    .font(.system(size: 12))
                    .foregroundStyle(puesto.esMio ? Color.white.opacity(0.85) : DistintoTokens.ColorToken.textTertiary)
                    .lineLimit(1)
                if let visita = puesto.ocupante?.ultimaVisita, !puesto.libre {
                    Text(LimaFormat.shortDateTime(visita))
                        .font(.system(size: 11))
                        .foregroundStyle(puesto.esMio ? Color.white.opacity(0.7) : DistintoTokens.ColorToken.textQuaternary)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(puesto.esMio ? DistintoTokens.ColorToken.accent : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(
                        puesto.libre ? Color(hex: 0x43D69F).opacity(0.7) : DistintoTokens.ColorToken.cardBorder,
                        lineWidth: puesto.esMio ? 0 : 1
                    )
            )
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

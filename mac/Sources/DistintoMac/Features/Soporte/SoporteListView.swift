import SwiftUI

/// Reportes de soporte: alta, lista, tomar y resolver. Las capturas siguen en la web.
struct SoporteListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: SoporteResponse?
    @State private var detail: NativeDetail?
    @State private var loading = false
    @State private var error: String?
    @State private var tipo = "falla"
    @State private var borrador = ""
    @State private var enviando = false
    @State private var aviso: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                composer
                if let aviso {
                    Text(aviso)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color(hex: 0x166534))
                }
                if let error, response != nil {
                    ModuleErrorBanner(message: error, onRetry: reload)
                }
                bodyContent
            }
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 32)
            .padding(.vertical, 28)
        }
        .background(DistintoTokens.ColorToken.bgBase)
        .nativeDetail($detail)
        .task { await load() }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: "lifepreserver")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 40, height: 40)
                .background(
                    LinearGradient(
                        colors: [Color(hex: 0x7170FF), Color(hex: 0xBA41F7)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("Soporte")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text(subtitle)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            ModuleRefreshButton(loading: loading, action: reload)
        }
    }

    private var composer: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ForEach(["falla", "pedido", "consulta"], id: \.self) { item in
                    let meta = tipoMeta(item)
                    let active = tipo == item
                    Button {
                        tipo = item
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: meta.symbol)
                            Text(meta.label)
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(active ? meta.color : DistintoTokens.ColorToken.textTertiary)
                        .padding(.horizontal, 10)
                        .frame(height: 32)
                        .background(active ? meta.background : Color.clear)
                        .overlay(Capsule().stroke(active ? meta.color : Color(hex: 0xE5E7EB), lineWidth: 1))
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            TextField("Qué falló, qué pedís o qué duda tenés", text: $borrador, axis: .vertical)
                .lineLimit(3...6)
                .textFieldStyle(.plain)
                .font(.system(size: 14))
                .padding(10)
                .background(Color(hex: 0xFAFAFA))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            HStack {
                Text("Las capturas siguen en la web.")
                    .font(.system(size: 11))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                Spacer()
                Button(enviando ? "Enviando…" : "Enviar reporte") {
                    Task { await enviar() }
                }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .frame(height: 32)
                .background(DistintoTokens.ColorToken.accent)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .disabled(enviando || borrador.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(16)
        .distintoCard(radius: 16)
    }

    private func tipoMeta(_ tipo: String) -> ReporteSoporte.TipoMeta {
        switch tipo {
        case "pedido":
            return .init(label: "Pedido", symbol: "lightbulb", color: Color(hex: 0xD97706), background: Color(hex: 0xFFFBEB))
        case "consulta":
            return .init(label: "Consulta", symbol: "questionmark.circle", color: Color(hex: 0x2563EB), background: Color(hex: 0xEFF6FF))
        default:
            return .init(label: "Falla", symbol: "ladybug", color: Color(hex: 0xDC2626), background: Color(hex: 0xFEF2F2))
        }
    }

    private func enviar() async {
        guard let token = appState.accessToken else { return }
        enviando = true
        aviso = nil
        defer { enviando = false }
        do {
            try await appState.api.crearReporte(accessToken: token, tipo: tipo, descripcion: borrador)
            borrador = ""
            aviso = "Enviado. Erick ya tiene el reporte."
            await load(force: true)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private var subtitle: String {
        if response?.esAdmin == true {
            return "Reportes del equipo. Puedes tomarlos y resolverlos acá."
        }
        return "Tus reportes de fallas, pedidos y consultas."
    }

    @ViewBuilder
    private var bodyContent: some View {
        if response == nil {
            if let error, !loading {
                ModuleErrorBanner(message: error, onRetry: reload)
            } else {
                ModuleLoadingBlock(message: "Cargando reportes…")
            }
        } else if let response {
            if response.esAdmin {
                adminSections(response.reportes)
            } else {
                misReportes(response.reportes)
            }
        }
    }

    private func misReportes(_ reportes: [ReporteSoporte]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("Mis reportes", color: DistintoTokens.ColorToken.textTertiary)
            if reportes.isEmpty {
                ModuleEmptyState(
                    title: "Sin reportes",
                    message: "Todavía no has enviado ningún reporte. Escríbelo arriba."
                )
            } else {
                ForEach(reportes) { reporte in
                    ReporteCard(reporte: reporte) { open(reporte) }
                }
            }
        }
    }

    private func adminSections(_ reportes: [ReporteSoporte]) -> some View {
        let abiertos = reportes.filter { $0.estado != "resuelto" }
        let resueltos = reportes.filter { $0.estado == "resuelto" }
        return VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 10) {
                sectionTitle("Por resolver (\(abiertos.count))", color: Color(hex: 0xD97706))
                if abiertos.isEmpty {
                    Text("Nada pendiente.")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(DistintoTokens.ColorToken.bgElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                } else {
                    ForEach(abiertos) { reporte in
                        ReporteCard(
                            reporte: reporte,
                            showAuthor: true,
                            canManage: true,
                            onTomar: { Task { await gestionar(reporte, accion: "tomar") } },
                            onResolver: { Task { await gestionar(reporte, accion: "resolver") } }
                        ) { open(reporte) }
                    }
                }
            }
            if !resueltos.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    sectionTitle("Historial · resueltos (\(resueltos.count))", color: Color(hex: 0x16A34A))
                    ForEach(Array(resueltos.prefix(60))) { reporte in
                        ReporteCard(reporte: reporte, showAuthor: true) { open(reporte) }
                    }
                }
            }
        }
    }

    private func sectionTitle(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: DistintoTokens.Typography.xs, weight: .bold))
            .foregroundStyle(color)
            .textCase(.uppercase)
            .tracking(0.6)
    }

    private func reload() {
        Task { await load(force: true) }
    }

    private func gestionar(_ reporte: ReporteSoporte, accion: String) async {
        guard let token = appState.accessToken else { return }
        do {
            try await appState.api.gestionarReporte(accessToken: token, id: reporte.id, accion: accion, nota: nil)
            aviso = accion == "resolver" ? "Reporte resuelto." : "Reporte en proceso."
            await load(force: true)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func open(_ reporte: ReporteSoporte) {
        detail = NativeDetail(
            id: reporte.id,
            title: reporte.descripcion,
            eyebrow: reporte.tipoMeta.label,
            fields: DetailRows.make([
                ("Estado", reporte.estadoMeta.label),
                ("Autor", reporte.autorNombre),
                ("Nota", reporte.notaResolucion),
                ("Imágenes", reporte.imagenes > 0 ? "\(reporte.imagenes)" : nil),
                ("Resuelto por", reporte.resueltoPor)
            ]),
            webPath: "/soporte"
        )
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
            let next = try await appState.api.fetchSoporte(accessToken: token)
            guard !Task.isCancelled, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct ReporteCard: View {
    let reporte: ReporteSoporte
    var showAuthor = false
    var canManage = false
    var onTomar: (() -> Void)?
    var onResolver: (() -> Void)?
    let onOpen: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    tipoChip
                    if showAuthor {
                        Text(reporte.autorNombre)
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                    }
                    Text(LimaFormat.shortDateTime(reporte.createdAt))
                        .font(.system(size: 11))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    Spacer(minLength: 4)
                    Text(reporte.estadoMeta.label)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(reporte.estadoMeta.color)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(reporte.estadoMeta.background)
                        .clipShape(Capsule())
                }
                Text(reporte.descripcion.isEmpty ? "Sin descripción" : reporte.descripcion)
                    .font(.system(size: DistintoTokens.Typography.base))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary.opacity(0.9))
                    .multilineTextAlignment(.leading)
                    .lineLimit(6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if reporte.imagenes > 0 {
                    Text(reporte.imagenes == 1 ? "1 captura" : "\(reporte.imagenes) capturas")
                        .font(.system(size: 11))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                if reporte.estado == "resuelto" {
                    Text(resueltoLinea)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color(hex: 0x16A34A))
                }
            }
            }
            .buttonStyle(.plain)
            if canManage, reporte.estado != "resuelto" {
                HStack(spacing: 8) {
                    if reporte.estado == "pendiente" {
                        accion("Tomar", onTomar)
                    }
                    accion("Resolver", onResolver)
                    Spacer()
                }
            }
        }
        .padding(14)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(alignment: .leading) {
                Rectangle()
                    .fill(reporte.tipoMeta.color)
                    .frame(width: 4)
                    .clipShape(RoundedRectangle(cornerRadius: 2, style: .continuous))
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.black.opacity(0.06), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 1, y: 1)
            .opacity(reporte.estado == "resuelto" ? 0.92 : 1)
    }

    private func accion(_ title: String, _ action: (() -> Void)?) -> some View {
        Button(title) { action?() }
            .buttonStyle(.plain)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(title == "Resolver" ? .white : DistintoTokens.ColorToken.ink)
            .padding(.horizontal, 10)
            .frame(height: 26)
            .background(title == "Resolver" ? DistintoTokens.ColorToken.ink : Color(hex: 0xF3F4F6))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var tipoChip: some View {
        HStack(spacing: 4) {
            Image(systemName: reporte.tipoMeta.symbol)
                .font(.system(size: 11, weight: .bold))
            Text(reporte.tipoMeta.label)
                .font(.system(size: 12, weight: .bold))
        }
        .foregroundStyle(reporte.tipoMeta.color)
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
        .background(reporte.tipoMeta.background)
        .clipShape(Capsule())
    }

    private var resueltoLinea: String {
        var parts = ["Resuelto"]
        if let quien = reporte.resueltoPor, !quien.isEmpty {
            parts.append("por \(quien)")
        }
        if let cuando = reporte.resueltoAt {
            let fecha = LimaFormat.shortDateTime(cuando)
            if !fecha.isEmpty { parts.append("· \(fecha)") }
        }
        return parts.joined(separator: " ")
    }
}

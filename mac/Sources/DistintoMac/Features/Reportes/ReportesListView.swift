import SwiftUI

/// Marcas con reporte mensual. Editar un mes sigue en la web.
struct ReportesListView: View {
    @EnvironmentObject private var appState: AppState
    @State private var response: ReportesResponse?
    @State private var detail: NativeDetail?
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if let error, response != nil {
                    ModuleErrorBanner(message: error, onRetry: reload)
                }
                bodyContent
            }
            .frame(maxWidth: 1080, alignment: .leading)
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
                Text("Reportes")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text(subtitle)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 8)
            WebHandoffButton(title: "Abrir en la web", path: "/reportes")
            ModuleRefreshButton(loading: loading, action: reload)
        }
    }

    private var subtitle: String {
        guard let response else { return "Dashboards mensuales por marca" }
        let noun = response.total == 1 ? "marca" : "marcas"
        return "\(response.total) \(noun) · \(response.conDatos) con datos"
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
            if response.marcas.isEmpty {
                ModuleEmptyState(
                    title: "Sin marcas",
                    message: "No hay marcas con acceso a Reportes en esta sesión."
                )
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 12)], spacing: 12) {
                    ForEach(response.marcas) { marca in
                        MarcaReporteCard(marca: marca) { open(marca) }
                    }
                }
            }
        }
    }

    private func reload() {
        Task { await load(force: true) }
    }

    private func open(_ marca: MarcaReporteItem) {
        detail = NativeDetail(
            id: marca.slug,
            title: marca.nombre,
            eyebrow: "Reporte",
            fields: DetailRows.make([
                ("Último mes", marca.ultimoMesLabel ?? marca.ultimoMes),
                ("Meses", "\(marca.meses)"),
                ("Leads", marca.leads.map { ReporteFormato.entero($0) }),
                ("Ventas totales", marca.ventasTotales.map { ReporteFormato.soles($0) }),
                ("Ingreso directo", marca.ingresoDirecto.map { ReporteFormato.soles($0) }),
                ("ROAS directo", marca.roasDirecto.map { String(format: "%.2f", $0) })
            ]),
            webPath: "/reportes"
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
            let next = try await appState.api.fetchReportes(accessToken: token)
            guard !Task.isCancelled, appState.accessToken == token else { return }
            response = next
        } catch {
            if ModuleLoad.isCancellation(error) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            self.error = error.localizedDescription
        }
    }
}

private struct MarcaReporteCard: View {
    let marca: MarcaReporteItem
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Text(marca.emoji ?? "🏷️")
                        .font(.system(size: 18))
                        .frame(width: 36, height: 36)
                        .background(Color(hexString: marca.color)?.opacity(0.16) ?? DistintoTokens.ColorToken.bgElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(marca.nombre)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        Text(subtitulo)
                            .font(.system(size: 12))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    }
                    Spacer(minLength: 8)
                    if marca.tieneDatos {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
                    } else {
                        Text("SIN DATOS")
                            .font(.system(size: 9, weight: .bold))
                            .tracking(0.6)
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    }
                }
                if marca.tieneDatos {
                    HStack(spacing: 8) {
                        metrica("Ventas", valor: marca.ventasTotales.map(ReporteFormato.entero))
                        metrica("Ingreso", valor: marca.ingresoDirecto.map(ReporteFormato.soles))
                        metrica("ROAS", valor: marca.roasDirecto.map(ReporteFormato.roas))
                        metrica("Leads", valor: marca.leads.map(ReporteFormato.entero))
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .distintoCard(radius: 16)
            .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var subtitulo: String {
        if let label = marca.ultimoMesLabel {
            let meses = marca.meses == 1 ? "1 mes" : "\(marca.meses) meses"
            return "\(label) · \(meses)"
        }
        return "Aún no tiene reporte"
    }

    private func metrica(_ label: String, valor: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
                .textCase(.uppercase)
                .tracking(0.4)
            Text(valor ?? "—")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

import SwiftUI

enum DetailRows {
    static func make(_ pairs: [(String, String?)]) -> [DetailField] {
        pairs.compactMap { label, value in
            let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !trimmed.isEmpty else { return nil }
            return DetailField(label: label, value: trimmed)
        }
    }
}

struct DetailField: Identifiable {
    let label: String
    let value: String
    var id: String { "\(label):\(value)" }
}

struct NativeDetail: Identifiable {
    let id: String
    let title: String
    var eyebrow: String?
    var fields: [DetailField]
    let webPath: String
    var showsWebLink = false
    var webLinkTitle = "Abrir en la web"
    var primaryTitle: String?
    var onPrimary: (() async throws -> Void)?

    static func path(from link: String, fallback: String) -> String {
        guard let url = URL(string: link), url.host != nil else {
            return link.hasPrefix("/") ? link : fallback
        }
        let path = url.path.isEmpty ? fallback : url.path
        guard let query = url.query, !query.isEmpty else { return path }
        return "\(path)?\(query)"
    }
}

struct NativeDetailView: View {
    let detail: NativeDetail
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var working = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    if let eyebrow = detail.eyebrow, !eyebrow.isEmpty {
                        Text(eyebrow)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            .textCase(.uppercase)
                            .tracking(0.6)
                    }
                    Text(detail.title)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Button("Cerrar") { dismiss() }
                    .buttonStyle(.plain)
                    .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            }
            .padding(20)

            Divider().overlay(DistintoTokens.ColorToken.borderSubtle)

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if detail.fields.isEmpty {
                        Text("No hay más campos en esta fila.")
                            .font(.system(size: DistintoTokens.Typography.sm))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    }
                    ForEach(detail.fields) { field in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(field.label)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            Text(field.value)
                                .font(.system(size: 14))
                                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                                .textSelection(.enabled)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    if let error {
                        Text(error)
                            .font(.system(size: DistintoTokens.Typography.sm))
                            .foregroundStyle(Color(hex: 0xB45309))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }

            Divider().overlay(DistintoTokens.ColorToken.borderSubtle)

            HStack(spacing: 12) {
                if detail.showsWebLink {
                    Button {
                        openURL(AppConfig.webURL(detail.webPath))
                    } label: {
                        Label(detail.webLinkTitle, systemImage: "arrow.up.right")
                            .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(DistintoTokens.ColorToken.accent)
                }
                Spacer()
                if let title = detail.primaryTitle {
                    Button {
                        Task { await runPrimary() }
                    } label: {
                        Text(working ? "Guardando…" : title)
                            .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                            .padding(.horizontal, 12)
                            .frame(height: 30)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(DistintoTokens.ColorToken.accent)
                    .disabled(working)
                }
            }
            .padding(16)
        }
        .frame(minWidth: 440, idealWidth: 480, minHeight: 280, idealHeight: 420)
        .background(DistintoTokens.ColorToken.bgBase)
    }

    private func runPrimary() async {
        guard let onPrimary = detail.onPrimary else { return }
        working = true
        error = nil
        defer { working = false }
        do {
            try await onPrimary()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

enum TareaDetail {
    static func make(_ tarea: TareaHoy, fecha: String, onComplete: (() async throws -> Void)?) -> NativeDetail {
        let canComplete = tarea.fuente == "tareas" && tarea.status != "completada"
        return NativeDetail(
            id: tarea.id,
            title: tarea.titulo,
            eyebrow: tarea.columna,
            fields: DetailRows.make([
                ("Estado", tarea.statusLabel),
                ("Fecha", TareaOrganizer.dueText(tarea, fecha: fecha)),
                ("Marca", tarea.marca),
                ("Origen", tarea.fuente == "tareas" ? "Tablero" : (tarea.isRapida ? "Pendiente rápido" : "Trabajo de hoy"))
            ]),
            webPath: NativeDetail.path(from: tarea.link, fallback: tarea.fuente == "tareas" ? "/tareas" : "/inicio"),
            primaryTitle: canComplete ? "Marcar hecha" : nil,
            onPrimary: canComplete ? onComplete : nil
        )
    }
}

extension View {
    func nativeDetail(_ detail: Binding<NativeDetail?>) -> some View {
        sheet(item: detail) { item in
            NativeDetailView(detail: item)
        }
    }
}

struct HabitoToggleResponse: Codable, Equatable {
    let ok: Bool
    let completado: Bool
    let today: String
}

struct TareaCompletarResponse: Codable, Equatable {
    let ok: Bool
    let id: String
    let completada: Bool
}

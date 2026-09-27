import SwiftUI

struct RefreshButton: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Button {
            Task { await appState.reloadTareas() }
        } label: {
            HStack(spacing: 6) {
                if appState.tareasLoading {
                    ProgressView()
                        .controlSize(.small)
                } else {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12, weight: .semibold))
                }
                Text("Actualizar")
            }
            .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
            .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            .padding(.horizontal, 10)
            .frame(height: 28)
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous)
                    .stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(appState.tareasLoading)
        .help("Volver a cargar las tareas de hoy")
    }
}

struct TareasErrorBanner: View {
    @EnvironmentObject private var appState: AppState
    let message: String

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: "exclamationmark.circle")
                .foregroundStyle(DistintoTokens.ColorToken.danger)
            Text(message)
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(Color(hex: 0x991B1B))
                .frame(maxWidth: .infinity, alignment: .leading)
            Button("Reintentar") {
                Task { await appState.reloadTareas() }
            }
            .buttonStyle(.plain)
            .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
            .foregroundStyle(DistintoTokens.ColorToken.danger)
            if message.localizedCaseInsensitiveContains("sesión") {
                Button("Cerrar sesión") {
                    Task { await appState.signOut() }
                }
                .buttonStyle(.plain)
                .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(DistintoTokens.ColorToken.danger.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(DistintoTokens.ColorToken.danger.opacity(0.18), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct TareasPlaceholder: View {
    let loading: Bool
    let error: String?

    var body: some View {
        if let error, !loading {
            VStack(spacing: 14) {
                TareasErrorBanner(message: error)
            }
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(0..<4, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.black.opacity(0.045))
                        .frame(height: 52)
                }
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                    Text("Cargando tareas…")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                .padding(.top, 6)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(.top, 4)
        }
    }
}

struct TareasEmptyState: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 10) {
            IsotipoDistinto(size: 42)
                .opacity(0.9)
            Text(title)
                .font(.system(size: DistintoTokens.Typography.lg, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
            Text(message)
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 360)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }
}

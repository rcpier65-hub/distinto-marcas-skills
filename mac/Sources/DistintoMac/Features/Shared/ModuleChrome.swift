import SwiftUI

/// Same orange avatar as the web sidebar footer (`avatarStyle`).
struct UserAvatar: View {
    let initial: String
    var size: CGFloat = 22

    var body: some View {
        Circle()
            .fill(
                LinearGradient(
                    colors: [Color(hex: 0xFF8A4C), Color(hex: 0xFF5252)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: size, height: size)
            .overlay(
                Text(String(initial.prefix(1)).uppercased())
                    .font(.system(size: size * 0.5, weight: .semibold))
                    .foregroundStyle(.white)
            )
    }
}

struct ModulePageHeader: View {
    let title: String
    let subtitle: String
    var loading = false
    let onRefresh: () -> Void

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text(subtitle)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            Spacer(minLength: 12)
            ModuleRefreshButton(loading: loading, action: onRefresh)
        }
    }
}

struct ModuleRefreshButton: View {
    let loading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if loading {
                    ProgressView().controlSize(.small)
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
        .disabled(loading)
    }
}

struct ModuleErrorBanner: View {
    @EnvironmentObject private var appState: AppState
    let message: String
    let onRetry: () -> Void

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: "exclamationmark.circle")
                .foregroundStyle(DistintoTokens.ColorToken.danger)
            Text(message)
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(Color(hex: 0x991B1B))
                .frame(maxWidth: .infinity, alignment: .leading)
            Button("Reintentar", action: onRetry)
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

struct ModuleLoadingBlock: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(0..<4, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.black.opacity(0.045))
                    .frame(height: 56)
            }
            HStack(spacing: 8) {
                ProgressView().controlSize(.small)
                Text(message)
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            }
            .padding(.top, 6)
        }
    }
}

struct ModuleEmptyState: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 10) {
            IsotipoDistinto(size: 42).opacity(0.9)
            Text(title)
                .font(.system(size: DistintoTokens.Typography.lg, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
            Text(message)
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 380)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }
}

struct StatusChip: View {
    let label: String
    let color: Color
    var background: Color?
    var uppercase = false

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(uppercase ? label.uppercased() : label)
                .font(.system(size: 10.5, weight: .medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(background ?? color.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
    }
}

struct WebHandoffButton: View {
    @Environment(\.openURL) private var openURL
    let title: String
    let path: String

    var body: some View {
        Button {
            openURL(AppConfig.webURL(path))
        } label: {
            Label(title, systemImage: "arrow.up.right")
                .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.accent)
                .padding(.horizontal, 10)
                .frame(height: 28)
                .background(DistintoTokens.ColorToken.accentBg)
                .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

enum ModuleLoad {
    static func isCancellation(_ error: Error) -> Bool {
        if error is CancellationError { return true }
        if let urlError = error as? URLError, urlError.code == .cancelled { return true }
        return false
    }

    @MainActor
    static func fetch(
        appState: AppState,
        loading: Binding<Bool>,
        error: Binding<String?>,
        loaded: Bool,
        force: Bool,
        work: (String) async throws -> Void
    ) async {
        if loading.wrappedValue { return }
        if loaded && !force { return }
        guard let token = appState.accessToken else {
            error.wrappedValue = APIError.notSignedIn.localizedDescription
            return
        }
        loading.wrappedValue = true
        error.wrappedValue = nil
        defer { loading.wrappedValue = false }
        do {
            try await work(token)
        } catch let caught {
            if isCancellation(caught) || Task.isCancelled { return }
            guard appState.accessToken == token else { return }
            error.wrappedValue = caught.localizedDescription
        }
    }
}

enum WebLink {
    static func open(_ link: String, fallback: String, using openURL: OpenURLAction) {
        let url = URL(string: link) ?? AppConfig.webURL(fallback)
        openURL(url)
    }
}

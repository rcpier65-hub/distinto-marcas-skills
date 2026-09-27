import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appState: AppState
    @State private var email = AppConfig.pedroEmail
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        HStack(spacing: 0) {
            // Brand panel
            VStack(alignment: .leading, spacing: DistintoTokens.Spacing.s4) {
                Text("Distinto")
                    .font(.system(size: DistintoTokens.Typography.xxl, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Text("Workspace nativo para macOS.\nMismo backend que la app web.")
                    .font(.system(size: DistintoTokens.Typography.base))
                    .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer()
                Text("Fase 1 · scaffold")
                    .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .tracking(0.8)
                    .textCase(.uppercase)
            }
            .padding(DistintoTokens.Spacing.s8)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(DistintoTokens.ColorToken.bgElevated)

            // Form
            VStack(alignment: .leading, spacing: DistintoTokens.Spacing.s4) {
                Text("Iniciar sesión")
                    .font(.system(size: DistintoTokens.Typography.xl, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)

                Text("Email + contraseña (igual que la web).")
                    .font(.system(size: DistintoTokens.Typography.sm))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)

                VStack(alignment: .leading, spacing: DistintoTokens.Spacing.s2) {
                    Text("Email")
                        .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .textCase(.uppercase)
                        .tracking(0.8)
                    TextField("pedro@agenciadistinto.com", text: $email)
                        .textFieldStyle(.plain)
                        .padding(10)
                        .background(DistintoTokens.ColorToken.bgBase)
                        .overlay(
                            RoundedRectangle(cornerRadius: DistintoTokens.Radius.md)
                                .stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
                        )
                        .font(.system(size: DistintoTokens.Typography.base))
                }

                VStack(alignment: .leading, spacing: DistintoTokens.Spacing.s2) {
                    Text("Contraseña")
                        .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .textCase(.uppercase)
                        .tracking(0.8)
                    SecureField("••••••••", text: $password)
                        .textFieldStyle(.plain)
                        .padding(10)
                        .background(DistintoTokens.ColorToken.bgBase)
                        .overlay(
                            RoundedRectangle(cornerRadius: DistintoTokens.Radius.md)
                                .stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
                        )
                        .font(.system(size: DistintoTokens.Typography.base))
                        .onSubmit { Task { await submit() } }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.danger)
                }

                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        if isLoading { ProgressView().controlSize(.small) }
                        Text(isLoading ? "Entrando…" : "Entrar")
                            .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(DistintoTokens.ColorToken.accent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md))
                }
                .buttonStyle(.plain)
                .disabled(isLoading || email.isEmpty || password.isEmpty)
                .opacity(email.isEmpty || password.isEmpty ? 0.5 : 1)

                Spacer()
            }
            .padding(DistintoTokens.Spacing.s8)
            .frame(width: 380)
            .frame(maxHeight: .infinity)
            .background(DistintoTokens.ColorToken.bgBase)
        }
    }

    private func submit() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }
        do {
            try await appState.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

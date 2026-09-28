import SwiftUI

/// Centered login card. Mirrors `app/app/login/_components/login-screen.tsx`
/// (email + password only, light brand background, official isotipo).
struct LoginView: View {
    @EnvironmentObject private var appState: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @FocusState private var focused: Field?

    private enum Field: Hashable {
        case email
        case password
    }

    var body: some View {
        ZStack {
            LoginBackground()
            card
                .frame(maxWidth: 448)
                .padding(32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var card: some View {
        VStack(spacing: 0) {
            IsotipoDistinto(size: 72)
                .padding(.bottom, 32)

            Text("Iniciar sesión")
                .font(.system(size: 10.5, weight: .semibold, design: .monospaced))
                .tracking(2.1)
                .textCase(.uppercase)
                .foregroundStyle(DistintoTokens.ColorToken.brandPurple)
                .padding(.bottom, 8)

            Text("Tu cuenta de equipo")
                .font(.system(size: 24, weight: .bold))
                .tracking(-0.24)
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                .padding(.bottom, 32)

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 12))
                    .foregroundStyle(Color(hex: 0x991B1B))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(hex: 0xEF4444).opacity(0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color(hex: 0xEF4444).opacity(0.20), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .padding(.bottom, 16)
            }

            VStack(spacing: 16) {
                field(
                    label: "Email",
                    placeholder: "tu@agenciadistinto.com",
                    text: $email,
                    secure: false,
                    field: .email,
                    submit: { focused = .password }
                )
                field(
                    label: "Contraseña",
                    placeholder: "••••••••",
                    text: $password,
                    secure: true,
                    field: .password,
                    submit: { Task { await submit() } }
                )
                submitButton
                    .padding(.top, 8)
            }

            Link("Soporte", destination: URL(string: "mailto:pedro@agenciadistinto.com")!)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(DistintoTokens.ColorToken.brandPurple)
                .buttonStyle(.plain)
                .padding(.top, 28)
        }
        .padding(.horizontal, 40)
        .padding(.vertical, 44)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.white.opacity(0.92))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Color.white.opacity(0.7), lineWidth: 1)
        )
        .shadow(color: DistintoTokens.ColorToken.brandPurple.opacity(0.18), radius: 24, y: 16)
        .shadow(color: Color.black.opacity(0.08), radius: 8, y: 4)
    }

    private var canSubmit: Bool {
        !isLoading && !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
    }

    private var submitButton: some View {
        Button {
            Task { await submit() }
        } label: {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .controlSize(.small)
                        .tint(.white)
                    Text("Entrando…")
                } else {
                    Text("Entrar →")
                }
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    stops: [
                        .init(color: DistintoTokens.ColorToken.brandPurple, location: 0),
                        .init(color: DistintoTokens.ColorToken.brandPink, location: 0.72),
                        .init(color: DistintoTokens.ColorToken.brandYellow, location: 1)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: DistintoTokens.ColorToken.brandPurple.opacity(0.28), radius: 12, y: 6)
            .opacity(canSubmit || isLoading ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!canSubmit)
    }

    private func field(
        label: String,
        placeholder: String,
        text: Binding<String>,
        secure: Bool,
        field: Field,
        submit: @escaping () -> Void
    ) -> some View {
        let active = focused == field
        return VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 10.5, weight: .medium, design: .monospaced))
                .tracking(1.8)
                .textCase(.uppercase)
                .foregroundStyle(Color(hex: 0x737373))
            loginField(text: text, placeholder: placeholder, secure: secure)
                .textFieldStyle(.plain)
                .font(.system(size: 14))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                .autocorrectionDisabled(true)
                .focused($focused, equals: field)
                .onSubmit(submit)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(active ? Color.white : Color(hex: 0xFAFAFA))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(active ? DistintoTokens.ColorToken.brandPurple : DistintoTokens.ColorToken.fieldBorder, lineWidth: 1)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(DistintoTokens.ColorToken.brandPurple.opacity(active ? 0.22 : 0), lineWidth: 3)
                        .padding(-3)
                )
        }
    }

    @ViewBuilder
    private func loginField(text: Binding<String>, placeholder: String, secure: Bool) -> some View {
        if secure {
            SecureField(placeholder, text: text)
        } else {
            TextField(placeholder, text: text)
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

private struct LoginBackground: View {
    @State private var drift = false

    var body: some View {
        ZStack {
            LinearGradient(
                stops: [
                    .init(color: DistintoTokens.ColorToken.brandPurple.opacity(0.10), location: 0),
                    .init(color: Color(hex: 0xFAFAFA), location: 0.40),
                    .init(color: Color.white, location: 0.60),
                    .init(color: DistintoTokens.ColorToken.brandYellow.opacity(0.16), location: 1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            blob(DistintoTokens.ColorToken.brandPurple.opacity(0.28), size: 480, x: -220, y: -180)
            blob(DistintoTokens.ColorToken.brandYellow.opacity(0.32), size: 420, x: 260, y: 200)
            blob(DistintoTokens.ColorToken.brandPurple.opacity(0.18), size: 340, x: 240, y: -200)
            blob(DistintoTokens.ColorToken.brandYellow.opacity(0.22), size: 300, x: -180, y: 220)
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 10).repeatForever(autoreverses: true)) {
                drift = true
            }
        }
    }

    private func blob(_ color: Color, size: CGFloat, x: CGFloat, y: CGFloat) -> some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .blur(radius: 72)
            .offset(x: x + (drift ? 16 : -10), y: y + (drift ? -12 : 8))
    }
}

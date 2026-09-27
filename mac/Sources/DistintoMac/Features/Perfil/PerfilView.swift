import SwiftUI

/// Mi perfil. Read-only session card plus sign-out. Device keys stay on the web.
struct PerfilView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                ModulePageHeader(
                    title: "Mi perfil",
                    subtitle: "Tu cuenta de Distinto",
                    loading: appState.perfilLoading,
                    onRefresh: { Task { await appState.reloadPerfil() } }
                )

                if let error = appState.perfilError, appState.perfil != nil {
                    ModuleErrorBanner(message: error) {
                        Task { await appState.reloadPerfil() }
                    }
                }

                content
            }
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 32)
            .padding(.vertical, 28)
        }
        .background(Color(hex: 0xFAFAFA))
        .task {
            if appState.perfil == nil {
                await appState.reloadPerfil()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if appState.perfil == nil {
            if let error = appState.perfilError, !appState.perfilLoading {
                ModuleErrorBanner(message: error) {
                    Task { await appState.reloadPerfil() }
                }
            } else {
                ModuleLoadingBlock(message: "Cargando perfil…")
            }
        } else if let perfil = appState.perfil?.perfil {
            identityCard(perfil)
            if !perfil.esEquipo {
                adminNote(perfil)
            }
            kairosCard
            signOutButton
        }
    }

    private func identityCard(_ perfil: PerfilUsuario) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 14) {
                UserAvatar(initial: String(perfil.nombreVisible.prefix(1)), size: 56)
                VStack(alignment: .leading, spacing: 2) {
                    Text(perfil.nombreVisible)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.ink)
                    Text(perfil.email ?? appState.session?.email ?? "")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
            }
            if let rol = perfil.rolVisible {
                field("Rol", rol)
            }
            if let cargo = perfil.cargo, !cargo.isEmpty {
                field("Cargo", cargo)
            }
            Text("Para cambiar nombre o foto, abre Perfil en la web.")
                .font(.system(size: DistintoTokens.Typography.xs))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
        }
        .padding(18)
        .distintoCard(radius: 16)
    }

    private func field(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            Text(value)
                .font(.system(size: DistintoTokens.Typography.base, weight: .medium))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
        }
    }

    private func adminNote(_ perfil: PerfilUsuario) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Estás logueado como \(perfil.email ?? "admin") pero no tienes un perfil de equipo asociado todavía.")
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(Color(hex: 0x5B21B6))
            Text("Como admin, tus datos viven en Supabase Auth. Si quieres un perfil editable, créate un miembro desde Mi equipo con tu mismo email.")
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(Color(hex: 0x5B21B6))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0xF5F3FF))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color(hex: 0xDDD6FE), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var kairosCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Kairos (macOS)")
                .font(.system(size: DistintoTokens.Typography.base, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
            Text("Las claves de dispositivo se crean y revocan en la web, en Perfil → Kairos.")
                .font(.system(size: DistintoTokens.Typography.sm))
                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            Button {
                openURL(AppConfig.webURL("/perfil"))
            } label: {
                Label("Abrir Perfil en la web", systemImage: "arrow.up.right")
                    .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .frame(height: 32)
                    .background(DistintoTokens.ColorToken.accent)
                    .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous))
            }
            .buttonStyle(.plain)
            .padding(.top, 4)
        }
        .padding(18)
        .distintoCard(radius: 16)
    }

    private var signOutButton: some View {
        Button {
            Task { await appState.signOut() }
        } label: {
            Label("Cerrar sesión", systemImage: "rectangle.portrait.and.arrow.right")
                .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                .foregroundStyle(Color(hex: 0xDC2626))
                .frame(maxWidth: .infinity)
                .frame(height: 36)
                .background(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color(hex: 0xFECACA), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.top, 4)
    }
}

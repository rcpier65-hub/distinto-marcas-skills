import SwiftUI

struct AppShellView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        HStack(spacing: 0) {
            SidebarView()
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DistintoTokens.ColorToken.bgBase)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch appState.selectedRoute {
        case .hoy:
            HoyView()
        case .inicio:
            PlaceholderModuleView(
                title: "Inicio",
                subtitle: "Fase 3 — dashboard nativo / web bridge."
            )
        case .tareas:
            PlaceholderModuleView(
                title: "Tareas",
                subtitle: "Fase 4 — tablero completo. Por ahora usá Hoy."
            )
        case .perfil:
            PlaceholderModuleView(
                title: "Perfil",
                subtitle: appState.session?.email ?? ""
            )
        }
    }
}

struct PlaceholderModuleView: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: DistintoTokens.Spacing.s3) {
            Text(title)
                .font(.system(size: DistintoTokens.Typography.xl, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
            Text(subtitle)
                .font(.system(size: DistintoTokens.Typography.base))
                .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            Spacer()
        }
        .padding(DistintoTokens.Spacing.s6)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            if appState.isBootstrapping {
                VStack(spacing: 16) {
                    IsotipoDistinto(size: 56)
                    Text("Cargando…")
                        .font(.system(size: DistintoTokens.Typography.sm))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DistintoTokens.ColorToken.bgBase)
            } else if appState.session == nil {
                LoginView()
            } else {
                AppShellView()
            }
        }
        .frame(minWidth: 1100, minHeight: 720)
        .preferredColorScheme(.light)
        .tint(DistintoTokens.ColorToken.accent)
    }
}

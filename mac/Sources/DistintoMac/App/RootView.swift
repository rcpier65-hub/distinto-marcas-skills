import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            if appState.isBootstrapping {
                ProgressView("Cargando…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(DistintoTokens.ColorToken.bgBase)
            } else if appState.session == nil {
                LoginView()
            } else {
                AppShellView()
            }
        }
        .preferredColorScheme(.light)
        .tint(DistintoTokens.ColorToken.accent)
    }
}

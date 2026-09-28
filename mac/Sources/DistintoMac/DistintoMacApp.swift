import SwiftUI

@main
@MainActor
struct DistintoMacApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
        .defaultSize(width: 1280, height: 820)
        .windowStyle(.automatic)
        .commands {
            CommandGroup(replacing: .newItem) {}
            CommandMenu("Ir") {
                Button("Buscar") {
                    appState.showPalette.toggle()
                }
                .keyboardShortcut("k", modifiers: .command)
                .disabled(appState.session == nil)

                Button("Inicio") {
                    appState.select(.inicio)
                }
                .keyboardShortcut("1", modifiers: .command)
                .disabled(appState.session == nil)

                Button("Tareas") {
                    appState.select(.tareas)
                }
                .keyboardShortcut("2", modifiers: .command)
                .disabled(appState.session == nil)

                Divider()

                Button("Actualizar tareas") {
                    Task { await appState.reloadTareas() }
                }
                .keyboardShortcut("r", modifiers: .command)
                .disabled(appState.session == nil)
            }
        }
    }
}

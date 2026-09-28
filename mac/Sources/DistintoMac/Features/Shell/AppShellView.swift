import SwiftUI

struct AppShellView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ZStack {
            HStack(spacing: 0) {
                SidebarView()
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(DistintoTokens.ColorToken.bgBase)
            }
            if appState.showPalette {
                CommandPaletteView()
            }
        }
        .task {
            await appState.reloadTareas()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch appState.selectedRoute {
        case .inicio:
            InicioView()
        case .tareas:
            TareasBoardView()
        case .perfil:
            PerfilView()
        case .soporte:
            SoporteListView()
        case .publicaciones:
            PublicacionesListView()
        case .calendario:
            CalendarioListView()
        case .reportes:
            ReportesListView()
        case .notas:
            NotasListView()
        case .oficina:
            OficinaBoardView()
        case .ideas:
            IdeasListView()
        case .planes:
            PlanesListView()
        case .editor:
            EditorListView()
        case .diseno:
            DisenoListView()
        case .historias:
            HistoriasListView()
        case .influencers:
            InfluencersListView()
        case .verMarcas:
            MarcasDashboardView()
        case .marca(let slug):
            GrillaListView(slug: slug)
                .id(slug)
        case .nuevaMarca:
            NuevaMarcaView()
        case .habitos:
            HabitosListView()
        case .actividad:
            ActividadListView()
        case .historial:
            HistorialListView()
        case .equipo:
            EquipoListView()
        case .settings:
            SettingsListView()
        }
    }
}

struct CommandPaletteView: View {
    @EnvironmentObject private var appState: AppState
    @State private var query = ""
    @FocusState private var focused: Bool

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.opacity(0.28)
                .ignoresSafeArea()
                .onTapGesture { appState.showPalette = false }

            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    TextField("Buscar en Distinto…", text: $query)
                        .textFieldStyle(.plain)
                        .font(.system(size: 15))
                        .focused($focused)
                        .onSubmit { openFirst() }
                        .onKeyPress(.escape) {
                            appState.showPalette = false
                            return .handled
                        }
                    KbdLabel(text: "esc")
                }
                .padding(.horizontal, 14)
                .frame(height: 48)

                Divider().overlay(DistintoTokens.ColorToken.borderSubtle)

                ScrollView {
                    if results.isEmpty {
                        Text("Sin resultados")
                            .font(.system(size: DistintoTokens.Typography.sm))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(16)
                    } else {
                        LazyVStack(alignment: .leading, spacing: 2) {
                            ForEach(ShellSection.allCases) { section in
                                let items = results.filter { $0.section == section }
                                if !items.isEmpty {
                                    Text(section.rawValue)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                                        .textCase(.uppercase)
                                        .tracking(0.8)
                                        .padding(.horizontal, 12)
                                        .padding(.top, 10)
                                        .padding(.bottom, 4)
                                    ForEach(items) { item in
                                        paletteRow(item)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 6)
                        .padding(.bottom, 8)
                    }
                }
                .frame(maxHeight: 360)
            }
            .frame(width: 520)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: Color.black.opacity(0.16), radius: 24, y: 12)
            .padding(.top, 72)
        }
        .onAppear { focused = true }
        .onExitCommand { appState.showPalette = false }
    }

    private var results: [ShellItem] {
        let items = appState.shellItems
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return items }
        return items.filter {
            $0.label.localizedStandardContains(trimmed) || $0.section.rawValue.localizedStandardContains(trimmed)
        }
    }

    private func paletteRow(_ item: ShellItem) -> some View {
        Button {
            appState.select(item.route)
        } label: {
            HStack(spacing: 8) {
                if let emoji = item.emoji {
                    Text(emoji).frame(width: 16)
                } else {
                    Image(systemName: item.systemImage)
                        .frame(width: 16)
                        .foregroundStyle(item.brandIcon ? DistintoTokens.ColorToken.brandPurple : DistintoTokens.ColorToken.textSecondary)
                }
                Text(item.label)
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Spacer()
                if let shortcut = item.shortcut {
                    KbdLabel(text: shortcut)
                }
            }
            .font(.system(size: DistintoTokens.Typography.sm))
            .padding(.horizontal, 10)
            .frame(height: 32)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func openFirst() {
        guard let first = results.first else { return }
        appState.select(first.route)
    }
}

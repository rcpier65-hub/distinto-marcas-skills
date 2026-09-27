import SwiftUI

struct SidebarView: View {
    @EnvironmentObject private var appState: AppState

    private struct Item: Identifiable {
        let id: AppState.Route
        let label: String
        let systemImage: String
    }

    private let workspace: [Item] = [
        .init(id: .hoy, label: "Hoy", systemImage: "sun.max"),
        .init(id: .inicio, label: "Inicio", systemImage: "house"),
        .init(id: .tareas, label: "Tareas", systemImage: "checklist")
    ]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm)
                    .fill(Color.white)
                    .frame(width: 22, height: 22)
                    .overlay(
                        Text("D")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(DistintoTokens.ColorToken.brandPurple)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm)
                            .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
                    )
                Text("Distinto")
                    .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .overlay(alignment: .bottom) {
                DistintoTokens.ColorToken.borderSubtle.frame(height: 1)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    sectionLabel("Workspace")
                    ForEach(workspace) { item in
                        navRow(item)
                    }
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 8)
            }

            Spacer(minLength: 0)

            HStack(spacing: 8) {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: 0xFF8A4C), Color(hex: 0xFF5252)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 22, height: 22)
                    .overlay(
                        Text(String(appState.session?.email.prefix(1).uppercased() ?? "?"))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.white)
                    )
                VStack(alignment: .leading, spacing: 1) {
                    Text(appState.session?.email.split(separator: "@").first.map(String.init) ?? "Usuario")
                        .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        .lineLimit(1)
                    Text(appState.session?.email ?? "")
                        .font(.system(size: DistintoTokens.Typography.xs))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                Button {
                    Task { await appState.signOut() }
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 12))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Cerrar sesión")
            }
            .padding(8)
            .overlay(alignment: .top) {
                DistintoTokens.ColorToken.borderSubtle.frame(height: 1)
            }
        }
        .frame(width: DistintoTokens.Layout.sidebarWidth)
        .background(DistintoTokens.ColorToken.bgElevated)
        .overlay(alignment: .trailing) {
            DistintoTokens.ColorToken.borderSubtle.frame(width: 1)
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            .textCase(.uppercase)
            .tracking(0.8)
            .padding(.horizontal, 8)
            .padding(.top, 6)
            .padding(.bottom, 4)
    }

    private func navRow(_ item: Item) -> some View {
        let active = appState.selectedRoute == item.id
        return Button {
            appState.selectedRoute = item.id
        } label: {
            HStack(spacing: 8) {
                Image(systemName: item.systemImage)
                    .font(.system(size: 12))
                    .frame(width: 16)
                Text(item.label)
                    .font(.system(
                        size: DistintoTokens.Typography.sm,
                        weight: active ? .medium : .regular
                    ))
                Spacer()
            }
            .foregroundStyle(active ? DistintoTokens.ColorToken.textPrimary : DistintoTokens.ColorToken.textSecondary)
            .padding(.horizontal, 8)
            .frame(height: DistintoTokens.Layout.rowHeightCompact)
            .background(active ? DistintoTokens.ColorToken.bgSelected : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md))
            .overlay(alignment: .leading) {
                if active {
                    Capsule()
                        .fill(DistintoTokens.ColorToken.accent)
                        .frame(width: 2, height: 16)
                        .offset(x: -4)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

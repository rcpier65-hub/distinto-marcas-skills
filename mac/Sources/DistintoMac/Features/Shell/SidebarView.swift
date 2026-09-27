import SwiftUI

/// Light sidebar. Section order matches `app/components/layout/Sidebar.tsx`.
struct SidebarView: View {
    @EnvironmentObject private var appState: AppState
    @AppStorage("mk.sidebar.workspace") private var workspaceOpen = true
    @AppStorage("mk.sidebar.marcas") private var marcasOpen = true
    @AppStorage("mk.sidebar.personal") private var personalOpen = true

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    section(.workspace, open: $workspaceOpen)
                    section(.marcas, open: $marcasOpen)
                    section(.personal, open: $personalOpen)
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 8)
            }
            footer
        }
        .task {
            await appState.reloadPerfil()
        }
        .frame(width: DistintoTokens.Layout.sidebarWidth)
        .background(DistintoTokens.ColorToken.bgElevated)
        .overlay(alignment: .trailing) {
            DistintoTokens.ColorToken.borderSubtle.frame(width: 1)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            brandButton
            searchButton
                .padding(.top, 6)
        }
        .padding(.horizontal, 12)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .overlay(alignment: .bottom) {
            DistintoTokens.ColorToken.borderSubtle.frame(height: 1)
        }
    }

    private var brandButton: some View {
        HStack(spacing: 8) {
            IsotipoDistinto(size: 16)
                .frame(width: 22, height: 22)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm, style: .continuous)
                        .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
                )
                .shadow(color: DistintoTokens.ColorToken.brandPurple.opacity(0.18), radius: 4)
            Text("Distinto")
                .font(.system(size: DistintoTokens.Typography.sm, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
            Spacer(minLength: 0)
            Image(systemName: "chevron.up.chevron.down")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .contentShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md))
    }

    private var searchButton: some View {
        Button {
            appState.showPalette = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11, weight: .medium))
                Text("Buscar…")
                    .frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: 2) {
                    KbdLabel(text: "⌘")
                    KbdLabel(text: "K")
                }
            }
            .font(.system(size: DistintoTokens.Typography.xs))
            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous)
                    .stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous))
        }
        .buttonStyle(.plain)
        .help("Buscar")
    }

    private var footer: some View {
        HStack(spacing: 4) {
            Button {
                appState.select(.perfil)
            } label: {
                HStack(spacing: 8) {
                    avatar
                    VStack(alignment: .leading, spacing: 1) {
                        Text(appState.session?.displayName ?? "Usuario")
                            .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                            .lineLimit(1)
                        Text(appState.session?.email ?? "")
                            .font(.system(size: DistintoTokens.Typography.xs))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous)
                        .fill(appState.selectedRoute == .perfil ? DistintoTokens.ColorToken.bgSelected : Color.clear)
                )
                .contentShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.md))
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity, alignment: .leading)
            .help("Perfil")

            Button {
                Task { await appState.signOut() }
            } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .frame(width: 32, height: 32)
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

    private var avatar: some View {
        UserAvatar(initial: appState.session?.initial ?? "?", size: 22)
    }

    @ViewBuilder
    private func section(_ section: ShellSection, open: Binding<Bool>) -> some View {
        let items = appState.shellItems.filter { $0.section == section }
        let brandCount = items.reduce(0) { count, item in
            if case .marca = item.route { return count + 1 }
            return count
        }
        if !items.isEmpty {
            sectionBlock(section, items: items, open: open, count: section == .marcas ? brandCount : nil)
        }
    }

    private func sectionBlock(
        _ section: ShellSection,
        items: [ShellItem],
        open: Binding<Bool>,
        count: Int?
    ) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Button {
                withAnimation(.easeOut(duration: 0.15)) {
                    open.wrappedValue.toggle()
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 8, weight: .bold))
                        .rotationEffect(.degrees(open.wrappedValue ? 90 : 0))
                    Text(headerTitle(section, count: count))
                    Spacer(minLength: 0)
                }
                .font(.system(size: DistintoTokens.Typography.xs, weight: .medium))
                .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                .textCase(.uppercase)
                .tracking(0.9)
                .padding(.horizontal, 8)
                .padding(.top, 6)
                .padding(.bottom, 4)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if open.wrappedValue {
                ForEach(items) { item in
                    SidebarNavRow(
                        item: item,
                        active: appState.selectedRoute == item.route
                    ) {
                        appState.select(item.route)
                    }
                }
            }
        }
        .padding(.bottom, 8)
    }

    private func headerTitle(_ section: ShellSection, count: Int?) -> String {
        if let count {
            return "\(section.rawValue) · \(count)"
        }
        return section.rawValue
    }
}

struct SidebarNavRow: View {
    let item: ShellItem
    let active: Bool
    let action: () -> Void
    @State private var hover = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                icon
                    .frame(width: 16, height: 16)
                Text(item.label)
                    .font(.system(
                        size: DistintoTokens.Typography.sm,
                        weight: active ? .medium : .regular
                    ))
                    .lineLimit(1)
                Spacer(minLength: 4)
                if let shortcut = item.shortcut {
                    KbdLabel(text: shortcut)
                        .opacity(0.6)
                }
            }
            .foregroundStyle(rowColor)
            .padding(.leading, item.indent ? 24 : 8)
            .padding(.trailing, 8)
            .frame(height: DistintoTokens.Layout.rowHeightCompact)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: DistintoTokens.Radius.md, style: .continuous)
                    .fill(fill)
            )
            .overlay(alignment: .leading) {
                if active {
                    Capsule()
                        .fill(DistintoTokens.ColorToken.accent)
                        .frame(width: 2, height: 16)
                        .shadow(color: DistintoTokens.ColorToken.accentGlow, radius: 3)
                        .offset(x: -6)
                }
            }
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
    }

    @ViewBuilder
    private var icon: some View {
        if let emoji = item.emoji {
            Text(emoji)
                .font(.system(size: 12))
        } else if item.brandIcon {
            Text("+")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.brandPurple)
        } else {
            Image(systemName: item.systemImage)
                .font(.system(size: 12))
        }
    }

    private var rowColor: Color {
        if active { return DistintoTokens.ColorToken.textPrimary }
        if item.indent { return DistintoTokens.ColorToken.textTertiary }
        return DistintoTokens.ColorToken.textSecondary
    }

    private var fill: Color {
        if active { return DistintoTokens.ColorToken.bgSelected }
        if hover { return DistintoTokens.ColorToken.bgHover }
        return .clear
    }
}

struct KbdLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 10.5, weight: .medium, design: .monospaced))
            .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
            .frame(minWidth: 18, minHeight: 18)
            .padding(.horizontal, 4)
            .background(Color.white.opacity(0.85))
            .overlay(
                RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm, style: .continuous)
                    .stroke(DistintoTokens.ColorToken.borderDefault, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DistintoTokens.Radius.sm, style: .continuous))
    }
}

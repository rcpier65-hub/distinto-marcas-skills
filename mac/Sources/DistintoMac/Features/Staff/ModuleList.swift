import SwiftUI

struct ModuleScreen<Content: View>: View {
    let title: String
    let subtitle: String
    let webPath: String
    let webLabel: String
    let loading: Bool
    let error: String?
    let loaded: Bool
    let loadingMessage: String
    let onRefresh: () -> Void
    @ViewBuilder var content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(title)
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        Text(subtitle)
                            .font(.system(size: DistintoTokens.Typography.sm))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    }
                    Spacer(minLength: 8)
                    WebHandoffButton(title: webLabel, path: webPath)
                    ModuleRefreshButton(loading: loading, action: onRefresh)
                }
                if let error, loaded {
                    ModuleErrorBanner(message: error, onRetry: onRefresh)
                }
                if loaded {
                    content()
                } else if let error, !loading {
                    ModuleErrorBanner(message: error, onRetry: onRefresh)
                } else {
                    ModuleLoadingBlock(message: loadingMessage)
                }
            }
            .frame(maxWidth: 860, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
        }
        .background(DistintoTokens.ColorToken.bgBase)
    }
}

struct ModuleRowButton: View {
    let title: String
    var detail: String?
    var trailing: String?
    var emoji: String?
    var chip: String?
    var chipColor: Color = DistintoTokens.ColorToken.textSecondary
    let action: () -> Void
    @State private var hover = false

    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: 10) {
                if let emoji {
                    Text(emoji)
                        .font(.system(size: 16))
                        .frame(width: 22)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: DistintoTokens.Typography.sm, weight: .medium))
                        .foregroundStyle(DistintoTokens.ColorToken.textPrimary)
                        .lineLimit(1)
                    if let detail, !detail.isEmpty {
                        Text(detail)
                            .font(.system(size: DistintoTokens.Typography.xs))
                            .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            .lineLimit(2)
                    }
                }
                Spacer(minLength: 8)
                if let chip {
                    StatusChip(label: chip, color: chipColor)
                }
                if let trailing {
                    Text(trailing)
                        .font(.system(size: DistintoTokens.Typography.xs))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textQuaternary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(hover ? DistintoTokens.ColorToken.bgHover : Color.white)
            .distintoCard(radius: 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
    }
}

enum StaffChip {
    static func estado(_ value: String) -> (String, Color) {
        switch value {
        case "editar", "en_progreso":
            return ("En curso", Color(hex: 0x7C3AED))
        case "aprobar":
            return ("Aprobar", Color(hex: 0xD97706))
        case "programar":
            return ("Programar", Color(hex: 0x2563EB))
        case "publicar":
            return ("Publicar", Color(hex: 0x0891B2))
        case "publicado", "listo", "enviado":
            return ("Listo", Color(hex: 0x16A34A))
        case "archivado", "pausada":
            return ("Pausada", Color(hex: 0x6B7280))
        case "sin_empezar":
            return ("Sin empezar", DistintoTokens.ColorToken.textSecondary)
        case "pedido_enviado":
            return ("Pedido enviado", Color(hex: 0xD97706))
        case "pedido_entregado":
            return ("Entregado", Color(hex: 0x2563EB))
        case "video_enviado":
            return ("Video enviado", Color(hex: 0x16A34A))
        case "planificada":
            return ("Planificada", Color(hex: 0x7C3AED))
        default:
            return (value.replacingOccurrences(of: "_", with: " "), DistintoTokens.ColorToken.textSecondary)
        }
    }
}

import SwiftUI

/// Design tokens mirrored from web `app/app/globals.css` (`--mk-*`, light-first).
enum DistintoTokens {
    enum ColorToken {
        static let bgBase = Color(hex: 0xFFFFFF)
        static let bgElevated = Color(hex: 0xFAFAFA)
        static let bgOverlay = Color(hex: 0xFFFFFF)
        static let bgHover = Color.black.opacity(0.035)
        static let bgActive = Color.black.opacity(0.055)
        static let bgSelected = Color(hex: 0x7170FF).opacity(0.08)

        static let borderSubtle = Color.black.opacity(0.06)
        static let borderDefault = Color.black.opacity(0.10)
        static let borderStrong = Color.black.opacity(0.16)
        static let borderAccent = Color(hex: 0x7170FF).opacity(0.45)

        static let textPrimary = Color(hex: 0x0A0A0A)
        static let textSecondary = Color(hex: 0x0A0A0A).opacity(0.65)
        static let textTertiary = Color(hex: 0x0A0A0A).opacity(0.48)
        static let textQuaternary = Color(hex: 0x0A0A0A).opacity(0.30)

        static let accent = Color(hex: 0x7170FF)
        static let accentHover = Color(hex: 0x8A89FF)
        static let accentBg = Color(hex: 0x7170FF).opacity(0.10)
        static let accentGlow = Color(hex: 0x7170FF).opacity(0.20)

        static let success = Color(hex: 0x4CB782)
        static let warning = Color(hex: 0xF2C94C)
        static let danger = Color(hex: 0xEB5757)
        static let info = Color(hex: 0x5E6AD2)

        /// Brand purple / yellow from the Distinto manual (isotipo + login).
        static let brandPurple = Color(hex: 0xBA41F7)
        static let brandYellow = Color(hex: 0xF2CC2C)
        static let brandPink = Color(hex: 0xD966F7)

        static let cardBorder = Color(hex: 0xF1F1F3)
        static let fieldBorder = Color(hex: 0xE7E5E0)
        static let ink = Color(hex: 0x111827)
    }

    enum Typography {
        static let xs: CGFloat = 11
        static let sm: CGFloat = 13
        static let base: CGFloat = 14
        static let lg: CGFloat = 16
        static let xl: CGFloat = 22
        static let xxl: CGFloat = 28
    }

    enum Spacing {
        static let s1: CGFloat = 4
        static let s2: CGFloat = 8
        static let s3: CGFloat = 12
        static let s4: CGFloat = 16
        static let s5: CGFloat = 20
        static let s6: CGFloat = 24
        static let s8: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 4
        static let md: CGFloat = 6
        static let lg: CGFloat = 8
        static let xl: CGFloat = 12
    }

    enum Layout {
        static let sidebarWidth: CGFloat = 240
        static let rowHeight: CGFloat = 36
        static let rowHeightCompact: CGFloat = 28
        static let headerHeight: CGFloat = 44
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}

extension View {
    /// White surface used by Inicio task groups (`cardStyle` on the web).
    func distintoCard(radius: CGFloat = 14) -> some View {
        background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(DistintoTokens.ColorToken.cardBorder, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 1, y: 1)
    }
}

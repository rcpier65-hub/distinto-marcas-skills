import SwiftUI

/// Segmented control in the ink/white language of the web toolbars.
struct ViewModeBar: View {
    let titles: [String]
    let selection: String
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(titles, id: \.self) { title in
                let active = selection == title
                Button {
                    onSelect(title)
                } label: {
                    Text(title)
                        .font(.system(size: 12, weight: active ? .semibold : .medium))
                        .foregroundStyle(active ? Color.white : DistintoTokens.ColorToken.textSecondary)
                        .padding(.horizontal, 12)
                        .frame(height: 28)
                        .background(active ? DistintoTokens.ColorToken.ink : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Color(hex: 0xF3F4F6))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

struct DistintoMonthGrid<Cell: View>: View {
    let weeks: [[LimaFormat.MonthCell]]
    let hoy: String
    let cell: (LimaFormat.MonthCell) -> Cell

    private let labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(labels, id: \.self) { label in
                    Text(label)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
            }
            .background(Color(hex: 0xF8F8FA))
            ForEach(weeks, id: \.self) { week in
                HStack(alignment: .top, spacing: 0) {
                    ForEach(week) { day in
                        cell(day)
                            .frame(maxWidth: .infinity, minHeight: 108, alignment: .topLeading)
                            .background(dayBackground(day))
                            .overlay(alignment: .top) {
                                Rectangle()
                                    .fill(DistintoTokens.ColorToken.borderSubtle)
                                    .frame(height: 1)
                            }
                            .overlay(alignment: .leading) {
                                Rectangle()
                                    .fill(DistintoTokens.ColorToken.borderSubtle)
                                    .frame(width: 1)
                            }
                    }
                }
            }
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(DistintoTokens.ColorToken.cardBorder, lineWidth: 1)
        )
    }

    private func dayBackground(_ day: LimaFormat.MonthCell) -> Color {
        if day.ymd == hoy { return DistintoTokens.ColorToken.accent.opacity(0.06) }
        if !day.inMonth { return Color(hex: 0xFAFAFA) }
        return Color.white
    }
}

struct DistintoWeekBoard<Column: View>: View {
    let days: [String]
    let hoy: String
    let column: (String) -> Column

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(days, id: \.self) { day in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Text(LimaFormat.weekdayShort(day))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(day == hoy ? DistintoTokens.ColorToken.accent : DistintoTokens.ColorToken.textTertiary)
                        Text(LimaFormat.dayOfMonth(day))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(day == hoy ? .white : DistintoTokens.ColorToken.textPrimary)
                            .frame(width: 28, height: 28)
                            .background(day == hoy ? DistintoTokens.ColorToken.accent : Color.clear)
                            .clipShape(Circle())
                    }
                    column(day)
                    Spacer(minLength: 0)
                }
                .padding(8)
                .frame(maxWidth: .infinity, minHeight: 420, alignment: .topLeading)
                .background(day == hoy ? DistintoTokens.ColorToken.accent.opacity(0.05) : Color(hex: 0xF7F7F8))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }
}

struct KanbanLane<Content: View>: View {
    let title: String
    let tint: Color
    let count: Int
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Circle().fill(tint).frame(width: 8, height: 8)
                Text(title)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text("\(count)")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1)
                    .background(Color.white)
                    .clipShape(Capsule())
            }
            content()
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(width: 240, alignment: .topLeading)
        .background(Color(hex: 0xF4F4F6))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct DayNumberLabel: View {
    let day: LimaFormat.MonthCell
    let hoy: String

    var body: some View {
        Text(LimaFormat.dayOfMonth(day.ymd))
            .font(.system(size: 12, weight: day.ymd == hoy ? .bold : .medium))
            .foregroundStyle(foreground)
            .frame(width: 22, height: 22)
            .background(day.ymd == hoy ? DistintoTokens.ColorToken.accent : Color.clear)
            .clipShape(Circle())
    }

    private var foreground: Color {
        if day.ymd == hoy { return .white }
        if day.inMonth { return DistintoTokens.ColorToken.textPrimary }
        return DistintoTokens.ColorToken.textQuaternary
    }
}

import SwiftUI

enum TareaBucket: String, CaseIterable, Identifiable {
    case atrasadas
    case hoy
    case sinFecha

    var id: String { rawValue }

    var title: String {
        switch self {
        case .atrasadas: return "Atrasadas"
        case .hoy: return "Hoy"
        case .sinFecha: return "Sin fecha"
        }
    }
}

struct TareaCategoryGroup: Identifiable {
    let name: String
    let items: [TareaHoy]
    var id: String { name }
}

struct TareaBucketSection: Identifiable {
    let bucket: TareaBucket
    let groups: [TareaCategoryGroup]
    var id: String { bucket.rawValue }
    var count: Int { groups.reduce(0) { $0 + $1.items.count } }
}

struct TareaColumn: Identifiable {
    let name: String
    let items: [TareaHoy]
    var id: String { name }
}

enum TareaOrganizer {
    static func sections(from tareas: [TareaHoy], fecha: String) -> [TareaBucketSection] {
        let grouped = Dictionary(grouping: tareas) { bucket(of: $0, fecha: fecha) }
        return TareaBucket.allCases.compactMap { bucket in
            let items = grouped[bucket] ?? []
            guard !items.isEmpty else { return nil }
            return TareaBucketSection(bucket: bucket, groups: categoryGroups(from: items))
        }
    }

    static func columns(from tareas: [TareaHoy]) -> [TareaColumn] {
        let grouped = Dictionary(grouping: tareas, by: \.columna)
        return grouped.keys.sorted(by: nameSort).map { name in
            TareaColumn(name: name, items: (grouped[name] ?? []).sorted(by: tareaSort))
        }
    }

    static func bucket(of tarea: TareaHoy, fecha: String) -> TareaBucket {
        guard let due = tarea.due else { return .sinFecha }
        if due < fecha { return .atrasadas }
        return .hoy
    }

    static func dueText(_ tarea: TareaHoy, fecha: String) -> String {
        guard let due = tarea.due else { return "Sin fecha" }
        if due < fecha { return "Atrasada · \(LimaFormat.shortDate(due))" }
        if due == fecha { return "Hoy" }
        return LimaFormat.shortDate(due)
    }

    static func isOverdue(_ tarea: TareaHoy, fecha: String) -> Bool {
        guard let due = tarea.due else { return false }
        return due < fecha
    }

    private static func categoryGroups(from items: [TareaHoy]) -> [TareaCategoryGroup] {
        let grouped = Dictionary(grouping: items, by: \.columna)
        return grouped.keys.sorted(by: nameSort).map { name in
            TareaCategoryGroup(name: name, items: (grouped[name] ?? []).sorted(by: tareaSort))
        }
    }

    private static func tareaSort(_ lhs: TareaHoy, _ rhs: TareaHoy) -> Bool {
        let leftPriority = lhs.prioridad ?? 99
        let rightPriority = rhs.prioridad ?? 99
        if leftPriority != rightPriority { return leftPriority < rightPriority }
        if let left = lhs.due, let right = rhs.due, left != right {
            return left < right
        }
        if lhs.due == nil, rhs.due != nil { return false }
        if lhs.due != nil, rhs.due == nil { return true }
        return lhs.titulo.localizedCaseInsensitiveCompare(rhs.titulo) == .orderedAscending
    }

    private static func nameSort(_ lhs: String, _ rhs: String) -> Bool {
        let left = nameRank(lhs)
        let right = nameRank(rhs)
        if left != right { return left < right }
        return lhs.localizedCaseInsensitiveCompare(rhs) == .orderedAscending
    }

    private static func nameRank(_ name: String) -> Int {
        switch name {
        case "Urgente": return 0
        case "Inbox": return 2
        case "General": return 3
        default: return 1
        }
    }
}

enum TareaStatusMark: Equatable {
    case pendiente
    case enProceso
    case completada
    case otro

    init(status: String) {
        switch status {
        case "pendiente": self = .pendiente
        case "en_proceso": self = .enProceso
        case "completada": self = .completada
        default: self = .otro
        }
    }

    var systemImage: String {
        switch self {
        case .pendiente: return "circle"
        case .enProceso: return "circle.lefthalf.filled"
        case .completada: return "checkmark.circle.fill"
        case .otro: return "circle"
        }
    }

    var tint: Color {
        switch self {
        case .pendiente, .otro: return DistintoTokens.ColorToken.textQuaternary
        case .enProceso: return DistintoTokens.ColorToken.accent
        case .completada: return DistintoTokens.ColorToken.success
        }
    }
}

enum TareaPalette {
    static func solid(for name: String) -> Color {
        Color(hex: solids[Int(hash(name) % UInt32(solids.count))])
    }

    static func chip(for name: String) -> Chip {
        if let known = knownChips[name] { return known }
        let color = solid(for: name)
        return Chip(background: color.opacity(0.12), foreground: color, border: color.opacity(0.28))
    }

    struct Chip {
        let background: Color
        let foreground: Color
        let border: Color
    }

    private static let solids: [UInt32] = [
        0xE91E8C, 0xE8952F, 0x5BC0EB, 0x43A047, 0x8E24AA,
        0xF4511E, 0x00897B, 0x3949AB, 0xC0CA33, 0xD81B60,
        0x039BE5, 0x6D4C41, 0xFFB300, 0x00ACC1, 0x7CB342,
        0x5E35B1, 0xFF5252, 0x546E7A
    ]

    private static let knownChips: [String: Chip] = [
        "Diseño": Chip(background: Color(hex: 0xFDF2F8), foreground: Color(hex: 0x9D174D), border: Color(hex: 0xFBCFE8)),
        "Edición": Chip(background: Color(hex: 0xF5F3FF), foreground: Color(hex: 0x5B21B6), border: Color(hex: 0xDDD6FE)),
        "Comunicación": Chip(background: Color(hex: 0xF0FDF4), foreground: Color(hex: 0x166534), border: Color(hex: 0xBBF7D0)),
        "Investigación": Chip(background: Color(hex: 0xEFF6FF), foreground: Color(hex: 0x1E40AF), border: Color(hex: 0xBFDBFE)),
        "Personal": Chip(background: Color(hex: 0xFFFBEB), foreground: Color(hex: 0x92400E), border: Color(hex: 0xFDE68A)),
        "Urgente": Chip(background: Color(hex: 0xFEF2F2), foreground: Color(hex: 0x991B1B), border: Color(hex: 0xFECACA)),
        "Administrativo": Chip(background: Color(hex: 0xF0F9FF), foreground: Color(hex: 0x075985), border: Color(hex: 0xBAE6FD)),
        "Otro": Chip(background: Color(hex: 0xF9FAFB), foreground: Color(hex: 0x374151), border: Color(hex: 0xE5E7EB))
    ]

    static func priorityColor(_ prioridad: Int) -> Color {
        switch prioridad {
        case 1: return Color(hex: 0xEF4444)
        case 2: return Color(hex: 0xF59E0B)
        case 3: return Color(hex: 0xD1D5DB)
        default: return Color(hex: 0xD1D5DB)
        }
    }

    private static func hash(_ value: String) -> UInt32 {
        var hash: UInt32 = 2_166_136_261
        for byte in value.lowercased().utf8 {
            hash ^= UInt32(byte)
            hash = hash &* 16_777_619
        }
        return hash
    }
}

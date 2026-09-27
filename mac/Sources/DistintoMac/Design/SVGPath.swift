import SwiftUI

/// Minimal SVG path parser for the Distinto isotipo (`M/L/H/V/C/S/Z`, absolute and relative).
/// Arcs and quadratics are unused by `isotipo-distinto.tsx`.
enum SVGPath {
    static func path(from d: String) -> Path {
        let tokens = tokenize(d)
        var path = Path()
        var index = 0
        var command: Character = "M"
        var cx: CGFloat = 0
        var cy: CGFloat = 0
        var sx: CGFloat = 0
        var sy: CGFloat = 0
        var previous: Character = " "
        var lastControl: CGPoint?

        func isCommand(at position: Int) -> Bool {
            guard position < tokens.count else { return false }
            if case .command = tokens[position] { return true }
            return false
        }

        func number() -> CGFloat? {
            guard index < tokens.count, case .number(let value) = tokens[index] else { return nil }
            index += 1
            return value
        }

        while index < tokens.count {
            if case .command(let next) = tokens[index] {
                command = next
                index += 1
            } else if command == "M" {
                command = "L"
            } else if command == "m" {
                command = "l"
            }

            let relative = command.isLowercase
            guard let kind = DrawCommand(command) else { break }

            switch kind {
            case .move:
                guard let rawX = number(), let rawY = number() else { return path }
                cx = relative ? cx + rawX : rawX
                cy = relative ? cy + rawY : rawY
                sx = cx
                sy = cy
                path.move(to: CGPoint(x: cx, y: cy))
                lastControl = nil
                while index < tokens.count, !isCommand(at: index) {
                    guard let extraX = number(), let extraY = number() else { return path }
                    cx = relative ? cx + extraX : extraX
                    cy = relative ? cy + extraY : extraY
                    path.addLine(to: CGPoint(x: cx, y: cy))
                }
            case .line:
                guard let rawX = number(), let rawY = number() else { return path }
                cx = relative ? cx + rawX : rawX
                cy = relative ? cy + rawY : rawY
                path.addLine(to: CGPoint(x: cx, y: cy))
                lastControl = nil
            case .horizontal:
                guard let rawX = number() else { return path }
                cx = relative ? cx + rawX : rawX
                path.addLine(to: CGPoint(x: cx, y: cy))
                lastControl = nil
            case .vertical:
                guard let rawY = number() else { return path }
                cy = relative ? cy + rawY : rawY
                path.addLine(to: CGPoint(x: cx, y: cy))
                lastControl = nil
            case .cubic:
                guard
                    let x1 = number(), let y1 = number(),
                    let x2 = number(), let y2 = number(),
                    let x = number(), let y = number()
                else { return path }
                let c1 = CGPoint(x: relative ? cx + x1 : x1, y: relative ? cy + y1 : y1)
                let c2 = CGPoint(x: relative ? cx + x2 : x2, y: relative ? cy + y2 : y2)
                let end = CGPoint(x: relative ? cx + x : x, y: relative ? cy + y : y)
                path.addCurve(to: end, control1: c1, control2: c2)
                lastControl = c2
                cx = end.x
                cy = end.y
            case .smooth:
                guard
                    let x2 = number(), let y2 = number(),
                    let x = number(), let y = number()
                else { return path }
                let c2 = CGPoint(x: relative ? cx + x2 : x2, y: relative ? cy + y2 : y2)
                let end = CGPoint(x: relative ? cx + x : x, y: relative ? cy + y : y)
                let c1: CGPoint
                if let lastControl, "CcSs".contains(previous) {
                    c1 = CGPoint(x: (2 * cx) - lastControl.x, y: (2 * cy) - lastControl.y)
                } else {
                    c1 = CGPoint(x: cx, y: cy)
                }
                path.addCurve(to: end, control1: c1, control2: c2)
                lastControl = c2
                cx = end.x
                cy = end.y
            case .close:
                path.closeSubpath()
                cx = sx
                cy = sy
                lastControl = nil
            }
            previous = command
        }
        return path
    }

    private enum DrawCommand {
        case move
        case line
        case horizontal
        case vertical
        case cubic
        case smooth
        case close

        init?(_ command: Character) {
            switch String(command).uppercased() {
            case "M": self = .move
            case "L": self = .line
            case "H": self = .horizontal
            case "V": self = .vertical
            case "C": self = .cubic
            case "S": self = .smooth
            case "Z": self = .close
            default: return nil
            }
        }
    }

    private enum Token {
        case command(Character)
        case number(CGFloat)
    }

    private static func tokenize(_ source: String) -> [Token] {
        var tokens: [Token] = []
        let chars = Array(source)
        var index = 0

        while index < chars.count {
            let character = chars[index]
            if character.isLetter {
                tokens.append(.command(character))
                index += 1
                continue
            }
            if character == "," || character.isWhitespace {
                index += 1
                continue
            }
            if character == "-" || character == "+" || character == "." || character.isNumber {
                let start = index
                if character == "-" || character == "+" { index += 1 }
                var sawDot = false
                while index < chars.count {
                    let next = chars[index]
                    if next.isNumber {
                        index += 1
                        continue
                    }
                    if next == ".", !sawDot {
                        sawDot = true
                        index += 1
                        continue
                    }
                    break
                }
                if index < chars.count, chars[index] == "e" || chars[index] == "E" {
                    index += 1
                    if index < chars.count, chars[index] == "-" || chars[index] == "+" { index += 1 }
                    while index < chars.count, chars[index].isNumber { index += 1 }
                }
                let slice = String(chars[start..<index])
                if let value = Double(slice) {
                    tokens.append(.number(CGFloat(value)))
                }
                continue
            }
            index += 1
        }
        return tokens
    }
}

import SwiftUI

/// Official Distinto mark. Paths match `app/components/brand/isotipo-distinto.tsx`
/// (viewBox `280 420 480 240`, yellow petal + purple petal).
struct IsotipoDistinto: View {
    var size: CGFloat = 24

    var body: some View {
        Canvas { context, canvasSize in
            let viewBox = CGRect(x: 280, y: 420, width: 480, height: 240)
            let scale = min(canvasSize.width / viewBox.width, canvasSize.height / viewBox.height)
            let dx = (canvasSize.width - viewBox.width * scale) / 2
            let dy = (canvasSize.height - viewBox.height * scale) / 2
            context.translateBy(x: dx, y: dy)
            context.scaleBy(x: scale, y: scale)
            context.translateBy(x: -viewBox.minX, y: -viewBox.minY)
            context.fill(Self.yellow, with: .color(DistintoTokens.ColorToken.brandYellow))
            context.fill(Self.purple, with: .color(DistintoTokens.ColorToken.brandPurple))
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Distinto")
    }

    private static let yellow = SVGPath.path(from: """
    M639.28,439.86c15.32,0,30.24,3.33,43.14,9.62l3,1.45h.06c17.1,8.49,31.61,21.38,42.1,37.44,\
    11.33,17.34,17.31,37.52,17.31,58.35,0,36.23-18.13,69.51-47.97,89.2-24.33-29.33-62.6-47.13-\
    102.67-47.13-17.35,0-34.36,3.43-49.83,9.98-9.11-16.09-13.7-35.42-13.06-55.5.77-23.89,8.86-\
    46.22,22.79-62.86l3.34-4.02v-.18c19.06-22.53,49.94-36.36,81.79-36.36M639.28,425.54c-37,0-\
    74.18,16.76-96.11,45.66v.03c-32.99,39.42-35.14,103.19-4.56,144.92.29.39.74.6,1.19.6.25,0,\
    .5-.06.73-.19,16.72-9.14,35.24-13.43,53.74-13.43,38.38,0,76.58,18.49,98.03,50.51.29.43.76.67,\
    1.25.67.23,0,.46-.05.68-.17,38.64-20.27,65-60.75,65-107.41s-28.88-90.92-70.49-110.12h-.03\
    c-15.44-7.53-32.41-11.08-49.42-11.08h0Z
    """)

    private static let purple = SVGPath.path(from: """
    M531.55,458.27l-5.58,6.94v.2c-34.99,46.58-35,115.51-.25,162.28,0,.01,0,.03,0,.04-75.63,\
    72.93-205.31,18.66-204.94-87.73.21-110.85,137.16-162.63,210.78-81.73Z
    """)
}

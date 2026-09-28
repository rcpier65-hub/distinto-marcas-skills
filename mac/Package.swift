// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DistintoMac",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(name: "DistintoMac", targets: ["DistintoMac"])
    ],
    targets: [
        .target(
            name: "DistintoMac",
            path: "Sources/DistintoMac"
        )
    ]
)

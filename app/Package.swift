// swift-tools-version:5.9
import PackageDescription

// A thin native shell around the course in ../web. The web files are not SwiftPM resources:
// scripts/build_app.sh copies web/ into GNNLab.app/Contents/Resources/web, so the PWA stays the
// single source of truth.
let package = Package(
    name: "GNNLab",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "GNNLab")
    ]
)

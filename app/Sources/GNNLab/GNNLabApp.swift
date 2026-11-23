import AppKit
import SwiftUI
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

@main
struct GNNLabApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var course = CourseController()

    var body: some Scene {
        WindowGroup("GNN Lab") {
            CourseWebView(webView: course.webView)
                .frame(minWidth: 900, minHeight: 620)
        }
        .commands {
            CommandGroup(after: .toolbar) {
                Button("Reload") { course.reload() }.keyboardShortcut("r")
                Button("Back") { course.goBack() }.keyboardShortcut("[")
                Button("Course Home") { course.goHome() }.keyboardShortcut("h", modifiers: [.command, .shift])
            }
        }
    }
}

/// Hosts the controller's WKWebView; SwiftUI never recreates it, so state survives re-renders.
struct CourseWebView: NSViewRepresentable {
    let webView: WKWebView

    func makeNSView(context: Context) -> WKWebView { webView }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}

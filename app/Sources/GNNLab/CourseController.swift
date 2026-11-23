import AppKit
import WebKit

/// Owns the one WKWebView, keeps navigation inside the bundled course and hands external links
/// (paper citations) to the default browser.
@MainActor
final class CourseController: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    let webView: WKWebView
    private let selfTest = SelfTest(arguments: CommandLine.arguments)

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default() // persistent: localStorage progress survives relaunches
        config.setURLSchemeHandler(BundleSchemeHandler(root: Self.webRoot()), forURLScheme: BundleSchemeHandler.scheme)
        selfTest.install(into: config.userContentController)
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isInspectable = true // Safari ▸ Develop menu, handy when editing the course
        webView.load(URLRequest(url: BundleSchemeHandler.startURL))
    }

    func reload() { webView.reload() }
    func goBack() { if webView.canGoBack { webView.goBack() } }
    func goHome() { webView.load(URLRequest(url: BundleSchemeHandler.startURL)) }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, url.scheme != BundleSchemeHandler.scheme else {
            decisionHandler(.allow)
            return
        }
        NSWorkspace.shared.open(url)
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        selfTest.run(in: webView)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        selfTest.fail("navigation failed: \(error.localizedDescription)")
    }

    // MARK: WKUIDelegate

    /// `target="_blank"` links (the Sources lists) would otherwise silently do nothing.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    // MARK: Web root

    /// Inside GNNLab.app: Contents/Resources/web. During `swift run`: $GNNLAB_WEB_DIR or the repo's web/.
    private static func webRoot() -> URL {
        let candidates = [
            Bundle.main.resourceURL?.appendingPathComponent("web"),
            ProcessInfo.processInfo.environment["GNNLAB_WEB_DIR"].map { URL(fileURLWithPath: $0) },
            URL(fileURLWithPath: #filePath).deletingLastPathComponent()
                .appendingPathComponent("../../../web").standardizedFileURL,
        ]
        let fm = FileManager.default
        return candidates.compactMap { $0 }
            .first { fm.fileExists(atPath: $0.appendingPathComponent("index.html").path) }
            ?? candidates[0]!
    }
}

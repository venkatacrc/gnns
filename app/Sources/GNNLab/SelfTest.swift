import AppKit
import WebKit

/// `GNNLab --self-test [--snapshot PATH.png]`: load the bundled course, check it booted cleanly,
/// print a JSON report and exit (0 = pass). Run it twice to prove localStorage persists across
/// launches: the second report's "previous" equals the first report's "wrote". `--snapshot` renders
/// the page to a PNG from inside WebKit, so no Screen Recording permission is needed.
@MainActor
final class SelfTest {
    let enabled: Bool
    private let snapshotPath: String?
    private var attempts = 0

    init(arguments: [String]) {
        enabled = arguments.contains("--self-test")
        snapshotPath = arguments.firstIndex(of: "--snapshot").flatMap { arguments.indices.contains($0 + 1) ? arguments[$0 + 1] : nil }
    }

    /// Collects uncaught JS errors from the very first script onwards.
    func install(into controller: WKUserContentController) {
        guard enabled else { return }
        let source = "self.__selfTestErrors = []; addEventListener('error', (e) => __selfTestErrors.push(String(e.message)));"
        controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func run(in webView: WKWebView) {
        guard enabled else { return }
        webView.evaluateJavaScript("document.readyState === 'complete' && !!(self.GNN && GNN.modules.length)") { [weak self] ready, _ in
            guard let self else { return }
            if ready as? Bool == true { self.report(webView) }
            else if self.attempts < 40 { self.attempts += 1; DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.run(in: webView) } }
            else { self.fail("course never finished booting") }
        }
    }

    func fail(_ reason: String) {
        guard enabled else { return }
        finish(json: #"{"error": "\#(reason)"}"#, passed: false)
    }

    private func report(_ webView: WKWebView) {
        let script = """
        (() => {
            const previous = localStorage.getItem('gnnlab-selftest');
            const wrote = new Date().toISOString();
            localStorage.setItem('gnnlab-selftest', wrote);
            return JSON.stringify({
                origin: location.origin, title: document.title,
                modules: GNN.modules.length, labs: Object.keys(GNN.labs).length,
                errors: self.__selfTestErrors || [], previous, wrote,
            });
        })()
        """
        webView.evaluateJavaScript(script) { [weak self] result, error in
            guard let self else { return }
            guard let json = result as? String, let data = json.data(using: .utf8),
                  let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                self.fail("report script failed: \(error?.localizedDescription ?? "no result")")
                return
            }
            let errors = parsed["errors"] as? [Any] ?? []
            let modules = parsed["modules"] as? Int ?? 0
            self.snapshot(webView) { self.finish(json: json, passed: errors.isEmpty && modules > 0) }
        }
    }

    private func snapshot(_ webView: WKWebView, then done: @escaping () -> Void) {
        guard let path = snapshotPath else { return done() }
        webView.takeSnapshot(with: nil) { image, error in
            if let tiff = image?.tiffRepresentation, let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:]) {
                try? png.write(to: URL(fileURLWithPath: path))
                print("snapshot: \(path)")
            } else {
                print("snapshot failed: \(error?.localizedDescription ?? "no image")")
            }
            done()
        }
    }

    private func finish(json: String, passed: Bool) {
        print(json)
        print(passed ? "self-test OK" : "self-test FAILED")
        fflush(stdout)
        // WebKit persists localStorage asynchronously from a helper process; give it time to flush.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { exit(passed ? 0 : 1) }
    }
}

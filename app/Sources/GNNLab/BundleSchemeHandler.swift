import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the course's web/ folder over a custom `gnnlab://course/` scheme.
///
/// Why not file:// URLs? A custom scheme gives the page a real, stable origin, so localStorage
/// (course progress) persists between launches and relative script URLs with `?v=` queries
/// resolve exactly as they do on a web server.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "gnnlab"
    static let startURL = URL(string: "\(scheme)://course/index.html")!

    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let file = resolve(url), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let headers = [
            "Content-Type": Self.contentType(for: file),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    /// Maps a request URL to a file under `root`, refusing anything that escapes it (e.g. `..`).
    /// `URL.path` drops the query string, so `app.js?v=2026-11-23.1` maps to `app.js`.
    private func resolve(_ url: URL) -> URL? {
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/") else { return nil }
        return file
    }

    private static func contentType(for file: URL) -> String {
        let mime = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let isText = mime.hasPrefix("text/") || mime.hasSuffix("javascript") || mime.hasSuffix("json")
        return isText ? "\(mime); charset=utf-8" : mime
    }
}

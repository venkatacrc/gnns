#!/usr/bin/env node
// Zero-dependency static server for web/. Binds to all interfaces so a phone on the same network
// (e.g. your Pixel on home Wi-Fi) can open the course. Run: node tools/serve.js [port]
// It binds to all interfaces, so run it on trusted networks only (anyone on the LAN can reach it).
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'web');
const PORT = Number(process.argv[2]) || 8765;
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function createServer(root = ROOT) {
    return http.createServer((req, res) => {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        const file = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
        if (!file.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404); return res.end('not found'); }
            // no-cache: the service worker does offline caching; the network copy must always be fresh
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
            res.end(data);
        });
    });
}

function lanAddresses() {
    return Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);
}

if (require.main === module) {
    createServer().listen(PORT, '0.0.0.0', () => {
        console.log(`GNN course on this Mac:  http://localhost:${PORT}/`);
        for (const ip of lanAddresses()) console.log(`On your phone (same Wi-Fi): http://${ip}:${PORT}/`);
        console.log('Ctrl+C to stop. Trusted networks only: the content is internal.');
    });
}
module.exports = { createServer };

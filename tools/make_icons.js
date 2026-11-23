#!/usr/bin/env node
// Generates the PWA icons (a small graph motif) with no dependencies: raw RGBA -> PNG via zlib.
// Run: node tools/make_icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'web', 'icons');
const BG = [24, 33, 47], EDGE = [120, 150, 190], NODES = [[217, 130, 43], [43, 123, 185], [58, 157, 93], [168, 85, 199]];

// Node positions in unit square; edges as index pairs (hub at 0, like a message-passing star + ring).
const PTS = [[0.5, 0.5], [0.24, 0.3], [0.76, 0.28], [0.8, 0.7], [0.3, 0.76], [0.5, 0.16]];
const EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [5, 2], [2, 3], [3, 4], [4, 1]];

function draw(size, scale) {
    const px = Buffer.alloc(size * size * 4);
    const set = (x, y, [r, g, b], a = 1) => {
        if (x < 0 || y < 0 || x >= size || y >= size) return;
        const i = (y * size + x) * 4;
        px[i] = Math.round(px[i] * (1 - a) + r * a);
        px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
        px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
        px[i + 3] = 255;
    };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);
    // content lives in the central `scale` fraction (maskable icons need an ~80% safe zone)
    const map = ([u, v]) => [size * (0.5 + (u - 0.5) * scale), size * (0.5 + (v - 0.5) * scale)];
    const lineW = size * 0.018 * scale;
    for (const [a, b] of EDGES) {
        const [x1, y1] = map(PTS[a]), [x2, y2] = map(PTS[b]);
        const len = Math.hypot(x2 - x1, y2 - y1);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (len * len)));
            const d = Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
            if (d < lineW) set(x, y, EDGE, Math.min(1, lineW - d));
        }
    }
    PTS.forEach((p, i) => {
        const [cx, cy] = map(p);
        const r = size * (i === 0 ? 0.1 : 0.065) * scale;
        for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d < r + 1) set(x, y, NODES[i % NODES.length], Math.min(1, r + 1 - d));
        }
    });
    return px;
}

function png(size, rgba) {
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8-bit RGBA
    const raw = Buffer.alloc(size * (size * 4 + 1));
    for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, size, scale] of [['icon-192.png', 192, 0.92], ['icon-512.png', 512, 0.92], ['maskable-512.png', 512, 0.7], ['apple-touch-icon.png', 180, 0.92]]) {
    fs.writeFileSync(path.join(OUT, name), png(size, draw(size, scale)));
    console.log(`wrote icons/${name}`);
}

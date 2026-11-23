// Graph drawing for labs: deterministic layouts + an SVG renderer with click/keyboard selection.
(function (root) {
    'use strict';
    const { s } = root.UI;

    function circleLayout(n, { width = 340, height = 300, pad = 34 } = {}) {
        const cx = width / 2, cy = height / 2, rad = Math.min(width, height) / 2 - pad;
        return Array.from({ length: n }, (_, i) => {
            const a = (2 * Math.PI * i) / n - Math.PI / 2;
            return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
        });
    }
    // Left column for group 0 (e.g. customers), right column for group 1 (e.g. products).
    function bipartiteLayout(groups, { width = 340, height = 300, pad = 22 } = {}) {
        const left = groups.filter((g) => g === 0).length, right = groups.length - left;
        let li = 0, ri = 0;
        return groups.map((g) => {
            const count = g === 0 ? left : right, idx = g === 0 ? li++ : ri++;
            return { x: g === 0 ? width * 0.22 : width * 0.78, y: pad + ((height - 2 * pad) * (idx + 0.5)) / count };
        });
    }
    // Force layout lives in GNNCore (pure math, node-tested); re-exported here for the labs.
    const forceLayout = (...args) => root.GNNCore.forceLayout(...args);

    // nodes: [{x, y, label, color, r, title, ring}], edges: [{s, t, color, width, directed, dashed}]
    function drawGraph({ nodes, edges, width = 340, height = 300, onSelect, title = 'graph', showLabels = true }) {
        const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'graph', role: 'group', 'aria-label': title });
        const markerId = `arrow-${Math.random().toString(36).slice(2, 8)}`;
        svg.append(s('defs', {}, s('marker', { id: markerId, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
            s('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'context-stroke' }))));
        for (const e of edges) {
            const a = nodes[e.s], b = nodes[e.t];
            const rb = (b.r || 10) + 2;
            const d = Math.max(Math.hypot(b.x - a.x, b.y - a.y), 0.01);
            const x2 = e.directed ? b.x - ((b.x - a.x) / d) * rb : b.x, y2 = e.directed ? b.y - ((b.y - a.y) / d) * rb : b.y;
            svg.append(s('line', {
                x1: a.x, y1: a.y, x2, y2, stroke: e.color || 'var(--edge)', 'stroke-width': e.width || 1.4,
                'stroke-dasharray': e.dashed ? '4 3' : null, 'marker-end': e.directed ? `url(#${markerId})` : null, opacity: e.opacity ?? 0.85,
            }));
        }
        nodes.forEach((n, i) => {
            const g = s('g', { class: 'node', tabindex: onSelect ? 0 : null, role: onSelect ? 'button' : null, 'aria-label': n.title || n.label || `node ${i}` });
            if (n.ring) g.append(s('circle', { cx: n.x, cy: n.y, r: (n.r || 10) + 4, fill: 'none', stroke: n.ring, 'stroke-width': 3 }));
            g.append(s('circle', { cx: n.x, cy: n.y, r: n.r || 10, fill: n.color || 'var(--node)', stroke: 'var(--card)', 'stroke-width': 1.5 },
                s('title', {}, n.title || n.label || '')));
            if (showLabels && n.label) g.append(s('text', { x: n.x, y: n.y + (n.r || 10) + 11, 'text-anchor': 'middle', class: 'node-label' }, n.label));
            if (onSelect) {
                g.addEventListener('click', () => onSelect(i));
                g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect(i); } });
            }
            svg.append(g);
        });
        return svg;
    }

    // Color ramp from cool to hot for scores in [0, 1].
    function heatColor(v) {
        const x = Math.max(0, Math.min(1, v));
        return `hsl(${(210 - 210 * x).toFixed(0)}, 75%, ${(62 - 14 * x).toFixed(0)}%)`;
    }
    const PALETTE = ['#d9822b', '#2b7bb9', '#3a9d5d', '#a855c7', '#c2410c', '#0f766e', '#be185d', '#4d7c0f', '#6d28d9', '#b45309', '#0369a1', '#9f1239', '#15803d'];

    root.Viz = { circleLayout, bipartiteLayout, forceLayout, drawGraph, heatColor, PALETTE };
})(window);

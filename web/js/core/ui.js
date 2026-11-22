// Small, accessible DOM + SVG helpers shared by the app shell and every lab.
(function (root) {
    'use strict';
    const SVG_NS = 'http://www.w3.org/2000/svg';
    let uid = 0;
    const nextId = (p) => `${p}-${++uid}`;

    // h('div', {class: 'x', onclick}, child, 'text', [more]) -> element
    function h(tag, attrs, ...children) {
        const el = document.createElement(tag);
        applyAttrs(el, attrs);
        appendAll(el, children);
        return el;
    }
    function s(tag, attrs, ...children) {
        const el = document.createElementNS(SVG_NS, tag);
        applyAttrs(el, attrs);
        appendAll(el, children);
        return el;
    }
    function applyAttrs(el, attrs) {
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v === undefined || v === null || v === false) continue;
            if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
            else if (k === 'html') el.innerHTML = v;
            else el.setAttribute(k, v === true ? '' : v);
        }
    }
    function appendAll(el, children) {
        for (const c of children.flat(Infinity)) {
            if (c === null || c === undefined || c === false) continue;
            el.append(c instanceof Node ? c : document.createTextNode(String(c)));
        }
    }
    const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };
    const fmt = (x, d = 3) => (Number.isInteger(x) ? String(x) : Number(x).toFixed(d));
    const pct = (x) => `${(100 * x).toFixed(1)}%`;

    // Labelled range input. Returns {el, get, set}.
    function slider({ label, min, max, step = 1, value, onInput, format = (v) => v }) {
        const id = nextId('rng');
        const out = h('output', { for: id }, format(value));
        const input = h('input', { type: 'range', id, min, max, step, value });
        input.addEventListener('input', () => { out.textContent = format(+input.value); onInput && onInput(+input.value); });
        return { el: h('div', { class: 'ctl' }, h('label', { for: id }, label, ' ', out), input), get: () => +input.value };
    }
    function select({ label, options, value, onChange }) {
        const id = nextId('sel');
        const sel = h('select', { id }, options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));
        sel.addEventListener('change', () => onChange && onChange(sel.value));
        return { el: h('div', { class: 'ctl' }, h('label', { for: id }, label), sel), get: () => sel.value };
    }
    function toggle({ label, checked = false, onChange }) {
        const id = nextId('chk');
        const box = h('input', { type: 'checkbox', id, checked });
        box.addEventListener('change', () => onChange && onChange(box.checked));
        return { el: h('div', { class: 'ctl ctl-check' }, box, h('label', { for: id }, label)), get: () => box.checked };
    }
    const button = (text, onclick, cls = 'btn') => h('button', { type: 'button', class: cls, onclick }, text);
    const controls = (...items) => h('div', { class: 'controls' }, items.map((i) => (i && i.el) || i));
    const note = (html, cls = 'note') => h('div', { class: cls, html });
    const stats = (pairs) => h('dl', { class: 'stats' },
        pairs.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
    function table(headers, rows, { caption } = {}) {
        return h('div', { class: 'table-wrap' }, h('table', {},
            caption ? h('caption', {}, caption) : null,
            h('thead', {}, h('tr', {}, headers.map((x) => h('th', { scope: 'col' }, x)))),
            h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
    }

    // Horizontal bar chart. items: [{label, value, color?, highlight?}]
    function barChart(items, { width = 320, barH = 18, max, format = (v) => fmt(v, 2), title } = {}) {
        const m = max ?? Math.max(...items.map((i) => i.value), 1e-9);
        const labelW = 128, height = items.length * (barH + 6) + 4;
        const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart', role: 'img', 'aria-label': title || 'bar chart' });
        items.forEach((it, i) => {
            const y = 2 + i * (barH + 6);
            const w = Math.max(0, ((width - labelW - 44) * it.value) / m);
            svg.append(
                s('text', { x: labelW - 6, y: y + barH * 0.72, 'text-anchor': 'end', class: 'chart-label' }, it.label),
                s('rect', { x: labelW, y, width: w, height: barH, rx: 4, fill: it.color || 'var(--accent)', opacity: it.highlight === false ? 0.35 : 1 }),
                s('text', { x: labelW + w + 4, y: y + barH * 0.72, class: 'chart-value' }, format(it.value)));
        });
        return svg;
    }

    // Line chart. series: [{name, color, points: [[x, y], ...]}]
    function lineChart(series, { width = 340, height = 180, yMin, yMax, xLabel = '', yLabel = '', title } = {}) {
        const all = series.flatMap((sr) => sr.points);
        const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const lo = yMin ?? Math.min(...ys), hi = yMax ?? Math.max(...ys);
        const pad = { l: 40, r: 10, t: 10, b: 28 };
        const X = (x) => pad.l + ((x - x0) / ((x1 - x0) || 1)) * (width - pad.l - pad.r);
        const Y = (y) => height - pad.b - ((y - lo) / ((hi - lo) || 1)) * (height - pad.t - pad.b);
        const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart', role: 'img', 'aria-label': title || 'line chart' });
        svg.append(
            s('line', { x1: pad.l, y1: height - pad.b, x2: width - pad.r, y2: height - pad.b, class: 'axis' }),
            s('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: height - pad.b, class: 'axis' }),
            s('text', { x: pad.l - 4, y: pad.t + 8, 'text-anchor': 'end', class: 'chart-label' }, fmt(hi, 2)),
            s('text', { x: pad.l - 4, y: height - pad.b, 'text-anchor': 'end', class: 'chart-label' }, fmt(lo, 2)),
            s('text', { x: width - pad.r, y: height - 6, 'text-anchor': 'end', class: 'chart-label' }, xLabel),
            s('text', { x: pad.l + 4, y: pad.t + 8, class: 'chart-label' }, yLabel));
        series.forEach((sr, i) => {
            const d = sr.points.map((p, j) => `${j ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
            svg.append(s('path', { d, fill: 'none', stroke: sr.color, 'stroke-width': 2.5, 'stroke-dasharray': sr.dashed ? '5 4' : null }));
            svg.append(s('text', { x: width - pad.r, y: pad.t + 12 + i * 14, 'text-anchor': 'end', fill: sr.color, class: 'chart-legend' }, sr.name));
        });
        return svg;
    }

    // Heatmap for small matrices (e.g. co-purchase counts).
    function heatmap(M, labels, { cell = 18, title, onCell } = {}) {
        const n = M.length, lab = 110, size = lab + n * cell;
        const max = Math.max(...M.flat(), 1e-9);
        const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, class: 'chart heat', role: 'img', 'aria-label': title || 'heatmap' });
        labels.forEach((l, i) => {
            svg.append(s('text', { x: lab - 4, y: lab + i * cell + cell * 0.7, 'text-anchor': 'end', class: 'chart-label small' }, l));
            svg.append(s('text', { x: 0, y: 0, class: 'chart-label small', transform: `translate(${lab + i * cell + cell * 0.7},${lab - 4}) rotate(-60)` }, l));
        });
        M.forEach((row, i) => row.forEach((v, j) => {
            const rect = s('rect', { x: lab + j * cell, y: lab + i * cell, width: cell - 1, height: cell - 1, fill: 'var(--accent)', opacity: (0.06 + 0.94 * v / max).toFixed(3) },
                s('title', {}, `${labels[i]} × ${labels[j]}: ${v}`));
            if (onCell) rect.addEventListener('click', () => onCell(i, j));
            svg.append(rect);
        }));
        return svg;
    }

    // Defer heavy work until after the browser paints (so "Training..." shows first). Returns a cancel fn.
    const later = (fn, ms = 30) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); };

    root.UI = { h, s, clear, fmt, pct, slider, select, toggle, button, controls, note, stats, table, barChart, lineChart, heatmap, later };
})(window);

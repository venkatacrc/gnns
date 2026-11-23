#!/usr/bin/env node
// Measures force-layout readability on the real lab graphs: overlapping nodes (nearest neighbour < 12 px,
// i.e. two radius-6 nodes touching) and median nearest-neighbour spacing, across gravity strengths.
// Used to choose GNNCore.forceLayout's default gravity. Run: node tools/layout_probe.js
'use strict';
const C = require('../web/js/core/gnn.js');
const F = require('../web/js/core/fraud.js');
const R = require('../web/js/core/retail.js');

function productGraph() {
    const w = R.makeRetailWorld(7), g = R.edgeCounts(w), co = R.coPurchase(w, g);
    const P = w.products, deg = g.prodAdj.map((l) => l.length), cats = w.categories.map((c) => c.name);
    const edges = P.map((p) => [p.id, P.length + cats.indexOf(p.cat)]);
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
        const lift = co[a][b] && deg[a] && deg[b] ? (co[a][b] * w.customers.length) / (deg[a] * deg[b]) : 0;
        if (lift > 1.8 && P[a].cat !== P[b].cat) edges.push([a, b]);
    }
    return [P.length + cats.length, edges, { width: 360, height: 340, seed: 2, iters: 220 }];
}
const fraud = F.makeTransactionGraph(5);
const CASES = {
    fraud: [fraud.accounts.length, fraud.txns.map((t) => [t.s, t.t]), { width: 360, height: 340, seed: 9, iters: 200 }],
    products: productGraph(),
    toy: [10, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 6], [6, 4], [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [6, 8], [8, 9]], { seed: 4 }],
};
const nearest = (pos) => pos.map((p, i) => Math.min(...pos.map((q, j) => (i === j ? Infinity : Math.hypot(p.x - q.x, p.y - q.y)))));
function quality(pos) {
    const d = nearest(pos).sort((a, b) => a - b);
    return `overlap ${d.filter((x) => x < 12).length}/${pos.length} medianNN ${d[Math.floor(d.length / 2)].toFixed(0)}`;
}
for (const gravity of [0.1, 0.8, 1.5, 2, 3]) {
    console.log(`gravity ${gravity.toFixed(2)}  ` + Object.entries(CASES)
        .map(([name, [n, edges, opts]]) => `${name}: ${quality(C.forceLayout(n, edges, { ...opts, gravity }))}`).join(' | '));
}
module.exports = { CASES, nearest };

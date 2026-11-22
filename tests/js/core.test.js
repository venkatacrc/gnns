// Run with: node --test tests/js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../web/js/core/gnn.js');
const R = require('../../web/js/core/retail.js');
const F = require('../../web/js/core/fraud.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('rng is deterministic per seed', () => {
    const a = C.rng(42), b = C.rng(42), c = C.rng(43);
    const xs = [a(), a(), a()];
    assert.deepEqual(xs, [b(), b(), b()]);
    assert.notEqual(xs[0], c());
});

test('matmul and transpose', () => {
    assert.deepEqual(C.matmul([[1, 2], [3, 4]], [[5], [6]]), [[17], [39]]);
    assert.deepEqual(C.transpose([[1, 2, 3]]), [[1], [2], [3]]);
});

test('softmax sums to one and respects temperature', () => {
    const p = C.softmax([1, 2, 3]);
    close(p.reduce((a, b) => a + b, 0), 1);
    assert.ok(C.softmax([1, 2], 0.1)[1] > C.softmax([1, 2], 10)[1]);
});

test('mean message passing on a path graph', () => {
    const adj = C.adjacencyLists(3, [[0, 1], [1, 2]]);
    const X = [[0], [3], [6]];
    assert.deepEqual(C.messagePass(X, adj, { agg: 'mean', selfLoop: false }), [[3], [3], [3]]);
    assert.deepEqual(C.messagePass(X, adj, { agg: 'sum', selfLoop: true }), [[3], [9], [9]]);
    assert.deepEqual(C.messagePass(X, adj, { agg: 'max', selfLoop: true }), [[3], [6], [6]]);
});

test('repeated mean aggregation over-smooths (feature spread shrinks)', () => {
    const adj = C.adjacencyLists(4, [[0, 1], [1, 2], [2, 3], [3, 0]]);
    let X = [[1, 0], [0, 1], [1, 1], [0, 0]];
    const start = C.featureSpread(X);
    for (let i = 0; i < 10; i++) X = C.messagePass(X, adj, { agg: 'mean' });
    assert.ok(C.featureSpread(X) < start * 0.01);
});

test('fanout cost multiplies per hop', () => {
    const { perHop, total } = C.fanoutCost([15, 10, 5], 50);
    assert.deepEqual(perHop, [15, 150, 750]);
    assert.equal(total, 916);
    assert.deepEqual(C.fanoutCost([15, 10], 4).perHop, [4, 16]);
});

test('ranking metrics', () => {
    const ranked = ['a', 'b', 'c', 'd'];
    const rel = new Set(['b', 'd']);
    assert.equal(C.hitAtK(ranked, rel, 1), 0);
    assert.equal(C.hitAtK(ranked, rel, 2), 1);
    close(C.recallAtK(ranked, rel, 2), 0.5);
    close(C.precisionAtK(ranked, rel, 4), 0.5);
    close(C.mrr(ranked, rel), 0.5);
    const dcg = 1 / Math.log2(3) + 1 / Math.log2(5);
    const idcg = 1 + 1 / Math.log2(3);
    close(C.ndcgAtK(ranked, rel, 4), dcg / idcg);
});

test('ppr concentrates mass near the seed and sums to one', () => {
    const adj = C.adjacencyLists(5, [[0, 1], [1, 2], [2, 3], [3, 4]]);
    const p = C.ppr(adj, [0], { alpha: 0.2, iters: 60 });
    close(p.reduce((a, b) => a + b, 0), 1, 1e-6);
    assert.ok(p[0] > p[2] && p[2] > p[4]);
});

test('decay weight halves at the half-life', () => {
    close(C.decayWeight(30, 30), 0.5);
    close(C.decayWeight(0, 30), 1);
});

test('greedy PCST connects high-prize nodes through cheap edges', () => {
    // 0 and 3 are valuable; reaching 3 via 1-2 costs less than its prize, 4 is not worth it
    const prizes = [5, 0, 0, 5, 0.5];
    const edges = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 2]];
    const { nodes } = C.greedyPCST(5, prizes, edges);
    assert.deepEqual(nodes.sort(), [0, 1, 2, 3]);
});

test('fraud detectors recover every planted pattern', () => {
    const g = F.makeTransactionGraph(5);
    const n = g.accounts.length;
    assert.ok(C.fanIn(n, g.txns, 5).includes(g.patterns.fanIn.center));
    assert.ok(C.fanOut(n, g.txns, 5).includes(g.patterns.fanOut.center));
    const ring = g.patterns.cycle.members.slice().sort((a, b) => a - b);
    assert.ok(C.findCycles(n, g.txns, 5).some((cyc) => cyc.slice().sort((a, b) => a - b).join() === ring.join()));
    const sg = C.scatterGather(n, g.txns, 3);
    assert.ok(sg.some((x) => x.source === g.patterns.scatterGather.source && x.sink === g.patterns.scatterGather.sink));
});

test('label propagation decays with distance from the known-bad seed', () => {
    const g = F.makeTransactionGraph(5);
    const adj = F.undirectedAdj(g);
    const chain = g.patterns.chain.members; // ring[0] ... shells ... exchange (the seed)
    const hist = C.labelPropagation(adj, [g.knownBad[0]], 6, 0.5);
    const last = hist[hist.length - 1];
    assert.ok(last[chain[chain.length - 2]] > last[chain[1]]);
});

test('frequency-biased walks surface once-a-year complements for a TV buyer', () => {
    const w = R.makeRetailWorld(7);
    const g = R.edgeCounts(w);
    const buyer = w.customers.find((c) => c.personas.includes('tv'));
    const accessories = new Set(w.products.filter((p) => p.cat === 'TV Accessories').map((p) => p.id));
    const countIn = (visits) => C.topK(visits, 5).filter((p) => accessories.has(p)).length;
    const flat = countIn(R.biasedWalkVisits(w, g, buyer.id, { beta: 0 }));
    const biased = countIn(R.biasedWalkVisits(w, g, buyer.id, { beta: 1 }));
    assert.ok(biased > flat, `biased ${biased} vs flat ${flat}`);
});

test('dual encoder beats popularity; removing the positive mask lowers loss but hurts held-out recall', () => {
    const w = R.makeRetailWorld(7);
    const split = R.splitEdges(w);
    const pop = R.popularityBaseline(w, split, 5).heldRecall;
    const masked = R.trainDualEncoder(w, split, { mask: true, evalEvery: 12000 }).history.at(-1);
    const leaky = R.trainDualEncoder(w, split, { mask: false, evalEvery: 12000 }).history.at(-1);
    assert.ok(masked.heldRecall > pop, `masked ${masked.heldRecall} vs pop ${pop}`);
    assert.ok(leaky.loss < masked.loss, 'leaky training loss should look better');
    assert.ok(leaky.heldRecall < masked.heldRecall, 'but generalize worse');
});

test('dropFuel removes gasoline from supervision', () => {
    const w = R.makeRetailWorld(7);
    const fuel = w.products.find((p) => p.cat === 'Fuel').id;
    const split = R.splitEdges(w, { dropFuel: true });
    assert.ok(split.trainPos.every((pos) => !pos.includes(fuel)));
});

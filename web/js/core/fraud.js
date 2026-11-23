// Synthetic money-movement graph with planted AML typologies (as in the public AMLworld benchmark):
// fan-in (mule collection), fan-out (dispersal), cycles (round-tripping), scatter-gather
// (structuring through intermediaries) and a long hop chain (layering).
(function (root) {
    'use strict';
    const C = (typeof module !== 'undefined' && module.exports) ? require('./gnn.js') : root.GNNCore;

    function makeTransactionGraph(seed = 5, { normalAccounts = 30, normalTxns = 55 } = {}) {
        const r = C.rng(seed);
        const accounts = [];
        const txns = [];
        const add = (role) => { accounts.push({ id: accounts.length, role }); return accounts.length - 1; };
        const pay = (s, t, amount, day) => txns.push({ s, t, amount: Math.round(amount), day });
        for (let i = 0; i < normalAccounts; i++) add('normal');
        for (let i = 0; i < normalTxns; i++) {
            const s = C.randInt(r, normalAccounts);
            let t = C.randInt(r, normalAccounts);
            if (t === s) t = (t + 1) % normalAccounts;
            // Everyday payments are heavy-tailed (log-normal, median ~110): a few overlap mule-sized transfers.
            pay(s, t, Math.min(5000, Math.exp(4.7 + 1.1 * C.gaussian(r))), C.randInt(r, 90));
        }
        const patterns = {};
        // fan-in: six distinct victims / mule recruits pay one collector within a few days
        const collector = add('mule-collector');
        const normals = Array.from({ length: normalAccounts }, (_, i) => i);
        patterns.fanIn = { center: collector, members: C.sample(r, normals, 6) };
        for (const v of patterns.fanIn.members) pay(v, collector, 900 + r() * 200, 60 + C.randInt(r, 3));
        // fan-out: the collector (or a new hub) disperses to fresh accounts
        const hub = add('dispersal-hub');
        pay(collector, hub, 5500, 64);
        patterns.fanOut = { center: hub, members: [] };
        for (let i = 0; i < 5; i++) {
            const t = add('cash-out');
            patterns.fanOut.members.push(t);
            pay(hub, t, 1000 + r() * 50, 65);
        }
        // cycle: round-tripping A -> B -> C -> D -> A to fake activity
        const ring = [add('ring'), add('ring'), add('ring'), add('ring')];
        ring.forEach((a, i) => pay(a, ring[(i + 1) % ring.length], 3000, 70 + i));
        patterns.cycle = { members: ring };
        // scatter-gather: split under a reporting threshold, then reconverge
        const src = add('structurer'), sink = add('structurer-sink');
        const mids = [add('smurf'), add('smurf'), add('smurf'), add('smurf')];
        mids.forEach((m) => { pay(src, m, 9500, 75); pay(m, sink, 9400, 77); });
        patterns.scatterGather = { source: src, sink, mids };
        // long hop chain: layering through a line of shells, ending at a known-bad exchange
        const chain = [ring[0]];
        for (let i = 0; i < 4; i++) chain.push(add('shell'));
        const exchange = add('sanctioned-exchange');
        chain.push(exchange);
        for (let i = 0; i + 1 < chain.length; i++) pay(chain[i], chain[i + 1], 2900 - i * 50, 80 + i);
        patterns.chain = { members: chain };
        // Known-bad labels an investigator starts from (investigations usually begin at one end)
        const knownBad = [exchange, collector];
        return { accounts, txns, patterns, knownBad };
    }

    // Undirected neighbor lists, handy for propagation and PPR.
    function undirectedAdj(graph) {
        return C.adjacencyLists(graph.accounts.length, graph.txns.map((t) => [t.s, t.t]));
    }

    // Risk score per account. Detectors run on transfers of at least `minAmount` (real AML rules condition on
    // amounts; structure alone over small everyday payments is mostly noise). Evidence combines by noisy-OR,
    // and each detector counts ONCE per account: noisy-OR assumes independent evidence, and an account sitting
    // in ten overlapping cycles has one piece of cycle evidence, not ten.
    const DETECTOR_WEIGHT = { fanIn: 0.6, fanOut: 0.6, cycle: 0.4, scatterGather: 0.4 };
    function riskScores(graph, { mode = 'combined', minFanIn = 5, minFanOut = 5, hops = 3, decay = 0.6, minAmount = 0 } = {}) {
        const n = graph.accounts.length;
        const s = new Array(n).fill(0);
        const hit = (i, w) => { s[i] = 1 - (1 - s[i]) * (1 - w); };
        if (mode !== 'propagation') {
            const txns = graph.txns.filter((t) => t.amount >= minAmount);
            const found = {
                fanIn: C.fanIn(n, txns, minFanIn),
                fanOut: C.fanOut(n, txns, minFanOut),
                cycle: C.findCycles(n, txns, 5).flat(),
                scatterGather: C.scatterGather(n, txns, 3).flatMap((sg) => [sg.source, sg.sink, ...sg.mids]),
            };
            for (const [detector, members] of Object.entries(found)) for (const i of new Set(members)) hit(i, DETECTOR_WEIGHT[detector]);
        }
        if (mode !== 'patterns') {
            const prop = C.labelPropagation(undirectedAdj(graph), graph.knownBad, hops, decay);
            prop[prop.length - 1].forEach((v, i) => hit(i, v));
        }
        return s;
    }

    // Average precision of a score vector against the planted (non-normal) roles: the area-under-PR proxy.
    // Ties are averaged over random orderings; breaking them by index would systematically rank the
    // low-numbered normal accounts first and understate every detector.
    function averagePrecision(graph, scores, draws = 20) {
        const bad = (i) => graph.accounts[i].role !== 'normal';
        const total = graph.accounts.filter((a) => a.role !== 'normal').length;
        if (!total) return 0;
        const r = C.rng(1234);
        let acc = 0;
        for (let d = 0; d < draws; d++) {
            const tieBreak = C.shuffle(r, scores.map((_, i) => i));
            const rankOf = new Array(scores.length);
            tieBreak.forEach((i, k) => { rankOf[i] = k; });
            const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || rankOf[a] - rankOf[b]);
            let hits = 0, sum = 0;
            order.forEach((i, rank) => { if (bad(i)) { hits++; sum += hits / (rank + 1); } });
            acc += sum / total;
        }
        return acc / draws;
    }

    const api = { makeTransactionGraph, undirectedAdj, riskScores, averagePrecision };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.GNNFraud = api;
})(typeof window !== 'undefined' ? window : globalThis);

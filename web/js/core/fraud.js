// Synthetic money-movement graph with planted AML patterns from the NVIDIA/Kumo fraud deck:
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
            pay(s, t, 20 + r() * 400, C.randInt(r, 90));
        }
        const patterns = {};
        // fan-in: many victims / mule recruits pay one collector within a few days
        const collector = add('mule-collector');
        patterns.fanIn = { center: collector, members: [] };
        for (let i = 0; i < 6; i++) {
            const v = C.randInt(r, normalAccounts);
            patterns.fanIn.members.push(v);
            pay(v, collector, 900 + r() * 200, 60 + C.randInt(r, 3));
        }
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

    const api = { makeTransactionGraph, undirectedAdj };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.GNNFraud = api;
})(typeof window !== 'undefined' ? window : globalThis);

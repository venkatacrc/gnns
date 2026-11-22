// Shared, dependency-free math for every lab: seeded randomness, tiny linear algebra,
// message passing, random walks, ranking metrics and graph algorithms.
// Works in the browser (window.GNNCore) and in Node (module.exports) so it can be unit tested.
(function (root) {
    'use strict';

    // ---------- randomness (seeded, so every lab run is reproducible) ----------
    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const randInt = (r, n) => Math.floor(r() * n);
    const choice = (r, arr) => arr[randInt(r, arr.length)];
    function gaussian(r) {
        const u = Math.max(r(), 1e-12);
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    }
    function shuffle(r, arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = randInt(r, i + 1);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    const sample = (r, arr, k) => shuffle(r, arr).slice(0, Math.min(k, arr.length));
    function weightedChoice(r, items, weights) {
        const total = weights.reduce((s, w) => s + w, 0);
        if (total <= 0) return choice(r, items);
        let x = r() * total;
        for (let i = 0; i < items.length; i++) {
            x -= weights[i];
            if (x <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    // ---------- linear algebra on plain arrays ----------
    const zeros = (n, m) => Array.from({ length: n }, () => new Array(m).fill(0));
    const randomMatrix = (r, n, m, scale = 0.1) =>
        Array.from({ length: n }, () => Array.from({ length: m }, () => gaussian(r) * scale));
    function matmul(A, B) {
        const n = A.length, k = B.length, m = B[0].length;
        const C = zeros(n, m);
        for (let i = 0; i < n; i++)
            for (let p = 0; p < k; p++) {
                const a = A[i][p];
                if (a === 0) continue;
                for (let j = 0; j < m; j++) C[i][j] += a * B[p][j];
            }
        return C;
    }
    const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
    const matvec = (A, v) => A.map((row) => dot(row, v));
    const relu = (A) => A.map((row) => row.map((x) => Math.max(0, x)));
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const norm = (a) => Math.sqrt(dot(a, a));
    const cosine = (a, b) => dot(a, b) / ((norm(a) * norm(b)) || 1);
    function softmax(v, temperature = 1) {
        const m = Math.max(...v);
        const e = v.map((x) => Math.exp((x - m) / temperature));
        const s = e.reduce((a, b) => a + b, 0);
        return e.map((x) => x / s);
    }
    function meanVec(vectors, dim) {
        const out = new Array(dim).fill(0);
        if (!vectors.length) return out;
        for (const v of vectors) for (let j = 0; j < dim; j++) out[j] += v[j];
        return out.map((x) => x / vectors.length);
    }
    // Average per-feature variance across nodes: drops toward 0 as features over-smooth.
    function featureSpread(X) {
        const n = X.length, m = X[0].length;
        let total = 0;
        for (let j = 0; j < m; j++) {
            const mu = X.reduce((s, row) => s + row[j], 0) / n;
            total += X.reduce((s, row) => s + (row[j] - mu) ** 2, 0) / n;
        }
        return total / m;
    }

    // ---------- graphs ----------
    function adjacencyLists(n, edges, directed = false) {
        const adj = Array.from({ length: n }, () => []);
        for (const [s, t] of edges) {
            adj[s].push(t);
            if (!directed) adj[t].push(s);
        }
        return adj;
    }
    function adjacencyMatrix(n, edges, directed = false) {
        const A = zeros(n, n);
        for (const [s, t, w = 1] of edges) {
            A[s][t] += w;
            if (!directed) A[t][s] += w;
        }
        return A;
    }
    // One weight-free round of message passing so learners can watch the aggregation itself.
    // agg: 'mean' | 'sum' | 'max'; norm: 'none' | 'sym' (GCN's D^-1/2 (A+I) D^-1/2).
    function messagePass(X, adj, { agg = 'mean', selfLoop = true, norm: normKind = 'none' } = {}) {
        const dim = X[0].length;
        const nbrs = adj.map((list, i) => (selfLoop ? [i, ...list] : list.slice()));
        const deg = nbrs.map((l) => l.length || 1);
        return X.map((_, i) => {
            const list = nbrs[i];
            if (!list.length) return X[i].slice();
            if (normKind === 'sym') {
                const out = new Array(dim).fill(0);
                for (const j of list) {
                    const w = 1 / Math.sqrt(deg[i] * deg[j]);
                    for (let d = 0; d < dim; d++) out[d] += w * X[j][d];
                }
                return out;
            }
            if (agg === 'max') return X[0].map((_, d) => Math.max(...list.map((j) => X[j][d])));
            const sum = new Array(dim).fill(0);
            for (const j of list) for (let d = 0; d < dim; d++) sum[d] += X[j][d];
            return agg === 'sum' ? sum : sum.map((x) => x / list.length);
        });
    }
    const gcnLayer = (X, adj, W, opts) => relu(matmul(messagePass(X, adj, { ...opts, norm: 'sym' }), W));

    // How many nodes a k-hop neighbor sampler touches: prod of min(fanout, degree) per hop.
    function fanoutCost(fanouts, avgDegree) {
        const perHop = [];
        let frontier = 1;
        for (const f of fanouts) {
            frontier *= Math.min(f, avgDegree);
            perHop.push(frontier);
        }
        return { perHop, total: 1 + perHop.reduce((a, b) => a + b, 0) };
    }

    // Personalized PageRank by power iteration. adj is a list of neighbor lists.
    function ppr(adj, seeds, { alpha = 0.15, iters = 30 } = {}) {
        const n = adj.length;
        const restart = new Array(n).fill(0);
        for (const s of seeds) restart[s] = 1 / seeds.length;
        let p = restart.slice();
        for (let it = 0; it < iters; it++) {
            const next = restart.map((x) => alpha * x);
            for (let i = 0; i < n; i++) {
                if (!adj[i].length || p[i] === 0) continue;
                const share = ((1 - alpha) * p[i]) / adj[i].length;
                for (const j of adj[i]) next[j] += share;
            }
            p = next;
        }
        return p;
    }

    // Hop-by-hop label propagation: seeds stay at 1, everyone else takes decay * max(neighbors),
    // i.e. the strength of the strongest path back to a known-bad seed.
    function labelPropagation(adj, seeds, hops, decay = 0.6) {
        const n = adj.length;
        const isSeed = new Set(seeds);
        let s = Array.from({ length: n }, (_, i) => (isSeed.has(i) ? 1 : 0));
        const history = [s];
        for (let h = 0; h < hops; h++) {
            s = s.map((_, i) => {
                if (isSeed.has(i)) return 1;
                const list = adj[i];
                if (!list.length) return 0;
                return decay * Math.max(...list.map((j) => s[j]));
            });
            history.push(s);
        }
        return history;
    }

    // ---------- time ----------
    const decayWeight = (ageDays, halfLifeDays) => Math.pow(0.5, ageDays / Math.max(halfLifeDays, 1e-9));

    // ---------- ranking metrics (binary relevance) ----------
    function hitAtK(ranked, relevant, k) {
        return ranked.slice(0, k).some((x) => relevant.has(x)) ? 1 : 0;
    }
    function recallAtK(ranked, relevant, k) {
        if (!relevant.size) return 0;
        return ranked.slice(0, k).filter((x) => relevant.has(x)).length / relevant.size;
    }
    function precisionAtK(ranked, relevant, k) {
        return ranked.slice(0, k).filter((x) => relevant.has(x)).length / k;
    }
    function mrr(ranked, relevant) {
        const idx = ranked.findIndex((x) => relevant.has(x));
        return idx < 0 ? 0 : 1 / (idx + 1);
    }
    function ndcgAtK(ranked, relevant, k) {
        let dcg = 0;
        ranked.slice(0, k).forEach((x, i) => { if (relevant.has(x)) dcg += 1 / Math.log2(i + 2); });
        let idcg = 0;
        for (let i = 0; i < Math.min(k, relevant.size); i++) idcg += 1 / Math.log2(i + 2);
        return idcg ? dcg / idcg : 0;
    }
    const topK = (scores, k, exclude = new Set()) =>
        scores.map((s, i) => [s, i]).filter(([, i]) => !exclude.has(i))
            .sort((a, b) => b[0] - a[0]).slice(0, k).map(([, i]) => i);
    // Mean and (population) standard deviation, for reporting results across seeds.
    function meanStd(xs) {
        if (!xs.length) return { mean: 0, std: 0 };
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        return { mean, std: Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length) };
    }

    // ---------- fraud / AML subgraph patterns on directed transfers {s, t} ----------
    function degreesByDirection(n, txns) {
        const inn = Array.from({ length: n }, () => new Set());
        const out = Array.from({ length: n }, () => new Set());
        for (const { s, t } of txns) { out[s].add(t); inn[t].add(s); }
        return { inn, out };
    }
    function fanIn(n, txns, minSources) {
        const { inn } = degreesByDirection(n, txns);
        return inn.map((set, i) => [i, set.size]).filter(([, d]) => d >= minSources).map(([i]) => i);
    }
    function fanOut(n, txns, minTargets) {
        const { out } = degreesByDirection(n, txns);
        return out.map((set, i) => [i, set.size]).filter(([, d]) => d >= minTargets).map(([i]) => i);
    }
    // Simple directed cycles up to maxLen, each reported once (starting from its smallest node).
    function findCycles(n, txns, maxLen = 5) {
        const { out } = degreesByDirection(n, txns);
        const cycles = [];
        const walk = (start, node, path) => {
            for (const nxt of out[node]) {
                if (nxt === start && path.length >= 2) cycles.push(path.slice());
                else if (nxt > start && !path.includes(nxt) && path.length < maxLen) {
                    path.push(nxt);
                    walk(start, nxt, path);
                    path.pop();
                }
            }
        };
        for (let s = 0; s < n; s++) walk(s, s, [s]);
        return cycles;
    }
    // Scatter-gather: money leaves a, splits over >= k intermediaries, and reconverges on c.
    function scatterGather(n, txns, minPaths = 3) {
        const { out } = degreesByDirection(n, txns);
        const found = [];
        for (let a = 0; a < n; a++) {
            const via = new Map();
            for (const b of out[a]) for (const c of out[b]) {
                if (c === a) continue;
                if (!via.has(c)) via.set(c, new Set());
                via.get(c).add(b);
            }
            for (const [c, mids] of via) if (mids.size >= minPaths) found.push({ source: a, sink: c, mids: [...mids] });
        }
        return found;
    }

    // ---------- prize-collecting Steiner tree (greedy), as in G-Retriever's subgraph retrieval ----------
    // nodes: prizes[i]; edges: [s, t, cost]. Grows a connected tree while added prize beats path cost.
    function greedyPCST(n, prizes, edges) {
        const adj = Array.from({ length: n }, () => []);
        for (const [s, t, c] of edges) { adj[s].push([t, c]); adj[t].push([s, c]); }
        let best = 0;
        prizes.forEach((p, i) => { if (p > prizes[best]) best = i; });
        if (prizes[best] <= 0) return { nodes: [], edges: [] };
        const inTree = new Set([best]);
        const treeEdges = [];
        for (;;) {
            // multi-source Dijkstra from the current tree
            const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1);
            for (const v of inTree) dist[v] = 0;
            const done = new Set();
            for (;;) {
                let u = -1;
                for (let i = 0; i < n; i++) if (!done.has(i) && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
                if (u < 0) break;
                done.add(u);
                for (const [v, c] of adj[u]) if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; }
            }
            let pick = -1, pickGain = 0, pickPath = null;
            for (let v = 0; v < n; v++) {
                if (inTree.has(v) || dist[v] === Infinity || prizes[v] <= 0) continue;
                const path = [];
                for (let x = v; !inTree.has(x); x = prev[x]) path.push(x);
                const gain = path.reduce((s, x) => s + prizes[x], 0) - dist[v];
                if (gain > pickGain) { pick = v; pickGain = gain; pickPath = path; }
            }
            if (pick < 0) break;
            for (const x of pickPath) { treeEdges.push([prev[x], x]); inTree.add(x); }
        }
        return { nodes: [...inTree], edges: treeEdges };
    }

    const api = {
        rng, randInt, choice, gaussian, shuffle, sample, weightedChoice,
        zeros, randomMatrix, matmul, transpose, matvec, relu, dot, norm, cosine, softmax, meanVec, featureSpread,
        adjacencyLists, adjacencyMatrix, messagePass, gcnLayer, fanoutCost, ppr, labelPropagation,
        decayWeight, hitAtK, recallAtK, precisionAtK, mrr, ndcgAtK, topK, meanStd,
        fanIn, fanOut, findCycles, scatterGather, greedyPCST,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.GNNCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

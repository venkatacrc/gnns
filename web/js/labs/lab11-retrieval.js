// Lab 11: G-Retriever-style retrieval. Query prizes + edge costs -> prize-collecting Steiner tree -> prompt.
GNN.lab('lab11', {
    title: 'Retrieve a subgraph for an LLM (PCST)',
    goal: 'Build a small textual product graph, score nodes against a shopper question and retrieve a compact connected subgraph with a prize-collecting Steiner tree, then read the prompt it produces.',
    steps: [
        'Pick <b>"I just bought a 65-inch TV"</b>. Compare PCST with plain top-k: which one returns connected context?',
        'Raise <b>edge cost</b>. The tree shrinks to the most valuable core. Lower it: connectors creep in.',
        'Try the BBQ and new-baby questions. Read the textualized prompt: is everything in it relevant?',
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        const world = R.makeRetailWorld(7);
        const graph = R.edgeCounts(world);
        const co = R.coPurchase(world, graph);
        const P = world.products, nP = P.length, n = world.customers.length;
        const deg = graph.prodAdj.map((l) => l.length);
        const cats = world.categories.map((c) => c.name);
        // Nodes: products 0..nP-1, then category nodes. Edges: product-category (in_category), product-product (bought_with, lift > 1.8).
        const edges = [];
        P.forEach((p) => edges.push({ s: p.id, t: nP + cats.indexOf(p.cat), rel: 'in_category' }));
        for (let a = 0; a < nP; a++) for (let b = a + 1; b < nP; b++) {
            const lift = co[a][b] && deg[a] && deg[b] ? (co[a][b] * n) / (deg[a] * deg[b]) : 0;
            if (lift > 1.8 && P[a].cat !== P[b].cat) edges.push({ s: a, t: b, rel: 'bought_with' });
        }
        const names = [...P.map((p) => p.name), ...cats.map((c) => `[${c}]`)];
        const N = names.length;
        const QUERIES = {
            tv: { text: 'I just bought a 65-inch TV. What else do I need?', words: ['tv', '65', 'hdmi', 'soundbar', 'stand'] },
            bbq: { text: 'Planning a backyard BBQ this weekend.', words: ['charcoal', 'grill', 'burger', 'buns', 'chips', 'salsa', 'soda'] },
            baby: { text: 'We have a new baby coming home.', words: ['baby', 'diapers', 'wipes', 'formula', 'infant'] },
        };
        let q = 'tv', edgeCost = 0.6, method = 'pcst';
        const pos = Viz.forceLayout(N, edges.map((e) => [e.s, e.t]), { width: 360, height: 340, seed: 2, iters: 220 });
        const out = h('div');

        const prizes = () => names.map((name) => {
            const lower = name.toLowerCase();
            return QUERIES[q].words.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
        });
        const draw = () => {
            clear(out);
            const pr = prizes();
            let nodes, treeEdges;
            if (method === 'pcst') {
                const res = C.greedyPCST(N, pr, edges.map((e) => [e.s, e.t, edgeCost]));
                nodes = new Set(res.nodes); treeEdges = res.edges;
            } else {
                nodes = new Set(C.topK(pr, 6).filter((i) => pr[i] > 0)); treeEdges = [];
            }
            const inTree = (e) => treeEdges.some(([a, b]) => (a === e.s && b === e.t) || (a === e.t && b === e.s));
            const components = (() => {
                if (!nodes.size) return 0;
                const adj = new Map([...nodes].map((v) => [v, []]));
                for (const e of edges) if (nodes.has(e.s) && nodes.has(e.t)) { adj.get(e.s).push(e.t); adj.get(e.t).push(e.s); }
                const seen = new Set(); let k = 0;
                for (const v of nodes) if (!seen.has(v)) { k++; const st = [v]; while (st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); st.push(...adj.get(x)); } }
                return k;
            })();
            const gained = [...nodes].reduce((s, v) => s + pr[v], 0);
            out.append(UI.stats([['Retrieved nodes', nodes.size], ['Connected pieces', components], ['Total prize', gained], ['Tree edges', treeEdges.length]]),
                Viz.drawGraph({
                    width: 360, height: 340, title: 'product knowledge graph', showLabels: false,
                    nodes: pos.map((p, i) => ({ ...p, r: i >= nP ? 8 : 5, color: nodes.has(i) ? (pr[i] > 0 ? Viz.PALETTE[0] : Viz.PALETTE[3]) : 'var(--line)', title: names[i] })),
                    edges: edges.map((e) => ({ s: e.s, t: e.t, color: inTree(e) ? Viz.PALETTE[0] : 'var(--edge)', width: inTree(e) ? 2.5 : 0.8, opacity: inTree(e) ? 1 : 0.25, dashed: e.rel === 'in_category' })),
                }), UI.note('Orange = retrieved and relevant (prize &gt; 0), purple = connector node kept because it links relevant ones, pale = not retrieved. Dashed = in_category.'));
            const lines = edges.filter((e) => nodes.has(e.s) && nodes.has(e.t)).map((e) => `(${names[e.s]}) -[${e.rel}]-> (${names[e.t]})`);
            const prompt = `Question: ${QUERIES[q].text}\nRetrieved graph context:\n${lines.length ? lines.join('\n') : [...nodes].map((v) => `(${names[v]})`).join('\n') || '(nothing retrieved)'}\nAnswer using only the context above.`;
            out.append(h('h3', {}, 'Prompt sent to the LLM'), h('pre', {}, h('code', {}, prompt)));
        };
        stage.append(UI.controls(
            UI.select({ label: 'Shopper question', options: Object.entries(QUERIES).map(([k, v]) => [k, v.text]), value: q, onChange: (v) => { q = v; draw(); } }),
            UI.select({ label: 'Retrieval', options: [['pcst', 'Prize-collecting Steiner tree'], ['topk', 'Top-6 nodes (no connectivity)']], value: method, onChange: (v) => { method = v; draw(); } }),
            UI.slider({ label: 'Edge cost', min: 0.1, max: 1.5, step: 0.05, value: edgeCost, format: (v) => v.toFixed(2), onInput: (v) => { edgeCost = v; draw(); } }),
        ), out);
        draw();
    },
});

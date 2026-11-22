// Lab 1: from baskets to a graph. Raw co-purchase vs cosine vs lift.
GNN.lab('lab01', {
    title: 'Baskets to graph: who is really related?',
    goal: 'Build the customer-product graph from 90 days of synthetic omnichannel baskets, then compare three ways of scoring "related items".',
    steps: [
        'Pick <b>LG 65" TV</b> with <b>raw counts</b>. Note how many staples (grey) crowd the top.',
        'Switch to <b>cosine</b>, then <b>lift</b>. Which TV accessories climb? Which staples fall?',
        'Try <b>Peanut Butter (Jif)</b>. Is Skippy (a substitute) near the top? Why might baskets hide substitutes?',
        'Change the seed. Do the conclusions survive a different world?',
    ],
    python: 'python/labs/lab01_baskets.py',
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        let seed = 7, productId = null, scoring = 'raw';
        let world, graph, co, deg;

        const rebuild = () => {
            world = R.makeRetailWorld(seed);
            graph = R.edgeCounts(world);
            co = R.coPurchase(world, graph);
            deg = graph.prodAdj.map((list) => list.length);
            if (productId === null) productId = world.products.find((p) => p.name.startsWith('LG')).id;
        };
        const score = (a, b) => {
            const n = world.customers.length;
            if (!co[a][b]) return 0;
            if (scoring === 'cosine') return co[a][b] / Math.sqrt(deg[a] * deg[b]);
            if (scoring === 'lift') return (co[a][b] * n) / (deg[a] * deg[b]);
            return co[a][b];
        };
        const out = h('div');
        const draw = () => {
            clear(out);
            const P = world.products;
            const edges = graph.counts.size;
            const density = edges / (world.customers.length * P.length);
            out.append(UI.stats([
                ['Customers', world.customers.length], ['Products', P.length],
                ['Distinct edges', edges], ['Density', UI.pct(density)],
            ]));
            const ranked = C.topK(P.map((_, b) => (b === productId ? -1 : score(productId, b))), 10);
            const target = P[productId];
            const items = ranked.map((b) => ({
                label: P[b].name,
                value: score(productId, b),
                color: R.isStaple(P[b]) ? 'var(--muted)' : (P[b].cat === target.cat ? Viz.PALETTE[1] : Viz.PALETTE[2]),
            }));
            out.append(h('h3', {}, `Top related to ${target.name} by ${scoring}`),
                UI.barChart(items, { title: `related items by ${scoring}`, format: (v) => UI.fmt(v, scoring === 'raw' ? 0 : 2) }),
                UI.note('<b>Grey</b> = staple (bought weekly or more). <b>Blue</b> = same category (substitute candidates). <b>Green</b> = other categories (complement candidates).'));
            const staples = ranked.filter((b) => R.isStaple(P[b])).length;
            out.append(UI.note(`${staples} of the top 10 are staples. ` +
                (scoring === 'raw' ? 'Raw counts reward popularity: staples co-occur with everything.'
                    : 'Normalizing by item popularity lets rarer, more specific relationships surface.'), staples > 4 ? 'note warn' : 'note good'));
        };
        rebuild();
        const productSel = UI.select({
            label: 'Anchor product',
            options: world.products.map((p) => [String(p.id), p.name]),
            value: String(productId),
            onChange: (v) => { productId = +v; draw(); },
        });
        stage.append(UI.controls(
            productSel,
            UI.select({ label: 'Scoring', options: [['raw', 'Raw co-purchase count'], ['cosine', 'Cosine'], ['lift', 'Lift']], value: scoring, onChange: (v) => { scoring = v; draw(); } }),
            UI.slider({ label: 'World seed', min: 1, max: 20, value: seed, onInput: (v) => { seed = v; rebuild(); draw(); } }),
        ), out);
        draw();
    },
});

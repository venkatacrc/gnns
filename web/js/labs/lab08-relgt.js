// Lab 8: RelGT-style tokenization of a sampled, point-in-time subgraph, with toy attention.
GNN.lab('lab08', {
    title: 'Tokenize a subgraph like RelGT',
    goal: 'Sample a 2-hop neighborhood for a customer at a seed time, turn every node into a token (features, type, hop, time, local structure) and see how attention weighs them.',
    steps: [
        'Read the token table. Which columns would a plain GNN not see directly?',
        'Raise the <b>recency</b> weight. Which tokens gain attention? Now raise the <b>hop penalty</b>.',
        'Turn on <b>ignore time</b>. Count the tokens that come from after the seed time: leakage again.',
        'Turn on <b>global centroids</b>: category summaries every token can attend to, even ones far outside the sample.',
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        const world = R.makeRetailWorld(7);
        const P = world.products;
        let customer = 3, seedDay = 380, fan1 = 6, fan2 = 3;
        let wRecency = 1, wHop = 0.5, wType = 0.3, ignoreTime = false, centroids = false;
        const out = h('div');

        // Last interaction day for (customer, product) before `until`.
        const lastDay = new Map();
        const key = (c, p) => c * 10000 + p;
        const sample = () => {
            lastDay.clear();
            const until = ignoreTime ? Infinity : seedDay;
            for (const t of world.txns) if (t.day < until) {
                const k = key(t.c, t.p);
                if (!lastDay.has(k) || lastDay.get(k) < t.day) lastDay.set(k, t.day);
            }
            const recentItems = (c) => P.map((p) => [p.id, lastDay.get(key(c, p.id))]).filter(([, d]) => d !== undefined)
                .sort((a, b) => b[1] - a[1]);
            const tokens = [{ type: 'customer', id: customer, hop: 0, day: seedDay, label: `customer ${customer} (seed)` }];
            const items = recentItems(customer).slice(0, fan1);
            for (const [p, day] of items) {
                tokens.push({ type: 'product', id: p, hop: 1, day, label: P[p].name, cat: P[p].cat });
                const buyers = world.customers.map((c) => [c.id, lastDay.get(key(c.id, p))]).filter(([c, d]) => c !== customer && d !== undefined)
                    .sort((a, b) => b[1] - a[1]).slice(0, fan2);
                for (const [c, d] of buyers) tokens.push({ type: 'customer', id: c, hop: 2, day: d, label: `customer ${c}`, via: P[p].name });
            }
            // local structure: how many times this entity appears in the sample (a cheap structural signal)
            const freq = new Map();
            tokens.forEach((t) => freq.set(t.type + t.id, (freq.get(t.type + t.id) || 0) + 1));
            tokens.forEach((t) => { t.local = freq.get(t.type + t.id); t.dt = seedDay - t.day; });
            return tokens;
        };
        const draw = () => {
            clear(out);
            const tokens = sample();
            if (centroids) {
                for (const cat of ['TVs', 'Grilling', 'Baby', 'Coffee']) tokens.push({ type: 'centroid', id: cat, hop: '-', dt: 0, local: 0, label: `centroid: ${cat}`, day: seedDay });
            }
            // Toy attention from the seed: hand-set weights (RelGT learns these from data).
            const logits = tokens.map((t, i) => (i === 0 ? -Infinity :
                wRecency * Math.exp(-Math.max(t.dt, 0) / 30) - wHop * (typeof t.hop === 'number' ? t.hop : 1) +
                wType * (t.type === 'product' ? 1 : 0) + 0.2 * Math.log(1 + t.local) + (t.type === 'centroid' ? 0.4 : 0)));
            const att = C.softmax(logits.map((x) => (x === -Infinity ? -1e9 : x)));
            const future = tokens.filter((t) => t.dt < 0).length;
            out.append(UI.stats([['Tokens', tokens.length], ['Hop-1 / hop-2', `${tokens.filter((t) => t.hop === 1).length} / ${tokens.filter((t) => t.hop === 2).length}`],
                ['Tokens from the future', future]]));
            if (future) out.append(UI.note(`${future} token(s) come from after the seed time (negative \u0394t). A point-in-time sampler must drop them.`, 'note warn'));
            const top = C.topK(att, 8);
            out.append(h('h3', {}, 'Attention from the seed (top 8)'),
                UI.barChart(top.map((i) => ({ label: tokens[i].label, value: att[i], color: tokens[i].type === 'centroid' ? Viz.PALETTE[3] : (tokens[i].hop === 1 ? Viz.PALETTE[0] : Viz.PALETTE[1]) })), { title: 'attention weights', format: (v) => UI.pct(v) }),
                UI.note('Orange = hop-1 product, blue = hop-2 customer, purple = global centroid. Weights are hand-set for intuition.'));
            out.append(UI.table(['Token', 'Type', 'Hop', '\u0394t (days before seed)', 'Local count', 'Feature'],
                tokens.map((t) => [t.label, t.type, t.hop, t.dt, t.local, t.cat || t.via || ''])
                , { caption: 'One row per token: features + type + hop + time + local structure' }));
        };
        stage.append(UI.controls(
            UI.slider({ label: 'Seed customer', min: 0, max: world.customers.length - 1, value: customer, onInput: (v) => { customer = v; draw(); } }),
            UI.slider({ label: 'Seed day', min: 60, max: world.days, step: 10, value: seedDay, onInput: (v) => { seedDay = v; draw(); } }),
            UI.slider({ label: 'Hop-1 fanout', min: 1, max: 12, value: fan1, onInput: (v) => { fan1 = v; draw(); } }),
            UI.slider({ label: 'Hop-2 fanout', min: 0, max: 6, value: fan2, onInput: (v) => { fan2 = v; draw(); } }),
            UI.slider({ label: 'Recency weight', min: 0, max: 3, step: 0.1, value: wRecency, format: (v) => v.toFixed(1), onInput: (v) => { wRecency = v; draw(); } }),
            UI.slider({ label: 'Hop penalty', min: 0, max: 2, step: 0.1, value: wHop, format: (v) => v.toFixed(1), onInput: (v) => { wHop = v; draw(); } }),
            UI.slider({ label: 'Product-type bonus', min: 0, max: 2, step: 0.1, value: wType, format: (v) => v.toFixed(1), onInput: (v) => { wType = v; draw(); } }),
            UI.toggle({ label: 'Ignore time (leaky sampler)', checked: ignoreTime, onChange: (v) => { ignoreTime = v; draw(); } }),
            UI.toggle({ label: 'Global centroids', checked: centroids, onChange: (v) => { centroids = v; draw(); } }),
        ), out);
        draw();
    },
});

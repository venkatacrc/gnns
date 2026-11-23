// Lab 10: decayed real-time features vs transient edges, plus a serving latency budget.
const LAB10_BUDGET_MS = 200;
GNN.lab('lab10', {
    title: `Real-time signals and the ${LAB10_BUDGET_MS} ms budget`,
    goal: 'Turn a customer\'s 14 months of synthetic purchases into decayed channel features, inject a burst of noisy clicks two ways, and fit a serving path into a latency budget.',
    steps: [
        'Slide the <b>half-life</b> from 7 to 180 days. Which categories dominate the profile at each setting?',
        'Inject a <b>click burst</b> on Grilling. Compare Option A (decayed feature at click weight 0.2) with Option B (edges weighted like purchases). Which distorts the profile more?',
        `In the budget calculator, turn the <b>context cache</b> off. Do you still make ${LAB10_BUDGET_MS} ms?`,
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        const world = R.makeRetailWorld(7);
        const cats = world.categories.map((c) => c.name);
        const catOf = world.products.map((p) => cats.indexOf(p.cat));
        let customer = 3, halfLife = 30, burst = 0, clickWeight = 0.2, option = 'A';
        const out = h('div'), budgetOut = h('div');

        const profile = (decayed) => {
            const v = new Array(cats.length).fill(0);
            for (const t of world.txns) if (t.c === customer) v[catOf[t.p]] += decayed ? C.decayWeight(world.days - t.day, halfLife) : 1;
            return v;
        };
        const normalize = (v) => { const s = v.reduce((a, b) => a + b, 0) || 1; return v.map((x) => x / s); };
        const draw = () => {
            clear(out);
            const raw = normalize(profile(false));
            const base = profile(true);
            const grill = cats.indexOf('Grilling');
            const withBurst = base.slice();
            withBurst[grill] += burst * (option === 'A' ? clickWeight : 1);   // B: transient edges counted like purchases
            const before = normalize(base), after = normalize(withBurst);
            const drift = 0.5 * before.reduce((s, x, i) => s + Math.abs(x - after[i]), 0);   // total variation distance
            const order = C.topK(after, 8);
            out.append(h('h3', {}, `Customer ${customer}: category profile now (half-life ${halfLife} days)`),
                UI.barChart(order.map((i) => ({ label: cats[i], value: after[i], color: i === grill && burst ? Viz.PALETTE[4] : Viz.PALETTE[1] })), { title: 'decayed profile', format: UI.pct }),
                UI.stats([['Top category (all-time counts)', cats[C.topK(raw, 1)[0]]], ['Top category (decayed)', cats[order[0]]],
                    ['Profile drift from burst', UI.pct(drift)]]),
                UI.note(burst ? (option === 'A'
                    ? `Option A: ${burst} clicks enter as a decayed feature at weight ${clickWeight}. The profile shifts by ${UI.pct(drift)}, and the burst fades on its own half-life.`
                    : `Option B: ${burst} transient click edges weighted like purchases shift the general profile by ${UI.pct(drift)}. Short-term noise is now baked into an embedding many teams reuse.`)
                    : 'Add a click burst to compare the two designs.', burst && option === 'B' ? 'note warn' : 'note'));
        };
        // ---- latency budget ----
        const parts = { 'Feature fetch': 25, 'Relational joins': 120, 'Embedding lookup': 10, 'ANN retrieval': 20, 'Shallow model (Triton)': 30, 'Network + overhead': 40 };
        let kvCache = true;
        const drawBudget = () => {
            clear(budgetOut);
            const items = Object.entries(parts).map(([k, v]) => ({ label: k, value: kvCache && k === 'Relational joins' ? 8 : v }));
            const total = items.reduce((s, i) => s + i.value, 0);
            budgetOut.append(UI.barChart(items, { title: 'latency per stage', format: (v) => `${v} ms` }),
                UI.note(`Total ${total} ms vs ${LAB10_BUDGET_MS} ms budget. ${kvCache ? 'Joins are precomputed into a key-value context cache (stream deltas keep it fresh).' : 'Runtime joins dominate.'}`, total <= LAB10_BUDGET_MS ? 'note good' : 'note warn'));
        };
        stage.append(UI.controls(
            UI.slider({ label: 'Customer', min: 0, max: world.customers.length - 1, value: customer, onInput: (v) => { customer = v; draw(); } }),
            UI.slider({ label: 'Half-life (days)', min: 7, max: 180, step: 1, value: halfLife, onInput: (v) => { halfLife = v; draw(); } }),
            UI.slider({ label: 'Grilling click burst (events today)', min: 0, max: 30, value: burst, onInput: (v) => { burst = v; draw(); } }),
            UI.select({ label: 'Design', options: [['A', 'A: decayed input feature'], ['B', 'B: transient edges in the convolution']], value: option, onChange: (v) => { option = v; draw(); } }),
            UI.slider({ label: 'Click weight (option A)', min: 0.05, max: 1, step: 0.05, value: clickWeight, format: (v) => v.toFixed(2), onInput: (v) => { clickWeight = v; draw(); } }),
        ), out, h('hr'), h('h3', {}, 'Serving latency budget'), UI.controls(
            UI.toggle({ label: 'Key-value context cache', checked: kvCache, onChange: (v) => { kvCache = v; drawBudget(); } }),
            ...Object.keys(parts).filter((k) => k !== 'Relational joins').map((k) => UI.slider({ label: `${k} (ms)`, min: 1, max: 100, value: parts[k], onInput: (v) => { parts[k] = v; drawBudget(); } })),
        ), budgetOut);
        draw(); drawBudget();
    },
});

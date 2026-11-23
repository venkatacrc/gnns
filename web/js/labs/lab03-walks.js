// Lab 3: PinSage-style random walks with cadence bias, plus a fanout cost calculator.
GNN.lab('lab03', {
    title: 'Random walks, frequency bias and fanout cost',
    goal: 'Run customer -> product -> customer -> product walks from a TV buyer, rank items by visits (a PPR neighborhood) and fix the banana problem with cadence bias.',
    steps: [
        'Set <b>beta = 0</b> (count-weighted walks). Which items dominate the visit ranking?',
        'Slide <b>beta</b> to 1. Watch TV accessories climb as staples fall.',
        'Drop walks to 50, then raise to 800. When does the ranking stabilize? More walks cost more compute, so find the smallest count that is stable.',
        'In the cost calculator, compare fanouts [15, 10, 5] with [25, 25]. Which is cheaper per seed?',
    ],
    mount(stage) {
        const { h, clear } = UI, R = GNNRetail;
        const world = R.makeRetailWorld(7);
        const graph = R.edgeCounts(world);
        const tvIds = new Set(world.products.filter((p) => p.cat === 'TVs').map((p) => p.id));
        const tvBuyers = graph.custAdj.map((l, c) => [c, l]).filter(([, l]) => l.some((e) => tvIds.has(e.p))).map(([c]) => c);
        let customer = tvBuyers[0] ?? 0, beta = 0, walks = 800, keep = 10;
        let fan = [15, 10, 5], avgDeg = 30;

        const out = h('div'), costOut = h('div');
        const draw = () => {
            clear(out);
            const visits = R.biasedWalkVisits(world, graph, customer, { walks, beta, seed: 1 });
            const owned = new Set(graph.custAdj[customer].map((e) => e.p));
            const ranked = GNNCore.topK(visits, keep);
            const P = world.products;
            out.append(h('h3', {}, `Top ${keep} by visits from customer ${customer} (beta = ${beta})`),
                UI.barChart(ranked.map((p) => ({
                    label: P[p].name, value: visits[p],
                    color: R.isStaple(P[p]) ? 'var(--muted)' : (P[p].cat.startsWith('TV') ? Viz.PALETTE[0] : Viz.PALETTE[2]),
                    highlight: owned.has(p) ? false : undefined,
                })), { title: 'walk visit counts', format: (v) => String(v) }),
                UI.note('<b>Orange</b> = TV or accessory, <b>grey</b> = staple. Faded bars are items the customer already owns: positives come from the ranking, but discovery is the unfaded part.'));
            const total = visits.reduce((a, b) => a + b, 0);
            const stapleShare = visits.reduce((s, v, p) => s + (R.isStaple(P[p]) ? v : 0), 0) / Math.max(total, 1);
            out.append(UI.stats([['Item visits', total], ['Distinct items', visits.filter((v) => v > 0).length], ['Visits on staples', UI.pct(stapleShare)]]));
        };
        const drawCost = () => {
            clear(costOut);
            // A zero fanout means "stop here": only hops before the first zero count.
            const active = fan.slice(0, fan.indexOf(0) === -1 ? fan.length : fan.indexOf(0));
            const { perHop, total } = GNNCore.fanoutCost(active, avgDeg);
            costOut.append(h('h3', {}, 'Fanout cost per seed'),
                UI.barChart(perHop.map((v, i) => ({ label: `hop ${i + 1}`, value: v })), { title: 'nodes per hop', format: (v) => v.toLocaleString() }),
                UI.stats([['Fanouts', `[${active.join(', ')}]`], ['Nodes touched per seed', total.toLocaleString()], ['Per batch of 1,024 seeds', (total * 1024).toLocaleString()]]));
        };
        stage.append(UI.controls(
            UI.select({ label: 'TV-buying customer', options: tvBuyers.map((c) => [String(c), `Customer ${c}`]), value: String(customer), onChange: (v) => { customer = +v; draw(); } }),
            UI.slider({ label: 'Cadence bias beta', min: 0, max: 1, step: 0.1, value: beta, format: (v) => v.toFixed(1), onInput: (v) => { beta = +v.toFixed(1); draw(); } }),
            UI.slider({ label: 'Walks', min: 50, max: 800, step: 50, value: walks, onInput: (v) => { walks = v; draw(); } }),
        ), out, h('hr'), UI.controls(
            ...[0, 1, 2].map((i) => UI.slider({ label: `Fanout hop ${i + 1} (0 = stop)`, min: 0, max: 30, value: fan[i], onInput: (v) => { fan[i] = v; drawCost(); } })),
            UI.slider({ label: 'Average degree', min: 2, max: 100, value: avgDeg, onInput: (v) => { avgDeg = v; drawCost(); } }),
        ), costOut);
        draw(); drawCost();
    },
});

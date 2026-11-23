// Lab 6: confidence-routed hybrid (statistical model + LLM fallback) for substitute / complement labels.
// This is a SIMULATION with stated assumptions: the statistical model's correctness is drawn from its
// confidence (calibrated) or a sharper curve (overconfident); the LLM has a fixed accuracy knob.
GNN.lab('lab06', {
    title: 'Hybrid routing: when to call the LLM',
    goal: 'Route product pairs between a cheap statistical model (a stand-in for gradient-boosted trees or a tabular foundation model) and an LLM fallback, and find the threshold that balances accuracy against LLM calls.',
    steps: [
        'With a calibrated model, sweep the threshold. Find where hybrid accuracy beats both single models.',
        'Turn on <b>overconfident</b>. The reliability bars drift below the diagonal. What happens to the hybrid curve?',
        'Lower LLM accuracy to 0.7 (models disagreeing, hallucinated reasons). Where should the threshold move?',
        'Note the share of pairs routed to the LLM: that is your cost and latency bill.',
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        const world = R.makeRetailWorld(7);
        const graph = R.edgeCounts(world);
        const co = R.coPurchase(world, graph);
        const P = world.products, n = world.customers.length;
        const deg = graph.prodAdj.map((l) => l.length);
        // Ground truth from structure (independent of the model): same category -> substitute,
        // different category with lift > 1.5 -> complement, otherwise unrelated.
        const pairs = [];
        for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
            const lift = co[a][b] && deg[a] && deg[b] ? (co[a][b] * n) / (deg[a] * deg[b]) : 0;
            const truth = P[a].cat === P[b].cat ? 'substitute' : (lift > 1.5 ? 'complement' : 'unrelated');
            // Confidence grows with evidence (co-purchase support): sparse pairs are uncertain.
            const conf = 0.4 + 0.59 * (1 - Math.exp(-co[a][b] / 6));
            pairs.push({ a, b, truth, conf });
        }
        let threshold = 0.7, llmAcc = 0.8, overconfident = false;
        const out = h('div');

        const simulate = (thr) => {
            const r = C.rng(42);
            let statCorrect = 0, llmCorrect = 0, hybridCorrect = 0, routed = 0;
            for (const p of pairs) {
                const pStat = overconfident ? Math.pow(p.conf, 3) : p.conf;
                const s = r() < pStat, l = r() < llmAcc;
                statCorrect += s; llmCorrect += l;
                if (p.conf >= thr) hybridCorrect += s; else { hybridCorrect += l; routed++; }
            }
            const N = pairs.length;
            return { stat: statCorrect / N, llm: llmCorrect / N, hybrid: hybridCorrect / N, routed: routed / N };
        };
        const draw = () => {
            clear(out);
            const now = simulate(threshold);
            const counts = pairs.reduce((m, p) => ({ ...m, [p.truth]: (m[p.truth] || 0) + 1 }), {});
            out.append(UI.stats([
                ['Pairs', pairs.length], ['Substitute / complement / unrelated', `${counts.substitute || 0} / ${counts.complement || 0} / ${counts.unrelated || 0}`],
                ['Statistical only', UI.pct(now.stat)], ['LLM only', UI.pct(now.llm)], ['Hybrid', UI.pct(now.hybrid)], ['Routed to LLM', UI.pct(now.routed)],
            ]));
            const thrs = Array.from({ length: 21 }, (_, i) => 0.4 + i * 0.03);
            const sims = thrs.map((t) => [t, simulate(t)]);
            out.append(h('h3', {}, 'Accuracy vs routing threshold'),
                UI.lineChart([
                    { name: 'hybrid', color: Viz.PALETTE[0], points: sims.map(([t, s]) => [t, s.hybrid]) },
                    { name: 'statistical only', color: Viz.PALETTE[1], points: sims.map(([t, s]) => [t, s.stat]) },
                    { name: 'LLM only', color: Viz.PALETTE[2], points: sims.map(([t, s]) => [t, s.llm]) },
                    { name: 'share routed', color: 'var(--muted)', points: sims.map(([t, s]) => [t, s.routed]) },
                ], { title: 'accuracy vs threshold', xLabel: 'threshold', yMin: 0, yMax: 1 }),
                h('p', { class: 'small' }, ['hybrid', 'statistical only', 'LLM only', 'share routed'].map((name, i) =>
                    h('span', { style: `color:${i < 3 ? Viz.PALETTE[i] : 'var(--muted)'};margin-right:12px` }, `\u25cf ${name}`))));
            // Reliability diagram: bin by stated confidence, show empirical accuracy.
            const r = C.rng(7);
            const bins = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((lo) => ({ lo, hits: 0, total: 0 }));
            for (const p of pairs) {
                const bin = bins[Math.min(bins.length - 1, Math.floor((p.conf - 0.4) / 0.1))];
                bin.total++; bin.hits += r() < (overconfident ? Math.pow(p.conf, 3) : p.conf);
            }
            out.append(h('h3', {}, 'Reliability: stated confidence vs actual accuracy'),
                UI.barChart(bins.filter((b) => b.total).map((b) => ({ label: `conf ${b.lo.toFixed(1)}-${(b.lo + 0.1).toFixed(1)} (n=${b.total})`, value: b.hits / b.total })), { title: 'reliability', max: 1, format: (v) => UI.pct(v) }),
                UI.note(overconfident ? 'Accuracy sits well below stated confidence: routing on this score trusts the model exactly where it is wrong.'
                    : 'Accuracy roughly tracks stated confidence: the threshold means what it says.', overconfident ? 'note warn' : 'note good'),
                UI.note('Simulation: correctness is drawn from confidence with stated assumptions. Real calibration must be measured on labeled pairs.'));
        };
        stage.append(UI.controls(
            UI.slider({ label: 'Routing threshold', min: 0.4, max: 1, step: 0.02, value: threshold, format: (v) => v.toFixed(2), onInput: (v) => { threshold = v; draw(); } }),
            UI.slider({ label: 'LLM accuracy (assumption)', min: 0.5, max: 0.95, step: 0.05, value: llmAcc, format: (v) => v.toFixed(2), onInput: (v) => { llmAcc = v; draw(); } }),
            UI.toggle({ label: 'Statistical model is overconfident', checked: overconfident, onChange: (v) => { overconfident = v; draw(); } }),
        ), out);
        draw();
    },
});

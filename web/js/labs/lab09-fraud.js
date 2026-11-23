// Lab 9: find planted AML patterns, then spread risk from known-bad accounts.
GNN.lab('lab09', {
    title: 'Hunt money mules on a transaction graph',
    goal: 'A synthetic transfer graph hides fan-in, fan-out, a cycle, scatter-gather structuring and a long layering chain. Find them with pattern detectors, then with guilt-by-association from two known-bad accounts.',
    steps: [
        'In <b>patterns</b> mode with every transfer counted, compare average precision with the chance line. Dense everyday traffic is full of cycles and fan-ins.',
        'Raise <b>minimum amount</b> to 500. Structure plus a transaction feature beats structure alone. (Read the caveat under the graph.)',
        'Switch to <b>propagation</b> and step hops from 0 to 6. Look at the alert queue: which <i>normal</i> accounts get flagged, and why are they the victims who paid the mule collector?',
        'Try <b>combined</b>. Why can adding propagation lower precision? What would an investigator need to tell victims from mules?',
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, F = GNNFraud;
        const g = F.makeTransactionGraph(5);
        const n = g.accounts.length;
        const pos = Viz.forceLayout(n, g.txns.map((t) => [t.s, t.t]), { width: 360, height: 340, seed: 9, iters: 200 });
        const suspicious = (i) => g.accounts[i].role !== 'normal';
        const chance = F.averagePrecision(g, new Array(n).fill(0));
        let mode = 'patterns', minFanIn = 5, minFanOut = 5, hops = 3, decay = 0.6, minAmount = 0;
        const out = h('div');

        const draw = () => {
            clear(out);
            const s = F.riskScores(g, { mode, minFanIn, minFanOut, hops, decay, minAmount });
            const ranked = C.topK(s, n).filter((i) => s[i] > 0);
            const flagged = new Set(ranked.filter((i) => s[i] >= 0.3));
            const truth = g.accounts.filter((a) => suspicious(a.id)).length;
            const tp = [...flagged].filter(suspicious).length;
            const ap = F.averagePrecision(g, s);
            const top10 = ranked.slice(0, 10);
            out.append(UI.stats([
                ['Accounts / transfers', `${n} / ${g.txns.length}`], ['Planted suspicious', truth],
                ['Flagged (score \u2265 0.3)', flagged.size], ['Recall', UI.pct(tp / truth)],
                ['Precision', flagged.size ? UI.pct(tp / flagged.size) : '-'], ['Average precision', `${UI.fmt(ap, 3)} (chance ${UI.fmt(chance, 3)})`],
            ]));
            const known = new Set(g.knownBad);
            out.append(Viz.drawGraph({
                width: 360, height: 340, title: 'transaction graph', showLabels: false,
                nodes: pos.map((p, i) => ({ ...p, r: known.has(i) ? 9 : 6, color: Viz.heatColor(s[i]), ring: suspicious(i) ? 'var(--red)' : null, title: `account ${i}: ${g.accounts[i].role}, score ${UI.fmt(s[i], 2)}` })),
                edges: g.txns.map((t) => ({ s: t.s, t: t.t, directed: true, width: t.amount > 2000 ? 2 : 1, opacity: t.amount >= minAmount ? 0.5 : 0.12 })),
            }), UI.note('Color = risk score (blue low, red high). Red rings mark planted suspicious accounts (normally hidden from you). Large nodes are the known-bad starting points. Faded edges are below the minimum amount.'),
            UI.note('Caveat: in this synthetic world mule transfers are larger than almost all everyday payments, so the amount filter works unrealistically well. Real launderers structure amounts to blend in: note the smurf transfers of 9,500, just under a 10,000 reporting line.', 'note warn'));
            out.append(UI.table(['Rank', 'Account', 'Score', 'True role'], top10.map((i, r) => [r + 1, i, UI.fmt(s[i], 2), suspicious(i) ? g.accounts[i].role : 'normal']),
                { caption: 'Alert queue: top 10' }));
        };
        stage.append(UI.controls(
            UI.select({ label: 'Detection', options: [['patterns', 'Pattern detectors'], ['propagation', 'Label propagation'], ['combined', 'Combined']], value: mode, onChange: (v) => { mode = v; draw(); } }),
            UI.slider({ label: 'Minimum amount for patterns', min: 0, max: 2000, step: 50, value: minAmount, onInput: (v) => { minAmount = v; draw(); } }),
            UI.slider({ label: 'Fan-in: min distinct sources', min: 2, max: 8, value: minFanIn, onInput: (v) => { minFanIn = v; draw(); } }),
            UI.slider({ label: 'Fan-out: min distinct targets', min: 2, max: 8, value: minFanOut, onInput: (v) => { minFanOut = v; draw(); } }),
            UI.slider({ label: 'Propagation hops', min: 0, max: 6, value: hops, onInput: (v) => { hops = v; draw(); } }),
            UI.slider({ label: 'Decay per hop', min: 0.3, max: 0.9, step: 0.05, value: decay, format: (v) => v.toFixed(2), onInput: (v) => { decay = v; draw(); } }),
        ), out);
        draw();
    },
});

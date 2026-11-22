// Lab 2: message passing by hand. Aggregators, normalization, depth and over-smoothing.
GNN.lab('lab02', {
    title: 'Message passing playground',
    goal: 'Watch one weight-free aggregation step at a time on a tiny graph with a hub, and see what each aggregator can tell apart.',
    steps: [
        'With <b>mean</b>, step from 0 to 8 layers. Watch node colors converge and the spread curve fall: over-smoothing.',
        'Switch to <b>sym</b> (GCN normalization). How does the hub (node H) influence its neighbors now?',
        'Switch to <b>sum</b> without normalization. Why do the values explode?',
        'Read the expressivity table: which aggregators separate {a, b} from {a, a, b, b}?',
    ],
    python: 'python/labs/lab02_message_passing.py',
    mount(stage) {
        const { h, clear } = UI, C = GNNCore;
        // 0..6 a small community, 7 = hub connected to everyone, 8-9 a pendant pair.
        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const edges = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 6], [6, 4], [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [6, 8], [8, 9]];
        const n = labels.length;
        const adj = C.adjacencyLists(n, edges);
        // feature 0: "electronics affinity", feature 1: "grocery affinity"
        const X0 = [[1, 0], [1, 0], [0.9, 0.1], [0.5, 0.5], [0, 1], [0.1, 0.9], [0, 1], [0.5, 0.5], [1, 0], [0, 1]];
        const pos = Viz.forceLayout(n, edges, { seed: 4 });
        let agg = 'mean', layers = 0, selfLoop = true;

        const run = (kind, L) => {
            let X = X0;
            const spread = [[0, C.featureSpread(X)]];
            for (let l = 1; l <= L; l++) {
                X = C.messagePass(X, adj, kind === 'sym' ? { selfLoop, norm: 'sym' } : { agg: kind, selfLoop });
                spread.push([l, C.featureSpread(X)]);
            }
            return { X, spread };
        };
        const out = h('div');
        const draw = () => {
            clear(out);
            const { X } = run(agg, layers);
            const vals = X.map((v) => v[0] / Math.max(v[0] + v[1], 1e-9));
            out.append(h('h3', {}, `${layers} layer(s) of ${agg} aggregation`),
                Viz.drawGraph({
                    title: 'message passing graph',
                    nodes: pos.map((p, i) => ({ ...p, label: labels[i], color: Viz.heatColor(vals[i]), r: i === 7 ? 14 : 10, title: `${labels[i]}: [${X[i].map((x) => UI.fmt(x, 2)).join(', ')}]` })),
                    edges: edges.map(([s, t]) => ({ s, t })),
                }),
                UI.note('Color = share of "electronics" in the node vector (blue = grocery, red = electronics). H is the hub.'));
            const curves = ['mean', 'sym', 'max'].map((kind, i) => ({ name: kind, color: Viz.PALETTE[i], points: run(kind, 10).spread }));
            out.append(UI.lineChart(curves, { title: 'feature spread vs layers', xLabel: 'layers', yLabel: 'spread', yMin: 0 }),
                h('p', { class: 'small' }, curves.map((c) => h('span', { style: `color:${c.color};margin-right:12px` }, `\u25cf ${c.name}`))));
            out.append(UI.table(['Node', 'Vector'], X.map((v, i) => [labels[i], `[${v.map((x) => UI.fmt(x, 2)).join(', ')}]`]), { caption: 'Node vectors after aggregation' }));
            const a = [1, 0], b = [0, 1];
            const multisets = { '{a, b}': [a, b], '{a, a, b, b}': [a, a, b, b], '{a, b, b}': [a, b, b] };
            const aggs = {
                mean: (vs) => C.meanVec(vs, 2),
                sum: (vs) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]),
                max: (vs) => [Math.max(...vs.map((v) => v[0])), Math.max(...vs.map((v) => v[1]))],
            };
            out.append(UI.table(['Neighbors', 'mean', 'sum', 'max'], Object.entries(multisets).map(([name, vs]) =>
                [name, ...Object.values(aggs).map((f) => `[${f(vs).map((x) => UI.fmt(x, 2)).join(', ')}]`)]), { caption: 'What each aggregator sees (identical rows = indistinguishable)' }),
            UI.note('Only <b>sum</b> gives three different outputs: it counts, which is why GIN uses sum and why fan-in detection needs it.'));
        };
        stage.append(UI.controls(
            UI.select({ label: 'Aggregator', options: [['mean', 'Mean'], ['sym', 'Sym-normalized (GCN)'], ['sum', 'Sum'], ['max', 'Max']], value: agg, onChange: (v) => { agg = v; draw(); } }),
            UI.slider({ label: 'Layers', min: 0, max: 10, value: layers, onInput: (v) => { layers = v; draw(); } }),
            UI.toggle({ label: 'Self-loops', checked: selfLoop, onChange: (v) => { selfLoop = v; draw(); } }),
        ), out);
        draw();
    },
});

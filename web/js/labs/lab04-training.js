// Lab 4: train the dual encoder in the browser. Masking, negative pools, supervision cleaning.
GNN.lab('lab04', {
    title: 'Train a dual encoder: leakage and negatives',
    goal: 'Train the customer / product two-tower model on the synthetic world and reproduce two findings: the convolution-leakage signature and the false-negative cost of hard negatives.',
    steps: [
        'Press <b>Masked vs leaky</b>. Compare final training loss and held-out Recall@5. Which run would a loss-only dashboard prefer?',
        'With masking on, set hard negatives to 10 and random to 2. Train and compare with the default (12 random, 0 hard).',
        'Toggle <b>drop fuel from supervision</b>. Does held-out recall move more than the seed noise (try two seeds)?',
        'Every run lands in the run log. Change one knob at a time.',
    ],
    python: 'python/labs/lab04_training.py',
    mount(stage) {
        const { h, clear } = UI, R = GNNRetail;
        const cfg = { mask: true, randomNegs: 12, hardNegs: 0, steps: 12000, dropFuel: false, seed: 7 };
        const log = [];
        let cancel = () => {};
        const status = h('p', { class: 'muted', 'aria-live': 'polite' }, 'Ready.');
        const chartOut = h('div'), logOut = h('div');

        const train = (overrides = {}) => {
            const c = { ...cfg, ...overrides };
            const world = R.makeRetailWorld(c.seed);
            const split = R.splitEdges(world, { seed: c.seed + 100, dropFuel: c.dropFuel });
            const run = R.trainDualEncoder(world, split, { ...c, evalEvery: 1000, seed: c.seed + 1 });
            const label = `${c.mask ? 'masked' : 'LEAKY'} r${c.randomNegs}/h${c.hardNegs}${c.dropFuel ? ' -fuel' : ''} s${c.seed}`;
            return { label, cfg: c, history: run.history, final: run.history[run.history.length - 1] };
        };
        const drawRuns = (runs) => {
            clear(chartOut);
            const series = (key) => runs.map((r, i) => ({ name: r.label, color: Viz.PALETTE[i % Viz.PALETTE.length], points: r.history.map((p) => [p.step, p[key]]) }));
            const legend = h('p', { class: 'small' }, runs.map((r, i) => h('span', { style: `color:${Viz.PALETTE[i % Viz.PALETTE.length]};margin-right:12px` }, `\u25cf ${r.label}`)));
            chartOut.append(h('h3', {}, 'Training loss'), UI.lineChart(series('loss'), { title: 'training loss', xLabel: 'step', yMin: 0 }),
                h('h3', {}, 'Held-out Recall@5'), UI.lineChart(series('heldRecall'), { title: 'held-out recall', xLabel: 'step', yMin: 0 }), legend);
            if (runs.length === 2 && runs[0].cfg.mask !== runs[1].cfg.mask) {
                const [m, l] = runs[0].cfg.mask ? runs : [runs[1], runs[0]];
                chartOut.append(UI.note(`Leaky run: loss ${UI.fmt(l.final.loss, 2)} vs ${UI.fmt(m.final.loss, 2)} masked, ` +
                    `but held-out recall ${UI.fmt(l.final.heldRecall, 3)} vs ${UI.fmt(m.final.heldRecall, 3)}. ` +
                    'Lower loss, worse generalization: the model is copying targets from its own convolution.', 'note warn'));
            }
        };
        const drawLog = () => {
            clear(logOut);
            if (!log.length) return;
            logOut.append(UI.table(['Run', 'Train loss', 'Held-out Recall@5', 'Out-of-time Hit@5'],
                log.map((r) => [r.label, UI.fmt(r.final.loss, 3), UI.fmt(r.final.heldRecall, 3), UI.fmt(r.final.timeHit, 3)]),
                { caption: 'Run log (newest first). Compare against seed noise: about \u00b10.03 Recall@5 across seeds.' }));
        };
        const go = (variants) => {
            cancel();
            status.textContent = `Training ${variants.length} model(s)...`;
            cancel = UI.later(() => {
                const t0 = performance.now();
                const runs = variants.map((v) => train(v));
                log.unshift(...runs.slice().reverse());
                drawRuns(runs); drawLog();
                status.textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s.`;
            });
        };
        stage.append(UI.controls(
            UI.toggle({ label: 'Mask positives (48/16 style)', checked: cfg.mask, onChange: (v) => { cfg.mask = v; } }),
            UI.slider({ label: 'Random negatives', min: 0, max: 20, value: cfg.randomNegs, onInput: (v) => { cfg.randomNegs = v; } }),
            UI.slider({ label: 'Hard (same-category) negatives', min: 0, max: 12, value: cfg.hardNegs, onInput: (v) => { cfg.hardNegs = v; } }),
            UI.slider({ label: 'Steps', min: 2000, max: 20000, step: 2000, value: cfg.steps, onInput: (v) => { cfg.steps = v; } }),
            UI.toggle({ label: 'Drop fuel from supervision', checked: cfg.dropFuel, onChange: (v) => { cfg.dropFuel = v; } }),
            UI.slider({ label: 'Seed', min: 7, max: 11, value: cfg.seed, onInput: (v) => { cfg.seed = v; } }),
        ), h('div', { class: 'controls' },
            UI.button('Train', () => go([{}]), 'btn primary'),
            UI.button('Masked vs leaky', () => go([{ mask: true }, { mask: false }])),
            UI.button('Clear log', () => { log.length = 0; drawLog(); })),
        status, chartOut, logOut);
        return () => cancel();
    },
});

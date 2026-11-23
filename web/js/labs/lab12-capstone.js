// Lab 12: capstone. Pre-register a hypothesis, run a controlled 5-seed comparison, get a verdict.
GNN.lab('lab12', {
    title: 'Capstone: run and defend an experiment',
    goal: 'Choose one knob, write the success threshold before you look, run baseline and treatment across five seeds, and get a verdict you could present.',
    steps: [
        'Pick a knob and the treatment value. Set the minimum lift you would act on <b>before</b> running.',
        'Run. The verdict compares the lift with both your threshold and the seed noise.',
        'Copy the summary into your notes. Then try a hypothesis you expect to fail: does the lab tell you so?',
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        const SEEDS = [7, 8, 9, 10, 11];
        const KNOBS = {
            mask: { label: 'Mask positives', base: true, treat: false, apply: (v) => ({ mask: v }) },
            hard: { label: 'Hard negatives (replacing random)', base: 0, treat: 6, apply: (v) => ({ hardNegs: v, randomNegs: 12 - v }) },
            fuel: { label: 'Drop fuel from supervision', base: false, treat: true, apply: (v) => ({ dropFuel: v }) },
            steps: { label: 'Training steps', base: 12000, treat: 4000, apply: (v) => ({ steps: v }) },
        };
        let knob = 'mask', minLift = 0.02, metric = 'heldRecall';
        let cancel = () => {};
        const status = h('p', { class: 'muted', 'aria-live': 'polite' }), out = h('div');

        const runOne = (seed, overrides) => {
            const world = R.makeRetailWorld(seed);
            const split = R.splitEdges(world, { seed: seed + 100, dropFuel: !!overrides.dropFuel });
            const run = R.trainDualEncoder(world, split, { evalEvery: overrides.steps || 12000, seed: seed + 1, ...overrides });
            return run.history[run.history.length - 1][metric];
        };
        const run = () => {
            cancel(); clear(out);
            const k = KNOBS[knob];
            const base = [], treat = [];
            let i = 0;
            const step = () => {
                if (i >= SEEDS.length) return report(k, base, treat);
                const seed = SEEDS[i++];
                status.textContent = `Seed ${seed} (${i}/${SEEDS.length}): baseline and treatment...`;
                base.push(runOne(seed, k.apply(k.base)));
                treat.push(runOne(seed, k.apply(k.treat)));
                cancel = UI.later(step);
            };
            cancel = UI.later(step);
        };
        const report = (k, base, treat) => {
            status.textContent = 'Done.';
            const b = C.meanStd(base), t = C.meanStd(treat);
            const diffs = treat.map((x, i) => x - base[i]);      // paired by seed: same world, same split
            const d = C.meanStd(diffs);
            const wins = diffs.filter((x) => x > 0).length;
            const beyondNoise = Math.abs(d.mean) > 2 * d.std / Math.sqrt(diffs.length);
            const verdict = d.mean >= minLift && beyondNoise ? 'SUPPORTED: adopt the treatment'
                : d.mean <= -minLift && beyondNoise ? 'REJECTED: the treatment is worse'
                    : 'INCONCLUSIVE: keep the simpler baseline';
            const metricName = metric === 'heldRecall' ? 'held-out Recall@5' : 'out-of-time Hit@5';
            out.append(UI.table(['Arm', `${metricName} mean`, 'std', 'per seed'], [
                [`baseline (${k.label} = ${k.base})`, b.mean.toFixed(3), b.std.toFixed(3), base.map((x) => x.toFixed(2)).join(' ')],
                [`treatment (${k.label} = ${k.treat})`, t.mean.toFixed(3), t.std.toFixed(3), treat.map((x) => x.toFixed(2)).join(' ')],
                ['paired difference', (d.mean >= 0 ? '+' : '') + d.mean.toFixed(3), d.std.toFixed(3), diffs.map((x) => (x >= 0 ? '+' : '') + x.toFixed(2)).join(' ')],
            ]), UI.note(`<b>${verdict}.</b> Treatment wins on ${wins}/5 seeds. Pre-registered minimum lift: ${minLift.toFixed(2)}. ` +
                `The paired difference is ${beyondNoise ? '' : 'not '}more than two standard errors from zero.`,
            verdict.startsWith('SUPPORTED') ? 'note good' : verdict.startsWith('REJECTED') ? 'note warn' : 'note'));
            const summary = `Hypothesis: changing "${k.label}" from ${k.base} to ${k.treat} improves ${metricName} by >= ${minLift.toFixed(2)}.\n` +
                `Setup: synthetic retail world, 5 seeds (${SEEDS.join(', ')}), paired by seed.\n` +
                `Result: ${b.mean.toFixed(3)} -> ${t.mean.toFixed(3)} (paired diff ${d.mean >= 0 ? '+' : ''}${d.mean.toFixed(3)} +- ${d.std.toFixed(3)}, wins ${wins}/5).\n` +
                `Verdict: ${verdict}.\nCaveat: synthetic data; validate on real temporal holdouts before acting.`;
            out.append(h('h3', {}, 'Summary for your notes'), h('pre', {}, h('code', {}, summary)),
                UI.button('Copy summary', () => navigator.clipboard && navigator.clipboard.writeText(summary)));
        };
        stage.append(UI.controls(
            UI.select({ label: 'Knob to test', options: Object.entries(KNOBS).map(([key, v]) => [key, `${v.label}: ${v.base} -> ${v.treat}`]), value: knob, onChange: (v) => { knob = v; } }),
            UI.select({ label: 'Metric', options: [['heldRecall', 'Held-out Recall@5'], ['timeHit', 'Out-of-time Hit@5']], value: metric, onChange: (v) => { metric = v; } }),
            UI.slider({ label: 'Minimum lift you would act on (set before running)', min: 0, max: 0.1, step: 0.005, value: minLift, format: (v) => v.toFixed(3), onInput: (v) => { minLift = v; } }),
        ), h('div', { class: 'controls' }, UI.button('Run 5-seed experiment', run, 'btn primary')), status, out);
        return () => cancel();
    },
});

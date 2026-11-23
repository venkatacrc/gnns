// Lab 5: ranking metrics by hand, then an honest multi-seed baseline comparison.
GNN.lab('lab05', {
    title: 'Metrics and baselines, honestly',
    goal: 'Compute ranking metrics on a list you build yourself, then compare popularity, item-kNN and the dual encoder across five seeds.',
    steps: [
        'Tap slots to mark them relevant. Predict Hit@K, Recall@K, MRR and NDCG, then check.',
        'Put the only relevant item at rank 1, then rank 5. Which metrics care about position?',
        'Run the <b>seed sweep</b>. Does the dual encoder beat item-kNN by more than the spread?',
        'Write one sentence you could defend in a review: "Model X beats Y by Z +- W on ..."',
    ],
    mount(stage) {
        const { h, clear } = UI, C = GNNCore, R = GNNRetail;
        // ---- Part A: metric calculator ----
        const relevant = new Set([1, 4]);
        let K = 5, totalRelevant = 3;
        const calcOut = h('div');
        const drawCalc = () => {
            clear(calcOut);
            const ranked = Array.from({ length: 10 }, (_, i) => i);
            // items not in the list still count toward recall's denominator
            const universe = new Set([...relevant, ...Array.from({ length: Math.max(0, totalRelevant - relevant.size) }, (_, i) => 100 + i)]);
            const slots = h('div', { class: 'slots', role: 'group', 'aria-label': 'ranked list' }, ranked.map((i) =>
                h('button', { type: 'button', class: `slot ${relevant.has(i) ? 'on' : ''}`, 'aria-pressed': relevant.has(i), onclick: () => { relevant.has(i) ? relevant.delete(i) : relevant.add(i); drawCalc(); } }, `#${i + 1}`)));
            calcOut.append(slots, UI.stats([
                [`Hit@${K}`, C.hitAtK(ranked, universe, K)],
                [`Recall@${K}`, UI.fmt(C.recallAtK(ranked, universe, K), 3)],
                [`Precision@${K}`, UI.fmt(C.precisionAtK(ranked, universe, K), 3)],
                ['MRR', UI.fmt(C.mrr(ranked, universe), 3)],
                [`NDCG@${K}`, UI.fmt(C.ndcgAtK(ranked, universe, K), 3)],
            ]), UI.note(`Relevant items in the list: ${relevant.size}. Total relevant (incl. ones the model never ranked): ${universe.size}.`));
        };
        // ---- Part B: seed sweep ----
        const SEEDS = [7, 8, 9, 10, 11];
        const sweepOut = h('div'), status = h('p', { class: 'muted', 'aria-live': 'polite' });
        let cancel = () => {};
        const runSweep = () => {
            cancel();
            const results = { popularity: [], 'item-kNN': [], 'dual encoder': [] };
            let i = 0;
            const step = () => {
                if (i >= SEEDS.length) return drawSweep(results);
                const seed = SEEDS[i++];
                status.textContent = `Seed ${seed} (${i}/${SEEDS.length})...`;
                const world = R.makeRetailWorld(seed);
                const split = R.splitEdges(world, { seed: seed + 100 });
                results.popularity.push(R.popularityBaseline(world, split, K).heldRecall);
                results['item-kNN'].push(R.itemKnnBaseline(world, split, K).heldRecall);
                const run = R.trainDualEncoder(world, split, { evalEvery: 12000, k: K, seed: seed + 1 });
                results['dual encoder'].push(run.history[run.history.length - 1].heldRecall);
                cancel = UI.later(step);
            };
            cancel = UI.later(step);
        };
        const drawSweep = (results) => {
            clear(sweepOut);
            status.textContent = 'Done.';
            const rows = Object.entries(results).map(([name, xs]) => ({ name, xs, ...C.meanStd(xs) }));
            sweepOut.append(
                UI.barChart(rows.map((r, i) => ({ label: r.name, value: r.mean, color: Viz.PALETTE[i] })), { title: `mean Recall@${K} across seeds`, format: (v) => v.toFixed(3) }),
                UI.table(['Model', `Recall@${K} mean`, 'std', 'per seed'], rows.map((r) => [r.name, r.mean.toFixed(3), r.std.toFixed(3), r.xs.map((x) => x.toFixed(2)).join(' ')])));
            const knn = rows[1], de = rows[2];
            const gap = de.mean - knn.mean, noise = Math.max(knn.std, de.std);
            sweepOut.append(UI.note(Math.abs(gap) <= noise
                ? `Dual encoder vs item-kNN: ${gap >= 0 ? '+' : ''}${gap.toFixed(3)}, within the seed spread (${noise.toFixed(3)}). Call it a tie and keep the cheaper model until you have a real win.`
                : `Dual encoder vs item-kNN: ${gap >= 0 ? '+' : ''}${gap.toFixed(3)}, larger than the seed spread (${noise.toFixed(3)}).`, Math.abs(gap) <= noise ? 'note warn' : 'note good'));
        };
        stage.append(h('h3', {}, 'A. Metric calculator'), UI.controls(
            UI.slider({ label: 'K', min: 1, max: 10, value: K, onInput: (v) => { K = v; drawCalc(); } }),
            UI.slider({ label: 'Total relevant items', min: 1, max: 10, value: totalRelevant, onInput: (v) => { totalRelevant = v; drawCalc(); } }),
        ), calcOut, h('hr'), h('h3', {}, 'B. Baselines across 5 seeds'),
        h('div', { class: 'controls' }, UI.button('Run seed sweep', runSweep, 'btn primary')), status, sweepOut);
        drawCalc();
        return () => cancel();
    },
});

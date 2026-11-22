#!/usr/bin/env node
// Multi-seed sweep of the synthetic retail world. Grounds the numbers quoted in Modules 4-5 and the
// Lab 4 / Lab 12 expectations. Run: node tools/seed_sweep.js [steps]   (default 12000 steps)
'use strict';
const R = require('../web/js/core/retail.js');

const SEEDS = [7, 8, 9, 10, 11];
const STEPS = Number(process.argv[2]) || 12000;
const K = 5;
const CONFIGS = {
    'popularity': null,
    'item-kNN': null,
    'dual enc, mask, 8 rand + 4 hard': { mask: true, randomNegs: 8, hardNegs: 4 },
    'dual enc, NO mask': { mask: false, randomNegs: 8, hardNegs: 4 },
    'dual enc, mask, random negs only': { mask: true, randomNegs: 12, hardNegs: 0 },
    'dual enc, mask, hard-heavy (2 + 10)': { mask: true, randomNegs: 2, hardNegs: 10 },
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

const rows = [];
for (const [name, opts] of Object.entries(CONFIGS)) {
    const recall = [], timeHit = [], loss = [];
    for (const seed of SEEDS) {
        const world = R.makeRetailWorld(seed);
        const split = R.splitEdges(world, { seed: seed + 100 });
        let res;
        if (name === 'popularity') res = R.popularityBaseline(world, split, K);
        else if (name === 'item-kNN') res = R.itemKnnBaseline(world, split, K);
        else {
            const run = R.trainDualEncoder(world, split, { ...opts, steps: STEPS, evalEvery: STEPS, k: K, seed: seed + 1 });
            res = run.history[run.history.length - 1];
            loss.push(res.loss);
        }
        recall.push(res.heldRecall); timeHit.push(res.timeHit);
    }
    rows.push({ name, recall, timeHit, loss });
    console.log(`${name.padEnd(38)} Recall@${K} ${mean(recall).toFixed(3)} ± ${sd(recall).toFixed(3)}   ` +
        `out-of-time Hit@${K} ${mean(timeHit).toFixed(3)} ± ${sd(timeHit).toFixed(3)}` +
        (loss.length ? `   train loss ${mean(loss).toFixed(3)}` : ''));
}
console.log(`\nseeds ${SEEDS.join(',')}  steps ${STEPS}  (± is the across-seed standard deviation)`);

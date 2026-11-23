// Synthetic omnichannel retail world + PinSage-style recommender pieces used by labs 1, 3, 4 and 5.
// Follows the public PinSage recipe: a bipartite customer-product graph, frequency-biased
// random walks, three negative pools and masked positives.
(function (root) {
    'use strict';
    const C = (typeof module !== 'undefined' && module.exports) ? require('./gnn.js') : root.GNNCore;

    // cadence = typical purchases per year by an engaged shopper of that category.
    const CATEGORIES = [
        { name: 'Produce & Dairy', cadence: 100, items: ['Bananas', 'Milk', 'Eggs', 'Strawberries'] },
        { name: 'Bread & Spreads', cadence: 40, items: ['Bread', 'Peanut Butter (Jif)', 'Peanut Butter (Skippy)', 'Grape Jelly'] },
        { name: 'Coffee', cadence: 12, items: ['Ground Coffee', 'Coffee Filters', 'Creamer'] },
        { name: 'Baking', cadence: 10, items: ['Flour', 'Sugar', 'Butter', 'Baking Soda'] },
        { name: 'Cleaning', cadence: 12, items: ['Detergent', 'Dish Soap'] },
        { name: 'Fuel', cadence: 50, items: ['Gasoline'] },
        { name: 'TVs', cadence: 1, items: ['LG 65" TV', 'Samsung 65" TV'] },
        { name: 'TV Accessories', cadence: 1, items: ['TV Stand', 'Apple TV', 'Soundbar', 'HDMI Cable'] },
        { name: 'Grilling', cadence: 3, items: ['Charcoal', 'Grill Brush', 'Burger Patties', 'Buns'] },
        { name: 'Baby', cadence: 24, items: ['Diapers', 'Baby Wipes', 'Infant Formula', 'Baby Shampoo'] },
        { name: 'Pet', cadence: 12, items: ['Dog Food', 'Cat Litter', 'Dog Treats', 'Cat Food'] },
        { name: 'Snacks', cadence: 20, items: ['Tortilla Chips', 'Salsa', 'Soda 12-pack', 'Guacamole'] },
        { name: 'School', cadence: 2, items: ['Notebooks', 'Pencils', 'Backpack', 'Lunch Box'] },
    ];
    // Personas pick which non-staple categories a shopper engages with.
    const PERSONAS = {
        staples: ['Produce & Dairy', 'Bread & Spreads', 'Cleaning', 'Fuel'],
        coffee: ['Coffee'],
        baker: ['Baking'],
        tv: ['TVs', 'TV Accessories'],
        griller: ['Grilling'],
        baby: ['Baby'],
        pet: ['Pet'],
        snacks: ['Snacks'],
        school: ['School'],
    };
    const PERSONA_RATES = { coffee: 0.45, baker: 0.35, tv: 0.25, griller: 0.3, baby: 0.2, pet: 0.35, snacks: 0.4, school: 0.25 };
    // Categories whose items travel as a bundle (true complements), so co-purchase is real signal.
    const BUNDLES = new Set(['Grilling', 'School', 'Snacks']);
    const isStaple = (product) => product.cadence >= 40;
    const DAYS = 14 * 30; // ~14 months of synthetic history: long enough for cadence and seasonality

    function makeRetailWorld(seed = 7, { customers = 80, outOfTimeDays = 30 } = {}) {
        const r = C.rng(seed);
        const products = [];
        CATEGORIES.forEach((cat) => cat.items.forEach((name) =>
            products.push({ id: products.length, name, cat: cat.name, cadence: cat.cadence })));
        const byCat = (cat) => products.filter((p) => p.cat === cat);
        const people = [];
        const txns = [];
        for (let c = 0; c < customers; c++) {
            const personas = ['staples'];
            for (const [name, rate] of Object.entries(PERSONA_RATES)) if (r() < rate) personas.push(name);
            people.push({ id: c, personas });
            const cats = [...new Set(personas.flatMap((p) => PERSONAS[p]))];
            for (const catName of cats) {
                const items = byCat(catName);
                const favorite = C.choice(r, items); // brand loyalty: one item per category dominates
                if (catName === 'TVs') {
                    const day = C.randInt(r, DAYS + outOfTimeDays);
                    txns.push({ c, p: favorite.id, day });
                    for (const acc of C.sample(r, byCat('TV Accessories'), 1 + C.randInt(r, 3)))
                        txns.push({ c, p: acc.id, day: Math.min(day + C.randInt(r, 5), DAYS + outOfTimeDays - 1) });
                    continue;
                }
                if (catName === 'TV Accessories') continue; // bought with the TV above
                const perYear = favorite.cadence * (0.4 + r() * 0.8);
                const count = Math.max(1, Math.round((perYear * (DAYS + outOfTimeDays)) / 365 / 4)); // thinned 4x to keep labs fast
                for (let k = 0; k < count; k++) {
                    const item = r() < 0.75 ? favorite : C.choice(r, items);
                    txns.push({ c, p: item.id, day: C.randInt(r, DAYS + outOfTimeDays) });
                }
                if (BUNDLES.has(catName)) // e.g. grillers buy the whole kit: real complements
                    for (const it of items) if (r() < 0.7) txns.push({ c, p: it.id, day: C.randInt(r, DAYS + outOfTimeDays) });
            }
        }
        txns.sort((a, b) => a.day - b.day);
        return { products, customers: people, txns, days: DAYS, outOfTimeDays, categories: CATEGORIES };
    }

    // Edge counts customer x product for transactions with day in [from, to).
    function edgeCounts(world, from = 0, to = world.days) {
        const counts = new Map(); // key c*1e4+p
        for (const t of world.txns) if (t.day >= from && t.day < to) {
            const key = t.c * 10000 + t.p;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        const custAdj = Array.from({ length: world.customers.length }, () => []);
        const prodAdj = Array.from({ length: world.products.length }, () => []);
        for (const [key, n] of counts) {
            const c = Math.floor(key / 10000), p = key % 10000;
            custAdj[c].push({ p, n });
            prodAdj[p].push({ c, n });
        }
        return { custAdj, prodAdj, counts };
    }

    // Product-product co-purchase counts (= A^T A for the bipartite incidence matrix A).
    function coPurchase(world, graph) {
        const P = world.products.length;
        const M = C.zeros(P, P);
        for (const list of graph.custAdj)
            for (const a of list) for (const b of list) if (a.p !== b.p) M[a.p][b.p] += 1;
        return M;
    }

    // Edge weight used by the walker. beta = 0 is a plain count-weighted walk; beta = 1 divides by
    // the category's purchase cadence so twice-a-week staples stop drowning once-a-year purchases.
    const edgeWeight = (world, p, n, beta) => n / Math.pow(world.products[p].cadence, beta);

    // PinSage-style visits: walks go customer -> product -> customer -> product (2 product visits each).
    function biasedWalkVisits(world, graph, start, { walks = 800, beta = 1, seed = 1 } = {}) {
        const r = C.rng(seed + start * 7919);
        const visits = new Array(world.products.length).fill(0);
        const stepToProduct = (c) => {
            const list = graph.custAdj[c];
            if (!list.length) return -1;
            return C.weightedChoice(r, list, list.map((e) => edgeWeight(world, e.p, e.n, beta))).p;
        };
        for (let w = 0; w < walks; w++) {
            const p1 = stepToProduct(start);
            if (p1 < 0) break;
            visits[p1] += 1;
            const buyers = graph.prodAdj[p1];
            const c2 = C.weightedChoice(r, buyers, buyers.map((e) => e.n)).c;
            const p2 = stepToProduct(c2);
            if (p2 >= 0) visits[p2] += 1;
        }
        return visits;
    }

    // Split as in the discussion: hold out a share of in-window edges, plus an out-of-time window.
    // Only discovery (non-staple) edges are held out: predicting that everyone rebuys milk is trivial.
    // dropFuel removes non-retail noise (gasoline) from supervision, one of the agreed action items.
    function splitEdges(world, { seed = 3, holdOut = 0.25, dropFuel = false } = {}) {
        const r = C.rng(seed);
        const keep = (p) => !(dropFuel && world.products[p].cat === 'Fuel');
        const train = edgeCounts(world, 0, world.days);
        const heldOut = Array.from({ length: world.customers.length }, () => new Set());
        const trainPos = Array.from({ length: world.customers.length }, () => []);
        train.custAdj.forEach((list, c) => list.forEach((e) => {
            if (!keep(e.p)) return;
            const discovery = !isStaple(world.products[e.p]);
            if (discovery && list.length > 3 && r() < holdOut) heldOut[c].add(e.p); else trainPos[c].push(e.p);
        }));
        const future = edgeCounts(world, world.days, world.days + world.outOfTimeDays);
        const outOfTime = future.custAdj.map((list, c) => new Set(list.map((e) => e.p)
            .filter((p) => keep(p) && !isStaple(world.products[p]) && !trainPos[c].includes(p))));
        return { trainPos, heldOut, outOfTime };
    }

    // Tiny dual encoder trained with sampled softmax.
    //   product tower: free embedding e_p          (inductive MLP in production; free vectors keep this readable)
    //   customer tower: u_c = W * mean(e_p over the customer's conv set)   (a 1-hop graph convolution)
    // opts.mask: hold the target positive out of the conv set (positive masking) to block shortcut leakage.
    // opts.randomNegs / opts.hardNegs: sizes of the easy (uniform catalog) and hard (same category) pools.
    // Defaults come from tools/seed_sweep.js: in this small world, same-category "hard" negatives are often
    // true positives (false negatives), so the random-only pool generalizes best. Lab 4 lets you verify that.
    function trainDualEncoder(world, split, opts = {}) {
        const { dim = 16, steps = 12000, lr = 0.05, mask = true, randomNegs = 12, hardNegs = 0, seed = 11, evalEvery = 1000, k = 5 } = opts;
        const r = C.rng(seed);
        const P = world.products.length;
        const E = C.randomMatrix(r, P, dim, 0.1);
        let W = C.randomMatrix(r, dim, dim, 0.1).map((row, i) => row.map((x, j) => x + (i === j ? 1 : 0)));
        const sameCat = world.products.map((p) => world.products.filter((q) => q.cat === p.cat && q.id !== p.id).map((q) => q.id));
        const customers = split.trainPos.map((list, c) => c).filter((c) => split.trainPos[c].length >= 2);
        const history = [];
        const embedCustomer = (conv) => C.matvec(W, C.meanVec(conv.map((p) => E[p]), dim));
        let lossAvg = 0;
        for (let step = 1; step <= steps; step++) {
            const c = C.choice(r, customers);
            const pos = split.trainPos[c];
            const target = C.choice(r, pos);
            const conv = mask ? pos.filter((p) => p !== target) : pos;
            const owned = new Set(pos);
            const negs = [];
            for (let i = 0; i < randomNegs; i++) { const n = C.randInt(r, P); if (!owned.has(n)) negs.push(n); }
            const hardPool = sameCat[target].filter((p) => !owned.has(p));
            for (let i = 0; i < hardNegs && hardPool.length; i++) negs.push(C.choice(r, hardPool));
            const cand = [target, ...negs];
            const m = C.meanVec(conv.map((p) => E[p]), dim);
            const u = C.matvec(W, m);
            const probs = C.softmax(cand.map((p) => C.dot(u, E[p])));
            lossAvg = 0.98 * lossAvg + 0.02 * -Math.log(probs[0] + 1e-12);
            const g = probs.map((pr, i) => pr - (i === 0 ? 1 : 0)); // dLoss/dScore
            const dU = new Array(dim).fill(0);
            cand.forEach((p, i) => { for (let d = 0; d < dim; d++) dU[d] += g[i] * E[p][d]; });
            cand.forEach((p, i) => { for (let d = 0; d < dim; d++) E[p][d] -= lr * g[i] * u[d]; });
            const dM = C.matvec(C.transpose(W), dU);
            W = W.map((row, a) => row.map((x, b) => x - lr * dU[a] * m[b]));
            for (const p of conv) for (let d = 0; d < dim; d++) E[p][d] -= (lr * dM[d]) / conv.length;
            if (step % evalEvery === 0 || step === steps)
                history.push({ step, loss: lossAvg, ...evaluate(world, split, embedCustomer, E, k) });
        }
        return { history, E, W, embedCustomer };
    }

    function evaluate(world, split, embedCustomer, E, k = 10) {
        const totals = { heldHit: 0, heldRecall: 0, timeHit: 0, n1: 0, n2: 0 };
        split.trainPos.forEach((pos, c) => {
            if (!pos.length) return;
            const u = embedCustomer(pos);
            const ranked = C.topK(E.map((e) => C.dot(u, e)), k, new Set(pos));
            if (split.heldOut[c].size) {
                totals.heldHit += C.hitAtK(ranked, split.heldOut[c], k);
                totals.heldRecall += C.recallAtK(ranked, split.heldOut[c], k);
                totals.n1++;
            }
            if (split.outOfTime[c].size) { totals.timeHit += C.hitAtK(ranked, split.outOfTime[c], k); totals.n2++; }
        });
        return {
            heldHit: totals.n1 ? totals.heldHit / totals.n1 : 0,
            heldRecall: totals.n1 ? totals.heldRecall / totals.n1 : 0,
            timeHit: totals.n2 ? totals.timeHit / totals.n2 : 0,
        };
    }

    // Baseline every recommender must beat: recommend the most popular unowned items.
    function popularityBaseline(world, split, k = 10) {
        const pop = new Array(world.products.length).fill(0);
        split.trainPos.forEach((pos) => pos.forEach((p) => { pop[p] += 1; }));
        return evaluate(world, split, () => [1], pop.map((x) => [x]), k);
    }

    // Item-kNN: score each item by summed cosine co-purchase similarity to the items a customer owns.
    // Similarities come from training positives only, so held-out edges never leak in.
    function itemKnnBaseline(world, split, k = 10) {
        const P = world.products.length;
        const co = C.zeros(P, P), deg = new Array(P).fill(0);
        for (const pos of split.trainPos) {
            for (const a of pos) { deg[a] += 1; for (const b of pos) if (a !== b) co[a][b] += 1; }
        }
        const sim = co.map((row, a) => row.map((x, b) => (x ? x / Math.sqrt(deg[a] * deg[b]) : 0)));
        // evaluate() scores items as dot(u, E[p]); a one-hot E plus u = summed similarity rows does exactly that.
        const E = Array.from({ length: P }, (_, p) => { const e = new Array(P).fill(0); e[p] = 1; return e; });
        const embed = (pos) => { const u = new Array(P).fill(0); for (const a of pos) for (let b = 0; b < P; b++) u[b] += sim[a][b]; return u; };
        return evaluate(world, split, embed, E, k);
    }

    const api = { CATEGORIES, isStaple, makeRetailWorld, edgeCounts, coPurchase, edgeWeight, biasedWalkVisits, splitEdges, trainDualEncoder, evaluate, popularityBaseline, itemKnnBaseline };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.GNNRetail = api;
})(typeof window !== 'undefined' ? window : globalThis);

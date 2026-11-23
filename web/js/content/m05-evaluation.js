GNN.module({
    id: 'm05', num: 5, minutes: 40, lab: 'lab05',
    title: 'Evaluating recommenders without clicks',
    summary: 'Ranking metrics, held-out vs out-of-time splits, baselines, a frozen-embedding probe and rolling windows for an in-store-heavy business.',
    objectives: [
        'Compute Hit@K, Recall@K, MRR and NDCG by hand.',
        'Design a split that respects time and avoids trivial repurchases.',
        'Run a frozen-embedding probe across a staleness gap and reason about rolling windows.',
    ],
    refs: ['rdl', 'relbench2', 'pinsage'],
    cards: [
        {
            title: 'Ranking metrics in one picture',
            body: `<p>Ranked list <code>[a, b, c, d]</code>, relevant <code>{b, d}</code>:</p>
<ul><li><b>Hit@K</b>: any relevant in the top K? Hit@1 = 0, Hit@2 = 1.</li>
<li><b>Recall@K</b>: share of relevant items found. Recall@2 = 0.5.</li>
<li><b>Precision@K</b>: share of the top K that is relevant. P@4 = 0.5.</li>
<li><b>MRR</b>: 1 / rank of the first hit = 0.5.</li>
<li><b>NDCG@K</b>: hits discounted by <code>log2(rank + 1)</code>, normalized by the ideal ordering.</li></ul>`,
        },
        {
            title: 'A typical offline setup',
            body: `<ul><li>Hold out a share of <b>customer -> product edges</b> completely, so walks and training never see them.</li>
<li>Add an <b>out-of-time window</b>: the month after the training history ends.</li>
<li>Retrieve with ANN search between customer and product embeddings and report Hit@K / Recall@K.</li></ul>
<p>Beware comparing across setups: a Hit@100 on later in-store purchases and a Hit@1 on immediate ad clicks are different cutoffs, targets and feedback loops. The next card explains why.</p>`,
        },
        {
            title: 'The omnichannel problem: no clicks',
            body: `<p>Online platforms validate recommenders with live A/B tests on engagement (Pinterest did so for PinSage), and ads see clicks within seconds. A retailer whose sales are mostly <b>in store</b> has no impressions and no clicks, only transactions that arrive later.</p>
<p>So offline metrics must stand in for online feedback. They need to be designed carefully, or they reward the wrong thing.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Trivial wins: repurchase inflation',
            body: `<p>If held-out edges include milk and bananas, "recommend what everyone rebuys" scores well and teaches nothing. Popularity looks like a great model.</p>
<p>The course's synthetic split holds out only <b>discovery</b> (non-staple) edges and filters future positives to items the customer had not bought. Always ask: <i>what would a dumb baseline score on this split?</i></p>`,
        },
        {
            title: 'Always report baselines',
            body: `<ul><li><b>Popularity</b>: most-bought unowned items.</li>
<li><b>Item-kNN</b>: score items by co-purchase similarity to what the customer owns.</li>
<li><b>Last-category</b> or business rules.</li></ul>
<p>Measured on the course's synthetic retail world over <b>5 seeds</b> (Recall@5, <code>node tools/seed_sweep.js</code>): popularity <b>0.30</b>, item-kNN <b>0.38</b>, the best masked dual encoder <b>0.39 ± 0.03</b>. The GNN-lite only <b>ties</b> a well-built item-kNN at this tiny scale. That is the lesson: a model that cannot clearly beat a cheap baseline across seeds has not earned its complexity yet. Lab 5 makes you check this yourself.</p>`,
        },
        {
            title: 'Random splits leak time',
            body: `<p>A random edge split lets the model train on March purchases and test on January ones. Customer embeddings already "know" what happened later.</p>
<p>Prefer a <b>temporal split</b>: train on edges before t, test on edges after. RDL and RelBench define every task with a timestamped training table for exactly this reason.</p>`,
            src: ['rdl', 'relbench2'],
        },
        {
            title: 'A frozen-embedding probe across a staleness gap',
            body: `<p>Validate embeddings on a downstream-like task before any A/B test. Pick a gap <code>D</code> (say 30 days):</p>
<ol><li>Train GNN embeddings using data up to <b>T - 2D</b>.</li>
<li>Freeze them; train a lightweight model (logistic regression) on labels from <b>T - 2D to T - D</b>.</li>
<li>Evaluate on <b>T - D to T</b>.</li></ol>
<p>It measures whether the embeddings carry signal that survives staleness, the way a downstream team would actually use them. It is the same point-in-time discipline as RelBench's train / validation / test timestamps.</p>`,
            src: ['relbench2'],
        },
        {
            title: 'Rolling windows vs full-year walks',
            body: `<p>Option: train on rolling <b>3-4 month windows</b> and predict the next month, shifting across history. That captures seasonality and adds walk diversity.</p>
<p>The costs: walks must be <b>recomputed per window</b>; sporadic shoppers get empty windows (cold-start pockets, though an inductive encoder can still embed them); and evaluating one month later vs two months later measures <b>staleness</b> as new items and customers arrive.</p>`,
        },
        {
            title: 'Slice your metrics',
            body: `<p>An average hides failures. Report by segment: new vs established customers, category (grocery vs electronics), channel (store vs online), and item age. A model that wins overall while losing on new items fails exactly where recommendations matter.</p>
<p>With small test sets, add <b>confidence intervals</b> (bootstrap over customers). A 1-point lift with a 3-point interval is noise.</p>`,
        },
    ],
    quiz: [
        {
            q: 'Ranked [x, y, z], relevant {z}. What is the MRR?',
            options: ['1', '1/2', '1/3', '0'],
            answer: 2, why: 'The first relevant item is at rank 3, so MRR = 1/3.',
        },
        {
            q: 'Why can\'t a 40% Hit@100 on in-store purchases be compared directly with a 50% Hit@1 on ad clicks?',
            options: ['Different K and different tasks and feedback (in-store purchases vs immediate clicks)', 'Ads use bigger models', 'Hit rates cannot be compared at all', 'One of them is a loss'],
            answer: 0, why: 'Different cutoffs, targets and feedback loops measure different things.',
        },
        {
            q: 'In the frozen-embedding probe, what is trained on the T - 2D to T - D window?',
            options: ['The GNN embeddings', 'A lightweight downstream model on frozen embeddings', 'The negative sampler', 'Nothing'],
            answer: 1, why: 'Embeddings are frozen at T - 2D; a logistic regression learns on T - 2D to T - D and is tested on T - D to T.',
        },
        {
            q: 'Popularity scores surprisingly high on your test set. The most likely cause is...',
            options: ['Popularity is a great model', 'The split contains trivial staple repurchases', 'Too many negatives', 'Embeddings are too large'],
            answer: 1, why: 'Held-out staples reward "recommend what everyone buys". Hold out discovery edges or filter repurchases.',
        },
        {
            q: 'A real cost of rolling 3-4 month windows is...',
            options: ['They ignore seasonality', 'Walks must be recomputed per window and sporadic shoppers get empty windows', 'They need clicks', 'They cannot be evaluated'],
            answer: 1, why: 'Per-window walk recomputation costs compute; short windows create cold-start pockets.',
        },
    ],
});

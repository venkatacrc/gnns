GNN.module({
    id: 'm05', num: 5, minutes: 40, lab: 'lab05',
    title: 'Evaluating recommenders without clicks',
    summary: 'Ranking metrics, held-out vs out-of-time splits, baselines, the T-60 / T-30 proxy and rolling windows for an in-store-heavy business.',
    objectives: [
        'Compute Hit@K, Recall@K, MRR and NDCG by hand.',
        'Design a split that respects time and avoids trivial repurchases.',
        'Run the T-60 / T-30 proxy and reason about rolling windows.',
    ],
    refs: ['wmCollab', 'rdl', 'relbench2', 'pinsage'],
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
            title: 'The Walmart evaluation setup (as discussed)',
            body: `<ul><li><b>10% of customer -> product edges</b> held out completely from the random walks.</li>
<li>Plus an <b>out-of-time month</b> (month 15, beyond the 14-month window).</li>
<li>ANN retrieval between customer and product embeddings.</li>
<li>Reported: about <b>40% Hit@100</b>, versus about 50% Hit@1 in online Sponsored Ads where clicks give immediate feedback.</li></ul>
<p>Those two numbers are not comparable tasks, which is the point of the next card.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'The omnichannel problem: no clicks',
            body: `<p>Pinterest tuned PinSage on <b>repins with live 1% A/B traffic</b>. Sponsored Ads see clicks within seconds. Walmart's business is dominated by <b>in-store purchases</b>: no impressions, no clicks, only transactions that arrive later.</p>
<p>So offline metrics must stand in for online feedback. They need to be designed carefully, or they reward the wrong thing.</p>`,
            src: ['wmCollab', 'pinsage'],
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
            title: 'The T-60 / T-30 proxy evaluation',
            body: `<p>Validate embeddings on a downstream-like task before any A/B test:</p>
<ol><li>Train GNN embeddings using data up to <b>T-60 days</b>.</li>
<li>Freeze them; train a lightweight model (logistic regression) on <b>T-60 -> T-30</b> labels.</li>
<li>Evaluate predictive accuracy on <b>T-30 -> now</b>.</li></ol>
<p>It measures whether the embeddings carry signal that survives a staleness gap, the way a downstream team would actually use them.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Rolling windows vs full-year walks',
            body: `<p>Proposal: train on rolling <b>3-4 month windows</b> and predict the next month, shifting across history. That captures seasonality and adds walk diversity.</p>
<p>Concerns raised: walks must be <b>recomputed per window</b>; sporadic shoppers get empty windows (cold-start pockets, though the inductive encoder can still embed them); and evaluating month 15 vs month 16 measures <b>staleness</b> as new items and customers arrive.</p>`,
            src: ['wmCollab'],
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
            q: 'Why can\'t 40% Hit@100 be compared directly with 50% Hit@1 from Sponsored Ads?',
            options: ['Different K and different tasks and feedback (in-store purchases vs immediate clicks)', 'Ads use bigger models', 'Hit rates cannot be compared at all', 'One of them is a loss'],
            answer: 0, why: 'Different cutoffs, targets and feedback loops measure different things.',
        },
        {
            q: 'In T-60 / T-30, what is trained on the T-60 -> T-30 window?',
            options: ['The GNN embeddings', 'A lightweight downstream model on frozen embeddings', 'The negative sampler', 'Nothing'],
            answer: 1, why: 'Embeddings are frozen at T-60; a logistic regression learns on T-60 -> T-30 and is tested on T-30 -> now.',
        },
        {
            q: 'Popularity scores surprisingly high on your test set. The most likely cause is...',
            options: ['Popularity is a great model', 'The split contains trivial staple repurchases', 'Too many negatives', 'Embeddings are too large'],
            answer: 1, why: 'Held-out staples reward "recommend what everyone buys". Hold out discovery edges or filter repurchases.',
        },
        {
            q: 'A concern raised about rolling 3-4 month windows was...',
            options: ['They ignore seasonality', 'Walks must be recomputed per window and sporadic shoppers get empty windows', 'They need clicks', 'They cannot be evaluated'],
            answer: 1, why: 'Per-window walk recomputation costs compute; short windows create cold-start pockets.',
        },
    ],
});

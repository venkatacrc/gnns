GNN.module({
    id: 'm10', num: 10, minutes: 40, lab: 'lab10',
    title: 'Shipping it: adoption, real-time signals and serving',
    summary: 'Embeddings vs direct predictions, decayed clickstream features vs inference-time edges, distillation, context caches and latency budgets.',
    objectives: [
        'Choose between embedding-optimized and two-phase predictive GNN outputs.',
        'Implement time-decayed features and explain why they beat transient edges for general embeddings.',
        'Sketch a serving path that meets a fixed latency budget (say 200 ms).',
    ],
    refs: ['glnn', 'tgn', 'idgnn', 'pyg2'],
    cards: [
        {
            title: 'The adoption bottleneck',
            body: `<p>A great embedding is worthless if downstream teams cannot use it. Search, ranking and classification teams often struggle to integrate raw foundation embeddings into existing stacks, or misuse them, and see <b>degraded</b> offline results.</p>
<p>So "how will this be consumed?" is a modeling decision, not an afterthought.</p>`,
        },
        {
            title: 'Two output modes',
            body: `<ul><li><b>Embedding-optimized GNN</b>: general-purpose representations other teams ingest as features (or combine via MLPs with their own embeddings).</li>
<li><b>Two-phase predictive GNN</b> (ID-GNN style): an embedding phase followed by a second GNN / re-ranking head that outputs the <b>top-K items per customer</b> directly. Retrieval teams blend those candidates into existing pools <b>without re-architecting</b>.</li></ul>
<p>Many platforms offer both: the embedding for flexibility, the candidate list for teams that just want results.</p>`,
            src: ['idgnn'],
        },
        {
            title: 'Real-time signals: two designs',
            body: `<p><b>Option A, decayed node features</b>: aggregate searches, clicks and add-to-carts with recency weights, separated by channel or department, into customer input features. Updating needs only a fast forward pass: no graph change, no retraining.</p>
<p><b>Option B, inference-time edges</b>: add typed, weighted edges such as <code>searched</code> and <code>added_to_basket</code> directly into the convolution, with a lower weight for weaker intent signals.</p>`,
            src: ['tgn'],
        },
        {
            title: 'Which design for which job',
            body: `<p>Transient click edges inside the convolution risk <b>overweighting noisy short-term clicks relative to purchases</b>, hurting general-purpose embedding quality. TGN makes the same separation explicitly: fast-changing per-node state lives apart from slow structure.</p>
<p>Keep general embeddings on <b>decayed input features</b>. Use identity-aware or multi-relational subgraph architectures for <b>direct scoring</b> tasks, where short-term intent is exactly what you want.</p>`,
            src: ['tgn', 'idgnn'],
        },
        {
            title: 'Exponential decay, concretely',
            body: `<pre><code>w(age) = 0.5 ** (age_days / half_life)
feature_channel = sum over events in channel of w(age)</code></pre>
<p>A click from 10 months ago with a 30-day half-life weighs about 0.001, which is effectively gone. Choose half-lives per signal: searches decay fast (days), category affinity slowly (months). Lab 10 lets you tune them and see a customer's profile shift.</p>`,
        },
        {
            title: 'Deep-to-shallow distillation',
            body: `<p>A common production pattern:</p>
<ol><li>Scheduled fine-tuning of a <b>deep</b> GNN on history.</li>
<li><b>Batch inference</b> writes entity embeddings to a vector store.</li>
<li>Train a <b>shallow</b> model (distillation) on embeddings + features.</li>
<li>Serve the shallow model online (e.g., on an inference server such as NVIDIA Triton) with predictions in <b>tens of milliseconds</b>, fetching precomputed embeddings plus real-time features.</li></ol>
<p>GLNN shows the extreme version: an MLP distilled from a GNN that needs no neighbor fetches at all.</p>`,
            src: ['glnn'],
        },
        {
            title: 'Precomputed context caches',
            body: `<p>Runtime joins across tables are latency killers. Precompute the relational context each prediction needs into a <b>key-value cache</b> close to the model (in-memory or GPU memory). An event stream (e.g., Kafka) pushes <b>delta updates</b> into the cache, so inference reads ready context instead of joining.</p>
<p>The cost is engineering: cache invalidation, memory, and graph structures that accept frequent edge / node inserts without full re-indexing. Lab 10's budget calculator shows how much the cache buys.</p>`,
            src: ['pyg2'],
        },
        {
            title: 'Freshness, versioning and monitoring',
            body: `<ul><li><b>Version embeddings</b>: consumers must know which model produced a vector; never mix versions in one ANN index.</li>
<li><b>Staleness</b>: track embedding age and the one-month vs two-month decay curve (Module 5).</li>
<li><b>Coverage</b>: share of active items and customers with a fresh embedding.</li>
<li><b>Drift</b>: input feature distributions, score distributions, retrieval overlap week over week.</li></ul>`,
        },
        {
            title: 'Standardize the platform',
            body: `<p>When every team hand-tunes its own GPU graph pipeline, you get silos, duplicated work and wasted compute. A shared abstraction (PyG on top of common graph and feature stores, with GPU libraries such as cuGraph and cuDF underneath) lowers the barrier for non-specialist teams.</p>
<p>Budget for the unglamorous parts: multi-GPU data loading, reproducible training recipes and a model registry usually decide whether a platform gets adopted.</p>`,
            src: ['pyg2'],
        },
    ],
    quiz: [
        {
            q: 'A retrieval team wants candidates without changing their model. Which mode fits?',
            options: ['Embedding-optimized GNN', 'Two-phase predictive GNN outputting top-K items', 'Label propagation', 'Full retraining'],
            answer: 1, why: 'Direct candidate lists can be blended into existing retrieval pools.',
        },
        {
            q: 'Why are transient click edges risky for general-purpose embeddings?',
            options: ['They are too slow to add', 'They overweight noisy short-term clicks relative to purchases', 'Graphs cannot hold clicks', 'They need labels'],
            answer: 1, why: 'Short-term noise contaminates reusable embeddings. Keep clicks as decayed features instead.',
        },
        {
            q: 'With a 30-day half-life, what weight does a 60-day-old click get?',
            options: ['0.5', '0.25', '0.125', '0'],
            answer: 1, why: 'Two half-lives: 0.5 x 0.5 = 0.25.',
        },
        {
            q: 'What does a precomputed context cache avoid at inference time?',
            options: ['Model weights', 'Dynamic runtime joins across tables', 'Embeddings', 'Monitoring'],
            answer: 1, why: 'Relational context is precomputed into a key-value cache and kept fresh by stream deltas.',
        },
        {
            q: 'In deep-to-shallow distillation, what serves online?',
            options: ['The deep GNN on the full graph', 'A shallow model using precomputed embeddings plus real-time features', 'An LLM', 'A SQL query'],
            answer: 1, why: 'The deep model runs in batch; the distilled shallow model meets the latency budget.',
        },
    ],
});

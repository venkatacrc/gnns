GNN.module({
    id: 'm10', num: 10, minutes: 40, lab: 'lab10',
    title: 'Shipping it: adoption, real-time signals and serving',
    summary: 'Embeddings vs direct predictions, decayed clickstream features vs inference-time edges, distillation, KV context caches and latency budgets.',
    objectives: [
        'Choose between embedding-optimized and two-phase predictive GNN outputs.',
        'Implement time-decayed features and explain why they beat transient edges for general embeddings.',
        'Sketch a serving path that meets a sub-250 ms budget.',
    ],
    refs: ['wmCollab', 'wmTech', 'nvFraud'],
    cards: [
        {
            title: 'The adoption bottleneck',
            body: `<p>A great embedding is worthless if downstream teams cannot use it. Search, ranking and classification teams often struggle to integrate raw foundation embeddings into existing stacks, or misuse them, and see <b>degraded</b> offline results.</p>
<p>So "how will this be consumed?" is a modeling decision, not an afterthought.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Two Kumo GNN modes',
            body: `<ul><li><b>Embedding-optimized GNN</b>: general-purpose representations other teams ingest as features (or combine via MLPs with their own Search / Customer Identity embeddings).</li>
<li><b>Two-phase predictive GNN</b> (ContextGNN / ID-GNN style): an embedding phase followed by a second GNN / re-ranking head that outputs <b>top-1,000 items per customer</b>. Retrieval teams blend those candidates into existing pools <b>without re-architecting</b>.</li></ul>
<p>Plan discussed: offer both, and co-train with Search so in-store behavioral signal flows to online ranking and back.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Real-time signals: two designs',
            body: `<p><b>Option A, decayed node features</b>: aggregate searches, clicks and add-to-carts with recency weights, separated by channel (Online, General Merchandise, Consumables), into customer input features. Updating needs only a fast forward pass: no graph change, no retraining.</p>
<p><b>Option B, inference-time edges</b>: add typed, weighted edges such as <code>searched</code> (0.2) and <code>added_to_basket</code> (0.5) directly into the convolution.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Why Option A won for general embeddings',
            body: `<p>The NVIDIA / Kumo takeaway: transient click edges inside the convolution risk <b>overweighting noisy short-term clicks relative to purchases</b>, hurting general-purpose embedding quality.</p>
<p>Keep general embeddings on <b>decayed input features</b>. Test multi-relational subgraph / ID-GNN architectures for <b>direct scoring</b> tasks, where short-term intent is exactly what you want.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Exponential decay, concretely',
            body: `<pre><code>w(age) = 0.5 ** (age_days / half_life)
feature_channel = sum over events in channel of w(age)</code></pre>
<p>A click from 10 months ago with a 30-day half-life weighs about 0.001, which is effectively gone. Choose half-lives per signal: searches decay fast (days), category affinity slowly (months). Lab 10 lets you tune them and see a customer's profile shift.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Deep-to-shallow distillation',
            body: `<p>The NVIDIA deck's production pattern:</p>
<ol><li>Scheduled fine-tuning of a <b>deep</b> model on history.</li>
<li><b>Batch inference</b> writes entity embeddings to a vector store.</li>
<li>Train a <b>shallow</b> model (distillation) on embeddings + features.</li>
<li>Serve the shallow model online (e.g., Triton) with <b>sub-100 ms</b> predictions, fetching actor embeddings plus real-time features.</li></ol>`,
            src: ['nvFraud'],
        },
        {
            title: 'KV context cache for sub-250 ms',
            body: `<p>Runtime joins are latency killers. The approach discussed: precompile relational links into a <b>key-value context cache in GPU memory</b>. Stream events (Kafka) push <b>delta updates</b> into active cache slots; inference reads ready context.</p>
<p>Target: <b>sub-250 ms</b> online latency. NVIDIA is also replacing Kumo's CPU-bound inference path with a GPU engine using <b>dynamic graph structures</b> for frequent edge / node inserts without full re-indexing.</p>`,
            src: ['wmTech'],
        },
        {
            title: 'Freshness, versioning and monitoring',
            body: `<ul><li><b>Version embeddings</b>: consumers must know which model produced a vector; never mix versions in one ANN index.</li>
<li><b>Staleness</b>: track embedding age and the month-15 vs month-16 decay curve (Module 5).</li>
<li><b>Coverage</b>: share of active items and customers with a fresh embedding.</li>
<li><b>Drift</b>: input feature distributions, score distributions, retrieval overlap week over week.</li></ul>`,
            src: ['wmCollab'],
        },
        {
            title: 'Standardize the platform',
            body: `<p>Graph ML across Walmart teams relied on specialists hand-tuning custom cuGraph + cuDF pipelines: silos and wasted compute. A common engine (PyG as the abstraction, Kumo Engine as the hardware-agnostic layer, an NVL72-optimized path for throughput) lowers the barrier for non-specialist teams.</p>
<p>Multi-GPU data loading was flagged as a gap; NVIDIA confirmed it is on the roadmap.</p>`,
            src: ['wmTech'],
        },
    ],
    quiz: [
        {
            q: 'A retrieval team wants candidates without changing their model. Which mode fits?',
            options: ['Embedding-optimized GNN', 'Two-phase predictive GNN outputting top-1,000 items', 'Label propagation', 'Full retraining'],
            answer: 1, why: 'Direct candidate lists can be blended into existing retrieval pools.',
        },
        {
            q: 'Why were transient click edges discouraged for general-purpose embeddings?',
            options: ['They are too slow to add', 'They overweight noisy short-term clicks relative to purchases', 'Graphs cannot hold clicks', 'They need labels'],
            answer: 1, why: 'Short-term noise contaminates reusable embeddings. Keep clicks as decayed features instead.',
        },
        {
            q: 'With a 30-day half-life, what weight does a 60-day-old click get?',
            options: ['0.5', '0.25', '0.125', '0'],
            answer: 1, why: 'Two half-lives: 0.5 x 0.5 = 0.25.',
        },
        {
            q: 'What does the KV context cache avoid at inference time?',
            options: ['Model weights', 'Dynamic runtime joins across tables', 'Embeddings', 'Monitoring'],
            answer: 1, why: 'Relational context is precompiled in GPU memory and updated by stream deltas.',
        },
        {
            q: 'In deep-to-shallow distillation, what serves online?',
            options: ['The deep GNN on the full graph', 'A shallow model using precomputed embeddings plus real-time features', 'An LLM', 'A SQL query'],
            answer: 1, why: 'The deep model runs in batch; the distilled shallow model meets the latency budget.',
        },
    ],
});

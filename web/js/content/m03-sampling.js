GNN.module({
    id: 'm03', num: 3, minutes: 40, lab: 'lab03',
    title: 'Sampling at scale: neighbors, walks and PPR',
    summary: 'Why full-graph training fails, how fanout sampling and PinSage random walks pick neighborhoods, and the frequency-bias problem in retail.',
    objectives: [
        'Estimate the cost of k-hop fanout sampling.',
        'Explain how random-walk visit counts approximate Personalized PageRank.',
        'Describe the frequency / cadence bias fix and disaggregated sampling.',
    ],
    refs: ['pinsage', 'sage', 'pyg2', 'wmCollab', 'wmTech', 'nvFraud'],
    cards: [
        {
            title: 'Why you cannot train on the whole graph',
            body: `<p>Full-batch GNN training keeps every node's activations for every layer in memory: <code>N x d x L</code>. With hundreds of millions of customers, that never fits on a GPU.</p>
<p>Mini-batching is harder than for images: to compute one customer's embedding you need their neighbors, their neighbors' neighbors, and so on. The batch is a <b>subgraph</b>, and building it is often the real bottleneck.</p>`,
        },
        {
            title: 'Neighbor explosion and fanouts',
            body: `<p>Sampling a fixed number of neighbors per hop caps the cost: fanouts <code>[15, 10, 5]</code> touch at most <code>15 + 150 + 750</code> nodes per seed. PyG:</p>
<pre><code>loader = NeighborLoader(data, num_neighbors=[15, 10], batch_size=1024,
                        input_nodes=('customer', train_ids), time_attr='time')</code></pre>
<p>Uniform sampling is unbiased but noisy, and it treats a once-bought item like a weekly staple. The lab's cost calculator shows how fast this grows.</p>`,
            src: ['sage', 'pyg2'],
        },
        {
            title: 'PinSage idea: let random walks choose the neighbors',
            body: `<p>Instead of k uniform neighbors, run short random walks from a node and keep the <b>most visited</b> nodes as its neighborhood. Visit counts become <b>importance weights</b> for pooling.</p>
<p>Visit frequencies of walks that restart at the seed approximate <b>Personalized PageRank (PPR)</b>: the stationary probability of being at each node when you keep jumping back home.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'The Walmart walk recipe (as discussed)',
            body: `<ul><li>Walks follow <b>customer -> product -> customer -> product</b> ("other TV buyers also bought TV stands and Apple TVs").</li>
<li><b>800 walks per customer</b>, giving about <b>1,600 item visits</b> with duplicates.</li>
<li>Rank items by visit count (10x, 8x, 5x ... 1x) and keep the <b>top 400</b>: effectively a PPR neighborhood, stored to disk.</li></ul>
<p>That ranked list later supplies positives (top 64) and customer hard negatives (ranks 200-400): Module 4.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Frequency bias: bananas vs TVs',
            body: `<p>A count-weighted walk from a TV buyer mostly lands on milk and bananas, because those edges have huge counts. The TV-related signal (stand, HDMI cable, soundbar) is drowned out.</p>
<p>The fix discussed is <b>purchase-rate decay / frequency bias</b>: divide edge weight by the category's purchase cadence, roughly <code>w = count / cadence^beta</code>. In the lab, slide <code>beta</code> from 0 to 1 and watch TV accessories climb the ranking.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Custom bias formulas in the sampler',
            body: `<p>Retail data has a high noise floor. Default neighbor loaders in cuGraph and PyG lacked dynamic bias parameters, so teams fell back on manual inverse-degree tweaks.</p>
<p>The engineering goal discussed with NVIDIA: put <b>user-defined bias formulas directly into the sampling stage</b> and stream structured walks to disk, with memory buffers ahead of the sampling loop to avoid I/O stalls.</p>`,
            src: ['wmTech'],
        },
        {
            title: 'Disaggregated sampling',
            body: `<p>Separate the <b>graph store + sampler</b> (memory heavy, CPU or RAM) from the <b>GPU trainers</b> (compute heavy). Samplers stream subgraphs; GPUs never hold the whole graph.</p>
<p>The Kumo GraphEngine figures in the NVIDIA deck: <b>100-500 billion rows</b>, RAM sampler with an SSD index, about <b>20M lookups/s</b>. The tech discussion stresses that naive scalable walk implementations can lose signal fidelity relative to dense methods, and disaggregated sampling is how you keep the fidelity without running out of memory.</p>`,
            src: ['nvFraud', 'wmTech'],
        },
        {
            title: 'Point-in-time sampling',
            body: `<p>For a training example anchored at time t, only edges with timestamp &lt; t may be sampled. Otherwise the model sees the future, which looks great offline and collapses in production.</p>
<p>The NVIDIA deck lists <b>point-in-time correctness</b> as a core benefit of the engine's temporal heterogeneous sampler; in PyG it is the <code>time_attr</code> argument.</p>`,
            src: ['nvFraud', 'pyg2'],
        },
        {
            title: 'Precompute vs on-the-fly neighborhoods',
            body: `<p><b>Precomputed</b> PPR lists (the Walmart approach) are cheap at training time and deterministic, but go <b>stale</b> and must be recomputed per time window (a cost raised about rolling windows in Module 5).</p>
<p><b>On-the-fly</b> sampling is always fresh and stochastic (a regularizer) but costs sampler throughput every step. Many systems mix both: precomputed neighborhoods for training, live sampling for fresh inference.</p>`,
            src: ['wmCollab'],
        },
    ],
    quiz: [
        {
            q: 'With fanouts [10, 10, 10], how many nodes does one seed touch at most (excluding itself)?',
            options: ['30', '300', '1,110', '1,000'],
            answer: 2, why: '10 + 100 + 1,000 = 1,110. Cost multiplies per hop.',
        },
        {
            q: 'Visit counts of random walks that restart at the seed approximate...',
            options: ['Degree centrality', 'Personalized PageRank from the seed', 'Betweenness', 'The graph Laplacian'],
            answer: 1, why: 'Walk-with-restart visit frequencies converge to PPR scores.',
        },
        {
            q: 'In the discussed Walmart recipe, what is kept from 800 walks per customer?',
            options: ['All 1,600 visits as edges', 'The top 400 items by visit count', 'Only the first visited item', 'A random 64 items'],
            answer: 1, why: 'Rank by visit frequency and keep the top 400, effectively a PPR neighborhood.',
        },
        {
            q: 'Setting the cadence exponent beta from 0 to 1 in a walk mainly...',
            options: ['Speeds up walks', 'Stops twice-a-week staples from drowning infrequent big-ticket items', 'Removes customers', 'Adds time decay to labels'],
            answer: 1, why: 'Dividing by purchase cadence rebalances the walk toward rare but informative purchases.',
        },
        {
            q: 'What is the main point of disaggregated sampling?',
            options: ['Smaller embeddings', 'Decoupling memory-heavy graph traversal from GPU model compute', 'Removing temporal edges', 'Avoiding negatives'],
            answer: 1, why: 'Samplers with the graph in RAM/SSD stream subgraphs to GPUs, so scale and fidelity are kept without out-of-memory errors.',
        },
        {
            q: 'Point-in-time sampling means...',
            options: ['Sample one node at a time', 'Only use edges older than the example\'s anchor time', 'Use the newest edges always', 'Sample by wall-clock time'],
            answer: 1, why: 'It prevents future leakage into training subgraphs.',
        },
    ],
});

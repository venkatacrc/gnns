GNN.module({
    id: 'm03', num: 3, minutes: 40, lab: 'lab03',
    title: 'Sampling at scale: neighbors, walks and PPR',
    summary: 'Why full-graph training fails, how fanout sampling and PinSage random walks pick neighborhoods, and the frequency-bias problem in retail.',
    objectives: [
        'Estimate the cost of k-hop fanout sampling.',
        'Explain how random-walk visit counts approximate Personalized PageRank.',
        'Describe the frequency / cadence bias fix and disaggregated sampling.',
    ],
    refs: ['pinsage', 'pixie', 'node2vec', 'sage', 'pyg2'],
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
            title: 'A worked walk recipe',
            body: `<ul><li>Walks follow <b>customer -> product -> customer -> product</b> ("other TV buyers also bought TV stands and Apple TVs").</li>
<li>Run a few hundred short walks per customer, collecting a thousand or so item visits with duplicates.</li>
<li>Rank items by visit count (10x, 8x, 5x ... 1x) and keep the <b>top T</b>: effectively a PPR neighborhood, stored for training.</li></ul>
<p>The ranked list then supplies positives from the top and <b>hard negatives</b> from the middle ranks, which PinSage uses as a curriculum: related items that are not the answer (Module 4). These counts are illustrative; tune them on your graph.</p>`,
            src: ['pinsage', 'pixie'],
        },
        {
            title: 'Frequency bias: bananas vs TVs',
            body: `<p>A count-weighted walk from a TV buyer mostly lands on milk and bananas, because those edges have huge counts. The TV-related signal (stand, HDMI cable, soundbar) is drowned out.</p>
<p>A simple fix is <b>purchase-rate decay / frequency bias</b>: divide edge weight by the category's purchase cadence, roughly <code>w = count / cadence^beta</code>. In the lab, slide <code>beta</code> from 0 to 1 and watch TV accessories climb the ranking.</p>`,
            src: ['pixie'],
        },
        {
            title: 'Put the bias inside the sampler',
            body: `<p>Retail data has a high noise floor, and a post-hoc fix (sample uniformly, then reweight) wastes most samples on staples. node2vec's return / in-out parameters and Pixie's biased walks both apply the bias <b>while walking</b>, so every step is spent where it matters.</p>
<p>At scale the same principle holds: evaluate the bias formula inside the sampling kernel, stream walks to disk, and keep prefetch buffers ahead of the training loop so the GPU never waits on I/O.</p>`,
            src: ['node2vec', 'pixie'],
        },
        {
            title: 'Disaggregated sampling',
            body: `<p>Separate the <b>graph store + sampler</b> (memory heavy, CPU or RAM) from the <b>GPU trainers</b> (compute heavy). Samplers stream subgraphs; GPUs never hold the whole graph.</p>
<p>PyG formalizes this split with its <b>graph store</b> and <b>feature store</b> interfaces: the sampler queries a backend that can live in RAM, on SSD or on another machine. Done well, disaggregation lets you sample the true neighborhood instead of a cheap approximation, keeping signal fidelity without running out of GPU memory.</p>`,
            src: ['pyg2'],
        },
        {
            title: 'Point-in-time sampling',
            body: `<p>For a training example anchored at time t, only edges with timestamp &lt; t may be sampled. Otherwise the model sees the future, which looks great offline and collapses in production.</p>
<p>Temporal heterogeneous samplers make <b>point-in-time correctness</b> the default; in PyG it is the <code>time_attr</code> argument.</p>`,
            src: ['rdl', 'pyg2'],
        },
        {
            title: 'Precompute vs on-the-fly neighborhoods',
            body: `<p><b>Precomputed</b> PPR lists (common in PinSage-style pipelines) are cheap at training time and deterministic, but go <b>stale</b> and must be recomputed per time window (a cost that comes back with rolling windows in Module 5).</p>
<p><b>On-the-fly</b> sampling is always fresh and stochastic (a regularizer) but costs sampler throughput every step. Many systems mix both: precomputed neighborhoods for training, live walks (as in Pixie) for fresh inference.</p>`,
            src: ['pinsage', 'pixie'],
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
            q: 'In the worked walk recipe, what do you keep from a few hundred walks per customer?',
            options: ['Every visit as a separate edge', 'The top T items by visit count', 'Only the first visited item', 'A uniform random sample of items'],
            answer: 1, why: 'Rank by visit frequency and keep the top T, effectively a PPR neighborhood.',
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

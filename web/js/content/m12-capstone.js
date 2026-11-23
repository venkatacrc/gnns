GNN.module({
    id: 'm12', num: 12, minutes: 60, lab: 'lab12',
    title: 'Capstone: design, run and defend a GNN system',
    summary: 'Pull everything together: a design checklist, a backlog of experiments worth running, and an experiment you run and defend.',
    objectives: [
        'Produce a one-page design covering task, graph, sampler, objective, evaluation and serving.',
        'Run a controlled multi-seed experiment and report it honestly.',
        'Turn the open questions from each module into experiments you could run next week.',
    ],
    refs: ['rdl', 'pql', 'relbench2', 'mcauley', 'idgnn'],
    cards: [
        {
            title: 'The one-page design checklist',
            body: `<ol><li><b>Task</b>: entity, label, window (write the PQL).</li>
<li><b>Graph</b>: node and edge types, features, timestamps, identity resolution.</li>
<li><b>Sampler</b>: fanouts or walks, bias formula, point-in-time rule.</li>
<li><b>Model</b>: GNN, transformer or FM; what is inductive.</li>
<li><b>Objective</b>: positives, negative pools, masking, supervision cleaning.</li>
<li><b>Evaluation</b>: split, metrics, baselines, slices, seeds.</li>
<li><b>Serving</b>: embeddings vs predictions, freshness, latency.</li>
<li><b>Decisions</b>: who consumes it, how it is explained.</li></ol>`,
        },
        {
            title: 'An experiment backlog worth stealing',
            body: `<ul><li><b>Pair labels</b> (Module 6): benchmark a low-shot tabular model vs a deterministic world-knowledge model vs an LLM baseline on substitutes vs complements; then evaluate the confidence-routed hybrid.</li>
<li><b>Staleness</b> (5): add new months of data; measure one-month vs two-month out-of-time decay; run the frozen-embedding probe.</li>
<li><b>Supervision</b> (4): filter fuel and other noise items; compare cosine vs dot-product scoring.</li>
<li><b>Real-time signal</b> (10): decayed clickstream features vs inference-time edges; an ID-GNN head for direct candidates.</li>
<li><b>Graph construction</b> (1, 3): document the schema and have someone outside the team review it.</li></ul>`,
            src: ['mcauley', 'idgnn'],
        },
        {
            title: 'One change at a time, many seeds',
            body: `<p>Synthetic and real results alike swing with the random seed. A single run that shows +3% might be noise. Run <b>at least 3-5 seeds</b>, report mean and spread, and change one knob per experiment.</p>
<p>Lab 12 enforces this: pick a hypothesis, run a seed sweep, and the lab reports whether the difference is larger than the noise.</p>`,
        },
        {
            title: 'Write the hypothesis first',
            body: `<p>Template: <i>"Masking a quarter of the positives will raise held-out Recall@5 by at least 2 points versus no masking, because it removes the convolution shortcut. If the gap is within seed noise, we keep the simpler setup."</i></p>
<p>Deciding the threshold <b>before</b> running is what separates an experiment from a fishing trip.</p>`,
        },
        {
            title: 'A risk register for GNN projects',
            body: `<ul><li><b>Leakage</b>: time, convolution shortcuts, mutable columns.</li>
<li><b>Popularity bias</b>: staples dominate positives and metrics.</li>
<li><b>Staleness</b>: embeddings age; walks need recomputation.</li>
<li><b>Adoption</b>: consumers cannot integrate the output.</li>
<li><b>Scale</b>: sampler throughput, multi-GPU loaders.</li>
<li><b>Governance</b>: private data stays private; explanations for decisions.</li></ul>`,
        },
        {
            title: 'How to present results',
            body: `<p>Lead with the decision the result supports, then: setup (data window, split), baselines, the metric with seed spread, slices where it wins and loses, cost and latency, and the next experiment. Put the caveats on the same slide as the number, not in an appendix.</p>`,
        },
    ],
    quiz: [
        {
            q: 'Your change shows +1.5 points on one seed. What do you do?',
            options: ['Ship it', 'Run more seeds and compare the gap to seed-to-seed spread', 'Increase the learning rate', 'Report the best seed'],
            answer: 1, why: 'Single-seed gains are often noise.',
        },
        {
            q: 'Which belongs in the evaluation part of the design checklist?',
            options: ['Fanout sizes', 'Split, metrics, baselines, slices and seeds', 'Edge types', 'Latency budget'],
            answer: 1, why: 'Evaluation design decides whether any result can be trusted.',
        },
        {
            q: 'Why write the success threshold before running an experiment?',
            options: ['To save compute', 'To avoid moving the goalposts after seeing results', 'It is required by PyG', 'To pick the seed'],
            answer: 1, why: 'Pre-registering the threshold keeps the conclusion honest.',
        },
        {
            q: 'Your embeddings look great on a random split. Which experiment from the backlog checks whether they survive time?',
            options: ['Remove the graph', 'Measure out-of-time decay and run the frozen-embedding probe', 'Stop using negatives', 'Add more layers'],
            answer: 1, why: 'Temporal evaluation shows whether embedding quality survives staleness.',
        },
    ],
});

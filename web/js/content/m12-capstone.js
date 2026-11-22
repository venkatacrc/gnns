GNN.module({
    id: 'm12', num: 12, minutes: 60, lab: 'lab12',
    title: 'Capstone: design, run and defend a GNN system',
    summary: 'Pull everything together: a design checklist, the consolidated action items from the NVIDIA sessions and an experiment you run and defend.',
    objectives: [
        'Produce a one-page design covering task, graph, sampler, objective, evaluation and serving.',
        'Run a controlled multi-seed experiment and report it honestly.',
        'Map the open action items to experiments you could run next week.',
    ],
    refs: ['wmCollab', 'wmTech', 'rdl', 'pql', 'relbench2'],
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
            title: 'Consolidated action items from the sessions',
            body: `<ul><li>Share graph schema documentation with NVIDIA to validate construction and get Kumo model-planner recipes.</li>
<li>Benchmark Kumo Tabular / RDB Learn vs a deterministic world-knowledge model vs the LLM baseline on substitutes vs complements; evaluate hybrid routing.</li>
<li>Add the 3 new months; measure out-of-time decay (month 15 vs 16); implement the T-60 / T-30 proxy.</li>
<li>Filter fuel and other noise from supervision; review cosine vs dot-product recipes.</li>
<li>Test bi-directional embedding sharing with Search / Identity; evaluate decayed clickstream features; explore ID-GNN for direct candidates.</li></ul>`,
            src: ['wmCollab'],
        },
        {
            title: 'One change at a time, many seeds',
            body: `<p>Synthetic and real results alike swing with the random seed. A single run that shows +3% might be noise. Run <b>at least 3-5 seeds</b>, report mean and spread, and change one knob per experiment.</p>
<p>Lab 12 enforces this: pick a hypothesis, run a seed sweep, and the lab reports whether the difference is larger than the noise.</p>`,
        },
        {
            title: 'Write the hypothesis first',
            body: `<p>Template: <i>"Masking positives (48/16) will raise held-out Recall@5 by at least 2 points versus no masking, because it removes the convolution shortcut. If the gap is within seed noise, we keep the simpler setup."</i></p>
<p>Deciding the threshold <b>before</b> running is what separates an experiment from a fishing trip.</p>`,
        },
        {
            title: 'A risk register for GNN projects',
            body: `<ul><li><b>Leakage</b>: time, convolution shortcuts, mutable columns.</li>
<li><b>Popularity bias</b>: staples dominate positives and metrics.</li>
<li><b>Staleness</b>: embeddings age; walks need recomputation.</li>
<li><b>Adoption</b>: consumers cannot integrate the output.</li>
<li><b>Scale</b>: sampler throughput, multi-GPU loaders.</li>
<li><b>Governance</b>: internal data stays internal; explanations for decisions.</li></ul>`,
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
            q: 'Which was an agreed action item from the collaboration sessions?',
            options: ['Remove the graph', 'Implement the T-60 / T-30 proxy and measure month 15 vs 16 decay', 'Stop using negatives', 'Publish internal data'],
            answer: 1, why: 'Offline temporal proxy evaluation was a key workstream.',
        },
    ],
});

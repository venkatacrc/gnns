GNN.module({
    id: 'm00', num: 0, minutes: 20,
    title: 'Orientation: why graphs, and the map of this course',
    summary: 'Why relationships beat flat rows, the two case studies we will follow (Walmart recommendations and fraud), and how to study here.',
    objectives: [
        'Explain what a graph adds over a flat feature table.',
        'Describe the two running case studies and the end-to-end GNN lifecycle.',
        'Treat numbers quoted from internal discussions as hypotheses to validate, not targets.',
    ],
    refs: ['wmCollab', 'wmTech', 'nvFraud', 'rdl'],
    cards: [
        {
            title: 'What a flat table cannot see',
            body: `<p>A classic model sees one row per customer: age bucket, spend last 30 days, store id. It cannot easily see that this customer's last purchase was a <b>TV</b>, that thousands of other TV buyers went on to buy a <b>TV stand</b>, and that this customer shops at the same store as them.</p>
<p>A <b>graph</b> keeps those relationships as first-class data: entities are <b>nodes</b>, relationships are <b>edges</b>. A <b>Graph Neural Network (GNN)</b> learns from both the features of a node and the structure around it.</p>`,
        },
        {
            title: 'Case study 1: the Walmart Foundation GNN',
            body: `<p>A PinSage-inspired <b>bipartite customer-product graph</b> built from about <b>14 months of omnichannel transactions</b> over a catalog of roughly <b>31M items</b>. It produces customer and product embeddings for downstream teams (search, ranking, ads, personalization) and candidate items for retrieval.</p>
<p>You will rebuild a miniature version of it across Modules 1-5: graph construction, frequency-biased random walks, positives and three pools of negatives, masking, and offline evaluation without click feedback.</p>`,
            src: ['wmCollab', 'pinsage'],
        },
        {
            title: 'Case study 2: fraud and money movement',
            body: `<p>Accounts, cards, devices, merchants and wallets connected by transactions over time. Fraud hides in <b>structure</b>: fan-in to a mule account, cycles that round-trip money, scatter-gather structuring, long hop chains that layer funds.</p>
<p>Module 9 and its lab use the patterns and the platform ideas from the NVIDIA / Kumo fraud material.</p>`,
            src: ['nvFraud'],
        },
        {
            title: 'The lifecycle you will walk through',
            body: `<ol>
<li><b>Frame the task</b>: entity, label, time window (Module 7: PQL).</li>
<li><b>Construct the graph</b>: node and edge types, features, timestamps (1).</li>
<li><b>Model</b>: message passing, then transformers and foundation models (2, 8).</li>
<li><b>Sample at scale</b>: neighbors, random walks, PPR (3).</li>
<li><b>Objective</b>: positives, negatives, leakage control (4).</li>
<li><b>Evaluate</b> honestly in time (5), including pair tasks like substitutes vs complements (6).</li>
<li><b>Ship</b>: embeddings vs predictions, real-time features, latency (10).</li>
<li><b>Decide and explain</b>: retrieval for LLMs, agents, deterministic decision heads (11).</li></ol>`,
        },
        {
            title: 'Vocabulary you will use daily',
            body: `<ul>
<li><b>Embedding</b>: a learned vector per node; similar nodes end up close.</li>
<li><b>Message passing</b>: each layer, a node aggregates its neighbors' vectors.</li>
<li><b>Receptive field</b>: after k layers, a node has seen its k-hop neighborhood.</li>
<li><b>Transductive</b> models only embed nodes seen in training; <b>inductive</b> models compute embeddings from features, so new products and customers get vectors too.</li>
<li><b>Heterogeneous</b>: several node and edge types. <b>Temporal</b>: edges carry timestamps.</li></ul>`,
        },
        {
            title: 'Where NVIDIA and Kumo fit',
            body: `<p>Kumo builds on <b>PyG</b> (PyTorch Geometric) and relational deep learning: models trained directly on multi-table data, the <b>KumoRFM</b> relational foundation model, and tabular foundation models (Kumo Tabular / RDB Learn) for sparse-label problems.</p>
<p>In our sessions the NVIDIA team committed to <b>open weights and open training recipes</b>, an engine with disaggregated sampling and multi-GPU support on the roadmap, and decision-model heads for deterministic outputs. You will meet each of these where it belongs in the lifecycle.</p>`,
            src: ['wmTech', 'pyg2', 'kumorfm2'],
        },
        {
            title: 'Rule of thumb from the sessions: tabular FM or custom GNN?',
            body: `<p>The working rule discussed with NVIDIA / Kumo:</p>
<ul><li><b>Sparse labels, a graph exists</b> (tens to hundreds of labeled examples): start with a tabular / relational <b>foundation model</b>, which learns from context.</li>
<li><b>Massive interaction data</b> (billions of purchases): <b>train a custom GNN</b> on your own objective.</li></ul>
<p>Most real programs use both: an FM for fast baselines and many small tasks, a custom GNN for the flagship embedding.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Numbers from meetings are hypotheses',
            body: `<p>You will see settings like <b>800 walks per customer</b>, <b>top-64 positives</b>, <b>128 / 64 / 700 negatives</b>, a <b>48 / 16 positive mask</b>, <b>40% Hit@100</b> and a <b>T-60 / T-30</b> proxy evaluation. They describe one team's current setup as discussed, not tuned truths.</p>
<blockquote>Treat each one as a knob with a reason behind it. The labs let you turn the knob and watch what happens.</blockquote>`,
            src: ['wmCollab'],
        },
        {
            title: 'How to study with this app',
            body: `<ul>
<li><b>Learn</b>: read a card, then mark it <i>Got it</i> or <i>Review again</i> (keys K / R, arrows to move, swipe on phone).</li>
<li><b>Test</b>: the quiz explains every answer. Retry just the ones you missed.</li>
<li><b>Lab</b>: change one thing at a time and predict the result before you look.</li>
<li><b>Python track</b> on the Mac: <code>python/labs/</code> mirrors the core labs in numpy.</li></ul>
<p>Everything works offline once loaded.</p>`,
        },
    ],
    quiz: [
        {
            q: 'What does a GNN use that a plain per-row model typically ignores?',
            options: ['Feature scaling', 'The relationships between entities (graph structure)', 'Larger batch sizes', 'Categorical encodings'],
            answer: 1, why: 'GNNs learn from a node\'s features <i>and</i> its neighborhood structure, e.g. what similar customers bought.',
        },
        {
            q: 'A new product enters the catalog with text and image features but no purchases yet. Which property lets a model still embed it?',
            options: ['Transductive training', 'Inductive encoders that compute embeddings from features', 'Deeper message passing', 'Larger negative pools'],
            answer: 1, why: 'Inductive encoders map features to embeddings, so unseen nodes get vectors. That is why the Walmart product tower is a feature MLP.',
        },
        {
            q: 'Per the rule discussed with NVIDIA / Kumo, when is training a custom GNN the preferred route?',
            options: ['When only 50 labeled examples exist', 'When large-scale interaction data exists', 'When there is no graph at all', 'When latency does not matter'],
            answer: 1, why: 'Foundation models shine in sparse-label regimes; with massive interaction data a custom GNN trained on your own objective is preferred.',
        },
        {
            q: 'How should you treat "800 walks per customer" or "40% Hit@100" from the sessions?',
            options: ['As validated industry targets', 'As hypotheses and current settings to test and tune', 'As upper bounds', 'As contractual SLAs'],
            answer: 1, why: 'They describe a current setup as discussed. Validate them on your data, which is exactly what the labs practice.',
        },
        {
            q: 'After 3 message-passing layers, a node\'s representation depends on...',
            options: ['Only itself', 'Its 1-hop neighbors', 'Its neighborhood up to 3 hops away', 'The whole graph, always'],
            answer: 2, why: 'Each layer extends the receptive field by one hop.',
        },
    ],
});

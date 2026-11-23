GNN.module({
    id: 'm00', num: 0, minutes: 20,
    title: 'Orientation: why graphs, and the map of this course',
    summary: 'Why relationships beat flat rows, the two case studies we will follow (retail recommendations and fraud), and how to study here.',
    objectives: [
        'Explain what a graph adds over a flat feature table.',
        'Describe the two running case studies and the end-to-end GNN lifecycle.',
        'Treat numbers quoted in papers and blog posts as hypotheses to validate on your data, not targets.',
    ],
    refs: ['pinsage', 'rdl', 'pyg2', 'kumorfm2', 'weber'],
    cards: [
        {
            title: 'What a flat table cannot see',
            body: `<p>A classic model sees one row per customer: age bucket, spend last 30 days, store id. It cannot easily see that this customer's last purchase was a <b>TV</b>, that thousands of other TV buyers went on to buy a <b>TV stand</b>, and that this customer shops at the same store as them.</p>
<p>A <b>graph</b> keeps those relationships as first-class data: entities are <b>nodes</b>, relationships are <b>edges</b>. A <b>Graph Neural Network (GNN)</b> learns from both the features of a node and the structure around it.</p>`,
        },
        {
            title: 'Case study 1: a retail recommender in the PinSage style',
            body: `<p>Picture a large retailer that sells in stores and online. Customers and products form a <b>bipartite graph</b> (an edge = a purchase). A PinSage-style GNN turns that graph into <b>customer and product embeddings</b> that search, ranking, ads and personalization can all reuse, and into candidate items for retrieval.</p>
<p>PinSage itself ran on a graph of about 3 billion nodes at Pinterest. You will rebuild a miniature version across Modules 1-5: graph construction, frequency-biased random walks, positives and negatives, masking, and offline evaluation without click feedback.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Case study 2: fraud and money movement',
            body: `<p>Accounts, cards, devices, merchants and wallets connected by transactions over time. Fraud hides in <b>structure</b>: fan-in to a mule account, cycles that round-trip money, scatter-gather structuring, long hop chains that layer funds.</p>
<p>Module 9 and its lab use these standard anti-money-laundering typologies on a synthetic transaction graph, with public datasets such as Elliptic and AMLworld as the real-world reference points.</p>`,
            src: ['weber', 'amlworld'],
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
            title: 'The open-source toolbox',
            body: `<p><b>PyG</b> (PyTorch Geometric) is the workhorse library: heterogeneous and temporal graphs, neighbor sampling, feature and graph stores. <b>Relational deep learning</b> (RDL) and the <b>RelBench</b> benchmark treat a whole multi-table database as one graph. GPU graph libraries (for example RAPIDS cuGraph) speed up sampling and analytics at scale.</p>
<p>On top of these sit <b>relational foundation models</b> such as KumoRFM, which predict from raw multi-table data with in-context learning. Their headline results are reported by the vendor that builds them: useful evidence, but evidence to re-test on your own data.</p>`,
            src: ['pyg2', 'rdl', 'kumorfm2'],
        },
        {
            title: 'A common heuristic: foundation model or custom GNN?',
            body: `<ul><li><b>Sparse labels, a graph exists</b> (tens to hundreds of labeled examples): start with a tabular / relational <b>foundation model</b>, which learns from context.</li>
<li><b>Massive interaction data</b> (billions of purchases): <b>train a custom GNN</b> on your own objective.</li></ul>
<p>Most real programs use both: a foundation model for fast baselines and many small tasks, a custom GNN for the flagship embedding. Treat this as a starting heuristic, not a law; Module 8 shows how to test it.</p>`,
            src: ['kumorfm2', 'plurel'],
        },
        {
            title: 'Numbers in papers are hypotheses',
            body: `<p>You will see settings like <i>walks per user</i>, <i>top-T neighbors by visit count</i>, <i>negatives per positive</i> and <i>Hit@K on a held-out window</i>. A number in a paper or blog post describes one team's data and constraints, not a tuned truth for yours.</p>
<blockquote>Treat each one as a knob with a reason behind it. The labs let you turn the knob and watch what happens, across several random seeds.</blockquote>`,
            src: ['pinsage'],
        },
        {
            title: 'How to study with this app',
            body: `<ul>
<li><b>Learn</b>: read a card, then mark it <i>Got it</i> or <i>Review again</i> (keys K / R, arrows to move, swipe on phone).</li>
<li><b>Test</b>: the quiz explains every answer. Retry just the ones you missed.</li>
<li><b>Lab</b>: change one thing at a time and predict the result before you look.</li></ul>
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
            answer: 1, why: 'Inductive encoders map features to embeddings, so unseen nodes get vectors. That is why a product tower built as a feature MLP handles cold start.',
        },
        {
            q: 'Per the common heuristic, when is training a custom GNN the preferred route?',
            options: ['When only 50 labeled examples exist', 'When large-scale interaction data exists', 'When there is no graph at all', 'When latency does not matter'],
            answer: 1, why: 'Foundation models shine in sparse-label regimes; with massive interaction data a custom GNN trained on your own objective is usually preferred.',
        },
        {
            q: 'How should you treat a setting like "50 neighbors per node" or a Hit@K quoted in a paper?',
            options: ['As validated industry targets', 'As hypotheses and starting settings to test and tune', 'As upper bounds', 'As contractual SLAs'],
            answer: 1, why: 'They describe one team\'s setup. Validate them on your data, which is exactly what the labs practice.',
        },
        {
            q: 'After 3 message-passing layers, a node\'s representation depends on...',
            options: ['Only itself', 'Its 1-hop neighbors', 'Its neighborhood up to 3 hops away', 'The whole graph, always'],
            answer: 2, why: 'Each layer extends the receptive field by one hop.',
        },
    ],
});

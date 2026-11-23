GNN.module({
    id: 'm09', num: 9, minutes: 40, lab: 'lab09',
    title: 'Fraud and money movement on graphs',
    summary: 'Subgraph patterns of fraud and laundering, guilt by association, label scarcity, point-in-time labels and what public benchmarks teach.',
    objectives: [
        'Recognize fan-in, fan-out, cycles, scatter-gather and long hop chains.',
        'Explain why multi-hop structure exposes mules that row-level models miss.',
        'Pick metrics and splits that survive extreme imbalance and late labels.',
    ],
    refs: ['weber', 'amlworld', 'multignn', 'gin', 'relgt', 'rdl'],
    cards: [
        {
            title: 'Money flow is a temporal directed graph',
            body: `<p>Nodes: accounts, cards, wallets, merchants, devices, IP addresses. Edges: transfers and payments with amount and timestamp, plus shared attributes (two accounts using one device).</p>
<p>Production graphs are dynamic and enormous; even the public Elliptic dataset is a temporal graph of about 200K Bitcoin transactions over 49 time steps. Fraud is not a property of one row; it is a shape in this graph.</p>`,
            src: ['weber'],
        },
        {
            title: 'The pattern zoo',
            body: `<ul><li><b>Fan-in</b>: many sources -> one account (mule collecting victim payments).</li>
<li><b>Fan-out</b>: one -> many (rapid dispersal).</li>
<li><b>Cycle</b>: A -> B -> C -> A (round-tripping to fake volume).</li>
<li><b>Scatter-gather</b>: split across intermediaries, reconverge (structuring under thresholds).</li>
<li><b>Gather-scatter, bipartite, stack</b>: layered group structures.</li>
<li><b>Long hop chains</b>: many hops to put distance between source and sink.</li></ul>
<p>AMLworld plants exactly these typologies in synthetic multi-bank data, so models can be scored on each one.</p>`,
            src: ['amlworld', 'multignn'],
        },
        {
            title: 'Heterogeneous expansion',
            body: `<p>Add node types beyond accounts: devices, IPs, phone numbers, merchants, known fraud rings, sanctioned entities. A fresh account with no transaction history becomes suspicious if it <b>shares a device</b> with three confirmed mules.</p>
<p>This is the fraud version of cold start, and the graph answers it the same way recommendations do: borrow evidence from neighbors.</p>`,
            src: ['rdl'],
        },
        {
            title: 'Guilt by association, quantified',
            body: `<p>Label propagation spreads risk from confirmed-bad seeds: each hop multiplies by a decay (e.g. 0.6), and an account's score is its strongest path to a seed. Lab 9 shows it step by step.</p>
<p>Its classic failure: <b>victims</b>. Everyone who paid a mule collector sits one hop from it, so naive propagation flags the people who were defrauded. Telling victims from accomplices needs direction, amounts, timing and history, not just adjacency.</p>
<p>A GNN generalizes this: it <b>learns</b> which edge types, amounts and timings carry risk rather than using a fixed decay. Sum aggregation can count fan-in, which is exactly the GIN expressivity point from Module 2.</p>`,
            src: ['gin'],
        },
        {
            title: 'Fraud types you will hear about',
            body: `<ul><li><b>First-party / payment fraud</b>: chargebacks, friendly fraud, card-not-present.</li>
<li><b>Scams</b>: social engineering, investment ("pig-butchering") scams.</li>
<li><b>Money muling and laundering</b>: placement, layering (mixers, chains), integration.</li>
<li><b>Sanctions exposure</b>: often <i>indirect</i>, several hops from a listed entity.</li></ul>`,
        },
        {
            title: 'Metrics under extreme imbalance',
            body: `<p>With 0.1% fraud, a model that says "never fraud" is 99.9% accurate, and ROC-AUC can look great while the alert queue is useless.</p>
<p>Use <b>precision-recall AUC (AUPRC / average precision)</b> or minority-class F1, precision at the investigator capacity (top 500 alerts per day), and <b>dollar-weighted</b> metrics, since missing a $50K transfer is not the same as missing a $5 one.</p>`,
            src: ['amlworld'],
        },
        {
            title: 'Labels arrive late; time discipline matters',
            body: `<p>Chargebacks land weeks later; mule confirmations can take months. If you build training examples with today's labels and today's graph, you leak investigations into features.</p>
<p>Use <b>point-in-time sampling</b>: features as of the event time, labels from a later maturity window, temporal splits for validation (Elliptic is split by time step for this reason). That is exactly what RDL training tables encode.</p>`,
            src: ['rdl', 'weber'],
        },
        {
            title: 'Published results: read critically',
            body: `<p>On Elliptic, a random forest on node features was a hard baseline for a plain GCN; graph embeddings helped most when <b>combined</b> with the tabular features. And after a dark-market shutdown late in the dataset, every model's performance collapsed: the adversary changed, the model did not.</p>
<p>Vendor case studies quote lifts against their clients' own baselines, which you cannot inspect. Use any reported lift as motivation, then measure yours against your current model on a temporal holdout.</p>`,
            src: ['weber'],
        },
        {
            title: 'When GNNs are not enough',
            body: `<p>Standard message passing cannot tell some directed patterns apart: it does not know edge direction, which in-edge pairs with which out-edge, or whether a path returns to its start. Egressy et al. add <b>reverse message passing, port numbering and ego IDs</b> so a GNN can detect cycles and scatter-gather. Graph transformers instead attend across hops and tables directly.</p>
<p>Fraud is also <b>adversarial</b>: patterns shift once a rule catches them. Plan for continual retraining and drift monitoring, and give investigators explanations (Module 11).</p>`,
            src: ['multignn', 'relgt'],
        },
    ],
    quiz: [
        {
            q: 'Dozens of victims pay into one newly opened account that quickly forwards the money. Which pattern appears first?',
            options: ['Cycle', 'Fan-in', 'Bipartite', 'Stack'],
            answer: 1, why: 'Many sources converge on one account: fan-in, often followed by fan-out.',
        },
        {
            q: 'Why can ROC-AUC mislead in fraud detection?',
            options: ['It ignores positives', 'With extreme imbalance it can look high while precision at operating capacity is poor', 'It is only for regression', 'It requires graphs'],
            answer: 1, why: 'AUPRC and precision at capacity reflect the alert-queue reality.',
        },
        {
            q: 'An account has no transactions but shares a device with three confirmed mules. Which idea flags it?',
            options: ['Temporal decay', 'Heterogeneous expansion with guilt by association', 'Over-smoothing', 'Fanout sampling'],
            answer: 1, why: 'Shared-attribute edges let risk flow to entities with no history.',
        },
        {
            q: 'Chargeback labels arrive 60 days after a transaction. What must the training pipeline do?',
            options: ['Use today\'s graph for all examples', 'Build features as of event time and labels from a later maturity window', 'Drop late labels', 'Use random splits'],
            answer: 1, why: 'Point-in-time features plus matured labels avoid leakage.',
        },
        {
            q: 'On Elliptic, a random forest on node features rivals a plain GCN. The best lesson is...',
            options: ['GNNs are useless for fraud', 'Always report strong tabular baselines, and try combining graph embeddings with features', 'Random forests are graph models', 'Elliptic has no graph'],
            answer: 1, why: 'Graph signal is most useful alongside strong row features; a GNN must earn its place against the baseline.',
        },
    ],
});

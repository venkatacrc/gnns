GNN.module({
    id: 'm09', num: 9, minutes: 40, lab: 'lab09',
    title: 'Fraud and money movement on graphs',
    summary: 'Subgraph patterns of fraud and laundering, guilt by association, label scarcity, point-in-time labels and how platforms put this in production.',
    objectives: [
        'Recognize fan-in, fan-out, cycles, scatter-gather and long hop chains.',
        'Explain why multi-hop structure exposes mules that row-level models miss.',
        'Pick metrics and splits that survive extreme imbalance and late labels.',
    ],
    refs: ['nvFraud', 'gin', 'relgt', 'rdl'],
    cards: [
        {
            title: 'Money flow is a temporal directed graph',
            body: `<p>Nodes: accounts, cards, wallets, merchants, devices, IP addresses. Edges: transfers and payments with amount and timestamp, plus shared attributes (two accounts using one device).</p>
<p>The NVIDIA deck describes these graphs as <b>dynamic, constantly evolving and up to 100 TB scale</b>. Fraud is not a property of one row; it is a shape in this graph.</p>`,
            src: ['nvFraud'],
        },
        {
            title: 'The pattern zoo',
            body: `<ul><li><b>Fan-in</b>: many sources -> one account (mule collecting victim payments).</li>
<li><b>Fan-out</b>: one -> many (rapid dispersal).</li>
<li><b>Cycle</b>: A -> B -> C -> A (round-tripping to fake volume).</li>
<li><b>Scatter-gather</b>: split across intermediaries, reconverge (structuring under thresholds).</li>
<li><b>Gather-scatter, bipartite, stack</b>: layered group structures.</li>
<li><b>Long hop chains</b>: many hops to put distance between source and sink.</li></ul>`,
            src: ['nvFraud'],
        },
        {
            title: 'Heterogeneous expansion',
            body: `<p>Add node types beyond accounts: devices, IPs, phone numbers, merchants, known fraud rings, sanctioned entities. A fresh account with no transaction history becomes suspicious if it <b>shares a device</b> with three confirmed mules.</p>
<p>This is the fraud version of cold start, and the graph answers it the same way recommendations do: borrow evidence from neighbors.</p>`,
            src: ['nvFraud'],
        },
        {
            title: 'Guilt by association, quantified',
            body: `<p>Label propagation spreads risk from confirmed-bad seeds: each hop multiplies by a decay (e.g. 0.6), and an account's score is its strongest path to a seed. Lab 9 shows it step by step.</p>
<p>A GNN generalizes this: it <b>learns</b> which edge types, amounts and timings carry risk rather than using a fixed decay. Sum aggregation can count fan-in, which is exactly the GIN expressivity point from Module 2.</p>`,
            src: ['gin'],
        },
        {
            title: 'Fraud types you will hear about',
            body: `<ul><li><b>First-party / payment fraud</b>: chargebacks, friendly fraud, card-not-present.</li>
<li><b>Scams</b>: social engineering, investment ("pig-butchering") scams.</li>
<li><b>Money muling and laundering</b>: placement, layering (mixers, chains), integration.</li>
<li><b>Sanctions exposure</b>: often <i>indirect</i>, several hops from a listed entity.</li></ul>`,
            src: ['nvFraud'],
        },
        {
            title: 'Metrics under extreme imbalance',
            body: `<p>With 0.1% fraud, a model that says "never fraud" is 99.9% accurate, and ROC-AUC can look great while the alert queue is useless.</p>
<p>Use <b>precision-recall AUC (AUPRC / average precision)</b>, precision at the investigator capacity (top 500 alerts per day), and <b>dollar-weighted</b> metrics, since missing a $50K transfer is not the same as missing a $5 one.</p>`,
            src: ['nvFraud'],
        },
        {
            title: 'Labels arrive late; time discipline matters',
            body: `<p>Chargebacks land weeks later; mule confirmations can take months. If you build training examples with today's labels and today's graph, you leak investigations into features.</p>
<p>Use <b>point-in-time sampling</b>: features as of the event time, labels from a later maturity window, temporal splits for validation. That is exactly what RDL training tables encode.</p>`,
            src: ['nvFraud', 'rdl'],
        },
        {
            title: 'Vendor-reported results: read critically',
            body: `<p>The NVIDIA / Kumo deck lists customer outcomes such as a <b>26% increase in dollar-weighted AP for ACH money muling</b>, a 10% AP lift for transfer reversal on a multi-billion-node graph, and a 2% AUPRC lift for card-not-present fraud within weeks.</p>
<p>These are <b>vendor-reported</b> numbers from different clients and baselines. Use them as motivation, then measure your own lift against your current model on a temporal holdout.</p>`,
            src: ['nvFraud'],
        },
        {
            title: 'When GNNs are not enough',
            body: `<p>The deck's "limits of GNNs" argument: as graphs scale, the useful signal sits in long chains and sparse distant connections that k-hop message passing cannot reach without squashing. Graph transformers attend across hops and tables directly.</p>
<p>Fraud is also <b>adversarial</b>: patterns shift once a rule catches them. Plan for continual retraining and drift monitoring, and give investigators explanations (Module 11).</p>`,
            src: ['nvFraud', 'relgt'],
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
            q: 'How should you treat the deck\'s "26% increase in $-weighted AP"?',
            options: ['As a guaranteed lift', 'As a vendor-reported result to validate against your own baseline', 'As irrelevant', 'As a regulatory requirement'],
            answer: 1, why: 'Different clients and baselines; measure on your temporal holdout.',
        },
    ],
});

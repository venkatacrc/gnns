GNN.module({
    id: 'm07', num: 7, minutes: 40, lab: 'lab07',
    title: 'Relational deep learning: the database is the graph',
    summary: 'Rows as nodes, keys as edges, training tables with timestamps, RelBench v2 and declaring tasks in Predictive Query Language.',
    objectives: [
        'Convert a multi-table schema into a temporal heterogeneous graph.',
        'Build a point-in-time-correct training table.',
        'Write PQL queries for retail and fraud tasks.',
    ],
    refs: ['rdl', 'relbench2', 'pql', 'pyg2', 'nvFraud'],
    cards: [
        {
            title: 'The RDL idea',
            body: `<p>Most enterprise data lives in relational databases, and the usual pipeline is: join tables, hand-craft aggregates ("purchases in last 30 days"), train XGBoost. Slow, lossy, brittle.</p>
<p><b>Relational Deep Learning</b> skips feature engineering: every row becomes a node, every primary-foreign key link becomes an edge, and a GNN learns the aggregations end to end.</p>`,
            src: ['rdl'],
        },
        {
            title: 'From schema to graph',
            body: `<pre><code>customers(customer_id, ...)
transactions(txn_id, customer_id FK, store_id FK, ts, ...)
txn_items(txn_id FK, product_id FK, qty, price)
products(product_id, category_id FK, title, ...)</code></pre>
<p>Node types = tables; edges = FK references (both directions); timestamps on event rows. The customer-product bipartite graph is a <b>projection</b> of this richer graph: customer -> transaction -> item -> product.</p>`,
            src: ['rdl'],
        },
        {
            title: 'What the model learns instead of hand-written features',
            body: `<p>The NVIDIA deck lists what graph attention can express across columns, tables and hops:</p>
<ul><li>Filters: last fact, last k facts, facts in the last week, upcoming holiday.</li>
<li>Aggregations: counts, sums, recency, trends.</li>
<li>Correlations across related entities: "customers like you".</li></ul>
<p>Columns are encoded by type (numeric, categorical, text, timestamp, embedding), e.g. with PyG's torch_frame integration.</p>`,
            src: ['nvFraud', 'pyg2'],
        },
        {
            title: 'Training tables define the task',
            body: `<p>A task is a table of <code>(entity_id, seed_time, label)</code>. For each row, the model may only use database rows with timestamp &lt; seed_time, the <b>temporal neighbor sampling</b> rule.</p>
<p>Example: <code>(customer 42, 2026-03-01, churned_next_30d = 1)</code>. Labels come from the future relative to seed_time; features only from the past. Get this table right and most leakage disappears.</p>`,
            src: ['rdl'],
        },
        {
            title: 'RelBench and RelBench v2',
            body: `<p><b>RelBench</b> standardized RDL tasks: entity classification, regression and recommendation on real databases with temporal splits.</p>
<p><b>RelBench v2</b> scales it: <b>11 datasets with 22M+ rows</b>, new <b>autocomplete</b> tasks (predict a missing column value in a row), integration of Temporal Graph Benchmark event streams, and access to many more databases via the ReDeLEx and 4DBInfer integrations. It is the yardstick behind the RelGT and KumoRFM-2 results in Module 8.</p>`,
            src: ['relbench2'],
        },
        {
            title: 'Predictive Query Language (PQL)',
            body: `<p>Writing training tables by hand is error-prone. PQL declares the task, and the system computes labels with correct time windows:</p>
<pre><code>PREDICT COUNT(transactions.*, 0, 30, days) = 0
FOR EACH customers.customer_id</code></pre>
<p>"Will this customer make zero transactions in the next 30 days?" (churn). The aggregation window <code>(0, 30, days)</code> is relative to each seed time.</p>`,
            src: ['pql'],
        },
        {
            title: 'PQL for our two case studies',
            body: `<pre><code>-- next-30-day items (recommendation / link prediction)
PREDICT LIST_DISTINCT(txn_items.product_id, 0, 30, days)
FOR EACH customers.customer_id

-- will this account be confirmed as a mule within 90 days?
PREDICT FIRST(fraud_reports.is_mule, 0, 90, days)
FOR EACH accounts.account_id WHERE COUNT(transfers.*, -30, 0, days) > 0</code></pre>
<p>The <code>WHERE</code> filter restricts which entities get predictions at each time (active accounts only). Exact function names vary by implementation; read the PQL paper for the full grammar.</p>`,
            src: ['pql'],
        },
        {
            title: 'RDL pitfalls',
            body: `<ul><li><b>Leaky columns</b>: a "status = closed" column updated after the label event.</li>
<li><b>Mutable dimension tables</b> without history: today's product category projected into last year.</li>
<li><b>Exploding hubs</b>: a "store" node linked to millions of transactions needs sampling caps.</li>
<li><b>Noisy, non-linear signals</b>: in early runs XGBoost beat raw Kumo Relational models. Fixes discussed: automated feature selection, denoising through Kumo Tabular before graph building, RDB Learn pipelines that aggregate multi-hop attributes into single-row representations.</li></ul>`,
            src: ['wmTech'],
        },
    ],
    quiz: [
        {
            q: 'In RDL, what becomes an edge?',
            options: ['Each column', 'Each primary-foreign key link between rows', 'Each table', 'Each SQL query'],
            answer: 1, why: 'Rows are nodes; key references connect them.',
        },
        {
            q: 'A training table row (customer, seed_time, label) may use which database rows as input?',
            options: ['All rows', 'Rows with timestamps before seed_time', 'Rows after seed_time', 'Only the customer row'],
            answer: 1, why: 'Temporal neighbor sampling restricts inputs to the past of each seed.',
        },
        {
            q: 'What does PQL\'s <code>COUNT(transactions.*, 0, 30, days) = 0</code> express?',
            options: ['Zero transactions ever', 'Zero transactions in the 30 days after each seed time', 'Thirty transactions', 'A feature, not a label'],
            answer: 1, why: 'The window is relative to the seed time and looks forward, which makes it a label.',
        },
        {
            q: 'Which is new in RelBench v2?',
            options: ['Image classification', 'Autocomplete tasks and Temporal Graph Benchmark integration', 'Removing timestamps', 'Only synthetic data'],
            answer: 1, why: 'v2 adds autocomplete tasks, TGB event streams and many more databases.',
        },
        {
            q: 'Early runs saw XGBoost beat raw relational models on noisy signals. A recommended fix was...',
            options: ['Delete the graph', 'Denoise / select features (e.g., via Kumo Tabular) and aggregate multi-hop attributes before the loss', 'Add more layers', 'Train on random splits'],
            answer: 1, why: 'Feature selection, denoising and RDB Learn style aggregation were the recommendations.',
        },
    ],
});

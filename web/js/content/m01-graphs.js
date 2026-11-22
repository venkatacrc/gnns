GNN.module({
    id: 'm01', num: 1, minutes: 35, lab: 'lab01',
    title: 'Graphs from transactions',
    summary: 'Turn baskets into a bipartite customer-product graph, read its matrices, and see why raw co-purchase counts mislead.',
    objectives: [
        'Build adjacency and incidence representations from transaction logs.',
        'Derive co-purchase (A^T A) and explain popularity bias in raw counts.',
        'Model heterogeneous, temporal, omnichannel graphs in PyG.',
    ],
    refs: ['wmCollab', 'pyg2', 'rdl'],
    cards: [
        {
            title: 'Nodes, edges, weights, direction',
            body: `<p>A graph <code>G = (V, E)</code>. Edges may be <b>directed</b> (account A pays B) or <b>undirected</b> (two products co-occur), and <b>weighted</b> (purchase count, amount, recency).</p>
<p>Retail purchases are naturally edges <b>customer -> product</b> with attributes: count, last date, channel (store, online, pickup), spend.</p>`,
        },
        {
            title: 'Adjacency matrix vs adjacency list',
            body: `<p>The adjacency matrix <code>A[i][j]</code> is n x n. With hundreds of millions of customers and 31M items it would be absurdly <b>sparse</b>: a shopper touches a few hundred items out of millions.</p>
<p>Real systems store <b>edge lists / CSR</b> (compressed sparse rows): for each node, the array of its neighbors. PyG stores edges as a <code>2 x E</code> <code>edge_index</code> tensor.</p>`,
        },
        {
            title: 'The bipartite customer-product graph',
            body: `<p>Two node types, edges only between types. Encode it with an incidence matrix <code>B</code> (customers x products), <code>B[c][p] = 1</code> if customer c bought p.</p>
<ul><li><code>B^T B</code> (products x products): <b>co-purchase counts</b>, how many customers bought both.</li>
<li><code>B B^T</code> (customers x customers): shared-item counts, a customer similarity.</li></ul>
<p>Walks that go customer -> product -> customer -> product (Module 3) explore exactly this structure.</p>`,
        },
        {
            title: 'Why raw co-purchase lies: popularity and cadence',
            body: `<p>Bananas and milk are bought <b>twice a week</b>, coffee monthly, a TV once a year. Raw counts make staples co-occur with <i>everything</i>, so "customers who bought a TV also bought... bananas".</p>
<p>Fixes: normalize. <b>Cosine</b> <code>co(a,b)/sqrt(deg a * deg b)</code>, <b>lift</b> <code>P(a,b) / (P(a) P(b))</code>, PMI, or cadence-aware weights. The Walmart walks use a <b>purchase-rate decay / frequency bias</b> so high-frequency consumables do not drown out big-ticket items.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Co-occurrence is not one relationship',
            body: `<p>Items in the same basket can be:</p>
<ul><li><b>Complements</b>: TV + TV stand, chips + salsa.</li>
<li><b>Substitutes</b>: Jif vs Skippy peanut butter (often <i>not</i> in the same basket, but chosen between).</li>
<li><b>Random co-occurrence</b>: detergent + bread from a general household trip.</li></ul>
<p>Separating these is Module 6. Basket-derived embedding spaces pull frequently co-bought items together and push incidental pairs apart once enough baskets lack them.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Heterogeneous graphs',
            body: `<p>Real retail graphs have many node types (customer, product, category, store, brand, search query) and edge types (<code>buys</code>, <code>views</code>, <code>searched</code>, <code>in_category</code>, <code>stocked_at</code>). Each type gets its own feature space and, in the model, its own weights.</p>
<pre><code>from torch_geometric.data import HeteroData
data = HeteroData()
data['customer'].x = cust_feats      # [N_c, 256] identity embeddings
data['product'].x  = prod_feats      # [N_p, 768] catalog text embeddings
data['customer', 'buys', 'product'].edge_index = edges   # [2, E]
data['customer', 'buys', 'product'].time = ts            # [E]</code></pre>`,
            src: ['pyg2', 'wmCollab'],
        },
        {
            title: 'Node and edge features in the Walmart design',
            body: `<ul><li><b>Customer input</b>: 256-d behavioral embeddings from the Customer Identity team (search and click aware, avoiding demographic-only bias).</li>
<li><b>Product input</b>: about 768-d semantic catalog embeddings, which already know LG TV is similar to Samsung TV.</li>
<li><b>Edges</b>: purchase relations over 14 months of omnichannel history.</li></ul>
<p>Good input features mean the GNN does not need to learn semantics from scratch, only how behavior bends them.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Time is part of the graph',
            body: `<p>Every purchase has a timestamp. A <b>temporal graph</b> keeps it on the edge, so at training time you can ask: what did the graph look like <b>as of</b> a given moment?</p>
<p>That single discipline, <b>point-in-time correctness</b>, prevents future purchases from leaking into features. PyG's samplers accept a <code>time_attr</code> so neighbors are restricted to the past of each seed.</p>`,
            src: ['rdl', 'pyg2'],
        },
        {
            title: 'Omnichannel identity',
            body: `<p>The same customer buys in store, online and via pickup. Unifying those into one customer node is what makes the graph omnichannel, and it is why Walmart's Customer Identity embeddings are valuable inputs.</p>
<p>It also means most edges come from <b>in-store purchases with no clicks or impressions</b>, which shapes evaluation (Module 5).</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'A database is already a graph',
            body: `<p>Relational Deep Learning views each table row as a node and each primary-foreign key link as an edge: <code>customers</code> -> <code>orders</code> -> <code>order_items</code> -> <code>products</code>. No hand-built joins or aggregates needed. Module 7 develops this into a full method.</p>`,
            src: ['rdl'],
        },
    ],
    quiz: [
        {
            q: 'For a bipartite incidence matrix B (customers x products), what does B<sup>T</sup>B give you?',
            options: ['Customer similarity', 'Product co-purchase counts', 'Purchase recency', 'Category hierarchy'],
            answer: 1, why: 'Entry (a, b) of B<sup>T</sup>B counts customers who bought both a and b.',
        },
        {
            q: 'Why do raw co-purchase counts recommend bananas to a TV buyer?',
            options: ['Bananas are complements to TVs', 'High-frequency staples co-occur with almost everything', 'The graph is directed', 'Embeddings are too small'],
            answer: 1, why: 'Popularity and purchase cadence inflate counts for staples. Normalize (cosine, lift) or bias walks by cadence.',
        },
        {
            q: 'Why store a retail graph as edge lists / CSR instead of a dense adjacency matrix?',
            options: ['It is more accurate', 'The graph is extremely sparse, so a dense matrix wastes memory', 'GPUs cannot read matrices', 'It removes edge weights'],
            answer: 1, why: 'Each customer touches a tiny fraction of the catalog; sparse formats store only existing edges.',
        },
        {
            q: 'Jif and Skippy are rarely in the same basket but are often chosen between. They are...',
            options: ['Complements', 'Substitutes', 'Random co-occurrences', 'Unrelated'],
            answer: 1, why: 'Substitutes replace each other. Co-purchase alone can miss or confuse them, which is why Module 6 fuses taxonomy, world knowledge and behavior.',
        },
        {
            q: 'What does point-in-time correctness guarantee?',
            options: ['Edges are sorted', 'Features for a training example only use data from before its timestamp', 'Every node has a timestamp', 'Embeddings are refreshed daily'],
            answer: 1, why: 'It blocks future information from leaking into training features, the most common silent bug in temporal ML.',
        },
        {
            q: 'In PyG, how are edges of a given relation stored?',
            options: ['As a dense n x n tensor', 'As a 2 x E edge_index tensor', 'As a Python dict of sets', 'As a CSV string'],
            answer: 1, why: '<code>edge_index</code> holds source and target indices; HeteroData keeps one per (src, relation, dst) triple.',
        },
    ],
});

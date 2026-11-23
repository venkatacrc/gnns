// Bibliography: public papers only (arXiv preprints and peer-reviewed venues).
// Vendor-authored papers are marked in their note; treat their headline numbers as vendor-reported.
GNN.refs = {
    rdl: {
        kind: 'paper', title: 'Relational Deep Learning: Graph Representation Learning on Relational Databases',
        authors: 'Fey, Hu, Huang, Lenssen, Ranjan, Robinson, et al.', year: 2023, url: 'https://arxiv.org/abs/2312.04615',
        note: 'Treat a database as a temporal heterogeneous graph: one node per row, edges from primary-foreign keys. Introduces RelBench.',
    },
    pyg2: {
        kind: 'paper', title: 'PyG 2.0: Scalable Learning on Real World Graphs',
        authors: 'Fey, Sunil, Nitta, Puri, Shah, Stojanovic, et al.', year: 2025, url: 'https://arxiv.org/abs/2507.16991',
        note: 'Heterogeneous + temporal graphs, feature/graph stores, scalable sampling; RDL and LLM deep dives.',
    },
    relgt: {
        kind: 'paper', title: 'Relational Graph Transformer',
        authors: 'Dwivedi, Jaladi, Shen, Lopez, Kanatsoulis, Puri, et al.', year: 2025, url: 'https://arxiv.org/abs/2505.10960',
        note: 'Five-part node tokens (features, type, hop, time, local structure); local attention + global centroids; up to 18% over GNNs on RelBench.',
    },
    kumorfm2: {
        kind: 'paper', title: 'KumoRFM-2: Scaling Foundation Models for Relational Learning',
        authors: 'Hudovernik, Lopez, Kocijan, Nitta, Lenssen, Leskovec, et al.', year: 2026, url: 'https://arxiv.org/abs/2604.12596',
        note: 'In-context learning + fine-tuning on raw multi-table data, early task injection, robust to cold start and noise, billion-scale. Vendor-authored (Kumo): results are vendor-reported.',
    },
    relbench2: {
        kind: 'paper', title: 'RelBench v2: A Large-Scale Benchmark and Repository for Relational Data',
        authors: 'Gu, Ranjan, Kanatsoulis, Tang, Jurkovic, Hudovernik, et al.', year: 2026, url: 'https://arxiv.org/abs/2602.12606',
        note: '11 datasets / 22M+ rows; adds autocomplete tasks, TGB event streams, ReDeLEx and 4DBInfer integrations.',
    },
    plurel: {
        kind: 'paper', title: 'PluRel: Synthetic Data unlocks Scaling Laws for Relational Foundation Models',
        authors: 'Kothapalli, Ranjan, Hudovernik, Dwivedi, Hoffart, Guestrin, et al.', year: 2026, url: 'https://arxiv.org/abs/2602.04029',
        note: 'Synthesizes schemas, PK-FK connectivity and causal feature distributions; pretraining loss follows power laws.',
    },
    pql: {
        kind: 'paper', title: 'Predictive Query Language: A Domain-Specific Language for Predictive Modeling on Relational Databases',
        authors: 'Kocijan, Sunil, Lenssen, Deb, Xe, Reyes Gomez, et al.', year: 2026, url: 'https://arxiv.org/abs/2602.09572',
        note: 'SQL-inspired declarative task definitions that compute training labels automatically. Vendor-authored (Kumo).',
    },
    gretriever: {
        kind: 'paper', title: 'G-Retriever: Retrieval-Augmented Generation for Textual Graph Understanding and Question Answering',
        authors: 'He, Tian, Sun, Chawla, Laurent, LeCun, et al.', year: 2024, url: 'https://arxiv.org/abs/2402.07630',
        note: 'RAG over textual graphs via Prize-Collecting Steiner Tree retrieval + soft prompting; GraphQA benchmark.',
    },
    pinsage: {
        kind: 'paper', title: 'Graph Convolutional Neural Networks for Web-Scale Recommender Systems (PinSage)',
        authors: 'Ying, He, Chen, Eksombatchai, Hamilton, Leskovec', year: 2018, url: 'https://arxiv.org/abs/1806.01973',
        note: 'Random-walk neighborhoods, importance pooling, curriculum hard negatives at Pinterest scale.',
    },
    sage: {
        kind: 'paper', title: 'Inductive Representation Learning on Large Graphs (GraphSAGE)',
        authors: 'Hamilton, Ying, Leskovec', year: 2017, url: 'https://arxiv.org/abs/1706.02216',
        note: 'Sample-and-aggregate; inductive embeddings for unseen nodes.',
    },
    gcn: {
        kind: 'paper', title: 'Semi-Supervised Classification with Graph Convolutional Networks',
        authors: 'Kipf, Welling', year: 2016, url: 'https://arxiv.org/abs/1609.02907',
        note: 'The symmetric-normalized propagation rule.',
    },
    gat: {
        kind: 'paper', title: 'Graph Attention Networks',
        authors: 'Velickovic, Cucurull, Casanova, Romero, Lio, Bengio', year: 2017, url: 'https://arxiv.org/abs/1710.10903',
        note: 'Learned attention weights over neighbors.',
    },
    gin: {
        kind: 'paper', title: 'How Powerful are Graph Neural Networks? (GIN)',
        authors: 'Xu, Hu, Leskovec, Jegelka', year: 2018, url: 'https://arxiv.org/abs/1810.00826',
        note: 'Message passing is at most as expressive as the 1-WL test; sum aggregation reaches it.',
    },
    mcauley: {
        kind: 'paper', title: 'Inferring Networks of Substitutable and Complementary Products',
        authors: 'McAuley, Pandey, Leskovec', year: 2015, url: 'https://arxiv.org/abs/1506.08839',
        note: 'Learns substitute ("also viewed") vs complement ("also bought") relations from product text and co-behavior.',
    },
    node2vec: {
        kind: 'paper', title: 'node2vec: Scalable Feature Learning for Networks',
        authors: 'Grover, Leskovec', year: 2016, url: 'https://arxiv.org/abs/1607.00653',
        note: 'Biased second-order random walks trade off breadth-first and depth-first exploration.',
    },
    pixie: {
        kind: 'paper', title: 'Pixie: A System for Recommending 3+ Billion Items to 200+ Million Users in Real-Time',
        authors: 'Eksombatchai, Jindal, Liu, Liu, Sharma, Sugnet, Ulrich, Leskovec', year: 2017, url: 'https://arxiv.org/abs/1711.07601',
        note: 'Biased random walks with early stopping over a pruned bipartite graph for real-time recommendation.',
    },
    tgn: {
        kind: 'paper', title: 'Temporal Graph Networks for Deep Learning on Dynamic Graphs',
        authors: 'Rossi, Chamberlain, Frasca, Eynard, Monti, Bronstein', year: 2020, url: 'https://arxiv.org/abs/2006.10637',
        note: 'Per-node memory updated by timestamped events; separates fast-changing state from slow structure.',
    },
    glnn: {
        kind: 'paper', title: 'Graph-less Neural Networks: Teaching Old MLPs New Tricks via Distillation',
        authors: 'Zhang, Liu, Sun, Shah', year: 2021, url: 'https://arxiv.org/abs/2110.08727',
        note: 'Distills a GNN into an MLP that needs no neighbor fetches at inference: the deep-to-shallow serving pattern.',
    },
    idgnn: {
        kind: 'paper', title: 'Identity-aware Graph Neural Networks',
        authors: 'You, Gomes-Selman, Ying, Leskovec', year: 2021, url: 'https://arxiv.org/abs/2101.10320',
        note: 'Colors the seed node during message passing, so the model scores pairs (customer, item) directly.',
    },
    frugalgpt: {
        kind: 'paper', title: 'FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance',
        authors: 'Chen, Zaharia, Zou', year: 2023, url: 'https://arxiv.org/abs/2305.05176',
        note: 'LLM cascades: answer with a cheap model when it is confident, escalate otherwise.',
    },
    react: {
        kind: 'paper', title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
        authors: 'Yao, Zhao, Yu, Du, Shafran, Narasimhan, Cao', year: 2022, url: 'https://arxiv.org/abs/2210.03629',
        note: 'Interleaves reasoning traces with tool calls; the basis of many agent loops.',
    },
    weber: {
        kind: 'paper', title: 'Anti-Money Laundering in Bitcoin: Experimenting with Graph Convolutional Networks for Financial Forensics',
        authors: 'Weber, Domeniconi, Chen, Weidele, Bellei, Robinson, Leiserson', year: 2019, url: 'https://arxiv.org/abs/1908.02591',
        note: 'Releases the Elliptic transaction graph with illicit / licit labels over time; GCNs vs tabular baselines.',
    },
    amlworld: {
        kind: 'paper', title: 'Realistic Synthetic Financial Transactions for Anti-Money Laundering Models',
        authors: 'Altman, Blanusa, von Niederhausern, Egressy, Anghel, Atasu', year: 2023, url: 'https://arxiv.org/abs/2306.16424',
        note: 'AMLworld: synthetic multi-bank transactions with planted laundering typologies (fan-in, fan-out, cycles, scatter-gather).',
    },
    multignn: {
        kind: 'paper', title: 'Provably Powerful Graph Neural Networks for Directed Multigraphs',
        authors: 'Egressy, von Niederhausern, Blanusa, Altman, Wattenhofer, Atasu', year: 2023, url: 'https://arxiv.org/abs/2306.11586',
        note: 'Reverse message passing, port numbering and ego IDs let GNNs detect directed laundering patterns.',
    },
};

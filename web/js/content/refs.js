// Bibliography. kind: 'paper' (public, peer/preprint) | 'walmart' (internal meeting notes: do not publish).
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
        note: 'In-context learning + fine-tuning on raw multi-table data, early task injection, robust to cold start and noise, billion-scale.',
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
        note: 'SQL-inspired declarative task definitions that compute training labels automatically.',
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
    wmCollab: {
        kind: 'walmart', title: 'Walmart & NVIDIA (Kumo) Collaboration: GNNs & Tabular Foundation Models (brainstorm summary)',
        note: 'Substitute vs complement signals, hybrid routing, PinSage-inspired Foundation GNN, negatives, masking, T-60/T-30 evaluation, decayed clickstream features, action items.',
    },
    wmTech: {
        kind: 'walmart', title: 'Walmart & NVIDIA Technical Discussion: Kumo, GNNs, and Decision Models',
        note: 'Biased walks and disaggregated sampling, Kumo Engine and multi-GPU, open recipes, context parallelism, agentic orchestration, decision models, KV context cache under 250 ms.',
    },
    nvFraud: {
        kind: 'walmart', title: 'NVIDIA / Kumo: Graph Transformers and Foundation Models for Fraud (deck)',
        note: 'Relational DL platform, AML subgraph patterns, GraphEngine scale, point-in-time sampling, deep-to-shallow distillation served under 100 ms.',
    },
};

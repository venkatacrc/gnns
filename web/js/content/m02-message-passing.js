GNN.module({
    id: 'm02', num: 2, minutes: 40, lab: 'lab02',
    title: 'Message passing: how GNN layers think',
    summary: 'Aggregate, transform, repeat. GCN, GraphSAGE and GAT, what aggregators can count, and why deep GNNs over-smooth.',
    objectives: [
        'Write the generic message-passing update and the GCN, SAGE and GAT special cases.',
        'Predict what mean, sum and max aggregation can and cannot distinguish.',
        'Diagnose over-smoothing and over-squashing and name the standard remedies.',
    ],
    refs: ['gcn', 'sage', 'gat', 'gin', 'pyg2'],
    cards: [
        {
            title: 'The one equation behind every GNN',
            body: `<p>For each node v at layer l:</p>
<pre><code>m_v = AGG({ MSG(h_u) : u in N(v) })     # gather from neighbors
h_v' = UPDATE(h_v, m_v)                  # combine with self</code></pre>
<p>MSG is usually a linear map, AGG is permutation-invariant (mean, sum, max, attention), UPDATE is a linear layer plus nonlinearity. Weights are <b>shared across all nodes</b>, so the model works on graphs of any size.</p>`,
        },
        {
            title: 'GCN: normalized averaging',
            body: `<p>Kipf and Welling's layer: <code>H' = relu( D^-1/2 (A + I) D^-1/2 H W )</code>.</p>
<p>Add self-loops, then weight each neighbor by <code>1/sqrt(deg_v * deg_u)</code>, so very high-degree nodes (bananas) do not dominate everyone they touch. In the lab, switch to <b>sym</b> normalization and watch the hub's influence shrink.</p>`,
            src: ['gcn'],
        },
        {
            title: 'GraphSAGE: sample and aggregate, inductively',
            body: `<p><code>h_v' = relu( W [ h_v || mean(h_u : u in sample(N(v))) ] )</code></p>
<p>Two ideas: keep the node's own vector separate (concatenate), and aggregate over a <b>sampled</b> neighborhood. Because it is a function of features, it is <b>inductive</b>: new customers and items get embeddings without retraining. PinSage-style customer encoders follow the same pattern: a 1-hop convolution over sampled items, then an MLP.</p>`,
            src: ['sage', 'pinsage'],
        },
        {
            title: 'GAT: let the model choose which neighbors matter',
            body: `<p>Attention weights <code>a_vu = softmax_u( LeakyReLU( a^T [W h_v || W h_u] ) )</code>, then <code>h_v' = sum_u a_vu W h_u</code>.</p>
<p>A TV buyer's neighborhood includes bananas and an HDMI cable. Attention can learn the cable is more informative for the next purchase. Multi-head attention stabilizes training. Graph transformers (Module 8) extend attention beyond immediate neighbors.</p>`,
            src: ['gat'],
        },
        {
            title: 'What can your aggregator count?',
            body: `<ul><li><b>Mean</b> sees proportions: neighbors {a, b} and {a, a, b, b} look the same.</li>
<li><b>Max</b> sees the set of distinct values: {a, b} and {a, b, b} look the same.</li>
<li><b>Sum</b> sees the full multiset, so it can count. GIN shows sum + MLP is as expressive as message passing gets: the <b>1-WL test</b>.</li></ul>
<p>For "how many times did money flow in?" (fan-in), sum carries the signal; for "what fraction of my basket is baby?", mean does.</p>`,
            src: ['gin'],
        },
        {
            title: 'Layers = hops = receptive field',
            body: `<p>k layers let information travel k hops. In a bipartite graph, customer -> item -> customer -> item is 3 hops: "items bought by people who bought what I bought". Most production recommenders use <b>1-3 layers</b>; PinSage-style models keep convolutions few and let random-walk neighborhoods reach further.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Over-smoothing',
            body: `<p>Mean aggregation is repeated averaging. Stack enough layers and every node in a connected component converges to the same vector, so they become indistinguishable. In the lab, watch the <b>feature spread</b> collapse as you add layers.</p>
<p>Remedies: few layers, <b>residual / skip connections</b>, jumping knowledge (concatenate all layers), normalization (PairNorm), and keeping the self vector separate as SAGE does.</p>`,
        },
        {
            title: 'Over-squashing and long-range signal',
            body: `<p>The k-hop neighborhood grows exponentially, but it must be squeezed into one fixed-size vector. Information from far away gets <b>squashed</b> through bottleneck nodes. A laundering chain 6 hops long is exactly this kind of signal.</p>
<p>Graph transformers attack this by <b>"teleporting" the signal</b>: attention connects distant nodes directly instead of relaying hop by hop (Module 8).</p>`,
            src: ['relgt'],
        },
        {
            title: 'Heterogeneous message passing',
            body: `<p>Different relation types need different weights: a <code>buys</code> message is not a <code>views</code> message. R-GCN learns one matrix per relation; PyG's <code>to_hetero</code> clones a homogeneous model per edge type and sums results per destination type.</p>
<pre><code>class SAGE(torch.nn.Module):
    def __init__(self, h):
        super().__init__()
        self.c1 = SAGEConv((-1, -1), h)
        self.c2 = SAGEConv((-1, -1), h)
    def forward(self, x, edge_index):
        return self.c2(self.c1(x, edge_index).relu(), edge_index)
model = to_hetero(SAGE(64), data.metadata(), aggr='sum')</code></pre>`,
            src: ['pyg2'],
        },
        {
            title: 'Heads: what you do with the embeddings',
            body: `<ul><li><b>Node classification</b>: is this account a mule? Linear head on h_v.</li>
<li><b>Link prediction / retrieval</b>: score = <code>u_c . e_p</code> (dot product) or cosine. Dot product scores support approximate nearest-neighbor search over millions of items.</li>
<li><b>Graph-level</b>: pool node vectors (e.g., classify a whole transaction subgraph).</li></ul>
<p>Cosine vs dot product is a real modelling choice: a dot product lets popularity creep in through vector norms, while cosine removes norm and scores only direction.</p>`,
        },
    ],
    quiz: [
        {
            q: 'Which aggregator can distinguish a node with neighbors {a, b} from one with {a, a, b, b}?',
            options: ['Mean', 'Max', 'Sum', 'None of them'],
            answer: 2, why: 'Sum preserves multiset counts. Mean sees the same proportions and max sees the same distinct values.',
        },
        {
            q: 'What does GCN\'s D<sup>-1/2</sup>(A+I)D<sup>-1/2</sup> normalization mainly prevent?',
            options: ['Negative weights', 'High-degree hubs dominating their neighbors\' updates', 'Self-loops', 'Overfitting'],
            answer: 1, why: 'Each message is scaled by 1/sqrt(deg_v deg_u), damping the influence of hubs like staple items.',
        },
        {
            q: 'You stack 12 mean-aggregation layers and all customer embeddings look alike. This is...',
            options: ['Over-squashing', 'Over-smoothing', 'Label leakage', 'Cold start'],
            answer: 1, why: 'Repeated averaging converges node features within a component. Use fewer layers, skips or jumping knowledge.',
        },
        {
            q: 'Why is GraphSAGE inductive?',
            options: ['It uses attention', 'It learns a function of node features and sampled neighbors rather than a per-node lookup', 'It has more layers', 'It trains on the full graph'],
            answer: 1, why: 'A learned aggregation function can be applied to nodes never seen in training.',
        },
        {
            q: 'A 6-hop laundering chain is hard for a 2-layer GNN because...',
            options: ['Sum aggregation fails on chains', 'The signal lies outside the receptive field and deeper stacks squash it', 'Chains have no features', 'GNNs need undirected graphs'],
            answer: 1, why: 'Two layers see two hops; going deeper squashes exponentially many paths into one vector. Global attention helps.',
        },
        {
            q: 'In PyG, what does <code>to_hetero</code> do?',
            options: ['Converts edges to undirected', 'Replicates a homogeneous GNN per edge type for heterogeneous graphs', 'Samples neighbors', 'Adds time encodings'],
            answer: 1, why: 'It creates per-relation copies of each layer and aggregates messages arriving at each node type.',
        },
    ],
});

GNN.module({
    id: 'm04', num: 4, minutes: 45, lab: 'lab04',
    title: 'Training objectives: positives, negatives and leakage',
    summary: 'Dual encoders, contrastive softmax, the three negative pools, hard-negative trade-offs and the 48 / 16 positive mask.',
    objectives: [
        'Write the dual-encoder score and the sampled-softmax loss.',
        'Explain what each negative pool teaches and the false-negative risk.',
        'Identify convolution leakage and apply positive masking.',
    ],
    refs: ['wmCollab', 'pinsage', 'sage'],
    cards: [
        {
            title: 'The dual encoder (two towers)',
            body: `<ul><li><b>Customer tower</b>: 1-hop graph convolution over the customer's neighborhood items, then a 3-layer MLP -> <code>u_c</code>.</li>
<li><b>Product tower</b>: 3-layer MLP over product features -> <code>e_p</code>. No convolution at inference, so it is cheap, <b>inductive</b> for new items, and friendly to ANN indexes.</li>
<li><b>Score</b>: <code>s(c, p) = u_c . e_p</code>.</li></ul>
<p>Retrieval = find the items with the largest dot product: approximate nearest neighbors over millions of vectors.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Contrastive softmax loss',
            body: `<p>For a customer c with positive p+ and negatives N:</p>
<pre><code>L = -log  exp(s(c,p+)) / ( exp(s(c,p+)) + sum_n exp(s(c,n)) )</code></pre>
<p>Push the positive score up, push negative scores down. The Walmart loss sums the denominator over <b>all three negative pools</b>. Alternatives: BPR (pairwise), margin / triplet loss. A temperature on scores and L2-normalized vectors (cosine) change how hard the loss pushes.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Where positives come from',
            body: `<p>Not raw purchases: the <b>top 64 items of the customer's PPR list</b> (scalable to 128). That smooths noise. An item visited 10 times across 800 walks is a strong, collaboratively supported signal, not one random purchase.</p>
<p>The NVIDIA / Kumo point that stuck: the architecture is mostly a tool; the <b>highest leverage is the supervision target</b> and curating a high-quality training subset, as Pinterest trained on curated pins rather than all 30B.</p>`,
            src: ['wmCollab', 'pinsage'],
        },
        {
            title: 'Three negative pools',
            body: `<table><tr><th>Pool</th><th>Source</th><th>Teaches</th></tr>
<tr><td>Customer hard (128)</td><td>Ranks 200-400 of the customer's own PPR list</td><td>Separate "in my neighborhood" from "what I actually want"</td></tr>
<tr><td>Product hard (64 of 1,024)</td><td>Semantically similar items, e.g. LG vs Samsung TV</td><td>Fine distinctions between near-substitutes</td></tr>
<tr><td>Easy / random (700)</td><td>Uniform over the 31M catalog</td><td>Global layout: TVs far from diapers</td></tr></table>
<p>Pool sizes are discussed settings, not tuned optima.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Why hard negatives matter',
            body: `<p>Random negatives are trivially easy: their score is already low, softmax gives them almost no gradient, and the model stops learning fine structure.</p>
<p>Hard negatives sit close to the positive and carry most of the gradient. PinSage used a <b>curriculum</b>: start with easy negatives, add harder ones over epochs.</p>
<p>The catch is <b>false negatives</b>: a "hard negative" the customer would actually buy. Too many hard negatives can hurt held-out recall. The lab lets you measure that instead of guessing.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'The shortcut: leakage through the convolution',
            body: `<p>If the target item p+ is also in the customer's input neighborhood, the convolution literally contains <code>e_{p+}</code>. The easiest way to score it high is to copy it: <b>memorization</b>.</p>
<p>Training loss looks fantastic; held-out recall does not improve, or gets worse. This is the GNN version of label leakage.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'The fix: mask the positives (48 / 16)',
            body: `<p>Of the 64 positives per customer, pass <b>48 into the convolution</b> and hold <b>16 out as prediction targets</b>. The model must infer targets from other evidence, which is exactly the generalization you want at serving time.</p>
<p>In the lab, turn masking off: training loss drops while held-out recall falls. That gap is the signature of leakage, worth remembering.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Clean the supervision',
            body: `<p>Non-retail, high-noise transactions (fuel / gasoline) are bought by everyone on a cadence that says nothing about taste. One agreed action item: <b>filter fuel from the supervision set</b> and measure the effect.</p>
<p>The same goes for gift cards, bags and carts if they are logged as items. Ask of each item type: does predicting this teach the model anything useful?</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Cold start comes for free with an inductive item tower',
            body: `<p>A new product with a description and image but zero purchases still gets <code>e_p = MLP(features)</code>, already placed near similar items. A new customer with a single purchase gets <code>u_c</code> from a one-item convolution plus identity features.</p>
<p>Sporadic shoppers in short time windows create "zero-history pockets", and the inductive encoder is what keeps them servable.</p>`,
            src: ['wmCollab', 'sage'],
        },
    ],
    quiz: [
        {
            q: 'Why does the Walmart product tower avoid graph convolution at inference?',
            options: ['Convolution is inaccurate', 'It makes item embeddings cheap, inductive for new items and ANN-friendly', 'Products have no neighbors', 'To reduce training data'],
            answer: 1, why: 'A feature MLP embeds any item, including cold-start ones, with no neighborhood lookup.',
        },
        {
            q: 'Customer hard negatives come from...',
            options: ['Random catalog items', 'Ranks 200-400 of the customer\'s own PPR list', 'Items in other countries', 'The top 64 PPR items'],
            answer: 1, why: 'Items in the extended neighborhood the customer rarely or never bought: close but not wanted.',
        },
        {
            q: 'Why do random negatives alone train poorly?',
            options: ['They are too expensive', 'They are too easy, so they contribute almost no gradient', 'They leak labels', 'They cause over-smoothing'],
            answer: 1, why: 'Their scores are already low; softmax assigns them near-zero gradient.',
        },
        {
            q: 'Masking off: training loss goes down but held-out recall drops. What happened?',
            options: ['Over-smoothing', 'The model learned to copy targets present in its own convolution (leakage)', 'Too few negatives', 'The learning rate is too low'],
            answer: 1, why: 'With the target in the input neighborhood, memorizing it is the shortcut. 48/16 masking removes it.',
        },
        {
            q: 'The main risk of too many hard negatives is...',
            options: ['Slower inference', 'False negatives: pushing away items the customer would actually buy', 'Larger embeddings', 'Cold start'],
            answer: 1, why: 'Near neighbors are sometimes genuine future purchases; penalizing them hurts recall.',
        },
        {
            q: 'According to the discussion, where is the highest leverage in improving the Foundation GNN?',
            options: ['Adding layers', 'The supervision target and curated training subsets', 'Bigger GPUs', 'Changing the optimizer'],
            answer: 1, why: 'The NVIDIA / Kumo team stressed iterating on the objective and curating supervision (e.g., removing fuel).',
        },
    ],
});

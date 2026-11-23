GNN.module({
    id: 'm04', num: 4, minutes: 45, lab: 'lab04',
    title: 'Training objectives: positives, negatives and leakage',
    summary: 'Dual encoders, contrastive softmax, three negative pools, hard-negative trade-offs and positive masking against leakage.',
    objectives: [
        'Write the dual-encoder score and the sampled-softmax loss.',
        'Explain what each negative pool teaches and the false-negative risk.',
        'Identify convolution leakage and apply positive masking.',
    ],
    refs: ['pinsage', 'sage'],
    cards: [
        {
            title: 'The dual encoder (two towers)',
            body: `<ul><li><b>Customer tower</b>: a 1-hop graph convolution over the customer's neighborhood items, then an MLP -> <code>u_c</code>.</li>
<li><b>Product tower</b>: an MLP over product features -> <code>e_p</code>. No convolution at inference, so it is cheap, <b>inductive</b> for new items, and friendly to ANN indexes.</li>
<li><b>Score</b>: <code>s(c, p) = u_c . e_p</code>.</li></ul>
<p>Retrieval = find the items with the largest dot product: approximate nearest neighbors over millions of vectors.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Contrastive softmax loss',
            body: `<p>For a customer c with positive p+ and negatives N:</p>
<pre><code>L = -log  exp(s(c,p+)) / ( exp(s(c,p+)) + sum_n exp(s(c,n)) )</code></pre>
<p>Push the positive score up, push negative scores down. With several negative pools, the denominator sums over <b>all of them</b>. Alternatives: BPR (pairwise), margin / triplet loss. A temperature on scores and L2-normalized vectors (cosine) change how hard the loss pushes.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Where positives come from',
            body: `<p>Not raw purchases: the <b>top-K items of the customer's PPR list</b>. That smooths noise. An item visited 10 times across hundreds of walks is a strong, collaboratively supported signal, not one random purchase.</p>
<p>A lesson that recurs across recommender teams: the architecture is mostly a tool; the <b>highest leverage is the supervision target</b> and curating a high-quality training set.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Three negative pools',
            body: `<table><tr><th>Pool</th><th>Source</th><th>Teaches</th></tr>
<tr><td>Customer hard</td><td>Middle ranks of the customer's own PPR list</td><td>Separate "in my neighborhood" from "what I actually want"</td></tr>
<tr><td>Product hard</td><td>Semantically similar items, e.g. LG vs Samsung TV</td><td>Fine distinctions between near-substitutes</td></tr>
<tr><td>Easy / random</td><td>Uniform over the whole catalog</td><td>Global layout: TVs far from diapers</td></tr></table>
<p>Pool sizes are knobs: tune them per dataset. Lab 4's defaults (12 random, 0 same-category) were chosen by 5-seed experiments on the synthetic world.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'Why hard negatives matter',
            body: `<p>Random negatives are trivially easy: their score is already low, softmax gives them almost no gradient, and the model stops learning fine structure.</p>
<p>Hard negatives sit close to the positive and carry most of the gradient. PinSage used a <b>curriculum</b>: start with easy negatives, add harder ones over epochs.</p>
<p>The catch is <b>false negatives</b>: a "hard negative" the customer would actually buy. In the course's synthetic world, shoppers buy <i>within</i> categories, so same-category negatives are often true positives. A hard-heavy pool dropped Recall@5 from 0.39 to 0.25 across 5 seeds. Real systems soften this with curricula, rank bands that skip the very top of the PPR list, and filtering known purchases. Lab 4 lets you reproduce it.</p>`,
            src: ['pinsage'],
        },
        {
            title: 'The shortcut: leakage through the convolution',
            body: `<p>If the target item p+ is also in the customer's input neighborhood, the convolution literally contains <code>e_{p+}</code>. The easiest way to score it high is to copy it: <b>memorization</b>.</p>
<p>Training loss looks fantastic; held-out recall does not improve, or gets worse. This is the GNN version of label leakage.</p>`,
        },
        {
            title: 'The fix: mask the positives',
            body: `<p>Split each customer's positives: pass about <b>three quarters into the convolution</b> and hold <b>one quarter out as prediction targets</b>. The model must infer targets from other evidence, which is exactly the generalization you want at serving time.</p>
<p>In the lab, turn masking off: training loss drops about 3x while held-out recall falls about 10 points (consistent across 5 seeds). That gap is the signature of leakage, worth remembering.</p>`,
        },
        {
            title: 'Clean the supervision',
            body: `<p>Non-retail, high-noise transactions (fuel, for example) are bought by everyone on a cadence that says nothing about taste. A cheap experiment: <b>filter them from the supervision set</b> and measure the effect.</p>
<p>The same goes for gift cards, bags and carts if they are logged as items. Ask of each item type: does predicting this teach the model anything useful?</p>`,
        },
        {
            title: 'Cold start comes for free with an inductive item tower',
            body: `<p>A new product with a description and image but zero purchases still gets <code>e_p = MLP(features)</code>, already placed near similar items. A new customer with a single purchase gets <code>u_c</code> from a one-item convolution plus identity features.</p>
<p>Sporadic shoppers in short time windows create "zero-history pockets", and the inductive encoder is what keeps them servable.</p>`,
            src: ['sage'],
        },
    ],
    quiz: [
        {
            q: 'Why does a two-tower product encoder avoid graph convolution at inference?',
            options: ['Convolution is inaccurate', 'It makes item embeddings cheap, inductive for new items and ANN-friendly', 'Products have no neighbors', 'To reduce training data'],
            answer: 1, why: 'A feature MLP embeds any item, including cold-start ones, with no neighborhood lookup.',
        },
        {
            q: 'Customer hard negatives come from...',
            options: ['Random catalog items', 'Middle ranks of the customer\'s own PPR list', 'Items in other countries', 'The very top of the PPR list'],
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
            answer: 1, why: 'With the target in the input neighborhood, memorizing it is the shortcut. Masking held-out positives removes it.',
        },
        {
            q: 'The main risk of too many hard negatives is...',
            options: ['Slower inference', 'False negatives: pushing away items the customer would actually buy', 'Larger embeddings', 'Cold start'],
            answer: 1, why: 'Near neighbors are sometimes genuine future purchases; penalizing them hurts recall.',
        },
        {
            q: 'Where is the highest leverage in improving a retail embedding model, according to this module?',
            options: ['Adding layers', 'The supervision target and curated training sets', 'Bigger GPUs', 'Changing the optimizer'],
            answer: 1, why: 'Iterating on the objective and curating supervision (e.g., removing fuel) usually beats architecture tweaks.',
        },
    ],
});

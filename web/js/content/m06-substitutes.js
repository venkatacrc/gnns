GNN.module({
    id: 'm06', num: 6, minutes: 35, lab: 'lab06',
    title: 'Substitutes vs complements: fusing signals',
    summary: 'Three signal families, the limits of LLM labeling, confidence-routed hybrid pipelines and how to benchmark them on a toy problem.',
    objectives: [
        'Name the three signal families and what each contributes.',
        'Explain the failure modes of LLM-generated pair labels.',
        'Design and evaluate a confidence-based hybrid router.',
    ],
    refs: ['mcauley', 'frugalgpt', 'kumorfm2'],
    cards: [
        {
            title: 'The pair problem',
            body: `<p>Given products (a, b), is b a <b>substitute</b> (replaces a), a <b>complement</b> (goes with a), or <b>unrelated</b> (random co-occurrence)? Substitution powers out-of-stock replacement; complements power "frequently bought together" and bundles.</p>
<p>Retailers have massive co-purchase logs but <b>rarely ground-truth labels at scale</b>, and a tempting shortcut is to generate them with LLMs.</p>`,
            src: ['mcauley'],
        },
        {
            title: 'Three signal families',
            body: `<ol><li><b>Business knowledge</b>: taxonomy. Two peanut-butter SKUs in the same leaf category lean substitute; cross-category pairs lean complement.</li>
<li><b>World knowledge</b>: semantic common sense (traditionally an LLM): salsa goes with chips.</li>
<li><b>Collaborative / behavioral</b>: co-purchase and co-view statistics, self-supervised basket embeddings, historical substitution acceptance rates.</li></ol>
<p>The goal: <b>fuse</b> these instead of writing rigid rules. McAuley et al. learned substitute and complement relations jointly from product text and co-behavior, which beat either signal alone.</p>`,
            src: ['mcauley'],
        },
        {
            title: 'Behavior alone is ambiguous',
            body: `<p>In a basket-derived embedding space, items bought together, <b>both substitutes and complements</b>, get pulled close. Shoppers buy two peanut butters (variety) and peanut butter with bread.</p>
<p>Incidental household pairs (detergent with milk) get pushed apart once enough baskets lack them. So "close in embedding space" means "related", not which kind of related. You need taxonomy or world knowledge to break the tie.</p>`,
            src: ['mcauley'],
        },
        {
            title: 'The risks of LLM-generated labels',
            body: `<ul><li><b>Inconsistency</b>: different models, or the same model with a reworded prompt, disagree on the same pair.</li>
<li><b>Plausible but wrong explanations</b>: fluent reasoning that invents a relationship, or denies an obvious one.</li>
<li><b>No deterministic way to verify</b> which answer is right without ground truth.</li>
<li><b>Cost</b>: scoring millions of catalog pairs is expensive.</li></ul>
<p>Spot-check a random sample by hand before trusting any labeler. LLMs stay useful for cold start, coverage and explanation, just not as the sole source of truth.</p>`,
        },
        {
            title: 'The hybrid routing pipeline',
            body: `<pre><code>score, conf = tabular_model(pair, known labels)   # GBDT or a tabular foundation model
if conf >= threshold:  return score               # cheap, learned from history
else:                  return world_model(pair)   # LLM / lightweight yes-no model</code></pre>
<p>This is a <b>cascade</b>, the FrugalGPT idea: answer with the cheap model when it is confident and escalate otherwise. Tabular foundation models are pitched for exactly the low-label regime (tens to hundreds of examples); KumoRFM-2's results there are vendor-reported, so re-test them on your own labels.</p>`,
            src: ['frugalgpt', 'kumorfm2'],
        },
        {
            title: 'Calibration is the hinge',
            body: `<p>Routing only works if confidence means something: of the pairs scored with confidence 0.9, about 90% should be right. Check with a <b>reliability diagram</b> (bin by confidence, plot accuracy).</p>
<p>Then the threshold is a business dial: higher threshold means more LLM calls (cost, latency) and higher accuracy on the routed share. Lab 6 lets you sweep it and see the cost/accuracy frontier.</p>`,
        },
        {
            title: 'Deterministic world-knowledge models',
            body: `<p>Another option: a <b>lightweight, deterministic</b> world-knowledge model (a small classifier or a decision-model head) that outputs a binary yes/no without heavy LLM overhead. Same input, same answer, every time, which matters for audits and caching.</p>
<p>Module 11 returns to decision-model heads that replace token generation with bounded action distributions.</p>`,
        },
        {
            title: 'Treat it as a toy benchmark first',
            body: `<p>Before building anything large, make substitute vs complement a <b>controlled toy problem</b> and compare side by side:</p>
<ol><li>A low-shot statistical model on labels plus graph / tabular signals (GBDT or a tabular foundation model).</li>
<li>A deterministic lightweight world-knowledge model.</li>
<li>An LLM baseline (prompt-based labeling).</li></ol>
<p>Measure label accuracy <b>and confidence calibration</b> for each, then the hybrid. Document the graph schema so others can check how it was constructed.</p>`,
        },
        {
            title: 'Direction and evaluation details',
            body: `<p>Complements are often <b>asymmetric</b>: TV -> TV stand is a strong suggestion; TV stand -> TV is not. Model pairs as directed.</p>
<p>Report per-class precision and recall (substitute vs complement vs unrelated) rather than overall accuracy. "Unrelated" usually dominates and inflates accuracy.</p>`,
        },
    ],
    quiz: [
        {
            q: 'Two peanut butter SKUs in the same leaf category most likely signal...',
            options: ['Complements', 'Substitutes', 'Fraud', 'Nothing'],
            answer: 1, why: 'Business taxonomy: same leaf category leans substitute.',
        },
        {
            q: 'Why is co-purchase embedding similarity alone insufficient?',
            options: ['It is too slow', 'Both substitutes and complements end up close, so it cannot tell them apart', 'It ignores popular items', 'It needs labels'],
            answer: 1, why: 'Behavioral closeness means related, not which kind of relation.',
        },
        {
            q: 'In the hybrid pipeline, when does a pair go to the LLM / world model?',
            options: ['Always', 'When the statistical model\'s confidence is below threshold or labels are missing', 'Never', 'Only for complements'],
            answer: 1, why: 'Confident cases stay with the cheap learned model; uncertain ones fall back to world knowledge.',
        },
        {
            q: 'What makes confidence-based routing trustworthy?',
            options: ['A big LLM', 'Calibration: confidence matches empirical accuracy', 'More categories', 'Directed edges'],
            answer: 1, why: 'Without calibration, the threshold routes the wrong pairs.',
        },
        {
            q: 'Which is NOT a known risk of LLM-generated labels?',
            options: ['Inconsistent answers across models and prompts', 'Plausible but wrong explanations', 'No deterministic way to verify correctness', 'They cannot read product titles'],
            answer: 3, why: 'The risks are inconsistency, confabulation and unverifiability, not reading ability.',
        },
    ],
});

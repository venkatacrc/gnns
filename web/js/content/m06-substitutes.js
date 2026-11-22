GNN.module({
    id: 'm06', num: 6, minutes: 35, lab: 'lab06',
    title: 'Substitutes vs complements: fusing signals',
    summary: 'Three signal families, the limits of LLM labeling, confidence-routed hybrid pipelines and how to benchmark them on a toy problem.',
    objectives: [
        'Name the three signal families and what each contributes.',
        'Explain the failure modes of LLM-generated pair labels.',
        'Design and evaluate a confidence-based hybrid router.',
    ],
    refs: ['wmCollab', 'kumorfm2'],
    cards: [
        {
            title: 'The pair problem',
            body: `<p>Given products (a, b), is b a <b>substitute</b> (replaces a), a <b>complement</b> (goes with a), or <b>unrelated</b> (random co-occurrence)? Substitution powers out-of-stock replacement; complements power "frequently bought together" and bundles.</p>
<p>Walmart has massive co-purchase logs but <b>no ground-truth labels at scale</b>; they were being generated with LLMs.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Three signal families',
            body: `<ol><li><b>Business knowledge</b>: taxonomy. Two peanut-butter SKUs in the same leaf category lean substitute; cross-category pairs lean complement.</li>
<li><b>World knowledge</b>: semantic common sense (traditionally an LLM): salsa goes with chips.</li>
<li><b>Collaborative / behavioral</b>: co-purchase and co-view statistics, self-supervised basket embeddings, historical substitution acceptance rates.</li></ol>
<p>The goal discussed: <b>fuse</b> these instead of writing rigid rules. Statistical basket models already beat manual rules at predicting whether shoppers accept a substitute.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'Behavior alone is ambiguous',
            body: `<p>In a basket-derived embedding space, items bought together, <b>both substitutes and complements</b>, get pulled close. Shoppers buy two peanut butters (variety) and peanut butter with bread.</p>
<p>Incidental household pairs (detergent with milk) get pushed apart once enough baskets lack them. So "close in embedding space" means "related", not which kind of related. You need taxonomy or world knowledge to break the tie.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'What went wrong with LLM labels',
            body: `<ul><li>Manual checks of <b>50-100 examples</b> showed <b>inconsistent reasoning across models</b> (GPT vs Gemini).</li>
<li><b>Hallucinated explanations</b>: claiming milk does not go with bread, inventing stories about needing a butter knife.</li>
<li><b>No deterministic way to verify</b> which model is right.</li>
<li>And at catalog scale, scoring millions of pairs is expensive.</li></ul>
<p>LLMs stay useful for cold start, coverage and explanation, just not as the sole source of truth.</p>`,
            src: ['wmCollab'],
        },
        {
            title: 'The hybrid routing pipeline',
            body: `<pre><code>score, conf = KumoTabular_or_XGBoost(pair, known labels)
if conf >= threshold:  return score         # cheap, learned from history
else:                  return WorldModel(pair)  # LLM / lightweight yes-no model</code></pre>
<p>Kumo Tabular returns a prediction <b>and</b> a confidence. In low-label regimes (10-100 examples) its confidence was reported more reliable than XGBoost's, acting as a low-shot statistical decision model. This hybrid <b>outperformed either model alone</b> on shopping-catalog benchmarks (as reported in the session).</p>`,
            src: ['wmCollab', 'kumorfm2'],
        },
        {
            title: 'Calibration is the hinge',
            body: `<p>Routing only works if confidence means something: of the pairs scored with confidence 0.9, about 90% should be right. Check with a <b>reliability diagram</b> (bin by confidence, plot accuracy).</p>
<p>Then the threshold is a business dial: higher threshold means more LLM calls (cost, latency) and higher accuracy on the routed share. Lab 6 lets you sweep it and see the cost/accuracy frontier.</p>`,
        },
        {
            title: 'Deterministic world-knowledge models',
            body: `<p>A second option discussed: a <b>lightweight, deterministic</b> world-knowledge model (JEPA-style or a decision-model head) that outputs a binary yes/no without heavy LLM overhead. Same input, same answer, every time, which matters for audits and caching.</p>
<p>Module 11 returns to decision-model heads that replace token generation with bounded action distributions.</p>`,
            src: ['wmCollab', 'wmTech'],
        },
        {
            title: 'Treat it as a toy benchmark first',
            body: `<p>The agreed plan: make substitute vs complement a <b>controlled toy problem</b> and compare side by side:</p>
<ol><li>Kumo Tabular / RDB Learn (low-shot statistical learning on labels + graph / tabular signals).</li>
<li>A deterministic lightweight world-knowledge model.</li>
<li>The LLM baseline (current prompt-based labeling).</li></ol>
<p>Measure label accuracy <b>and confidence calibration</b>, then the hybrid. Share graph schema documentation with NVIDIA so they can validate construction and produce an optimized recipe.</p>`,
            src: ['wmCollab'],
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
            q: 'Which was NOT reported as a problem with LLM-generated labels?',
            options: ['Inconsistent reasoning across models', 'Hallucinated explanations', 'No deterministic way to verify correctness', 'They cannot read product titles'],
            answer: 3, why: 'The issues were inconsistency, hallucination and unverifiability, not reading ability.',
        },
    ],
});

# GNN Lab: a hands-on course on graph neural networks

A step-by-step course on GNNs for Mac and Android (Pixel), built as an offline-capable web app
in the style of `sloka_words`. 13 modules (orientation through capstone), each with **Learn**
cards, a **Test** quiz with explanations, and an interactive **Lab** that runs entirely in the
browser on synthetic retail and transaction data.

> **Sources.** All course content is built from public papers and benchmarks (see below) plus
> synthetic lab data. Retail and fraud scenarios are generic teaching examples, not descriptions of
> any company's systems.

## Open it

```bash
node tools/serve.js          # prints a localhost URL and a phone URL for the same Wi-Fi
```

- **Mac:** open the URL, then install it as an app: Safari **File ▸ Add to Dock** (macOS Sonoma+)
  or Chrome **Install page as app**. It gets its own window and Dock icon.
- **Pixel:** open the phone URL in Chrome, then **Install app** / **Add to Home screen**. It launches
  full screen.
- Both work **offline** after the first load (service worker). Progress is stored locally per device.

No build step, no dependencies: vanilla JS, HTML and CSS. Node 18+ is needed only for the server and tests.

## What's inside

| Module | Topic | Lab |
|---|---|---|
| 0 | Orientation, why graphs | none |
| 1 | Graphs from baskets | Co-purchase graph: counts vs cosine vs lift |
| 2 | Message passing | Aggregators, layers, self-loops, expressivity |
| 3 | Sampling and random walks | Cadence-biased walks, fanout cost |
| 4 | Training a recommender | In-browser dual encoder, masking, negatives |
| 5 | Evaluation | Hit/Recall/Precision/MRR/NDCG, 5-seed baselines |
| 6 | Hybrid ML + LLM labeling | Confidence routing (labeled as a simulation) |
| 7 | Relational deep learning / PQL | Point-in-time training tables and leakage |
| 8 | Graph transformers (RelGT) | Subgraph tokenization and toy attention |
| 9 | Fraud and AML | Pattern detectors vs guilt-by-association |
| 10 | Shipping: real-time signals, serving | Decayed features vs transient edges, latency budget |
| 11 | Graphs meet LLMs | G-Retriever-style PCST retrieval and prompt |
| 12 | Capstone | Pre-registered 5-seed experiment with a verdict |

### Evidence rules

The content separates **peer-reviewed** findings, **vendor-reported** results (e.g. KumoRFM-2,
which is authored by the vendor) and **synthetic** lab results. Lab numbers come from small
synthetic worlds and are never presented as production performance. Paper metrics are treated as
hypotheses to re-test, not universal targets. Where a synthetic world makes something
unrealistically easy (e.g. Lab 9's amount filter), the lab says so.

Papers drawn on: RDL (2312.04615), PyG 2.0 (2507.16991), RelGT (2505.10960), KumoRFM-2 (2604.12596),
RelBench v2 (2602.12606), PluRel (2602.04029), PQL (2602.09572), G-Retriever (2402.07630), plus
PinSage, Pixie, GraphSAGE, GIN, node2vec, ID-GNN, TGN, GLNN, Elliptic, AMLworld and Multi-GNN.
The in-app bibliography (Sources on each module) has full citations and links.

## Layout

```
web/                 the app (source of truth)
  index.html, app.css, sw.js, manifest.webmanifest, files.js (shell list + cache version)
  js/core/           gnn.js (graph math), retail.js, fraud.js: pure, node-tested
                     ui.js, viz.js: DOM helpers and SVG rendering
  js/content/        m00..m12: cards, quizzes, sources per module
  js/labs/           lab01..lab12
tests/js/            unit tests for the core (node --test)
tests/e2e/smoke.mjs  headless-Chrome smoke test (DevTools protocol, no dependencies)
tools/               serve.js, check_content.js, seed_sweep.js, layout_probe.js, make_icons.js
```

## Checks

```bash
npm test                    # unit tests + content check (sources, labs, CSS vars, shell files)
npm run e2e                 # every tab of every module at Mac and Pixel 7 sizes; runs the long labs
SHOTS=1 npm run e2e         # also saves a full-page screenshot of each lab to .shots/
npm run sweep               # 5-seed recommender comparison behind Module 5's numbers
```

After changing any shipped file, bump `COURSE_VERSION` in `web/files.js` so installed copies update.

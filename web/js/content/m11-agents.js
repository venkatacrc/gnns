GNN.module({
    id: 'm11', num: 11, minutes: 35, lab: 'lab11',
    title: 'Graphs meet LLMs: retrieval, agents and deterministic decisions',
    summary: 'G-Retriever\'s PCST subgraph retrieval, modular agent orchestration with graph tools, zero-history merchants and decision-model heads.',
    objectives: [
        'Explain G-Retriever: textual graphs, PCST retrieval and graph soft prompts.',
        'Sketch a modular agent architecture with graph, tabular and vector tools.',
        'Explain why deterministic decision heads matter for automated workflows.',
    ],
    refs: ['gretriever', 'wmTech', 'kumorfm2'],
    cards: [
        {
            title: 'LLMs hallucinate about your graph',
            body: `<p>Ask an LLM "which products in this catalog pair with the TV a customer bought?" and it answers from world knowledge, not your data. Stuffing the whole graph into the prompt does not fit, and the model gets lost in irrelevant text.</p>
<p><b>Retrieval</b> fixes both: fetch the small, relevant subgraph and give it to the model.</p>`,
            src: ['gretriever'],
        },
        {
            title: 'G-Retriever in four steps',
            body: `<ol><li><b>Index</b>: embed node and edge text (titles, relations).</li>
<li><b>Retrieve</b>: score nodes and edges by similarity to the question.</li>
<li><b>Construct a subgraph</b> with the <b>Prize-Collecting Steiner Tree (PCST)</b>: connected, high-relevance, small.</li>
<li><b>Generate</b>: a GNN encodes the subgraph into a soft prompt, plus a textualized version, for the LLM.</li></ol>
<p>Grounding answers in a retrieved subgraph reduces hallucination and scales to large textual graphs.</p>`,
            src: ['gretriever'],
        },
        {
            title: 'PCST: the objective',
            body: `<p>Choose a connected subgraph S to maximize</p>
<pre><code>sum(prize[v] for v in S) - sum(cost[e] for e in edges(S))</code></pre>
<p>Prizes come from relevance to the query; edge costs keep the answer compact. Irrelevant connector nodes get included only if they link valuable ones. Lab 11 runs a greedy PCST and lets you trade edge cost against coverage.</p>`,
            src: ['gretriever'],
        },
        {
            title: 'From monolith to modular agents',
            body: `<p>Instead of one monolithic model like G-Retriever doing everything, the architecture discussed is an <b>orchestrator agent</b> (built on NeMo Guardrails + LangGraph, with visual step tracing) that calls tools:</p>
<ul><li>Kumo Tabular on relational data</li><li>customer / item GNN embeddings</li><li>XGBoost / EBM models</li><li>vector search over catalog text</li><li>executive plan visualization</li></ul>
<p>For enterprise planning queries, latency budgets are relaxed to <b>tens of seconds</b>; outputs come with calibrated confidence intervals.</p>`,
            src: ['wmTech'],
        },
        {
            title: 'Choosing context is a learning problem',
            body: `<p>Picking a precise 1-million-row subset from a 10-billion-row database cannot be done with heuristics alone. NVIDIA recommended <b>reinforcement-learning fine-tuning</b> of agent policies to judge context relevance by whether downstream goals are achieved.</p>
<p>PCST is the hand-designed version of the same question: which part of the graph does this task need?</p>`,
            src: ['wmTech', 'gretriever'],
        },
        {
            title: 'The zero-history merchant problem',
            body: `<p>New-item onboarding usually relies on merchant intuition. The approach discussed: ingest the candidate item's specification sheet, <b>project its features into the historical customer GNN embedding space</b>, and estimate which customers respond and the likely demand trajectory.</p>
<p>It works for the same reason the inductive product tower handles cold start (Module 4): features to embedding, no history needed.</p>`,
            src: ['wmTech', 'wmCollab'],
        },
        {
            title: 'LLMs translate; engines decide',
            body: `<p>Decoupled architecture: language models act as <b>translation and task-planning interfaces</b>. Domain logic, math validation and state projections run in graph engines and decision trees, where they are testable.</p>
<p>Agents talk to each other with <b>structured payloads</b>, not free text, so workflows can run automatically across supply-chain graphs.</p>`,
            src: ['wmTech'],
        },
        {
            title: 'Deterministic decision heads',
            body: `<p>Autoregressive LLMs emit variable-length text, so the same question can yield different actions. <b>Decision models</b> (the Nemotron decision-model variant discussed) replace token generation with a <b>dense projection head</b> producing a bounded probability distribution over a fixed set of actions.</p>
<p>Same input, same distribution: auditable, cacheable, automatable. Setting temperature to 0 on a text model is not the same guarantee; the output space itself is still unbounded.</p>`,
            src: ['wmTech'],
        },
        {
            title: 'Explainability and guardrails',
            body: `<ul><li>Show the <b>retrieved subgraph</b> and the tool calls behind an answer (step tracing).</li>
<li>Report <b>confidence</b>; route low-confidence decisions to humans.</li>
<li>Keep guardrails on inputs and outputs (NeMo Guardrails) and log every decision for audit.</li></ul>
<p>For fraud investigators and merchants alike, a reason they can check beats a score they must trust.</p>`,
            src: ['wmTech'],
        },
    ],
    quiz: [
        {
            q: 'What does PCST optimize in G-Retriever?',
            options: ['Shortest path between two nodes', 'Total node prize minus edge cost over a connected subgraph', 'Number of edges', 'Graph diameter'],
            answer: 1, why: 'It selects a compact, connected subgraph rich in query-relevant nodes.',
        },
        {
            q: 'Why move from a monolithic model to an orchestrator with tools?',
            options: ['Tools are cheaper to train and each does what it is best at, with traceable steps', 'LLMs cannot read', 'To remove GNNs', 'For lower accuracy'],
            answer: 0, why: 'Specialized tools (Kumo, GNN embeddings, XGBoost, vector search) plus tracing give accuracy and auditability.',
        },
        {
            q: 'How does the zero-history merchant solution estimate demand for a new item?',
            options: ['Waits for sales', 'Projects the item\'s spec features into the customer GNN embedding space', 'Copies the most popular item', 'Asks an LLM to guess'],
            answer: 1, why: 'Inductive projection places the new item near similar items and their customers.',
        },
        {
            q: 'What makes a decision-model head deterministic?',
            options: ['Temperature 0 text generation', 'A dense head producing a bounded distribution over fixed actions', 'Longer prompts', 'Bigger models'],
            answer: 1, why: 'It replaces open-ended token generation with a fixed action space.',
        },
        {
            q: 'Latency budget for enterprise planning agents (as discussed)?',
            options: ['Under 10 ms', 'Under 250 ms', 'Tens of seconds', 'Days'],
            answer: 2, why: 'Planning queries are not real-time chat, so budgets were relaxed to tens of seconds.',
        },
    ],
});

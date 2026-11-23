// App shell: hash routing, Learn / Test / Lab / Sources views, progress in localStorage, drawer.
(function () {
    'use strict';
    const { h, clear, pct } = UI;
    const STORE = 'gnn-course-v1';
    const main = document.getElementById('main');
    const drawer = document.getElementById('drawer');
    const scrim = document.getElementById('scrim');
    const TABS = [['learn', 'Learn'], ['test', 'Test'], ['lab', 'Lab'], ['refs', 'Sources']];
    let cleanup = null;       // teardown for the current view (key handlers, lab timers)
    const quizRuns = {};      // in-memory quiz sessions per module

    // ---------- persistence ----------
    const blank = () => ({ cards: {}, quiz: {}, labs: {}, pos: {}, last: '#/' });
    const state = (() => {
        try { return { ...blank(), ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return blank(); }
    })();
    const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private mode */ } renderProgress(); };
    const cardMarks = (m) => (state.cards[m.id] ||= {});

    function moduleProgress(m) {
        const marks = cardMarks(m);
        const known = m.cards.filter((_, i) => marks[i] === 'known').length / (m.cards.length || 1);
        const quiz = state.quiz[m.id] || 0;
        if (!m.lab) return 0.55 * known + 0.45 * quiz;
        return 0.4 * known + 0.3 * quiz + 0.3 * (state.labs[m.lab] ? 1 : 0);
    }
    function renderProgress() {
        const total = GNN.modules.reduce((s, m) => s + moduleProgress(m), 0) / (GNN.modules.length || 1);
        document.getElementById('progress').textContent = `Course ${pct(total)} complete`;
    }

    // ---------- routing ----------
    function parse(hash) {
        const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
        if (parts[0] === 'm' && GNN.findModule(parts[1])) return { view: 'module', module: GNN.findModule(parts[1]), tab: TABS.some(([t]) => t === parts[2]) ? parts[2] : 'learn' };
        if (parts[0] === 'about') return { view: 'about' };
        return { view: 'home' };
    }
    function route() {
        if (cleanup) { cleanup(); cleanup = null; }
        const r = parse(location.hash);
        clear(main);
        if (r.view === 'module') { state.last = location.hash; save(); renderModule(r.module, r.tab); }
        else if (r.view === 'about') renderAbout();
        else renderHome();
        renderDrawer(r);
        closeDrawer();
        window.scrollTo(0, 0);
        main.focus({ preventScroll: true });
    }
    const link = (m, tab = 'learn') => `#/m/${m.id}/${tab}`;

    // ---------- home ----------
    function renderHome() {
        const started = state.last && state.last !== '#/';
        main.append(
            h('section', { class: 'hero' },
                h('div', { class: 'kicker' }, 'Graph Neural Networks, step by step'),
                h('h1', {}, 'From baskets to graph transformers'),
                h('p', {}, 'A hands-on path through GNNs for retail recommendations and fraud, grounded in the relational deep learning papers and public benchmarks behind them. Every module has concept cards, a quiz and an interactive lab that runs right here, offline, on your Mac or phone.'),
                h('div', { class: 'nav-row' },
                    h('a', { class: 'btn primary', href: started ? state.last : link(GNN.modules[0]) }, started ? 'Continue where you left off' : 'Start module 0'),
                    h('a', { class: 'btn', href: '#/about' }, 'How this course works'))),
            h('div', { class: 'grid' }, GNN.modules.map(tile)));
    }
    function tile(m) {
        const p = moduleProgress(m);
        return h('a', { class: 'module-tile', href: link(m) },
            h('div', { class: 'num' }, `MODULE ${m.num}`),
            h('h3', {}, m.title),
            h('p', {}, m.summary),
            h('div', { class: 'chips' },
                h('span', { class: 'chip' }, `${m.minutes || 30} min`),
                m.lab ? h('span', { class: `chip ${state.labs[m.lab] ? 'done' : ''}` }, state.labs[m.lab] ? 'Lab done' : 'Lab') : null,
                state.quiz[m.id] ? h('span', { class: 'chip done' }, `Quiz ${pct(state.quiz[m.id])}`) : null),
            h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(p * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': `${m.title} progress` },
                h('span', { style: `width:${(p * 100).toFixed(0)}%` })));
    }

    // ---------- module ----------
    function renderModule(m, tab) {
        main.append(
            h('div', { class: 'kicker' }, `Module ${m.num} · ${m.minutes || 30} min`),
            h('h1', {}, m.title),
            h('p', { class: 'muted' }, m.summary),
            m.objectives ? h('details', { class: 'card' }, h('summary', {}, h('strong', {}, 'You will be able to...')),
                h('ul', {}, m.objectives.map((o) => h('li', {}, o)))) : null,
            h('nav', { class: 'segmented', 'aria-label': 'Module sections' }, TABS
                .filter(([t]) => t !== 'lab' || m.lab)
                .map(([t, label]) => h('a', { href: link(m, t), 'aria-current': t === tab ? 'page' : null }, label))));
        const view = h('section', { 'aria-live': 'polite' });
        main.append(view, pager(m));
        ({ learn: renderLearn, test: renderTest, lab: renderLab, refs: renderRefs })[tab](m, view);
    }
    function pager(m) {
        const i = GNN.modules.indexOf(m);
        const prev = GNN.modules[i - 1], next = GNN.modules[i + 1];
        return h('div', { class: 'nav-row', style: 'margin-top:24px' },
            prev ? h('a', { class: 'btn', href: link(prev) }, `Back: ${prev.title}`) : h('span'),
            next ? h('a', { class: 'btn', href: link(next) }, `Next: ${next.title}`) : h('span'));
    }

    function renderLearn(m, view) {
        const marks = cardMarks(m);
        let reviewOnly = false;
        let idx = Math.min(state.pos[m.id] || 0, m.cards.length - 1);
        const deck = () => (reviewOnly ? m.cards.map((_, i) => i).filter((i) => marks[i] === 'review') : m.cards.map((_, i) => i));
        const draw = () => {
            clear(view);
            const order = deck();
            if (!order.length) {
                view.append(h('div', { class: 'card note ok' }, 'Nothing in your review pile. Nice work.'), UI.button('Show all cards', () => { reviewOnly = false; draw(); }));
                return;
            }
            if (!order.includes(idx)) idx = order[0];
            const pos = order.indexOf(idx);
            const card = m.cards[idx];
            const reviewCount = Object.values(marks).filter((x) => x === 'review').length;
            const body = h('article', { class: 'card flash' },
                h('div', { class: 'kicker' }, `Card ${pos + 1} of ${order.length}`, marks[idx] ? ` · ${marks[idx] === 'known' ? 'known' : 'to review'}` : ''),
                h('h2', {}, card.title),
                h('div', { html: card.body }),
                card.src ? h('div', { class: 'chips' }, card.src.map(refChip)) : null);
            addSwipe(body, () => go(1), () => go(-1));
            view.append(body,
                h('div', { class: 'nav-row' },
                    UI.button('Previous', () => go(-1)),
                    h('span', { class: 'counter' }, 'Keys: arrows, K = know, R = review'),
                    UI.button('Next', () => go(1))),
                h('div', { class: 'nav-row' },
                    UI.button('Review again', () => mark('review'), 'btn again'),
                    UI.button('Got it', () => mark('known'), 'btn good')),
                h('div', { class: 'nav-row' },
                    UI.toggle({ label: `Review pile only (${reviewCount})`, checked: reviewOnly, onChange: (v) => { reviewOnly = v; draw(); } }).el));
        };
        const go = (d) => {
            const order = deck();
            const pos = order.indexOf(idx);
            idx = order[Math.max(0, Math.min(order.length - 1, pos + d))];
            state.pos[m.id] = idx; save(); draw();
        };
        const mark = (kind) => { marks[idx] = kind; save(); go(1); };
        const onKey = (e) => {
            if (e.target.closest('input, textarea, select')) return;
            if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key.toLowerCase() === 'k') mark('known');
            else if (e.key.toLowerCase() === 'r') mark('review');
        };
        document.addEventListener('keydown', onKey);
        cleanup = () => document.removeEventListener('keydown', onKey);
        draw();
    }

    function renderTest(m, view) {
        const fresh = (indices) => ({ order: indices, i: 0, correct: 0, missed: [], answered: false });
        const run = (quizRuns[m.id] ||= fresh(m.quiz.map((_, i) => i)));
        let currentAnswer = null; // one key listener for the whole quiz, pointed at the current question
        const restart = (indices) => { quizRuns[m.id] = fresh(indices); route(); };
        const draw = () => {
            clear(view);
            currentAnswer = null;
            if (run.i >= run.order.length) {
                const score = run.correct / run.order.length;
                if (run.order.length === m.quiz.length) { state.quiz[m.id] = Math.max(state.quiz[m.id] || 0, score); save(); }
                view.append(h('div', { class: `card note ${score >= 0.8 ? 'ok' : ''}` },
                    h('h2', {}, `Score: ${run.correct} / ${run.order.length}`),
                    h('p', {}, score >= 0.8 ? 'Solid. Head to the lab to make it stick.' : 'Re-read the cards you missed, then retry.')),
                    h('div', { class: 'nav-row' },
                        run.missed.length ? UI.button(`Retry ${run.missed.length} missed`, () => restart(run.missed), 'btn primary') : null,
                        UI.button('Restart quiz', () => restart(m.quiz.map((_, i) => i)))));
                return;
            }
            const q = m.quiz[run.order[run.i]];
            const optionsEl = h('div', { class: 'options', role: 'group', 'aria-label': 'Answer options' });
            const why = h('div', { class: 'why' });
            q.options.forEach((opt, oi) => optionsEl.append(h('button', {
                type: 'button', class: 'option', html: `<strong>${'ABCD'[oi]}.</strong> ${opt}`,
                onclick: () => answer(oi),
            })));
            const answer = (oi) => {
                if (run.answered || oi >= q.options.length) return;
                run.answered = true;
                const ok = oi === q.answer;
                if (ok) run.correct++; else run.missed.push(run.order[run.i]);
                [...optionsEl.children].forEach((b, bi) => {
                    b.disabled = true;
                    if (bi === q.answer) b.classList.add('correct');
                    else if (bi === oi) b.classList.add('wrong');
                });
                why.append(h('div', { class: `note ${ok ? 'ok' : 'warn'}`, html: `<strong>${ok ? 'Correct.' : 'Not quite.'}</strong> ${q.why}` }),
                    h('div', { class: 'nav-row' }, h('span'), UI.button(run.i + 1 < run.order.length ? 'Next question' : 'See score', () => { run.i++; run.answered = false; draw(); }, 'btn primary')));
                why.querySelector('button').focus();
            };
            view.append(h('div', { class: 'card' },
                h('div', { class: 'kicker' }, `Question ${run.i + 1} of ${run.order.length}`),
                h('p', { class: 'quiz-q', html: q.q }), optionsEl, why));
            currentAnswer = answer;
        };
        const onKey = (e) => {
            if (!currentAnswer || e.target.closest('input, textarea, select')) return;
            const n = '1234abcd'.indexOf(e.key.toLowerCase());
            if (n >= 0) currentAnswer(n % 4);
        };
        document.addEventListener('keydown', onKey);
        cleanup = () => document.removeEventListener('keydown', onKey);
        draw();
    }

    function renderLab(m, view) {
        const lab = GNN.labs[m.lab];
        if (!lab) { view.append(h('div', { class: 'note warn' }, `Lab ${m.lab} is missing.`)); return; }
        const done = !!state.labs[lab.id];
        const stage = h('div', { class: 'lab-stage' });
        view.append(
            h('div', { class: 'card lab-head' },
                h('div', { class: 'kicker' }, 'Hands-on lab'),
                h('h2', {}, lab.title),
                h('p', { html: lab.goal }),
                lab.steps ? h('ol', {}, lab.steps.map((s) => h('li', { html: s }))) : null,
                lab.python ? h('p', { class: 'small muted', html: `Mac companion: <code>${lab.python}</code> (numpy, runs with <code>uv run</code>).` }) : null),
            h('div', { class: 'card' }, stage),
            h('div', { class: 'nav-row' }, h('span'),
                UI.button(done ? 'Lab completed (undo)' : 'Mark lab complete', () => { state.labs[lab.id] = !done; save(); route(); }, done ? 'btn good' : 'btn primary')));
        const teardown = lab.mount(stage);
        const prev = cleanup;
        cleanup = () => { if (typeof teardown === 'function') teardown(); if (prev) prev(); };
    }

    function refChip(key) {
        const r = GNN.ref(key);
        if (!r) return null;
        return h('span', { class: `chip ${r.kind}`, title: r.title }, `${r.authors.split(',')[0]} ${r.year}`);
    }
    function renderRefs(m, view) {
        const keys = [...new Set([...(m.refs || []), ...m.cards.flatMap((c) => c.src || [])])];
        view.append(h('div', { class: 'card' }, h('h2', {}, 'Sources for this module'),
            h('ul', {}, keys.map((k) => GNN.ref(k)).filter(Boolean).map((r) => h('li', {},
                h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title),
                h('span', { class: 'muted' }, ` · ${r.authors} (${r.year})`),
                h('div', { class: 'small muted' }, r.note))))));
    }

    function renderAbout() {
        main.append(h('h1', {}, 'How this course works'), h('div', { class: 'card', html: `
            <p><strong>Each module</strong> has three parts. <em>Learn</em>: concept cards you mark as known or to review. <em>Test</em>: a short quiz with explanations. <em>Lab</em>: an interactive experiment on synthetic retail or transaction data. The labs run entirely in your browser, so they work offline.</p>
            <p><strong>Two threads run through everything</strong>: a PinSage-style retail recommender (customer-product graphs, substitutes vs complements) and fraud / AML on transaction graphs. <span class="chip paper">paper</span> chips link to the public research behind each card. Lab numbers come from small synthetic worlds: they illustrate ideas and are never production results.</p>
            <p><strong>On your Pixel</strong>: open the course URL in Chrome, then choose <em>Install app</em> (or <em>Add to Home screen</em>). It then launches full screen and works offline. <strong>On your Mac</strong>: open the same URL and install it as an app: in Safari choose <em>File ▸ Add to Dock</em> (macOS Sonoma or later), or in Chrome use <em>Install page as app</em> from the menu. It gets its own window and Dock icon and also works offline.</p>
            <p><strong>Serving it</strong>: run <code>node tools/serve.js</code> on the Mac; it prints the URL for your phone on the same Wi-Fi.</p>
            <p class="small muted">Paper results quoted in the cards are what the authors report; treat them as hypotheses to re-test on your own data.</p>` }));
        const refs = Object.values(GNN.refs);
        main.append(h('div', { class: 'card' }, h('h2', {}, 'All sources'), h('ul', {}, refs.map((r) => h('li', {},
            r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title) : h('strong', {}, r.title),
            h('span', { class: 'muted small' }, r.year ? ` (${r.year})` : ' (internal)'))))));
    }

    // ---------- drawer ----------
    function renderDrawer(r) {
        const body = clear(document.getElementById('drawer-body'));
        body.append(h('a', { href: '#/', 'aria-current': r.view === 'home' ? 'page' : null }, h('span', { class: 'mnum' }, ''), 'Home'));
        for (const m of GNN.modules) {
            const done = moduleProgress(m) >= 0.95;
            body.append(h('a', { href: link(m), 'aria-current': r.module === m ? 'page' : null },
                h('span', { class: 'mnum' }, m.num), m.title, done ? h('span', { class: 'tick', 'aria-label': 'complete' }, 'done') : null));
        }
        body.append(h('a', { href: '#/about', 'aria-current': r.view === 'about' ? 'page' : null }, h('span', { class: 'mnum' }, ''), 'About and sources'));
        const foot = clear(document.getElementById('drawer-foot'));
        foot.append(UI.button('Reset progress', () => {
            if (!confirm('Clear all card marks, quiz scores and lab completions?')) return;
            Object.assign(state, blank()); save(); route();
        }, 'btn again'), h('span', { class: 'small muted' }, `v${self.COURSE_VERSION}`));
    }
    const openDrawer = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false; document.getElementById('open-drawer').setAttribute('aria-expanded', 'true'); document.getElementById('close-drawer').focus(); };
    const closeDrawer = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); scrim.hidden = true; document.getElementById('open-drawer').setAttribute('aria-expanded', 'false'); };
    document.getElementById('open-drawer').addEventListener('click', openDrawer);
    document.getElementById('close-drawer').addEventListener('click', closeDrawer);
    scrim.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

    function addSwipe(el, onLeft, onRight) {
        let x0 = null, y0 = null;
        el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
        el.addEventListener('touchend', (e) => {
            if (x0 === null) return;
            const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
            if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
            x0 = null;
        });
    }

    window.addEventListener('hashchange', route);
    route();
    renderProgress();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

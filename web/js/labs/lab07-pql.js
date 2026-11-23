// Lab 7: declare a task in PQL-style syntax and build a point-in-time-correct training table.
GNN.lab('lab07', {
    title: 'PQL and point-in-time training tables',
    goal: 'Write a churn-style predictive query, see the training table it implies, and watch what happens when features peek past the seed time.',
    steps: [
        'Read the generated query. Move the <b>seed day</b> and window: which rows change label?',
        'Compare the rule-of-thumb predictor ("no purchase for more than W days means churn") with the label.',
        'Turn on <b>snapshot leak</b>: the feature is read from a customer table snapshot taken when the training table was built, at the end of the label window. Accuracy hits 100%. Explain exactly why.',
        'Turn on the <b>WHERE active</b> filter. Why are some customers no longer in the table at all?',
    ],
    mount(stage) {
        const { h, clear } = UI, R = GNNRetail;
        const world = R.makeRetailWorld(7);
        // Transactions per customer, sorted by day (one row per item purchase, like txn_items).
        const byCust = Array.from({ length: world.customers.length }, () => []);
        for (const t of world.txns) byCust[t.c].push(t.day);
        let seed = 300, window = 14, leaky = false, activeOnly = false;
        const out = h('div');
        const count = (days, from, to) => days.filter((d) => d >= from && d < to).length;
        // Days since the last purchase strictly before `asOf` (capped at 999 for "never").
        const daysSinceLast = (days, asOf) => { const before = days.filter((d) => d < asOf); return before.length ? asOf - Math.max(...before) : 999; };

        const draw = () => {
            clear(out);
            const query = `PREDICT COUNT(transactions.*, 0, ${window}, days) = 0\nFOR EACH customers.customer_id` +
                (activeOnly ? '\nWHERE COUNT(transactions.*, -90, 0, days) > 0' : '');
            out.append(h('pre', {}, h('code', {}, query)));
            const rows = [];
            byCust.forEach((days, c) => {
                if (activeOnly && count(days, seed - 90, seed) === 0) return;
                const label = count(days, seed, seed + window) === 0 ? 1 : 0;   // future window -> label
                // Correct: as of seed time. Leaky: read from a snapshot taken at the end of the label window.
                const feature = daysSinceLast(days, leaky ? seed + window : seed);
                rows.push({ c, feature, label, guess: feature > window ? 1 : 0 });
            });
            const acc = rows.filter((r) => r.guess === r.label).length / Math.max(rows.length, 1);
            const churnRate = rows.filter((r) => r.label).length / Math.max(rows.length, 1);
            out.append(UI.stats([
                ['Rows in training table', rows.length], ['Seed time', `day ${seed}`], ['Label window', `[day ${seed}, day ${seed + window})`],
                ['Churn rate', UI.pct(churnRate)], ['Rule-of-thumb accuracy', UI.pct(acc)],
            ]));
            out.append(UI.table(['customer_id', 'seed_time', `days since last purchase${leaky ? ' (SNAPSHOT LEAK)' : ''}`, 'label: churn', 'rule guess'],
                rows.slice(0, 12).map((r) => [r.c, seed, r.feature, r.label, r.guess]), { caption: 'First 12 rows of the training table' }));
            out.append(leaky
                ? UI.note(`The snapshot was taken on day ${seed + window}, after the label window. "No purchase for more than ${window} days as of the snapshot" is literally the definition of the label, so the rule is perfect offline and useless in production, where the future has not happened yet.`, 'note warn')
                : UI.note('Features use only rows with day &lt; seed time; labels use only the future window. This is the temporal sampling rule RDL training tables enforce.', 'note good'));
        };
        stage.append(UI.controls(
            UI.slider({ label: 'Seed day', min: 100, max: world.days - 60, step: 10, value: seed, onInput: (v) => { seed = v; draw(); } }),
            UI.slider({ label: 'Label window (days)', min: 3, max: 30, value: window, onInput: (v) => { window = v; draw(); } }),
            UI.toggle({ label: 'Snapshot leak (feature read after the label window)', checked: leaky, onChange: (v) => { leaky = v; draw(); } }),
            UI.toggle({ label: 'WHERE active in last 90 days', checked: activeOnly, onChange: (v) => { activeOnly = v; draw(); } }),
        ), out);
        draw();
    },
});

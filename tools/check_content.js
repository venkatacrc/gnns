#!/usr/bin/env node
// Validates course content without a browser: loads the same scripts index.html loads (minus the
// DOM-heavy app shell) and checks every cross-reference. Run: node tools/check_content.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.join(__dirname, '..', 'web');
const ctx = { console, Math, Date, Map, Set, JSON, Array, Object, Number, String, Error };
ctx.window = ctx;
ctx.self = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

const load = (rel) => vm.runInContext(fs.readFileSync(path.join(WEB, rel), 'utf8'), ctx, { filename: rel });
load('files.js');

const problems = [];
const SKIP = new Set(['js/app.js', 'js/core/ui.js', 'js/core/viz.js']); // need a DOM; checked by tests/e2e
for (const rel of ctx.COURSE_SCRIPTS) {
    if (!fs.existsSync(path.join(WEB, rel))) { problems.push(`missing script ${rel}`); continue; }
    if (SKIP.has(rel)) continue;
    try { load(rel); } catch (err) { problems.push(`${rel}: ${err.message}`); }
}
for (const rel of ctx.COURSE_SHELL) {
    if (rel === './') continue;
    if (!fs.existsSync(path.join(WEB, rel))) problems.push(`missing shell file ${rel}`);
}

const { GNN } = ctx;
const seen = new Set();
let cards = 0, questions = 0;
for (const m of GNN.modules) {
    if (seen.has(m.num)) problems.push(`duplicate module number ${m.num}`);
    seen.add(m.num);
    const refKeys = [...(m.refs || []), ...m.cards.flatMap((c) => c.src || [])];
    for (const key of refKeys) if (!GNN.refs[key]) problems.push(`${m.id}: unknown source "${key}"`);
    if (m.lab && !GNN.labs[m.lab]) problems.push(`${m.id}: lab "${m.lab}" not registered`);
    m.cards.forEach((c, i) => {
        cards++;
        if (!c.title || !c.body) problems.push(`${m.id} card ${i}: missing title/body`);
    });
    m.quiz.forEach((q, i) => {
        questions++;
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
            problems.push(`${m.id} quiz ${i}: answer index ${q.answer} out of range`);
        if (!q.why) problems.push(`${m.id} quiz ${i}: missing explanation`);
        if (new Set(q.options).size !== q.options.length) problems.push(`${m.id} quiz ${i}: duplicate options`);
    });
}

// A lab may only advertise a Python companion that actually ships in the repo.
for (const [id, lab] of Object.entries(GNN.labs)) {
    if (lab.python && !fs.existsSync(path.join(WEB, '..', lab.python))) problems.push(`${id}: python companion ${lab.python} does not exist`);
}

// Every CSS custom property referenced from JS must be defined in app.css (undefined vars fail silently).
const css = fs.readFileSync(path.join(WEB, 'app.css'), 'utf8');
const definedVars = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const jsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? jsFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
for (const file of jsFiles(path.join(WEB, 'js'))) {
    for (const [, name] of fs.readFileSync(file, 'utf8').matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        if (!definedVars.has(name)) problems.push(`${path.relative(WEB, file)}: CSS variable ${name} is not defined in app.css`);
    }
}

console.log(`${GNN.modules.length} modules, ${cards} cards, ${questions} quiz questions, ` +
    `${Object.keys(GNN.labs).length} labs, ${Object.keys(GNN.refs).length} sources`);
if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n - ` + problems.join('\n - '));
    process.exit(1);
}
console.log('content OK');

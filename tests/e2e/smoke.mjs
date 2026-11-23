// Zero-dependency end-to-end smoke test: drives headless Chrome over the DevTools Protocol.
// Visits every tab of every module at Mac and Pixel sizes, runs the long-running lab buttons,
// and fails on JS errors, empty labs or horizontal overflow on the phone.
// Run: node tests/e2e/smoke.mjs   (needs Google Chrome; set CHROME=/path/to/chrome to override)
//      SHOTS=1 node tests/e2e/smoke.mjs   also saves a full-page screenshot of every lab to .shots/
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createServer } = require('../../tools/serve.js');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9333, WEB_PORT = 8799;
const VIEWPORTS = { mac: { width: 1280, height: 800, mobile: false, deviceScaleFactor: 1 }, pixel: { width: 412, height: 915, mobile: true, deviceScaleFactor: 2.6 } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer().listen(WEB_PORT, '127.0.0.1');
const profile = mkdtempSync(path.join(tmpdir(), 'gnn-e2e-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

async function pageSocket() {
    for (let i = 0; i < 50; i++) {
        try {
            const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
            const page = targets.find((t) => t.type === 'page');
            if (page) return page.webSocketDebuggerUrl;
        } catch { /* chrome still starting */ }
        await sleep(200);
    }
    throw new Error('Chrome did not expose a page target');
}

const problems = [];
let current = '';
const ws = new WebSocket(await pageSocket());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.exceptionThrown') problems.push(`${current}: exception ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') problems.push(`${current}: console.error ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') problems.push(`${current}: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((resolve) => { const id = nextId++; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) throw new Error(`${current}: ${res.result.exceptionDetails.exception?.description}`);
    return res.result?.result?.value;
};
const waitFor = async (expression, timeoutMs = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) { if (await evaluate(expression)) return true; await sleep(150); }
    return false;
};

try {
    await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
    const base = `http://127.0.0.1:${WEB_PORT}/`;
    await send('Page.navigate', { url: base });
    await waitFor('window.GNN && GNN.modules.length > 0');
    const modules = await evaluate('GNN.modules.map((m) => ({ id: m.id, lab: m.lab || null }))');
    const RUN_BUTTONS = /^(Train|Masked vs leaky|Run seed sweep|Run 5-seed experiment)$/;
    let views = 0;
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
        await send('Emulation.setDeviceMetricsOverride', vp);
        for (const m of modules) {
            for (const tab of ['learn', 'test', 'lab', 'refs']) {
                if (tab === 'lab' && !m.lab) continue;
                current = `${vpName} ${m.id}/${tab}`;
                await evaluate(`location.hash = '#/m/${m.id}/${tab}'`);
                await sleep(250);
                views++;
                const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth');
                if (vp.mobile && overflow > 2) problems.push(`${current}: page is ${overflow}px wider than the phone screen`);
                if (tab !== 'lab') continue;
                const rendered = await evaluate(`(() => { const s = document.querySelector('.lab-stage'); return s ? s.querySelectorAll('svg, table, input, select').length : -1; })()`);
                if (rendered <= 0) problems.push(`${current}: lab stage empty (${rendered})`);
                if (process.env.SHOTS) {
                    const shotDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '.shots');
                    mkdirSync(shotDir, { recursive: true });
                    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
                    writeFileSync(path.join(shotDir, `${vpName}-${m.lab}.png`), Buffer.from(shot.result.data, 'base64'));
                }
                if (vpName !== 'mac') continue;   // run the slow buttons once
                const buttons = await evaluate(`[...document.querySelectorAll('.lab-stage button')].map((b) => b.textContent).filter((t) => ${RUN_BUTTONS}.test(t))`);
                for (const label of buttons) {
                    current = `${vpName} ${m.id}/lab [${label}]`;
                    await evaluate(`[...document.querySelectorAll('.lab-stage button')].find((b) => b.textContent === ${JSON.stringify(label)}).click()`);
                    const done = await waitFor(`/^Done/.test(document.querySelector('.lab-stage [aria-live]')?.textContent || '')`, 60000);
                    if (!done) problems.push(`${current}: never finished`);
                }
            }
        }
    }
    // Lab-wide check of every labs' sliders: nudge each one so its onInput path runs at least once.
    await send('Emulation.setDeviceMetricsOverride', VIEWPORTS.pixel);
    for (const m of modules.filter((x) => x.lab)) {
        current = `pixel ${m.id}/lab [sliders]`;
        await evaluate(`location.hash = '#/m/${m.id}/lab'`);
        await sleep(250);
        await evaluate(`[...document.querySelectorAll('.lab-stage input[type=range]')].forEach((r) => { r.value = r.max; r.dispatchEvent(new Event('input')); r.value = r.min; r.dispatchEvent(new Event('input')); })`);
        await evaluate(`[...document.querySelectorAll('.lab-stage input[type=checkbox]')].forEach((c) => c.click())`);
        await evaluate(`[...document.querySelectorAll('.lab-stage select')].forEach((s) => { s.selectedIndex = s.options.length - 1; s.dispatchEvent(new Event('change')); })`);
        await sleep(300);
    }
    current = 'service worker';
    const sw = await waitFor('navigator.serviceWorker.getRegistration().then((r) => !!(r && r.active))', 10000);
    if (!sw) problems.push('service worker never activated (offline mode will not work)');
    console.log(`${views} views across ${modules.length} modules at ${Object.keys(VIEWPORTS).join(' + ')}; service worker ${sw ? 'active' : 'MISSING'}`);
} finally {
    ws.close(); chrome.kill(); server.close();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
}
if (problems.length) { console.log(`\n${problems.length} problem(s):`); for (const p of [...new Set(problems)]) console.log(' - ' + p); process.exit(1); }
console.log('e2e OK');

// Course registry: content files call GNN.module(...), lab files call GNN.lab(...).
(function (root) {
    'use strict';
    const GNN = {
        modules: [],
        labs: {},
        refs: {},
        module(def) {
            const required = ['id', 'num', 'title', 'summary', 'cards', 'quiz'];
            for (const key of required) if (!(key in def)) throw new Error(`module ${def.id}: missing ${key}`);
            GNN.modules.push(def);
            GNN.modules.sort((a, b) => a.num - b.num);
        },
        lab(id, def) {
            if (typeof def.mount !== 'function') throw new Error(`lab ${id}: missing mount()`);
            GNN.labs[id] = { id, ...def };
        },
        ref(key) { return GNN.refs[key]; },
        findModule(id) { return GNN.modules.find((m) => m.id === id); },
    };
    root.GNN = GNN;
})(window);

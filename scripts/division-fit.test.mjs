// =====================================================================
// The Division Fit test (Step 97): the engine is the supplied one, and the
// function that serves it keeps it to itself.
// ---------------------------------------------------------------------
//   node --test scripts/division-fit.test.mjs
//
// 1. FAITHFUL. supabase/functions/division-fit/engine.js is the supplied
//    minerva_fit_engine_v11.js with one change, the em dash in its header
//    comment. A digest of everything it can show or decide (every question
//    in every year, every option list, every result of all 2,619 paths)
//    must equal the digest of the supplied file, taken when it was ported.
// 2. THE BRIEF'S ACCEPTANCE CHECKS, as the supplied test runs them.
// 3. THE FUNCTION, run under Node with Deno.serve stubbed: every path
//    walked through it gives the engine's own result; option ids are
//    opaque; nothing is stored; a reply cannot be steered by an option
//    that was not shown; the year changes wording only.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { transformSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(root, 'supabase/functions/division-fit/engine.js');
const FUNCTION = resolve(root, 'supabase/functions/division-fit/index.ts');

/** The digest of the supplied engine v11 (Trial 10), 7,857 results. */
const SUPPLIED = { n: 7857, sha: '3aadf5af5287d8d199f8e44508db133fab2f8267c64bbf8c492fca184fa2484f' };

function loadEngine() {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(ENGINE, 'utf8'), sandbox);
  return sandbox.MinervaFitEngine;
}
const E = loadEngine();
const IDS = E.IDS;

function digest(engine) {
  const h = createHash('sha256'); let n = 0;
  for (const year of ['first', 'second', 'advanced']) {
    for (const a of engine.adaptiveOptions('music', {})) for (const b of engine.adaptiveOptions('f1', {})) {
      const base = { music: a.id, f1: b.id };
      h.update(JSON.stringify([year, engine.getReasoningQuestion('music', {}, year), engine.getReasoningQuestion('f1', { music: a.id }, year), engine.getReasoningQuestion('espresso', base, year)]));
      for (const c of engine.adaptiveOptions('espresso', base)) {
        const a3 = { ...base, espresso: c.id };
        const hikes = engine.needsFourth(a3) ? engine.adaptiveOptions('hike', a3) : [null];
        if (engine.needsFourth(a3)) h.update(JSON.stringify(engine.getReasoningQuestion('hike', a3, year)));
        for (const d of hikes) {
          const ans = d ? { ...a3, hike: d.id } : a3;
          const topics = engine.getTopicOptions(ans, year); h.update(JSON.stringify(topics));
          for (const t of topics) {
            const cls = engine.getClassOptions(ans, t.id, year); h.update(JSON.stringify(cls));
            for (const k of cls) { h.update(JSON.stringify(engine.calculateResult(ans, t.id, k.id))); n++; }
          }
        }
      }
    }
  }
  return { n, sha: h.digest('hex') };
}

test('the engine is the supplied v11, decision for decision', () => {
  assert.deepEqual(digest(E), SUPPLIED);
  assert.equal(E.version, 'Trial 10 / engine_v11');
  assert.ok(!/—/.test(readFileSync(ENGINE, 'utf8')), 'no em dash in the copied file');
});

test('the brief: option counts, 2,619 paths, every outcome reachable as first and second', () => {
  assert.equal(E.getReasoningQuestion('music', {}, 'first').options.length, 5);
  assert.equal(E.getReasoningQuestion('f1', {}, 'first').options.length, 5);
  const audit = E.audit();
  assert.equal(audit.optsValid, true);
  assert.equal(audit.allReasoningChoicesLengths, true);
  assert.equal(audit.fullPaths, 2619);
  for (const id of IDS) {
    assert.equal(audit.reachableFirst[id], true, `${id} can be first`);
    assert.equal(audit.reachableSecond[id], true, `${id} can be second`);
  }
  for (const outcomes of Object.values(audit.afterFirstChoice)) for (const id of IDS) assert.equal(outcomes[id], true);
});

test('the brief: the year changes the wording only', () => {
  const base = { music: 'music-er', f1: 'f1-ls', espresso: 'espresso-ma' };
  const r = E.coreResult(base);
  for (const year of ['first', 'second', 'advanced']) {
    assert.deepEqual(E.getReasoningQuestion('music', {}, year).options.map((o) => [o.id, o.tag]), E.getReasoningQuestion('music', {}, 'first').options.map((o) => [o.id, o.tag]));
    assert.deepEqual(E.coreResult(base), r);
  }
});

// ── The function, under Node ─────────────────────────────────────────
async function loadFunction() {
  const src = readFileSync(FUNCTION, 'utf8');
  assert.ok(src.includes("import './engine.js';"), 'the function imports the engine');
  const js = transformSync(src.replace("import './engine.js';", ''), { loader: 'ts', format: 'esm' }).code;
  let handler = null;
  globalThis.MinervaFitEngine = E;
  globalThis.Deno = { serve: (h) => { handler = h; } };
  await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  assert.ok(handler, 'Deno.serve was called');
  return async (body, method = 'POST') => {
    const res = await handler(new Request('https://x/division-fit', { method, body: method === 'POST' ? JSON.stringify(body) : undefined }));
    return { status: res.status, headers: res.headers, json: res.status === 204 || method === 'OPTIONS' ? null : await res.json() };
  };
}

const callP = loadFunction();

test('every path walked through the function gives the engine’s result', async () => {
  const call = await callP;
  let paths = 0;
  const secret = /music-|f1-|espresso-|hike-|"tag"|score|weight|support/;
  // Depth-first over the reasoning answers; each leaf continues with every topic and class.
  const leaves = [];
  const collect = async (answers, ids) => {
    const r = await call({ year: 'first', answers });
    assert.equal(r.status, 200);
    assert.ok(!secret.test(JSON.stringify(r.json)), 'no engine ids, tags or scores leave the function');
    if (r.json.key !== 'topic') {
      assert.equal(r.json.part, 1);
      const expected = { music: 5, f1: 5, espresso: 5, hike: 3 }[r.json.key];
      assert.equal(r.json.options.length, expected, `${r.json.key} shows ${expected} options`);
      const shown = E.adaptiveOptions(r.json.key, ids).map((o) => o.id);
      for (let i = 0; i < r.json.options.length; i++) await collect({ ...answers, [r.json.key]: r.json.options[i].id }, { ...ids, [r.json.key]: shown[i] });
      return;
    }
    leaves.push([answers, ids, r.json]);
  };
  await collect({}, {});
  for (const [answers, ids, topicQ] of leaves) {
    assert.equal(topicQ.part, 2);
    assert.equal(topicQ.options.length, 3);
    const topics = E.getTopicOptions(ids, 'first').map((o) => o.id);
    for (let t = 0; t < 3; t++) {
      const cq = await call({ year: 'first', answers, topic: topicQ.options[t].id });
      assert.equal(cq.json.key, 'classes');
      assert.equal(cq.json.options.length, 3);
      const classes = E.getClassOptions(ids, topics[t], 'first').map((o) => o.id);
      for (let c = 0; c < 3; c++) {
        const res = await call({ year: 'first', answers, topic: topicQ.options[t].id, classes: cq.json.options[c].id });
        assert.ok(!secret.test(JSON.stringify(res.json)), 'no tags or scores in a result');
        const want = E.calculateResult(ids, topics[t], classes[c]);
        assert.equal(res.json.step, 'result');
        assert.equal(res.json.noMatch, !!want.noMatch);
        assert.equal(res.json.first?.id ?? null, want.first);
        assert.equal(res.json.second?.id ?? null, want.second);
        assert.equal(res.json.secondStrength, want.secondStrength ?? null);
        assert.equal(res.json.secondOmitted, !!want.secondOmitted);
        if (res.json.first) assert.notEqual(res.json.first.id, res.json.second?.id);
        paths++;
      }
    }
  }
  assert.equal(paths, 2619);
});

test('opaque ids, deterministic replies, nothing kept between calls', async () => {
  const call = await callP;
  const a = await call({ year: 'first', answers: {} });
  const b = await call({ year: 'first', answers: {} });
  assert.deepEqual(a.json, b.json);
  assert.equal(a.headers.get('cache-control'), 'no-store');
  assert.equal(a.json.key, 'music');
  for (const o of a.json.options) assert.match(o.id, /^[0-9a-f]{12}$/);
  // The year changes the words, never the ids.
  const adv = await call({ year: 'advanced', answers: {} });
  assert.deepEqual(adv.json.options.map((o) => o.id), a.json.options.map((o) => o.id));
  assert.notDeepEqual(adv.json.options.map((o) => o.text), a.json.options.map((o) => o.text));
});

test('a reply cannot be steered: unknown, unshown, skipped or extra answers are refused', async () => {
  const call = await callP;
  const q1 = (await call({ year: 'first', answers: {} })).json;
  const music = q1.options[0].id;
  assert.equal((await call({ year: 'first', answers: { music: 'music-er' } })).status, 400, 'an engine id is not accepted');
  assert.equal((await call({ year: 'first', answers: { f1: q1.options[0].id } })).status, 400, 'nothing may be skipped');
  assert.equal((await call({ year: 'nope', answers: {} })).status, 400, 'an unknown year');
  assert.equal((await call(null)).status, 400);
  assert.equal((await call({ year: 'first', answers: {} }, 'GET')).status, 405);
  // A topic from outside the shortlist is refused.
  let answers = { music };
  for (;;) {
    const r = (await call({ year: 'first', answers })).json;
    if (r.key === 'topic') {
      assert.equal(new Set(r.options.map((o) => o.id)).size, 3);
      assert.equal((await call({ year: 'first', answers, topic: 'ffffffffffff' })).status, 400, 'a topic that was not shown');
      // A class sent before its topic is ignored until the topic comes: the reply is the topic question again.
      assert.equal((await call({ year: 'first', answers, classes: r.options[0].id })).json.key, 'topic');
      break;
    }
    answers = { ...answers, [r.key]: r.options[0].id };
  }
});

test('the engine never reaches the website’s code', () => {
  const pages = ['src/pages/DivisionFit.tsx', 'src/lib/division-fit.ts'].map((p) => readFileSync(resolve(root, p), 'utf8')).join('\n');
  assert.ok(!/engine\.js|MinervaFitEngine|stableHash|needsFourth|music-er/.test(pages), 'the page carries no engine');
  assert.ok(!/A friend shares a playlist/.test(pages), 'nor its questions');
});

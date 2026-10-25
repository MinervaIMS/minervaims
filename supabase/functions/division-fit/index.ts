/* eslint-disable @typescript-eslint/no-explicit-any */
// The reference engine, as supplied (Trial 10, engine v11). It is a UMD
// file with no network, storage or DOM dependency: importing it defines
// `globalThis.MinervaFitEngine`. Only the em dash in its header comment
// was changed; scripts/division-fit.test.mjs proves the behaviour is the
// supplied engine's, path for path.
import './engine.js';

// =====================================================================
// division-fit: the public Division Fit test (Step 97).
// ---------------------------------------------------------------------
// WHY THE ENGINE RUNS HERE AND NOT IN THE BROWSER. The test must not be
// copyable from the website, and anything sent to a browser can be read
// in it. So the question bank, the adaptive rules and the scoring stay
// in this function. The page receives one question at a time, with its
// options under opaque ids, and finally the result: never a score, a
// weight, a tag or the rule that chose the options.
//
// IT STORES NOTHING AND ASKS FOR NOTHING PERSONAL. The page sends the
// answers given so far on every call and this function works the next
// step out from them alone: there is no session, no table, no log of
// answers, no cookie. Calling it twice with the same answers gives the
// same reply, which is what "deterministic" means for a stateless step.
//
// THE FLOW IS THE BRIEF'S, FORWARD ONLY: year, music, Ferrari, espresso,
// the Lake Como hike when the engine's needsFourth() asks for it, the
// finance topic, the university class, the result. An answer is
// accepted only if it is one of the options that question showed for
// the answers before it, so a reply can never be steered by sending an
// option the student was not offered.
// =====================================================================

const E = (globalThis as any).MinervaFitEngine;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

const YEARS = ['first', 'second', 'advanced'];
const REASONING = ['music', 'f1', 'espresso', 'hike'];
const START_AGAIN = 'Your answers could not be read. Please start the test again.';

// The six destinations by the names the website uses for them (the funds
// are written without a dash on the site), where the application form
// places each of them, and where to read more. The engine's own
// descriptions explain the fit.
const DESTINATIONS: Record<string, { name: string; apply: string; href: string }> = {
  ER: { name: 'Equity Research', apply: 'equity', href: '/divisions/equity' },
  IR: { name: 'Investment Research', apply: 'investment', href: '/divisions/investment' },
  MR: { name: 'Macro Research', apply: 'macro', href: '/divisions/macro' },
  QR: { name: 'Quantitative Research', apply: 'quant', href: '/divisions/quant' },
  MA: { name: 'Multi Asset Global Opportunities Fund', apply: 'portfolio', href: '/funds/multi-asset' },
  LS: { name: 'Long Short Equity Fund', apply: 'portfolio', href: '/funds/long-short' },
};

// =====================================================================
// OPAQUE OPTION IDS. The engine's ids say where an answer points
// ("music-er", a topic "QR"), so they never leave this function. Each is
// sent as a short hash of a fixed salt and the id; the reply maps it back.
// =====================================================================
const SALT = 'mims-division-fit-v11';
const toToken = new Map<string, string>();
const fromToken = new Map<string, string>();

async function hashToken(kind: string, id: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${SALT}|${kind}|${id}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest.slice(0, 6)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ready = (async () => {
  const add = async (kind: string, id: string) => {
    const t = await hashToken(kind, id);
    toToken.set(`${kind}|${id}`, t);
    fromToken.set(`${kind}|${t}`, id);
  };
  for (const q of E.QUESTION_BANK) for (const o of q.options) await add('reason', o.id);
  for (const id of E.IDS) { await add('topic', id); await add('classes', id); }
})();

const tokenOf = (kind: string, id: string) => toToken.get(`${kind}|${id}`) as string;
const idOf = (kind: string, token: unknown) => (typeof token === 'string' ? fromToken.get(`${kind}|${token}`) ?? null : null);

/** The question as the page shows it: its wording, and its options under opaque ids. */
function reasoningQuestion(qid: string, answers: Record<string, string>, year: string) {
  const q = E.getReasoningQuestion(qid, answers, year);
  return {
    step: 'question',
    key: qid,
    part: 1,
    label: q.label,
    title: q.title,
    options: q.options.map((o: any) => ({ id: tokenOf('reason', o.id), text: o.text })),
  };
}

function destination(id: string | null) {
  if (!id) return null;
  const d = E.DIVISIONS.find((x: any) => x.id === id);
  const meta = DESTINATIONS[id];
  return { id, name: meta.name, description: d?.description ?? '', apply: meta.apply, href: meta.href };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  await ready;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: START_AGAIN }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: START_AGAIN }, 400);

  const year = typeof body.year === 'string' && YEARS.includes(body.year) ? body.year : null;
  if (!year) return json({ error: START_AGAIN }, 400);
  const sent = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};

  // The reasoning answers, in order, each checked against the options its
  // question showed for the answers before it.
  const answers: Record<string, string> = {};
  for (const qid of REASONING) {
    if (sent[qid] === undefined || sent[qid] === null) break;
    if (qid === 'hike' && !E.needsFourth(answers)) return json({ error: START_AGAIN }, 400);
    const id = idOf('reason', sent[qid]);
    const shown = E.adaptiveOptions(qid, answers).map((o: any) => o.id);
    if (!id || !shown.includes(id)) return json({ error: START_AGAIN }, 400);
    answers[qid] = id;
  }
  // Nothing may be skipped: a later answer without the earlier ones is refused.
  for (const qid of REASONING) if (sent[qid] != null && !answers[qid]) return json({ error: START_AGAIN }, 400);

  if (!answers.music) return json(reasoningQuestion('music', answers, year));
  if (!answers.f1) return json(reasoningQuestion('f1', answers, year));
  if (!answers.espresso) return json(reasoningQuestion('espresso', answers, year));
  if (E.needsFourth(answers) && !answers.hike) return json(reasoningQuestion('hike', answers, year));

  // Part 2: the finance topic, then the class, each from the shortlist.
  const topics: string[] = E.getTopicOptions(answers, year).map((o: any) => o.id);
  if (body.topic == null) {
    return json({
      step: 'question', key: 'topic', part: 2,
      options: E.getTopicOptions(answers, year).map((o: any) => ({ id: tokenOf('topic', o.id), text: o.text })),
    });
  }
  const topic = idOf('topic', body.topic);
  if (!topic || !topics.includes(topic)) return json({ error: START_AGAIN }, 400);

  const classOptions = E.getClassOptions(answers, topic, year);
  if (body.classes == null) {
    return json({
      step: 'question', key: 'classes', part: 2,
      options: classOptions.map((o: any) => ({ id: tokenOf('classes', o.id), text: o.text })),
    });
  }
  const classes = idOf('classes', body.classes);
  if (!classes || !classOptions.some((o: any) => o.id === classes)) return json({ error: START_AGAIN }, 400);

  const r = E.calculateResult(answers, topic, classes);
  if (!r.valid) return json({ error: START_AGAIN }, 400);

  // The result, without a score or a weight: what fits, how strongly the
  // answers support it, and where to go next.
  const evidence = (id: string | null) => (id ? {
    everyday: Number(r.support?.[id] ?? 0),
    topic: r.topic === id,
    classes: r.classes === id,
  } : null);
  return json({
    step: 'result',
    noMatch: !!r.noMatch,
    first: destination(r.first),
    firstEvidence: evidence(r.first),
    second: destination(r.second),
    secondStrength: r.secondStrength ?? null,
    secondEvidence: evidence(r.second),
    secondOmitted: !!r.secondOmitted,
  });
});

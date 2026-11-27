// =====================================================================
// THE NETWORK OF THE SOCIETY (Step 111): the engine.
// ---------------------------------------------------------------------
// People > Network applies to Minerva the method of Soda, Iorio and Rizzo,
// "In the network of the conclave" (Social Networks 83, 2025): people are
// tied to each other by the groups they shared, and three measures of
// position are read from the network those ties form.
//
//   Groups      a report written together; the Board of Directors of a
//               semester, in three tiers (the President with the
//               Vice-President, each of them with each other Board member,
//               the other Board members among themselves); a division in
//               the same semester; and a new joiner with the head of the
//               division they joined, in the semester they got in (the
//               interviewer). A group is the paper's "collegial body";
//               projecting people x groups onto people x people gives the
//               co-membership network.
//   Tie weight  every group adds, to each pair in it, the weight of its
//               kind (TIE_WEIGHTS, set by the President in Step 111):
//               President with Vice-President 1.5, either of them with
//               another Board member 1.25, a report together 1, two other
//               Board members 1, the same division 0.5, interviewer and
//               new joiner 0.5. The weights add up, so a pair who shared
//               more, for longer, is tied more strongly. The paper's own
//               weighting is this with every kind at 1 (the number of
//               bodies shared), which the robustness check keeps.
//   Status      eigenvector centrality: being tied to people who are
//               themselves well tied (the paper's status).
//   Mediation   betweenness centrality on the shortest paths, a strong tie
//               being a short step (distance 1 / weight): how often a
//               person lies between others (the paper's mediation power).
//   Coalition   the paper's coalition-building index, the mean of
//               community cohesion (the density of the person's own
//               community), ego-network size (people tied to, over the
//               largest such number) and cross-community reach (the
//               share of the other communities the person is tied to).
//               Communities come from greedy modularity optimisation
//               (Clauset, Newman and Moore 2004), which is deterministic.
//   Overall     the mean of the three positions as percentiles, so that a
//               person high on all three comes first (the paper reads its
//               three rankings together the same way).
//
// The paper's robustness checks are kept: status and mediation are also
// computed on the unweighted network, and the rank correlation between
// the two versions is reported with each run.
//
// Every step is deterministic: people are indexed in the order of their
// ids, ties broken by that order, and the map is laid out from fixed
// starting points, so the same data always gives the same result. The
// centralities follow NetworkX 3.3 (eigenvector_centrality,
// betweenness_centrality, greedy_modularity_communities), against which
// `scripts/step111.test.mjs` checks them.
//
// No imports: the edge function `people-network` runs it, and the tests
// load it directly. The browser never receives the engine, only results.
// =====================================================================

/**
 * The kinds of group. The Board of a semester comes in three, so that
 * each pair of its members is in exactly one of them:
 *   officers   the President and the Vice-President (with each other)
 *   lead       one of them with one other Board member (a pair)
 *   board      the other Board members (the heads) among themselves
 *   interview  a new joiner with a head of the division they joined, in
 *              the semester they got in (a pair)
 */
export type GroupKind = 'report' | 'board' | 'officers' | 'lead' | 'division' | 'interview';

/** How much one shared group adds to the tie between two of its people, by kind (Step 111). */
export const TIE_WEIGHTS: Readonly<Record<GroupKind, number>> = Object.freeze({
  officers: 1.5,
  lead: 1.25,
  report: 1,
  board: 1,
  division: 0.5,
  interview: 0.5,
});

/** The kinds that are the Board of a semester: each counts as one Board shared. */
const BOARD_KINDS: ReadonlySet<GroupKind> = new Set<GroupKind>(['officers', 'lead', 'board']);

export interface NetworkGroup {
  kind: GroupKind;
  /** Unique key, e.g. "report:<id>", "board:2025-fall", "division:equity:2025-fall". */
  key: string;
  /** The semester the group belongs to ("2025-fall"). */
  semester: string;
  /** The people in it (node ids); a repeated id counts once. */
  members: string[];
}

/**
 * How many groups of each kind two people shared: reports, Boards (the
 * three tiers together, one per semester), divisions, and interviews.
 */
export interface TieCounts { report: number; board: number; division: number; interview: number }

export interface NetworkTie extends TieCounts { a: string; b: string; weight: number }

export interface PersonScore {
  id: string;
  /** People tied to. */
  degree: number;
  /** Sum of tie weights. */
  strength: number;
  /** Eigenvector centrality, the highest being 1. */
  status: number;
  /** Betweenness centrality, normalised (0 to 1). */
  mediation: number;
  /** Coalition-building index (0 to 1) and its three parts. */
  coalition: number;
  cohesion: number;
  ego: number;
  reach: number;
  /** Community number, 1 the largest; 0 for a person with no tie. */
  community: number;
  /** Mean of the three percentile positions (0 to 1). */
  overall: number;
  rank: { status: number; mediation: number; coalition: number; overall: number };
  /** How many groups of each kind the person belongs to. */
  groups: TieCounts;
  /** Position on the map (0 to 1), for people with at least one tie. */
  x?: number;
  y?: number;
}

export interface NetworkResult {
  /** The last semester included, or null for everything. */
  until: string | null;
  people: number;
  /** People with at least one tie. */
  connected: number;
  ties: number;
  communities: number;
  modularity: number;
  groups: TieCounts;
  scores: PersonScore[];
  tieList?: NetworkTie[];
  /** Spearman correlation of weighted and unweighted versions (the paper's checks). */
  robustness?: { status: number; mediation: number; strengthDegree: number };
}

export interface AnalyseOptions {
  /** Only groups of this semester or earlier ("2025-fall"). */
  until?: string | null;
  /** Lay out the map (x, y). */
  layout?: boolean;
  /** Return every tie. */
  ties?: boolean;
  /** Compute the unweighted variants and their correlation. */
  robustness?: boolean;
  /** Other weights than TIE_WEIGHTS (for the tests and the robustness check). */
  weights?: Readonly<Record<GroupKind, number>>;
}

// ---------------------------------------------------------------------
// Semesters: Fall runs from 1 September to 31 January, Spring from
// 1 February to 31 August (as everywhere in the Workspace).
// ---------------------------------------------------------------------

/** The semester a date falls in ("2025-11-03" is "2025-fall"). */
export function semesterOf(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date || '');
  if (!m) return '';
  const y = Number(m[1]);
  const month = Number(m[2]);
  if (month >= 9) return `${y}-fall`;
  if (month === 1) return `${y - 1}-fall`;
  return `${y}-spring`;
}

/** An order for semester keys: Spring 2025 < Fall 2025 < Spring 2026. */
export function semesterOrdinal(key: string): number {
  const m = /^(\d{4})-(spring|fall)$/.exec(key || '');
  if (!m) return Number.NaN;
  return Number(m[1]) * 2 + (m[2] === 'fall' ? 1 : 0);
}

export function semesterLabel(key: string): string {
  const m = /^(\d{4})-(spring|fall)$/.exec(key || '');
  return m ? `${m[2] === 'fall' ? 'Fall' : 'Spring'} ${m[1]}` : key;
}

// ---------------------------------------------------------------------
// The graph.
// ---------------------------------------------------------------------

interface Graph {
  n: number;
  ids: string[];
  /** Neighbours of each node, in increasing order, with weights. */
  nbr: number[][];
  wt: number[][];
  degree: Float64Array;
  strength: Float64Array;
}

const KINDS: GroupKind[] = ['report', 'board', 'officers', 'lead', 'division', 'interview'];

function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function buildGraph(groups: NetworkGroup[], weights: Readonly<Record<GroupKind, number>> = TIE_WEIGHTS): { g: Graph; ties: NetworkTie[]; membership: TieCounts[] } {
  const idSet = new Set<string>();
  const clean = groups.filter((gr) => (weights[gr.kind] ?? 0) > 0)
    .map((gr) => ({ kind: gr.kind, semester: gr.semester, members: [...new Set(gr.members.filter((x) => typeof x === 'string' && x !== ''))] }));
  for (const gr of clean) for (const id of gr.members) idSet.add(id);
  const ids = [...idSet].sort(byText);
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const membership: TieCounts[] = ids.map(() => ({ report: 0, board: 0, division: 0, interview: 0 }));
  // A person's Boards are the semesters they sat on one, whichever tiers they were in.
  const boardTerms: Set<string>[] = ids.map(() => new Set());
  const acc = new Map<number, { w: number; c: TieCounts }>();
  for (const gr of clean) {
    const idx = gr.members.map((id) => index.get(id)!).sort((p, q) => p - q);
    const onBoard = BOARD_KINDS.has(gr.kind);
    const count: keyof TieCounts = onBoard ? 'board' : (gr.kind as keyof TieCounts);
    if (onBoard) for (const i of idx) boardTerms[i].add(gr.semester);
    else for (const i of idx) membership[i][count] += 1;
    if (idx.length < 2) continue;
    const inc = weights[gr.kind];
    for (let p = 0; p < idx.length; p++) {
      for (let q = p + 1; q < idx.length; q++) {
        const key = idx[p] * n + idx[q];
        let e = acc.get(key);
        if (!e) { e = { w: 0, c: { report: 0, board: 0, division: 0, interview: 0 } }; acc.set(key, e); }
        e.w += inc;
        e.c[count] += 1;
      }
    }
  }
  boardTerms.forEach((terms, i) => { membership[i].board = terms.size; });
  const keys = [...acc.keys()].sort((p, q) => p - q);
  const nbr: number[][] = ids.map(() => []);
  const wt: number[][] = ids.map(() => []);
  const ties: NetworkTie[] = [];
  for (const key of keys) {
    const i = Math.floor(key / n);
    const j = key - i * n;
    const e = acc.get(key)!;
    nbr[i].push(j); wt[i].push(e.w);
    nbr[j].push(i); wt[j].push(e.w);
    ties.push({ a: ids[i], b: ids[j], weight: e.w, ...e.c });
  }
  // Keep each list in increasing order of neighbour (deterministic order).
  for (let i = 0; i < n; i++) {
    const order = nbr[i].map((_, k) => k).sort((p, q) => nbr[i][p] - nbr[i][q]);
    nbr[i] = order.map((k) => nbr[i][k]);
    wt[i] = order.map((k) => wt[i][k]);
  }
  const degree = new Float64Array(n);
  const strength = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    degree[i] = nbr[i].length;
    let s = 0;
    for (const w of wt[i]) s += w;
    strength[i] = s;
  }
  return { g: { n, ids, nbr, wt, degree, strength }, ties, membership };
}

// ---------------------------------------------------------------------
// Status: eigenvector centrality (NetworkX: power iteration on A + I
// from a uniform start, Euclidean norm, stop when the change is below
// n x tol).
// ---------------------------------------------------------------------

function eigenvector(g: Graph, weighted: boolean, maxIter = 1000, tol = 1e-9): Float64Array {
  const n = g.n;
  let x = new Float64Array(n).fill(n ? 1 / n : 0);
  for (let it = 0; it < maxIter; it++) {
    const last = x;
    x = new Float64Array(last);
    for (let v = 0; v < n; v++) {
      const xv = last[v];
      const nb = g.nbr[v];
      const ws = g.wt[v];
      for (let k = 0; k < nb.length; k++) x[nb[k]] += xv * (weighted ? ws[k] : 1);
    }
    let norm = 0;
    for (let v = 0; v < n; v++) norm += x[v] * x[v];
    norm = Math.sqrt(norm) || 1;
    let change = 0;
    for (let v = 0; v < n; v++) { x[v] /= norm; change += Math.abs(x[v] - last[v]); }
    if (change < n * tol) break;
  }
  return x;
}

// ---------------------------------------------------------------------
// Mediation: betweenness centrality (Brandes 2001), with Dijkstra on the
// distance 1 / weight, or breadth-first on the unweighted network.
// Normalised as NetworkX does for an undirected graph: 1 / ((n-1)(n-2)).
// ---------------------------------------------------------------------

/** A binary heap of (distance, arrival order) on preallocated arrays. */
class MinHeap {
  private d: Float64Array;
  private c: Int32Array;
  private v: Int32Array;
  private p: Int32Array;
  size = 0;
  constructor(capacity: number) {
    this.d = new Float64Array(capacity);
    this.c = new Int32Array(capacity);
    this.v = new Int32Array(capacity);
    this.p = new Int32Array(capacity);
  }
  reset(): void { this.size = 0; }
  private less(i: number, j: number): boolean {
    return this.d[i] < this.d[j] || (this.d[i] === this.d[j] && this.c[i] < this.c[j]);
  }
  private swap(i: number, j: number): void {
    const d = this.d[i]; this.d[i] = this.d[j]; this.d[j] = d;
    const c = this.c[i]; this.c[i] = this.c[j]; this.c[j] = c;
    const v = this.v[i]; this.v[i] = this.v[j]; this.v[j] = v;
    const p = this.p[i]; this.p[i] = this.p[j]; this.p[j] = p;
  }
  push(dist: number, count: number, pred: number, node: number): void {
    let i = this.size++;
    this.d[i] = dist; this.c[i] = count; this.p[i] = pred; this.v[i] = node;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (!this.less(i, up)) break;
      this.swap(i, up); i = up;
    }
  }
  /** Removes the smallest entry; read it first with top*(). */
  pop(): void {
    const last = --this.size;
    if (last > 0) this.swap(0, last);
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let s = i;
      if (l < this.size && this.less(l, s)) s = l;
      if (r < this.size && this.less(r, s)) s = r;
      if (s === i) break;
      this.swap(i, s); i = s;
    }
  }
  topDist(): number { return this.d[0]; }
  topPred(): number { return this.p[0]; }
  topNode(): number { return this.v[0]; }
}

function betweenness(g: Graph, weighted: boolean): Float64Array {
  const n = g.n;
  const bc = new Float64Array(n);
  const sigma = new Float64Array(n);
  const delta = new Float64Array(n);
  const dist = new Float64Array(n);
  const seen = new Float64Array(n);
  const done = new Uint8Array(n);
  const preds: number[][] = Array.from({ length: n }, () => []);
  const order: number[] = [];
  // Each tie's length: a strong tie is a short step.
  const len = g.wt.map((ws) => Float64Array.from(ws, (w) => 1 / w));
  let entries = 1;
  for (let i = 0; i < n; i++) entries += g.nbr[i].length;
  const heap = new MinHeap(entries + 1);
  for (let s = 0; s < n; s++) {
    if (g.nbr[s].length === 0) continue;
    order.length = 0;
    sigma.fill(0); delta.fill(0); done.fill(0);
    seen.fill(Infinity);
    for (let i = 0; i < n; i++) preds[i].length = 0;
    sigma[s] = 1;
    if (weighted) {
      heap.reset();
      let counter = 0;
      seen[s] = 0;
      heap.push(0, counter++, s, s);
      while (heap.size) {
        const d = heap.topDist();
        const pred = heap.topPred();
        const v = heap.topNode();
        heap.pop();
        if (done[v]) continue;
        if (v !== s) sigma[v] += sigma[pred];
        done[v] = 1;
        dist[v] = d;
        order.push(v);
        const nb = g.nbr[v];
        const ls = len[v];
        for (let k = 0; k < nb.length; k++) {
          const w = nb[k];
          const vw = d + ls[k];
          if (!done[w] && vw < seen[w]) {
            seen[w] = vw;
            heap.push(vw, counter++, v, w);
            sigma[w] = 0;
            preds[w].length = 0;
            preds[w].push(v);
          } else if (vw === seen[w]) {
            sigma[w] += sigma[v];
            preds[w].push(v);
          }
        }
      }
    } else {
      const queue: number[] = [s];
      dist.fill(-1);
      dist[s] = 0;
      for (let qi = 0; qi < queue.length; qi++) {
        const v = queue[qi];
        order.push(v);
        for (const w of g.nbr[v]) {
          if (dist[w] < 0) { dist[w] = dist[v] + 1; queue.push(w); }
          if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; preds[w].push(v); }
        }
      }
    }
    for (let k = order.length - 1; k >= 0; k--) {
      const w = order[k];
      const coeff = (1 + delta[w]) / sigma[w];
      for (const v of preds[w]) delta[v] += sigma[v] * coeff;
      if (w !== s) bc[w] += delta[w];
    }
  }
  if (n > 2) {
    const scale = 1 / ((n - 1) * (n - 2));
    for (let i = 0; i < n; i++) bc[i] *= scale;
  }
  return bc;
}

// ---------------------------------------------------------------------
// Communities: greedy modularity optimisation (Clauset, Newman and Moore
// 2004), as NetworkX 3.3 greedy_modularity_communities runs it: start
// from single people, repeatedly merge the pair of communities whose
// merger raises modularity most (ties: the lowest pair of labels, the
// first merged into the second), stop when no merger raises it.
// ---------------------------------------------------------------------

function communities(g: Graph): { label: Int32Array; count: number; modularity: number } {
  const n = g.n;
  let m = 0;
  for (let i = 0; i < n; i++) m += g.strength[i];
  m /= 2;
  const label = new Int32Array(n).fill(0);
  if (m === 0) {
    const iso = new Int32Array(n);
    for (let i = 0; i < n; i++) iso[i] = i + 1;
    return { label: iso, count: n, modularity: 0 };
  }
  const q0 = 1 / m;
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) a[i] = g.strength[i] * q0 * 0.5;
  const dq: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  for (let u = 0; u < n; u++) {
    for (let k = 0; k < g.nbr[u].length; k++) {
      const v = g.nbr[u][k];
      dq[u].set(v, q0 * g.wt[u][k] - (a[u] * a[v] + a[u] * a[v]));
    }
  }
  const members: number[][] = Array.from({ length: n }, (_, i) => [i]);
  const alive = new Uint8Array(n).fill(1);
  for (;;) {
    // The best merge: highest gain, then the lowest (row, column).
    let best = -Infinity;
    let bu = -1;
    let bv = -1;
    for (let r = 0; r < n; r++) {
      if (!alive[r]) continue;
      for (const [c, val] of dq[r]) {
        if (val > best || (val === best && (r < bu || (r === bu && c < bv)))) { best = val; bu = r; bv = c; }
      }
    }
    if (bu < 0 || best < 0) break;
    const u = bu;
    const v = bv;
    // Merge u into v.
    members[v] = members[v].concat(members[u]);
    members[u] = [];
    const uN = dq[u];
    const vN = dq[v];
    const all = new Set<number>([...uN.keys(), ...vN.keys()]);
    all.delete(u); all.delete(v);
    for (const w of [...all].sort((p, q) => p - q)) {
      let val: number;
      if (uN.has(w) && vN.has(w)) val = vN.get(w)! + uN.get(w)!;
      else if (vN.has(w)) val = vN.get(w)! - (a[u] * a[w] + a[w] * a[u]);
      else val = uN.get(w)! - (a[v] * a[w] + a[w] * a[v]);
      vN.set(w, val);
      dq[w].set(v, val);
    }
    for (const w of uN.keys()) dq[w].delete(u);
    vN.delete(u);
    dq[u] = new Map();
    alive[u] = 0;
    a[v] += a[u];
    a[u] = 0;
  }
  const groups = [];
  for (let i = 0; i < n; i++) if (alive[i] && members[i].length) groups.push({ key: i, list: members[i] });
  groups.sort((p, q) => q.list.length - p.list.length || p.key - q.key);
  groups.forEach((gr, k) => { for (const i of gr.list) label[i] = k + 1; });
  // Modularity of the partition (NetworkX `modularity`, resolution 1).
  const inW = new Float64Array(groups.length + 1);
  const deg = new Float64Array(groups.length + 1);
  for (let i = 0; i < n; i++) {
    deg[label[i]] += g.strength[i];
    for (let k = 0; k < g.nbr[i].length; k++) if (label[g.nbr[i][k]] === label[i]) inW[label[i]] += g.wt[i][k];
  }
  let q = 0;
  for (let c = 1; c <= groups.length; c++) q += (inW[c] / 2) / m - Math.pow(deg[c] / (2 * m), 2);
  return { label, count: groups.length, modularity: q };
}

// ---------------------------------------------------------------------
// The map: a force-directed layout (Fruchterman and Reingold 1991) from
// fixed starting points, so the same network is always drawn the same.
// Only people with at least one tie are placed.
// ---------------------------------------------------------------------

function layout(g: Graph, label: Int32Array): { x: Float64Array; y: Float64Array } {
  const n = g.n;
  const x = new Float64Array(n).fill(Number.NaN);
  const y = new Float64Array(n).fill(Number.NaN);
  const live: number[] = [];
  for (let i = 0; i < n; i++) if (g.nbr[i].length) live.push(i);
  const L = live.length;
  if (!L) return { x, y };
  const pos = new Map(live.map((i, k) => [i, k]));
  const px = new Float64Array(L);
  const py = new Float64Array(L);
  // Start: each community around its own point, people on a sunflower.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const comms = Math.max(1, ...live.map((i) => label[i]));
  for (let k = 0; k < L; k++) {
    const c = label[live[k]] - 1;
    const ca = (2 * Math.PI * c) / comms;
    const r = Math.sqrt((k + 0.5) / L) * 0.35;
    px[k] = 0.5 + 0.25 * Math.cos(ca) + r * Math.cos(k * golden);
    py[k] = 0.5 + 0.25 * Math.sin(ca) + r * Math.sin(k * golden);
  }
  let meanW = 0;
  let edges = 0;
  for (const i of live) for (const w of g.wt[i]) { meanW += w; edges += 1; }
  meanW = edges ? meanW / edges : 1;
  const area = 1;
  const kk = Math.sqrt(area / L);
  const iterations = L > 600 ? 160 : 260;
  const dx = new Float64Array(L);
  const dy = new Float64Array(L);
  for (let it = 0; it < iterations; it++) {
    const temp = 0.08 * (1 - it / iterations) + 0.002;
    dx.fill(0); dy.fill(0);
    for (let p = 0; p < L; p++) {
      for (let q = p + 1; q < L; q++) {
        let ddx = px[p] - px[q];
        let ddy = py[p] - py[q];
        let d2 = ddx * ddx + ddy * ddy;
        if (d2 < 1e-9) { ddx = 1e-4 * ((p % 7) - 3 || 1); ddy = 1e-4 * ((q % 5) - 2 || 1); d2 = ddx * ddx + ddy * ddy; }
        const f = (kk * kk) / d2;
        dx[p] += ddx * f; dy[p] += ddy * f;
        dx[q] -= ddx * f; dy[q] -= ddy * f;
      }
    }
    for (let p = 0; p < L; p++) {
      const i = live[p];
      const nb = g.nbr[i];
      for (let k = 0; k < nb.length; k++) {
        const q = pos.get(nb[k])!;
        if (q <= p) continue;
        const ddx = px[p] - px[q];
        const ddy = py[p] - py[q];
        const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1e-6;
        const f = (d / kk) * Math.sqrt(g.wt[i][k] / meanW);
        dx[p] -= ddx * f; dy[p] -= ddy * f;
        dx[q] += ddx * f; dy[q] += ddy * f;
      }
      // A gentle pull to the centre keeps separate groups in view.
      dx[p] += (0.5 - px[p]) * 0.6 * L * kk;
      dy[p] += (0.5 - py[p]) * 0.6 * L * kk;
    }
    for (let p = 0; p < L; p++) {
      const d = Math.sqrt(dx[p] * dx[p] + dy[p] * dy[p]) || 1;
      const step = Math.min(d, temp);
      px[p] += (dx[p] / d) * step;
      py[p] += (dy[p] / d) * step;
    }
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let p = 0; p < L; p++) {
    minX = Math.min(minX, px[p]); maxX = Math.max(maxX, px[p]);
    minY = Math.min(minY, py[p]); maxY = Math.max(maxY, py[p]);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const offX = (1 - (maxX - minX) / span) / 2;
  const offY = (1 - (maxY - minY) / span) / 2;
  for (let p = 0; p < L; p++) {
    x[live[p]] = Math.round((offX + (px[p] - minX) / span) * 10000) / 10000;
    y[live[p]] = Math.round((offY + (py[p] - minY) / span) * 10000) / 10000;
  }
  return { x, y };
}

// ---------------------------------------------------------------------
// Ranks and correlations.
// ---------------------------------------------------------------------

/** Competition ranks (1, 2, 2, 4) of values, highest first. */
function ranksOf(values: ArrayLike<number>): Int32Array {
  const n = values.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => values[q] - values[p] || p - q);
  const out = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    const i = idx[k];
    out[i] = k > 0 && values[i] === values[idx[k - 1]] ? out[idx[k - 1]] : k + 1;
  }
  return out;
}

/** Average ranks, for the Spearman correlation. */
function averageRanks(values: ArrayLike<number>): Float64Array {
  const n = values.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => values[p] - values[q] || p - q);
  const out = new Float64Array(n);
  let k = 0;
  while (k < n) {
    let e = k;
    while (e + 1 < n && values[idx[e + 1]] === values[idx[k]]) e++;
    const r = (k + e) / 2 + 1;
    for (let t = k; t <= e; t++) out[idx[t]] = r;
    k = e + 1;
  }
  return out;
}

export function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = a.length;
  if (n < 3) return 1;
  const ra = averageRanks(a);
  const rb = averageRanks(b);
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += ra[i]; mb += rb[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 1;
}

const r4 = (v: number): number => Math.round(v * 1e6) / 1e6;

// ---------------------------------------------------------------------
// The analysis.
// ---------------------------------------------------------------------

export function analyseNetwork(groups: NetworkGroup[], options: AnalyseOptions = {}): NetworkResult {
  const until = options.until ?? null;
  const limit = until ? semesterOrdinal(until) : Infinity;
  const used = groups.filter((gr) => KINDS.includes(gr.kind) && semesterOrdinal(gr.semester) <= limit);
  const { g, ties, membership } = buildGraph(used, options.weights ?? TIE_WEIGHTS);
  const n = g.n;
  const eig = eigenvector(g, true);
  const btw = betweenness(g, true);
  const com = communities(g);

  // Coalition building.
  const maxDeg = Math.max(0, ...Array.from(g.degree));
  const size = new Map<number, number>();
  const inner = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    size.set(com.label[i], (size.get(com.label[i]) ?? 0) + 1);
    for (const j of g.nbr[i]) if (j > i && com.label[j] === com.label[i]) inner.set(com.label[i], (inner.get(com.label[i]) ?? 0) + 1);
  }
  const tiedCommunities = new Set<number>();
  for (let i = 0; i < n; i++) if (g.nbr[i].length) tiedCommunities.add(com.label[i]);
  const C = tiedCommunities.size;
  const cohesion = new Float64Array(n);
  const ego = new Float64Array(n);
  const reach = new Float64Array(n);
  const coalition = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!g.nbr[i].length) continue;
    const s = size.get(com.label[i]) ?? 1;
    cohesion[i] = s > 1 ? (inner.get(com.label[i]) ?? 0) / ((s * (s - 1)) / 2) : 0;
    ego[i] = maxDeg ? g.degree[i] / maxDeg : 0;
    const other = new Set<number>();
    for (const j of g.nbr[i]) if (com.label[j] !== com.label[i]) other.add(com.label[j]);
    reach[i] = C > 1 ? other.size / (C - 1) : 0;
    coalition[i] = (cohesion[i] + ego[i] + reach[i]) / 3;
  }

  const maxEig = Math.max(0, ...Array.from(eig));
  const status = new Float64Array(n);
  for (let i = 0; i < n; i++) status[i] = maxEig > 0 && g.nbr[i].length ? eig[i] / maxEig : 0;
  const rStatus = ranksOf(status);
  const rMed = ranksOf(btw);
  const rCoal = ranksOf(coalition);
  const pct = (r: number): number => (n > 1 ? 1 - (r - 1) / (n - 1) : 1);
  const overall = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    overall[i] = g.nbr[i].length ? (pct(rStatus[i]) + pct(rMed[i]) + pct(rCoal[i])) / 3 : 0;
  }
  const rOverall = ranksOf(overall);
  const pos = options.layout ? layout(g, com.label) : null;

  const scores: PersonScore[] = [];
  for (let i = 0; i < n; i++) {
    const s: PersonScore = {
      id: g.ids[i],
      degree: g.degree[i],
      strength: r4(g.strength[i]),
      status: r4(status[i]),
      mediation: r4(btw[i]),
      coalition: r4(coalition[i]),
      cohesion: r4(cohesion[i]),
      ego: r4(ego[i]),
      reach: r4(reach[i]),
      community: g.nbr[i].length ? com.label[i] : 0,
      overall: r4(overall[i]),
      rank: { status: rStatus[i], mediation: rMed[i], coalition: rCoal[i], overall: rOverall[i] },
      groups: membership[i],
    };
    if (pos && !Number.isNaN(pos.x[i])) { s.x = pos.x[i]; s.y = pos.y[i]; }
    scores.push(s);
  }

  // Communities are renumbered over the people with ties only.
  const renum = new Map<number, number>();
  const commSize = new Map<number, number>();
  for (const s of scores) if (s.community) commSize.set(s.community, (commSize.get(s.community) ?? 0) + 1);
  [...commSize.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0]).forEach(([c], k) => renum.set(c, k + 1));
  for (const s of scores) s.community = s.community ? renum.get(s.community)! : 0;

  const result: NetworkResult = {
    until,
    people: n,
    connected: scores.filter((s) => s.degree > 0).length,
    ties: ties.length,
    communities: commSize.size,
    modularity: r4(com.modularity),
    groups: {
      report: used.filter((gr) => gr.kind === 'report').length,
      board: new Set(used.filter((gr) => BOARD_KINDS.has(gr.kind)).map((gr) => gr.semester)).size,
      division: used.filter((gr) => gr.kind === 'division').length,
      interview: used.filter((gr) => gr.kind === 'interview').length,
    },
    scores,
  };
  if (options.ties) result.tieList = ties.map((t) => ({ ...t, weight: r4(t.weight) }));
  if (options.robustness) {
    const eigU = eigenvector(g, false);
    const btwU = betweenness(g, false);
    result.robustness = {
      status: r4(spearman(eig, eigU)),
      mediation: r4(spearman(btw, btwU)),
      strengthDegree: r4(spearman(g.strength, g.degree)),
    };
  }
  return result;
}

/**
 * A fingerprint of the groups a network up to `until` is built from, so a
 * semester already analysed is analysed again only when its data changed
 * (a corrected roster, a report added with an older date, a person left
 * out). FNV-1a over the sorted groups, as 8 hex digits.
 */
export function inputFingerprint(groups: NetworkGroup[], until: string | null): string {
  const limit = until ? semesterOrdinal(until) : Infinity;
  const lines = groups
    .filter((gr) => semesterOrdinal(gr.semester) <= limit)
    .map((gr) => `${gr.kind}|${gr.key}|${gr.semester}|${[...new Set(gr.members)].sort(byText).join(',')}`)
    .sort(byText);
  // The weights are part of what a result depends on.
  lines.unshift(`weights|${KINDS.map((k) => `${k}=${TIE_WEIGHTS[k]}`).join(',')}`);
  let h = 0x811c9dc5;
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      h ^= line.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 10;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Exposed for the tests, which check them against NetworkX. */
export const __internals = { buildGraph, eigenvector, betweenness, communities, ranksOf };

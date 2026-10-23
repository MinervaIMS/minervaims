// =====================================================================
// THE FUND FIGURES, RECOMPUTED INDEPENDENTLY (Step 93).
// ---------------------------------------------------------------------
//   node --test scripts/fund-stats.test.mjs
//
// Every figure the website shows about a fund (the yearly YTD, ITD,
// volatility and Sharpe ratio; the cumulative and annualised return and
// volatility; the Sharpe ratio on the €STR; the maximum drawdown with its
// peak, trough and recovery; the share of positive months; the best and
// worst month; beta and correlation to each market reference) is computed
// by ONE database function, public.fund_track_record. This test computes
// all of them again, here, from the typed monthly returns alone, with
// none of the database's code, and fails on any difference.
//
//   * scripts/fixtures/fund-track-record.json holds the monthly returns as
//     typed (a test copy of the live data) with SAMPLE risk-free and index
//     series, and what the database function returned for them.
//   * If a build has written dist/data/funds.json (or FUNDS_JSON points at
//     one), every figure in it that can be recomputed from its own monthly
//     returns is checked too: the file machines read must agree with the
//     arithmetic.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const fixture = JSON.parse(readFileSync(join(ROOT, 'scripts/fixtures/fund-track-record.json'), 'utf8'));
const TOL = 2e-6; // the database rounds to six decimals

// ── An independent implementation ─────────────────────────────────────

/** "+0.9%", "-1,2 %", "0.3" -> 0.9, -1.2, 0.3 (percent); empty -> null. */
function percent(text) {
  const t = String(text ?? '').replace(/\s|%/g, '').replace(',', '.');
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) && v > -100 ? v : null;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function sampleSd(xs) {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}
const growth = (rs) => rs.reduce((g, r) => g * (1 + r), 1);
const monthlyRf = (annualPct) => (1 + annualPct / 100) ** (1 / 12) - 1;

function recompute(fund, inputs) {
  const months = [];
  for (const y of inputs.years.filter((x) => x.fund === fund)) {
    y.months.forEach((cell, i) => {
      const v = percent(cell);
      if (v !== null && i < 12) months.push({ key: `${y.year}-${String(i + 1).padStart(2, '0')}`, year: y.year, m: i, r: v / 100 });
    });
  }
  months.sort((a, b) => a.key.localeCompare(b.key));
  const n = months.length;
  if (!n) return { months_count: 0 };
  const estr = inputs.series.estr || {};
  const rf = months.map((x) => (x.key in estr ? monthlyRf(estr[x.key]) : null));

  // Years.
  const yearsList = [...new Set(months.map((x) => x.year))];
  let cum = 1;
  const years = yearsList.map((year) => {
    const idx = months.map((x, i) => (x.year === year ? i : -1)).filter((i) => i >= 0);
    const rs = idx.map((i) => months[i].r);
    const g = growth(rs);
    cum *= g;
    const sd = rs.length >= 2 ? sampleSd(rs) : null;
    const rfOk = idx.every((i) => rf[i] !== null);
    const grf = growth(idx.map((i) => rf[i] ?? 0));
    const cells = Array.from({ length: 12 }, (_, m) => {
      const hit = months.find((x) => x.year === year && x.m === m);
      return hit ? hit.r * 100 : null;
    });
    return {
      year, n: rs.length, months: cells,
      ytd: (g - 1) * 100,
      itd: (cum - 1) * 100,
      vol: sd === null ? null : sd * Math.sqrt(12) * 100,
      sharpe: rs.length === 12 && rfOk && sd > 0 ? ((g - 1) - (grf - 1)) / (sd * Math.sqrt(12)) : null,
    };
  });

  // Since inception.
  const rs = months.map((x) => x.r);
  const g = growth(rs);
  const sd = sampleSd(rs);
  const rfOk = rf.every((x) => x !== null);
  const grf = growth(rf.map((x) => x ?? 0));
  const annualise = (gg) => gg ** (12 / n) - 1;
  const best = months.reduce((b, x) => (x.r > b.r ? x : b), months[0]);
  const worst = months.reduce((w, x) => (x.r < w.r ? x : w), months[0]);

  // Drawdown, from a starting value of 1 before the first month.
  let value = 1, peak = 1, peakI = -1, mdd = 0, mddPeak = -1, mddTrough = -1;
  const path = [];
  for (let i = 0; i < n; i++) {
    value *= 1 + rs[i];
    path.push(value);
    if (value >= peak) { peak = value; peakI = i; }
    const dd = value / peak - 1;
    if (dd < mdd) { mdd = dd; mddPeak = peakI; mddTrough = i; }
  }
  let recovery = -1;
  if (mdd < 0) {
    const level = mddPeak < 0 ? 1 : path[mddPeak];
    for (let j = mddTrough + 1; j < n; j++) if (path[j] >= level) { recovery = j; break; }
  }

  // References: slope and correlation over the months both have.
  const references = Object.entries(inputs.series).filter(([s]) => s !== 'estr').map(([series, vals]) => {
    const pairs = months.filter((x) => x.key in vals).map((x) => [vals[x.key] / 100, x.r]);
    if (pairs.length < 12) return { series, months: pairs.length, beta: null, correlation: null };
    const xs = pairs.map((p) => p[0]), ys = pairs.map((p) => p[1]);
    const mx = mean(xs), my = mean(ys);
    const sxy = pairs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const syy = ys.reduce((a, y) => a + (y - my) ** 2, 0);
    return { series, months: pairs.length, beta: sxy / sxx, correlation: sxy / Math.sqrt(sxx * syy) };
  });

  return {
    months_count: n,
    first_month: months[0].key,
    last_month: months[n - 1].key,
    years,
    itd: (g - 1) * 100,
    ann_return: n >= 12 ? annualise(g) * 100 : null,
    ann_vol: n >= 12 ? sd * Math.sqrt(12) * 100 : null,
    sharpe: n >= 12 && rfOk && sd > 0 ? (annualise(g) - annualise(grf)) / (sd * Math.sqrt(12)) : null,
    positive_share: (100 * rs.filter((r) => r > 0).length) / n,
    best: { month: best.key, value: best.r * 100 },
    worst: { month: worst.key, value: worst.r * 100 },
    max_drawdown: {
      value: mdd * 100,
      peak_month: mdd < 0 && mddPeak >= 0 ? months[mddPeak].key : null,
      from_inception: mdd < 0 && mddPeak < 0,
      trough_month: mdd < 0 ? months[mddTrough].key : null,
      recovery_month: recovery >= 0 ? months[recovery].key : null,
      months_to_recover: recovery >= 0 ? recovery - mddTrough : null,
    },
    risk_free: { months_covered: rf.filter((x) => x !== null).length, complete: rfOk },
    references,
  };
}

// ── Comparison ────────────────────────────────────────────────────────

function close(actual, expected, what) {
  if (expected === null || expected === undefined) {
    assert.ok(actual === null || actual === undefined, `${what}: expected no value, the database gave ${actual}`);
    return;
  }
  assert.ok(typeof actual === 'number', `${what}: the database gave no value, expected ${expected}`);
  assert.ok(Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)), `${what}: database ${actual}, recomputed ${expected}`);
}

function compareRecord(fund, db, mine, { withInputs }) {
  assert.equal(db.months_count, mine.months_count, `${fund}: number of months`);
  if (!mine.months_count) return;
  assert.equal(db.first_month, mine.first_month, `${fund}: first month`);
  assert.equal(db.last_month, mine.last_month, `${fund}: last month`);
  assert.equal(db.years.length, mine.years.length, `${fund}: number of years`);
  mine.years.forEach((y, i) => {
    const d = db.years[i];
    assert.equal(d.year, y.year, `${fund}: year order`);
    assert.equal(d.n, y.n, `${fund} ${y.year}: months in the year`);
    y.months.forEach((v, m) => close(d.months[m], v, `${fund} ${y.year} month ${m + 1}`));
    close(d.ytd, y.ytd, `${fund} ${y.year} YTD`);
    close(d.itd, y.itd, `${fund} ${y.year} ITD`);
    close(d.vol, y.vol, `${fund} ${y.year} volatility`);
    if (withInputs) close(d.sharpe, y.sharpe, `${fund} ${y.year} Sharpe`);
  });
  close(db.itd, mine.itd, `${fund} cumulative return`);
  close(db.ann_return, mine.ann_return, `${fund} annualised return`);
  close(db.ann_vol, mine.ann_vol, `${fund} annualised volatility`);
  if (withInputs) close(db.sharpe, mine.sharpe, `${fund} Sharpe ratio`);
  close(db.positive_share, mine.positive_share, `${fund} share of positive months`);
  assert.equal(db.best.month, mine.best.month, `${fund} best month`);
  close(db.best.value, mine.best.value, `${fund} best month value`);
  assert.equal(db.worst.month, mine.worst.month, `${fund} worst month`);
  close(db.worst.value, mine.worst.value, `${fund} worst month value`);
  close(db.max_drawdown.value, mine.max_drawdown.value, `${fund} maximum drawdown`);
  for (const k of ['peak_month', 'from_inception', 'trough_month', 'recovery_month', 'months_to_recover']) {
    assert.equal(db.max_drawdown[k], mine.max_drawdown[k], `${fund} drawdown ${k}`);
  }
  if (withInputs) {
    assert.equal(db.risk_free.months_covered, mine.risk_free.months_covered, `${fund} €STR months`);
    assert.equal(db.risk_free.complete, mine.risk_free.complete, `${fund} €STR complete`);
    for (const ref of mine.references) {
      const d = db.references.find((x) => x.series === ref.series);
      assert.ok(d, `${fund}: reference ${ref.series} missing`);
      assert.equal(d.months, ref.months, `${fund} ${ref.series}: shared months`);
      close(d.beta, ref.beta, `${fund} ${ref.series} beta`);
      close(d.correlation, ref.correlation, `${fund} ${ref.series} correlation`);
    }
  }
}

// ── The tests ─────────────────────────────────────────────────────────

for (const fund of Object.keys(fixture.records)) {
  test(`${fund}: every figure of the database function, recomputed from the monthly returns`, () => {
    compareRecord(fund, fixture.records[fund], recompute(fund, fixture.inputs), { withInputs: true });
  });
}

test('the fixture exercises every rule', () => {
  const ls = fixture.records['long-short'];
  assert.ok(ls.sharpe !== null, 'a Sharpe ratio with the €STR complete');
  assert.ok(ls.years.some((y) => y.sharpe === null && y.n < 12), 'no Sharpe ratio for a partial year');
  assert.ok(ls.references.some((r) => r.beta !== null), 'a reference with twelve shared months or more');
  assert.ok(ls.references.some((r) => r.months > 0 && r.months < 12 && r.beta === null), 'a reference with too few shared months has no beta');
  assert.ok(ls.max_drawdown.recovery_month, 'a drawdown that recovered');
  assert.equal(fixture.records.dps.months_count, 0, 'a fund with no returns has no figures');
});

test('the parser reads the cells as the editor writes them', () => {
  assert.equal(percent('+0.9%'), 0.9);
  assert.equal(percent('-1,2 %'), -1.2);
  assert.equal(percent(''), null);
  assert.equal(percent('-100%'), null);
});

const built = process.env.FUNDS_JSON || join(ROOT, 'dist/data/funds.json');
test('the published funds.json agrees with its own monthly returns', { skip: !existsSync(built) && `no build at ${built}` }, () => {
  const data = JSON.parse(readFileSync(built, 'utf8'));
  let checked = 0;
  for (const [fund, entry] of Object.entries(data.funds)) {
    if (!entry.record) continue;
    // The file carries the monthly returns it was computed from.
    const inputs = { years: [], series: {} };
    for (const m of entry.record.monthly) {
      const [y, mm] = m.month.split('-').map(Number);
      let row = inputs.years.find((r) => r.year === y);
      if (!row) { row = { fund, year: y, months: Array(12).fill('') }; inputs.years.push(row); }
      row.months[mm - 1] = String(m.value);
    }
    compareRecord(fund, entry.record, recompute(fund, inputs), { withInputs: false });
    checked++;
  }
  assert.ok(checked > 0, 'at least one fund record in the file');
});

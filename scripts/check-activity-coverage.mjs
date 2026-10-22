#!/usr/bin/env node
// =====================================================================
// check-activity-coverage: does every write in the workspace reach
// Activity tracking?
// ---------------------------------------------------------------------
//   node scripts/check-activity-coverage.mjs           (summary)
//   node scripts/check-activity-coverage.mjs --list    (every write path)
//
// Reads supabase/functions/_shared/activity-registry.ts (the one list of
// what is recorded) and checks it against the code itself:
//
//   1. every edge function is either audited (wrapped by `audited`, with
//      the caller and the action recorded) or listed as NOT_WORKSPACE;
//   2. every action an audited function accepts is either a recorded
//      write (MUTATES) or a declared read (READS), never neither;
//   3. every table the interface writes to directly is in
//      CLIENT_WRITE_TABLES and has the audit trigger in the migration;
//      every database function it calls is a declared read or write;
//   4. every place in the interface that saves a file is in
//      BROWSER_DOWNLOADS, with how it is recorded.
//
// Exits 1 on any gap, so a new action, table or download cannot slip
// through unrecorded. Needs only Node and the repository's own esbuild.
// =====================================================================

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const FN = join(ROOT, 'supabase', 'functions');
const require = createRequire(import.meta.url);
const { transformSync } = require(join(ROOT, 'node_modules', 'esbuild'));

// ── the registry, loaded from its TypeScript source ─────────────────────
const regSrc = readFileSync(join(FN, '_shared', 'activity-registry.ts'), 'utf8');
const regJs = transformSync(regSrc, { loader: 'ts', format: 'esm' }).code;
const reg = await import('data:text/javascript;base64,' + Buffer.from(regJs).toString('base64'));
const { PLACE, MUTATES, READS, NOT_WORKSPACE, CLIENT_WRITE_TABLES, CLIENT_WRITE_RPCS, CLIENT_READ_RPCS,
  CLIENT_STORAGE_UPLOADS, BROWSER_DOWNLOADS, verbFor, placeFor } = reg;

const problems = [];
const inventory = [];
const listMode = process.argv.includes('--list');

// ── 1 and 2: edge functions and their actions ────────────────────────────
const NOT_ACTIONS = new Set(['string']);
function actionsOf(src) {
  const found = new Set();
  for (const m of src.matchAll(/\baction\s*===\s*'([a-z0-9-]+)'/g)) found.add(m[1]);
  for (const m of src.matchAll(/\baction\s*!==\s*'([a-z0-9-]+)'/g)) found.add(m[1]);
  for (const m of src.matchAll(/\baudit\.request\(\s*'([a-z0-9-]+)'/g)) found.add(m[1]);
  for (const m of src.matchAll(/ActionSchema\s*=\s*z\.enum\(\[([^\]]+)\]/g)) {
    for (const a of m[1].matchAll(/'([a-z0-9-]+)'/g)) found.add(a[1]);
  }
  // A default action: `... || 'register'`, `... : 'notify-received'`.
  for (const m of src.matchAll(/const action[^\n;]*?(?:\|\||:)\s*'([a-z0-9-]+)'\s*;/g)) found.add(m[1]);
  if (/switch\s*\(\s*action\s*\)/.test(src)) {
    const body = src.slice(src.search(/switch\s*\(\s*action\s*\)/));
    for (const m of body.matchAll(/\bcase\s+'([a-z0-9-]+)'\s*:/g)) found.add(m[1]);
  }
  for (const n of NOT_ACTIONS) found.delete(n);
  return [...found].sort();
}

const functions = readdirSync(FN).filter((d) => !d.startsWith('_') && existsSync(join(FN, d, 'index.ts')));
for (const fn of functions) {
  const src = readFileSync(join(FN, fn, 'index.ts'), 'utf8');
  const wrapped = new RegExp(`audited\\(\\s*'${fn}'`).test(src);
  if (NOT_WORKSPACE[fn]) {
    if (wrapped) inventory.push({ fn, action: '*', verb: 'audited although listed as not workspace' });
    continue;
  }
  if (!wrapped) { problems.push(`${fn}: not audited (wrap it with audited('${fn}', ...) or list it in NOT_WORKSPACE with the reason)`); continue; }
  if (!/audit\.actor\(/.test(src)) problems.push(`${fn}: never records who is asking (audit.actor)`);
  if (!/audit\.request\(/.test(src)) problems.push(`${fn}: never records the action (audit.request)`);
  if (!PLACE[fn]) problems.push(`${fn}: no place in the workspace (PLACE)`);
  if (!READS[fn]) problems.push(`${fn}: no READS entry (list its read-only actions, or [] when it has none)`);
  for (const action of actionsOf(src)) {
    const verb = verbFor(fn, action);
    const read = (READS[fn] || []).includes(action);
    if (MUTATES[`${fn}:${action}`] && read) problems.push(`${fn}:${action} is listed both as a write and as a read`);
    if (!verb && !read) problems.push(`${fn}:${action} is neither a recorded write (MUTATES) nor a declared read (READS)`);
    if (verb) {
      const place = placeFor(fn, action);
      inventory.push({ fn, action, verb, place: `${place.section} > ${place.subsection}` });
    }
  }
}
// Registry entries that point at an action nobody accepts any more.
for (const key of Object.keys(MUTATES)) {
  const [fn, action] = key.includes(':') ? key.split(':') : [null, key];
  if (!fn) continue;
  if (!functions.includes(fn)) { problems.push(`MUTATES has ${key}, but there is no function ${fn}`); continue; }
  const src = readFileSync(join(FN, fn, 'index.ts'), 'utf8');
  if (!actionsOf(src).includes(action)) problems.push(`MUTATES has ${key}, but ${fn} does not accept "${action}"`);
}

// ── 3: direct writes from the interface ─────────────────────────────────
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'integrations') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}
const srcFiles = walk(join(ROOT, 'src'));
const migration = readFileSync(join(ROOT, 'supabase', 'migrations', '20261022100200_activity_everyone.sql'), 'utf8');
const directTables = new Map();
const rpcs = new Map();
const uploads = new Map();
for (const file of srcFiles) {
  const s = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  for (const m of s.matchAll(/\.from\(\s*'([a-z_]+)'\s*\)\s*\.\s*(insert|update|upsert|delete)\s*\(/g)) {
    if (m[1] === 'activity_logs') continue; // the log's own fallback writer
    directTables.set(m[1], [...(directTables.get(m[1]) || []), `${rel} (${m[2]})`]);
  }
  for (const m of s.matchAll(/\.rpc\(\s*'([a-z_]+)'/g)) rpcs.set(m[1], [...(rpcs.get(m[1]) || []), rel]);
  for (const m of s.matchAll(/storage\s*\.from\(\s*'([a-z-]+)'\s*\)\s*\.(upload|remove|move|copy|update)\(/g)) {
    uploads.set(m[1], [...(uploads.get(m[1]) || []), rel]);
  }
}
for (const [table, where] of directTables) {
  if (!CLIENT_WRITE_TABLES[table]) problems.push(`direct write to ${table} (${where.join(', ')}) is not in CLIENT_WRITE_TABLES`);
  else if (!new RegExp(`\\('${table}',`).test(migration)) problems.push(`${table} has no audit trigger in 20261022100200_activity_everyone.sql`);
  else inventory.push({ fn: 'table', action: table, verb: 'trigger', place: `${CLIENT_WRITE_TABLES[table].section} > ${CLIENT_WRITE_TABLES[table].subsection}` });
}
for (const table of Object.keys(CLIENT_WRITE_TABLES)) {
  if (!new RegExp(`\\('${table}',`).test(migration)) problems.push(`CLIENT_WRITE_TABLES has ${table}, but the migration gives it no trigger`);
}
for (const [rpc, where] of rpcs) {
  if (CLIENT_WRITE_RPCS[rpc] === undefined && !CLIENT_READ_RPCS.includes(rpc)) problems.push(`database function ${rpc} (${where.join(', ')}) is neither a declared read nor a recorded write`);
}
for (const [bucket, where] of uploads) {
  if (!CLIENT_STORAGE_UPLOADS[bucket]) problems.push(`direct upload to ${bucket} (${where.join(', ')}) is not in CLIENT_STORAGE_UPLOADS`);
}

// ── 4: files saved in the browser ───────────────────────────────────────
for (const file of srcFiles) {
  const s = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  if (/URL\.createObjectURL\(|\bdownloadBlob\(/.test(s) && !BROWSER_DOWNLOADS[rel]) {
    problems.push(`${rel} saves a file but is not in BROWSER_DOWNLOADS`);
  }
}

// ── report ──────────────────────────────────────────────────────────────
if (listMode) {
  for (const r of inventory) console.log(`${r.fn.padEnd(24)} ${r.action.padEnd(28)} ${String(r.verb).padEnd(14)} ${r.place ?? ''}`);
  console.log('');
}
const audited = functions.filter((f) => !NOT_WORKSPACE[f]).length;
console.log(`Edge functions: ${audited} audited, ${functions.length - audited} outside the workspace.`);
console.log(`Recorded write paths: ${inventory.filter((r) => r.fn !== 'table').length} function actions, ${inventory.filter((r) => r.fn === 'table').length} direct table writes.`);
if (problems.length) {
  console.log(`\n${problems.length} gap(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('No unrecorded write paths.');

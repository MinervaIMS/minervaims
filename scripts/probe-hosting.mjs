#!/usr/bin/env node
// =====================================================================
// THE HOSTING PROBE (Step 92). Run after publishing:
//
//   node scripts/probe-hosting.mjs [https://minervaims.org]
//
// It answers the questions the static pages of the next delivery depend
// on, by asking the live host:
//   1. For a clean address, does the host serve `name.html`, or
//      `name/index.html`, or neither (the app shell)? Does it redirect
//      /name to /name/?
//   2. Does it honour a `_redirects` file (a real 301) and a `_headers`
//      file?
//   3. What do an unknown address and an unknown file return?
//   4. Did the build embed the key numbers, and write the data files?
//   5. What does each crawler get for a page (title, canonical, size)?
// It changes nothing; it only reads.
// =====================================================================

const BASE = (process.argv[2] || 'https://minervaims.org').replace(/\/$/, '');

const AGENTS = {
  browser: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Claude-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)',
  'Claude-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
};

async function get(path, ua = AGENTS.browser, headers = {}) {
  const res = await fetch(BASE + path, { redirect: 'manual', headers: { 'User-Agent': ua, ...headers } });
  const body = res.status >= 300 && res.status < 400 ? '' : await res.text();
  return { status: res.status, location: res.headers.get('location'), probeHeader: res.headers.get('x-mims-probe'), type: res.headers.get('content-type'), body };
}

const marker = (body) => (body.match(/MIMS-PROBE ([a-z-]+)/) || [])[1] || (/<div id="root">/.test(body) ? 'app shell' : body.slice(0, 40).replace(/\s+/g, ' '));

console.log(`Hosting probe of ${BASE}\n`);
console.log('1-2. Clean addresses, redirects and headers');
for (const path of ['/__probe/form-a', '/__probe/form-a.html', '/__probe/form-b', '/__probe/form-b/', '/__probe/form-c', '/__probe/form-c/', '/__probe/redirect-test']) {
  const r = await get(path, AGENTS.browser, { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' });
  console.log(`   ${path.padEnd(26)} ${r.status}${r.location ? ` -> ${r.location}` : ''}  ${r.status < 300 ? marker(r.body) : ''}${r.probeHeader ? `  [X-Mims-Probe: ${r.probeHeader}]` : ''}`);
}

console.log('\n3. Unknown addresses');
for (const path of ['/no-such-page', '/no-such-file.html', '/no-such-file.txt']) {
  const r = await get(path);
  console.log(`   ${path.padEnd(26)} ${r.status}  ${r.type}  ${marker(r.body)}`);
}

console.log('\n4. What the build wrote');
const home = await get('/');
const embedded = /<script type="application\/json" id="mims-key-numbers">/.test(home.body);
console.log(`   key numbers embedded in the page: ${embedded ? 'yes' : 'no'}`);
for (const path of ['/data/key-numbers.json', '/snapshot-meta.json']) {
  const r = await get(path);
  let summary = '';
  try {
    const j = JSON.parse(r.body);
    summary = path.includes('meta') ? JSON.stringify(j.key_numbers) : `${Object.keys(j.numbers || {}).length} figures, built ${j.built_at}`;
  } catch { summary = 'not JSON'; }
  console.log(`   ${path.padEnd(26)} ${r.status}  ${summary}`);
}

console.log('\n5. What each user agent receives for /about');
for (const [name, ua] of Object.entries(AGENTS)) {
  const r = await get('/about', ua);
  const title = (r.body.match(/<title>([^<]*)<\/title>/) || [])[1];
  const canonical = (r.body.match(/rel="canonical" href="([^"]*)"/) || [])[1];
  const h1 = (r.body.match(/<h1[^>]*>([^<]*)</) || [])[1];
  console.log(`   ${name.padEnd(17)} ${r.status}  ${String(r.body.length).padStart(6)} bytes  title: ${title}  canonical: ${canonical}  h1: ${h1}`);
}

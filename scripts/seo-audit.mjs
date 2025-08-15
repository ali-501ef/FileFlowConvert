import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const ROOT = 'client';
const PAGES = [];
function crawl(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) crawl(p);
    else if (extname(p).toLowerCase() === '.html') PAGES.push(p);
  }
}
crawl(ROOT);

function extract(str, re) { const m = str.match(re); return m ? m[1].trim() : ''; }

const results = [];
for (const page of PAGES) {
  const html = readFileSync(page, 'utf8');

  // Skip pages explicitly marked noindex
  const robotsMeta = extract(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/i);
  if (robotsMeta && /noindex/i.test(robotsMeta)) continue;

  const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
  const desc  = extract(html, /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i);
  const canon = extract(html, /<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["'][^>]*>/i);
  const h1cnt = (html.match(/<h1[\s>]/gi) || []).length;

  const ogt   = extract(html, /<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["'][^>]*>/i);
  const ogd   = extract(html, /<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["'][^>]*>/i);
  const ogi   = extract(html, /<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["'][^>]*>/i);
  const twc   = extract(html, /<meta\s+name=["']twitter:card["']\s+content=["']([\s\S]*?)["'][^>]*>/i);

  results.push({
    page,
    title,
    titleLen: title.length,
    desc,
    descLen: desc.length,
    canonical: canon,
    h1Count: h1cnt,
    ogTitle: ogt,
    ogDesc: ogd,
    ogImage: ogi,
    twitterCard: twc
  });
}

// Duplicate detection
function dupes(key) {
  const map = new Map();
  for (const r of results) {
    const k = (r[key] || '').toLowerCase();
    if (!k) continue;
    map.set(k, (map.get(k) || []).concat(r.page));
  }
  return [...map.entries()].filter(([,v]) => v.length > 1);
}

const dupTitles = dupes('title');
const dupDescs  = dupes('desc');

// Basic heuristics
const issues = [];
for (const r of results) {
  if (!r.title) issues.push([r.page, 'MISSING_TITLE']);
  if (r.titleLen > 60) issues.push([r.page, `TITLE_TOO_LONG(${r.titleLen})`]);
  if (!r.desc) issues.push([r.page, 'MISSING_DESCRIPTION']);
  if (r.descLen < 80 || r.descLen > 170) issues.push([r.page, `DESC_LENGTH(${r.descLen})`]);
  if (!r.canonical) issues.push([r.page, 'MISSING_CANONICAL']);
  if (r.h1Count !== 1) issues.push([r.page, `H1_COUNT(${r.h1Count})`]);
  if (!r.ogTitle || !r.ogDesc || !r.ogImage) issues.push([r.page, 'MISSING_OG_TAGS']);
  if (!r.twitterCard) issues.push([r.page, 'MISSING_TWITTER_TAGS']);
}

console.log('=== SEO AUDIT SUMMARY ===');
console.log(`Pages scanned: ${results.length}`);
if (dupTitles.length) {
  console.log('\nDuplicate Titles:');
  for (const [t, pages] of dupTitles) console.log('-', t, '->', pages.join(', '));
}
if (dupDescs.length) {
  console.log('\nDuplicate Descriptions:');
  for (const [d, pages] of dupDescs) console.log('-', d, '->', pages.join(', '));
}
if (issues.length) {
  console.log('\nIssues:');
  for (const [p, i] of issues) console.log('-', p, ':', i);
} else {
  console.log('\nNo issues detected by static audit.');
}

console.log('\nDetail JSON:');
console.log(JSON.stringify(results, null, 2));
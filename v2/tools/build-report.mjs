#!/usr/bin/env node
// build-report.mjs
//
// What it does
//   Builds one page, v2/report/index.html, that says where the V2 direction stands. Every number on the page is
//   read from a file a tool wrote; nothing is typed by hand. A missing input is shown as "not run yet" and an
//   unreadable one as "could not be read"; neither stops the build.
//
// Inputs (all relative to the repository root)
//   v2/figma/*.txt (through v2/tools/lib/snapshot.mjs) and v2/figma/*.hashes.txt
//   v2/report/data/contrast-as-given.json   this script runs v2/tools/audit-contrast.mjs --report-only and copies the result
//   v2/report/data/contrast-merged.json     then runs it with --built --report-only and copies that; the built result
//                                           is the one left in ds-tokens/audit/
//   v2/tools/contrast-pairs.json            the reasons for the exempt pairs
//   ds-tokens/overrides.json, ds-tokens/proposed/tokens.json, ds-tokens/audit/lint.json, ds-tokens/audit/diff.json,
//   ds-tokens/dist/tokens.json, ds-tokens/dist/tokens.css (the page's own colours, type and spacing)
//   ds-components/specs/*.spec.json and ds-components/generated/{spec-index,test-ids,test-report,size-report,tokens-used}.json
//   v2/report/comparison.json, v2/report/growth-map.json, v2/screens/measurements.json
//
// Outputs
//   v2/report/index.html                    one self-contained page (CSS, font and data inline); links to other reports
//   v2/report/data/contrast-*.json          exact copies of the two audit results (they carry the audit's own timestamp)
//   digests/2026-11-16-v2/report-<width>-<theme>.png   four pictures taken by the page check
//
// How to run
//   node v2/tools/build-report.mjs              run both audits, build the page, check it in headless Chromium, save pictures
//   node v2/tools/build-report.mjs --no-check   build the page only
//   node v2/tools/build-report.mjs --self-test  build from a temporary copy of the inputs with one missing and one
//                                               malformed, and confirm the page says so (no audit, no real files touched)
//
// The page is generated: two runs on the same inputs write byte-identical HTML (no dates, stable order).

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, rmSync, mkdtempSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';
import { homedir, tmpdir } from 'node:os';
import { loadSnapshots } from './lib/snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const PICTURES = join(REPO, 'digests', '2026-11-16-v2');
const FONT = join(REPO, 'node_modules', 'geist', 'dist', 'fonts', 'geist-sans', 'Geist-Variable.woff2');
const AXE = join(REPO, 'node_modules', 'axe-core', 'axe.min.js');

// Every input the page reads, by a short key. Paths are relative to the root.
const INPUT = {
  semanticSnapshot: 'v2/figma/semantic.txt',
  primitiveSnapshot: 'v2/figma/primitives.txt',
  semanticHashes: 'v2/figma/semantic.hashes.txt',
  primitiveHashes: 'v2/figma/primitives.hashes.txt',
  asGiven: 'v2/report/data/contrast-as-given.json',
  merged: 'v2/report/data/contrast-merged.json',
  pairs: 'v2/tools/contrast-pairs.json',
  overrides: 'ds-tokens/overrides.json',
  proposed: 'ds-tokens/proposed/tokens.json',
  lint: 'ds-tokens/audit/lint.json',
  diff: 'ds-tokens/audit/diff.json',
  tokens: 'ds-tokens/dist/tokens.json',
  tokensCss: 'ds-tokens/dist/tokens.css',
  specIndex: 'ds-components/generated/spec-index.json',
  testIds: 'ds-components/generated/test-ids.json',
  testReport: 'ds-components/generated/test-report.json',
  sizeReport: 'ds-components/generated/size-report.json',
  tokensUsed: 'ds-components/generated/tokens-used.json',
  comparison: 'v2/report/comparison.json',
  growth: 'v2/report/growth-map.json',
  measurements: 'v2/screens/measurements.json',
};
const SPECS_DIR = 'ds-components/specs';
const OUT = 'v2/report/index.html';
const LINKS = {
  contrastHtml: 'ds-tokens/audit/contrast.html',
  patchList: 'ds-tokens/audit/figma-patch-list.md',
};

// ---------------------------------------------------------------------------------------------
// Reading inputs. Every read is recorded so section 8 can list what was missing or unreadable.

function makeReader(root) {
  const seen = new Map(); // path -> { status: 'ok' | 'missing' | 'unreadable', detail }
  const note = (path, status, detail = '') => { if (!seen.has(path) || status !== 'ok') seen.set(path, { status, detail }); };
  function text(path) {
    const file = join(root, path);
    if (!existsSync(file)) { note(path, 'missing'); return null; }
    try { const t = readFileSync(file, 'utf8'); note(path, 'ok'); return t; }
    catch (e) { note(path, 'unreadable', e.message.split('\n')[0]); return null; }
  }
  function json(path) {
    const t = text(path);
    if (t === null) return null;
    try { return JSON.parse(t); }
    catch (e) { note(path, 'unreadable', `not valid JSON (${e.message.split('\n')[0]})`); return null; }
  }
  // A JSON input that must have a given shape; a wrong shape counts as unreadable.
  function shaped(path, test, what) {
    const j = json(path);
    if (j === null) return null;
    let ok = false;
    try { ok = !!test(j); } catch { ok = false; }
    if (!ok) { note(path, 'unreadable', `does not have the expected shape (${what})`); return null; }
    return j;
  }
  const status = (path) => seen.get(path) || { status: 'missing' };
  return { root, text, json, shaped, status, seen, note };
}

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const arr = (x) => (Array.isArray(x) ? x : []);

// ---------------------------------------------------------------------------------------------
// Gathering every number the page shows into one object.

function gather(root, audits) {
  const R = makeReader(root);
  const d = { R, audits };

  // Figma snapshot, through the one parser.
  R.text(INPUT.semanticSnapshot); R.text(INPUT.primitiveSnapshot);
  if (R.status(INPUT.semanticSnapshot).status === 'ok' && R.status(INPUT.primitiveSnapshot).status === 'ok') {
    try {
      const snap = loadSnapshots(join(root, 'v2', 'figma'));
      const count = (cols) => cols.reduce((s, c) => s + c.variables.length, 0);
      d.snapshot = { semantic: count(snap.semantic), primitive: count(snap.primitives), semanticCollections: snap.semantic.length, primitiveCollections: snap.primitives.length };
      d.primitiveHex = new Map();
      for (const c of snap.primitives) for (const v of c.variables) if (v.type === 'color') d.primitiveHex.set(v.name, String(v.values[0]));
    } catch (e) {
      R.note(INPUT.semanticSnapshot, 'unreadable', `the snapshot parser stopped: ${e.message.split('\n')[0]}`);
    }
  }
  d.primitiveHex = d.primitiveHex || new Map();
  d.hashes = {};
  for (const k of ['semanticHashes', 'primitiveHashes']) {
    const t = R.text(INPUT[k]);
    if (t === null) continue;
    const lines = t.split('\n').filter((l) => l.trim());
    const total = (lines[0] || '').match(/^total (\d+) ([0-9a-f]+)$/);
    if (!total) { R.note(INPUT[k], 'unreadable', 'the first line is not "total <lines> <checksum>"'); continue; }
    d.hashes[k] = { lines: Number(total[1]), checksum: total[2], chunks: lines.length - 1 };
  }

  const auditShape = (j) => isObj(j.counts) && Array.isArray(j.totals) && Array.isArray(j.pairs);
  d.asGiven = R.shaped(INPUT.asGiven, auditShape, 'counts, totals and pairs');
  d.merged = R.shaped(INPUT.merged, auditShape, 'counts, totals and pairs');
  d.pairs = R.shaped(INPUT.pairs, (j) => Array.isArray(j.rules), 'a rules list');
  d.overrides = R.shaped(INPUT.overrides, Array.isArray, 'an array');
  d.proposed = R.shaped(INPUT.proposed, Array.isArray, 'an array');
  d.lint = R.shaped(INPUT.lint, (j) => Array.isArray(j.findings) && isObj(j.counts), 'findings and counts');
  d.diff = R.shaped(INPUT.diff, (j) => typeof j.agree === 'number' && typeof j.total === 'number', 'agree and total');
  d.tokens = R.shaped(INPUT.tokens, Array.isArray, 'a flat array');
  d.tokensCss = R.text(INPUT.tokensCss);
  d.specIndex = R.shaped(INPUT.specIndex, (j) => Array.isArray(j.specs), 'a specs list');
  d.testIds = R.shaped(INPUT.testIds, (j) => Array.isArray(j.tests), 'a tests list');
  d.testReport = R.shaped(INPUT.testReport, (j) => isObj(j.summary) && Array.isArray(j.checks), 'summary and checks');
  d.sizeReport = R.shaped(INPUT.sizeReport, (j) => Array.isArray(j.components), 'a components list');
  d.tokensUsed = R.shaped(INPUT.tokensUsed, (j) => isObj(j.components), 'a components map');
  d.comparison = R.shaped(INPUT.comparison, (j) => Array.isArray(j.rows), 'a rows list');
  d.growth = R.shaped(INPUT.growth, (j) => Array.isArray(j.lanes) && Array.isArray(j.horizons), 'lanes and horizons');
  d.measurements = R.json(INPUT.measurements);

  // Component specs, one file each.
  d.specs = [];
  const specDir = join(root, SPECS_DIR);
  const files = existsSync(specDir) ? readdirSync(specDir).filter((f) => f.endsWith('.spec.json')).sort() : [];
  if (!files.length) R.note(`${SPECS_DIR}/*.spec.json`, 'missing');
  for (const f of files) {
    const path = `${SPECS_DIR}/${f}`;
    const s = R.shaped(path, (j) => typeof j.slug === 'string' && isObj(j.anatomy), 'a slug and an anatomy');
    d.specs.push({ file: f, path, spec: s, slug: s ? s.slug : f.replace(/\.spec\.json$/, '') });
  }
  return d;
}

// ---------------------------------------------------------------------------------------------
// Small HTML helpers

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const code = (s) => `<code>${esc(s)}</code>`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-GB') : esc(n));
const ratio = (r) => (typeof r === 'number' ? `${r.toFixed(2)} to 1` : 'not measured');

// The link from v2/report/index.html to a repository path; marked when the file does not exist.
function link(root, path, label, query = '') {
  const there = existsSync(join(root, path));
  const href = `../../${path}${query}`;
  return there ? `<a href="${esc(href)}">${esc(label)}</a>` : `${esc(label)} <span class="muted">(${code(path)} does not exist yet)</span>`;
}

// A table inside its own horizontal scroller, so a wide table never pushes the page sideways.
function table(label, head, rows, { cls = '' } = {}) {
  const th = head.map((h) => `<th scope="col">${h}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('\n');
  return `<div class="scroll" role="region" aria-label="${esc(label)}" tabindex="0"><table class="${cls}"><thead><tr>${th}</tr></thead><tbody>\n${body}\n</tbody></table></div>`;
}

// A table that becomes one card per row on a narrow screen. Each cell carries its column name.
function cardTable(label, head, rows) {
  const th = head.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row" data-label="${esc(head[i])}">${c}</th>` : `<td data-label="${esc(head[i])}">${c}</td>`)).join('')}</tr>`).join('\n');
  return `<div class="cards-wrap" role="region" aria-label="${esc(label)}" tabindex="0"><table class="cards"><thead><tr>${th}</tr></thead><tbody>\n${body}\n</tbody></table></div>`;
}

// What to say for an input that is not there or could not be read.
function absent(R, path) {
  const s = R.status(path);
  if (s.status === 'unreadable') return `<p class="absent"><strong>Could not be read.</strong> ${code(path)} ${esc(s.detail)}.</p>`;
  return `<p class="absent"><strong>Not run yet.</strong> ${code(path)} does not exist.</p>`;
}
const absentShort = (R, path) => (R.status(path).status === 'unreadable' ? 'could not be read' : 'not run yet');

function section(id, title, lead, body) {
  return `<section id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${esc(title)}</h2>\n<p class="lead">${lead}</p>\n${body}\n</section>`;
}

// ---------------------------------------------------------------------------------------------
// Section 1: where things stand

function figures(d) {
  const { R } = d;
  const out = [];
  const add = (value, label, sources, ok = true) => out.push({ value: String(value), label, sources, ok });
  if (d.snapshot) add(fmt(d.snapshot.semantic + d.snapshot.primitive), `variables in the Figma snapshot: ${d.snapshot.semantic} semantic in ${d.snapshot.semanticCollections} collections, ${d.snapshot.primitive} primitive in ${d.snapshot.primitiveCollections}${d.hashes.semanticHashes && d.hashes.primitiveHashes ? `, each file with a checksum list (${d.hashes.semanticHashes.checksum}, ${d.hashes.primitiveHashes.checksum})` : ''}`, [INPUT.semanticSnapshot, INPUT.primitiveSnapshot, INPUT.semanticHashes, INPUT.primitiveHashes]);
  else add(absentShort(R, INPUT.semanticSnapshot), 'Figma snapshot', [INPUT.semanticSnapshot], false);
  if (d.asGiven) add(fmt(d.asGiven.counts.fail), `colour pairs fail WCAG contrast as Figma stands, of ${fmt(d.asGiven.counts.pass + d.asGiven.counts.fail)} scored${d.asGiven.counts.missing_names ? ` (and ${plural(d.asGiven.counts.missing_names, 'declared name')} Figma lacks)` : ''}`, [INPUT.asGiven]);
  else add(absentShort(R, INPUT.asGiven), 'contrast audit of Figma as it stands', [INPUT.asGiven], false);
  if (d.merged) add(fmt(d.merged.counts.fail), `colour pairs fail with the repo's fixes, of ${fmt(d.merged.counts.pass + d.merged.counts.fail)} scored`, [INPUT.merged]);
  else add(absentShort(R, INPUT.merged), 'contrast audit with the fixes', [INPUT.merged], false);
  if (d.overrides) add(fmt(d.overrides.length), 'fixes held in the repo until Figma has them, each with its reason', [INPUT.overrides]);
  else add(absentShort(R, INPUT.overrides), 'fixes held in the repo', [INPUT.overrides], false);
  if (d.proposed) add(fmt(d.proposed.length), 'tokens proposed that Figma does not have yet', [INPUT.proposed]);
  else add(absentShort(R, INPUT.proposed), 'proposed tokens', [INPUT.proposed], false);
  if (d.lint) add(fmt(d.lint.findings.length), `naming findings; ${d.lint.counts.breaksTheStandard ?? '?'} break the standard, ${d.lint.counts.decide ?? '?'} need a decision`, [INPUT.lint]);
  else add(absentShort(R, INPUT.lint), 'naming lint', [INPUT.lint], false);
  if (d.diff) add(`${fmt(d.diff.agree)} of ${fmt(d.diff.total)}`, `Figma tokens agree with code in every mode${d.diff.counts && typeof d.diff.counts.intendedOverrides === 'number' ? `; the rest differ by the ${d.diff.counts.intendedOverrides} intended fixes` : ''}`, [INPUT.diff]);
  else add(absentShort(R, INPUT.diff), 'Figma and code agreement', [INPUT.diff], false);
  const specCount = d.specs.filter((s) => s.spec).length;
  if (d.testReport) { const s = d.testReport.summary; add(s.passed === 0 && s.failed === 0 ? 'not run' : `${fmt(s.passed)} of ${fmt(s.checks)}`, s.passed === 0 && s.failed === 0 ? `component tests: the last run passed none, failed none and reports all ${plural(s.checks, 'check')} as not reached or not run, across ${plural(specCount, 'spec')}` : `component checks pass (${s.failed} fail, ${s.notRun} not reached or not run) across ${plural(specCount, 'spec')}`, [INPUT.testReport, `${SPECS_DIR}/*.spec.json`]); }
  else add(absentShort(R, INPUT.testReport), `component tests for ${plural(specCount, 'spec')}${d.testIds ? ` and ${d.testIds.tests.length} named tests` : ''}`, [INPUT.testReport, `${SPECS_DIR}/*.spec.json`, INPUT.testIds], false);
  return out;
}

function sectionStand(d, figs) {
  const cells = figs.map((f) => `<li class="fig${f.ok ? '' : ' fig-absent'}" title="From ${esc(f.sources.join(', '))}"><span class="fig-value">${esc(f.value)}</span><span class="fig-label">${esc(f.label)}</span><span class="fig-src">${f.sources.map(code).join(' ')}</span></li>`).join('\n');
  const missing = figs.filter((f) => !f.ok).length;
  const lead = d.merged && d.asGiven
    ? `As Figma stands, ${fmt(d.asGiven.counts.fail)} colour pairs fail contrast; with the ${d.overrides ? d.overrides.length : 'repo\'s'} fixes held in the repo, ${fmt(d.merged.counts.fail)} do${missing ? `; ${plural(missing, 'figure')} below ${missing === 1 ? 'is' : 'are'} not available yet` : ''}.`
    : `Some of the audits behind this page have not run yet, so ${plural(missing, 'figure')} below ${missing === 1 ? 'is' : 'are'} shown as not available.`;
  let measured = '';
  const ms = d.R.status(INPUT.measurements);
  if (ms.status === 'ok' && d.measurements !== null) {
    const m = d.measurements;
    const pages = arr(m && m.pages);
    if (isObj(m) && pages.length) {
      // One row per variant: the screens measured at 375 wide and what failed, summed over screens and themes.
      const variants = arr(m.variants).length ? arr(m.variants) : [...new Set(pages.map((p) => p.variant))].map((id) => ({ id, label: id }));
      const sum = (list, k) => list.reduce((s, p) => s + (typeof p[k] === 'number' ? p[k] : 0), 0);
      const rows = variants.map((v) => {
        const mine = pages.filter((p) => p.variant === v.id);
        return [esc(v.label || v.id), fmt(mine.length), fmt(sum(mine, 'textNodes')), fmt(sum(mine, 'textFails')), fmt(sum(mine, 'controls')), fmt(sum(mine, 'controlEdgeFails')), fmt(mine.filter((p) => p.overflow === true).length)];
      });
      measured = `<h3>Screens measured</h3><p>The screens ${[...new Set(pages.map((p) => p.screen))].map(code).join(', ')} were measured in ${plural(variants.length, 'direction')}, in ${[...new Set(pages.map((p) => p.theme))].join(' and ')};${fmt(sum(pages, 'textFails'))} text runs and ${fmt(sum(pages, 'controlEdgeFails'))} control edges fail across ${plural(pages.length, 'page')}.</p>${table('Screen measurements by direction', ['Direction', 'Pages', 'Text runs', 'Text fails', 'Controls', 'Edge fails', 'Pages that scroll sideways'], rows, { cls: 'num' })}<p class="src">From ${code(INPUT.measurements)}.</p>`;
    } else {
      measured = `<p>${code(INPUT.measurements)} exists but has no list of measured pages, so nothing from it is shown.</p>`;
    }
  }
  return section('stand', 'Where things stand', lead, `<ul class="figs">\n${cells}\n</ul>${measured}`);
}

// ---------------------------------------------------------------------------------------------
// Section 2: the two directions and the merged one

function sectionCompare(d) {
  if (!d.comparison) return section('compare', 'The two directions and the merged one', 'The comparison of the two directions is not available.', absent(d.R, INPUT.comparison));
  const label = { v2: 'V2', v02: 'Version 0.2', both: 'Both' };
  const rows = d.comparison.rows.map((r) => [esc(r.topic), esc(r.v02), esc(r.v2), esc(label[r.stronger] || r.stronger), esc(r.merged), esc(r.why)]);
  const n = (k) => d.comparison.rows.filter((r) => r.stronger === k).length;
  const lead = `Across ${plural(d.comparison.rows.length, 'topic')}, V2 is stronger on ${n('v2')}, version 0.2 on ${n('v02')} and both on ${n('both')}; the merged direction keeps the stronger side of each.`;
  return section('compare', 'The two directions and the merged one', lead, `${cardTable('Comparison of version 0.2, V2 as given and the merged direction', ['Topic', 'Version 0.2', 'V2 as given', 'Stronger', 'Merged', 'Why'], rows)}\n<p class="src">From ${code(INPUT.comparison)}.</p>`);
}

// ---------------------------------------------------------------------------------------------
// Section 3: token audit

const FAMILIES = [
  ['Links', (t) => t.startsWith('text/link/')],
  ['Accent text', (t) => t.startsWith('text/accent/')],
  ['Accent icons', (t) => t.startsWith('icon/accent/')],
  ['Surfaces', (t) => t.startsWith('surface/')],
  ['Interactive fills', (t) => t.startsWith('interactive/')],
  ['Text', (t) => t.startsWith('text/')],
  ['Status icons and borders', () => true],
];
const familyOf = (token) => FAMILIES.find(([, f]) => f(token))[0];

function ruleTotals(audit) {
  const by = new Map();
  for (const t of arr(audit && audit.totals)) {
    const r = by.get(t.rule) || { pairs: 0, passes: 0, fails: 0, exempt: t.exempt, worst: Infinity };
    r.pairs += t.pairs; r.passes += t.passes; r.fails += t.fails;
    if (typeof t.worst_ratio === 'number') r.worst = Math.min(r.worst, t.worst_ratio);
    by.set(t.rule, r);
  }
  return by;
}

// The pair a fix is judged by: the lowest ratio in the merged audit where the token is the foreground, else the background.
function judgingPair(merged, token, mode) {
  const rows = arr(merged && merged.pairs).filter((p) => p.mode === mode && p.fg === token);
  const pool = rows.length ? rows : arr(merged && merged.pairs).filter((p) => p.mode === mode && p.bg === token);
  return pool.reduce((w, p) => (!w || p.ratio < w.ratio ? p : w), null);
}

function swatch(fgHex, bgHex, r, isText, caption) {
  // A sample whose text is below 4.5 to 1 is shown on purpose; it is marked so the page check skips it.
  const mark = isText && !(r >= 4.5) ? ' data-sample="fails-on-purpose"' : '';
  const inner = isText ? `<span class="sample-text" style="color:${esc(fgHex)}">Aa</span>` : `<span class="sample-dot" style="background:${esc(fgHex)}"></span>`;
  return `<div class="sw"><div class="sample" style="background:${esc(bgHex)}"${mark} role="img" aria-label="${esc(caption)}">${inner}</div><div class="sw-cap">${esc(caption)}</div></div>`;
}

function sectionAudit(d) {
  const { R } = d;
  const parts = [];
  const gv = ruleTotals(d.asGiven), mg = ruleTotals(d.merged);
  const ruleIds = [...new Set([...arr(d.pairs && d.pairs.rules).map((r) => r.id), ...arr(d.pairs && d.pairs.exempt).map((r) => r.id), ...gv.keys(), ...mg.keys()])];
  const minOf = Object.fromEntries(arr(d.pairs && d.pairs.rules).map((r) => [r.id, r.min]));
  const lead = d.asGiven && d.merged
    ? `As Figma stands, ${fmt(d.asGiven.counts.fail)} of ${fmt(d.asGiven.counts.pass + d.asGiven.counts.fail)} scored pairs fail; with the fixes, ${fmt(d.merged.counts.fail)} of ${fmt(d.merged.counts.pass + d.merged.counts.fail)} fail, and ${fmt(d.merged.counts.exempt)} pairs are measured but exempt.`
    : 'At least one of the two contrast audits has not produced a result, so the comparison below is incomplete.';

  // 3a: every rule, side by side.
  const cell = (m, id) => {
    const t = m.get(id);
    if (!t) return ['-', '-', '-'];
    if (t.exempt) return [fmt(t.pairs), 'exempt', 'exempt'];
    return [fmt(t.pairs), fmt(t.passes), t.fails ? `<strong>${fmt(t.fails)}</strong>` : '0'];
  };
  const ruleRows = ruleIds.map((id) => {
    const a = cell(gv, id), b = cell(mg, id);
    const w = mg.get(id);
    return [code(id), minOf[id] ? `${minOf[id]} to 1` : 'exempt', ...a, ...b, w && Number.isFinite(w.worst) ? w.worst.toFixed(2) : '-'];
  });
  let rulesBlock = `<h3 id="audit-rules">Every rule, as Figma stands and with the fixes</h3>`;
  if (!d.asGiven) rulesBlock += absent(R, INPUT.asGiven);
  if (!d.merged) rulesBlock += absent(R, INPUT.merged);
  rulesBlock += table('Contrast by rule', ['Rule', 'Minimum', 'Figma: pairs', 'Figma: pass', 'Figma: fail', 'Fixed: pairs', 'Fixed: pass', 'Fixed: fail', 'Fixed: lowest ratio'], ruleRows, { cls: 'num' });
  const missing = arr(d.asGiven && d.asGiven.missing);
  const missingNames = [...new Set(missing.map((m) => `${m.token}|${m.rule}`))].map((k) => k.split('|'));
  if (missing.length) rulesBlock += `<p>As Figma stands, ${plural(missing.length, 'declared pair names a token', 'declared pairs name tokens')} Figma does not have, so the audit counts ${missing.length === 1 ? 'it' : 'them'} as failures and does not measure ${missing.length === 1 ? 'it' : 'them'}; that is why the two pair counts differ. The names: ${missingNames.map(([t, r]) => `${code(t)} in ${code(r)}`).join(', ')}.</p>`;
  rulesBlock += `<p class="src">From ${code(INPUT.asGiven)} and ${code(INPUT.merged)}, both written by ${code('v2/tools/audit-contrast.mjs')}. ${link(R.root, LINKS.contrastHtml, 'The full grid of every pair')} shows the run with the fixes.</p>`;
  parts.push(rulesBlock);

  // 3b: the fixes by family.
  let fixBlock = `<h3 id="audit-fixes">The fixes, by token family</h3>`;
  if (!d.overrides) fixBlock += absent(R, INPUT.overrides);
  else {
    const byToken = new Map(arr(d.tokens).map((t) => [`${t.collection}::${t.name}`, t]));
    const groups = new Map(FAMILIES.map(([n]) => [n, []]));
    for (const o of d.overrides) groups.get(familyOf(String(o.token))).push(o);
    const total = [...groups.values()].reduce((s, g) => s + g.length, 0);
    if (total !== d.overrides.length) throw new Error(`the fix families hold ${total} fixes and overrides.json has ${d.overrides.length}`);
    fixBlock += `<p>${[...groups].filter(([, g]) => g.length).map(([n, g]) => `${n}: ${g.length}`).join('; ')}. Each card shows the pair the fix is judged by: the lowest ratio that token is in, before the fix (Figma as it stands) and after it.</p>`;
    if (!d.tokens) fixBlock += absent(R, INPUT.tokens);
    for (const [name, list] of groups) {
      if (!list.length) continue;
      const cards = list.map((o) => {
        const entry = byToken.get(`${o.collection}::${o.token}`) || byToken.get(`Themes::${o.token}`);
        const ov = entry && entry.overridden && entry.overridden[o.mode];
        const from = ov ? ov.from : null;
        const to = o.to;
        const hex = (p) => (p && d.primitiveHex.get(p)) || (typeof p === 'string' && p.startsWith('#') ? p : null);
        const after = judgingPair(d.merged, o.token, o.mode);
        const before = after && arr(d.asGiven && d.asGiven.pairs).find((p) => p.mode === after.mode && p.fg === after.fg && p.bg === after.bg && p.rule === after.rule);
        const isText = after ? after.fg.startsWith('text/') : o.token.startsWith('text/');
        const sw = [
          before ? swatch(before.fg_shown || before.fg_value, before.bg_shown || before.bg_value, before.ratio, isText, `Before: ${ratio(before.ratio)}`) : '',
          after ? swatch(after.fg_shown || after.fg_value, after.bg_shown || after.bg_value, after.ratio, isText, `After: ${ratio(after.ratio)}`) : '',
        ].join('');
        const pairText = after ? `<p class="pair">Judged on ${code(after.fg)} on ${code(after.bg)} (${code(after.rule)}, minimum ${after.min} to 1).</p>` : '<p class="pair">No measured pair names this token.</p>';
        return `<li class="fix"><h4>${code(o.token)} <span class="mode">${esc(o.mode)}</span></h4>
<p class="move">${from ? `${code(from)} <span class="hex">${esc(hex(from) || '')}</span>` : '<span class="muted">old value not recorded</span>'} &#8594; ${code(to)} <span class="hex">${esc(hex(to) || '')}</span></p>
<div class="sws">${sw}</div>${pairText}<p class="why">${esc(o.reason)}</p></li>`;
      }).join('\n');
      fixBlock += `<h4 class="family">${esc(name)} <span class="muted">(${list.length})</span></h4><ul class="fixes">\n${cards}\n</ul>`;
    }
    fixBlock += `<p class="src">From ${code(INPUT.overrides)} (target and reason), ${code(INPUT.tokens)} (old primitive), the Figma snapshot (primitive values) and the two audit copies (ratios).</p>`;
  }
  parts.push(fixBlock);

  // 3c: exempt pairs.
  let exBlock = `<h3 id="audit-exempt">Exempt pairs and why</h3>`;
  if (!d.merged) exBlock += absent(R, INPUT.merged);
  else {
    const why = Object.fromEntries(arr(d.pairs && d.pairs.exempt).map((r) => [r.id, r.why]));
    const groups = new Map();
    for (const e of arr(d.merged.exempt)) { if (!groups.has(e.rule)) groups.set(e.rule, []); groups.get(e.rule).push(e); }
    for (const [rule, list] of groups) {
      const rs = list.map((e) => e.ratio);
      exBlock += `<h4>${code(rule)} <span class="muted">(${plural(list.length, 'pair')}, ${Math.min(...rs).toFixed(2)} to ${Math.max(...rs).toFixed(2)} to 1)</span></h4><p>${esc(why[rule] || 'No reason is recorded in v2/tools/contrast-pairs.json.')}</p>
<details><summary>Every ${esc(rule)} pair</summary>${table(`Exempt pairs: ${rule}`, ['Foreground', 'Background', 'Mode', 'Ratio'], list.map((e) => [code(e.fg), code(e.bg), esc(e.mode), e.ratio.toFixed(2)]), { cls: 'num' })}</details>`;
    }
    exBlock += `<p class="src">From ${code(INPUT.merged)} (ratios) and ${code(INPUT.pairs)} (reasons).</p>`;
  }
  parts.push(exBlock);

  // 3d: pairs that must look different.
  let dBlock = `<h3 id="audit-distinct">Pairs that must look different</h3>`;
  if (!d.merged || !d.merged.distinct) dBlock += absent(R, INPUT.merged);
  else {
    const list = arr(d.merged.distinct.pairs);
    const flaggedNow = list.filter((p) => arr(p.flags).length).length;
    const flaggedBefore = arr(d.asGiven && d.asGiven.distinct && d.asGiven.distinct.pairs).filter((p) => arr(p.flags).length).length;
    dBlock += `<p>With the fixes, ${flaggedNow} of ${list.length} pair-modes are flagged as hard to tell apart${d.asGiven ? `; as Figma stands, ${flaggedBefore} were` : ''}. Delta E is the distance in OKLab; ${esc(d.merged.distinct.$description || '')}</p>`;
    const sims = ['protanopia', 'deuteranopia', 'tritanopia'];
    const chip = (hex, label) => `<span class="chip" style="background:${esc(hex)}" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span>`;
    const rows = list.map((p) => [
      `${code(p.id)}<br><span class="muted">${esc(p.mode)}</span>`,
      `${code(p.a)}<br>${code(p.b)}`,
      `<span class="chips">${chip(p.a_value, `${p.a} ${p.a_value}`)}${chip(p.b_value, `${p.b} ${p.b_value}`)}</span> ${Number(p.delta_e_ok).toFixed(3)}`,
      ...sims.map((s) => { const x = p.simulated && p.simulated[s]; return x ? `<span class="chips">${chip(x.a_shown, `${p.a} under ${s}`)}${chip(x.b_shown, `${p.b} under ${s}`)}</span> ${Number(x.delta_e_ok).toFixed(3)}` : '-'; }),
      typeof p.hue_distance === 'number' ? `${p.hue_distance.toFixed(1)}&#176;` : '-',
      arr(p.flags).length ? `<strong>${esc(p.flags.join(', '))}</strong>` : 'distinct',
    ]);
    dBlock += table('Pairs that must look different', ['Pair', 'Tokens', 'Normal: chips, delta E', 'Protanopia', 'Deuteranopia', 'Tritanopia', 'Hue distance', 'Result'], rows);
    const reasons = [...new Map(list.map((p) => [p.id, p.why])).entries()];
    dBlock += `<details><summary>Why each pair must look different</summary><ul>${reasons.map(([id, w]) => `<li>${code(id)}: ${esc(w)}</li>`).join('')}</ul></details>`;
  }
  parts.push(dBlock);
  return section('audit', 'Token audit', lead, parts.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// Section 4: naming

function sectionNaming(d) {
  const { R } = d;
  if (!d.lint) return section('naming', 'Naming', 'The naming lint result is not available.', absent(R, INPUT.lint));
  const order = Object.keys(d.lint.severities || {});
  const sev = [...new Set([...order, ...d.lint.findings.map((f) => f.severity)])];
  const blocks = sev.map((s) => {
    const list = d.lint.findings.filter((f) => f.severity === s);
    if (!list.length) return '';
    const names = list.reduce((n, f) => n + (typeof f.count === 'number' ? f.count : arr(f.tokens).length), 0);
    const ex = list.slice(0, 3).map((f) => `<li>${code(f.rule)}: ${esc(f.message)}${arr(f.tokens).length ? ` For example ${arr(f.tokens).slice(0, 2).map(code).join(', ')}${f.tokens.length > 2 ? `, and ${f.tokens.length - 2} more` : ''}.` : ''}</li>`).join('');
    return `<h3>${esc(s[0].toUpperCase() + s.slice(1))} <span class="muted">(${plural(list.length, 'finding')}, ${plural(names, 'name')})</span></h3><p class="muted-p">${esc(((t) => (t ? `${t[0].toUpperCase()}${t.slice(1)}.` : ''))((d.lint.severities || {})[s]))}</p><ul>${ex}</ul>`;
  }).join('\n');
  const c = d.lint.counts;
  const lead = `The naming lint ran ${plural(c.rules ?? 0, 'rule')} over the Figma snapshot and found ${plural(d.lint.findings.length, 'finding')}: ${c.breaksTheStandard ?? 0} break the written standard, ${c.decide ?? 0} need a person to decide and ${c.notes ?? 0} are notes.`;
  return section('naming', 'Naming', lead, `${blocks}\n<p>${link(R.root, LINKS.patchList, 'The list of changes to make by hand in Figma')}.</p><p class="src">From ${code(INPUT.lint)}, written by ${code(d.lint.tool || 'v2/tools/lint-tokens.mjs')}.</p>`);
}

// ---------------------------------------------------------------------------------------------
// Section 5: proposed tokens

function sectionProposed(d) {
  const { R } = d;
  if (!d.proposed) return section('proposed', 'Proposed tokens', 'The list of proposed tokens is not available.', absent(R, INPUT.proposed));
  const built = new Map(arr(d.tokens).filter((t) => t.proposed).map((t) => [`${t.collection}::${t.name}`, t]));
  const rows = d.proposed.map((p) => {
    const b = built.get(`${p.collection}::${p.name}`);
    const values = b ? b.values : p.values;
    const v = isObj(values) ? Object.entries(values).map(([m, x]) => (Object.keys(values).length > 1 ? `${esc(m)}: ${code(x)}` : code(x))).join('<br>') : '-';
    return [`${code(`${p.collection}/${p.name}`)}${b ? `<br>${code(b.cssVar)}` : ''}`, v, esc(p.why || p.description || '')];
  });
  const cols = [...new Set(d.proposed.map((p) => p.collection))];
  const lead = `${plural(d.proposed.length, 'token')} that the ${plural(d.specs.length, 'specified component')} need and Figma does not hold are proposed in the repo, in ${plural(cols.length, 'collection')} (${cols.join(', ')}); each says why.`;
  return section('proposed', 'Proposed tokens', lead, `${table('Table of proposed tokens', ['Token', 'Value', 'Why'], rows)}<p class="src">From ${code(INPUT.proposed)}; values as built in ${code(INPUT.tokens)}${d.tokens ? '' : ' (not available, so the values are as written in the proposal)'}.</p>`);
}

// ---------------------------------------------------------------------------------------------
// Section 6: components

const HOW = ['test', 'axe', 'lint', 'type', 'manual'];

function sectionComponents(d) {
  const { R } = d;
  if (!d.specs.length) return section('components', 'Components', 'No component specs were found.', absent(R, `${SPECS_DIR}/*.spec.json`));
  const blocks = d.specs.map(({ spec: s, path, slug, file }) => {
    if (!s) return `<article class="comp" id="c-${esc(slug)}"><h3>${esc(slug)}</h3>${absent(R, path)}</article>`;
    const reqs = arr(s.requirements);
    const byHow = Object.fromEntries(HOW.map((h) => [h, reqs.filter((r) => String(r.check).split(':')[0] === h).length]));
    const other = reqs.length - HOW.reduce((n, h) => n + byHow[h], 0);
    const idx = d.specIndex && d.specIndex.specs.find((x) => x.slug === slug);
    const counts = `<ul class="counts"><li><span>${Object.keys(s.anatomy).length}</span> parts</li><li><span>${Object.keys(s.props || {}).length}</span> props</li><li><span>${Object.keys(s.states || {}).length}</span> states</li><li><span>${reqs.length}</span> requirements: ${HOW.map((h) => `${byHow[h]} ${h}`).join(', ')}${other ? `, ${other} other` : ''}</li></ul>`;
    const check = idx ? `<p>Spec check: ${idx.valid ? 'follows the schema' : '<strong>does not follow the schema</strong>'}, ${plural(idx.errors, 'error')}, ${plural(idx.warnings, 'warning')}.</p>` : `<p>Spec check: ${absentShort(R, INPUT.specIndex)}.</p>`;
    const stateRows = Object.entries(s.states || {}).map(([name, st]) => [code(name), code(st.on), code(st.selector), `${esc(st.source)}${st.reach ? `, ${code(st.reach)}` : ''}`, st.figma ? code(`${st.figma.property}=${st.figma.value}`) : '<span class="muted">none</span>']);
    const stateTable = stateRows.length ? table(`${s.name} state map`, ['State', 'Part', 'Selector', 'Set by', 'Figma value'], stateRows) : '<p>No states.</p>';
    // Test results
    let tests;
    if (!d.testReport) tests = `<p>Test results: ${absentShort(R, INPUT.testReport)}.</p>`;
    else {
      const mine = d.testReport.checks.filter((c) => c.component === slug);
      const n = (st) => mine.filter((c) => c.status === st).length;
      tests = mine.length ? `<p>Test results: ${n('pass')} passed, ${n('fail')} failed, ${n('not-reached')} not reached, ${n('not-run')} not run (of ${plural(mine.length, 'check')}).${mine.length <= 2 && n('pass') + n('fail') === 0 ? ` ${mine.map((c) => esc(c.detail)).join(' ')}` : ''}</p>` : '<p>Test results: the last test run has no checks for this component.</p>';
      const fails = mine.filter((c) => c.status === 'fail');
      if (fails.length) tests += `<details><summary>${plural(fails.length, 'failing check')}</summary><ul>${fails.map((c) => `<li>${code(c.check)}${c.example ? ` ${esc(c.example)}` : ''}${c.config ? ` (${esc(c.config)})` : ''}: ${esc(c.detail)}</li>`).join('')}</ul></details>`;
    }
    let size;
    const sr = d.sizeReport && d.sizeReport.components.find((c) => c.component === slug);
    if (!d.sizeReport) size = `<p>Size: ${absentShort(R, INPUT.sizeReport)}.</p>`;
    else if (!sr) size = '<p>Size: not in the size report.</p>';
    else if (sr.status !== 'measured') size = `<p>Size: ${esc(sr.status)}${sr.error ? ` (${esc(sr.error)})` : ''}.</p>`;
    else size = `<p>Size, gzipped: CSS ${fmt(sr.cssBytes)} bytes (${esc(sr.css)} the ${fmt(d.sizeReport.rows && d.sizeReport.rows.cssBytesPerComponent)} row); JavaScript ${fmt(sr.jsOwnBytes)} bytes of its own (${esc(sr.jsOwn)}), ${fmt(sr.jsWithRadixBytes)} with Radix.</p>`;
    const used = d.tokensUsed && d.tokensUsed.components[slug];
    const tok = used ? `<p>Tokens used: ${arr(used).length}, of which ${arr(used).filter((t) => t.origin === 'proposed').length} proposed.</p>` : '';
    const links = `<p class="links">${link(R.root, path, 'Spec')} &#183; ${link(R.root, `ds-components/docs/${slug}.md`, 'Reference page')} &#183; ${link(R.root, 'ds-components/gallery/dist/index.html', 'Gallery page', `?component=${encodeURIComponent(slug)}`)}</p>`;
    return `<article class="comp" id="c-${esc(slug)}" aria-labelledby="c-${esc(slug)}-h"><h3 id="c-${esc(slug)}-h">${esc(s.name || slug)} <span class="stage">${esc(s.stage || 'no stage')}</span></h3>
<p>${esc(s.summary || '')}</p>${counts}${check}<h4>State map</h4>${stateTable}${tests}${size}${tok}${links}</article>`;
  }).join('\n');
  const stages = [...new Set(d.specs.filter((x) => x.spec).map((x) => x.spec.stage))];
  const total = d.specs.reduce((n, x) => n + arr(x.spec && x.spec.requirements).length, 0);
  const manual = d.specs.reduce((n, x) => n + arr(x.spec && x.spec.requirements).filter((r) => String(r.check).startsWith('manual')).length, 0);
  const lead = `${plural(d.specs.length, 'component')} have a spec, all at stage ${stages.join(' or ')}, with ${total} requirements of which ${manual} can only be checked by hand; ${d.testReport ? `the last test run reports ${d.testReport.summary.passed} passed, ${d.testReport.summary.failed} failed and ${d.testReport.summary.notRun} not reached or not run` : 'no component test run has reported yet'}.`;
  return section('components', 'Components', lead, `${blocks}\n<p class="src">From ${code(`${SPECS_DIR}/*.spec.json`)} and ${['specIndex', 'testReport', 'sizeReport', 'tokensUsed'].map((k) => code(INPUT[k])).join(', ')}.</p>`);
}

// ---------------------------------------------------------------------------------------------
// Section 7: growth

function sectionGrowth(d) {
  const { R } = d;
  if (!d.growth) return section('growth', 'What it can grow into', 'The growth map is not available.', absent(R, INPUT.growth));
  const hz = d.growth.horizons;
  const lanes = d.growth.lanes.map((l) => {
    const cols = hz.map((h) => {
      const items = arr(l.items).filter((i) => i.horizon === h);
      return `<div class="hz"><h4>${esc(h[0].toUpperCase() + h.slice(1))}</h4>${items.length ? `<ul>${items.map((i) => `<li><strong>${esc(i.name)}</strong> ${esc(i.detail)}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</div>`;
    }).join('');
    return `<section class="lane" aria-label="Growth lane: ${esc(l.lane)}"><div class="lane-head"><h3>${esc(l.lane)}</h3><p class="muted-p">${esc(l.why || '')}</p></div>${cols}</section>`;
  }).join('\n');
  const count = (h) => d.growth.lanes.reduce((n, l) => n + arr(l.items).filter((i) => i.horizon === h).length, 0);
  const lead = `The growth map has ${plural(d.growth.lanes.length, 'lane')} and ${hz.map((h) => `${count(h)} items ${h}`).join(', ')}; ${esc(String(d.growth.$description || '').split('.').slice(1, 2).join('').trim() || 'each horizon is defined in the source file')}.`;
  return section('growth', 'What it can grow into', lead, `<div class="growth">${lanes}</div><p class="src">From ${code(INPUT.growth)}.</p>`);
}

// ---------------------------------------------------------------------------------------------
// Section 8: what is not proven

function sectionUnproven(d) {
  const items = [];
  for (const { spec: s } of d.specs) {
    if (!s) continue;
    for (const r of arr(s.requirements).filter((r) => String(r.check).startsWith('manual'))) items.push(`${esc(s.name)}: ${esc(r.text)} <span class="muted">(${code(r.id)}, checked by hand only)</span>`);
  }
  const manualCount = items.length;
  if (d.testReport) {
    const nr = d.testReport.checks.filter((c) => c.status === 'not-reached' || c.status === 'not-run');
    for (const c of nr) items.push(`${esc(c.component)}: ${code(c.check)}${c.requirement ? ` ${code(c.requirement)}` : ''} was ${c.status === 'not-run' ? 'not run' : 'not reached'}: ${esc(c.detail)}`);
  } else items.push(`No component test has run: ${code(INPUT.testReport)} ${R(d).status(INPUT.testReport).status === 'unreadable' ? 'could not be read' : 'does not exist'}.`);
  if (d.sizeReport) for (const c of d.sizeReport.components.filter((c) => c.status !== 'measured')) items.push(`${esc(c.component)}: size not measured (${esc(c.status)}).`);
  for (const [k, a] of Object.entries(d.audits || {})) if (!a.ok) items.push(`The contrast audit ${k === 'asGiven' ? 'of Figma as it stands' : 'with the fixes'} did not run: ${esc(a.detail)}`);
  const inputs = [...d.R.seen].filter(([, s]) => s.status !== 'ok').sort(([a], [b]) => a.localeCompare(b));
  for (const [p, s] of inputs) items.push(`Input ${code(p)} ${s.status === 'missing' ? 'does not exist yet' : `could not be read: ${esc(s.detail)}`}.`);
  items.push('Nothing here was tested with people, a screen reader or a real phone.');
  items.push('Only Chromium was used.');
  const lead = `${plural(items.length, 'thing')} on this page ${items.length === 1 ? 'is' : 'are'} not proven, including ${plural(manualCount, 'requirement')} only a person can check and ${plural(inputs.length, 'input')} that ${inputs.length === 1 ? 'is' : 'are'} missing or unreadable.`;
  return section('unproven', 'What is not proven', lead, `<ul class="unproven">${items.map((i) => `<li>${i}</li>`).join('\n')}</ul>`);
}
const R = (d) => d.R;

// ---------------------------------------------------------------------------------------------
// The page

const CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--color-surface-primary);color:var(--color-text-primary);font-family:var(--font-family-sans);font-size:var(--font-size-body-large);line-height:var(--line-height-body-large);font-weight:400}
.wrap{max-width:72rem;margin:0 auto;padding:var(--spacing-static-240) var(--spacing-static-160) var(--spacing-static-400)}
header.top{display:flex;flex-wrap:wrap;gap:var(--spacing-static-160);align-items:flex-end;justify-content:space-between;border-bottom:var(--border-width-sm) solid var(--color-border-primary);padding-bottom:var(--spacing-static-160)}
h1{font-size:var(--font-size-heading-3);line-height:var(--line-height-heading-3);font-weight:var(--font-weight-heading);margin:0}
h2{font-size:var(--font-size-heading-4);line-height:var(--line-height-heading-4);font-weight:var(--font-weight-heading);margin:var(--spacing-static-400) 0 var(--spacing-static-80);padding-top:var(--spacing-static-160);border-top:var(--border-width-sm) solid var(--color-border-primary)}
h3{font-size:var(--font-size-heading-5);line-height:var(--line-height-heading-5);font-weight:var(--font-weight-heading);margin:var(--spacing-static-320) 0 var(--spacing-static-80)}
h4{font-size:var(--font-size-heading-6);line-height:var(--line-height-heading-6);font-weight:var(--font-weight-label);margin:var(--spacing-static-200) 0 var(--spacing-static-60)}
p,ul{margin:0 0 var(--spacing-static-120)}
ul{padding-left:var(--spacing-static-200)}
a{color:var(--color-text-link);text-underline-offset:0.15em}
a:hover{color:var(--color-text-link-hover)}
:focus-visible{outline:var(--border-ring-width) solid var(--color-border-focus);outline-offset:var(--border-ring-offset)}
code{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:0.875em;overflow-wrap:anywhere;word-break:break-word}
.scroll code{overflow-wrap:normal;word-break:normal}
.num tbody th code{white-space:nowrap}
.sub{color:var(--color-text-secondary);margin:var(--spacing-static-40) 0 0}
.lead{font-size:var(--font-size-heading-6);line-height:var(--line-height-heading-6);font-weight:var(--font-weight-label);max-width:48rem}
.muted,.muted-p,.src{color:var(--color-text-secondary)}
.src{font-size:var(--font-size-body-base);line-height:var(--line-height-body-base)}
.theme{display:flex;gap:0;border:var(--border-width-sm) solid var(--color-border-strong);border-radius:var(--radius-height-40);overflow:hidden}
.theme button{font:inherit;font-size:var(--font-size-label-base);font-weight:var(--font-weight-label);min-height:var(--size-control-md);min-width:var(--size-target-min);padding:0 var(--spacing-static-120);background:var(--color-surface-primary);color:var(--color-text-primary);border:0;border-left:var(--border-width-sm) solid var(--color-border-strong);cursor:pointer}
.theme button:first-of-type{border-left:0}
.theme button[aria-pressed="true"]{background:var(--color-interactive-primary);color:var(--color-text-on)}
.theme-label{font-size:var(--font-size-label-base);font-weight:var(--font-weight-label);display:block;margin-bottom:var(--spacing-static-40)}
nav.toc{margin:var(--spacing-static-240) 0 0}
nav.toc ol{margin:0;padding-left:var(--spacing-static-240);columns:2 16rem}
nav.toc li{margin-bottom:var(--spacing-static-40)}
.figs{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:var(--spacing-static-120)}
.fig{background:var(--color-surface-secondary);border:var(--border-width-sm) solid var(--color-border-primary);border-radius:var(--radius-container-medium);padding:var(--spacing-static-160);display:flex;flex-direction:column;gap:var(--spacing-static-60)}
.fig-value{font-size:var(--font-size-heading-3);line-height:var(--line-height-heading-3);font-weight:var(--font-weight-heading);font-variant-numeric:tabular-nums}
.fig-absent .fig-value{font-size:var(--font-size-heading-5);line-height:var(--line-height-heading-5);color:var(--color-text-secondary)}
.fig-src{font-size:var(--font-size-body-small);line-height:var(--line-height-body-small);color:var(--color-text-secondary)}
.scroll,.cards-wrap{overflow-x:auto;max-width:100%;margin:0 0 var(--spacing-static-160);border:var(--border-width-sm) solid var(--color-border-primary);border-radius:var(--radius-container-small)}
table{border-collapse:collapse;width:100%;font-size:var(--font-size-body-base);line-height:var(--line-height-body-base)}
th,td{text-align:left;vertical-align:top;padding:var(--spacing-static-80) var(--spacing-static-120);border-bottom:var(--border-width-sm) solid var(--color-border-primary)}
thead th{background:var(--color-surface-secondary);font-weight:var(--font-weight-label);white-space:nowrap}
tbody th{font-weight:var(--font-weight-label)}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}
table.num td{font-variant-numeric:tabular-nums;white-space:nowrap}
.cards th,.cards td{min-width:10rem}
.cards th:first-child{min-width:8rem}
@media (max-width:40rem){
 .cards-wrap{overflow:visible;border:0}
 .cards thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
 .cards,.cards tbody,.cards tr,.cards th,.cards td{display:block;width:auto;min-width:0}
 .cards tr{border:var(--border-width-sm) solid var(--color-border-primary);border-radius:var(--radius-container-small);margin-bottom:var(--spacing-static-120);overflow:hidden}
 .cards tbody th{background:var(--color-surface-secondary)}
 .cards th,.cards td{border-bottom:var(--border-width-sm) solid var(--color-border-primary)}
 .cards td:last-child{border-bottom:0}
 .cards td::before{content:attr(data-label);display:block;font-weight:var(--font-weight-label);color:var(--color-text-secondary)}
}
.fixes{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:var(--spacing-static-120)}
.fix{border:var(--border-width-sm) solid var(--color-border-primary);border-radius:var(--radius-container-small);padding:var(--spacing-static-120);min-width:0}
.fix h4{margin:0 0 var(--spacing-static-60);font-size:var(--font-size-body-base);line-height:var(--line-height-body-base)}
.fix p{font-size:var(--font-size-body-small);line-height:var(--line-height-body-small);margin:0 0 var(--spacing-static-60)}
.fix .why{color:var(--color-text-secondary)}
h4.family{margin-top:var(--spacing-static-240)}
.mode{font-weight:400;color:var(--color-text-secondary);font-size:var(--font-size-body-small)}
.hex{color:var(--color-text-secondary);font-variant-numeric:tabular-nums}
.sws{display:flex;gap:var(--spacing-static-80);margin:var(--spacing-static-60) 0}
.sw{flex:1;min-width:0}
.sample{height:3rem;border-radius:var(--radius-container-small);border:var(--border-width-sm) solid var(--color-border-primary);display:flex;align-items:center;justify-content:center}
.sample-text{font-size:1.25rem;font-weight:600}
.sample-dot{width:1.25rem;height:1.25rem;border-radius:50%}
.sw-cap{font-size:var(--font-size-body-small);line-height:var(--line-height-body-small);margin-top:var(--spacing-static-40)}
.chips{display:inline-flex;gap:2px;vertical-align:middle}
.chip{display:inline-block;width:1.25rem;height:1.25rem;border-radius:var(--radius-height-20);border:var(--border-width-sm) solid var(--color-border-primary)}
details{margin:0 0 var(--spacing-static-120)}
summary{cursor:pointer;color:var(--color-text-link);min-height:var(--size-target-min);display:flex;align-items:center}
.counts{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:var(--spacing-static-80) var(--spacing-static-200)}
.counts span{font-weight:var(--font-weight-heading);font-variant-numeric:tabular-nums}
.comp{border-top:var(--border-width-sm) solid var(--color-border-primary);padding-top:var(--spacing-static-80);margin-top:var(--spacing-static-240)}
.stage{font-size:var(--font-size-label-small);font-weight:var(--font-weight-label);border:var(--border-width-sm) solid var(--color-border-strong);border-radius:var(--radius-round-full);padding:0 var(--spacing-static-80);vertical-align:middle}
.links a{display:inline-block;min-height:var(--size-target-min);line-height:var(--size-target-min)}
.absent{border-left:var(--border-width-md) solid var(--color-border-strong);padding:var(--spacing-static-80) var(--spacing-static-120);background:var(--color-surface-secondary)}
.growth{display:flex;flex-direction:column;gap:var(--spacing-static-120)}
.lane{display:grid;grid-template-columns:12rem repeat(3,minmax(0,1fr));gap:var(--spacing-static-120);border-top:var(--border-width-sm) solid var(--color-border-primary);padding-top:var(--spacing-static-120)}
.lane h3{margin:0 0 var(--spacing-static-40)}
.lane-head p{font-size:var(--font-size-body-small);line-height:var(--line-height-body-small)}
.hz{background:var(--color-surface-secondary);border-radius:var(--radius-container-small);padding:var(--spacing-static-120);min-width:0}
.hz h4{margin:0 0 var(--spacing-static-60);font-size:var(--font-size-label-base);text-transform:none}
.hz p{font-size:var(--font-size-body-small);line-height:var(--line-height-body-small);margin:0}
.hz ul{list-style:none;padding:0;margin:0;font-size:var(--font-size-body-small);line-height:var(--line-height-body-small)}
.hz li{margin-bottom:var(--spacing-static-80)}
.hz strong{display:block}
@media (max-width:56rem){.lane{grid-template-columns:minmax(0,1fr)}}
.unproven li{margin-bottom:var(--spacing-static-60)}
`;

const THEME_SCRIPT = `
(function(){
  var root=document.documentElement, key='souvenir-report-theme';
  function set(v){
    if(v==='light'||v==='dark') root.setAttribute('data-theme',v); else root.removeAttribute('data-theme');
    var bs=document.querySelectorAll('.theme button');
    for(var i=0;i<bs.length;i++) bs[i].setAttribute('aria-pressed', String(bs[i].getAttribute('data-set')===(v||'device')));
  }
  var saved=null; try{saved=localStorage.getItem(key);}catch(e){}
  set(saved);
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.theme button'); if(!b) return;
    var v=b.getAttribute('data-set'); set(v==='device'?null:v);
    try{ if(v==='device') localStorage.removeItem(key); else localStorage.setItem(key,v);}catch(e){}
  });
})();
`;

function fallbackTokens() {
  // Used only when ds-tokens/dist/tokens.css is missing, so the page still reads.
  return `:root{--color-surface-primary:#fff;--color-surface-secondary:#f4f4f5;--color-text-primary:#18181b;--color-text-secondary:#52525b;--color-text-link:#1d4ed8;--color-text-link-hover:#1e3a8a;--color-text-on:#fff;--color-interactive-primary:#18181b;--color-border-primary:#d4d4d8;--color-border-strong:#71717a;--color-border-focus:#2563eb;--font-family-sans:system-ui,sans-serif;--font-size-body-large:1rem;--line-height-body-large:1.5rem;--font-size-body-base:.875rem;--line-height-body-base:1.25rem;--font-size-body-small:.75rem;--line-height-body-small:1rem;--font-size-heading-3:1.75rem;--line-height-heading-3:2.5rem;--font-size-heading-4:1.25rem;--line-height-heading-4:2rem;--font-size-heading-5:1.125rem;--line-height-heading-5:1.75rem;--font-size-heading-6:1rem;--line-height-heading-6:1.5rem;--font-size-label-base:.875rem;--font-size-label-small:.75rem;--font-weight-heading:700;--font-weight-label:600;--spacing-static-40:.25rem;--spacing-static-60:.375rem;--spacing-static-80:.5rem;--spacing-static-120:.75rem;--spacing-static-160:1rem;--spacing-static-200:1.25rem;--spacing-static-240:1.5rem;--spacing-static-320:2rem;--spacing-static-400:2.5rem;--radius-height-20:.25rem;--radius-height-40:.5rem;--radius-round-full:999px;--radius-container-small:.5rem;--radius-container-medium:.75rem;--border-width-sm:1px;--border-width-md:2px;--border-ring-width:2px;--border-ring-offset:2px;--size-control-md:2.5rem;--size-target-min:2.75rem}`;
}

function render(d) {
  const figs = figures(d);
  const sections = [
    sectionStand(d, figs),
    sectionCompare(d),
    sectionAudit(d),
    sectionNaming(d),
    sectionProposed(d),
    sectionComponents(d),
    sectionGrowth(d),
    sectionUnproven(d),
  ];
  const toc = [['stand', 'Where things stand'], ['compare', 'The two directions and the merged one'], ['audit', 'Token audit'], ['naming', 'Naming'], ['proposed', 'Proposed tokens'], ['components', 'Components'], ['growth', 'What it can grow into'], ['unproven', 'What is not proven']];
  const font = existsSync(FONT) ? `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${readFileSync(FONT).toString('base64')}) format("woff2");font-weight:100 900;font-style:normal;font-display:swap}` : '';
  const tokensCss = d.tokensCss
    ? d.tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim()
    : fallbackTokens();
  const html = `<!doctype html>
<!-- Generated by v2/tools/build-report.mjs. Do not edit; rerun the tool. Every number comes from a file in the repository. -->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>V2 direction status</title>
<style>${font}</style>
<style>/* ds-tokens/dist/tokens.css, inlined */
${tokensCss}</style>
<style>${CSS.trim()}</style>
</head>
<body>
<div class="wrap">
<header class="top">
<div><h1>Where the V2 direction stands</h1><p class="sub">Branch v2-direction. Built by ${code('v2/tools/build-report.mjs')} from the files each tool wrote; hover a figure to see its source.</p></div>
<div><span class="theme-label" id="theme-label">Theme</span><div class="theme" role="group" aria-labelledby="theme-label"><button type="button" data-set="device" aria-pressed="true">Device</button><button type="button" data-set="light" aria-pressed="false">Light</button><button type="button" data-set="dark" aria-pressed="false">Dark</button></div></div>
</header>
<nav class="toc" aria-label="Contents"><h2 class="toc-h" style="border:0;margin:0 0 var(--spacing-static-80);padding:0">Contents</h2><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>
<main>
${sections.join('\n')}
</main>
</div>
<script>${THEME_SCRIPT.trim()}</script>
</body>
</html>
`;
  return { html, figs };
}

// ---------------------------------------------------------------------------------------------
// Running the two audits

function runAudits() {
  const tool = join(REPO, 'v2', 'tools', 'audit-contrast.mjs');
  const src = join(REPO, 'ds-tokens', 'audit', 'contrast.json');
  mkdirSync(join(REPO, 'v2', 'report', 'data'), { recursive: true });
  const one = (args, dest) => {
    const r = spawnSync(process.execPath, [tool, ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const last = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').filter(Boolean).pop() || '(no output)';
    if (r.status !== 0 || !existsSync(src)) {
      if (existsSync(dest)) rmSync(dest); // never show an old result as if it were this run's
      return { ok: false, detail: `node v2/tools/audit-contrast.mjs ${args.join(' ')} exited ${r.status}: ${last}` };
    }
    copyFileSync(src, dest);
    return { ok: true, detail: last };
  };
  const asGiven = one(['--report-only'], join(REPO, INPUT.asGiven));
  const merged = one(['--built', '--report-only'], join(REPO, INPUT.merged));
  return { asGiven, merged };
}

// ---------------------------------------------------------------------------------------------
// Checking the page in headless Chromium (finder as in scripts/check-screens.mjs; no download)

function cachedChromiums() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), 'Library', 'Caches', 'ms-playwright'), join(homedir(), '.cache', 'ms-playwright')].filter(Boolean);
  const found = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const revs = readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const rev of revs) {
      const dir = join(root, rev);
      for (const sub of readdirSync(dir)) {
        const base = join(dir, sub);
        for (const c of [join(base, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'), join(base, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'), join(base, 'chrome')]) if (existsSync(c)) found.push(c);
      }
    }
  }
  return found;
}

async function launch(chromium) {
  let own = null;
  try { own = chromium.executablePath(); } catch { /* unknown */ }
  const tried = [];
  for (const path of [process.env.PLAYWRIGHT_CHROMIUM, own, ...cachedChromiums()].filter((p, i, all) => p && all.indexOf(p) === i)) {
    if (!existsSync(path)) continue;
    try { return await chromium.launch({ executablePath: path, headless: true }); } catch (e) { tried.push(`${path}: ${e.message.split('\n')[0]}`); }
  }
  throw new Error(`could not launch Chromium. Tried: ${tried.join('; ') || 'nothing found in the Playwright cache'}`);
}

// Runs in the page: every visible text node at 4.5 to 1 or better against the colour behind it.
// Backgrounds are composited up the tree (method from v2/tools/test-components.mjs). Samples marked data-sample are skipped.
function pageContrast() {
  const parse = (s) => {
    if (!s || s === 'transparent') return [0, 0, 0, 0];
    let m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\(srgb ([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const over = (top, bottom) => { const a = top[3] + bottom[3] * (1 - top[3]); if (a === 0) return [0, 0, 0, 0]; const ch = (i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a; return [ch(0), ch(1), ch(2), a]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const backgroundOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  // Open every details element so collapsed text is checked too.
  for (const det of document.querySelectorAll('details')) det.open = true;
  const failures = []; let checked = 0, skipped = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('script, style, noscript, template')) continue;
    if (el.closest('[data-sample]')) { skipped++; continue; }
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    if (![...range.getClientRects()].some((r) => r.width > 1 && r.height > 1)) continue;
    const bg = backgroundOf(el);
    const fg = over(parse(getComputedStyle(el).color) || [0, 0, 0, 1], bg);
    const r = ratio(fg, bg);
    checked++;
    if (r < 4.5) failures.push(`"${n.nodeValue.trim().slice(0, 30)}" ${Math.floor(r * 100) / 100} (${hex(fg)} on ${hex(bg)})`);
  }
  for (const det of document.querySelectorAll('details')) det.open = false;
  return { checked, skipped, failures };
}

// A full-page picture of a very tall page. Chromium repeats content when one capture is taller than its
// texture limit, so the page is captured in clipped tiles and the tiles are joined here into one PNG.
function decodePng(buf) {
  let w = 0, h = 0, type = 0; const idat = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o), kind = buf.toString('latin1', o + 4, o + 8), body = buf.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); type = body[9]; if (body[8] !== 8 || body[12] !== 0) throw new Error('unsupported PNG'); }
    if (kind === 'IDAT') idat.push(body);
    o += 12 + len;
  }
  const bpp = { 2: 3, 6: 4 }[type]; if (!bpp) throw new Error(`unsupported PNG colour type ${type}`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[x] = v & 255;
    }
  }
  return { w, h, type, bpp, pixels: out };
}
function encodePng(w, h, type, bpp, pixels) {
  const stride = w * bpp, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const chunk = (kind, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const kb = Buffer.concat([Buffer.from(kind, 'latin1'), body]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(kb) >>> 0); return Buffer.concat([len, kb, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = type;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
async function fullPagePicture(page, file) {
  const { width, height } = await page.evaluate(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.scrollHeight }));
  const tile = 4000, parts = [];
  for (let y = 0; y < height; y += tile) parts.push(decodePng(await page.screenshot({ fullPage: true, clip: { x: 0, y, width, height: Math.min(tile, height - y) } })));
  const { w, type, bpp } = parts[0];
  if (parts.some((p) => p.w !== w || p.type !== type)) throw new Error('picture tiles differ in width or colour type');
  writeFileSync(file, encodePng(w, parts.reduce((n, p) => n + p.h, 0), type, bpp, Buffer.concat(parts.map((p) => p.pixels))));
}

async function checkPage(outFile) {
  const { chromium } = await import('playwright-core');
  const browser = await launch(chromium);
  const axe = readFileSync(AXE, 'utf8');
  const url = pathToFileURL(outFile).href;
  mkdirSync(PICTURES, { recursive: true });
  const results = [];
  try {
    for (const width of [375, 1280]) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        const errors = [];
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        const ct = await page.evaluate(pageContrast);
        await page.addScriptTag({ content: axe });
        const ax = await page.evaluate(async () => {
          for (const det of document.querySelectorAll('details')) det.open = true;
          const r = await window.axe.run({ exclude: [['[data-sample]']] }, { resultTypes: ['violations'] });
          for (const det of document.querySelectorAll('details')) det.open = false;
          return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, first: v.nodes[0] && v.nodes[0].target.join(' ') }));
        });
        const blocking = ax.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        // The switch: pressing the other theme sets data-theme and changes the page background.
        const other = theme === 'light' ? 'dark' : 'light';
        const sw = await page.evaluate(async (o) => {
          const before = getComputedStyle(document.body).backgroundColor;
          document.querySelector(`.theme button[data-set="${o}"]`).click();
          const after = getComputedStyle(document.body).backgroundColor;
          const attr = document.documentElement.getAttribute('data-theme');
          document.querySelector('.theme button[data-set="device"]').click();
          const back = document.documentElement.hasAttribute('data-theme');
          return { ok: attr === o && before !== after && !back, before, after };
        }, other);
        const file = join(PICTURES, `report-${width}-${theme}.png`);
        await fullPagePicture(page, file);
        results.push({ width, theme, errors, overflow, ct, ax, blocking, sw, file });
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  let failed = 0;
  for (const r of results) {
    const problems = [];
    if (r.errors.length) problems.push(`console errors: ${r.errors.slice(0, 3).join('; ')}`);
    if (r.overflow.scroll > r.overflow.client) problems.push(`scrolls sideways: ${r.overflow.scroll} px in ${r.overflow.client}`);
    if (r.ct.failures.length) problems.push(`${r.ct.failures.length} text runs below 4.5 to 1: ${r.ct.failures.slice(0, 4).join('; ')}`);
    if (r.blocking.length) problems.push(`axe: ${r.blocking.map((v) => `${v.id} (${v.impact}, ${v.nodes} nodes, ${v.first})`).join('; ')}`);
    if (!r.sw.ok) problems.push(`the theme switch did not change the page (${r.sw.before} -> ${r.sw.after})`);
    if (problems.length) failed++;
    const minor = r.ax.filter((v) => !r.blocking.includes(v));
    for (const v of minor) console.log(`    minor axe finding, reported only: ${v.id} (${v.impact}, ${v.nodes} nodes, first ${v.first})`);
    console.log(`check ${String(r.width).padStart(4)} ${r.theme.padEnd(5)} ${problems.length ? 'FAIL' : 'ok  '} ${r.ct.checked} text runs at 4.5 to 1 or better, ${r.ct.skipped} in marked samples skipped; axe ${r.blocking.length} serious or critical${minor.length ? `, ${minor.length} minor (${minor.map((v) => v.id).join(', ')})` : ''}; no sideways scroll: ${r.overflow.scroll <= r.overflow.client}; switch ${r.sw.ok ? 'works' : 'broken'}; ${relative(REPO, r.file)}`);
    for (const p of problems) console.log(`    ${p}`);
  }
  return failed;
}

// ---------------------------------------------------------------------------------------------
// Build

function build(root, audits) {
  const d = gather(root, audits);
  const { html, figs } = render(d);
  const out = join(root, OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return { d, html, figs, out };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) return selfTest();
  const audits = runAudits();
  for (const [k, a] of Object.entries(audits)) console.log(`audit ${k === 'asGiven' ? 'as Figma stands' : 'with the fixes '}: ${a.ok ? a.detail : `NOT RUN: ${a.detail}`}`);
  const { figs, out, d } = build(REPO, audits);
  console.log('\nWhere things stand');
  for (const f of figs) console.log(`  ${f.value.padStart(12)}  ${f.label}  [${f.sources.join(', ')}]`);
  const bad = [...d.R.seen].filter(([, s]) => s.status !== 'ok');
  for (const [p, s] of bad) console.log(`  input ${p}: ${s.status === 'missing' ? 'not run yet (does not exist)' : `could not be read: ${s.detail}`}`);
  console.log(`\nWrote ${relative(REPO, out)} (${fmt(statSync(out).size)} bytes)`);
  let failed = 0;
  if (!argv.includes('--no-check')) failed = await checkPage(out);
  console.log(`build-report: ${figs.length} figures, ${bad.length} inputs missing or unreadable, ${argv.includes('--no-check') ? 'page not checked' : failed ? `${failed} of 4 page checks failed` : 'page checked at 375 and 1280 in light and dark'}.`);
  return failed ? 1 : 0;
}

// --self-test: a temporary copy of the inputs, with the growth map missing and the lint result malformed.
function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'build-report-selftest-'));
  const problems = [];
  try {
    const paths = [...Object.values(INPUT), ...(existsSync(join(REPO, SPECS_DIR)) ? readdirSync(join(REPO, SPECS_DIR)).map((f) => `${SPECS_DIR}/${f}`) : []), LINKS.contrastHtml, LINKS.patchList];
    for (const p of paths) {
      const from = join(REPO, p);
      if (!existsSync(from)) continue;
      mkdirSync(dirname(join(tmp, p)), { recursive: true });
      copyFileSync(from, join(tmp, p));
    }
    rmSync(join(tmp, INPUT.growth), { force: true });
    mkdirSync(dirname(join(tmp, INPUT.lint)), { recursive: true });
    writeFileSync(join(tmp, INPUT.lint), '{ "findings": [ this is not json');
    const run1 = build(tmp, {});
    const run2 = build(tmp, {});
    const html = run1.html;
    const growth = html.slice(html.indexOf('id="growth"'), html.indexOf('id="unproven"'));
    const naming = html.slice(html.indexOf('id="naming"'), html.indexOf('id="proposed"'));
    const unproven = html.slice(html.indexOf('id="unproven"'));
    if (!existsSync(run1.out)) problems.push('no page was written');
    if (!/Not run yet\.<\/strong> <code>v2\/report\/growth-map\.json<\/code> does not exist/.test(growth)) problems.push('section 7 does not say the growth map is not run yet');
    if (!/Could not be read\.<\/strong> <code>ds-tokens\/audit\/lint\.json<\/code> not valid JSON/.test(naming)) problems.push('section 4 does not say the lint result could not be read');
    if (!unproven.includes('<code>v2/report/growth-map.json</code> does not exist yet')) problems.push('section 8 does not list the missing growth map');
    if (!unproven.includes('<code>ds-tokens/audit/lint.json</code> could not be read')) problems.push('section 8 does not list the malformed lint result');
    if (!html.includes('Nothing here was tested with people, a screen reader or a real phone.') || !html.includes('Only Chromium was used.')) problems.push('the fixed sentences are missing');
    if (/>(undefined|NaN|null)</.test(html) || /\b(undefined|NaN) /.test(html.replace(/<style>[\s\S]*?<\/style>/g, ''))) problems.push('the page prints undefined or NaN');
    if (run1.html !== run2.html) problems.push('two builds are not byte-identical');
    if (!run1.figs.some((f) => f.label === 'naming lint' && f.value === 'could not be read')) problems.push('the naming figure does not say could not be read');
  } catch (e) {
    problems.push(`the build stopped: ${e.stack || e.message}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  for (const p of problems) console.log(`  problem: ${p}`);
  console.log(problems.length ? `Self-test failed: ${plural(problems.length, 'problem')}.` : 'Self-test passed: with the growth map missing and the lint result malformed, the page was written, said "not run yet" and "could not be read" in sections 4, 7 and 8 and in the figures, and two builds were byte-identical.');
  return problems.length ? 1 : 0;
}

main().then((code) => process.exit(code), (e) => { console.error(e.stack || e.message); process.exit(1); });

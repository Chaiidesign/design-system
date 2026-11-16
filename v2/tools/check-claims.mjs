#!/usr/bin/env node
// check-claims.mjs: numbers a person typed into a summary, a README or a data file, checked against the files the
// tools write. It exists because the final review of 16 November 2026 found "22 proposed" beside "23", and "77 fixes"
// after the count had moved: a hand-written number goes stale the moment a tool's output changes.
//
// It does not understand prose. It knows a short list of phrasings (CLAIMS below), finds each in the files listed in
// FILES, and fails when the number written is not the number the source holds today. A phrasing it does not know is
// not checked; the last line says how many were.
//
//   node v2/tools/check-claims.mjs              check; exit 1 on any mismatch
//   node v2/tools/check-claims.mjs --self-test  prove on planted text that a stale number is caught and a true one is not

import { readFileSync, existsSync } from 'node:fs';

const FILES = [
  'digests/2026-11-16-v2.md',
  'v2/report/comparison.json',
  'v2/report/growth-map.json',
  'ds-components/AGENTS.md',
  'ds-tokens/README.md',
  'ds-tokens/proposed/README.md',
  'v2/screens/index.html',
];

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

// Today's numbers, each from the file a tool wrote. A source that is missing or has another shape gives null, and
// every claim that needs it is reported as "cannot check", which also fails: a silent skip is how numbers go stale.
export function facts() {
  const f = {};
  const tryGet = (key, fn) => { try { const v = fn(); f[key] = Number.isFinite(v) ? v : null; } catch { f[key] = null; } };
  tryGet('overrides', () => json('ds-tokens/overrides.json').length);
  tryGet('proposed', () => json('ds-tokens/proposed/tokens.json').length);
  tryGet('drafted', () => json('ds-tokens/descriptions.json').filter((d) => d.source === 'drafted').length);
  const contrast = existsSync('ds-tokens/audit/contrast.json') ? json('ds-tokens/audit/contrast.json') : {};
  const pick = (o, ...paths) => { for (const p of paths) { let v = o; for (const k of p.split('.')) v = v?.[k]; if (Number.isFinite(v)) return v; } return null; };
  f.builtPairs = pick(contrast, 'counts.measured');
  f.builtFail = pick(contrast, 'counts.fail');
  f.figmaPairs = pick(contrast, 'figma.counts.measured');
  f.figmaFail = pick(contrast, 'figma.counts.fail');
  f.exempt = pick(contrast, 'counts.exempt');
  return f;
}

// Each claim: a phrasing with the number in group 1 (and sometimes a second in group 2), and the fact it must equal.
export const CLAIMS = [
  { id: 'overrides', fact: 'overrides', re: /\b(\d+) (?:alias changes|intended overrides|intended\b|colour values differ|contrast overrides|fixes applied)/g },
  { id: 'overrides', fact: 'overrides', re: /\bthe (\d+) (?:fixes|overrides)\b/g },
  { id: 'proposed', fact: 'proposed', re: /\b(\d+) (?:tokens proposed|proposed tokens|new variables|proposed in the repo|proposed\b(?! in))/g },
  { id: 'proposed', fact: 'proposed', re: /\b(\d+) tokens \(border widths/g },
  { id: 'drafted descriptions', fact: 'drafted', re: /\b(\d+) (?:descriptions|drafted)\b/g },
  { id: 'pairs in the built audit', fact: 'builtPairs', re: /\b(\d+) pairs (?:audited|measured)(?=[^|\n]*(?:none failing|0 fail))/g },
  { id: 'failing pairs in Figma', fact: 'figmaFail', pairFact: 'figmaPairs', re: /\b(\d+) of (\d+) (?:declared pairs fail|declared pairs|pairs fail)/g },
  { id: 'failing pairs in Figma', fact: 'figmaFail', re: /\bthe (\d+) failing pairs\b/g },
];

export function check(texts, f) {
  const problems = []; let checked = 0;
  for (const [file, text] of texts) {
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      for (const c of CLAIMS) {
        c.re.lastIndex = 0;
        for (let m; (m = c.re.exec(line));) {
          checked += 1;
          const want = f[c.fact];
          const at = `${file}:${i + 1}`;
          if (want == null) { problems.push(`${at}: cannot check "${m[0]}": the source for ${c.id} could not be read`); continue; }
          if (Number(m[1]) !== want) problems.push(`${at}: says "${m[0]}", the source says ${want} (${c.id})`);
          if (c.pairFact && m[2] != null) {
            const wantB = f[c.pairFact];
            if (wantB == null) problems.push(`${at}: cannot check the total in "${m[0]}"`);
            else if (Number(m[2]) !== wantB) problems.push(`${at}: says "${m[0]}", the source says ${want} of ${wantB}`);
          }
        }
      }
    });
  }
  return { problems, checked };
}

function selfTest() {
  const f = { overrides: 73, proposed: 25, drafted: 290, builtPairs: 760, builtFail: 0, figmaPairs: 740, figmaFail: 220, exempt: 52 };
  const errors = []; const lines = [];
  const run = (text) => check([['planted.md', text]], f);
  const expect = (name, text, wantProblems) => {
    const r = run(text);
    const ok = r.problems.length === wantProblems && r.checked > 0;
    lines.push(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${r.checked} checked, ${r.problems.length} problem(s)${r.problems[0] ? `: ${r.problems[0]}` : ''}`);
    if (!ok) errors.push(name);
  };
  expect('a stale override count is caught', 'The repo carries 77 alias changes.', 1);
  expect('a true override count passes', 'The repo carries 73 alias changes.', 0);
  expect('a stale proposed count is caught', '- 23 tokens (border widths, focus ring) exist in the repo', 1);
  expect('a true proposed count passes', '25 tokens proposed in the repo', 0);
  expect('a stale failing-pair count is caught, with its total', '215 of 726 declared pairs fail in the Figma file', 2);
  expect('a true failing-pair count passes', '220 of 740 declared pairs fail in the Figma file', 0);
  expect('"0 overrides to remove" is not read as the override count', '73 intended overrides, 0 overrides to remove', 0);
  const missing = check([['planted.md', '73 alias changes']], { ...f, overrides: null });
  const okMissing = missing.problems.length === 1 && /cannot check/.test(missing.problems[0]);
  lines.push(`${okMissing ? 'ok  ' : 'FAIL'} a source that cannot be read fails instead of passing: ${missing.problems[0] ?? 'no problem reported'}`);
  if (!okMissing) errors.push('missing source');
  console.log(lines.join('\n'));
  console.log(errors.length ? `Self-test failed: ${errors.length} case(s).` : `Self-test passed: ${lines.length} planted cases.`);
  return errors.length ? 1 : 0;
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const f = facts();
  const texts = FILES.filter((p) => existsSync(p)).map((p) => [p, readFileSync(p, 'utf8')]);
  const absent = FILES.filter((p) => !existsSync(p));
  const { problems, checked } = check(texts, f);
  for (const p of problems) console.log(`MISMATCH ${p}`);
  for (const p of absent) console.log(`note     ${p} does not exist; not read`);
  console.log(`check-claims: ${checked} written numbers checked in ${texts.length} files against today's tool output (${Object.entries(f).map(([k, v]) => `${k} ${v ?? 'unreadable'}`).join(', ')}); ${problems.length} mismatch(es).`);
  return problems.length ? 1 : 0;
}

process.exit(main());

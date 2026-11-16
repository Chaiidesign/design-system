// Writes the text that v2/tools/figma/export.figma.js should return for the sandbox after the generated scripts ran,
// computed from the same rows the generator wrote into Figma (v2/tools/figma/make-sandbox-scripts.mjs).
// Usage: node v2/figma/sandbox/predict-snapshot.mjs
//   writes v2/figma/sandbox/semantic.txt   (export with SUFFIX ' (DS V2)')
//   and    v2/figma/sandbox/primitives.txt (export with SUFFIX ' (DS V2 primitives)')
// Figma stores a straight apostrophe in a variable description as &#39;, so the generator now writes U+2019 instead
// (figmaDescription in make-sandbox-scripts.mjs) and the rows already hold what Figma keeps; they are written unchanged.
// Caution: rerunning this after tokens.json or descriptions.json change overwrites the proven snapshot with a new prediction;
// rerun figma-verify against fresh hashes before trusting it again.
// A prediction proves nothing by itself. It becomes the snapshot only because node v2/tools/figma-verify.mjs checks it
// line block by line block against the checksums that hash.figma.js returned from the live sandbox (semantic.hashes.txt,
// primitives.hashes.txt). The export itself returns more than use_figma's 48,000-byte limit in one call, and copying it
// by hand risks typing errors; a checksum-proven file is the exact copy either way.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../../tools/figma/make-sandbox-scripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { files } = generate();
// Pull the data back out of the generated scripts, exactly as Figma received it.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const grab = (code, name) => { const m = code.match(new RegExp(`^const ${name} = (.*);$`, 'm')); return m ? JSON.parse(m[1]) : null; };

const hex = (h) => h.toLowerCase().replace(/ff$/, (x) => (h.length === 9 ? '' : x)); // #rrggbbff never occurs; kept for safety
const prims = [];
for (const [name, code] of files.filter(([n]) => n.startsWith('01-'))) {
  for (const m of code.matchAll(/^let col\d+ = findCol\("(.*?)"\);[\s\S]*?^for \(const \[n, t, v\] of (\[.*\]\)) \{$/gm)) {
    prims.push({ name: m[1], rows: JSON.parse(m[2].slice(0, -1)) });
  }
}
const primLines = [];
for (const c of prims) {
  primLines.push(`## ${c.name.replace(' (DS V2 primitives)', '')} | modes: default | vars: ${c.rows.length}`);
  for (const [n, t, v] of c.rows) primLines.push(`${n} [${t[0]}] ${t === 'COLOR' ? hex(v) : JSON.stringify(v)} ~ - ~ - ~ ""`);
}

const sem = new Map(); // collection -> { modes, rows }
for (const [, code] of files.filter(([n]) => /^0[2-9]-/.test(n))) {
  const P = grab(code, 'P');
  const blocks = grab(code, 'BLOCKS');
  if (!blocks) continue;
  for (const b of blocks) {
    if (!sem.has(b.name)) sem.set(b.name, { modes: b.modes, rows: [] });
    for (const [n, t, vals, s, x, d] of b.rows) {
      const shown = vals.map((v) => (Array.isArray(v) ? `{${v[1]}}` : t === 'C' ? hex(v) : JSON.stringify(v)));
      sem.get(b.name).rows.push(`${n} [${t}] ${shown.join(' | ')} ~ ${x || '-'} ~ ${s.join(',') || '-'} ~ ${JSON.stringify(d || '')}`);
      void P;
    }
  }
}
const semLines = [];
for (const [name, c] of sem) {
  semLines.push(`## ${name.replace(' (DS V2)', '')} | modes: ${c.modes.join(', ')} | vars: ${c.rows.length}`);
  semLines.push(...c.rows);
}
void AsyncFunction;
writeFileSync(join(HERE, 'semantic.txt'), semLines.join('\n') + '\n');
writeFileSync(join(HERE, 'primitives.txt'), primLines.join('\n') + '\n');
console.log(`semantic.txt ${semLines.length} lines, primitives.txt ${primLines.length} lines`);

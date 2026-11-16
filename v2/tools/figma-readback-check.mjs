// Compares what Figma holds (the output of v2/tools/figma/readback.figma.js, one or more JSON files) with what
// v2/tools/figma/make-component-scripts.mjs computed from the specs, variant by variant and node by node.
//
//   node v2/tools/figma-readback-check.mjs <readback part>.json [more parts...]   writes v2/figma/sandbox/readback.json
//   node v2/tools/figma-readback-check.mjs --self-test <parts...>                 plants a wrong binding and a raw value in a copy
//
// Prints "V variants, B bindings checked, M mismatches, R raw values".
//   B counts every field where the generator bound a token (a variable or an effect style).
//   M counts a field bound to a different variable or not bound at all, a paint present where the spec says transparent,
//     and a variant or node the generator drew that Figma does not have.
//   R counts fields that hold a raw value where the generator bound a token (each is also a mismatch).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAll, ROOT } from './figma/make-component-scripts.mjs';

export function parseReadback(parts) {
  const out = {};
  for (const p of parts) {
    for (const [owner, vname, idx] of p.variants) {
      const nodes = {};
      for (const i of idx) {
        const [path, fields, extra] = p.nodes[i].split('~');
        const rec = { fields: {}, raw: [], instanceOf: null };
        if (fields) for (const kv of fields.split(',')) { const [f, d] = kv.split('='); rec.fields[f] = p.dict[Number(d)]; }
        if (extra && extra.startsWith('R:')) rec.raw = extra.slice(2).split('.');
        if (extra && extra.startsWith('I:')) rec.instanceOf = extra.slice(2);
        nodes[path] = rec;
      }
      (out[owner] = out[owner] || {})[vname] = nodes;
    }
  }
  return out;
}

export function compare(expected, actual) {
  const res = { V: 0, B: 0, K: 0, M: 0, R: 0, mismatches: [], raw: [], extra: [], missingVariants: [] };
  for (const [owner, variants] of Object.entries(expected)) {
    for (const [vname, paths] of Object.entries(variants)) {
      const got = actual[owner] && actual[owner][vname];
      if (!got) { res.M++; res.missingVariants.push(`${owner} / ${vname}`); continue; }
      res.V++;
      for (const [path, fields] of Object.entries(paths)) {
        const node = got[path];
        for (const [f, want] of Object.entries(fields)) {
          if (want === '-') {
            res.K++;
            if (node && node.fields[f] !== undefined) { res.M++; res.mismatches.push({ owner, variant: vname, path, field: f, want: 'no paint', got: node.fields[f] }); }
            if (node && node.raw.includes(f)) { res.M++; res.mismatches.push({ owner, variant: vname, path, field: f, want: 'no paint', got: 'raw paint' }); }
            continue;
          }
          res.B++;
          const have = node ? node.fields[f] : undefined;
          if (have !== want) {
            res.M++;
            const isRaw = !!(node && node.raw.includes(f));
            if (isRaw) { res.R++; res.raw.push({ owner, variant: vname, path, field: f, want }); }
            res.mismatches.push({ owner, variant: vname, path, field: f, want, got: have || (isRaw ? 'raw value' : node ? 'nothing' : 'node missing') });
          }
        }
      }
      // Bindings Figma has that the generator did not ask for: reported, not counted as mismatches.
      for (const [path, node] of Object.entries(got)) for (const [f, v] of Object.entries(node.fields)) {
        if (!(paths[path] && paths[path][f] !== undefined)) res.extra.push({ owner, variant: vname, path, field: f, got: v });
      }
    }
  }
  return res;
}

const line = (r) => `${r.V} variants, ${r.B} bindings checked, ${r.M} mismatches, ${r.R} raw values`;

function selfTest(expected, parts) {
  const base = compare(expected, parseReadback(parts));
  const copy = JSON.parse(JSON.stringify(parts));
  // Plant 1: point one bound field at a different variable.
  const p = copy[0];
  const i = p.nodes.findIndex((s) => /~[^~]*=/.test(s));
  const [path, fields, ...rest] = p.nodes[i].split('~');
  const kv = fields.split(',');
  const [f] = kv[0].split('=');
  p.dict.push('Themes (DS V2)|planted/wrong');
  kv[0] = `${f}=${p.dict.length - 1}`;
  // Plant 2: drop another field's binding and mark it raw.
  const [f2] = (kv[1] || '').split('=');
  const kept = kv.filter((_, j) => j !== 1);
  const planted = [path, kept.join(','), f2 ? 'R:' + f2 : ''].filter((x, j) => j < 2 || x).join('~');
  p.nodes.push(planted);
  // Use the planted node in every variant that used the original.
  let uses = 0;
  for (const v of p.variants) v[2] = v[2].map((x) => { if (x === i) { uses++; return p.nodes.length - 1; } return x; });
  const after = compare(expected, parseReadback(copy));
  const wantM = base.M + uses * (f2 ? 2 : 1), wantR = base.R + (f2 ? uses : 0);
  const ok = after.M === wantM && after.R === wantR;
  console.log(`self-test: planted a wrong ${f} and a raw ${f2 || '(none)'} on "${path}" in ${uses} variant(s): ` +
    `mismatches ${base.M} -> ${after.M} (want ${wantM}), raw ${base.R} -> ${after.R} (want ${wantR}): ${ok ? 'caught' : 'NOT CAUGHT'}`);
  if (!ok) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('figma-readback-check.mjs')) {
  const args = process.argv.slice(2);
  const test = args.includes('--self-test');
  const files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) { console.error('usage: node v2/tools/figma-readback-check.mjs [--self-test] <readback part>.json ...'); process.exit(2); }
  const parts = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
  for (const p of parts) if (p.file !== '3WGIouA6dby5LNzVkdaA48') throw new Error('read-back is not from the sandbox file');
  const expected = buildAll().manifest.sets;
  if (test) selfTest(expected, parts);
  else {
    const r = compare(expected, parseReadback(parts));
    const out = {
      checked: new Date().toISOString().slice(0, 10),
      summary: line(r),
      counts: { variants: r.V, bindingsChecked: r.B, noPaintChecks: r.K, mismatches: r.M, rawValues: r.R, extraBindings: r.extra.length },
      readAt: parts.map((p) => p.readAt),
      owners: parts.flatMap((p) => p.owners),
      missingVariants: r.missingVariants,
      mismatches: r.mismatches,
      raw: r.raw,
      extraBindings: r.extra,
      readback: parts,
    };
    writeFileSync(join(ROOT, 'v2', 'figma', 'sandbox', 'readback.json'), JSON.stringify(out, null, 1));
    console.log(line(r));
    if (r.extra.length) console.log(`${r.extra.length} bindings in Figma the generator did not ask for (listed in readback.json)`);
    process.exit(r.M ? 1 : 0);
  }
}

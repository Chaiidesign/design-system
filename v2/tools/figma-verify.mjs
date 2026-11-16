// Proves that a saved Figma snapshot is an exact copy of what Figma returned.
// Usage: node v2/tools/figma-verify.mjs <snapshot.txt> <hashes.txt>
//   snapshot.txt  the lines returned by v2/tools/figma/export.figma.js (the first "lines a to b of n" line may be kept or removed)
//   hashes.txt    the text returned by v2/tools/figma/hash.figma.js, saved as it came
// Exit 0 when every block of 25 lines and the whole file match. Exit 1 and name the first bad block otherwise.
// --self-test corrupts one character in memory and confirms the check fails.
import { readFileSync } from 'node:fs';
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const selfTest = process.argv.includes('--self-test');
if (args.length !== 2) { console.log('Usage: node v2/tools/figma-verify.mjs <snapshot.txt> <hashes.txt> [--self-test]'); process.exit(2); }
const load = (p) => readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.length && !/^lines \d+ to \d+ of \d+$/.test(l));
let lines = load(args[0]);
const hashes = readFileSync(args[1], 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const check = (ls) => {
  const bad = [];
  const [, total, whole] = hashes[0].split(' ');
  for (const row of hashes.slice(1)) {
    const [start, sum] = row.split(' ');
    const i = Number(start) - 1;
    if (fnv(ls.slice(i, i + 25).join('\n')) !== sum) bad.push(`lines ${start} to ${Math.min(i + 25, ls.length)}`);
  }
  const countOk = ls.length === Number(total);
  const wholeOk = fnv(ls.join('\n')) === whole;
  return { bad, countOk, wholeOk, total: Number(total) };
};
if (selfTest) {
  const copy = [...lines]; const k = Math.floor(copy.length / 2);
  copy[k] = copy[k].replace(/[0-9a-f]/, (c) => (c === '0' ? '1' : '0'));
  const r = check(copy);
  const caught = r.bad.length > 0 && !r.wholeOk;
  console.log(caught ? `self-test: a one-character change at line ${k + 1} was caught (${r.bad[0]})` : 'self-test FAILED: a changed line was not caught');
  process.exit(caught ? 0 : 1);
}
const r = check(lines);
if (!r.countOk) console.log(`line count: file has ${lines.length}, Figma returned ${r.total}`);
for (const b of r.bad) console.log(`MISMATCH in ${b}`);
const ok = r.countOk && r.wholeOk && r.bad.length === 0;
console.log(ok ? `${args[0]}: ${lines.length} lines, every block and the whole file match Figma` : `${args[0]}: NOT an exact copy`);
process.exit(ok ? 0 : 1);

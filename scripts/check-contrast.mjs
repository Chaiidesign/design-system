// Gate: every pairing in tokens/contrast-pairs.json must meet its WCAG ratio in every theme.
// Run: npm run check:contrast
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadTokens, deref, contrast } from './lib.mjs';

const MIN = { text: 4.5, ui: 3 };
const { base, themes } = loadTokens();
const { pairs } = JSON.parse(readFileSync(join(ROOT, 'tokens/contrast-pairs.json'), 'utf8'));

let failures = 0;
for (const [theme, themed] of Object.entries(themes)) {
  const tokens = new Map([...base, ...themed]);
  for (const [fg, bg, kind] of pairs) {
    const ratio = contrast(deref(fg, tokens).value.hex, deref(bg, tokens).value.hex);
    if (ratio < MIN[kind]) {
      failures++;
      console.error(`FAIL ${theme}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1, needs ${MIN[kind]}:1 (${kind})`);
    }
  }
}
console.log(`${pairs.length} pairings x ${Object.keys(themes).length} themes checked, ${failures} failed`);
process.exit(failures ? 1 : 0);

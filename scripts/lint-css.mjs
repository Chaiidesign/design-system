// Gate: component and docs CSS may only use system tokens.
//   1. No colour literals (hex, rgb(), hsl(), oklch()...).
//   2. No primitive palette tokens (--ds-palette-*): use semantic color.* tokens.
//   3. Every var(--ds-*) must exist in the built token set.
// Run: npm run lint   (after npm run build)
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, PREFIX } from './lib.mjs';

const known = new Set(JSON.parse(readFileSync(join(ROOT, 'dist/tokens.resolved.json'), 'utf8')).map((t) => t.cssVar));
const files = ['components', 'docs']
  .flatMap((dir) => readdirSync(join(ROOT, dir), { recursive: true }).map((f) => join(ROOT, dir, f)))
  .filter((f) => f.endsWith('.css'));

const RULES = [
  [/#[0-9a-fA-F]{3,8}\b/g, 'colour literal: use a color.* token'],
  [/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g, 'colour function: use a color.* token'],
  [new RegExp(`--${PREFIX}-palette-[\\w-]+`, 'g'), 'primitive palette token: use a semantic color.* token'],
];

let problems = 0;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n');
  lines.forEach((line, i) => {
    const report = (found, why) => {
      problems++;
      console.error(`${relative(ROOT, file)}:${i + 1}  ${found}  ${why}`);
    };
    for (const [pattern, why] of RULES) for (const m of line.matchAll(pattern)) report(m[0], why);
    for (const m of line.matchAll(new RegExp(`var\\((--${PREFIX}-[\\w-]+)`, 'g'))) {
      if (!known.has(m[1])) report(m[1], 'unknown token');
    }
  });
}
console.log(`${files.length} CSS files linted, ${problems} problems`);
process.exit(problems ? 1 : 0);

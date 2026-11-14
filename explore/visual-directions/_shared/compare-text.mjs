// Clay. Confirms that each visual direction shows the same text, in the same order, as the shared content.
// Usage: node explore/visual-directions/_shared/compare-text.mjs [page-file] [shared-file]
//   page-file    the file to read in each direction's folder. Default: index.html
//   shared-file  the shared content in _shared/. Default: content.html
// Checkout screen:   node explore/visual-directions/_shared/compare-text.mjs
// Assistant screen:  node explore/visual-directions/_shared/compare-text.mjs assistant.html assistant-content.html
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pageFile = process.argv[2] ?? 'index.html';
const sharedFile = process.argv[3] ?? 'content.html';

function visibleText(html) {
  const main = html.match(/<main[\s\S]*<\/main>/i);
  if (!main) return null;
  return main[0]
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const sharedPath = join(root, '_shared', sharedFile);
if (!existsSync(sharedPath)) { console.log(`No shared file at _shared/${sharedFile}`); process.exit(1); }
const reference = visibleText(readFileSync(sharedPath, 'utf8'));
if (reference === null) { console.log(`_shared/${sharedFile} has no <main>`); process.exit(1); }
let failed = 0;
const dirs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name).sort();

console.log(`Comparing <direction>/${pageFile} with _shared/${sharedFile}`);
for (const name of dirs) {
  const file = join(root, name, pageFile);
  if (!existsSync(file)) { console.log(`${name}: no ${pageFile}`); failed++; continue; }
  const text = visibleText(readFileSync(file, 'utf8'));
  if (text === reference) { console.log(`${name}: same text as the shared content (${reference.length} characters)`); continue; }
  failed++;
  let i = 0;
  while (text && i < reference.length && text[i] === reference[i]) i++;
  console.log(`${name}: DIFFERENT. First difference at character ${i}:`);
  console.log(`  shared:    …${reference.slice(Math.max(0, i - 30), i + 50)}…`);
  console.log(`  direction: …${(text ?? '(no <main> found)').slice(Math.max(0, i - 30), i + 50)}…`);
}
const EXPECTED = 3;
if (dirs.length !== EXPECTED) {
  console.log(`Expected ${EXPECTED} directions, found ${dirs.length}`);
  process.exit(1);
}
console.log(failed ? `${failed} of ${dirs.length} directions differ from the shared content` : `All ${dirs.length} directions show the same text in the same order`);
process.exit(failed ? 1 : 0);

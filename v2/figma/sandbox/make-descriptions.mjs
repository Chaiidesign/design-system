// Writes ds-tokens/descriptions.json: one { collection, name, description, source } for every token in ds-tokens/dist/tokens.json.
// Usage: node v2/figma/sandbox/make-descriptions.mjs [--check]
//
// Sources, in order:
//   1. "owner, Semantic Tokens file": the description the owner's Figma file already holds (v2/figma/semantic.txt), used verbatim.
//   2. "proposed, ds-tokens/proposed/tokens.json": a proposed token's own description.
//   3. "owner, 15 November sandbox": an old sandbox description (v2/figma/sandbox/old-descriptions.json) found for the same token
//      after mapping the old name to the new one, but only when it says what the token is for. Every old description read on
//      16 November 2026 is a provenance stamp ("Copied from Product variables ..."), so none qualifies; the mapping is still
//      computed and written to v2/figma/sandbox/old-name-map.json so the result can be checked.
//   4. "drafted": one plain sentence by the rules below, saying what the token is for, never its value.
// --check exits 1 if any token has no description or a description repeats its value.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSnapshots } from '../../tools/lib/snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'ds-tokens/dist/tokens.json'), 'utf8'));
const old = JSON.parse(readFileSync(join(ROOT, 'v2/figma/sandbox/old-descriptions.json'), 'utf8'));
const snap = loadSnapshots(join(ROOT, 'v2/figma'));

// ---------- old name to new name, by rule ----------
const STATES = ['hover', 'active', 'disabled', 'focus', 'selected'];
const byCollection = new Map();
for (const t of tokens) { if (!byCollection.has(t.collection)) byCollection.set(t.collection, new Set()); byCollection.get(t.collection).add(t.name); }
function mapOld(collection, oldName) {
  const names = byCollection.get(collection) || new Set();
  let n = oldName.toLowerCase().replace(/ /g, '-');              // rule a: lowercase, spaces become hyphens
  if (collection === 'Radius') n = n.replace(/^radius\//, '');    // rule b: the collection prefix leaves the name
  const cands = [n];
  const joined = n.match(new RegExp(`^(.*)-(${STATES.join('|')})$`));
  if (joined) cands.push(`${joined[1]}/${joined[2]}`);           // rule c: a joined state becomes its own segment
  cands.push(`${n}/default`);                                      // rule d: a group's resting member is written /default
  const lone = n.match(new RegExp(`^([^/]+)/(${STATES.join('|')})$`));
  if (lone) cands.push(`${lone[1]}/primary/${lone[2]}`);           // rule e: a state with no rank belongs to the primary rank
  const hit = cands.find((c) => names.has(c));
  return hit ? { name: hit, rule: cands.indexOf(hit) } : null;
}
const oldMap = [];
const oldByNew = new Map();
for (const g of old.groups) {
  const coll = g.collection.replace(' (Product variables)', '');
  for (const name of g.names) {
    const m = mapOld(coll, name);
    oldMap.push({ collection: coll, old: name, new: m ? m.name : null, description: g.description });
    if (m) oldByNew.set(`${coll}|${m.name}`, g.description);
  }
}
// A description that only records where a copy came from does not say what the token is for.
const isProvenance = (d) => /^copied from /i.test(d.trim());

// ---------- drafted descriptions ----------
const HUE = (h) => h;
const an = (w) => (/^[aeiou]/.test(w) ? 'an' : 'a'); // article before a hue word
const STATE_TAIL = { hover: 'under the pointer', active: 'while it is pressed', disabled: 'when it cannot be used' };
const NAMED = {
  'Themes|text/primary': 'Body text and headings on any surface.',
  'Themes|text/secondary': 'Supporting text, such as hints and details, on any surface.',
  'Themes|text/placeholder': 'Placeholder text inside an empty field.',
  'Themes|text/disabled': 'Text of a control that cannot be used.',
  'Themes|text/inverse': 'Text on an inverse surface, such as a tooltip.',
  'Themes|text/on': 'Text on a bold brand or action fill, such as a primary button.',
  'Themes|text/link/default': 'A link at rest.',
  'Themes|text/link/hover': 'A link under the pointer.',
  'Themes|text/link/active': 'A link while it is pressed.',
  'Themes|text/error': 'Text that reports an error, such as a field message.',
  'Themes|text/success': 'Text that confirms something worked.',
  'Themes|text/warning': 'Text that warns before something goes wrong.',
  'Themes|text/info': 'Text that gives neutral information or a tip.',
  'Themes|text/brand': 'Text in the brand colour, such as a highlighted word.',
  'Themes|icon/primary': 'Icons that sit beside body text.',
  'Themes|icon/secondary': 'Supporting icons, such as a chevron or a hint.',
  'Themes|icon/disabled': 'An icon in a control that cannot be used.',
  'Themes|icon/inverse': 'An icon on an inverse surface, such as a tooltip.',
  'Themes|icon/on': 'An icon on a bold brand or action fill.',
  'Themes|icon/brand': 'An icon in the brand colour.',
  'Themes|icon/error': 'An icon that marks an error.',
  'Themes|icon/success': 'An icon that marks success.',
  'Themes|icon/warning': 'An icon that marks a warning.',
  'Themes|icon/info': 'An icon that marks information.',
  'Themes|surface/error': 'The background of an error message or banner.',
  'Themes|surface/success': 'The background of a success message or banner.',
  'Themes|surface/warning': 'The background of a warning message or banner.',
  'Themes|surface/info': 'The background of an information message or banner.',
  'Themes|surface/brand/subtle': 'A light brand background, such as a selected item or a promotion.',
  'Themes|surface/brand/bold': 'A strong brand background, such as a banner.',
  'Themes|border/secondary': 'A quieter edge, such as a divider inside a card.',
  'Themes|border/focus': 'The ring around whatever has keyboard focus.',
  'Themes|border/info': 'The edge of an information message.',
  'Themes|border/error': 'The edge of a field with an error, or of an error message.',
  'Themes|border/success': 'The edge of a success message.',
  'Themes|border/warning': 'The edge of a warning message.',
  'Themes|border/brand': 'A brand edge, such as a selected card.',
  'Typography|font-family/sans': 'The typeface for all interface text.',
  'Typography|font-weight/heading': 'Weight of every heading.',
  'Typography|font-weight/section-label-base': 'Weight of a section label.',
  'Typography|font-weight/label': 'Weight of labels on controls.',
  'Typography|font-weight/body': 'Weight of body text.',
  'Typography|font-weight/emphasis': 'Weight of emphasised words inside body text.',
  'Radius|container/small': 'Corners of a small container, such as a tag or tooltip.',
  'Radius|container/medium': 'Corners of a card or menu.',
  'Radius|container/large': 'Corners of a dialog or sheet.',
  'Radius|round/full': 'A fully round corner, for pills and circles.',
};
// Group nouns for surface, interactive and border roles that come in states.
const GROUP = {
  'surface/primary': ['The page and card background', 'A row or item on the page'],
  'surface/secondary': ['A grouped area on the page, such as a field or a panel', 'A grouped area'],
  'surface/tertiary': ['A nested area inside a grouped area, such as a chip', 'A nested area'],
  'interactive/primary': ['The fill of the main action button', 'The main action button'],
  'interactive/neutral': ['The fill of a neutral button, such as Cancel', 'A neutral button'],
  'interactive/secondary': ['The fill of a secondary button', 'A secondary button'],
  'interactive/error': ['The fill of a destructive action button, such as Delete', 'A destructive action button'],
  'interactive/success': ['The fill of a confirming action button', 'A confirming action button'],
  'interactive/warning': ['The fill of a button for an action that needs care', 'A button for an action that needs care'],
  'border/primary': ['The edge of a card, divider or container', 'The edge of a card or container'],
  'border/strong': ['The edge of a field', 'The edge of a field'],
};
const TYPE_ROLE = {
  'heading-1': 'a level 1 heading, the page title', 'heading-2': 'a level 2 heading', 'heading-3': 'a level 3 heading',
  'heading-4': 'a level 4 heading', 'heading-5': 'a level 5 heading', 'heading-6': 'a level 6 heading, the smallest',
  'section-label-base': 'a section label, the small heading above a group of items',
  'label-large': 'a label on a large control', 'label-base': 'a label on a default control',
  'label-small': 'a label on a small control or tag', 'label-xsmall': 'the smallest labels, such as a badge count',
  'body-large': 'large body text, such as an introduction', 'body-base': 'body text',
  'body-small': 'small body text, such as help text or a caption', 'body-xsmall': 'the smallest body text, such as a legal note',
};
const RADIUS_HEIGHT = (h) => `Corners of a control ${h} pixels tall.`;
const GRADIENT = {
  'base-start': (h) => `Start colour of the ${h} gradient background.`,
  'base-end': (h) => `End colour of the ${h} gradient background.`,
  'glow-warm': (h) => `The warm glow laid over the ${h} gradient.`,
  glow: (h) => `The main glow laid over the ${h} gradient.`,
  text: (h) => `Text on the ${h} gradient.`,
};

function draft(t) {
  const k = `${t.collection}|${t.name}`;
  if (NAMED[k]) return NAMED[k];
  const s = t.name.split('/');
  if (t.collection === 'Themes') {
    if (s[1] === 'accent') {
      const [first, , hue, tier, state] = s;
      if (first === 'text') return tier === 'bold' ? `Stronger ${HUE(hue)} text, for emphasis on ${an(hue)} ${hue} accent surface.` : `${hue[0].toUpperCase() + hue.slice(1)} text on ${an(hue)} ${hue} accent surface, such as a tag.`;
      if (first === 'icon') return tier === 'bold' ? `A stronger ${hue} icon on ${an(hue)} ${hue} accent surface.` : `${an(hue) === 'an' ? 'An' : 'A'} ${hue} icon on ${an(hue)} ${hue} accent surface.`;
      if (first === 'surface') {
        const what = { subtlest: `The faintest ${hue} background, for a large tinted area`, subtle: `A light ${hue} background, such as a tag or badge`, bold: `A strong ${hue} background, such as a solid tag` }[tier];
        const short = { subtlest: `The faintest ${hue} background`, subtle: `A light ${hue} background`, bold: `A strong ${hue} background` }[tier];
        return state === 'hover' ? `${short} under the pointer.` : `${what}.`;
      }
    }
    const parent = s.slice(0, -1).join('/');
    const state = s.at(-1);
    if (GROUP[parent]) {
      const [rest, noun] = GROUP[parent];
      if (state === 'default') return `${rest}.`;
      if (STATE_TAIL[state]) return `${noun} ${STATE_TAIL[state]}.`;
    }
  }
  if (t.collection === 'Typography') {
    const role = TYPE_ROLE[s[1]];
    if (s[0] === 'font-size' && role) return `Font size of ${role}.`;
    if (s[0] === 'line-height' && role) return `Line height of ${role}.`;
  }
  if (t.collection === 'Radius' && s[0] === 'height') return RADIUS_HEIGHT(s[1]);
  if (t.collection === 'Density') {
    const step = Number(s[1]);
    if (s[0] === 'scaled') return step === 0 ? 'No space, in any density.' : `Step ${step} of the spacing that tightens in compact density, for padding and gaps inside components.`;
    if (s[0] === 'static') return step === 0 ? 'No space, in any density.' : `Step ${step} of the spacing that stays the same in every density, for layout between components.`;
  }
  if (t.collection === 'Surface Gradients' && GRADIENT[s[1]]) return GRADIENT[s[1]](s[0]);
  return null;
}

// ---------- assemble ----------
const figDesc = new Map();
for (const c of snap.semantic) for (const v of c.variables) if (v.description.trim()) figDesc.set(`${c.name}|${v.name}`, v.description.trim());

const out = [];
const problems = [];
for (const t of tokens) {
  const k = `${t.collection}|${t.name}`;
  let description = null, source = null;
  if (figDesc.has(k)) { description = figDesc.get(k); source = 'owner, Semantic Tokens file'; }
  else if (t.proposed && t.description) { description = t.description; source = 'proposed, ds-tokens/proposed/tokens.json'; }
  else if (oldByNew.has(k) && !isProvenance(oldByNew.get(k))) { description = oldByNew.get(k); source = 'owner, 15 November sandbox'; }
  else { description = draft(t); source = 'drafted'; }
  if (!description) problems.push(`no description for ${k}`);
  for (const v of Object.values(t.values)) if (description && String(v).length > 2 && description.includes(String(v))) problems.push(`${k}: description repeats the value ${v}`);
  out.push({ collection: t.collection, name: t.name, description, source });
}
const unmapped = oldMap.filter((m) => !m.new);
if (process.argv.includes('--check')) {
  console.log(problems.length ? problems.join('\n') : `descriptions: ${out.length} tokens, all described`);
  process.exit(problems.length ? 1 : 0);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
writeFileSync(join(ROOT, 'ds-tokens/descriptions.json'), JSON.stringify(out, null, 2) + '\n');
writeFileSync(join(ROOT, 'v2/figma/sandbox/old-name-map.json'), JSON.stringify({ mapped: oldMap.filter((m) => m.new).length, unmapped: unmapped.map((m) => `${m.collection} ${m.old}`), map: oldMap }, null, 2) + '\n');
const bySource = {};
for (const d of out) bySource[d.source] = (bySource[d.source] || 0) + 1;
console.log(`descriptions.json: ${out.length} tokens; by source ${JSON.stringify(bySource)}; old names mapped ${oldMap.length - unmapped.length} of ${oldMap.length}, unmapped: ${unmapped.map((m) => `${m.collection} ${m.old}`).join(', ') || 'none'}`);

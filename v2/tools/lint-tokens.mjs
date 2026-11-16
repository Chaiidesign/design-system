// lint-tokens.mjs: checks the Figma variable snapshot against the owner's naming standard.
//
// What it checks: the ten naming rules and "one job per token" from the V2 naming standard, plus a few
// things the standard does not cover yet (type scale, density, categories that do not exist yet).
// It reads Figma only through v2/tools/lib/snapshot.mjs and never changes the snapshot.
//
// How to run (from the repository root):
//   node v2/tools/lint-tokens.mjs                 report, write ds-tokens/audit/lint.json, exit 1 if anything breaks the standard
//   node v2/tools/lint-tokens.mjs --report-only   the same, but exit 0 whatever it finds
//   node v2/tools/lint-tokens.mjs --self-test     plant one fault per rule in a copy held in memory, confirm that rule
//                                                 (and only that rule) catches it; writes nothing; exit 0 only if every rule fired
//
// Every finding has a severity:
//   "breaks the standard"  the file contradicts a written rule of the standard
//   "decide"               a person has to choose: the standard is silent, or the standard and the file disagree
//   "note"                 listed for a person to confirm, not a failure
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSnapshots, makeResolver, expectedSyntax, SNAPSHOT_DIR } from './lib/snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'ds-tokens', 'audit', 'lint.json');

const BREAKS = 'breaks the standard';
const DECIDE = 'decide';
const NOTE = 'note';

const STATES = ['default', 'hover', 'active', 'focus', 'selected', 'disabled'];
const RANKS = ['primary', 'secondary', 'tertiary', 'quaternary'];
const OLD_SIZE_WORDS = { xsmall: 'xs', small: 'sm', base: 'md', medium: 'md', large: 'lg', xlarge: 'xl', xxlarge: '2xl' };
const CATEGORY_COLLECTIONS = ['Color', 'Typography', 'Radius', 'Space', 'Gradient'];
const COLLECTION_SHOULD_BE = { Themes: 'Color', Colors: 'Color', Density: 'Space', 'Surface Gradients': 'Gradient' };
// Collections the standard's category list has no place for. Reported once, together, for a person to decide.
const UNLISTED_CATEGORIES = ['Border', 'Size', 'Motion', 'Elevation'];
const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'neutral', 'slate', 'gray', 'zinc', 'stone'];
const PRIMITIVE_WORDS = [...HUES, 'light', 'dark', 'typography', 'font-size', 'line-height', 'font-family', 'font-weight'];

// The CSS prefix the standard's table promises (Tailwind v4 theme namespaces), by collection and, for
// Typography, by the first segment of the name.
const TAILWIND_TYPOGRAPHY = { 'font-size': 'text', 'line-height': 'leading', 'font-family': 'font', 'font-weight': 'font-weight' };
const TAILWIND_COLLECTION = { Themes: 'color', Color: 'color', Radius: 'radius', Density: 'spacing', Space: 'spacing', 'Surface Gradients': 'gradient', Gradient: 'gradient' };

// Categories a complete token set usually has and this one may not have started. A category is covered when a variable
// name matches `re`, or when a non-empty collection of that purpose exists (`collection`, and `names` when only some of
// its variables count: Border covers border width through width/*). Elevation may also be held as Figma effect styles,
// which the variable snapshot does not contain: see stylesCover in the rule.
const CATEGORIES = [
  { id: 'border width', re: /border-width|border\/width|stroke-width|stroke\/width/, collection: 'Border', names: /^width\// },
  { id: 'motion or duration', re: /motion|duration/, collection: 'Motion' },
  { id: 'easing', re: /easing|(^|[/-])ease([/-]|$)/, collection: 'Motion' },
  { id: 'elevation or shadow', re: /elevation|shadow/, collection: 'Elevation', styles: true },
  { id: 'opacity', re: /opacity|(^|[/-])alpha([/-]|$)/ },
  { id: 'z-index', re: /z-index|zindex|(^|\/)z(\/|$)/ },
  { id: 'breakpoint', re: /breakpoint|(^|\/)screen(s)?(\/|$)/ },
  { id: 'icon size', re: /icon-size|icon\/size|size\/icon/, collection: 'Size' },
  { id: 'control height', re: /control-height|control\/height|height\/control/, collection: 'Size' },
  { id: 'focus ring width and offset', re: /focus-ring|focus\/ring|ring-width|ring-offset|outline-width|outline-offset|(^|\/)(focus|ring)\/(width|offset)$/ },
];

// Effect style names, one per line, from <snapshot folder>/styles.txt when that file exists; null when it does not,
// because then the snapshot cannot say whether Figma holds elevation as styles.
function loadStyles(dir = SNAPSHOT_DIR) {
  const f = join(dir, 'styles.txt');
  if (!existsSync(f)) return null;
  return readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
}

// ---------- context ----------

const label = (v) => `${v.file === 'primitives' ? 'primitive ' : ''}${v.collection}: ${v.name}`;
const segs = (name) => name.split('/');
const words = (name) => name.split(/[/-]/);
const parentOf = (name) => segs(name).slice(0, -1).join('/');
const lastOf = (name) => segs(name).at(-1);
const fmt = (val) => (typeof val === 'number' ? `${val}` : typeof val === 'string' ? val : String(val));

function buildContext(snap, styles = null) {
  const r = makeResolver(snap);
  const sem = [];
  for (const c of snap.semantic) {
    for (const v of c.variables) {
      const res = c.modes.map((_, i) => r.resolve(v, i));
      sem.push({ ...v, modes: c.modes, res, resolved: res.map((x) => x.value) });
    }
  }
  const prims = snap.primitives.flatMap((c) => c.variables.map((v) => ({ ...v, modes: c.modes })));
  return { snap, r, sem, prims, styles };
}

function finding(rule, severity, message, tokens, extra = {}) {
  return { rule: rule.id, standardRule: rule.standardRule, severity, message, count: tokens.length, tokens, ...extra };
}

// ---------- rules ----------

const RULES = [
  {
    id: 'name-case', standardRule: '1', title: 'Names are lowercase kebab-case, slash between levels, no spaces',
    check(ctx, rule) {
      const ok = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      const bad = [...ctx.prims, ...ctx.sem].filter((v) => segs(v.name).some((s) => !ok.test(s)));
      return bad.length ? [finding(rule, BREAKS, 'These names have a part that is not lowercase kebab-case (capital letters, spaces, a leading or trailing hyphen, or other characters).', bad.map(label))] : [];
    },
  },
  {
    id: 'state-segment', standardRule: '3', title: 'A state is always its own last segment',
    check(ctx, rule) {
      const notLast = [];
      const joined = [];
      for (const v of ctx.sem) {
        const s = segs(v.name);
        s.forEach((seg, i) => {
          if (STATES.includes(seg) && i < s.length - 1) notLast.push(label(v));
          else if (!STATES.includes(seg) && seg.split('-').some((w) => STATES.includes(w))) joined.push(label(v));
        });
      }
      const out = [];
      if (notLast.length) out.push(finding(rule, BREAKS, 'A state word sits before the last segment; the state must be the last segment. Fix: rename so the state word is not a group name, for example ring/width instead of focus/width.', [...new Set(notLast)]));
      if (joined.length) out.push(finding(rule, BREAKS, 'A state word is joined to another word with a hyphen (for example primary-hover); it must be its own segment.', [...new Set(joined)]));
      return out;
    },
  },
  {
    id: 'state-set', standardRule: '3', title: 'State groups are complete and siblings are written the same way',
    check(ctx, rule) {
      const groups = new Map();
      for (const v of ctx.sem) {
        const key = `${v.file}|${v.collection}|${parentOf(v.name)}`;
        if (!groups.has(key)) groups.set(key, { collection: v.collection, file: v.file, parent: parentOf(v.name), members: [] });
        groups.get(key).members.push(v);
      }
      // A state group is one whose members are all state words and include more than default
      // (interactive/primary/*). A mixed group such as text/* (primary, secondary, disabled) is not one.
      const isStateGroup = (g) => g.members.every((m) => STATES.includes(lastOf(m.name))) && g.members.some((m) => lastOf(m.name) !== 'default');
      const missingDefault = [];
      const incomplete = [];
      for (const g of groups.values()) {
        if (!isStateGroup(g)) continue;
        const states = g.members.map((m) => lastOf(m.name));
        if (!states.includes('default')) missingDefault.push(`${g.collection}: ${g.parent}/*`);
        const root = segs(g.parent)[0];
        if ((root === 'interactive' || root === 'surface') && states.includes('hover')) {
          const lacks = ['active', 'disabled'].filter((s) => !states.includes(s));
          if (lacks.length) incomplete.push({ group: `${g.collection}: ${g.parent}/*`, lacks });
        }
      }
      // A leaf named with a rank word (border/secondary) next to a rank group that has states (border/primary/*).
      const mismatch = [];
      const rankGroupsAt = new Map(); // "collection|grandparent" -> rank names whose group has states
      for (const g of groups.values()) {
        if (!g.parent || !RANKS.includes(lastOf(g.parent)) || !isStateGroup(g)) continue;
        const k = `${g.collection}|${parentOf(g.parent)}`;
        if (!rankGroupsAt.has(k)) rankGroupsAt.set(k, []);
        rankGroupsAt.get(k).push(lastOf(g.parent));
      }
      for (const v of ctx.sem) {
        const leaf = lastOf(v.name);
        const ranks = rankGroupsAt.get(`${v.collection}|${parentOf(v.name)}`);
        if (!ranks || !RANKS.includes(leaf) || ranks.includes(leaf)) continue;
        const pre = parentOf(v.name) ? `${parentOf(v.name)}/` : '';
        mismatch.push(`${label(v)} has no states while ${ranks.map((r) => `${pre}${r}/*`).join(', ')} has them`);
      }
      const out = [];
      if (missingDefault.length) out.push(finding(rule, BREAKS, 'These state groups have no default member; the standard says default is written out.', missingDefault));
      if (incomplete.length) out.push(finding(rule, DECIDE, 'These surface or interactive groups have a hover state but no active or disabled state. Either the set is incomplete or these groups are meant to have only hover.', incomplete.map((x) => `${x.group} (lacks ${x.lacks.join(' and ')})`)));
      if (mismatch.length) out.push(finding(rule, DECIDE, 'Sibling groups are written differently: one has states, the other is a single token without /default.', mismatch));
      return out;
    },
  },
  {
    id: 'size-scale', standardRule: '4', title: 'One size scale xs, sm, md, lg, xl, 2xl; no names taken from a pixel value',
    check(ctx, rule) {
      // A size word counts only as the last hyphen word of a segment (body-base, container/medium),
      // so a gradient's base-start, where base is a layer and not a size, is not counted.
      const sizeWords = (name) => segs(name).map((s) => s.split('-').at(-1)).filter((w) => w in OLD_SIZE_WORDS);
      const oldWords = ctx.sem.filter((v) => sizeWords(v.name).length);
      const pixel = ctx.sem.filter((v) => v.collection === 'Radius' && segs(v.name).some((s) => /^\d+$/.test(s)));
      const numbered = ctx.sem.filter((v) => v.collection !== 'Radius' && segs(v.name).some((s) => /^\d+$/.test(s)));
      const out = [];
      if (oldWords.length) out.push(finding(rule, BREAKS, 'These names use xsmall, small, base, medium or large instead of xs, sm, md, lg, xl, 2xl.', oldWords.map((v) => `${label(v)} (${sizeWords(v.name).map((w) => `${w} -> ${OLD_SIZE_WORDS[w]}`).join(', ')})`)));
      if (pixel.length) out.push(finding(rule, BREAKS, 'These radius names are taken from a pixel value (the height of the thing they round), which the standard forbids.', pixel.map(label)));
      if (numbered.length) out.push(finding(rule, DECIDE, 'These semantic names are numbers (the pixel value times ten), not the xs to 2xl scale. The standard names radius/height/20 as the example; it does not say whether a spacing step counts.', numbered.map(label)));
      return out;
    },
  },
  {
    id: 'primitive-hygiene', standardRule: '5', title: 'Primitives are named by value and are all used',
    check(ctx, rule) {
      const key = (x) => `${x.collection}|${x.name}`;
      const reached = new Set();
      for (const v of ctx.sem) for (const res of v.res) for (const step of res.chain) if (step.file === 'primitives') reached.add(key(step));
      const unused = ctx.prims.filter((p) => !reached.has(key(p)));
      const byFamily = new Map();
      for (const p of unused) {
        const fam = parentOf(p.name) || `${p.collection} (top level)`;
        if (!byFamily.has(fam)) byFamily.set(fam, []);
        byFamily.get(fam).push(lastOf(p.name));
      }
      const famSize = (fam) => ctx.prims.filter((p) => (parentOf(p.name) || `${p.collection} (top level)`) === fam).length;
      const families = [...byFamily].map(([fam, steps]) => ({ family: fam, unused: steps.length, of: famSize(fam), steps }));
      const notValue = ctx.prims.filter((p) => segs(p.name).some((s) => !/^-?\d+$/.test(s) && !PRIMITIVE_WORDS.includes(s)));
      const out = [];
      if (unused.length) {
        const summary = families.map((f) => (f.unused === f.of ? `${f.family} (whole family, ${f.of})` : `${f.family} (${f.unused} of ${f.of}: ${f.steps.join(', ')})`)).join('; ');
        out.push(finding(rule, DECIDE, `${unused.length} primitives are reached by no semantic token. By family: ${summary}.`, unused.map(label), { families }));
      }
      if (notValue.length) out.push(finding(rule, BREAKS, 'These primitive names contain a word that is not a value, a colour family or a category (for example not-used, font, rounded-full).', notValue.map(label)));
      return out;
    },
  },
  {
    id: 'alias', standardRule: '6', title: 'Every semantic token aliases a primitive, written the same way as its siblings',
    check(ctx, rule) {
      const primByValue = new Map();
      for (const p of ctx.prims) {
        const val = ctx.r.resolve(p, 0).value;
        const k = `${p.type}|${typeof val === 'string' ? val.toLowerCase() : val}`;
        if (!primByValue.has(k)) primByValue.set(k, []);
        primByValue.get(k).push(p);
      }
      const exists = [];
      const should = [];
      const crossing = [];
      // One entry per token, naming the value in each mode that holds a raw value.
      for (const v of ctx.sem) {
        const found = [];
        const missing = [];
        v.values.forEach((raw, i) => {
          const where = v.modes.length > 1 ? ` (${v.modes[i]})` : '';
          if (raw.startsWith('{')) {
            const target = raw.slice(1, -1);
            const mode = v.modes[i];
            if ((mode === 'dark' && target.startsWith('neutral/light/')) || (mode === 'light' && target.startsWith('neutral/dark/'))) crossing.push(`${label(v)} (${mode} -> ${target})`);
            return;
          }
          const val = v.resolved[i];
          const hits = primByValue.get(`${v.type}|${typeof val === 'string' ? val.toLowerCase() : val}`);
          if (hits) found.push(`${fmt(val)}${where} = primitive ${hits.map((h) => `${h.collection} ${h.name}`).join(' or ')}`);
          else missing.push(`${fmt(val)}${where}`);
        });
        if (found.length) exists.push(`${label(v)} holds ${found.join(', ')}`);
        if (missing.length) should.push(`${label(v)} holds ${missing.join(', ')}; no primitive has ${missing.length > 1 ? 'these values' : 'that value'}`);
      }
      const out = [];
      if (exists.length) out.push(finding(rule, BREAKS, 'These semantic tokens hold a raw value although a primitive with that value exists.', exists));
      if (should.length) out.push(finding(rule, BREAKS, 'These semantic tokens hold a raw value that no primitive has; a primitive should exist for it.', should));
      if (crossing.length) out.push(finding(rule, NOTE, 'These aliases cross modes (a dark value points at a light neutral, or the other way) where their siblings do not. Listed, not failed: it may be intended.', crossing));
      return out;
    },
  },
  {
    id: 'mode-names', standardRule: '7', title: 'Mode names are lowercase words; a one-mode collection calls its mode default',
    check(ctx, rule) {
      const bad = [];
      for (const [file, list] of [['semantic', ctx.snap.semantic], ['primitives', ctx.snap.primitives]]) {
        for (const c of list) {
          const who = `${file === 'primitives' ? 'primitive ' : ''}collection ${c.name}`;
          c.modes.forEach((m) => { if (!/^[a-z]+$/.test(m)) bad.push(`${who}, mode "${m}" is not a lowercase word`); });
          if (c.modes.length === 1 && c.modes[0] !== 'default') bad.push(`${who}, single mode "${c.modes[0]}" should be called default`);
        }
      }
      return bad.length ? [finding(rule, BREAKS, 'These mode names break rule 7.', bad)] : [];
    },
  },
  {
    id: 'collection-names', standardRule: '8', title: 'Collections are named for their category',
    check(ctx, rule) {
      const wrong = [];
      const empty = [];
      const unlisted = [];
      for (const [file, list] of [['semantic', ctx.snap.semantic], ['primitives', ctx.snap.primitives]]) {
        for (const c of list) {
          const who = `${file === 'primitives' ? 'primitive ' : ''}collection ${c.name}`;
          if (file === 'semantic' && UNLISTED_CATEGORIES.includes(c.name)) unlisted.push(`${who}${c.variables.length ? ` (${c.variables.length} variables)` : ' (empty)'}`);
          else if (c.variables.length === 0) empty.push(`${who} has no variables`);
          else if (!CATEGORY_COLLECTIONS.includes(c.name)) wrong.push(`${who} should be ${COLLECTION_SHOULD_BE[c.name] || 'one of ' + CATEGORY_COLLECTIONS.join(', ')}`);
        }
      }
      const out = [];
      if (wrong.length) out.push(finding(rule, BREAKS, `These collection names are not in the category list (${CATEGORY_COLLECTIONS.join(', ')}). The collection name becomes the JSON path and CSS prefix, so this decides every exported name.`, wrong));
      if (empty.length) out.push(finding(rule, DECIDE, 'These collections are empty and not in the category list: fill them or remove them.', empty));
      if (unlisted.length) out.push(finding(rule, DECIDE, `The standard's category list (${CATEGORY_COLLECTIONS.join(', ')}) has no place for these four (${UNLISTED_CATEGORIES.join(', ')}); extend the list or fold them into an existing category.`, unlisted));
      return out;
    },
  },
  {
    id: 'description', standardRule: '9', title: 'Every semantic token has a one-line description',
    check(ctx, rule) {
      const out = [];
      for (const c of ctx.snap.semantic) {
        const empty = ctx.sem.filter((v) => v.collection === c.name && !v.description.trim());
        if (empty.length) out.push(finding(rule, BREAKS, `${empty.length} of ${c.variables.length} tokens in ${c.name} have no description.`, empty.map(label), { collection: c.name }));
      }
      return out;
    },
  },
  {
    id: 'scopes', standardRule: '10', title: 'Every token has scopes that match its job, never all scopes',
    check(ctx, rule) {
      const all = ctx.sem.filter((v) => v.scopes.includes('ALL_SCOPES'));
      // A primitive with no scopes is hidden from every picker, which is what rule 5 asks: not a finding.
      const primAll = ctx.prims.filter((v) => v.scopes.includes('ALL_SCOPES'));
      // No Figma scope fits a duration or an easing, so an unscoped Motion token is only a note.
      const none = ctx.sem.filter((v) => v.scopes.length === 0 && v.collection !== 'Motion');
      const motionNone = ctx.sem.filter((v) => v.scopes.length === 0 && v.collection === 'Motion');
      const contra = [];
      const only = (v, s) => v.scopes.length === 1 && v.scopes[0] === s;
      for (const v of ctx.sem) {
        if (v.scopes.length === 0) continue;
        const first = segs(v.name)[0];
        if (v.collection === 'Themes' && first === 'text' && !v.scopes.includes('TEXT_FILL')) contra.push(`${label(v)} is text but scoped ${v.scopes.join(',')}`);
        if (v.collection === 'Themes' && first === 'border' && !v.scopes.includes('STROKE_COLOR')) contra.push(`${label(v)} is a border but scoped ${v.scopes.join(',')}`);
        if (v.collection === 'Typography' && first === 'font-size' && !only(v, 'FONT_SIZE')) contra.push(`${label(v)} is a font size but scoped ${v.scopes.join(',')}`);
        if (v.collection === 'Typography' && first === 'line-height' && !only(v, 'LINE_HEIGHT')) contra.push(`${label(v)} is a line height but scoped ${v.scopes.join(',')}`);
        if (v.collection === 'Typography' && first === 'font-family' && !only(v, 'FONT_FAMILY')) contra.push(`${label(v)} is a font family but scoped ${v.scopes.join(',')}`);
        if (v.collection === 'Typography' && first === 'font-weight' && !(only(v, 'FONT_WEIGHT') || only(v, 'FONT_STYLE'))) contra.push(`${label(v)} is a font weight but scoped ${v.scopes.join(',')}`);
        if (v.collection === 'Radius' && !only(v, 'CORNER_RADIUS')) contra.push(`${label(v)} is a radius but scoped ${v.scopes.join(',')}`);
      }
      const out = [];
      if (all.length) out.push(finding(rule, BREAKS, 'These semantic tokens are scoped to ALL_SCOPES, which the standard forbids.', all.map(label)));
      if (none.length) out.push(finding(rule, BREAKS, 'These semantic tokens have no scopes at all.', none.map(label)));
      if (primAll.length) out.push(finding(rule, DECIDE, 'These primitives are scoped to ALL_SCOPES: primitives are visible in every picker; rule 5 says components reach only semantic tokens. Empty scopes would hide them.', primAll.map(label)));
      if (motionNone.length) out.push(finding(rule, NOTE, 'These Motion tokens have no scopes: no Figma scope fits a duration or an easing, so none can be set. Listed, not failed.', motionNone.map(label)));
      if (contra.length) out.push(finding(rule, BREAKS, 'These scopes contradict the name (ALL_SCOPES counts here too, because it is not the one scope the name promises).', contra));
      return out;
    },
  },
  {
    id: 'code-syntax', standardRule: '10', title: 'Every token has WEB code syntax, and it follows the naming rule',
    check(ctx, rule) {
      const missingSem = ctx.sem.filter((v) => !v.syntax);
      const missingPrim = ctx.prims.filter((v) => !v.syntax);
      const wrong = ctx.sem.filter((v) => v.syntax && v.syntax !== expectedSyntax(v));
      const out = [];
      if (missingSem.length) out.push(finding(rule, BREAKS, 'These semantic tokens have no WEB code syntax.', missingSem.map(label)));
      if (wrong.length) out.push(finding(rule, BREAKS, 'This WEB code syntax is not what the naming rule produces.', wrong.map((v) => `${label(v)} has ${v.syntax}, rule gives ${expectedSyntax(v)}`)));
      if (missingPrim.length) out.push(finding(rule, DECIDE, `${missingPrim.length} of ${ctx.prims.length} primitives have no WEB code syntax. Rule 10 says every token has one; rule 5 says components never reach primitives. Decide whether primitives get CSS names.`, missingPrim.map(label)));
      return out;
    },
  },
  {
    id: 'tailwind-namespace', standardRule: '10', title: 'CSS prefixes follow the Tailwind v4 theme namespaces in the standard\'s table',
    check(ctx, rule) {
      const groups = new Map();
      for (const v of ctx.sem) {
        if (!v.syntax) continue;
        const first = segs(v.name)[0];
        const promised = v.collection === 'Typography' ? TAILWIND_TYPOGRAPHY[first] : TAILWIND_COLLECTION[v.collection];
        if (!promised) continue;
        // Only the prefix is checked here. If the syntax does not end in the token's own path, the prefix
        // cannot be read and the code-syntax rule reports it instead.
        const m = v.syntax.match(/^var\(--(.*)\)$/);
        const rest = v.collection === 'Typography' ? segs(v.name).slice(1).join('-') : v.name.replace(/\/default$/, '').split('/').join('-');
        if (!m || !m[1].endsWith(`-${rest}`)) continue;
        const actualPrefix = m[1].slice(0, m[1].length - rest.length - 1);
        if (actualPrefix === promised) continue;
        const key = `${actualPrefix}|${promised}`;
        if (!groups.has(key)) groups.set(key, { actualPrefix, promised, tokens: [] });
        groups.get(key).tokens.push(label(v));
      }
      return [...groups.values()].map((g) => finding(rule, BREAKS, `${g.tokens.length} tokens use the CSS prefix --${g.actualPrefix}- where the standard's table promises --${g.promised}-.`, g.tokens, { actualPrefix: `--${g.actualPrefix}-`, promisedPrefix: `--${g.promised}-` }));
    },
  },
  {
    id: 'default-dropped', standardRule: 'separator sentence', title: 'Each surface changes only the separator, never the words',
    check(ctx, rule) {
      const dropped = ctx.sem.filter((v) => v.name.endsWith('/default') && v.syntax && !/-default\)$/.test(v.syntax));
      return dropped.length ? [finding(rule, DECIDE, `${dropped.length} tokens end in /default in Figma but their code syntax drops the word default. The standard says each surface changes only the separator, never the words; the file does otherwise. Decide which one is right.`, dropped.map(label))] : [];
    },
  },
  {
    id: 'one-job', standardRule: 'one job per token', title: 'One job per token: tokens that promise different jobs do not share a value',
    check(ctx, rule) {
      const themes = ctx.sem.filter((v) => v.collection === 'Themes');
      const byName = new Map(themes.map((v) => [v.name, v]));
      const pairs = [['hover', 'active'], ['hover', 'disabled'], ['active', 'disabled']];
      const out = [];
      const parents = [...new Set(themes.map((v) => parentOf(v.name)))];
      for (const p of parents) {
        for (const [a, b] of pairs) {
          const va = byName.get(`${p}/${a}`);
          const vb = byName.get(`${p}/${b}`);
          if (!va || !vb) continue;
          const modes = va.modes.filter((_, i) => va.resolved[i] !== null && va.resolved[i] === vb.resolved[i]);
          if (modes.length) out.push(finding(rule, BREAKS, `${p}/${a} and ${p}/${b} resolve to the same value in ${modes.join(' and ')} (${modes.map((m) => fmt(va.resolved[va.modes.indexOf(m)])).join(', ')}), so the ${a} state cannot be told from the ${b} state.`, [label(va), label(vb)]));
        }
      }
      // Clusters: one value shared by three or more surface or interactive tokens in the same mode.
      const clusters = new Map();
      const role = themes.filter((v) => ['surface', 'interactive'].includes(segs(v.name)[0]));
      role[0]?.modes.forEach((mode, i) => {
        const byValue = new Map();
        for (const v of role) {
          const val = v.resolved[i];
          if (!byValue.has(val)) byValue.set(val, []);
          byValue.get(val).push(v);
        }
        for (const [val, vs] of byValue) {
          if (vs.length < 3) continue;
          const key = vs.map(label).sort().join('|');
          if (!clusters.has(key)) clusters.set(key, { tokens: vs.map(label), values: [] });
          clusters.get(key).values.push(`${mode} ${fmt(val)}`);
        }
      });
      for (const c of clusters.values()) out.push(finding(rule, DECIDE, `${c.tokens.length} surface or interactive tokens share one value (${c.values.join('; ')}) while their names promise different jobs.`, c.tokens, { value: c.values }));
      return out;
    },
  },
  {
    id: 'same-in-both-modes', standardRule: null, title: 'Colour tokens whose light and dark values are equal',
    check(ctx, rule) {
      const same = ctx.sem.filter((v) => v.type === 'color' && v.modes.includes('light') && v.modes.includes('dark') && v.resolved[v.modes.indexOf('light')] === v.resolved[v.modes.indexOf('dark')]);
      return same.length ? [finding(rule, NOTE, `${same.length} colour tokens have the same value in light and dark. Confirm each is meant.`, same.map((v) => `${label(v)} (${fmt(v.resolved[0])})`))] : [];
    },
  },
  {
    id: 'type-scale', standardRule: null, title: 'Type scale: readable sizes, no page zoom on fields, no duplicate roles, numeric weights',
    check(ctx, rule) {
      const typo = ctx.sem.filter((v) => v.collection === 'Typography');
      const size = new Map(typo.filter((v) => segs(v.name)[0] === 'font-size').map((v) => [segs(v.name).slice(1).join('/'), v]));
      const lead = new Map(typo.filter((v) => segs(v.name)[0] === 'line-height').map((v) => [segs(v.name).slice(1).join('/'), v]));
      const tiny = [...size.values()].filter((v) => typeof v.resolved[0] === 'number' && v.resolved[0] < 12);
      const fieldRoles = [...size].filter(([r, v]) => /^body(-|$)/.test(r) && typeof v.resolved[0] === 'number' && v.resolved[0] < 16).map(([, v]) => v);
      const pairs = new Map();
      for (const [r, v] of size) {
        if (!lead.has(r)) continue;
        const key = `${v.resolved[0]}/${lead.get(r).resolved[0]}`;
        if (!pairs.has(key)) pairs.set(key, []);
        pairs.get(key).push(r);
      }
      const dups = [...pairs].filter(([, rs]) => rs.length > 1);
      const styleWeights = typo.filter((v) => segs(v.name)[0] === 'font-weight' && typeof v.resolved[0] !== 'number' && !/^\d+$/.test(String(v.resolved[0])));
      const out = [];
      if (tiny.length) out.push(finding(rule, DECIDE, 'These font sizes are under 12 px.', tiny.map((v) => `${label(v)} (${v.resolved[0]} px)`)));
      if (fieldRoles.length) out.push(finding(rule, DECIDE, 'These body roles are under 16 px. A form field\'s typed text uses a body role, and iOS zooms the page when a focused field\'s text is under 16 px. (Label roles are not counted: the zoom depends only on the field\'s own text.)', fieldRoles.map((v) => `${label(v)} (${v.resolved[0]} px)`)));
      for (const [key, rs] of dups) out.push(finding(rule, DECIDE, `These roles have identical font size and line height (${key} px), so they are one style under several names.`, rs.map((r) => `Typography role ${r}`),{ sizeAndLineHeight: key }));
      if (styleWeights.length) out.push(finding(rule, DECIDE, 'These weight tokens hold a style name instead of a number (CSS font-weight needs 100 to 900).', styleWeights.map((v) => `${label(v)} (${fmt(v.resolved[0])})`)));
      return out;
    },
  },
  {
    id: 'density', standardRule: null, title: 'Compact density keeps the steps apart and never grows',
    check(ctx, rule) {
      const dens = ctx.sem.filter((v) => v.modes.includes('standard') && v.modes.includes('compact'));
      const si = (v) => v.modes.indexOf('standard');
      const ci = (v) => v.modes.indexOf('compact');
      const out = [];
      const byGroup = new Map();
      for (const v of dens) {
        const g = `${v.collection}|${parentOf(v.name)}`;
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g).push(v);
      }
      for (const vs of byGroup.values()) {
        const byCompact = new Map();
        for (const v of vs) {
          const k = v.resolved[ci(v)];
          if (!byCompact.has(k)) byCompact.set(k, []);
          byCompact.get(k).push(v);
        }
        for (const [k, list] of byCompact) {
          const distinctStandard = new Set(list.map((v) => v.resolved[si(v)]));
          if (distinctStandard.size > 1) out.push(finding(rule, DECIDE, `${list.length} steps that differ in standard all become ${fmt(k)} in compact, so compact cannot tell them apart.`, list.map((v) => `${label(v)} (${fmt(v.resolved[si(v)])} -> ${fmt(k)})`), { compactValue: k }));
        }
      }
      const grows = dens.filter((v) => typeof v.resolved[ci(v)] === 'number' && v.resolved[ci(v)] > v.resolved[si(v)]);
      if (grows.length) out.push(finding(rule, DECIDE, 'These steps are larger in compact than in standard.', grows.map((v) => `${label(v)} (${fmt(v.resolved[si(v)])} -> ${fmt(v.resolved[ci(v)])})`)));
      return out;
    },
  },
  {
    id: 'missing-categories', standardRule: null, title: 'Token categories that have not been started',
    check(ctx, rule) {
      const names = [...ctx.prims, ...ctx.sem].map((v) => v.name.toLowerCase());
      const filled = [...ctx.snap.semantic, ...ctx.snap.primitives].filter((c) => c.variables.length > 0);
      const byName = (f) => filled.some(f);
      const covered = (cat) => names.some((n) => cat.re.test(n))
        || byName((c) => cat.re.test(c.name.toLowerCase()))
        || (cat.collection && byName((c) => c.name === cat.collection && (!cat.names || c.variables.some((v) => cat.names.test(v.name)))))
        || (cat.styles && Array.isArray(ctx.styles) && ctx.styles.length > 0);
      const out = [];
      for (const cat of CATEGORIES) {
        if (covered(cat)) continue;
        if (cat.styles && ctx.styles === null) {
          out.push(finding(rule, NOTE, `Cannot tell from the snapshot: no variable or ${cat.collection} collection covers ${cat.id}, and Figma may hold it as effect styles, which the variable snapshot does not contain (add styles.txt beside the snapshot, one effect style name per line, to check).`, [`category: ${cat.id}`], { category: cat.id, cannotTell: true }));
          continue;
        }
        out.push(finding(rule, NOTE, `Not started: no variable name or collection covers ${cat.id}.`, [`category: ${cat.id}`], { category: cat.id }));
      }
      return out;
    },
  },
];

function runRules(snap, styles = null) {
  const ctx = buildContext(snap, styles);
  return RULES.flatMap((rule) => rule.check(ctx, rule));
}

// ---------- self-test ----------

function plant(snap, file, collection, fields, modes) {
  // A collection with the same name but different modes is planted as a new collection.
  let c = snap[file].find((x) => x.name === collection && (!modes || x.modes.join() === modes.join()));
  if (!c) {
    c = { file, name: collection, modes: modes || ['default'], declared: 0, variables: [] };
    snap[file].push(c);
  }
  const v = { file, collection, type: 'color', syntax: null, scopes: [], description: 'Planted by the self-test.', line: 0, ...fields };
  if (v.syntax === 'rule') v.syntax = expectedSyntax(v);
  c.variables.push(v);
  c.declared = c.variables.length;
  return v;
}

const PLANTS = {
  'name-case': (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/Planted Case', values: ['{neutral/light/1100}', '{neutral/dark/1100}'], syntax: 'rule', scopes: ['TEXT_FILL'] })),
  'state-segment': (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/hover/planted', values: ['{neutral/light/1100}', '{neutral/dark/1100}'], syntax: 'rule', scopes: ['TEXT_FILL'] })),
  'state-set': (s) => { plant(s, 'semantic', 'Themes', { name: 'interactive/planted/hover', values: ['{not-used/zinc/500}', '{not-used/zinc/400}'], syntax: 'rule', scopes: ['ALL_FILLS'] }); return 'Themes: interactive/planted/*'; },
  'size-scale': (s) => label(plant(s, 'semantic', 'Radius', { name: 'container/xsmall', type: 'number', values: ['{2}'], syntax: 'rule', scopes: ['CORNER_RADIUS'] })),
  'primitive-hygiene': (s) => label(plant(s, 'primitives', 'Colors', { name: 'brand/mystery', values: ['#123456'], syntax: 'var(--brand-mystery)', scopes: ['ALL_FILLS'] })),
  alias: (s) => label(plant(s, 'semantic', 'Radius', { name: 'container/planted', type: 'number', values: ['12'], syntax: 'rule', scopes: ['CORNER_RADIUS'] })),
  'mode-names': (s) => { plant(s, 'semantic', 'Radius', { name: 'container/planted-mode', type: 'number', values: ['{8}'], syntax: 'rule', scopes: ['CORNER_RADIUS'] }, ['Default']); return 'collection Radius, mode "Default"'; },
  'collection-names': (s) => { s.semantic.push({ file: 'semantic', name: 'Planted Things', modes: ['default'], declared: 0, variables: [] }); return 'collection Planted Things has no variables'; },
  description: (s) => label(plant(s, 'semantic', 'Radius', { name: 'container/planted-quiet', type: 'number', values: ['{8}'], syntax: 'rule', scopes: ['CORNER_RADIUS'], description: '' })),
  scopes: (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/planted-scope', values: ['{neutral/light/1100}', '{neutral/dark/1100}'], syntax: 'rule', scopes: ['FRAME_FILL'] })),
  'code-syntax': (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/planted-syntax', values: ['{neutral/light/1100}', '{neutral/dark/1100}'], syntax: 'var(--color-text-wrong)', scopes: ['TEXT_FILL'] })),
  'tailwind-namespace': (s) => label(plant(s, 'semantic', 'Typography', { name: 'line-height/planted', type: 'number', values: ['{typography/line-height/16}'], syntax: 'rule', scopes: ['LINE_HEIGHT'] })),
  'default-dropped': (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/planted/default', values: ['{neutral/light/1100}', '{neutral/dark/1100}'], syntax: 'rule', scopes: ['TEXT_FILL'] })),
  'one-job': (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/link/disabled', values: ['{pink/700}', '{pink/300}'], syntax: 'rule', scopes: ['TEXT_FILL'] })),
  'same-in-both-modes': (s) => label(plant(s, 'semantic', 'Themes', { name: 'text/planted-same', values: ['{pink/600}', '{pink/600}'], syntax: 'rule', scopes: ['TEXT_FILL'] })),
  'type-scale': (s) => label(plant(s, 'semantic', 'Typography', { name: 'font-weight/planted', type: 'string', values: ['{typography/font-weight/700}'], syntax: 'rule', scopes: ['FONT_STYLE'] })),
  density: (s) => label(plant(s, 'semantic', 'Density', { name: 'scaled/planted', type: 'number', values: ['{8}', '{12}'], syntax: 'rule', scopes: ['WIDTH_HEIGHT', 'GAP'] }, ['standard', 'compact'])),
};

const tokenSets = (findings) => {
  const m = new Map(RULES.map((r) => [r.id, new Set()]));
  for (const f of findings) for (const t of f.tokens) m.get(f.rule).add(t);
  return m;
};

function selfTest(base) {
  const before = tokenSets(runRules(base));
  const lines = [];
  for (const rule of RULES) {
    if (rule.id === 'missing-categories') { lines.push(selfTestCategories(base)); continue; }
    const copy = structuredClone(base);
    const marker = PLANTS[rule.id](copy);
    const after = tokenSets(runRules(copy));
    const gained = (id) => [...after.get(id)].filter((t) => !before.get(id).has(t));
    // A token names the planted thing when it is the marker or starts with it followed by a space
    // (findings add detail after the name, for example "(xsmall -> xs)").
    const names = (t) => t === marker || t.startsWith(`${marker} `) || t.startsWith(`${marker},`);
    const fired = gained(rule.id).some(names);
    const others = RULES.filter((r) => r.id !== rule.id && gained(r.id).length).map((r) => `${r.id} (${gained(r.id).join('; ')})`);
    const ok = fired && others.length === 0;
    lines.push({ ok, text: `${ok ? 'PASS' : 'FAIL'} ${rule.id}: planted "${marker}" -> ${fired ? 'caught' : 'not caught'}${others.length ? `; other rules also fired: ${others.join(', ')}` : '; no other rule fired'}` });
  }
  return lines;
}

// Planting a variable makes this rule quieter, not louder, so the test is reversed: cover every category
// but one and check that the rule reports exactly that one; then cover all and check it reports none.
function selfTestCategories(base) {
  const covering = { 'border width': 'border-width/sm', 'motion or duration': 'duration/fast', easing: 'easing/standard', 'elevation or shadow': 'shadow/sm', opacity: 'opacity/disabled', 'z-index': 'z-index/modal', breakpoint: 'breakpoint/md', 'icon size': 'icon-size/md', 'control height': 'control-height/md', 'focus ring width and offset': 'focus-ring/width' };
  const left = 'z-index';
  const rule = RULES.find((r) => r.id === 'missing-categories');
  const run = (snap) => rule.check(buildContext(snap), rule);
  const partial = structuredClone(base);
  const full = structuredClone(base);
  for (const [cat, name] of Object.entries(covering)) {
    plant(full, 'semantic', 'Radius', { name, type: 'number', values: ['{4}'], syntax: 'rule', scopes: ['CORNER_RADIUS'] });
    if (cat !== left) plant(partial, 'semantic', 'Radius', { name, type: 'number', values: ['{4}'], syntax: 'rule', scopes: ['CORNER_RADIUS'] });
  }
  const p = run(partial);
  const f = run(full);
  const ok = p.length === 1 && p[0].category === left && f.length === 0;
  return { ok, text: `${ok ? 'PASS' : 'FAIL'} missing-categories: covered 9 of 10 categories, left out "${left}" -> ${p.map((x) => x.category).join(', ') || 'nothing'} reported; covered all 10 -> ${f.length} reported (reversed test: planting covers a category, so other rules are not compared)` };
}

// The findings of one rule alone, for the refinements below, where planting would also (rightly) wake other rules.
const ruleOnly = (id, snap, styles = null) => { const rule = RULES.find((r) => r.id === id); return rule.check(buildContext(snap, styles), rule); };
const holds = (fs, severity, marker, text) => fs.some((f) => f.severity === severity && f.tokens.some((t) => t === marker || t.startsWith(`${marker} `)) && (!text || f.message.includes(text)));

// Planted cases for the refinements: scopes by layer, categories covered by purpose, the four unlisted collections
// reported once, and the state-segment message naming its fix.
function selfTestRefinements(base) {
  const out = [];
  const add = (ok, text) => out.push({ ok, text: `${ok ? 'PASS' : 'FAIL'} ${text}` });

  // scopes (a): primitive with no scopes is fine; primitive with ALL_SCOPES is "decide"; semantic with none breaks, except Motion (note).
  const s1 = structuredClone(base);
  const pe = label(plant(s1, 'primitives', 'Colors', { name: 'pink/9001', values: ['#ff00aa'], syntax: null, scopes: [] }));
  const pa = label(plant(s1, 'primitives', 'Colors', { name: 'pink/9002', values: ['#ff00ab'], syntax: null, scopes: ['ALL_SCOPES'] }));
  const se = label(plant(s1, 'semantic', 'Themes', { name: 'text/planted-unscoped', values: ['{neutral/light/1100}', '{neutral/dark/1100}'], syntax: 'rule', scopes: [] }));
  const me = label(plant(s1, 'semantic', 'Motion', { name: 'duration/planted', type: 'number', values: ['100'], syntax: 'rule', scopes: [] }));
  const f1 = ruleOnly('scopes', s1);
  const peSeen = f1.some((f) => f.tokens.includes(pe));
  add(!peSeen && holds(f1, DECIDE, pa, 'rule 5 says components reach only semantic tokens') && holds(f1, BREAKS, se) && holds(f1, NOTE, me) && !holds(f1, BREAKS, me),
    `scopes: primitive with no scopes -> ${peSeen ? 'reported' : 'not reported'}; primitive with ALL_SCOPES -> decide; semantic with none -> breaks; Motion with none -> note only`);

  // missing-categories (b): covered by a non-empty collection of that purpose, not only by a word in a name.
  const s2 = structuredClone(base);
  plant(s2, 'semantic', 'Border', { name: 'width/hairline', type: 'number', values: ['1'], syntax: 'rule', scopes: ['STROKE_FLOAT'] });
  plant(s2, 'semantic', 'Size', { name: 'tap/md', type: 'number', values: ['44'], syntax: 'rule', scopes: ['WIDTH_HEIGHT'] });
  plant(s2, 'semantic', 'Motion', { name: 'quick', type: 'number', values: ['100'], syntax: 'rule', scopes: [] });
  s2.semantic.push({ file: 'semantic', name: 'Elevation', modes: ['default'], declared: 0, variables: [] });
  const cats = (fs) => fs.map((f) => `${f.category}${f.cannotTell ? ' (cannot tell)' : ''}`);
  const purpose = ['border width', 'motion or duration', 'easing', 'icon size', 'control height'];
  const f2 = cats(ruleOnly('missing-categories', s2));
  const f2s = cats(ruleOnly('missing-categories', s2, ['Shadow/Medium']));
  const s3 = structuredClone(s2);
  plant(s3, 'semantic', 'Elevation', { name: 'raised', type: 'string', values: ['"0 1px 2px #0003"'], syntax: 'rule', scopes: [] });
  const f3 = cats(ruleOnly('missing-categories', s3));
  const f0 = cats(ruleOnly('missing-categories', s2, []));
  add(purpose.every((c) => !f2.includes(c)) && f2.includes('elevation or shadow (cannot tell)') && !f2s.some((c) => c.startsWith('elevation')) && !f3.some((c) => c.startsWith('elevation')) && f0.includes('elevation or shadow'),
    `missing-categories: Border width/*, Size and Motion collections cover ${purpose.length} categories; elevation with no styles.txt -> cannot tell, with an effect style -> covered, with an Elevation collection -> covered, with an empty styles.txt -> not started (empty Elevation collection does not count)`);

  // collection-names (c): the four are one "decide" finding, and not repeated as empty or as off the list.
  const f4 = ruleOnly('collection-names', s3);
  const together = f4.filter((f) => f.message.includes('has no place for these four'));
  const elsewhere = f4.filter((f) => !together.includes(f)).flatMap((f) => f.tokens).filter((t) => /collection (Border|Size|Motion|Elevation)\b/.test(t));
  add(together.length === 1 && together[0].severity === DECIDE && UNLISTED_CATEGORIES.every((c) => together[0].tokens.some((t) => t.startsWith(`collection ${c} `))) && elsewhere.length === 0,
    `collection-names: Border, Size, Motion and Elevation -> ${together.length} decide finding naming ${together[0]?.tokens.length ?? 0}; elsewhere ${elsewhere.length}`);

  // state-segment (d): focus/width is caught, and the message names the fix.
  const s5 = structuredClone(base);
  const fw = label(plant(s5, 'semantic', 'Border', { name: 'focus/width', type: 'number', values: ['2'], syntax: 'rule', scopes: ['STROKE_FLOAT'] }));
  const f5 = ruleOnly('state-segment', s5);
  add(holds(f5, BREAKS, fw, 'rename so the state word is not a group name, for example ring/width'), `state-segment: planted "${fw}" -> ${holds(f5, BREAKS, fw) ? 'caught' : 'not caught'}, message names the fix ring/width`);

  // missing-categories: focus/width (or ring/width) in Border covers the focus ring category; the base snapshot does not.
  const ringCat = 'focus ring width and offset';
  const baseRing = ruleOnly('missing-categories', base).some((f) => f.category === ringCat);
  const s6 = structuredClone(base);
  plant(s6, 'semantic', 'Border', { name: 'ring/offset', type: 'number', values: ['2'], syntax: 'rule', scopes: ['GAP'] });
  const s5Ring = ruleOnly('missing-categories', s5).some((f) => f.category === ringCat);
  const s6Ring = ruleOnly('missing-categories', s6).some((f) => f.category === ringCat);
  add(baseRing && !s5Ring && !s6Ring, `missing-categories: focus ring reported on the base snapshot -> ${baseRing}; covered by Border focus/width -> ${!s5Ring}; covered by Border ring/offset -> ${!s6Ring}`);
  return out;
}

// ---------- report ----------

function report(findings, snap) {
  const semCount = snap.semantic.reduce((n, c) => n + c.variables.length, 0);
  const primCount = snap.primitives.reduce((n, c) => n + c.variables.length, 0);
  console.log(`Token lint: read ${semCount} semantic variables in ${snap.semantic.length} collections and ${primCount} primitive variables in ${snap.primitives.length} collections.`);
  console.log('');
  for (const rule of RULES) {
    const fs = findings.filter((f) => f.rule === rule.id);
    const ruleNo = !rule.standardRule ? 'not in the standard' : /^\d+$/.test(rule.standardRule) ? `standard rule ${rule.standardRule}` : `standard: ${rule.standardRule}`;
    console.log(`${rule.id} (${ruleNo}): ${rule.title}. ${fs.length} finding${fs.length === 1 ? '' : 's'}.`);
    for (const f of fs) {
      console.log(`  [${f.severity}] ${f.message} (${f.count})`);
      const shown = f.tokens.slice(0, 8);
      for (const t of shown) console.log(`      ${t}`);
      if (f.tokens.length > shown.length) console.log(`      ... and ${f.tokens.length - shown.length} more (all listed in lint.json)`);
    }
    console.log('');
  }
}

function counts(findings) {
  const by = (sev) => findings.filter((f) => f.severity === sev).length;
  const byRule = Object.fromEntries(RULES.map((r) => [r.id, findings.filter((f) => f.rule === r.id).length]));
  return { rules: RULES.length, findings: findings.length, breaksTheStandard: by(BREAKS), decide: by(DECIDE), notes: by(NOTE), byRule };
}

function main() {
  const args = process.argv.slice(2);
  const snap = loadSnapshots();
  if (args.includes('--self-test')) {
    const lines = selfTest(snap);
    const extra = selfTestRefinements(snap);
    for (const l of [...lines, ...extra]) console.log(l.text);
    const passed = lines.filter((l) => l.ok).length;
    const extraPassed = extra.filter((l) => l.ok).length;
    const ok = passed === RULES.length && lines.length === RULES.length && extraPassed === extra.length;
    console.log(`Self-test: ${passed} of ${RULES.length} rules caught their planted fault, and ${extraPassed} of ${extra.length} refinement cases behaved as expected${ok ? '' : '; FAILED'}.`);
    process.exit(ok ? 0 : 1);
  }
  const styles = loadStyles();
  const findings = runRules(snap, styles);
  report(findings, snap);
  const c = counts(findings);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    tool: 'v2/tools/lint-tokens.mjs',
    sources: ['semantic.txt', 'primitives.txt', ...(styles ? ['styles.txt'] : [])].map((f) => { const p = resolve(SNAPSHOT_DIR, f); return p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p; }),
    severities: { [BREAKS]: 'the file contradicts a written rule of the standard', [DECIDE]: 'a person has to choose', [NOTE]: 'listed for a person to confirm' },
    rules: RULES.map((r) => ({ id: r.id, standardRule: r.standardRule, title: r.title, findings: c.byRule[r.id] })),
    counts: c,
    findings,
  }, null, 2)}\n`);
  console.log(`Wrote ${OUT.slice(ROOT.length + 1)}.`);
  console.log(`${c.rules} rules, ${c.findings} findings: ${c.breaksTheStandard} break the standard, ${c.decide} to decide, ${c.notes} notes`);
  process.exit(c.breaksTheStandard > 0 && !args.includes('--report-only') ? 1 : 0);
}

main();

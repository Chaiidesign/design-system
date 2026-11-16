#!/usr/bin/env node
// audit-contrast.mjs
//
// What it does
//   Measures every colour pair declared in v2/tools/contrast-pairs.json, in every mode (light and dark),
//   with the WCAG 2 contrast ratio. For each failing foreground it proposes the nearest step on the same
//   primitive ramp that passes every declared pair that token is in; failing that, it tries moving a
//   hover or active background of a bold or interactive surface along its own ramp. It also checks the
//   "distinct" pairs (colours that must look different), including under three colour-vision simulations.
//
// Inputs
//   v2/tools/contrast-pairs.json      the declared pairs (rules, exempt, distinct)
//   v2/figma/*.txt                     token values, read only through v2/tools/lib/snapshot.mjs (default)
//   ds-tokens/dist/tokens.json         only with --built: the flat array build-tokens.mjs writes, one object per
//                                      token with resolved values per mode under "values"; proposed tokens included
//
// Outputs
//   ds-tokens/audit/contrast.json             every measured pair, exempt and distinct sections, totals
//   ds-tokens/audit/contrast.html             one self-contained visual report
//   ds-tokens/audit/proposed-overrides.json   the proposed fixes
//
// How to run
//   node v2/tools/audit-contrast.mjs                 audit the Figma snapshot; exit 1 if any non-exempt pair fails
//   node v2/tools/audit-contrast.mjs --report-only   same, but always exit 0 once the files are written
//   node v2/tools/audit-contrast.mjs --built         read ds-tokens/dist/tokens.json instead of the snapshot
//   node v2/tools/audit-contrast.mjs --self-test     plant a known failing pair in memory and check it is caught
//
// The last line printed is always a one-line summary.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { loadSnapshots, makeResolver } from './lib/snapshot.mjs';
import {
  hexToSrgb, relativeLuminance, contrastRatio, srgbToOklch, oklchToLinearSrgb, linearSrgbToOklab,
  hueDistance, parseCssColor,
} from '../../scripts/lib/color.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAIRS_FILE = join(HERE, 'contrast-pairs.json');
const BUILT_FILE = join(ROOT, 'ds-tokens', 'dist', 'tokens.json');
const OUT_DIR = join(ROOT, 'ds-tokens', 'audit');

// The lead's starting thresholds for "hard to tell apart". They are not a standard.
const DE_NORMAL = 0.06;
const DE_SIMULATED = 0.04;

// ---------------------------------------------------------------------------------------------
// Colour helpers (all maths from scripts/lib/color.mjs; this file only composes it)

// Any colour string the snapshot or the built file may hold -> { rgb: [r,g,b] gamma 0..1, alpha }
function parseColour(value) {
  const p = parseCssColor(String(value));
  return { rgb: p.srgb, alpha: p.alpha };
}

// Alpha compositing in gamma-encoded sRGB, the way browsers paint a translucent colour.
function composite(fg, bgRgb) {
  return fg.rgb.map((c, i) => c * fg.alpha + bgRgb[i] * (1 - fg.alpha));
}

const toHex = (rgb) => '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('');
const round2 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1000) / 1000;
const round4 = (x) => Math.round(x * 10000) / 10000;

// Gamma sRGB 0..1 -> linear sRGB, by way of the library's OKLCH round trip (the library has no exported decode).
const toLinear = (rgb) => oklchToLinearSrgb(srgbToOklch(rgb));

// Colour-vision deficiency simulation matrices, severity 1.0, applied to linear RGB.
// Source: G. M. Machado, M. M. Oliveira and L. A. F. Fernandes, "A Physiologically-based Model for
// Simulation of Color Vision Deficiency", IEEE Transactions on Visualization and Computer Graphics
// 15(6), 2009, pp. 1291-1298. Table of matrices for severity 1.0.
const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));
function simulateLinear(lin, kind) {
  const m = CVD[kind];
  return m.map((row) => clamp01(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
}
// Linear -> gamma, only for drawing the simulated chips. Uses the WCAG/sRGB transfer curve.
const encode = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const deltaEOK = (labA, labB) => Math.hypot(labA[0] - labB[0], labA[1] - labB[1], labA[2] - labB[2]);

// ---------------------------------------------------------------------------------------------
// The model the engine runs on. Built from the snapshot, from the built file, or in memory by the self-test.
//
// model = {
//   tokens: Map("Collection::name" -> { collection, name, modes: [..], perMode: { mode: { value, alias } } }),
//   primitives: Map(name -> hex),           every colour primitive
//   defaultCollection: 'Themes',
//   baseSurface: { mode: rgb }               where a translucent background is laid for measuring
// }

function modelFromSnapshot() {
  const snap = loadSnapshots();
  const r = makeResolver(snap);
  const primitives = new Map();
  for (const c of snap.primitives) for (const v of c.variables) if (v.type === 'color') primitives.set(v.name, v.values[0]);
  const tokens = new Map();
  for (const c of snap.semantic) {
    for (const v of c.variables) {
      if (v.type !== 'color') continue;
      const perMode = {};
      c.modes.forEach((mode, i) => {
        const raw = v.values[i];
        const res = r.resolve(v, i);
        perMode[mode] = { value: res.value, alias: raw.startsWith('{') ? raw.slice(1, -1) : null };
      });
      tokens.set(`${c.name}::${v.name}`, { collection: c.name, name: v.name, modes: c.modes, perMode });
    }
  }
  return finishModel({ tokens, primitives, source: 'Figma snapshot (v2/figma via v2/tools/lib/snapshot.mjs)' });
}

// --built: ds-tokens/dist/tokens.json, as v2/tools/build-tokens.mjs writes it: a flat array, one object per
// token, { name, collection, type, values: { mode: resolved CSS value }, alias: { mode: primitive name or null },
// proposed?: true, ... }. Every colour token in it is taken, including proposed tokens that Figma does not hold,
// so rules that name them are measured. Non-colour tokens are skipped.
// The alias decides which ramp a proposal walks: it comes from the entry, and only when the entry gives none is
// it found as the primitive with exactly this value (none for a translucent literal such as #00000080).
function modelFromBuiltArray(built, primitives, source) {
  if (!Array.isArray(built)) throw new Error(`${source} is not a flat array of tokens (one object per token, values per mode under "values").`);
  const tokens = new Map();
  built.forEach((e, i) => {
    if (!e || typeof e !== 'object') throw new Error(`${source}: entry ${i + 1} is not an object.`);
    if (e.type !== 'color') return;
    if (!e.values || typeof e.values !== 'object' || Array.isArray(e.values)) throw new Error(`${source}: colour token ${e.collection} ${e.name} has no "values" object.`);
    const modes = Object.keys(e.values);
    const perMode = {};
    for (const mode of modes) {
      const value = e.values[mode];
      let alias = (e.alias && e.alias[mode]) || null;
      if (!alias && value != null) {
        const hex = String(value).toLowerCase();
        alias = [...primitives].filter(([, h]) => String(h).toLowerCase() === hex).map(([n]) => n).find((n) => !n.startsWith('not-used/')) || null;
      }
      perMode[mode] = { value, alias };
    }
    tokens.set(`${e.collection}::${e.name}`, { collection: e.collection, name: e.name, modes, perMode, proposed: e.proposed === true });
  });
  return finishModel({ tokens, primitives, source });
}
function modelFromBuilt(snapshotModel) {
  if (!existsSync(BUILT_FILE)) {
    throw new Error(`--built was given but ${relative(ROOT, BUILT_FILE)} does not exist yet. Build the tokens first, or run without --built to audit the Figma snapshot.`);
  }
  const built = JSON.parse(readFileSync(BUILT_FILE, 'utf8'));
  const m = modelFromBuiltArray(built, snapshotModel.primitives, `built file ${relative(ROOT, BUILT_FILE)}`);
  // Colour tokens Figma holds that the built file lacks, per mode.
  m.notInBuilt = [];
  for (const [k, t] of snapshotModel.tokens) {
    const b = m.tokens.get(k);
    for (const mode of t.modes) if (!b || !(mode in b.perMode)) m.notInBuilt.push(`${t.collection} ${t.name} (${mode})`);
  }
  m.proposedCount = [...m.tokens.values()].filter((t) => t.proposed).length;
  return m;
}

function finishModel(model) {
  model.defaultCollection = model.defaultCollection || 'Themes';
  model.baseSurface = {};
  const base = model.tokens.get(`${model.defaultCollection}::surface/primary/default`);
  for (const mode of ['light', 'dark', ...(base ? base.modes : [])]) {
    const v = base && base.perMode[mode] && base.perMode[mode].value;
    model.baseSurface[mode] = v ? parseColour(v).rgb : [1, 1, 1];
  }
  return model;
}

// ---------------------------------------------------------------------------------------------
// Expansion of the declared pairs

const WHOLE = { '<base>': 'base', '<baseDefault>': 'baseDefault', '<fills>': 'fills' };

function expandList(list, config, varName, varValue) {
  const out = [];
  for (const entry of list) {
    if (WHOLE[entry]) { out.push(...config[WHOLE[entry]]); continue; }
    out.push(varName ? entry.split(varName).join(varValue) : entry);
  }
  return out;
}

// One rule -> [{ fg, bg }] names. The rule's variable (<hue>, <x> or <g>) takes one value per pass
// so the foreground and background always share it.
function expandRule(rule, config) {
  let varName = null, varValues = [null];
  const all = [...rule.fg, ...rule.bg].join(' ');
  if (all.includes('<hue>')) { varName = '<hue>'; varValues = config.hues; }
  else if (all.includes('<x>')) { varName = '<x>'; varValues = rule.expand || []; }
  else if (all.includes('<g>')) { varName = '<g>'; varValues = config.gradientHues; }
  const pairs = [];
  const seen = new Set();
  for (const val of varValues) {
    const fgs = expandList(rule.fg, config, varName, val);
    const bgs = expandList(rule.bg, config, varName, val);
    for (const fg of fgs) for (const bg of bgs) {
      const k = `${fg}|${bg}`;
      if (seen.has(k)) continue;
      seen.add(k);
      pairs.push({ fg, bg });
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------------------------
// Measuring

function colourOf(model, token, mode, override) {
  const key = `${token.collection}::${token.name}`;
  const value = override && override.key === key && override.mode === mode ? override.value : token.perMode[mode].value;
  if (value === null || value === undefined) return null;
  return parseColour(value);
}

function measure(model, fgTok, bgTok, mode, override) {
  const fg = colourOf(model, fgTok, mode, override);
  let bg = colourOf(model, bgTok, mode, override);
  if (!fg || !bg) return null;
  // A translucent background is laid over the mode's primary surface before measuring.
  const bgRgb = bg.alpha < 1 ? composite(bg, model.baseSurface[mode] || [1, 1, 1]) : bg.rgb;
  const fgRgb = fg.alpha < 1 ? composite(fg, bgRgb) : fg.rgb;
  const ratio = contrastRatio(relativeLuminance(fgRgb), relativeLuminance(bgRgb));
  return { ratio, fgRgb, bgRgb, fgAlpha: fg.alpha, bgAlpha: bg.alpha };
}

function modesOf(fgTok, bgTok) {
  return fgTok.modes.filter((m) => bgTok.modes.includes(m));
}

// Runs every rule (and the exempt list) and returns the measured rows plus missing-name findings.
function measureAll(model, config) {
  const rows = [];
  const missing = [];
  const groups = [
    ...config.rules.map((r) => ({ ...r, exempt: false })),
    ...(config.exempt || []).map((r) => ({ ...r, exempt: true })),
  ];
  for (const rule of groups) {
    const collection = rule.collection || model.defaultCollection;
    for (const { fg, bg } of expandRule(rule, config)) {
      const fgTok = model.tokens.get(`${collection}::${fg}`);
      const bgTok = model.tokens.get(`${collection}::${bg}`);
      const absent = [!fgTok && fg, !bgTok && bg].filter(Boolean);
      if (absent.length) {
        for (const name of absent) missing.push({ rule: rule.id, collection, token: name, pair: `${fg} on ${bg}`, finding: 'declared pair names a token that does not exist' });
        continue;
      }
      for (const mode of modesOf(fgTok, bgTok)) {
        const m = measure(model, fgTok, bgTok, mode);
        if (!m) { missing.push({ rule: rule.id, collection, token: `${fg} / ${bg}`, mode, pair: `${fg} on ${bg}`, finding: 'token has no value in this mode' }); continue; }
        rows.push({
          rule: rule.id, exempt: rule.exempt, collection, mode, fg, bg,
          fg_value: String(fgTok.perMode[mode].value), bg_value: String(bgTok.perMode[mode].value),
          fg_alias: fgTok.perMode[mode].alias, bg_alias: bgTok.perMode[mode].alias,
          fg_shown: toHex(m.fgRgb), bg_shown: toHex(m.bgRgb),
          ratio_raw: m.ratio, ratio: round2(m.ratio), min: rule.min ?? null,
          pass: rule.exempt ? null : m.ratio >= rule.min,
        });
      }
    }
  }
  return { rows, missing };
}

// ---------------------------------------------------------------------------------------------
// Proposals

const rampOf = (primitiveName) => primitiveName.split('/').slice(0, -1).join('/');
function rampSteps(model, ramp) {
  return [...model.primitives.keys()]
    .filter((n) => rampOf(n) === ramp && /^-?\d+(\.\d+)?$/.test(n.split('/').pop()))
    .sort((a, b) => Number(a.split('/').pop()) - Number(b.split('/').pop()));
}

const pairLabel = (p) => `${p.fg} on ${p.bg} (${p.rule})`;

// Checks a list of constraint pairs with one token moved to `value`; returns per-pair results.
function evaluate(model, constraints, override) {
  return constraints.map((p) => {
    const fgTok = model.tokens.get(`${p.collection}::${p.fg}`);
    const bgTok = model.tokens.get(`${p.collection}::${p.bg}`);
    const m = measure(model, fgTok, bgTok, p.mode, override);
    return { pair: p, ratio: m.ratio, pass: m.ratio >= p.min, margin: m.ratio / p.min };
  });
}
const worstOf = (results) => results.reduce((w, r) => (!w || r.margin < w.margin ? r : w), null);

function tryRamp(model, tokenKey, mode, constraints) {
  const tok = model.tokens.get(tokenKey);
  const alias = tok.perMode[mode].alias;
  if (!alias || !model.primitives.has(alias)) return { ramp: null, candidates: [] };
  const ramp = rampOf(alias);
  const steps = rampSteps(model, ramp);
  const here = steps.indexOf(alias);
  const candidates = steps.map((step, i) => {
    if (step === alias) return null;
    const results = evaluate(model, constraints, { key: tokenKey, mode, value: model.primitives.get(step) });
    return { step, hex: model.primitives.get(step), distance: Math.abs(i - here), results, worst: worstOf(results), allPass: results.every((r) => r.pass) };
  }).filter(Boolean);
  return { ramp, alias, candidates };
}

const pickBest = (cands) => cands.filter((c) => c.allPass).sort((a, b) => a.distance - b.distance || b.worst.margin - a.worst.margin)[0] || null;
const pickClosest = (cands) => [...cands].sort((a, b) => b.results.filter((r) => r.pass).length - a.results.filter((r) => r.pass).length || b.worst.margin - a.worst.margin)[0] || null;

const MOVABLE_BG = /^(interactive\/.*|.*\/bold)\/(hover|active)$/;

function propose(model, rows) {
  const scored = rows.filter((r) => !r.exempt);
  const byToken = new Map(); // "collection::name|mode" -> constraint rows where it is the fg
  const asAny = new Map();   // same key -> rows where it is fg or bg
  const push = (map, k, r) => { if (!map.has(k)) map.set(k, []); map.get(k).push(r); };
  for (const r of scored) {
    push(byToken, `${r.collection}::${r.fg}|${r.mode}`, r);
    push(asAny, `${r.collection}::${r.fg}|${r.mode}`, r);
    push(asAny, `${r.collection}::${r.bg}|${r.mode}`, r);
  }
  const proposals = [];
  const done = new Set();
  const failingFg = [...new Set(scored.filter((r) => !r.pass).map((r) => `${r.collection}::${r.fg}|${r.mode}`))];
  for (const key of failingFg) {
    const [tokenKey, mode] = key.split('|');
    const tok = model.tokens.get(tokenKey);
    const constraints = byToken.get(key);
    const before = evaluate(model, constraints, null);
    const worstBefore = worstOf(before);
    const failingBefore = before.filter((r) => !r.pass);
    const rulesHit = [...new Set(failingBefore.map((r) => r.pair.rule))].join(', ');
    // Every pair this token is in, in this mode, in either role, must hold after the move.
    const allConstraints = asAny.get(key);

    const fgTry = tryRamp(model, tokenKey, mode, allConstraints);
    const fgBest = pickBest(fgTry.candidates);
    if (fgBest) {
      const after = fgBest.results.filter((r) => r.pair.fg === tok.name);
      proposals.push({
        token: tok.name, collection: tok.collection, mode,
        from: `${fgTry.alias} (${model.primitives.get(fgTry.alias)})`, to: `${fgBest.step} (${fgBest.hex})`,
        from_primitive: fgTry.alias, to_primitive: fgBest.step, to_value: fgBest.hex,
        reason: `Moves the foreground ${fgBest.distance} step${fgBest.distance === 1 ? '' : 's'} along ${fgTry.ramp}; this is the nearest step that passes all ${allConstraints.length} declared pairs this token is in, in ${mode}.`,
        rule: rulesHit,
        worst_before: round2(worstBefore.ratio), worst_before_pair: pairLabel(worstBefore.pair),
        worst_after: round2(worstOf(after).ratio), worst_after_pair: pairLabel(worstOf(after).pair),
        pairs_fixed: failingBefore.map((r) => pairLabel(r.pair)),
        pairs_still_failing: [],
        kind: 'foreground',
      });
      continue;
    }

    // No foreground step works: try moving a failing background that is a hover or active state
    // of a bold or interactive surface, along its own ramp.
    let bgDone = false;
    const bgNames = [...new Set(failingBefore.map((r) => r.pair.bg).filter((n) => MOVABLE_BG.test(n)))];
    const bgAttempts = [];
    for (const bgName of bgNames) {
      const bgKey = `${tok.collection}::${bgName}`;
      const bgConstraints = asAny.get(`${bgKey}|${mode}`) || [];
      const union = [...new Set([...constraints, ...bgConstraints])];
      const bgTry = tryRamp(model, bgKey, mode, union);
      const bgBest = pickBest(bgTry.candidates);
      bgAttempts.push({ bgName, bgTry, bgBest });
      if (!bgBest) continue;
      const doneKey = `${bgKey}|${mode}|${bgBest.step}`;
      const fixedHere = failingBefore.filter((r) => r.pair.bg === bgName).map((r) => pairLabel(r.pair));
      const existing = proposals.find((p) => p._doneKey === doneKey);
      if (existing) {
        existing.pairs_fixed = [...new Set([...existing.pairs_fixed, ...fixedHere])];
        existing.reason += ` It also fixes ${tok.name}.`;
        bgDone = true;
        continue;
      }
      // Say so when the moved hover or active state lands on the same value as its resting sibling.
      const sibling = bgName.replace(/\/(hover|active)$/, '/default');
      const sibTok = model.tokens.get(`${tok.collection}::${sibling}`);
      const sameAsRest = sibTok && String(sibTok.perMode[mode].value).toLowerCase() === String(bgBest.hex).toLowerCase();
      const otherState = bgBest.results.filter((r) => r.pair.bg === bgName);
      const bgTok = model.tokens.get(bgKey);
      const stillFailing = evaluate(model, constraints, { key: bgKey, mode, value: bgBest.hex }).filter((r) => !r.pass).map((r) => pairLabel(r.pair));
      proposals.push({
        _doneKey: doneKey,
        token: bgName, collection: tok.collection, mode,
        from: `${bgTry.alias} (${model.primitives.get(bgTry.alias)})`, to: `${bgBest.step} (${bgBest.hex})`,
        from_primitive: bgTry.alias, to_primitive: bgBest.step, to_value: bgBest.hex,
        reason: `No step on the ramp of ${tok.name} passes all its pairs in ${mode}, so the background moves ${bgBest.distance} step${bgBest.distance === 1 ? '' : 's'} along ${bgTry.ramp} instead; every declared pair this background is in still passes.` +
          (sameAsRest ? ` Caution: ${bgBest.step} is the value ${sibling} already has, so this state would look the same as the resting state; the lead should decide whether that is acceptable.` : ''),
        rule: rulesHit,
        worst_before: round2(worstBefore.ratio), worst_before_pair: pairLabel(worstBefore.pair),
        worst_after: round2(worstOf(otherState.length ? otherState : bgBest.results).ratio),
        worst_after_pair: pairLabel(worstOf(otherState.length ? otherState : bgBest.results).pair),
        pairs_fixed: fixedHere,
        pairs_still_failing: stillFailing,
        kind: 'background',
        same_as_resting_state: !!sameAsRest,
      });
      void bgTok;
      bgDone = true;
    }
    if (bgDone) continue;

    // Nothing works. Record the best achievable step and what blocks it.
    const best = pickClosest(fgTry.candidates);
    const bestBg = bgAttempts.map((a) => ({ a, c: pickClosest(a.bgTry.candidates) })).filter((x) => x.c)[0];
    let reason = `No single-step fix. No step on ${fgTry.ramp || 'its ramp'} passes all ${allConstraints.length} declared pairs of ${tok.name} in ${mode}.`;
    if (best) reason += ` The best foreground step is ${best.step} (${best.hex}), worst ratio ${round2(best.worst.ratio)} on ${pairLabel(best.worst.pair)}; it is blocked by ${best.results.filter((r) => !r.pass).map((r) => `${pairLabel(r.pair)} at ${round2(r.ratio)}`).join('; ')}.`;
    if (bgNames.length === 0) reason += ' None of the failing backgrounds is a hover or active state of a bold or interactive surface, so no background move was tried.';
    else if (bestBg) reason += ` Moving ${bestBg.a.bgName} was tried; its best step ${bestBg.c.step} still fails ${bestBg.c.results.filter((r) => !r.pass).map((r) => `${pairLabel(r.pair)} at ${round2(r.ratio)}`).join('; ')}.`;
    proposals.push({
      token: tok.name, collection: tok.collection, mode,
      from: fgTry.alias ? `${fgTry.alias} (${model.primitives.get(fgTry.alias)})` : String(tok.perMode[mode].value),
      to: null, from_primitive: fgTry.alias || null, to_primitive: null, to_value: null,
      reason, rule: rulesHit,
      worst_before: round2(worstBefore.ratio), worst_before_pair: pairLabel(worstBefore.pair),
      worst_after: best ? round2(best.worst.ratio) : null, worst_after_pair: best ? pairLabel(best.worst.pair) : null,
      best_step: best ? best.step : null,
      pairs_fixed: best ? failingBefore.filter((r) => best.results.find((x) => x.pair === r.pair && x.pass)).map((r) => pairLabel(r.pair)) : [],
      pairs_still_failing: best ? best.results.filter((r) => !r.pass).map((r) => pairLabel(r.pair)) : failingBefore.map((r) => pairLabel(r.pair)),
      kind: 'none',
    });
    void done;
  }
  return proposals.map(({ _doneKey, ...p }) => p);
}

// ---------------------------------------------------------------------------------------------
// Distinct pairs

function oklchOf(rgb) {
  const [L, C, H] = srgbToOklch(rgb);
  return { L: round4(L), C: round4(C), H: round2(H) };
}

function distinctAll(model, config) {
  const out = [];
  const missing = [];
  for (const d of config.distinct || []) {
    const collection = d.collection || model.defaultCollection;
    const a = model.tokens.get(`${collection}::${d.a}`);
    const b = model.tokens.get(`${collection}::${d.b}`);
    if (!a || !b) {
      for (const n of [!a && d.a, !b && d.b].filter(Boolean)) missing.push({ rule: d.id, collection, token: n, pair: `${d.a} vs ${d.b}`, finding: 'declared pair names a token that does not exist' });
      continue;
    }
    for (const mode of modesOf(a, b)) {
      const ca = colourOf(model, a, mode); const cb = colourOf(model, b, mode);
      const base = model.baseSurface[mode] || [1, 1, 1];
      const ra = ca.alpha < 1 ? composite(ca, base) : ca.rgb;
      const rb = cb.alpha < 1 ? composite(cb, base) : cb.rgb;
      const la = toLinear(ra), lb = toLinear(rb);
      const okA = oklchOf(ra), okB = oklchOf(rb);
      const normal = deltaEOK(linearSrgbToOklab(la), linearSrgbToOklab(lb));
      const sims = {};
      for (const kind of Object.keys(CVD)) {
        const sa = simulateLinear(la, kind), sb = simulateLinear(lb, kind);
        sims[kind] = {
          delta_e_ok: round4(deltaEOK(linearSrgbToOklab(sa), linearSrgbToOklab(sb))),
          a_shown: toHex(sa.map(encode)), b_shown: toHex(sb.map(encode)),
        };
      }
      const identical = toHex(ra) === toHex(rb);
      const minSim = Math.min(...Object.values(sims).map((s) => s.delta_e_ok));
      const flags = [];
      if (identical) flags.push('identical');
      else {
        if (normal < DE_NORMAL) flags.push('hard to tell apart');
        else if (minSim < DE_SIMULATED) flags.push('hard to tell apart under simulation');
      }
      out.push({
        id: d.id, why: d.why, mode, a: d.a, b: d.b,
        a_value: String(a.perMode[mode].value), b_value: String(b.perMode[mode].value),
        a_alias: a.perMode[mode].alias, b_alias: b.perMode[mode].alias,
        same_colour: identical,
        a_oklch: okA, b_oklch: okB,
        hue_distance: okA.C < 0.005 || okB.C < 0.005 ? null : round2(hueDistance(okA.H, okB.H)),
        delta_e_ok: round4(normal),
        simulated: sims,
        flags,
      });
    }
  }
  return { rows: out, missing };
}

// ---------------------------------------------------------------------------------------------
// Totals and outputs

function totals(rows) {
  const t = {};
  for (const r of rows) {
    const k = `${r.rule}|${r.mode}`;
    if (!t[k]) t[k] = { rule: r.rule, mode: r.mode, exempt: r.exempt, pairs: 0, passes: 0, fails: 0, worst_ratio: Infinity, worst_pair: null };
    const x = t[k];
    x.pairs++;
    if (r.pass === true) x.passes++;
    if (r.pass === false) x.fails++;
    if (r.ratio_raw < x.worst_ratio) { x.worst_ratio = r.ratio_raw; x.worst_pair = `${r.fg} on ${r.bg}`; }
  }
  return Object.values(t).map((x) => ({ ...x, worst_ratio: round2(x.worst_ratio) }));
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function swatch(fg, bg, ratio, verdict, title) {
  // verdict: 'pass' | 'fail' | 'exempt'. The mark sits below the swatch on the page background, as a word and a symbol.
  const mark = verdict === 'pass' ? '<span class="mark ok">&#10003; Pass</span>' : verdict === 'fail' ? '<span class="mark bad">&#10007; Fail</span>' : '<span class="mark ex">&#8211; Exempt</span>';
  return `<figure class="cell ${verdict}"><div class="sw" style="background:${esc(bg)};color:${esc(fg)}">Aa ${ratio.toFixed(2)}</div><figcaption>${mark}<span class="nm">${title}</span></figcaption></figure>`;
}

function renderHtml(report) {
  const { rows, summary, proposals, distinct, missing, meta } = report;
  const modes = [...new Set(rows.map((r) => r.mode))];
  const ruleIds = [...new Set(rows.map((r) => r.rule))];
  const ruleWhy = Object.fromEntries([...meta.rules, ...meta.exempt].map((r) => [r.id, r]));
  const sumRows = ruleIds.map((id) => {
    const cells = modes.map((m) => {
      const s = summary.find((x) => x.rule === id && x.mode === m);
      if (!s) return '<td colspan="4">&#8211;</td>';
      const failCls = s.fails ? ' class="badnum"' : '';
      return `<td>${s.pairs}</td><td>${s.exempt ? '&#8211;' : s.passes}</td><td${failCls}>${s.exempt ? 'exempt' : s.fails}</td><td>${s.worst_ratio.toFixed(2)}</td>`;
    }).join('');
    return `<tr><th scope="row">${esc(id)}${ruleWhy[id] && ruleWhy[id].min ? ` <small>(min ${ruleWhy[id].min})</small>` : ''}</th>${cells}</tr>`;
  }).join('');
  const modeHead = modes.map((m) => `<th colspan="4" scope="colgroup">${esc(m)}</th>`).join('');
  const subHead = modes.map(() => '<th>Pairs</th><th>Pass</th><th>Fail</th><th>Worst</th>').join('');

  const sections = ruleIds.map((id) => {
    const rr = rows.filter((r) => r.rule === id);
    const why = ruleWhy[id] ? ruleWhy[id].why : '';
    const fails = rr.filter((r) => r.pass === false).length;
    const groups = modes.map((m) => {
      const list = rr.filter((r) => r.mode === m);
      if (!list.length) return '';
      return `<h4>${esc(m)} <small>${list.length} pairs${list[0].exempt ? '' : `, ${list.filter((r) => r.pass === false).length} fail`}</small></h4><div class="grid">${list.map((r) => swatch(r.fg_shown, r.bg_shown, r.ratio, r.exempt ? 'exempt' : r.pass ? 'pass' : 'fail', `${esc(r.fg)}<br>on ${esc(r.bg)}`)).join('')}</div>`;
    }).join('');
    return `<section id="rule-${esc(id)}"><h3>${esc(id)}${rr[0].exempt ? ' <small>(exempt: measured, never failed)</small>' : ` <small>min ${rr[0].min}, ${fails} fail${fails === 1 ? '' : 's'}</small>`}</h3><p class="why">${esc(why)}</p>${groups}</section>`;
  }).join('');

  const propHtml = proposals.length ? proposals.map((p) => {
    const tok = rows.find((r) => r.mode === p.mode && (r.fg === p.token || r.bg === p.token) && r.collection === p.collection);
    const worstPair = rows.find((r) => r.mode === p.mode && pairLabel(r) === p.worst_before_pair);
    let pair = '';
    if (worstPair) {
      const isFg = p.kind !== 'background';
      const beforeFg = worstPair.fg_shown, beforeBg = worstPair.bg_shown;
      const afterFg = isFg && p.to_value ? p.to_value : beforeFg;
      const afterBg = !isFg && p.to_value ? p.to_value : beforeBg;
      const afterRatio = p.to_value ? contrastRatio(relativeLuminance(hexToSrgb(afterFg)), relativeLuminance(hexToSrgb(afterBg))) : null;
      pair = `<div class="ba">${swatch(beforeFg, beforeBg, worstPair.ratio_raw, worstPair.pass ? 'pass' : 'fail', 'Before')}<span class="arrow" aria-hidden="true">&#8594;</span>${afterRatio !== null ? swatch(afterFg, afterBg, afterRatio, afterRatio >= worstPair.min ? 'pass' : 'fail', 'After, same pair') : '<figure class="cell none"><div class="sw nofix">No single-step fix</div></figure>'}</div>`;
    }
    void tok;
    return `<article class="prop"><h4>${esc(p.token)} <small>${esc(p.mode)}, ${esc(p.kind)}</small></h4>${pair}<dl><dt>From</dt><dd>${esc(p.from)}</dd><dt>To</dt><dd>${p.to ? esc(p.to) : '<strong>no single-step fix</strong>'}</dd><dt>Worst before</dt><dd>${p.worst_before} (${esc(p.worst_before_pair)})</dd><dt>Worst after</dt><dd>${p.worst_after ?? '&#8211;'}${p.worst_after_pair ? ` (${esc(p.worst_after_pair)})` : ''}</dd><dt>Fixes</dt><dd>${p.pairs_fixed.length ? p.pairs_fixed.map(esc).join('<br>') : 'none'}</dd><dt>Still failing</dt><dd>${p.pairs_still_failing.length ? p.pairs_still_failing.map(esc).join('<br>') : 'none'}</dd></dl><p class="why">${esc(p.reason)}</p></article>`;
  }).join('') : '<p>No failing pairs, so nothing to propose.</p>';

  const chip = (hex, label) => `<div class="chip"><span style="background:${esc(hex)}"></span><small>${esc(label)}</small></div>`;
  const distHtml = distinct.map((d) => {
    const flag = d.flags.length ? `<span class="mark bad">&#9888; ${esc(d.flags.join(', '))}</span>` : '<span class="mark ok">&#10003; distinct</span>';
    const aHex = toHex(parseColour(d.a_value).rgb), bHex = toHex(parseColour(d.b_value).rgb);
    const simRows = Object.entries(d.simulated).map(([k, s]) => `<div class="chips"><b>${esc(k)}</b>${chip(s.a_shown, 'a')}${chip(s.b_shown, 'b')}<small>&#916;E OK ${s.delta_e_ok.toFixed(4)}</small></div>`).join('');
    return `<article class="dist"><h4>${esc(d.id)} <small>${esc(d.mode)}</small> ${flag}</h4><p class="why">${esc(d.why)}</p>
<div class="chips"><b>normal</b>${chip(aHex, 'a')}${chip(bHex, 'b')}<small>&#916;E OK ${d.delta_e_ok.toFixed(4)}</small></div>${simRows}
<p class="mono">a = ${esc(d.a)} ${esc(d.a_value)}${d.a_alias ? ` (${esc(d.a_alias)})` : ''}: L ${d.a_oklch.L} C ${d.a_oklch.C} H ${d.a_oklch.H}<br>b = ${esc(d.b)} ${esc(d.b_value)}${d.b_alias ? ` (${esc(d.b_alias)})` : ''}: L ${d.b_oklch.L} C ${d.b_oklch.C} H ${d.b_oklch.H}<br>Same colour: ${d.same_colour ? 'yes' : 'no'}. Hue distance: ${d.hue_distance === null ? 'not meaningful (one is grey)' : d.hue_distance + '&#176;'}.</p></article>`;
  }).join('');

  const missHtml = missing.length ? `<section><h2>Declared names that do not exist</h2><ul>${missing.map((m) => `<li>${esc(m.rule)}: ${esc(m.token)} in ${esc(m.collection)} (${esc(m.pair)}): ${esc(m.finding)}</li>`).join('')}</ul></section>` : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contrast Audit</title>
<style>
:root{color-scheme:light;--page:#ffffff;--ink:#1a1a1a;--muted:#555;--line:#d6d6d6;--ok:#11612f;--bad:#a1121b;--ex:#555}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1200px;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.2rem;margin:1.6em 0 .4em;border-bottom:1px solid var(--line);padding-bottom:.2em}
h3{font-size:1.05rem;margin:1.4em 0 .2em}h4{font-size:.95rem;margin:1em 0 .4em}small{color:var(--muted);font-weight:normal}
.why{color:var(--muted);margin:.2em 0 .6em;max-width:70ch}
.tablewrap{overflow-x:auto;max-width:100%}
table{border-collapse:collapse;font-size:.85rem}th,td{border:1px solid var(--line);padding:4px 6px;text-align:right;white-space:nowrap}
th[scope=row]{text-align:left;white-space:normal;min-width:12em}.badnum{color:var(--bad);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.cell{margin:0;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--page)}
.cell.fail{border:2px dashed var(--bad)}
.sw{font-size:1.25rem;font-weight:600;padding:16px 10px;text-align:center}
figcaption{padding:6px 8px;font-size:.75rem;line-height:1.3;word-break:break-word}
.mark{display:block;font-weight:700;font-size:.8rem}.ok{color:var(--ok)}.bad{color:var(--bad)}.ex{color:var(--ex)}
.nm{color:var(--muted)}
.prop,.dist{border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:10px 0}
.ba{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.ba .cell{width:160px}.arrow{font-size:1.4rem}
.nofix{background:#f3f3f3;color:var(--bad);font-size:.9rem}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:.85rem;margin:.6em 0}dt{color:var(--muted)}dd{margin:0;word-break:break-word}
.chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0}.chips b{width:7.5em;font-size:.8rem}
.chip{display:flex;flex-direction:column;align-items:center}.chip span{display:block;width:56px;height:32px;border-radius:4px;border:1px solid var(--line)}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:.75rem;word-break:break-word;color:var(--muted)}
.dist h4 .mark{display:inline}
</style></head><body><main>
<h1>Contrast audit</h1>
<p class="why">Source: ${esc(meta.source)}. Generated ${esc(meta.generated)}. WCAG 2 contrast ratios; a pair passes when its unrounded ratio reaches the rule's minimum. Every swatch shows "Aa" and the ratio in the real foreground colour on the real background colour; the pass or fail mark is written below it.</p>
<p><strong>${meta.counts.measured} pairs measured, ${meta.counts.pass} pass, ${meta.counts.fail} fail, ${meta.counts.exempt} exempt.</strong>${missing.length ? ` ${missing.length} declared names do not exist.` : ''}</p>
<h2>Summary</h2>
<div class="tablewrap"><table><thead><tr><th rowspan="2" scope="col">Rule</th>${modeHead}</tr><tr>${subHead}</tr></thead><tbody>${sumRows}</tbody></table></div>
${missHtml}
<h2>Pairs by rule</h2>${sections}
<h2>Proposed fixes</h2>
<p class="why">Each proposal moves one token to another step of a primitive ramp it is already on, and is checked against the values as they are now, not against the other proposals. Applying several at once can change each other's results, so rerun this audit with --built after applying them.</p>
${propHtml}
<h2>Colours that must look different</h2>
<p class="why">&#916;E OK is the straight-line distance in OKLab. "Hard to tell apart" is flagged below ${DE_NORMAL} with normal vision, or below ${DE_SIMULATED} under any of the three simulations (Machado, Oliveira and Fernandes 2009, severity 1.0). These two thresholds are the lead's starting values, not a standard.</p>
${distHtml}
</main></body></html>`;
}

// ---------------------------------------------------------------------------------------------
// Console

function printConsole(rows, summary, proposals, distinct, missing) {
  const ids = [...new Set(rows.map((r) => r.rule))];
  for (const id of ids) {
    const rr = rows.filter((r) => r.rule === id);
    const modes = [...new Set(rr.map((r) => r.mode))];
    console.log(`\n${id}${rr[0].exempt ? ' (exempt)' : `  (min ${rr[0].min})`}`);
    const byPair = new Map();
    for (const r of rr) { const k = `${r.fg} on ${r.bg}`; if (!byPair.has(k)) byPair.set(k, {}); byPair.get(k)[r.mode] = r; }
    const width = Math.min(70, Math.max(...[...byPair.keys()].map((k) => k.length)));
    console.log(`  ${'pair'.padEnd(width)}  ${modes.map((m) => m.padStart(12)).join('')}`);
    for (const [k, v] of byPair) {
      const cells = modes.map((m) => {
        const r = v[m];
        if (!r) return '-'.padStart(12);
        const tag = r.exempt ? '   ' : r.pass ? ' ok' : ' NO';
        return `${r.ratio.toFixed(2)}${tag}`.padStart(12);
      }).join('');
      console.log(`  ${k.padEnd(width)}  ${cells}`);
    }
    const s = summary.filter((x) => x.rule === id).map((x) => `${x.mode}: ${x.pairs} pairs, ${x.exempt ? 'exempt' : `${x.fails} fail`}, worst ${x.worst_ratio.toFixed(2)}`).join('; ');
    console.log(`  ${s}`);
  }
  if (missing.length) {
    console.log('\nDeclared names that do not exist');
    for (const m of missing) console.log(`  ${m.rule}: ${m.token} (${m.pair})`);
  }
  console.log(`\nProposed fixes: ${proposals.length} (${proposals.filter((p) => p.to).length} with a fix, ${proposals.filter((p) => !p.to).length} with no single-step fix)`);
  for (const p of proposals) console.log(`  ${p.mode.padEnd(6)} ${p.token}: ${p.from} -> ${p.to || 'no single-step fix'}; worst ${p.worst_before} -> ${p.worst_after ?? '-'}`);
  const flagged = distinct.filter((d) => d.flags.length);
  console.log(`\nDistinct pairs: ${distinct.length} checked, ${flagged.length} flagged`);
  for (const d of flagged) console.log(`  ${d.mode.padEnd(6)} ${d.id}: ${d.flags.join(', ')} (delta E OK ${d.delta_e_ok.toFixed(4)})`);
}

// ---------------------------------------------------------------------------------------------
// Run

function audit(model, config) {
  const { rows, missing } = measureAll(model, config);
  const proposals = propose(model, rows);
  const dist = distinctAll(model, config);
  const allMissing = [...missing, ...dist.missing];
  const summary = totals(rows);
  const counts = {
    measured: rows.length,
    pass: rows.filter((r) => r.pass === true).length,
    fail: rows.filter((r) => r.pass === false).length,
    exempt: rows.filter((r) => r.exempt).length,
    missing_names: allMissing.length,
  };
  return { rows, proposals, distinct: dist.rows, missing: allMissing, summary, counts };
}

function writeOutputs(model, config, result) {
  mkdirSync(OUT_DIR, { recursive: true });
  const meta = { source: model.source, generated: new Date().toISOString(), rules: config.rules, exempt: config.exempt || [], counts: result.counts };
  const strip = (r) => ({ rule: r.rule, mode: r.mode, fg: r.fg, bg: r.bg, fg_value: r.fg_value, bg_value: r.bg_value, fg_alias: r.fg_alias, bg_alias: r.bg_alias, ratio: r.ratio, min: r.min, pass: r.pass });
  const json = {
    $description: 'WCAG 2 contrast of every colour pair declared in v2/tools/contrast-pairs.json, written by v2/tools/audit-contrast.mjs. pass is decided on the unrounded ratio.',
    source: model.source,
    generated: meta.generated,
    counts: result.counts,
    totals: result.summary,
    pairs: result.rows.filter((r) => !r.exempt).map(strip),
    exempt: result.rows.filter((r) => r.exempt).map(({ pass, ...r }) => strip(r)),
    distinct: {
      $description: `delta_e_ok is the Euclidean distance in OKLab. Flags: "identical" at 0; "hard to tell apart" below ${DE_NORMAL} with normal vision or below ${DE_SIMULATED} under any simulation. These thresholds are the lead's starting values, not a standard. Simulations: Machado, Oliveira and Fernandes 2009, severity 1.0, on linear RGB.`,
      pairs: result.distinct,
    },
    missing: result.missing,
    ...(model.notInBuilt ? { not_in_built_file: model.notInBuilt } : {}),
  };
  writeFileSync(join(OUT_DIR, 'contrast.json'), JSON.stringify(json, null, 2) + '\n');
  writeFileSync(join(OUT_DIR, 'proposed-overrides.json'), JSON.stringify(result.proposals, null, 2) + '\n');
  writeFileSync(join(OUT_DIR, 'contrast.html'), renderHtml({ ...result, meta }));
}

function summaryLine(c) {
  return `${c.measured} pairs measured, ${c.pass} pass, ${c.fail} fail, ${c.exempt} exempt`;
}

// ---------------------------------------------------------------------------------------------
// Self-test: a tiny token set with one known failing pair (white on #ffff00), one passing pair,
// and one declared name that does not exist. Runs the same engine as the real audit.

function selfTest() {
  const problems = [];
  const primitives = new Map([
    ['grey/0', '#ffffff'], ['grey/300', '#c8c8c8'], ['grey/600', '#666666'], ['grey/700', '#4a4a4a'], ['grey/900', '#111111'],
    ['yellow/300', '#ffff00'],
  ]);
  const tok = (name, alias) => ({ collection: 'Themes', name, modes: ['light'], perMode: { light: { value: primitives.get(alias), alias } } });
  const tokens = new Map();
  for (const t of [tok('text/on', 'grey/0'), tok('text/primary', 'grey/900'), tok('surface/primary/default', 'grey/0'), tok('surface/warning/bold', 'yellow/300')]) tokens.set(`Themes::${t.name}`, t);
  const model = finishModel({ tokens, primitives, source: 'self-test (in memory)' });
  const config = {
    hues: [], gradientHues: [], base: ['surface/primary/default'], baseDefault: ['surface/primary/default'], fills: ['surface/warning/bold'],
    rules: [
      { id: 'known-fail', min: 4.5, fg: ['text/on'], bg: ['<fills>'] },
      { id: 'known-pass', min: 4.5, fg: ['text/primary'], bg: ['<base>'] },
      { id: 'planted-missing', min: 3, fg: ['icon/does-not-exist'], bg: ['<base>'] },
    ],
    exempt: [],
    distinct: [{ id: 'same', a: 'text/on', b: 'surface/primary/default', why: 'test' }],
  };
  const r = audit(model, config);
  const fail = r.rows.find((x) => x.rule === 'known-fail');
  const pass = r.rows.find((x) => x.rule === 'known-pass');
  if (!fail || fail.pass !== false) problems.push('white on #ffff00 was not caught as a failure');
  if (fail && Math.abs(fail.ratio - 1.07) > 0.01) problems.push(`white on #ffff00 measured ${fail && fail.ratio}, expected 1.07`);
  if (!pass || pass.pass !== true) problems.push('the passing pair was flagged');
  if (!r.missing.some((m) => m.token === 'icon/does-not-exist')) problems.push('the planted missing name was not reported');
  const p = r.proposals.find((x) => x.token === 'text/on');
  if (!p || !p.to) problems.push('no proposal was produced for text/on');
  else {
    const after = contrastRatio(relativeLuminance(hexToSrgb(p.to_value)), relativeLuminance(hexToSrgb('#ffff00')));
    if (after < 4.5) problems.push(`the proposed ${p.to} still fails (${after.toFixed(2)})`);
    if (!primitives.has(p.to_primitive)) problems.push('the proposal is not a step on an existing ramp');
  }
  const d = r.distinct.find((x) => x.id === 'same');
  if (!d || !d.flags.includes('identical')) problems.push('two identical colours were not flagged identical');
  // The simulation matrices must keep greys grey: each row sums to about 1.
  for (const [k, m] of Object.entries(CVD)) m.forEach((row, i) => { const s = row[0] + row[1] + row[2]; if (Math.abs(s - 1) > 0.001) problems.push(`${k} matrix row ${i + 1} sums to ${s}`); });

  // --built: a flat array shaped like ds-tokens/dist/tokens.json, through the same reader --built uses.
  // It holds a proposed token Figma does not have (border/strong/hover on #c8c8c8, which fails 3 to 1 on white),
  // one that passes, a token with no alias, and a non-colour token that must be skipped.
  const entry = (name, values, alias, extra = {}) => ({ name, collection: 'Themes', category: 'color', type: 'color', cssVar: `--color-${name.split('/').join('-')}`, description: '', values, alias, scopes: [], overridden: null, ...extra });
  const builtArray = [
    entry('surface/primary/default', { light: '#ffffff', dark: '#111111' }, { light: 'grey/0', dark: 'grey/900' }),
    entry('border/strong/default', { light: '#666666', dark: '#c8c8c8' }, { light: 'grey/600', dark: 'grey/300' }, { proposed: true, why: 'test' }),
    entry('border/strong/hover', { light: '#c8c8c8', dark: '#666666' }, { light: null, dark: 'grey/600' }, { proposed: true, why: 'test' }),
    { name: 'width/sm', collection: 'Border', category: 'border', type: 'dimension', cssVar: '--border-width-sm', description: '', values: { default: '1px' }, alias: { default: null }, scopes: [], overridden: null, proposed: true, why: 'test' },
  ];
  let bm = null;
  try { bm = modelFromBuiltArray(builtArray, primitives, 'self-test array'); } catch (e) { problems.push(`--built reader threw on a valid array: ${e.message}`); }
  if (bm) {
    if (bm.tokens.size !== 3) problems.push(`--built reader kept ${bm.tokens.size} tokens, expected the 3 colour tokens`);
    const br = audit(bm, { hues: [], gradientHues: [], base: [], baseDefault: [], fills: [], rules: [{ id: 'control-boundary', min: 3, fg: ['border/strong/default', 'border/strong/hover'], bg: ['surface/primary/default'] }], exempt: [], distinct: [] });
    const row = (fg, mode) => br.rows.find((x) => x.fg === fg && x.mode === mode);
    if (br.rows.length !== 4) problems.push(`--built: ${br.rows.length} pairs measured, expected 4 (2 tokens x 2 modes)`);
    if (!row('border/strong/default', 'light') || row('border/strong/default', 'light').pass !== true) problems.push('--built: #666666 on white should pass 3 to 1');
    const hov = row('border/strong/hover', 'light');
    if (!hov || hov.pass !== false || Math.abs(hov.ratio - 1.67) > 0.01) problems.push(`--built: #c8c8c8 on white should fail at 1.67, got ${hov && hov.ratio}`);
    if (hov && hov.fg_alias !== 'grey/300') problems.push(`--built: a null alias should fall back to the primitive with the same value (grey/300), got ${hov && hov.fg_alias}`);
    if (row('border/strong/default', 'dark')?.fg_alias !== 'grey/300') problems.push('--built: the alias given in the entry was not used');
    if (br.missing.length) problems.push(`--built: names reported missing: ${br.missing.map((x) => x.token).join(', ')}`);
  }
  let threw = false;
  try { modelFromBuiltArray({ values: {} }, primitives, 'self-test object'); } catch { threw = true; }
  if (!threw) problems.push('--built reader accepted an object that is not an array');

  for (const x of problems) console.log(`  problem: ${x}`);
  console.log(problems.length ? `Self-test failed: ${problems.length} problem${problems.length === 1 ? '' : 's'}.` : `Self-test passed: the failing pair (ratio ${fail.ratio}) was caught, the passing pair was not flagged, the missing name was reported, a proposal moved text/on to ${p.to}, and --built read a tokens.json-shaped array with proposed tokens (a 1.67 control boundary caught).`);
  return problems.length ? 1 : 0;
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest();
  const config = JSON.parse(readFileSync(PAIRS_FILE, 'utf8'));
  let model = modelFromSnapshot();
  if (argv.includes('--built')) model = modelFromBuilt(model);
  const result = audit(model, config);
  writeOutputs(model, config, result);
  printConsole(result.rows, result.summary, result.proposals, result.distinct, result.missing);
  console.log(`\nWrote ${['contrast.json', 'contrast.html', 'proposed-overrides.json'].map((f) => relative(ROOT, join(OUT_DIR, f))).join(', ')}`);
  if (model.notInBuilt) console.log(`Read ${model.tokens.size} colour tokens from the built file, ${model.proposedCount} of them proposed; ${model.notInBuilt.length} Figma colour token-modes missing from it.`);
  if (result.missing.length) console.log(`${result.missing.length} declared token name${result.missing.length === 1 ? '' : 's'} do not exist; these count as failures.`);
  console.log(summaryLine(result.counts));
  const failed = result.counts.fail > 0 || result.missing.length > 0;
  return failed && !argv.includes('--report-only') ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  console.error(`Error: ${e.message}`);
  console.log('Audit did not run: see the error above.');
  process.exitCode = 2;
}

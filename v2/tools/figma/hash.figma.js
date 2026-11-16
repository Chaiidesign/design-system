// READ-ONLY. Run inside Figma through the use_figma tool. It creates, changes and deletes nothing.
// Returns one checksum for every 25 lines that export.figma.js would return, so a saved copy can be proved exact.
// Line format:  name [T] value | value ~ web code syntax ~ scopes ~ "description"
//   T is C (colour), F (number), S (string) or B (boolean). One value per mode, in mode order.
//   An alias is written {collection-less variable name}. A colour is #rrggbb, or #rrggbbaa when not opaque.
// A collection starts with a line:  ## name | modes: a, b | vars: N
const hex = c => { const h = v => Math.round(v * 255).toString(16).padStart(2, '0'); return '#' + h(c.r) + h(c.g) + h(c.b) + (c.a !== undefined && c.a < 1 ? h(c.a) : ''); };
// SUFFIX: '' takes every local collection. Otherwise only collections whose name ends with SUFFIX are taken, and the suffix is removed from the name,
// so a sandbox file can hold a copy such as "Themes (DS V2)" beside older collections.
const SUFFIX = '';
const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter(c => c.name.endsWith(SUFFIX));
const all = await figma.variables.getLocalVariablesAsync();
const byId = {}; for (const v of all) byId[v.id] = v;
const out = [];
for (const c of cols) {
  out.push(`## ${SUFFIX ? c.name.slice(0, -SUFFIX.length) : c.name} | modes: ${c.modes.map(m => m.name).join(', ')} | vars: ${c.variableIds.length}`);
  for (const id of c.variableIds) {
    const v = byId[id] || await figma.variables.getVariableByIdAsync(id); if (!v) continue;
    const vals = [];
    for (const m of c.modes) {
      const x = v.valuesByMode[m.modeId]; let s;
      if (x && typeof x === 'object' && x.type === 'VARIABLE_ALIAS') { const t = byId[x.id] || await figma.variables.getVariableByIdAsync(x.id); s = '{' + (t ? t.name : '?' + x.id) + '}'; }
      else if (x && typeof x === 'object' && 'r' in x) s = hex(x);
      else s = JSON.stringify(x);
      vals.push(s);
    }
    out.push(`${v.name} [${v.resolvedType[0]}] ${vals.join(' | ')} ~ ${v.codeSyntax && v.codeSyntax.WEB ? v.codeSyntax.WEB : '-'} ~ ${v.scopes.join(',') || '-'} ~ ${JSON.stringify(v.description || '')}`);
  }
}
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const clean = out.map(l => l.trim()).filter(l => l.length);
const sums = [];
for (let i = 0; i < clean.length; i += 25) sums.push(`${i + 1} ${fnv(clean.slice(i, i + 25).join('\n'))}`);
return `total ${clean.length} ${fnv(clean.join('\n'))}\n` + sums.join('\n');

// READ-ONLY. Run inside Figma through the use_figma tool. It creates, changes and deletes nothing.
// Returns one line per local variable, in collection order, as plain text.
// Line format:  name [T] value | value ~ web code syntax ~ scopes ~ "description"
//   T is C (colour), F (number), S (string) or B (boolean). One value per mode, in mode order.
//   An alias is written {collection-less variable name}. A colour is #rrggbb, or #rrggbbaa when not opaque.
// A collection starts with a line:  ## name | modes: a, b | vars: N
// Set PART to 0 for the whole file, or to 1, 2, 3 ... to get lines in slices of 150 (for long files).
const PART = 0;
const hex = c => { const h = v => Math.round(v * 255).toString(16).padStart(2, '0'); return '#' + h(c.r) + h(c.g) + h(c.b) + (c.a !== undefined && c.a < 1 ? h(c.a) : ''); };
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const all = await figma.variables.getLocalVariablesAsync();
const byId = {}; for (const v of all) byId[v.id] = v;
const out = [];
for (const c of cols) {
  out.push(`## ${c.name} | modes: ${c.modes.map(m => m.name).join(', ')} | vars: ${c.variableIds.length}`);
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
const lines = PART === 0 ? out : out.slice((PART - 1) * 150, PART * 150);
return `lines ${PART === 0 ? 1 : (PART - 1) * 150 + 1} to ${PART === 0 ? out.length : Math.min(PART * 150, out.length)} of ${out.length}\n` + lines.join('\n');

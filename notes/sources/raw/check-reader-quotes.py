import json, sys, os, html
out, docs, dest = sys.argv[1], sys.argv[2], sys.argv[3]
raw = open(out, encoding='utf-8').read()
try:
    data = json.loads(raw)
except Exception:
    i = raw.find('{"readers"'); data = json.JSONDecoder().raw_decode(raw[i:])[0]
if 'result' in data and 'readers' not in data: data = data['result']
json.dump(data, open(dest, 'w'), indent=1, ensure_ascii=False)
files = {}
for f in os.listdir(docs):
    files[f] = open(os.path.join(docs, f), encoding='utf-8', errors='replace').read().split('\n')
tot = ok = near = 0; bad = []
for r in data['readers']:
    n = k = 0
    for f in r['facts']:
        n += 1; tot += 1
        q = html.unescape(f['quote']).strip()
        fn = os.path.basename(f['file'])
        if fn in files:
            lines = files[fn]; ln = f['line']
            window = lines[max(0, ln-4): ln+3]
            if any(q in l for l in window): ok += 1; k += 1
            elif any(q in l for l in lines): near += 1; k += 1
            else: bad.append((r['key'], fn, ln, q[:110]))
        else:
            bad.append((r['key'], 'WEB:' + f['file'][:60], 0, q[:110]))
    print(f"{r['key']:18} facts {n:3}  quote found in file {k:3}")
print(f"total {tot}, found at stated line {ok}, found elsewhere in file {near}, not checkable or missing {len(bad)}")
for b in bad: print('  MISS', b)

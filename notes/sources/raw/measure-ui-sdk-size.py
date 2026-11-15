# Measures what UI SDK's hosted browser files cost to load, without saving them.
# For each component it follows every import from https://ui-sdk.dev/web/<name>.js,
# then adds up the raw size and the gzip level 9 size of every file reached.
# Usage: python3 -I notes/sources/raw/measure-ui-sdk-size.py
# This measures the prebuilt hosted files. An app that bundles the npm packages may ship less; that is not measured here.
import gzip, re, urllib.request
from urllib.parse import urljoin

UA = {"User-Agent": "Mozilla/5.0 (generic client)"}
BASE = "https://ui-sdk.dev/"
cache = {}

def get(url, kind="javascript"):
    if url not in cache:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                ok = r.status == 200 and kind in r.headers.get("content-type", "")
                cache[url] = r.read() if ok else None
        except Exception:
            cache[url] = None
    return cache[url]

def closure(url, seen):
    if url in seen:
        return
    body = get(url)
    if body is None:
        return
    seen.add(url)
    for m in re.finditer(rb'(?:from|import)\s*\(?\s*["\']([^"\']+\.js)["\']', body):
        closure(urljoin(url, m.group(1).decode()), seen)

def size(urls):
    return sum(len(cache[u]) for u in urls), sum(len(gzip.compress(cache[u], 9)) for u in urls)

for name in ["web.js", "web/core.js"]:
    b = get(BASE + name)
    print(f"{name:12} raw {len(b):7}  gzip-9 {len(gzip.compress(b, 9)):6}" if b else f"{name:12} not found")
css = get(BASE + "web.css", "css")
print(f"{'web.css':12} raw {len(css):7}  gzip-9 {len(gzip.compress(css, 9)):6}" if css else "web.css not found")
print()
for name in ["button", "label", "input", "field", "checkbox", "toast", "dialog", "popover", "select", "calendar", "date-picker", "textarea", "scroll-area"]:
    seen = set()
    closure(BASE + "web/" + name + ".js", seen)
    if not seen:
        print(f"{name:12} not found")
        continue
    raw, gz = size(seen)
    print(f"{name:12} files {len(seen):3}  raw {raw:7}  gzip-9, summed per file {gz:6}")
group = set()
for name in ["button", "input", "label", "field", "toast"]:
    closure(BASE + "web/" + name + ".js", group)
raw, gz = size(group)
print(f"\nbutton + input + label + field + toast, shared files counted once: files {len(group)}  raw {raw}  gzip-9 {gz}")

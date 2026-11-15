#!/usr/bin/env node
// Static file server for the repository root.
//   node scripts/serve.mjs [--port 4174]
// Every response carries "Cache-Control: no-store". Only GET and HEAD are answered (a form may submit by GET;
// its query string is ignored and the page is served again). Anything else gets 405.

import { createServer as httpServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
};

// Start a server. port 0 picks a free port. Resolves to { port, url, close() }.
export function createServer({ root = REPO, port = 4174, host = "127.0.0.1" } = {}) {
  const base = resolve(root);
  const server = httpServer(async (req, res) => {
    const send = (code, body, type = "text/plain; charset=utf-8", extra = {}) => {
      res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", ...extra });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "Only GET and HEAD are accepted.\n", undefined, { Allow: "GET, HEAD" });
    let path;
    try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(400, "Bad request.\n"); }
    let file = resolve(join(base, path));
    if (file !== base && !file.startsWith(base + sep)) return send(403, "Forbidden.\n");
    try {
      let s = await stat(file);
      if (s.isDirectory()) { file = join(file, "index.html"); s = await stat(file); }
      const body = await readFile(file);
      send(200, body, TYPES[extname(file).toLowerCase()] || "application/octet-stream", { "Content-Length": body.length });
    } catch {
      send(404, "Not found.\n");
    }
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => {
      const p = server.address().port;
      ok({ port: p, url: `http://${host}:${p}`, close: () => new Promise((done) => { server.closeAllConnections?.(); server.close(() => done()); }) });
    });
  });
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--port");
  const port = i > 0 ? Number(process.argv[i + 1]) : 4174;
  if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error("serve: --port needs a number"); process.exit(1); }
  createServer({ port }).then(
    (s) => console.log(`serve: ${REPO} at ${s.url}/ (Cache-Control: no-store; GET and HEAD only)`),
    (e) => { console.error(`serve: ${e.message}`); process.exit(1); },
  );
}

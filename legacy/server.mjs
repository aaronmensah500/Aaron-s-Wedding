import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8765;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function safeFilePath(root, urlPath) {
  const rootResolved = path.resolve(root);
  let rel = decodeURIComponent((urlPath || "/").split("?")[0]);
  if (rel === "/" || rel === "") rel = "Aaron & Adaeze.html";
  else rel = rel.replace(/^\/+/, "");
  const resolved = path.resolve(rootResolved, rel);
  const relOut = path.relative(rootResolved, resolved);
  if (relOut.startsWith("..") || path.isAbsolute(relOut)) return null;
  return resolved;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
  const filePath = safeFilePath(__dirname, req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Content-Length": buf.length });
    if (req.method === "HEAD") res.end();
    else res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving ${__dirname}`);
  console.log(`Open http://127.0.0.1:${PORT}/Aaron%20%26%20Adaeze.html`);
});

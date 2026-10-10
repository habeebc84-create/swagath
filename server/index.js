// Local dev/preview server for the Swagath Hatchable project.
//
// - Serves the static site from public/
// - Routes /api/* to the project's unmodified API handlers in api/
// - Redirects the platform-only "hatchable" import to server/hatchable.js
//   (JSON-backed db seeded from migrations/ + local file storage)
//
// Runs with: npm run dev   (binds 0.0.0.0, honours $PORT)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

register("./resolve-hooks.js", import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const API_DIR = path.join(ROOT, "api");
const MAX_BODY = 16 * 1024 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg"
};

function sendJson(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length });
  res.end(body);
}

/* --------------------------------- static --------------------------------- */

function serveStatic(pathname, req, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }
  rel = rel.replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  if (!path.extname(rel) && fs.existsSync(path.join(PUBLIC_DIR, rel + ".html"))) rel += ".html";

  const file = path.resolve(PUBLIC_DIR, rel);
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let target = file;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");

  // The pages ask for /swagath-logo.png. Drop the real logo image at
  // public/swagath-logo.png and it is served as-is; until that file exists we
  // answer with the SVG recreation instead of a 404 so the emblem always renders.
  if (rel === "swagath-logo.png" && (!fs.existsSync(target) || !fs.statSync(target).isFile())) {
    target = path.join(PUBLIC_DIR, "swagath-logo.svg");
  }

  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>404</h1><p>Not found</p>");
    return;
  }

  const stat = fs.statSync(target);
  const type = MIME[path.extname(target).toLowerCase()] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Last-Modified": stat.mtime.toUTCString(),
    "Cache-Control": "no-cache"
  };
  if (req.method === "HEAD") {
    res.writeHead(200, headers).end();
    return;
  }
  const stream = fs.createReadStream(target);
  stream.on("error", () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  res.writeHead(200, headers);
  stream.pipe(res);
}

/* ----------------------------------- api ---------------------------------- */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Payload too large"), { code: "E_TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function createApiRes(nodeRes) {
  const state = { code: 200, headers: {}, finished: false };
  const finish = (data) => {
    if (state.finished) return;
    state.finished = true;
    const headers = { ...state.headers };
    if (data !== null && data !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = typeof data === "string" ? "text/plain; charset=utf-8" : "application/octet-stream";
    }
    if (data !== null && data !== undefined) headers["Content-Length"] = Buffer.byteLength(data);
    nodeRes.writeHead(state.code, headers);
    nodeRes.end(data === undefined ? null : data);
  };
  const api = {
    status(code) {
      state.code = code;
      return api;
    },
    setHeader(k, v) {
      state.headers[k] = v;
      return api;
    },
    json(obj) {
      // JSON bodies must declare their type; without this `finish()` falls back
      // to application/octet-stream for every API response.
      if (!state.headers["Content-Type"]) {
        state.headers["Content-Type"] = "application/json; charset=utf-8";
      }
      finish(Buffer.from(JSON.stringify(obj)));
      return api;
    },
    send(data) {
      finish(typeof data === "string" ? data : Buffer.from(data));
      return api;
    },
    end() {
      finish(null);
      return api;
    },
    get finished() {
      return state.finished;
    }
  };
  return api;
}

async function handleApi(req, res, url) {
  const rel = url.pathname.slice("/api/".length).replace(/\/+$/, "");
  let file = path.join(API_DIR, ...rel.split("/").filter(Boolean));
  if (!file.endsWith(".js")) {
    if (fs.existsSync(file + ".js")) file += ".js";
    else if (fs.existsSync(path.join(file, "index.js"))) file = path.join(file, "index.js");
  }
  if (!file.startsWith(API_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const mod = await import(pathToFileURL(file).href);
  const allowed = Array.isArray(mod.methods) ? mod.methods.map((m) => String(m).toUpperCase()) : null;
  if (allowed && !allowed.includes(req.method)) {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = {};
  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = await readBody(req);
    if (raw.trim()) {
      const ct = String(req.headers["content-type"] || "").toLowerCase();
      try {
        if (ct.includes("application/x-www-form-urlencoded")) {
          body = Object.fromEntries(new URLSearchParams(raw));
        } else {
          body = JSON.parse(raw);
        }
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" });
        return;
      }
    }
  }

  const apiReq = {
    method: req.method,
    url: url.pathname + url.search,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body,
    files: [],
    ip: req.socket.remoteAddress
  };
  const apiRes = createApiRes(res);

  try {
    await mod.default(apiReq, apiRes);
    if (!apiRes.finished) apiRes.end();
  } catch (err) {
    console.error(`[api] ${url.pathname} failed:`, err);
    if (!apiRes.finished) sendJson(res, 500, { error: err && err.message ? err.message : "Server error" });
  }
}

/* --------------------------------- server --------------------------------- */

const server = http.createServer(async (req, res) => {
  // Any request-target must be tolerated ("//", absolute-form, garbage) —
  // an unhandled throw here would take the whole preview down.
  let url;
  try {
    url = new URL(req.url || "/", "http://localhost");
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }
  try {
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      serveStatic(url.pathname, req, res);
    }
  } catch (err) {
    console.error("[server] request error:", err);
    if (!res.headersSent) sendJson(res, 500, { error: "Server error" });
    else res.end();
  }
});

// Vercel routes containers to $PORT with a default of 80; the Freebuff
// preview uses 3000 when it does not inject one.
const PORT = Number(process.env.PORT) || (process.env.VERCEL ? 80 : 3000);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Swagath site serving on http://0.0.0.0:${PORT}`);
});

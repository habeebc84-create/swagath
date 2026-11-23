// Local dev/preview server for the Swagath Hatchable project.
//
// - Serves the static site from public/
// - Routes /api/* to the project's API handlers in server/api/ (kept out of
//   the repo-root api/ dir so Vercel stops counting them as Serverless
//   Functions — the container serves every route itself)
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

import { storage } from "./hatchable.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const API_DIR = path.join(ROOT, "server", "api");
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

/* ----------------------------- security headers ----------------------------- */

// Sent on every response. The CSP allows only what the pages actually use:
// Google Fonts, Unsplash/HTTPS photos, the Google Maps embed, and inline
// scripts/styles (the pages use inline JSON-LD, onerror fallbacks and style
// attributes). If you add a new third-party script, font, map or analytics
// tool, add its origin here or the browser will block it.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // Only on the live HTTPS site; on http://localhost it would break local CSS/JS.
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : [])
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin"
};
if (process.env.NODE_ENV === "production") {
  SECURITY_HEADERS["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
}

function applySecurityHeaders(res) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
}

// Images and icons rarely change, so browsers may keep them for a day.
// HTML/CSS/JS stay "no-cache" (always revalidated, answered with 304 when
// unchanged) so a new push shows up immediately — no stale-cache surprises.
const LONG_CACHE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".woff", ".woff2", ".mp4", ".webm", ".mp3"]);

function send404(res, req) {
  const page = path.join(PUBLIC_DIR, "404.html");
  if (fs.existsSync(page)) {
    const body = fs.readFileSync(page);
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? null : body);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<h1>404</h1><p>Not found</p>");
}

/* --------------------------------- static --------------------------------- */

// Active logo uploaded from the admin dashboard (api/branding/*).
// Returns null whenever no custom logo is set, so the built-in file is used.
async function customLogo() {
  try {
    const cfgFile = await storage.get("branding.json");
    if (!cfgFile || !cfgFile.buffer) return null;
    const cfg = JSON.parse(cfgFile.buffer.toString("utf8"));
    if (!cfg || typeof cfg.logo !== "string" || !cfg.logo.startsWith("uploads/") || cfg.logo.includes("..")) return null;
    const file = await storage.get(cfg.logo);
    if (!file || !file.buffer || !file.buffer.length) return null;
    return file;
  } catch {
    return null;
  }
}

async function serveStatic(pathname, req, res) {
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

  // Admin-uploaded logo wins over the file in public/ — every page that asks
  // for /swagath-logo.png (header, footer, admin, og:image) gets the new one.
  if (rel === "swagath-logo.png") {
    const custom = await customLogo();
    if (custom) {
      const headers = {
        "Content-Type": custom.contentType || "image/png",
        "Content-Length": custom.buffer.length,
        "Cache-Control": "no-cache"
      };
      if (req.method === "HEAD") {
        res.writeHead(200, headers).end();
        return;
      }
      res.writeHead(200, headers);
      res.end(custom.buffer);
      return;
    }
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
    send404(res, req);
    return;
  }

  const stat = fs.statSync(target);
  const ext = path.extname(target).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Last-Modified": stat.mtime.toUTCString(),
    "ETag": etag,
    // The logo can be swapped from the admin dashboard, so it is never long-cached.
    "Cache-Control": LONG_CACHE_EXT.has(ext) && rel !== "swagath-logo.png" ? "public, max-age=86400" : "no-cache"
  };
  // Conditional GET: unchanged files are answered with an empty 304.
  const inm = req.headers["if-none-match"];
  const ims = req.headers["if-modified-since"];
  const notModified = inm
    ? inm.split(",").map((t) => t.trim()).includes(etag)
    : (ims && !Number.isNaN(Date.parse(ims)) && Math.floor(stat.mtimeMs / 1000) <= Math.floor(Date.parse(ims) / 1000));
  if (notModified) {
    delete headers["Content-Length"];
    res.writeHead(304, headers).end();
    return;
  }
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
    // Behind Vercel the socket address is the proxy; the first
    // x-forwarded-for entry is the visitor (used only for login rate limiting).
    ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress
  };
  const apiRes = createApiRes(res);

  try {
    await mod.default(apiReq, apiRes);
    if (!apiRes.finished) apiRes.end();
  } catch (err) {
    console.error(`[api] ${url.pathname} failed:`, err);
    // Do not leak internal error details to visitors in production.
    const msg = process.env.NODE_ENV === "production" ? "Server error" : (err && err.message ? err.message : "Server error");
    if (!apiRes.finished) sendJson(res, 500, { error: msg });
  }
}

/* --------------------------------- server --------------------------------- */

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
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
    } else if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Allow": "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
    } else {
      await serveStatic(url.pathname, req, res);
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

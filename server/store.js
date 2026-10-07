// Local development data layer.
//
// The site is a Hatchable project: its API handlers run on Hatchable's runtime
// (Postgres via `db.query` from the "hatchable" package). To run the project
// locally/preview we back those calls with a small JSON store that understands
// exactly the SQL statements used in api/, and we seed it from the
// project's own migration files so menu/gallery content matches production.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const MIGRATIONS_DIR = path.join(ROOT, "migrations");

const DATA_DIR = path.join(ROOT, ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const SCHEMA = {
  bookings: {
    columns: ["id", "name", "phone", "email", "party_size", "booking_date", "booking_time", "special_request", "status", "created_at"],
    defaults: { party_size: 2, status: "pending" }
  },
  catering_inquiries: {
    columns: ["id", "name", "phone", "email", "event_type", "guest_count", "event_date", "event_location", "package_interest", "dietary_notes", "message", "status", "created_at"],
    defaults: { guest_count: 20, status: "new" }
  },
  gallery_items: {
    columns: ["id", "image_url", "caption", "sort_order", "is_large", "created_at"],
    defaults: { caption: "", sort_order: 0, is_large: false }
  },
  menu_items: {
    columns: ["id", "category", "group_name", "name", "price", "sort_order", "is_active", "created_at"],
    defaults: { group_name: "", sort_order: 0, is_active: true }
  }
};

let tables = null;

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(tables, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function ensureTables() {
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (!Array.isArray(tables[name])) tables[name] = [];
  }
}

/* ----------------------------- migration seeding ----------------------------- */

// Split a SQL script into statements, respecting single-quoted strings
// and skipping `-- line comments`.
function splitStatements(sql) {
  const out = [];
  let cur = "";
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inStr) {
      cur += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") { cur += sql[i + 1]; i++; continue; }
        inStr = false;
      }
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (ch === "'") { inStr = true; cur += ch; continue; }
    if (ch === ";") { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function unquote(raw) {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

function parseLiteral(raw) {
  const s = raw.trim();
  if (/^'/.test(s)) return unquote(s);
  if (/^true$/i.test(s)) return true;
  if (/^false$/i.test(s)) return false;
  if (/^null$/i.test(s)) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

// Split on top-level commas, respecting single-quoted strings.
function splitTopLevel(s) {
  const out = [];
  let cur = "";
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      cur += ch;
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") { inStr = true; cur += ch; continue; }
    if (ch === ",") { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// Parse the tuple list that follows a `VALUES` keyword: `(a, b), (c, d)`
function parseValueTuples(normalized) {
  const idx = normalized.search(/\bVALUES\b/i);
  if (idx < 0) return [];
  const tuples = [];
  let i = idx + 6;
  while (i < normalized.length) {
    while (i < normalized.length && /\s/.test(normalized[i])) i++;
    if (normalized[i] !== "(") break;
    // scan to the matching close paren, honouring quotes
    let depth = 0;
    let inStr = false;
    let start = i + 1;
    let j = i;
    for (; j < normalized.length; j++) {
      const ch = normalized[j];
      if (inStr) {
        if (ch === "'") inStr = false;
        continue;
      }
      if (ch === "'") { inStr = true; continue; }
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) break;
    const inner = normalized.slice(start, j);
    tuples.push(splitTopLevel(inner).map(parseLiteral));
    i = j + 1;
    while (i < normalized.length && /\s/.test(normalized[i])) i++;
    if (normalized[i] === ",") { i++; continue; }
    break;
  }
  return tuples;
}

function insertSeedRow(table, cols, values) {
  const def = SCHEMA[table];
  if (!def) return;
  const row = {};
  for (const c of def.columns) {
    if (cols.includes(c)) row[c] = values[cols.indexOf(c)];
    else if (c in def.defaults) row[c] = def.defaults[c];
    else if (c === "id") row[c] = crypto.randomUUID();
    else if (c === "created_at") row[c] = new Date().toISOString();
    else row[c] = null;
  }
  if (!row.id) row.id = crypto.randomUUID();
  if (!row.created_at) row.created_at = new Date().toISOString();
  tables[table].push(row);
}

function seedFromMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    for (const stmt of splitStatements(sql)) {
      const normalized = stmt.replace(/\s+/g, " ").trim();
      const head = /^INSERT INTO (\w+) \(([^)]*)\)/i.exec(normalized);
      if (!head) continue; // CREATE TABLE / anything else
      const table = head[1];
      if (!SCHEMA[table]) continue;
      const cols = head[2].split(",").map((c) => c.trim());
      const tuples = parseValueTuples(normalized);
      if (!tuples.length) continue;

      const onlyIfEmpty = /WHERE NOT EXISTS \(SELECT 1 FROM \w+ LIMIT 1\)/i.test(normalized);
      const onConflict = /ON CONFLICT DO NOTHING/i.test(normalized);
      const keys = [...normalized.matchAll(/m\.(\w+)\s*=\s*v\.\1/gi)].map((m) => m[1]);

      if (onlyIfEmpty && tables[table].length) continue;

      for (const values of tuples) {
        if (keys.length && tables[table].some((r) => keys.every((k) => r[k] === values[cols.indexOf(k)]))) continue;
        if (onConflict) {
          const sig = JSON.stringify(values);
          if (tables[table].some((r) => JSON.stringify(cols.map((c) => r[c])) === sig)) continue;
        }
        insertSeedRow(table, cols, values);
      }
    }
  }
}

/* -------------------------------- query engine -------------------------------- */

function normalize(sql) {
  return String(sql).replace(/\s+/g, " ").trim().replace(/;\s*$/, "");
}

function resolveValue(token, params) {
  const t = String(token).trim();
  const ph = /^\$(\d+)$/.exec(t);
  if (ph) return params[Number(ph[1]) - 1];
  return parseLiteral(t);
}

function looseEq(a, b) {
  if (typeof b === "boolean") return Boolean(a) === b;
  if (typeof b === "number") return Number(a) === b;
  if (b === null || b === undefined) return a === null || a === undefined;
  return String(a) === String(b);
}

function compare(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const as = a === null || a === undefined ? "" : String(a);
  const bs = b === null || b === undefined ? "" : String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

function runSelect(colsRaw, table, rest, params) {
  const def = SCHEMA[table];
  if (!def) throw new Error(`Local db shim: unknown table "${table}"`);
  let rows = tables[table].slice();

  const whereM = /\bWHERE (.*?)(?= ORDER BY | LIMIT |$)/i.exec(rest);
  if (whereM) {
    const cond = /^(\w+) = (.+)$/.exec(whereM[1].trim());
    if (!cond) throw new Error(`Local db shim: unsupported WHERE "${whereM[1].trim()}" in: SELECT ... FROM ${table}`);
    const wanted = resolveValue(cond[2], params);
    rows = rows.filter((r) => looseEq(r[cond[1]], wanted));
  }

  const orderM = /\bORDER BY (.*?)(?= LIMIT |$)/i.exec(rest);
  if (orderM) {
    const keys = orderM[1].split(",").map((part) => {
      const bits = part.trim().split(/\s+/);
      return { col: bits[0], dir: (bits[1] || "ASC").toUpperCase() === "DESC" ? -1 : 1 };
    });
    rows.sort((x, y) => {
      for (const k of keys) {
        const c = compare(x[k.col], y[k.col]) * k.dir;
        if (c !== 0) return c;
      }
      return 0;
    });
  }

  const limitM = /\bLIMIT (\d+)/i.exec(rest);
  if (limitM) rows = rows.slice(0, Number(limitM[1]));

  const cols = colsRaw.trim() === "*" ? def.columns : colsRaw.split(",").map((c) => c.trim());
  return { rows: rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))) };
}

function runInsert(table, colsRaw, valsRaw, returningRaw, params) {
  const def = SCHEMA[table];
  if (!def) throw new Error(`Local db shim: unknown table "${table}"`);
  const cols = colsRaw.split(",").map((c) => c.trim());
  const values = splitTopLevel(valsRaw).map((v) => resolveValue(v, params));
  const row = {};
  for (const c of def.columns) {
    if (cols.includes(c)) row[c] = values[cols.indexOf(c)];
    else if (c === "id") row[c] = crypto.randomUUID();
    else if (c === "created_at") row[c] = new Date().toISOString();
    else if (c in def.defaults) row[c] = def.defaults[c];
    else row[c] = null;
  }
  tables[table].push(row);
  persist();
  return { rows: [pick(row, returningRaw)] };
}

function runUpdate(table, setCol, setValRaw, whereCol, whereValRaw, params) {
  const def = SCHEMA[table];
  if (!def) throw new Error(`Local db shim: unknown table "${table}"`);
  const setVal = resolveValue(setValRaw, params);
  const whereVal = resolveValue(whereValRaw, params);
  const rows = tables[table].filter((r) => looseEq(r[whereCol], whereVal));
  for (const r of rows) r[setCol] = setVal;
  persist();
  return { rows: rows.map((r) => pick(r, "*")) };
}

function runDelete(table, whereCol, whereValRaw, params) {
  const def = SCHEMA[table];
  if (!def) throw new Error(`Local db shim: unknown table "${table}"`);
  const whereVal = resolveValue(whereValRaw, params);
  const before = tables[table].length;
  tables[table] = tables[table].filter((r) => !looseEq(r[whereCol], whereVal));
  persist();
  return { rows: [], rowCount: before - tables[table].length };
}

function pick(row, colsRaw) {
  if (!colsRaw || colsRaw.trim() === "*") return { ...row };
  const cols = colsRaw.split(",").map((c) => c.trim());
  return Object.fromEntries(cols.map((c) => [c, row[c]]));
}

export function query(sql, params = []) {
  const s = normalize(sql);
  let m;
  if ((m = /^SELECT (.+?) FROM (\w+)(.*)$/i.exec(s))) {
    return runSelect(m[1], m[2], m[3], params);
  }
  if ((m = /^INSERT INTO (\w+) \((.+?)\) VALUES \((.+?)\)(?: RETURNING (.+))?$/i.exec(s))) {
    return runInsert(m[1], m[2], m[3], m[4] || "*", params);
  }
  if ((m = /^UPDATE (\w+) SET (\w+) = (.+?) WHERE (\w+) = (.+)$/i.exec(s))) {
    return runUpdate(m[1], m[2], m[3], m[4], m[5], params);
  }
  if ((m = /^DELETE FROM (\w+) WHERE (\w+) = (.+)$/i.exec(s))) {
    return runDelete(m[1], m[2], m[3], params);
  }
  throw new Error(`Local db shim does not understand SQL: ${s}`);
}

/* ---------------------------------- bootstrap ---------------------------------- */

function bootstrap() {
  if (fs.existsSync(DB_FILE)) {
    try {
      tables = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch {
      tables = null;
    }
  }
  if (!tables || typeof tables !== "object") tables = {};
  ensureTables();
  seedFromMigrations();
  ensureTables();
  persist();
}

bootstrap();

export function stats() {
  return Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
}

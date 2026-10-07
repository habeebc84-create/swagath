// Local stand-in for the platform-provided "hatchable" package.
// server/resolve-hooks.js maps the bare specifier "hatchable" to this file so
// the unmodified API handlers in api/ can run in the preview.

import fs from "node:fs";
import path from "node:path";
import { query, ROOT } from "./store.js";

const STORAGE_DIR = path.join(ROOT, ".data", "storage");

export const db = { query };

function safePath(key) {
  const file = path.resolve(STORAGE_DIR, key);
  if (file !== STORAGE_DIR && !file.startsWith(STORAGE_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return file;
}

export const storage = {
  async put(key, buffer, contentType) {
    const file = safePath(key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buffer);
    fs.writeFileSync(file + ".meta.json", JSON.stringify({ contentType: contentType || "application/octet-stream" }));
    return { key, contentType: contentType || "application/octet-stream" };
  },

  async get(key) {
    const file = safePath(key);
    if (!fs.existsSync(file)) return null;
    let contentType = "application/octet-stream";
    try {
      contentType = JSON.parse(fs.readFileSync(file + ".meta.json", "utf8")).contentType || contentType;
    } catch {
      /* fall through to default type */
    }
    return { buffer: fs.readFileSync(file), contentType };
  }
};

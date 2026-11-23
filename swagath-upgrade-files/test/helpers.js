import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

/** Starts server/index.js on a free port with its own temporary data folder. */
export async function startServer(extraEnv = {}) {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "swagath-test-"));
  const env = { ...process.env, PORT: String(port), SWAGATH_DATA_DIR: dataDir, ...extraEnv };
  for (const [k, v] of Object.entries(extraEnv)) if (v === undefined) delete env[k];
  const child = spawn(process.execPath, ["server/index.js"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base + "/robots.txt");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  return {
    base,
    log: () => log,
    async stop() {
      child.kill();
      await new Promise((r) => child.once("exit", r));
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

export async function postJson(url, body, headers = {}) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data, headers: res.headers };
}

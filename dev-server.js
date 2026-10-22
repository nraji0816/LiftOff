// Local server for trying Liftoff before deploying: `npm run dev`, then open http://localhost:3000
// Without SUPABASE_* and ANTHROPIC_API_KEY set it runs in demo mode: data lives in memory and prompts
// come from the built-in list. With them set (for example from a .env file) it talks to the real services.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(root, ".env"))){
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")){
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const port = Number(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
  if (url.pathname.startsWith("/api/")){
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, "");
    const file = path.join(root, "api", name + ".js");
    if (!name || name.startsWith("_") || !fs.existsSync(file)) return res.status(404).json({code:"not_found"});
    let raw = ""; for await (const chunk of req) raw += chunk;
    req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
    req.query = Object.fromEntries(url.searchParams);
    const mod = await import(pathToFileURL(file).href);
    return mod.default(req, res);
  }
  const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const full = path.join(root, file);
  if (!full.startsWith(root) || !fs.existsSync(full) || fs.statSync(full).isDirectory()){ res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("Content-Type", full.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream");
  fs.createReadStream(full).pipe(res);
}).listen(port, async () => {
  const { MOCK } = await import(pathToFileURL(path.join(root, "api", "_lib.js")).href);
  console.log(`Liftoff running at http://localhost:${port} ${MOCK ? "(demo mode: in-memory data, built-in prompts)" : "(connected to Supabase and Claude)"}`);
});

// GET /api/health -> plain-language check of the setup. Open it in a browser after deploying.
import { store, MOCK, today } from "./_lib.js";

export default async function handler(req, res){
  const env = process.env;
  const out = {
    status: "checking",
    SUPABASE_URL: env.SUPABASE_URL ? "set" : "MISSING: add it in Vercel > Settings > Environment Variables, then redeploy",
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING: add it in Vercel > Settings > Environment Variables, then redeploy",
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? "set" : "MISSING: prompts fall back to the built-in list",
    database: "not checked",
    tables: "not checked"
  };
  if (MOCK){
    out.status = "NOT CONNECTED: Supabase settings are missing, so nothing is saved and Daily Flight can't work.";
  } else {
    try { await store.leaderboard("best", 1); out.database = "ok"; }
    catch (e){ out.database = "error: " + (e.message || e.code) + (/fetch failed|ENOTFOUND|getaddrinfo/i.test(e.message || "") ? " (the SUPABASE_URL looks wrong, it should look like https://abcd1234.supabase.co)" : /relation|does not exist|schema cache/i.test(e.message || "") ? " (run supabase/schema.sql in the Supabase SQL Editor)" : /JWT|apikey|Invalid API key|401|403/i.test(e.message || "") ? " (the SUPABASE_SERVICE_ROLE_KEY looks wrong)" : ""); }
    try { await store.bump("health"); await store.getDaily(today()); out.tables = "ok"; }
    catch (e){ out.tables = "error: " + (e.message || e.code) + " (run supabase/schema.sql in the Supabase SQL Editor)"; }
    out.status = out.database === "ok" && out.tables === "ok" ? "READY: everything is connected." : "PROBLEM: see the lines above.";
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(out);
}

// GET /api/health -> plain-language check of the setup. Open it in a browser after deploying.
import { store, MOCK, today, judge } from "./_lib.js";

export default async function handler(req, res){
  const env = process.env;
  // Test the judge: /api/health?prompt=Name%20a%20cheese&answer=Muenster
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  if (q.prompt && q.answer){
    const t = Date.now();
    let verdict; try { verdict = await judge(String(q.prompt).slice(0,160), String(q.answer).slice(0,60), null, true); } catch (e){ verdict = {status:"crash", error: e.message}; }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({prompt: q.prompt, answer: q.answer, ms: Date.now() - t, verdict});
  }
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
    out.ai = "not checked";
    if (env.ANTHROPIC_API_KEY){
      try {
        const model = env.ANTHROPIC_MODEL || "claude-haiku-5-5";
        const r = await fetch("https://api.anthropic.com/v1/messages", {method:"POST",
          headers:{"x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01", "content-type":"application/json"},
          body: JSON.stringify({model, max_tokens: 5, messages:[{role:"user", content:"Say ok"}]})});
        if (r.ok) out.ai = "ok (model " + model + ")";
        else {
          const j = await r.json().catch(() => ({})), msg = (j.error && j.error.message) || "";
          out.ai = "error " + r.status + ": " + msg + (r.status === 401 ? " (the ANTHROPIC_API_KEY is wrong)" : /credit|billing|balance/i.test(msg) ? " (add credits in the Anthropic Console under Billing)" : /model/i.test(msg) ? " (set ANTHROPIC_MODEL in Vercel to a model your account can use)" : "");
        }
      } catch (e){ out.ai = "error: " + e.message; }
    }
    out.status = out.database === "ok" && out.tables === "ok" ? (String(out.ai).startsWith("ok") ? "READY: everything is connected." : "PARTLY READY: scores save, but the AI judge isn't working, so prompts come from the built-in list. See the ai line.") : "PROBLEM: see the lines above.";
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(out);
}

// POST {playerId, token, runId, avoid[]} -> {prompts:[{prompt, category}], offline}
// Fresh prompts for an Unlimited flight, each from a different category. Falls back to the built-in list.
import { route, auth, store, genPrompts, pickThemes, offlinePrompts, squash, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  const p = await auth(req, body);
  const run = await store.getRun(body.runId);
  if (!run || run.player_id !== p.id || run.finished || run.mode !== "unlimited") throw new HttpError(400, "bad_run");
  const avoid = [...(Array.isArray(body.avoid) ? body.avoid.slice(-80).map(String) : []), ...(run.issued || [])];
  let prompts, offline = false;
  try { prompts = await genPrompts(pickThemes(8), avoid); } catch { prompts = offlinePrompts(6, avoid); offline = true; }
  const seen = new Set(avoid.map(squash));
  prompts = prompts.filter(x => { const k = squash(x.prompt); if (seen.has(k)) return false; seen.add(k); return true; });
  if (!prompts.length){ prompts = offlinePrompts(6, avoid); offline = true; }
  await store.updateRun(run.id, {issued: [...(run.issued || []), ...prompts.map(x => x.prompt)].slice(-400)});
  return {prompts, offline};
});

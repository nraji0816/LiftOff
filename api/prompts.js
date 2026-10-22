// POST {playerId, token, runId, avoid[]} -> {prompts:[{prompt, category}], offline}
// Fresh prompts for an Unlimited flight, each from a different category, never one this pilot has seen before.
import { route, auth, store, genPrompts, pickThemes, offlinePrompts, squash, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  const p = await auth(req, body);
  const [run, history] = await Promise.all([store.getRun(body.runId), store.promptHistory(p.id).catch(() => [])]);
  if (!run || run.player_id !== p.id || run.finished || run.mode !== "unlimited") throw new HttpError(400, "bad_run");
  const avoid = [...history, ...(Array.isArray(body.avoid) ? body.avoid.slice(-300).map(String) : []), ...(run.issued || [])];
  const seen = new Set(avoid.map(squash));
  const keep = list => list.filter(x => { const k = squash(x.prompt); if (seen.has(k)) return false; seen.add(k); return true; });
  let prompts = [], offline = false;
  // Up to two tries with the AI; anything this pilot has already had is thrown out.
  for (let i = 0; i < 2 && prompts.length < 4; i++){
    try { prompts.push(...keep(await genPrompts(pickThemes(8), avoid.slice(-120)))); }
    catch { break; }
  }
  if (prompts.length < 3){ const extra = keep(offlinePrompts(6, [...avoid, ...prompts.map(x => x.prompt)])); if (extra.length) offline = !prompts.length; prompts.push(...extra); }
  if (!prompts.length){ prompts = offlinePrompts(6, []); offline = true; }
  await store.updateRun(run.id, {issued: [...(run.issued || []), ...prompts.map(x => x.prompt)].slice(-400)});
  return {prompts, offline};
});

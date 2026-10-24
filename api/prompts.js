// POST {playerId, token, runId, avoid[]} -> {prompts:[{prompt, category}], offline}
// Fresh prompts for an Unlimited flight: a mix of new AI prompts and the built-in bank,
// never one this pilot has seen before (or a close rewording of one).
import { route, auth, store, genPrompts, pickThemes, offlinePrompts, similarPrompt, promptCore, shuffle, HttpError } from "./_lib.js";
import { BANK } from "./_bank.js";

export default route(["POST"], async ({req, body}) => {
  const p = await auth(req, body);
  const [run, history] = await Promise.all([store.getRun(body.runId), store.promptHistory(p.id).catch(() => [])]);
  if (!run || run.player_id !== p.id || run.finished || run.mode !== "unlimited") throw new HttpError(400, "bad_run");
  const avoid = [...history, ...(Array.isArray(body.avoid) ? body.avoid.slice(-300).map(String) : []), ...(run.issued || [])];
  const past = avoid.slice(-600).map(promptCore);
  const fresh = x => { const c = promptCore(x.prompt); if (past.some(o => similarPrompt(o, c))) return false; past.push(c); return true; };
  const keep = (list, max = Infinity) => { const out = []; for (const x of list){ if (out.length >= max) break; if (fresh(x)) out.push(x); } return out; };

  // Ask the AI and pull from the bank at the same time.
  let ai = [];
  try { ai = keep(await genPrompts(pickThemes(8), avoid.slice(-120))); } catch {}
  const bank = keep(shuffle(BANK.map(([prompt, category]) => ({prompt, category}))), 8);
  // Half and half when both are available, so every flight feels different.
  let prompts = shuffle([...ai.slice(0, bank.length ? 4 : 8), ...bank.slice(0, ai.length ? 4 : 8)]);
  let offline = !ai.length;
  if (prompts.length < 3) prompts.push(...keep(offlinePrompts(6, [...avoid, ...prompts.map(x => x.prompt)])));
  if (!prompts.length){ prompts = shuffle(BANK.map(([prompt, category]) => ({prompt, category}))).slice(0, 6); offline = true; }
  await store.updateRun(run.id, {issued: [...(run.issued || []), ...prompts.map(x => x.prompt)].slice(-400)});
  return {prompts, offline};
});

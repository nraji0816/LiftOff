// POST {playerId, token, runId, prompt, answer} -> {status}
// Called while the player is still typing, so the judge's answer is usually ready by the time they press Fire.
// It never changes the flight; it only warms the shared answer cache.
import { route, auth, store, judge, knownList, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  const prompt = String(body.prompt || ""), answer = String(body.answer || "").slice(0, 60);
  if (!answer.trim()) throw new HttpError(400, "bad_answer");
  const [p, run] = await Promise.all([auth(req, body), store.getRun(body.runId)]);
  if (!run || run.player_id !== p.id || run.finished) throw new HttpError(400, "bad_run");
  if ((run.answered || []).includes(prompt)) throw new HttpError(409, "answered");
  const v = await judge(prompt, answer, knownList(prompt), false);
  return {status: v.status};
});

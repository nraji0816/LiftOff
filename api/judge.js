// POST {playerId, token, runId, prompt, answer|null} -> verdict + the run's new state.
// The server decides every score, so the leaderboard can't be faked from the browser.
import { route, auth, store, judge, knownList, applyRound, runOver, bandOf, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  const prompt = String(body.prompt || "");
  // Look up the pilot, the flight and the cached answer list at the same time.
  const listPromise = body.answer == null ? null : knownList(prompt);
  const [p, run] = await Promise.all([auth(req, body), store.getRun(body.runId)]);
  if (!run || run.player_id !== p.id) throw new HttpError(400, "bad_run");
  if (run.finished || runOver(run)) throw new HttpError(409, "run_over", "This flight is over.");
  if (!(run.issued || []).includes(prompt)) throw new HttpError(400, "bad_prompt", "That prompt isn't part of this flight.");
  if ((run.answered || []).includes(prompt)) throw new HttpError(409, "answered", "That prompt was already answered.");

  const answer = body.answer == null ? null : String(body.answer).slice(0, 60);
  const verdict = answer == null ? {status:"invalid", timeout:true, note:"Time ran out."} : await judge(prompt, answer, listPromise, !!body.force);
  if (verdict.status === "bounce" || verdict.status === "error") return verdict;
  // A wrong answer doesn't end the round. The player keeps guessing until time runs out.
  if (verdict.status === "invalid" && answer != null) return {status:"bounce", kind:"wrong", note: verdict.note || "Not accepted."};

  const {run: next, state} = applyRound(run, prompt, answer, verdict);
  await store.updateRun(run.id, {answered: next.answered, log: next.log, rounds: next.rounds, score: next.score, lives: next.lives,
    combo: next.combo, max_combo: next.max_combo, clean: next.clean, jackpots: next.jackpots, best_pick: next.best_pick});
  return {...verdict, tier: verdict.status === "valid" ? bandOf(verdict.score) : 0, state};
});

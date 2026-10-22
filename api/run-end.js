// POST {playerId, token, runId, badges[]} -> {player} after folding the flight into the pilot's record.
import { route, auth, store, gridOf, today, yesterday, publicPlayer, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  const p = await auth(req, body);
  const run = await store.getRun(body.runId);
  if (!run || run.player_id !== p.id) throw new HttpError(400, "bad_run");
  if (run.finished) return {player: publicPlayer(p)};
  await store.updateRun(run.id, {finished: true});

  const daily = run.mode === "daily", t = today();
  const badges = [...new Set([...(p.badges || []), ...(Array.isArray(body.badges) ? body.badges.map(String).filter(b => /^[a-z0-9]{2,16}$/.test(b)).slice(0, 40) : [])])];
  const recent = [{score: run.score, races: run.rounds, at: Date.now(), mode: daily ? "daily" : "endless"}, ...(p.recent || [])].slice(0, 8);
  const patch = {
    best: Math.max(p.best || 0, run.score), total: (p.total || 0) + run.score, runs: (p.runs || 0) + 1,
    jackpots: (p.jackpots || 0) + (run.jackpots || 0), best_pick: Math.max(p.best_pick || 0, run.best_pick || 0),
    best_combo: Math.max(p.best_combo || 0, run.max_combo || 0), badges, recent
  };
  if (daily && run.daily_date === t){
    Object.assign(patch, {daily_date: t, daily_score: run.score, daily_rounds: run.rounds, daily_grid: gridOf(run.log || []),
      daily_streak: p.last_daily === t ? (p.daily_streak || 1) : p.last_daily === yesterday() ? (p.daily_streak || 0) + 1 : 1, last_daily: t});
  }
  return {player: publicPlayer(await store.updatePlayer(p.id, patch))};
});

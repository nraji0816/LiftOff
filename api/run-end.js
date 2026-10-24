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
  const player = publicPlayer(await store.updatePlayer(p.id, patch));
  // How this flight stacks up: rank, percentile, average and a spread of scores for the recap.
  let compare = null;
  try {
    const scores = await store.flightScores(run.mode, daily ? run.daily_date : null);
    const n = scores.length, below = scores.filter(x => x < run.score).length, above = scores.filter(x => x > run.score).length;
    const avg = n ? Math.round(scores.reduce((a, b) => a + b, 0) / n) : 0;
    const buckets = Array(10).fill(0); for (const x of scores) buckets[Math.min(9, Math.floor(x / 70))]++;
    compare = {n, below, tied: Math.max(0, n - below - above - 1), rank: above + 1, avg, top: n ? Math.max(...scores) : 0, buckets, scope: daily ? "today" : "unlimited"};
  } catch {}
  return {player, compare};
});

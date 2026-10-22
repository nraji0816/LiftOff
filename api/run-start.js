// POST {playerId, token, mode:"daily"|"unlimited"} -> {runId, prompts?}
import { route, auth, store, today, runsToday, MAX_RUNS_PER_PLAYER_PER_DAY, HttpError, LIVES } from "./_lib.js";
import { dailyPrompts } from "./daily.js";

export default route(["POST"], async ({req, body}) => {
  const p = await auth(req, body);
  if (await runsToday(p.id) >= MAX_RUNS_PER_PLAYER_PER_DAY) throw new HttpError(429, "rate_limited", "That's a lot of flights for one day. Come back tomorrow.");
  if (body.mode === "daily"){
    const {day, prompts} = await dailyPrompts();
    try {
      const run = await store.insertRun({player_id: p.id, mode: "daily", daily_date: day, lives: LIVES, issued: prompts.map(x => x.prompt)});
      return {runId: run.id, prompts};
    } catch (e){
      if (e.status === 409) throw new HttpError(409, "daily_taken", "You've already flown today's Daily Flight.");
      throw e;
    }
  }
  const run = await store.insertRun({player_id: p.id, mode: "unlimited", daily_date: null, lives: LIVES, issued: []});
  return {runId: run.id};
});

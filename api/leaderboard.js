// GET -> {day, today, best, total, counts} with every pilot (up to 500 per board).
import { route, store, today, boardRow } from "./_lib.js";

export default route(["GET"], async () => {
  const out = {day: today(), counts: {}};
  for (const kind of ["today", "best", "total"]){
    const {rows, count} = await store.leaderboard(kind, 500);
    out[kind] = rows.map(p => boardRow(p, kind));
    out.counts[kind] = count;
  }
  return out;
}, {ipLimit: false});

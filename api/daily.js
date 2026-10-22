// GET -> today's 7 shared prompts. The first request of the day writes them; everyone after reads the same set.
import { route, store, today, genPrompts, pickThemes, seededOffline, DAILY_N } from "./_lib.js";

export async function dailyPrompts(){
  const day = today();
  let prompts = await store.getDaily(day);
  if (prompts) return {day, prompts};
  try { prompts = (await genPrompts(pickThemes(DAILY_N), [])).slice(0, DAILY_N); } catch { prompts = null; }
  if (!prompts || prompts.length < DAILY_N) prompts = seededOffline(day);
  await store.putDaily(day, prompts);
  return {day, prompts: (await store.getDaily(day)) || prompts};
}

export default route(["GET"], async () => dailyPrompts(), {ipLimit: false});

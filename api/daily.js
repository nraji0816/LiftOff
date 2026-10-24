// GET -> today's 7 shared prompts. The first request of the day writes them; everyone after reads the same set.
import { route, store, today, genPrompts, pickThemes, similarPrompt, shuffle, DAILY_N } from "./_lib.js";
import { BANK } from "./_bank.js";

const dayOffset = (day, n) => new Date(Date.parse(day + "T00:00:00Z") - n*864e5).toISOString().slice(0, 10);

export async function dailyPrompts(){
  const day = today();
  let prompts = await store.getDaily(day);
  if (prompts) return {day, prompts};
  // Never repeat (or reword) a prompt from the last two weeks of Daily Flights.
  const recent = (await Promise.all(Array.from({length: 14}, (_, i) => store.getDaily(dayOffset(day, i + 1)).catch(() => null))))
    .flat().filter(Boolean).map(x => x.prompt);
  const fresh = list => { const out = [], past = recent.slice(); for (const x of list){ if (out.length >= DAILY_N) break; if (!past.some(o => similarPrompt(o, x.prompt))){ out.push(x); past.push(x.prompt); } } return out; };
  try { prompts = fresh(await genPrompts(pickThemes(DAILY_N + 3), recent)); } catch { prompts = []; }
  if (prompts.length < DAILY_N) prompts = [...prompts, ...fresh(shuffle(BANK.map(([prompt, category]) => ({prompt, category})))).filter(x => !prompts.some(p => p.prompt === x.prompt))].slice(0, DAILY_N);
  await store.putDaily(day, prompts);
  return {day, prompts: (await store.getDaily(day)) || prompts};
}

export default route(["GET"], async () => dailyPrompts(), {ipLimit: false});

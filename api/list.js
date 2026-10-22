// POST {playerId, token, prompt} -> {list:[[answer, score]...]} used by the page for instant spelling checks.
import { route, auth, listFor, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  await auth(req, body);
  const prompt = String(body.prompt || "").slice(0, 160);
  if (!prompt) throw new HttpError(400, "bad_prompt");
  try { return {list: await listFor(prompt)}; } catch { return {list: []}; }
});

// POST {action:"create", name?} -> new anonymous pilot {id, token, player}
// POST {action:"rename", playerId, token, name} -> {player}
import { route, newPlayer, auth, store, cleanName, publicPlayer, HttpError } from "./_lib.js";

export default route(["POST"], async ({req, body}) => {
  if (body.action === "create"){
    const {id, token, player} = await newPlayer(body.name);
    return {id, token, player: publicPlayer(player)};
  }
  if (body.action === "rename"){
    const p = await auth(req, body);
    const name = cleanName(body.name);
    if (name.length < 2) throw new HttpError(400, "bad_name", "Names need at least 2 letters or numbers.");
    return {player: publicPlayer(await store.updatePlayer(p.id, {name}))};
  }
  throw new HttpError(400, "bad_action");
});

// GET (x-player-id, x-player-token headers) -> {player}
import { route, auth, publicPlayer } from "./_lib.js";

export default route(["GET"], async ({req, body}) => ({player: publicPlayer(await auth(req, body))}), {ipLimit: false});

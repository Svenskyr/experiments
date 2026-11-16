import type { Cookies } from "@sveltejs/kit";
import { buildDictatorGame } from "#lib/exp/games/dictator/v1/DictatorGame.ts";
import { setNextPageCookie } from "#lib/exp/state/v1/Cookie.server.ts";
import {
    DICTATOR_GAME,
    DICTATOR_GAME_ID,
} from "#exp/dg-01/_components/DictatorGame/GameConfig.ts";
import { stateCookie } from "#exp/dg-01/experiment.server.ts";
import type { PageName } from "#exp/dg-01/experiment.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    return { game: buildDictatorGame(DICTATOR_GAME_ID, DICTATOR_GAME) };
};

export const actions = {
    // DRAFT: the server does not see the decision. Per style guide Part 5 §6, the commit
    // endpoint will grant `end` once the confirmed decision is stored.
    requestNextPageCookie: async ({ cookies }: { cookies: Cookies }) => {
        const complete: PageName[] = ["decision"];
        const grant: PageName[] = ["end"];
        const revoke: PageName[] = ["decision"]; // The decision is made once
        const { expState } = await setNextPageCookie(
            stateCookie(),
            cookies,
            complete,
            grant,
            revoke,
        );
        return { expState };
    },
};

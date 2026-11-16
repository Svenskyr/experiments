import type { DictatorGamePublic } from "#lib/exp/games/dictator/v1/DictatorGame.ts";

export const DICTATOR_GAME_ID = "dg:decision";
export const ENDOWMENT = 10; // Points

export const DICTATOR_GAME: DictatorGamePublic = {
    questionText: `How many of your ${ENDOWMENT} points do you give to the other player?`,
    endowment: ENDOWMENT,
    step: 1,
};

import {
    type GameSession,
    getCurrentPermutation,
    isGameComplete,
    submitRound,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Dev-only: submit random choices for every remaining round in the session. */
export function fillRemainingRoundsWithRandomChoices(session: GameSession): number {
    if (!session.selectedAvatar) {
        return 0;
    }

    let roundsFilled = 0;
    while (!isGameComplete(session)) {
        const permutation = getCurrentPermutation(session);
        const choice = permutation.actions[Math.random() < 0.5 ? 0 : 1].key;
        const prediction = randomInt(0, 100);
        const elapsedSeconds = 0;
        submitRound(session, choice, prediction, elapsedSeconds);
        roundsFilled += 1;
    }
    return roundsFilled;
}

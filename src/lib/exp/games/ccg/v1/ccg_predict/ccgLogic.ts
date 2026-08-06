import type {
    GameInstanceParameters,
    GameInstanceRecord,
    GameSessionProps,
    PermutationCount,
} from "./types.d.ts";
import debugLib from "debug";
const debug = debugLib("ccgLogic");

export const CCG = {
    allGamePermutations: (props: GameSessionProps): GameInstanceParameters[] =>
        allGamePermutations(props),
    initializePermutations: (props: GameSessionProps): PermutationCount[] =>
        initializePermutations(props),
    nextPermutation: (permutations: PermutationCount[]): GameInstanceParameters =>
        nextPermutation(permutations),
    shiftPermutations: (permutations: PermutationCount[]): void => shiftPermutations(permutations),
    countRoundsFromPermutations: (permutations: PermutationCount[]): number =>
        countRoundsFromPermutations(permutations),
};

function allGamePermutations(props: GameSessionProps): GameInstanceParameters[] {
    const permutations: GameInstanceParameters[] = [];
    for (const player2Avatar of props.possiblePlayer2Avatars) {
        for (const choice1 of props.possibleActions) {
            for (const choice2 of props.possibleActions) {
                if (choice1 !== choice2) {
                    const gameInstance: GameInstanceParameters = {
                        players: [
                            { uid: props.player1UID, avatar: props.player1Avatar },
                            { uid: "", avatar: player2Avatar },
                        ],
                        actions: [choice1, choice2],
                        outcomes: props.outcomes,
                    };
                    permutations.push(gameInstance);
                }
            }
        }
    }

    return permutations;
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function initializePermutations(props: GameSessionProps): PermutationCount[] {
    const allPermutations = shuffleArray(allGamePermutations(props));
    const counts: PermutationCount[] = [];
    for (const permutation of allPermutations) {
        counts.push({
            permutation,
            count: 0,
        });
    }
    return counts;
}

function nextPermutation(permutations: PermutationCount[]): GameInstanceParameters {
    const nextPermutation = permutations[0].permutation;
    permutations[0].count += 1;
    permutations.push(permutations.shift()!);
    return nextPermutation;
}

function countRoundsFromPermutations(permutations: PermutationCount[]): number {
    let totalRounds = 0;
    for (const pc of permutations) {
        totalRounds += pc.count;
    }
    return totalRounds;
}

function shiftPermutations(permutations: PermutationCount[]): void {
    permutations[0].count += 1;
    permutations.push(permutations.shift()!);
}

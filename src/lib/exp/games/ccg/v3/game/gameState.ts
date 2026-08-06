import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";

export {
    type Avatar,
    getAvatar,
    setAvatar,
    shuffledAvatars,
} from "$lib/exp/games/ccg/v2/avatars/avatars.ts";
import type { Avatar } from "$lib/exp/games/ccg/v2/avatars/avatars.ts";

export interface Action {
    key: string;
    value?: string | number;
    color?: string;
}

export interface Outcome {
    key: string;
    payoffs: [number, number];
}

export interface RoundParameters {
    avatars: Avatar[];
    actions: Action[];
    outcomes: Outcome[];
}

export interface RoundRecord {
    rid: number | null;
    local_round_number: number;
    player_1_avatar: string;
    player_2_avatar: string;
    choice_option_1: string;
    choice_option_2: string;
    player_1_chose: string;
    choice_option_1_prediction: number;
    time_elapsed_seconds: number;
}

export interface GameSessionConfig {
    possibleAvatars: Avatar[];
    possibleActions: Action[];
    possibleOutcomes: Outcome[];
    maxRounds?: number;
    showPayoffTable?: boolean;
    showPredictionControls?: boolean;
    useSubmitButton?: boolean;
}

export interface PermutationTracker {
    permutations: RoundParameters[];
    roundsPlayed: number;
}

export interface GameSession {
    config: GameSessionConfig;
    permutationTracker: PermutationTracker;
    selectedAvatar: Avatar | null;
    rounds: RoundRecord[];
}

export interface StoredCCGGame {
    permutationTracker?: PermutationTracker;
    selectedAvatar?: Avatar | null;
    rounds?: RoundRecord[];
}

function buildPermutationTracker(
    config: GameSessionConfig,
    playerAvatar: Avatar,
    playerAuthId: string,
): PermutationTracker {
    const permutationTracker: PermutationTracker = {
        permutations: [],
        roundsPlayed: 0,
    };

    for (const avatar of config.possibleAvatars) {
        for (const choice1 of config.possibleActions) {
            for (const choice2 of config.possibleActions) {
                if (choice1 !== choice2) {
                    permutationTracker.permutations.push({
                        avatars: [playerAvatar, avatar],
                        actions: [choice1, choice2],
                        outcomes: config.possibleOutcomes,
                    });
                }
            }
        }
    }

    permutationTracker.permutations = FisherYatesShuffle(
        permutationTracker.permutations,
        playerAuthId,
    );

    return permutationTracker;
}

function resolvePermutationTracker(
    config: GameSessionConfig,
    selectedAvatar: Avatar | null,
    storedTracker: PermutationTracker | undefined,
    playerAuthId?: string,
): PermutationTracker {
    if (storedTracker) {
        return storedTracker;
    }
    if (selectedAvatar && playerAuthId) {
        return buildPermutationTracker(config, selectedAvatar, playerAuthId);
    }
    return { permutations: [], roundsPlayed: 0 };
}

export function newGameSession(
    config: GameSessionConfig,
    stored?: StoredCCGGame | null,
    playerAuthId?: string,
): GameSession {
    const selectedAvatar = stored?.selectedAvatar ?? null;
    return {
        config,
        permutationTracker: resolvePermutationTracker(
            config,
            selectedAvatar,
            stored?.permutationTracker,
            playerAuthId,
        ),
        selectedAvatar,
        rounds: stored?.rounds ? [...stored.rounds] : [],
    };
}

export function mergeGameSession(
    session: GameSession,
    stored?: StoredCCGGame | null,
    playerAuthId?: string,
): GameSession {
    if (!stored) return session;

    if (stored.selectedAvatar !== undefined) {
        session.selectedAvatar = stored.selectedAvatar;
    }
    if (stored.permutationTracker) {
        session.permutationTracker = stored.permutationTracker;
    } else if (
        session.permutationTracker.permutations.length === 0
        && session.selectedAvatar
        && playerAuthId
    ) {
        session.permutationTracker = buildPermutationTracker(
            session.config,
            session.selectedAvatar,
            playerAuthId,
        );
    }
    if (stored.rounds) {
        session.rounds = [...stored.rounds];
    }
    return session;
}

export function getCurrentPermutation(session: GameSession): RoundParameters {
    const { permutations, roundsPlayed } = session.permutationTracker;
    const index = roundsPlayed % permutations.length;
    return permutations[index];
}

export function submitRound(
    session: GameSession,
    choice: string,
    prediction: number,
    elapsedSeconds: number,
): RoundRecord {
    const currentPermutation = getCurrentPermutation(session);
    const record: RoundRecord = {
        rid: null,
        local_round_number: session.permutationTracker.roundsPlayed,
        choice_option_1: currentPermutation.actions[0].key,
        choice_option_2: currentPermutation.actions[1].key,
        choice_option_1_prediction: prediction,
        player_1_avatar: session.selectedAvatar!.name,
        player_1_chose: choice,
        player_2_avatar: currentPermutation.avatars[1].name,
        time_elapsed_seconds: elapsedSeconds,
    };
    session.rounds.push(record);
    session.permutationTracker.roundsPlayed += 1;
    return record;
}

export function isGameComplete(session: GameSession): boolean {
    return session.permutationTracker.roundsPlayed >= (session.config.maxRounds ?? Infinity);
}

export function getUnsyncedRounds(session: GameSession): RoundRecord[] {
    return session.rounds.filter((record) => record.rid === null);
}

export function shouldSync(session: GameSession, interval = 4): boolean {
    return getUnsyncedRounds(session).length > 0
        && session.permutationTracker.roundsPlayed % interval === 0;
}

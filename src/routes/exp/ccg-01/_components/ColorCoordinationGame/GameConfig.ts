import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import {
    type GameSessionConfig,
    type Outcome,
    shuffledAvatars,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";

export const possibleGameActions = [
    { key: "blue", value: "", color: "oklch(0.5 0.12 240)" },
    { key: "pink", value: "", color: "oklch(0.6 0.2 360)" },
    { key: "green", value: "", color: "oklch(0.6 0.16 140)" },
    { key: "orange", value: "", color: "oklch(0.7 0.16 65)" },
];

export const possibleGameOutcomes: Outcome[] = [
    { key: "outcome_c1c1", payoffs: [2, 1] },
    { key: "outcome_c2c2", payoffs: [1, 2] },
    { key: "outcome_c1c2", payoffs: [0, 0] },
    { key: "outcome_c2c1", payoffs: [0, 0] },
];

const sharedConfig = {
    possibleAvatars: shuffledAvatars,
    possibleActions: possibleGameActions,
    possibleOutcomes: possibleGameOutcomes,
    showPayoffTable: true,
    useSubmitButton: true,
} satisfies Partial<GameSessionConfig>;

export function recordedMaxRounds(role?: string): number {
    return role === "participant" ? 48 : 12;
}

export function recordedShuffleSeed(expState: ExperimentState): string {
    return expState.session.sessionId ?? expState.user.authUserId ?? "";
}

export function demoGameConfig(options: {
    showPredictionControls: boolean;
}): GameSessionConfig {
    return {
        ...sharedConfig,
        maxRounds: Infinity,
        showPredictionControls: options.showPredictionControls,
    };
}

export function recordedGameConfig(expState: ExperimentState): GameSessionConfig {
    return {
        ...sharedConfig,
        maxRounds: recordedMaxRounds(expState.session.role),
        showPayoffTable: false,
        showPredictionControls: true,
    };
}

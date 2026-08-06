export interface Action {
    key: string;
    value?: string | number;
    color?: string;
}

export interface Outcome {
    key: string; // Should we directly link this to Actions[]?
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
    choice_option_1: string;
    choice_option_2: string;
    choice_option_1_prediction: number | null;
    choice_option_2_prediction: number | null;
    player_1_role: string;
    player_1_auth_id: string;
    player_1_avatar: string;
    player_1_chose: string | null;
    player_2_avatar: string;
    player_2_chose: string | null;
    outcome: string | null;
    time_elapsed_seconds: number;
}

export interface GameSessionProps {
    playerAuthId: string;
    playerRole: string;
    playerAvatar: Avatar;
    possibleAvatars: Avatar[];
    possibleActions: Action[];
    possibleOutcomes: Outcome[];
    maxRounds?: number;
    showPayoffTable?: boolean;
    showPredictionControls?: boolean;
    useSubmitButton?: boolean;
}

export interface SubmitChoicePayload {
    record: RoundRecord;
    permutationTracker: PermutationTracker;
}

export type OnSubmitChoice = (payload: SubmitChoicePayload) => void;

export interface PermutationTracker {
    permutations: RoundParameters[];
    roundsPlayed: number;
}

import debugLib from "debug";
const debug = debugLib("CCG:v2:gameState");
import { browser } from "$app/environment";
import { type Avatar, getAvatar, setAvatar } from "../avatars/avatars.ts";
import { FisherYatesShuffle } from "$lib/Randomization.ts";
import * as GameRoundsDBM from "../../../../_database/GameRoundsDBM.ts";

function newPermutationTracker(props: GameSessionProps): PermutationTracker {
    const permutationTracker: PermutationTracker = {
        permutations: [],
        roundsPlayed: 0,
    };
    for (const avatar of props.possibleAvatars) {
        for (const choice1 of props.possibleActions) {
            for (const choice2 of props.possibleActions) {
                if (choice1 !== choice2) {
                    const round: RoundParameters = {
                        avatars: [props.playerAvatar, avatar],
                        actions: [choice1, choice2],
                        outcomes: props.possibleOutcomes,
                    };
                    permutationTracker.permutations.push(round);
                }
            }
        }
    }

    permutationTracker.permutations = FisherYatesShuffle(
        permutationTracker.permutations,
        props.playerAuthId,
    );

    return permutationTracker;
}

export function initializePermutationTracker(props: GameSessionProps): PermutationTracker {
    const stored = browser ? localStorage.getItem("ccg-v2-permutationTracker") : null;
    const permutationTracker = stored ? JSON.parse(stored) : newPermutationTracker(props);
    return permutationTracker;
}

export function savePermutationTracker(permutationTracker: PermutationTracker) {
    if (!browser) return;
    localStorage.setItem("ccg-v2-permutationTracker", JSON.stringify(permutationTracker));
}

export function getCurrentPermutation(permutationTracker: PermutationTracker): RoundParameters {
    const index = permutationTracker.roundsPlayed % permutationTracker.permutations.length;
    return permutationTracker.permutations[index];
}

export function getRoundRecords(): RoundRecord[] {
    return GameRoundsDBM.load() ?? [];
}

export function addRoundRecord(record: RoundRecord) {
    if (!browser) return;
    GameRoundsDBM.save(record);
}

export function getUnsyncedRoundRecords(): RoundRecord[] {
    return GameRoundsDBM.getUnsynced();
}

export function applySyncedRids(synced: { local_round_number: number; rid: number }[]): void {
    if (!browser || synced.length === 0) return;
    GameRoundsDBM.applySyncedRids(synced);
}

export function allRoundsSynced(): boolean {
    return getUnsyncedRoundRecords().length === 0;
}
